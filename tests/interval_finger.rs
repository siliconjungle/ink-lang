use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn rolling_interval_hints_preserve_independent_membership_on_every_cpu_target(){
 let path="examples/crdts/interval_finger.ink";let program=modules::load(path).unwrap().program;
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let entries=Value::Array((0..120u64).map(|i|{let key=(i*37)%120;json!({"start":key*7+1,"end":key*7+5,"value":key+1})}).collect());
 let keys=(0..80u64).chain((0..80u64).rev()).chain([u64::MAX,0,1,4,5,7,8,799,840,841,842]).collect::<Vec<_>>();
 let max_entries=json!([{"start":u64::MAX-5,"end":0,"value":7}]);let max_keys=vec![u64::MAX-5,u64::MAX,0,u64::MAX];
 for (rows,keys) in [(json!([]),vec![0,u64::MAX]),(entries,keys),(max_entries,max_keys)]{
  let want=keys.iter().map(|key|rows.as_array().unwrap().iter().find(|e|e["start"].as_u64().unwrap()<=*key&&(e["end"]==0||*key<e["end"].as_u64().unwrap())).map(|e|e["value"].as_u64().unwrap()as u32).unwrap_or(0)).collect::<Vec<_>>();
  let args=json!([rows,keys]);let f=program.functions.iter().find(|f|f.name=="rolling").unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  assert_eq!(eval::call(&program,"rolling",values,&mut 5_000_000).unwrap().json(),json!(want));
  steps.push(json!({"pure":"rolling","args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 steps.push(json!({"pure":"split_hint","args":[]}));expected.push(json!({"reply":{"value":[2,2,2]},"snapshot":runtime.checkpoint_portable().unwrap()}));
 parity::conformance("interval-finger-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
