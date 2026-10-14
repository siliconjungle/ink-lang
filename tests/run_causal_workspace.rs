use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn compressed_causal_runs_preserve_ranges_and_sparse_query_flags(){
 let path="examples/crdts/run_causal_workspace.ink";let program=modules::load(&path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let mut graphs=vec![json!([]),json!([[]]),json!([[],[1],[1],[2,3],[4],[3,4,5],[6],[6,6]]),json!([[],[1,1],[2]]),json!([[0]]),json!([[1]]),json!([[],[2]])];
 graphs.push(json!((0..257).map(|i|if i==0{vec![]}else{vec![i]}).collect::<Vec<_>>()));
 let mut random=937u64;
 for _ in 0..12{let mut parents=vec![vec![]];for version in 2..65{random^=random<<13;random^=random>>7;random^=random<<17;let a=1+(random as u32)%(version-1);let b=1+((random>>32)as u32)%(version-1);let c=1+((random>>16)as u32)%(version-1);parents.push(if random%4==0{vec![a,b,c]}else if random%3==0{vec![a,b]}else{vec![a]});}graphs.push(json!(parents));}
 for parents in graphs{
  let n=parents.as_array().unwrap().len()as u32;let queries=json!([{"left":[],"right":[]},{"left":[n],"right":[]},{"left":[],"right":[n]},{"left":[1],"right":[n]},{"left":[n,n],"right":[1,1]},{"left":[0],"right":[]},{"left":[],"right":[n+1]}]);
  let reference=program.functions.iter().find(|f|f.name=="scalar").unwrap();let inputs=json!([parents,queries]);let values=inputs.as_array().unwrap().iter().zip(&reference.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let want=eval::call(&program,"scalar",values,&mut 20_000_000).unwrap().json();
  if n==257{let args=json!([n,queries]);let f=program.functions.iter().find(|f|f.name=="from_chain").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,"from_chain",values,&mut 20_000_000).unwrap().json(),want);steps.push(json!({"pure":"from_chain","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want.clone()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
  for rollover in [false,true]{
   let args=json!([parents,queries,rollover]);let f=program.functions.iter().find(|f|f.name=="queries").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,"queries",values,&mut 20_000_000).unwrap().json(),want);
   steps.push(json!({"pure":"queries","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("run-causal-workspace-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
