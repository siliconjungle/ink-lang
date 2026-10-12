use serde_json::{json, Value};
use verified_language::{eval, modules, stateful::Runtime};
#[test]
fn real_workload_algorithms_match_oracles_and_backends() {
    let p = modules::load("bench/competitive-workloads/main.ink")
        .unwrap()
        .program;
    let rt = Runtime::new(p.clone()).unwrap();
    let mut cases: Vec<(&str, Value, Value)> = vec![];
    for side in [3usize, 5] {
        for pattern in 0..4 {
            let mut cells = vec![0u32; side * side * side];
            for z in 1..side - 1 {
                for y in 1..side - 1 {
                    for x in 1..side - 1 {
                        cells[(z * side + y) * side + x] = match pattern {
                            0 => 0,
                            1 => 1,
                            2 => ((x + y + z) % 2) as u32,
                            _ => ((x * 7 + y * 3 + z) % 5 == 0) as u32,
                        };
                    }
                }
            }
            let mut want = vec![];
            for z in 1..side - 1 {
                for y in 1..side - 1 {
                    for x in 1..side - 1 {
                        let i = (z * side + y) * side + x;
                        if cells[i] == 0 {
                            continue;
                        }
                        let neighbors = [
                            i - 1,
                            i + 1,
                            i - side,
                            i + side,
                            i - side * side,
                            i + side * side,
                        ];
                        for (direction, j) in neighbors.into_iter().enumerate() {
                            if cells[j] == 0 {
                                want.push(json!({"x":x,"y":y,"z":z,"direction":direction}));
                            }
                        }
                    }
                }
            }
            for name in ["faces", "faces_linear"] {
                cases.push((name, json!([cells, side]), json!(want)));
            }
        }
    }
    for name in ["faces", "faces_linear"] {
        for (cells, side) in [(vec![], 0), (vec![1], u32::MAX), (vec![1, 2, 3], 3)] {
            cases.push((name, json!([cells, side]), json!([])));
        }
    }
    for xs in [
        vec![],
        vec![7; 16],
        vec![1, 2, 3, 4, 5],
        vec![1, 1, 2, 2, 2, 3, 3, 3],
    ] {
        let mut encoded = vec![1, xs.len() as u32];
        let mut i = 0;
        while i < xs.len() {
            let mut end = i + 1;
            while end < xs.len() && xs[end] == xs[i] {
                end += 1;
            }
            encoded.extend([(end - i) as u32, xs[i]]);
            i = end;
        }
        if encoded.len() > xs.len() + 2 {
            encoded = vec![0, xs.len() as u32];
            encoded.extend(&xs);
        }
        cases.push(("encode_adaptive", json!([xs]), json!(encoded)));
        cases.push(("decode_adaptive", json!([encoded, 100]), json!({"Ok":xs})));
    }
    let f = p
        .functions
        .iter()
        .find(|f| f.name == "decode_adaptive")
        .unwrap();
    let verified_language::syntax::Type::Result(_, e) = &f.result else {
        panic!()
    };
    let verified_language::syntax::Type::Named(e) = e.as_ref() else {
        panic!()
    };
    for words in [
        vec![],
        vec![0],
        vec![2, 0],
        vec![0, 2, 1],
        vec![1, 2, 0, 7],
        vec![1, 1, 2, 7],
    ] {
        cases.push((
            "decode_adaptive",
            json!([words, 100]),
            json!({"Err":format!("{e}.Invalid")}),
        ));
    }
    cases.push((
        "decode_adaptive",
        json!([[0, 101], 100]),
        json!({"Err":format!("{e}.Limit")}),
    ));
    let particles = json!([{"position":u32::MAX,"velocity":1},{"position":4,"velocity":7}]);
    let next = json!([{"position":0,"velocity":1},{"position":11,"velocity":7}]);
    for name in ["particles", "particles_owned"] {
        cases.push((name, json!([particles]), next.clone()));
    }
    cases.push(("offsets",json!([[1,2,3]]),json!([2,3,4])));
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
        steps.push(json!({"pure":name,"args":args,"expect_gpu":name=="offsets"}));
        expected.push(json!({"reply":{"value":want},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    super::parity::conformance(
        "competitive-workloads-parity",
        p,
        include_str!("../../bench/competitive-workloads/main.ink"),
        steps,
        expected,
    );
}
