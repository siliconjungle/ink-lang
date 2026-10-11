#![allow(non_camel_case_types,non_snake_case,unused_variables,unused_parens,dead_code)]
pub const INK_ABI_CONTRACT:&str="{\"abi\":\"ink-values-v1\",\"actions\":[{\"name\":\"put\",\"params\":[{\"name\":\"key\",\"type\":{\"kind\":\"u64\"}},{\"name\":\"value\",\"type\":{\"kind\":\"u64\"}},{\"name\":\"active\",\"type\":{\"kind\":\"bool\"}},{\"name\":\"fail\",\"type\":{\"kind\":\"bool\"}}],\"result\":{\"error\":{\"kind\":\"enum\",\"name\":\"Error\",\"variants\":[\"Error.Failed\"]},\"kind\":\"result\",\"ok\":{\"kind\":\"unit\"}}},{\"name\":\"erase\",\"params\":[{\"name\":\"key\",\"type\":{\"kind\":\"u64\"}},{\"name\":\"fail\",\"type\":{\"kind\":\"bool\"}}],\"result\":{\"error\":{\"kind\":\"enum\",\"name\":\"Error\",\"variants\":[\"Error.Failed\"]},\"kind\":\"result\",\"ok\":{\"kind\":\"unit\"}}},{\"name\":\"total_query\",\"params\":[],\"result\":{\"kind\":\"u64\"}},{\"name\":\"count_query\",\"params\":[],\"result\":{\"kind\":\"u64\"}}],\"functions\":[]}";
pub const INK_VALUE_ABI:&str="ink-values-v1";
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
// The borrow prevents further mutation of State while these event references
// exist. Keeping an outcome independently still uses the existing owned API.
#[derive(Debug)]
pub struct OutcomeView<'a,T> {pub result:T,pub committed:bool,pub version:u64,pub events:&'a [Event]}
impl<T> OutcomeView<'_,T> {
    pub fn into_owned(self)->Outcome<T>{Outcome{result:self.result,committed:self.committed,version:self.version,events:self.events.to_vec()}}
}
impl<T:Wire> OutcomeView<'_,T> {
    pub fn to_json(&self)->Json {json!({"result":self.result.to_json(),"committed":self.committed,"version":self.version,"events":self.events.iter().map(Event::to_json).collect::<Vec<_>>()})}
}

impl Wire for i32 {
 fn to_json(&self)->Json{json!(self)}
 fn from_json(v:&Json)->Result<Self,String>{v.as_i64().and_then(|n|n.try_into().ok()).ok_or("invalid i32".into())}
}
impl Wire for f32 {
 fn to_json(&self)->Json{if self.is_finite(){json!(self)}else{json!({"F32Bits":self.to_bits()})}}
 fn from_json(v:&Json)->Result<Self,String>{
  if let Some(n)=v.as_f64(){let f=n as f32;if f.is_finite(){return Ok(f)}return Err("f32 overflow".into())}
  if let Some(o)=v.as_object(){if o.len()==1{if let Some(b)=o.get("F32Bits").and_then(Json::as_u64).and_then(|n|u32::try_from(n).ok()){return Ok(Self::from_bits(b))}}}
  Err("expected finite f32 or F32Bits".into())
 }
}
impl<T:Wire,const N:usize> Wire for [T;N] {
 fn to_json(&self)->Json{self.iter().map(Wire::to_json).collect()}
 fn from_json(v:&Json)->Result<Self,String>{let a=v.as_array().ok_or("expected vector")?;if a.len()!=N{return Err("vector dimension mismatch".into())}a.iter().map(T::from_json).collect::<Result<Vec<_>,_>>()?.try_into().map_err(|_|"vector dimension mismatch".into())}
}

#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum InkArithmeticError {Overflow}
impl Wire for InkArithmeticError {
 fn to_json(&self)->Json{json!("ArithmeticError.Overflow")}
 fn from_json(v:&Json)->Result<Self,String>{if v.as_str()==Some("ArithmeticError.Overflow"){Ok(Self::Overflow)}else{Err("invalid arithmetic error".into())}}
}

impl<T:Wire> Wire for Box<T> { fn to_json(&self)->Json { (**self).to_json() } fn from_json(v:&Json)->Result<Self,String> { Ok(Box::new(T::from_json(v)?)) } }

// Structural stored-data identity is separate from scalar IEEE equality.
trait InkDataEq { fn ink_data_eq(&self,other:&Self)->bool; }
macro_rules! data_eq {($($t:ty),*)=>{$(impl InkDataEq for $t{fn ink_data_eq(&self,other:&Self)->bool{self==other}})*};}
data_eq!((),bool,u32,u64,i32,BigInt,String,InkArithmeticError);
impl InkDataEq for f32{fn ink_data_eq(&self,other:&Self)->bool{self.to_bits()==other.to_bits()}}
impl<T:InkDataEq> InkDataEq for Box<T>{fn ink_data_eq(&self,other:&Self)->bool{(**self).ink_data_eq(&**other)}}
impl<T:InkDataEq> InkDataEq for Vec<T>{fn ink_data_eq(&self,other:&Self)->bool{self.len()==other.len()&&self.iter().zip(other).all(|(a,b)|a.ink_data_eq(b))}}
impl<T:InkDataEq,const N:usize> InkDataEq for [T;N]{fn ink_data_eq(&self,other:&Self)->bool{self.iter().zip(other).all(|(a,b)|a.ink_data_eq(b))}}
impl<T:InkDataEq> InkDataEq for Option<T>{fn ink_data_eq(&self,other:&Self)->bool{match(self,other){(Some(a),Some(b))=>a.ink_data_eq(b),(None,None)=>true,_=>false}}}
impl<T:InkDataEq,E:InkDataEq> InkDataEq for Result<T,E>{fn ink_data_eq(&self,other:&Self)->bool{match(self,other){(Ok(a),Ok(b))=>a.ink_data_eq(b),(Err(a),Err(b))=>a.ink_data_eq(b),_=>false}}}

mod temporary {
// Native ownership is represented directly. Checked source moves the owner;
// read methods and stopping predicates borrow it. No interior aliasing.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OwnedBuffer<T>(Vec<T>);
impl<T: Clone> OwnedBuffer<T> {
    pub fn new(xs: Vec<T>) -> Self {
        Self(xs)
    }
    pub fn map_inplace(mut self,mut f:impl FnMut(T)->T)->Self {for x in &mut self.0{*x=f(x.clone());}self}
    pub fn map_indexed_inplace(mut self,mut f:impl FnMut(u32,T)->T)->Self {for(i,x)in self.0.iter_mut().enumerate(){*x=f(i as u32,x.clone());}self}
    pub fn filter_inplace(mut self,mut f:impl FnMut(T)->bool)->Self {self.0.retain(|x|f(x.clone()));self}
    pub fn scan_inplace(mut self,mut acc:T,mut add:impl FnMut(T,T)->T)->Self {for x in &mut self.0{acc=add(acc,x.clone());*x=acc.clone();}self}
    pub fn len(&self) -> u32 {
        self.0.len().try_into().expect("buffer exceeds u32")
    }
    pub fn get(&self, i: u32) -> Option<T> {
        self.0.get(i as usize).cloned()
    }
    pub fn set(mut self, i: u32, value: T) -> Self {
        if let Some(v) = self.0.get_mut(i as usize) {
            *v = value;
        }
        self
    }
    pub fn swap(mut self, a: u32, b: u32) -> Self {
        if (a as usize) < self.0.len() && (b as usize) < self.0.len() {
            self.0.swap(a as usize, b as usize);
        }
        self
    }
    pub fn push(mut self, value: T) -> Self {
        assert!(self.len() < u32::MAX, "buffer length exhausted");
        self.0.push(value);
        self
    }
    pub fn pop(mut self) -> Self {
        self.0.pop();
        self
    }
    pub fn truncate(mut self, n: u32) -> Self {
        self.0.truncate(n as usize);
        self
    }
    pub fn split(mut self, at: u32) -> (Self, Self) {
        let right = self.0.split_off((at as usize).min(self.0.len()));
        (self, Self(right))
    }
    pub fn append(mut self, mut other: Self) -> Self {
        self.0.append(&mut other.0);
        self
    }
    pub fn freeze(self) -> Vec<T> {
        self.0
    }
}
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct OwnedMap<K: Ord, V>(std::collections::BTreeMap<K, V>);
impl<K: Ord + Clone, V: Clone> OwnedMap<K, V> {
    pub fn new() -> Self {
        Self(std::collections::BTreeMap::new())
    }
    pub fn len(&self) -> u32 {
        self.0.len().try_into().expect("map exceeds u32")
    }
    pub fn get(&self, k: &K) -> Option<V> {
        self.0.get(k).cloned()
    }
    pub fn contains(&self, k: &K) -> bool {
        self.0.contains_key(k)
    }
    pub fn set(mut self, k: K, v: V) -> Self {
        self.0.insert(k, v);
        self
    }
    pub fn remove(mut self, k: &K) -> Self {
        self.0.remove(k);
        self
    }
    pub fn keys(&self) -> Vec<K> {
        self.0.keys().cloned().collect()
    }
    pub fn values(&self) -> Vec<V> {
        self.0.values().cloned().collect()
    }
}

// Bounded fork/join execution. Each worker owns a disjoint mutable slice;
// joining retains source order. Nested parallel requests execute sequentially.
std::thread_local! {static INK_PARALLEL_DEPTH:std::cell::Cell<u32>=const{std::cell::Cell::new(0)};}
struct InkParallelGuard(u32);
impl InkParallelGuard {
    fn enter() -> Self {
        Self(INK_PARALLEL_DEPTH.with(|d| {
            let old = d.get();
            d.set(old + 1);
            old
        }))
    }
}
impl Drop for InkParallelGuard {
    fn drop(&mut self) {
        INK_PARALLEL_DEPTH.with(|d| d.set(self.0));
    }
}
fn ink_parallel_workers(len: usize, grain: u32) -> usize {
    if cfg!(target_arch = "wasm32") {
        return 1;
    }
    if INK_PARALLEL_DEPTH.with(|d| d.get() > 0) {
        return 1;
    }
    let available = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(1);
    let requested = std::env::var("INK_THREADS")
        .ok()
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(available)
        .clamp(1, 32);
    requested.min(len / (grain.max(1) as usize)).max(1)
}
pub fn ink_parallel_map<T: Clone + Sync, U: Send, F: Fn(u32, T) -> U + Sync>(
    xs: Vec<T>,
    grain: u32,
    f: F,
) -> Vec<U> {
    let workers = ink_parallel_workers(xs.len(), grain);
    let _guard = InkParallelGuard::enter();
    if workers == 1 {
        return xs
            .into_iter()
            .enumerate()
            .map(|(i, x)| f(i as u32, x))
            .collect();
    }
    let chunk = (xs.len() + workers - 1) / workers;
    ink_parallel_start_receipt();
    std::thread::scope(|scope| {
        let handles = xs
            .chunks(chunk)
            .enumerate()
            .map(|(part, slice)| {
                let f = &f;
                scope.spawn(move || {
                    let _guard = InkParallelGuard::enter();
                    ink_parallel_record_thread();
                    slice
                        .iter()
                        .cloned()
                        .enumerate()
                        .map(|(i, x)| f((part * chunk + i) as u32, x))
                        .collect::<Vec<U>>()
                })
            })
            .collect::<Vec<_>>();
        let mut output = Vec::with_capacity(xs.len());
        for handle in handles {
            output.extend(handle.join().expect("parallel worker failed"));
        }
        output
    })
}
pub fn ink_parallel_update<T: Clone + Send, F: Fn(u32, T) -> T + Sync>(
    mut xs: Vec<T>,
    grain: u32,
    f: F,
) -> Vec<T> {
    let workers = ink_parallel_workers(xs.len(), grain);
    let _guard = InkParallelGuard::enter();
    if workers == 1 {
        for (i, x) in xs.iter_mut().enumerate() {
            *x = f(i as u32, x.clone());
        }
        return xs;
    }
    let chunk = (xs.len() + workers - 1) / workers;
    ink_parallel_start_receipt();
    std::thread::scope(|scope| {
        for (part, slice) in xs.chunks_mut(chunk).enumerate() {
            let f = &f;
            scope.spawn(move || {
                let _guard = InkParallelGuard::enter();
                ink_parallel_record_thread();
                for (i, x) in slice.iter_mut().enumerate() {
                    *x = f((part * chunk + i) as u32, x.clone());
                }
            });
        }
    });
    xs
}

pub fn ink_parallel_nested()->bool{INK_PARALLEL_DEPTH.with(|d|d.get()>0)}
pub fn with_parallel_worker<T>(f:impl FnOnce()->T)->T{let _guard=InkParallelGuard::enter();f()}

// Diagnostic receipt counts actual entered OS threads, never planned jobs.
static INK_PARALLEL_RECEIPT: std::sync::LazyLock<std::sync::Mutex<(u64,std::collections::BTreeSet<String>,std::collections::BTreeSet<String>)>> = std::sync::LazyLock::new(||std::sync::Mutex::new((0,std::collections::BTreeSet::new(),std::collections::BTreeSet::new())));
fn ink_parallel_start_receipt(){INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock").2.clear();}
fn ink_parallel_record_thread(){let mut r=INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock");r.0+=1;let id=format!("{:?}",std::thread::current().id());r.1.insert(id.clone());r.2.insert(id);}
pub fn ink_parallel_statistics()->(u64,Vec<String>,Vec<String>){let r=INK_PARALLEL_RECEIPT.lock().expect("parallel receipt lock");(r.0,r.1.iter().cloned().collect(),r.2.iter().cloned().collect())}

#[inline(never)]
pub fn ink_f32(value:f32)->f32{if value.is_nan(){f32::from_bits(0x7fc00000)}else{value}}

}
use temporary::{OwnedBuffer,OwnedMap,ink_parallel_map,ink_parallel_update};

impl<T:Clone> Wire for OwnedBuffer<T>{fn from_json(_: &Json)->Result<Self,String>{Err("temporary storage is internal to a pure invocation".into())}fn to_json(&self)->Json{Json::Null}}
impl<K:Ord+Clone,V:Clone> Wire for OwnedMap<K,V>{fn from_json(_: &Json)->Result<Self,String>{Err("temporary storage is internal to a pure invocation".into())}fn to_json(&self)->Json{Json::Null}}
impl<T:Clone> InkDataEq for OwnedBuffer<T>{fn ink_data_eq(&self,_:&Self)->bool{panic!("temporary storage has no value equality")}}
impl<K:Ord+Clone,V:Clone> InkDataEq for OwnedMap<K,V>{fn ink_data_eq(&self,_:&Self)->bool{panic!("temporary storage has no value equality")}}

mod transaction {
//! Fixed transaction primitives, shared verbatim with generated execution.
//! These describe the base protocol; they select no optimisation or layout.

pub const SEMANTICS: &str = "ink-change-boundary-v1";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Decision {
    Rollback,
    Commit { version: u64 },
    Exhausted,
}

/// A domain error wins over commit exhaustion. The body has already run;
/// both Rollback and Exhausted require restoration of its tentative effects.
#[inline]
pub fn decide(version: u64, succeeded: bool) -> Decision {
    if !succeeded {
        Decision::Rollback
    } else if let Some(version) = version.checked_add(1) {
        Decision::Commit { version }
    } else {
        Decision::Exhausted
    }
}

/// A nested change's error cannot be captured or ignored by its caller.
/// The outer Err exits the caller; the inner Result is its ordinary value.
#[inline]
pub fn nested_change<T, E>(result: Result<T, E>) -> Result<Result<T, E>, E> {
    match result {
        value @ Ok(_) => Ok(value),
        Err(error) => Err(error),
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct Publication<T> {
    pub commit: u64,
    pub position: u64,
    pub value: T,
}

/// Preserve staged order and number the committed suffix from zero, regardless
/// of earlier outbox contents. Publication neither clones nor reorders payloads.
pub fn publish<T>(
    version: u64,
    staged: impl Iterator<Item = T>,
) -> impl Iterator<Item = Publication<T>> {
    staged
        .enumerate()
        .map(move |(position, value)| Publication {
            commit: version,
            position: position as u64,
            value,
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_errors_precede_exhaustion_and_success_never_wraps() {
        for version in [0, 1, 1 << 63, u64::MAX - 1, u64::MAX] {
            assert_eq!(decide(version, false), Decision::Rollback);
            assert_eq!(
                decide(version, true),
                match version.checked_add(1) {
                    Some(version) => Decision::Commit { version },
                    None => Decision::Exhausted,
                }
            );
        }
    }

    #[test]
    fn nested_result_and_ordered_publication_move_payloads() {
        struct Owned(&'static str);
        assert!(nested_change::<Owned, _>(Err(Owned("error"))).is_err());
        let value = nested_change::<_, Owned>(Ok(Owned("value")))
            .ok()
            .unwrap()
            .ok()
            .unwrap();
        let events: Vec<_> = publish(u64::MAX, [value, Owned("second")].into_iter()).collect();
        assert_eq!(events[0].commit, u64::MAX);
        assert_eq!(events[0].position, 0);
        assert_eq!(events[0].value.0, "value");
        assert_eq!(events[1].position, 1);
        assert_eq!(events[1].value.0, "second");
        assert_eq!(publish::<Owned>(2, std::iter::empty()).count(), 0);
    }
}

}

mod portable {
//! Shared, representation-independent snapshot codec. This module also ships
//! verbatim in generated applications; it has no AST/evaluator dependency.
use num_bigint::{BigInt, Sign};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Schema {
    Unit,
    Bool,
    U32,
    U64,
    I32,
    F32,
    Vector(Box<Schema>, u8),
    Int,
    String,
    Id,
    Record(Vec<(String, Schema)>),
    Enum(Vec<String>),
    List(Box<Schema>),
    Option(Box<Schema>),
    Result(Box<Schema>, Box<Schema>),
}
#[derive(Clone, Debug, PartialEq, Eq)]
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
/// Magnitude bound for one exact integer. Decimal conversion is superlinear,
/// so without it a single large Int in a snapshot takes minutes to hours.
pub const MAX_INT_BYTES: usize = 4096;
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
    // Every Int within the bound has fewer than 2.41 decimal digits per byte.
    if s.len() > MAX_INT_BYTES * 5 / 2 + 1 {
        return Err("snapshot Int exceeds size limit".into());
    }
    let n = s.parse::<BigInt>().map_err(|_| "invalid Int")?;
    if n.bits() > 8 * MAX_INT_BYTES as u64 {
        return Err("snapshot Int exceeds size limit".into());
    }
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
        Schema::I32 => a
            .as_i64()
            .and_then(|n| i32::try_from(n).ok())
            .ok_or("invalid i32 key")?
            .cmp(
                &b.as_i64()
                    .and_then(|n| i32::try_from(n).ok())
                    .ok_or("invalid i32 key")?,
            ),
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
        Schema::I32 => out.extend_from_slice(
            &i32::try_from(v.as_i64().ok_or("expected i32")?)
                .map_err(|_| "i32 overflow")?
                .to_le_bytes(),
        ),
        Schema::F32 => {
            let bits = if let Some(b) = v.get("F32Bits") {
                if v.as_object().is_none_or(|o| o.len() != 1) {
                    return Err("expected only F32Bits field".into());
                }
                u32::try_from(b.as_u64().ok_or("expected f32 bits")?)
                    .map_err(|_| "f32 bits overflow")?
            } else {
                let f = v.as_f64().ok_or("expected f32")? as f32;
                if !f.is_finite() {
                    return Err("finite f32 or F32Bits required".into());
                }
                f.to_bits()
            };
            out.extend_from_slice(&bits.to_le_bytes());
        }
        Schema::Vector(inner, n) => {
            if !(2..=4).contains(n)
                || !matches!(inner.as_ref(), Schema::U32 | Schema::I32 | Schema::F32)
            {
                return Err("invalid vector schema".into());
            }
            let xs = v.as_array().ok_or("expected vector")?;
            if xs.len() != *n as usize {
                return Err("vector dimension mismatch".into());
            }
            for x in xs {
                encode_value(inner, x, out, left, depth + 1, limits)?;
            }
        }
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
            Schema::I32 => json!(self.u32()? as i32),
            Schema::F32 => {
                let bits = self.u32()?;
                let f = f32::from_bits(bits);
                if f.is_finite() {
                    json!(f)
                } else {
                    json!({"F32Bits":bits})
                }
            }
            Schema::Vector(inner, n) => {
                if !(2..=4).contains(n)
                    || !matches!(inner.as_ref(), Schema::U32 | Schema::I32 | Schema::F32)
                {
                    return Err("invalid vector schema".into());
                }
                (0..*n)
                    .map(|_| self.value(inner, depth + 1))
                    .collect::<R<Vec<_>>>()?
                    .into()
            }
            Schema::Int => {
                let sign = self.byte()?;
                let bytes = self.raw()?;
                if bytes.len() > MAX_INT_BYTES {
                    return Err("snapshot Int exceeds size limit".into());
                }
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
fn snapshot_layout()->portable::Layout{portable::Layout{program:[52, 20, 97, 227, 197, 216, 139, 58, 45, 98, 73, 196, 205, 50, 83, 26, 202, 227, 210, 13, 109, 164, 33, 109, 207, 238, 49, 79, 213, 123, 165, 218],schema:[217, 47, 159, 252, 204, 85, 237, 70, 76, 82, 248, 36, 231, 99, 128, 206, 40, 43, 134, 247, 81, 235, 124, 169, 208, 7, 125, 5, 136, 138, 247, 164],roots:vec![
("Rows".into(),portable::Schema::U64,portable::Schema::Record(vec![("value".into(),portable::Schema::U64),("active".into(),portable::Schema::Bool)])),
],events:vec![("seen".into(),portable::Schema::U64),
]}}
#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Row{pub l_value:u64,pub l_active:bool}
impl Wire for l_Row {fn to_json(&self)->Json{json!({
"value":self.l_value.to_json(),
"active":self.l_active.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().unwrap();Ok(Self{
l_value:<u64 as Wire>::from_json(obj.get("value").unwrap())?,
l_active:<bool as Wire>::from_json(obj.get("active").unwrap())?,
})}}
#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum l_Error{l_Failed}
impl Wire for l_Error{fn to_json(&self)->Json{match self{
Self::l_Failed=>json!("Error.Failed"),
}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){Some("Error.Failed")=>Ok(Self::l_Failed),
_=>unreachable!("caller enum precondition")}}}
impl InkDataEq for l_Error {fn ink_data_eq(&self,other:&Self)->bool{self==other}}
impl InkDataEq for l_Row {fn ink_data_eq(&self,other:&Self)->bool{self.l_value.ink_data_eq(&other.l_value)&&self.l_active.ink_data_eq(&other.l_active)}}
#[derive(Clone,Debug)] pub enum EventData {
l_seen(u64),
}
impl EventData {fn wire(&self)->(&'static str,Json){match *self {
Self::l_seen(ref v)=>("seen",v.to_json()),
}}}
enum Undo {
l_Rows {key:u64,old:Option<l_Row>},
}
struct HostTransaction {version:u64,removed:Vec<Event>}
pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,host:Option<HostTransaction>,
l_Rows:BTreeMap<u64,l_Row>,
}
impl Default for State {fn default()->Self{Self::new()}}
impl State {pub fn parallel_statistics()->Json{let(n,ids,last)=temporary::ink_parallel_statistics();json!({"workers":n,"workerIds":ids,"lastWorkerIds":last})} pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],host:None,
l_Rows:BTreeMap::new(),
}}
pub fn begin_transaction(&mut self)->Result<bool,String>{if self.host.is_some()||!self.undo.is_empty()||!self.staged.is_empty(){return Err("transaction already in progress".into())}self.host=Some(HostTransaction{version:self.version,removed:vec![]});Ok(true)}
 pub fn commit_transaction(&mut self){self.host=None;self.undo.clear();}
 pub fn rollback_transaction(&mut self){if let Some(host)=self.host.take(){self.rollback();self.version=host.version;self.outbox.retain(|e|e.commit<=host.version);let mut restored=host.removed;restored.append(&mut self.outbox);self.outbox=restored;}}
pub fn version(&self)->u64{self.version}
pub fn outbox(&self)->&[Event]{&self.outbox}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){let old=std::mem::take(&mut self.outbox);for e in old{if(e.commit,e.position)>(commit,position){self.outbox.push(e)}else if let Some(host)=&mut self.host{host.removed.push(e)}}}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}
pub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if (self.host.is_none()&&!self.undo.is_empty())||!self.staged.is_empty(){return Err("checkpoint requires transaction boundary".into())}let layout=snapshot_layout();let tables=vec![self.l_Rows.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect(),
];let outbox=self.outbox.iter().map(|e|{let(channel,value)=match e.data{EventData::l_seen(ref v)=>(0,v.to_json()),
};portable::Event{commit:e.commit,position:e.position,channel,value}}).collect();portable::encode(&layout,&portable::Logical{version:self.version,tables,outbox},limits)}
pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}
pub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let logical=portable::decode(&layout,bytes,limits)?;let mut state=Self::new();state.version=logical.version;let mut tables=logical.tables.into_iter();for(k,v)in tables.next().unwrap(){state.l_Rows.insert(<u64 as Wire>::from_json(&k)?,<l_Row as Wire>::from_json(&v)?);}
state.outbox=logical.outbox.into_iter().map(|e|{let data=match e.channel{0=>EventData::l_seen(<u64 as Wire>::from_json(&e.value)?),
_=>return Err("unknown event channel".into())};Ok(Event{commit:e.commit,position:e.position,data})}).collect::<Result<Vec<_>,String>>()?;Ok(state)}
fn set_l_Rows(&mut self,key:u64,value:Option<l_Row>,return_old:bool)->Option<l_Row>{
let old=match value{Some(v)=>self.l_Rows.insert(key.clone(),v),None=>self.l_Rows.remove(&key)};
let result=if return_old{old.clone()}else{None};self.undo.push(Undo::l_Rows{key,old});
result}
fn rollback(&mut self){for undo in self.undo.drain(..).rev(){match undo{
Undo::l_Rows{key,old}=>{match old{Some(v)=>{self.l_Rows.insert(key,v);},None=>{self.l_Rows.remove(&key);}}},
}}self.staged.clear();}
fn keep_l_total(&mut self)->u64{((self.l_Rows.values().filter(|l_row|{l_row.l_active.clone()}).cloned().collect::<Vec<_>>()).into_iter().map(|l_row|{l_row.l_value.clone()}).collect::<Vec<_>>()).into_iter().fold(0u64,|a,b|a.wrapping_add(b))}
fn keep_l_size(&mut self)->u64{((self.l_Rows.values().filter(|l_row|{l_row.l_active.clone()}).cloned().collect::<Vec<_>>()).into_iter().map(|l_row|{((l_row.l_value.clone()).wrapping_mul(0u64)).wrapping_add(1u64)}).collect::<Vec<_>>()).into_iter().fold(0u64,|a,b|a.wrapping_add(b))}
#[cfg(target_arch="wasm32")] pub fn parallel_worker(&self,task:&Json)->Result<Json,String>{let start=task["start"].as_u64().and_then(|x|u32::try_from(x).ok()).ok_or("parallel start")?;let items=task["items"].as_array().ok_or("parallel items")?;let captures=task["captures"].as_array().ok_or("parallel captures")?;temporary::with_parallel_worker(||match task["callback"].as_str().ok_or("parallel callback")?{
_=>Err("unknown compiled parallel callback".into()),})}
fn action_l_put(&mut self,l_key:u64,l_value:u64,l_active:bool,l_fail:bool)->Result<(),l_Error>{if self.l_Rows.contains_key(&(l_key)) {let _:()={let key=<u64 as Clone>::clone(&l_key);let value=l_Row{l_value:<u64 as Clone>::clone(&l_value),l_active:<bool as Clone>::clone(&l_active)};self.set_l_Rows(key,Some(value),false);};
} else {let _:()={let key=l_key;let value=l_Row{l_value:<u64 as Clone>::clone(&l_value),l_active:l_active};self.set_l_Rows(key,Some(value),false);};
}
{let value=l_value;self.staged.push(EventData::l_seen(value));}
if l_fail {return Err(l_Error::l_Failed);
} else {}
return Ok(());
}
pub fn invoke_view_l_put(&mut self,l_key:u64,l_value:u64,l_active:bool,l_fail:bool)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_put(l_key,l_value,l_active,l_fail);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;if self.host.is_none(){self.undo.clear();}let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_put(&mut self,l_key:u64,l_value:u64,l_active:bool,l_fail:bool)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_put(l_key,l_value,l_active,l_fail).map(OutcomeView::into_owned)}
fn action_l_erase(&mut self,l_key:u64,l_fail:bool)->Result<(),l_Error>{let _:Option<l_Row>={let key=<u64 as Clone>::clone(&l_key);self.set_l_Rows(key,None,false)};
{let value=l_key;self.staged.push(EventData::l_seen(value));}
if l_fail {return Err(l_Error::l_Failed);
} else {}
return Ok(());
}
pub fn invoke_view_l_erase(&mut self,l_key:u64,l_fail:bool)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_erase(l_key,l_fail);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;if self.host.is_none(){self.undo.clear();}let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_erase(&mut self,l_key:u64,l_fail:bool)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_erase(l_key,l_fail).map(OutcomeView::into_owned)}
fn action_l_total_query(&mut self,)->u64{return self.keep_l_total();
}
pub fn invoke_view_l_total_query(&mut self,)->Result<OutcomeView<'_,u64>,String>{let result=self.action_l_total_query();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_total_query(&mut self,)->Result<Outcome<u64>,String>{self.invoke_view_l_total_query().map(OutcomeView::into_owned)}
fn action_l_count_query(&mut self,)->u64{return self.keep_l_size();
}
pub fn invoke_view_l_count_query(&mut self,)->Result<OutcomeView<'_,u64>,String>{let result=self.action_l_count_query();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_count_query(&mut self,)->Result<Outcome<u64>,String>{self.invoke_view_l_count_query().map(OutcomeView::into_owned)}
pub fn call_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().unwrap();match name{
_=>Err("unknown function".into())}}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().unwrap();match name{
"put"=>{let a0=<u64 as Wire>::from_json(&args[0])?;let a1=<u64 as Wire>::from_json(&args[1])?;let a2=<bool as Wire>::from_json(&args[2])?;let a3=<bool as Wire>::from_json(&args[3])?;Ok(self.invoke_view_l_put(a0,a1,a2,a3)?.to_json())},
"erase"=>{let a0=<u64 as Wire>::from_json(&args[0])?;let a1=<bool as Wire>::from_json(&args[1])?;Ok(self.invoke_view_l_erase(a0,a1)?.to_json())},
"total_query"=>{Ok(self.invoke_view_l_total_query()?.to_json())},
"count_query"=>{Ok(self.invoke_view_l_count_query()?.to_json())},
_=>Err("unknown action".into())}}}
#[cfg(not(target_arch = "wasm32"))]
pub mod durable;
#[cfg(not(target_arch = "wasm32"))]
impl durable::CompiledState for State {
    fn create() -> Self {
        Self::new()
    }
    fn restore(bytes: &[u8]) -> Result<Self, String> {
        Self::restore(bytes)
    }
    fn checkpoint(&self) -> Result<Vec<u8>, String> {
        self.checkpoint()
    }
    fn invoke(
        &mut self,
        call: &str,
        args: &serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        self.invoke_json(call, args)
    }
    fn pure(&mut self, call: &str, args: &serde_json::Value) -> Result<serde_json::Value, String> {
        self.call_json(call, args)
    }
    fn events(&self) -> Vec<serde_json::Value> {
        self.outbox().iter().map(Event::to_json).collect()
    }
    fn acknowledge(&mut self, commit: u64, position: u64) {
        self.acknowledge_through(commit, position)
    }
    fn begin_transaction(&mut self) -> Result<bool, String> { self.begin_transaction() }
    fn commit_transaction(&mut self) { self.commit_transaction() }
    fn rollback_transaction(&mut self) { self.rollback_transaction() }
    fn version(&self) -> u64 {
        self.version()
    }
}
#[cfg(not(target_arch = "wasm32"))]
pub type DurableState = durable::Host<State, durable::FileStore>;
