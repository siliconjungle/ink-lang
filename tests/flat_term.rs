use ink_core::{core::{CheckedModule,Type},definition_context::{Definition,DefinitionContext},flat_term::{FlatNode,FlatTerm,FlatTree},registry,semantic::{self as s,Node,Term},syntax};
use serde_json::json;
fn word()->Term{s::word(Type::U32,1)}
#[test]
fn flat_transport_roundtrips_all_node_shapes_and_preserves_legacy_definition_bytes(){
 let terms=[s::free(s::value(Type::U32),"x"),s::term(s::value(Type::U32),Node::Bound(0)),word(),s::term(s::value(Type::F32),Node::Float(0x80000000)),s::term(s::value(Type::Bool),Node::Bool(true)),s::term(s::value(Type::String),Node::String("é".into())),s::term(s::value(Type::Unit),Node::Unit),s::term(s::Sort::Nat,Node::Nat(7)),s::lambda(s::value(Type::U32),word()),s::op(s::value(Type::U32),"binary:+",vec![word(),word()]),s::term(s::value(Type::List(Box::new(Type::U32))),Node::Nil),s::term(s::value(Type::List(Box::new(Type::U32))),Node::Cons(Box::new(word()),Box::new(s::term(s::value(Type::List(Box::new(Type::U32))),Node::Nil))))];
 for term in terms{let flat=FlatTree::encode(&term).unwrap();assert_eq!(flat.decode().unwrap(),term);}
 let legacy=json!({"params":[],"result":"U32","body":word(),"callees":{}});let definition:Definition=serde_json::from_value(legacy.clone()).unwrap();assert!(!definition.compact_body);assert_eq!(serde_json::to_value(&definition).unwrap(),legacy);assert_eq!(registry::identity(&definition).unwrap(),registry::identity(&legacy).unwrap());
}
#[test]
fn topology_schema_and_expansion_bounds_reject_malformed_flat_terms(){
 let leaf=FlatTerm{sort:s::value(Type::U32),node:FlatNode::Word(1)};
 let mut flat=FlatTree{schema:1,root:1,nodes:vec![leaf.clone(),FlatTerm{sort:s::value(Type::U32),node:FlatNode::Op("binary:+".into(),vec![0,0])}]};assert!(flat.decode().unwrap_err().contains("reused"));
 flat.nodes[1].node=FlatNode::Lambda(1);assert!(flat.decode().unwrap_err().contains("cycle"));flat.nodes[1].node=FlatNode::Lambda(9);assert!(flat.decode().is_err());
 flat.nodes[1]=leaf.clone();assert!(flat.decode().unwrap_err().contains("unreachable"));flat.root=0;assert!(flat.decode().is_err());flat.schema=2;assert!(flat.decode().is_err());
 let mut nodes=vec![leaf];for i in 1..=129{nodes.push(FlatTerm{sort:s::value(Type::U32),node:FlatNode::Lambda(i-1)});}assert!(FlatTree{schema:1,root:129,nodes}.decode().unwrap_err().contains("depth"));
}
#[test]
fn deep_context_is_shallow_transport_but_still_binds_exact_source(){
 let mut source="module deep;fn helper(x:u32)->u32{".to_string();for i in 0..24{source.push_str(&format!("let v{i}=x+{i};"));}source.push_str("return x+1;}");
 let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();let context=DefinitionContext::capture(&module,&["helper".into()]).unwrap();assert!(context.definitions["helper"].definition.compact_body);let bytes=registry::canonical(&context).unwrap();let decoded:DefinitionContext=serde_json::from_slice(&bytes).unwrap();decoded.check().unwrap();decoded.matches(module.program()).unwrap();
 let changed=CheckedModule::from_source(syntax::parse(&source.replace("return x+1;","return x+2;")).unwrap()).unwrap();assert!(decoded.matches(changed.program()).is_err());
 let mut forged=decoded.clone();forged.definitions.get_mut("helper").unwrap().definition.body=word();let d=forged.definitions.get_mut("helper").unwrap();d.sha256=registry::identity(&d.definition).unwrap();assert!(forged.matches(module.program()).is_err());
}
#[test]
fn iterative_validation_keeps_binders_sorts_and_depth_limits(){
 let p=Default::default();let env=Default::default();let mut term=word();
 for _ in 0..80{term=s::op(s::value(Type::U32),"binary:+",vec![term,word()]);}
 s::validate(&term,&env,&p,&mut s::Budget::new()).unwrap();
 for _ in 0..49{term=s::op(s::value(Type::U32),"binary:+",vec![term,word()]);}
 assert!(s::validate(&term,&env,&p,&mut s::Budget::new()).unwrap_err().contains("depth"));
 let good=s::lambda(s::value(Type::U32),s::term(s::value(Type::U32),Node::Bound(0)));s::validate(&good,&env,&p,&mut s::Budget::new()).unwrap();
 let bad=s::lambda(s::value(Type::U32),s::term(s::value(Type::U32),Node::Bound(1)));assert!(s::validate(&bad,&env,&p,&mut s::Budget::new()).is_err());
 let wrong=s::lambda(s::value(Type::U64),s::term(s::value(Type::U32),Node::Bound(0)));assert!(s::validate(&wrong,&env,&p,&mut s::Budget::new()).is_err());
}
