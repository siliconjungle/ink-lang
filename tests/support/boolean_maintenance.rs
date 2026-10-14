//! New database algebra, unchanged controller/checker: full source histories.
use serde_json::{json,Value};
use std::{fs,path::PathBuf,process::Command};
use verified_language::{core::CheckedModule,logic::{Proof,Term},planning,stateful::Runtime,syntax::parse};
fn normal(v:&Value)->Value{match v{Value::Number(n)=>Value::String(n.to_string()),Value::Array(a)=>Value::Array(a.iter().map(normal).collect()),Value::Object(o)=>Value::Object(o.iter().map(|(k,v)|(k.clone(),normal(v))).collect()),_=>v.clone()}}
#[test]
fn database_groups_preserve_complete_histories_and_reject_false_preservation(){
 let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));let dir=root.join("build/boolean-maintenance-conformance");fs::create_dir_all(&dir).unwrap();
 let source=root.join("examples/maintained-parity.ink");let text=fs::read_to_string(&source).unwrap();
 let authored=Command::new("python3").args(["-m","producers.maintained_folds"]).arg(&source).args(["--compiler",env!("CARGO_BIN_EXE_ink"),"-o"]).arg(dir.join("proofs")).env("PYTHONPATH",root.join("knowledge")).output().unwrap();
 assert!(authored.status.success(),"{}",String::from_utf8_lossy(&authored.stderr));
 let module=CheckedModule::from_source(parse(&text).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_slice(&fs::read(dir.join("proofs/plan.json")).unwrap()).unwrap();
 let plan=planning::check(&module,&packet).unwrap();let views=&plan.maintained().unwrap().package().views;
 assert_eq!(views.len(),3);assert_eq!(views.iter().filter(|v|matches!(v.zero,Term::Bool(_))).count(),2);
 for field in ["factorisation","insertion","deletion","replacement","cancellation","identity"]{
  let mut forged=packet.clone();if let planning::Step::Maintained(p)=&mut forged.steps[0]{let v=p.views.iter_mut().find(|v|matches!(v.zero,Term::Bool(_))).unwrap();let proof=Proof::Refl(Term::Bool(true));match field{
   "factorisation"=>v.factorisation=proof,"insertion"=>v.insertion=proof,"deletion"=>v.deletion=Some(proof),"replacement"=>v.replacement=Some(proof),"cancellation"=>v.cancellation=Some(proof),_=>v.identity=proof,
  }}
  assert!(planning::check(&module,&forged).is_err(),"forged {field}");
 }
 let mut wrong=packet.clone();if let planning::Step::Maintained(p)=&mut wrong.steps[0]{p.views[0].zero=Term::Bool(true);}
 assert!(planning::check(&module,&wrong).is_err());
 assert!(ink_lowering_c::complete::lower_planned(&plan).is_err());
 let mut oracle=Runtime::new(module.program().clone()).unwrap();let mut history=vec![];
 let mut seed=0x123456789abcdefu64;
 for i in 0..80{
  seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;
  let key=if i%9==0{u64::MAX}else{seed%13};
  let (name,args)=if i%5==0{("erase",json!([key]))}else{("write",json!([key,{"active":i%3!=0,"weight":seed},i%7==0]))};
  for (name,args)in [(name,args),("odd_count",json!([])),("even_count",json!([])),("total",json!([]))]{
   let reply=oracle.invoke_json(name,&args).unwrap();history.push(json!({"name":name,"args":args,"expected":normal(&reply.json()),"snapshot":oracle.checkpoint_portable().unwrap()}));
  }
 }
 fs::write(dir.join("history.json"),serde_json::to_vec(&history).unwrap()).unwrap();
 fs::write(dir.join("planned.mjs"),verified_language::javascript::lower_planned(&plan).unwrap().javascript).unwrap();
 let rust=dir.join("rust");verified_language::runtime::emit_rust_program(&verified_language::state_native::emit_planned(&plan).unwrap(),&rust).unwrap();
 fs::write(rust.join("src/main.rs"),r#"use compiled_state::State;use serde_json::{json,Value};
fn norm(v:&Value)->Value{match v{Value::Number(n)=>Value::String(n.to_string()),Value::Array(a)=>Value::Array(a.iter().map(norm).collect()),Value::Object(o)=>Value::Object(o.iter().map(|(k,v)|(k.clone(),norm(v))).collect()),_=>v.clone()}}
fn main(){let history:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();for(i,h)in history.iter().enumerate(){let reply=serde_json::to_value(state.invoke_json(h["name"].as_str().unwrap(),&h["args"]).unwrap()).unwrap();assert_eq!(norm(&reply),h["expected"],"reply {i}");let saved=state.checkpoint().unwrap();assert_eq!(json!(saved),h["snapshot"],"snapshot {i}");if i%17==0{state=State::restore(&saved).unwrap();}}
let saved=state.checkpoint().unwrap();state.begin_transaction().unwrap();state.invoke_json("write",&json!([999,{"active":true,"weight":9},false])).unwrap();state.rollback_transaction();assert_eq!(state.checkpoint().unwrap(),saved);println!("{} native source-oracle observations passed",history.len());}"#).unwrap();
 for target in [None,Some("wasm32-unknown-unknown")]{
  let mut build=Command::new(env!("CARGO"));build.args(["build","--offline","--quiet","--manifest-path"]).arg(rust.join("Cargo.toml"));
  if let Some(t)=target{build.args(["--lib","--target",t]);}else{build.args(["--bin","compiled-state"]);}
  let out=build.output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 }
 let out=Command::new(rust.join("target/debug/compiled-state")).arg(dir.join("history.json")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 fs::write(dir.join("state-wasm.mjs"),include_str!("../../runtime/hosts/state-wasm.mjs")).unwrap();
 fs::write(dir.join("run.mjs"),r#"import fs from 'node:fs';import assert from 'node:assert/strict';import{parseExactJSON,StatefulModule}from './state-wasm.mjs';import{createState}from './planned.mjs';
const history=parseExactJSON(fs.readFileSync(new URL('history.json',import.meta.url),'utf8'));const norm=v=>typeof v==='bigint'||typeof v==='number'?String(v):Array.isArray(v)?v.map(norm):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,norm(v)])):v;
const wasm=await StatefulModule.instantiate(fs.readFileSync(new URL('rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm',import.meta.url)));
for(const backend of ['javascript','rust-wasm']){let state=backend==='javascript'?createState():wasm.create();
for(const[i,h]of history.entries()){assert.deepEqual(norm(state.invoke(h.name,h.args)),h.expected,backend+' reply '+i);const saved=backend==='javascript'?await state.checkpoint():state.snapshot();assert.deepEqual([...saved],h.snapshot.map(Number),backend+' snapshot '+i);if(i%17===0){if(backend==='javascript')await state.restore(saved);else{state.dispose();state=wasm.restore(saved);}}}
const snapshot=()=>backend==='javascript'?state.checkpoint():state.snapshot();const saved=await snapshot();state.beginTransaction();state.invoke('write',[999n,{active:true,weight:9n},false]);state.rollbackTransaction();assert.deepEqual(await snapshot(),saved);if(backend==='rust-wasm')state.dispose();}
console.log(history.length+' complete histories passed on JavaScript and Rust-Wasm');"#).unwrap();
 let out=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();fs::write(dir.join("run.log"),[out.stdout.as_slice(),out.stderr.as_slice()].concat()).unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
}
