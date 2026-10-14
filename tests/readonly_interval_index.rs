use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;

#[test]
fn scalar_loop_state_preserves_every_index_field_and_bounded_malformed_traversal(){
 let path="examples/crdts/readonly_interval_index.ink";let program=modules::load(path).unwrap().program;
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let node=|start:u64,end:u64,value:u32,left:u32,right:u32|json!({"start":start,"end":end,"value":value,"left":left,"right":right,"parent":0,"priority":17});
 let nil=node(0,0,0,0,0);
 // Ordinary valid tree, invalid root, cycles, invalid child and full-u64 end.
 let cases=vec![(vec![],0,true),(vec![nil.clone()],0,true),(vec![nil.clone()],99,false),
  (vec![nil.clone(),node(10,20,1,2,3),node(0,5,2,0,0),node(30,0,3,0,0)],1,true),
  (vec![nil.clone(),node(10,20,1,1,1)],1,false),
  (vec![nil,node(u64::MAX,0,9,999,999)],1,true)];
 for(nodes,root,valid)in cases{
  for key in [0,4,10,19,20,30,u64::MAX]{for successor in [false,true]{
   let run=|fast|{let args=json!([nodes,root,valid,key,successor,fast]);let f=program.functions.iter().find(|f|f.name=="lookup").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();eval::call(&program,"lookup",values,&mut 2_000_000).unwrap().json()};
   let want=run(false);assert_eq!(run(true),want);
   for fast in [false,true]{steps.push(json!({"pure":"lookup","args":[nodes,root,valid,key,successor,fast]}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));}
  }}
 }
 parity::conformance("readonly-interval-index-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
