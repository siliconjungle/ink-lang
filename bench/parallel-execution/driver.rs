use std::{hint::black_box,time::Instant};
fn measure(which:usize,xs:&[u32],reps:usize)->f64{
 let state=compiled_state::State::new();let start=Instant::now();
 for _ in 0..reps{
  let input=black_box(xs.to_vec());
  let output=if which==0{state.function_l_sequential(input)}else{state.function_l_parallel(input)};
  black_box(output);
 }
 start.elapsed().as_nanos() as f64/reps as f64
}
fn main(){
 let state=compiled_state::State::new();let mut results=vec![];
 for n in [64u32,4096,65536]{
  let xs=(0..n).map(|i|i.wrapping_mul(2654435761)).collect::<Vec<_>>();
  let oracle=xs.iter().map(|&x|{let mut a=x;for i in 0..1024{a=a.wrapping_mul(1664525).wrapping_add(1013904223).wrapping_add(i);}a}).collect::<Vec<_>>();
  assert_eq!(state.function_l_sequential(xs.clone()),oracle);assert_eq!(state.function_l_parallel(xs.clone()),oracle);
  assert_eq!(state.function_l_partitioned(xs.clone(),n/2),oracle);
  let reps:[usize;2]=std::array::from_fn(|k|{measure(k,&xs,2);(30_000_000.0/measure(k,&xs,2))as usize}.clamp(1,200));
  let mut samples:[Vec<f64>;2]=std::array::from_fn(|_|vec![]);
  for r in 0..9{for off in 0..2{let k=(r+off)%2;samples[k].push(measure(k,&xs,reps[k]));}}
  let median:[f64;2]=std::array::from_fn(|k|{let mut s=samples[k].clone();s.sort_by(f64::total_cmp);s[4]});
  results.push(serde_json::json!({"n":n,"repetitions":reps,"samples_ns":samples,"median_ns":median,"sequential_over_parallel":median[0]/median[1]}));
 }
 println!("{}",serde_json::to_string(&results).unwrap());
}
