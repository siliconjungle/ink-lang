use std::{hint::black_box,time::Instant};

#[inline(never)]
fn control(a:Vec<u32>,b:Vec<u32>,side:u32)->Vec<u32>{
 let mut out=Vec::new();
 for i in 0..side{for j in 0..side{let mut sum=0u32;
  for k in 0..side{sum=sum.wrapping_add(a.get(i.wrapping_mul(side).wrapping_add(k)as usize).copied().unwrap_or(0).wrapping_mul(b.get(k.wrapping_mul(side).wrapping_add(j)as usize).copied().unwrap_or(0)));}
  assert!(out.len()<u32::MAX as usize,"buffer length exhausted");out.push(sum);
 }}out
}
#[inline(never)]
fn control_tiled(a:Vec<u32>,b:Vec<u32>,side:u32)->Vec<u32>{
 let mut out=Vec::new();
 for i in 0..side{for j in (0..side).step_by(4){let mut sum=[0u32;4];
  for k in 0..side{let x=a.get(i.wrapping_mul(side).wrapping_add(k)as usize).copied().unwrap_or(0);let base=k.wrapping_mul(side).wrapping_add(j);
   for lane in 0..4{sum[lane]=sum[lane].wrapping_add(x.wrapping_mul(b.get(base.wrapping_add(lane as u32)as usize).copied().unwrap_or(0)));}
  }
  for lane in 0..4{if j.wrapping_add(lane as u32)<side{assert!(out.len()<u32::MAX as usize,"buffer length exhausted");out.push(sum[lane]);}}
 }}out
}
fn measure(f:&dyn Fn()->Vec<u32>,reps:usize)->f64{
 let start=Instant::now();for _ in 0..reps{drop(black_box(f()));}start.elapsed().as_nanos()as f64/reps as f64
}
fn main(){
 let state=State::new();
 for side in [0u32,1,3,4,7,16,31,32,64,127,128] {for short in [false,true] {
  let n=side as usize;let mut a:Vec<u32>=(0..n*n).map(|i|(i as u32).wrapping_mul(0xfffffff1).wrapping_add(3)).collect();
  let mut b:Vec<u32>=(0..n*n).map(|i|(i as u32).wrapping_mul(65537).wrapping_add(u32::MAX)).collect();
  if short{a.truncate(a.len().saturating_sub(2));b.truncate(b.len().saturating_sub(3));}
  let baseline=||state.function_l_baseline(black_box(a.clone()),black_box(b.clone()),black_box(side));
  let tiled=||state.function_l_tiled(black_box(a.clone()),black_box(b.clone()),black_box(side));
  let rust=||control(black_box(a.clone()),black_box(b.clone()),black_box(side));
  let rust_tiled=||control_tiled(black_box(a.clone()),black_box(b.clone()),black_box(side));
  let functions:[&dyn Fn()->Vec<u32>;4]=[&baseline,&tiled,&rust,&rust_tiled];
  let expected=rust();for f in functions{assert_eq!(f(),expected);for _ in 0..3{drop(black_box(f()));}}
  let calibration=functions.iter().map(|f|measure(*f,1)).fold(0.0,f64::max);
  let reps=(2_000_000.0/calibration).clamp(1.0,1000.0)as usize;
  let mut samples=[vec![],vec![],vec![],vec![]];
  for round in 0..12{for offset in 0..4{let index=(round+offset)%4;samples[index].push(measure(functions[index],reps));}}
  for f in functions{assert_eq!(f(),expected);}
  println!("{}",serde_json::json!({"side":side,"short":short,"output_len":expected.len(),"repetitions":reps,"samples_ns":samples,"validated":true}));
 }}
}
