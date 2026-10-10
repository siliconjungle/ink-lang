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
fn d_1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce(v0: &D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748,v1: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { match v0 { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(v2,v3) => { match v1 { D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::C0(v4,v5) => { d_7e0e758b89940a502675bc9391dc3e60ab3ca79542f5e77154e6b3e659880c22(v2.as_ref(),v3.as_ref(),v4.as_ref(),v5.as_ref()) } } } } }
fn d_24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31(v6: &D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { match v6 { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(v7,v8) => { d_29aebf3859da25aa57a06690b5c13243256c65e52196e96756a0cfecb57d294c(v7.as_ref(),v8.as_ref()) } } }
fn d_29aebf3859da25aa57a06690b5c13243256c65e52196e96756a0cfecb57d294c(v9: &D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c,v10: &D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { match v9 { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C0 => { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 },D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(v11,v12) => { match v10 { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C0 => { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 },D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(v13,v14) => { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(Box::new((v11.as_ref()).clone()),Box::new((v13.as_ref()).clone()),Box::new(d_29aebf3859da25aa57a06690b5c13243256c65e52196e96756a0cfecb57d294c(v12.as_ref(),v14.as_ref()))) } } } } }
fn d_3938f02106deaced7eae2689d51c66299ca122d9747540ea61a27cfb9fde7639(v15: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v16: &D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c,v17: &D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642,v18: &D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { match v18 { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C0 => { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new((v16).clone()),Box::new((v17).clone())) },D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C1(v19) => { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new(D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(Box::new((v15).clone()),Box::new((v16).clone()))),Box::new(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(Box::new((v19.as_ref()).clone()),Box::new((v17).clone())))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 { C0(Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0>,Box<D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626>,bool) }
impl D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41" => match constructor { 0 if arguments.len() == 4 => Ok(Self::C0(Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[0])?),Box::new(D_8d21ef6d9cec3e1d84435f17a94642a244be4167b1608cad55155cac4c7c8de0::decode(&arguments[1])?),Box::new(D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626::decode(&arguments[2])?),decode_bool(&arguments[3])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2,b3) => Value::Data { datatype: "5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode(),Value::Bool(*b3)] }, } }
}
fn d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v20: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v21: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v20 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v22,v23) => { match v21 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v24,v25) => { ((((*v22) == (*v24))) & (((*v23) == (*v25)))) } } } } }
fn d_7972bcab3b9e6233976b2f1f2fbef45c0a436052395d5bb6f4076c4d9ad1af5c(v26: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v27: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v26 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v28,v29) => { match v27 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v30,v31) => { ((((*v28) < (*v30))) | (((((*v28) == (*v30))) & (((*v29) < (*v31)))))) } } } } }
fn d_7e0e758b89940a502675bc9391dc3e60ab3ca79542f5e77154e6b3e659880c22(v32: &D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c,v33: &D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642,v34: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v35: &D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { match v32 { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C0 => { d_3938f02106deaced7eae2689d51c66299ca122d9747540ea61a27cfb9fde7639(v34,v32,v33,v35) },D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(v36,v37) => { match v33 { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C0 => { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new((v32).clone()),Box::new((v33).clone())) },D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(v38,v39) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v36.as_ref(),v34) { d_3938f02106deaced7eae2689d51c66299ca122d9747540ea61a27cfb9fde7639(v36.as_ref(),v37.as_ref(),v39.as_ref(),v35) } else { if d_7972bcab3b9e6233976b2f1f2fbef45c0a436052395d5bb6f4076c4d9ad1af5c(v34,v36.as_ref()) { d_3938f02106deaced7eae2689d51c66299ca122d9747540ea61a27cfb9fde7639(v34,&(D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(Box::new((v36.as_ref()).clone()),Box::new((v37.as_ref()).clone()))),&(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(Box::new((v38.as_ref()).clone()),Box::new((v39.as_ref()).clone()))),v35) } else { d_fc142852e317f8dd248bb9d91a91e093ca1410b05e089368c69b4a976251cc51(v36.as_ref(),v38.as_ref(),&(d_7e0e758b89940a502675bc9391dc3e60ab3ca79542f5e77154e6b3e659880c22(v37.as_ref(),v39.as_ref(),v34,v35))) } } } } } } }
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
fn d_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v40: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new(d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v40)),Box::new(d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v40))) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { C0,C1(Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>) }
impl D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { C0,C1(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>,Box<D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5>) }
impl D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 3 => Ok(Self::C1(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[1])?),Box::new(D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1,b2) => Value::Data { datatype: "ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode()] }, } }
}
fn d_b736ec47d3f1d0e6dd1941724c70c704ab34dd5dfb9d2ce7bb3ca899fe19bb63(v41: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v42: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { d_24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31(&(d_1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce(&(d_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v41)),v42))) }
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
fn d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v43: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c { match v43 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v44,v45,v46) => { D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(Box::new((v44.as_ref()).clone()),Box::new(d_d6491beaf644e73bff57f3f6be6c20fd22aaff1157116891ddc79a12b0568b51(v46.as_ref()))) } } }
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
fn d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v47: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v48: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { match v47 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v49,v50,v51) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v49.as_ref(),v48) { D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7::C1(Box::new((v50.as_ref()).clone())) } else { d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v51.as_ref(),v48) } } } }
fn d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v52: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 { match v52 { D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C0 => { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C0 },D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::C1(v53,v54,v55) => { D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(Box::new((v54.as_ref()).clone()),Box::new(d_ee38094c25ea0a3d4bd5de0e2bcdb778fc5f5ba4b24d2864c44f355b28cf73f1(v55.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 { C0,C1(Box<D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41>,Box<D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642>) }
impl D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41::decode(&arguments[0])?),Box::new(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_fc142852e317f8dd248bb9d91a91e093ca1410b05e089368c69b4a976251cc51(v56: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v57: &D_5a6bc45e2b256586b642c8d866ef145fe1d396a2bd755bb5b110ce49c611ec41,v58: &D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { match v58 { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(v59,v60) => { D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::C0(Box::new(D_9ee633686a27ef4f92966f7d0ef603c8dbfb293d07a25dafe07edc066e4df42c::C1(Box::new((v56).clone()),Box::new((v59.as_ref()).clone()))),Box::new(D_f2fe936fa3c5d094b925b89f1ef884b75da38bc92d2e2e928ad6cf32a3c5d642::C1(Box::new((v57).clone()),Box::new((v60.as_ref()).clone())))) } } }
pub fn f_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(v61: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v62: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { d_b736ec47d3f1d0e6dd1941724c70c704ab34dd5dfb9d2ce7bb3ca899fe19bb63(v61,v62) }
pub fn f_1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce(v63: &D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748,v64: &D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { d_1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce(v63,v64) }
pub fn f_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v65: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5) -> D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748 { d_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(v65) }
pub fn f_24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31(v66: &D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748) -> D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5 { d_24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31(v66) }
pub fn f_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v67: &D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5,v68: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_a1cd12c412f1833eb01495402b2ea2214386a45cd14f15519079918fc141f7e7 { d_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(v67,v68) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf" if args.len() == 2 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let a1 = D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::decode(&args[1])?;
let result = f_e37c62e2df52b005708940625015a4df4ee3f6475513b283fbdca507d792fdcf(&a0,&a1); Ok((result).encode()) },
"1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce" if args.len() == 2 => {
let a0 = D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::decode(&args[0])?;
let a1 = D_d4205ceb8949f7bd97e71c4574fe5b77be422fb1c62c9cd5dc198f507e9e13c7::decode(&args[1])?;
let result = f_1b36942b2b475326499ba0814348d24683e34242f828cd879a2de34c975746ce(&a0,&a1); Ok((result).encode()) },
"9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880" if args.len() == 1 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let result = f_9ff4656bfcc3e26988d6675c3faec23e35dec4c910717d1ad7f7ea9009073880(&a0); Ok((result).encode()) },
"24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31" if args.len() == 1 => {
let a0 = D_83f833a544283201b73f2866f3785ae4ed4b5fc24bf009e40e271dffe940b748::decode(&args[0])?;
let result = f_24e8da35d47ff7ec6db2ad120688879d3bc096e26ae1352825cd5edaf98c4f31(&a0); Ok((result).encode()) },
"ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842" if args.len() == 2 => {
let a0 = D_ac21f7bf213a910e50f356de0d17d639621a268a4412765075968296ab3a6eb5::decode(&args[0])?;
let a1 = D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&args[1])?;
let result = f_ec1cb65469da39f710e0f6fa840a740fcb25d2e5d989b54d5d1aa87bc8dc3842(&a0,&a1); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }
