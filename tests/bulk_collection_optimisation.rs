use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    eval,
    optimisation::{self, Package},
    stateful::Runtime,
    syntax,
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/bulk-collections.ink");
#[test]
fn bulk_folds_preserve_order_bits_and_all_targets() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/bulk-collection-selection");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("core.json"), module.bytes().unwrap()).unwrap();
    let out = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(dir.join("core.json"))
        .args([
            "--knowledge-root",
            "knowledge",
            "--snapshot",
            "knowledge/store/snapshot.json",
            "--budget",
            "4096",
            "--rounds",
            "32",
            "-o",
        ])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let package: Package =
        serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&module, &package).unwrap();
    for name in ["collect", "append", "records", "floats"] {
        assert!(
            package.applications.iter().any(|a| a.function == name),
            "missing {name}"
        );
    }
    assert!(!package
        .applications
        .iter()
        .any(|a| a.function == "dependent"));
    let runtime = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let cases = [
        ("collect", json!([[], [91]])),
        ("collect", json!([[u32::MAX, 1, 7], [8, 9]])),
        ("append", json!([[], [91]])),
        ("append", json!([[u32::MAX, 1, 7], [8, 9]])),
        (
            "records",
            json!([[{"key":1,"value":{"F32Bits":0x7fa12345u32}},{"key":2,"value":-0.0}],[{"key":3,"value":1.25}]]),
        ),
        (
            "floats",
            json!([[{"F32Bits":0x7fa12345u32},{"F32Bits":0x80000000u32},1.25],[0.0]]),
        ),
        ("dependent", json!([[1, 2, 3], [8, 9]])),
    ];
    for (name, args) in cases {
        let f = module
            .program()
            .functions
            .iter()
            .find(|f| f.name == name)
            .unwrap();
        let values: Vec<_> = f
            .params
            .iter()
            .zip(args.as_array().unwrap())
            .map(|((_, t), v)| eval::Value::from_program_json(v, t, module.program()).unwrap())
            .collect();
        let reply = eval::call(module.program(), name, values.clone(), &mut 100000)
            .unwrap()
            .json();
        assert_eq!(
            eval::call(selected.module().program(), name, values, &mut 100000)
                .unwrap()
                .json(),
            reply
        );
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(
            json!({"reply":{"value":reply},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    let args = json!([[1, 2, 3, 4]]);
    let value = eval::call(
        module.program(),
        "gpu_map",
        vec![eval::Value::from_program_json(
            &args[0],
            &module
                .program()
                .functions
                .iter()
                .find(|f| f.name == "gpu_map")
                .unwrap()
                .params[0]
                .1,
            module.program(),
        )
        .unwrap()],
        &mut 100000,
    )
    .unwrap()
    .json();
    steps.push(json!({"pure":"gpu_map","args":args,"expect_gpu":true}));
    expected
        .push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance_selected(
        "bulk-collection-selection",
        &selected,
        SOURCE,
        steps,
        expected,
    );
}
