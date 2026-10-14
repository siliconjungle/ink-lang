use serde_json::json;
use verified_language::{modules, stateful::Runtime};
use super::parity;

#[test]
fn word_laws_preserve_callbacks_all_portable_targets_and_actual_gpu_words(){
 let source=include_str!("../fixtures/semantic-word-source.ink");
 let p=modules::load("tests/fixtures/semantic-word-source.ink").unwrap().program;
 let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
 let mut inputs=vec![vec![],(0..=255u32).collect(),vec![0,u32::MAX,0x80000000,0x7fffffff,64,65,90,91,96,97,122,123]];
 let mut seed=104729u32;let mut random=vec![];
 for _ in 0..513{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);random.push(seed);}
 inputs.push(random);
 let mut steps=vec![];let mut expected=vec![];
 for xs in inputs{
  let answer:Vec<bool>=xs.iter().map(|x|(65..=90).contains(x)||(97..=122).contains(x)).collect();
  steps.push(json!({"pure":"classify","args":[xs],"cpu_only":xs.is_empty(),"expect_gpu":!xs.is_empty()}));
  expected.push(json!({"reply":{"value":answer},"snapshot":snapshot}));
 }
 let xs:Vec<u32>=(0..257).map(|x|x*1664525).collect();let answer:Vec<u32>=xs.iter().map(|x|x|32).collect();
 steps.push(json!({"pure":"gpu_mask","args":[xs],"expect_gpu":true}));
 expected.push(json!({"reply":{"value":answer},"snapshot":snapshot}));
 parity::conformance("generated-parity-semantic-word-baseline",p.clone(),source,steps.clone(),expected.clone());
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));let out=root.join("build/semantic-word-parity");
 let output=std::process::Command::new("python3").arg(root.join("tools/prepare_word_example.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("tests/fixtures/semantic-word-source.ink"))
  .arg("--output").arg(&out).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let module=verified_language::core::CheckedModule::from_source(p).unwrap();
 let package=serde_json::from_slice(&std::fs::read(out.join("selection.json")).unwrap()).unwrap();
 let checked=verified_language::optimisation::check(&module,&package).unwrap();
 parity::conformance_selected("semantic-word-selected",&checked,source,steps,expected);
}

#[test]
fn word_operations_match_native_oracle_and_actual_gpu_at_width_boundaries() {
 let mut source=String::from("module word_edges;\n");
 for ty in ["u32","u64","i32"] {
  source.push_str(&format!("record In_{ty} {{a:{ty},b:{ty},k:u32,}}\nrecord Out_{ty} {{and:{ty},or:{ty},xor:{ty},not:{ty},shl:{ty},shr:{ty},rol:{ty},ror:{ty},}}\npub fn run_{ty}(xs:List<In_{ty}>)->List<Out_{ty}>{{return xs.map(fn(x)=>Out_{ty}{{and:word_and(x.a,x.b),or:word_or(x.a,x.b),xor:word_xor(x.a,x.b),not:word_not(x.a),shl:wrapping_shl(x.a,x.k),shr:wrapping_shr(x.a,x.k),rol:rotate_left(x.a,x.k),ror:rotate_right(x.a,x.k)}});}}\n"));
 }
 let p=verified_language::syntax::parse(&source).unwrap();
 let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 macro_rules! cases {($ty:ty,$name:literal,$values:expr)=>{{
  let values:Vec<$ty>=$values;let mut inputs=vec![];let mut outputs=vec![];
  for a in &values {for b in &values {for k in [0u32,1,7,31,32,33,63,64,65,u32::MAX] {
   let(a,b)=(*a,*b);
   inputs.push(json!({"a":a,"b":b,"k":k}));
   outputs.push(json!({"and":a&b,"or":a|b,"xor":a^b,"not":!a,"shl":a.wrapping_shl(k),"shr":a.wrapping_shr(k),"rol":a.rotate_left(k),"ror":a.rotate_right(k)}));
  }}}
  steps.push(json!({"pure":$name,"args":[inputs],"expect_gpu":true}));
  expected.push(json!({"reply":{"value":outputs},"snapshot":snapshot}));
 }}}
 cases!(u32,"run_u32",vec![0,1,u32::MAX,1<<31,(1<<31)-1,0x12345678,0xabcdef01]);
 cases!(u64,"run_u64",vec![0,1,u64::MAX,1<<63,(1<<63)-1,0x123456789abcdef0,0xfedcba9876543210]);
 cases!(i32,"run_i32",vec![0,1,-1,i32::MIN,i32::MAX,0x12345678,-123456789]);
 parity::conformance("generated-parity-word-boundaries",p,&source,steps,expected);
}
