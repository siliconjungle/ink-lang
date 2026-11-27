use serde_json::json;
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[path="support/parity.rs"] mod parity;
const SOURCE:&str=r#"module StopLoans;
record Inner{data:Buffer<u32>,done:Bool,}
record State{inner:Inner,total:u32,}
fn observed(xs:List<u32>,done:Bool)->List<u32>{
 let seed=State{inner:Inner{data:buffer([7]),done:done},total:0};
 let result=fold_until(xs,seed,fn(x)=>fn(s)=>s.inner.done,
  fn(x)=>fn(s)=>State{inner:Inner{data:s.inner.data,done:x==2},total:s.total+x});
 return result.inner.data.push(result.total).freeze();
}
fn capture(xs:List<u32>,cut:u32)->List<u32>{
 let seed:Buffer<u32>=buffer([7]);
 let result=fold_until(xs,seed,fn(x)=>fn(s)=>x>=cut,
  fn(x)=>fn(s)=>s.push(x));return result.freeze();
}
record Entry{key:String,payload:List<u32>,}
record Entries{rows:List<Entry>,}
fn first(xs:List<Entry>,key:String)->List<u32>{
 let picked:List<u32>=fold_until(xs,[],fn(row)=>fn(old)=>row.key==key,
  fn(row)=>fn(old)=>if row.key==key {row.payload} else {old});
 return if length(xs)>0 {picked} else {[]};
}
fn shared(bundle:Entries,key:String)->List<Entry>{
 return fold_until(bundle.rows,bundle.rows,fn(row)=>fn(old)=>key==row.key,
  fn(row)=>fn(old)=>old.concat([row]));
}
fn assembled(xs:List<Entry>,ys:List<Entry>,zs:List<Entry>)->List<Entry>{
 return xs.concat(ys).concat(zs);
}
"#;
#[test]
fn owned_fold_stop_cannot_consume_or_mutate_the_step_owner(){
 for predicate in ["s.freeze().at_or(0,0)>0", "s.push(99).len()>0", "consume(s)", "choose(x>0,s.freeze().at_or(0,0)>0,false)"] {
  let source=format!(r#"module invalid;
fn consume(s:Buffer<u32>)->Bool{{return s.freeze().at_or(0,0)>0;}}
fn bad(xs:List<u32>)->List<u32>{{
 let seed:Buffer<u32>=buffer([7]);
 let result=fold_until(xs,seed,fn(x)=>fn(s)=>{predicate},fn(x)=>fn(s)=>s.push(x));
 return result.freeze();
}}"#);
  let error=syntax::parse(&source).and_then(CheckedModule::from_source).err().expect("consumed stop owner accepted");
  assert!(error.contains("borrowed temporary storage"),"{predicate}: {error}");
 }
}
#[test]
fn owned_fold_stop_preserves_observations_and_terminal_step_on_cpu_targets(){
 let program=syntax::parse(SOURCE).unwrap();CheckedModule::from_source(program.clone()).unwrap();
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let a=json!({"key":"雪","payload":[5,6]});
 let b=json!({"key":"雪","payload":[10]});
 let c=json!({"key":"","payload":[]});
 for (name,args,want) in [
  ("observed",json!([[1,2,3,4],false]),json!([7,6])),
  ("observed",json!([[1,2],true]),json!([7,1])),
  ("observed",json!([[],true]),json!([7,0])),
  ("observed",json!([[u32::MAX,1],false]),json!([7,0])),
  ("capture",json!([[1,2,3],2]),json!([7,1,2])),
  ("first",json!([[a,b,c],"雪"]),json!([5,6])),
  ("first",json!([[a,b,c],"missing"]),json!([])),
  ("first",json!([[],"missing"]),json!([])),
  ("shared",json!([{"rows":[a,b,c]},""]),json!([a,b,c,a,b,c])),
  ("shared",json!([{"rows":[a,b,c]},"雪"]),json!([a,b,c,a])),
  ("assembled",json!([[a],[b],[c]]),json!([a,b,c])),
  ("assembled",json!([[],[b],[]]),json!([b])),
 ]{
  let f=program.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  assert_eq!(eval::call(&program,name,values,&mut 100000).unwrap().json(),want,"{name}");
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
  expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 parity::conformance("fold-stop-loans-parity",program,SOURCE,steps,expected);
}
