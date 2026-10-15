use super::{optimisation, parity, syntax, CheckedModule, Runtime};
use serde_json::json;
use std::{fs, path::Path, process::Command};
#[test]
fn source_bound_call_summaries_preserve_complete_values() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let d = root.join("build/call-facts-parity");
    fs::create_dir_all(&d).unwrap();
    let pythonpath=std::env::join_paths([root.join("knowledge"),root.join("planner")]).unwrap();
    let negatives=Command::new("python3").args(["-m","unittest","discover","-s","knowledge/tests","-p","test_call_facts.py"])
        .env("PYTHONPATH",&pythonpath).env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")).output().unwrap();
    assert!(negatives.status.success(),"{}",String::from_utf8_lossy(&negatives.stderr));
    let source = include_str!("../../examples/interprocedural-facts.ink");
    assert_eq!(
        source,
        include_str!("../../knowledge/tests/fixtures/call-facts/source.ink")
    );
    let python = r#"import sys,tempfile
from pathlib import Path
from ink_knowledge import canonical
from producers.conditional_facts import acquire
compiler,source,out=map(Path,sys.argv[1:])
with tempfile.TemporaryDirectory()as tmp:
 packet,receipt=acquire(source,compiler,Path(tmp),seconds=60)
 assert {a['function']for a in packet['applications']}=={'bounded','observed'}
 (out/'selection.json').write_bytes(canonical(packet));(out/'receipt.json').write_bytes(canonical(receipt))
"#;
    let out = Command::new("python3")
        .args(["-c", python, env!("CARGO_BIN_EXE_ink")])
        .arg(root.join("examples/interprocedural-facts.ink"))
        .arg(&d)
        .env(
            "PYTHONPATH",
            std::env::join_paths([root.join("knowledge"), root.join("planner")]).unwrap(),
        )
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let p = syntax::parse(source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let packet = serde_json::from_slice(&fs::read(d.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&module, &packet).unwrap();
    let snapshot = Runtime::new_selected(&selected)
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    use verified_language::eval::Value::U32;
    let mut push = |name: &str, args: Vec<verified_language::eval::Value>| {
        let value = verified_language::eval::call(&p, name, args.clone(), &mut 1_000_000).unwrap();
        steps.push(json!({"pure":name,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":true}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    for x in [0, 1, 4, 7, 255, 256, 2147483652, u32::MAX] {
        for name in ["observed", "collision"] {
            push(name, vec![U32(x)]);
        }
        for upper in [0, 1, 256, 257, u32::MAX] {
            push("bounded", vec![U32(x), U32(upper)]);
        }
    }
    parity::conformance_selected("call-facts-parity", &selected, source, steps, expected);
}
