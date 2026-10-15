use std::alloc::{GlobalAlloc,Layout,System};
use std::sync::atomic::{AtomicUsize,Ordering};
use std::time::Instant;
use verified_language::{syntax::parse,core::CheckedModule,analysis::recursive_function_groups};
struct Counted;
static ALLOCS:AtomicUsize=AtomicUsize::new(0);static BYTES:AtomicUsize=AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counted {
 unsafe fn alloc(&self,l:Layout)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc(l)}
 unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc_zeroed(l)}
 unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l)}
 unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(n,Ordering::Relaxed);System.realloc(p,l,n)}
}
#[global_allocator]static GLOBAL:Counted=Counted;
fn main(){
 let args:Vec<String>=std::env::args().collect();let mode=&args[1];let count:usize=args[2].parse().unwrap();let degree:usize=args[3].parse().unwrap();let runs:usize=args[4].parse().unwrap();let mut source=String::from("module graph_probe;\n");
 if mode=="cycles"{
  source.push_str("record Tree{value:u32,children:List<Tree>,}\n");
  for i in 0..count{source.push_str(&format!("fn node_{i}(x:Tree)->u32{{return x.value+children_{i}(x.children);}}fn children_{i}(xs:List<Tree>)->u32{{return foldl(xs,0,fn(x)=>fn(acc)=>acc+node_{i}(x));}}\n"));}
 }else{
  for i in 0..count{let expr=if mode=="depth_guard"&&i+1<count{format!("f_{}(x)",i+1)}else{let terms=(i.saturating_sub(degree)..i).map(|j|format!("f_{j}(x)")).collect::<Vec<_>>();if terms.is_empty(){"x".into()}else{terms.join("+")}};source.push_str(&format!("fn f_{i}(x:u32)->u32{{return {expr};}}\n"));}
 }
 let parsed=parse(&source).unwrap();
 // The guard case deliberately probes a syntactic graph at the analysis limit.
 // Performance cases use fully admitted source; admission is outside timing.
 let checked=if mode.ends_with("guard"){None}else{Some(CheckedModule::from_source(parsed.clone()).unwrap())};let program=checked.as_ref().map(|m|m.program()).unwrap_or(&parsed);
 let expected=recursive_function_groups(program);std::fs::write(&args[5],format!("{expected:?}")).unwrap();
 for _ in 0..runs{let a=ALLOCS.load(Ordering::Relaxed);let b=BYTES.load(Ordering::Relaxed);let start=Instant::now();let result=recursive_function_groups(program);let ns=start.elapsed().as_nanos();let calls=ALLOCS.load(Ordering::Relaxed)-a;let bytes=BYTES.load(Ordering::Relaxed)-b;assert_eq!(result,expected);println!("{{\"ns\":{ns},\"allocations\":{calls},\"requested_bytes\":{bytes}}}");}
}
