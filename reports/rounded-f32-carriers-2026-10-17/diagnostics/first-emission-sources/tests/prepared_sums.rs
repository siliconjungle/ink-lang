use ink_core::{core::CheckedModule,eval,physical,planning,sum_codec,syntax::parse};
use serde_json::json;
use std::{fs,process::Command};
#[path="support/sum_codec.rs"] mod checked_sums;

#[test]
fn sum_preparation_preserves_selected_arms_payloads_ownership_and_private_layouts(){
 let source=include_str!("fixtures/prepared_sums.ink");
 let mut reference=Vec::new();
 for (name,inputs) in [
  ("optional",vec![json!({"None":null}),json!({"Some":1}),json!({"Some":7}),json!({"Some":2})]),
  ("mapped",vec![json!({"Err":"missing"}),json!({"Ok":1}),json!({"Ok":7}),json!({"Ok":2})]),
  ("errors",vec![json!({"Ok":"ok"}),json!({"Err":1}),json!({"Err":7}),json!({"Err":2})]),
  ("folded",vec![json!({"Ok":1}),json!({"Err":1}),json!({"Ok":7}),json!({"Err":7})]),
  ("nested",vec![json!({"Ok":{"None":null}}),json!({"Ok":{"Some":1}}),json!({"Ok":{"Some":7}}),json!({"Err":{"Ok":1}}),json!({"Err":{"Ok":7}}),json!({"Err":{"Err":"missing"}})]),
  ("owned",vec![json!({"None":null}),json!({"Some":1}),json!({"Some":7})]),
 ] {for input in inputs {reference.push((name,json!([[1,2,3],input])));}}
 for q in [1,7,2] {
  for name in ["payload","payload_forward"] {for value in [json!({"None":null}),json!({"Some":[1,2,3]}),json!({"Some":[7,9]})]{reference.push((name,json!([value,q])));}}
  for name in ["result_payload","result_forward"] {for value in [json!({"Err":"missing"}),json!({"Ok":[1,2,3]}),json!({"Ok":[7,9]})]{reference.push((name,json!([value,q])));}}
  reference.push(("receiver_work",json!([[1,2,3],q])));
  for value in [json!({"None":null}),json!({"Some":q})] {reference.push(("with_default",json!([[1,2,3],value,q])));}
  reference.push(("checked",json!([[1,2,3],{"Some":q},true])));
  for value in [json!({"None":null}),json!({"Some":[{"F64Bits":"9221120237041095220"},{"F64Bits":"9223372036854775808"},{"F64Bits":"1"}]})] {reference.push(("doubles",json!([value,q])));}
 }
 for (x,offset) in [(json!({"None":null}),9),(json!({"Some":1}),0),(json!({"Some":7}),2),(json!({"Some":0}),1)] {reference.push(("mixed",json!([[1,2,3],x,offset])));}
 for weight in [1.0,-1.0,2.0,0.0] {for x in [json!({"None":null}),json!({"Some":[{"F32Bits":0x7fc12345u32},{"F32Bits":0x80000000u32},{"F32Bits":1},1.25]})] {reference.push(("weighted",json!([x,weight])));}}
 for weight in [1.0,-1.0,2.0,0.0] {for x in [json!({"Ok":{"F32Bits":0x7fc12345u32}}),json!({"Ok":1.25}),json!({"Err":{"Ok":{"F32Bits":0x80000000u32}}}),json!({"Err":{"Ok":{"F32Bits":0x7f800000u32}}}),json!({"Err":{"Err":"missing"}})] {reference.push(("float_result",json!([x,weight])));}}
 let root=std::env::temp_dir().join(format!("ink-prepared-sums-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("test.mjs"),include_str!("fixtures/prepared_sums.mjs")).unwrap();
 for carrier in ["native","bits"] {
  let source=if carrier=="bits" {format!("{source}\nstate Unused:u32=0;")} else {source.into()};
  let m=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
  let cases=reference.iter().map(|(name,args)|{
   let f=m.program().functions.iter().find(|f|f.name==*name).unwrap();
   let inputs=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();
   let expected=eval::call_checked(&m,name,inputs,&mut 1_000_000).unwrap().json();
   json!({"name":name,"args":args,"expected":expected})
  }).collect::<Vec<_>>();
  fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
  fs::write(root.join("program.mjs"),ink_lowering_js::lower(&m).unwrap().javascript).unwrap();
  let layouts=sum_codec::source_types(&m).unwrap().iter().filter(|t|sum_codec::schema(&m,t).is_ok()).map(|t|checked_sums::layout(&m,t)).collect::<Vec<_>>();
  assert!(!layouts.is_empty());
  let physical:physical::Plan=serde_json::from_value(json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"sum_spines":layouts})).unwrap();
  let package=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),steps:vec![planning::Step::Physical(physical)]};
  let checked=planning::check(&m,&package).unwrap();
  fs::write(root.join("flat.mjs"),ink_lowering_js::lower_planned(&checked).unwrap().javascript).unwrap();
  let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
  assert!(result.status.success(),"{carrier}: {}{}",String::from_utf8_lossy(&result.stdout),String::from_utf8_lossy(&result.stderr));println!("{carrier}: {}",String::from_utf8_lossy(&result.stdout));
  if let Some(output)=std::env::var_os("INK_PREPARED_SUM_ARTIFACTS") {
   let output=std::path::PathBuf::from(output).join(carrier);fs::create_dir_all(&output).unwrap();
   for file in ["cases.json","program.mjs","flat.mjs"] {fs::copy(root.join(file),output.join(file)).unwrap();}
   fs::write(output.join("source.core.json"),m.bytes().unwrap()).unwrap();
   fs::write(output.join("layout.json"),serde_json::to_vec(&package).unwrap()).unwrap();
   fs::write(output.join("observations.jsonl"),&result.stdout).unwrap();
  }
 }
 fs::remove_dir_all(root).unwrap();
}
