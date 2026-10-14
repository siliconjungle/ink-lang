use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,planning,stateful::Runtime,syntax};
#[path="support/parity.rs"] mod parity;
const SOURCE:&str=r#"module field_helpers;
record Frame{data:Buffer<u32>,fallback:u32,tag:u64,padding:List<u32>,}
enum Error{Rejected,}
fn changed(f:Frame,index:u32)->Frame{if index==0{return f;}let data=f.data.set(index-1,f.fallback);return Frame{..f,data:data};}
fn caller(xs:List<u32>,index:u32)->List<u32>{let frame=Frame{data:buffer(xs),fallback:99,tag:7,padding:[1,2,3]};return changed(frame,index).data.freeze();}
fn computed(xs:List<u32>,index:u32)->List<u32>{return changed(Frame{data:buffer(xs),fallback:99,tag:7,padding:[1]},index).data.freeze();}
fn list_size(xs:List<u32>)->u32{return length(xs);}
private state Saved:List<u32>=[];
event total:u32;
change save(xs:List<u32>,index:u32,reject:Bool)->Result<u32,Error> writes(Saved) emits(total){Saved=caller(xs,index);let n=list_size(Saved);emit total(n);return choose(reject,Err(Error.Rejected),Ok(n));}
query saved()->List<u32> reads(Saved){return Saved;}
"#;

#[test]
fn database_field_helper_preserves_all_cpu_observations_and_original_snapshots(){
 let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frame-projection-conformance");fs::create_dir_all(&root).unwrap();fs::write(root.join("source.ink"),SOURCE).unwrap();fs::write(root.join("core.json"),module.bytes().unwrap()).unwrap();
 let script=r#"import sys,json
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import load,execute
d=Path(sys.argv[2]);core=json.loads((d/'core.json').read_text());store=Store.publish(d/'knowledge',[])
recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='frame-projection')
context=dict(core=core,source=sys.argv[3],compiler=sys.argv[1],knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=120)
rows=[r for r in execute(recipe,context)if r['status']=='proposal'];assert len(rows)==1,rows
(d/'plan.json').write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=context['source'],steps=rows[0]['steps'])))
"#;
 let out=Command::new("python3").arg("-c").arg(script).arg(env!("CARGO_BIN_EXE_ink")).arg(&root).arg(module.identity().unwrap()).env("PYTHONPATH",Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge").display().to_string()+":"+&Path::new(env!("CARGO_MANIFEST_DIR")).join("planner").display().to_string()).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let package:planning::Package=serde_json::from_slice(&fs::read(root.join("plan.json")).unwrap()).unwrap();let selected=planning::check(&module,&package).unwrap();
 assert!(selected.module().program().functions.iter().any(|f|f.name.starts_with("frame_projected_")&&f.params.len()==3));
 let mut runtime=Runtime::new(module.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for xs in [json!([]),json!([1]),json!([0,4294967295u32,3])]{for index in [0u32,1,2,u32::MAX]{for name in ["caller","computed"]{
  let args=json!([xs,index]);let f=module.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect::<Vec<_>>();let want=eval::call(module.program(),name,values.clone(),&mut 1_000_000).unwrap().json();assert_eq!(eval::call(selected.module().program(),name,values,&mut 1_000_000).unwrap().json(),want);
  steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }}}
 for reject in [false,true,false]{let args=json!([[1,2,3],2,reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 let out=runtime.invoke_json("saved",&json!([])).unwrap();steps.push(json!({"call":"saved","args":[]}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
 parity::conformance_planned("frame-projection-parity",&selected,SOURCE,steps,expected);
}
