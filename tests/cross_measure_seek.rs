use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
fn expected(edits:&Value,queries:&Value,selection:usize,observation:usize)->Value{
 let mut order=Vec::<usize>::new();let mut measures=vec![[0u32;3]];
 for e in edits.as_array().unwrap(){
  let kind=e["kind"].as_u64().unwrap();let slot=e["slot"].as_u64().unwrap()as usize;
  let m=[e["extent"].as_u64().unwrap()as u32,e["first"].as_u64().unwrap()as u32,e["second"].as_u64().unwrap()as u32];
  if kind==0{let id=measures.len();measures.push(m);let index=if slot==0{order.len()}else{order.iter().position(|&s|s==slot).unwrap()};order.insert(index,id);}
  else if slot!=0{match kind{1=>measures[slot][1]=m[1],2=>measures[slot][2]=m[2],3=>measures[slot]=m,_=>{measures[slot][1]=m[1];measures[slot][2]=m[2];}}}
 }
 let mut output=vec![];
 for q in queries.as_array().unwrap(){let mut remaining=q.as_u64().unwrap();let mut rank=0u32;let mut found=None;
  for &slot in &order{let m=measures[slot];if remaining<u64::from(m[selection]){found=Some((slot,remaining));break;}remaining-=u64::from(m[selection]);rank=rank.wrapping_add(m[observation]);}
  if let Some((slot,offset))=found{output.extend([slot as u32,rank,offset as u32]);}else{output.extend([0,0,0]);}
 }json!(output)
}
#[test]
fn independent_cross_measures_preserve_all_cpu_values_and_snapshots(){
 let path="examples/crdts/cross_measure_seek.ink";let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut outputs=vec![];
 let mut edits=(0..96u32).map(|i|json!({"kind":0,"slot":if i%3==0{0}else{1},"value":i+1,"extent":i%5,"first":i%3,"second":i%7})).collect::<Vec<_>>();
 edits.extend([json!({"kind":3,"slot":7,"value":0,"extent":3,"first":0,"second":5}),json!({"kind":4,"slot":1,"value":0,"extent":0,"first":7,"second":0}),json!({"kind":1,"slot":0,"value":0,"extent":0,"first":9,"second":9})]);
 let cases=[json!([]),json!(edits),json!([
  {"kind":0,"slot":0,"value":1,"extent":0,"first":4294967295u32,"second":0},
  {"kind":0,"slot":0,"value":2,"extent":4294967295u32,"first":0,"second":0}])];
 for rows in cases{for selection in 0..3{for observation in 0..3{
  let queries=json!([0,1,2,7,15,16,31,32,63,95,200,4294967294u32,4294967295u32]);let want=expected(&rows,&queries,selection,observation);let args=json!([rows,queries,selection,observation]);let f=program.functions.iter().find(|f|f.name=="positions").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  assert_eq!(eval::call(&program,"positions",values,&mut 5_000_000).unwrap().json(),want);steps.push(json!({"pure":"positions","args":args}));outputs.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}}
 parity::conformance("cross-measure-parity",program,&std::fs::read_to_string(path).unwrap(),steps,outputs);
}
