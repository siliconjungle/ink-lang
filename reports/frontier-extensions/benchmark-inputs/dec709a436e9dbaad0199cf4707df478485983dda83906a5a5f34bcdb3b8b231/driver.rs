
mod baseline;
mod packed;
use std::{alloc::{GlobalAlloc,Layout,System},hint::black_box,sync::atomic::{AtomicUsize,Ordering},time::Instant};
use serde_json::{Value as Json,json};
use sha2::{Digest,Sha256};
struct Count;
static LIVE:AtomicUsize=AtomicUsize::new(0);
static PEAK:AtomicUsize=AtomicUsize::new(0);
static ALLOCS:AtomicUsize=AtomicUsize::new(0);
fn added(n:usize){ALLOCS.fetch_add(1,Ordering::Relaxed);let live=LIVE.fetch_add(n,Ordering::Relaxed)+n;PEAK.fetch_max(live,Ordering::Relaxed);}
unsafe impl GlobalAlloc for Count {
 unsafe fn alloc(&self,l:Layout)->*mut u8 {let p=System.alloc(l);if !p.is_null(){added(l.size());}p}
 unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l);LIVE.fetch_sub(l.size(),Ordering::Relaxed);}
 unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8 {let q=System.realloc(p,l,n);if !q.is_null(){ALLOCS.fetch_add(1,Ordering::Relaxed);if n>=l.size(){let live=LIVE.fetch_add(n-l.size(),Ordering::Relaxed)+n-l.size();PEAK.fetch_max(live,Ordering::Relaxed);}else{LIVE.fetch_sub(l.size()-n,Ordering::Relaxed);}}q}
}
#[cfg(counted)] #[global_allocator] static GLOBAL:Count=Count;
trait Database:Sized {
 fn new()->Self;
 fn restore(b:&[u8])->Self;
 fn checkpoint(&self)->Vec<u8>;
 fn call(&mut self,name:&str,args:&Json)->Json;
 fn ack(&mut self);
 fn typed_get(&self,key:u64);
 fn typed_put(&mut self,key:u64,value:u64,fail:bool);
}
macro_rules! adapter {($module:ident)=>{impl Database for $module::State{
 fn new()->Self{Self::new().unwrap()}
 fn restore(b:&[u8])->Self{Self::restore(b).unwrap()}
 fn checkpoint(&self)->Vec<u8>{Self::checkpoint(self).unwrap()}
 fn call(&mut self,name:&str,args:&Json)->Json{self.invoke_json(name,args).unwrap()}
 fn ack(&mut self){self.acknowledge_through(u64::MAX,u64::MAX)}
 fn typed_get(&self,key:u64){black_box(self.query_get(key));}
 fn typed_put(&mut self,key:u64,value:u64,fail:bool){let outcome=self.invoke_view_put(key,value,true,false,true,fail).unwrap();black_box((outcome.result,outcome.version,outcome.committed));}
}}}
adapter!(baseline);adapter!(packed);
fn phase(repeats:usize,mut f:impl FnMut())->Json {
 let before=LIVE.load(Ordering::Relaxed);PEAK.store(before,Ordering::Relaxed);ALLOCS.store(0,Ordering::Relaxed);
 let start=Instant::now();for _ in 0..repeats{f();}let ns=start.elapsed().as_nanos();
 let allocations=ALLOCS.load(Ordering::Relaxed);let peak=PEAK.load(Ordering::Relaxed)-before;
 let after=LIVE.load(Ordering::Relaxed);
 json!({"repeats":repeats,"total_ns":ns as u64,"allocations":allocations,"peak_added_bytes":peak,"live_delta_bytes":after as i64-before as i64})
}
fn sample<D:Database>(n:usize)->Json {
 let startup=phase(64,||{black_box(D::new());});
 let before=LIVE.load(Ordering::Relaxed);let mut state=None;
 let initialise=phase(1,||{let mut s=D::new();for i in 0..n{s.call("put",&json!([i,i as u64,true,false,true,false]));s.ack();}state=Some(s);});
 let state_bytes=LIVE.load(Ordering::Relaxed)-before;
 let mut state=state.unwrap();let middle=(n/2)as u64;
 let expected=json!({"Some":{"value":middle,"active":true,"visible":false,"selected":true}});
 let args=json!([middle]);assert_eq!(state.call("get",&args)["result"],expected);
 let query_json=phase(256,||{assert_eq!(black_box(state.call("get",&args))["result"],expected);});
 let query_typed=phase(256,||{state.typed_get(black_box(middle));});
 let updates=json!([middle,u64::MAX,true,false,true,false]);
 let update_json=phase(32,||{let r=state.call("put",&updates);assert_eq!(r["committed"],true);state.ack();});
 let update_typed=phase(32,||{state.typed_put(black_box(middle),black_box(u32::MAX as u64+1),false);state.ack();});
 let saved=state.checkpoint();
 let abort=phase(32,||{state.typed_put(middle,17,true);});assert_eq!(state.checkpoint(),saved);
 let checkpoint=phase(16,||{black_box(state.checkpoint());});
 let restore=phase(16,||{let restored=D::restore(&saved);black_box(restored);});
 assert_eq!(D::restore(&saved).checkpoint(),saved);
 let digest=format!("{:x}",Sha256::digest(&saved));
 let mut drop_state=Some(state);let teardown=phase(1,||{drop(drop_state.take());});
 json!({"startup":startup,"initialise":initialise,"query_json":query_json,"query_typed":query_typed,"update_json":update_json,"update_typed":update_typed,"abort":abort,"checkpoint":checkpoint,"restore":restore,"teardown":teardown,"state_requested_bytes":state_bytes,"snapshot_sha256":digest})
}
fn main(){let args:Vec<String>=std::env::args().collect();let n=args[2].parse().unwrap();let result=if args[1]=="packed"{sample::<packed::State>(n)}else{sample::<baseline::State>(n)};println!("{result}");}
