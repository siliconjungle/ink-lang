//! Generic database instantiation preserves each independent fold's order.
use serde_json::{json, Value};
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,optimisation,syntax,stateful::Runtime};
#[path="support/parity.rs"] mod parity;

#[test]
fn generic_batching_preserves_words_float_bits_and_record_lanes() {
    let source=include_str!("../knowledge/libraries/examples/independent-fold-batching.ink");
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/independent-fold-batching-parity");
    fs::create_dir_all(&root).unwrap();fs::write(root.join("core.json"),module.bytes().unwrap()).unwrap();
    let script=r#"
import json,subprocess,sys
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.law_templates import from_general,generate
root=Path(sys.argv[1]);compiler=sys.argv[2];source_id=sys.argv[3]
result=subprocess.run([compiler,'emit-laws','knowledge/libraries/independent-fold-batching.ink','-o',str(root/'laws.json')],check=True,capture_output=True,text=True)
names=json.loads(result.stdout)['names'];bundle=json.loads((root/'laws.json').read_text())
subprocess.run([compiler,'emit-semantic',str(root/'core.json'),'--core','-o',str(root/'subject.json')],check=True,capture_output=True)
core=json.loads((root/'core.json').read_text());subject=json.loads((root/'subject.json').read_text())
store=Store.publish(root/'knowledge',bundle['objects'].values());store=store.extend([from_general(store,names['independent_fold_batch'])])
objects,receipts=generate(store,subject,core);store=store.extend(objects.values())
applications=[]
for name,body in subject['functions'].items():
 for ident,obj in objects.items():
  if obj['payload']['from']==body:
   applications.append(dict(function=name,path=[],law=ident,arguments={n:dict(sort=s,node={'Free':n})for n,s in obj['payload']['params'].items()},premises=[]))
assert {a['function']for a in applications}=={'words','floating','columns'}
(root/'package.json').write_bytes(canonical(dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=source_id,knowledge=store.bundle([a['law']for a in applications]),applications=applications)))
(root/'discovery.json').write_text(json.dumps(receipts))
"#;
    let output=Command::new("python3").env("PYTHONPATH","planner:knowledge").args(["-c",script])
        .arg(&root).arg(env!("CARGO_BIN_EXE_ink")).arg(module.identity().unwrap()).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    let package=serde_json::from_slice(&fs::read(root.join("package.json")).unwrap()).unwrap();
    let selected=optimisation::check(&module,&package).unwrap();
    let (steps,expected)=execution_cases(&module,selected.module());
    parity::conformance_selected("independent-fold-batching-parity",&selected,source,steps,expected);
}

fn execution_cases(module:&CheckedModule,selected:&CheckedModule)->(Vec<Value>,Vec<Value>) {
    let mut cases:Vec<(&str,Value)>=vec![];
    for xs in [json!([]),json!([0]),json!([u32::MAX,1,7,3])] {
        for states in [json!([]),json!([0]),json!([u32::MAX,3,19])] {
            for factor in [0,3,u32::MAX] {cases.push(("words",json!([xs,states,factor])));}
        }
    }
    let special=json!([{"F32Bits":0x80000000u32},{"F32Bits":1},{"F32Bits":0x7fc12345u32},{"F32Bits":0x7f800000u32},{"F32Bits":0xff800000u32}]);
    for xs in [json!([]),json!([1.0e20,-1.0e20,3.0]),special.clone()] {
        for states in [json!([]),json!([1.0,-1.0,0.0]),special.clone()] {cases.push(("floating",json!([xs,states])));}
    }
    for ks in [json!([]),json!([0,1,2]),json!([u32::MAX,0,2])] {
        for states in [json!([]),json!([{"column":0,"total":7},{"column":2,"total":u32::MAX},{"column":u32::MAX,"total":3}])] {
            for (side,row) in [(0,0),(3,1),(u32::MAX,u32::MAX)] {
                cases.push(("columns",json!([ks,states,[1,3,7,11,13,17],[2,5,7,9,11,13],side,row])));
            }
        }
    }
    for xs in [json!([]),json!([0]),json!([u32::MAX,1,7,3])] {
        for states in [json!([]),json!([0]),json!([u32::MAX,3,19])] {
            cases.push(("captured_seed",json!([xs,states])));
        }
    }
    let snapshot=Runtime::new(module.program().clone()).unwrap().checkpoint_portable().unwrap();
    let mut steps=vec![];let mut expected=vec![];
    for (name,args) in cases {
        let function=module.program().functions.iter().find(|f|f.name==name).unwrap();
        let input:Vec<_>=args.as_array().unwrap().iter().zip(&function.params)
            .map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
        let value=eval::call(module.program(),name,input.clone(),&mut 10_000_000).unwrap().json();
        assert_eq!(eval::call(selected.program(),name,input,&mut 10_000_000).unwrap().json(),value);
        steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
    }
    assert_eq!(steps.len(),63);
    (steps,expected)
}

#[test]
fn captured_lane_templates_preserve_original_environment_across_cpu_hosts() {
    let source=include_str!("../knowledge/libraries/examples/independent-fold-batching.ink");
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/captured-fold-batching-parity");
    fs::create_dir_all(&root).unwrap();fs::write(root.join("core.json"),module.bytes().unwrap()).unwrap();
    fs::write(root.join("source.ink"),source).unwrap();
    let script=r#"
import json,subprocess,sys
from pathlib import Path
from ink_knowledge import Store,canonical
from ink_knowledge.source_algorithms import propose
from producers.captured_fold_batching import templates
root=Path(sys.argv[1]);compiler=sys.argv[2];source_id=sys.argv[3]
result=subprocess.run([compiler,'emit-laws','knowledge/libraries/independent-fold-batching.ink','-o',str(root/'laws.json')],check=True,capture_output=True,text=True)
names=json.loads(result.stdout)['names'];bundle=json.loads((root/'laws.json').read_text())
rows=templates(names['map_fusion']);store=Store.publish(root/'knowledge',[*bundle['objects'].values(),rows[0]['object']])
current=json.loads((root/'core.json').read_text());current_id=source_id;steps=[]
for function in ['captured_seed','columns','floating','words']:
 context=dict(core=current,compiler=compiler,source=current_id,knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,check_timeout=120)
 candidates=list(propose(context))
 candidate=next(c for c in candidates if c['status']=='proposal' and c['steps'][-1]['package']['applications'][0]['function']==function)
 steps+=candidate['steps']
 (root/'plan.json').write_bytes(canonical(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source_id,steps=steps)))
 result=subprocess.run([compiler,'check-plan',str(root/'source.ink'),str(root/'plan.json'),'--target','javascript'],capture_output=True,text=True)
 assert result.returncode==0,result.stderr
 state=json.loads(result.stdout);current=state['state']['core'];current_id=state['selected']
assert len([s for s in steps if s['kind']=='rewrite'])==4
"#;
    let output=Command::new("python3").env("PYTHONPATH","planner:knowledge").args(["-c",script])
        .arg(&root).arg(env!("CARGO_BIN_EXE_ink")).arg(module.identity().unwrap()).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    let package=serde_json::from_slice(&fs::read(root.join("plan.json")).unwrap()).unwrap();
    let plan=verified_language::planning::check(&module,&package).unwrap();
    let (steps,expected)=execution_cases(&module,plan.module());
    parity::conformance_planned("captured-fold-batching-parity",&plan,source,steps,expected);
}
