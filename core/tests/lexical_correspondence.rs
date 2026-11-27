use ink_core::{check,core::{CheckedModule,Program,Type},laws::{Catalogue,CheckedCatalogue,Equation,Proof},semantic as s,syntax};
use std::collections::BTreeMap;
fn checker(p:&Program)->CheckedCatalogue {
    CheckedCatalogue::check(&Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap()
}
fn apply(f:s::Term,x:s::Term)->s::Term {
    let s::Sort::Arrow(_,out)=&f.sort else {panic!("arrow")};
    s::op((**out).clone(),"apply",vec![f,x])
}
#[test]
fn curried_reification_keeps_large_unchanged_arguments_opaque() {
    let u=s::value(Type::U64);
    let seed=s::free(u.clone(),"seed");
    let env=BTreeMap::from([("seed".into(),u.clone())]);
    let mut costs=vec![];
    for count in [1000,65536] {
        let source=format!("module Lexical;fn slow(x:u64)->u64{{return repeat({count},x,fn(i)=>fn(a)=>a);}}");
        let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();let p=module.program();
        let body=s::op(u.clone(),"binary:+",vec![s::term(u.clone(),s::Node::Bound(1)),s::term(u.clone(),s::Node::Bound(0))]);
        let argument=s::op(u.clone(),"call:slow",vec![seed.clone()]);
        let term=apply(apply(s::lambda(u.clone(),s::lambda(u.clone(),body)),argument),s::word(Type::U64,9));
        let actual=s::elaborate(&s::reify(&term,p).unwrap(),&check::Env::from([("seed".into(),Type::U64)]),p,&Type::U64).unwrap();
        assert_ne!(term,actual,"curried and sequential binding trees differ");
        let mut budget=s::Budget::new();
        checker(p).prove(p,&env,&[],&Equation{from:term,to:actual},&Proof::Normalize,&mut budget,0).unwrap();
        costs.push(budget.remaining);
    }
    assert_eq!(costs[0],costs[1],"unchanged loop iteration counts are not proof execution work");
}
#[test]
fn lexical_computation_preserves_capture_and_existing_budget_limits() {
    let p=Program::default();let u=s::value(Type::U64);
    let x=s::free(u.clone(),"x");let y=s::free(u.clone(),"y");
    let env=BTreeMap::from([("x".into(),u.clone()),("y".into(),u.clone())]);
    let first=s::lambda(u.clone(),s::lambda(u.clone(),s::term(u.clone(),s::Node::Bound(1))));
    let from=apply(apply(first,x.clone()),y.clone());let c=checker(&p);
    c.prove(&p,&env,&[],&Equation{from:from.clone(),to:x.clone()},&Proof::Normalize,&mut s::Budget::new(),0).unwrap();
    assert!(c.prove(&p,&env,&[],&Equation{from:from.clone(),to:y},&Proof::Normalize,&mut s::Budget::new(),0).is_err());
    let mut exhausted=s::Budget{remaining:1,..s::Budget::new()};
    assert!(c.prove(&p,&env,&[],&Equation{from,to:x},&Proof::Normalize,&mut exhausted,0).is_err());
}
#[test]
fn beta_correspondence_cannot_erase_an_unsupported_closed_binary64_term() {
    let p=Program::default();let b=s::value(Type::Bool);let f=s::value(Type::F64);
    let yes=s::term(b,s::Node::Bool(true));
    let from=apply(s::lambda(f.clone(),yes.clone()),s::term(f,s::Node::Word(0)));
    let error=checker(&p).prove(&p,&BTreeMap::new(),&[],&Equation{from,to:yes},&Proof::Normalize,&mut s::Budget::new(),0).unwrap_err();
    assert!(error.contains("binary64 source proof domain"),"{error}");
}
