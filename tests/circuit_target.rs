//! The circuit target (docs/circuit-target.md): exact affine/ReLU/ReGLU
//! lowering of finite functions, checked on every input.
use serde_json::{json, Value};
use std::{path::Path, process::Command};
use verified_language::{
    circuit::{check, evaluate, lower, Node},
    core::CheckedModule,
    learn_rows::{apply, rows, Row},
    stateful::Runtime,
    syntax,
};

const CROSSING: &str = include_str!("../examples/circuit-target.ink");

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn learned(m: &CheckedModule) -> Value {
    Runtime::from_checked(m).unwrap().invoke_json("__learn_get", &json!([])).unwrap().result.json()
}
fn row(key: [&str; 3], value: &str) -> Row {
    Row { hole: "override".into(), key: Some(key.iter().map(|s| s.to_string()).collect()), index: None, value: json!(value) }
}

#[test]
fn finite_functions_lower_exactly_and_holes_become_lookup_weights() {
    let m = module(CROSSING);
    let hs = &m.program().contracts.learning.holes;
    let params = learned(&m);
    // A trained-looking table: three rows differ from the untrained default.
    let edit = [row(["Light.Red", "Timer.Expired", "Sensor.Clear"], "Light.Red"), row(["Light.Walk", "Timer.Expired", "Sensor.Clear"], "Light.Red"), row(["Light.Walk", "Timer.Expired", "Sensor.Waiting"], "Light.Red")];
    let (trained, changed) = apply(hs, &params, &edit).unwrap();
    assert_eq!(changed, 3);
    for (function, table) in [("next", &params), ("next", &trained), ("safe", &trained), ("authored", &trained)] {
        let c = lower(&m, function, Some(table)).unwrap();
        assert_eq!(check(&m, &c, Some(table)).unwrap(), 24);
        // Every node is affine, ReLU, a ReGLU gate, a constant or an input.
        assert!(c.nodes.iter().all(|n| matches!(n, Node::Input { .. } | Node::Const { .. } | Node::Affine { .. } | Node::Relu { .. } | Node::Gate { .. })));
    }
    // The lookup layer's weights are the hole's rows.
    let c = lower(&m, "next", Some(&trained)).unwrap();
    let layer = &c.holes[0];
    let Node::Affine { terms, .. } = &c.nodes[layer.node] else { panic!() };
    let listed = rows(hs, &trained).unwrap();
    for (entry, r) in listed.iter().enumerate() {
        let (value, _, w) = terms.iter().find(|t| t.1 as usize == entry).unwrap();
        assert_eq!((layer.values[*value as usize].as_str(), *w), (r.value.as_str().unwrap(), 1.0));
    }
    // Changing the weight of a row the hole reaches makes the circuit disagree
    // with the program. Entry 8 (Green, Expired, Clear) is covered by the
    // authored rules, so its weight never affects any output.
    let tamper = |entry: u32| {
        let mut t = c.clone();
        if let Node::Affine { terms, .. } = &mut t.nodes[layer.node] {
            let x = terms.iter_mut().find(|t| t.1 == entry).unwrap();
            x.0 = (x.0 + 1) % 4;
        }
        t
    };
    assert!(check(&m, &tamper(10), Some(&trained)).unwrap_err().contains("disagrees"));
    assert_eq!(check(&m, &tamper(8), Some(&trained)).unwrap(), 24);
    // Raw outputs are exact one-hot vectors.
    let out = evaluate(&c, &[2, 1, 1]).unwrap();
    assert_eq!(out, [0.0, 0.0, 0.0, 1.0]);
}

#[test]
fn unsupported_programs_fail_closed() {
    let m = module(include_str!("../examples/learn-holes.ink"));
    let l = learned(&m);
    assert!(lower(&m, "rank", Some(&l)).unwrap_err().contains("unsupported type F32"));
    assert!(lower(&m, "features", Some(&l)).is_err());
    lower(&m, "step", Some(&l)).unwrap();
    let words = module("module w;\nfn f(x: u32) -> Bool { return x == 1; }\n");
    assert!(lower(&words, "f", None).unwrap_err().contains("unsupported type U32"));
    let mlp = module("module m;\nfn g(x: Bool) -> f32 ensures result >= 0.0 { return learn h([choose(x, 1.0, 0.0)]): Mlp<1, 2, 1> else 0.0; }\n");
    assert!(lower(&mlp, "g", Some(&learned(&mlp))).is_err());
}

#[test]
fn javascript_evaluates_circuits_and_edits_hole_weights_as_rows() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/circuit-target");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let out = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["emit-circuit"]).arg(root.join("examples/circuit-target.ink")).args(["next", "-o"]).arg(dir.join("next.json"))
        .output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let m = module(CROSSING);
    let hs = &m.program().contracts.learning.holes;
    let edit = vec![row(["Light.Red", "Timer.Expired", "Sensor.Clear"], "Light.Red")];
    std::fs::write(dir.join("rows.json"), serde_json::to_vec(&edit).unwrap()).unwrap();
    let out = Command::new("node").arg(root.join("tests/fixtures/circuit-host.mjs")).arg(dir.join("next.json")).arg(dir.join("rows.json")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let report: Value = serde_json::from_slice(&out.stdout).unwrap();
    // JavaScript agrees with the reference evaluator before and after the edit.
    let mut rt = Runtime::from_checked(&m).unwrap();
    let reference = |rt: &mut Runtime| -> Vec<Value> {
        let mut all = vec![];
        for i in 0..24 {
            let (l, t, s) = (["Light.Green", "Light.Amber", "Light.Red", "Light.Walk"][i % 4], ["Timer.Early", "Timer.Late", "Timer.Expired"][(i / 4) % 3], ["Sensor.Clear", "Sensor.Waiting"][i / 12]);
            all.push(rt.invoke_json("step", &json!([l, t, s])).unwrap().result.json());
        }
        all
    };
    let before = reference(&mut rt);
    assert_eq!(report["batched"], json!(before));
    assert_eq!(report["single"], json!(before));
    assert_eq!(report["before"], json!(rows(hs, &learned(&m)).unwrap()));
    let (next, _) = apply(hs, &learned(&m), &edit).unwrap();
    rt.invoke_json("__learn_set", &json!([next])).unwrap();
    assert_eq!(report["after"], json!(reference(&mut rt)));
    assert_eq!(report["table"], json!(rows(hs, &next).unwrap()));
    assert_ne!(report["after"], report["batched"]);
}
