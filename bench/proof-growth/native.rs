// Appended to generated Rust. Owned argument capture and full result consumption
// are charged per call. Input generation and module construction are outside.
thread_local! {
 static BENCH:std::cell::RefCell<Option<(State,Vec<l_Node>,Vec<l_Particle>,Vec<u32>)>>=const{std::cell::RefCell::new(None)};
}
#[no_mangle]
pub extern "C" fn bench_prepare(size:u32,distribution:u32) {
 let xs=(0..size).map(|i|{let target=if distribution==0{0}else if distribution==1{size-1}else{u32::MAX};l_Node{
  l_key:i.wrapping_add(17).wrapping_mul(1664525).wrapping_add(1013904223)>>23,
  l_flag:i==target,l_label:if i==target{"雪😀".into()}else{format!("node-{i}")},l_weight:((i%127)as f32-63.0)/8.0
 }}).collect::<Vec<_>>();
 let particles=xs.iter().enumerate().map(|(i,x)|l_Particle{l_x:((i%123)as f32-60.0)/4.0,l_y:((i%271)as f32-130.0)/8.0,l_mass:(i%17)as f32,l_alive:i%7!=0,l_label:x.l_label.clone()}).collect();
 let numeric=xs.iter().map(|x|x.l_key).collect();
 BENCH.with(|slot|*slot.borrow_mut()=Some((State::new(),xs,particles,numeric)));
}
fn bench_once(task:u32,state:&State,xs:&[l_Node],particles:&[l_Particle],numeric:&[u32])->u64 {
 let hash=|s:String|s.bytes().fold(0u64,|h,c|h.wrapping_mul(31)^(c as u64));
 match task {
  0=>state.function_l_helper_pipeline(std::hint::black_box(xs.to_vec()),16)as u64,
  1=>state.function_l_drawing_layers(std::hint::black_box(xs.to_vec()),16)as u64,
  2=>state.function_l_mapped_left(std::hint::black_box(xs.to_vec()),16)as u64,
  3=>state.function_l_checksum(std::hint::black_box(xs.to_vec()))as u64,
  4=>hash(state.function_l_first_label(std::hint::black_box(xs.to_vec()),16)),
  5=>state.function_l_first_value(std::hint::black_box(xs.to_vec()),16).to_bits()as u64,
  6=>state.function_l_any_visible(std::hint::black_box(xs.to_vec()),16)as u64,
  7=>state.function_l_chained(std::hint::black_box(xs.to_vec()),16)as u64,
  8=>state.function_l_numeric_left(std::hint::black_box(numeric.to_vec()))as u64,
  9=>{let b=state.function_l_particle_bounds(std::hint::black_box(particles.to_vec()));[b.l_min_x,b.l_max_x,b.l_min_y,b.l_max_y].iter().fold(0u64,|h,x|h.wrapping_mul(31)^(x.to_bits()as u64))},
  _=>panic!("unknown benchmark task")
 }
}
#[no_mangle]
pub extern "C" fn bench_run(task:u32,iterations:u32)->u64 {
 BENCH.with(|slot|{let data=slot.borrow();let(state,xs,particles,numeric)=data.as_ref().unwrap();let mut result=0u64;
  for _ in 0..iterations{result=result.wrapping_add(std::hint::black_box(bench_once(task,state,xs,particles,numeric)));}result})
}
