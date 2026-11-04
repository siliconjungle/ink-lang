//! Relaxed (distributional) training of choice holes (docs/relaxed-meanings.md).
use serde_json::{json, Value};
use verified_language::{
    core::CheckedModule,
    hole_training::{train, Method, Options},
    stateful::Runtime,
    syntax,
};

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn options(objective: &str, data: Value, method: Method, seed: u64) -> Options {
    Options { objective: objective.into(), data, budget: 2000, seed, holes: None, method }
}

#[test]
fn relaxed_training_escapes_where_coordinate_search_stops() {
    let m = module(include_str!("../examples/relaxed-holes.ink"));
    let coordinate = train(&m, None, &options("cost", json!([1.0]), Method::Coordinate, 1)).unwrap();
    assert_eq!((coordinate.receipt["initial_loss"].clone(), coordinate.receipt["final_loss"].clone()), (json!(1.0), json!(1.0)));
    for seed in [1, 2, 3] {
        let relaxed = train(&m, None, &options("cost", json!([1.0]), Method::Relaxed, seed)).unwrap();
        assert_eq!(relaxed.receipt["final_loss"], json!(0.0), "seed {seed}: {}", relaxed.receipt);
        assert!(relaxed.receipt["relaxed_steps"].as_u64().unwrap() > 0);
        let mut rt = Runtime::restore_portable(m.program().clone(), &relaxed.snapshot).unwrap();
        assert_eq!(rt.invoke_json("sides", &json!([])).unwrap().result.json(), json!(["Side.Right", "Side.Right"]));
        // The snapshot equals a replay of the one-step trace over the initial state.
        let mut replay = Runtime::from_checked(&m).unwrap();
        let o = &relaxed.trace["observations"][0];
        replay.invoke_json(o["call"].as_str().unwrap(), &o["args"]).unwrap();
        assert_eq!(replay.checkpoint_portable().unwrap(), relaxed.snapshot);
        // Same seed, same result.
        let again = train(&m, None, &options("cost", json!([1.0]), Method::Relaxed, seed)).unwrap();
        assert_eq!(again.snapshot, relaxed.snapshot);
    }
}

#[test]
fn relaxed_training_matches_coordinate_search_where_both_succeed() {
    let m = module(include_str!("../examples/learn-holes.ink"));
    let cases = json!([[
        {"s": "State.Quoted", "c": "Class.Quote", "want": "Step.Drop"},
        {"s": "State.Quoted", "c": "Class.Comma", "want": "Step.End"},
        {"s": "State.Closed", "c": "Class.Other", "want": "Step.Drop"},
        {"s": "State.Start", "c": "Class.Other", "want": "Step.Keep"},
    ]]);
    let relaxed = train(&m, None, &Options { holes: Some(vec!["recover".into()]), ..options("mistakes", cases.clone(), Method::Relaxed, 5) }).unwrap();
    let coordinate = train(&m, None, &Options { holes: Some(vec!["recover".into()]), ..options("mistakes", cases, Method::Coordinate, 5) }).unwrap();
    assert_eq!(relaxed.receipt["final_loss"], json!(0.0));
    assert_eq!(coordinate.receipt["final_loss"], json!(0.0));
    assert!(relaxed.receipt["methods"]["choice"].as_str().unwrap().starts_with("relaxed"));
}
