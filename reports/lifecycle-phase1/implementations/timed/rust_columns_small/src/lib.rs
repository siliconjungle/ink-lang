mod ordered_storage; use ordered_storage::OrderedStorage;
#[cfg(feature="bigint")] use num_bigint::BigInt;
#[cfg(feature="bigint")] type Total=BigInt;
#[cfg(not(feature="bigint"))] type Total=u128;
struct Event {commit:u64,position:u64,key:u64,before:u32,after:u32}
pub struct State {rows:OrderedStorage<u64,u32>,events:Vec<Event>,version:u64,total:Total}
#[no_mangle] pub extern "C" fn st_new(n:u64)->*mut State {
 let mut s=State{rows:OrderedStorage::columns(Some(256)),events:vec![],version:n,total:Total::from(0u32)};
 for i in 0..n{s.rows.insert(i,(i%10) as u32);s.total+=Total::from((i%10) as u32);}
 Box::into_raw(Box::new(s))
}
#[no_mangle] pub unsafe extern "C" fn st_free(s:*mut State){drop(Box::from_raw(s));}
#[no_mangle] pub unsafe extern "C" fn st_apply(s:*mut State,op:u32,key:u64,value:u32)->u32{
 let s=&mut *s;
 if op==3{return if s.rows.contains_key(&key){3}else{1}}
 match op {
  0=>{if s.rows.contains_key(&key){return 2}s.rows.insert(key,value);s.total+=Total::from(value);},
  1=>{let Some(old)=s.rows.get_mut(&key)else{return 1};let Some(next)=old.checked_add(value)else{return 3};s.events.push(Event{commit:s.version+1,position:0,key,before:*old,after:next});*old=next;s.total+=Total::from(value);},
  2=>{if let Some(old)=s.rows.remove(&key){s.total-=Total::from(old);}},
  _=>std::process::abort()
 }s.version+=1;0
}
#[no_mangle] pub unsafe extern "C" fn st_stock(s:*mut State,key:u64,found:*mut u32)->u32{match (*s).rows.get(&key){Some(v)=>{*found=1;*v},None=>{*found=0;0}}}
#[no_mangle] pub unsafe extern "C" fn st_total(s:*mut State,lo:*mut u64,hi:*mut u64){
 #[cfg(feature="bigint")] {let(sign,digits)=(*s).total.to_u64_digits();assert!(sign!=num_bigint::Sign::Minus&&digits.len()<=2);*lo=digits.first().copied().unwrap_or(0);*hi=digits.get(1).copied().unwrap_or(0);}
 #[cfg(not(feature="bigint"))] {*lo=(*s).total as u64;*hi=((*s).total>>64) as u64;}
}
#[no_mangle] pub unsafe extern "C" fn st_version(s:*mut State)->u64{(*s).version}
#[no_mangle] pub unsafe extern "C" fn st_event_count(s:*mut State)->u64{(*s).events.len() as u64}
#[no_mangle] pub unsafe extern "C" fn st_event_hash(s:*mut State)->u64{let mut hash=0u64;for e in &(*s).events{for x in [e.commit,e.position,e.key,e.before as u64,e.after as u64]{hash=hash.wrapping_mul(1099511628211)^x;}}hash}
