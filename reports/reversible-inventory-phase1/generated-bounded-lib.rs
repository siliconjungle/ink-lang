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

mod portable {
//! Shared, representation-independent snapshot codec. This module also ships
//! verbatim in generated applications; it has no AST/evaluator dependency.
use num_bigint::{BigInt, Sign};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;

#[derive(Clone, Debug)]
pub enum Schema {
    Unit,
    Bool,
    U32,
    U64,
    Int,
    String,
    Id,
    Record(Vec<(String, Schema)>),
    Enum(Vec<String>),
    List(Box<Schema>),
    Option(Box<Schema>),
    Result(Box<Schema>, Box<Schema>),
}
#[derive(Clone, Debug)]
pub struct Layout {
    pub program: [u8; 32],
    pub schema: [u8; 32],
    pub roots: Vec<(String, Schema, Schema)>,
    pub events: Vec<(String, Schema)>,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    pub commit: u64,
    pub position: u64,
    pub channel: usize,
    pub value: Value,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Logical {
    pub version: u64,
    pub tables: Vec<Vec<(Value, Value)>>,
    pub outbox: Vec<Event>,
}
#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub bytes: usize,
    pub values: usize,
    pub depth: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            bytes: 64 * 1024 * 1024,
            values: 1_000_000,
            depth: 128,
        }
    }
}
const MAGIC: &[u8; 8] = b"VLSTATE\0";
const HEADER: usize = 8 + 2 + 2 + 32 + 32 + 8;
type R<T> = Result<T, String>;
fn u64_bytes(out: &mut Vec<u8>, v: u64) {
    out.extend_from_slice(&v.to_le_bytes());
}
fn count(out: &mut Vec<u8>, n: usize) {
    u64_bytes(out, n as u64);
}
fn raw(out: &mut Vec<u8>, b: &[u8]) {
    count(out, b.len());
    out.extend_from_slice(b);
}
fn tag<'a>(v: &'a Value, name: &str) -> R<&'a Value> {
    let o = v.as_object().ok_or("expected tagged object")?;
    if o.len() != 1 {
        return Err("expected exactly one tag".into());
    }
    o.get(name).ok_or("unexpected value tag".into())
}
fn integer(v: &Value) -> R<BigInt> {
    let s = tag(v, "Int")?.as_str().ok_or("expected Int string")?;
    let n = s.parse::<BigInt>().map_err(|_| "invalid Int")?;
    if n.to_string() != s {
        return Err("noncanonical Int".into());
    }
    Ok(n)
}
fn identifier(v: &Value) -> R<u128> {
    let s = v.as_str().ok_or("expected ID")?;
    if s.len() != 32
        || !s
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("noncanonical ID".into());
    }
    u128::from_str_radix(s, 16).map_err(|e| e.to_string())
}
fn compare(t: &Schema, a: &Value, b: &Value) -> R<Ordering> {
    Ok(match t {
        Schema::U32 | Schema::U64 => a
            .as_u64()
            .ok_or("invalid key")?
            .cmp(&b.as_u64().ok_or("invalid key")?),
        Schema::String => a
            .as_str()
            .ok_or("invalid key")?
            .as_bytes()
            .cmp(b.as_str().ok_or("invalid key")?.as_bytes()),
        Schema::Id => identifier(a)?.cmp(&identifier(b)?),
        _ => return Err("unsupported snapshot key schema".into()),
    })
}
fn tick(left: &mut usize, depth: usize, limits: Limits) -> R<()> {
    if *left == 0 || depth > limits.depth {
        return Err("snapshot value/depth limit exceeded".into());
    }
    *left -= 1;
    Ok(())
}
fn encode_value(
    t: &Schema,
    v: &Value,
    out: &mut Vec<u8>,
    left: &mut usize,
    depth: usize,
    limits: Limits,
) -> R<()> {
    tick(left, depth, limits)?;
    match t {
        Schema::Unit => {
            if !v.is_null() {
                return Err("expected Unit".into());
            }
        }
        Schema::Bool => out.push(v.as_bool().ok_or("expected Bool")? as u8),
        Schema::U32 => out.extend_from_slice(
            &u32::try_from(v.as_u64().ok_or("expected u32")?)
                .map_err(|_| "u32 overflow")?
                .to_le_bytes(),
        ),
        Schema::U64 => u64_bytes(out, v.as_u64().ok_or("expected u64")?),
        Schema::Int => {
            let n = integer(v)?;
            let (sign, b) = n.to_bytes_le();
            out.push(match sign {
                Sign::NoSign => 0,
                Sign::Plus => 1,
                Sign::Minus => 2,
            });
            if sign == Sign::NoSign {
                raw(out, &[])
            } else {
                raw(out, &b)
            }
        }
        Schema::String => raw(out, v.as_str().ok_or("expected String")?.as_bytes()),
        Schema::Id => out.extend_from_slice(&identifier(v)?.to_le_bytes()),
        Schema::Enum(names) => {
            let s = v.as_str().ok_or("expected enum string")?;
            let index = names
                .iter()
                .position(|n| n == s)
                .ok_or("unknown enum variant")?;
            out.extend_from_slice(&(index as u32).to_le_bytes());
        }
        Schema::Record(fields) => {
            let obj = v.as_object().ok_or("expected record")?;
            if obj.len() != fields.len() {
                return Err("record field mismatch".into());
            }
            for (n, t) in fields {
                encode_value(
                    t,
                    obj.get(n).ok_or("missing record field")?,
                    out,
                    left,
                    depth + 1,
                    limits,
                )?;
            }
        }
        Schema::List(inner) => {
            let xs = v.as_array().ok_or("expected List")?;
            if xs.len() > *left {
                return Err("snapshot value limit exceeded".into());
            }
            count(out, xs.len());
            for x in xs {
                encode_value(inner, x, out, left, depth + 1, limits)?;
            }
        }
        Schema::Option(inner) => {
            if let Ok(x) = tag(v, "Some") {
                out.push(1);
                encode_value(inner, x, out, left, depth + 1, limits)?;
            } else {
                if !tag(v, "None")?.is_null() {
                    return Err("invalid None".into());
                }
                out.push(0);
            }
        }
        Schema::Result(a, b) => {
            if let Ok(x) = tag(v, "Ok") {
                out.push(0);
                encode_value(a, x, out, left, depth + 1, limits)?;
            } else {
                out.push(1);
                encode_value(b, tag(v, "Err")?, out, left, depth + 1, limits)?;
            }
        }
    }
    if out.len() > limits.bytes {
        return Err("snapshot byte limit exceeded".into());
    }
    Ok(())
}
struct Reader<'a> {
    bytes: &'a [u8],
    at: usize,
    left: usize,
    limits: Limits,
}
impl<'a> Reader<'a> {
    fn take(&mut self, n: usize) -> R<&'a [u8]> {
        let end = self.at.checked_add(n).ok_or("snapshot length overflow")?;
        let b = self.bytes.get(self.at..end).ok_or("truncated snapshot")?;
        self.at = end;
        Ok(b)
    }
    fn byte(&mut self) -> R<u8> {
        Ok(self.take(1)?[0])
    }
    fn u32(&mut self) -> R<u32> {
        Ok(u32::from_le_bytes(self.take(4)?.try_into().unwrap()))
    }
    fn u64(&mut self) -> R<u64> {
        Ok(u64::from_le_bytes(self.take(8)?.try_into().unwrap()))
    }
    fn len(&mut self) -> R<usize> {
        usize::try_from(self.u64()?).map_err(|_| "snapshot length not addressable".into())
    }
    fn sequence(&mut self) -> R<usize> {
        let n = self.len()?;
        if n > self.left {
            return Err("snapshot value limit exceeded".into());
        }
        Ok(n)
    }
    fn raw(&mut self) -> R<&'a [u8]> {
        let n = self.len()?;
        self.take(n)
    }
    fn value(&mut self, t: &Schema, depth: usize) -> R<Value> {
        tick(&mut self.left, depth, self.limits)?;
        Ok(match t {
            Schema::Unit => Value::Null,
            Schema::Bool => match self.byte()? {
                0 => json!(false),
                1 => json!(true),
                _ => return Err("invalid Bool tag".into()),
            },
            Schema::U32 => json!(self.u32()?),
            Schema::U64 => json!(self.u64()?),
            Schema::Int => {
                let sign = self.byte()?;
                let bytes = self.raw()?;
                let sign = match sign {
                    0 if bytes.is_empty() => Sign::NoSign,
                    1 if !bytes.is_empty() && bytes.last() != Some(&0) => Sign::Plus,
                    2 if !bytes.is_empty() && bytes.last() != Some(&0) => Sign::Minus,
                    _ => return Err("noncanonical signed integer".into()),
                };
                json!({"Int":BigInt::from_bytes_le(sign,bytes).to_string()})
            }
            Schema::String => json!(std::str::from_utf8(self.raw()?).map_err(|_| "invalid UTF-8")?),
            Schema::Id => json!(format!(
                "{:032x}",
                u128::from_le_bytes(self.take(16)?.try_into().unwrap())
            )),
            Schema::Enum(names) => {
                json!(names.get(self.u32()? as usize).ok_or("invalid enum tag")?)
            }
            Schema::Record(fields) => {
                let mut obj = serde_json::Map::new();
                for (n, t) in fields {
                    obj.insert(n.clone(), self.value(t, depth + 1)?);
                }
                Value::Object(obj)
            }
            Schema::List(t) => {
                let n = self.sequence()?;
                let mut xs = Vec::new();
                for _ in 0..n {
                    xs.push(self.value(t, depth + 1)?);
                }
                Value::Array(xs)
            }
            Schema::Option(t) => match self.byte()? {
                0 => json!({"None":null}),
                1 => json!({"Some":self.value(t,depth+1)?}),
                _ => return Err("invalid Option tag".into()),
            },
            Schema::Result(a, b) => match self.byte()? {
                0 => json!({"Ok":self.value(a,depth+1)?}),
                1 => json!({"Err":self.value(b,depth+1)?}),
                _ => return Err("invalid Result tag".into()),
            },
        })
    }
}
fn event_order(e: &Event, version: u64, prior: Option<(u64, u64)>) -> R<()> {
    if e.commit == 0 || e.commit > version || prior.is_some_and(|p| p >= (e.commit, e.position)) {
        return Err("invalid snapshot event sequence".into());
    }
    Ok(())
}
pub fn encode(layout: &Layout, s: &Logical, limits: Limits) -> R<Vec<u8>> {
    if s.tables.len() != layout.roots.len() {
        return Err("snapshot root count mismatch".into());
    }
    let mut out = Vec::new();
    let mut left = limits.values;
    u64_bytes(&mut out, s.version);
    for (rows, (_, kt, vt)) in s.tables.iter().zip(&layout.roots) {
        if rows.len() > left / 2 {
            return Err("snapshot row limit exceeded".into());
        }
        count(&mut out, rows.len());
        let mut prior = None;
        for (k, v) in rows {
            if let Some(p) = prior {
                if compare(kt, p, k)? != Ordering::Less {
                    return Err("snapshot keys must be strictly ordered".into());
                }
            }
            encode_value(kt, k, &mut out, &mut left, 0, limits)?;
            encode_value(vt, v, &mut out, &mut left, 0, limits)?;
            prior = Some(k);
        }
    }
    count(&mut out, s.outbox.len());
    let mut prior = None;
    for e in &s.outbox {
        event_order(e, s.version, prior)?;
        let (_, t) = layout
            .events
            .get(e.channel)
            .ok_or("unknown event channel")?;
        u64_bytes(&mut out, e.commit);
        u64_bytes(&mut out, e.position);
        out.extend_from_slice(&(e.channel as u32).to_le_bytes());
        encode_value(t, &e.value, &mut out, &mut left, 0, limits)?;
        prior = Some((e.commit, e.position));
    }
    if HEADER
        .checked_add(out.len())
        .and_then(|n| n.checked_add(32))
        .is_none_or(|n| n > limits.bytes)
    {
        return Err("snapshot byte limit exceeded".into());
    }
    let mut bytes = Vec::new();
    bytes.extend_from_slice(MAGIC);
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&layout.program);
    bytes.extend_from_slice(&layout.schema);
    count(&mut bytes, out.len());
    bytes.extend_from_slice(&out);
    let digest = Sha256::digest(&bytes);
    bytes.extend_from_slice(&digest);
    Ok(bytes)
}
pub fn decode(layout: &Layout, bytes: &[u8], limits: Limits) -> R<Logical> {
    if bytes.len() > limits.bytes || bytes.len() < HEADER + 32 {
        return Err("snapshot byte length invalid".into());
    }
    if &bytes[..8] != MAGIC || bytes[8..12] != [1, 0, 1, 0] {
        return Err("snapshot format or semantics version mismatch".into());
    }
    if bytes[12..44] != layout.program || bytes[44..76] != layout.schema {
        return Err("snapshot program or schema identity mismatch".into());
    }
    let n = usize::try_from(u64::from_le_bytes(bytes[76..84].try_into().unwrap()))
        .map_err(|_| "snapshot length not addressable")?;
    if HEADER.checked_add(n).and_then(|v| v.checked_add(32)) != Some(bytes.len()) {
        return Err("snapshot payload length mismatch".into());
    }
    let end = bytes.len() - 32;
    if Sha256::digest(&bytes[..end]).as_slice() != &bytes[end..] {
        return Err("snapshot integrity check failed".into());
    }
    let mut r = Reader {
        bytes: &bytes[HEADER..end],
        at: 0,
        left: limits.values,
        limits,
    };
    let version = r.u64()?;
    let mut tables = vec![];
    for (_, kt, vt) in &layout.roots {
        let n = r.sequence()?;
        if n > r.left / 2 {
            return Err("snapshot row limit exceeded".into());
        }
        let mut rows: Vec<(Value, Value)> = vec![];
        for _ in 0..n {
            let k = r.value(kt, 0)?;
            let v = r.value(vt, 0)?;
            if let Some((prior, _)) = rows.last() {
                if compare(kt, prior, &k)? != Ordering::Less {
                    return Err("duplicate or unordered snapshot key".into());
                }
            }
            rows.push((k, v));
        }
        tables.push(rows);
    }
    let n = r.sequence()?;
    let mut outbox = vec![];
    let mut prior = None;
    for _ in 0..n {
        let commit = r.u64()?;
        let position = r.u64()?;
        let channel = r.u32()? as usize;
        let (_, t) = layout
            .events
            .get(channel)
            .ok_or("unknown snapshot event channel")?;
        let value = r.value(t, 0)?;
        let e = Event {
            commit,
            position,
            channel,
            value,
        };
        event_order(&e, version, prior)?;
        prior = Some((commit, position));
        outbox.push(e);
    }
    if r.at != r.bytes.len() {
        return Err("trailing snapshot payload".into());
    }
    Ok(Logical {
        version,
        tables,
        outbox,
    })
}

}
pub use portable::Limits as SnapshotLimits;
fn snapshot_layout()->portable::Layout{portable::Layout{program:[137, 126, 180, 169, 24, 89, 13, 224, 99, 133, 60, 152, 64, 180, 225, 122, 0, 136, 112, 251, 227, 201, 194, 14, 156, 78, 130, 118, 115, 174, 80, 111],schema:[146, 230, 241, 219, 246, 208, 218, 169, 58, 192, 159, 210, 86, 162, 164, 215, 193, 246, 190, 116, 19, 97, 103, 151, 145, 249, 222, 92, 31, 203, 110, 137],roots:vec![
("Items".into(),portable::Schema::U64,portable::Schema::Record(vec![("stock".into(),portable::Schema::U32)])),
],events:vec![("updated".into(),portable::Schema::Record(vec![("key".into(),portable::Schema::U64),("before".into(),portable::Schema::U32),("after".into(),portable::Schema::U32)])),
]}}
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
pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}
pub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if !self.undo.is_empty()||!self.staged.is_empty(){return Err("checkpoint requires transaction boundary".into())}let layout=snapshot_layout();let tables=vec![self.l_Items.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect(),
];let outbox=self.outbox.iter().map(|e|{let(channel,value)=match e.data{EventData::l_updated(ref v)=>(0,v.to_json()),
};portable::Event{commit:e.commit,position:e.position,channel,value}}).collect();portable::encode(&layout,&portable::Logical{version:self.version,tables,outbox},limits)}
pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}
pub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let logical=portable::decode(&layout,bytes,limits)?;let mut state=Self::new();state.version=logical.version;let mut tables=logical.tables.into_iter();for(k,v)in tables.next().unwrap(){state.l_Items.insert(<u64 as Wire>::from_json(&k)?,<l_Row as Wire>::from_json(&v)?);}
state.outbox=logical.outbox.into_iter().map(|e|{let data=match e.channel{0=>EventData::l_updated(<l_Updated as Wire>::from_json(&e.value)?),
_=>return Err("unknown event channel".into())};Ok(Event{commit:e.commit,position:e.position,data})}).collect::<Result<Vec<_>,String>>()?;for row in state.l_Items.values(){state.cache_l_total_units=state.cache_l_total_units.checked_add(Self::contribution_l_total_units(row)).ok_or("restored aggregate violates range")?;}
Ok(state)}
fn contribution_l_total_units(row:&l_Row)->u128{row.l_stock as u128}
fn set_l_Items(&mut self,key:u64,value:Option<l_Row>)->Option<l_Row>{let old=match &value{Some(v)=>self.l_Items.insert(key.clone(),v.clone()),None=>self.l_Items.remove(&key)};
let undo_l_total_units=self.cache_l_total_units.clone();
let (next_l_total_units, saved_l_total_units)={let total=self.cache_l_total_units.clone();let old_part=old.as_ref().map(Self::contribution_l_total_units);let new_part=value.as_ref().map(Self::contribution_l_total_units);match (old_part,new_part){
(None,Some(new))=>{let l_total=total;let l_new=new;((l_total).wrapping_add(l_new),None::<(u8,BigInt)>) },
(Some(old),Some(new))=>{let l_total=total;let l_old=old;let l_new=new;((l_total).wrapping_add((l_new).wrapping_sub(l_old)),None::<(u8,BigInt)>) },
(Some(old),None)=>{let l_total=total;let l_old=old;((l_total).wrapping_sub(l_old),None::<(u8,BigInt)>) },
(None,None)=>(total,None)}};self.cache_l_total_units=next_l_total_units;
self.undo.push(Undo::l_Items{key:key.clone(),old:old.clone(),cache_l_total_units:undo_l_total_units});
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
