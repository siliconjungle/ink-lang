use serde_json::json;
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=include_str!("fixtures/loop_carriers.ink");
#[test]
fn precise_loop_carriers_preserve_values_events_errors_and_original_snapshots(){
 let program=syntax::parse(SOURCE).unwrap();CheckedModule::from_source(program.clone()).unwrap();let mut runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (name,want)in [("moved_before_for",json!([6])),("two_owner_phases",json!([3,4,5,6])),("moved_before_while",json!([7,3])),("shadowed_mutable",json!([8,7])),("shadowed_loop_item",json!([9,9])),("condition_only_capture",json!([4,4,10])),("nested_loops",json!([10,21])),("shadowed_callback",json!([11,3])),("readonly_owner",json!([3,7,10]))]{
  assert_eq!(eval::call(&program,name,vec![],&mut 100000).unwrap().json(),want,"{name}");
  steps.push(json!({"pure":name,"args":[]}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for (mode,reject)in [(0,false),(1,true),(2,false),(0,true)]{
  let args=json!([mode,reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();assert_eq!(out.committed,!reject);
  if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}
  steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("loop-carriers-parity",program,SOURCE,steps,expected);
}
#[test]
fn moved_owners_still_cannot_be_read_by_a_loop_body_or_condition(){
 for body in [
  "var b:Buffer<u32>=buffer([1]);let xs=b.freeze();var n:u32=0;for x in xs{n=n+b.len();}return n;",
  "var b:Buffer<u32>=buffer([1]);let xs=b.freeze();var n:u32=0;while b.len()>0 limit 8{n=n+1;}return n;",
 ]{
  let source=format!("module invalid;fn bad()->u32{{{body}}}");assert!(syntax::parse(&source).and_then(CheckedModule::from_source).is_err(),"accepted {body}");
 }
}
#[test]
fn loop_limit_counts_referenced_carriers_and_retains_assignment_only_targets(){
 let locals=(0..18).map(|i|format!("var unused{i}:u32={i};")).collect::<String>();
 for loop_body in ["for item in [1,2]{result=9;}","while result<2 limit 8{result=result+1;}"]{
  let source=format!("module carriers;fn main()->u32{{{locals}var result:u32=0;{loop_body}return result;}}");let program=syntax::parse(&source).unwrap();CheckedModule::from_source(program.clone()).unwrap();
  let want=if loop_body.starts_with("for"){9}else{2};assert_eq!(eval::call(&program,"main",vec![],&mut 100000).unwrap().json(),json!(want));
  for (name,fields)in &program.records{if name.starts_with("__ink_loop_"){assert_eq!(fields.len(),1);assert_eq!(fields[0].0,"result");}}
 }
 let locals=(0..17).map(|i|format!("var v{i}:u32=0;")).collect::<String>();let updates=(0..17).map(|i|format!("v{i}=v{i}+1;")).collect::<String>();
 let source=format!("module too_many;fn main()->u32{{{locals}for item in [1]{{{updates}}}return v0;}}");assert!(syntax::parse(&source).unwrap_err().contains("16 mutable locals"));
}
