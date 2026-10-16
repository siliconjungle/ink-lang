mod baseline;
mod projected;
mod selected;
use std::{hint::black_box,time::Instant};
use serde_json::{json,Value};
macro_rules! measure {
 ($name:ident,$module:ident) => {
 fn $name(count:usize,seed:u32)->Vec<Value>{
  let inputs=(0..16).map(|i|vec![((i as f64-8.0+seed as f64/16.0)/17.0)as f32]).collect::<Vec<_>>();
  let weights=(0..16).map(|i|vec![(0.03125+i as f64/4096.0)as f32,(0.999-i as f64/32768.0)as f32]).collect::<Vec<_>>();
  let mut records=vec![];
  for stride in [0,8,1]{
   let start=Instant::now();let mut state=$module::State::new();state.invoke_l_retune(weights[0].clone()).unwrap();let initialization_ms=start.elapsed().as_secs_f64()*1000.0;
   let mut run=|n:usize|{
    let mut checksum=0.0f64;
    for i in 0..n{
     if stride!=0&&i%stride==0{state.invoke_l_retune(black_box(&weights[(i>>3)&15]).clone()).unwrap();}
     let result=state.invoke_l_serve(black_box(&inputs[i&15]).clone()).unwrap();
     for value in black_box(result.result){checksum+=value as f64;}
    }
    black_box(checksum)
   };
   run(10000);let start=Instant::now();let checksum=run(count);let seconds=start.elapsed().as_secs_f64();drop(run);
   let snapshot=state.checkpoint().unwrap().iter().map(|b|format!("{b:02x}")).collect::<String>();
   records.push(json!({"stride":stride,"count":count,"seconds":seconds,"checksum":checksum,"snapshot":snapshot,"initialization_ms":initialization_ms}));
  }
  records
 }
 }
}
measure!(run_baseline,baseline);
measure!(run_projected,projected);
measure!(run_selected,selected);
fn main(){
 let args=std::env::args().collect::<Vec<_>>();let count=args.get(2).map(|s|s.parse().unwrap()).unwrap_or(250000);let seed=args.get(3).map(|s|s.parse().unwrap()).unwrap_or(1);
 let records=match args[1].as_str(){"baseline"=>run_baseline(count,seed),"projected"=>run_projected(count,seed),"selected"=>run_selected(count,seed),_=>panic!("variant")};
 println!("{}",json!({"schema":1,"variant":args[1],"count":count,"seed":seed,"records":records,"scope":"Native Rust typed state calls; complete results consumed; checkpoint after each workload"}));
}
