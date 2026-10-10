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
fn snapshot_layout()->portable::Layout{portable::Layout{program:[87, 50, 221, 179, 176, 245, 179, 211, 107, 189, 218, 53, 249, 78, 143, 116, 207, 119, 225, 43, 91, 213, 115, 228, 105, 44, 118, 77, 2, 18, 84, 188],schema:[98, 156, 164, 218, 112, 70, 162, 23, 241, 235, 166, 4, 86, 161, 12, 76, 65, 193, 172, 223, 202, 209, 143, 133, 37, 82, 36, 156, 39, 162, 231, 87],roots:vec![
("Rows".into(),portable::Schema::U32,portable::Schema::Record(vec![("value".into(),portable::Schema::U32)])),
],events:vec![("seen".into(),portable::Schema::U32),
]}}
#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Row{pub l_value:u32}
impl Wire for l_Row {fn to_json(&self)->Json{json!({
"value":self.l_value.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().ok_or("expected record")?;if obj.len()!=1{return Err("record field mismatch".into())}Ok(Self{
l_value:<u32 as Wire>::from_json(obj.get("value").ok_or("missing field")?)?,
})}}
#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum l_Error{l_Missing}
impl Wire for l_Error{fn to_json(&self)->Json{match self{
Self::l_Missing=>json!("Error.Missing"),
}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){Some("Error.Missing")=>Ok(Self::l_Missing),
_=>Err("invalid enum".into())}}}
#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum l_OtherError{l_Bad}
impl Wire for l_OtherError{fn to_json(&self)->Json{match self{
Self::l_Bad=>json!("OtherError.Bad"),
}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){Some("OtherError.Bad")=>Ok(Self::l_Bad),
_=>Err("invalid enum".into())}}}
#[derive(Clone,Debug)] pub enum EventData {
l_seen(u32),
}
impl EventData {fn wire(&self)->(&'static str,Json){match *self {
Self::l_seen(ref v)=>("seen",v.to_json()),
}}}
enum Undo {
l_Rows {key:u32,old:Option<l_Row>},
}
pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,
l_Rows:BTreeMap<u32,l_Row>,
}
impl Default for State {fn default()->Self{Self::new()}}
impl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],
l_Rows:BTreeMap::new(),
}}
pub fn version(&self)->u64{self.version}
pub fn outbox(&self)->&[Event]{&self.outbox}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}
pub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if !self.undo.is_empty()||!self.staged.is_empty(){return Err("checkpoint requires transaction boundary".into())}let layout=snapshot_layout();let tables=vec![self.l_Rows.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect(),
];let outbox=self.outbox.iter().map(|e|{let(channel,value)=match e.data{EventData::l_seen(ref v)=>(0,v.to_json()),
};portable::Event{commit:e.commit,position:e.position,channel,value}}).collect();portable::encode(&layout,&portable::Logical{version:self.version,tables,outbox},limits)}
pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}
pub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let logical=portable::decode(&layout,bytes,limits)?;let mut state=Self::new();state.version=logical.version;let mut tables=logical.tables.into_iter();for(k,v)in tables.next().unwrap(){state.l_Rows.insert(<u32 as Wire>::from_json(&k)?,<l_Row as Wire>::from_json(&v)?);}
state.outbox=logical.outbox.into_iter().map(|e|{let data=match e.channel{0=>EventData::l_seen(<u32 as Wire>::from_json(&e.value)?),
_=>return Err("unknown event channel".into())};Ok(Event{commit:e.commit,position:e.position,data})}).collect::<Result<Vec<_>,String>>()?;Ok(state)}
fn set_l_Rows(&mut self,key:u32,value:Option<l_Row>,return_old:bool)->Option<l_Row>{
let old=match value{Some(v)=>self.l_Rows.insert(key.clone(),v),None=>self.l_Rows.remove(&key)};
let result=if return_old{old.clone()}else{None};self.undo.push(Undo::l_Rows{key,old});
result}
fn rollback(&mut self){for undo in self.undo.drain(..).rev(){match undo{
Undo::l_Rows{key,old}=>{match old{Some(v)=>{self.l_Rows.insert(key,v);},None=>{self.l_Rows.remove(&key);}}},
}}self.staged.clear();}
fn keep_l_failed(&mut self)->Result<(),l_OtherError>{(Err(l_OtherError::l_Bad))?}
fn action_l_ordinary(&mut self,)->Result<(),l_OtherError>{return Err(l_OtherError::l_Bad);
}
pub fn invoke_view_l_ordinary(&mut self,)->Result<OutcomeView<'_,Result<(),l_OtherError>>,String>{let result=self.action_l_ordinary();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_ordinary(&mut self,)->Result<Outcome<Result<(),l_OtherError>>,String>{self.invoke_view_l_ordinary().map(OutcomeView::into_owned)}
fn action_l_raising(&mut self,)->Result<(),l_OtherError>{return (Err(l_OtherError::l_Bad))?;
}
pub fn invoke_view_l_raising(&mut self,)->Result<OutcomeView<'_,Result<(),l_OtherError>>,String>{let result=self.action_l_raising();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_raising(&mut self,)->Result<Outcome<Result<(),l_OtherError>>,String>{self.invoke_view_l_raising().map(OutcomeView::into_owned)}
fn action_l_ignored(&mut self,)->Result<(),l_Error>{let _:Option<l_Row>={let key=0u32;self.set_l_Rows(key,None,false)};
let _:Result<(),l_OtherError>={self.action_l_raising()};
{let value=1u32;self.staged.push(EventData::l_seen(value));}
return Ok(());
}
pub fn invoke_view_l_ignored(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_ignored();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_ignored(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_ignored().map(OutcomeView::into_owned)}
fn action_l_captured(&mut self,)->Result<(),l_Error>{let l_result:Result<(),l_OtherError>={self.action_l_raising()};
return Ok(());
}
pub fn invoke_view_l_captured(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_captured();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_captured(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_captured().map(OutcomeView::into_owned)}
fn action_l_propagated(&mut self,)->Result<(),l_OtherError>{let _:Option<l_Row>={let key=0u32;self.set_l_Rows(key,None,false)};
{let value=2u32;self.staged.push(EventData::l_seen(value));}
let _:()=({self.action_l_raising()})?;
return Ok(());
}
pub fn invoke_view_l_propagated(&mut self,)->Result<OutcomeView<'_,Result<(),l_OtherError>>,String>{let result=self.action_l_propagated();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_propagated(&mut self,)->Result<Outcome<Result<(),l_OtherError>>,String>{self.invoke_view_l_propagated().map(OutcomeView::into_owned)}
fn action_l_keep_value(&mut self,)->Result<(),l_Error>{let _:Result<(),l_OtherError>=self.keep_l_failed();
return Ok(());
}
pub fn invoke_view_l_keep_value(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_keep_value();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_keep_value(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_keep_value().map(OutcomeView::into_owned)}
fn action_l_keep_propagated(&mut self,)->Result<(),l_OtherError>{let _:()=(self.keep_l_failed())?;
return Ok(());
}
pub fn invoke_view_l_keep_propagated(&mut self,)->Result<OutcomeView<'_,Result<(),l_OtherError>>,String>{let result=self.action_l_keep_propagated();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_keep_propagated(&mut self,)->Result<Outcome<Result<(),l_OtherError>>,String>{self.invoke_view_l_keep_propagated().map(OutcomeView::into_owned)}
fn action_l_callback(&mut self,)->Vec<Result<(),l_OtherError>>{return (self.l_Rows.values().cloned().collect::<Vec<_>>()).into_iter().map(|l_row|{{self.action_l_raising()}}).collect::<Vec<_>>();
}
pub fn invoke_view_l_callback(&mut self,)->Result<OutcomeView<'_,Vec<Result<(),l_OtherError>>>,String>{let result=self.action_l_callback();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_callback(&mut self,)->Result<Outcome<Vec<Result<(),l_OtherError>>>,String>{self.invoke_view_l_callback().map(OutcomeView::into_owned)}
fn action_l_create(&mut self,)->Result<(),l_Error>{if self.l_Rows.contains_key(&(0u32)) {return Err(l_Error::l_Missing);
} else {}
let _:()={let key=0u32;let value=l_Row{l_value:7u32};self.set_l_Rows(key,Some(value),false);};
return Ok(());
}
pub fn invoke_view_l_create(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_create();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_create(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_create().map(OutcomeView::into_owned)}
fn action_l_read(&mut self,)->Option<l_Row>{return self.l_Rows.get(&(0u32)).cloned();
}
pub fn invoke_view_l_read(&mut self,)->Result<OutcomeView<'_,Option<l_Row>>,String>{let result=self.action_l_read();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_read(&mut self,)->Result<Outcome<Option<l_Row>>,String>{self.invoke_view_l_read().map(OutcomeView::into_owned)}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().ok_or("expected argument array")?;match name{
"ordinary"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_ordinary()?.to_json())},
"raising"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_raising()?.to_json())},
"ignored"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_ignored()?.to_json())},
"captured"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_captured()?.to_json())},
"propagated"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_propagated()?.to_json())},
"keep_value"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_keep_value()?.to_json())},
"keep_propagated"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_keep_propagated()?.to_json())},
"callback"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_callback()?.to_json())},
"create"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_create()?.to_json())},
"read"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_read()?.to_json())},
_=>Err("unknown action".into())}}}
// Appended verbatim to generated applications. This is a host ABI, not an optimiser.
#[cfg(target_arch = "wasm32")]
mod state_wasm {
    use super::*;
    use std::cell::RefCell;
    const MAX_BUFFER: usize = 64 * 1024 * 1024;
    const MAX_TOTAL: usize = 128 * 1024 * 1024;
    const MAX_JSON: usize = 4 * 1024 * 1024;
    const MAX_BUFFERS: usize = 256;
    const MAX_STATES: usize = 128;
    struct Registry {
        next: u32,
        states: BTreeMap<u32, State>,
        buffers: BTreeMap<u32, Vec<u8>>,
        bytes: usize,
        error: String,
    }
    impl Registry {
        fn new() -> Self {
            Self {
                next: 0,
                states: BTreeMap::new(),
                buffers: BTreeMap::new(),
                bytes: 0,
                error: String::new(),
            }
        }
        fn id(&mut self) -> Result<u32, String> {
            self.next = self
                .next
                .checked_add(1)
                .ok_or("ABI handle sequence exhausted")?;
            Ok(self.next)
        }
        fn fail(&mut self, error: impl Into<String>) -> u32 {
            self.error = error.into();
            0
        }
        fn insert_buffer(&mut self, bytes: Vec<u8>) -> Result<u32, String> {
            if bytes.len() > MAX_BUFFER
                || self.buffers.len() >= MAX_BUFFERS
                || self
                    .bytes
                    .checked_add(bytes.len())
                    .is_none_or(|n| n > MAX_TOTAL)
            {
                return Err("ABI buffer limit".into());
            }
            let id = self.id()?;
            self.bytes += bytes.len();
            self.buffers.insert(id, bytes);
            Ok(id)
        }
        fn reserve_output(&mut self) -> Result<u32, String> {
            // Reserve an output slot and enough accounting space before a change.
            if self
                .bytes
                .checked_add(MAX_BUFFER)
                .is_none_or(|n| n > MAX_TOTAL)
            {
                return Err("ABI output capacity unavailable".into());
            }
            self.insert_buffer(Vec::new())
        }
        fn finish(&mut self, id: u32, bytes: Vec<u8>) -> u32 {
            self.bytes += bytes.len();
            *self.buffers.get_mut(&id).expect("reserved output slot") = bytes;
            id
        }
        fn envelope(&mut self, id: u32, result: Result<Json, String>, committed: bool) -> u32 {
            let payload = match result {
                Ok(value) => serde_json::json!({"ok":value}),
                Err(message) => {
                    serde_json::json!({"error":{"message":message,"committed":committed}})
                }
            };
            let mut bytes = serde_json::to_vec(&payload).expect("JSON value serialization");
            if bytes.len() > MAX_BUFFER {
                bytes=serde_json::to_vec(&serde_json::json!({"error":{"message":"ABI response exceeds 64 MiB","committed":committed}})).expect("JSON error serialization");
            }
            self.finish(id, bytes)
        }
    }
    thread_local! {static REGISTRY:RefCell<Registry>=RefCell::new(Registry::new());}
    #[no_mangle]
    pub extern "C" fn lang_abi_version() -> u32 {
        1
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_alloc(length: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let length = length as usize;
            if length > MAX_BUFFER
                || r.buffers.len() >= MAX_BUFFERS
                || r.bytes.checked_add(length).is_none_or(|n| n > MAX_TOTAL)
            {
                return r.fail("ABI buffer limit");
            }
            match r.insert_buffer(vec![0; length]) {
                Ok(id) => id,
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_ptr(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.get(&handle) {
                Some(bytes) => bytes.as_ptr() as u32,
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_len(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.get(&handle) {
                Some(bytes) => bytes.len() as u32,
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_buffer_free(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.buffers.remove(&handle) {
                Some(bytes) => {
                    r.bytes -= bytes.len();
                    1
                }
                None => r.fail("unknown buffer handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_error() -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let bytes = r.error.as_bytes().to_vec();
            match r.insert_buffer(bytes) {
                Ok(id) => id,
                Err(_) => 0,
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_init() -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.len() >= MAX_STATES {
                return r.fail("ABI state handle limit");
            }
            match r.id() {
                Ok(id) => {
                    r.states.insert(id, State::new());
                    id
                }
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_state_drop(handle: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.remove(&handle).is_some() {
                1
            } else {
                r.fail("unknown state handle")
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_restore(buffer: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            if r.states.len() >= MAX_STATES {
                return r.fail("ABI state handle limit");
            }
            let id = match r.id() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let Some(bytes) = r.buffers.get(&buffer) else {
                return r.fail("unknown buffer handle");
            };
            match State::restore(bytes) {
                Ok(state) => {
                    r.states.insert(id, state);
                    id
                }
                Err(e) => r.fail(e),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_checkpoint(state: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = r
                .states
                .get(&state)
                .ok_or_else(|| "unknown state handle".to_string())
                .and_then(|s| s.checkpoint());
            match result {
                Ok(bytes) => r.finish(id, bytes),
                Err(e) => {
                    r.buffers.remove(&id);
                    r.fail(e)
                }
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_invoke(state: u32, request: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = (|| -> Result<Json, String> {
                let bytes = r.buffers.get(&request).ok_or("unknown buffer handle")?;
                if bytes.len() > MAX_JSON {
                    return Err("ABI request exceeds 4 MiB".into());
                }
                let message: Json = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
                let name = message
                    .get("call")
                    .and_then(Json::as_str)
                    .ok_or("request needs call")?;
                let args = message.get("args").ok_or("request needs args")?;
                r.states
                    .get_mut(&state)
                    .ok_or("unknown state handle")?
                    .invoke_json(name, args)
            })();
            let committed = result
                .as_ref()
                .ok()
                .and_then(|v| v.get("committed"))
                .and_then(Json::as_bool)
                .unwrap_or(false);
            r.envelope(id, result, committed)
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_events(state: u32) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            let id = match r.reserve_output() {
                Ok(id) => id,
                Err(e) => return r.fail(e),
            };
            let result = r
                .states
                .get(&state)
                .ok_or_else(|| "unknown state handle".into())
                .map(|s| Json::Array(s.outbox().iter().map(Event::to_json).collect()));
            r.envelope(id, result, false)
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_acknowledge(state: u32, commit: u64, position: u64) -> u32 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.states.get_mut(&state) {
                Some(s) => {
                    s.acknowledge_through(commit, position);
                    1
                }
                None => r.fail("unknown state handle"),
            }
        })
    }
    #[no_mangle]
    pub extern "C" fn lang_version(state: u32) -> u64 {
        REGISTRY.with(|r| {
            let mut r = r.borrow_mut();
            match r.states.get(&state) {
                Some(s) => s.version(),
                None => {
                    r.fail("unknown state handle");
                    0
                }
            }
        })
    }
}
