//! The database-proved map/buffer carrier preserves the complete ordered result
//! through reference, native Rust, JavaScript and retained Wasm host paths.
use serde_json::{json,Value};
use std::{collections::BTreeSet,fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,optimisation,syntax};
#[path="support/parity.rs"] mod parity;
#[test]
fn checked_indexed_dedup_preserves_order_and_owned_results_across_cpu_hosts(){
 let dir=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/indexed-dedup-parity");fs::create_dir_all(&dir).unwrap();
 let output=Command::new("python3").env("PYTHONPATH","knowledge").args(["-m","producers.indexed_dedup"]).arg(&dir).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let output=Command::new(env!("CARGO_BIN_EXE_ink")).arg("emit-laws").arg(dir.join("source.ink")).arg("--proofs").arg(dir.join("proofs.json")).arg("-o").arg(dir.join("bundle.json")).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let receipt:Value=serde_json::from_slice(&output.stdout).unwrap();
 let library=fs::read_to_string("knowledge/libraries/indexed-dedup-u32.ink").unwrap();
 let source=format!("module indexed_words;\n{}\npub fn run(xs:List<u32>)->List<u32>{{return foldl(xs,empty_words(),fn(item,acc)=>dedup_step(item,acc));}}",library.split("law index_membership").next().unwrap().split_once('\n').unwrap().1);
 let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
 let bundle:Value=serde_json::from_slice(&fs::read(dir.join("bundle.json")).unwrap()).unwrap();
 let package:optimisation::Package=serde_json::from_value(json!({"schema":1,"semantics":"ink-evidence-v1","input_core_sha256":module.identity().unwrap(),"knowledge":bundle,"applications":[{"function":"run","path":[],"law":receipt["names"]["dedup_indexed"],"arguments":{"xs":{"sort":{"Value":{"List":"U32"}},"node":{"Free":"xs"}}},"premises":[]}]})).unwrap();
 let selected=optimisation::check(&module,&package).unwrap();
 let snapshot=verified_language::stateful::Runtime::new(module.program().clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for n in [0,1,2,17,257] {for mode in 0..3 {
  let mut xs:Vec<u32>=(0..n).map(|i:u32|if mode==1 {i%7}else{i.wrapping_mul(2654435761)}).collect();if mode==2 {xs.reverse();}if n>1 {xs[0]=u32::MAX;}
  let mut seen=BTreeSet::new();let oracle:Vec<_>=xs.iter().copied().filter(|x|seen.insert(*x)).collect();
  let args=vec![eval::Value::List(xs.iter().copied().map(eval::Value::U32).collect())];
  for p in [module.program(),selected.module().program()] {assert_eq!(eval::call(p,"run",args.clone(),&mut 10_000_000).unwrap().json(),json!(oracle));}
  steps.push(json!({"pure":"run","args":[xs]}));expected.push(json!({"reply":{"value":oracle},"snapshot":snapshot}));
 }}
 parity::conformance_selected("indexed-dedup-parity",&selected,&source,steps,expected);
}

#[test]
fn ordinary_source_discovers_a_checked_indexed_plan_across_cpu_hosts(){
 let source=include_str!("../bench/planning-corpus/heldout/compact-set.ink");
 let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
 let dir=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/indexed-dedup-discovery-parity");fs::create_dir_all(&dir).unwrap();
 fs::write(dir.join("core.json"),module.bytes().unwrap()).unwrap();
 let script=r#"
import json,sys
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.recipes import execute,load
root=Path(sys.argv[1]);compiler=sys.argv[2];source=sys.argv[3]
core=json.loads((root/'core.json').read_text());store=Store.publish(root/'knowledge',[])
registry,_=load(store=store);recipe=next(r for r in registry['recipes']if r['id']=='indexed-ordered-dedup')
rows=list(execute(recipe,dict(core=core,source=source,compiler=compiler,knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=120)))
plans=[r for r in rows if r['status']=='proposal'];assert len(plans)==1,[(r['status'],r.get('reason'))for r in rows]
(root/'plan.json').write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source,steps=plans[0]['steps'])))
"#;
 let output=Command::new("python3").env("PYTHONPATH","knowledge:planner").args(["-c",script]).arg(&dir).arg(env!("CARGO_BIN_EXE_ink")).arg(module.identity().unwrap()).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let package=serde_json::from_slice(&fs::read(dir.join("plan.json")).unwrap()).unwrap();
 let plan=verified_language::planning::check(&module,&package).unwrap();
 let snapshot=verified_language::stateful::Runtime::new(module.program().clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for xs in [vec![],vec![0],vec![u32::MAX,0,u32::MAX,17,0],(0..129).rev().map(|i|i%31).collect()] {
  let mut seen=BTreeSet::new();let oracle:Vec<_>=xs.iter().copied().filter(|x|seen.insert(*x)).collect();
  let args=vec![eval::Value::List(xs.iter().copied().map(eval::Value::U32).collect()),eval::Value::U32(17)];
  for p in [module.program(),plan.module().program()] {assert_eq!(eval::call(p,"run",args.clone(),&mut 10_000_000).unwrap().json(),json!(oracle));}
  steps.push(json!({"pure":"run","args":[xs,17]}));expected.push(json!({"reply":{"value":oracle},"snapshot":snapshot}));
 }
 parity::conformance_planned("indexed-dedup-discovery-parity",&plan,source,steps,expected);
}
