use serde_json::{json,Value};
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[test]
fn sealed_residual_calls_preserve_reference_and_complete_cpu_values(){
 let source=include_str!("../../lowerings/js/tests/fixtures/prepared_residual.ink");
 let p=syntax::parse(source).unwrap();let m=CheckedModule::from_source(p.clone()).unwrap();
 let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 let cases:Vec<(&str,Value)>=vec![
 ("indexed",json!([[1,2,3],[0,1,2,7]])),("guarded",json!([[1,2,3],[]])),
 ("guarded",json!([[1,2,3],[7]])),("guarded",json!([[1,2,3],[0,1,2,7]])),
 ("edited",json!([[1,2,3],[7,2,9]])),("edited",json!([[1,2,3],[9,7,11]])),
 ("transformed",json!([[1,2,4294967295u32],3])),("transformed",json!([[1,2,4294967295u32],7])),
 ("shadowed",json!([[1,2,3],[8,9]])),("shadowed",json!([[1,2,3],[17]])),
 ("floating",json!([[0.0,-0.0,{"F32Bits":0x7fc12345u32},{"F32Bits":1}],true])),
 ("floating",json!([[0.0,-0.0,{"F32Bits":0x7fc12345u32},{"F32Bits":1}],false])),
 ("checked",json!([[1,2,3],[0,1,2,7],true])),("plain",json!([u32::MAX]))];
 for(name,args)in cases{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  let value=eval::call(&p,name,input,&mut 1_000_000).unwrap().json();steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
 }
 super::parity::conformance_checked("prepared-residual-parity",&m,source,steps,expected);
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/prepared-residual-parity");
 fs::write(root.join("prepared.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const steps=JSON.parse(fs.readFileSync(new URL('script.json',import.meta.url))),expected=JSON.parse(fs.readFileSync(new URL('expected.json',import.meta.url)));let count=0;
for(let i=0;i<steps.length;i++){const c=steps[i],e=m.compiledValues[c.pure],handles=c.args.map((v,j)=>e.params[j].capture(v));
 for(const indices of [[],[0],handles.map((_,j)=>j)]){const unique=[...new Set(indices)],token=m.prepareCompiled(c.pure,unique.map(j=>[j,handles[j]])),remaining=handles.filter((_,j)=>!unique.includes(j));
  for(let repeat=0;repeat<3;repeat++){assert.deepEqual(e.result.encode(m.callPreparedCompiled(token,remaining)),m.valueCodecs[c.pure].result.encode(expected[i].reply.value));count++;}}
}console.log(JSON.stringify({referenceCases:steps.length,preparedCalls:count}));"#).unwrap();
 let result=Command::new("node").arg(root.join("prepared.mjs")).output().unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));println!("{}",String::from_utf8_lossy(&result.stdout));
}
