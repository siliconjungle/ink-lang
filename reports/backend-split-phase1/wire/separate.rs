// ink-definition-rust-v1: checked bodies; Rust/backend are trusted.
#![allow(non_camel_case_types, dead_code, unused_variables, unused_parens)]
/// Ground constructor values at the checked dispatch boundary. This is an
/// in-process Rust API, not a persistent snapshot or an untrusted byte parser.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    Bool(bool),
    U64(u64),
    Data { datatype: String, constructor: usize, arguments: Vec<Value> },
}
fn decode_bool(v: &Value) -> Result<bool, &'static str> {
    if let Value::Bool(b) = v { Ok(*b) } else { Err("expected Bool") }
}
fn decode_u64(v: &Value) -> Result<u64, &'static str> {
    if let Value::U64(n) = v { Ok(*n) } else { Err("expected U64") }
}
fn validate_inputs(args: &[Value]) -> Result<(), &'static str> {
    if args.len() > 64 { return Err("input argument limit"); }
    let mut pending: Vec<_> = args.iter().map(|v| (v, 0usize)).collect();
    let mut nodes = 0;
    while let Some((v, depth)) = pending.pop() {
        nodes += 1;
        if depth > 64 || nodes > 100_000 { return Err("input value resource limit"); }
        if let Value::Data { datatype, arguments, .. } = v {
            if datatype.len() != 64 || arguments.len() > 64 { return Err("input constructor limit"); }
            pending.extend(arguments.iter().map(|v| (v, depth + 1)));
        }
    }
    Ok(())
}
fn d_2b63db5c37b5b333c0cf3e0e34a3ef280064c26ec94150295dc19c63386c32ae(v0: u64) -> u64 { (v0).wrapping_add(1u64) }
fn d_3efde1d2171c6577334927ed3060deba30f79045953cf701237bd154ba0cc027(v1: u64) -> u64 { d_2b63db5c37b5b333c0cf3e0e34a3ef280064c26ec94150295dc19c63386c32ae(d_984e83e15f8b2ed95a38379fd98385c3dd9cf8bf7a02cc6fc5d55c6cb691adb0(v1)) }
fn d_443c5b02d594b1be81a62d2b623152b9ad8bb16d5908266f92fb2343247a5e19(v2: &D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a) -> D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a { match v2 { D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::C0 => { D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::C0 },D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::C1(v3,v4) => { D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::C1(d_3efde1d2171c6577334927ed3060deba30f79045953cf701237bd154ba0cc027(*v3),Box::new(d_443c5b02d594b1be81a62d2b623152b9ad8bb16d5908266f92fb2343247a5e19(v4.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a { C0,C1(u64,Box<D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a>) }
impl D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(decode_u64(&arguments[0])?,Box::new(D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a".into(), constructor: 1, arguments: vec![Value::U64(*b0),(b1).encode()] }, } }
}
fn d_984e83e15f8b2ed95a38379fd98385c3dd9cf8bf7a02cc6fc5d55c6cb691adb0(v5: u64) -> u64 { (v5).wrapping_mul(2u64) }
pub fn f_bbfcc4e871ed581e07a7f28f65d89a40ceb0328ca8e858a6409ca8d756dde30c(v6: &D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a) -> D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a { d_443c5b02d594b1be81a62d2b623152b9ad8bb16d5908266f92fb2343247a5e19(v6) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"bbfcc4e871ed581e07a7f28f65d89a40ceb0328ca8e858a6409ca8d756dde30c" if args.len() == 1 => {
let a0 = D_8f3ce4e1fb4435fa83d81d0d0b24a3375f52febb96505737a24cfaba0238842a::decode(&args[0])?;
let result = f_bbfcc4e871ed581e07a7f28f65d89a40ceb0328ca8e858a6409ca8d756dde30c(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }
