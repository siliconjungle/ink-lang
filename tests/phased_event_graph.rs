use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime,syntax::Type};
#[path="support/parity.rs"] mod parity;
#[test]
fn causal_checkpoint_shredding_preserves_cpu_values_errors_and_snapshots(){
 let path=std::env::var("INK_PHASED_SOURCE").unwrap_or_else(|_|"examples/crdts/phased_graph.ink".into());let program=modules::load(&path).unwrap().program;
 let f=program.functions.iter().find(|f|f.name=="materialize").unwrap();
 let Type::Result(_,error)=&f.result else{panic!()};let Type::Named(error)=error.as_ref() else{panic!()};
 let rows:Vec<Value>=serde_json::from_str(include_str!("../examples/crdts/fixtures/phased-parity.json")).unwrap();
 let mut cases=rows.into_iter().map(|row|(row["changes"].clone(),json!({"Ok":row["expected"]}))).collect::<Vec<_>>();
 cases.push((json!([{ "id":4294967297u64,"parents":[],"position":0,"remove":0,"text":[65] },{ "id":8589934593u64,"parents":[4294967297u64],"position":9,"remove":0,"text":[66] }]),json!({"Err":format!("{error}.InvalidOperation")})));
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (changes,want) in cases{
  let args=json!([changes]);
  for name in ["materialize","small_phases","zero_phases"]{
   let f=program.functions.iter().find(|f|f.name==name).unwrap();
   let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
   assert_eq!(eval::call(&program,name,values,&mut 50_000_000).unwrap().json(),want,"{name}");
   steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 let label=if path.contains("arena"){"arena-event-graph-parity"}else if path.contains("speculative"){"speculative-event-graph-parity"}else if path.contains("blocked"){"phased-blocked-event-graph-parity"}else if path.contains("projected"){"projected-event-graph-parity"}else if path.contains("fused"){"phased-fused-event-graph-parity"}else{"phased-event-graph-parity"};
 parity::conformance(label,program,&std::fs::read_to_string(&path).unwrap(),steps,expected);
}
