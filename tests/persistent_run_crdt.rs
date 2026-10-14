use serde_json::{json,Value};
use verified_language::{modules,stateful::Runtime};
#[path="support/parity.rs"] mod parity;
fn atom(id:u64,left:u64,right:u64,value:u32)->Value{json!({"id":id,"left":left,"right":right,"stamp":id&4294967295,"value":value,"deleted":false})}
fn insert(id:u64,left:u64,right:u64,value:u32)->Value{json!({"insert":true,"atom":atom(id,left,right,value),"target":0})}
fn delete(id:u64)->Value{json!({"insert":false,"atom":atom(0,0,0,0),"target":id})}
#[test]
fn durable_runs_preserve_future_merges_and_transaction_rollback(){
 let path="examples/crdts/persistent_runs.ink";let program=modules::load(path).unwrap().program;
 let mut steps=vec![];let mut expected=vec![];
 for mode in 0..4{
  let mut runtime=Runtime::new(program.clone()).unwrap();
  let empty=runtime.checkpoint_portable().unwrap();steps.push(json!({"restore":empty}));
  let a=4294967297u64;let b=8589934593u64;let c=12884901889u64;
  let requests=vec![
   json!({"call":"initialise","args":[mode]}),
   json!({"call":"merge","args":[[insert(a,0,0,65),insert(a+1,a,0,128578)]]}),
   json!({"call":"merge","args":[[delete(b)]]}),
   json!({"call":"merge","args":[[insert(b,a,a+1,66)]]}),
   json!({"call":"visible","args":[]}),
   json!({"call":"logical","args":[]}),
  ];
  for request in requests{let outcome=runtime.invoke_json(request["call"].as_str().unwrap(),&request["args"]).unwrap();if request["call"]=="visible"{assert_eq!(outcome.result.json(),json!({"Ok":[65,128578]}));}steps.push(request);expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
  let snapshot=runtime.checkpoint_portable().unwrap();let before=runtime.invoke_json("logical",&json!([])).unwrap().result.json();
  runtime=Runtime::restore_portable(program.clone(),&snapshot).unwrap();assert_eq!(runtime.invoke_json("logical",&json!([])).unwrap().result.json(),before);steps.push(json!({"restore":snapshot}));
  for request in [
   json!({"call":"merge","args":[[insert(c,a,a+1,233),delete(a+1)]]}),
   json!({"call":"visible","args":[]}),
   json!({"call":"merge","args":[[insert(c,a,a+1,233)]]}),
   json!({"call":"merge","args":[[insert(c+1,c,0,67),insert(c,a,a+1,99)]]}),
   json!({"call":"initialise","args":[(mode+1)%4]}),
   json!({"call":"logical","args":[]}),
   json!({"call":"visible","args":[]}),
  ]{let prior=runtime.checkpoint_portable().unwrap();let outcome=runtime.invoke_json(request["call"].as_str().unwrap(),&request["args"]).unwrap();let must_fail=request["call"]=="initialise" || (request["call"]=="merge" && request["args"][0].as_array().unwrap().len()==2 && request["args"][0][0]["atom"]["id"]==json!(c+1));if must_fail{assert!(!outcome.committed,"expected transaction rejection: {request}");}if !outcome.committed{assert_eq!(runtime.checkpoint_portable().unwrap(),prior);}if request["call"]=="visible"{assert_eq!(outcome.result.json(),json!({"Ok":[65,233]}));}steps.push(request);expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 }
 parity::conformance("persistent-run-crdt-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
