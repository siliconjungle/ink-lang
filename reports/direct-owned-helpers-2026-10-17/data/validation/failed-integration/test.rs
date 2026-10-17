use serde_json::{json,Value};
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax::parse};
#[path="support/parity.rs"]mod parity;

#[test]
fn direct_owned_helpers_preserve_values_shared_lists_events_and_portable_state(){
 let mut source=include_str!("fixtures/owned-parameters.ink").to_owned();
 source+=&format!("fn wide(b:Buffer<f32>)->Buffer<f32>{{let xs:List<f32>=[{}];return b.push(xs.at_or(9,0.0));}}fn fallback(xs:List<f32>,x:f32,n:u32)->Out{{return Out{{values:wide(buffer(xs)).freeze(),shared:xs,indexed:[]}};}}",vec!["0.0";530].join(","));
 source+=r#"
trainable state Rows:Table<u32,List<f32>>=Table.empty();event computed:Out;
learn change seed(xs:List<f32>)->Unit writes(Rows){Rows.put(0,xs);return ();}
adaptive query read(xs:List<f32>,x:f32,n:u32)->Out reads(Rows){let stored=Rows.get(0).unwrap_or([]);return run(xs,x+stored.at_or(0,0.0),n);}
learn change fit(xs:List<f32>,x:f32,n:u32,fail:Bool)->Result<Out,String> reads(Rows) writes(Rows) emits(computed){let out=run(xs,x,n);Rows.put(0,out.values);emit computed(out);if fail{return Err("rollback");}return Ok(out);}
fn word_kernel(xs:List<u32>,x:u32)->List<u32>{return xs.map(fn(v)=>v+x);}
"#;
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();let mut runtime=Runtime::new(module.program().clone()).unwrap();
 let mut steps=vec![json!({"restore":runtime.checkpoint_portable().unwrap()})];let mut expected=vec![];
 let bits=[0u32,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x3f800001,0xbf800002,0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7f800001,0x7fc12345,0xffc12345,0x4b800000];
 let mut pure=|name:&str,args:Value,gpu:bool|{
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
  let value=eval::call_checked(&module,name,values,&mut 1_000_000).unwrap().json();
  let mut step=json!({"pure":name,"args":args});if gpu{step["expect_gpu"]=json!(true);}
  steps.push(step);expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
 };
 for(i,b)in bits.iter().enumerate(){let x=json!({"F32Bits":b});let y=json!({"F32Bits":bits[(i+3)%bits.len()]});
  for n in [0,1,4]{for xs in [json!([]),json!([x,y]),json!([y,x,0.5,-0.0,3.0])]{for name in ["run","fallback"]{pure(name,json!([xs,x,n]),false);}}}
  if i<3{pure("parallel",json!([[x,y],x,2]),false);}
 }
 pure("word_kernel",json!([[0,1,4294967295u32],1]),true);
 for b in bits{let x=json!({"F32Bits":b});
  for(name,args)in[("seed",json!([[x,0.5]])),("read",json!([[x,1.5],0.75,3])),("fit",json!([[x,1.5],0.75,3,false])),("read",json!([[x,1.5],0.75,4])),("fit",json!([[x,1.5],0.75,3,true])),("read",json!([[x,1.5],0.75,1]))]{
   let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(name,&args).unwrap().json();let snapshot=runtime.checkpoint_portable().unwrap();
   if name=="fit"&&args[3]==true{assert_eq!(before,snapshot);}
   steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":reply},"snapshot":snapshot}));
  }
  let snapshot=runtime.checkpoint_portable().unwrap();steps.push(json!({"restore":snapshot}));runtime=Runtime::restore_portable_checked(&module,&snapshot).unwrap();
 }
 assert_eq!(expected.len(),388);assert_eq!(steps.len(),405);
 parity::conformance_checked("owned-parameter-helper-parity",&module,&source,steps,expected);
}
