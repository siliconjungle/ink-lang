//! Untimed workload preparation through the ordinary generated state API.
#[path="../lib.rs"]mod emitted;
use emitted::State;
use serde_json::{json,Value};
fn main(){
 let args:Vec<_>=std::env::args().collect();let script:Vec<Value>=serde_json::from_slice(&std::fs::read(&args[1]).unwrap()).unwrap();
 let mut state=State::new();let mut outcomes=vec![];
 for row in script{
  let result=state.invoke_json(row["call"].as_str().unwrap(),&row["args"]).unwrap();
  if let Some(want)=row.get("expect_committed"){assert_eq!(&result["committed"],want);}
  if let Some(want)=row.get("expect_result"){assert_eq!(&result["result"],want);}
  outcomes.push(result);
 }
 let bytes=state.checkpoint().unwrap();std::fs::write(&args[2],&bytes).unwrap();
 println!("{}",json!({"snapshot_bytes":bytes.len(),"outcomes":outcomes}));
}
