
use compiled_state::State;
use serde_json::{Value,json};
fn main(){
 let steps:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let mut state=State::new(); let mut output=vec![];
 for step in steps {
  if let Some(bytes)=step.get("restore") { let bytes:Vec<u8>=serde_json::from_value(bytes.clone()).unwrap();state=State::restore(&bytes).unwrap();continue; }
  let reply=match state.invoke_json(step["call"].as_str().unwrap(),&step["args"]) {
    Ok(outcome)=>json!({"outcome":outcome}),Err(error)=>json!({"host_error":error})};
  output.push(json!({"reply":reply,"snapshot":state.checkpoint().unwrap()}));
 }
 println!("{}",serde_json::to_string(&output).unwrap());
}
