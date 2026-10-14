use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;

#[test]
fn ownership_taking_document_matches_transactional_merges_duplicates_and_replay(){
 let path=std::env::var("INK_OWNED_DOCUMENT_OBSERVERS").unwrap_or_else(|_|"examples/crdts/owned_text_document_observers.ink".into());
 let program=modules::load(&path).unwrap().program;
 let old=modules::load("examples/crdts/persistent_causal_batches_rows.ink").unwrap().program;
 let a=1u64<<32;let b=2u64<<32;let c=3u64<<32;
 let change=|id,parents:Vec<u64>,position,remove,text:Vec<u32>|json!({"id":id,"parents":parents,"position":position,"remove":remove,"text":text});
 let initial=vec![change(a+1,vec![],0,0,vec![65,128578]),change(b+1,vec![a+2],1,0,vec![66])];
 let fork=change(c+1,vec![a+2],1,0,vec![233]);
 let linear:Vec<_>=(0..40).map(|i|change(a+i+1,if i==0{vec![]}else{vec![a+i]},i as u32,0,vec![97])).collect();
 let cases:Vec<(Vec<Value>,Vec<Value>)>=vec![
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
 let empty=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for(initial,incoming)in cases{
  let mut reference=Runtime::new(old.clone()).unwrap();
  assert!(reference.invoke_json("merge",&json!([initial])).unwrap().committed);
  let before=reference.invoke_json("visible",&json!([])).unwrap().result.json()["Ok"].clone();
  let accepted=reference.invoke_json("merge",&json!([incoming])).unwrap().committed;
  let args=json!([initial,incoming]);let f=program.functions.iter().find(|f|f.name=="exercise").unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  let result=eval::call(&program,"exercise",values,&mut 50_000_000).unwrap().json();
  if accepted{
   let after=reference.invoke_json("visible",&json!([])).unwrap().result.json()["Ok"].clone();
   let history=reference.invoke_json("history",&json!([])).unwrap().result.json();
   assert_eq!(result["Ok"]["before"],before);assert_eq!(result["Ok"]["after"],after);
   assert_eq!(result["Ok"]["restored"],after);assert_eq!(result["Ok"]["history"],history);
   assert_eq!(result["Ok"]["duplicate_history"],history);
  }else{assert!(result.get("Err").is_some(),"{result}");}
  steps.push(json!({"pure":"exercise","args":args}));expected.push(json!({"reply":{"value":result},"snapshot":empty}));
 }
 let stem=std::path::Path::new(&path).file_stem().unwrap().to_str().unwrap();let label=format!("{}-parity",stem.strip_suffix("_observers").unwrap_or(stem).replace('_',"-"));
 parity::conformance(&label,program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
