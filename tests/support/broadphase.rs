use serde_json::json;
use verified_language::{modules,stateful::Runtime};
use super::parity;
#[test]
fn broadphase_complete_pairs_and_radix_match_portable_targets(){
 let program=modules::load("bench/broadphase/main.ink").unwrap().program;
 let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();
 let cases:Vec<serde_json::Value>=serde_json::from_str(include_str!("../../bench/broadphase/cases.json")).unwrap();
 let steps=cases.iter().map(|c|json!({"pure":c["function"],"args":c["arguments"],"cpu_only":true,"expect_gpu":false})).collect::<Vec<_>>();
 let expected=cases.iter().map(|c|json!({"reply":{"value":c["result"]},"snapshot":snapshot})).collect::<Vec<_>>();
 parity::conformance("broadphase",program.clone(),include_str!("../../bench/broadphase/main.ink"),steps.clone(),expected.clone());
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));let output=root.join("build/broadphase/conformance-plan");
 let status=std::process::Command::new("python3").arg(root.join("bench/cross-domain/prepare.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("bench/broadphase/main.ink"))
  .args(["--scalar-calls","--output"]).arg(&output).output().unwrap();
 assert!(status.status.success(),"{}",String::from_utf8_lossy(&status.stderr));
 let original=verified_language::core::CheckedModule::from_source(program).unwrap();
 // Use the normal bounded source-plan envelope, rather than Serde's smaller
 // default recursion limit. The complete plan still undergoes normal checking.
 let package=verified_language::planning::from_bytes(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 let checked=verified_language::planning::check(&original,&package).unwrap();
 parity::conformance_planned("broadphase-unfolded",&checked,include_str!("../../bench/broadphase/main.ink"),steps,expected);
}
