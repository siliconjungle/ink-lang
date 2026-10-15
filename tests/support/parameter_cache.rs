use serde_json::{json,Value};
use std::{fs,path::PathBuf,process::Command};
use verified_language::{core::CheckedModule,representation::{self,Request},stateful::Runtime,syntax};
#[path="compiled_representations.rs"]mod compiled_representations;
fn run(command:&mut Command){let out=command.output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));}
fn fixture(module:&CheckedModule,calls:&[Value])->Value{
 let mut source=Runtime::new(module.program().clone()).unwrap();let mut out=vec![];
 for c in calls{
  let reply=source.invoke_json(c["call"].as_str().unwrap(),&c["args"]).unwrap().json();
  out.push(json!({"call":c["call"],"args":c["args"],"reply":{"ok":reply},"snapshot":source.checkpoint_portable().unwrap(),"outbox":source.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()}));
 }
 let layout=verified_language::snapshot::layout(module.program()).unwrap();
 let saved=verified_language::snapshot_wire::decode(&layout,&source.checkpoint_portable().unwrap(),Default::default()).unwrap();
 let full=verified_language::snapshot_wire::encode(&layout,&verified_language::snapshot_wire::Logical{version:u64::MAX,..saved},Default::default()).unwrap();
 source=Runtime::restore_portable(module.program().clone(),&full).unwrap();
 out.push(json!({"restore":full,"snapshot":source.checkpoint_portable().unwrap(),"outbox":source.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()}));
 for c in calls{
  let reply=match source.invoke_json(c["call"].as_str().unwrap(),&c["args"]){Ok(v)=>json!({"ok":v.json()}),Err(e)=>json!({"error":e})};
  out.push(json!({"call":c["call"],"args":c["args"],"reply":reply,"snapshot":source.checkpoint_portable().unwrap(),"outbox":source.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()}));
 }
 json!(out)
}
#[test]
fn guarded_parameter_cache_preserves_cpu_histories_and_migrations(){
 let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));
 run(Command::new("python3").args(["-m","unittest","discover","-s","knowledge/tests","-p","test_parameter_cache.py"])
  .current_dir(&root).env("PYTHONPATH",format!("{}:{}",root.join("knowledge").display(),root.join("planner").display()))
  .env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")));let dir=root.join("build/parameter-cache-parity");fs::create_dir_all(&dir).unwrap();
 let source=include_str!("../../knowledge/tests/fixtures/parameter-cache/source.ink");let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
 fs::write(dir.join("model.json"),serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
 let mut calls=vec![];
 for key in [0,7,u64::MAX]{
  calls.extend([json!({"call":"get","args":[key]}),json!({"call":"put","args":[key,key,false]}),json!({"call":"put","args":[key,42,true]}),json!({"call":"unrelated","args":[key,99]})]);
  for (cut,flag)in [(7,true),(7,false),(0,true),(u64::MAX,true)]{calls.push(json!({"call":"score","args":[cut,flag]}));}
 }
 calls.extend([json!({"call":"erase","args":[7]}),json!({"call":"score","args":[7,true]}),json!({"call":"get","args":[u64::MAX]})]);
 let oracle=fixture(&module,&calls);fs::write(dir.join("oracle.json"),serde_json::to_vec(&oracle).unwrap()).unwrap();
 for (query,args)in [("get","[18446744073709551615]"),("score","[7,true]")]{
  let lane=dir.join(query);fs::create_dir_all(&lane).unwrap();
  run(Command::new("python3").arg(root.join("knowledge/producers/representations.py")).arg(dir.join("model.json"))
   .args(["--cache-query",query,"--cache-arguments",args,"--preserve-cache","-o"]).arg(lane.join("proposal.json"))
   .env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")));
  let result:Value=serde_json::from_slice(&fs::read(lane.join("proposal.json")).unwrap()).unwrap();
  let plans=result["requests"].as_array().unwrap().iter().map(|v|representation::check(&module,&serde_json::from_value::<Request>(v.clone()).unwrap()).unwrap()).collect::<Vec<_>>();
  let mut migration_steps=calls.clone();migration_steps.insert(5,json!({"migrate":1}));migration_steps.insert(12,json!({"migrate":0}));
  compiled_representations::history(&module,&plans,migration_steps,&format!("parameter-cache-{query}-migrations"));
  let checked=&plans[1];
  let js=lane.join("javascript");fs::create_dir_all(&js).unwrap();
  verified_language::representations::emit(checked,"javascript",&js.join("program.mjs")).unwrap();
  for folder in [&js,&lane.join("wasm")]{fs::create_dir_all(folder).unwrap();fs::write(folder.join("oracle.json"),serde_json::to_vec(&oracle).unwrap()).unwrap();fs::write(folder.join("state-wasm.mjs"),include_str!("../../runtime/hosts/state-wasm.mjs")).unwrap();fs::write(folder.join("check.mjs"),include_str!("../representation-parity-runner.mjs")).unwrap();}
  run(Command::new("node").arg(js.join("check.mjs")));
  let wasm=lane.join("wasm");verified_language::representations::emit(checked,"rust-wasm",&wasm).unwrap();
  run(Command::new(env!("CARGO")).args(["build","--offline","--quiet","--lib","--target","wasm32-unknown-unknown","--manifest-path"]).arg(wasm.join("Cargo.toml")).arg("--target-dir").arg(dir.join("target")));
  fs::copy(dir.join("target/wasm32-unknown-unknown/debug/ink_compiled_representation.wasm"),wasm.join("program.wasm")).unwrap();
  run(Command::new("node").arg(wasm.join("check.mjs")).env("INK_REP_WASM","1"));
 }
}
