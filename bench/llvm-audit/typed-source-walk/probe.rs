use std::alloc::{GlobalAlloc,Layout,System};
use std::sync::atomic::{AtomicUsize,Ordering};
use std::time::Instant;
use verified_language::{syntax::parse,core::CheckedModule,action_ir::CheckedActions,access::CheckedAccess,analysis::typed_walk_context};
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
fn balanced(depth:usize)->String{if depth==0{"input".into()}else{let child=balanced(depth-1);format!("({child}+{child})")}}
fn main(){
 let args:Vec<String>=std::env::args().collect();let mode=&args[1];
 let entries:usize=args[2].parse().unwrap();let size:usize=args[3].parse().unwrap();let runs:usize=args[4].parse().unwrap();
 let mut source=String::from("module structural_probe;\n");
 if mode=="access" {
  source.push_str(&format!("fn key(input:u32)->u32{{return {};}}\nstate Rows:Table<u32,u32>=Table.empty();\n",balanced(size)));
  for entry in 0..entries{source.push_str(&format!("query q_{entry}(input:u32)->Option<u32> reads(Rows){{return Rows.get(key(input));}}\n"));}
 }else{
  assert_eq!(mode,"walk");
  for entry in 0..entries{source.push_str(&format!("fn f_{entry}(xs:List<u32>)->List<u32>{{return xs"));for _ in 0..size{source.push_str(".map(fn(x)=>x+1)");}source.push_str(";}\n");}
 }
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
 let actions=CheckedActions::elaborate(&module).unwrap();
 let derive=||{
  if mode=="access"{CheckedAccess::derive(&actions).unwrap().bytes().unwrap()}
  else{let mut count=0usize;for function in &module.program().functions{typed_walk_context(module.program(),function,|_,_,_|{count+=1;}).unwrap();}count.to_le_bytes().to_vec()}
 };
 if mode=="walk"{let mut visits=vec![];for function in &module.program().functions{typed_walk_context(module.program(),function,|e,env,want|{visits.push(format!("{e:?}/{env:?}/{want:?}"));}).unwrap();}std::fs::write(format!("{}.contexts",args[5]),visits.join("\n")).unwrap();}
 let expected=derive();std::fs::write(&args[5],&expected).unwrap();
 for _ in 0..runs{let a=ALLOCS.load(Ordering::Relaxed);let b=BYTES.load(Ordering::Relaxed);let start=Instant::now();let observed=derive();let elapsed=start.elapsed().as_nanos();let allocations=ALLOCS.load(Ordering::Relaxed)-a;let bytes=BYTES.load(Ordering::Relaxed)-b;assert_eq!(observed,expected);println!("{{\"ns\":{elapsed},\"allocations\":{allocations},\"allocated_bytes\":{bytes}}}");}
}
