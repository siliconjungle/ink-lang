use serde_json::json;
use verified_language::{modules,stateful::Runtime};
#[path="parity.rs"] mod parity;

#[test]
fn column_tiles_preserve_modular_products_tails_and_missing_entries(){
 let p=modules::load("bench/matmul-tiles/main.ink").unwrap().program;
 let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for side in [0usize,1,2,3,4,5,7,8,9,16,17] {for mode in 0..4 {
  let mut a:Vec<u32>=(0..side*side).map(|i|(i as u32).wrapping_mul(0xfffffff1).wrapping_add(3)).collect();
  let mut b:Vec<u32>=(0..side*side).map(|i|(i as u32).wrapping_mul(65537).wrapping_add(u32::MAX)).collect();
  if mode==1{a.truncate(a.len().saturating_sub(2));}
  if mode==2{b.truncate(b.len().saturating_sub(3));}
  if mode==3{a.clear();b.clear();}
  let mut answer=vec![];
  for i in 0..side{for j in 0..side{
   let mut total=0u32;
   for k in 0..side{total=total.wrapping_add(a.get(i*side+k).copied().unwrap_or(0).wrapping_mul(b.get(k*side+j).copied().unwrap_or(0)));}
   answer.push(total);
  }}
  for name in ["baseline","tiled"]{
   steps.push(json!({"pure":name,"args":[a,b,side],"cpu_only":true,"expect_gpu":false}));
   expected.push(json!({"reply":{"value":answer},"snapshot":snapshot}));
  }
 }}
 parity::conformance("matmul-tiles",p.clone(),include_str!("../../bench/matmul-tiles/main.ink"),steps.clone(),expected.clone());
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));let output=root.join("build/matmul-tiles/conformance-plan");
 let prepare=std::process::Command::new("python3").arg(root.join("bench/cross-domain/prepare.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("bench/matmul-tiles/main.ink"))
  .args(["--scalar-calls","--output"]).arg(&output).output().unwrap();
 assert!(prepare.status.success(),"{}",String::from_utf8_lossy(&prepare.stderr));
 let original=verified_language::core::CheckedModule::from_source(p).unwrap();
 let package:verified_language::planning::Package=serde_json::from_slice(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 let checked=verified_language::planning::check(&original,&package).unwrap();
 parity::conformance_planned("matmul-tiles-unfolded",&checked,include_str!("../../bench/matmul-tiles/main.ink"),steps,expected);
}
