#![allow(non_camel_case_types,non_snake_case,unused_variables,unused_parens,dead_code)]
// Shared support for generated native applications. No parser or evaluator.
use num_bigint::BigInt;
use serde_json::{Value as Json, json};
use std::collections::BTreeMap;
pub trait Wire: Sized {
    fn to_json(&self) -> Json;
    fn from_json(v: &Json) -> Result<Self, String>;
}
macro_rules! unsigned_wire {
    ($t:ty) => { impl Wire for $t {
        fn to_json(&self) -> Json { json!(self) }
        fn from_json(v:&Json)->Result<Self,String> { v.as_u64().and_then(|n| n.try_into().ok()).ok_or("invalid unsigned integer".into()) }
    } };
}
unsigned_wire!(u32); unsigned_wire!(u64);
impl Wire for () {
    fn to_json(&self)->Json { Json::Null }
    fn from_json(v:&Json)->Result<Self,String>{ if v.is_null(){Ok(())}else{Err("expected Unit".into())} }
}
impl Wire for bool {
    fn to_json(&self)->Json{json!(self)}
    fn from_json(v:&Json)->Result<Self,String>{v.as_bool().ok_or("expected Bool".into())}
}
impl Wire for String {
    fn to_json(&self)->Json{json!(self)}
    fn from_json(v:&Json)->Result<Self,String>{v.as_str().map(str::to_owned).ok_or("expected String".into())}
}
impl Wire for BigInt {
    fn to_json(&self)->Json{json!({"Int":self.to_string()})}
    fn from_json(v:&Json)->Result<Self,String>{v.get("Int").and_then(Json::as_str).map(str::to_owned).unwrap_or_else(||v.to_string()).parse().map_err(|_|"expected Int".into())}
}
impl<T:Wire> Wire for Vec<T> {
    fn to_json(&self)->Json{self.iter().map(Wire::to_json).collect()}
    fn from_json(v:&Json)->Result<Self,String>{v.as_array().ok_or("expected List")?.iter().map(T::from_json).collect()}
}
impl<T:Wire> Wire for Option<T> {
    fn to_json(&self)->Json{match self{Some(v)=>json!({"Some":v.to_json()}),None=>json!({"None":null})}}
    fn from_json(v:&Json)->Result<Self,String>{
        let obj=v.as_object().ok_or("expected Option")?;
        if obj.len()!=1 {return Err("expected one tag".into())}
        if let Some(x)=obj.get("Some"){Ok(Some(T::from_json(x)?))}
        else if obj.get("None")==Some(&Json::Null){Ok(None)}else{Err("invalid Option".into())}
    }
}
impl<T:Wire,E:Wire> Wire for Result<T,E> {
    fn to_json(&self)->Json{match self{Ok(v)=>json!({"Ok":v.to_json()}),Err(e)=>json!({"Err":e.to_json()})}}
    fn from_json(v:&Json)->Result<Self,String>{
        let obj=v.as_object().ok_or("expected Result")?;
        if obj.len()!=1 {return Err("expected one tag".into())}
        if let Some(x)=obj.get("Ok"){Ok(Ok(T::from_json(x)?))}
        else if let Some(x)=obj.get("Err"){Ok(Err(E::from_json(x)?))}else{Err("invalid Result".into())}
    }
}
#[derive(Clone, Debug)]
pub struct Event {pub commit:u64,pub position:u64,pub data:EventData}
impl Event {
    pub fn to_json(&self)->Json {let (channel,value)=self.data.wire();json!({"commit":self.commit,"position":self.position,"channel":channel,"value":value})}
}
#[derive(Clone, Debug)]
pub struct Outcome<T> {pub result:T,pub committed:bool,pub version:u64,pub events:Vec<Event>}
impl<T:Wire> Outcome<T> {
    pub fn to_json(&self)->Json {json!({"result":self.result.to_json(),"committed":self.committed,"version":self.version,"events":self.events.iter().map(Event::to_json).collect::<Vec<_>>()})}
}
#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Row{pub l_stock:u32}
impl Wire for l_Row {fn to_json(&self)->Json{json!({
"stock":self.l_stock.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().ok_or("expected record")?;if obj.len()!=1{return Err("record field mismatch".into())}Ok(Self{
l_stock:<u32 as Wire>::from_json(obj.get("stock").ok_or("missing field")?)?,
})}}
#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Updated{pub l_key:u64,pub l_before:u32,pub l_after:u32}
impl Wire for l_Updated {fn to_json(&self)->Json{json!({
"key":self.l_key.to_json(),
"before":self.l_before.to_json(),
"after":self.l_after.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().ok_or("expected record")?;if obj.len()!=3{return Err("record field mismatch".into())}Ok(Self{
l_key:<u64 as Wire>::from_json(obj.get("key").ok_or("missing field")?)?,
l_before:<u32 as Wire>::from_json(obj.get("before").ok_or("missing field")?)?,
l_after:<u32 as Wire>::from_json(obj.get("after").ok_or("missing field")?)?,
})}}
#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum l_Error{l_Missing,l_Exists,l_Overflow}
impl Wire for l_Error{fn to_json(&self)->Json{match self{
Self::l_Missing=>json!("Error.Missing"),
Self::l_Exists=>json!("Error.Exists"),
Self::l_Overflow=>json!("Error.Overflow"),
}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){Some("Error.Missing")=>Ok(Self::l_Missing),
Some("Error.Exists")=>Ok(Self::l_Exists),
Some("Error.Overflow")=>Ok(Self::l_Overflow),
_=>Err("invalid enum".into())}}}
#[derive(Clone,Debug)] pub enum EventData {
l_updated(l_Updated),
}
impl EventData {fn wire(&self)->(&'static str,Json){match *self {
Self::l_updated(ref v)=>("updated",v.to_json()),
}}}
enum Undo {
l_Items {key:u64,old:Option<l_Row>,cache_l_total_units:u128},
}
pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,
l_Items:BTreeMap<u64,l_Row>,
cache_l_total_units:u128,
}
impl Default for State {fn default()->Self{Self::new()}}
impl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],
l_Items:BTreeMap::new(),
cache_l_total_units:u128::from(0u8),
}}
pub fn version(&self)->u64{self.version}
pub fn outbox(&self)->&[Event]{&self.outbox}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}
fn contribution_l_total_units(row:&l_Row)->u128{row.l_stock as u128}
fn set_l_Items(&mut self,key:u64,value:Option<l_Row>)->Option<l_Row>{let old=match &value{Some(v)=>self.l_Items.insert(key.clone(),v.clone()),None=>self.l_Items.remove(&key)};
self.undo.push(Undo::l_Items{key:key.clone(),old:old.clone(),cache_l_total_units:self.cache_l_total_units.clone()});
{let total=self.cache_l_total_units.clone();let old_part=old.as_ref().map(Self::contribution_l_total_units);let new_part=value.as_ref().map(Self::contribution_l_total_units);self.cache_l_total_units=match (old_part,new_part){
(None,Some(new))=>{let l_total=total;let l_new=new;(l_total).wrapping_add(l_new)},
(Some(old),Some(new))=>{let l_total=total;let l_old=old;let l_new=new;((l_total).wrapping_sub(l_old)).wrapping_add(l_new)},
(Some(old),None)=>{let l_total=total;let l_old=old;(l_total).wrapping_sub(l_old)},
(None,None)=>total};}
old}
fn rollback(&mut self){for undo in self.undo.drain(..).rev(){match undo{
Undo::l_Items{key,old,cache_l_total_units}=>{match old{Some(v)=>{self.l_Items.insert(key,v);},None=>{self.l_Items.remove(&key);}}self.cache_l_total_units=cache_l_total_units;},
}}self.staged.clear();}
fn keep_l_total_units(&mut self)->BigInt{BigInt::from(self.cache_l_total_units)}
fn action_l_create(&mut self,l_key:u64,l_stock:u32)->Result<(),l_Error>{if self.l_Items.contains_key(&(<u64 as Clone>::clone(&l_key))) {return Err(l_Error::l_Exists);
} else {}
let _={let key=<u64 as Clone>::clone(&l_key);let value=l_Row{l_stock:<u32 as Clone>::clone(&l_stock)};self.set_l_Items(key,Some(value));};
return Ok(());
}
pub fn invoke_l_create(&mut self,l_key:u64,l_stock:u32)->Result<Outcome<Result<(),l_Error>>,String>{let result=self.action_l_create(l_key,l_stock);
if result.is_err(){self.rollback();return Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err("commit sequence exhausted".into())};self.version=version;self.undo.clear();let events=self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}).collect::<Vec<_>>();self.outbox.extend(events.iter().cloned());Ok(Outcome{result,committed:true,version,events})}
fn action_l_restock(&mut self,l_key:u64,l_amount:u32)->Result<(),l_Error>{let l_row:l_Row=((self.l_Items.get(&(<u64 as Clone>::clone(&l_key))).cloned()).ok_or(l_Error::l_Missing))?;
let l_next:u32=(((l_row.l_stock.clone()).checked_add(<u32 as Clone>::clone(&l_amount)).ok_or(())).map_err(|l__|{l_Error::l_Overflow}))?;
let _={let key=<u64 as Clone>::clone(&l_key);let value=l_Row{l_stock:<u32 as Clone>::clone(&l_next)};self.set_l_Items(key,Some(value));};
{let value=l_Updated{l_key:<u64 as Clone>::clone(&l_key),l_before:l_row.l_stock.clone(),l_after:<u32 as Clone>::clone(&l_next)};self.staged.push(EventData::l_updated(value));}
return Ok(());
}
pub fn invoke_l_restock(&mut self,l_key:u64,l_amount:u32)->Result<Outcome<Result<(),l_Error>>,String>{let result=self.action_l_restock(l_key,l_amount);
if result.is_err(){self.rollback();return Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err("commit sequence exhausted".into())};self.version=version;self.undo.clear();let events=self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}).collect::<Vec<_>>();self.outbox.extend(events.iter().cloned());Ok(Outcome{result,committed:true,version,events})}
fn action_l_remove(&mut self,l_key:u64)->Result<(),l_Error>{let _={let key=<u64 as Clone>::clone(&l_key);self.set_l_Items(key,None)};
return Ok(());
}
pub fn invoke_l_remove(&mut self,l_key:u64)->Result<Outcome<Result<(),l_Error>>,String>{let result=self.action_l_remove(l_key);
if result.is_err(){self.rollback();return Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err("commit sequence exhausted".into())};self.version=version;self.undo.clear();let events=self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}).collect::<Vec<_>>();self.outbox.extend(events.iter().cloned());Ok(Outcome{result,committed:true,version,events})}
fn action_l_fail(&mut self,l_key:u64)->Result<(),l_Error>{let _=({let tmp_1:u64=<u64 as Clone>::clone(&l_key);let tmp_2:u32=7u32;match self.action_l_restock(tmp_1,tmp_2) {value @ Ok(_)=>value,Err(e)=>return Err(e)}})?;
let _=({let tmp_3:u64=<u64 as Clone>::clone(&l_key);let tmp_4:u32=9u32;match self.action_l_restock(tmp_3,tmp_4) {value @ Ok(_)=>value,Err(e)=>return Err(e)}})?;
return Err(l_Error::l_Overflow);
}
pub fn invoke_l_fail(&mut self,l_key:u64)->Result<Outcome<Result<(),l_Error>>,String>{let result=self.action_l_fail(l_key);
if result.is_err(){self.rollback();return Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err("commit sequence exhausted".into())};self.version=version;self.undo.clear();let events=self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}).collect::<Vec<_>>();self.outbox.extend(events.iter().cloned());Ok(Outcome{result,committed:true,version,events})}
pub fn query_words_l_total(&self)->(u64,u64){let v=self.cache_l_total_units;(v as u64,(v>>64) as u64)}
fn action_l_total(&mut self,)->BigInt{return self.keep_l_total_units();
}
pub fn invoke_l_total(&mut self,)->Result<Outcome<BigInt>,String>{let result=self.action_l_total();
Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}
fn action_l_stock_of(&mut self,l_key:u64)->Option<u32>{return (self.l_Items.get(&(<u64 as Clone>::clone(&l_key))).cloned()).map(|l_row|{l_row.l_stock.clone()});
}
pub fn invoke_l_stock_of(&mut self,l_key:u64)->Result<Outcome<Option<u32>>,String>{let result=self.action_l_stock_of(l_key);
Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().ok_or("expected argument array")?;match name{
"create"=>{if args.len()!=2{return Err("argument count mismatch".into())}let a0=<u64 as Wire>::from_json(&args[0])?;let a1=<u32 as Wire>::from_json(&args[1])?;Ok(self.invoke_l_create(a0,a1)?.to_json())},
"restock"=>{if args.len()!=2{return Err("argument count mismatch".into())}let a0=<u64 as Wire>::from_json(&args[0])?;let a1=<u32 as Wire>::from_json(&args[1])?;Ok(self.invoke_l_restock(a0,a1)?.to_json())},
"remove"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<u64 as Wire>::from_json(&args[0])?;Ok(self.invoke_l_remove(a0)?.to_json())},
"fail"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<u64 as Wire>::from_json(&args[0])?;Ok(self.invoke_l_fail(a0)?.to_json())},
"total"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_l_total()?.to_json())},
"stock_of"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<u64 as Wire>::from_json(&args[0])?;Ok(self.invoke_l_stock_of(a0)?.to_json())},
_=>Err("unknown action".into())}}}
// App-specific benchmark ABI. All program behaviour calls generated methods.
#[no_mangle] pub extern "C" fn st_new(rows:u64)->*mut State {
    let mut state=State::new();
    for key in 0..rows {assert!(state.invoke_l_create(key,(key%10) as u32).unwrap().result.is_ok());}
    Box::into_raw(Box::new(state))
}
#[no_mangle] pub unsafe extern "C" fn st_free(s:*mut State){drop(Box::from_raw(s));}
#[no_mangle] pub unsafe extern "C" fn st_apply(s:*mut State,op:u32,key:u64,value:u32)->u32{
    let s=&mut *s;
    let out=match op {0=>s.invoke_l_create(key,value),1=>s.invoke_l_restock(key,value),2=>s.invoke_l_remove(key),3=>s.invoke_l_fail(key),_=>std::process::abort()}.unwrap();
    match out.result {Ok(())=>0,Err(l_Error::l_Missing)=>1,Err(l_Error::l_Exists)=>2,Err(l_Error::l_Overflow)=>3}
}
#[no_mangle] pub unsafe extern "C" fn st_stock(s:*mut State,key:u64,found:*mut u32)->u32{
    match (&mut *s).invoke_l_stock_of(key).unwrap().result {Some(v)=>{*found=1;v},None=>{*found=0;0}}
}
#[no_mangle] pub unsafe extern "C" fn st_total(s:*mut State,lo:*mut u64,hi:*mut u64){
    #[cfg(feature="bounded-abi")] {let words=(*s).query_words_l_total();*lo=words.0;*hi=words.1;}
    #[cfg(not(feature="bounded-abi"))] {
    let total=(&mut *s).invoke_l_total().unwrap().result;
    let (sign,digits)=total.to_u64_digits();assert!(sign!=num_bigint::Sign::Minus && digits.len()<=2);
    *lo=digits.first().copied().unwrap_or(0);*hi=digits.get(1).copied().unwrap_or(0);
    }
}
#[no_mangle] pub unsafe extern "C" fn st_version(s:*mut State)->u64{(*s).version()}
#[no_mangle] pub unsafe extern "C" fn st_event_count(s:*mut State)->u64{(*s).outbox().len() as u64}
#[no_mangle] pub unsafe extern "C" fn st_event_hash(s:*mut State)->u64{
    let mut hash=0u64;
    for e in (*s).outbox(){let EventData::l_updated(v)=&e.data;
        for x in [e.commit,e.position,v.l_key,v.l_before as u64,v.l_after as u64]{hash=hash.wrapping_mul(1099511628211)^x;}
    }hash
}
