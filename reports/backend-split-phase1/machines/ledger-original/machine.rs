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
fn d_4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36(v0: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v1: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab::C0 }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 { C0(Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626>,bool) }
impl D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41" => match constructor { 0 if arguments.len() == 4 => Ok(Self::C0(Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[0])?),Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[1])?),Box::new(D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626::decode(&arguments[2])?),decode_bool(&arguments[3])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2,b3) => Value::Data { datatype: "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode(),Value::Bool(*b3)] }, } }
}
fn d_63a36a4b8780196e9f1e1fb4e31de0ee5dc7efe090033d80abc4cd75358dc678(v2: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v3: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v4: &D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { match v2 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { d_a7f42633e21d171cc3856141636d2ba1d67ed00b2962f98e8cbf90d27d0166fc(v3,&(D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0),v4) },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v5,v6,v7) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v5.as_ref(),v3) { d_a7f42633e21d171cc3856141636d2ba1d67ed00b2962f98e8cbf90d27d0166fc(v5.as_ref(),v7.as_ref(),v4) } else { if d_7972bcab3b9e6233976b2f1f2fbef45c0a436052395d5bb6f4076c4d9ad1af5c(v3,v5.as_ref()) { d_a7f42633e21d171cc3856141636d2ba1d67ed00b2962f98e8cbf90d27d0166fc(v3,&(D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(Box::new((v5.as_ref()).clone()),Box::new((v6.as_ref()).clone()),Box::new((v7.as_ref()).clone()))),v4) } else { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(Box::new((v5.as_ref()).clone()),Box::new((v6.as_ref()).clone()),Box::new(d_63a36a4b8780196e9f1e1fb4e31de0ee5dc7efe090033d80abc4cd75358dc678(v7.as_ref(),v3,v4))) } } } } }
fn d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v8: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v9: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v8 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v10,v11) => { match v9 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v12,v13) => { ((((*v10) == (*v12))) & (((*v11) == (*v13)))) } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { C0 }
impl D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab".into(), constructor: 0, arguments: vec![] }, } }
}
fn d_7972bcab3b9e6233976b2f1f2fbef45c0a436052395d5bb6f4076c4d9ad1af5c(v14: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v15: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v14 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v16,v17) => { match v15 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v18,v19) => { ((((*v16) < (*v18))) | (((((*v16) == (*v18))) & (((*v17) < (*v19)))))) } } } } }
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
fn d_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(v20: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { (v20).clone() }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { C0,C1(Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>) }
impl D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
fn d_a7f42633e21d171cc3856141636d2ba1d67ed00b2962f98e8cbf90d27d0166fc(v21: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v22: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v23: &D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { match v23 { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C0 => { (v22).clone() },D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C1(v24) => { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(Box::new((v21).clone()),Box::new((v24.as_ref()).clone()),Box::new((v22).clone())) } } }
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7 { C0(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7>) }
impl D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode()] }, } }
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
pub enum D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74 { C0,C1(Box<D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948>),C2(Box<D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948>) }
impl D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948::decode(&arguments[0])?))),
2 if arguments.len() == 1 => Ok(Self::C2(Box::new(D_cf4363673193ebdde445cd2c831936972620b23f6e8c2f8bf0b1e1ef6bdd2948::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 1, arguments: vec![(b0).encode()] },
Self::C2(b0) => Value::Data { datatype: "df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74".into(), constructor: 2, arguments: vec![(b0).encode()] }, } }
}
fn d_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(v25: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v26: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { match v26 { D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::C0(v27,v28) => { d_63a36a4b8780196e9f1e1fb4e31de0ee5dc7efe090033d80abc4cd75358dc678(v25,v27.as_ref(),v28.as_ref()) } } }
fn d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v29: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v30: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { match v29 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v31,v32,v33) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v31.as_ref(),v30) { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C1(Box::new((v32.as_ref()).clone())) } else { d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v33.as_ref(),v30) } } } }
pub fn f_4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36(v34: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v35: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { d_4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36(v34,v35) }
pub fn f_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(v36: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { d_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(v36) }
pub fn f_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(v37: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v38: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { d_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(v37,v38) }
pub fn f_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v39: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v40: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v39,v40) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36" if args.len() == 2 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let a1 = D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::decode(&args[1])?;
let result = f_4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36(&a0,&a1); Ok((result).encode()) },
"96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954" if args.len() == 1 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let result = f_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(&a0); Ok((result).encode()) },
"e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf" if args.len() == 2 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let a1 = D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::decode(&args[1])?;
let result = f_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(&a0,&a1); Ok((result).encode()) },
"ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842" if args.len() == 2 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let a1 = D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&args[1])?;
let result = f_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(&a0,&a1); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }

pub struct Machine { state: D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 }
impl Machine {
pub fn new(logical: &Value) -> Result<Self,&'static str> { validate_inputs(std::slice::from_ref(logical))?; let input=D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(logical)?; Ok(Self {state:f_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(&input)}) }
pub fn snapshot(&self) -> Value { let result=f_96ec2b6d3025ef8dd1e19262b9595ca911dbfa28b20df9474e9315ddbfb6d954(&self.state); (result).encode() }
pub fn restore(&mut self, logical: &Value) -> Result<(),&'static str> { let next=Self::new(logical)?; *self=next; Ok(()) }
pub fn apply(&mut self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"write" if args.len()==1 => { let a0=D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::decode(&args[0])?; let reply=f_4495cd26b4f95e2cfa31b70e26137a75c28ca46717bb60d4272f276e04c08c36(&self.state,&a0); let next=f_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(&self.state,&a0); self.state=next; Ok((reply).encode()) },
_=>Err("unknown machine operation or argument count mismatch") } }
pub fn query(&self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"lookup" if args.len()==1 => { let a0=D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&args[0])?; let result=f_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(&self.state,&a0); Ok((result).encode()) },
_=>Err("unknown machine query or argument count mismatch") } }
}
