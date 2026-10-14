use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"] mod parity;
#[test]
fn independent_measures_preserve_all_cpu_tree_images_positions_and_ranks(){
 let path="examples/crdts/dual_measure.ink";let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let edits=json!([
 {"kind":0,"slot":0,"value":1,"extent":4,"first":3,"second":1},
 {"kind":0,"slot":1,"value":2,"extent":2,"first":0,"second":5},
 {"kind":0,"slot":0,"value":3,"extent":1,"first":2,"second":0},
 {"kind":1,"slot":1,"value":0,"extent":0,"first":0,"second":0},
 {"kind":2,"slot":2,"value":0,"extent":0,"first":0,"second":1},
 {"kind":3,"slot":3,"value":0,"extent":3,"first":1,"second":2},
 {"kind":4,"slot":1,"value":0,"extent":0,"first":2,"second":4},
 {"kind":4,"slot":0,"value":0,"extent":0,"first":9,"second":9}]);
 for rows in [json!([]),edits]{for (name,args)in [("images",json!([rows])),("positions",json!([rows,[0,1,2,3,4,5,6,7,8,9,4294967295u32],0])),("positions",json!([rows,[0,1,2,3,4,5,6,7,8,9,4294967295u32],1])),("positions",json!([rows,[0,1,2,3,4,5,6,7,8,9,4294967295u32],2])),("ranks",json!([rows,if rows.as_array().unwrap().is_empty(){vec![0]}else{vec![0,1,2,3]},0])),("ranks",json!([rows,if rows.as_array().unwrap().is_empty(){vec![0]}else{vec![0,1,2,3]},1])),("ranks",json!([rows,if rows.as_array().unwrap().is_empty(){vec![0]}else{vec![0,1,2,3]},2]))]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let value=eval::call(&program,name,values,&mut 5_000_000).unwrap().json();steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}
 parity::conformance("dual-measure-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
