use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, syntax::parse};
#[test]
fn compiled_durable_state_recovers_before_reply_and_keeps_outbox() {
    let module =
        CheckedModule::from_source(parse(include_str!("../examples/inventory.lang")).unwrap())
            .unwrap();
    let dir = Path::new("build/durable-state");
    fs::create_dir_all(dir).unwrap();
    fs::write(
        dir.join("program.mjs"),
        ink_lowering_js::lower(&module).unwrap().javascript,
    )
    .unwrap();
    fs::write(dir.join("state-wasm.mjs"), ink_runtime::STATE_WASM_HOST).unwrap();
    ink_runtime::emit_durable_hosts(dir).unwrap();
    for backend in ["javascript", "rust"] {
        if backend != "javascript" {
            let Some(_wasm) = std::env::var_os("INK_TEST_WASM") else {
                continue;
            };
            let project = dir.join(backend);

                ink_runtime::emit_rust_program(
                    &ink_lowering_rust::state_native::emit(module.program()).unwrap(),
                    &project,
                )
                .unwrap();
            
            ink_runtime::toolchain::complete_program(&project,true,&project.join("program.wasm"),"cargo")
            .unwrap();
        }
        let status = Command::new("node")
            .args([
                "tests/durable-generated.mjs",
                &dir.to_string_lossy(),
                backend,
            ])
            .status()
            .unwrap();
        assert!(status.success(), "durability failed for {backend}");
    }
}

#[path = "../runtime/tests/durable.rs"]
mod host_failure_injection;

#[test]
fn generated_native_durable_hosts_recover_and_retry_after_process_death() {
    let module =
        CheckedModule::from_source(parse(include_str!("../examples/inventory.lang")).unwrap())
            .unwrap();
    let root = Path::new("build/durable-native");
    fs::create_dir_all(root).unwrap();
    for backend in ["rust"] {
        let dir = root.join(backend);

            ink_runtime::emit_rust_program(
                &ink_lowering_rust::state_native::emit(module.program()).unwrap(),
                &dir,
            )
            .unwrap();
        
        let binary = dir.join("program");
        ink_runtime::toolchain::complete_program(&dir,false,&binary,"cargo").unwrap();
        let file = dir.join("state.inkd");
        let _ = fs::remove_file(&file);

        let id = "00000000000000000000000000000001";
        let run = |steps: serde_json::Value| {
            let script = dir.join("script.json");
            fs::write(&script, serde_json::to_vec(&steps).unwrap()).unwrap();
            let out = Command::new(&binary)
                .arg(&script)
                .arg("--durable")
                .arg(&file)
                .output()
                .unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
            serde_json::from_slice::<serde_json::Value>(&out.stdout).unwrap()
        };
        run(
            serde_json::json!([{"id":"create","call":"create","args":[id,"雪\u{0}😀",10]},{"id":"update","call":"restock","args":[id,2]}]),
        );

        // Compile a real process that exits after durable publish but before reply.
        fs::create_dir_all(dir.join("src/bin")).unwrap();
        fs::write(
            dir.join("src/bin/crash.rs"),
            include_str!("support/durable/crash.rs"),
        )
        .unwrap();
        let built = Command::new("cargo")
            .args(["build", "--release", "--bin", "crash", "--manifest-path"])
            .arg(dir.join("Cargo.toml"))
            .output()
            .unwrap();
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
        let killed = Command::new(dir.join("target/release/crash"))
            .arg(&file)
            .status()
            .unwrap();
        assert_eq!(killed.code(), Some(73));
        let replies = run(
            serde_json::json!([{"id":"lost-reply","call":"restock","args":[id,5]},{"id":"read","call":"stock_of","args":[id]},{"id":"overflow","call":"restock","args":[id,4294967295u32]}]),
        );
        assert_eq!(replies[1]["result"]["Some"], 17);
        assert_eq!(replies[2]["committed"], false);
        assert_eq!(replies[0]["version"], 3);
        assert_eq!(replies[2]["version"], 3);
        let pending = || {
            let out = Command::new(dir.join("target/release/crash"))
                .arg(&file)
                .arg("inspect")
                .output()
                .unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
            serde_json::from_slice::<serde_json::Value>(&out.stdout).unwrap()
        };
        assert_eq!(pending().as_array().unwrap().len(), 2);
        run(
            serde_json::json!([{"acknowledge":[3,0]},{"id":"after-ack","call":"stock_of","args":[id]}]),
        );
        assert!(pending().as_array().unwrap().is_empty());
        let snapshot = dir.join("portable.snapshot");
        let out = Command::new(&binary)
            .arg(dir.join("script.json"))
            .arg("--durable")
            .arg(&file)
            .arg("--snapshot-out")
            .arg(&snapshot)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );

        let mut bytes = fs::read(&file).unwrap();
        bytes[12] ^= 1;
        fs::write(&file, bytes).unwrap();
        let rejected = Command::new(&binary)
            .arg(dir.join("script.json"))
            .arg("--durable")
            .arg(&file)
            .output()
            .unwrap();
        assert!(!rejected.status.success());
        assert!(String::from_utf8_lossy(&rejected.stderr).contains("checksum"));
        println!("{backend}: native process death, retry deduplication, abort, outbox acknowledgements and corruption rejection passed");
    }
}

// Wrongly typed JSON arguments are errors, not panics. In Wasm a panic traps
// the instance and loses its state; here the same native state keeps serving.
#[test]
fn generated_native_state_rejects_mistyped_arguments_and_keeps_serving() {
    let module = CheckedModule::from_source(
        parse(
            "module ingress;
enum Label { Bug, Billing, }
record Note {id:u64,label:Label,tags:List<u32>,score:Option<i32>,}
state Notes:Table<u64,Note>=Table.empty();
change put(note:Note)->Result<u64,String> reads(Notes) writes(Notes){Notes.put(note.id,note);return Ok(note.id);}
query label_of(id:u64)->Option<Label> reads(Notes){return Notes.get(id).map(fn(n)=>n.label);}
fn twice(x:u32)->u32{return x+x;}",
        )
        .unwrap(),
    )
    .unwrap();
    let dir = Path::new("build/typed-ingress");
    fs::create_dir_all(dir).unwrap();
    ink_runtime::emit_rust_program(&ink_lowering_rust::state_native::emit(module.program()).unwrap(), dir).unwrap();
    let binary = dir.join("program");
    ink_runtime::toolchain::complete_program(dir, false, &binary, "cargo").unwrap();
    let note = serde_json::json!({"id":1,"label":"Label.Bug","tags":[1,2],"score":{"Some":-3}});
    let mut wrong = vec![
        serde_json::json!([{"id":2,"label":"Label.Urgent","tags":[],"score":{"None":null}}]),
        serde_json::json!([{"id":2,"label":"Label.Bug","tags":[]}]),
        serde_json::json!([{"id":2,"label":"Label.Bug","tags":[],"score":{"None":null},"extra":1}]),
        serde_json::json!([{"id":2,"label":"Label.Bug","tags":[4294967296u64],"score":{"None":null}}]),
        serde_json::json!([{"id":2,"label":"Label.Bug","tags":[],"score":{"Some":2147483648u64}}]),
        serde_json::json!([42]),
        serde_json::json!([]),
        serde_json::json!({"note":1}),
    ];
    let mut script: Vec<serde_json::Value> = wrong
        .drain(..)
        .map(|args| serde_json::json!({"call":"put","args":args}))
        .collect();
    script.push(serde_json::json!({"pure":"twice","args":["x"]}));
    script.push(serde_json::json!({"pure":"twice","args":[]}));
    script.push(serde_json::json!({"call":"put","args":[note]}));
    script.push(serde_json::json!({"call":"label_of","args":[1]}));
    script.push(serde_json::json!({"pure":"twice","args":[4]}));
    let path = dir.join("script.json");
    fs::write(&path, serde_json::to_vec(&script).unwrap()).unwrap();
    let out = Command::new(&binary).arg(&path).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let replies: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    let replies = replies.as_array().unwrap();
    for reply in &replies[..10] {
        assert!(reply["host_error"].is_string(), "mistyped call answered {reply}");
    }
    assert_eq!(replies[10]["result"], serde_json::json!({"Ok":1}));
    assert_eq!(replies[11]["result"], serde_json::json!({"Some":"Label.Bug"}));
    assert_eq!(replies[12], serde_json::json!(8));
}

// Native state reports which roots and keys each commit changed, in the
// shape the JavaScript lowering's takeChanges uses, so hosts can keep keyed
// readers current when another key changes.
#[test]
fn generated_native_state_reports_changed_roots_and_keys() {
    let module = CheckedModule::from_source(
        parse(
            "module changes;
record Row {id:u64,open:Bool,}
state Rows:Table<u64,Row>=Table.empty();
state Version:u64=0;
change put(row:Row)->Result<Unit,String> reads(Rows,Version) writes(Rows,Version){Rows.put(row.id,row);Version=Version+1;return Ok(());}
change touch(row:Row)->Result<Unit,String> reads(Rows) writes(Rows){Rows.put(row.id,row);return Ok(());}
change failing(row:Row)->Result<Unit,String> reads(Rows) writes(Rows){Rows.put(row.id,row);return Err(\"no\");}
change many(keys:List<u64>,rows:List<Row>)->Result<Unit,String> reads(Rows) writes(Rows){return Rows.put_many(keys,rows);}",
        )
        .unwrap(),
    )
    .unwrap();
    let dir = Path::new("build/native-changes");
    fs::create_dir_all(dir.join("src/bin")).unwrap();
    ink_runtime::emit_rust_program(&ink_lowering_rust::state_native::emit(module.program()).unwrap(), dir).unwrap();
    fs::write(
        dir.join("src/bin/changes.rs"),
        r#"use compiled_state::State;use serde_json::json;
fn main(){let mut s=State::new();let mut out=vec![];
 out.push(s.take_changes());
 assert!(s.track_changes());
 let mut call=|s:&mut State,name:&str,args:serde_json::Value|{s.invoke_json(name,&args).unwrap();s.take_changes()};
 out.push(call(&mut s,"put",json!([{"id":5,"open":true}])));
 out.push(call(&mut s,"touch",json!([{"id":5,"open":true}])));
 out.push(call(&mut s,"touch",json!([{"id":5,"open":false}])));
 out.push(call(&mut s,"failing",json!([{"id":6,"open":true}])));
 let keys:Vec<u64>=(100..200).collect();let rows:Vec<_>=keys.iter().map(|k|json!({"id":k,"open":true})).collect();
 out.push(call(&mut s,"many",json!([keys,rows])));
 println!("{}",serde_json::Value::Array(out));}
"#,
    )
    .unwrap();
    let built = Command::new("cargo")
        .args(["build", "--release", "--bin", "changes", "--manifest-path"])
        .arg(dir.join("Cargo.toml"))
        .output()
        .unwrap();
    assert!(built.status.success(), "{}", String::from_utf8_lossy(&built.stderr));
    let out = Command::new(dir.join("target/release/changes")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let reports: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    use serde_json::json;
    assert_eq!(reports[0], json!({"all":true}), "nothing is known before tracking starts");
    assert_eq!(reports[1]["roots"], json!(["Rows", "Version"]));
    assert_eq!(reports[1]["keys"]["Rows"], json!([5]));
    assert_eq!(reports[1]["filters"], serde_json::Value::Null);
    assert_eq!(reports[2], json!({"all":false,"roots":[],"filters":null,"keys":{}}), "an identical rewrite changes nothing");
    assert_eq!(reports[3]["roots"], json!(["Rows"]));
    assert_eq!(reports[3]["keys"], json!({"Rows":[5]}));
    assert_eq!(reports[4]["roots"], json!([]), "a failed change reports nothing");
    assert_eq!(reports[5]["keys"]["Rows"], serde_json::Value::Null, "more than 64 keys name the root only");
}
