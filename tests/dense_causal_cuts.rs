use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn dense_cut_membership_preserves_all_cpu_values_and_snapshots(){
 let path="examples/crdts/dense_causal_cuts.ink";
 let program=modules::load(path).unwrap().program;
 let runtime=Runtime::new(program.clone()).unwrap();
 let cases=vec![json!([]),json!([[]]),json!([[],[1],[1],[2,3],[4]]),
  json!([[],[1],[1]]),json!([[],[1,1],[2]]),json!([[],[],[],[]]),
  json!([[0]]),json!([[1]]),json!([[],[2]]),json!([[],[4294967295u32]]),
  json!([[],[1],[1],[1],[2,3,4],[5],[3],[6,7]])];
 let mut steps=vec![];let mut expected=vec![];
 for parents in cases {
  let args=json!([parents]);let mut original=None;
  for name in ["original","boundaries"]{
   let f=program.functions.iter().find(|f|f.name==name).unwrap();
   let values=args.as_array().unwrap().iter().zip(&f.params)
    .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
   let value=eval::call(&program,name,values,&mut 10_000_000).unwrap().json();
   if name=="original"{original=Some(value.clone());}
   else{assert_eq!(Some(&value),original.as_ref());}
   steps.push(json!({"pure":name,"args":args}));
   expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("dense-causal-cuts-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
