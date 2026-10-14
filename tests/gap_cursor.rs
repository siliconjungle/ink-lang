use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"] mod parity;

fn conform(name:&str,path:&str,cases:Vec<(&str,Value,Value)>){
 let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for (function,args,want)in cases{
  let f=program.functions.iter().find(|f|f.name==function).unwrap();
  let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  assert_eq!(eval::call(&program,function,input,&mut 20_000_000).unwrap().json(),want,"{function}");
  steps.push(json!({"pure":function,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance(name,program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}

#[test]
fn chunk_gap_growth_and_movement_preserve_all_cpu_values(){
 let mut cases=vec![];
 for bulk in [false,true]{
  cases.push(("run",json!([[],bulk]),json!([])));
  cases.push(("run",json!([[{"position":0,"remove":0,"text":[1,2,3,4]},{"position":2,"remove":1,"text":[9,8]},{"position":99,"remove":99,"text":[7]}],bulk]),json!([1,2,9,8,4,7])));
  let prefix=(0..100u32).collect::<Vec<_>>();let mut want=prefix.clone();want.splice(31..64,[u32::MAX,7]);
  cases.push(("run",json!([[{"position":0,"remove":0,"text":prefix},{"position":31,"remove":33,"text":[u32::MAX,7]}],bulk]),json!(want)));
 }
 conform("bulk-gap-parity","examples/crdts/bulk_gap.ink",cases);
}

#[test]
fn interval_hints_preserve_all_cpu_values_after_splits_and_at_u64_end(){
 let mut cases=vec![("split_hint",json!([]),json!([2,2,2]))];
 for hint in [false,true]{
  cases.push(("values",json!([[{"start":10,"end":20,"value":7},{"start":30,"end":0,"value":9}],[{"key":9,"hint":1},{"key":10,"hint":99},{"key":19,"hint":2},{"key":20,"hint":1},{"key":u64::MAX,"hint":2}],hint]),json!([0,7,7,0,9])));
 }
 conform("interval-cursor-parity","examples/crdts/interval_cursor.ink",cases);
}

#[test]
fn weighted_sequence_cursors_preserve_all_cpu_values(){
 let edit=|kind:u32,slot:u32,before:u32,extent:u32,weight:u32,position:u32,visible:bool|json!({"kind":kind,"slot":slot,"before":before,"value":slot,"extent":extent,"weight":weight,"position":position,"visible":visible});
 let adjacent=vec![edit(0,0,0,3,3,0,true),edit(3,0,0,0,0,1,true),edit(0,0,1,2,2,0,true),edit(3,0,0,0,0,0,true),edit(1,2,0,0,0,0,true),edit(3,0,0,0,0,2,true),edit(4,1,0,0,0,0,true),edit(3,0,0,0,0,u32::MAX,true),edit(3,0,0,0,0,1,true)];
 let overflow=vec![edit(0,0,0,1,u32::MAX-2,0,true),edit(3,0,0,0,0,5,true),edit(0,0,0,1,10,0,true),edit(3,0,0,0,0,5,true),edit(1,1,0,0,1,0,true),edit(3,0,0,0,0,2,true)];
 let mut zeros=vec![];for _ in 0..40{zeros.push(edit(0,0,0,1,0,0,true));}
 zeros.extend([edit(0,0,0,7,7,0,true),edit(3,0,0,0,0,6,true),edit(3,0,0,0,0,20,false),edit(2,41,0,9,9,0,true),edit(3,0,0,0,0,8,true)]);
 conform("weighted-cursor-parity","examples/crdts/weighted_cursor.ink",vec![("same",json!([[]]),json!(true)),("same",json!([adjacent]),json!(true)),("same",json!([overflow]),json!(true)),("same",json!([zeros]),json!(true))]);
}
