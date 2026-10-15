use ink_core::{core::CheckedModule,eval,syntax,stateful::{Runtime,Value},snapshot_wire};
use serde_json::json;
fn checked(source:&str)->CheckedModule{CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()}
fn call(m:&CheckedModule,name:&str,args:Vec<eval::Value>)->eval::Value{eval::call(m.program(),name,args,&mut 1_000_000).unwrap()}
#[test]
fn explicit_literals_keep_binary64_precision_and_legacy_float_identities(){
 let m=checked("module wide;fn exact()->f64{return 1.0000000000000002f64;}fn negative()->f64{return -0.0f64;}fn expo()->f64{return 5e-324f64;}fn hex()->u64{return 0xff64;}");
 assert_eq!(m.semantics(),ink_core::core::BINARY64_SEMANTICS);
 assert_eq!(call(&m,"exact",vec![]),eval::Value::F64(1.0000000000000002f64.to_bits()));
 assert_eq!(call(&m,"negative",vec![]),eval::Value::F64(1<<63));
 assert_eq!(call(&m,"expo",vec![]),eval::Value::F64(1));
 assert_eq!(call(&m,"hex",vec![]),eval::Value::U64(0xff64));
 let legacy=checked("module old;fn x()->f32{return 1.0000000000000002;}fn hex()->u64{return 0xff64;}");
 assert_eq!(call(&legacy,"x",vec![]),eval::Value::F32(1f32.to_bits()));
 assert_eq!(legacy.semantics(),ink_core::core::CANONICAL_FLOAT_SEMANTICS);
 let mut wire:serde_json::Value=serde_json::from_slice(&m.bytes().unwrap()).unwrap();wire["semantics"]=json!("ink-executable-core-v14");
 assert!(CheckedModule::from_bytes(&serde_json::to_vec(&wire).unwrap()).is_err());
 for source in ["module bad;fn x()->f64{return 1.0;}","module bad;fn x()->f64{return 9007199254740993;}","module bad;fn x()->f64{return 1e999f64;}"]{assert!(syntax::parse(source).and_then(CheckedModule::from_source).is_err());}
 let nominal=checked("module nominal;record f64{x:u64,}fn id(x:f64)->f64{return x;}");
 assert!(!nominal.bytes().unwrap().windows(5).any(|b|b==b"\"F64\""));
}
#[test]
fn raw_payloads_arithmetic_comparison_rounding_and_explicit_conversions(){
 let m=checked(r#"module values;
 fn arithmetic(x:f64,y:f64)->f64{return (x+y)*y-x;}
 fn divide(x:f64,y:f64)->f64{return x/y;}
 fn ratios(xs:List<f64>)->List<f64>{return xs.map(fn(x)=>x/2);}
 fn root(x:f64)->f64{return sqrt(x);}
 fn equal(x:f64,y:f64)->Bool{return x==y;}
 fn flip(x:f64)->f64{return -x;}
 fn bits(x:f64)->u64{return f64_bits(x);}
 fn rounded(x:f64)->f64{return round_ties_even(x);}
 fn classify(x:f64)->Bool{return is_nan(x)||!is_finite(x);}
 fn widen(x:u64)->f64{return f64_from_u64(x);}
 fn to_word(x:f64)->Option<u64>{return u64_from_f64(x);}
 fn total(xs:List<f64>)->f64{return sum(xs);}
 "#);
 let f=|x:f64|eval::Value::F64(x.to_bits());
 assert_eq!(call(&m,"arithmetic",vec![f(1.0000000000000002),f(2.0)]),f(5.0));
 assert_eq!(call(&m,"root",vec![f(2.0)]),f(2f64.sqrt()));
 assert_eq!(call(&m,"ratios",vec![eval::Value::List(vec![f(2.0),f(3.0)])]),eval::Value::List(vec![f(1.0),f(1.5)]));
 let nan=0x7ff0000000001234;
 assert_eq!(call(&m,"bits",vec![eval::Value::F64(nan)]),eval::Value::U64(nan));
 assert_eq!(call(&m,"flip",vec![eval::Value::F64(nan)]),eval::Value::F64(nan^(1<<63)));
 assert_eq!(call(&m,"equal",vec![f(0.0),f(-0.0)]),eval::Value::Bool(true));
 assert_eq!(call(&m,"equal",vec![eval::Value::F64(nan),eval::Value::F64(nan)]),eval::Value::Bool(false));
 assert_eq!(call(&m,"divide",vec![f(0.0),f(0.0)]),eval::Value::F64(ink_core::float64::CANONICAL_NAN));
 assert_eq!(call(&m,"rounded",vec![f(2.5)]),f(2.0));
 assert_eq!(call(&m,"rounded",vec![f(-0.5)]),f(-0.0));
 assert_eq!(call(&m,"classify",vec![eval::Value::F64(nan)]),eval::Value::Bool(true));
 assert_eq!(call(&m,"widen",vec![eval::Value::U64(u64::MAX)]),f(18446744073709551616.0));
 assert_eq!(call(&m,"to_word",vec![f(18446744073709551616.0)]),eval::Value::Opaque(Value::Option(None)));
 assert_eq!(call(&m,"to_word",vec![f(-0.5)]),eval::Value::Opaque(Value::Option(Some(Box::new(Value::U64(0))))));
 assert_eq!(call(&m,"total",vec![eval::Value::List(vec![f(9007199254740992.0),f(1.0),f(-9007199254740992.0)])]),f(0.0));
 assert_eq!(call(&m,"total",vec![eval::Value::List(vec![])]),f(0.0));
}
#[test]
fn binary64_state_actions_events_snapshots_and_rollback_preserve_all_bits(){
 let m=checked(r#"module state64;
 trainable state Current:f64=1.0000000000000002f64;
 event changed:f64;
 query get()->f64 reads(Current){return Current;}
 query half()->f64 reads(Current){return Current/2;}
 learn change put(x:f64,fail:Bool)->Result<Unit,String> writes(Current) emits(changed){Current=x;emit changed(x);if fail{return Err("cancel");}return Ok(());}
 "#);
 let mut r=Runtime::from_checked(&m).unwrap();
 for bits in [0,1<<63,1,0x7ff0000000001234,0xfff8000000005678,u64::MAX]{
  let json=json!({"F64Bits":bits.to_string()});let value=Value::from_json(&json,&ink_core::syntax::Type::F64,m.program()).unwrap();
  assert_eq!(value,Value::F64(bits));
  let before=r.checkpoint_portable().unwrap();
  let aborted=r.invoke("put",vec![value.clone(),Value::Bool(true)]).unwrap();assert!(!aborted.committed);assert!(aborted.events.is_empty());assert_eq!(r.checkpoint_portable().unwrap(),before);
  let reply=r.invoke("put",vec![value.clone(),Value::Bool(false)]).unwrap();assert!(reply.committed);assert_eq!(reply.events.len(),1);assert_eq!(reply.events[0].value,value);
  assert_eq!(r.invoke("get",vec![]).unwrap().result,value);
  let saved=r.checkpoint_portable().unwrap();let mut restored=Runtime::restore_portable(m.program().clone(),&saved).unwrap();
  assert_eq!(restored.invoke("get",vec![]).unwrap().result,value);
  assert_eq!(restored.checkpoint_portable().unwrap(),saved);
 }
 let s=snapshot_wire::Schema::F64;
 for bad in [json!({"F64Bits":1}),json!({"F64Bits":"01"}),json!({"F64Bits":"18446744073709551616"}),json!({"F64Bits":"-1"}),json!({"F64Bits":"0","extra":0})]{assert!(ink_core::float64::from_json_bits(&bad).is_err());}
 assert_eq!(snapshot_wire::descriptor(&s),json!({"kind":"f64"}));
}
#[test]
fn binary64_cannot_acquire_float32_or_word_rewrite_authority(){
 use ink_core::semantic::{self as s,Node,Sort,Term,Budget};
 use std::collections::BTreeMap;
 let p=syntax::parse("module p;fn identity(x:f64)->f64{return x;}").unwrap();
 let f64sort=s::value(ink_core::syntax::Type::F64);
 let x=s::free(f64sort.clone(),"x");let mut env=BTreeMap::new();env.insert("x".into(),f64sort.clone());
 assert!(s::validate(&x,&env,&p,&mut Budget::new()).unwrap_err().contains("binary64"));
 let eq=s::op(s::value(ink_core::syntax::Type::Bool),"binary:==",vec![s::term(f64sort.clone(),Node::Bound(0)),s::term(f64sort.clone(),Node::Bound(0))]);
 let closure=Term{sort:Sort::Arrow(Box::new(f64sort),Box::new(s::value(ink_core::syntax::Type::Bool))),node:Node::Lambda(Box::new(eq))};
 assert!(s::validate(&closure,&BTreeMap::new(),&p,&mut Budget::new()).unwrap_err().contains("binary64"));
 let argument=s::op(s::value(ink_core::syntax::Type::F64),"call:f64_from_bits",vec![s::word(ink_core::syntax::Type::U64,0)]);
 let closed=s::op(s::value(ink_core::syntax::Type::Bool),"apply",vec![closure,argument]);
 assert!(s::validate(&closed,&BTreeMap::new(),&p,&mut Budget::new()).unwrap_err().contains("binary64"));
}
#[test]
fn external_float32_laws_keep_division_meaning_while_binary64_laws_reject(){
 use std::collections::BTreeMap;
 use ink_core::{law_author,registry::CheckedBundle};
 for declaration in [
  "law division(x:f32,y:f32){x/y==f32_div(x,y);proof by normalize;}",
  "rewrite division(x:f32,y:f32){from x/y;to f32_div(x,y);proof by normalize;}",
 ]{
  let source=format!("module division_laws;{declaration}");
  let authored=law_author::compile_source(syntax::parse_law_source(&source).unwrap(),BTreeMap::new(),None).unwrap();
  CheckedBundle::check(&authored.bundle).unwrap();
 }
 let source="module wide_law;law division(x:f64,y:f64){x/y==f64_div(x,y);proof by normalize;}";
 assert!(syntax::parse_law_source(source).and_then(|s|law_author::compile_source(s,BTreeMap::new(),None)).is_err());
}
