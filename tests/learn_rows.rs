//! Learned parameters as rows and gated edits (docs/learn-rows.md).
use serde_json::{json, Value};
use std::{path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    learn_rows::{apply, gate, rows, Edit, Row, EDIT_FORMAT},
    stateful::Runtime,
    syntax,
};

const SOURCE: &str = include_str!("../examples/learn-holes.ink");

fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap()
}
fn choice(key: [&str; 2], value: &str) -> Row {
    Row { hole: "recover".into(), key: Some(key.iter().map(|s| s.to_string()).collect()), index: None, value: json!(value) }
}
fn edit(rows: Vec<Row>) -> Edit {
    Edit { format: EDIT_FORMAT.into(), author: Some("test".into()), reason: None, rows }
}
// Held-out cases on entries the authored machine leaves undefined.
fn heldout() -> Value {
    let case = |s: &str, c: &str, want: &str| json!({"s": s, "c": c, "want": want});
    json!([[case("State.Quoted", "Class.Quote", "Step.End"), case("State.Quoted", "Class.Other", "Step.Keep"),
            case("State.Closed", "Class.Comma", "Step.Drop"), case("State.Start", "Class.Comma", "Step.End")]])
}

#[test]
fn rows_address_every_parameter_and_round_trip() {
    let m = module();
    let hs = &m.program().contracts.learning.holes;
    assert_eq!(hs[0].domains, [vec!["State.Start", "State.Quoted", "State.Closed"], vec!["Class.Quote", "Class.Comma", "Class.Other"]]);
    assert_eq!(hs[0].values, ["Step.Keep", "Step.Drop", "Step.End"]);
    let mut rt = Runtime::from_checked(&m).unwrap();
    let params = rt.invoke_json("__learn_get", &json!([])).unwrap().result.json();
    let all = rows(hs, &params).unwrap();
    assert_eq!(all.len(), 9 + 17);
    assert_eq!(all[4], choice(["State.Quoted", "Class.Comma"], "Step.Keep"));
    assert_eq!(all[9].index, Some(0));
    assert_eq!(apply(hs, &params, &all).unwrap(), (params.clone(), 0));
    let (next, changed) = apply(hs, &params, &[choice(["State.Quoted", "Class.Quote"], "Step.End")]).unwrap();
    assert_eq!((next["recover"][1].clone(), changed), (json!(2), 1));
    for (bad, message) in [
        (Row { hole: "nope".into(), ..choice(["State.Start", "Class.Quote"], "Step.End") }, "unknown hole"),
        (choice(["State.Gone", "Class.Quote"], "Step.End"), "not one of"),
        (choice(["State.Start", "Class.Quote"], "Step.Later"), "not one of"),
        (Row { hole: "adjust".into(), key: None, index: Some(17), value: json!(1.0) }, "out of range"),
        (Row { hole: "adjust".into(), key: Some(vec![]), index: Some(1), value: json!(1.0) }, "addressed by index"),
        (Row { hole: "recover".into(), key: None, index: Some(1), value: json!("Step.End") }, "addressed by key"),
    ] {
        assert!(apply(hs, &params, &[bad]).unwrap_err().contains(message), "{message}");
    }
    let twice = [choice(["State.Start", "Class.Quote"], "Step.End"), choice(["State.Start", "Class.Quote"], "Step.Drop")];
    assert!(apply(hs, &params, &twice).unwrap_err().contains("twice"));
}

#[test]
fn the_gate_admits_only_edits_that_improve_the_exact_objective() {
    let m = module();
    let good = edit(vec![choice(["State.Quoted", "Class.Quote"], "Step.End"), choice(["State.Closed", "Class.Comma"], "Step.Drop")]);
    let g = gate(&m, None, &good, "mistakes", &heldout(), false).unwrap();
    assert!(g.admitted, "{}", g.receipt);
    assert_eq!((g.receipt["before"].clone(), g.receipt["after"].clone()), (json!(2.0), json!(0.0)));
    // The snapshot equals a replay of the trace over the starting state.
    let mut replay = Runtime::from_checked(&m).unwrap();
    for o in g.trace.as_ref().unwrap()["observations"].as_array().unwrap() {
        replay.invoke_json(o["call"].as_str().unwrap(), &o["args"]).unwrap();
    }
    let snapshot = g.snapshot.unwrap();
    assert_eq!(replay.checkpoint_portable().unwrap(), snapshot);

    // From the admitted state: a worse edit, a no-op and an edit to an entry the
    // authored machine already handles (no effect on any input) are rejected.
    let worse = edit(vec![choice(["State.Quoted", "Class.Other"], "Step.Drop")]);
    let r = gate(&m, Some(&snapshot), &worse, "mistakes", &heldout(), false).unwrap();
    assert!(!r.admitted && r.receipt["after"] == json!(1.0) && r.snapshot.is_none());
    let same = edit(vec![choice(["State.Quoted", "Class.Quote"], "Step.End")]);
    assert_eq!(gate(&m, Some(&snapshot), &same, "mistakes", &heldout(), true).unwrap().receipt["rejection"], json!("the edit changes no parameter"));
    let shadowed = edit(vec![choice(["State.Start", "Class.Comma"], "Step.Drop")]);
    let r = gate(&m, Some(&snapshot), &shadowed, "mistakes", &heldout(), false).unwrap();
    assert!(!r.admitted && r.receipt["after"] == json!(0.0));
    assert!(gate(&m, Some(&snapshot), &shadowed, "mistakes", &heldout(), true).unwrap().admitted);
    // Weights are rows too; the guarded hole's edit is judged by `fit`.
    let points = json!([[{"x": 1.0, "y": 1.5}, {"x": 2.0, "y": 2.5}]]);
    let bias = edit(vec![Row { hole: "adjust".into(), key: None, index: Some(16), value: json!(0.5) }]);
    let w = gate(&m, Some(&snapshot), &bias, "fit", &points, false).unwrap();
    assert!(w.admitted && w.receipt["after"] == json!(0.0), "{}", w.receipt);
    assert!(gate(&m, None, &good, "nope", &heldout(), false).is_err());
}

#[test]
fn cli_and_javascript_hosts_gate_edits_the_same_way() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/learn-rows");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let ink = env!("CARGO_BIN_EXE_ink");
    let example = root.join("examples/learn-holes.ink");
    let path = |name: &str| dir.join(name).display().to_string();
    std::fs::write(dir.join("heldout.json"), heldout().to_string()).unwrap();
    std::fs::write(dir.join("edit.json"), serde_json::to_vec(&edit(vec![choice(["State.Quoted", "Class.Quote"], "Step.End")])).unwrap()).unwrap();
    let run = |args: &[String]| Command::new(ink).args(args).output().unwrap();
    let s = |x: &str| x.to_string();
    let out = run(&[s("gate-edit"), example.display().to_string(), path("edit.json"), s("--objective"), s("mistakes"), s("--data"), path("heldout.json"), s("-o"), path("model.snapshot")]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let out = run(&[s("learn-rows"), example.display().to_string(), s("--restore"), path("model.snapshot")]);
    let listed: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(listed["rows"][1], json!({"hole": "recover", "key": ["State.Quoted", "Class.Quote"], "value": "Step.End"}));
    // A rejected edit exits with an error and writes nothing.
    std::fs::write(dir.join("worse.json"), serde_json::to_vec(&edit(vec![choice(["State.Quoted", "Class.Other"], "Step.Drop")])).unwrap()).unwrap();
    let out = run(&[s("gate-edit"), example.display().to_string(), path("worse.json"), s("--objective"), s("mistakes"), s("--data"), path("heldout.json"), s("-o"), path("worse.snapshot")]);
    assert!(!out.status.success() && !dir.join("worse.snapshot").exists());
    // The admitted trace builds a frozen artifact like `ink train`'s.
    let out = run(&[s("build-model"), example.display().to_string(), path("model.snapshot.trace.json"), s("--freeze-roots"), s("__learned"), s("--target"), s("javascript"), s("-o"), path("frozen")]);
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));

    for args in [
        vec![s("build"), example.display().to_string(), s("--target"), s("javascript"), s("-o"), path("program.mjs")],
        vec![s("emit-holes"), example.display().to_string(), s("-o"), path("holes.json")],
    ] {
        let out = run(&args);
        assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    }
    let out = Command::new("node").arg(root.join("tests/fixtures/learn-rows-host.mjs")).arg(path("program.mjs")).arg(path("holes.json")).arg(path("heldout.json")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let report: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(report["proposed"]["admitted"], json!(true));
    assert_eq!((report["proposed"]["before"].clone(), report["proposed"]["after"].clone()), (json!(2), json!(1)));
    assert_eq!(report["worse"]["admitted"], json!(false));
    assert_eq!(report["live_after_rejection"], report["live_after_admission"]);
    assert_eq!(report["invalid"], json!("recover: Step.Later is not one of Step.Keep, Step.Drop, Step.End"));
    assert_eq!(report["live_after_admission"][1], json!({"hole": "recover", "key": ["State.Quoted", "Class.Quote"], "value": "Step.End"}));
}
