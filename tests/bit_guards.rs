use serde_json::json;
use verified_language::{core::CheckedModule,eval,optimisation,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=include_str!("fixtures/bit-guard-source.ink");
#[test]
fn discovered_bit_guards_preserve_all_cpu_callbacks_values_events_and_rollback(){
 let program=syntax::parse(SOURCE).unwrap();let module=CheckedModule::from_source(program.clone()).unwrap();
 let package=serde_json::from_str(include_str!("fixtures/bit-guard-selection.json")).unwrap();
 let selected=optimisation::check(&module,&package).unwrap();assert_eq!(selected.package().applications.len(),2);
 let mut baseline=Runtime::new(program.clone()).unwrap();let mut runtime=Runtime::new_selected(&selected).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (name,args)in [("masked",json!([4294967295u64])),("masked",json!([256u64])),("captured",json!([[]])),("captured",json!([[{"value":0},{"value":15},{"value":16},{"value":4294967295u32}]]))]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect::<Vec<_>>();
  let want=eval::call(&program,name,values.clone(),&mut 100000).unwrap().json();assert_eq!(eval::call_selected(&selected,name,values,&mut 100000).unwrap().json(),want);
  steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for reject in [false,true,false]{
  let args=json!([[{"value":0},{"value":15},{"value":16},{"value":4294967295u32}],reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();
  assert_eq!(out.json(),baseline.invoke_json("save",&args).unwrap().json());assert_eq!(runtime.checkpoint_portable().unwrap(),baseline.checkpoint_portable().unwrap());
  assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}
  steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance_selected("bit-guards-parity",&selected,SOURCE,steps,expected);
}
