use std::collections::BTreeMap;
use ink_core::{core::Type,laws::{self,Assumption,Catalogue,CheckedCatalogue,Law,Proof},semantic::{self as s,Node,Sort,Term},syntax::Program};
fn free(sort:Sort,n:&str)->Term{s::free(sort,n)}
fn op(sort:Sort,n:&str,a:Vec<Term>)->Term{s::op(sort,n,a)}
fn apply(f:Term,x:Term)->Term{let Sort::Arrow(_,out)=&f.sort else{panic!()};op((**out).clone(),"apply",vec![f,x])}
fn frame()->Law{
 let word=s::value(Type::U32);let state_sort=s::value(Type::Named("State".into()));let view=s::value(Type::Named("View".into()));let boolean=s::value(Type::Bool);
 let count=free(word.clone(),"count");let index=free(word.clone(),"index");let previous=free(word.clone(),"previous");let state=free(state_sort.clone(),"state");
 let stop=free(s::arrow(state_sort.clone(),boolean.clone()),"stop");let step=free(s::arrow(word.clone(),s::arrow(state_sort.clone(),state_sort.clone())),"step");let observe=free(s::arrow(state_sort.clone(),view.clone()),"observe");
 let run=|count:Term,index:Term,state:Term|op(state_sort.clone(),"until.from",vec![count,index,state,stop.clone(),step.clone()]);
 let obs=|state:Term|apply(observe.clone(),state);
 let one=s::word(Type::U32,1);let successor=op(word.clone(),"binary:+",vec![previous.clone(),one.clone()]);let advanced=op(word.clone(),"binary:+",vec![index.clone(),one.clone()]);let next=apply(apply(step.clone(),index.clone()),state.clone());
 let zero=op(boolean.clone(),"binary:==",vec![successor.clone(),s::word(Type::U32,0)]);let stopped=apply(stop.clone(),state.clone());
 let unfolded=op(state_sort.clone(),"call:choose",vec![zero.clone(),state.clone(),op(state_sort.clone(),"call:choose",vec![stopped.clone(),state.clone(),run(op(word.clone(),"binary:-",vec![successor.clone(),one]),advanced.clone(),next.clone())])]);
 let recurse=Proof::Trans{middle:obs(run(previous,advanced.clone(),next.clone())),left:Box::new(Proof::Normalize),right:Box::new(Proof::Trans{middle:obs(next.clone()),left:Box::new(Proof::GeneralizedHypothesis{index:0,arguments:BTreeMap::from([("index".into(),advanced),("state".into(),next)])}),right:Box::new(Proof::Assume{index:0,arguments:BTreeMap::from([("item".into(),index.clone()),("current".into(),state.clone())]),premises:vec![]})})};
 let case=Proof::Cases{condition:zero,on_true:Box::new(Proof::Normalize),on_false:Box::new(Proof::Cases{condition:stopped,on_true:Box::new(Proof::Normalize),on_false:Box::new(recurse)})};
 let item=free(word.clone(),"item");let current=free(state_sort.clone(),"current");
 Law{schema:1,semantics:laws::GENERAL_SEMANTICS.into(),params:BTreeMap::from([("count".into(),word.clone()),("index".into(),word.clone()),("state".into(),state_sort.clone()),("stop".into(),stop.sort.clone()),("step".into(),step.sort.clone()),("observe".into(),observe.sort.clone())]),conditions:vec![],from:obs(run(count,index,state.clone())),to:obs(state),proof:Proof::GeneralizedInduction{variable:"count".into(),generalize:vec!["index".into(),"state".into()],names:vec!["previous".into()],base:Box::new(Proof::Normalize),step:Box::new(Proof::Trans{middle:obs(unfolded),left:Box::new(Proof::Congruence(vec![Proof::Normalize,Proof::Unfold])),right:Box::new(case)})},dependencies:vec![],definition_context:None,types:vec!["State".into(),"View".into()],assumptions:vec![Assumption{name:"preserved".into(),params:BTreeMap::from([("item".into(),word),("current".into(),state_sort)]),conditions:vec![],from:obs(apply(apply(step,item),current.clone())),to:obs(current)}]}
}
fn check(law:Law)->Result<(),String>{let id=ink_core::registry::identity(&ink_core::registry::Entry::from_law(&law)?)?;CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&Program::default())?;Ok(())}
#[test]
fn word_counted_stopping_loop_preserves_arbitrary_observer(){
 let law=frame();check(law.clone()).unwrap();
 if let Ok(path)=std::env::var("INK_PROTOTYPE_LAW_OUT"){
  let entry=ink_core::registry::Entry::from_law(&law).unwrap();
  std::fs::write(path,serde_json::to_vec_pretty(&entry).unwrap()).unwrap();
 }
}
#[test]
fn missing_preservation_and_wrong_observed_state_reject(){let mut law=frame();law.assumptions.clear();assert!(check(law).is_err());let mut law=frame();law.params.insert("other".into(),law.params["state"].clone());law.to=apply(free(law.params["observe"].clone(),"observe"),free(law.params["state"].clone(),"other"));assert!(check(law).is_err());}
#[test]
fn exact_unfolding_rejects_changed_count_index_and_unguarded_body(){
 for field in [0,1]{let mut law=frame();if let Proof::GeneralizedInduction{step,..}=&mut law.proof{if let Proof::Trans{middle,..}=step.as_mut(){if let Node::Op(_,a)=&mut middle.node{if let Node::Op(_,branches)=&mut a[1].node{if let Node::Op(_,nested)=&mut branches[2].node{if let Node::Op(_,args)=&mut nested[2].node{args[field]=s::word(Type::U32,0);}}}}}}assert!(check(law).is_err());}
 let mut law=frame();if let Proof::GeneralizedInduction{step,..}=&mut law.proof{if let Proof::Trans{middle,..}=step.as_mut(){*middle=law.to.clone();}}assert!(check(law).is_err());
}

#[test]
fn one_step_loop_meaning_agrees_with_existing_literal_normalization(){
 let word=s::value(Type::U32);let boolean=s::value(Type::Bool);
 let stop=s::term(s::arrow(word.clone(),boolean.clone()),Node::Lambda(Box::new(op(boolean.clone(),"binary:>=",vec![s::term(word.clone(),Node::Bound(0)),s::word(Type::U32,3)]))));
 let state_body=op(word.clone(),"binary:+",vec![s::term(word.clone(),Node::Bound(0)),s::term(word.clone(),Node::Bound(1))]);
 let step=s::term(s::arrow(word.clone(),s::arrow(word.clone(),word.clone())),Node::Lambda(Box::new(s::term(s::arrow(word.clone(),word.clone()),Node::Lambda(Box::new(state_body))))));
 for count in 0..=4 {for index in [0,1,u32::MAX as u64] {for initial in [0,3,u32::MAX as u64] {
  let count=s::word(Type::U32,count);let index=s::word(Type::U32,index);let initial=s::word(Type::U32,initial);
  let from=op(word.clone(),"until.from",vec![count.clone(),index.clone(),initial.clone(),stop.clone(),step.clone()]);
  let to=op(word.clone(),"call:choose",vec![op(boolean.clone(),"binary:==",vec![count.clone(),s::word(Type::U32,0)]),initial.clone(),op(word.clone(),"call:choose",vec![apply(stop.clone(),initial.clone()),initial.clone(),op(word.clone(),"until.from",vec![op(word.clone(),"binary:-",vec![count,s::word(Type::U32,1)]),op(word.clone(),"binary:+",vec![index.clone(),s::word(Type::U32,1)]),apply(apply(step.clone(),index),initial),stop.clone(),step.clone()])])]);
  let mut law=Law{schema:1,semantics:laws::GENERAL_SEMANTICS.into(),params:BTreeMap::new(),conditions:vec![],from,to,proof:Proof::Unfold,dependencies:vec![],definition_context:None,types:vec![],assumptions:vec![]};
  check(law.clone()).unwrap();law.proof=Proof::Normalize;law.semantics=laws::SEMANTICS.into();check(law).unwrap();
 }}}
}

#[test]
fn exact_record_projection_does_not_execute_the_selected_loop(){
 let word=s::value(Type::U32);let boolean=s::value(Type::Bool);
 let stop=s::term(s::arrow(word.clone(),boolean),Node::Lambda(Box::new(s::term(s::value(Type::Bool),Node::Bool(false)))));
 let step=s::term(s::arrow(word.clone(),s::arrow(word.clone(),word.clone())),Node::Lambda(Box::new(s::term(s::arrow(word.clone(),word.clone()),Node::Lambda(Box::new(op(word.clone(),"binary:+",vec![s::term(word.clone(),Node::Bound(0)),s::word(Type::U32,1)])))))));
 let loop_value=op(word.clone(),"call:repeat_until",vec![s::word(Type::U32,u32::MAX as u64),s::word(Type::U32,0),stop,step]);
 let mut program=Program::default();program.records.insert("Pair".into(),vec![("first".into(),Type::U32),("second".into(),Type::U32)]);
 let record=op(s::value(Type::Named("Pair".into())),"record:Pair",vec![s::word(Type::U32,7),loop_value.clone()]);
 let context=ink_core::definition_context::DefinitionContext{schema:1,ids:vec![],definitions:BTreeMap::new(),records:program.records.clone(),enums:BTreeMap::new(),recursive_groups:BTreeMap::new()};
 let law=Law{schema:1,semantics:laws::GENERAL_SEMANTICS.into(),params:BTreeMap::new(),conditions:vec![],from:op(word.clone(),"field:second",vec![record.clone()]),to:loop_value,proof:Proof::Unfold,dependencies:vec![],definition_context:Some(context),types:vec![],assumptions:vec![]};
 let check=|law:Law,p:&Program|{
  let id=ink_core::registry::identity(&ink_core::registry::Entry::from_law(&law).unwrap()).unwrap();
  CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},p)
 };
 check(law.clone(),&program).unwrap();
 let mut wrong=law.clone();wrong.from=op(word,"field:first",vec![record]);assert!(check(wrong,&program).is_err());
 program.records.get_mut("Pair").unwrap().swap(0,1);let mut wrong=law;
 wrong.definition_context.as_mut().unwrap().records=program.records.clone();assert!(check(wrong,&program).is_err());
}
