use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn uniform_intervals_match_wide_arithmetic_at_word_boundaries(){
 let source="examples/crdts/uniform_interval_index_observers.ink";let program=modules::load(source).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let prefixes=[(0,0,0),(0,1,1),(u64::MAX,1,1),(u64::MAX-11,3,4),(u64::MAX,2,1),(1u64<<32,7,257),(0,u32::MAX,u32::MAX),(u64::MAX-4,2,2),(u64::MAX-4,2,3)];
 for(start,width,count)in prefixes{let extent=(width as u128)*(count as u128);let limit=start as u128+extent;let valid=width!=0&&count!=0&&limit<=1u128<<64;
  let mut keys=vec![0,start,start.wrapping_sub(1),start.wrapping_add(width as u64).wrapping_sub(1),start.wrapping_add(width as u64),u64::MAX];keys.sort();keys.dedup();
  for key in keys{for (a,b)in[(0,0),(key,key.wrapping_add(1))]{
   let found=if valid&&key>=start&&(key as u128)<limit{let ordinal=(key-start)/(width as u64);let first=start as u128+ordinal as u128*width as u128;json!({"value":ordinal+1,"start":first as u64,"end":(first+width as u128)as u64})}else{json!({"value":0,"start":0,"end":0})};let end=if b==0{1u128<<64}else{b as u128};let overlap=valid&&(a as u128)<limit&&(start as u128)<end;
   let args=json!([{"start":start,"width":width,"count":count},key,a,b]);let f=program.functions.iter().find(|f|f.name=="probe").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let result=eval::call(&program,"probe",values,&mut 1_000_000).unwrap().json();assert_eq!(result,json!({"valid":valid,"found":found,"overlap":overlap}));steps.push(json!({"pure":"probe","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
  }}
 }
 parity::conformance("uniform-interval-index-parity",program,&std::fs::read_to_string(source).unwrap(),steps,expected);
}
