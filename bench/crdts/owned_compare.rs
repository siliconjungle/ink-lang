#[path="../lib.rs"]mod emitted;
#[path="../control.rs"]mod control;
use emitted::{State,Wire,CHANGE_TYPE};
use diamond_types::list::{ListOpLog,ListCRDT};
use serde_json::{Value,json};
use std::{hint::black_box,time::Instant};
NATIVE_ADAPTER
fn main(){
 let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let rounds:usize=std::env::var("INK_LIFECYCLE_ROUNDS").unwrap().parse().unwrap();
 let chunk:usize=std::env::var("INK_LIFECYCLE_CHUNK").unwrap().parse().unwrap();
 let kernel=State::new();
 for case in cases{
  let raw=case["changes"].as_array().unwrap();let upstream=native::prepare(raw);
  let changes:Vec<CHANGE_TYPE>=Wire::from_json(&case["changes"]).unwrap();
  let control_changes:Vec<control::CONTROL_CHANGE_TYPE>=control::Wire::from_json(&case["changes"]).unwrap();
  let split=changes.len()/2;let base=kernel.function_l_merge(kernel.function_l_empty(),changes[..split].to_vec()).unwrap();
  let mut reference=control::State::new();assert!(reference.invoke_l_merge(control_changes[..split].to_vec()).unwrap().committed);
  let control_bytes=reference.checkpoint().unwrap();
  let mut log=ListOpLog::new();native::apply(&mut log,&upstream[..split]);let dt_bytes=log.encode(&diamond_types::list::encoding::ENCODE_FULL);
  assert_eq!(kernel.function_l_visible(base.clone()).unwrap().into_iter().collect::<Vec<_>>(),native::text(&log));
  let mut oracle=ListOpLog::new();native::apply(&mut oracle,&upstream);let want=native::text(&oracle);
  if let Some(expected)=case["expected"].as_array(){assert_eq!(want,expected.iter().map(|v|v.as_u64().unwrap()as u32).collect::<Vec<_>>());}
  let names=["ink_owned_document","diamond_types_document","ink_transactional_control"];
  let mut samples=vec![vec![];3];
  for round in 0..rounds+2{for offset in 0..3{let variant=(round+offset)%3;
   if variant==0{
    let mut document=base.clone();let inputs:Vec<_>=changes[split..].chunks(chunk).map(|c|c.to_vec()).collect();
    let start=Instant::now();for input in inputs{document=black_box(kernel.function_l_merge(black_box(document),black_box(input)).unwrap());}
    let ns=start.elapsed().as_nanos()as u64;if round>=2{samples[0].push(ns);}
    assert_eq!(kernel.function_l_visible(document.clone()).unwrap().into_iter().collect::<Vec<_>>(),want);
    assert_eq!(kernel.function_l_merge(document.clone(),changes[split..].to_vec()).unwrap(),document);
   }else if variant==1{
    let mut document=ListCRDT::load_from(&dt_bytes).unwrap();
    let start=Instant::now();for input in upstream[split..].chunks(chunk){native::apply(&mut document.oplog,black_box(input));document.branch.merge(&document.oplog,document.oplog.cg.version.as_ref());}
    let ns=start.elapsed().as_nanos()as u64;if round>=2{samples[1].push(ns);}
    assert_eq!(document.branch.content().to_string().chars().map(|c|c as u32).collect::<Vec<_>>(),want);
   }else{
    let mut state=control::State::restore(&control_bytes).unwrap();let inputs:Vec<_>=control_changes[split..].chunks(chunk).map(|c|c.to_vec()).collect();
    let start=Instant::now();for input in inputs{let outcome=state.invoke_l_merge(black_box(input)).unwrap();assert!(outcome.committed);drop(black_box(outcome));}
    let ns=start.elapsed().as_nanos()as u64;if round>=2{samples[2].push(ns);}
    assert_eq!(state.invoke_l_visible().unwrap().result.unwrap().into_iter().collect::<Vec<_>>(),want);
   }
  }}
  for variant in 0..3{println!("{}",json!({"case":case["name"],"variant":names[variant],"retained_batches":split,"merged_batches":changes.len()-split,"merge_samples_ns":samples[variant],"output_codepoints":want.len()}));}
 }
}
