use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn measured_successors_match_flat_search_and_preserve_complete_tree_images(){
 let path="examples/libraries/measure_successor_observers.ink";let program=modules::load(path).unwrap().program;let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0usize,1,8,70,257,2050]{
  let entries:Vec<_>=(0..n).map(|i|json!({"value":i+1,"extent":if i%5==0{0}else{1},"weight":if i%7==0{3}else{0},"weight2":if i==0||i+1==n||i%65==0{2}else{0}})).collect();let slots=if n<10{(0..=n).collect::<Vec<_>>()}else{vec![0,1,2,n/2,n.saturating_sub(1),n]};let mut queries=vec![];let mut nodes=vec![];
  for slot in slots{for measure in [0u32,1,2,3,u32::MAX]{let field=match measure{1=>"weight",2=>"weight2",_=>"extent"};let next=(slot..n).find(|i|entries[*i][field].as_u64().unwrap()!=0).map(|i|i+1).unwrap_or(0);queries.push(json!({"slot":slot,"measure":measure}));nodes.push(next);}}
  let args=json!([entries,queries]);let f=program.functions.iter().find(|f|f.name=="probe").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let got=eval::call(&program,"probe",values,&mut 100_000_000).unwrap().json();assert_eq!(got,json!({"nodes":nodes,"unchanged":true}),"count {n}");steps.push(json!({"pure":"probe","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":got},"snapshot":snapshot}));
 }
 parity::conformance("measure-successor-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
