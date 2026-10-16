use serde_json::{json,Value};
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
#[test]
fn prepared_sum_values_match_reference_and_compiled_targets(){
 let source=format!("{}\nfn numeric(xs:List<f32>)->List<f32>{{return xs.map(fn(x)=>x*x+0.5);}}",include_str!("../../lowerings/js/tests/fixtures/prepared_sums.ink"));
 let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
 let cases:Vec<Value>=serde_json::from_str(include_str!("../../reports/prepared-sums-2026-10-16/cases/native/cases.json")).unwrap();
 assert_eq!(cases.len(),111);
 let snapshot=Runtime::from_checked(&module).unwrap().checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 for c in cases {
  let name=c["name"].as_str().unwrap();let args=c["args"].as_array().unwrap();
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
  let inputs=args.iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
  let value=eval::call_checked(&module,name,inputs,&mut 1_000_000).unwrap();
  assert_eq!(value,eval::Value::from_program_json(&c["expected"],&f.result,module.program()).unwrap());
  steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
 }
 steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
 expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":snapshot}));
 super::parity::conformance_checked("prepared-sum-parity",&module,&source,steps,expected);
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/prepared-sum-parity");
 fs::write(root.join("prepared.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const steps=JSON.parse(fs.readFileSync(new URL('script.json',import.meta.url))),expected=JSON.parse(fs.readFileSync(new URL('expected.json',import.meta.url))),sessions=new Map();let calls=0;
for(let i=0;i<steps.length;i++){
 const x=steps[i],e=m.compiledValues[x.pure],h=x.args.map((v,j)=>e.params[j].capture(v)),bytes=m.valueCodecs[x.pure].result.encode(expected[i].reply.value);
 for(const fixed of [[],[0],h.map((_,j)=>j)]){
  const key=x.pure+':'+JSON.stringify(fixed.map(j=>[j,x.args[j]]));let token=sessions.get(key);
  if(!token){token=m.prepareCompiled(x.pure,fixed.map(j=>[j,h[j]]));sessions.set(key,token);}
  for(let repeat=0;repeat<2;repeat++){assert.deepEqual(e.result.encode(m.callPreparedCompiled(token,h.filter((_,j)=>!fixed.includes(j)))),bytes);calls++;}
 }
}console.log(JSON.stringify({source_core:m.metadata.core_sha256,referenceCases:steps.length,preparedCalls:calls}));"#).unwrap();
 let result=Command::new("node").arg(root.join("prepared.mjs")).output().unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));println!("{}",String::from_utf8_lossy(&result.stdout));
}
