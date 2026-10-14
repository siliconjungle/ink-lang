use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="parity.rs"] mod parity;

#[test]
fn lexer_runs_preserve_complete_tokens_at_class_boundaries(){
 let p=modules::load("bench/lexer-runs/main.ink").unwrap().program;
 let rt=Runtime::new(p.clone()).unwrap();
 let mut inputs:Vec<Vec<u32>>=vec![vec![],vec![97;257],vec![49;257],vec![32;257],vec![43;257],
  (0..=255).collect(),vec![u32::MAX,0x80000000,0,97,48,95,32,49,97]];
 // Boundaries of each class and all adjacent class transitions, including
 // non-byte values. Ink's public kernel accepts u32 code units.
 let edges=[0,8,9,10,11,12,13,14,31,32,33,47,48,57,58,64,65,90,91,94,95,96,97,122,123,127,128,255,256,u32::MAX];
 for a in edges {inputs.push(vec![a]);for b in [9,32,43,48,65,95,97,u32::MAX]{inputs.push(vec![a,b,a]);}}
 let mut seed=104729u32;
 for n in [1,3,15,64,257] {let mut xs=vec![];for _ in 0..n{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);xs.push(if seed&7==0{seed}else{seed%128});}inputs.push(xs);}
 let mut steps=vec![];let mut expected=vec![];
 for xs in inputs {
  let alpha=|c:u32|c==95 || (65..=90).contains(&c) || (97..=122).contains(&c);
  let digit=|c:u32|(48..=57).contains(&c);
  let mut tokens:Vec<Value>=vec![];let mut i=0;
  while i<xs.len(){let c=xs[i];if [9,10,13,32].contains(&c){i+=1;continue;}
   let start=i;let kind=if alpha(c){1}else if digit(c){2}else{3};i+=1;
   while i<xs.len() && (kind==1&&(alpha(xs[i])||digit(xs[i])) || kind==2&&digit(xs[i])) {i+=1;}
   tokens.push(json!({"start":start,"end":i,"kind":kind}));
  }
  for name in ["baseline","runs"] {
   let args=json!([xs]);let f=p.functions.iter().find(|f|f.name==name).unwrap();
   let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
   assert_eq!(eval::call(&p,name,values,&mut 20_000_000).unwrap().json(),json!(tokens),"{name}: {xs:?}");
   steps.push(json!({"pure":name,"args":args,"cpu_only":true,"expect_gpu":false}));
   expected.push(json!({"reply":{"value":tokens},"snapshot":rt.checkpoint_portable().unwrap()}));
  }
 }
 parity::conformance("lexer-runs",p.clone(),include_str!("../../bench/lexer-runs/main.ink"),steps.clone(),expected.clone());
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));let output=root.join("build/lexer-runs/conformance-plan");
 let prepare=std::process::Command::new("python3").arg(root.join("bench/cross-domain/prepare.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("bench/lexer-runs/main.ink"))
  .args(["--scalar-calls","--output"]).arg(&output).output().unwrap();
 assert!(prepare.status.success(),"{}",String::from_utf8_lossy(&prepare.stderr));
 let original=verified_language::core::CheckedModule::from_source(p).unwrap();
 let package:verified_language::planning::Package=serde_json::from_slice(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 assert!(!package.steps.is_empty());let checked=verified_language::planning::check(&original,&package).unwrap();
 parity::conformance_planned("lexer-runs-unfolded",&checked,include_str!("../../bench/lexer-runs/main.ink"),steps.clone(),expected.clone());
 let output=root.join("build/lexer-word/conformance-plan");
 let prepare=std::process::Command::new("python3").arg(root.join("tools/prepare_word_example.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("bench/lexer-runs/main.ink"))
  .args(["--unfold","--output"]).arg(&output).output().unwrap();
 assert!(prepare.status.success(),"{}",String::from_utf8_lossy(&prepare.stderr));
 let package:verified_language::planning::Package=serde_json::from_slice(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 let checked=verified_language::planning::check(&original,&package).unwrap();
 parity::conformance_planned("lexer-word-unfolded",&checked,include_str!("../../bench/lexer-runs/main.ink"),steps,expected);
}
