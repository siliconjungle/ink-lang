use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{check,core::CheckedModule,eval,law_author,optimisation,semantic as s,stateful::Runtime,syntax};
#[path="support/parity.rs"] mod parity;

const SOURCE:&str=r#"module record_values;
record Row{key:u32,payload:List<u32>,}
record Frame{data:Buffer<u32>,tag:u64,}
enum Error{Rejected,}
fn rebuilt(row:Row)->Row{return Row{payload:row.payload,key:row.key};}
fn row_size(row:Row)->u32{return length(row.payload);}
fn owned(xs:List<u32>,tag:u64)->List<u32>{let frame=Frame{data:buffer(xs),tag:tag};let moved=Frame{data:frame.data,tag:frame.tag};return moved.data.freeze();}
private state Saved:List<Row>=[];
event total:u32;
change save(row:Row,reject:Bool)->Result<u32,Error> writes(Saved) emits(total){Saved=[rebuilt(row)];let n=row_size(row);emit total(n);return choose(reject,Err(Error.Rejected),Ok(n));}
query saved()->List<Row> reads(Saved){return Saved;}
"#;
const LAWS:&str=r#"module record_laws;
record Row{key:u32,payload:List<u32>,}
record Frame{data:Buffer<u32>,tag:u64,}
law row_identity(row:Row){Row{payload:row.payload,key:row.key}==row;proof by normalize;}
law frame_identity(frame:Frame){Frame{data:frame.data,tag:frame.tag}==frame;proof by normalize;}
"#;

#[test]
fn checked_record_reconstruction_preserves_all_cpu_values_events_and_rollback(){
 let program=syntax::parse(SOURCE).unwrap();let module=CheckedModule::from_source(program.clone()).unwrap();
 let authored=law_author::compile_source(syntax::parse_law_source(LAWS).unwrap(),BTreeMap::new(),None).unwrap();
 let mut applications=vec![];
 fn sites(t:&s::Term,path:Vec<usize>,record:&str,out:&mut Vec<(Vec<usize>,s::Term)>){
  if let s::Node::Op(name,args)=&t.node{if name==&format!("record:{record}"){
   if let Some(first)=args.first(){if let s::Node::Op(field,roots)=&first.node{if field.starts_with("field:")&&roots.len()==1&&args.iter().all(|a|matches!(&a.node,s::Node::Op(field,other)if field.starts_with("field:")&&other==roots)){out.push((path.clone(),roots[0].clone()));}}}
  }}
  for (index,child)in s::children(t).into_iter().enumerate(){let mut next=path.clone();next.push(index);sites(child,next,record,out);}
 }
 for (function,record,law,root)in [("rebuilt","Row","row_identity","row"),("owned","Frame","frame_identity","frame")]{
  let f=program.functions.iter().find(|f|f.name==function).unwrap();let term=s::elaborate(&f.body,&check::params_env(&f.params).unwrap(),&program,&f.result).unwrap();let mut found=vec![];sites(&term,vec![],record,&mut found);
  for (path,argument)in found{applications.push(optimisation::Site{function:function.into(),path,law:authored.names[law].clone(),arguments:BTreeMap::from([(root.into(),argument)]),premises:vec![]});}
 }
 assert_eq!(applications.len(),2);
 let package=optimisation::Package{schema:1,semantics:optimisation::SEMANTICS.into(),input_core_sha256:module.identity().unwrap(),knowledge:authored.bundle,applications,action_replacement:None,contract_refinement:None};
 let selected=optimisation::check(&module,&package).unwrap();
 assert!(!serde_json::to_string(&selected.module().program().functions.iter().find(|f|f.name=="rebuilt").unwrap().body).unwrap().contains("Record"));
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (name,args)in [("rebuilt",json!([{"key":4294967295u32,"payload":[0,1,4294967295u32]}])),("owned",json!([[],9007199254740991u64])),("owned",json!([[0,1,4294967295u32],0u64]))]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect::<Vec<_>>();
  let want=eval::call(&program,name,values.clone(),&mut 1_000_000).unwrap().json();assert_eq!(eval::call_selected(&selected,name,values,&mut 1_000_000).unwrap().json(),want);
  steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 let mut baseline=Runtime::new(program.clone()).unwrap();let mut runtime=Runtime::new_selected(&selected).unwrap();
 for reject in [false,true,false]{
  let args=json!([{"key":7,"payload":[1,2]},reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();
  assert_eq!(out.json(),baseline.invoke_json("save",&args).unwrap().json());assert_eq!(runtime.checkpoint_portable().unwrap(),baseline.checkpoint_portable().unwrap());
  assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}
  steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 let out=runtime.invoke_json("saved",&json!([])).unwrap();steps.push(json!({"call":"saved","args":[]}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 parity::conformance_selected("record-extensionality-parity",&selected,SOURCE,steps,expected);
}
