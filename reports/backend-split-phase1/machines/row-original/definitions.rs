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
pub enum D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6 { C0(u64,u64) }
impl D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd { C0(Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>,bool) }
impl D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[0])?),decode_bool(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd".into(), constructor: 0, arguments: vec![(b0).encode(),Value::Bool(*b1)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 { C0,C1(Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
fn d_9bc441a576803ea2d5747013bd9905eef709b1a7feb12ee59d639b87d6b53882(v0: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { (v0).clone() }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259 { C0(Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>,Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>,Box<D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd>,Box<D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626>,Box<D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358>,Box<D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329>,Box<D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6>,Box<D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04>,u64) }
impl D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259" => match constructor { 0 if arguments.len() == 9 => Ok(Self::C0(Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[0])?),Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[1])?),Box::new(D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd::decode(&arguments[2])?),Box::new(D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626::decode(&arguments[3])?),Box::new(D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358::decode(&arguments[4])?),Box::new(D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329::decode(&arguments[5])?),Box::new(D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6::decode(&arguments[6])?),Box::new(D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04::decode(&arguments[7])?),decode_u64(&arguments[8])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2,b3,b4,b5,b6,b7,b8) => Value::Data { datatype: "a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode(),(b3).encode(),(b4).encode(),(b5).encode(),(b6).encode(),(b7).encode(),Value::U64(*b8)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329 { C0,C1 }
impl D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 0 => Ok(Self::C1), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329".into(), constructor: 0, arguments: vec![] },
Self::C1 => Value::Data { datatype: "cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329".into(), constructor: 1, arguments: vec![] }, } }
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163 { C0,C1(u64,Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(decode_u64(&arguments[0])?,Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163".into(), constructor: 1, arguments: vec![Value::U64(*b0),(b1).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358 { C0,C1(u64,Box<D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358>) }
impl D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(decode_u64(&arguments[0])?,Box::new(D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358".into(), constructor: 1, arguments: vec![Value::U64(*b0),(b1).encode()] }, } }
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04 { C0(Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>),C1(Box<D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329>) }
impl D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04" => match constructor { 0 if arguments.len() == 1 => Ok(Self::C0(Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[0])?))),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0) => Value::Data { datatype: "e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04".into(), constructor: 0, arguments: vec![(b0).encode()] },
Self::C1(b0) => Value::Data { datatype: "e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { C0,C1(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259>,Box<D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629>) }
impl D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 3 => Ok(Self::C1(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259::decode(&arguments[1])?),Box::new(D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1,b2) => Value::Data { datatype: "e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode()] }, } }
}
pub fn f_9bc441a576803ea2d5747013bd9905eef709b1a7feb12ee59d639b87d6b53882(v1: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { d_9bc441a576803ea2d5747013bd9905eef709b1a7feb12ee59d639b87d6b53882(v1) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"9bc441a576803ea2d5747013bd9905eef709b1a7feb12ee59d639b87d6b53882" if args.len() == 1 => {
let a0 = D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::decode(&args[0])?;
let result = f_9bc441a576803ea2d5747013bd9905eef709b1a7feb12ee59d639b87d6b53882(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }
