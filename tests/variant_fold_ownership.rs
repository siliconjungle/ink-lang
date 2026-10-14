use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module variant_ownership;
record Item{value:u32,}
record Image{values:List<Item>,tag:u32,}
fn propagated(xs:List<Item>,ok:Bool)->Result<List<Item>,u32>{
 let result:Result<u32,u32>=choose(ok,Ok(9),Err(7));let value=result?;
 return Ok(buffer(xs).push(Item{value:value}).freeze());
}
fn branches(xs:List<Item>,ok:Bool)->List<Item>{
 let result:Result<u32,u32>=choose(ok,Ok(9),Err(7));
 return result.fold(fn(value)=>buffer(xs).push(Item{value:value}).freeze(),fn(error)=>buffer(xs).push(Item{value:error}).freeze());
}
fn shared(xs:List<Item>,ok:Bool)->List<List<Item>>{
 let result:Result<u32,u32>=choose(ok,Ok(9),Err(7));
 let first=result.fold(fn(value)=>xs,fn(error)=>xs);return [first,xs];
}
fn fields(x:Image,ok:Bool)->List<Item>{
 let result:Option<u32>=choose(ok,Some(9),None);
 let values=result.fold(fn(value)=>x.values,fn(unit)=>x.values);
 return buffer(values).push(Item{value:x.tag}).freeze();
}
fn repeated(xs:List<Item>,ok:Bool)->List<List<Item>>{
 let result:Result<u32,u32>=choose(ok,Ok(9),Err(7));
 return result.fold(fn(value)=>[1,2,3].map(fn(i)=>xs),fn(error)=>[xs]);
}
fn given(xs:List<Item>)->List<Item>{return xs;}
fn final_call(xs:List<Item>,ok:Bool)->List<Item>{return given(xs);}
fn computed_call(xs:List<Item>,ok:Bool)->List<Item>{return given(choose(ok,xs,xs));}
fn shared_call(xs:List<Item>,ok:Bool)->List<List<Item>>{return [given(xs),xs];}
record Particle{position:u32,velocity:u32,active:Bool,}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity,active:p.active});}
"#;

#[test]
fn variant_branches_move_only_captures_without_later_or_repeated_uses(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"buffers":"direct","borrow_reads":[physical::parameter_read_site("given","xs").unwrap()]}}]})).unwrap();
 let plan=planning::check(&m,&packet).unwrap();
 let d=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/variant-fold-ownership-conformance");fs::create_dir_all(&d).unwrap();
 fs::write(d.join("source.ink"),SOURCE).unwrap();fs::write(d.join("plan.json"),registry::canonical(plan.package()).unwrap()).unwrap();
 let runtime=Runtime::new(m.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0,1,64,257]{for ok in [false,true]{for function in ["propagated","branches","shared","fields","repeated","final_call","computed_call","shared_call"]{
  let values=json!((0..n).map(|i|json!({"value":i})).collect::<Vec<_>>());
  let first=if function=="fields"{json!({"values":values,"tag":u32::MAX})}else{values};
  let args=json!([first,ok]);let f=m.program().functions.iter().find(|f|f.name==function).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),function,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":function,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}}
 let args=json!([(0..64).map(|i|json!({"position":i,"velocity":u32::MAX,"active":i%2==0})).collect::<Vec<_>>()]);let f=m.program().functions.iter().find(|f|f.name=="particles").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),"particles",values,&mut 1_000_000).unwrap().json();
 steps.push(json!({"pure":"particles","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 fs::write(d.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(d.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
 let out=Command::new("python3").arg("tools/physical_capability_conformance.py").args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&d).arg("--source").arg(d.join("source.ink")).arg("--plan").arg(d.join("plan.json")).output().unwrap();fs::write(d.join("selected-run.log"),[out.stdout.as_slice(),out.stderr.as_slice()].concat()).unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let code=verified_language::state_native::emit_planned(&plan).unwrap();let declaration="#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item";assert!(code.contains(declaration));let code=code.replace(declaration,"#[derive(Debug,PartialEq,Eq)] pub struct l_Item");
 let selected=d.join("selected");fs::write(selected.join("src/lib.rs"),format!("{code}\npub static CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);impl Clone for l_Item{{fn clone(&self)->Self{{CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{{l_value:self.l_value}}}}}}\n")).unwrap();fs::create_dir_all(selected.join("src/bin")).unwrap();
 fs::write(selected.join("src/bin/count_clones.rs"),r#"use compiled_state::{State,l_Image,l_Item,CLONES};use std::sync::atomic::Ordering::Relaxed;
fn values()->Vec<l_Item>{(0..257).map(|value|l_Item{l_value:value}).collect()}
fn main(){let state=State::new();for ok in [false,true]{
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_propagated(xs,ok);assert_eq!(out.is_ok(),ok);assert_eq!(CLONES.load(Relaxed),0);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_branches(xs,ok);assert_eq!(out.len(),258);assert_eq!(out[257].l_value,if ok{9}else{7});assert_eq!(CLONES.load(Relaxed),0);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_shared(xs,ok);assert_eq!(out.len(),2);assert_eq!(out[0],out[1]);assert_eq!(CLONES.load(Relaxed),257);
 let x=l_Image{l_values:values(),l_tag:99};CLONES.store(0,Relaxed);let out=state.function_l_fields(x,ok);assert_eq!(out.len(),258);assert_eq!(out[257].l_value,99);assert_eq!(CLONES.load(Relaxed),0);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_final_call(xs,ok);assert_eq!(out.len(),257);assert_eq!(CLONES.load(Relaxed),0);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_computed_call(xs,ok);assert_eq!(out.len(),257);assert_eq!(CLONES.load(Relaxed),0);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_shared_call(xs,ok);assert_eq!(out.len(),2);assert_eq!(out[0],out[1]);assert_eq!(CLONES.load(Relaxed),257);
 let xs=values();CLONES.store(0,Relaxed);let out=state.function_l_repeated(xs,ok);assert_eq!(out.len(),if ok{3}else{1});assert_eq!(CLONES.load(Relaxed),if ok{771}else{257});
}}
"#).unwrap();let out=Command::new(env!("CARGO")).args(["run","--offline","--quiet","--manifest-path"]).arg(selected.join("Cargo.toml")).args(["--bin","count_clones","--target-dir"]).arg(selected.join("target")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 parity::conformance("generated-parity-variant-fold-ownership",m.program().clone(),SOURCE,steps,expected);
}
