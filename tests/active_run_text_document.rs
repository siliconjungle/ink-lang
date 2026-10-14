use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[path="support/document_calls.rs"]mod document_calls;
#[test]
fn recovery_keeps_existing_batch_endpoint_behaviour(){document_calls::check("examples/crdts/active_run_text_document_observers.ink","active-run-existing-calls-parity");}
#[test]
fn interior_batch_frontiers_restore_merge_and_deduplicate_against_native_expectations(){
 let path="examples/crdts/active_run_text_document_observers.ink";let program=modules::load(path).unwrap().program;let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 let mut call=|name:&str,args:Value|{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let result=eval::call(&program,name,values,&mut 50_000_000).unwrap_or_else(|e|panic!("{name}: {e}")).json();steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":snapshot}));result
 };
 // These expected outputs were independently checked against the pinned native
 // Diamond Types implementation; the source corpus and oracle receipt are kept.
 let cases:Vec<Value>=serde_json::from_str(include_str!("../bench/crdts/interior-frontier-expected-cases.json")).unwrap();
 for case in cases{
  let changes=case["changes"].as_array().unwrap();let mut splits=vec![0,1,changes.len()/2,changes.len()];splits.sort();splits.dedup();
  for split in splits{
   let empty=call("empty",json!([]));let prefix=call("merged",json!([empty,&changes[..split]]))["Ok"].clone();assert!(!prefix.is_null());
   let words=call("saved",json!([prefix]))["Ok"].clone();let restored=call("loaded",json!([words]))["Ok"].clone();assert!(!restored.is_null());
   let document=call("merged",json!([restored,&changes[split..]]))["Ok"].clone();assert!(!document.is_null(),"{} split {split}",case["name"]);assert_eq!(document["scalar"],true);
   assert_eq!(call("visible",json!([document]))["Ok"],case["expected"]);assert_eq!(call("history",json!([document])),case["changes"]);
   assert_eq!(call("merged",json!([document,changes]))["Ok"],document);
   let words=call("saved",json!([document]))["Ok"].clone();let restored=call("loaded",json!([words]))["Ok"].clone();assert!(!restored.is_null());assert_eq!(call("visible",json!([restored]))["Ok"],case["expected"]);
   let mut conflict=changes[0].clone();conflict["text"]=json!([99]);assert!(call("merged",json!([document,[conflict]])).get("Err").is_some());
   assert_eq!(call("visible",json!([document]))["Ok"],case["expected"]);
  }
 }
 parity::conformance("active-run-interior-frontiers-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
