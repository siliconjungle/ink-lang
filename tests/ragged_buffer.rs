use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn flat_ragged_rows_preserve_all_cpu_decoding_ranges_and_snapshots(){
 let source=std::env::var("INK_RAGGED_SOURCE").unwrap_or_else(|_|"examples/crdts/ragged_buffer.ink".into());let path=source.as_str();let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for rows in [json!([]),json!([[]]),json!([[],[0,1,4294967295u32],[],[7,8],[]])]{
  let count=rows.as_array().unwrap().len() as u32;let mut queries=(0..=count+1).collect::<Vec<_>>();queries.push(u32::MAX);
  let wants=queries.iter().map(|i|rows.as_array().unwrap().get(*i as usize).cloned().unwrap_or(json!([]))).collect::<Vec<_>>();
  let mut offset=0u32;let ranges=rows.as_array().unwrap().iter().flat_map(|r|{let start=offset;offset+=r.as_array().unwrap().len() as u32;[start,offset]}).collect::<Vec<_>>();
  for (name,args,want)in [("selected",json!([rows,queries]),json!(wants)),("layout",json!([rows]),json!(ranges))]{
   let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,name,values,&mut 1_000_000).unwrap().json(),want);
   steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("ragged-buffer-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
