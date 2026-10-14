#[path="../lib.rs"]mod emitted;
use emitted::{State,Wire,CHANGE_TYPE};
use diamond_types::list::ListOpLog;
use serde_json::{Value,json};
NATIVE_ADAPTER
fn main(){
 let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let kernel=State::new();let mut rows=vec![];
 for case in cases{
  let raw=case["changes"].as_array().unwrap();let upstream=native::prepare(raw);let changes:Vec<CHANGE_TYPE>=Wire::from_json(&case["changes"]).unwrap();let mut complete=ListOpLog::new();native::apply(&mut complete,&upstream);let want=native::text(&complete);
  if let Some(expected)=case["expected"].as_array(){assert_eq!(want,expected.iter().map(|v|v.as_u64().unwrap()as u32).collect::<Vec<_>>());}
  let mut splits=vec![0,1.min(changes.len()),changes.len()/2,changes.len()];splits.sort_unstable();splits.dedup();
  for split in splits{
   let mut oracle=ListOpLog::new();native::apply(&mut oracle,&upstream[..split]);let before=native::text(&oracle);
   let document=kernel.function_l_merge(kernel.function_l_empty(),changes[..split].to_vec()).unwrap();assert_eq!(kernel.function_l_visible(document.clone()).unwrap(),before,"{} initial {split}",case["name"]);
   let words=kernel.function_l_save(document).unwrap();let restored=kernel.function_l_load(words.clone()).unwrap();assert_eq!(kernel.function_l_visible(restored.clone()).unwrap(),before);assert_eq!(kernel.function_l_save(restored.clone()).unwrap(),words);
   let document=kernel.function_l_merge(restored,changes[split..].to_vec()).unwrap();assert_eq!(kernel.function_l_visible(document.clone()).unwrap(),want,"{} final {split}",case["name"]);
   assert_eq!(kernel.function_l_merge(document.clone(),changes.clone()).unwrap(),document,"{} duplicate {split}",case["name"]);
   let words=kernel.function_l_save(document).unwrap();let restored=kernel.function_l_load(words.clone()).unwrap();assert_eq!(kernel.function_l_visible(restored.clone()).unwrap(),want);assert_eq!(kernel.function_l_save(restored).unwrap(),words);
   rows.push(json!({"case":case["name"],"split":split,"output":want,"operation_log_words":words.len()}));
  }
 }
 println!("{}",json!({"status":"passed","results":rows}));
}
