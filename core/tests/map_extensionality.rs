//! Map equality checks the complete domain and exact present values. A few
//! observations, numeric float equality or a captured key are not authority.
use ink_core::{core::{Program, Type}, laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof}, registry,
    semantic::{self as s, Budget, Env, Node, Term}};
use std::collections::BTreeMap;

fn op(ty: Type, name: &str, args: Vec<Term>) -> Term { s::op(s::value(ty), name, args) }
fn boolean(v: bool) -> Term { s::term(s::value(Type::Bool), Node::Bool(v)) }
fn key(ty: &Type, name: &str) -> Term { s::free(s::value(ty.clone()), name) }
fn set(map: &Term, k: &Term, v: &Term) -> Term { s::op(map.sort.clone(), "method:set", vec![map.clone(),k.clone(),v.clone()]) }
fn contains(map: &Term, k: &Term) -> Term { op(Type::Bool,"method:contains",vec![map.clone(),k.clone()]) }
fn equal(a: &Term,b: &Term) -> Term { op(Type::Bool,"binary:==",vec![a.clone(),b.clone()]) }
fn cases(k: &Term, a: &Term) -> Proof { Proof::Cases {condition:equal(k,a),on_false:Box::new(Proof::Normalize),on_true:Box::new(Proof::Normalize)} }
fn ext(parameter: &str, presence: Proof, values: Proof) -> Proof { Proof::MapExtensional {parameter:parameter.into(),fallback_parameter:"fallback".into(),presence:Box::new(presence),values:Box::new(values)} }
fn check(env: Env, conditions: Vec<Equation>, from: Term, to: Term, proof: Proof) -> Result<(),String> {
    let law: Law = serde_json::from_value(serde_json::json!({"schema":1,"semantics":laws::GENERAL_SEMANTICS,
        "params":env,"conditions":conditions,"from":from,"to":to,"proof":proof,"dependencies":[]})).unwrap();
    let id=registry::identity(&registry::Entry::from_law(&law)?)?;
    CheckedCatalogue::check(&Catalogue {schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&Program::default()).map(|_|())
}
fn env(terms: &[&Term]) -> Env { terms.iter().map(|t|{let Node::Free(n)=&t.node else {panic!("test variable")};(n.clone(),t.sort.clone())}).collect() }

#[test]
fn overwrite_is_proved_for_every_key_and_exact_payload_sort() {
    for kt in [Type::Bool,Type::U32,Type::U64,Type::I32] {
        for vt in [Type::U32,Type::U64,Type::Bool,Type::F32,Type::List(Box::new(Type::U32))] {
            let mt=Type::Map(Box::new(kt.clone()),Box::new(vt.clone()));
            let m=key(&mt,"m");let a=key(&kt,"a");let q=key(&kt,"q");let x=key(&vt,"x");let y=key(&vt,"y");
            let from=set(&set(&m,&a,&x),&a,&y);let to=set(&m,&a,&y);
            check(env(&[&m,&a,&x,&y]),vec![],from,to,ext("q",cases(&q,&a),cases(&q,&a)))
                .unwrap_or_else(|e|panic!("{kt:?}/{vt:?}: {e}"));
        }
    }
}

#[test]
fn distinct_key_updates_commute_only_with_a_checked_condition() {
    for kt in [Type::U32,Type::U64,Type::I32] {
        let mt=Type::Map(Box::new(kt.clone()),Box::new(Type::F32));
        let m=key(&mt,"m");let a=key(&kt,"a");let b=key(&kt,"b");let q=key(&kt,"q");
        let x=key(&Type::F32,"x");let y=key(&Type::F32,"y");
        let from=set(&set(&m,&a,&x),&b,&y);let to=set(&set(&m,&b,&y),&a,&x);
        let condition=Equation {from:op(Type::Bool,"binary:!=",vec![a.clone(),b.clone()]),to:boolean(true)};
        let body=||Proof::Order {atoms:vec![q.clone(),a.clone(),b.clone()],body:Box::new(Proof::Normalize)};
        check(env(&[&m,&a,&b,&x,&y]),vec![condition],from.clone(),to.clone(),ext("q",body(),body())).unwrap();
        assert!(check(env(&[&m,&a,&b,&x,&y]),vec![],from,to,ext("q",body(),body())).is_err());
    }
}

#[test]
fn absent_values_are_vacuous_but_membership_is_required() {
    let kt=Type::U32;let mt=Type::Map(Box::new(kt.clone()),Box::new(Type::F32));
    let empty=op(mt,"local:map-empty",vec![]);let a=key(&kt,"a");let q=key(&kt,"q");let x=key(&Type::F32,"x");
    let added=set(&empty,&a,&x);let removed=s::op(empty.sort.clone(),"method:remove",vec![added.clone(),a.clone()]);
    check(env(&[&a,&x]),vec![],empty.clone(),removed,ext("q",cases(&q,&a),cases(&q,&a))).unwrap();
    assert!(check(env(&[&a,&x]),vec![],empty,added,ext("q",cases(&q,&a),Proof::Normalize)).is_err());
}

#[test]
fn map_payloads_preserve_signed_zero_nan_bits_and_changed_values() {
    let kt=Type::U64;let mt=Type::Map(Box::new(kt.clone()),Box::new(Type::F32));
    let empty=op(mt,"local:map-empty",vec![]);let a=key(&kt,"a");let q=key(&kt,"q");
    for (left,right) in [(0,0x80000000),(0x7fc00001,0x7fc00002),(0x3f800000,0x40000000)] {
        let v=|bits|s::term(s::value(Type::F32),Node::Float(bits));
        let from=set(&empty,&a,&v(left));let to=set(&empty,&a,&v(right));
        assert!(check(env(&[&a]),vec![],from.clone(),to,ext("q",cases(&q,&a),cases(&q,&a))).is_err());
        check(env(&[&a]),vec![],from.clone(),from,ext("q",Proof::Normalize,Proof::Normalize)).unwrap();
    }
}

#[test]
fn fresh_key_scope_and_complete_domain_cannot_be_forged() {
    let kt=Type::U32;let mt=Type::Map(Box::new(kt.clone()),Box::new(Type::U32));
    let m=key(&mt,"m");let n=key(&mt,"n");let a=key(&kt,"a");
    for name in ["", "a", "m", "not-a-name", &"q".repeat(129)] {
        assert!(check(env(&[&m,&a]),vec![],m.clone(),m.clone(),ext(name,Proof::Normalize,Proof::Normalize)).is_err());
    }
    for fallback in ["q", "m", "", "bad-name"] {
        let mut proof=ext("q",Proof::Normalize,Proof::Normalize);
        if let Proof::MapExtensional {fallback_parameter,..}=&mut proof {*fallback_parameter=fallback.into();}
        assert!(check(env(&[&m]),vec![],m.clone(),m.clone(),proof).is_err());
    }
    assert!(check(env(&[&a]),vec![],a.clone(),a.clone(),ext("q",Proof::Normalize,Proof::Normalize)).is_err());
    let one_key=Equation {from:contains(&m,&a),to:contains(&n,&a)};
    assert!(check(env(&[&m,&n,&a]),vec![one_key],m.clone(),n.clone(),ext("q",Proof::Hypothesis(0),Proof::Normalize)).is_err());
    assert!(check(env(&[&m,&n]),vec![],m,n,ext("q",Proof::Normalize,Proof::Normalize)).is_err());
}

#[test]
fn binder_opening_visits_both_obligations_and_preserves_fresh_key_names() {
    let sort=s::value(Type::U32);let bound=s::term(sort.clone(),Node::Bound(0));
    let premise=Proof::Trans {middle:bound.clone(),left:Box::new(Proof::Normalize),right:Box::new(Proof::Normalize)};
    let proof=ext("q",premise.clone(),premise);
    let opened=laws::open_proof(&proof,&[("outer".into(),sort)],&mut Budget::new()).unwrap();
    let Proof::MapExtensional {parameter,fallback_parameter,presence,values}=opened else {panic!("map proof")};
    assert_eq!(parameter,"q");assert_eq!(fallback_parameter,"fallback");
    for child in [presence,values] {let Proof::Trans {middle,..}=*child else {panic!("trans")};assert_eq!(middle.node,Node::Free("outer".into()));}
    // A serialized proof cannot smuggle a third unchecked obligation.
    let mut serialized=serde_json::to_value(proof).unwrap();serialized["MapExtensional"]["ignored"]="Normalize".into();
    assert!(serde_json::from_value::<Proof>(serialized).is_err());
}

#[test]
fn source_authoring_keeps_map_algebra_parametric_over_values() {
    use ink_core::{law_author,syntax};
    let source="module map_algebra;law overwrite<V>(m:Map<u32,V>,a:u32,x:V,y:V){m.set(a,x).set(a,y)==m.set(a,y);proof by provided;}";
    assert!(law_author::compile_source(syntax::parse_law_source(&source.replace("proof by provided;","proof by normalize;")).unwrap(),BTreeMap::new(),None).is_err());
    let q=key(&Type::U32,"q");let a=key(&Type::U32,"a");
    let evidence=law_author::Evidence {proof:ext("q",cases(&q,&a),cases(&q,&a)),conditions:vec![]};
    let authored=law_author::compile_source(syntax::parse_law_source(source).unwrap(),BTreeMap::from([("overwrite".into(),evidence)]),None).unwrap();
    assert_eq!(authored.names.len(),1);
    let catalogue=registry::CheckedBundle::check(&authored.bundle).unwrap().catalogue().unwrap();
    CheckedCatalogue::check(&catalogue,&Program::default()).unwrap();
    assert!(catalogue.objects.values().any(|law|law.types==vec!["V"]));
}
