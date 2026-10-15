use serde_json::{json, Value};
use std::sync::OnceLock;
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime, training};
#[path = "support/parity.rs"]
mod parity;
fn load(path: &str) -> CheckedModule {
    CheckedModule::from_source(modules::load(path).unwrap().program).unwrap()
}
fn primitive() -> &'static CheckedModule {
    static M: OnceLock<CheckedModule> = OnceLock::new();
    M.get_or_init(|| load("examples/reverse-primitives.ink"))
}
fn network() -> &'static CheckedModule {
    static M: OnceLock<CheckedModule> = OnceLock::new();
    M.get_or_init(|| load("examples/neural-model.ink"))
}
fn adaptive() -> &'static CheckedModule {
    static M: OnceLock<CheckedModule> = OnceLock::new();
    M.get_or_init(|| load("examples/neural-adaptive.ink"))
}
fn evaluate(m: &CheckedModule, name: &str, args: Value) -> Value {
    let p = m.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let values = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, values, &mut 100_000_000)
        .unwrap_or_else(|e| panic!("{name}: {e}"))
        .json()
}
fn variant(m: &CheckedModule, function: &str, parameter: usize, tag: &str) -> Value {
    let f = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == function)
        .unwrap();
    let verified_language::syntax::Type::Named(name) = &f.params[parameter].1 else {
        panic!("enum type")
    };
    json!(format!("{name}.{tag}"))
}
fn policy(m: &CheckedModule, kind: &str) -> Value {
    // Derive linked enum identities from the declared Policy fields.
    let f = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == "unary")
        .unwrap();
    let verified_language::syntax::Type::Named(name) = &f.params[3].1 else {
        panic!()
    };
    let fields = &m.program().records[name];
    let tag = |field: &str, value: &str| {
        let verified_language::syntax::Type::Named(n) =
            &fields.iter().find(|(n, _)| n == field).unwrap().1
        else {
            panic!()
        };
        json!(format!("{n}.{value}"))
    };
    json!({"piecewise":kind!="smooth","boolean":tag("boolean",if kind=="straight"{"StraightThrough"}else if kind=="smooth"{"Reject"}else{"Zero"}),"index":tag("index",if kind=="smooth"{"Reject"}else{"Zero"}),"zero":tag("zero",if kind=="stop"{"Stop"}else{"Propagate"})})
}
#[test]
fn graph_preparation_and_reverse_arithmetic_have_independent_oracles() {
    let m = primitive();
    assert_eq!(evaluate(m, "retained", json!([])), json!({"Ok":1}));
    assert_eq!(evaluate(m, "prepared", json!([2.])), json!({"Ok":[4.]}));
    for which in 0..4 {
        assert!(evaluate(m, "invalid", json!([which])).get("Err").is_some());
    }
    let mut forged = evaluate(m, "plan", json!([]))["Ok"].clone();
    forged["nodes"][0]["a"] = json!(999);
    assert_eq!(
        evaluate(m, "read_plan", json!([forged, [2.]])),
        json!({"Err":"invalid prepared graph"})
    );
    for (kind, field, bad) in [
        ("Unary", "a", json!(999)),
        ("Affine", "terms", json!([{"wire":999,"coefficient":1.}])),
        ("Reglu", "gates", json!([{"wire":999,"coefficient":1.}])),
        ("Select", "c", json!(999)),
        ("Index", "table", json!([999])),
    ] {
        let mut plan = evaluate(m, "plan", json!([]))["Ok"].clone();
        let node = &mut plan["nodes"][0];
        let prefix = node["kind"]
            .as_str()
            .unwrap()
            .rsplit_once('.')
            .unwrap()
            .0
            .to_string();
        node["kind"] = json!(format!("{prefix}.{kind}"));
        node[field] = bad;
        assert_eq!(
            evaluate(m, "read_plan", json!([plan, [2.]])),
            json!({"Err":"invalid prepared graph"}),
            "{kind}"
        );
    }

    assert_eq!(
        evaluate(m, "polynomial", json!([[0.5, 0.25], 2.])),
        json!({"Ok":{"outputs":[1.5625],"gradient":[5.,2.5,1.25]}})
    );
    for (op, value, gradient) in [
        ("Add", 2.5, vec![0.5, 0.5]),
        ("Subtract", 1.5, vec![0.5, -0.5]),
        ("Multiply", 1., vec![0.25, 1.]),
        ("Divide", 4., vec![1., -4.]),
    ] {
        assert_eq!(
            evaluate(
                m,
                "binary",
                json!([variant(m, "binary", 0, op), 2., 0.5, 0.5])
            ),
            json!({"Ok":{"outputs":[value],"gradient":gradient}})
        );
    }
    assert_eq!(
        evaluate(m, "affine", json!([0.5, 0.25])),
        json!({"Ok":{"outputs":[2.125,2.125],"gradient":[4.,-0.5]}})
    );
    for (op, x, value, gradient) in [
        ("Sqrt", 4., 2., 0.25),
        ("Negate", -0.5, 0.5, -1.),
        ("Relu", 2., 2., 1.),
        ("Relu", 0., 0., 0.),
    ] {
        assert_eq!(
            evaluate(
                m,
                "unary",
                json!([variant(m, "unary", 0, op), x, 1., policy(m, "piecewise")])
            ),
            json!({"Ok":{"outputs":[value],"gradient":[gradient]}})
        );
    }
    for (c, out, gradient) in [
        (0., 0.25, vec![0.25, 0.125, -1.]),
        (0.25, 0., vec![0., 0., 0.]),
        (1., 0., vec![0., 0., 0.]),
    ] {
        assert_eq!(
            evaluate(m, "reglu", json!([0.5, 1., c, policy(m, "piecewise")])),
            json!({"Ok":{"outputs":[out],"gradient":gradient}})
        );
    }
}
#[test]
fn hard_operations_and_zero_cotangents_require_explicit_policies() {
    let m = primitive();
    let step = variant(m, "unary", 0, "Step");
    let sqrt = variant(m, "unary", 0, "Sqrt");
    for kind in ["smooth", "piecewise", "straight"] {
        let result = evaluate(m, "unary", json!([step, 0.25, 1., policy(m, kind)]));
        if kind == "smooth" {
            assert!(result.get("Err").is_some());
        } else {
            assert_eq!(
                result,
                json!({"Ok":{"outputs":[1.],"gradient":[if kind=="straight"{1.}else{0.}]}})
            );
        }
    }
    assert_eq!(
        evaluate(m, "unary", json!([sqrt, 0., 0., policy(m, "stop")])),
        json!({"Ok":{"outputs":[0.],"gradient":[0.]}})
    );
    assert_eq!(
        evaluate(m, "unary", json!([sqrt, 0., 0., policy(m, "piecewise")]))["Ok"]["gradient"][0],
        json!({"F32Bits":0x7fc00000u32})
    );
    assert!(
        evaluate(m, "selected", json!([1., 2., 3., policy(m, "smooth")]))
            .get("Err")
            .is_some()
    );
    for (gate, value, gradient) in [
        (1., 3., vec![0., 0., 1.]),
        (0., 2., vec![0., 1., 0.]),
        (-1., 2., vec![0., 1., 0.]),
    ] {
        assert_eq!(
            evaluate(m, "selected", json!([gate, 2., 3., policy(m, "piecewise")])),
            json!({"Ok":{"outputs":[value],"gradient":gradient}})
        );
    }
    let zero = variant(m, "gathered", 4, "Zero");
    let difference = variant(m, "gathered", 4, "BackwardDifference");
    let reject = variant(m, "gathered", 4, "Reject");
    assert!(
        evaluate(m, "gathered", json!([0., [2., 5.], true, true, reject]))
            .get("Err")
            .is_some()
    );
    for (index, value, grad) in [
        (-1., 0., vec![0., 0., 0.]),
        (0., 2., vec![0., 1., 0.]),
        (0.5, 2., vec![0., 1., 0.]),
        (1., 5., vec![0., 0., 1.]),
        (2., 0., vec![0., 0., 0.]),
    ] {
        assert_eq!(
            evaluate(m, "gathered", json!([index, [2., 5.], true, true, zero])),
            json!({"Ok":{"outputs":[value],"gradient":grad}})
        );
    }
    assert_eq!(
        evaluate(m, "gathered", json!([1., [2., 5.], true, true, difference])),
        json!({"Ok":{"outputs":[5.],"gradient":[3.,0.,1.]}})
    );
    assert_eq!(
        evaluate(m, "gathered", json!([0., [2., 5.], true, true, difference])),
        json!({"Ok":{"outputs":[2.],"gradient":[2.,1.,0.]}})
    );
    assert_eq!(
        evaluate(m, "gathered", json!([-1., [2., 5.], false, false, zero])),
        json!({"Ok":{"outputs":[2.],"gradient":[0.,1.,0.]}})
    );
    assert_eq!(
        evaluate(m, "gathered", json!([99., [], false, false, zero])),
        json!({"Ok":{"outputs":[0.],"gradient":[0.]}})
    );
    assert_eq!(
        evaluate(
            m,
            "gathered",
            json!([{"F32Bits":0x7f800000u32},[2.],true,true,zero])
        ),
        json!({"Err":"nonfinite graph index"})
    );
}
fn initial() -> Vec<f64> {
    (0..244)
        .map(|i| (0.02f32 + (i % 17) as f32 * 0.003f32) as f64)
        .collect()
}
fn features() -> Vec<f64> {
    (1..=10).map(|i| (i as f32 / 20.) as f64).collect()
}
fn dense64(weights: &[f64], features: &[f64]) -> Vec<f64> {
    let mut cursor = 0;
    let mut inputs = features.to_vec();
    let dot = |cursor: &mut usize, inputs: &[f64]| {
        let start = *cursor;
        *cursor += inputs.len() + 1;
        inputs
            .iter()
            .enumerate()
            .fold(weights[start + inputs.len()], |sum, (i, x)| {
                sum + weights[start + i] * x
            })
    };
    for width in [6, 6] {
        inputs = (0..width)
            .map(|_| {
                let left = dot(&mut cursor, &inputs);
                let gate = dot(&mut cursor, &inputs);
                left * gate.max(0.)
            })
            .collect();
    }
    let outputs = (0..4).map(|_| dot(&mut cursor, &inputs)).collect();
    assert_eq!(cursor, 244);
    outputs
}
fn loss64(weights: &[f64], features: &[f64], target: &[f64]) -> f64 {
    dense64(weights, features)
        .iter()
        .zip(target)
        .map(|(a, b)| (a - b) * (a - b))
        .sum::<f64>()
        / 4.
}
#[test]
fn all_244_reverse_derivatives_match_an_independent_dense_network_oracle() {
    let m = network();
    assert_eq!(evaluate(m, "dimensions", json!([])), json!({"Ok":244}));
    let weights = initial();
    let features = features();
    let target = vec![-0.1f32 as f64, 0.2f32 as f64, 0.05f32 as f64, 0.3f32 as f64];
    let result = evaluate(m, "derivatives", json!([weights, features, target]));
    let result = &result["Ok"];
    let expected = loss64(&weights, &features, &target);
    assert!((result["loss"].as_f64().unwrap() - expected).abs() < 1e-6);
    let derivatives = result["gradient"].as_array().unwrap();
    assert_eq!(derivatives.len(), 244);
    for i in 0..244 {
        let mut plus = weights.clone();
        let mut minus = weights.clone();
        let h = 1e-5;
        plus[i] += h;
        minus[i] -= h;
        let expected =
            (loss64(&plus, &features, &target) - loss64(&minus, &features, &target)) / (2. * h);
        let actual = derivatives[i].as_f64().unwrap();
        assert!(
            actual != 0. && (actual - expected).abs() < 2e-5 * (1. + expected.abs()),
            "coordinate {i}: {actual} != {expected}"
        );
    }
}
fn invoke(rt: &mut Runtime, name: &str, args: Value) -> Value {
    let r = rt.invoke_json(name, &args).unwrap();
    assert!(
        r.result.json().get("Err").is_none(),
        "{name}: {:?}",
        r.json()
    );
    r.result.json()
}
#[test]
fn adaptive_training_preserves_all_optimizer_state_and_resumes_exactly() {
    let m = adaptive();
    let f = features();
    let teacher: Vec<_> = initial().iter().map(|x| (*x as f32 * 1.3) as f64).collect();
    let target = dense64(&teacher, &f);
    let target: Vec<_> = target.into_iter().map(|x| (x as f32) as f64).collect();
    let mut rt = Runtime::from_checked(m).unwrap();
    let before = invoke(&mut rt, "objective", json!([f, target]))["Ok"]
        .as_f64()
        .unwrap();
    let observation = training::Observation {
        call: "observe".into(),
        args: json!([f, target, 2]),
    };
    let trace = |epochs| training::Trace {
        schema: 1,
        epochs,
        observations: vec![training::Observation {
            call: observation.call.clone(),
            args: observation.args.clone(),
        }],
    };
    let complete = training::replay(m, &trace(12)).unwrap();
    let first = training::replay(m, &trace(6)).unwrap();
    let second = training::replay_from(m, &trace(6), Some(&first.snapshot)).unwrap();
    assert_eq!(
        complete.snapshot, second.snapshot,
        "optimizer moments, rate, event and version history must resume"
    );
    use sha2::{Digest, Sha256};
    assert_eq!(
        second.receipt["initial_snapshot_sha256"],
        format!("{:x}", Sha256::digest(&first.snapshot))
    );
    let mut rt = Runtime::restore_portable(m.program().clone(), &complete.snapshot).unwrap();
    let after = invoke(&mut rt, "objective", json!([f, target]))["Ok"]
        .as_f64()
        .unwrap();
    assert!(after < before * 0.5, "{before} -> {after}");
    let model = invoke(&mut rt, "model", json!([]));
    let weights = model["Ok"]["weights"].as_array().unwrap();
    let changed = weights
        .iter()
        .zip(initial())
        .filter(|(a, b)| a.as_f64().unwrap() != *b)
        .count();
    assert!(changed > 32, "only {changed} coordinates learned");
    let checkpoint = rt.checkpoint_portable().unwrap();
    let cancelled = rt.invoke_json("cancel", &json!([f, target])).unwrap();
    assert!(!cancelled.committed);
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    let invalid = rt.invoke_json("observe", &json!([f, target, 1])).unwrap();
    assert!(!invalid.committed);
    assert_eq!(checkpoint, rt.checkpoint_portable().unwrap());
    let control = invoke(&mut rt, "control", json!([]));
    assert_eq!(
        control["accepted"].as_u64().unwrap() + control["rejected"].as_u64().unwrap(),
        12
    );
    assert!(training::replay_from(m, &trace(1), Some(b"bad snapshot")).is_err());
}

#[test]
fn adam_matches_an_independent_f32_oracle_and_rejects_invalid_domains() {
    let m = primitive();
    let mut state = evaluate(m, "optimizer", json!([[0.25, -0.5, 1.]]))["Ok"].clone();
    let mut config = evaluate(m, "optimizer_config", json!([0.01]));
    config["weight_decay"] = json!(0.03);
    config["norm_limit"] = json!(0.5);
    let (mut weights, mut first, mut second) =
        (vec![0.25f32, -0.5, 1.], vec![0f32; 3], vec![0f32; 3]);
    let (mut p1, mut p2) = (1f32, 1f32);
    for gradient in [[2f32, -3., 0.5], [-0.2, 0.1, 0.3], [0., 0., 0.]] {
        let adjusted: Vec<_> = gradient
            .iter()
            .zip(&weights)
            .map(|(g, w)| g + 0.03f32 * w)
            .collect();
        let maximum = adjusted.iter().map(|g| g.abs()).fold(0f32, f32::max);
        let norm = adjusted
            .iter()
            .fold(0f32, |s, g| s + (g / maximum) * (g / maximum));
        let scale = ((0.5f32 / maximum) / norm.sqrt()).min(1.);
        p1 *= 0.9f32;
        p2 *= 0.999f32;
        for i in 0..3 {
            let g = adjusted[i] * scale;
            first[i] = 0.9f32 * first[i] + (1. - 0.9f32) * g;
            second[i] = 0.999f32 * second[i] + (1. - 0.999f32) * g * g;
            weights[i] -=
                0.01f32 * (first[i] / (1. - p1)) / ((second[i] / (1. - p2)).sqrt() + 1e-8f32);
        }
        state = evaluate(m, "optimizer_update", json!([state, gradient, config]))["Ok"].clone();
        assert_eq!(state["weights"], json!(weights));
        assert_eq!(state["first"], json!(first));
        assert_eq!(state["second"], json!(second));
        assert_eq!(state["first_power"], json!(p1));
        assert_eq!(state["second_power"], json!(p2));
    }
    for field in [
        "rate",
        "epsilon",
        "first_decay",
        "second_decay",
        "norm_limit",
        "weight_decay",
    ] {
        let mut bad = config.clone();
        bad[field] = json!({"F32Bits":0x7fc00000u32});
        assert!(
            evaluate(m, "optimizer_update", json!([state, [1., 2., 3.], bad]))
                .get("Err")
                .is_some()
        );
    }
    for (field, bad) in [
        ("first", json!([])),
        ("second", json!([-1., 0., 0.])),
        ("steps", json!(u32::MAX)),
        ("first_power", json!(1.5)),
    ] {
        let mut invalid = state.clone();
        invalid[field] = bad;
        assert!(evaluate(
            m,
            "optimizer_update",
            json!([invalid, [1., 2., 3.], config])
        )
        .get("Err")
        .is_some());
    }
    assert!(
        evaluate(m, "optimizer_update", json!([state, [1.], config]))
            .get("Err")
            .is_some()
    );
    let huge = evaluate(m, "optimizer", json!([[0.]]))["Ok"].clone();
    let clipped = evaluate(
        m,
        "optimizer_update",
        json!([
            huge,
            [3e38f32],
            evaluate(m, "optimizer_config", json!([0.01]))
        ]),
    );
    assert!(clipped.get("Ok").is_some(), "stable clipping: {clipped}");
    assert!(
        evaluate(m, "optimizer", json!([[{"F32Bits":0x7f800000u32}]]))
            .get("Err")
            .is_some()
    );
}

#[test]
fn offline_cli_resumes_exact_state_and_rejects_a_foreign_module() {
    use std::{fs, process::Command};
    let dir = std::path::Path::new("build/learning-resume-cli");
    fs::create_dir_all(dir).unwrap();
    let path = dir.join("trace.json");
    let source = "examples/adaptive-layout.ink";
    let trace = training::Trace {
        schema: 1,
        epochs: 2,
        observations: vec![training::Observation {
            call: "observe".into(),
            args: json!([{"width":0.5,"length":0.5},0.4,0.1]),
        }],
    };
    fs::write(&path, serde_json::to_vec(&trace).unwrap()).unwrap();
    let m = load(source);
    let first = training::replay(&m, &trace).unwrap();
    let input = dir.join("initial.snapshot");
    fs::write(&input, &first.snapshot).unwrap();
    let output = dir.join("next.snapshot");
    let out = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["train", source])
        .arg(&path)
        .arg("--restore")
        .arg(&input)
        .arg("-o")
        .arg(&output)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let expected = training::replay_from(&m, &trace, Some(&first.snapshot)).unwrap();
    assert_eq!(fs::read(&output).unwrap(), expected.snapshot);
    let receipt: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(receipt, expected.receipt);
    let other = dir.join("other.ink");
    fs::write(
        &other,
        fs::read_to_string(source)
            .unwrap()
            .replace("return 0.2;", "return 0.3;")
            .replace("0.2", "0.21"),
    )
    .unwrap();
    let out = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("train")
        .arg(&other)
        .arg(&path)
        .arg("--restore")
        .arg(&input)
        .arg("-o")
        .arg(dir.join("rejected.snapshot"))
        .output()
        .unwrap();
    assert!(!out.status.success());
    assert!(!dir.join("rejected.snapshot").exists());
}

#[test]
fn reverse_primitives_preserve_special_values_and_policies_across_cpu_targets() {
    let m = primitive();
    let mut steps = vec![];
    let mut expected = vec![];
    let rt = Runtime::from_checked(m).unwrap();
    let calls = [
        ("polynomial", json!([[0.5, 0.25], 2.])),
        ("affine", json!([0.5, 0.25])),
        ("reglu", json!([0.5, 1., 0., policy(m, "piecewise")])),
        (
            "unary",
            json!([
                variant(m, "unary", 0, "Sqrt"),
                0.,
                0.,
                policy(m, "piecewise")
            ]),
        ),
        (
            "unary",
            json!([variant(m, "unary", 0, "Sqrt"), 0., 0., policy(m, "stop")]),
        ),
        (
            "unary",
            json!([variant(m, "unary", 0, "Step"), 0.5, 1., policy(m, "smooth")]),
        ),
        (
            "gathered",
            json!([
                1.,
                [2., 5.],
                true,
                true,
                variant(m, "gathered", 4, "BackwardDifference")
            ]),
        ),
        (
            "gathered",
            json!([{"F32Bits":0x7f800000u32},[2.],true,true,variant(m,"gathered",4,"Zero")]),
        ),
        ("prepared", json!([2.])),
        ("invalid", json!([0])),
        ("optimizer", json!([[0.25, -0.5, 1.]])),
    ];
    for (name, args) in calls {
        let value = evaluate(m, name, args.clone());
        steps.push(json!({"pure":name,"args":args}));
        expected
            .push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    parity::conformance_checked(
        "reverse-primitives-parity",
        m,
        "// linked examples/reverse-primitives.ink",
        steps,
        expected,
    );
}

#[test]
fn full_model_updates_backtracking_and_rollback_match_all_cpu_targets() {
    let m = adaptive();
    let f = features();
    let target: Vec<_> = dense64(
        &initial()
            .iter()
            .map(|x| (*x as f32 * 1.3) as f64)
            .collect::<Vec<_>>(),
        &f,
    )
    .into_iter()
    .map(|x| (x as f32) as f64)
    .collect();
    let mut rt = Runtime::from_checked(m).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut record = |rt: &mut Runtime, name: &str, args: Value| {
        let result = rt.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
        result
    };
    record(&mut rt, "objective", json!([f, target]));
    let learned = record(&mut rt, "observe", json!([f, target, 2]));
    assert!(learned.committed);
    assert_eq!(learned.result.json()["Ok"]["accepted"], true);
    let model = record(&mut rt, "model", json!([])).result.json();
    let prediction = record(&mut rt, "predict", json!([f])).result.json()["Ok"].clone();
    let rejected = record(&mut rt, "observe", json!([f, prediction, 2]));
    assert!(rejected.committed);
    assert_eq!(rejected.result.json()["Ok"]["accepted"], false);
    assert_eq!(
        record(&mut rt, "model", json!([])).result.json(),
        model,
        "backtracking restores both Adam moments with the weights"
    );
    let before = rt.checkpoint_portable().unwrap();
    assert!(!record(&mut rt, "cancel", json!([f, target])).committed);
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    assert!(!record(&mut rt, "observe", json!([f, target, 1])).committed);
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    record(&mut rt, "control", json!([]));
    let args = json!([[{"mode":"Mode.Square","value":2.},{"mode":"Mode.Offset","value":-0.25}]]);
    steps.push(json!({"pure":"mapped","args":args}));
    expected
        .push(json!({"reply":{"value":[4.,0.25]},"snapshot":rt.checkpoint_portable().unwrap()}));
    steps.push(json!({"pure":"numeric","args":[[2.,-0.25]],"expect_gpu":true}));
    expected
        .push(json!({"reply":{"value":[4.5,0.5625]},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance_checked(
        "reverse-model-parity",
        m,
        include_str!("../examples/neural-adaptive.ink"),
        steps,
        expected,
    );
}

#[test]
fn prepared_architecture_preserves_complete_learning_and_compiled_state() {
    prepared_model_parity(
        "examples/prepared-neural.ink",
        include_str!("../examples/prepared-neural.ink"),
        "prepared-neural-parity",
        "tests/fixtures/prepared-neural.mjs",
    );
}

#[test]
fn prepared_defaults_preserve_complete_learning_and_compiled_state() {
    prepared_model_parity(
        "examples/staged-neural.ink",
        include_str!("../examples/staged-neural.ink"),
        "staged-neural-parity",
        "tests/fixtures/staged-neural.mjs",
    );
}

fn prepared_model_parity(path: &str, source: &str, tag: &str, fixture: &str) {
    let prepared = load(path);
    let mut rt = Runtime::from_checked(&prepared).unwrap();
    let mut direct = Runtime::from_checked(adaptive()).unwrap();
    let features = vec![0.2; 10];
    let target = vec![0.1; 4];
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("predict", json!([features])),
        ("model", json!([])),
        ("observe", json!([features, target, 2])),
        ("predict", json!([features])),
        ("observe", json!([features, target, 2])),
        ("cancel", json!([features, target])),
        ("control", json!([])),
        ("model", json!([])),
        ("objective", json!([features, target])),
    ] {
        let result = rt.invoke_json(name, &args).unwrap();
        let control = direct.invoke_json(name, &args).unwrap();
        assert_eq!(result.json(), control.json());
        let a = verified_language::snapshot_wire::decode(
            &verified_language::snapshot::layout(prepared.program()).unwrap(),
            &rt.checkpoint_portable().unwrap(),
            Default::default(),
        )
        .unwrap();
        let b = verified_language::snapshot_wire::decode(
            &verified_language::snapshot::layout(adaptive().program()).unwrap(),
            &direct.checkpoint_portable().unwrap(),
            Default::default(),
        )
        .unwrap();
        assert_eq!(a, b);
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    steps.push(json!({"pure":"numeric","args":[[0.,0.5,-1.]],"expect_gpu":true}));
    expected.push(
        json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":rt.checkpoint_portable().unwrap()}),
    );
    parity::conformance_checked(tag, &prepared, source, steps, expected);
    let directory = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("build")
        .join(tag);
    let out = std::process::Command::new("node")
        .arg(fixture)
        .arg(&directory)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    println!("{}", String::from_utf8_lossy(&out.stdout));
}

#[test]
fn sealed_helper_preparation_preserves_fresh_neural_values_and_rejects_forged_graphs() {
    let module = load("examples/prepared-network.ink");
    let model = evaluate(&module, "network", json!([]))["Ok"].clone();
    let weights = initial();
    let mut cases = vec![];
    for i in 0..4 {
        let context: Vec<f64> = (0..10).map(|j| ((i * 7 + j * 3) as f64 - 14.0) / 25.0).collect();
        let weights: Vec<f64> = weights.iter().map(|w| w + i as f64 / 1000.0).collect();
        cases.push(("predict", json!([model, weights, context])));
        cases.push(("derivatives", json!([model, weights, context, [0.1, -0.2, 0.3, -0.4]])));
    }
    cases.push(("predict", json!([model, [], []])));
    cases.push(("derivatives", json!([model, weights, features(), []])));
    for field in ["inputs", "roots", "edge"] {
        let mut forged = model.clone();
        match field {
            "inputs" => forged["graph"]["inputs"] = json!(253),
            "roots" => forged["graph"]["roots"] = json!([u32::MAX]),
            _ => forged["graph"]["nodes"][0]["a"] = json!(u32::MAX),
        }
        cases.push(("predict", json!([forged, weights, features()])));
        cases.push(("derivatives", json!([forged, weights, features(), [0.0,0.0,0.0,0.0]])));
    }
    let mut special: Vec<Value> = vec![json!(0.0); 10];
    special[0] = json!({"F32Bits":0x7fc12345u32});special[1] = json!({"F32Bits":0x80000000u32});
    cases.push(("predict", json!([model, weights, special])));
    cases.push(("derivatives", json!([model, weights, special, [0.0,0.0,0.0,0.0]])));
    let cases: Vec<Value> = cases.into_iter().map(|(name,args)| {
        let expected = evaluate(&module,name,args.clone());
        json!({"name":name,"args":args,"expected":expected})
    }).collect();
    let directory = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/prepared-network-parity");
    std::fs::create_dir_all(&directory).unwrap();
    std::fs::write(directory.join("program.mjs"), verified_language::javascript::lower(&module).unwrap().javascript).unwrap();
    std::fs::write(directory.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    let out=std::process::Command::new("node").arg("tests/fixtures/prepared-network.mjs").arg(&directory).output().unwrap();
    assert!(out.status.success(),"{}\n{}",String::from_utf8_lossy(&out.stdout),String::from_utf8_lossy(&out.stderr));
    println!("{}",String::from_utf8_lossy(&out.stdout));
}
