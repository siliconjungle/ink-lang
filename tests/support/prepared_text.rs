use serde_json::{json,Value};
use std::sync::OnceLock;
use verified_language::{core::CheckedModule,eval,modules,stateful::Runtime};
fn module()->&'static CheckedModule {
 static M:OnceLock<CheckedModule>=OnceLock::new();
 M.get_or_init(||CheckedModule::from_source(modules::load("examples/prepared-text.ink").unwrap().program).unwrap())
}
fn fixture()->Value {serde_json::from_str(include_str!("../fixtures/prepared-text/oracle.json")).unwrap()}
fn evaluate(name:&str,args:&Value)->eval::Value {
 let p=module().program();let f=p.functions.iter().find(|f|f.name==name).unwrap();
 let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,p).unwrap()).collect();
 eval::call(p,name,values,&mut 100_000_000).unwrap_or_else(|e|panic!("{name}: {e}"))
}
fn expected(name:&str,value:&Value)->eval::Value {
 let p=module().program();let f=p.functions.iter().find(|f|f.name==name).unwrap();
 eval::Value::from_program_json(value,&f.result,p).unwrap()
}
fn args(case:&Value,name:&str)->Value {
 if name=="layout" {json!([case["data"],case["epsilon"],case["width"],19.25])}
 else {json!([case["data"],case["epsilon"],case["width"]])}
}
#[test]
fn prepared_binary64_walkers_match_upstream_complete_geometry(){
 let data=fixture();assert_eq!(data["revision"],"0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8");
 assert_eq!(data["cases"].as_array().unwrap().len(),232);
 for case in data["cases"].as_array().unwrap(){
  for name in ["count_lines","lines","stats","layout"] {
   assert_eq!(evaluate(name,&args(case,name)),expected(name,&case[name]),"{} / {name}",case["name"]);
  }
 }
}
#[test]
fn prepared_text_rejects_forged_shapes_kinds_budgets_and_cursors(){
 let data=fixture();let case=data["cases"].as_array().unwrap().iter().find(|c|c["name"]=="reshaped-graphemes").unwrap();
 for (field,bad) in [
  ("flags",json!([])),("flags",json!([3])),("flags",json!([32])),("flags",json!([256])),
  ("advances",json!([])),("advances",json!([{"Some":[]}])),
  ("startExtras",json!({"Some":[]})),("graphemeStartExtras",json!({"Some":[{"Some":[1.]}]})),
  ("widths",json!([{"F64Bits":"9218868437227405312"}])),
 ]{
  let mut d=case["data"].clone();d[field]=bad;
  assert!(evaluate("count_lines",&json!([d,case["epsilon"],8.])).json().get("Err").is_some(),"{field}");
 }
 for maximum in [0,1,4,1000001] {assert!(evaluate("prepare",&json!([case["data"],case["epsilon"],maximum])).json().get("Err").is_some());}
 for epsilon in [json!(-1.),json!({"F64Bits":"9221120237041090560"})] {
  assert!(evaluate("prepare",&json!([case["data"],epsilon,100])).json().get("Err").is_some());
 }
 let mut p=evaluate("prepare",&json!([case["data"],case["epsilon"],100])).json()["Ok"].clone();
 p["budget"]=json!(0);assert!(evaluate("count_prepared",&json!([p,8.])).json().get("Err").is_some());
 for cursor in [json!({"segment":2,"grapheme":0}),json!({"segment":1,"grapheme":1}),json!({"segment":0,"grapheme":4})] {
  assert!(evaluate("line",&json!([case["data"],case["epsilon"],cursor,8.])).json().get("Err").is_some());
 }
}
#[test]
fn prepared_text_reuses_state_across_resizes_edits_rollback_and_restore(){
 let data=fixture();let m=module();let mut runtime=Runtime::from_checked(m).unwrap();let mut steps=vec![];let mut values=vec![];
 let cases=data["cases"].as_array().unwrap();
 // Different observation shapes and all exceptional paragraph widths, then edits.
 for (i,case) in cases.iter().enumerate().filter(|(i,_)|*i<40 || *i%17==0) {
  for name in ["count_lines","lines","stats"] {
   let args=args(case,name);let result=evaluate(name,&args);
   assert_eq!(result,expected(name,&case[name]),"{}",case["name"]);
   steps.push(json!({"pure":name,"args":args}));values.push(json!({"reply":{"value":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
  if i==2 {
   // Resume the zero-width word one grapheme at a time, including exhaustion.
   let lines=case["lines"]["Ok"].as_array().unwrap();assert_eq!(lines.len(),3);
   let mut cursor=json!({"segment":0,"grapheme":0});
   for line in lines.iter().map(Some).chain(std::iter::once(None)) {
    let args=json!([case["data"],case["epsilon"],cursor,case["width"]]);
    let result=evaluate("line",&args);
    let want=match line {Some(line)=>json!({"Ok":{"Some":line}}),None=>json!({"Ok":{"None":null}})};
    assert_eq!(result,expected("line",&want));
    steps.push(json!({"pure":"line","args":args}));values.push(json!({"reply":{"value":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    if let Some(line)=line {cursor=line["end"].clone();}
   }
  }
  if i%9==0 {
   for (name,args) in [("install",json!([case["data"],case["epsilon"]])),("resize",json!([case["width"]])),("current",json!([19.25]))] {
    let reply=runtime.invoke_json(name,&args).unwrap();steps.push(json!({"call":name,"args":args}));
    values.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
   }
   let saved=runtime.checkpoint_portable().unwrap();steps.push(json!({"restore":saved}));runtime=Runtime::restore_portable_checked(m,&saved).unwrap();
   let mut invalid=case["data"].clone();invalid["flags"]=json!([9]);
   let args=json!([invalid,case["epsilon"]]);let before=runtime.checkpoint_portable().unwrap();let result=runtime.invoke_json("install",&args).unwrap();
   assert_eq!(runtime.checkpoint_portable().unwrap(),before);assert!(result.json()["events"].as_array().unwrap().is_empty());
   steps.push(json!({"call":"install","args":args}));values.push(json!({"reply":{"outcome":result.json()},"snapshot":before}));
  }
 }
 steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));values.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":runtime.checkpoint_portable().unwrap()}));
 super::parity::conformance_checked("prepared-text",m,include_str!("../../examples/prepared-text.ink"),steps,values);
}
