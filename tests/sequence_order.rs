use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn stable_position_comparisons_match_flat_order_and_preserve_images(){
 let path="examples/libraries/sequence_order_observers.ink";let program=modules::load(path).unwrap().program;let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0usize,1,8,70,257,2050]{
  let entries:Vec<_>=(0..n).map(|i|json!({"value":i+1,"extent":3,"weight":if i%3==0{0}else{3},"weight2":if i%7==0{3}else{0}})).collect();let mut queries=vec![];let mut results=vec![];
  let mut seed=971u32;for i in 0..160{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let left=seed as usize%(n+2);seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let right=if i%4==0{left}else{seed as usize%(n+2)};let a=seed%3;let b=seed.rotate_left(13)%3;let valid=left!=0&&right!=0&&left<=n&&right<=n;let order=if !valid{0}else{match(left,a).cmp(&(right,b)){std::cmp::Ordering::Less=>-1,std::cmp::Ordering::Equal=>0,std::cmp::Ordering::Greater=>1}};queries.push(json!({"left":left,"left_offset":a,"right":right,"right_offset":b}));results.push(json!({"order":order,"valid":valid}));}
  let args=json!([entries,queries]);let f=program.functions.iter().find(|f|f.name=="probe").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let got=eval::call(&program,"probe",values,&mut 100_000_000).unwrap().json();assert_eq!(got,json!({"results":results,"unchanged":true}),"count {n}");steps.push(json!({"pure":"probe","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":got},"snapshot":snapshot}));
 }
 parity::conformance("sequence-order-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
#[test]
fn edited_sequences_compare_order_rather_than_allocation_ids(){
 let path="examples/libraries/sequence_order_observers.ink";let program=modules::load(path).unwrap().program;let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [8usize,33,2050]{
  let entries:Vec<_>=(0..n).map(|i|json!({"value":i+1,"extent":3,"weight":3,"weight2":3})).collect();let mut order=(1..=n).collect::<Vec<_>>();let mut edits=vec![];let mut seed=719u32;
  for i in 0..80{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let index=seed as usize%(order.len()+1);let before=order.get(index).copied().unwrap_or(0);let id=n+i+1;edits.push(json!({"before":before,"value":id}));order.insert(index,id);}
  let mut queries=vec![];let mut results=vec![];for i in 0..160{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let a=seed as usize%order.len();seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);let b=if i%4==0{a}else{seed as usize%order.len()};let left=order[a];let right=order[b];let x=seed%3;let y=seed.rotate_left(11)%3;let comparison=match(a,x).cmp(&(b,y)){std::cmp::Ordering::Less=>-1,std::cmp::Ordering::Equal=>0,std::cmp::Ordering::Greater=>1};queries.push(json!({"left":left,"left_offset":x,"right":right,"right_offset":y}));results.push(json!({"order":comparison,"valid":true}));}
  let args=json!([entries,edits,queries]);let f=program.functions.iter().find(|f|f.name=="edited").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();let got=eval::call(&program,"edited",values,&mut 100_000_000).unwrap().json();assert_eq!(got,json!({"results":results,"unchanged":true}),"count {n}");steps.push(json!({"pure":"edited","args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":got},"snapshot":snapshot}));
 }
 parity::conformance("sequence-order-edited-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
