use serde_json::json;
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module CaptureEnd;
record Read{a:List<u32>,b:List<u32>,}
record Owned{a:Buffer<u32>,b:Buffer<u32>,total:u32,}
fn rebuild(read:Read,limit:u32)->List<u32>{
 let seed:u32=0;let total=repeat_until(limit,seed,fn(total)=>total>100,fn(i)=>fn(total)=>total+read.a.at_or(i,7)+read.b.at_or(i,9));
 let owner=Owned{a:buffer(read.a),b:buffer(read.b),total:total};
 return owner.a.append(owner.b).push(owner.total).freeze();
}
fn folded(read:Read,items:List<u32>)->List<u32>{
 let seed:u32=0;let total=fold_until(items,seed,fn(x)=>fn(total)=>x==2,fn(x)=>fn(total)=>total+read.a.at_or(x,5));
 return rebuild(Read{a:read.a,b:read.b},total);
}
fn nested(read:Read)->List<u32>{
 let seed:u32=0;let total=repeat(3,seed,fn(i)=>fn(total)=>total+repeat(2,seed,fn(j)=>fn(inner)=>inner+read.a.at_or(i+j,1)));
 return buffer(read.a).append(buffer(read.b)).push(total).freeze();
}
enum Error{Rejected,}
private state Saved:List<u32>=[];
event saved:List<u32>;
change save(read:Read,limit:u32,reject:Bool)->Result<List<u32>,Error> writes(Saved) emits(saved){
 Saved=rebuild(read,limit);emit saved(Saved);return choose(reject,Err(Error.Rejected),Ok(Saved));
}
"#;
#[test]
fn ended_capture_loans_preserve_values_events_and_rollback_on_all_cpu_targets(){
 let program=syntax::parse(SOURCE).unwrap();CheckedModule::from_source(program.clone()).unwrap();
 let mut runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (name,args)in [
  ("rebuild",json!([{"a":[1,2,3],"b":[4,5]},0])),
  ("rebuild",json!([{"a":[1,2,3],"b":[4,5]},4])),
  ("rebuild",json!([{"a":[u32::MAX],"b":[1]},3])),
  ("rebuild",json!([{"a":[],"b":[]},u32::MAX])),
  ("folded",json!([{"a":[1,2,3],"b":[9]},[0,2,1]])),
  ("folded",json!([{"a":[],"b":[]},[]])),
  ("nested",json!([{"a":[1,2,3],"b":[4,5]}])),
 ]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  let want=eval::call(&program,name,values,&mut 100000).unwrap().json();
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for reject in [false,true,false]{
  let args=json!([{"a":[1,2,3],"b":[4,5]},4,reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();
  assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}
  steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("capture-end-moves-parity",program,SOURCE,steps,expected);
}
