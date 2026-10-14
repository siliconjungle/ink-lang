use serde_json::{json,Value};
use std::{fs,path::Path};
use verified_language::{contracts,core::CheckedModule,eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
fn program()->verified_language::syntax::Program{
 let mut p=modules::load(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/checked-sets/main.ink")).unwrap().program;
 contracts::attach(&mut p,serde_json::from_str(include_str!("fixtures/checked-sets/proofs.json")).unwrap()).unwrap();
 CheckedModule::from_source(p.clone()).unwrap();p
}
fn set(items:Value)->Value{json!({"items":items})}
#[test]
fn sets_preserve_structural_identity_interfaces_transactions_and_restore_on_complete_targets(){
 let p=program();let mut runtime=Runtime::new(p.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let a=set(json!([3,1]));let b=set(json!([1,2]));let bad=set(json!([3,3]));
 let item=json!({"name":"é😀","weights":[0,u32::MAX]});
 let plus=json!({"F32Bits":0});let minus=json!({"F32Bits":0x80000000u32});let nan=json!({"F32Bits":0x7fc12345u32});
 let cases=vec![
 ("make",json!([[3,1,3,2,1]]),set(json!([3,1,2])),false),
 ("make",json!([[]]),set(json!([])),false),
 ("elements",json!([a.clone()]),json!([3,1]),false),
 ("size",json!([a.clone()]),json!({"Int":"2"}),false),
 ("has",json!([a.clone(),3]),json!(true),false),
 ("has",json!([a.clone(),0]),json!(false),false),
 ("distinct",json!([a.clone()]),json!(true),false),
 ("union",json!([a.clone(),b.clone()]),set(json!([3,1,2])),false),
 ("intersection",json!([a.clone(),b.clone()]),set(json!([1])),false),
 ("difference",json!([a.clone(),b.clone()]),set(json!([3])),false),
 ("words",json!([["é","😀","é",""]]),set(json!(["é","😀",""])),false),
 ("records",json!([[item.clone(),item]]),set(json!([{ "name":"é😀","weights":[0,u32::MAX]}])),false),
 ("floats",json!([[plus.clone(),minus.clone(),nan.clone(),nan.clone()]]),set(json!([0.0,-0.0,nan])),false),
 ("float_bits",json!([{"items":[{"F32Bits":0},{"F32Bits":0x80000000u32},{"F32Bits":0x7fc12345u32}]}]),json!([0,0x80000000u32,0x7fc12345u32]),false),
 ("float_bits",json!([{"items":[{"F32Bits":0x7fc12345u32},{"F32Bits":0x7fc12345u32}]}]),json!(null),true),
 ("elements",json!([bad.clone()]),json!(null),true),
 ("size",json!([bad.clone()]),json!(null),true),
 ("distinct",json!([bad.clone()]),json!(null),true),
 ("union",json!([a.clone(),bad.clone()]),json!(null),true),
 ("intersection",json!([bad.clone(),b.clone()]),json!(null),true),
 ("difference",json!([a.clone(),bad.clone()]),json!(null),true),
 ("numeric",json!([[0,u32::MAX]]),json!([1,0]),false),
 ];
 for (name,args,want,reject)in cases{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  let result=eval::call(&p,name,values,&mut 10_000_000);
  let reply=if reject{assert_eq!(result.unwrap_err(),"contract precondition failed");json!({"host_error":"contract precondition failed"})}else{let value=result.unwrap().json();assert_eq!(value,want,"{name}");json!({"value":value})};
  let mut step=json!({"pure":name,"args":args,"cpu_only":name!="numeric"});if name=="numeric"{step["expect_gpu"]=json!(true);}
  steps.push(step);expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 let unchanged=runtime.checkpoint_portable().unwrap();let action_begin=expected.len();
 for (name,args)in[("current",json!([])),("save",json!([a.clone()])),("abort",json!([b])),("save",json!([bad.clone()])),("current",json!([]))]{
  let reply=match runtime.invoke_json(name,&args){Ok(out)=>json!({"outcome":out.json()}),Err(error)=>json!({"host_error":error})};
  steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 let valid=runtime.checkpoint_portable().unwrap();assert_ne!(unchanged,valid);
 assert_eq!(expected[action_begin+1]["snapshot"],expected[action_begin+2]["snapshot"]);assert_eq!(expected[action_begin+1]["snapshot"],expected[action_begin+3]["snapshot"]);
 steps.push(json!({"restore":valid}));runtime=Runtime::restore_portable(p.clone(),&valid).unwrap();
 let reply=runtime.invoke_json("current",&json!([])).unwrap();steps.push(json!({"call":"current","args":[]}));expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 let layout=verified_language::snapshot::layout(&p).unwrap();let mut logical=verified_language::snapshot_wire::decode(&layout,&valid,Default::default()).unwrap();
 // Value state is the ordinary single-key table of this exact set type.
 logical.tables[0]=vec![(json!(0),bad)];
 let forged=verified_language::snapshot_wire::encode(&layout,&logical,Default::default()).unwrap();
 assert!(Runtime::restore_portable(p.clone(),&forged).err().unwrap().contains("invariant"));steps.push(json!({"reject_restore":forged}));
 let source=fs::read_to_string(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/checked-sets/main.ink")).unwrap();
 parity::conformance("checked-set-interfaces",p,&source,steps,expected);
}
#[test]
fn set_opacity_stale_source_and_unproved_preservation_reject(){
 let root=Path::new(env!("CARGO_MANIFEST_DIR"));let dir=root.join("build/checked-set-adversaries");fs::create_dir_all(&dir).unwrap();
 let import=format!("module adversary;import {} as sets;",serde_json::to_string(root.join("knowledge/libraries/collections.ink").to_str().unwrap()).unwrap());
 for (i,body)in["fn leak(v:sets.Set<u32>)->List<u32>{return v.items;}","fn forge()->sets.Set<u32>{return sets.Set<u32>{items:[1,1]};}","type Alias=sets.Set<u32>;fn forge()->Alias{return Alias{items:[1,1]};}"].iter().enumerate(){
  let file=dir.join(format!("{i}.ink"));fs::write(&file,format!("{import}{body}")).unwrap();assert!(modules::load(file).err().unwrap().contains("representation access outside"));
 }
 let mut p=modules::load(root.join("tests/fixtures/checked-sets/main.ink")).unwrap().program;
 let mut evidence:contracts::Evidence=serde_json::from_str(include_str!("fixtures/checked-sets/proofs.json")).unwrap();
 p.functions.iter_mut().find(|f|f.name=="make").unwrap().body=verified_language::syntax::Expr::Bool(false);
 assert!(contracts::attach(&mut p,evidence.clone()).is_err(),"stale source identity");
 let mut p=modules::load(root.join("tests/fixtures/checked-sets/main.ink")).unwrap().program;
 evidence.proofs.insert("make:ensures:0".into(),verified_language::laws::Proof::Normalize);
 contracts::attach(&mut p,evidence).unwrap();assert!(CheckedModule::from_source(p).is_err(),"normalization alone cannot establish constructor preservation");
}
