//! Use the exact emitted Rust methods; parsing/fixture creation stays untimed.
use compiled_state::{State, l_Edit, l_Row, l_RowEdit};
use serde_json::{json, Value};
use std::{hint::black_box, time::Instant};

trait Digest { fn digest(&self) -> u32; }
fn mix(h:u32, x:u32)->u32 {(h^x).wrapping_mul(16777619)}
impl Digest for Vec<u32> {fn digest(&self)->u32{self.iter().fold(2166136261,|h,x|mix(h,*x))}}
impl Digest for Vec<l_Edit> {fn digest(&self)->u32{self.iter().fold(2166136261,|h,x|mix(mix(h,x.l_index),x.l_value))}}
impl Digest for Vec<l_Row> {fn digest(&self)->u32{self.iter().fold(2166136261,|h,x|[x.l_id,x.l_x,x.l_y,x.l_score,x.l_flags].into_iter().fold(h,mix))}}
impl Digest for Vec<l_RowEdit> {fn digest(&self)->u32{self.iter().fold(2166136261,|h,x|[x.l_index,x.l_id,x.l_x,x.l_y,x.l_score,x.l_flags].into_iter().fold(h,mix))}}
fn measured<T:Digest+PartialEq+std::fmt::Debug>(id:&str, phase:&str, expected:&T, mut run:impl FnMut()->T){
    assert_eq!(run(),*expected);
    for _ in 0..3 {black_box(run());}
    let batch=|n:usize,run:&mut dyn FnMut()->T| {
        let mut digest=0u32;let t=Instant::now();
        for _ in 0..n {digest=digest.wrapping_add(black_box(run()).digest());}
        let elapsed=t.elapsed().as_secs_f64()*1e9;
        assert_eq!(digest,expected.digest().wrapping_mul(n as u32));(elapsed,digest)
    };
    let mut iterations=1;
    loop {let (elapsed,_)=batch(iterations,&mut run);if elapsed>=10_000_000.0||iterations>=4096{break}iterations*=2;}
    for round in 0..7 {
        let (elapsed,digest)=batch(iterations,&mut run);
        assert_eq!(run(),*expected);
        println!("{}",json!({"case":id,"phase":phase,"variant":"ink-rust","round":round,"iterations":iterations,"elapsed_ns":elapsed,"ns_per_call":elapsed/iterations as f64,"digest":digest,"boundary":"typed-owned-inputs-and-output; input Vec clones included; JSON outside timer"}));
    }
}
fn row(v:&Value)->l_Row {l_Row{l_id:v["id"].as_u64().unwrap() as u32,l_x:v["x"].as_u64().unwrap() as u32,l_y:v["y"].as_u64().unwrap() as u32,l_score:v["score"].as_u64().unwrap() as u32,l_flags:v["flags"].as_u64().unwrap() as u32}}
fn main(){
    let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
    let state=State::new();
    for c in cases {
        let id=c["id"].as_str().unwrap();let dirty:Vec<u32>=serde_json::from_value(c["dirty"].clone()).unwrap();
        if c["kind"]=="scalar" {
            let before:Vec<u32>=serde_json::from_value(c["before"].clone()).unwrap();let after:Vec<u32>=serde_json::from_value(c["after"].clone()).unwrap();
            let edits:Vec<l_Edit>=c["edits"].as_array().unwrap().iter().map(|e|l_Edit{l_index:e["index"].as_u64().unwrap()as u32,l_value:e["value"].as_u64().unwrap()as u32}).collect();
            measured(id,"diff",&edits,||state.function_l_scalar_diff(black_box(before.clone()),black_box(after.clone())));
            measured(id,"hint",&edits,||state.function_l_scalar_hint(black_box(before.clone()),black_box(after.clone()),black_box(dirty.clone())));
            measured(id,"apply",&after,||state.function_l_scalar_apply(black_box(before.clone()),black_box(edits.clone())));
            measured(id,"roundtrip",&after,||{let edits=state.function_l_scalar_diff(black_box(before.clone()),black_box(after.clone()));state.function_l_scalar_apply(before.clone(),edits)});
            measured(id,"final-state",&after,||state.function_l_scalar_final(black_box(before.clone()),black_box(after.clone())));
            if edits.len()<=256 {measured(id,"apply-probe",&after,||state.function_l_scalar_apply_probe(black_box(before.clone()),black_box(edits.clone())));}
        }else{
            let before:Vec<l_Row>=c["before"].as_array().unwrap().iter().map(row).collect();let after:Vec<l_Row>=c["after"].as_array().unwrap().iter().map(row).collect();
            let edits:Vec<l_RowEdit>=c["edits"].as_array().unwrap().iter().map(|v|{let r=row(v);l_RowEdit{l_index:v["index"].as_u64().unwrap()as u32,l_id:r.l_id,l_x:r.l_x,l_y:r.l_y,l_score:r.l_score,l_flags:r.l_flags}}).collect();
            measured(id,"diff",&edits,||state.function_l_rows_diff(black_box(before.clone()),black_box(after.clone())));
            measured(id,"hint",&edits,||state.function_l_rows_hint(black_box(before.clone()),black_box(after.clone()),black_box(dirty.clone())));
            measured(id,"apply",&after,||state.function_l_rows_apply(black_box(before.clone()),black_box(edits.clone())));
            measured(id,"roundtrip",&after,||{let edits=state.function_l_rows_diff(black_box(before.clone()),black_box(after.clone()));state.function_l_rows_apply(before.clone(),edits)});
            measured(id,"final-state",&after,||state.function_l_rows_final(black_box(before.clone()),black_box(after.clone())));
        }
    }
}
