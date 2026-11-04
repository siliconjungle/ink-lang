//! Gradient fitting of learn-hole tables through exact circuits
//! (docs/circuit-target.md, docs/relaxed-meanings.md).
use serde_json::{json, Value};
use std::{path::Path, process::Command};
use verified_language::{
    circuit::{check, fit, lower, FitOptions, Node},
    core::CheckedModule,
    hole_training::{train, Method, Options},
    learn_rows::{apply, gate, rows, Edit, Row, EDIT_FORMAT},
    stateful::Runtime,
    syntax,
};

const ROUTING: &str = include_str!("../examples/circuit-training.ink");
const COLORS: [&str; 4] = ["Color.Red", "Color.Green", "Color.Blue", "Color.Gray"];
const SIZES: [&str; 3] = ["Size.Small", "Size.Medium", "Size.Large"];

fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(ROUTING).unwrap()).unwrap()
}
fn learned(m: &CheckedModule) -> Value {
    Runtime::from_checked(m).unwrap().invoke_json("__learn_get", &json!([])).unwrap().result.json()
}
fn cases() -> Value {
    json!([COLORS.iter().flat_map(|c| SIZES.iter().map(move |s| json!({"c": c, "s": s, "want": *c != "Color.Gray"}))).collect::<Vec<_>>()])
}
/// Every (colour, size) with its wanted `consistent` result, as circuit indices.
fn examples() -> Vec<(Vec<usize>, usize)> {
    (0..4).flat_map(|c| (0..3).map(move |s| (vec![c, s], (c != 3) as usize))).collect()
}

#[test]
fn coupled_entries_need_moves_that_one_entry_search_cannot_make() {
    let m = module();
    let options = |method| Options { objective: "mistakes".into(), data: cases(), budget: 4000, seed: 1, holes: None, method };
    let coordinate = train(&m, None, &options(Method::Coordinate)).unwrap();
    assert_eq!((coordinate.receipt["initial_loss"].clone(), coordinate.receipt["final_loss"].clone()), (json!(9.0), json!(9.0)));
    let relaxed = train(&m, None, &options(Method::Relaxed)).unwrap();
    assert_eq!(relaxed.receipt["final_loss"], json!(0.0), "{}", relaxed.receipt);
}

#[test]
fn gradients_through_the_circuit_fit_the_table_and_the_gate_admits_it() {
    let m = module();
    let hs = &m.program().contracts.learning.holes;
    let params = learned(&m);
    let circuit = lower(&m, "consistent", Some(&params)).unwrap();
    // `consistent` reads the table twice; both lookup layers share its rows.
    assert_eq!(circuit.holes.len(), 2);
    for seed in [1, 2, 3] {
        let fitted = fit(&circuit, &examples(), &FitOptions { epochs: 400, seed }).unwrap();
        assert_eq!((fitted.correct_before, fitted.correct_after), (3, 12), "seed {seed}");
        assert!(fitted.loss_after < fitted.loss_before);
        let table = &fitted.tables["pick"];
        // Only the 18 entries the examples reach (three colours, three sizes,
        // circle and star) may change; the rest keep their current value.
        let listed = rows(hs, &json!({"pick": table})).unwrap();
        let before = rows(hs, &params).unwrap();
        let changed: Vec<Row> = listed.into_iter().zip(&before).filter(|(a, b)| a != *b).map(|(a, _)| a).collect();
        assert!(changed.len() <= 18 && changed.iter().all(|r| { let k = r.key.as_ref().unwrap(); k[0] != "Color.Gray" && k[2] != "Shape.Square" }));
        // The hardened table is a proposal; the gate judges it exactly.
        let edit = Edit { format: EDIT_FORMAT.into(), author: Some("circuit-gradient".into()), reason: None, rows: changed };
        let g = gate(&m, None, &edit, "mistakes", &cases(), false).unwrap();
        assert!(g.admitted && g.receipt["after"] == json!(0.0), "{}", g.receipt);
        // The re-emitted circuit with the admitted table checks exhaustively.
        let mut rt = Runtime::restore_portable(m.program().clone(), g.snapshot.as_ref().unwrap()).unwrap();
        let admitted = rt.invoke_json("__learn_get", &json!([])).unwrap().result.json();
        let exact = lower(&m, "consistent", Some(&admitted)).unwrap();
        assert_eq!(check(&m, &exact, Some(&admitted)).unwrap(), 12);
        for c in &COLORS[..3] {
            for s in SIZES {
                assert_eq!(rt.invoke_json("check", &json!([c, s])).unwrap().result.json(), json!(true));
            }
        }
        assert_eq!(apply(hs, &params, &edit.rows).unwrap().0, admitted);
    }
    assert!(fit(&circuit, &[(vec![9, 0], 1)], &FitOptions { epochs: 10, seed: 1 }).is_err());
    let plain = CheckedModule::from_source(syntax::parse("module p;\nfn f(a: Bool) -> Bool { return !a; }\n").unwrap()).unwrap();
    assert!(fit(&lower(&plain, "f", None).unwrap(), &[(vec![0], 1)], &FitOptions { epochs: 10, seed: 1 }).is_err());
}

#[test]
fn constants_fold_out_of_gates_and_the_cli_writes_a_gateable_edit() {
    // Equality against a constant and products with constant branches are affine.
    let crossing = CheckedModule::from_source(syntax::parse(include_str!("../examples/circuit-target.ink")).unwrap()).unwrap();
    let c = lower(&crossing, "next", Some(&learned(&crossing))).unwrap();
    let gates = c.nodes.iter().filter(|n| matches!(n, Node::Gate { .. })).count();
    assert!(gates <= 17, "{gates} gates");

    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/circuit-training");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let example = root.join("examples/circuit-training.ink");
    let data: Vec<Value> = COLORS.iter().flat_map(|c| SIZES.iter().map(move |s| json!({"args": [c, s], "want": *c != "Color.Gray"}))).collect();
    std::fs::write(dir.join("examples.json"), serde_json::to_vec(&data).unwrap()).unwrap();
    std::fs::write(dir.join("cases.json"), serde_json::to_vec(&cases()).unwrap()).unwrap();
    let ink = env!("CARGO_BIN_EXE_ink");
    let out = Command::new(ink).arg("train-circuit").arg(&example).arg("consistent").arg("--data").arg(dir.join("examples.json")).args(["--seed", "4", "-o"]).arg(dir.join("edit.json")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let summary: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!((summary["correct_before"].clone(), summary["correct_after"].clone()), (json!(3), json!(12)));
    let out = Command::new(ink).arg("gate-edit").arg(&example).arg(dir.join("edit.json")).args(["--objective", "mistakes", "--data"]).arg(dir.join("cases.json")).arg("-o").arg(dir.join("model.snapshot")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let receipt: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!((receipt["before"].clone(), receipt["after"].clone()), (json!(9.0), json!(0.0)));
}
