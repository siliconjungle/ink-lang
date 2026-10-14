use ink_core::{core::{Program,Type},laws::{Catalogue,CheckedCatalogue,Equation,Proof},semantic::{self as s,Node}};
use std::collections::BTreeMap;
fn checker(p:&Program)->CheckedCatalogue{
 CheckedCatalogue::check(&Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap()
}
fn boolean()->s::Sort{s::value(Type::Bool)}
fn word()->s::Sort{s::value(Type::U32)}
#[test]
fn checked_filter_facts_transport_through_eta_wrapped_callbacks(){
 let p=Program::default();let c=checker(&p);let list=s::value(Type::List(Box::new(Type::U32)));
 let predicate=s::free(s::arrow(word(),boolean()),"predicate");
 let wrapped=s::lambda(word(),s::op(boolean(),"apply",vec![predicate.clone(),s::term(word(),Node::Bound(0))]));
 let xs=s::free(list.clone(),"xs");let ys=s::free(list.clone(),"ys");
 let env=BTreeMap::from([("predicate".into(),predicate.sort.clone()),("xs".into(),list.clone()),("ys".into(),list.clone())]);
 let filter=|callback|s::op(list.clone(),"method:filter",vec![xs.clone(),callback]);
 let facts=vec![Equation{from:filter(wrapped),to:ys.clone()}];
 c.prove(&p,&env,&facts,&Equation{from:filter(predicate.clone()),to:ys.clone()},&Proof::Normalize,&mut s::Budget::new(),0).unwrap();
 let other=s::lambda(word(),s::term(boolean(),Node::Bool(false)));
 assert!(c.prove(&p,&env,&facts,&Equation{from:filter(other),to:ys},&Proof::Normalize,&mut s::Budget::new(),0).is_err(),"an unrelated callback did not establish this fact");
}
#[test]
fn nested_eta_preserves_outer_captures_and_curried_arguments(){
 let p=Program::default();let c=checker(&p);
 let function=s::free(s::arrow(word(),s::arrow(word(),word())),"function");
 let outer=s::term(word(),Node::Bound(1));let inner=s::term(word(),Node::Bound(0));
 let partial=s::op(s::arrow(word(),word()),"apply",vec![function.clone(),outer]);
 let wrapped=s::lambda(word(),s::lambda(word(),s::op(word(),"apply",vec![partial,inner])));
 c.prove(&p,&BTreeMap::from([("function".into(),function.sort.clone())]),&[],&Equation{from:wrapped,to:function},&Proof::Normalize,&mut s::Budget::new(),0).unwrap();
}
#[test]
fn callback_capture_or_changed_argument_cannot_grant_eta_equality(){
 let p=Program::default();let c=checker(&p);
 let dependent=s::free(s::arrow(word(),s::arrow(word(),word())),"dependent");
 let input=s::term(word(),Node::Bound(0));
 let partial=s::op(s::arrow(word(),word()),"apply",vec![dependent.clone(),input.clone()]);
 let captured=s::lambda(word(),s::op(word(),"apply",vec![partial,input]));
 let fixed=s::op(s::arrow(word(),word()),"apply",vec![dependent.clone(),s::word(Type::U32,0)]);
 let env=BTreeMap::from([("dependent".into(),dependent.sort.clone())]);
 assert!(c.prove(&p,&env,&[],&Equation{from:captured,to:fixed},&Proof::Normalize,&mut s::Budget::new(),0).is_err());
 let f=s::free(s::arrow(word(),word()),"f");
 let advanced=s::op(word(),"binary:+",vec![s::term(word(),Node::Bound(0)),s::word(Type::U32,1)]);
 let changed=s::lambda(word(),s::op(word(),"apply",vec![f.clone(),advanced]));
 assert!(c.prove(&p,&BTreeMap::from([("f".into(),f.sort.clone())]),&[],&Equation{from:changed,to:f},&Proof::Normalize,&mut s::Budget::new(),0).is_err());
}
