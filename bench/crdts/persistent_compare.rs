#[path="../lib.rs"]mod treatment;
use treatment::{State,Wire,CHANGE_TYPE};
CONTROL_IMPORT
use diamond_types::list::{ListOpLog,ListCRDT};
use serde_json::{Value,json};
use std::{hint::black_box,time::Instant};
mod native{include!("persistent_diamond.rs");
 pub struct Prepared{actor:String,parents:Vec<(String,usize)>,position:usize,remove:usize,text:String}
 pub fn prepare(changes:&[Value])->Vec<Prepared>{changes.iter().map(|c|Prepared{
  actor:format!("{:010}",word(&c["id"])>>32),parents:c["parents"].as_array().unwrap().iter().map(|p|{let id=word(p);(format!("{:010}",id>>32),((id&0xffffffff)-1)as usize)}).collect(),
  position:c["position"].as_u64().unwrap()as usize,remove:c["remove"].as_u64().unwrap()as usize,text:c["text"].as_array().unwrap().iter().map(|v|char::from_u32(v.as_u64().unwrap()as u32).unwrap()).collect(),
 }).collect()}
 pub fn apply(log:&mut ListOpLog,changes:&[Prepared]){for c in changes{
  let agent=log.get_or_create_agent_id(&c.actor);let mut parents:Vec<usize>=c.parents.iter().map(|(name,seq)|log.cg.agent_assignment.remote_to_local_version(RemoteVersion(name,*seq))).collect();parents.sort_unstable();
  if c.remove>0{let end=log.add_delete_at(agent,&parents,c.position..c.position+c.remove);parents=vec![end];}if !c.text.is_empty(){log.add_insert_at(agent,&parents,c.position,&c.text);}
 }}
 pub fn text(log:&ListOpLog)->Vec<u32>{visible(log)}
}
fn main(){
 let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let rounds:usize=std::env::var("INK_LIFECYCLE_ROUNDS").unwrap_or("11".into()).parse().unwrap();assert!(rounds>=2);let chunk:usize=std::env::var("INK_LIFECYCLE_CHUNK").unwrap_or("64".into()).parse().unwrap();assert!(chunk>0);
 for case in cases{
  let mut raw=case["changes"].as_array().unwrap().clone();for c in &mut raw{for key in ["id"]{if let Some(s)=c[key].as_str(){c[key]=json!(s.parse::<u64>().unwrap());}}for p in c["parents"].as_array_mut().unwrap(){if let Some(s)=p.as_str(){*p=json!(s.parse::<u64>().unwrap());}}}
  let changes:Vec<CHANGE_TYPE>=Wire::from_json(&json!(raw)).unwrap();let split=changes.len()/2;
  let upstream=native::prepare(&raw);
  CONTROL_INPUT
  let mut oracle=ListOpLog::new();native::apply(&mut oracle,&upstream);let want=native::text(&oracle);if let Some(expected)=case["expected"].as_array(){assert_eq!(want,expected.iter().map(|v|v.as_u64().unwrap()as u32).collect::<Vec<_>>());}
  let mut base=State::new();assert!(base.invoke_l_merge(changes[..split].to_vec()).unwrap().committed);let ink_bytes=base.checkpoint().unwrap();
  let mut dt=ListOpLog::new();native::apply(&mut dt,&upstream[..split]);let dt_bytes=dt.encode(&diamond_types::list::encoding::ENCODE_FULL);
  assert_eq!(base.invoke_l_visible().unwrap().result.unwrap(),native::text(&dt));
  let mut checked=State::restore(&ink_bytes).unwrap();assert!(checked.invoke_l_merge(changes[split..].to_vec()).unwrap().committed);assert_eq!(checked.invoke_l_visible().unwrap().result.unwrap(),want);
  let mut restored=ListCRDT::load_from(&dt_bytes).unwrap();native::apply(&mut restored.oplog,&upstream[split..]);restored.branch.merge(&restored.oplog,restored.oplog.cg.version.as_ref());assert_eq!(restored.branch.content().to_string().chars().map(|c|c as u32).collect::<Vec<_>>(),want);
  CONTROL_SETUP
  let names=VARIANT_NAMES;let mut merge=vec![vec![];names.len()];let mut save=merge.clone();let mut load=merge.clone();
  for round in 0..rounds+2{for offset in 0..names.len(){let variant=(round+offset)%names.len();
   if variant==0{
    let mut state=State::restore(&ink_bytes).unwrap();let inputs:Vec<_>=changes[split..].chunks(chunk).map(|c|c.to_vec()).collect();let mut committed=true;let start=Instant::now();for input in inputs{let result=state.invoke_l_merge(black_box(input)).unwrap();committed=committed&&result.committed;drop(black_box(result));}let ns=start.elapsed().as_nanos()as u64;assert!(committed);if round>=2{merge[0].push(ns);}
    assert_eq!(state.invoke_l_visible().unwrap().result.unwrap(),want);
    let start=Instant::now();drop(black_box(base.checkpoint().unwrap()));let ns=start.elapsed().as_nanos()as u64;if round>=2{save[0].push(ns);}
    let start=Instant::now();let loaded=State::restore(black_box(&ink_bytes)).unwrap();let ns=start.elapsed().as_nanos()as u64;if round>=2{load[0].push(ns);}drop(black_box(loaded));
   }else if variant==1{
    let mut document=ListCRDT::load_from(&dt_bytes).unwrap();let start=Instant::now();for input in upstream[split..].chunks(chunk){native::apply(&mut document.oplog,black_box(input));document.branch.merge(&document.oplog,document.oplog.cg.version.as_ref());}let ns=start.elapsed().as_nanos()as u64;if round>=2{merge[1].push(ns);}assert_eq!(document.branch.content().to_string().chars().map(|c|c as u32).collect::<Vec<_>>(),want);
    let start=Instant::now();drop(black_box(dt.encode(&diamond_types::list::encoding::ENCODE_FULL)));let ns=start.elapsed().as_nanos()as u64;if round>=2{save[1].push(ns);}
    let start=Instant::now();let loaded=ListCRDT::load_from(black_box(&dt_bytes)).unwrap();let ns=start.elapsed().as_nanos()as u64;if round>=2{load[1].push(ns);}drop(black_box(loaded));
   }else{CONTROL_MEASURE}
  }}
  for variant in 0..names.len(){println!("{}",json!({"case":case["name"],"variant":names[variant],"retained_batches":split,"merged_batches":changes.len()-split,"merge_chunk":chunk,"output_codepoints":want.len(),"merge_samples_ns":merge[variant],"save_samples_ns":save[variant],"load_samples_ns":load[variant],"checkpoint_bytes":CHECKPOINT_BYTES,"scope":"Merge imports causal batches and maintains document projection; text checkout validated outside timing for both; load restores retained history; DT also restores visible branch; save includes byte destruction; input clones excluded"}));}
 }
}
