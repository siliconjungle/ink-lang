use ink_compiled_representation::State;use serde_json::{json,Value};use std::time::Instant;
fn main(){
 let rows=4000u64;let calls=96u64;let mut seed=State::new().unwrap();for i in 0..rows{seed.invoke_json("put",&json!([i,i,i%2==0,false])).unwrap();}seed.acknowledge_through(u64::MAX,u64::MAX);let initial=seed.checkpoint().unwrap();let mut measurements=vec![];
 for round in std::env::args().nth(1).map(|r|vec![r.parse::<u64>().unwrap()]).unwrap_or_else(||(0..5).collect()){let begin=Instant::now();let mut state=State::restore(&initial).unwrap();measurements.push(json!({"round":round,"phase":"initialise","calls":1,"ns":begin.elapsed().as_nanos().to_string()}));
  for action in ["put","total_query","count_query","erase"]{state=State::restore(&initial).unwrap();let args=|i:u64|match action{"put"=>json!([(i*37)%rows,rows+i,i%3==0,false]),"erase"=>json!([(i*37)%rows,false]),_=>json!([])};let mut warm=State::restore(&initial).unwrap();for i in 0..16{warm.invoke_json(action,&args(i)).unwrap();}let begin=Instant::now();let mut reply=Value::Null;for i in 0..calls{reply=state.invoke_json(action,&args(i)).unwrap();}let ns=begin.elapsed().as_nanos().to_string();let snapshot=state.checkpoint().unwrap();use sha2::{Digest,Sha256};measurements.push(json!({"round":round,"phase":format!("action:{action}"),"calls":calls,"ns":ns,"reply":reply,"snapshot_sha256":format!("{:x}",Sha256::digest(snapshot))}));}
  let begin=Instant::now();let final_checkpoint=state.checkpoint().unwrap();drop(state);drop(final_checkpoint);measurements.push(json!({"round":round,"phase":"teardown","calls":1,"ns":begin.elapsed().as_nanos().to_string()}));
 }
 println!("{}",json!({"rows":rows,"calls":calls,"measurements":measurements}));
}
