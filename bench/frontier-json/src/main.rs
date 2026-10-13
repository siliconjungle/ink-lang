use serde_json::{Value,json};
use std::{hint::black_box,time::Instant,io::{self,BufRead,Write}};
fn carrier(row:&Value)->Value {let mut row=row.clone();row["metadata"]=ink_abi::json_value::parse(&row["metadata"].to_string(),Default::default()).unwrap().to_ink();row}
fn hash(h:u32,version:u64,result:u32,committed:bool,events:u32)->u32 {h.wrapping_mul(1664525).wrapping_add(version as u32).wrapping_add(result).wrapping_add(if committed{65537}else{0}).wrapping_add(events)}
macro_rules! backend {
 ($name:ident,$backend:ident)=>{mod $name {
 use super::*;use $backend::{State,Wire,l_Row};
 enum Step{Put(String,l_Row,bool),Erase(String,bool),Total}
 pub fn run(f:&Value,repeats:usize,capture:bool)->Value{
  let started=Instant::now();let mut state=State::new();
  for (k,row) in f["initial"].as_object().unwrap(){state.invoke_view_l_put(k.clone(),l_Row::from_json(&carrier(row)).unwrap(),false).unwrap();state.acknowledge_through(u64::MAX,u64::MAX);}
  let steps=f["script"].as_array().unwrap().iter().map(|s|{let a=&s["args"];match s["call"].as_str().unwrap(){"put"=>Step::Put(a[0].as_str().unwrap().into(),l_Row::from_json(&carrier(&a[1])).unwrap(),a[2].as_bool().unwrap()),"erase"=>Step::Erase(a[0].as_str().unwrap().into(),a[1].as_bool().unwrap()),"total"=>Step::Total,_=>panic!("unknown step")}}).collect::<Vec<_>>();
  let initialise_ns=started.elapsed().as_nanos();let initial=if capture{Some(state.checkpoint().unwrap())}else{None};
  let mut checksum=0;let mut replies=vec![];let start=Instant::now();
  for _ in 0..repeats{for step in &steps{
   macro_rules! consume {($r:expr,$result:expr)=>{{let r=$r;let events=r.events.iter().fold(0u32,|n,e|{let $backend::EventData::l_seen(v)=e.data;n.wrapping_add(v).wrapping_add(e.commit as u32).wrapping_add(e.position as u32)});checksum=hash(checksum,r.version,$result(&r.result),r.committed,events);if capture{replies.push(r.to_json());}}}}
   match step{
    Step::Put(k,row,fail)=>consume!(state.invoke_view_l_put(black_box(k.clone()),black_box(row.clone()),black_box(*fail)).unwrap(),|r:&Result<(),$backend::l_Error>|if r.is_err(){0xbad}else{0}),
    Step::Erase(k,fail)=>consume!(state.invoke_view_l_erase(black_box(k.clone()),black_box(*fail)).unwrap(),|r:&Result<(),$backend::l_Error>|if r.is_err(){0xbad}else{0}),
    Step::Total=>consume!(state.invoke_view_l_total().unwrap(),|r:&u32|*r),
   }
   state.acknowledge_through(u64::MAX,u64::MAX);
  }}
  let elapsed_ns=start.elapsed().as_nanos();black_box(checksum);
  let after=if capture{Some(state.checkpoint().unwrap())}else{None};
  let logical_total=f["initial"].as_object().unwrap().values().filter(|r|r["active"].as_bool().unwrap()).fold(0u32,|n,r|n.wrapping_add(r["value"].as_u64().unwrap()as u32));
  assert_eq!(state.invoke_view_l_total().unwrap().result,logical_total);
  assert!(state.outbox().is_empty());
  // Captured preflight runs compare complete portable state across all backends.
  // Timed runs check every reply checksum, final version, total and drained events.
  json!({"elapsed_ns":elapsed_ns.to_string(),"initialise_ns":initialise_ns.to_string(),"checksum":checksum,"version":state.version(),"replies":replies,"snapshot":after,"initial_snapshot":initial})
 }
 }};
}
backend!(ordinary,ordered);backend!(borrowed,ordered_borrow);backend!(slots,indexed);backend!(slots_borrowed,indexed_borrow);
fn main(){
 let fixtures:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 for line in io::stdin().lock().lines(){let request:Value=serde_json::from_str(&line.unwrap()).unwrap();let f=&fixtures[request["fixture"].as_u64().unwrap()as usize];let n=request["repeats"].as_u64().unwrap()as usize;let capture=request["capture"].as_bool().unwrap();let result=match request["lane"].as_str().unwrap(){"ink-rust-ordered"=>ordinary::run(f,n,capture),"ink-rust-borrow"=>borrowed::run(f,n,capture),"ink-rust-indexed"=>slots::run(f,n,capture),"ink-rust-indexed-borrow"=>slots_borrowed::run(f,n,capture),_=>panic!("unknown backend")};println!("{}",result);io::stdout().flush().unwrap();}
}
