use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="parity.rs"] mod parity;

#[test]
fn sparse_ecs_histories_match_slot_oracle_and_portable_targets(){
 let p=modules::load("bench/ecs-lifecycle/main.ink").unwrap().program;
 let rt=Runtime::new(p.clone()).unwrap();
 let mut cases=vec![];
 for capacity in [0usize,1,7] {
  let mut commands=vec![];
  for slot in 0..capacity {for (kind,value) in [(0,0),(2,u32::MAX-slot as u32),(3,slot as u32+2)]{
   commands.push(json!({"kind":kind,"slot":slot,"generation":0,"value":value}));
  }}
  commands.push(json!({"kind":6,"slot":u32::MAX,"generation":0,"value":0}));
  for slot in 0..capacity {
   for (kind,generation,value) in [(1,0,0),(2,0,99),(0,1,0),(2,1,17),(3,1,3),(5,1,0),(6,0,0),(3,1,u32::MAX),(4,1,0),(2,1,9)]{
    commands.push(json!({"kind":kind,"slot":slot,"generation":generation,"value":value}));
   }
  }
  let mut seed=104729u32;
  for _ in 0..40 {seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);commands.push(json!({"kind":seed%9,"slot":(seed>>8)%(capacity as u32+2),"generation":(seed>>16)%3,"value":seed}));}
  commands.push(json!({"kind":2,"slot":u32::MAX,"generation":0,"value":1}));
  // Every short prefix catches corruption masked by a later deletion; longer
  // histories exercise repeated swaps and component presence independently.
  for n in (0..commands.len().min(18)).chain([commands.len()/2,commands.len()]) {
   let trace=&commands[..n];let mut generations=vec![0u32;capacity];
   let mut rows:Vec<Option<(Option<u32>,Option<u32>)>>=vec![None;capacity];
   for command in trace {
    let kind=command["kind"].as_u64().unwrap() as u32;
    let slot=command["slot"].as_u64().unwrap() as usize;
    let generation=command["generation"].as_u64().unwrap() as u32;
    let value=command["value"].as_u64().unwrap() as u32;
    if kind==6 {for row in rows.iter_mut().flatten(){if let (Some(p),Some(v))=row { *p=p.wrapping_add(*v); }}continue;}
    if slot>=capacity || generation!=generations[slot]{continue;}
    match kind {
     0=>{if rows[slot].is_none(){rows[slot]=Some((None,None));}},
     1=>{if rows[slot].take().is_some(){generations[slot]=generations[slot].wrapping_add(1);}},
     2=>{if let Some(row)=&mut rows[slot]{row.0=Some(value);}},
     3=>{if let Some(row)=&mut rows[slot]{row.1=Some(value);}},
     4=>{if let Some(row)=&mut rows[slot]{row.0=None;}},
     5=>{if let Some(row)=&mut rows[slot]{row.1=None;}},
     _=>(),
    }
   }
   let output:Vec<Value>=rows.iter().enumerate().filter_map(|(slot,r)|r.map(|(pos,vel)|json!({"slot":slot,"generation":generations[slot],"position":pos.unwrap_or(0),"velocity":vel.unwrap_or(0),"has_position":pos.is_some(),"has_velocity":vel.is_some()}))).collect();
   let query:Vec<usize>=rows.iter().enumerate().filter_map(|(slot,r)|matches!(r,Some((Some(_),Some(_)))).then_some(slot)).collect();
   cases.push((json!([capacity,trace]),json!({"generations":generations,"rows":output,"query":query})));
  }
 }
 let mut steps=vec![];let mut expected=vec![];
 for (args,want) in cases {for name in ["run","run_indexed"] {
  let f=p.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  assert_eq!(eval::call(&p,name,values,&mut 100_000_000).unwrap().json(),want,"{args}");
  steps.push(json!({"pure":name,"args":args,"cpu_only":true,"expect_gpu":false}));
  expected.push(json!({"reply":{"value":want},"snapshot":rt.checkpoint_portable().unwrap()}));
 }
 }
 parity::conformance("ecs-lifecycle",p.clone(),include_str!("../../bench/ecs-lifecycle/main.ink"),steps.clone(),expected.clone());
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));let output=root.join("build/ecs-lifecycle/conformance-plan");
 let prepare=std::process::Command::new("python3").arg(root.join("bench/cross-domain/prepare.py"))
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--source"]).arg(root.join("bench/ecs-lifecycle/main.ink"))
  .args(["--scalar-calls","--output"]).arg(&output).output().unwrap();
 assert!(prepare.status.success(),"{}",String::from_utf8_lossy(&prepare.stderr));
 let original=verified_language::core::CheckedModule::from_source(p).unwrap();
 let package:verified_language::planning::Package=serde_json::from_slice(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 let checked=verified_language::planning::check(&original,&package).unwrap();
 parity::conformance_planned("ecs-lifecycle-unfolded",&checked,include_str!("../../bench/ecs-lifecycle/main.ink"),steps,expected);
}
