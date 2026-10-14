use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn local_interval_refinement_preserves_exact_images_across_cpu_targets(){
 let path="examples/crdts/interval_partition.ink";let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let max=u64::MAX;let entries=json!([{"start":40,"end":90,"value":1},{"start":100,"end":150,"value":2},{"start":0,"end":30,"value":3}]);
 let cuts=json!([{"start":40,"end":90,"boundary":70,"value":1,"suffix":4,"hint":1},{"start":70,"end":90,"boundary":80,"value":4,"suffix":5,"hint":4},{"start":0,"end":30,"boundary":10,"value":3,"suffix":6,"hint":999},{"start":100,"end":150,"boundary":120,"value":2,"suffix":7,"hint":2}]);
 let bad=json!([{"start":40,"end":90,"boundary":40,"value":1,"suffix":4,"hint":1}]);
 let cases=[(entries.clone(),json!([])),(entries.clone(),cuts),(entries,bad),(json!([{"start":max-10,"end":0,"value":1}]),json!([{"start":max-10,"end":0,"boundary":max,"value":1,"suffix":2,"hint":1}]))];
 for (entries,cuts)in cases{for name in ["image","values"]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let args=if name=="image"{json!([entries,cuts,false])}else{json!([entries,cuts,[0,9,10,29,30,40,69,70,79,80,89,90,100,119,120,149,150,max-10,max-1,max],false])};
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let want=eval::call(&program,name,values,&mut 5_000_000).unwrap().json();
  for fast in [false,true]{let mut args=args.clone();*args.as_array_mut().unwrap().last_mut().unwrap()=json!(fast);let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,name,values,&mut 5_000_000).unwrap().json(),want);steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 }}
 parity::conformance("interval-partition-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
