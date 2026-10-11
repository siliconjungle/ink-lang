//! Test-only driver for real standalone JavaScript state. Migration uses the
//! current portable checkpoint/restore contract, never a definition interpreter.
use super::*;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Stdio};
use verified_language::representation::{CheckedMigration, CheckedRepresentation};
pub struct CompiledState { child:Child, input:ChildStdin, output:BufReader<ChildStdout>, plan:String }
impl CompiledState {
 pub fn new(checked:CheckedRepresentation)->Result<Self,String>{
  static NEXT:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);
  let dir=root().join(format!("compiled-history-{}-{}",std::process::id(),NEXT.fetch_add(1,std::sync::atomic::Ordering::Relaxed)));
  fs::create_dir_all(&dir).map_err(|e|e.to_string())?;
  fs::write(dir.join("program.mjs"),ink_lowering_js::representation_program::lower(&checked)?).map_err(|e|e.to_string())?;
  fs::write(dir.join("json.mjs"),include_str!("../../runtime/hosts/state-wasm.mjs")).map_err(|e|e.to_string())?;
  fs::write(dir.join("driver.mjs"),r#"
import readline from 'node:readline';import {createState} from './program.mjs';import {parseExactJSON,stringifyExactJSON} from './json.mjs';
const state=createState();for await(const line of readline.createInterface({input:process.stdin})){let reply;try{const cmd=parseExactJSON(line);let result;if(cmd.kind==='call')result=await state.invoke_json(cmd.name,cmd.args);else if(cmd.kind==='checkpoint')result=Array.from(await state.checkpoint());else if(cmd.kind==='restore'){await state.restore(new Uint8Array(cmd.bytes.map(Number)));result=null;}else throw Error('unknown test command');reply={ok:result};}catch(e){reply={error:e.message};}process.stdout.write(stringifyExactJSON(reply)+'\n');}
"#).map_err(|e|e.to_string())?;
  let mut child=Command::new("node").arg(dir.join("driver.mjs")).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit()).spawn().map_err(|e|e.to_string())?;
  Ok(Self{input:child.stdin.take().unwrap(),output:BufReader::new(child.stdout.take().unwrap()),child,plan:checked.request().representation.clone()})
 }
 fn request(&mut self,value:Value)->Result<Value,String>{
  writeln!(self.input,"{value}").map_err(|e|e.to_string())?;self.input.flush().map_err(|e|e.to_string())?;
  let mut line=String::new();self.output.read_line(&mut line).map_err(|e|e.to_string())?;
  let result:Value=serde_json::from_str(&line).map_err(|e|format!("compiled state reply: {e}: {line}"))?;
  if let Some(error)=result.get("error"){Err(error.as_str().unwrap().to_owned())}else{Ok(result["ok"].clone())}
 }
 pub fn invoke_json(&mut self,name:&str,args:&Value)->Result<Value,String>{self.request(json!({"kind":"call","name":name,"args":args}))}
 pub fn checkpoint(&mut self)->Result<Vec<u8>,String>{serde_json::from_value(self.request(json!({"kind":"checkpoint"}))?).map_err(|e|e.to_string())}
 pub fn restore(checked:CheckedRepresentation,bytes:&[u8])->Result<Self,String>{let mut next=Self::new(checked)?;next.request(json!({"kind":"restore","bytes":bytes}))?;Ok(next)}
 pub fn migrate_portable(&mut self,checked:CheckedRepresentation,bridge:&CheckedMigration)->Result<(),String>{
  if bridge.endpoints()!=(self.plan.as_str(),checked.request().representation.as_str()){return Err("bridge endpoints differ".into());}
  let bytes=self.checkpoint()?;let next=Self::restore(checked,&bytes)?;*self=next;Ok(())
 }
}
impl Drop for CompiledState{fn drop(&mut self){let _=self.child.kill();let _=self.child.wait();}}
