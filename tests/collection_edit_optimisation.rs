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
const SOURCE: &str = include_str!("../examples/collection-edits.ink");
#[test]
fn generic_edits_are_selected_and_preserve_values_bits_events_and_snapshots() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/collection-edit-selection");
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
    for name in [
        "overwrite",
        "unchanged",
        "truncate_twice",
        "unchanged_float",
        "overwrite_record",
        "unchanged_string",
        "overwritten_work",
    ] {
        assert!(
            package.applications.iter().any(|a| a.function == name),
            "missing {name}"
        );
    }
    // The unchanged write becomes the input list: no owner creation/copy remains.
    let original = optimisation::subject(&module).unwrap();
    let result = optimisation::subject(selected.module()).unwrap();
    assert_eq!(
        result.functions["unchanged"].node,
        verified_language::semantic::Node::Free("xs".into())
    );
    assert!(
        serde_json::to_string(&original.functions["overwritten_work"])
            .unwrap()
            .contains("call:foldr")
    );
    assert!(
        !serde_json::to_string(&result.functions["overwritten_work"])
            .unwrap()
            .contains("call:foldr")
    );
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut selected_runtime = Runtime::new_selected(&selected).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let record_a = json!({"key":1,"value":1.25});
    let record_b = json!({"key":2,"value":-0.0});
    let cases = [
        ("overwrite", json!([[], 0, 1, 2])),
        ("overwrite", json!([[4, 5, 6], 1, 99, 7])),
        ("overwrite", json!([[4], u32::MAX, 99, 7])),
        ("unchanged", json!([[1, 2, 3], 2, 9])),
        ("unchanged", json!([[], 0, 9])),
        ("unchanged", json!([[1], u32::MAX, 9])),
        ("truncate_twice", json!([[1, 2, 3], 0])),
        ("truncate_twice", json!([[1, 2, 3], 2])),
        ("truncate_twice", json!([[1, 2, 3], u32::MAX])),
        ("unchanged_string", json!([["α", "hello"], 1, "fallback"])),
        (
            "overwrite_record",
            json!([[record_a.clone()], 0, record_a, record_b]),
        ),
        ("overwritten_work", json!([[u32::MAX, 1, 7], 1, 42])),
        (
            "unchanged_float",
            json!([[{"F32Bits":0x7fc12345u32},{"F32Bits":0x80000000u32}],0,{"F32Bits":0x7fa12345u32}]),
        ),
        (
            "unchanged_float",
            json!([[{"F32Bits":0x7fc12345u32},{"F32Bits":0x80000000u32}],1,0.0]),
        ),
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
        steps.push(json!({"pure":name,"args":args,"cpu_only":name=="unchanged_float"}));
        expected.push(
            json!({"reply":{"value":reply},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    for (name, args) in [
        ("put", json!([[1, 2, 3], 1, 7, 9, false])),
        ("put", json!([[1, 2, 3], 1, 7, 9, false])),
        ("put", json!([[6, 5], 0, 7, 9, true])),
        ("get", json!([])),
    ] {
        let reply = runtime.invoke_json(name, &args).unwrap().json();
        assert_eq!(
            selected_runtime.invoke_json(name, &args).unwrap().json(),
            reply
        );
        let snapshot = runtime.checkpoint_portable().unwrap();
        assert_eq!(selected_runtime.checkpoint_portable().unwrap(), snapshot);
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply},"snapshot":snapshot}));
    }
    parity::conformance_selected(
        "collection-edit-selection",
        &selected,
        SOURCE,
        steps,
        expected,
    );
}
