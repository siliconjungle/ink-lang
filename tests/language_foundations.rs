use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn new_surface_and_value_operations_have_complete_backend_parity() {
    let source = include_str!("../examples/language-foundations.ink");
    let p = parse(source).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
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
        (
            "partition_growth",
            json!([[1, 2, 3, 4], 2]),
            json!([1, 2, 7, 9, 4]),
        ),
        ("partition_growth", json!([[], 0]), json!([7])),
        (
            "partition_filtered",
            json!([[1, 3, 2, 4, 5, 6], 3]),
            json!([3, 4, 5]),
        ),
        (
            "partition_nested",
            json!([[1, 2, 3, 4]]),
            json!([1, 2, 3, 4]),
        ),
        ("partition_nested", json!([[]]), json!([])),
        ("partition_empty_tail", json!([[1, 2, 3]]), json!([3])),
        ("partition_empty_tail", json!([[]]), json!([0])),
        ("fixed_values", json!([1]), json!([1, 7, 3])),
        ("fixed_values", json!([3]), json!([1, 2, 3])),
        ("fixed_read", json!([1]), json!(2)),
        ("fixed_read", json!([3]), json!(9)),
        ("shape", json!([]), json!(3)),
        ("lexicographic", json!([2, 1]), json!(7)),
        ("propagated", json!([{"Ok":7}]), json!({"Ok":8})),
        ("propagated", json!([{"Err":7}]), json!({"Err":7})),
        ("message", json!([7, 9]), json!(16)),
        ("message_empty", json!([]), json!(0)),
        ("optional", json!([{"Some":7}]), json!(7)),
        ("optional", json!([{"None":null}]), json!(9)),
        ("result_value", json!([{"Err":7}]), json!(8)),
        ("captured", json!([7, 3]), json!(10)),
        ("transformed", json!([[1, 2, 3], 10]), json!([11, 12, 13])),
        ("range_sum", json!([]), json!(9)),
        ("loop_ordered", json!([[1, 2, 3]]), json!(123)),
        ("collected", json!([[1, 2, 3]]), json!([1, 2, 3])),
        ("collected", json!([[]]), json!([])),
        ("bool_count", json!([[true, false, true]]), json!(2)),
        ("nested", json!([]), json!(9)),
        ("bounded", json!([0]), json!(0)),
        ("bounded", json!([2]), json!(2)),
        ("bounded", json!([9]), json!(4)),
        ("early", json!([false, 7]), json!(7)),
        ("early", json!([true, 7]), json!(8)),
        ("scoped", json!([true, 7]), json!(7)),
        ("conditional", json!([false, 7]), json!(6)),
        ("owners", json!([true]), json!([1, 2, 3, 4])),
        ("owners", json!([false]), json!([1, 2, 3])),
        ("empty", json!([]), json!([])),
        ("literal", json!([]), json!([1, 2, 3])),
        (
            "exact",
            json!([{"Int":"18446744073709551616"}]),
            json!({"Int":"340282366920938463463374607431768211457"}),
        ),
        ("converted", json!([-7]), json!({"Int":"-7"})),
        (
            "exact_total",
            json!([[{"Int":"7"},{"Int":"-2"}]]),
            json!({"Int":"5"}),
        ),
        ("exact_total", json!([[]]), json!({"Int":"0"})),
        ("some", json!([7]), json!({"Some":7})),
        ("none", json!([]), json!({"None":null})),
        (
            "checked",
            json!([4294967295u32]),
            json!({"Err":"Error.Overflow"}),
        ),
        ("checked", json!([7]), json!({"Ok":8})),
        ("mapped", json!([{"Some":7}]), json!({"Some":8})),
        ("mapped", json!([{"None":null}]), json!({"None":null})),
        (
            "recovered",
            json!([{"None":null}]),
            json!({"Err":"Error.Overflow"}),
        ),
        ("contract_value", json!([0]), json!({"Err":"Error.Failed"})),
        ("contract_value", json!([3]), json!({"Ok":4})),
        (
            "contract_value",
            json!([9]),
            json!({"Err":"Error.Overflow"}),
        ),
        ("text", json!([]), json!("hello")),
        ("unit", json!([]), json!(null)),
        ("point", json!([7]), json!({"x":7,"y":8})),
        ("equal", json!([{"x":7,"y":8},{"x":7,"y":8}]), json!(true)),
        ("generic_pair", json!([7]), json!({"left":7,"right":7})),
        ("generic_text", json!([]), json!("generic")),
        ("first", json!([]), json!(7)),
        ("exact_count", json!([[1, 2, 3]]), json!({"Int":"3"})),
        (
            "negated",
            json!([{"Int":"18446744073709551616"}]),
            json!({"Int":"-18446744073709551616"}),
        ),
        ("masks", json!([0xf0u32, 0xffu32]), json!(15)),
        ("shifted", json!([0x80000001u32, 32]), json!(0x80000001u32)),
        ("shifted", json!([0x80000001u32, 33]), json!(2)),
        (
            "signed_shift",
            json!([-2147483648i32, 1]),
            json!(-1073741824i32),
        ),
        ("signed_shift", json!([-1, 33]), json!(-1)),
        ("rotated", json!([9223372036854775809u64, 65]), json!(3)),
        ("literal_checked", json!([7]), json!({"Ok":8})),
        (
            "literal_checked",
            json!([4294967295u32]),
            json!({"Err":"ArithmeticError.Overflow"}),
        ),
    ];
    for (name, args, want) in cases {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let vals = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, vals, &mut 1_000_000).unwrap().json(),
            want
        );
        steps.push(json!({"pure":name,"args":args}));
        expected.push(
            json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    for name in ["good", "values"] {
        let out = runtime.invoke(name, vec![]).unwrap();
        steps.push(json!({"call":name,"args":[]}));
        expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let out = runtime
        .invoke(
            "bits",
            vec![
                verified_language::stateful::Value::U32(0xfffffffcu32),
                verified_language::stateful::Value::U32(1),
            ],
        )
        .unwrap();
    assert_eq!(out.result.json(), json!(0x80000001u32));
    steps.push(json!({"call":"bits","args":[0xfffffffcu32,1]}));
    expected.push(
        json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}),
    );
    for (name, args) in [
        ("contract_put", json!([0])),
        ("contract_put", json!([10])),
        ("contract_put", json!([3])),
        ("matched_option", json!([{"Some":7}])),
        ("matched_option", json!([{"None":null}])),
        ("action_callback", json!([7, 3])),
    ] {
        let out = runtime.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let out = runtime
        .invoke(
            "action_checked",
            vec![verified_language::stateful::Value::U32(u32::MAX)],
        )
        .unwrap();
    assert_eq!(out.result.json(), json!({"Err":"ArithmeticError.Overflow"}));
    steps.push(json!({"call":"action_checked","args":[u32::MAX]}));
    expected.push(
        json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}),
    );
    parity::conformance("language-foundations-parity", p, source, steps, expected);
}
