use compiled_state::State;
use std::{cmp::Reverse,collections::BinaryHeap,hint::black_box,time::{Duration,Instant}};
fn reference(xs:Vec<u32>)->Vec<u32>{
    let mut heap=BinaryHeap::new();for (i,v) in xs.into_iter().enumerate(){heap.push(Reverse((v,i as u32)));}
    let mut out=vec![];while let Some(Reverse((v,_)))=heap.pop(){out.push(v);}out
}
fn measure(which:usize,xs:&[u32],reps:usize)->f64{
    let start=Instant::now();let mut state=State::new();
    for _ in 0..reps {let input=black_box(xs.to_vec());let value=match which {0=>state.function_l_heap_sorted(input),1=>state.function_l_linear_sorted(input),_=>reference(input)};black_box(value);}
    start.elapsed().as_nanos() as f64 / reps as f64
}
fn main(){
    let mut seed=0x12345678u32;let mut results=vec![];
    for n in [256,1024,4096,16384] {
        let xs=(0..n).map(|_|{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);seed}).collect::<Vec<_>>();
        let mut expected=xs.clone();expected.sort();let mut state=State::new();
        assert_eq!(state.function_l_heap_sorted(xs.clone()),expected);assert_eq!(state.function_l_linear_sorted(xs.clone()),expected);assert_eq!(reference(xs.clone()),expected);
        let mut samples:[Vec<f64>;3]=std::array::from_fn(|_|vec![]);
        let reps:[usize;3]=std::array::from_fn(|k|{let one=measure(k,&xs,2);((Duration::from_millis(100).as_nanos() as f64/one) as usize).clamp(1,2000)});
        for round in 0..9 {for offset in 0..3 {let k=(round+offset)%3;samples[k].push(measure(k,&xs,reps[k]));}}
        let medians:[f64;3]=std::array::from_fn(|k|{let mut s=samples[k].clone();s.sort_by(f64::total_cmp);s[4]});
        results.push(serde_json::json!({"n":n,"repetitions":reps,"samples_ns":samples,"median_ns":medians,"linear_over_heap":medians[1]/medians[0],"ink_over_std_heap":medians[0]/medians[2]}));
    }
    println!("{}",serde_json::to_string_pretty(&results).unwrap());
}
