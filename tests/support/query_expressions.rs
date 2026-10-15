use serde_json::json;
use verified_language::{eval, stateful::Runtime, syntax};

const SOURCE: &str = include_str!("../../examples/query-expressions.ink");

#[test]
fn typed_queries_match_host_oracles_and_preserve_transaction_observations() {
    let p = syntax::parse(SOURCE).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut cases = vec![];
    for xs in [
        vec![],
        vec![0u32],
        vec![3, 1, 3, 2, 0],
        vec![u32::MAX, 0, 7, 7],
    ] {
        for threshold in [0, 2, u32::MAX] {
            let expected = xs
                .iter()
                .copied()
                .filter(|x| *x >= threshold)
                .map(|x| x.wrapping_mul(3).wrapping_add(5))
                .collect::<Vec<_>>();
            for name in ["filtered", "pipeline", "manual"] {
                cases.push((name, json!([xs, threshold, 5]), json!(expected)));
            }
        }
        for ys in [vec![], vec![2u32, 3, 3, 0], vec![u32::MAX, 7, 7]] {
            let expected = xs
                .iter()
                .flat_map(|x| {
                    ys.iter()
                        .filter(move |y| *y == x)
                        .map(move |y| json!({"left":x,"right":y}))
                })
                .collect::<Vec<_>>();
            for name in ["joined", "manual_join"] {
                cases.push((name, json!([xs, ys]), json!(expected)));
            }
            cases.push((
                "intersects",
                json!([xs, ys]),
                json!(xs.iter().any(|x| ys.contains(x))),
            ));
        }
        let expected = xs
            .iter()
            .copied()
            .filter(|x| *x > 0)
            .flat_map(|x| [x, x.wrapping_add(1)].map(|y| x.wrapping_mul(10).wrapping_add(y)))
            .collect::<Vec<_>>();
        cases.push(("lateral", json!([xs]), json!(expected)));
        for target in [0, 7, u32::MAX] {
            for name in ["contains", "manual_contains"] {
                cases.push((name, json!([xs, target]), json!(xs.contains(&target))));
            }
        }
    }
    cases.push((
        "float_bits",
        json!([]),
        json!([2147483648u32, 2143289345u32, 1]),
    ));
    cases.push((
        "scaled",
        json!([[0, 1, u32::MAX]]),
        json!([1, 4, u32::MAX - 1]),
    ));
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
        assert_eq!(
            eval::call(&p, name, values, &mut 10_000_000)
                .unwrap()
                .json(),
            want,
            "{name}"
        );
        let expect_gpu = name == "scaled"
            || (["filtered", "contains"].contains(&name)
                && args[0].as_array().is_some_and(|xs| !xs.is_empty()));
        steps.push(json!({"pure":name,"args":args,"cpu_only":!expect_gpu,"expect_gpu":expect_gpu}));
        expected.push(json!({"reply":{"value":want},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    let mut trace = vec![];
    let mut committed_version = 0;
    for (empty, abort) in [
        (false, false),
        (true, false),
        (false, true),
        (true, true),
        (false, false),
    ] {
        let before = rt.checkpoint_portable().unwrap();
        let out = rt.invoke_json("run", &json!([empty, abort])).unwrap();
        if abort {
            assert_eq!(out.result.json(), json!({"Err":"Error.Aborted"}));
            assert!(!out.committed);
            assert!(out.events.is_empty());
            assert_eq!(rt.checkpoint_portable().unwrap(), before);
        } else {
            committed_version += 1;
            trace.extend([1u32, 2]);
            assert_eq!(
                out.result.json(),
                json!({"Ok":if empty{vec![]}else{vec![12;4]}})
            );
            assert_eq!(
                out.json()["events"],
                json!([
                {"commit":committed_version,"position":0,"channel":"Seen","value":1},
                {"commit":committed_version,"position":1,"channel":"Seen","value":2}])
            );
        }
        steps.push(json!({"call":"run","args":[empty,abort]}));
        expected.push(
            json!({"reply":{"outcome":out.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
        let out = rt.invoke_json("trace", &json!([])).unwrap();
        assert_eq!(out.result.json(), json!(trace));
        steps.push(json!({"call":"trace","args":[]}));
        expected.push(
            json!({"reply":{"outcome":out.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    // Exact restore after later successful/failed queries is part of the
    // compiled fixture, not just a comparison of returned collections.
    let checkpoint = rt.checkpoint_portable().unwrap();
    steps.push(json!({"restore":checkpoint}));
    let out = rt.invoke_json("trace", &json!([])).unwrap();
    steps.push(json!({"call":"trace","args":[]}));
    expected.push(json!({"reply":{"outcome":out.json()},"snapshot":checkpoint}));
    super::parity::conformance("query-expressions-parity", p, SOURCE, steps, expected);
}
