use ink_core::{core::CheckedModule, semantic::{self, Budget, Node, Sort}, syntax::{self,Type}};
use std::collections::BTreeMap;

#[test]
fn enum_literals_have_exact_source_bound_semantics_and_roundtrip() {
    let p=syntax::parse("module Enums; enum Code{A,B,} enum Other{A,} fn error()->Result<u32,Code>{return Err(Code.B);} fn nested()->Option<Code>{return Some(Code.A);}").unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    for f in &p.functions {
        let term=semantic::elaborate(&f.body,&BTreeMap::new(),&p,&f.result).unwrap();
        semantic::validate(&term,&BTreeMap::new(),&p,&mut Budget::new()).unwrap();
        let expr=semantic::reify(&term,&p).unwrap();
        assert_eq!(semantic::elaborate(&expr,&BTreeMap::new(),&p,&f.result).unwrap(),term);
    }
    let literal=semantic::op(Sort::Value(Type::Named("Code".into())),"enum",vec![
        semantic::term(Sort::Value(Type::String),Node::String("Code".into())),
        semantic::term(Sort::Value(Type::String),Node::String("A".into()))]);
    semantic::validate(&literal,&BTreeMap::new(),&p,&mut Budget::new()).unwrap();
    let mut forged=literal.clone();forged.sort=Sort::Value(Type::Named("Other".into()));
    assert!(semantic::validate(&forged,&BTreeMap::new(),&p,&mut Budget::new()).is_err());
    let mut forged=literal.clone();if let Node::Op(_,args)=&mut forged.node {args[1].node=Node::String("Missing".into());}
    assert!(semantic::validate(&forged,&BTreeMap::new(),&p,&mut Budget::new()).is_err());
    let mut forged=literal.clone();if let Node::Op(_,args)=&mut forged.node {args[1].node=Node::Free("variant".into());}
    assert!(semantic::validate(&forged,&BTreeMap::from([("variant".into(),Sort::Value(Type::String))]),&p,&mut Budget::new()).is_err());
    let shadowed=syntax::parse("module Shadows; enum Code{A,B,} fn f(Code:Code)->Code{return Code;}").unwrap();
    assert!(semantic::reify(&literal,&shadowed).is_err());
}
