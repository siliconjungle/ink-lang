use std::alloc::{GlobalAlloc,Layout,System};
use std::sync::atomic::{AtomicUsize,Ordering};
use std::time::Instant;
use ink_core::{syntax::parse,core::{CheckedModule,Expr,Type},last_use};
struct Counted;
static ALLOCS:AtomicUsize=AtomicUsize::new(0);
static BYTES:AtomicUsize=AtomicUsize::new(0);
unsafe impl GlobalAlloc for Counted {
 unsafe fn alloc(&self,l:Layout)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc(l)}
 unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(l.size(),Ordering::Relaxed);System.alloc_zeroed(l)}
 unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l)}
 unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8{ALLOCS.fetch_add(1,Ordering::Relaxed);BYTES.fetch_add(n,Ordering::Relaxed);System.realloc(p,l,n)}
}
#[global_allocator]static GLOBAL:Counted=Counted;
fn var(s:&str)->Expr{Expr::Var(s.into())}
fn plus(a:Expr,b:Expr)->Expr{Expr::Binary("+".into(),Box::new(a),Box::new(b))}
fn len(field:&str)->Expr{Expr::Call("length".into(),vec![Expr::Field(Box::new(var("r")),field.into())])}
fn sum(xs:&[Expr])->Expr{
 if xs.is_empty(){Expr::Num(0)}else if xs.len()==1{xs[0].clone()}
 else{let n=xs.len()/2;plus(sum(&xs[..n]),sum(&xs[n..]))}
}
fn locals(mut body:Expr,n:usize,params:usize,shadow:bool)->Expr{
 for i in (0..n).rev(){
  let name=if shadow{"slot".to_owned()}else{format!("v{i}")};
  let value=plus(var(&if shadow{"slot".into()}else{format!("p{}",i%params)}),Expr::Num(i as u64));
  body=Expr::Let(name,Some(Box::new(Type::U32)),Box::new(value),Box::new(body));
 }
 body
}
fn choose(a:Expr,b:Expr)->Expr{Expr::Call("choose".into(),vec![var("flag"),a,b])}
fn fold(body:Expr,initial:Expr)->Expr{
 Expr::Call("foldl".into(),vec![var("xs"),initial,Expr::Lambda("x".into(),Box::new(Expr::Lambda("acc".into(),Box::new(body))))])
}
fn trace(e:&Expr,facts:&last_use::LastUses,out:&mut String){
 use std::fmt::Write;
 writeln!(out,"{} {}",u8::from(facts.contains(e)),u8::from(facts.contains_field(e))).unwrap();
 for child in ink_core::analysis::children(e){trace(child,facts,out);}
}
fn main(){
 let args:Vec<_>=std::env::args().collect();let mode=&args[1];let runs:usize=args[2].parse().unwrap();
 let (params,count)=match mode.as_str(){"small"=>(4,8),"wide"=>(32,20),"shadow"=>(32,24),"callbacks"=>(16,8),"branches"=>(16,20),"depth_guard"=>(4,257),_=>panic!("case")};
 let parameters=(0..params).map(|i|format!("p{i}:u32")).collect::<Vec<_>>().join(",");
 let source=format!("module last_use_probe;record Pair{{a:List<u32>,b:List<u32>,}}fn probe(r:Pair,xs:List<u32>,flag:Bool,slot:u32,{parameters})->u32{{return 0;}}");
 let mut p=parse(&source).unwrap();
 let terms=(0..count).map(|i|if mode=="shadow"{var("slot")}else{var(&format!("v{i}"))}).collect::<Vec<_>>();
 let tail=plus(choose(len("a"),len("b")),sum(&terms));
 p.functions[0].body=match mode.as_str(){
  "branches"=>plus(choose(locals(tail.clone(),count,params,false),locals(tail,count,params,false)),len("a")),
  "callbacks"=>{
   let inner=locals(plus(plus(var("acc"),var("x")),len("a")),8,params,true);
   locals(plus(fold(plus(fold(inner,var("acc")),len("b")),tail),len("a")),count,params,false)
  }
  "depth_guard"=>locals(Expr::Num(0),count,params,false),
  _=>locals(tail,count,params,mode=="shadow"),
 };
 // Real admitted programs for all performance subjects. The depth guard is an
 // explicitly unadmitted structural-limit control, not a performance workload.
 let checked=if mode=="depth_guard"{None}else{Some(CheckedModule::from_source(p.clone()).unwrap())};
 let program=checked.as_ref().map(|m|m.program()).unwrap_or(&p);let function=&program.functions[0];
 let expected=last_use::analyse(&function.body,function.params.iter().map(|(n,_)|n.as_str()));
 let mut expected_trace=String::new();trace(&function.body,&expected,&mut expected_trace);
 if mode=="depth_guard"{assert!(expected_trace.lines().all(|line|line=="0 0"));}
 std::fs::write(&args[3],&expected_trace).unwrap();
 for _ in 0..runs{
  let a=ALLOCS.load(Ordering::Relaxed);let b=BYTES.load(Ordering::Relaxed);let start=Instant::now();
  let facts=last_use::analyse(std::hint::black_box(&function.body),function.params.iter().map(|(n,_)|n.as_str()));
  let ns=start.elapsed().as_nanos();let calls=ALLOCS.load(Ordering::Relaxed)-a;let bytes=BYTES.load(Ordering::Relaxed)-b;
  let mut observed=String::new();trace(&function.body,&facts,&mut observed);assert_eq!(observed,expected_trace);
  println!("{{\"case\":\"{mode}\",\"ns\":{ns},\"allocations\":{calls},\"requested_bytes\":{bytes},\"admitted\":{}}}",checked.is_some());
 }
}
