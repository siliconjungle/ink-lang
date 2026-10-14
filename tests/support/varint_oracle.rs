pub fn packed(bytes:&[u8])->Vec<u32>{
 let words:Vec<_>=bytes.chunks(4).map(|chunk|{let mut word=0u32;for(i,b)in chunk.iter().enumerate(){word|=u32::from(*b)<<(i*8);}word}).collect();
 let hash=words.iter().fold(14695981039346656037u64,|h,w|(h^u64::from(*w)).wrapping_mul(1099511628211));
 [vec![1229867830,bytes.len()as u32,hash as u32,(hash>>32)as u32],words].concat()
}
pub fn unsigned(bytes:&mut Vec<u8>,mut x:u64){loop{let low=(x&127)as u8;x>>=7;bytes.push(low|if x==0{0}else{128});if x==0{break}}}
#[allow(dead_code)]
pub fn document(changes:&[serde_json::Value])->Vec<u32>{
 let mut bytes=vec![];unsigned(&mut bytes,changes.len()as u64);let mut prior_id=0;let mut prior_position=0;
 for c in changes{let id=c["id"].as_u64().unwrap();let position=c["position"].as_u64().unwrap();let parents=c["parents"].as_array().unwrap();let text=c["text"].as_array().unwrap();
  for x in [id^prior_id,position^prior_position,c["remove"].as_u64().unwrap(),parents.len()as u64,text.len()as u64]{unsigned(&mut bytes,x);}
  for p in parents{unsigned(&mut bytes,p.as_u64().unwrap()^id);}for p in text{unsigned(&mut bytes,p.as_u64().unwrap());}prior_id=id;prior_position=position;
 }
 packed(&bytes)
}
