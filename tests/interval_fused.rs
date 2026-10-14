use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"] mod parity;

#[test]
fn one_pass_interval_insert_preserves_exact_cpu_tree_images(){
 let path="examples/crdts/interval_fused.ink";let program=modules::load(path).unwrap().program;
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let max=u64::MAX;
 let base=json!([{"start":40,"end":50,"value":1},{"start":0,"end":10,"value":2},{"start":20,"end":30,"value":3},{"start":10,"end":20,"value":4},{"start":30,"end":40,"value":5},{"start":60,"end":70,"value":6}]);
 let mut histories=vec![json!([]),base.clone(),json!([{"start":max,"end":0,"value":7}]),json!([{"start":max-1,"end":max,"value":1},{"start":max,"end":0,"value":2}]),json!([{"start":0,"end":0,"value":1},{"start":max,"end":0,"value":2}])];
 for bad in [json!({"start":40,"end":50,"value":9}),json!({"start":49,"end":60,"value":9}),json!({"start":51,"end":61,"value":9}),json!({"start":55,"end":55,"value":9}),json!({"start":52,"end":53,"value":0})]{let mut rows=base.as_array().unwrap().clone();rows.push(bad);histories.push(json!(rows));}
 for entries in histories{
  for name in ["image","values"]{
   let f=program.functions.iter().find(|f|f.name==name).unwrap();
   let args=if name=="image"{json!([entries,false])}else{json!([entries,[0,9,10,19,20,49,50,60,69,70,max-1,max],false])};
   let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
   let want=eval::call(&program,name,values,&mut 5_000_000).unwrap().json();
   for fast in [false,true]{
    let mut args=args.clone();*args.as_array_mut().unwrap().last_mut().unwrap()=json!(fast);
    let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
    assert_eq!(eval::call(&program,name,values,&mut 5_000_000).unwrap().json(),want,"{name} {fast}");
    steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
   }
  }
 }
 parity::conformance("interval-fused-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
