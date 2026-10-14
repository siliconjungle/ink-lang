use serde_json::json;use verified_language::{eval,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module word_widths;
record Pair{wide:u64,low:u32,}
enum Error{Missing,Rejected,}
state Values:Table<u32,Pair> = Table.empty();
event seen:Pair;
fn convert(x:u32,y:u64)->Pair{return Pair{wide:word_widen_u32_to_u64(x),low:word_narrow_u64_to_u32(y)};}
change put(key:u32,x:u32,y:u64,fail:Bool)->Result<Pair,Error> writes(Values) emits(seen){
 let p=convert(x,y);if Values.contains(key){Values.replace(key,p);}else{Values.insert(key,p);}emit seen(p);if fail{return Err(Error.Rejected);}return Ok(p);}
query read(key:u32)->Result<Pair,Error> reads(Values){return Values.get(key).ok_or(Error.Missing);}
"#;
#[test]
fn general_word_width_conversions_preserve_values_events_rollback_and_snapshots(){
 let p=syntax::parse(SOURCE).unwrap();let mut runtime=Runtime::new(p.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for(x,y)in [(0,0),(u32::MAX,u64::MAX),(0x80000000,1u64<<32),(255,0x8000000000000001)]{
  let args=json!([x,y]);let f=p.functions.iter().find(|f|f.name=="convert").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();let want=json!({"wide":u64::from(x),"low":y as u32});assert_eq!(eval::call(&p,"convert",values,&mut 1000).unwrap().json(),want);
  steps.push(json!({"pure":"convert","args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
  for(name,args)in [("put",json!([1,x,y,false])),("put",json!([1,0,u64::MAX,true])),("read",json!([1]))]{let outcome=runtime.invoke_json(name,&args).unwrap().json();steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":outcome},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 }
 parity::conformance("word-width-conversions",p,SOURCE,steps,expected);
}
