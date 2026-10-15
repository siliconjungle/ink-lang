use compiled_state::State;
use serde_json::{Value,json};
use std::{hint::black_box,time::Instant};
fn consume(xs:&[u32])->u32{xs.iter().fold(0u32,|h,x|h.wrapping_mul(31)^x)}
fn main(){
 let all:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let texts=all["texts"].as_array().unwrap().iter().map(|x|x.as_str().unwrap().to_owned()).collect::<Vec<_>>();
 let state=State::new();let mut sink=0;let mut rows=vec![];
 for case in all["cases"].as_array().unwrap(){
  let pattern=case["pattern"].as_str().unwrap();let want=case["expected"].as_array().unwrap().iter().map(|n|n.as_u64().unwrap()as u32).collect::<Vec<_>>();
  let invoke=|ink|if ink{state.function_l_counts(black_box(&texts).clone(),black_box(pattern).to_owned())}else{black_box(&texts).iter().map(|s|s.match_indices(black_box(pattern)).count()as u32).collect::<Vec<_>>()};
  for ink in [false,true]{let values=invoke(ink);assert_eq!(values,want);sink^=consume(&values);}
  let mut a=vec![];let mut b=vec![];
  for round in 0..11{for ink in if round%2==0{[true,false]}else{[false,true]}{let t=Instant::now();let result=invoke(ink);sink^=black_box(consume(&result));let ns=t.elapsed().as_nanos();assert_eq!(result,want);if ink{a.push(ns);}else{b.push(ns);}}}
  rows.push(json!({"pattern":pattern,"ink_owning_ns":a,"handwritten_borrowed_ns":b,"digest":consume(&want)}));
 }
 println!("{}",json!({"rows":rows,"sink":black_box(sink),"documents":texts.len()}));
}
