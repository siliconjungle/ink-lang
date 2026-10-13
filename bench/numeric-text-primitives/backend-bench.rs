// Added to the generated host: immutable JSON inputs outside timing; ordinary
// public calls marshal, execute and materialise/consume complete output each time.
use std::time::Instant;
fn consume(v:&serde_json::Value)->u64{match v {
 serde_json::Value::Number(x)=>x.as_u64().unwrap_or_else(||x.as_f64().unwrap().to_bits()),
 serde_json::Value::Bool(x)=>u64::from(*x),serde_json::Value::String(s)=>s.bytes().fold(0u64,|h,b|h.wrapping_mul(31)^b as u64),
 serde_json::Value::Array(xs)=>xs.iter().fold(0u64,|h,x|h.wrapping_mul(31)^consume(x)),
 serde_json::Value::Object(xs)=>xs.values().fold(0u64,|h,x|h.wrapping_mul(31)^consume(x)),_=>0}}
fn main(){
 let cases:Vec<serde_json::Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut engines=GpuEngines::new();let mut state=compiled_state::State::new();
 for c in cases{
  let name=c["name"].as_str().unwrap();let args=&c["args"];let wanted=state.call_json(name,args).unwrap();let digest=consume(&wanted);
  let mut labels=vec!["rust-json","c-packed"];
  if name=="float_ops"||name=="word_stats"||name=="from_wide"{labels.push("wgpu-required");}
  let mut counts=vec![];
  for &label in &labels {
   let mut call=||if label=="rust-json"{state.call_json(name,args).unwrap()}else{let mut got=engines.call(name,args,if label=="wgpu-required"{"gpu-required"}else{"cpu"},None).unwrap();if label=="wgpu-required"{assert_eq!(got["backend"],"gpu");}got["value"].take()};
   // Pack/unpack may spell large U64s as strings. These three outputs are U32
   // and flat records/vectors, so exact JSON comparisons are appropriate.
   assert_eq!(call(),wanted);let mut n=1usize;loop{let t=Instant::now();for _ in 0..n {std::hint::black_box(consume(&call()));}if t.elapsed().as_millis()>=5||n>=1024{break;}n*=2;}counts.push(n);
  }
  for round in 0..9 {for offset in 0..labels.len(){let i=(offset+round)%labels.len();let label=labels[i];let n=counts[i];let t=Instant::now();let mut sum=0u64;
   for _ in 0..n {let v=if label=="rust-json"{state.call_json(name,args).unwrap()}else{{let mut got=engines.call(name,args,if label=="wgpu-required"{"gpu-required"}else{"cpu"},None).unwrap();got["value"].take()}};sum=sum.wrapping_add(std::hint::black_box(consume(&v)));}
   let ns=t.elapsed().as_secs_f64()*1e9/n as f64;assert_eq!(sum,digest.wrapping_mul(n as u64));println!("{}",serde_json::json!({"name":name,"size":c["size"],"lane":label,"round":round,"calls":n,"ns_per_call":ns,"digest":digest}));
  }}
 }
}
