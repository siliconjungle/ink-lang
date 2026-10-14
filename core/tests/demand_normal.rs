use ink_core::{core::{CheckedModule,Type},definition_context::DefinitionContext,laws::{Catalogue,CheckedCatalogue,Law,Proof,SEMANTICS},registry,semantic::{self as s},syntax};
use std::collections::BTreeMap;
#[test]
fn observing_a_field_does_not_unfold_unobserved_work_or_drop_required_values(){
 let module=CheckedModule::from_source(syntax::parse("module observations;record Pair{slow:u32,fast:u32,}fn make(x:u32)->Pair{return Pair{slow:repeat(65536,x,fn(i,value)=>value+1),fast:x};}").unwrap()).unwrap();let scalar=s::value(Type::U32);let x=s::free(scalar.clone(),"x");let call=s::op(s::value(Type::Named("Pair".into())),"call:make",vec![x.clone()]);
 let theorem=Law{schema:1,semantics:SEMANTICS.into(),params:BTreeMap::from([("x".into(),scalar.clone())]),conditions:vec![],from:s::op(scalar.clone(),"field:fast",vec![call]),to:x.clone(),proof:Proof::Normalize,dependencies:vec![],definition_context:Some(DefinitionContext::capture(&module,&["make".into()]).unwrap()),types:vec![],assumptions:vec![]};
 let check=|law:Law|{let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();CheckedCatalogue::check(&Catalogue{schema:1,semantics:SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&Default::default())};
 let checked=check(theorem.clone());assert!(checked.is_ok(),"{}",checked.err().unwrap_or_default());let mut false_law=theorem;false_law.to=s::op(scalar,"binary:+",vec![x,s::word(Type::U32,1)]);assert!(check(false_law).is_err());
}
