use serde_json::{json, Value};
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn external_generic_libraries_have_deterministic_semantics_and_backend_parity() {
    let p = modules::load("examples/libraries/main.ink")
        .unwrap()
        .program;
    let runtime = Runtime::new(p.clone()).unwrap();
    let verified_language::syntax::Type::Result(_, error) = &p
        .functions
        .iter()
        .find(|f| f.name == "divided")
        .unwrap()
        .result
    else {
        panic!()
    };
    let verified_language::syntax::Type::Named(error) = error.as_ref() else {
        panic!()
    };
    let cases: Vec<(&str, Value, Value)> = vec![
        ("divided", json!([7, 2]), json!({"Ok":3})),
        (
            "divided",
            json!([7, 0]),
            json!({"Err":format!("{error}.ZeroDivisor")}),
        ),
        ("divided64", json!([u64::MAX, 1]), json!({"Ok":u64::MAX})),
        ("signed_divided", json!([-7, 2]), json!({"Ok":-3})),
        (
            "signed_divided",
            json!([i32::MIN, -1]),
            json!({"Err":format!("{error}.Overflow")}),
        ),
        ("signed_remainder", json!([-7, 2]), json!({"Ok":-1})),
        ("unique", json!([[3, 1, 3, 2, 1]]), json!([3, 1, 2])),
        ("unique", json!([[]]), json!([])),
        ("union", json!([[3, 1], [1, 2]]), json!([3, 1, 2])),
        ("intersect", json!([[3, 1, 3], [1, 3]]), json!([3, 1])),
        (
            "group",
            json!([[{"key":2,"value":20},{"key":1,"value":10},{"key":2,"value":21}]]),
            json!([{"key":2,"values":[20,21]},{"key":1,"values":[10]}]),
        ),
        (
            "joined",
            json!([[{"key":2,"value":20},{"key":1,"value":10}],[{"key":2,"value":true},{"key":2,"value":false}]]),
            json!([{"key":2,"left":20,"right":true},{"key":2,"left":20,"right":false}]),
        ),
        ("transformed", json!([[1, 2, 3], 10]), json!([11, 12, 13])),
        ("total", json!([[1, 2, 3]]), json!(6)),
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, want) in cases {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let got = eval::call(&p, name, values, &mut 1_000_000).unwrap().json();
        assert_eq!(got, want, "{name}");
        steps.push(json!({"pure":name,"args":args}));
        expected.push(
            json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance(
        "generic-libraries-parity",
        p,
        include_str!("../examples/libraries/main.ink"),
        steps,
        expected,
    );
}
