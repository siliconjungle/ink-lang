use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax, training};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/differentiable-world.ink");
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap()
}
fn evaluate(p: &syntax::Program, name: &str, args: Value) -> eval::Value {
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, args, &mut 100_000_000).unwrap()
}
fn objective64(bias: f64, response: f64, p: f64, v: f64, target: f64) -> f64 {
    let (mut p, mut v) = (p, v);
    let dt = 0.1_f32 as f64;
    let decay = 0.9_f32 as f64;
    for _ in 0..12 {
        let force = bias + response * (target - p);
        v = v * decay + force * dt;
        p += v * dt;
    }
    (p - target) * (p - target) + 0.05_f32 as f64 * v * v
}
#[test]
fn whole_trajectory_gradients_agree_with_independent_numerical_oracle() {
    let m = module();
    let p = m.program();
    for bias in [-0.5, 0., 0.75] {
        for response in [0., 1.25] {
            for (position, velocity, target) in [(0., 0., 1.), (-0.5, 0.2, 0.25), (1., -0.25, -0.5)]
            {
                let w = json!({"bias":bias,"response":response});
                let c = json!({"position":position,"velocity":velocity,"target":target});
                let gradient = evaluate(p, "derivatives", json!([w, c])).json();
                let h = 1e-5;
                for (field, expected) in [
                    (
                        "bias",
                        (objective64(bias + h, response, position, velocity, target)
                            - objective64(bias - h, response, position, velocity, target))
                            / (2. * h),
                    ),
                    (
                        "response",
                        (objective64(bias, response + h, position, velocity, target)
                            - objective64(bias, response - h, position, velocity, target))
                            / (2. * h),
                    ),
                ] {
                    let actual = gradient[field].as_f64().unwrap();
                    assert!(
                        (actual - expected).abs() < 2e-5 * (1. + expected.abs()),
                        "{field}: {actual} != {expected}"
                    );
                }
                let direction = json!({"bias":0.25,"response":-0.5});
                assert_eq!(
                    evaluate(p, "objective", json!([w, c])),
                    evaluate(p, "forward", json!([w, direction, c]))
                );
                assert_eq!(
                    evaluate(p, "sensitivity", json!([w, direction, c])),
                    evaluate(p, "forward_tangent", json!([w, direction, c]))
                );
            }
        }
    }
    let rt = CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
    assert_eq!(m.identity().unwrap(), rt.identity().unwrap());
}

#[test]
fn training_uses_final_world_outcome_and_existing_contracts() {
    let m = module();
    let contexts = [
        json!({"position":0.,"velocity":0.,"target":1.}),
        json!({"position":0.,"velocity":0.,"target":-1.}),
    ];
    let mut before = Runtime::from_checked(&m).unwrap();
    let initial: f64 = contexts
        .iter()
        .map(|c| {
            before
                .invoke_json("loss", &json!([c]))
                .unwrap()
                .result
                .json()
                .as_f64()
                .unwrap()
        })
        .sum();
    let trace = training::Trace {
        schema: 1,
        epochs: 100,
        observations: contexts
            .iter()
            .map(|c| training::Observation {
                call: "observe".into(),
                args: json!([c, 0.1]),
            })
            .collect(),
    };
    let trained = training::replay(&m, &trace).unwrap();
    let mut after = Runtime::restore_portable(m.program().clone(), &trained.snapshot).unwrap();
    let final_loss: f64 = contexts
        .iter()
        .map(|c| {
            after
                .invoke_json("loss", &json!([c]))
                .unwrap()
                .result
                .json()
                .as_f64()
                .unwrap()
        })
        .sum();
    assert!(final_loss < initial * 0.2, "{initial} -> {final_loss}");
    let held = json!({"position":0.2,"velocity":-0.1,"target":0.75});
    let a = before
        .invoke_json("loss", &json!([held]))
        .unwrap()
        .result
        .json()
        .as_f64()
        .unwrap();
    let b = after
        .invoke_json("loss", &json!([held]))
        .unwrap()
        .result
        .json()
        .as_f64()
        .unwrap();
    assert!(b < a, "held-out: {a} -> {b}");
    let checkpoint = after.checkpoint_portable().unwrap();
    let rejected = after
        .invoke_json(
            "observe",
            &json!([{"position":0.,"velocity":0.,"target":1e6},0.1]),
        )
        .unwrap();
    assert!(!rejected.committed);
    assert_eq!(rejected.result.json(), json!({"Err":"weight domain"}));
    assert_eq!(checkpoint, after.checkpoint_portable().unwrap());
}

const MATH: &str = r#"module differential_math;
record W { a:f32, b:f32, }
fn energy(w:W,xs:List<f32>)->f32{return sum(xs.map(fn(x)=>w.a*x*x+w.b*x));}
fn energy_gradient(w:W,xs:List<f32>)->W{return gradient(energy,w,xs);}
fn relu_loss(w:f32,x:f32)->f32 {let y=choose(w*x>0.0,w*x,0.0);return y*y;}
fn relu_grad(w:f32,x:f32)->f32{return gradient_piecewise(relu_loss,w,x);}
fn relu_forward(w:f32,d:f32,x:f32)->f32{return linearize_piecewise(relu_loss,w,d,x).value;}
fn identity(w:f32)->f32{return w;}
fn identity_forward(w:f32)->f32{return linearize(identity,w,1.0).value;}
fn root(w:f32)->f32{return sqrt(w*w+1.0)/2.0;}
fn root_grad(w:f32)->f32{return gradient(root,w);}
fn sized(w:f32,xs:List<f32>)->f32{return w*f32_from_u32(length(xs));}
fn sized_grad(w:f32,xs:List<f32>)->f32{return gradient(sized,w,xs);}
fn hard(w:f32)->f32{return floor(w);}
fn hard_grad(w:f32)->f32{return gradient_piecewise(hard,w);}
fn keyed(w:f32,xs:List<f32>,index:u32)->f32{return xs.map(fn(x)=>x*w).at_or(index,w*w);}
fn keyed_grad(w:f32,xs:List<f32>,index:u32)->f32{return gradient(keyed,w,xs,index);}
fn selected(w:f32,xs:List<f32>)->f32{return sum(xs.map(fn(x)=>w*x).filter(fn(x)=>x>0.0));}
fn selected_grad(w:f32,xs:List<f32>)->f32{return gradient_piecewise(selected,w,xs);}
fn __ink_differential_0(x:f32)->f32{return x;}
"#;
#[test]
fn collections_nonlinearity_decisions_and_hygiene_have_explicit_meanings() {
    let p = syntax::parse(MATH).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    for bits in [
        0_u32, 0x80000000, 0x7f800000, 0xff800000, 0x7fc01234, 0x7fa04321,
    ] {
        let args = json!([{"F32Bits":bits}]);
        assert_eq!(
            evaluate(&p, "identity", args.clone()),
            evaluate(&p, "identity_forward", args)
        );
    }
    for xs in [vec![], vec![1., -2., 3.]] {
        assert_eq!(evaluate(&p,"sized_grad",json!([0.5,xs])).json(),json!(xs.len() as f64));
        assert_eq!(
            evaluate(&p, "energy_gradient", json!([{"a":0.5,"b":-0.25},xs])).json(),
            json!({"a":xs.iter().map(|x|x*x).sum::<f64>(),"b":xs.iter().sum::<f64>()})
        );
        for index in [0, 2, 99] {
            let expected = xs.get(index as usize).copied().unwrap_or(1.0);
            assert_eq!(
                evaluate(&p, "keyed_grad", json!([0.5, xs, index])).json(),
                json!(expected)
            );
        }
    }
    for (w, x, expected) in [(0.5, 2., 4.), (-0.5, 2., 0.), (0., 2., 0.)] {
        assert_eq!(
            evaluate(&p, "relu_grad", json!([w, x])).json(),
            json!(expected)
        );
        assert_eq!(
            evaluate(&p, "relu_forward", json!([w, 1., x])),
            evaluate(&p, "relu_loss", json!([w, x]))
        );
    }
    for (weight, expected) in [(0.5, 2.), (-0.5, -1.), (0., 0.)] {
        assert_eq!(
            evaluate(&p, "selected_grad", json!([weight, [-1., 2.]])).json(),
            json!(expected)
        );
    }
    let actual = evaluate(&p, "root_grad", json!([2.]))
        .json()
        .as_f64()
        .unwrap();
    assert!((actual - 1. / 5_f64.sqrt()).abs() < 1e-6);
    assert_eq!(evaluate(&p, "hard_grad", json!([1.25])).json(), json!(0.));
    let fields=(0..33).map(|i|format!("f{i}:f32,")).collect::<String>();
    let large=format!("module directional;record W{{{fields}}}fn loss(w:W)->f32{{return w.f0;}}fn directed(w:W,d:W)->f32{{return jvp(loss,w,d);}}");
    CheckedModule::from_source(syntax::parse(&large).unwrap()).unwrap();
    let too_many=format!("{large}fn full(w:W)->W{{return gradient(loss,w);}}");
    assert!(syntax::parse(&too_many).unwrap_err().contains("32 scalar"));
    for bad in [
        MATH.replace("gradient_piecewise(relu_loss","gradient(relu_loss"),
        MATH.replace("gradient_piecewise(hard","gradient(hard"),
        "module bad;fn recurse(w:f32)->f32{return recurse(w);}fn g(w:f32)->f32{return gradient(recurse,w);}".into(),
        "module bad;fn loss(w:f32)->Bool{return w>0.0;}fn g(w:f32)->f32{return gradient(loss,w);}".into(),
        "module bad;fn loss(w:f32)->f32{return w*w;}fn g(loss:f32,w:f32)->f32{return gradient(loss,w);}".into(),
        "module bad;fn loss(w:List<f32>)->f32{return sum(w);}fn g(w:List<f32>)->List<f32>{return gradient(loss,w);}".into(),
    ] {assert!(syntax::parse(&bad).and_then(CheckedModule::from_source).is_err(),"accepted unsupported gradient");}
}

#[test]
fn generated_training_computation_preserves_cross_target_execution() {
    let m = module();
    let p = m.program();
    let mut rt = Runtime::from_checked(&m).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let w = json!({"bias":0.25,"response":0.5});
    let c = json!({"position":0.2,"velocity":-0.1,"target":1.});
    for (name, args) in [
        ("derivatives", json!([w, c])),
        ("sensitivity", json!([w,{"bias":1.,"response":-0.5},c])),
        ("forward", json!([w,{"bias":1.,"response":-0.5},c])),
    ] {
        let value = evaluate(p, name, args.clone()).json();
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected
            .push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    for _ in 0..6 {
        for (name, args) in [
            ("observe", json!([c, 0.1])),
            ("predict", json!([c])),
            ("loss", json!([c])),
        ] {
            let result = rt.invoke_json(name, &args).unwrap();
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":result.json()},"snapshot":rt.checkpoint_portable().unwrap()}));
        }
    }
    for args in [
        json!([{"position":0.,"velocity":0.,"target":1e6},0.1]),
        json!([c, 1000.]),
    ] {
        let before = rt.checkpoint_portable().unwrap();
        let result = rt.invoke_json("observe", &args).unwrap();
        assert!(!result.committed);
        assert_eq!(before, rt.checkpoint_portable().unwrap());
        steps.push(json!({"call":"observe","args":args}));
        expected.push(json!({"reply":{"outcome":result.json()},"snapshot":before}));
    }
    let args = json!([[0., 0.5, 1., -1.], 0.5]);
    let value = evaluate(p, "batch", args.clone()).json();
    steps.push(json!({"pure":"batch","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    let args = json!([[0.25, 0.5, 1., -1.], w]);
    let value = evaluate(p, "trajectory_gradients", args.clone()).json();
    steps.push(json!({"pure":"trajectory_gradients","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance_checked("whole-computation-learning", &m, SOURCE, steps, expected);
}

#[test]
fn source_modules_keeps_and_abstract_boundaries_are_retained() {
    use std::fs;
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/differential-imports");
    fs::create_dir_all(&dir).unwrap();
    fs::write(
        dir.join("objective.ink"),
        "module objective; fn energy(w:f32,x:f32)->f32{return w*x*x;}",
    )
    .unwrap();
    fs::write(
        dir.join("main.ink"),
        r#"module main;import "objective.ink" as model;
      state __ink_differential_0:u32=0;
      keep sensitivity:f32=gradient(model.energy,0.5,2.0);
      query read()->f32 reads(sensitivity){return sensitivity;}
    "#,
    )
    .unwrap();
    let p = verified_language::modules::load(dir.join("main.ink"))
        .unwrap()
        .program;
    let mut rt = Runtime::new(p).unwrap();
    assert_eq!(
        rt.invoke_json("read", &json!([])).unwrap().result.json(),
        json!(4.)
    );
    for source in [
      "module bad; abstract record W{x:f32,}fn loss(w:W)->f32{return w.x;}fn g(w:W)->W{return gradient(loss,w);}",
      "module bad; refined record W{x:f32,}invariant value.x>=0.0;fn loss(w:W)->f32{return w.x;}fn g(w:W)->W{return gradient(loss,w);}",
    ] {let e=syntax::parse(source).and_then(CheckedModule::from_source).unwrap_err();assert!(e.contains("plain record view"),"{e}");}
}
