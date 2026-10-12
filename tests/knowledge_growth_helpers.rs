use serde_json::{json, Value};
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn controlled_helpers_preserve_stopping_item_wrapping_and_empty_results() {
    let source = "bench/knowledge-growth/helper-validation.ink";
    let p = modules::load(source).unwrap().program;
    let runtime = Runtime::new(p.clone()).unwrap();
    // The stop sees the old accumulator; its item must still be consumed.
    // The large-word case independently exercises modulo 2^32 arithmetic.
    let cases: Vec<(Value, Value)> = vec![
        (json!([[]]), json!(2)),
        (json!([[{"value":60,"flag":true},{"value":7,"flag":true},{"value":100,"flag":true}]]), json!(490)),
        (json!([[{"value":60,"flag":true},{"value":7,"flag":false},{"value":100,"flag":true}]]), json!(368)),
        (json!([[{"value":4294967295u32,"flag":true}]]), json!(0)),
        (json!([[{"value":0,"flag":false},{"value":7,"flag":true}]]), json!(22)),
    ];
    let function = p.functions.iter().find(|f| f.name == "run").unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (args, want) in cases {
        let values = args.as_array().unwrap().iter().zip(&function.params)
            .map(|(v, (_, ty))| eval::Value::from_program_json(v, ty, &p).unwrap()).collect();
        assert_eq!(eval::call(&p, "run", values, &mut 1_000_000).unwrap().json(), want);
        steps.push(json!({"pure":"run","args":args}));
        expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance("knowledge-growth-helpers",p,include_str!("../bench/knowledge-growth/helper-validation.ink"),steps,expected);
}
