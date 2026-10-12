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
        (
            "partitioned",
            json!([[1, 2, 3, 4], 2]),
            json!([2, 3, 9, 12]),
        ),
        (
            "partitioned",
            json!([[1, 2, 3, 4], 0]),
            json!([3, 6, 9, 12]),
        ),
        (
            "partitioned",
            json!([[1, 2, 3, 4], 4294967295u32]),
            json!([2, 3, 4, 5]),
        ),
        ("partitioned", json!([[], 0]), json!([])),
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
        (
            "joined_indexed",
            json!([[{"key":2,"value":20},{"key":1,"value":10},{"key":2,"value":21}],[{"key":2,"value":true},{"key":1,"value":false},{"key":2,"value":false}]]),
            json!([{"key":2,"left":20,"right":true},{"key":2,"left":20,"right":false},{"key":1,"left":10,"right":false},{"key":2,"left":21,"right":true},{"key":2,"left":21,"right":false}]),
        ),
        (
            "joined_indexed",
            json!([[],[{"key":2,"value":true}]]),
            json!([]),
        ),
        (
            "joined_indexed",
            json!([[{"key":2,"value":20}],[]]),
            json!([]),
        ),
        ("paired", json!([[1, 2, 3]]), json!({"first":6,"second":45})),
        ("paired", json!([[]]), json!({"first":0,"second":1})),
        ("smallest", json!([[9, 1, 3, 1, 7], 3]), json!([1, 1, 3])),
        ("smallest", json!([[9, 1, 3], 0]), json!([])),
        (
            "smallest",
            json!([[9, 1, 3], 4294967295u32]),
            json!([1, 3, 9]),
        ),
        ("smallest", json!([[], 3]), json!([])),
        (
            "ranked",
            json!([[{"key":2,"value":20},{"key":1,"value":10},{"key":1,"value":11},{"key":2,"value":21}],3]),
            json!([{"key":1,"value":10},{"key":1,"value":11},{"key":2,"value":20}]),
        ),
        (
            "grouped_totals",
            json!([[{"key":2,"value":1},{"key":1,"value":4},{"key":2,"value":2},{"key":2,"value":3}]]),
            json!([{"key":2,"totals":{"first":6,"second":45}},{"key":1,"totals":{"first":4,"second":7}}]),
        ),
        ("grouped_totals", json!([[]]), json!([])),
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

#[path = "support/bulk_workloads.rs"]
mod bulk_workloads;

#[path = "support/competitive_workloads.rs"]
mod competitive_workloads;
