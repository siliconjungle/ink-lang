use compiled_state::{State,Wire,EVENT_TYPE};
use diamond_types::list::ListOpLog;
use diamond_types::causalgraph::agent_assignment::remote_ids::RemoteVersion;
use serde_json::{json,Value};
use std::{collections::BTreeMap,hint::black_box,time::Instant};
#[derive(Clone)]struct Event{id:u64,parents:Vec<u64>,pos:usize,insert:bool,value:String}
fn diamond(events:&[Event])->Vec<u32>{
 let mut log=ListOpLog::new();let mut agents=BTreeMap::new();
 for e in events{
  let actor=e.id>>32;let agent=*agents.entry(actor).or_insert_with(||log.get_or_create_agent_id(&format!("{actor:010}")));
  // Diamond Types frontiers must be sorted by local version, whereas wire
  // frontiers carry actor IDs and have no corresponding numeric ordering.
  let mut parents:Vec<usize>=e.parents.iter().map(|id|{
   let actor=id>>32;let name=log.get_agent_name(agents[&actor]);
   log.cg.agent_assignment.remote_to_local_version(RemoteVersion(name,((id&0xffffffff)-1)as usize))
  }).collect();parents.sort_unstable();
  let version=if e.insert{log.add_insert_at(agent,&parents,e.pos,&e.value)}else{log.add_delete_at(agent,&parents,e.pos..e.pos+1)};
  assert_eq!(log.cg.agent_assignment.local_to_agent_version(version).1,((e.id&0xffffffff)-1)as usize);
 }
 log.checkout_tip().content().to_string().chars().map(|c|c as u32).collect()
}
fn main(){
 let cases:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let state=State::new();
 for (index,case) in cases.as_array().unwrap().iter().enumerate(){
  let events:Vec<EVENT_TYPE>=Wire::from_json(&case["events"]).unwrap();
  let upstream:Vec<Event>=case["events"].as_array().unwrap().iter().map(|e|Event{id:e["id"].as_u64().unwrap(),parents:e["parents"].as_array().unwrap().iter().map(|x|x.as_u64().unwrap()).collect(),pos:e["position"].as_u64().unwrap()as usize,insert:e["insert"].as_bool().unwrap(),value:char::from_u32(e["value"].as_u64().unwrap()as u32).unwrap().to_string()}).collect();
  let expected:Vec<u32>=case["expected"].as_array().unwrap().iter().map(|x|x.as_u64().unwrap()as u32).collect();
  assert_eq!(diamond(&upstream),expected,"DT graph {index}");
  assert_eq!(state.function_l_materialize(events.clone()).unwrap(),expected,"Ink graph {index}");
  assert_eq!(state.function_l_walked(events.clone()).unwrap(),expected,"Ink full walker {index}");
  let mut samples=vec![vec![];3];
  for round in 0..13{for i in 0..3{let variant=(round+i)%3;
   let input=events.clone();let t=Instant::now();
   let out=match variant{0=>state.function_l_materialize(black_box(input)).unwrap(),1=>state.function_l_walked(black_box(input)).unwrap(),_=>diamond(black_box(&upstream))};
   let ns=t.elapsed().as_nanos()as u64;black_box(out);if round>=2{samples[variant].push(ns);}
  }}
  for variant in 0..3{let name=["ink_event_graph","ink_full_walker","diamond_types"][variant];println!("{}",json!({"case":index,"name":case["name"],"variant":name,"events":events.len(),"samples_ns":samples[variant]}));}
 }
}
