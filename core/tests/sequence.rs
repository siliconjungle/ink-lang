//! Independent core fixtures: no knowledge checkout, backend or compiler binary.
use ink_core::{
    core::{self, CheckedModule, Type},
    eval::{self, Value},
    laws::{self, Catalogue, CheckedCatalogue, Equation, Proof},
    semantic::{self as s, Budget, Node, Sort, Term},
    syntax,
};
use serde_json::json;
use std::collections::BTreeMap;

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&format!("module Sequence; {source}")).unwrap())
        .unwrap()
}

#[test]
fn concat_preserves_order_empty_boundaries_and_all_reference_value_types() {
    let cases = [
        ("u32", json!([0, 4294967295u32]), json!([7, 0])),
        ("u64", json!([u64::MAX, 0]), json!([9007199254740993u64])),
        ("i32", json!([i32::MIN, -1]), json!([i32::MAX, 0])),
        (
            "f32",
            json!([{"F32Bits":0x80000000u32}, {"F32Bits":0x7fc01234u32}]),
            json!([{"F32Bits":0x7f800000u32}, 1.0]),
        ),
        ("Bool", json!([true, false]), json!([false, true])),
        ("String", json!(["λ", ""]), json!(["tail"])),
        (
            "Int",
            json!([{"Int":"123456789012345678901234567890"}]),
            json!([{"Int":"-1"}]),
        ),
        ("Unit", json!([null]), json!([null, null])),
        (
            "Option<u32>",
            json!([{"Some":4294967295u32}]),
            json!([{"None":null}]),
        ),
        (
            "Result<u32,Bool>",
            json!([{"Ok":7}]),
            json!([{"Err":false}]),
        ),
        ("List<u32>", json!([[1, 2], []]), json!([[4294967295u32]])),
        (
            "Vec2<f32>",
            json!([[{"F32Bits":0x80000000u32}, 1.0]]),
            json!([[2.0, 3.0]]),
        ),
        (
            "Row",
            json!([{"word":4294967295u32,"flag":true}]),
            json!([{"word":0,"flag":false}]),
        ),
    ];
    for (ty, left_json, right_json) in cases {
        let m = module(&format!("record Row {{ word:u32, flag:Bool, }} fn append(xs:List<{ty}>,ys:List<{ty}>)->List<{ty}>{{return xs.concat(ys);}}"));
        let list_ty = &m.program().functions[0].result;
        let left = Value::from_program_json(&left_json, list_ty, m.program()).unwrap();
        let right = Value::from_program_json(&right_json, list_ty, m.program()).unwrap();
        for (a, b) in [
            (left.clone(), right.clone()),
            (Value::List(vec![]), right.clone()),
            (left.clone(), Value::List(vec![])),
            (Value::List(vec![]), Value::List(vec![])),
        ] {
            let Value::List(av) = &a else { unreachable!() };
            let Value::List(bv) = &b else { unreachable!() };
            // The oracle is sequence indexing, independent of the evaluator's
            // owned Vec append and its fuel/allocation policy.
            let expected = Value::List(
                (0..av.len() + bv.len())
                    .map(|i| {
                        if i < av.len() {
                            av[i].clone()
                        } else {
                            bv[i - av.len()].clone()
                        }
                    })
                    .collect(),
            );
            assert_eq!(
                eval::call(m.program(), "append", vec![a, b], &mut 100_000).unwrap(),
                expected,
                "{ty}"
            );
        }
        assert_eq!(
            left,
            Value::from_program_json(&left_json, list_ty, m.program()).unwrap()
        );
        assert_eq!(
            right,
            Value::from_program_json(&right_json, list_ty, m.program()).unwrap()
        );
    }
}

#[test]
fn concat_versions_and_contextual_types_are_checked() {
    let basic = module("fn id(xs:List<u32>)->List<u32>{return xs;}");
    let compute = module("fn id(xs:List<i32>)->List<i32>{return xs;}");
    let sequence = module(
        "fn append(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.map(fn(x)=>0).concat(ys);}",
    );
    assert_eq!(basic.semantics(), core::SEMANTICS);
    assert_eq!(compute.semantics(), core::COMPUTE_SEMANTICS);
    assert_eq!(sequence.semantics(), core::SEQUENCE_SEMANTICS);
    let owned = module("fn stop()->u32{return repeat_until(3,0,fn(x)=>x==2,fn(i)=>fn(x)=>x+1);}");
    let combined = module("fn append(xs:List<u32>,ys:List<u32>)->List<u32>{let b=buffer(xs);return b.freeze().concat(ys);}");
    assert_eq!(owned.semantics(), core::LOCAL_SEMANTICS);
    assert_eq!(combined.semantics(), core::SEQUENCE_SEMANTICS);
    assert_ne!(core::LOCAL_SEMANTICS, core::SEQUENCE_SEMANTICS);
    for m in [&basic, &compute, &sequence, &owned, &combined] {
        assert_eq!(
            m.bytes().unwrap(),
            CheckedModule::from_bytes(&m.bytes().unwrap())
                .unwrap()
                .bytes()
                .unwrap()
        );
    }
    assert_eq!(
        eval::call(
            sequence.program(),
            "append",
            vec![
                Value::List(vec![Value::U32(9)]),
                Value::List(vec![Value::U32(u32::MAX)])
            ],
            &mut 100_000
        )
        .unwrap(),
        Value::List(vec![Value::U32(0), Value::U32(u32::MAX)])
    );
    let mut wire: serde_json::Value = serde_json::from_slice(&sequence.bytes().unwrap()).unwrap();
    for tag in [core::SEMANTICS, core::COMPUTE_SEMANTICS, core::LOCAL_SEMANTICS] {
        wire["semantics"] = json!(tag);
        assert!(CheckedModule::from_bytes(&serde_json::to_vec(&wire).unwrap()).is_err());
    }
    for source in [
        "fn bad(xs:List<u32>)->List<u32>{return xs.concat();}",
        "fn bad(xs:List<u32>)->List<u32>{return xs.concat(xs,xs);}",
        "fn bad(xs:List<u32>,ys:List<u64>)->List<u32>{return xs.concat(ys);}",
        "fn bad(xs:List<u32>,ys:List<Bool>)->List<u32>{return xs.concat(ys);}",
        "fn bad(xs:List<u32>)->List<u32>{return xs.concat(1);}",
        "fn bad(x:u32,ys:List<u32>)->List<u32>{return x.concat(ys);}",
    ] {
        assert!(
            CheckedModule::from_source(syntax::parse(&format!("module Bad; {source}")).unwrap())
                .is_err(),
            "{source}"
        );
    }
    let append = module("fn append(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.concat(ys);}");
    assert!(eval::call(
        append.program(),
        "append",
        vec![
            Value::List(vec![Value::U32(1); 100]),
            Value::List(vec![Value::U32(2); 100])
        ],
        &mut 205
    )
    .unwrap_err()
    .contains("budget"));
}

fn list(sort: &Sort, elements: Vec<Term>) -> Term {
    elements
        .into_iter()
        .rev()
        .fold(s::term(sort.clone(), Node::Nil), |tail, head| {
            s::term(sort.clone(), Node::Cons(Box::new(head), Box::new(tail)))
        })
}

#[test]
fn semantic_concat_has_only_typed_definitional_computation() {
    let p = core::Program::default();
    let catalogue = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        &p,
    )
    .unwrap();
    for ty in [
        Type::U32,
        Type::U64,
        Type::I32,
        Type::F32,
        Type::Bool,
        Type::List(Box::new(Type::U32)),
        Type::Vector(Box::new(Type::F32), 2),
    ] {
        let sort = s::value(Type::List(Box::new(ty.clone())));
        let element = s::value(ty);
        let a = s::free(element.clone(), "a");
        let b = s::free(element.clone(), "b");
        let env = BTreeMap::from([("a".into(), element.clone()), ("b".into(), element)]);
        let left = list(&sort, vec![a.clone()]);
        let right = list(&sort, vec![b.clone()]);
        let from = s::op(
            sort.clone(),
            "method:concat",
            vec![left.clone(), right.clone()],
        );
        let goal = Equation {
            from: from.clone(),
            to: list(&sort, vec![a.clone(), b.clone()]),
        };
        catalogue
            .prove(
                &p,
                &env,
                &[],
                &goal,
                &Proof::Normalize,
                &mut Budget::new(),
                0,
            )
            .unwrap();
        let reversed = Equation {
            from: from.clone(),
            to: list(&sort, vec![b.clone(), a.clone()]),
        };
        assert!(catalogue
            .prove(
                &p,
                &env,
                &[],
                &reversed,
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
        let changed = Equation {
            from,
            to: list(&sort, vec![a.clone(), a]),
        };
        assert!(catalogue
            .prove(
                &p,
                &env,
                &[],
                &changed,
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
        for args in [
            vec![left.clone()],
            vec![left.clone(), right.clone(), right.clone()],
            vec![left, s::word(Type::U32, 0)],
        ] {
            assert!(s::validate(
                &s::op(sort.clone(), "method:concat", args),
                &env,
                &p,
                &mut Budget::new()
            )
            .is_err());
        }
        let mut xs_env = BTreeMap::new();
        xs_env.insert("xs".into(), sort.clone());
        xs_env.insert("ys".into(), sort.clone());
        let xs = s::free(sort.clone(), "xs");
        let ys = s::free(sort.clone(), "ys");
        let false_commutativity = Equation {
            from: s::op(sort.clone(), "method:concat", vec![xs.clone(), ys.clone()]),
            to: s::op(sort, "method:concat", vec![ys, xs]),
        };
        assert!(catalogue
            .prove(
                &p,
                &xs_env,
                &[],
                &false_commutativity,
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
    }
}

#[test]
fn semantic_concat_round_trips_source_without_new_syntax() {
    let m = module("fn append(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.concat(ys);}");
    let f = &m.program().functions[0];
    let env = ink_core::check::params_env(&f.params).unwrap();
    let semantic = s::elaborate(&f.body, &env, m.program(), &f.result).unwrap();
    assert_eq!(s::reify(&semantic, m.program()).unwrap(), f.body);
    let semantic_env = env.into_iter().map(|(n, t)| (n, s::value(t))).collect();
    s::validate(&semantic, &semantic_env, m.program(), &mut Budget::new()).unwrap();
}
