use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module scoped_loans;
record Item{value:u32,}
record Image{values:List<Item>,tag:u32,}
fn read(x:Image)->u32{return x.values.at_or(0,Item{value:0}).value;}
fn transfer(x:Image)->List<Item>{return buffer(x.values).push(Item{value:x.tag}).freeze();}
fn joined(first:u32,values:List<Item>)->List<u32>{return [first].concat(values.map(fn(v)=>v.value));}
fn overlap(x:Image)->List<u32>{return joined(read(x),transfer(x));}
fn inline(x:Image)->List<u32>{let first=x.values.at_or(0,Item{value:0}).value;return joined(first,transfer(x));}
fn retained(xs:List<Item>)->List<Item>{let first=xs.at_or(0,Item{value:0});return buffer(xs).push(first).freeze();}
fn consumed(xs:List<Item>)->List<Item>{let out:Buffer<Item>=foldl(xs,Buffer.empty(),fn(item,out)=>out.push(item));return out.freeze();}
fn folded_alias(xs:List<Item>)->List<Item>{let out:Buffer<Item>=foldl(xs,buffer(xs),fn(item,out)=>out.push(item));return out.freeze();}
fn combined(tag:Item,x:Image)->u32{return tag.value+read(x);}
fn computed(x:Image)->List<u32>{return joined(combined(Item{value:7},x),transfer(x));}
fn alias(x:Image)->List<List<Item>>{return [transfer(x),x.values];}
fn scalar(x:u32)->u32{return x;}
fn owned(x:Buffer<u32>)->List<u32>{return x.freeze();}
record Particle{position:u32,velocity:u32,active:Bool,}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity,active:p.active});}
"#;
fn package(m:&CheckedModule,function:&str,param:&str)->planning::Package{
 let mut sites=vec![physical::parameter_read_site(function,param).unwrap(),physical::parameter_read_site("combined","tag").unwrap(),physical::parameter_read_site("combined","x").unwrap(),registry::identity(&json!({"Field":[{"Var":"x"},"values"]})).unwrap(),physical::expression_read_site("retained",&syntax::Expr::Var("xs".into())).unwrap(),physical::expression_read_site("consumed",&syntax::Expr::Var("xs".into())).unwrap(),physical::expression_read_site("folded_alias",&syntax::Expr::Var("xs".into())).unwrap()];sites.sort();
 serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"buffers":"direct","borrow_reads":sites}}]})).unwrap()
}

#[test]
fn scoped_parameter_capabilities_bind_actual_nonaffine_parameters(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 planning::check(&m,&package(&m,"read","x")).unwrap();
 for(function,param)in[("missing","x"),("read","missing"),("scalar","x"),("owned","x")]{assert!(planning::check(&m,&package(&m,function,param)).is_err(),"{function} {param}");}
 let changed=CheckedModule::from_source(syntax::parse(&SOURCE.replace("fn read(x:Image)","fn renamed(x:Image)").replace("read(x)","renamed(x)")).unwrap()).unwrap();
 // Even a freshly rehashed packet cannot borrow a nonexistent lexical binder.
 assert!(planning::check(&changed,&package(&changed,"read","x")).is_err());
 for (function,param)in[("missing","xs"),("scalar","x"),("owned","x")]{
  let mut bad=package(&m,"read","x");let planning::Step::Physical(p)=&mut bad.steps[0]else{unreachable!()};p.borrow_reads.push(physical::expression_read_site(function,&syntax::Expr::Var(param.into())).unwrap());p.borrow_reads.sort();assert!(planning::check(&m,&bad).is_err());
 }
}

#[test]
fn scoped_loans_preserve_aliases_and_move_same_named_transfer_parameters(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let plan=planning::check(&m,&package(&m,"read","x")).unwrap();
 let d=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/scoped-parameter-loans-conformance");fs::create_dir_all(&d).unwrap();
 fs::write(d.join("source.ink"),SOURCE).unwrap();fs::write(d.join("plan.json"),registry::canonical(plan.package()).unwrap()).unwrap();
 let runtime=Runtime::new(m.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0,1,64,257]{for function in ["read","transfer","overlap","inline","alias","computed"]{
  let args=json!([{"values":(0..n).map(|i|json!({"value":i})).collect::<Vec<_>>(),"tag":u32::MAX}]);
  let f=m.program().functions.iter().find(|f|f.name==function).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),function,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":function,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}
 for n in [0,1,64,257]{for name in ["retained","consumed","folded_alias"]{
  let args=json!([(0..n).map(|i|json!({"value":i})).collect::<Vec<_>>()]);let f=m.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),name,values,&mut 1_000_000).unwrap().json();
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}
 let args=json!([(0..64).map(|i|json!({"position":i,"velocity":u32::MAX,"active":i%2==0})).collect::<Vec<_>>()]);
 let f=m.program().functions.iter().find(|f|f.name=="particles").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let result=eval::call(m.program(),"particles",values,&mut 1_000_000).unwrap().json();
 steps.push(json!({"pure":"particles","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
 fs::write(d.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(d.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
 let output=Command::new("python3").arg("tools/physical_capability_conformance.py").args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&d).arg("--source").arg(d.join("source.ink")).arg("--plan").arg(d.join("plan.json")).output().unwrap();
 fs::write(d.join("selected-run.log"),[output.stdout.as_slice(),output.stderr.as_slice()].concat()).unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 // A native mechanism check observes actual element clones, including nested
 // vectors; keeping only the query borrowed must leave the transfer owning.
 let code=verified_language::state_native::emit_planned(&plan).unwrap();
 let declaration="#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item";
 assert!(code.contains(declaration));let code=code.replace(declaration,"#[derive(Debug,PartialEq,Eq)] pub struct l_Item");
 let selected=d.join("selected");fs::write(selected.join("src/lib.rs"),format!("{code}\npub static CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);impl Clone for l_Item{{fn clone(&self)->Self{{CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{{l_value:self.l_value}}}}}}\n")).unwrap();
 fs::create_dir_all(selected.join("src/bin")).unwrap();fs::write(selected.join("src/bin/count_clones.rs"),r#"use compiled_state::{State,l_Image,l_Item,CLONES};fn main(){let state=State::new();let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};assert_eq!(state.ink_borrowed_function_l_read(&image),0);CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_overlap(image);assert_eq!(result.len(),259);assert_eq!(result[0],0);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_inline(image);assert_eq!(result.len(),259);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_retained(values);assert_eq!(result.len(),258);assert_eq!(result[257].l_value,0);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),1);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_consumed(values);assert_eq!(result.len(),257);assert_eq!(result[256].l_value,256);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);let values=(0..257).map(|value|l_Item{l_value:value}).collect();CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_folded_alias(values);assert_eq!(result.len(),514);assert_eq!(result[513].l_value,256);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),257);let image=l_Image{l_values:(0..257).map(|value|l_Item{l_value:value}).collect(),l_tag:99};CLONES.store(0,std::sync::atomic::Ordering::Relaxed);let result=state.function_l_computed(image);assert_eq!(result.len(),259);assert_eq!(result[0],7);assert_eq!(result[258],99);assert_eq!(CLONES.load(std::sync::atomic::Ordering::Relaxed),0);}"#).unwrap();
 let out=Command::new(env!("CARGO")).args(["run","--offline","--quiet","--manifest-path"]).arg(selected.join("Cargo.toml")).args(["--bin","count_clones","--target-dir"]).arg(selected.join("target")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 parity::conformance("generated-parity-scoped-parameter-loans",m.program().clone(),SOURCE,steps,expected);
}
