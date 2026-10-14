use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,physical,planning,registry,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=r#"module projected_items;
record Row{value:u32,payload:List<u32>,}
fn missing()->Row{return Row{value:99,payload:[]};}
fn list_field(xs:List<Row>,i:u32)->u32{return xs.at_or(i,missing()).value;}
fn buffer_field(xs:List<Row>,i:u32)->u32{let values:Buffer<Row>=buffer(xs);return values.at_or(i,missing()).value;}
fn payload(xs:List<Row>,i:u32)->List<u32>{return xs.at_or(i,missing()).payload;}
fn whole(xs:List<Row>,i:u32)->Row{return xs.at_or(i,missing());}
fn fallback_owner(xs:List<Row>,i:u32)->u32{return xs.at_or(i,xs.at_or(0,missing())).value;}
fn maybe(fail:Bool)->Result<Row,u32>{if fail{return Err(17);}return Ok(Row{value:7,payload:[8]});}
fn fallible(xs:List<Row>,i:u32,fail:Bool)->Result<u32,u32>{let row=maybe(fail)?;return Ok(xs.at_or(i,row).value);}
fn eager_row(xs:List<Row>,i:u32,fail:Bool)->Result<u32,u32>{let row=maybe(fail)?;return Ok(xs.at_or(i,Row{value:7,payload:row.payload}).value);}
fn partition(left:Buffer<Row>,right:Buffer<Row>)->Buffer<Row>{let value=left.at_or(8,right.set(0,Row{value:71,payload:[3]}).at_or(0,missing())).value;return left.push(Row{value:value,payload:[]});}
fn partitioned(xs:List<Row>)->List<Row>{let values:Buffer<Row>=buffer(xs);let out=values.split_at(1,fn(left,right)=>partition(left,right));return out.freeze();}
record Particle{position:u32,velocity:u32,}
fn particles(xs:List<Particle>)->List<Particle>{return xs.map(fn(p)=>Particle{position:p.position+p.velocity,velocity:p.velocity});}
"#;
#[test]
fn projected_lookups_preserve_fallback_evaluation_and_scoped_storage(){
 let m=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"buffers":"direct","borrow_reads":[physical::parameter_read_site("list_field","xs").unwrap()]}}]})).unwrap();
 let selected=planning::check(&m,&packet).unwrap();let snapshot=Runtime::new(m.program().clone()).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for n in [0usize,1,64]{let rows=(0..n).map(|i|json!({"value":i,"payload":[i,17]})).collect::<Vec<_>>();
  let mut calls=vec![("partitioned",json!([rows]))];
  for i in [0u32,n as u32,u32::MAX]{for name in ["list_field","buffer_field","payload","whole","fallback_owner"]{calls.push((name,json!([rows,i])));}for fail in [false,true]{for name in ["fallible","eager_row"]{calls.push((name,json!([rows,i,fail])));}}}
  for(name,args)in calls{let f=m.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let value=eval::call(m.program(),name,values,&mut 1_000_000).unwrap().json();steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));}
 }
 let args=json!([(0..64).map(|i|json!({"position":i,"velocity":u32::MAX})).collect::<Vec<_>>()]);let f=m.program().functions.iter().find(|f|f.name=="particles").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();let value=eval::call(m.program(),"particles",values,&mut 1_000_000).unwrap().json();steps.push(json!({"pure":"particles","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
 let d=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/projected-item-conformance");fs::create_dir_all(&d).unwrap();fs::write(d.join("source.ink"),SOURCE).unwrap();fs::write(d.join("plan.json"),registry::canonical(selected.package()).unwrap()).unwrap();fs::write(d.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(d.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
 let out=Command::new("python3").args(["tools/physical_capability_conformance.py","--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&d).arg("--source").arg(d.join("source.ink")).arg("--plan").arg(d.join("plan.json")).output().unwrap();fs::write(d.join("selected-run.log"),[out.stdout.as_slice(),out.stderr.as_slice()].concat()).unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let code=verified_language::state_native::emit_planned(&selected).unwrap();let declaration="#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Row";assert!(code.contains(declaration));let code=code.replace(declaration,"#[derive(Debug,PartialEq,Eq)] pub struct l_Row");let directory=d.join("selected");
 fs::write(directory.join("src/lib.rs"),format!("{code}\npub static CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);impl Clone for l_Row{{fn clone(&self)->Self{{CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{{l_value:self.l_value,l_payload:self.l_payload.clone()}}}}}}\n")).unwrap();fs::create_dir_all(directory.join("src/bin")).unwrap();fs::write(directory.join("src/bin/count_clones.rs"),r#"use compiled_state::{State,l_Row,CLONES};use std::sync::atomic::Ordering::Relaxed;fn main(){let state=State::new();let rows=||vec![l_Row{l_value:3,l_payload:vec![17;4096]}];CLONES.store(0,Relaxed);assert_eq!(state.ink_borrowed_function_l_list_field(&rows(),0),3);assert_eq!(CLONES.load(Relaxed),0);assert_eq!(state.function_l_buffer_field(rows(),0),3);assert_eq!(CLONES.load(Relaxed),0);assert_eq!(state.function_l_whole(rows(),0).l_value,3);assert_eq!(CLONES.load(Relaxed),1);}"#).unwrap();let out=Command::new(env!("CARGO")).args(["run","--offline","--quiet","--manifest-path"]).arg(directory.join("Cargo.toml")).args(["--bin","count_clones","--target-dir"]).arg(directory.join("target")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 parity::conformance("projected-item-parity",m.program().clone(),SOURCE,steps,expected);
}
