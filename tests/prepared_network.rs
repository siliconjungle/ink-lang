use serde_json::json;
use std::{fs, path::{Path, PathBuf}, process::Command};
use verified_language::{core::CheckedModule, planning, snapshot, snapshot_wire, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn authored_network_specialization_preserves_live_learning_and_exact_histories() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let input = root.join("handoff/functionality-2026-10-17/network/authored-frozen.core.json");
    let module = CheckedModule::from_bytes(&fs::read(&input).unwrap()).unwrap();
    let directory = root.join("build/ink-functionality-20261017/full-network-runtime");
    fs::create_dir_all(&directory).unwrap();
    let packet_file = if let Some(path) = std::env::var_os("INK_PREPARED_NETWORK_PLAN") {
        PathBuf::from(path)
    } else {
        let file = directory.join("plan.json");
        let output = Command::new("python3").arg("knowledge/producers/frozen_composition.py")
            .arg(&input).arg("--ink").arg(env!("CARGO_BIN_EXE_ink")).arg("-o").arg(&file).output().unwrap();
        fs::write(directory.join("authoring.stdout"), &output.stdout).unwrap();
        fs::write(directory.join("authoring.stderr"), &output.stderr).unwrap();
        assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
        file
    };
    let packet = planning::from_bytes(&fs::read(packet_file).unwrap()).unwrap();
    let plan = planning::check(&module, &packet).unwrap();
    assert!(packet.steps.len() >= 3);
    assert!(plan.module().program().functions.len() > module.program().functions.len() + 128);
    assert_eq!(plan.module().program().frozen, module.program().frozen);
    assert_eq!(serde_json::to_value(&plan.module().program().contracts.learning).unwrap(),
               serde_json::to_value(&module.program().contracts.learning).unwrap());
    assert_eq!(plan.module().program().actions.len(), module.program().actions.len());
    fs::write(directory.join("input.core.json"), module.bytes().unwrap()).unwrap();
    fs::write(directory.join("selected.core.json"), plan.module().bytes().unwrap()).unwrap();

    // Start in this authored frozen namespace. Historical trained snapshots
    // belong to the original application and must not be rebound into it.
    assert!(Runtime::restore_portable_checked(&module,
        &fs::read(root.join("handoff/functionality-2026-10-17/network/model.snapshot")).unwrap()).is_err());
    let mut baseline = Runtime::from_checked(&module).unwrap();
    let initial = baseline.checkpoint_portable().unwrap();
    let initial_model = baseline.invoke_json("model", &json!([])).unwrap().result.json();
    assert_eq!(initial_model["Ok"]["weights"].as_array().unwrap().len(), 244);
    let layout = snapshot::layout(module.program()).unwrap();
    let mut logical = snapshot_wire::decode(&layout, &initial, Default::default()).unwrap();
    let architecture = layout.roots.iter().position(|(name, _, _)| name == "Architecture").unwrap();
    assert_eq!(logical.tables[architecture][0].1["Ok"]["features"], 10);
    logical.tables[architecture][0].1["Ok"]["features"] = json!(9);
    let forged = snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable_checked(&module, &forged).err().unwrap().contains("frozen"));
    let mut steps = vec![json!({"restore":initial}), json!({"reject_restore":forged,"restore_error":"frozen"})];
    let mut expected = vec![];
    let features = json!([vec![0.2; 10]]);
    let target = json!([1., 0., 1., 0.]);
    let mut calls = vec![
        ("model", json!([])), ("control", json!([])), ("predict", features.clone()),
        ("objective", json!([features[0], target])),
        ("observe", json!([features[0], target, 1])),
        ("observe", json!([[0.2], target, 2])),
        ("observe", json!([features[0], target, 2])),
        ("model", json!([])), ("predict", features.clone()),
        ("objective", json!([features[0], target])),
        ("cancel", json!([features[0], target])), ("model", json!([])),
        ("observe", json!([features[0], target, 2])),
        ("model", json!([])), ("control", json!([])), ("predict", features.clone()),
        ("predict", json!([[]])),
    ];
    for bits in [0u32, 0x80000000, 0x7f800000, 0x7fa01234] {
        let mut input = json!(vec![0.2; 10]); input[0] = json!({"F32Bits":bits});
        calls.push(("predict", json!([input])));
    }
    for (name, args) in calls {
        let before = baseline.checkpoint_portable().unwrap();
        let reply = baseline.invoke_json(name, &args).unwrap();
        if !reply.committed { assert_eq!(before, baseline.checkpoint_portable().unwrap()); }
        if name == "predict" && args == features { assert_eq!(reply.result.json()["Ok"].as_array().unwrap().len(), 4); }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
    }
    let updated = baseline.invoke_json("model", &json!([])).unwrap().result.json();
    assert_ne!(initial_model["Ok"]["weights"], updated["Ok"]["weights"]);
    let trained = baseline.checkpoint_portable().unwrap();
    baseline = Runtime::restore_portable_checked(&module, &initial).unwrap();
    steps.push(json!({"restore":initial}));
    for (name, args) in [("predict", features.clone()), ("model", json!([]))] {
        let reply = baseline.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
    }
    baseline = Runtime::restore_portable_checked(&module, &trained).unwrap();
    steps.push(json!({"restore":trained}));
    let reply = baseline.invoke_json("predict", &features).unwrap();
    steps.push(json!({"call":"predict","args":features}));
    expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
    fs::write(directory.join("reference-history.json"), serde_json::to_vec_pretty(&expected).unwrap()).unwrap();
    parity::conformance_planned("ink-functionality-20261017/full-network-runtime", &plan,
        include_str!("../handoff/functionality-2026-10-17/network/authored-frozen.core.json"), steps, expected);
}
