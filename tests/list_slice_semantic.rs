use ink_core::{
    core::{CheckedModule, Program, Type},
    laws::{self, Catalogue, CheckedCatalogue, Law},
    registry,
    semantic::{self as s, Node},
    syntax,
};
use serde_json::{json, Value};
use std::collections::BTreeMap;
fn check(v: Value) -> Result<(), String> {
    let law: Law = serde_json::from_value(v).map_err(|e| e.to_string())?;
    let id = registry::identity(&registry::Entry::from_law(&law)?)?;
    CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id, law)]),
        },
        &Program::default(),
    )
    .map(|_| ())
}
#[test]
fn slice_induction_proofs_reject_wrong_counts_and_unquantified_hypotheses() {
    let fixtures: Vec<Value> =
        serde_json::from_str(include_str!("fixtures/list-slice-laws.json")).unwrap();
    for v in fixtures {
        check(v.clone()).unwrap();
        let mut wrong = v.clone();
        wrong["to"] = json!(s::term(
            s::value(Type::List(Box::new(Type::U32))),
            Node::Nil
        ));
        assert!(check(wrong).is_err());
        let mut ordinary = v;
        let mut proof = ordinary["proof"]["GeneralizedInduction"].take();
        proof.as_object_mut().unwrap().remove("generalize");
        ordinary["proof"] = json!({"Induction":proof});
        assert!(check(ordinary).is_err());
    }
}
#[test]
fn slice_correspondence_roundtrips_and_rejects_wrong_count_types() {
    for operation in ["take", "drop"] {
        for body in [
            format!("xs.{operation}(n)"),
            format!("xs.map(fn(x)=>x+1).{operation}(n)"),
        ] {
            let source = format!(
                "module slices; pub fn run(xs:List<u32>,n:u32)->List<u32>{{return {body};}}"
            );
            let m = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
            let f = &m.program().functions[0];
            let env = BTreeMap::from([
                ("xs".into(), Type::List(Box::new(Type::U32))),
                ("n".into(), Type::U32),
            ]);
            let t = s::elaborate(&f.body, &env, m.program(), &f.result).unwrap();
            s::validate(
                &t,
                &env.iter()
                    .map(|(n, t)| (n.clone(), s::value(t.clone())))
                    .collect(),
                m.program(),
                &mut s::Budget::new(),
            )
            .unwrap();
            let rebuilt = s::reify(&t, m.program()).unwrap();
            assert_eq!(
                s::elaborate(&rebuilt, &env, m.program(), &f.result).unwrap(),
                t
            );
        }
        let sort = s::value(Type::List(Box::new(Type::U32)));
        for wrong in [
            s::word(Type::U64, 1),
            s::term(s::value(Type::Bool), Node::Bool(true)),
        ] {
            let t = s::op(
                sort.clone(),
                &format!("method:{operation}"),
                vec![s::term(sort.clone(), Node::Nil), wrong],
            );
            assert!(s::validate(
                &t,
                &BTreeMap::new(),
                &Program::default(),
                &mut s::Budget::new()
            )
            .is_err());
        }
    }
}
