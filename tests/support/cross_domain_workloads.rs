use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
use super::parity;

#[test]
fn cross_domain_kernels_match_independent_edge_oracles_and_all_targets(){
 let p=modules::load("bench/cross-domain/main.ink").unwrap().program;
 let rt=Runtime::new(p.clone()).unwrap();
 let mut cases:Vec<(&str,Value,Value)>=vec![
  ("ecs",json!([[]]),json!([])),
  ("ecs",json!([[{"x":u32::MAX,"y":4,"vx":1,"vy":u32::MAX}]]),json!([{"x":0,"y":3,"vx":1,"vy":u32::MAX}])),
  ("game",json!([[{"parent":99,"x":u32::MAX,"y":7},{"parent":0,"x":2,"y":3},{"parent":1,"x":5,"y":6}]]),json!([{"x":u32::MAX,"y":7},{"x":1,"y":10},{"x":6,"y":16}])),
  ("compiler",json!([[]]),json!([])),
  ("compiler",json!([[97,49,32,49,50,43,95,98,10]]),json!([{"start":0,"end":2,"kind":1},{"start":3,"end":5,"kind":2},{"start":5,"end":6,"kind":3},{"start":6,"end":8,"kind":1}])),
  ("compiler",json!([[43,43,49,97]]),json!([{"start":0,"end":1,"kind":3},{"start":1,"end":2,"kind":3},{"start":2,"end":3,"kind":2},{"start":3,"end":4,"kind":1}])),
  ("database",json!([[{"key":0,"value":u32::MAX},{"key":0,"value":2},{"key":4,"value":99}],3]),json!([1,0,0])),
  ("database",json!([[{"key":0,"value":9}],0]),json!([])),
  ("rendering",json!([[{"min_x":0,"min_y":0,"max_x":4,"max_y":4},{"min_x":7,"min_y":7,"max_x":9,"max_y":9}],{"min_x":4,"min_y":4,"max_x":6,"max_y":6}]),json!([0])),
  ("math",json!([[1,2,3,4],[5,6,7,8],2]),json!([19,22,43,50])),
  ("math",json!([[u32::MAX],[2],1]),json!([u32::MAX-1])),
  ("math",json!([[1],[2],2]),json!([2,0,0,0])),
  ("math",json!([[],[],0]),json!([])),
 ];
 for width in 0..=6usize {for pattern in 0..4usize {
  let grid:Vec<u32>=(0..width*width).map(|i|match pattern{0=>0,1=>(i%3==1)as u32,2=>(i%width==width/2)as u32,_=>1}).collect();
  for start in [0,grid.len()as u32,u32::MAX] {
   let mut out=vec![u32::MAX;grid.len()];let mut q=std::collections::VecDeque::new();
   if width>0 && (start as usize)<grid.len() && grid[start as usize]==0 {out[start as usize]=0;q.push_back(start as usize);}
   while let Some(i)=q.pop_front(){let x=i%width;let y=i/width;for (dx,dy)in [(1isize,0isize),(-1,0),(0,1),(0,-1)] {
    let (nx,ny)=(x as isize+dx,y as isize+dy);
    if nx>=0 && ny>=0 && nx<width as isize && ny<width as isize {let j=ny as usize*width+nx as usize;if grid[j]==0&&out[j]==u32::MAX{out[j]=out[i]+1;q.push_back(j);}}
   }}
   cases.push(("pathfinding",json!([grid,width,start]),json!(out)));
  }
 }}
 cases.push(("pathfinding",json!([[0,0,0],2,0]),json!(vec![u32::MAX;3])));
 cases.push(("physics",json!([[{"x":2.0,"y":0.0,"vx":1.0,"vy":-2.0}],0.5,-4.0]),json!([{"x":2.5,"y":0.0,"vx":1.0,"vy":4.0}])));
 // Reference-derived float edge observations retain NaN payload rules and raw
 // zeros across generated backends, separately from the independent finite case.
 for bits in [0,0x80000000u32,1,0x007fffff,0x00800000,0x7f7fffff,0x7f800000,0xff800000,0x7fa12345,0xff812345] {
  let args=json!([[{"x":{"F32Bits":bits},"y":{"F32Bits":bits},"vx":1.0,"vy":-1.0}],0.125,-9.0]);
  let f=p.functions.iter().find(|f|f.name=="physics").unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  let want=eval::call(&p,"physics",values,&mut 10_000_000).unwrap().json();cases.push(("physics",args,want));
 }
 let mut steps=vec![];let mut expected=vec![];
 for (name,args,want)in cases {
  let f=p.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  assert_eq!(eval::call(&p,name,values,&mut 10_000_000).unwrap().json(),want,"{name}: {args}");
  steps.push(json!({"pure":name,"args":args,"cpu_only":true,"expect_gpu":false}));
  expected.push(json!({"reply":{"value":want},"snapshot":rt.checkpoint_portable().unwrap()}));
 }
 parity::conformance("cross-domain-workloads",p.clone(),include_str!("../../bench/cross-domain/main.ink"),steps.clone(),expected.clone());
 // The exact same independent observations must survive checked unfolding on
 // every portable target. The physical direct-buffer choice is Rust-only.
 let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
 for shared in [false,true] {
 let label=if shared {"cross-domain-shared-scalars"}else{"cross-domain-unfolded"};
 let output=root.join("build/cross-domain").join(label);
 let mut command=std::process::Command::new("python3");command.arg(root.join("bench/cross-domain/prepare.py"));
 if shared {command.arg("--share-arguments");}
 let prepare=command
  .args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--scalar-calls","--output"]).arg(&output).output().unwrap();
 assert!(prepare.status.success(),"{}",String::from_utf8_lossy(&prepare.stderr));
 let original=verified_language::core::CheckedModule::from_source(p.clone()).unwrap();
 let package:verified_language::planning::Package=serde_json::from_slice(&std::fs::read(output.join("rewrite-plan.json")).unwrap()).unwrap();
 let checked=verified_language::planning::check(&original,&package).unwrap();
 assert!(!package.steps.is_empty());
 parity::conformance_planned(label,&checked,include_str!("../../bench/cross-domain/main.ink"),steps.clone(),expected.clone());
 }
}
