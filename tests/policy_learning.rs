use serde_json::{json, Value};
use std::sync::OnceLock;
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime, training};
#[path = "support/parity.rs"]
mod parity;
fn module() -> &'static CheckedModule {
    static MODULE: OnceLock<CheckedModule> = OnceLock::new();
    MODULE.get_or_init(|| {
        CheckedModule::from_source(modules::load("examples/reward-policy.ink").unwrap().program)
            .unwrap()
    })
}
fn evaluate(name: &str, args: Value) -> Value {
    let p = module().program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, ty))| eval::Value::from_program_json(v, ty, p).unwrap())
        .collect();
    eval::call(p, name, args, &mut 100_000_000).unwrap().json()
}
#[test]
fn categorical_scores_match_an_independent_probability_derivative() {
    let masses = [2.0_f64, 3.0, 5.0];
    let derivatives = [[1.0_f64, -2.0], [2.0, 1.0], [-1.0, 3.0]];
    for (unit, action) in [
        (0.0, 0),
        (0.199, 0),
        (0.2, 1),
        (0.499, 1),
        (0.5, 2),
        (0.99999994, 2),
    ] {
        let result = evaluate(
            "decision",
            json!([masses, derivatives, [true, true, true], unit]),
        );
        let value = &result["Ok"];
        assert_eq!(value["action"], action);
        assert!((value["probability"].as_f64().unwrap() - masses[action] / 10.).abs() < 1e-7);
        for coordinate in 0..2 {
            // Differentiate log of the normalized mass with a central difference
            // in independent binary64 arithmetic, not the Ink implementation.
            let log_probability = |delta: f64| {
                let varied: Vec<_> = masses
                    .iter()
                    .zip(derivatives)
                    .map(|(m, g)| m + delta * g[coordinate])
                    .collect();
                (varied[action] / varied.iter().sum::<f64>()).ln()
            };
            let expected = (log_probability(1e-5) - log_probability(-1e-5)) / 2e-5;
            assert!((value["score"][coordinate].as_f64().unwrap() - expected).abs() < 2e-7);
        }
    }
    let masked = evaluate(
        "decision",
        json!([[2., 1e30, 5.], derivatives, [true, false, true], 0.4]),
    );
    assert_eq!(masked["Ok"]["action"], 2);
    assert!((masked["Ok"]["score"][0].as_f64().unwrap() - (-1. / 5. - 0. / 7.)).abs() < 1e-7);
    let singleton = evaluate(
        "decision",
        json!([[0., 5., 7.], derivatives, [false, true, false], 0.999]),
    );
    assert_eq!(singleton["Ok"]["probability"], 1.);
    assert_eq!(singleton["Ok"]["score"], json!([0., 0.]));
}
#[test]
fn returns_masks_and_invalid_domains_are_explicit() {
    assert_eq!(
        evaluate("returns", json!([[1., 2., 3.], 0.5, 4.])),
        json!({"Ok":[3.25,4.5,5.]})
    );
    assert_eq!(evaluate("returns", json!([[], 1., 2.])), json!({"Ok":[]}));
    for args in [
        json!([[], [], [], 0.]),
        json!([[0., 0.], [[1.], [2.]], [true, true], 0.]),
        json!([[1., 2.], [[1.], [2.]], [false, false], 0.]),
        json!([[-1., 2.], [[1.], [2.]], [true, true], 0.]),
        json!([[1., 2.], [[1.], []], [true, true], 0.]),
        json!([[1., 2.], [[1.], [2.]], [true], 0.]),
        json!([[1., 2.], [[1.], [2.]], [true, true], 1.]),
        json!([[1., 2.], [[1.], [2.]], [true, true], -0.1]),
    ] {
        assert!(evaluate("decision", args).get("Err").is_some());
    }
    assert!(evaluate("returns", json!([[1.], 1.1, 0.]))
        .get("Err")
        .is_some());
    let large = evaluate(
        "decision",
        json!([[3e38, 3e38], [[1.], [1.]], [true, true], 0.75]),
    );
    assert_eq!(large["Ok"]["action"], 1);
    assert_eq!(large["Ok"]["probability"], 0.5);
    for kind in [0, 1, 2] {
        assert!(evaluate("edge", json!([kind])).get("Err").is_some());
    }
    let decisions = json!([
        {"action":0,"probability":0.5,"score":[1.,-1.]},
        {"action":1,"probability":0.5,"score":[-1.,1.]}
    ]);
    assert_eq!(
        evaluate("trajectory", json!([decisions, [1., 2.], [0., 0.], 1., 0.])),
        json!({"Ok":[-0.5,0.5]})
    );
    assert!(evaluate("trajectory", json!([[], [], [], 1., 0.]))
        .get("Err")
        .is_some());
}
fn trace(epochs: u32) -> training::Trace {
    training::Trace {
        schema: 1,
        epochs,
        observations: [0.125, 0.375, 0.625, 0.875]
            .into_iter()
            .flat_map(|unit| {
                [-1., 1.]
                    .into_iter()
                    .map(move |signal| training::Observation {
                        call: "episode".into(),
                        args: json!([{"signal":signal,"urgency":0.5},unit,0.04]),
                    })
            })
            .collect(),
    }
}
#[test]
fn authored_reward_trains_contextual_choices_and_resumes_complete_adam_state() {
    let complete = training::replay(module(), &trace(20)).unwrap();
    let first = training::replay(module(), &trace(10)).unwrap();
    let resumed = training::replay_from(module(), &trace(10), Some(&first.snapshot)).unwrap();
    assert_eq!(complete.snapshot, resumed.snapshot);
    let mut rt = Runtime::restore_portable_checked(module(), &complete.snapshot).unwrap();
    for (signal, preferred) in [(-1., 1), (1., 0)] {
        let result = rt
            .invoke_json("predict", &json!([{"signal":signal,"urgency":0.5}]))
            .unwrap();
        let probability = result.result.json()["Ok"][preferred].as_f64().unwrap();
        assert!(probability > 0.9, "signal {signal}: {probability}");
    }
    std::fs::create_dir_all("build/policy-learning").unwrap();
    std::fs::write(
        "build/policy-learning/complete.snapshot",
        &complete.snapshot,
    )
    .unwrap();
    std::fs::write("build/policy-learning/first.snapshot", &first.snapshot).unwrap();
    std::fs::write(
        "build/policy-learning/training.receipt.json",
        serde_json::to_vec_pretty(&complete.receipt).unwrap(),
    )
    .unwrap();
    std::fs::write(
        "build/policy-learning/trace.json",
        serde_json::to_vec_pretty(&trace(20)).unwrap(),
    )
    .unwrap();
}
#[test]
fn delayed_feedback_stale_versions_and_rollback_match_all_cpu_targets() {
    let mut rt = Runtime::from_checked(module()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let context = json!({"signal":1.,"urgency":0.5});
    let calls = vec![
        ("predict", json!([context])),
        ("act", json!([context, 0.25])),
        ("act", json!([context, 0.75])),
        ("feedback", json!([9, 1., 0., 0.02])),
        ("feedback", json!([1, 1., 0., 1000.])),
        ("feedback", json!([1, 1., 0., 0.02])),
        ("predict", json!([context])),
        ("act", json!([context, 0.75])),
        ("invalidate", json!([])),
        ("feedback", json!([2, -1., 0., 0.02])),
        ("cancel", json!([])),
        ("episode", json!([{"signal":-1.,"urgency":0.2},0.875,0.04])),
        ("aborted", json!([context])),
        ("act", json!([context, 1.])),
        ("model", json!([])),
    ];
    for (name, args) in calls {
        let before = rt.checkpoint_portable().unwrap();
        let result = rt.invoke_json(name, &args).unwrap();
        if name == "feedback" && args[3] == 1000. {
            assert!(!result.committed);
            assert_eq!(result.result.json(), json!({"Err":"candidate domain"}));
        }
        if !result.committed {
            assert_eq!(before, rt.checkpoint_portable().unwrap());
        }
        if name == "act" && result.committed {
            rt = Runtime::restore_portable_checked(module(), &rt.checkpoint_portable().unwrap())
                .unwrap();
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    for (name, args) in [
        (
            "decision",
            json!([
                [2., 3., 5.],
                [[1., -2.], [2., 1.], [-1., 3.]],
                [true, false, true],
                0.5
            ]),
        ),
        ("returns", json!([[1., 2., 3.], 0.5, 4.])),
        ("edge", json!([0])),
        ("edge", json!([1])),
        ("edge", json!([2])),
        ("score_action", json!([[2.,3.,5.],[[1.,-2.],[2.,1.],[-1.,3.]],[true,false,true],2])),
        ("score_action", json!([[2.,3.,5.],[[1.,-2.],[2.,1.],[-1.,3.]],[true,false,true],1])),
        ("joint", json!([[{"action":0,"probability":0.5,"score":[2.,-1.]},
                          {"action":1,"probability":0.25,"score":[3.,4.]}],5.,2.])),
        ("total", json!([[{"action":0,"probability":0.5,"score":[2.,-1.]},
                          {"action":1,"probability":0.25,"score":[3.,4.]}],[5.,3.],[2.,1.]])),
        (
            "trajectory",
            json!([[{"action":0,"probability":0.5,"score":[1.,-1.]},{"action":1,"probability":0.5,"score":[-1.,1.]}],[1.,2.],[0.,0.],1.,0.]),
        ),
    ] {
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":evaluate(name,args)},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"pure":"batch","args":[[0.,0.5,-1.]],"expect_gpu":true}));
    expected.push(
        json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":rt.checkpoint_portable().unwrap()}),
    );
    parity::conformance_checked(
        "policy-learning-parity",
        module(),
        include_str!("../examples/reward-policy.ink"),
        steps,
        expected,
    );
}

#[test]
fn whole_computation_return_weights_the_joint_score_not_the_mean() {
    let masses = [vec![2.0_f64,3.0],vec![7.0,11.0,13.0]];
    let jacobians = [vec![[1.0_f64,-2.0],[2.0,1.0]],vec![[3.0,1.0],[-1.0,2.0],[2.0,-3.0]]];
    let decisions = [evaluate("decision",json!([masses[0],jacobians[0],[true,true],0.1]))["Ok"].clone(),
                     evaluate("decision",json!([masses[1],jacobians[1],[true,true,true],0.4]))["Ok"].clone()];
    let actual = evaluate("joint",json!([decisions,2.5,-0.75]));
    for coordinate in 0..2 {
        let joint_log = |delta:f64| {
            (0..2).map(|index| {
                let varied:Vec<_> = masses[index].iter().zip(&jacobians[index]).map(|(m,d)|m+delta*d[coordinate]).collect();
                let action=decisions[index]["action"].as_u64().unwrap() as usize;
                (varied[action]/varied.iter().sum::<f64>()).ln()
            }).sum::<f64>()
        };
        let expected=-3.25*(joint_log(1e-5)-joint_log(-1e-5))/2e-5;
        assert!((actual["Ok"][coordinate].as_f64().unwrap()-expected).abs()<2e-6);
    }
    assert_eq!(actual,evaluate("total",json!([decisions,[2.5,2.5],[-0.75,-0.75]])));
    let distinct=json!([{"action":0,"probability":0.5,"score":[2.0,-1.0]},
                        {"action":1,"probability":0.25,"score":[3.0,4.0]}]);
    assert_eq!(evaluate("joint",json!([distinct,5.0,2.0])),json!({"Ok":[-15.0,-9.0]}));
    for args in [json!([[],1.0,0.0]),
        json!([[{"action":0,"probability":0.5,"score":[1.0]},{"action":1,"probability":0.5,"score":[1.0,2.0]}],1.0,0.0]),
        json!([distinct,{"F32Bits":2139095040u32},0.0]),
        json!([[{"action":0,"probability":0.5,"score":[3e38]}],3.0,0.0]),
        json!([[{"action":0,"probability":0.5,"score":[2e38]},{"action":1,"probability":0.5,"score":[2e38]}],-1.0,0.0])]
    {
        assert!(evaluate("joint",args).get("Err").is_some());
    }
}

#[test]
fn specified_action_uses_the_current_policy_and_rejects_invalid_choices() {
    let derivatives = json!([[1.,-2.],[2.,1.],[-1.,3.]]);
    for (masses, allowed, unit) in [
        (json!([2.,3.,5.]),json!([true,true,true]),0.4),
        (json!([2.,1e30,5.]),json!([true,false,true]),0.8),
        (json!([0.,5.,7.]),json!([false,true,false]),0.999),
    ] {
        let sampled=evaluate("decision",json!([masses,derivatives,allowed,unit]));
        assert_eq!(sampled,evaluate("score_action",json!([masses,derivatives,allowed,sampled["Ok"]["action"]])));
    }
    // The same action is rescored after the policy changes; no stale score is
    // reused from the distribution that originally proposed it.
    let current=evaluate("score_action",json!([[7.,3.,5.],derivatives,[true,true,true],0]));
    for coordinate in 0..2 {
        let log_probability=|delta:f64| {
            let masses=[7.0,3.0,5.0];
            let jacobian=[[1.0,-2.0],[2.0,1.0],[-1.0,3.0]];
            let varied:Vec<_>=masses.iter().zip(jacobian).map(|(m,d)|m+delta*d[coordinate]).collect();
            (varied[0]/varied.iter().sum::<f64>()).ln()
        };
        let expected=(log_probability(1e-5)-log_probability(-1e-5))/2e-5;
        assert!((current["Ok"]["score"][coordinate].as_f64().unwrap()-expected).abs()<2e-7);
    }
    for args in [
        json!([[2.,3.,5.],derivatives,[true,false,true],1]),
        json!([[2.,3.,5.],derivatives,[true,true,true],3]),
        json!([[0.,3.,5.],derivatives,[true,true,true],0]),
        json!([[2.,3.,5.],[[1.],[1.,2.],[1.]],[true,true,true],0]),
        json!([[2.,3.,5.],[[{"F32Bits":2139095040u32}],[1.],[1.]],[true,true,true],0]),
        json!([[{"F32Bits":1},3e38],[[1.],[1.]],[true,true],0]),
    ] {
        assert!(evaluate("score_action",args).get("Err").is_some());
    }
}
