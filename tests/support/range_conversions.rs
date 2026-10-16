use super::{optimisation, parity, syntax, CheckedModule, Runtime};
use serde_json::json;
use std::{fs, path::Path, process::Command};

#[test]
fn checked_range_conversions_preserve_complete_cpu_values() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/range-conversion-parity");
    fs::create_dir_all(&output).unwrap();
    let pythonpath = std::env::join_paths([root.join("knowledge"), root.join("planner")]).unwrap();
    let negatives = Command::new("python3")
        .args(["-m", "unittest", "discover", "-s", "knowledge/tests", "-p", "test_range_conversions.py"])
        .env("PYTHONPATH", &pythonpath).env("INK_COMPILER", env!("CARGO_BIN_EXE_ink"))
        .output().unwrap();
    assert!(negatives.status.success(), "{}", String::from_utf8_lossy(&negatives.stderr));
    let python = r#"import sys,tempfile
from pathlib import Path
from ink_knowledge import canonical
from producers.conditional_facts import acquire
compiler,source,out=map(Path,sys.argv[1:])
with tempfile.TemporaryDirectory()as tmp:
 packet,receipt=acquire(source,compiler,Path(tmp),seconds=15)
 assert {a['function']for a in packet['applications']}=={'guarded','relational','wrapped','small'},receipt
 (out/'selection.json').write_bytes(canonical(packet));(out/'receipt.json').write_bytes(canonical(receipt))
"#;
    let result = Command::new("python3")
        .args(["-c", python, env!("CARGO_BIN_EXE_ink")])
        .arg(root.join("knowledge/tests/fixtures/range-conversions/source.ink"))
        .arg(&output).env("PYTHONPATH", &pythonpath).output().unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
    let source = include_str!("../../knowledge/tests/fixtures/range-conversions/source.ink");
    let input = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let packet = serde_json::from_slice(&fs::read(output.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&input, &packet).unwrap();
    let snapshot = Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    use verified_language::eval::Value::{U32, U64};
    let mut push = |function: &str, args: Vec<verified_language::eval::Value>| {
        let value = verified_language::eval::call(input.program(), function, args.clone(), &mut 1_000_000).unwrap();
        steps.push(json!({"pure":function,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":true}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    for x in [0, 1, 255, u32::MAX as u64, 1u64 << 32, (1u64 << 32) + 1, u64::MAX - 1, u64::MAX] {
        for function in ["guarded", "opposite", "wrapped", "wrong_input", "unchanged"] {
            push(function, vec![U64(x)]);
        }
        push("small", vec![U32(x as u32)]);
        for upper in [0, 1, u32::MAX as u64, 1u64 << 32, u64::MAX] {
            push("relational", vec![U64(x), U64(upper)]);
        }
    }
    parity::conformance_selected("range-conversions", &selected, source, steps, expected);
}
