use serde_json::json;
use verified_language::{modules,stateful::Runtime};
#[path="support/parity.rs"] mod parity;
#[test]
fn causal_batches_retain_history_across_restore_and_reject_conflicts_atomically(){
 let path=std::env::var("INK_PERSISTENT_CAUSAL_SOURCE").unwrap_or_else(|_|"examples/crdts/persistent_causal_batches.ink".into());
 let program=modules::load(&path).unwrap().program;
 let a=4294967297u64;let b=8589934593u64;let c=12884901889u64;
 let change=|id:u64,parents:Vec<u64>,position:u32,remove:u32,text:Vec<u32>|json!({"id":id,"parents":parents,"position":position,"remove":remove,"text":text});
 let initial=change(a,vec![],0,0,vec![65,128578]);
 let branch=change(b,vec![a+1],1,0,vec![66]);
 let concurrent=change(c,vec![a+1],1,0,vec![233]);
 let deletion=change(c+1,vec![b,c],1,1,vec![]);
 let mut runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for request in [json!({"call":"merge","args":[[initial.clone(),branch.clone()]]}),json!({"call":"visible","args":[]}),json!({"call":"history","args":[]})]{
  let out=runtime.invoke_json(request["call"].as_str().unwrap(),&request["args"]).unwrap();if request["call"]=="merge"{assert!(out.committed);}
  if request["call"]=="visible"{assert_eq!(out.result.json(),json!({"Ok":[65,66,128578]}));}
  steps.push(request);expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 let snapshot=runtime.checkpoint_portable().unwrap();runtime=Runtime::restore_portable(program.clone(),&snapshot).unwrap();steps.push(json!({"restore":snapshot}));
 for request in [json!({"call":"merge","args":[[concurrent.clone(),deletion.clone()]]}),json!({"call":"visible","args":[]}),json!({"call":"merge","args":[[initial.clone(),concurrent.clone()]]}),json!({"call":"history","args":[]}),json!({"call":"merge","args":[[change(c+2,vec![c+1],0,0,vec![90]),change(a,vec![],0,0,vec![99])]]}),json!({"call":"visible","args":[]}),json!({"call":"history","args":[]})]{
  let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json(request["call"].as_str().unwrap(),&request["args"]).unwrap();
  let conflict=request["call"]=="merge" && request["args"][0][0]["id"]==json!(c+2);
  if request["call"]=="merge"{assert_eq!(out.committed,!conflict);}if conflict{assert_eq!(runtime.checkpoint_portable().unwrap(),before);}
  if request["call"]=="visible"{assert_eq!(out.result.json(),json!({"Ok":[65,233,128578]}));}
  if request["call"]=="history"{assert_eq!(out.result.json(),json!([initial,branch,concurrent,deletion]));}
  steps.push(request);expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("persistent-causal-crdt-parity",program,&std::fs::read_to_string(&path).unwrap(),steps,expected);
}

#[test]
fn linear_runs_restore_then_split_for_forks_and_rollback_failed_append(){
 let path=std::env::var("INK_PERSISTENT_CAUSAL_SOURCE").unwrap_or_else(|_|"examples/crdts/persistent_causal_batches.ink".into());
 let program=modules::load(&path).unwrap().program;
 let a=1u64<<32;let b=2u64<<32;let c=3u64<<32;let d=4u64<<32;
 let change=|id,parents:Vec<u64>,position,remove,text:Vec<u32>|json!({"id":id,"parents":parents,"position":position,"remove":remove,"text":text});
 let prefix:Vec<_>=(0..64).map(|i|change(a+i+1,if i==0{vec![]}else{vec![a+i]},i as u32,0,vec![97])).collect();
 let mut calls:Vec<serde_json::Value>=prefix.chunks(16).map(|chunk|json!({"call":"merge","args":[chunk]})).collect();
 calls.extend([
  json!({"restore_prefix":true}),
  json!({"call":"merge","args":[[change(a+65,vec![a+64],64,0,vec![113]),change(a+1,vec![],0,0,vec![98])]],"rejected":true}),
  json!({"call":"visible","args":[]}),
  json!({"call":"merge","args":[[change(b+1,vec![a+32],32,0,vec![88])]]}),
  json!({"call":"merge","args":[[change(a+65,vec![a+64],64,0,vec![89])]]}),
  json!({"call":"merge","args":[[change(c+1,vec![a+65,b+1],25,20,vec![90])]]}),
  json!({"call":"merge","args":[[change(d+1,vec![a+16],16,0,vec![87])]]}),
  json!({"call":"visible","args":[]}),json!({"call":"history","args":[]}),
 ]);
 let mut runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for mut request in calls{
  if request["restore_prefix"]==true{let bytes=runtime.checkpoint_portable().unwrap();runtime=Runtime::restore_portable(program.clone(),&bytes).unwrap();steps.push(json!({"restore":bytes}));continue;}
  let before=runtime.checkpoint_portable().unwrap();let result=runtime.invoke_json(request["call"].as_str().unwrap(),&request["args"]).unwrap();
  if request["call"]=="merge"{assert_eq!(result.committed,request["rejected"]!=true);}
  if request["rejected"]==true{assert_eq!(runtime.checkpoint_portable().unwrap(),before);}
  if request["call"]=="visible"{
   let want=if steps.iter().filter(|s|s["call"]=="merge").count()<8{vec![97;64]}else{[vec![97;25],vec![90],vec![97;19],vec![89,88,87]].concat()};
   assert_eq!(result.result.json(),json!({"Ok":want}));
  }
  request.as_object_mut().unwrap().remove("rejected");steps.push(request);expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("persistent-causal-runs-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
