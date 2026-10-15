use std::alloc::{GlobalAlloc,Layout,System};
use std::sync::atomic::{AtomicUsize,Ordering};
use std::time::Instant;
use verified_language::{syntax::parse,core::CheckedModule,action_ir::CheckedActions,effects::CheckedEffects};
struct Counted;
static ALLOCS:AtomicUsize=AtomicUsize::new(0);
static BYTES:AtomicUsize=AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counted {
 unsafe fn alloc(&self,l:Layout)->*mut u8 {ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc(l)}
 unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8 {ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc_zeroed(l)}
 unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l)}
 unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8 {ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(n,Ordering::Relaxed);System.realloc(p,l,n)}
}
#[global_allocator] static GLOBAL:Counted=Counted;
fn main(){
 let args:Vec<String>=std::env::args().collect();
 let entries:usize=args[1].parse().unwrap();let nodes:usize=args[2].parse().unwrap();let runs:usize=args[3].parse().unwrap();
 let mut source=String::from("module effect_probe;\n");
 for entry in 0..entries {
  source.push_str(&format!("query query_{entry}(input:u32)->u32{{let v0=input;"));
  for i in 1..nodes {source.push_str(&format!("let v{i}=v{}+1;",i-1));}
  source.push_str(&format!("return v{};}}\n",nodes-1));
 }
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
 let actions=CheckedActions::elaborate(&module).unwrap();
 let expected=CheckedEffects::derive(&actions).unwrap().bytes().unwrap();
 std::fs::write(&args[4],&expected).unwrap();
 for _ in 0..runs {
  let a=ALLOCS.load(Ordering::Relaxed);let b=BYTES.load(Ordering::Relaxed);let start=Instant::now();
  let effects=CheckedEffects::derive(&actions).unwrap();
  let elapsed=start.elapsed().as_nanos();let allocations=ALLOCS.load(Ordering::Relaxed)-a;let bytes=BYTES.load(Ordering::Relaxed)-b;
  assert_eq!(effects.bytes().unwrap(),expected);
  println!("{{\"ns\":{elapsed},\"allocations\":{allocations},\"allocated_bytes\":{bytes}}}");
 }
}
