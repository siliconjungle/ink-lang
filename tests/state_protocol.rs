use serde_json::{json, Value};
use std::{fs,path::PathBuf,process::Command};
use verified_language::{core::CheckedModule,syntax::parse,planning,protocol,stateful::Runtime};
const SOURCE:&str=include_str!("../examples/filtered-aggregate.ink");
#[test]
fn event_columns_preserve_multiple_channels_owned_records_and_transactional_positions(){
 let source="module event_storage;enum Error{Failed,}record Payload{value:u64,}event one:Payload;event two:u64;change multi(v:Payload,fail:Bool)->Result<Unit,Error> emits(one,two){emit one(v);emit two(v.value);if fail{return Err(Error.Failed);}return Ok(());}change single(v:Payload)->Unit emits(one) protocol(preflight){emit one(v);return ();}";
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let protocol:protocol::Plan=serde_json::from_value(json!({"schema":1,"semantics":protocol::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"event_columns":true,"actions":[{"action":"single","execution":"preflight"}]})).unwrap();
 let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"steps":[{"kind":"protocol","package":protocol}]})).unwrap();
 let checked=planning::check(&module,&packet).unwrap();
 let dir=directory().join("events");fs::create_dir_all(&dir).unwrap();fs::write(dir.join("events.mjs"),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();
 let mut oracle=Runtime::new(parse(source).unwrap()).unwrap();let mut histories=vec![];
 for i in 0..30u64{let name=if i%2==0{"single"}else{"multi"};let args=if i%2==0{json!([{ "value":u64::MAX-i}])}else{json!([{ "value":u64::MAX-i},i%3==0])};let outcome=oracle.invoke_json(name,&args).unwrap().json();histories.push(json!({"name":name,"args":normal(&args),"result":normal(&outcome),"snapshot":oracle.checkpoint_portable().unwrap()}));}
 fs::write(dir.join("history.json"),serde_json::to_vec(&histories).unwrap()).unwrap();
 fs::write(dir.join("run.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {createState} from './events.mjs';
const state=createState(),normal=v=>JSON.parse(JSON.stringify(v,(_k,x)=>typeof x==='bigint'||typeof x==='number'?String(x):x));
for(const h of JSON.parse(fs.readFileSync(new URL('./history.json',import.meta.url)))){const args=[{value:BigInt(h.args[0].value)},...h.args.slice(1)];const result=state.bind(h.name)(...args);assert.deepEqual(normal(result),h.result);args[0].value=0n;assert.deepEqual([...await state.checkpoint()],h.snapshot);if(result.events.length){const saved=await state.checkpoint();result.events[0].value.value=0n;const out=state.outbox;out[0].value.value=0n;assert.deepEqual(await state.checkpoint(),saved);}}
const before=await state.checkpoint();state.beginTransaction();state.acknowledgeThrough(18446744073709551615n,18446744073709551615n);state.bind('single')({value:5n});state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),before);
state.beginTransaction();const transactionEdge=state.outbox[2];state.acknowledgeThrough(transactionEdge.commit,transactionEdge.position);state.bind('multi')({value:6n},false);state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),before);
const edge=state.outbox[2],expected=state.outbox.slice(3);state.acknowledgeThrough(edge.commit,edge.position);assert.deepEqual(state.outbox,expected);const acknowledged=await state.checkpoint();await state.restore(before);assert.deepEqual(await state.checkpoint(),before);await state.restore(acknowledged);assert.deepEqual(state.outbox,expected);
"#).unwrap();
 let out=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
}
fn directory()->PathBuf{PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("build/state-protocol-tests")}
fn normal(v:&Value)->Value{match v{Value::Number(n)=>Value::String(n.to_string()),Value::Array(a)=>Value::Array(a.iter().map(normal).collect()),Value::Object(o)=>Value::Object(o.iter().map(|(k,v)|(k.clone(),normal(v))).collect()),_=>v.clone()}}
#[test]
fn execution_declarations_and_proposals_replay_structural_capabilities(){
 let source=SOURCE.replace("emits(seen){","emits(seen) protocol(preflight){");
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
 assert!(protocol::capabilities(&module).unwrap().iter().filter(|c|c.action=="put"||c.action=="erase").all(|c|c.preflight));
 let bad="module bad;state T:Table<u64,u64> =Table.empty();change x(k:u64)->Unit writes(T) reads(T) protocol(preflight){T.put(k,1);T.get(k);return ();}";
 assert!(CheckedModule::from_source(parse(bad).unwrap()).unwrap_err().contains("preflight"));
 let bad=bad.replace("T.get(k);","T.put(k,2);");
 assert!(CheckedModule::from_source(parse(&bad).unwrap()).unwrap_err().contains("preflight"));
 let source=SOURCE.replace("emits(seen){","emits(seen) protocol(transactional){");
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
 let p=protocol::Plan{schema:1,semantics:protocol::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),actions:vec![protocol::ActionChoice{action:"put".into(),execution:protocol::Execution::Preflight}],direct_reads:vec![],output_publication:false,snapshot_rows:false,event_columns:false,inline_maintenance:false,compact_commits:None,columns:vec![]};
 assert!(protocol::check(&module,&p,None).unwrap_err().contains("source declaration"));
 let mut p=p;p.actions.clear();p.direct_reads.push("total_query".into());
 assert!(protocol::check(&module,&p,None).unwrap_err().contains("maintained"));
 p.direct_reads.clear();p.inline_maintenance=true;assert!(protocol::check(&module,&p,None).unwrap_err().contains("checked views"));
}
#[test]
fn whole_implementations_preserve_histories_publication_changes_and_portable_state(){
 let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));let dir=directory();fs::create_dir_all(&dir).unwrap();
 let source=dir.join("source.ink");fs::write(&source,SOURCE).unwrap();
 let out=Command::new("python3").args(["-m","producers.maintained_folds"]).arg(&source).args(["--compiler",env!("CARGO_BIN_EXE_ink"),"-o"]).arg(dir.join("proofs")).env("PYTHONPATH",format!("{}:{}",root.join("knowledge").display(),std::env::var("PYTHONPATH").unwrap_or_default())).output().unwrap();
 assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let module=CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
 let mut packet:planning::Package=serde_json::from_slice(&fs::read(dir.join("proofs/plan.json")).unwrap()).unwrap();
 let plan=planning::check(&module,&packet).unwrap();
 fs::write(dir.join("baseline.mjs"),verified_language::javascript::lower(&module).unwrap().javascript).unwrap();
 let facts=protocol::capabilities(&module).unwrap();
 let protocol=protocol::Plan{schema:1,semantics:protocol::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),actions:facts.iter().filter(|c|c.preflight).map(|c|protocol::ActionChoice{action:c.action.clone(),execution:protocol::Execution::Preflight}).collect(),direct_reads:facts.iter().filter(|c|c.direct_keep.is_some()).map(|c|c.action.clone()).collect(),output_publication:true,snapshot_rows:true,event_columns:false,inline_maintenance:false,compact_commits:None,columns:vec![]};
 assert_eq!(protocol.actions.len(),2);
 packet.steps.push(planning::Step::Protocol(protocol));
 let optimized=planning::check(&module,&packet).unwrap();
 assert!(verified_language::state_native::emit_planned(&optimized).unwrap_err().contains("protocol"));
 fs::write(dir.join("map.mjs"),verified_language::javascript::lower_planned(&optimized).unwrap().javascript).unwrap();
 let mut column_events=packet.clone();if let planning::Step::Protocol(p)=column_events.steps.last_mut().unwrap(){p.event_columns=true;}let checked=planning::check(&module,&column_events).unwrap();fs::write(dir.join("event_columns.mjs"),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();
 fs::write(dir.join("plan.json"),serde_json::to_vec(&packet).unwrap()).unwrap();
 let mut oracle=Runtime::new(parse(SOURCE).unwrap()).unwrap();let mut history=vec![];
 for i in 0..240u64{
  let key=if i%23==0{u64::MAX-i}else if i%29==0{9007199254740992+i}else if i%17==0{9999}else{i%31};let value=if i%11==0{u64::MAX-i}else{i*17};
  let (name,args)=if i%7==0{("erase",json!([key,i%13==0]))}else{("put",json!([key,value,i%3==0,i%13==0]))};
  let result=oracle.invoke_json(name,&args).unwrap().json();
  let total=oracle.invoke_json("total_query",&json!([])).unwrap().json();
  let count=oracle.invoke_json("count_query",&json!([])).unwrap().json();
  let mut js_args=args.clone();for a in js_args.as_array_mut().unwrap(){if let Value::Number(n)=a{*a=Value::String(n.to_string());}}
  history.push(json!({"name":name,"args":js_args,"result":normal(&result),"total":normal(&total),"count":normal(&count),"snapshot":oracle.checkpoint_portable().unwrap()}));
 }
 fs::write(dir.join("history.json"),serde_json::to_vec(&history).unwrap()).unwrap();
 let mut exhausted:Value=serde_json::from_slice(&oracle.checkpoint().unwrap()).unwrap();exhausted["version"]=json!(u64::MAX);
 let exhausted=Runtime::restore(parse(SOURCE).unwrap(),&serde_json::to_vec(&exhausted).unwrap()).unwrap();fs::write(dir.join("exhausted.bin"),exhausted.checkpoint_portable().unwrap()).unwrap();
 // Reuse the installed generic codec producer, with mandatory roundtrip and
 // 53-bit guard proofs. It sees the source and sealed capabilities as data.
 let receipt=Command::new(env!("CARGO_BIN_EXE_ink")).arg("check-plan").arg(&source).arg(dir.join("plan.json")).output().unwrap();assert!(receipt.status.success());
 fs::write(dir.join("receipt.json"),receipt.stdout).unwrap();
 let py=r#"import json,sys
from pathlib import Path
from producers.state_protocols import candidates
p=Path(sys.argv[1]);receipt=json.loads((p/'receipt.json').read_text());context=receipt['state']
context.update(compiler=sys.argv[2],emit_target='javascript')
rows=list(candidates(context,capacities=(64,)))
plans=json.loads((p/'plan.json').read_text())
from producers.maintained_updates import guarded_word_update
import copy
guarded=copy.deepcopy(plans)
for step in guarded['steps']:
 if step['kind']=='maintained':step['package']=guarded_word_update(step['package'],p/'guarded-knowledge')
(p/'guarded.json').write_text(json.dumps(guarded))
zero=copy.deepcopy(plans)
for step in zero['steps']:
 if step['kind']=='maintained':step['package']=guarded_word_update(step['package'],p/'zero-knowledge',zero=True)
(p/'zero.json').write_text(json.dumps(zero))
dense=copy.deepcopy(guarded);dense['steps'].insert(-1,dict(kind='physical',package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=dense['steps'][-1]['package']['input_core_sha256'],dense_prefixes=[dict(table='Rows',capacity=64)])))
(p/'dense.json').write_text(json.dumps(dense))
zero['steps'].insert(-1,dense['steps'][-2]);(p/'zero_dense.json').write_text(json.dumps(zero))
for row in rows:
 if row['status']!='proposal' or '/columns/' not in row['label']:continue
 v=dict(plans);v['steps']=[*plans['steps'],row['step']]
 name='number' if row['step']['package']['columns'][0]['exact_numbers'] else 'word'
 (p/(name+'.json')).write_text(json.dumps(v))
"#;
 let out=Command::new("python3").arg("-c").arg(py).arg(&dir).arg(env!("CARGO_BIN_EXE_ink")).env("PYTHONPATH",format!("{}:{}",root.join("knowledge").display(),std::env::var("PYTHONPATH").unwrap_or_default())).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 for name in ["number","word"]{
  let p:planning::Package=serde_json::from_slice(&fs::read(dir.join(format!("{name}.json"))).unwrap()).unwrap();
  let checked=planning::check(&module,&p).unwrap();
  fs::write(dir.join(format!("{name}.mjs")),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();
  let mut forged=p.clone();if let planning::Step::Protocol(p)=forged.steps.last_mut().unwrap(){p.columns[0].codec.roundtrip="0".repeat(64);}
  assert!(planning::check(&module,&forged).is_err());
  if name=="number"{let mut forged=p.clone();if let planning::Step::Protocol(p)=forged.steps.last_mut().unwrap(){p.columns[0].guards.values_mut().next().unwrap().problem_sha256="0".repeat(64);}assert!(planning::check(&module,&forged).is_err());}
  if name=="number"{let mut forged=p.clone();if let planning::Step::Protocol(p)=forged.steps.last_mut().unwrap(){p.columns[0].guards.clear();}assert!(planning::check(&module,&forged).unwrap_err().contains("guard certificate"));}
 }
 for name in ["guarded","dense","zero","zero_dense"]{
  let p:planning::Package=serde_json::from_slice(&fs::read(dir.join(format!("{name}.json"))).unwrap()).unwrap();
  let checked=planning::check(&module,&p).unwrap();
  fs::write(dir.join(format!("{name}.mjs")),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();
  let mut forged=p.clone();for step in &mut forged.steps{if let planning::Step::Maintained(p)=step{p.views[0].update.as_mut().unwrap().proof=verified_language::logic::Proof::Refl(verified_language::logic::Term::U64(0));}}
  assert!(planning::check(&module,&forged).is_err());
 }
 for (name,events) in [("compact",false),("compact_events",true)]{
  let mut p=packet.clone();if let planning::Step::Protocol(p)=p.steps.last_mut().unwrap(){p.event_columns=events;p.compact_commits=Some(serde_json::from_slice(&std::process::Command::new("python3").args(["-c","import gzip,sys;sys.stdout.buffer.write(gzip.open(sys.argv[1],'rb').read())"]).arg(root.join("knowledge/producers/data/commit-word53.json.gz")).output().unwrap().stdout).unwrap());}
  let checked=planning::check(&module,&p).unwrap();fs::write(dir.join(format!("{name}.mjs")),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();
  if events{let mut inline=p.clone();if let planning::Step::Protocol(p)=inline.steps.last_mut().unwrap(){p.inline_maintenance=true;}let checked=planning::check(&module,&inline).unwrap();fs::write(dir.join("inline_compact.mjs"),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();}
  let mut forged=p;if let planning::Step::Protocol(p)=forged.steps.last_mut().unwrap(){p.compact_commits.as_mut().unwrap().problem_sha256="0".repeat(64);}assert!(planning::check(&module,&forged).is_err());
 }
 let mut boundaries=vec![];
 for version in [9007199254740990u64,9007199254740991,9007199254740992,9007199254740993,u64::MAX-1,u64::MAX]{
  let mut saved:Value=serde_json::from_slice(&oracle.checkpoint().unwrap()).unwrap();saved["version"]=json!(version);let mut rt=Runtime::restore(parse(SOURCE).unwrap(),&serde_json::to_vec(&saved).unwrap()).unwrap();let seed=rt.checkpoint_portable().unwrap();
  let failed=rt.invoke_json("put",&json!([0,97,true,true])).unwrap().json();let result=rt.invoke_json("put",&json!([0,97,true,false]));
  boundaries.push(json!({"seed":seed,"failed":normal(&failed),"result":result.as_ref().ok().map(|r|normal(&r.json())),"snapshot":rt.checkpoint_portable().unwrap()}));
 }
 fs::write(dir.join("commit_boundaries.json"),serde_json::to_vec(&boundaries).unwrap()).unwrap();
 fs::write(dir.join("run.mjs"),include_str!("support/state_protocol.mjs")).unwrap();
 let out=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();fs::write(dir.join("validation.log"),[out.stdout.as_slice(),out.stderr.as_slice()].concat()).unwrap();
 assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let _=plan;
}

#[path="support/parity.rs"] mod parity;
#[test]
fn explicit_protocols_preserve_cpu_wasm_and_actual_eligible_gpu_values(){
 let source=format!("{}\nfn paint(xs:List<u32>)->List<u32>{{return xs.map(fn(v)=>v*3+1);}}",SOURCE.replace("emits(seen){","emits(seen) protocol(preflight){"));
 let program=parse(&source).unwrap();let mut rt=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let values=json!([0,1,u32::MAX]);let f=program.functions.iter().find(|f|f.name=="paint").unwrap();
 let argument=verified_language::eval::Value::from_program_json(&values,&f.params[0].1,&program).unwrap();
 let result=verified_language::eval::call(&program,"paint",vec![argument],&mut 1000000).unwrap().json();
 steps.push(json!({"pure":"paint","args":[values],"expect_gpu":true}));expected.push(json!({"reply":{"value":result},"snapshot":rt.checkpoint_portable().unwrap()}));
 for (name,args) in [("put",json!([0,u64::MAX,true,false])),("put",json!([0,7,false,true])),("put",json!([9999,13,true,false])),("erase",json!([9999,true])),("erase",json!([9999,false])),("total_query",json!([])),("count_query",json!([]))]{
  let reply=rt.invoke_json(name,&args).unwrap().json();steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":reply},"snapshot":rt.checkpoint_portable().unwrap()}));
 }
 let module=CheckedModule::from_source(program).unwrap();let packet=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),steps:vec![]};let checked=planning::check(&module,&packet).unwrap();
 parity::conformance_planned("preflight-source-protocol",&checked,&source,steps,expected);
}
#[test]
fn scalar_column_lanes_preserve_full_width_and_raw_float_bits(){
 let source=r#"module lanes;record Row{word:u64,small:u32,signed:i32,flag:Bool,bits:f32,}state T:Table<u32,Row> = Table.empty();change put(k:u32,row:Row)->Unit writes(T){T.put(k,row);return ();}query get(k:u32)->Option<Row> reads(T){return T.get(k);}"#;
 let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));let dir=directory().join("lanes");fs::create_dir_all(&dir).unwrap();
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();fs::write(dir.join("source.core.json"),module.bytes().unwrap()).unwrap();
 let packet=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),steps:vec![]};fs::write(dir.join("base.json"),serde_json::to_vec(&packet).unwrap()).unwrap();
 let out=Command::new(env!("CARGO_BIN_EXE_ink")).arg("check-plan").arg(dir.join("source.core.json")).arg(dir.join("base.json")).arg("--core").output().unwrap();assert!(out.status.success());fs::write(dir.join("receipt.json"),out.stdout).unwrap();
 let py=r#"import json,sys
from pathlib import Path
from producers.state_protocols import candidates
p=Path(sys.argv[1]);c=json.loads((p/'receipt.json').read_text())['state'];c.update(compiler=sys.argv[2],emit_target='javascript')
base=json.loads((p/'base.json').read_text())
for r in candidates(c,capacities=(8,)):
 if r['status']!='proposal'or '/columns/'not in r['label']:continue
 q=dict(base);q['steps']=[r['step']];name='number'if r['step']['package']['columns'][0]['exact_numbers']else'word';(p/(name+'.json')).write_text(json.dumps(q))
"#;
 let out=Command::new("python3").arg("-c").arg(py).arg(&dir).arg(env!("CARGO_BIN_EXE_ink")).env("PYTHONPATH",format!("{}:{}",root.join("knowledge").display(),std::env::var("PYTHONPATH").unwrap_or_default())).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 fs::write(dir.join("base.mjs"),verified_language::javascript::lower(&module).unwrap().javascript).unwrap();
 for n in ["word","number"]{let p:planning::Package=serde_json::from_slice(&fs::read(dir.join(format!("{n}.json"))).unwrap()).unwrap();let checked=planning::check(&module,&p).unwrap();fs::write(dir.join(format!("{n}.mjs")),verified_language::javascript::lower_planned(&checked).unwrap().javascript).unwrap();}
 let mut rt=Runtime::new(parse(source).unwrap()).unwrap();let mut histories=vec![];
 for (i,bits) in [0x80000000u32,0x7fc01234,0x7f800000,0xff800000,0x3f800000,0x00000001].into_iter().enumerate(){
  let key=if i%2==0{i as u32}else{999};let args=json!([key,{"word":u64::MAX,"small":u32::MAX,"signed":i32::MIN,"flag":i%2==0,"bits":{"F32Bits":bits}}]);rt.invoke_json("put",&args).unwrap();let mut js_args=args.clone();js_args[1]["word"]=json!(u64::MAX.to_string());histories.push(json!({"args":js_args,"snapshot":rt.checkpoint_portable().unwrap()}));
 }
 fs::write(dir.join("history.json"),serde_json::to_vec(&histories).unwrap()).unwrap();
 let js=r#"import assert from 'node:assert/strict';import fs from 'node:fs';const hs=JSON.parse(fs.readFileSync(new URL('./history.json',import.meta.url)));for(const n of ['base','word','number']){const {createState}=await import(new URL('./'+n+'.mjs',import.meta.url));const s=createState();for(const h of hs){s.invoke('put',h.args);assert.deepEqual([...await s.checkpoint()],h.snapshot,n+' bits');}const bytes=await s.checkpoint();await s.restore(bytes);assert.deepEqual(await s.checkpoint(),bytes);const row=s.invoke('get',[999]).result.Some;row.word=0n;assert.equal(s.invoke('get',[999]).result.Some.word,18446744073709551615n);console.log(n+' exact scalar lanes passed');}"#;
 fs::write(dir.join("run.mjs"),js).unwrap();let out=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
}
