use std::collections::BTreeMap;
use ink_core::{core::Type,laws::{self,Assumption,Catalogue,CheckedCatalogue,Equation,Law,Proof},semantic::{self as s,Env,Node,Sort,Term},syntax::Program};
fn v(ty:Type)->Sort{Sort::Value(ty)}
fn free(sort:Sort,name:&str)->Term{s::term(sort,Node::Free(name.into()))}
fn op(sort:Sort,name:&str,args:Vec<Term>)->Term{s::term(sort,Node::Op(name.into(),args))}
fn plus(ty:&Type,a:Term,b:Term)->Term{op(v(ty.clone()),"binary:+",vec![a,b])}
fn apply(f:Term,x:Term)->Term{let Sort::Arrow(_,out)=&f.sort else{panic!()};op((**out).clone(),"apply",vec![f,x])}
fn guard(ty:&Type,n:Term)->Equation{Equation{from:op(v(Type::Bool),"binary:<",vec![n,s::word(ty.clone(),if *ty==Type::U32{u32::MAX as u64}else{u64::MAX})]),to:s::term(v(Type::Bool),Node::Bool(true))}}
fn law(ty:Type,generalized:bool)->Law{
 let word=v(ty.clone());let sort=if generalized{Sort::Arrow(Box::new(word.clone()),Box::new(Sort::Arrow(Box::new(word.clone()),Box::new(word.clone()))))}else{Sort::Arrow(Box::new(word.clone()),Box::new(word.clone()))};
 let f=free(sort.clone(),"f");let n=free(word.clone(),"n");let previous=free(word.clone(),"previous");let item=free(word.clone(),"item");let x=free(word.clone(),"x");let value=free(word.clone(),"value");
 let one=s::word(ty.clone(),1);let zero=s::word(ty.clone(),0);
 let app=|n:Term,x:Term|if generalized{apply(apply(f.clone(),n),x)}else{apply(f.clone(),n)};
 let mut params=Env::from([("f".into(),sort),("n".into(),word.clone())]);
 let mut assumption_params=Env::from([("item".into(),word.clone())]);
 if generalized{params.insert("x".into(),word.clone());assumption_params.insert("value".into(),word.clone());}
 let after=if generalized{plus(&ty,value.clone(),one.clone())}else{zero.clone()};
 let middle=app(previous.clone(),if generalized{plus(&ty,x.clone(),one.clone())}else{zero.clone()});
 let left=Proof::Assume{index:0,arguments:if generalized{BTreeMap::from([("item".into(),previous.clone()),("value".into(),x.clone())])}else{BTreeMap::from([("item".into(),previous.clone())])},premises:vec![Proof::Hypothesis(if generalized{0}else{1})]};
 let right=if generalized{
  let ih=app(zero.clone(),plus(&ty,plus(&ty,x.clone(),one.clone()),previous.clone()));
  Proof::Trans{middle:ih,left:Box::new(Proof::GeneralizedHypothesis{index:0,arguments:BTreeMap::from([("x".into(),plus(&ty,x.clone(),one.clone()))])}),right:Box::new(Proof::Normalize)}
 }else{Proof::Hypothesis(0)};
 let step=Box::new(Proof::Trans{middle,left:Box::new(left),right:Box::new(right)});
 let proof=if generalized{Proof::GeneralizedInduction{variable:"n".into(),generalize:vec!["x".into()],names:vec!["previous".into()],base:Box::new(Proof::Normalize),step}}else{Proof::Induction{variable:"n".into(),names:vec!["previous".into()],base:Box::new(Proof::Normalize),step}};
 Law{schema:1,semantics:laws::GENERAL_SEMANTICS.into(),params,conditions:vec![],from:app(n.clone(),x.clone()),to:app(zero.clone(),if generalized{plus(&ty,x,n)}else{zero}),proof,dependencies:vec![],definition_context:None,types:vec![],assumptions:vec![Assumption{name:"adjacent".into(),params:assumption_params,conditions:vec![guard(&ty,item.clone())],from:app(plus(&ty,item.clone(),one),value),to:app(item,after)}]}
}
fn check(mut law:Law)->Result<CheckedCatalogue,String>{law.semantics=laws::required_semantics(&law).into();let id=ink_core::registry::identity(&ink_core::registry::Entry::from_law(&law)?)?;CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&Program::default())}
#[test]
fn guarded_unsigned_induction_and_generalized_state_replay(){for ty in [Type::U32,Type::U64]{check(law(ty.clone(),false)).unwrap();check(law(ty,true)).unwrap();}}
#[test]
fn word_induction_rejects_zero_branch_ih_and_forged_conclusions(){
 for ty in [Type::U32,Type::U64]{let mut a=law(ty.clone(),false);if let Proof::Induction{base,..}=&mut a.proof{*base=Box::new(Proof::Hypothesis(0));}assert!(check(a).is_err());
 let mut a=law(ty.clone(),false);a.to=plus(&ty,a.to.clone(),s::word(ty.clone(),1));assert!(check(a).is_err());}
}
#[test]
fn generalized_ih_cannot_choose_its_recursive_count(){
 let mut a=law(Type::U32,true);if let Proof::GeneralizedInduction{step,..}=&mut a.proof{if let Proof::Trans{right,..}=step.as_mut(){if let Proof::Trans{left,..}=right.as_mut(){if let Proof::GeneralizedHypothesis{arguments,..}=left.as_mut(){arguments.insert("n".into(),s::word(Type::U32,0));}}}}
 assert!(check(a).unwrap_err().contains("arity"));
}
#[test]
fn premises_on_quantified_words_signed_words_and_bad_binders_reject(){
 let mut a=law(Type::U32,false);a.conditions.push(Equation{from:free(v(Type::U32),"n"),to:s::word(Type::U32,0)});assert!(check(a).unwrap_err().contains("independent"));
 let mut a=law(Type::U32,false);if let Proof::Induction{names,..}=&mut a.proof{*names=vec!["f".into()];}assert!(check(a).unwrap_err().contains("fresh"));
 let mut a=law(Type::U32,false);if let Proof::Induction{names,..}=&mut a.proof{names.push("other".into());}assert!(check(a).unwrap_err().contains("matching binders"));
 let mut a=law(Type::I32,false);a.assumptions.clear();if let Proof::Induction{step,..}=&mut a.proof{*step=Box::new(Proof::Normalize);}assert!(check(a).unwrap_err().contains("unsigned word sort"));
}
#[test]
fn successor_guard_is_exact_and_never_an_unconditional_word_premise(){
 let mut a=law(Type::U32,false);if let Node::Op(name,_)=&mut a.assumptions[0].conditions[0].from.node{*name="binary:==".into();}
 assert!(check(a).is_err());
 let mut a=law(Type::U64,false);a.conditions.push(guard(&Type::U64,free(v(Type::U64),"n")));assert!(check(a).unwrap_err().contains("independent"));
}
