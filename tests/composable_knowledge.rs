use serde_json::{json,Value};
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,planning,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;

#[test]
fn imported_algorithms_preserve_complete_state_and_execute_across_targets(){
 let root=Path::new(env!("CARGO_MANIFEST_DIR"));let dir=root.join("build/composable-knowledge-conformance");fs::create_dir_all(&dir).unwrap();
 let output=Command::new("python3").arg(root.join("bench/composable-knowledge/run.py")).args(["--author-only","--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("tests/fixtures/composable-knowledge.ink")).arg("--output").arg(&dir).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let source=include_str!("fixtures/composable-knowledge.ink");let original=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_slice(&fs::read(dir.join("composed.plan.json")).unwrap()).unwrap();let plan=planning::check(&original,&packet).unwrap();
 assert_eq!(packet.steps.len(),2);
 let planning::Step::Rewrite(rewrite)=&packet.steps[1]else{panic!()};
 assert!(rewrite.knowledge.objects.len()>=3,"parent and both imported proof families must replay");
 let mut runtime=Runtime::new(original.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for (name,args)in[("put",json!([0,9,false])),("put",json!([0,17,true])),("rows",json!([])),("put",json!([u32::MAX,u32::MAX,false]))]{
  let outcome=runtime.invoke_json(name,&args).unwrap();steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for xs in [json!([]),json!([0,1,17,u32::MAX,0x80000000u32])]{for n in [0,1,3,u32::MAX]{for cut in [0,17,u32::MAX]{
  let args=json!([xs,n,cut]);let f=original.program().functions.iter().find(|f|f.name=="f").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,original.program()).unwrap()).collect::<Vec<_>>();
  let before=values.clone();let oracle=eval::call(original.program(),"f",values.clone(),&mut 1_000_000).unwrap().json();assert_eq!(eval::call(plan.module().program(),"f",values,&mut 1_000_000).unwrap().json(),oracle);assert_eq!(before[0].json(),xs);
  steps.push(json!({"pure":"f","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":oracle},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}}
 let before=runtime.checkpoint_portable().unwrap();steps.push(json!({"restore":before}));
 parity::conformance_planned("composable-knowledge-parity",&plan,source,steps,expected);
 let mut forged:Value=serde_json::to_value(&packet).unwrap();forged["input_core_sha256"]=json!("0".repeat(64));assert!(planning::check(&original,&serde_json::from_value(forged).unwrap()).is_err());
}

#[test]
fn packed_key_value_snapshots_and_combined_capabilities_match_the_reference(){
 let root=Path::new(env!("CARGO_MANIFEST_DIR"));let dir=root.join("build/composable-storage-conformance");
 let output=Command::new("python3").arg(root.join("bench/composable-knowledge/physical.py")).args(["--validate-only","--compiler",env!("CARGO_BIN_EXE_ink"),"--output"]).arg(&dir).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let data:Value=serde_json::from_slice(&fs::read(dir.join("native.json")).unwrap()).unwrap();
 let module=CheckedModule::from_source(syntax::parse(include_str!("../examples/action-transitions.ink")).unwrap()).unwrap();
 let mut runtime=Runtime::new(module.program().clone()).unwrap();let mut expected=vec![];
 for (name,args)in[("put",json!([0,17])),("put",json!([u64::MAX,u64::MAX])),("erase",json!([0,true])),("get",json!([0]))]{
  let reply=runtime.invoke_json(name,&args).unwrap().json();expected.push(json!([reply,runtime.checkpoint_portable().unwrap()]));
 }
 let saved=runtime.checkpoint_portable().unwrap();
 let reply=runtime.invoke_json("put",&json!([9,7])).unwrap().json();expected.push(json!([reply,runtime.checkpoint_portable().unwrap()]));
 runtime=Runtime::restore_portable(module.program().clone(),&saved).unwrap();
 for (name,args)in[("get",json!([u64::MAX])),("erase",json!([0,false])),("get",json!([0]))]{
  let reply=runtime.invoke_json(name,&args).unwrap().json();expected.push(json!([reply,runtime.checkpoint_portable().unwrap()]));
 }
 assert_eq!(data["validation"],json!(expected));
}
