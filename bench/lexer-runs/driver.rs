use std::{hint::black_box,time::Instant};

#[inline(never)]
fn control(xs:Vec<u32>)->Vec<Token>{
 let mut out=Vec::new();let mut i=0;
 let alpha=|v:u32|v==95||(65..=90).contains(&v)||(97..=122).contains(&v);
 let digit=|v:u32|(48..=57).contains(&v);
 while i<xs.len(){let c=xs[i];if [9,10,13,32].contains(&c){i+=1;continue;}
  let start=i;let kind=if alpha(c){1}else if digit(c){2}else{3};i+=1;
  while i<xs.len() && (kind==1&&(alpha(xs[i])||digit(xs[i]))||kind==2&&digit(xs[i])){i+=1;}
  out.push(Token{l_start:start as u32,l_end:i as u32,l_kind:kind});
 }out
}
fn measure(f:&dyn Fn()->Vec<Token>,reps:usize)->f64{
 let start=Instant::now();for _ in 0..reps{drop(black_box(f()));}start.elapsed().as_nanos()as f64/reps as f64
}
fn main(){
 let state=State::new();let mut seed=104729u32;
 for n in [16,1024,16384,65536] {for pattern in 0..6 {
  let xs:Vec<u32>=(0..n).map(|i|match pattern{
   0=>b"let item_17 = 123 + other;\n"[i%26] as u32,
   1=>b"identifier_123"[i%14] as u32,
   2=>b"0123456789"[i%10] as u32,
   3=>b"+;=(){}-*/"[i%10] as u32,
   4=>b" \t\n\r"[i%4] as u32,
   _=>{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);seed%128},
  }).collect();
  let baseline=||state.function_l_baseline(black_box(xs.clone()));
  let runs=||state.function_l_runs(black_box(xs.clone()));
  let rust=||control(black_box(xs.clone()));
  let functions:[&dyn Fn()->Vec<Token>;3]=[&baseline,&runs,&rust];
  let expected=rust();for f in functions {assert_eq!(f(),expected);for _ in 0..3{drop(black_box(f()));}}
  let calibration=functions.iter().map(|f|measure(*f,1)).fold(0.0,f64::max);
  let reps=(2_000_000.0/calibration).clamp(1.0,1000.0)as usize;
  let mut samples=[vec![],vec![],vec![]];
  // Four complete rotations; every implementation occupies every position.
  for round in 0..12 {for offset in 0..3 {let index=(round+offset)%3;samples[index].push(measure(functions[index],reps));}}
  for f in functions{assert_eq!(f(),expected);}
  println!("{}",serde_json::json!({"n":n,"pattern":pattern,"output_tokens":expected.len(),"repetitions":reps,"samples_ns":samples,"validated":true}));
 }}
}
