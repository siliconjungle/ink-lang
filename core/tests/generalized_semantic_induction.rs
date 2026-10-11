use ink_core::{
    core::Program,
    core::Type,
    laws::{Catalogue, CheckedCatalogue, Law},
    registry,
    semantic::{self as s, Budget, Node},
};
use serde_json::{json, Value};
use std::collections::BTreeMap;
fn laws() -> Vec<Value> {
    serde_json::from_str(include_str!("fixtures/collection-edit-laws.json")).unwrap()
}
fn check(v: Value) -> Result<(), String> {
    let law: Law = serde_json::from_value(v).map_err(|e| e.to_string())?;
    let id = registry::identity(&registry::Entry::from_law(&law)?)?;
    CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: ink_core::laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id, law)]),
        },
        &Program::default(),
    )
    .map(|_| ())
}
fn change_instantiation(v: &mut Value, edit: &impl Fn(&mut Value)) {
    if let Some(i) = v.get_mut("GeneralizedHypothesis") {
        edit(i);
    } else {
        match v {
            Value::Object(o) => {
                for x in o.values_mut() {
                    change_instantiation(x, edit)
                }
            }
            Value::Array(a) => {
                for x in a {
                    change_instantiation(x, edit)
                }
            }
            _ => {}
        }
    }
}
#[test]
fn indexed_edit_identities_need_and_admit_generalized_induction() {
    for mut v in laws() {
        check(v.clone()).unwrap();
        // Ordinary induction cannot specialize its hypothesis at i-1.
        let mut p = v["proof"]["GeneralizedInduction"].take();
        p.as_object_mut().unwrap().remove("generalize");
        v["proof"] = json!({"Induction":p});
        assert!(check(v).is_err());
    }
}
#[test]
fn schema_cannot_escape_its_step_or_prove_the_current_constructor() {
    let mut v = laws()[0].clone();
    v["proof"]["GeneralizedInduction"]["base"] =
        json!({"GeneralizedHypothesis":{"index":0,"arguments":{"i":s::word(Type::U32,0)}}});
    assert!(check(v).unwrap_err().contains("index out of range"));
    let mut v = laws()[0].clone();
    v["proof"]["GeneralizedInduction"]["step"] = json!({"GeneralizedHypothesis":{"index":0,"arguments":{"i":s::free(s::value(Type::U32),"i")}}});
    assert!(check(v).unwrap_err().contains("exact goal"));
}
#[test]
fn typed_instantiation_and_quantifier_premise_checks_reject_forgery() {
    for arguments in [
        json!({}),
        json!({"i":s::word(Type::U64,1)}),
        json!({"i":s::word(Type::U32,1),"tail":s::word(Type::U32,1)}),
    ] {
        let mut v = laws()[0].clone();
        change_instantiation(&mut v["proof"], &|p| p["arguments"] = arguments.clone());
        assert!(check(v).is_err());
    }
    for generalize in [json!(["i", "i"]), json!(["xs"]), json!(["unknown"])] {
        let mut v = laws()[0].clone();
        v["proof"]["GeneralizedInduction"]["generalize"] = generalize;
        assert!(check(v).is_err());
    }
    let mut v = laws()[0].clone();
    let i = s::free(s::value(Type::U32), "i");
    v["conditions"] = json!([{"from":i,"to":s::word(Type::U32,0)}]);
    assert!(check(v).unwrap_err().contains("independent"));
    let mut v = laws()[0].clone();
    change_instantiation(&mut v["proof"], &|p| p["index"] = json!(1));
    assert!(check(v).is_err());
}
#[test]
fn tree_rebuilding_preserves_capture_checks_scope_roundtrips_and_budgets() {
    let sort = s::value(Type::U32);
    let t = s::lambda(
        sort.clone(),
        s::op(
            sort.clone(),
            "binary:+",
            vec![
                s::term(sort.clone(), Node::Bound(0)),
                s::term(sort.clone(), Node::Bound(1)),
            ],
        ),
    );
    let scope = vec![("outer".into(), sort.clone())];
    let opened = s::open_scope(&t, &scope, &mut Budget::new()).unwrap();
    assert_eq!(
        s::close_scope(&opened, &scope, &mut Budget::new()).unwrap(),
        t
    );
    assert!(s::unshift_hole(&t, 1).is_err());
    let closed = s::lambda(sort.clone(), s::term(sort.clone(), Node::Bound(0)));
    assert_eq!(s::unshift_hole(&closed, 1).unwrap(), closed);
    assert!(s::substitute(&t, &BTreeMap::new(), &mut Budget { remaining: 0 }).is_err());
    let mut seen = vec![];
    let cons = s::term(
        s::value(Type::List(Box::new(Type::U32))),
        Node::Cons(
            Box::new(s::word(Type::U32, 7)),
            Box::new(s::term(
                s::value(Type::List(Box::new(Type::U32))),
                Node::Nil,
            )),
        ),
    );
    assert_eq!(
        s::try_map_children(&cons, |x| {
            seen.push(x.node.clone());
            Ok(x.clone())
        })
        .unwrap(),
        cons
    );
    assert_eq!(seen, vec![Node::Word(7), Node::Nil]);
}

#[test]
fn natural_generalization_uses_only_the_immediate_predecessor() {
    let n = s::free(s::Sort::Nat, "n");
    check(json!({"schema":1,"semantics":ink_core::laws::SEMANTICS,
        "params":{"n":"Nat","x":s::value(Type::U32)},"conditions":[],"dependencies":[],
        "from":n,"to":n,"proof":{"GeneralizedInduction":{
            "variable":"n","generalize":["x"],"names":["previous"],"base":"Normalize",
            "step":{"Congruence":[{"GeneralizedHypothesis":{"index":0,"arguments":{"x":s::word(Type::U32,7)}}}]}
        }}})).unwrap();
    let proof:ink_core::laws::Proof=serde_json::from_value(json!({"GeneralizedHypothesis":{"index":0,"arguments":{"x":s::term(s::value(Type::U32),Node::Bound(0))}}})).unwrap();
    let opened = ink_core::laws::open_proof(
        &proof,
        &[("outer".into(), s::value(Type::U32))],
        &mut Budget::new(),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_value(opened).unwrap()["GeneralizedHypothesis"]["arguments"]["x"],
        json!(s::free(s::value(Type::U32), "outer"))
    );
}
