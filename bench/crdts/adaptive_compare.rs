// Typed library adapter for the unchanged, pinned native adaptive host.
// Inputs are captured before timing, just as in owned_compare.rs. The host
// receives a capture index, executes it once, and retains the returned owner.
#[path="../v0.rs"] mod v0;
#[path="../v1.rs"] mod v1;
#[path="../v2.rs"] mod v2;
#[path="../adaptive_host.rs"] mod adaptive_host;
use adaptive_host::{CompiledState, Factories, Host};
use ink_abi::adaptive::{Binding, Policy, Profile};
use diamond_types::list::{ListCRDT,ListOpLog};
use serde_json::{json, Value};
use std::{hint::black_box,time::Instant};
NATIVE_ADAPTER

#[cfg(feature="memory")]
mod memory {
 use std::{alloc::{GlobalAlloc,Layout,System},sync::atomic::{AtomicUsize,Ordering::Relaxed}};
 static LIVE:AtomicUsize=AtomicUsize::new(0);static PEAK:AtomicUsize=AtomicUsize::new(0);
 fn add(n:usize){let live=LIVE.fetch_add(n,Relaxed)+n;PEAK.fetch_max(live,Relaxed);}
 pub fn reset(){PEAK.store(LIVE.load(Relaxed),Relaxed);}
 pub fn peak()->usize{PEAK.load(Relaxed)}
 pub struct Alloc;
 unsafe impl GlobalAlloc for Alloc {
  unsafe fn alloc(&self,l:Layout)->*mut u8{let p=unsafe{System.alloc(l)};if !p.is_null(){add(l.size());}p}
  unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8{let p=unsafe{System.alloc_zeroed(l)};if !p.is_null(){add(l.size());}p}
  unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8{let out=unsafe{System.realloc(p,l,n)};if !out.is_null(){LIVE.fetch_sub(l.size(),Relaxed);add(n);}out}
  unsafe fn dealloc(&self,p:*mut u8,l:Layout){LIVE.fetch_sub(l.size(),Relaxed);unsafe{System.dealloc(p,l)}}
 }
}
#[cfg(feature="memory")]
#[global_allocator] static ALLOCATOR:memory::Alloc=memory::Alloc;
fn reset_peak(){#[cfg(feature="memory")]memory::reset();}
fn peak()->usize{#[cfg(feature="memory")]{memory::peak()}#[cfg(not(feature="memory"))]{0}}

enum Instance {
 V0{kernel:v0::State,document:Option<v0::l_Document>,inputs:Vec<Option<Vec<v0::CHANGE_TYPE>>>},
 V1{kernel:v1::State,document:Option<v1::l_Document>,inputs:Vec<Option<Vec<v1::CHANGE_TYPE>>>},
 V2{kernel:v2::State,document:Option<v2::l_Document>,inputs:Vec<Option<Vec<v2::CHANGE_TYPE>>>},
}
macro_rules! execute {($m:ident,$k:ident,$d:ident,$i:ident,$index:expr)=>{{
 let input=$i.get_mut($index).ok_or("capture index")?.take().ok_or("capture reused")?;
 let old=$d.take().ok_or("missing owner")?;
 // Fixtures contain valid changes. A failure is reported and never retried;
 // this pure ownership-taking API does not promise automatic rollback.
 *$d=Some($k.function_l_merge(old,input).map_err(|e|format!("{e:?}"))?);Ok(())
}}}
macro_rules! snapshot {($m:ident,$d:ident)=>{{use $m::Wire;serde_json::to_vec(&$d.as_ref().ok_or("missing owner")?.to_json()).map_err(|e|e.to_string())}}}
impl CompiledState for Instance {
 type Reply=();
 fn call(&mut self,action:&str,args:&Value)->Result<(),String>{
  if action!="merge"{return Err("unknown action".into());}let index=args.as_u64().ok_or("capture index")? as usize;
  match self{Self::V0{kernel,document,inputs}=>execute!(v0,kernel,document,inputs,index),Self::V1{kernel,document,inputs}=>execute!(v1,kernel,document,inputs,index),Self::V2{kernel,document,inputs}=>execute!(v2,kernel,document,inputs,index)}
 }
 fn checkpoint(&self)->Result<Vec<u8>,String>{match self{Self::V0{document,..}=>snapshot!(v0,document),Self::V1{document,..}=>snapshot!(v1,document),Self::V2{document,..}=>snapshot!(v2,document)}}
}
struct Factory {seed:Vec<u8>,inputs:Vec<Value>}
macro_rules! restored {($m:ident,$variant:ident,$bytes:expr,$inputs:expr)=>{{use $m::Wire;
 let value:Value=serde_json::from_slice($bytes).map_err(|e|e.to_string())?;
 Ok(Instance::$variant{kernel:$m::State::new(),document:Some($m::l_Document::from_json(&value)?),inputs:$inputs.iter().map(|v|Vec::<$m::CHANGE_TYPE>::from_json(v).map(Some)).collect::<Result<_,_>>()?})
}}}
impl Factories for Factory {
 type Instance=Instance;
 fn create(&self,variant:&str)->Result<Instance,String>{self.restore(variant,&self.seed)}
 fn restore(&self,variant:&str,bytes:&[u8])->Result<Instance,String>{match variant{"v0"=>restored!(v0,V0,bytes,self.inputs),"v1"=>restored!(v1,V1,bytes,self.inputs),"v2"=>restored!(v2,V2,bytes,self.inputs),_=>Err("unknown variant".into())}}
}
fn main(){
 let args:Vec<_>=std::env::args().collect();
 if args[1]=="acquire"{
  let spec:Value=serde_json::from_slice(&std::fs::read(&args[2]).unwrap()).unwrap();let mut rows=vec![];
  for(phase,entries)in spec["phases"].as_object().unwrap(){let entry=&entries[0];let seed=serde_json::to_vec(&entry["args"][0]).unwrap();let incoming=entry["args"][1].clone();
   let f=Factory{seed:seed.clone(),inputs:vec![incoming]};let mut want=None;
   for variant in ["v0","v1","v2"]{let mut samples=vec![];let mut peaks=vec![];
    for _ in 0..11{let mut instance=f.create(variant).unwrap();assert_eq!(instance.checkpoint().unwrap(),seed);reset_peak();let t=Instant::now();instance.call("merge",&json!(0)).unwrap();samples.push(t.elapsed().as_nanos()as u64);peaks.push(peak());let got=instance.checkpoint().unwrap();if let Some(ref expected)=want{assert_eq!(&got,expected);}else{want=Some(got);}}
    rows.push(json!({"phase":phase,"variant":variant,"samples_ns":samples[2..],"peak_requested_live_bytes":peaks[2..]}));
   }
   for from in ["v0","v1","v2"]{for to in ["v0","v1","v2"]{if from==to{continue;}let mut samples=vec![];let mut peaks=vec![];
    for _ in 0..5{let old=f.create(from).unwrap();reset_peak();let t=Instant::now();let bytes=old.checkpoint().unwrap();let new=f.restore(to,&bytes).unwrap();assert_eq!(new.checkpoint().unwrap(),bytes);samples.push(t.elapsed().as_nanos()as u64);peaks.push(peak());}
    rows.push(json!({"phase":phase,"from":from,"to":to,"samples_ns":samples,"peak_requested_live_bytes":peaks}));
   }}
  }println!("{}",json!({"rows":rows,"memory_instrumented":cfg!(feature="memory"),"outputs_equal":true}));return;
 }
 assert!(!cfg!(feature="memory"),"instrumented binary is not timing evidence");
 let config:Value=serde_json::from_slice(&std::fs::read(&args[2]).unwrap()).unwrap();let binding:Binding=serde_json::from_value(config["binding"].clone()).unwrap();let profile:Profile=serde_json::from_value(config["profile"].clone()).unwrap();let policy:Policy=serde_json::from_value(config["policy"].clone()).unwrap();
 let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(&args[3]).unwrap()).unwrap();let rounds:usize=args[4].parse().unwrap();let chunk:usize=args[5].parse().unwrap();
 let names=["ink_fixed_v0","ink_fixed_v1","ink_fixed_v2","ink_host_fixed","ink_profile_only","ink_adaptive","diamond_types_document"];
 for case in cases {use v0::Wire;
  let raw=case["changes"].as_array().unwrap();let split=raw.len()/2;let upstream=native::prepare(raw);let k=v0::State::new();let all=Vec::<v0::CHANGE_TYPE>::from_json(&case["changes"]).unwrap();let seed=k.function_l_merge(k.function_l_empty(),all[..split].to_vec()).unwrap();let seed_bytes=serde_json::to_vec(&seed.to_json()).unwrap();
  let inputs:Vec<Value>=raw[split..].chunks(chunk).map(|c|json!(c)).collect();let captures:Vec<Value>=(0..inputs.len()).map(|i|json!(i)).collect();let mut log=ListOpLog::new();native::apply(&mut log,&upstream[..split]);let dt_bytes=log.encode(&diamond_types::list::encoding::ENCODE_FULL);native::apply(&mut log,&upstream[split..]);let want=native::text(&log);let expected=k.function_l_merge(seed,all[split..].to_vec()).unwrap();let expected_bytes=serde_json::to_vec(&expected.to_json()).unwrap();
  let mut samples:Vec<Vec<u64>>=vec![vec![];names.len()];let mut diagnostics=vec![];
  for round in 0..rounds+2{for offset in 0..names.len(){let mode=(round+offset)%names.len();
   if mode==6{let mut doc=ListCRDT::load_from(&dt_bytes).unwrap();let t=Instant::now();for changes in upstream[split..].chunks(chunk){DT_APPLY}let ns=t.elapsed().as_nanos()as u64;if round>=2{samples[mode].push(ns);}assert_eq!(doc.branch.content().to_string().chars().map(|c|c as u32).collect::<Vec<_>>(),want);assert_eq!(doc.oplog.encode(&diamond_types::list::encoding::ENCODE_FULL),log.encode(&diamond_types::list::encoding::ENCODE_FULL),"direct DT path changed operation log");
   }else{let f=Factory{seed:seed_bytes.clone(),inputs:inputs.clone()};
    if mode<3{let mut live=f.create(&format!("v{mode}")).unwrap();let t=Instant::now();for capture in &captures{live.call("merge",black_box(capture)).unwrap();}let ns=t.elapsed().as_nanos()as u64;if round>=2{samples[mode].push(ns);}assert_eq!(live.checkpoint().unwrap(),expected_bytes);
    }else{let mut host=Host::new(f,binding.clone(),profile.clone(),policy.clone(),"v0".into(),256,32,64*1024*1024).unwrap();if mode==3{host.disable_recording();}if mode==4{host.disabled=true;}let t=Instant::now();for(i,capture)in captures.iter().enumerate(){// Unknown real-trace cohorts must fail closed; training prices cannot be relabelled.
      host.call("merge",black_box(capture),"unmeasured-real-trace",(split+i*chunk)as u64).unwrap();}
     let ns=t.elapsed().as_nanos()as u64;if round>=2{samples[mode].push(ns);diagnostics.push(json!({"mode":names[mode],"current":host.current(),"disabled":host.disabled,"reason":host.last_diagnostic}));}assert_eq!(host.checkpoint().unwrap(),expected_bytes);
    }
   }
  }}
  for(mode,name)in names.iter().enumerate(){println!("{}",json!({"case":case["name"],"variant":name,"merge_samples_ns":samples[mode],"retained_batches":split,"merged_batches":raw.len()-split,"output_codepoints":want.len(),"host_diagnostics":if mode>=3&&mode<=5{diagnostics.iter().filter(|v|v["mode"]==*name).collect::<Vec<_>>()}else{vec![]}}));}
 }
}
