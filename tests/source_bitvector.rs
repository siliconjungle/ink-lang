use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{check,core::CheckedModule,eval,law_author,optimisation,semantic as s,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module scalar_bits;
record Row{value:u32,tag:u64,}
fn pack(high:u64,low:u64)->u64{return wrapping_shl(high,32) | low;}
fn high(value:u64)->u64{return wrapping_shr(value,32);}
fn cap(value:u64)->u64{return choose(value>255,255,value);}
fn probe(value:u64)->u64{return cap(value&255);}
enum Error{Rejected,}
private state Saved:u64=0;
event clipped:u64;
change save(value:u64,reject:Bool)->Result<u64,Error> writes(Saved) emits(clipped){Saved=probe(value);emit clipped(Saved);return choose(reject,Err(Error.Rejected),Ok(Saved));}
query saved()->u64 reads(Saved){return Saved;}
"#;
#[test]
fn replayed_scalar_circuit_rewrite_preserves_all_cpu_values_events_and_rollback(){
 let program=syntax::parse(SOURCE).unwrap();let module=CheckedModule::from_source(program.clone()).unwrap();
 let evidence=serde_json::from_str(include_str!("../core/tests/fixtures/source-bitvector-evidence.json")).unwrap();
 let authored=law_author::compile_source(syntax::parse_law_source(include_str!("../core/tests/fixtures/source-bitvector-laws.ink")).unwrap(),evidence,None).unwrap();
 let f=program.functions.iter().find(|f|f.name=="probe").unwrap();
 let term=s::elaborate(&f.body,&check::params_env(&f.params).unwrap(),&program,&f.result).unwrap();
 fn find(t:&s::Term,path:Vec<usize>,found:&mut Vec<Vec<usize>>){
  if matches!(&t.node,s::Node::Op(n,_)if n=="call:cap"){found.push(path.clone());}
  for (i,t)in s::children(t).into_iter().enumerate(){let mut p=path.clone();p.push(i);find(t,p,found);}
 }
 let mut sites=vec![];find(&term,vec![],&mut sites);assert_eq!(sites.len(),1);
 let package=optimisation::Package{schema:1,semantics:optimisation::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),knowledge:authored.bundle,applications:vec![optimisation::Site{function:"probe".into(),path:sites.remove(0),law:authored.names["masked_cap"].clone(),arguments:BTreeMap::from([("value".into(),s::free(s::value(syntax::Type::U64),"value"))]),premises:vec![]}],action_replacement:None,contract_refinement:None};
 let selected=optimisation::check(&module,&package).unwrap();
 assert!(!serde_json::to_string(&selected.module().program().functions.iter().find(|f|f.name=="probe").unwrap().body).unwrap().contains("cap"));
 let mut baseline=Runtime::new(program.clone()).unwrap();let mut runtime=Runtime::new_selected(&selected).unwrap();let mut steps=vec![];let mut expected=vec![];
 for value in [0u64,1,255,256,511,4294967295,9007199254740991]{
  let args=json!([value]);let want=json!(value&255);
  assert_eq!(eval::call(&program,"probe",vec![eval::Value::U64(value)],&mut 100000).unwrap().json(),want);
  assert_eq!(eval::call_selected(&selected,"probe",vec![eval::Value::U64(value)],&mut 100000).unwrap().json(),want);
  steps.push(json!({"pure":"probe","args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for (value,reject)in [(511u64,false),(256,true),(4294967295,false)]{
  let args=json!([value,reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();
  assert_eq!(out.json(),baseline.invoke_json("save",&args).unwrap().json());assert_eq!(runtime.checkpoint_portable().unwrap(),baseline.checkpoint_portable().unwrap());
  assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}
  steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance_selected("source-bitvector-parity",&selected,SOURCE,steps,expected);
}
