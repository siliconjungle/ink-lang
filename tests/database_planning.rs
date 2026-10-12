use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, stateful::Runtime, syntax};
#[test]
fn recursive_database_plan_preserves_every_observation_and_original_checkpoints() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/database-plan-conformance");
    fs::create_dir_all(&dir).unwrap();
    let source=format!("{}\nfn total(xs:List<u32>)->u32{{return sum(xs);}}\nfn mapped(xs:List<u32>)->List<u32>{{return xs.map(fn(x)=>x+1);}}\n",include_str!("../examples/point-query-delta.ink"));
    fs::write(dir.join("source.ink"), &source).unwrap();
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut oracle = vec![];
    let calls = [
        ("put", json!([0, 9])),
        ("zero", json!([])),
        ("replace_zero", json!([12, true])),
        ("zero", json!([])),
        ("replace_zero", json!([17, false])),
        ("erase_zero", json!([true])),
        ("get", json!([0])),
        ("erase_zero", json!([false])),
        ("zero", json!([])),
        ("__unknown", json!([])),
    ];
    for (name, args) in &calls {
        let before = runtime.checkpoint_portable().unwrap();
        let reply = match runtime.invoke_json(name, args) {
            Ok(v) => json!({"ok":v.json()}),
            Err(e) => {
                assert_eq!(runtime.checkpoint_portable().unwrap(), before);
                json!({"error":e})
            }
        };
        oracle.push(json!({"call":name,"args":args,"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap(),"outbox":runtime.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<Value>>()}));
    }
    runtime.acknowledge_through(u64::MAX, u64::MAX);
    oracle.push(json!({"ack":[u64::MAX,u64::MAX],"snapshot":runtime.checkpoint_portable().unwrap(),"outbox":[]}));
    let layout = verified_language::snapshot::layout(module.program()).unwrap();
    let logical = verified_language::snapshot_wire::decode(
        &layout,
        &runtime.checkpoint_portable().unwrap(),
        Default::default(),
    )
    .unwrap();
    let exhausted = verified_language::snapshot_wire::encode(
        &layout,
        &verified_language::snapshot_wire::Logical {
            version: u64::MAX,
            ..logical
        },
        Default::default(),
    )
    .unwrap();
    runtime = Runtime::restore_portable(module.program().clone(), &exhausted).unwrap();
    oracle.push(
        json!({"restore":exhausted,"snapshot":runtime.checkpoint_portable().unwrap(),"outbox":[]}),
    );
    for (name, args) in &calls {
        let reply = match runtime.invoke_json(name, args) {
            Ok(v) => json!({"ok":v.json()}),
            Err(e) => json!({"error":e}),
        };
        oracle.push(json!({"call":name,"args":args,"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap(),"outbox":[]}));
    }
    fs::write(
        dir.join("oracle.json"),
        serde_json::to_vec(&oracle).unwrap(),
    )
    .unwrap();
    let output = Command::new("python3")
        .arg(root.join("tools/database_planning_conformance.py"))
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&dir)
        .output()
        .unwrap();
    fs::write(
        dir.join("run.log"),
        [output.stdout.as_slice(), output.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
