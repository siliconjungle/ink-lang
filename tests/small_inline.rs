use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,planning,stateful::Runtime,syntax};
#[path="support/parity.rs"]mod parity;
const SOURCE:&str=include_str!("fixtures/small_inline.ink");
#[test]
fn checked_small_helper_choices_preserve_cpu_values_errors_events_and_snapshots(){
 let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/small-inline-conformance");fs::create_dir_all(&root).unwrap();fs::write(root.join("core.json"),module.bytes().unwrap()).unwrap();
 let script=r#"import sys,json
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import load,execute
d=Path(sys.argv[2]);core=json.loads((d/'core.json').read_text());store=Store.publish(d/'knowledge',[])
recipe=next(r for r in load(store=store)[0]['recipes']if r['id']=='small-carrier-inline')
context=dict(core=core,source=sys.argv[3],compiler=sys.argv[1],knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=120)
rows=[r for r in execute(recipe,context)if r['status']=='proposal'and 'step'in r];assert len(rows)>=2,rows
objects={};applications=[]
for row in rows:
 packet=row['step']['package'];objects.update(packet['knowledge']['objects']);applications.extend(packet['applications'])
proofs=Store.publish(d/'proofs',list(objects.values()))
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=context['source'],knowledge=proofs.bundle(sorted({a['law']for a in applications})),applications=applications)
(d/'plan.json').write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=context['source'],steps=[dict(kind='rewrite',package=packet)])))
"#;
 let out=Command::new("python3").arg("-c").arg(script).arg(env!("CARGO_BIN_EXE_ink")).arg(&root).arg(module.identity().unwrap()).env("PYTHONPATH",Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge").display().to_string()+":"+&Path::new(env!("CARGO_MANIFEST_DIR")).join("planner").display().to_string()).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
 let package:planning::Package=serde_json::from_slice(&fs::read(root.join("plan.json")).unwrap()).unwrap();let selected=planning::check(&module,&package).unwrap();assert_ne!(module.identity().unwrap(),selected.module().identity().unwrap());
 let mut runtime=Runtime::new(module.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 let owner=json!({"a":[1,2],"b":[],"c":[u32::MAX],"tag":u32::MAX});
 for (name,args) in [("main",json!([owner,0])),("main",json!([owner,1])),("callback",json!([[owner,owner],1])),("callback",json!([[],u32::MAX])),("owned_sum",json!([[]])),("owned_sum",json!([[1,2,3]]))]{
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect::<Vec<_>>();let want=eval::call(module.program(),name,values.clone(),&mut 1_000_000).unwrap().json();assert_eq!(eval::call(selected.module().program(),name,values,&mut 1_000_000).unwrap().json(),want);
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
 }
 for reject in [false,true,false]{let args=json!([owner,1,reject]);let before=runtime.checkpoint_portable().unwrap();let out=runtime.invoke_json("save",&args).unwrap();assert_eq!(out.committed,!reject);if reject{assert!(out.events.is_empty());assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert_eq!(out.events.len(),1);}steps.push(json!({"call":"save","args":args}));expected.push(json!({"reply":{"outcome":out.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 parity::conformance_planned("small-inline-parity",&selected,SOURCE,steps,expected);
}
