use serde_json::json;
use std::{fs,path::Path};
use verified_language::{modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn small_sequences_promote_and_preserve_all_logical_views(){
 let p=Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/crdts/small_sequence.ink");let source=fs::read_to_string(&p).unwrap();let program=modules::load(&p).unwrap().program;let snapshot=Runtime::new(program.clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0usize,1,2,3,64,257]{let values=(0..n).map(|i|(i as u32).wrapping_mul(97)).collect::<Vec<_>>();steps.push(json!({"pure":"restored","args":[values],"cpu_only":true}));expected.push(json!({"reply":{"value":values},"snapshot":snapshot}));}
 for kind in [0u32,1,2,3,7,u32::MAX]{for many in [vec![],vec![19],vec![3,5,7,11]]{let mut want=match kind{0=>vec![],1=>vec![u32::MAX],2=>vec![u32::MAX,17],_=>many.clone()};want.push(91);let args=json!([kind,u32::MAX,17,many,91]);for name in ["extended","reference"]{steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));}}}
 parity::conformance("small-sequence-parity",program,&source,steps,expected);
}
