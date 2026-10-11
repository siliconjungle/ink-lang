use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{state_native, stateful::Runtime, syntax::parse};

// Cargo serializes compilation, but another test can replace this shared
// executable between build and run. Hold the lock across each native suite.
static NATIVE_EXECUTION: std::sync::Mutex<()> = std::sync::Mutex::new(());

const EXTRA: &str = r#"
keep expensive: Int = sum(Items.values().filter(fn(item) => item.stock > 100).map(fn(item) => Int(item.stock) * Int(item.stock)).map(fn(x) => x));
keep large_count: Int = count(Items.values().filter(fn(item) => item.stock > 100));
query derived() -> Int reads(expensive, large_count) { return expensive + large_count; }
change delete(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Ok(()); }
change fail(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 7)?; restock(id, 9)?; return Err(Error.Overflow); }
change add_and_read(id: ItemId) -> Result<Int, Error> writes(Items) reads(total_units) emits(stock_changed) { restock(id, 3)?; return Ok(total_units); }
change delete_and_fail(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Err(Error.Overflow); }
change ignore_failure(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 1); return Ok(()); }
query arithmetic(x:u32) -> u32 {return (x * 7) + 3;}
query negative() -> Int {return Int(2) - Int(5);}
query literal() -> Result<u32, Error> {return Ok(3);}
query empty() -> Option<u32> {return None;}
"#;

fn compile_and_run(dir: &Path, code: &str, script: &[Value]) -> Value {
    compile_and_run_with_runner(dir, code, script, verified_language::runtime::STATE_RUNNER)
}
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

fn migrate_and_continue(
    dir: &Path,
    p: &verified_language::syntax::Program,
    script: &[Value],
    carry: &mut Option<Vec<u8>>,
) {
    let mut rt = if let Some(bytes) = carry.as_ref() {
        Runtime::restore_portable(p.clone(), bytes).unwrap()
    } else {
        let mut rt = Runtime::new(p.clone()).unwrap();
        for step in &script[..500] {
            rt.invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap();
        }
        rt.acknowledge_through(rt.version().saturating_sub(1), u64::MAX);
        rt
    };
    let before = rt.checkpoint_portable().unwrap();
    fs::write(dir.join("restore.bin"), &before).unwrap();
    let steps = &script[500..1000];
    let expected: Vec<_> = steps
        .iter()
        .map(|s| {
            rt.invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    fs::write(
        dir.join("continue.json"),
        serde_json::to_vec(steps).unwrap(),
    )
    .unwrap();
    let run = Command::new(
        dir.parent()
            .unwrap()
            .join("native-test-target/debug/compiled-state"),
    )
    .arg(dir.join("continue.json"))
    .arg("--restore")
    .arg(dir.join("restore.bin"))
    .arg("--snapshot-out")
    .arg(dir.join("native.bin"))
    .output()
    .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let got: Value = serde_json::from_slice(&run.stdout).unwrap();
    assert_eq!(got, json!(expected));
    let bytes = fs::read(dir.join("native.bin")).unwrap();
    assert_eq!(bytes, rt.checkpoint_portable().unwrap());
    let restored = Runtime::restore_portable(p.clone(), &bytes).unwrap();
    assert_eq!(restored.checkpoint_portable().unwrap(), bytes);
    *carry = Some(bytes);
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
