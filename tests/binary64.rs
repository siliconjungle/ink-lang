use serde_json::json;
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[path="support/parity.rs"] mod parity;
const SOURCE:&str=include_str!("../examples/binary64.ink");

#[test]
fn action_cli_reports_the_actual_checked_transport_version(){
 use std::{fs,path::Path,process::Command};
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/binary64-actions-cli");fs::create_dir_all(&root).unwrap();
 for (index,source)in ["module plain;state Cell:u32=0;query read()->u32 reads(Cell){return Cell;}",SOURCE].iter().enumerate(){
  let input=root.join(format!("source{index}.ink"));let path=root.join(format!("actions{index}.json"));fs::write(&input,source).unwrap();
  for command in ["emit-actions","check-actions"]{
   let mut child=Command::new(env!("CARGO_BIN_EXE_ink"));child.arg(command).arg(&input);
   if command=="emit-actions"{child.arg("-o");}child.arg(&path);
   let output=child.output().unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
   let receipt:serde_json::Value=serde_json::from_slice(&output.stdout).unwrap();let wire:serde_json::Value=serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
   assert_eq!(receipt["semantics"],wire["semantics"]);
   if index==1{assert_eq!(wire["semantics"],"ink-typed-actions-v4");}
  }
 }
}

#[test]
fn frozen_binary64_rebind_preserves_payloads_and_rejects_changed_rows(){
 let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();let mut original=Runtime::from_checked(&module).unwrap();
 original.invoke_json("replace",&json!([{"F64Bits":"9218868437227409972"},false])).unwrap();
 let frozen=verified_language::freezing::restrict(&module,&original.checkpoint_portable().unwrap(),&["Width".into()]).unwrap();
 assert_eq!(frozen.module.semantics(),verified_language::core::BINARY64_SEMANTICS);
 assert!(!frozen.module.program().actions.iter().any(|a|a.name=="replace"));
 let layout=verified_language::snapshot::layout(frozen.module.program()).unwrap();
 let mut payload=verified_language::snapshot_wire::decode(&layout,&frozen.snapshot,Default::default()).unwrap();
 let index=layout.roots.iter().position(|(n,_,_)|n=="Width").unwrap();payload.tables[index][0].1=json!({"F64Bits":"0"});
 let changed=verified_language::snapshot_wire::encode(&layout,&payload,Default::default()).unwrap();
 assert!(Runtime::restore_portable_checked(&frozen.module,&changed).is_err());
 let mut reference=Runtime::restore_portable_checked(&frozen.module,&frozen.snapshot).unwrap();
 let mut steps=vec![json!({"restore":frozen.snapshot}),json!({"reject_restore":changed,"restore_error":"frozen"})];let mut expected=vec![];
 for name in ["current","half"]{
  let result=reference.invoke_json(name,&json!([])).unwrap();steps.push(json!({"call":name,"args":[]}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
 }
 steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
 expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":reference.checkpoint_portable().unwrap()}));
 parity::conformance_checked("binary64-frozen",&frozen.module,SOURCE,steps,expected);
}

#[test]
fn pure_binary64_javascript_preserves_payloads_across_every_value_boundary(){
 use std::{fs,path::Path,process::Command};
 let source="module pure64;fn copy(value:f64)->f64{return value;}fn ratio(x:f64,y:f64)->f64{return x/y;}fn rounded(x:f64)->f64{return round_ties_even(x);}fn widen(x:f32)->f64{return f64_from_f32(x);}fn narrow(x:f64)->f32{return f32_from_f64(x);}fn halves(xs:List<f64>)->List<f64>{return xs.map(fn(x)=>x/2);}";
 let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/binary64-boundaries");fs::create_dir_all(&root).unwrap();
 let path=root.join("program.mjs");fs::write(&path,verified_language::javascript::lower(&module).unwrap().javascript).unwrap();
 let result=Command::new("node").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/binary64-boundaries.mjs")).arg(path).output().unwrap();
 assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));fs::write(root.join("result.json"),result.stdout).unwrap();
}

#[test]
fn binary64_matches_reference_values_events_and_exact_snapshots_across_targets(){
 let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let p=module.program();let mut reference=Runtime::from_checked(&module).unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for bits in [0u64,1<<63,1,0x3ff0000000000001,0x7ff0000000001234,0xfff8000000005678,u64::MAX]{
  let value=json!({"F64Bits":bits.to_string()});
  for(name,args)in [("current",json!([])),("replace",json!([value,true])),("current",json!([])),("replace",json!([value,false])),("current",json!([])),("half",json!([]))]{
   let result=reference.invoke_json(name,&args).unwrap();steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
  }
  let saved=reference.checkpoint_portable().unwrap();steps.push(json!({"restore":saved}));reference=Runtime::restore_portable(p.clone(),&saved).unwrap();
 }
 for(name,args)in [
  ("arithmetic",json!([1.0000000000000002,2.0])),("ratio",json!([0.0,0.0])),("root",json!([2.0])),("root",json!([-1.0])),("rounded",json!([-0.5])),("rounded",json!([100000000.5])),("rounded",json!([100000001.5])),
  ("equal",json!([0.0,-0.0])),("equal",json!([{"F64Bits":"9218868437227409972"},{"F64Bits":"9218868437227409972"}])),
  ("same_measurement",json!([{"width":0.0,"count":0},{"width":-0.0,"count":0}])),
  ("flip",json!([{"F64Bits":"9218868437227409972"}])),("bits",json!([{"F64Bits":"9218868437227409972"}])),
  ("from_bits",json!([u64::MAX])),("from_int",json!([{"Int":"9007199254740995"}])),("to_int",json!([-9007199254740996.0])),
  ("to_word",json!([-0.5])),("to_word",json!([18446744073709551616.0])),("widen",json!([0.1])),("narrow",json!([1.0000000000000002])),
  ("ratios",json!([[1.0,2.0,3.0]])),("total",json!([[9007199254740992.0,1.0,-9007199254740992.0]])),("total",json!([[]])),
  ("numeric",json!([[0.0,0.5,1.0,-1.0]])),
 ]{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,p).unwrap()).collect();
  let result=eval::call(p,name,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":name,"args":args,"expect_gpu":name=="numeric"}));expected.push(json!({"reply":{"value":result},"snapshot":reference.checkpoint_portable().unwrap()}));
 }
 parity::conformance_checked("binary64",&module,SOURCE,steps,expected);
}
