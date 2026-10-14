use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn blocked_interval_splits_refinements_and_endpoints_preserve_cpu_snapshots(){
 let path=std::env::var("INK_INTERVAL_SOURCE").unwrap_or_else(|_|"examples/crdts/blocked_interval_index.ink".into());let p=modules::load(&path).unwrap().program;let runtime=Runtime::new(p.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let entries=(0..100u64).rev().map(|i|json!({"start":i*100,"end":i*100+80,"value":i+1})).collect::<Vec<_>>();let keys=(0..105u64).flat_map(|i|[i*100,i*100+79,i*100+80]).collect::<Vec<_>>();
 let mut cases=vec![("values",json!([entries,keys,true])),("values",json!([[],[0,u64::MAX],true])),("values",json!([[{"start":u64::MAX,"end":0,"value":7}],[u64::MAX-1,u64::MAX],true])),("valid",json!([[{"start":1,"end":9,"value":1},{"start":8,"end":10,"value":2}]]))];
 let ordered=(0..100u64).map(|i|json!({"start":i*100,"end":i*100+80,"value":i+1})).collect::<Vec<_>>();let cuts=(0..100u64).map(|i|json!({"start":i*100,"end":i*100+80,"boundary":i*100+40,"value":i+1,"suffix":i+101,"hint":if i%2==0{i+1}else{0}})).collect::<Vec<_>>();cases.push(("refined_values",json!([ordered,cuts,keys,true])));
 for(name,args)in cases{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect::<Vec<_>>();let want=eval::call(&p,name,values,&mut 10_000_000).unwrap().json();
  if name!="valid"{let mut baseline=args.clone();*baseline.as_array_mut().unwrap().last_mut().unwrap()=json!(false);let values=baseline.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();assert_eq!(eval::call(&p,name,values,&mut 10_000_000).unwrap().json(),want);}
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("blocked-interval-parity",p,&std::fs::read_to_string(&path).unwrap(),steps,expected);
}
