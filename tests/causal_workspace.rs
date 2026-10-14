use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn causal_workspace_preserves_frontiers_recycling_rollover_and_cpu_snapshots(){
 let path=std::env::var("INK_CAUSAL_SOURCE").unwrap_or_else(|_|"examples/crdts/causal_workspace.ink".into());let program=modules::load(&path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let graphs=[json!([]),json!([[]]),json!([[],[1],[1],[2,3],[4],[3,4,5],[6],[6,6]]),json!([[],[1,1],[2]]),json!([[0]]),json!([[1]]),json!([[],[2]])];
 for parents in graphs{
  let n=parents.as_array().unwrap().len()as u32;let queries=json!([{"left":[],"right":[]},{"left":[n],"right":[]},{"left":[],"right":[n]},{"left":[1],"right":[n]},{"left":[n,n],"right":[1,1]},{"left":[0],"right":[]},{"left":[],"right":[n+1]}]);
  let reference=program.functions.iter().find(|f|f.name=="scalar").unwrap();let inputs=json!([parents,queries]);let values=inputs.as_array().unwrap().iter().zip(&reference.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let want=eval::call(&program,"scalar",values,&mut 1_000_000).unwrap().json();
  for rollover in [false,true]{
   let args=json!([parents,queries,rollover]);let f=program.functions.iter().find(|f|f.name=="queries").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,"queries",values,&mut 1_000_000).unwrap().json(),want);
   steps.push(json!({"pure":"queries","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("causal-workspace-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
