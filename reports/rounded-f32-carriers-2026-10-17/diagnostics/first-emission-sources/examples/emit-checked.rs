//! Small exact-package emitter for source-bound implementation experiments.
use ink_core::{core::CheckedModule, syntax};
use std::{env,fs};
fn main() -> Result<(),Box<dyn std::error::Error>> {
    let args=env::args().skip(1).collect::<Vec<_>>();
    if args.len()!=2 {return Err("usage: emit-checked SOURCE.ink|CORE.json OUTPUT.mjs".into());}
    let input=fs::read(&args[0])?;
    let module=if input.iter().copied().find(|b|!b.is_ascii_whitespace())==Some(b'{') {
        CheckedModule::from_bytes(&input)?
    } else {CheckedModule::from_source(syntax::parse(std::str::from_utf8(&input)?)?)?};
    let output=ink_lowering_js::lower(&module)?;
    fs::write(&args[1],output.javascript)?;
    println!("{}",serde_json::json!({"status":"emitted","source":module.identity()?,"manifest":output.manifest}));
    Ok(())
}
