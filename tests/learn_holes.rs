use serde_json::{json, Value};
use verified_language::{core::CheckedModule, hole_training, stateful::Runtime, syntax, training};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/learn-holes.ink");

fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap()
}
fn states() -> [&'static str; 3] {
    ["State.Start", "State.Quoted", "State.Closed"]
}
fn classes() -> [&'static str; 3] {
    ["Class.Quote", "Class.Comma", "Class.Other"]
}
fn steps() -> [&'static str; 3] {
    ["Step.Keep", "Step.Drop", "Step.End"]
}
fn authored(s: &str, c: &str) -> Option<&'static str> {
    match (s, c) {
        ("State.Start", "Class.Other") => Some("Step.Keep"),
        ("State.Start", "Class.Comma") => Some("Step.End"),
        ("State.Start", "Class.Quote") => Some("Step.Drop"),
        _ => None,
    }
}
fn cases() -> Value {
    json!([[
        {"s": "State.Quoted", "c": "Class.Quote", "want": "Step.Drop"},
        {"s": "State.Quoted", "c": "Class.Comma", "want": "Step.End"},
        {"s": "State.Closed", "c": "Class.Other", "want": "Step.Drop"},
        {"s": "State.Start", "c": "Class.Other", "want": "Step.Keep"},
    ]])
}
fn points() -> Value {
    let pts: Vec<Value> = (0..9)
        .map(|i| {
            let x = i as f64 / 4.0;
            json!({"x": x, "y": x + 0.5 * x * x})
        })
        .collect();
    json!([pts])
}
fn set(rt: &mut Runtime, recover: Vec<u64>, adjust: Vec<f64>) -> bool {
    rt.invoke_json("__learn_set", &json!([{"recover": recover, "adjust": adjust}])).unwrap().committed
}
fn call(rt: &mut Runtime, name: &str, args: Value) -> Value {
    rt.invoke_json(name, &args).unwrap().result.json()
}

#[test]
fn holes_lower_to_ordinary_checked_declarations() {
    let m = module();
    let p = m.program();
    let holes = &p.contracts.learning.holes;
    assert_eq!(holes.len(), 2);
    assert_eq!((holes[0].name.as_str(), holes[0].family.as_str(), holes[0].admission.as_str()), ("recover", "choice", "error-path"));
    assert_eq!((holes[0].parameters, holes[0].choices), (9, 3));
    assert_eq!((holes[1].name.as_str(), holes[1].family.as_str(), holes[1].admission.as_str()), ("adjust", "mlp", "guarded"));
    assert_eq!((holes[1].parameters, holes[1].shape.clone()), (17, vec![2, 4, 1]));
    assert_eq!(p.contracts.learning.objectives, ["mistakes", "fit"]);
    assert!(p.contracts.learning.trainable.contains(&"__learned".to_string()));
    assert!(p.contracts.learning.learn.contains(&"__learn_set".to_string()));
    for name in ["__hole_recover", "__hole_adjust", "__guarded_rank"] {
        assert!(p.functions.iter().any(|f| f.name == name), "{name}");
    }
    for name in ["__learn_get", "__learn_set", "__objective_mistakes", "__objective_fit"] {
        assert!(p.actions.iter().any(|a| a.name == name), "{name}");
    }
    // Metadata survives the checked transport and cannot be forged.
    let roundtrip = CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
    assert_eq!(&roundtrip.program().contracts.learning.holes, holes);
    let mut bytes: Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    bytes["program"]["contracts"]["learning"]["holes"][0]["field"] = json!("missing");
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&bytes).unwrap()).is_err());
    // Programs without holes keep their exact identity.
    let plain = "module plain; fn f(x: u32) -> u32 { return x; }";
    let a = CheckedModule::from_source(syntax::parse(plain).unwrap()).unwrap();
    assert!(!String::from_utf8(a.bytes().unwrap()).unwrap().contains("holes"));
}

#[test]
fn admission_rejects_holes_outside_error_paths_and_guards() {
    let enums = "enum E { A, B, } fn g(e: E) -> Option<E> { return None; }";
    for (source, message) in [
        ("fn f(x: f32) -> f32 { return x + learn a([x]): Mlp<1, 2, 1>; }".to_string(), "not admitted"),
        ("fn f(x: f32) -> f32 { return x + learn a([x]): Mlp<1, 2, 1> else 0.0; }".to_string(), "needs `ensures"),
        ("fn f(x: f32) -> f32 ensures result >= 0.0 { return x; }".to_string(), "has none"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E> else E.A); }}"), "takes no `else`"),
        (format!("{enums} fn f(e: E, x: u32) -> E {{ return g(e).unwrap_or(learn a(x): choice<E>); }}"), "Bool or an enum"),
        (format!("{enums} fn f(xs: List<E>) -> List<E> {{ return xs.map(fn(e) => g(e).unwrap_or(learn a(e): choice<E>)); }}"), "annotate argument"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E>); }} fn h(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E>); }}"), "duplicate learn hole"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E>); }} fn h(xs: List<E>) -> List<E> {{ return xs.map(f); }}"), "function value"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E>); }} objective o(x: f32) -> f32 {{ return x; }}"), "does not depend"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): choice<E>); }} fn __learn_get() -> u32 {{ return 0; }}"), "reserved"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): Mlp<1, 0, 1>); }}"), "widths"),
        (format!("{enums} fn f(e: E) -> E {{ return g(e).unwrap_or(learn a(e): table<E>); }}"), "unknown learn hole family"),
    ] {
        let source = format!("module n; {source}");
        let error = syntax::parse(&source).and_then(CheckedModule::from_source).unwrap_err();
        assert!(error.contains(message), "{source}\n{error}");
    }
    // Annotated lambda arguments, Bool tables and holes in queries are admitted.
    for source in [
        format!("{enums} fn f(xs: List<E>) -> List<E> {{ return xs.map(fn(e) => g(e).unwrap_or(learn a(e: E): choice<E>)); }}"),
        "fn g(b: Bool) -> Option<Bool> { return None; } fn f(b: Bool, c: Bool) -> Bool { return g(b).unwrap_or(learn a(b, c): choice<Bool>); }".into(),
        "enum E { A, B, } state S: Table<u64, E> = Table.empty(); query q(k: u64, e: E) -> E reads(S) { return S.get(k).unwrap_or(learn a(e): choice<E>); }".into(),
    ] {
        CheckedModule::from_source(syntax::parse(&format!("module n; {source}")).unwrap()).unwrap();
    }
}

#[test]
fn error_path_holes_never_change_authored_results() {
    let m = module();
    let mut rt = Runtime::from_checked(&m).unwrap();
    // Every complete assignment of the nine entries: authored inputs keep their step.
    for code in 0..3u64.pow(9) {
        let recover: Vec<u64> = (0..9).map(|i| code / 3u64.pow(i) % 3).collect();
        assert!(set(&mut rt, recover.clone(), vec![0.0; 17]));
        for (si, s) in states().iter().enumerate() {
            for (ci, c) in classes().iter().enumerate() {
                let got = call(&mut rt, "run", json!([s, c]));
                let want = authored(s, c).unwrap_or_else(|| steps()[recover[si + 3 * ci] as usize]);
                assert_eq!(got, json!(want), "{s} {c} {recover:?}");
            }
        }
        if code > 400 {
            break;
        }
    }
    // Invalid shapes and choices are rejected without changing state.
    let before = rt.checkpoint_portable().unwrap();
    assert!(!set(&mut rt, vec![0; 8], vec![0.0; 17]));
    assert!(!set(&mut rt, vec![3; 9], vec![0.0; 17]));
    assert!(!set(&mut rt, vec![0; 9], vec![0.0; 16]));
    assert_eq!(before, rt.checkpoint_portable().unwrap());
}

#[test]
fn guarded_holes_fall_back_to_the_authored_result() {
    let m = module();
    let mut rt = Runtime::from_checked(&m).unwrap();
    // Untrained: the zero output layer returns the authored score.
    for x in [0.0, 2.0, -3.0] {
        assert_eq!(call(&mut rt, "score", json!([x])), json!(x));
    }
    let mut w = vec![0.0; 17];
    w[16] = -10.0;
    assert!(set(&mut rt, vec![0; 9], w));
    // Learned output passes the guard at 12 and fails it at 2 and -3.
    assert_eq!(call(&mut rt, "score", json!([12.0])), json!(2.0));
    assert_eq!(call(&mut rt, "score", json!([2.0])), json!(2.0));
    assert_eq!(call(&mut rt, "score", json!([-3.0])), json!(-3.0));
}

#[test]
fn objective_training_improves_holes_and_replays_exactly() {
    let m = module();
    let options = |objective: &str, data: Value, holes: Option<Vec<String>>| hole_training::Options {
        objective: objective.into(),
        data,
        budget: 4000,
        seed: 7,
        holes,
        method: Default::default(),
    };
    let choice = hole_training::train(&m, None, &options("mistakes", cases(), None)).unwrap();
    assert_eq!(choice.receipt["initial_loss"], json!(3.0));
    assert_eq!(choice.receipt["final_loss"], json!(0.0));
    let again = hole_training::train(&m, None, &options("mistakes", cases(), None)).unwrap();
    assert_eq!(choice.snapshot, again.snapshot);
    let mut rt = Runtime::restore_portable(m.program().clone(), &choice.snapshot).unwrap();
    assert_eq!(call(&mut rt, "run", json!(["State.Quoted", "Class.Quote"])), json!("Step.Drop"));
    assert_eq!(call(&mut rt, "run", json!(["State.Start", "Class.Quote"])), json!("Step.Drop"));

    let fit = hole_training::train(&m, None, &options("fit", points(), Some(vec!["adjust".into()]))).unwrap();
    let (start, end) = (fit.receipt["initial_loss"].as_f64().unwrap(), fit.receipt["final_loss"].as_f64().unwrap());
    assert!(end < start * 0.05, "{start} -> {end}");
    // The replay trace reproduces the trained snapshot through ordinary learning replay.
    let trace: training::Trace = serde_json::from_value(fit.trace.clone()).unwrap();
    assert_eq!(training::replay(&m, &trace).unwrap().snapshot, fit.snapshot);
    // Unknown objectives and holes are rejected.
    assert!(hole_training::train(&m, None, &options("missing", cases(), None)).is_err());
    assert!(hole_training::train(&m, None, &options("fit", points(), Some(vec!["nope".into()]))).is_err());
}

#[test]
fn trained_holes_match_across_targets_and_freeze() {
    let m = module();
    let trained = hole_training::train(
        &m,
        None,
        &hole_training::Options { objective: "fit".into(), data: points(), budget: 1500, seed: 3, holes: Some(vec!["adjust".into()]), method: Default::default() },
    )
    .unwrap();
    let parameters = trained.trace["observations"][0]["args"][0].clone();
    let p = syntax::parse(SOURCE).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut calls = vec![("__learn_set", json!([parameters]))];
    for x in [0.0, 0.5, 1.25, 2.0, -3.0] {
        calls.push(("score", json!([x])));
    }
    let mut w = vec![0.0; 17];
    w[16] = -10.0;
    calls.push(("__learn_set", json!([{"recover": [1, 2, 0, 1, 2, 0, 1, 2, 0], "adjust": w}])));
    for s in states() {
        for c in classes() {
            calls.push(("run", json!([s, c])));
        }
    }
    calls.push(("score", json!([2.0])));
    calls.push(("__learn_set", json!([{"recover": [9], "adjust": []}])));
    let (mut steps, mut expected) = (vec![], vec![]);
    for (name, args) in calls {
        let result = rt.invoke_json(name, &args).unwrap();
        let snapshot = rt.checkpoint_portable().unwrap();
        steps.push(json!({"call": name, "args": args}));
        expected.push(json!({"reply": {"outcome": result.json()}, "snapshot": snapshot}));
    }
    parity::conformance("learn-holes", p, SOURCE, steps, expected);

    // Freezing binds the trained parameters and withdraws their writer; the
    // frozen JavaScript artifact returns the reference results.
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/learn-holes-frozen");
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(&root).unwrap();
    std::fs::write(root.join("source.ink"), SOURCE).unwrap();
    std::fs::write(root.join("trace.json"), serde_json::to_vec(&trained.trace).unwrap()).unwrap();
    let out = std::process::Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("build-model").arg(root.join("source.ink")).arg(root.join("trace.json"))
        .args(["--freeze-roots", "__learned", "--target", "javascript", "-o"]).arg(root.join("model"))
        .output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let frozen: Value = serde_json::from_slice(&std::fs::read(root.join("model/compiled.core.json")).unwrap()).unwrap();
    assert!(!frozen["program"]["contracts"]["learning"]["learn"].to_string().contains("__learn_set"));
    let mut reference = Runtime::restore_portable(m.program().clone(), &trained.snapshot).unwrap();
    let xs = [0.0, 0.5, 1.25, 2.0, -3.0];
    let want: Vec<Value> = xs.iter().map(|x| call(&mut reference, "score", json!([x]))).collect();
    std::fs::write(root.join("check.mjs"), format!(
        "const m=await import('./model/program.mjs');const s=await m.createState();\
         console.log(JSON.stringify({xs:?}.map(x=>s.invoke('score',[x]).result)));\
         try{{s.invoke('__learn_set',[{{}}]);console.log('writable');}}catch(e){{console.log('frozen');}}"
    )).unwrap();
    let node = std::process::Command::new("node").arg(root.join("check.mjs")).output().unwrap();
    assert!(node.status.success(), "{}", String::from_utf8_lossy(&node.stderr));
    let lines: Vec<String> = String::from_utf8_lossy(&node.stdout).lines().map(str::to_string).collect();
    assert_eq!(serde_json::from_str::<Value>(&lines[0]).unwrap(), json!(want));
    assert_eq!(lines[1], "frozen");
}
