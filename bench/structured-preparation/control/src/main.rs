use std::{fs,time::Instant};
fn main(){
 let args=std::env::args().collect::<Vec<_>>();let count=args.get(3).map(|s|s.parse::<usize>().unwrap()).unwrap_or(1);assert!((1..=32).contains(&count));
 let start=Instant::now();let bytes=fs::read(&args[1]).unwrap();let module=ink_core::core::CheckedModule::from_bytes(&bytes).unwrap();let check_ns=start.elapsed().as_nanos();let mut rows=vec![];let mut previous=None;
 for _ in 0..count {let start=Instant::now();let emitted=ink_lowering_js::lower(&module).unwrap().javascript;rows.push(start.elapsed().as_nanos());if let Some(prior)=&previous{assert_eq!(prior,&emitted);}previous=Some(emitted);}
 let text=previous.unwrap();fs::write(&args[2],&text).unwrap();println!("{{\"check_ns\":{check_ns},\"emit_ns\":{rows:?},\"bytes\":{}}}",text.len());
}
