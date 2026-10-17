// Link the generated package once, preserving native directives and exported ABI symbols.
use compiled_state::State;
use serde_json::{Value,json};
fn run()->Result<(),String>{
 let mut args=std::env::args().skip(1);let file=args.next().ok_or("expected SCRIPT.json")?;let script:Value=serde_json::from_slice(&std::fs::read(file).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let mut state=State::new();let mut output=vec![];
 for step in script.as_array().ok_or("expected script array")?{
  if let Some(bytes)=step.get("reject_restore") {let bytes:Vec<u8>=serde_json::from_value(bytes.clone()).map_err(|e|e.to_string())?;let before=state.checkpoint()?;if State::restore(&bytes).is_ok(){return Err("invalid invariant snapshot accepted".into());}if state.checkpoint()?!=before{return Err("failed restore changed state".into());}continue;}
  if let Some(bytes)=step.get("restore"){let bytes:Vec<u8>=serde_json::from_value(bytes.clone()).map_err(|e|e.to_string())?;state=State::restore(&bytes)?;continue;}
  if let Some(ack)=step.get("acknowledge"){state.acknowledge_through(ack[0].as_u64().ok_or("commit")?,ack[1].as_u64().ok_or("position")?);continue;}
  let before=State::parallel_statistics();
  let reply=if let Some(name)=step.get("pure").and_then(Value::as_str){match state.call_json(name,&step["args"]){Ok(v)=>json!({"value":v}),Err(e)=>json!({"host_error":e})}}
  else{match state.invoke_json(step["call"].as_str().ok_or("missing call")?,&step["args"]){Ok(v)=>json!({"outcome":v}),Err(e)=>json!({"host_error":e})}};
  if step["expect_workers"]==true{let after=State::parallel_statistics();if after["workers"].as_u64().unwrap()-before["workers"].as_u64().unwrap()<2{return Err("parallel lowering did not execute at least two worker threads".into());}if after["lastWorkerIds"].as_array().unwrap().len()<2{return Err("parallel lowering did not enter distinct OS threads".into());}}
  output.push(json!({"reply":reply,"snapshot":state.checkpoint()?}));
 }
 println!("{}",serde_json::to_string(&output).map_err(|e|e.to_string())?);Ok(())
}
fn main()->std::process::ExitCode{match run(){Ok(())=>std::process::ExitCode::SUCCESS,Err(e)=>{eprintln!("error: {e}");std::process::ExitCode::FAILURE}}}
