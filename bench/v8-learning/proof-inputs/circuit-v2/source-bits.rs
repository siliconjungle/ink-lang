//! Isolated authoring harness; all laws replay in the independent core.
use ink_core::{laws,semantic,syntax,registry};
use std::{collections::BTreeMap,fs};
#[derive(serde::Deserialize)]
struct Goal {params:semantic::Env,conditions:Vec<laws::Equation>,from:semantic::Term,to:semantic::Term}
fn run()->Result<(),String>{
 let args:Vec<_>=std::env::args().collect();
 let p=syntax::parse("module bits;fn identity(x:u32)->u32{return x;}")?;
 let bytes=fs::read(&args[2]).map_err(|e|e.to_string())?;
 if args[1]=="problem" {
  let g:Goal=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
  let problem=laws::bitvector_problem_with_encoding(&p,&g.params,&g.conditions,&laws::Equation{from:g.from,to:g.to},laws::BitVectorSemantics::FixedWordsV2,ink_core::bitproof::Encoding::SharedV2)?;
  println!("{}",serde_json::to_string(&problem).map_err(|e|e.to_string())?);
 }else{
  let law:laws::Law=serde_json::from_slice(&bytes).map_err(|e|e.to_string())?;
  let id=registry::identity(&registry::Entry::from_law(&law)?)?;
  let catalogue=laws::Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])};
  laws::CheckedCatalogue::check(&catalogue,&p)?;
  println!("checked");
 }
 Ok(())
}
fn main(){if let Err(e)=run(){eprintln!("{e}");std::process::exit(1)}}
