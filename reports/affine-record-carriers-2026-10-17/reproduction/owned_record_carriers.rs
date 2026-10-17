use serde_json::{json,Value};
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax::parse};
#[path="support/parity.rs"]mod parity;

#[test]
fn affine_record_helpers_preserve_borrowed_inputs_events_and_portable_state(){
    let source=format!("{}\ntrainable state Rows:Table<u32,List<f32>>=Table.empty();event computed:Out;
learn change seed(xs:List<f32>)->Unit writes(Rows){{Rows.put(0,xs);return ();}}
adaptive query read(xs:List<f32>,w:f32,n:u32)->Out reads(Rows){{return run(xs,Rows.get(0).unwrap_or([]),w,n);}}
learn change fit(xs:List<f32>,w:f32,n:u32,fail:Bool)->Result<Out,String> reads(Rows) writes(Rows) emits(computed){{let result=run(xs,Rows.get(0).unwrap_or([]),w,n);Rows.put(0,result.left);emit computed(result);if fail{{return Err(\"rollback\");}}return Ok(result);}}",include_str!("../lowerings/js/tests/fixtures/owned-records.ink"));
    let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();let mut runtime=Runtime::new(module.program().clone()).unwrap();
    let mut steps=vec![json!({"restore":runtime.checkpoint_portable().unwrap()})];let mut expected=vec![];
    let bits=[0u32,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x3f800001,0xbf800002,
        0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7f800001,0x7fc12345,0xffc12345,0x4b800000];
    let mut pure=|name:&str,args:Value|{
        let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
        let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,ty))|eval::Value::from_program_json(v,ty,module.program()).unwrap()).collect();
        let value=eval::call_checked(&module,name,values,&mut 1_000_000).unwrap().json();
        steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    };
    for(i,b)in bits.iter().enumerate(){
        let x=json!({"F32Bits":b});let y=json!({"F32Bits":bits[(i+3)%bits.len()]});
        for n in [0,1,6]{for xs in [json!([]),json!([x,y]),json!([y,x,0.5,1.5,-2.0,3.0])]{
            for name in ["run","until","reordered","indexed","folded_left","folded_right","folded_until","nested"]{pure(name,json!([xs,[y,x],x,n]));}
        }}
        if i<3{pure("parallel",json!([[x,y],x,3]));}
    }
    for b in bits{
        let x=json!({"F32Bits":b});
        for(name,args)in[("seed",json!([[x,0.5]])),("read",json!([[x,1.5],0.75,3])),
            ("fit",json!([[x,1.5],0.75,3,false])),("read",json!([[x,1.5],0.75,6])),
            ("fit",json!([[x,1.5],0.75,3,true])),("read",json!([[x,1.5],0.75,1]))]{
            let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(name,&args).unwrap().json();let snapshot=runtime.checkpoint_portable().unwrap();
            if name=="fit"&&args[3]==true{assert_eq!(before,snapshot);}
            steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":reply},"snapshot":snapshot}));
        }
        let snapshot=runtime.checkpoint_portable().unwrap();steps.push(json!({"restore":snapshot}));runtime=Runtime::restore_portable_checked(&module,&snapshot).unwrap();
    }
    assert_eq!(expected.len(),1251);assert_eq!(steps.len(),1268);
    parity::conformance_checked("owned-record-carrier-parity",&module,&source,steps,expected);
}
