use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{core::CheckedModule,eval,law_author,optimisation,semantic as s,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module append_values;
fn joined(a:List<u32>,b:List<u32>)->List<u32>{let first=buffer(a);let second=buffer(b);return first.append(second).freeze();}
fn caller(a:List<u32>,b:List<u32>)->List<u32>{return joined(a,b);}
enum Error{Rejected,}
private state Saved:List<u32>=[];
event items_count:u32;
fn size(values:List<u32>)->u32{return length(values);}
change save(a:List<u32>,b:List<u32>,reject:Bool)->Result<u32,Error> writes(Saved) emits(items_count){Saved=caller(a,b);let n=size(Saved);emit items_count(n);return choose(reject,Err(Error.Rejected),Ok(n));}
"#;
const LAWS:&str=r#"module append_laws;
fn joined(a:List<u32>,b:List<u32>)->List<u32>{let first=buffer(a);let second=buffer(b);return first.append(second).freeze();}
law decode(a:List<u32>,b:List<u32>){joined(a,b)==a.concat(b);proof by normalize;}
"#;
#[test]
fn append_decode_rewrite_preserves_all_cpu_values_events_errors_and_snapshots(){
 let program=syntax::parse(SOURCE).unwrap();let module=CheckedModule::from_source(program.clone()).unwrap();
 let authored=law_author::compile_source(syntax::parse_law_source(LAWS).unwrap(),BTreeMap::new(),None).unwrap();let sort=s::value(syntax::Type::List(Box::new(syntax::Type::U32)));
 let package=optimisation::Package{schema:1,semantics:optimisation::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),knowledge:authored.bundle,applications:vec![optimisation::Site{function:"caller".into(),path:vec![],law:authored.names["decode"].clone(),arguments:BTreeMap::from([("a".into(),s::free(sort.clone(),"a")),("b".into(),s::free(sort,"b"))]),premises:vec![]}],action_replacement:None,contract_refinement:None};
 let selected=optimisation::check(&module,&package).unwrap();let mut baseline=Runtime::new(program.clone()).unwrap();let mut runtime=Runtime::new_selected(&selected).unwrap();let mut steps=vec![];let mut expected=vec![];
 for args in [json!([[],[]]),json!([[0,1],[]]),json!([[],[4294967295u32]]),json!([[1,2],[3,4]])]{
  let f=program.functions.iter().find(|f|f.name=="caller").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect::<Vec<_>>();let want=eval::call(&program,"caller",values.clone(),&mut 100000).unwrap().json();assert_eq!(eval::call_selected(&selected,"caller",values,&mut 100000).unwrap().json(),want);
  steps.push(json!({"pure":"caller","args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for reject in [false,true,false]{let args=json!([[0,4294967295u32],[7,8],reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();assert_eq!(out.json(),baseline.invoke_json("save",&args).unwrap().json());assert_eq!(runtime.checkpoint_portable().unwrap(),baseline.checkpoint_portable().unwrap());if reject{assert!(!out.committed);assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert!(out.committed);assert_eq!(out.events.len(),1);}steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 parity::conformance_selected("buffer-append-meaning-parity",&selected,SOURCE,steps,expected);
}
