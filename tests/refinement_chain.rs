use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[test]
fn stable_refinement_links_and_replay_match_independent_partitions_on_all_cpu_targets(){
 let path="examples/crdts/refinement_chain.ink";let program=modules::load(path).unwrap().program;let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for cuts in [vec![],vec![32,16,48,8,24,40,56],vec![63,62,61,60,59,58,57,0,64,u32::MAX],vec![8,8,8,24,24,0,64]]{
  let mut parts=vec![[0u32,0,0,0],[1,64,0,0]];
  for cut in &cuts{if *cut<64{let key=1+cut;if let Some(slot)=(1..parts.len()).find(|&slot|parts[slot][0]<key&&key<parts[slot][0]+parts[slot][1]){let old=parts[slot];let offset=key-old[0];let fresh=parts.len()as u32;parts[slot]=[old[0],offset,fresh,old[3]];parts.push([key,old[1]-offset,old[2],old[3]+offset]);}}}
  let links=parts.iter().flatten().copied().collect::<Vec<_>>();let replay=parts.iter().enumerate().flat_map(|(i,p)|[u32::from(i!=0),0,p[2]]).collect::<Vec<_>>();
  for (name,want)in [("links",links),("replay",replay)]{let args=json!([cuts]);let f=program.functions.iter().find(|f|f.name==name).unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();assert_eq!(eval::call(&program,name,values,&mut 5_000_000).unwrap().json(),json!(want));steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 }
 parity::conformance("refinement-chain-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
