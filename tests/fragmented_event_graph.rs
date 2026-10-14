use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn interior_frontiers_preserve_all_cpu_events_values_errors_and_snapshots(){
 let path="examples/crdts/fragmented_graph.ink";let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let base=json!({"id":4294967297u64,"parents":[],"position":0,"remove":0,"text":[65,66,67,68]});
 let replacement=json!({"id":8589934593u64,"parents":[4294967300u64],"position":0,"remove":2,"text":[90,91]});
 let cases=vec![json!([]),json!([base,{"id":12884901889u64,"parents":[4294967298u64,4294967298u64],"position":2,"remove":0,"text":[233]}]),json!([base,replacement,{"id":12884901889u64,"parents":[8589934593u64],"position":0,"remove":1,"text":[128578]}]),json!([base,replacement,{"id":12884901889u64,"parents":[8589934595u64],"position":1,"remove":1,"text":[0]}]),json!([base,{"id":8589934593u64,"parents":[99u64],"position":0,"remove":0,"text":[66]}]),json!([base,{"id":8589934593u64,"parents":[4294967298u64],"position":9,"remove":0,"text":[66]}])];
 for changes in cases{
  let args=json!([changes]);let mut originals=None;let mut scalar=None;
  for name in ["valid","pieces","original_events","fragment_events","scalar","materialize"]{
   let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let value=eval::call(&program,name,values,&mut 10_000_000).unwrap().json();
   if name=="original_events"{originals=Some(value.clone());}if name=="fragment_events"{assert_eq!(Some(&value),originals.as_ref());}
   if name=="scalar"{scalar=Some(value.clone());}if name=="materialize"{assert_eq!(Some(&value),scalar.as_ref());}
   steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("fragmented-event-graph-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
