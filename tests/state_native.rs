use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{state_native, stateful::Runtime, syntax::parse};

// Cargo serializes compilation, but another test can replace this shared
// executable between build and run. Hold the lock across each native suite.
static NATIVE_EXECUTION: std::sync::Mutex<()> = std::sync::Mutex::new(());

fn compile_and_run_with_runner(dir: &Path, code: &str, script: &[Value], runner: &str) -> Value {
    fs::create_dir_all(dir.join("src")).unwrap();
    fs::write(dir.join("src/lib.rs"), code).unwrap();
    fs::write(dir.join("src/main.rs"), runner).unwrap();
    fs::write(dir.join("Cargo.toml"), "[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
    let output = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--manifest-path"])
        .arg(dir.join("Cargo.toml"))
        .env(
            "CARGO_TARGET_DIR",
            dir.parent().unwrap().join("native-test-target"),
        )
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    fs::write(dir.join("script.json"), serde_json::to_vec(script).unwrap()).unwrap();
    let run = Command::new(
        dir.parent()
            .unwrap()
            .join("native-test-target/debug/compiled-state"),
    )
    .arg(dir.join("script.json"))
    .output()
    .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    serde_json::from_slice(&run.stdout).unwrap()
}

#[test]
fn result_query_and_keep_errors_are_local_until_the_caller_propagates() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let p = parse(include_str!("../examples/query-errors.ink")).unwrap();
    let script = vec![
        json!({"call":"raising","args":[]}),
        json!({"call":"ignored","args":[]}),
        json!({"call":"captured","args":[]}),
        json!({"call":"keep_value","args":[]}),
        json!({"call":"create","args":[]}),
        json!({"call":"callback","args":[]}),
        json!({"call":"propagated","args":[]}),
        json!({"call":"read","args":[]}),
        json!({"call":"keep_propagated","args":[]}),
        json!({"call":"read","args":[]}),
    ];
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut expected = vec![];
    for request in &script {
        let before = rt.checkpoint_portable().unwrap();
        let result = rt
            .invoke_json(request["call"].as_str().unwrap(), &request["args"])
            .unwrap();
        let after = rt.checkpoint_portable().unwrap();
        if !result.committed {
            assert_eq!(before, after);
        }
        expected.push(json!({"outcome":result.json(),"snapshot":after}));
    }
    for index in [1, 2, 3, 4] {
        assert_eq!(expected[index]["outcome"]["committed"], json!(true));
    }
    assert_eq!(
        expected[0]["outcome"]["result"],
        json!({"Err":"OtherError.Bad"})
    );
    assert_eq!(
        expected[5]["outcome"]["result"],
        json!([{"Err":"OtherError.Bad"}])
    );
    for index in [6, 8] {
        assert_eq!(expected[index]["outcome"]["committed"], json!(false));
        assert_eq!(
            expected[index]["outcome"]["result"],
            json!({"Err":"OtherError.Bad"})
        );
    }
    assert_eq!(
        expected[7]["outcome"]["result"],
        json!({"Some":{"value":7}})
    );
    let code = state_native::emit(&p).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/query-errors-local");
    fs::create_dir_all(&root).unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    let runner = r#"use compiled_state::State;use serde_json::{Value,json};fn main(){let steps:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();let mut output=vec![];for step in steps{let outcome=state.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap();output.push(json!({"outcome":outcome,"snapshot":state.checkpoint().unwrap()}));}println!("{}",serde_json::to_string(&output).unwrap());}"#;
    assert_eq!(
        compile_and_run_with_runner(&root, &code, &script, runner),
        json!(expected)
    );
}

#[test]
fn direct_typed_frames_match_native_scopes_callbacks_and_snapshots() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let source = include_str!("../examples/typed-frames.ink");
    let p = parse(source).unwrap();
    let script = vec![
        json!({"call":"emit_list","args":[7]}),
        json!({"call":"insert","args":[1,2]}),
        json!({"call":"insert","args":[2,8]}),
        json!({"call":"shadow","args":[10,false]}),
        json!({"call":"shadow","args":[10,true]}),
        json!({"call":"nested","args":[99]}),
        json!({"call":"errors","args":[]}),
        json!({"call":"emit_list","args":[7]}),
        json!({"call":"abort_after_callback","args":[]}),
        json!({"call":"nested","args":[0]}),
        json!({"call":"insert","args":[1,99]}),
    ];
    let mut rt = Runtime::new(p.clone()).unwrap();
    let expected: Vec<_> = script
        .iter()
        .map(|request| {
            let before = rt.checkpoint_portable().unwrap();
            let result = rt
                .invoke_json(request["call"].as_str().unwrap(), &request["args"])
                .unwrap();
            let after = rt.checkpoint_portable().unwrap();
            if !result.committed {
                assert_eq!(before, after);
            }
            json!({"outcome":result.json(), "snapshot":after})
        })
        .collect();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/typed-execution-phase1/frames");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), source).unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    let code = state_native::emit(&p).unwrap();
    let runner = r#"use compiled_state::State;use serde_json::{Value,json};fn main(){let steps:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();let mut output=vec![];for step in steps{let outcome=state.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap();output.push(json!({"outcome":outcome,"snapshot":state.checkpoint().unwrap()}));}println!("{}",serde_json::to_string(&output).unwrap());}"#;
    let native = compile_and_run_with_runner(&root, &code, &script, runner);
    fs::write(
        root.join("native.json"),
        serde_json::to_vec(&native).unwrap(),
    )
    .unwrap();
    assert_eq!(native, json!(expected));
}

#[test]
fn unwrap_or_evaluates_fallback_effects_even_when_present_and_rolls_back_failure() {
    let _native=NATIVE_EXECUTION.lock().unwrap();
    let source=r#"module eager_option;
    enum Error{Failed,}
    state Rows:Table<u64,u64> = Table.empty();
    event seen:u64;
    change seed()->Result<Unit,Error> writes(Rows){if Rows.contains(0){Rows.replace(0,7);}else{Rows.insert(0,7);}return Ok(());}
    change fallback(fail:Bool)->Result<u64,Error> writes(Rows) emits(seen){Rows.remove(0);emit seen(99);if fail{return Err(Error.Failed);}return Ok(42);}
    change read(key:u64,fail:Bool)->Result<u64,Error> writes(Rows) emits(seen){return Ok(Rows.get(key).unwrap_or(fallback(fail)?));}
    query get()->Option<u64> reads(Rows){return Rows.get(0);}"#;
    let p=parse(source).unwrap();
    let script=vec![json!({"call":"seed","args":[]}),json!({"call":"read","args":[0,false]}),json!({"call":"get","args":[]}),json!({"call":"read","args":[1,false]}),json!({"call":"seed","args":[]}),json!({"call":"read","args":[0,true]}),json!({"call":"get","args":[]})];
    let mut runtime=Runtime::new(p.clone()).unwrap();
    let expected:Vec<_>=script.iter().map(|step| {let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap();let after=runtime.checkpoint_portable().unwrap();if !reply.committed{assert_eq!(before,after);}json!({"outcome":reply.json(),"snapshot":after})}).collect();
    assert_eq!(expected[1]["outcome"]["result"],json!({"Ok":7}));
    assert_eq!(expected[1]["outcome"]["events"][0]["value"],json!(99));
    assert_eq!(expected[2]["outcome"]["result"],json!({"None":null}));
    assert_eq!(expected[3]["outcome"]["result"],json!({"Ok":42}));
    assert_eq!(expected[5]["outcome"]["result"],json!({"Err":"Error.Failed"}));
    assert_eq!(expected[6]["outcome"]["result"],json!({"Some":7}));
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/eager-unwrap-or");fs::create_dir_all(&root).unwrap();
    let runner=r#"use compiled_state::State;use serde_json::{Value,json};fn main(){let steps:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();let mut output=vec![];for step in steps{let outcome=state.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap();output.push(json!({"outcome":outcome,"snapshot":state.checkpoint().unwrap()}));}println!("{}",serde_json::to_string(&output).unwrap());}"#;
    assert_eq!(compile_and_run_with_runner(&root,&state_native::emit(&p).unwrap(),&script,runner),json!(expected));
}

/// Retained scalar keeps and parameterless queries return exactly what a fresh
/// evaluation would, across writes to observed and unobserved tables, failed
/// changes, nested query calls and host transactions.
#[test]
fn retained_keeps_and_queries_follow_every_observed_write_and_rollback() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let source = "module retained;
enum Error{Failed,}
state Items:Table<u64,u64> = Table.empty();
state Other:Table<u64,u64> = Table.empty();
keep total:u64 = sum(Items.values());
query size()->u64 reads(Items){return sum(Items.values().map(fn(v)=>1));}
query doubled()->u64 reads(total){return total+total;}
query nested()->u64 reads(Items){return size()+1;}
query others()->u64 reads(Other){return sum(Other.values());}
change put(k:u64,v:u64)->Result<Unit,Error> writes(Items){if Items.contains(k){Items.replace(k,v);}else{Items.insert(k,v);}return Ok(());}
change other(k:u64,v:u64)->Result<Unit,Error> writes(Other){if Other.contains(k){Other.replace(k,v);}else{Other.insert(k,v);}return Ok(());}
change failing(k:u64)->Result<Unit,Error> writes(Items){if Items.contains(k){Items.replace(k,1000);}else{Items.insert(k,1000);}return Err(Error.Failed);}
change erase(k:u64)->Result<Unit,Error> writes(Items){Items.remove(k);return Ok(());}
";
    let p = parse(source).unwrap();
    let reads = ["size", "doubled", "nested", "others"];
    let mut script = vec![];
    let mut read_all = |script: &mut Vec<Value>| for r in reads { script.push(json!({"call":r,"args":[]})); };
    read_all(&mut script);
    for (k, v) in [(1, 10), (2, 20), (3, 30)] {
        script.push(json!({"call":"put","args":[k,v]}));
        read_all(&mut script);
    }
    script.push(json!({"call":"other","args":[9,5]}));
    read_all(&mut script);
    script.push(json!({"call":"failing","args":[4]}));
    read_all(&mut script);
    script.push(json!({"call":"failing","args":[2]}));
    read_all(&mut script);
    script.push(json!({"call":"erase","args":[1]}));
    read_all(&mut script);
    let mut rt = Runtime::new(p.clone()).unwrap();
    let expected: Vec<Value> = script
        .iter()
        .map(|r| rt.invoke_json(r["call"].as_str().unwrap(), &r["args"]).unwrap().json())
        .collect();
    let code = state_native::emit(&p).unwrap();
    assert!(code.contains("retained_query_l_size") && code.contains("retained_keep_l_total"));
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/retained-derived-values");
    let runner = r#"use compiled_state::State;use serde_json::Value;fn main(){let steps:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();let mut output=vec![];for step in steps{output.push(serde_json::to_value(state.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap()).unwrap());}
// A host transaction that is rolled back discards results retained inside it.
state.begin_transaction().unwrap();state.invoke_json("put",&serde_json::json!([7,700])).unwrap();let inside=state.invoke_json("size",&serde_json::json!([])).unwrap();state.rollback_transaction();let after=state.invoke_json("size",&serde_json::json!([])).unwrap();output.push(serde_json::to_value(inside).unwrap());output.push(serde_json::to_value(after).unwrap());
println!("{}",serde_json::to_string(&output).unwrap());}"#;
    let actual = compile_and_run_with_runner(&root, &code, &script, runner);
    let actual = actual.as_array().unwrap();
    assert_eq!(&actual[..expected.len()], &expected[..]);
    let last = &expected[expected.len() - 4]["result"];
    assert_eq!(actual[expected.len()]["result"], json!(last.as_u64().unwrap() + 1));
    assert_eq!(&actual[expected.len() + 1]["result"], last);
}
