use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module native_inline_hints;
record Image{left:Buffer<u32>,right:Buffer<u32>,stamp:u32,}
fn observed(xs:List<u32>)->u32{return foldl(xs,0,fn(x,n)=>x+n);}
fn carried(image:Image,delta:u32)->Image{return Image{left:image.left.push(delta),right:image.right,stamp:image.stamp+delta};}
fn owner(xs:List<u32>,delta:u32)->List<u32>{let image=carried(Image{left:buffer(xs),right:buffer([9]),stamp:observed(xs)},delta);return image.left.freeze().concat(image.right.freeze());}
fn result(xs:List<u32>,fail:Bool)->Result<u32,u32>{if fail{return Err(17);}return Ok(observed(xs));}
record Particle{position:u32,velocity:u32,}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity});}
"#;
#[test]
fn native_hints_preserve_owners_loans_errors_and_target_admission(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"inline_functions":["carried","observed","result"],"borrow_reads":[physical::parameter_read_site("observed","xs").unwrap()]}}]})).unwrap();
 let selected=planning::check(&m,&packet).unwrap();let code=verified_language::state_native::emit_planned(&selected).unwrap();
 assert!(code.contains("#[inline(always)]\nfn function_l_carried"));
 assert!(code.contains("#[inline(always)]\npub fn function_l_observed"));
 assert!(code.contains("#[inline(always)]\npub fn ink_borrowed_function_l_observed"));
 assert!(!code.contains("#[inline(always)]\npub fn function_l_owner"));
 let snapshot=Runtime::new(m.program().clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0usize,1,65]{let words=(0..n).map(|i|json!(i as u32)).collect::<Vec<_>>();
  for(name,args)in [("observed",json!([words])),("owner",json!([words,u32::MAX])),("result",json!([words,false])),("result",json!([words,true]))]{
   let f=m.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let value=eval::call(m.program(),name,values,&mut 1_000_000).unwrap().json();steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
  }
 }
 let args=json!([(0..64).map(|i|json!({"position":i,"velocity":u32::MAX})).collect::<Vec<_>>()]);let f=m.program().functions.iter().find(|f|f.name=="particles").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let value=eval::call(m.program(),"particles",values,&mut 1_000_000).unwrap().json();steps.push(json!({"pure":"particles","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
 let d=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/native-inline-conformance");fs::create_dir_all(&d).unwrap();fs::write(d.join("source.ink"),SOURCE).unwrap();fs::write(d.join("plan.json"),registry::canonical(selected.package()).unwrap()).unwrap();fs::write(d.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(d.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
 let out=Command::new("python3").args(["tools/physical_capability_conformance.py","--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&d).arg("--source").arg(d.join("source.ink")).arg("--plan").arg(d.join("plan.json")).output().unwrap();fs::write(d.join("selected-run.log"),[out.stdout.as_slice(),out.stderr.as_slice()].concat()).unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 parity::conformance("native-inline-parity",m.program().clone(),SOURCE,steps,expected);
}
