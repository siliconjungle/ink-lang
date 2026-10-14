use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
pub fn check(path:&str,label:&str){
 let program=modules::load(path).unwrap().program;
 let old=modules::load("examples/crdts/persistent_causal_batches_rows.ink").unwrap().program;
 let a=1u64<<32;let b=2u64<<32;let c=3u64<<32;
 let change=|id,parents:Vec<u64>,position,remove,text:Vec<u32>|json!({"id":id,"parents":parents,"position":position,"remove":remove,"text":text});
 let initial=vec![change(a+1,vec![],0,0,vec![65,128578]),change(b+1,vec![a+2],1,0,vec![66])];
 let fork=change(c+1,vec![a+2],1,0,vec![233]);
 let linear:Vec<_>=(0..40).map(|i|change(a+i+1,if i==0{vec![]}else{vec![a+i]},i as u32,0,vec![97])).collect();
 let mut cases:Vec<(Vec<Value>,Vec<Value>)>=vec![
  (vec![],vec![]),(vec![],initial.clone()),(initial.clone(),vec![fork.clone()]),
  (initial.clone(),vec![fork.clone(),change(c+2,vec![b+1,c+1],1,1,vec![])]),
  (initial.clone(),initial.clone()),
  (initial.clone(),vec![change(a+1,vec![],0,0,vec![99])]),
  (initial.clone(),vec![change(c+1,vec![a+99],0,0,vec![90])]),
  (initial.clone(),vec![change(c+1,vec![a+1],99,0,vec![90])]),
  (vec![],vec![change(a+1,vec![],0,0,vec![0xd800])]),
  (linear.clone(),linear.clone()),
  (linear.clone(),vec![change(a+41,vec![a+40],10,10,vec![88])]),
  (linear.clone(),vec![change(b+1,vec![a+20],8,0,vec![87])]),
  (linear.clone(),vec![change(a+41,vec![a+40],40,0,vec![89]),change(b+1,vec![a+20],8,0,vec![87])]),
 ];
 let mut forked=linear.clone();forked.push(change(b+1,vec![a+20],8,0,vec![87]));
 cases.push((forked.clone(),linear.clone()));
 cases.push((forked,vec![change(a+10,vec![a+9],9,0,vec![99])]));
 let multi:Vec<_>=(0..40).map(|i|change(a+2*i+1,if i==0{vec![]}else{vec![a+2*i]},2*i as u32,0,vec![97,98])).collect();
 let mut forked=multi.clone();forked.push(change(b+1,vec![a+40],8,0,vec![87]));
 cases.push((forked.clone(),multi));
 cases.push((forked,vec![change(a+2,vec![a+2],4,0,vec![99])]));
 let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 // Each public call is an independent interpreter invocation. Combining every
 // merge, snapshot, restore and projection in one nested Result continuation
 // exceeds the interpreter's fixed nesting budget on these adversarial cases.
 let mut call=|name:&str,args:Value|{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  let result=eval::call(&program,name,values,&mut 50_000_000).unwrap_or_else(|e|panic!("{name}: {e}")).json();
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":snapshot}));result
 };
 for(initial,incoming)in cases{
  let mut reference=Runtime::new(old.clone()).unwrap();assert!(reference.invoke_json("merge",&json!([initial])).unwrap().committed);
  let before=reference.invoke_json("visible",&json!([])).unwrap().result.json()["Ok"].clone();let accepted=reference.invoke_json("merge",&json!([incoming])).unwrap().committed;
  let empty=call("empty",json!([]));let first=call("merged",json!([empty,initial]))["Ok"].clone();assert!(!first.is_null());assert_eq!(call("visible",json!([first]))["Ok"],before);
  let result=call("merged",json!([first,incoming]));if !accepted{assert!(result.get("Err").is_some());continue;}
  let next=result["Ok"].clone();assert!(!next.is_null());let after=reference.invoke_json("visible",&json!([])).unwrap().result.json()["Ok"].clone();let history=reference.invoke_json("history",&json!([])).unwrap().result.json();
  assert_eq!(call("visible",json!([next]))["Ok"],after);assert_eq!(call("history",json!([next])),history);
  let duplicate=call("merged",json!([next,incoming]));assert_eq!(duplicate["Ok"],next,"duplicate delivery changes complete document image");
  let words=call("saved",json!([next]))["Ok"].clone();assert!(!words.is_null());let restored=call("loaded",json!([words]))["Ok"].clone();assert!(!restored.is_null());
  assert_eq!(call("visible",json!([restored]))["Ok"],after);assert_eq!(call("history",json!([restored])),history);
 }
 super::parity::conformance(label,program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
