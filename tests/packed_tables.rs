use serde_json::Value;
use std::{collections::BTreeMap, fs};
use verified_language::{
    core::CheckedModule,
    logic::Term,
    representation::{self, Request},
    syntax::parse,
};
fn construct(d: &str, n: usize, a: Vec<Term>) -> Term {
    Term::Construct {
        datatype: d.into(),
        constructor: n,
        arguments: a,
    }
}
fn call(f: &str, a: Vec<Term>) -> Term {
    Term::Call {
        function: f.into(),
        arguments: a,
    }
}
fn physical(d: &str, width: usize, rows: &[(u64, u64)], split: bool) -> Term {
    let mut result = construct(d, 0, vec![]);
    let chunk = if split { 1 } else { width };
    for items in rows.rchunks(chunk) {
        let mut args = vec![];
        for (k, v) in items {
            args.extend([Term::U64(*k), Term::U64(*v)]);
        }
        args.push(result);
        result = construct(d, items.len(), args);
    }
    result
}
fn flatten(t: &Term) -> Vec<(u64, u64)> {
    match t {
        Term::Construct { constructor: 0, .. } => vec![],
        Term::Construct {
            constructor: 1,
            arguments,
            ..
        } => {
            let (Term::U64(k), Term::U64(v)) = (&arguments[0], &arguments[1]) else {
                panic!("bad row")
            };
            let mut result = vec![(*k, *v)];
            result.extend(flatten(&arguments[2]));
            result
        }
        _ => panic!("bad logical rows"),
    }
}
#[test]
fn arbitrary_duplicates_order_and_chunk_boundaries_match_an_independent_vector_model() {
    let module = CheckedModule::from_source(
        parse(include_str!("../knowledge/research/storage-bulk/app.ink")).unwrap(),
    )
    .unwrap();
    let layouts: BTreeMap<String, BTreeMap<String, Value>> =
        serde_json::from_slice(&fs::read("knowledge/research/storage-bulk/layouts.json").unwrap())
            .unwrap();
    let mut seed = 413u64;
    for width in [2, 4] {
        let label = format!("packed-{width}");
        let request: Request = serde_json::from_slice(
            &fs::read(format!("knowledge/research/storage-bulk/{label}.json")).unwrap(),
        )
        .unwrap();
        let checked = representation::check(&module, &request).unwrap();
        let layout = layouts[&label].values().next().unwrap();
        let d = layout["datatype"].as_str().unwrap();
        let decode = layout["decode"].as_str().unwrap();
        for count in 0..18 {
            let mut rows = vec![];
            for _ in 0..count {
                seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
                rows.push((seed % 5, seed));
            }
            for split in [false, true] {
                let p = physical(d, width, &rows, split);
                let eval = |term| checked.context().evaluate(&[], &term).unwrap();
                assert_eq!(flatten(&eval(call(decode, vec![p.clone()]))), rows);
                for key in 0..7 {
                    for op in ["get", "remove", "replace", "insert"] {
                        let f = layout["functions"][op].as_str().unwrap();
                        let mut args = vec![p.clone(), Term::U64(key)];
                        if matches!(op, "replace" | "insert") {
                            args.push(Term::U64(991));
                        }
                        let actual = eval(call(f, args));
                        if op == "get" {
                            let expected = rows.iter().find(|(k, _)| *k == key).map(|(_, v)| *v);
                            match actual {
                                Term::Construct { constructor: 0, .. } => {
                                    assert_eq!(expected, None)
                                }
                                Term::Construct {
                                    constructor: 1,
                                    arguments,
                                    ..
                                } => assert_eq!(arguments, vec![Term::U64(expected.unwrap())]),
                                _ => panic!("bad option"),
                            }
                        } else {
                            let mut expected = rows.clone();
                            match op {
                                "remove" => expected.retain(|(k, _)| *k != key),
                                "replace" => {
                                    for (k, v) in &mut expected {
                                        if *k == key {
                                            *v = 991;
                                        }
                                    }
                                }
                                "insert" => {
                                    let at = expected
                                        .iter()
                                        .position(|(k, _)| key < *k)
                                        .unwrap_or(expected.len());
                                    expected.insert(at, (key, 991));
                                }
                                _ => unreachable!(),
                            };
                            assert_eq!(
                                flatten(&eval(call(decode, vec![actual]))),
                                expected,
                                "{label} {op} {rows:?}"
                            );
                        }
                    }
                }
            }
        }
    }
}
