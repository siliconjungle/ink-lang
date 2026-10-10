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
fn snapshot_layout()->portable::Layout{portable::Layout{program:[115, 100, 157, 248, 72, 150, 189, 168, 120, 193, 212, 118, 82, 136, 41, 243, 232, 136, 162, 198, 194, 249, 39, 129, 105, 18, 231, 175, 9, 139, 216, 113],schema:[44, 5, 106, 205, 174, 217, 106, 70, 254, 216, 174, 89, 57, 100, 208, 238, 53, 111, 122, 110, 55, 100, 28, 166, 18, 21, 182, 22, 116, 27, 60, 38],roots:vec![
("Items".into(),portable::Schema::Id,portable::Schema::Record(vec![("name".into(),portable::Schema::String),("stock".into(),portable::Schema::U32)])),
],events:vec![("marker".into(),portable::Schema::U32),
("stock_changed".into(),portable::Schema::Record(vec![("item".into(),portable::Schema::Id),("before".into(),portable::Schema::U32),("after".into(),portable::Schema::U32)])),
]}}

#[derive(Clone,Copy,Debug,PartialEq,Eq,PartialOrd,Ord)] pub struct l_ItemId(pub u128);
impl Wire for l_ItemId {
 fn to_json(&self)->Json{json!(format!("{:032x}",self.0))}
 fn from_json(v:&Json)->Result<Self,String>{let s=v.as_str().ok_or("expected ID")?;if s.len()!=32 || !s.bytes().all(|b|b.is_ascii_hexdigit()){return Err("invalid ID".into())} Ok(Self(u128::from_str_radix(s,16).map_err(|e|e.to_string())?))}
}

#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item{pub l_name:String,pub l_stock:u32}
impl Wire for l_Item {fn to_json(&self)->Json{json!({
"name":self.l_name.to_json(),
"stock":self.l_stock.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().ok_or("expected record")?;if obj.len()!=2{return Err("record field mismatch".into())}Ok(Self{
l_name:<String as Wire>::from_json(obj.get("name").ok_or("missing field")?)?,
l_stock:<u32 as Wire>::from_json(obj.get("stock").ok_or("missing field")?)?,
})}}
#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_StockChanged{pub l_item:l_ItemId,pub l_before:u32,pub l_after:u32}
impl Wire for l_StockChanged {fn to_json(&self)->Json{json!({
"item":self.l_item.to_json(),
"before":self.l_before.to_json(),
"after":self.l_after.to_json(),
})} fn from_json(v:&Json)->Result<Self,String>{let obj=v.as_object().ok_or("expected record")?;if obj.len()!=3{return Err("record field mismatch".into())}Ok(Self{
l_item:<l_ItemId as Wire>::from_json(obj.get("item").ok_or("missing field")?)?,
l_before:<u32 as Wire>::from_json(obj.get("before").ok_or("missing field")?)?,
l_after:<u32 as Wire>::from_json(obj.get("after").ok_or("missing field")?)?,
})}}
#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum l_Error{l_Missing,l_AlreadyExists,l_Overflow}
impl Wire for l_Error{fn to_json(&self)->Json{match self{
Self::l_Missing=>json!("Error.Missing"),
Self::l_AlreadyExists=>json!("Error.AlreadyExists"),
Self::l_Overflow=>json!("Error.Overflow"),
}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){Some("Error.Missing")=>Ok(Self::l_Missing),
Some("Error.AlreadyExists")=>Ok(Self::l_AlreadyExists),
Some("Error.Overflow")=>Ok(Self::l_Overflow),
_=>Err("invalid enum".into())}}}
#[derive(Clone,Debug)] pub enum EventData {
l_marker(u32),
l_stock_changed(l_StockChanged),
}
impl EventData {fn wire(&self)->(&'static str,Json){match *self {
Self::l_marker(ref v)=>("marker",v.to_json()),
Self::l_stock_changed(ref v)=>("stock_changed",v.to_json()),
}}}
enum Undo {
l_Items {key:l_ItemId,old:Option<l_Item>,cache_l_total_units:BigInt},
}
pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,
l_Items:BTreeMap<l_ItemId,l_Item>,
cache_l_total_units:BigInt,
}
impl Default for State {fn default()->Self{Self::new()}}
impl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],
l_Items:BTreeMap::new(),
cache_l_total_units:BigInt::from(0u8),
}}
pub fn version(&self)->u64{self.version}
pub fn outbox(&self)->&[Event]{&self.outbox}
pub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}
pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}
pub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if !self.undo.is_empty()||!self.staged.is_empty(){return Err("checkpoint requires transaction boundary".into())}let layout=snapshot_layout();let tables=vec![self.l_Items.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect(),
];let outbox=self.outbox.iter().map(|e|{let(channel,value)=match e.data{EventData::l_marker(ref v)=>(0,v.to_json()),
EventData::l_stock_changed(ref v)=>(1,v.to_json()),
};portable::Event{commit:e.commit,position:e.position,channel,value}}).collect();portable::encode(&layout,&portable::Logical{version:self.version,tables,outbox},limits)}
pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}
pub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let logical=portable::decode(&layout,bytes,limits)?;let mut state=Self::new();state.version=logical.version;let mut tables=logical.tables.into_iter();for(k,v)in tables.next().unwrap(){state.l_Items.insert(<l_ItemId as Wire>::from_json(&k)?,<l_Item as Wire>::from_json(&v)?);}
state.outbox=logical.outbox.into_iter().map(|e|{let data=match e.channel{0=>EventData::l_marker(<u32 as Wire>::from_json(&e.value)?),
1=>EventData::l_stock_changed(<l_StockChanged as Wire>::from_json(&e.value)?),
_=>return Err("unknown event channel".into())};Ok(Event{commit:e.commit,position:e.position,data})}).collect::<Result<Vec<_>,String>>()?;for row in state.l_Items.values(){state.cache_l_total_units+=Self::contribution_l_total_units(row);}
Ok(state)}
fn contribution_l_total_units(row:&l_Item)->BigInt{let tmp_1={let l_item=&row;BigInt::from(l_item.l_stock.clone())};tmp_1}
fn set_l_Items(&mut self,key:l_ItemId,value:Option<l_Item>,return_old:bool)->Option<l_Item>{
let new_part_l_total_units=value.as_ref().map(Self::contribution_l_total_units);
let old=match value{Some(v)=>self.l_Items.insert(key.clone(),v),None=>self.l_Items.remove(&key)};
let undo_l_total_units=self.cache_l_total_units.clone();
let (next_l_total_units, saved_l_total_units)={let total=&self.cache_l_total_units;let old_part=old.as_ref().map(Self::contribution_l_total_units);match (old_part,new_part_l_total_units){
(None,Some(new))=>{let l_total=total;let l_new=&new;let l_total=std::mem::take(&mut self.cache_l_total_units);((l_total + l_new),None::<(u8,BigInt)>) },
(Some(old),Some(new))=>{let l_total=total;let l_old=&old;let l_new=&new;let l_total=std::mem::take(&mut self.cache_l_total_units);(((l_total - l_old) + l_new),None::<(u8,BigInt)>) },
(Some(old),None)=>{let l_total=total;let l_old=&old;let l_total=std::mem::take(&mut self.cache_l_total_units);((l_total - l_old),None::<(u8,BigInt)>) },
(None,None)=>(std::mem::take(&mut self.cache_l_total_units),None)}};self.cache_l_total_units=next_l_total_units;
let result=if return_old{old.clone()}else{None};self.undo.push(Undo::l_Items{key,old,cache_l_total_units:undo_l_total_units});
result}
fn rollback(&mut self){for undo in self.undo.drain(..).rev(){match undo{
Undo::l_Items{key,old,cache_l_total_units}=>{match old{Some(v)=>{self.l_Items.insert(key,v);},None=>{self.l_Items.remove(&key);}}self.cache_l_total_units=cache_l_total_units;},
}}self.staged.clear();}
fn keep_l_total_units(&mut self)->BigInt{self.cache_l_total_units.clone()}
fn action_l_create(&mut self,l_id:l_ItemId,l_name:String,l_stock:u32)->Result<(),l_Error>{if self.l_Items.contains_key(&(l_id)) {return Err(l_Error::l_AlreadyExists);
} else {}
let _={let key=l_id;let value=l_Item{l_name:l_name,l_stock:l_stock};self.set_l_Items(key,Some(value),false);};
return Ok(());
}
pub fn invoke_view_l_create(&mut self,l_id:l_ItemId,l_name:String,l_stock:u32)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_create(l_id,l_name,l_stock);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_create(&mut self,l_id:l_ItemId,l_name:String,l_stock:u32)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_create(l_id,l_name,l_stock).map(OutcomeView::into_owned)}
fn action_l_restock(&mut self,l_id:l_ItemId,l_amount:u32)->Result<(),l_Error>{let l_item:&l_Item=self.l_Items.get(&(l_id)).ok_or(l_Error::l_Missing)?;
let l_next:u32=(((l_item.l_stock.clone()).checked_add(l_amount).ok_or(())).map_err(|l__|{l_Error::l_Overflow}))?;
let l_item__name:String=l_item.l_name.clone();
let l_item__stock:u32=l_item.l_stock.clone();
let _={let key=<l_ItemId as Clone>::clone(&l_id);let value=l_Item{l_name:l_item__name,l_stock:<u32 as Clone>::clone(&l_next)};self.set_l_Items(key,Some(value),false);};
{let value=l_StockChanged{l_item:l_id,l_before:l_item__stock,l_after:l_next};self.staged.push(EventData::l_stock_changed(value));}
return Ok(());
}
pub fn invoke_view_l_restock(&mut self,l_id:l_ItemId,l_amount:u32)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_restock(l_id,l_amount);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_restock(&mut self,l_id:l_ItemId,l_amount:u32)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_restock(l_id,l_amount).map(OutcomeView::into_owned)}
fn action_l_stock_of(&mut self,l_id:l_ItemId)->Option<u32>{return (self.l_Items.get(&(l_id))).map(|l_item|{l_item.l_stock.clone()});
}
pub fn invoke_view_l_stock_of(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Option<u32>>,String>{let result=self.action_l_stock_of(l_id);
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_stock_of(&mut self,l_id:l_ItemId)->Result<Outcome<Option<u32>>,String>{self.invoke_view_l_stock_of(l_id).map(OutcomeView::into_owned)}
fn action_l_total(&mut self,)->BigInt{return self.keep_l_total_units();
}
pub fn invoke_view_l_total(&mut self,)->Result<OutcomeView<'_,BigInt>,String>{let result=self.action_l_total();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_total(&mut self,)->Result<Outcome<BigInt>,String>{self.invoke_view_l_total().map(OutcomeView::into_owned)}
fn action_l_query_error(&mut self,)->Result<(),l_Error>{return Err(l_Error::l_Missing);
}
pub fn invoke_view_l_query_error(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_query_error();
Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})}
pub fn invoke_l_query_error(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_query_error().map(OutcomeView::into_owned)}
fn action_l_committed(&mut self,l_id:l_ItemId)->Result<BigInt,l_Error>{{let value=0u32;self.staged.push(EventData::l_marker(value));}
let _=({let tmp_2:l_ItemId=<l_ItemId as Clone>::clone(&l_id);let tmp_3:u32=1u32;transaction::nested_change(self.action_l_restock(tmp_2,tmp_3))?})?;
{let value=1u32;self.staged.push(EventData::l_marker(value));}
let _=({let tmp_4:l_ItemId=l_id;let tmp_5:u32=2u32;transaction::nested_change(self.action_l_restock(tmp_4,tmp_5))?})?;
{let value=2u32;self.staged.push(EventData::l_marker(value));}
return Ok(self.keep_l_total_units());
}
pub fn invoke_view_l_committed(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<BigInt,l_Error>>,String>{let result=self.action_l_committed(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_committed(&mut self,l_id:l_ItemId)->Result<Outcome<Result<BigInt,l_Error>>,String>{self.invoke_view_l_committed(l_id).map(OutcomeView::into_owned)}
fn action_l_poison(&mut self,l_id:l_ItemId)->Result<(),l_Error>{let _=({let tmp_6:l_ItemId=l_id;let tmp_7:u32=7u32;transaction::nested_change(self.action_l_restock(tmp_6,tmp_7))?})?;
{let value=3u32;self.staged.push(EventData::l_marker(value));}
return Err(l_Error::l_Overflow);
}
pub fn invoke_view_l_poison(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_poison(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_poison(&mut self,l_id:l_ItemId)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_poison(l_id).map(OutcomeView::into_owned)}
fn action_l_ignored(&mut self,l_id:l_ItemId)->Result<(),l_Error>{let _={let tmp_8:l_ItemId=l_id;transaction::nested_change(self.action_l_poison(tmp_8))?};
{let value=4u32;self.staged.push(EventData::l_marker(value));}
return Ok(());
}
pub fn invoke_view_l_ignored(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_ignored(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_ignored(&mut self,l_id:l_ItemId)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_ignored(l_id).map(OutcomeView::into_owned)}
fn action_l_captured(&mut self,l_id:l_ItemId)->Result<(),l_Error>{let l_discarded:Result<(),l_Error>={let tmp_9:l_ItemId=l_id;transaction::nested_change(self.action_l_poison(tmp_9))?};
{let value=5u32;self.staged.push(EventData::l_marker(value));}
return Ok(());
}
pub fn invoke_view_l_captured(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_captured(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_captured(&mut self,l_id:l_ItemId)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_captured(l_id).map(OutcomeView::into_owned)}
fn action_l_truth(&mut self,l_id:l_ItemId)->Result<bool,l_Error>{let _=({let tmp_10:l_ItemId=l_id;let tmp_11:u32=9u32;transaction::nested_change(self.action_l_restock(tmp_10,tmp_11))?})?;
return Ok(true);
}
pub fn invoke_view_l_truth(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<bool,l_Error>>,String>{let result=self.action_l_truth(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_truth(&mut self,l_id:l_ItemId)->Result<Outcome<Result<bool,l_Error>>,String>{self.invoke_view_l_truth(l_id).map(OutcomeView::into_owned)}
fn action_l_short_circuit(&mut self,l_id:l_ItemId)->Result<(),l_Error>{if ((false) && (({let tmp_12:l_ItemId=<l_ItemId as Clone>::clone(&l_id);transaction::nested_change(self.action_l_truth(tmp_12))?})?)) {return Err(l_Error::l_Overflow);
} else {}
if ((true) || (({let tmp_13:l_ItemId=l_id;transaction::nested_change(self.action_l_truth(tmp_13))?})?)) {return Ok(());
} else {}
return Err(l_Error::l_Overflow);
}
pub fn invoke_view_l_short_circuit(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_short_circuit(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_short_circuit(&mut self,l_id:l_ItemId)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_short_circuit(l_id).map(OutcomeView::into_owned)}
fn action_l_ignore_query(&mut self,)->Result<(),l_Error>{let _={self.action_l_query_error()};
return Ok(());
}
pub fn invoke_view_l_ignore_query(&mut self,)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_ignore_query();
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_ignore_query(&mut self,)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_ignore_query().map(OutcomeView::into_owned)}
fn action_l_try_query(&mut self,l_id:l_ItemId)->Result<(),l_Error>{let _=({let tmp_14:l_ItemId=l_id;let tmp_15:u32=5u32;transaction::nested_change(self.action_l_restock(tmp_14,tmp_15))?})?;
let _=({self.action_l_query_error()})?;
return Ok(());
}
pub fn invoke_view_l_try_query(&mut self,l_id:l_ItemId)->Result<OutcomeView<'_,Result<(),l_Error>>,String>{let result=self.action_l_try_query(l_id);
let version=match transaction::decide(self.version,result.is_ok()){transaction::Decision::Rollback=>{self.rollback();return Ok(OutcomeView{result,committed:false,version:self.version,events:&[]})},transaction::Decision::Exhausted=>{self.rollback();return Err("commit sequence exhausted".into())},transaction::Decision::Commit{version}=>version};self.version=version;self.undo.clear();let start=self.outbox.len();self.outbox.extend(transaction::publish(version,self.staged.drain(..)).map(|published|Event{commit:published.commit,position:published.position,data:published.value}));Ok(OutcomeView{result,committed:true,version,events:&self.outbox[start..]})}
pub fn invoke_l_try_query(&mut self,l_id:l_ItemId)->Result<Outcome<Result<(),l_Error>>,String>{self.invoke_view_l_try_query(l_id).map(OutcomeView::into_owned)}
pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().ok_or("expected argument array")?;match name{
"create"=>{if args.len()!=3{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;let a1=<String as Wire>::from_json(&args[1])?;let a2=<u32 as Wire>::from_json(&args[2])?;Ok(self.invoke_view_l_create(a0,a1,a2)?.to_json())},
"restock"=>{if args.len()!=2{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;let a1=<u32 as Wire>::from_json(&args[1])?;Ok(self.invoke_view_l_restock(a0,a1)?.to_json())},
"stock_of"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_stock_of(a0)?.to_json())},
"total"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_total()?.to_json())},
"query_error"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_query_error()?.to_json())},
"committed"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_committed(a0)?.to_json())},
"poison"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_poison(a0)?.to_json())},
"ignored"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_ignored(a0)?.to_json())},
"captured"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_captured(a0)?.to_json())},
"truth"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_truth(a0)?.to_json())},
"short_circuit"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_short_circuit(a0)?.to_json())},
"ignore_query"=>{if args.len()!=0{return Err("argument count mismatch".into())}Ok(self.invoke_view_l_ignore_query()?.to_json())},
"try_query"=>{if args.len()!=1{return Err("argument count mismatch".into())}let a0=<l_ItemId as Wire>::from_json(&args[0])?;Ok(self.invoke_view_l_try_query(a0)?.to_json())},
_=>Err("unknown action".into())}}}
