use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, stateful::Runtime, syntax::parse};

#[test]
fn mixed_native_gpu_host_recovers_transactions_and_preserves_pure_dispatch() {
    if std::env::var_os("INK_TEST_WGPU").is_none() {
        return;
    }
    let source = format!(
        "{}\nfn gpu_sum(xs:List<u32>)->u32 {{return sum(xs.map(fn(x)=>x+1));}}",
        include_str!("../examples/inventory.lang")
    );
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/mixed-durable-native");
    ink_runtime::module::emit(&module, &root).unwrap();
    fs::write(root.join("source.ink"), &source).unwrap();
    let project = root.join("native");
    fs::create_dir_all(project.join("src/bin")).unwrap();
    fs::write(
        project.join("src/bin/crash.rs"),
        include_str!("support/durable/crash.rs"),
    )
    .unwrap();
    let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-gpu-target");
    let build = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--bins", "--manifest-path"])
        .arg(project.join("Cargo.toml"))
        .env("CARGO_TARGET_DIR", &target)
        .output()
        .unwrap();
    assert!(
        build.status.success(),
        "{}",
        String::from_utf8_lossy(&build.stderr)
    );
    let binary = target.join("debug/ink-module-program");
    let crash = target.join("debug/crash");
    let file = root.join("state.inkd");
    let snapshot = root.join("portable.snapshot");
    let _ = fs::remove_file(&file);
    let run = |steps: Value| {
        let script = root.join("script.json");
        fs::write(&script, serde_json::to_vec(&steps).unwrap()).unwrap();
        let out = Command::new(&binary)
            .arg(&script)
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
        serde_json::from_slice::<Value>(&out.stdout).unwrap()
    };
    run(json!([]));
    let empty = fs::read(&file).unwrap();
    let pure = run(json!([{"pure":"gpu_sum","args":[[1,2,3]],"backend":"gpu"}]));
    assert_eq!(pure[0]["value"], 9);
    assert_eq!(pure[0]["backend"], "gpu", "{pure}");
    assert_eq!(
        fs::read(&file).unwrap(),
        empty,
        "pure GPU calls must not publish retry receipts/state"
    );
    let id = "00000000000000000000000000000001";
    let initial = json!([{"id":"create","call":"create","args":[id,"bolts",10]}, {"id":"update","call":"restock","args":[id,2]}]);
    fs::write(
        root.join("initial.json"),
        serde_json::to_vec(&initial).unwrap(),
    )
    .unwrap();
    let replies = run(initial.clone());
    let mut reference = Runtime::new(module.program().clone()).unwrap();
    for (step, reply) in initial
        .as_array()
        .unwrap()
        .iter()
        .zip(replies.as_array().unwrap())
    {
        assert_eq!(
            *reply,
            reference
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json()
        );
    }
    assert_eq!(
        fs::read(&snapshot).unwrap(),
        reference.checkpoint_portable().unwrap()
    );
    let death = Command::new(&crash).arg(&file).status().unwrap();
    assert_eq!(death.code(), Some(73));
    let recovery = json!([
        {"pure":"gpu_sum","args":[[4,5]],"backend":"gpu"},
        {"id":"lost-reply","call":"restock","args":[id,5]},
        {"id":"read","call":"stock_of","args":[id]},
        {"id":"overflow","call":"restock","args":[id,u32::MAX]},
        {"id":"lost-reply","call":"restock","args":[id,6]}
    ]);
    fs::write(
        root.join("recovery.json"),
        serde_json::to_vec(&recovery).unwrap(),
    )
    .unwrap();
    let recovered = run(recovery);
    assert_eq!(recovered[0]["backend"], "gpu");
    assert_eq!(recovered[0]["value"], 11);
    assert_eq!(recovered[1]["version"], 3);
    assert_eq!(recovered[2]["result"]["Some"], 17);
    assert_eq!(recovered[3]["committed"], false);
    assert!(recovered[4]["host_error"]
        .as_str()
        .unwrap()
        .contains("different arguments"));
    for (name, args) in [
        ("restock", json!([id, 5])),
        ("stock_of", json!([id])),
        ("restock", json!([id, u32::MAX])),
    ] {
        reference.invoke_json(name, &args).unwrap();
    }
    assert_eq!(
        fs::read(&snapshot).unwrap(),
        reference.checkpoint_portable().unwrap()
    );
    let inspect = || {
        let out = Command::new(&crash)
            .arg(&file)
            .arg("inspect")
            .output()
            .unwrap();
        assert!(out.status.success());
        serde_json::from_slice::<Value>(&out.stdout).unwrap()
    };
    assert_eq!(inspect().as_array().unwrap().len(), 2);
    run(json!([{"acknowledge":[3,0]}]));
    reference.acknowledge_through(3, 0);
    assert_eq!(
        fs::read(&snapshot).unwrap(),
        reference.checkpoint_portable().unwrap()
    );
    assert!(inspect().as_array().unwrap().is_empty());
    let persisted = fs::read(&file).unwrap();
    let missing = run(json!([{"call":"restock","args":[id,1]}]));
    assert!(missing[0]["host_error"]
        .as_str()
        .unwrap()
        .contains("request id"));
    assert_eq!(fs::read(&file).unwrap(), persisted);
    let forbidden = root.join("restore.json");
    fs::write(&forbidden, "[{\"restore\":[]}]").unwrap();
    let rejected = Command::new(&binary)
        .arg(&forbidden)
        .arg("--durable")
        .arg(&file)
        .output()
        .unwrap();
    assert!(!rejected.status.success());
    assert!(String::from_utf8_lossy(&rejected.stderr).contains("restore step"));
    assert_eq!(fs::read(&file).unwrap(), persisted);
    let mut corrupt = persisted;
    corrupt[12] ^= 1;
    fs::write(&file, corrupt).unwrap();
    let rejected = Command::new(&binary)
        .arg(root.join("script.json"))
        .arg("--durable")
        .arg(&file)
        .output()
        .unwrap();
    assert!(!rejected.status.success());
    assert!(String::from_utf8_lossy(&rejected.stderr).contains("checksum"));
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&recovered).unwrap(),
    )
    .unwrap();
    println!("mixed wgpu: 2 actual GPU calls, crash recovery, exact reference checkpoints, retry identity, abort, acknowledgements and corruption rejection passed");
}
