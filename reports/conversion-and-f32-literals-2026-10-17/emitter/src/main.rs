use std::{env,fs,io};
fn main()->Result<(),Box<dyn std::error::Error>>{
 let args=env::args().collect::<Vec<_>>();
 let text=fs::read_to_string(&args[1])?;
 let module=if args.get(3).map(String::as_str)==Some("--core"){ink_core::core::CheckedModule::from_bytes(text.as_bytes()).map_err(io::Error::other)?}else{let parsed=ink_core::syntax::parse(&text).map_err(io::Error::other)?;ink_core::core::CheckedModule::from_source(parsed).map_err(io::Error::other)?};
 let emitted=ink_lowering_js::lower(&module).map_err(io::Error::other)?;
 fs::write(&args[2],emitted.javascript)?;
 Ok(())
}
