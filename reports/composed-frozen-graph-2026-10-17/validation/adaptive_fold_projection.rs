use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, planning, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;

const SOURCE: &str = include_str!("../examples/adaptive/fold-state-projection.ink");

#[test]
fn projected_frozen_graph_keeps_live_weights_and_all_target_transactions() {
    let source = include_str!("../knowledge/tests/fixtures/owned-frozen-source.ink");
    let checked = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let mut core: serde_json::Value = serde_json::from_slice(&checked.bytes().unwrap()).unwrap();
    core["semantics"] = json!("ink-executable-core-v14");
    core["program"]["frozen"] = json!({"Code":[[0,(0..32).map(|i| json!({
        "kind":if i%2==0 {"Kind.Add"} else {"Kind.Multiply"},"wire":i,"weight":i%2
    })).collect::<Vec<_>>()]]});
    let module = CheckedModule::from_bytes(&serde_json::to_vec(&core).unwrap()).unwrap();
    let distribution = std::env::var_os("INK_DISTRIBUTION")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf());
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/composed-frozen-graph");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("core.json"), module.bytes().unwrap()).unwrap();
    let script = r#"import sys,json,subprocess
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import execute,load
d=Path(sys.argv[2]);compiler=sys.argv[1];core=json.loads((d/'core.json').read_bytes());store=Store.publish(d/'knowledge',[])
recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='fold-state-projection')
context=dict(core=core,source=sys.argv[3],compiler=compiler,knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=180)
rows=list(execute(recipe,context));assert len(rows)==1 and rows[0]['status']=='proposal',rows
plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=context['source'],steps=rows[0]['steps'])
path=d/'plan.json';path.write_bytes(canonical(plan))
checked=json.loads(subprocess.check_output([compiler,'check-plan',str(d/'core.json'),str(path),'--core']))
projected=d/'projected.json';projected.write_bytes(canonical(checked['state']['core']))
subprocess.run([sys.executable,str(Path(sys.argv[4])/'knowledge/producers/frozen_composition.py'),str(projected),'--ink',compiler,'-o',str(d/'frozen.json')],check=True)
plan['steps']+=json.loads((d/'frozen.json').read_bytes())['steps'];path.write_bytes(canonical(plan))
"#;
    let output = Command::new("python3")
        .arg("-c")
        .arg(script)
        .arg(env!("CARGO_BIN_EXE_ink"))
        .arg(&root)
        .arg(module.identity().unwrap())
        .arg(&distribution)
        .env(
            "PYTHONPATH",
            format!(
                "{}:{}",
                distribution.join("knowledge").display(),
                distribution.join("planner").display()
            ),
        )
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let package: planning::Package =
        serde_json::from_slice(&fs::read(root.join("plan.json")).unwrap()).unwrap();
    let selected = planning::check(&module, &package).unwrap();
    assert_eq!(package.steps.len(), 4);
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![json!({"restore":runtime.checkpoint_portable().unwrap()})];
    let mut expected = vec![];
    for weights in [
        json!([]),
        json!([0.5, 2.0]),
        json!([{"F32Bits":2147483648u32},{"F32Bits":2141196852u32}]),
        json!([{"F32Bits":4286578688u32},{"F32Bits":4290777652u32}]),
    ] {
        let mut calls = vec![("retune", json!([weights]))];
        for input in [
            json!([]),
            json!([1.0]),
            json!([{"F32Bits":2147483648u32}]),
            json!([{"F32Bits":2139095040u32}]),
            json!([{"F32Bits":1}]),
            json!([{"F32Bits":2139095041u32}]),
            json!([{"F32Bits":4290777652u32}]),
        ] {
            calls.extend([
                ("serve", json!([input])),
                ("frame", json!([input, false])),
                ("frame", json!([input, true])),
            ]);
        }
        for (name, args) in calls {
            let before = runtime.checkpoint_portable().unwrap();
            let outcome = runtime.invoke_json(name, &args).unwrap();
            let snapshot = runtime.checkpoint_portable().unwrap();
            if name == "frame" {
                assert_eq!(outcome.committed, args[1] == false);
                if args[1] == true {
                    assert_eq!(before, snapshot);
                    assert!(outcome.events.is_empty());
                } else {
                    assert_eq!(outcome.events.len(), 1);
                }
            }
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":snapshot}));
        }
        let snapshot = runtime.checkpoint_portable().unwrap();
        steps.push(json!({"restore":snapshot}));
        runtime = Runtime::restore_portable_checked(&module, &snapshot).unwrap();
    }
    assert_eq!(expected.len(), 88);
    assert_eq!(steps.len(), 93);
    parity::conformance_planned(
        "projected-frozen-graph-parity",
        &selected,
        source,
        steps,
        expected,
    );
}

#[test]
fn projected_adaptive_fold_preserves_reference_and_compiled_state() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let distribution = std::env::var_os("INK_DISTRIBUTION")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf());
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/adaptive-fold-projection");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("core.json"), module.bytes().unwrap()).unwrap();
    let script = r#"import sys,json
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import execute,load
d=Path(sys.argv[2]);core=json.loads((d/'core.json').read_bytes());store=Store.publish(d/'knowledge',[])
recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='fold-state-projection')
context=dict(core=core,source=sys.argv[3],compiler=sys.argv[1],knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=180)
rows=list(execute(recipe,context));assert len(rows)==1 and rows[0]['status']=='proposal',rows
(d/'plan.json').write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=context['source'],steps=rows[0]['steps'])))
"#;
    let output = Command::new("python3")
        .arg("-c")
        .arg(script)
        .arg(env!("CARGO_BIN_EXE_ink"))
        .arg(&root)
        .arg(module.identity().unwrap())
        .env(
            "PYTHONPATH",
            format!(
                "{}:{}",
                distribution.join("knowledge").display(),
                distribution.join("planner").display()
            ),
        )
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let package: planning::Package =
        serde_json::from_slice(&fs::read(root.join("plan.json")).unwrap()).unwrap();
    let selected = planning::check(&module, &package).unwrap();
    let evaluate = selected
        .module()
        .program()
        .functions
        .iter()
        .find(|f| f.name == "evaluate")
        .unwrap();
    assert!(!serde_json::to_string(&evaluate.body)
        .unwrap()
        .contains("total"));
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for weight in [0u32, 1, u32::MAX] {
        let args = json!([weight]);
        let outcome = runtime.invoke_json("retune", &args).unwrap();
        steps.push(json!({"call":"retune","args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
        for code in [
            json!([]),
            json!([0]),
            json!([0, 1, 2, 3, 4, 5, 6, 7]),
            json!([4294967295u32, 0, 1]),
        ] {
            for input in [json!([]), json!([1]), json!([0, 4294967295u32, 17])] {
                for (name, args) in [
                    ("serve", json!([code, input])),
                    ("frame", json!([code, input, false])),
                    ("frame", json!([code, input, true])),
                ] {
                    let before = runtime.checkpoint_portable().unwrap();
                    let outcome = runtime.invoke_json(name, &args).unwrap();
                    let snapshot = runtime.checkpoint_portable().unwrap();
                    if name == "frame" {
                        assert_eq!(outcome.committed, args[2] == false);
                        if args[2] == true {
                            assert_eq!(before, snapshot);
                            assert!(outcome.events.is_empty());
                        } else {
                            assert_eq!(outcome.events.len(), 1);
                        }
                    }
                    steps.push(json!({"call":name,"args":args}));
                    expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":snapshot}));
                }
            }
        }
    }
    assert_eq!(steps.len(), 111);
    parity::conformance_planned(
        "adaptive-fold-projection-parity",
        &selected,
        SOURCE,
        steps,
        expected,
    );
}
