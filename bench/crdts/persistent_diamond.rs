use diamond_types::list::{ListOpLog,encoding::ENCODE_FULL};
use diamond_types::causalgraph::agent_assignment::remote_ids::RemoteVersion;
use serde_json::{json,Value};
use std::collections::BTreeMap;
fn word(value:&Value)->u64{value.as_u64().unwrap_or_else(||value.as_str().unwrap().parse().unwrap())}
fn append(log:&mut ListOpLog,changes:&[Value]){
 for c in changes{
  let id=word(&c["id"]);let actor=id>>32;
  let agent=log.get_or_create_agent_id(&format!("{actor:010}"));
  let mut parents:Vec<usize>=c["parents"].as_array().unwrap().iter().map(|p|{
   let id=word(p);let name=format!("{:010}",id>>32);
   log.cg.agent_assignment.remote_to_local_version(RemoteVersion(&name,((id&0xffffffff)-1)as usize))
  }).collect();parents.sort_unstable();
  let position=c["position"].as_u64().unwrap()as usize;let remove=c["remove"].as_u64().unwrap()as usize;
  if remove>0{let end=log.add_delete_at(agent,&parents,position..position+remove);parents=vec![end];}
  let text:String=c["text"].as_array().unwrap().iter().map(|v|char::from_u32(v.as_u64().unwrap()as u32).unwrap()).collect();
  if !text.is_empty(){log.add_insert_at(agent,&parents,position,&text);}
 }
}
fn visible(log:&ListOpLog)->Vec<u32>{log.checkout_tip().content().to_string().chars().map(|c|c as u32).collect()}
fn main(){
 let cases:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();
 let mut rows=vec![];
 for case in cases{
  let changes=case["changes"].as_array().unwrap();let expected:Vec<u32>=case["expected"].as_array().unwrap().iter().map(|x|x.as_u64().unwrap()as u32).collect();
  let splits:BTreeMap<usize,()>= [0,1,changes.len()/2,changes.len()].into_iter().map(|s|(s,())).collect();
  for(split,_)in splits{
   let mut log=ListOpLog::new();append(&mut log,&changes[..split]);let before=visible(&log);let bytes=log.encode(&ENCODE_FULL);
   let mut loaded=ListOpLog::load_from(&bytes).unwrap();assert_eq!(visible(&loaded),before);assert_eq!(loaded.len(),log.len());
   append(&mut loaded,&changes[split..]);assert_eq!(visible(&loaded),expected,"{} split {}",case["name"],split);
   let all=loaded.encode(&ENCODE_FULL);let count=loaded.len();loaded.decode_and_add(&all).unwrap();assert_eq!(loaded.len(),count);assert_eq!(visible(&loaded),expected);
   rows.push(json!({"case":case["name"],"split":split,"checkpoint_bytes":bytes.len(),"retained_operations":count,"output":expected}));
  }
 }
 println!("{}",json!({"status":"passed","rows":rows,"scope":"Native pinned Diamond Types full-log encode/load, future causal batches and duplicate full-log merge; exact supplied output equality, no timing claim"}));
}
