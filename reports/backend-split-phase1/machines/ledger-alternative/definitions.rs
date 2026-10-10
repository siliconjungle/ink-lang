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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 { C0(Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626>,bool) }
impl D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41" => match constructor { 0 if arguments.len() == 4 => Ok(Self::C0(Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[0])?),Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[1])?),Box::new(D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626::decode(&arguments[2])?),decode_bool(&arguments[3])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2,b3) => Value::Data { datatype: "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode(),Value::Bool(*b3)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { C0(Box<D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c>,Box<D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642>) }
impl D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::decode(&arguments[0])?),Box::new(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 { C0,C1(Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0 { C0(Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>,Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[0])?),Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c { C0,C1(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c>) }
impl D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v0: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new(d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v0)),Box::new(d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v0))) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { C0,C1(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>,Box<D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5>) }
impl D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 3 => Ok(Self::C1(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[1])?),Box::new(D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1,b2) => Value::Data { datatype: "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948 { C0,C1(Box<D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948>) }
impl D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973 { C0(u64,u64) }
impl D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] }, } }
}
fn d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v1: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c { match v1 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v2,v3,v4) => { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(Box::new((v2.as_ref()).clone()),Box::new(d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v4.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163 { C0,C1(u64,Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(decode_u64(&arguments[0])?,Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163".into(), constructor: 1, arguments: vec![Value::U64(*b0),(b1).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74 { C0,C1(Box<D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948>),C2(Box<D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948>) }
impl D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948::decode(&arguments[0])?))),
2 if arguments.len() == 1 => Ok(Self::C2(Box::new(D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 1, arguments: vec![(b0).encode()] },
Self::C2(b0) => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 2, arguments: vec![(b0).encode()] }, } }
}
fn d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v5: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 { match v5 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v6,v7,v8) => { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(Box::new((v7.as_ref()).clone()),Box::new(d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v8.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 { C0,C1(Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>,Box<D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642>) }
impl D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[0])?),Box::new(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
pub fn f_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v9: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { d_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v9) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880" if args.len() == 1 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let result = f_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }
