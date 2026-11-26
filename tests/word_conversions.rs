use ink_core::{core::CheckedModule,eval,semantic as s,syntax};
use serde_json::json;
#[test]
fn fixed_unsigned_conversions_have_distinct_sorts_and_versioned_meanings(){
 let source="module conversions;fn wide(x:u32)->u64{return word_widen_u32_to_u64(x);}fn low(x:u64)->u32{return word_narrow_u64_to_u32(x);}fn roundtrip(x:u32)->u32{return word_narrow_u64_to_u32(word_widen_u32_to_u64(x));}";
 let m=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();assert_eq!(m.semantics(),ink_core::core::WORD_CONVERSION_SEMANTICS);
 for x in [0,u32::MAX,0x80000000,255,65536]{assert_eq!(eval::call(m.program(),"wide",vec![eval::Value::U32(x)],&mut 1000).unwrap().json(),json!(u64::from(x)));assert_eq!(eval::call(m.program(),"roundtrip",vec![eval::Value::U32(x)],&mut 1000).unwrap().json(),json!(x));}
 for x in [0,1,u32::MAX as u64,1u64<<32,u64::MAX,0x8000000000000001]{assert_eq!(eval::call(m.program(),"low",vec![eval::Value::U64(x)],&mut 1000).unwrap().json(),json!(x as u32));}
 let mut old:serde_json::Value=serde_json::from_slice(&m.bytes().unwrap()).unwrap();old["semantics"]=json!(ink_core::core::VALUE_SEMANTICS);assert!(CheckedModule::from_bytes(&serde_json::to_vec(&old).unwrap()).is_err());
 let baseline=CheckedModule::from_source(syntax::parse("module old;fn identity(x:u32)->u32{return x;}").unwrap()).unwrap();assert_ne!(baseline.semantics(),m.semantics());CheckedModule::from_bytes(&baseline.bytes().unwrap()).unwrap();
 for source in ["module bad;fn f(x:u64)->u64{return word_widen_u32_to_u64(x);}","module bad;fn f(x:u32)->u32{return word_narrow_u64_to_u32(x);}","module bad;fn f(x:u32)->u64{return word_widen_u32_to_u64(x,x);}"]{assert!(CheckedModule::from_source(syntax::parse(source).unwrap()).is_err());}
 let f=&m.program().functions[0];let env=ink_core::check::params_env(&f.params).unwrap();let term=s::elaborate(&f.body,&env,m.program(),&f.result).unwrap();let mut wrong=term.clone();wrong.sort=s::value(syntax::Type::U32);assert!(s::validate(&wrong,&env.iter().map(|(n,t)|(n.clone(),s::value(t.clone()))).collect(),m.program(),&mut s::Budget::new()).is_err());
 let expression=s::reify(&term,m.program()).unwrap();assert_eq!(ink_core::check::infer(&expression,&env,m.program()).unwrap(),syntax::Type::U64);
}
