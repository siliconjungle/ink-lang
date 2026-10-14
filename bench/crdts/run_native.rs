use compiled_state::{State, Wire, EDIT_TYPE};
use diamond_types::list::ListCRDT;
use serde_json::{json,Value};
use std::{hint::black_box,time::Instant};

#[derive(Clone)]
struct Edit {pos:usize,delete:usize,insert:String}
fn diamond(edits:&[Edit])->Vec<u32> {
 let mut doc=ListCRDT::new();let agent=doc.get_or_create_agent_id("a");
 for e in edits {
  if e.delete!=0 {doc.delete_without_content(agent,e.pos..e.pos+e.delete);}
  if !e.insert.is_empty(){doc.insert(agent,e.pos,&e.insert);}
 }
 doc.branch.content().to_string().chars().map(|x|x as u32).collect()
}
fn main(){
 let cases:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let state=State::new();
 for case in cases.as_array().unwrap(){
  let edits:Vec<EDIT_TYPE>=Wire::from_json(&case["edits"]).unwrap();
  let upstream:Vec<Edit>=case["edits"].as_array().unwrap().iter().map(|e|Edit{
   pos:e["position"].as_u64().unwrap() as usize,delete:e["remove"].as_u64().unwrap() as usize,
   insert:e["text"].as_array().unwrap().iter().map(|x|char::from_u32(x.as_u64().unwrap() as u32).unwrap()).collect()}).collect();
  let expected:Vec<u32>=case["expected"].as_array().unwrap().iter().map(|x|x.as_u64().unwrap() as u32).collect();
  assert_eq!(diamond(&upstream),expected,"DT {}",case["name"]);
  for mode in 0..4{
   assert_eq!(state.function_l_local_text(edits.clone(),mode).unwrap(),expected,"Ink {} mode {}",case["name"],mode);
  }
  let mut samples=vec![Vec::<u64>::new();5];
  // Same complete editing and text-materialisation phases, interleaved order.
  for round in 0..13 {for i in 0..5{
   let variant=(i+round)%5;
   if variant==4{let t=Instant::now();let out=diamond(black_box(&upstream));let ns=t.elapsed().as_nanos() as u64;black_box(out);if round>=2{samples[variant].push(ns);}}
   else{let input=edits.clone();let t=Instant::now();let out=state.function_l_local_text(black_box(input),variant as u32).unwrap();let ns=t.elapsed().as_nanos() as u64;black_box(out);if round>=2{samples[variant].push(ns);}}
  }}
  for variant in 0..5{let name=["ink_run_fuguemax","ink_run_yata","ink_run_rga","ink_run_fugue","diamond_types"][variant];println!("{}",json!({"case":case["name"],"variant":name,"edits":edits.len(),"output_codepoints":expected.len(),"samples_ns":samples[variant]}));}
 }
}
