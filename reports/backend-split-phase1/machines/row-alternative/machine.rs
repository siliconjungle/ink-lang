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
fn d_01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443(v0: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(Box::new(d_92fbd572115e9d17132e466a993ec013f5f7bd6936feccf6bca7983925dd9035(v0)),Box::new(d_04ffe4da6d58129f72907ad1cb6deee50c8d42c0345f72447f609867a26ff7c9(v0))) }
fn d_04ffe4da6d58129f72907ad1cb6deee50c8d42c0345f72447f609867a26ff7c9(v1: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4 { match v1 { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C0 => { D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C0 },D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C1(v2,v3,v4) => { D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(Box::new((v3.as_ref()).clone()),Box::new(d_04ffe4da6d58129f72907ad1cb6deee50c8d42c0345f72447f609867a26ff7c9(v4.as_ref()))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856 { C0,C1(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856>) }
impl D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d(v5: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v6: &D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { match v5 { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(v7,v8) => { match v6 { D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c::C0(v9,v10) => { d_921f205c6bb7ff0bc6a022309dcacc5e7347314700c6cc154844df096e83a397(v7.as_ref(),v8.as_ref(),v9.as_ref(),v10.as_ref()) } } } } }
fn d_17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc(v11: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v12: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb { d_960928031659f5079e1ba57967fd84678ee38e3a0762e114539037c9077b94fd(&(d_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(v11)),v12) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6 { C0(u64,u64) }
impl D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb { C0,C1(Box<D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259>) }
impl D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
fn d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v13: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v14: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v13 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v15,v16) => { match v14 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v17,v18) => { ((((*v15) == (*v17))) & (((*v16) == (*v18)))) } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { C0 }
impl D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab".into(), constructor: 0, arguments: vec![] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd { C0(Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>,bool) }
impl D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[0])?),decode_bool(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd".into(), constructor: 0, arguments: vec![(b0).encode(),Value::Bool(*b1)] }, } }
}
fn d_78b97a33c287de0500040a64516a87d9298290e15a6ab6f36426cae06cd5a5a0(v19: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v20: &D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259,v21: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { match v21 { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(v22,v23) => { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(Box::new(D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(Box::new((v19).clone()),Box::new((v22.as_ref()).clone()))),Box::new(D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(Box::new((v20).clone()),Box::new((v23.as_ref()).clone())))) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 { C0,C1(Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>) }
impl D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 1 => Ok(Self::C1(Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[0])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 0, arguments: vec![] },
Self::C1(b0) => Value::Data { datatype: "85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626".into(), constructor: 1, arguments: vec![(b0).encode()] }, } }
}
fn d_8de805249d44338af5f2eb6c8f49e18f1c52790892e9b0869dc057b82e232a5d(v24: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v25: &D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856,v26: &D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4,v27: &D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { match v27 { D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb::C0 => { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(Box::new((v25).clone()),Box::new((v26).clone())) },D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb::C1(v28) => { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(Box::new(D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(Box::new((v24).clone()),Box::new((v25).clone()))),Box::new(D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(Box::new((v28.as_ref()).clone()),Box::new((v26).clone())))) } } }
fn d_921f205c6bb7ff0bc6a022309dcacc5e7347314700c6cc154844df096e83a397(v29: &D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856,v30: &D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4,v31: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v32: &D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { match v29 { D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C0 => { d_8de805249d44338af5f2eb6c8f49e18f1c52790892e9b0869dc057b82e232a5d(v31,v29,v30,v32) },D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(v33,v34) => { match v30 { D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C0 => { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(Box::new((v29).clone()),Box::new((v30).clone())) },D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(v35,v36) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v33.as_ref(),v31) { d_8de805249d44338af5f2eb6c8f49e18f1c52790892e9b0869dc057b82e232a5d(v33.as_ref(),v34.as_ref(),v36.as_ref(),v32) } else { if d_9d870a5656285a61ad2e3d0b86f62908f68b85da3684930e9f693c9538f7e7a3(v31,v33.as_ref()) { d_8de805249d44338af5f2eb6c8f49e18f1c52790892e9b0869dc057b82e232a5d(v31,&(D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(Box::new((v33.as_ref()).clone()),Box::new((v34.as_ref()).clone()))),&(D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(Box::new((v35.as_ref()).clone()),Box::new((v36.as_ref()).clone()))),v32) } else { d_78b97a33c287de0500040a64516a87d9298290e15a6ab6f36426cae06cd5a5a0(v33.as_ref(),v35.as_ref(),&(d_921f205c6bb7ff0bc6a022309dcacc5e7347314700c6cc154844df096e83a397(v34.as_ref(),v36.as_ref(),v31,v32))) } } } } } } }
fn d_92fbd572115e9d17132e466a993ec013f5f7bd6936feccf6bca7983925dd9035(v37: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856 { match v37 { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C0 => { D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C0 },D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C1(v38,v39,v40) => { D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(Box::new((v38.as_ref()).clone()),Box::new(d_92fbd572115e9d17132e466a993ec013f5f7bd6936feccf6bca7983925dd9035(v40.as_ref()))) } } }
fn d_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(v41: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b) -> D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { match v41 { D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::C0(v42,v43) => { d_c6041689b6fa37aaa6c75447955debe10d1ba5a93148855af3095620fb785ef9(v42.as_ref(),v43.as_ref()) } } }
fn d_960928031659f5079e1ba57967fd84678ee38e3a0762e114539037c9077b94fd(v44: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629,v45: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb { match v44 { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C0 => { D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb::C0 },D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C1(v46,v47,v48) => { if d_6a9005ec479d802b98110b67791bbefc7d94266e28e04d5ac6c51ff217da838f(v46.as_ref(),v45) { D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb::C1(Box::new((v47.as_ref()).clone())) } else { d_960928031659f5079e1ba57967fd84678ee38e3a0762e114539037c9077b94fd(v48.as_ref(),v45) } } } }
fn d_9d870a5656285a61ad2e3d0b86f62908f68b85da3684930e9f693c9538f7e7a3(v49: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973,v50: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> bool { match v49 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v51,v52) => { match v50 { D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::C0(v53,v54) => { ((((*v51) < (*v53))) | (((((*v51) == (*v53))) & (((*v52) < (*v54)))))) } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259 { C0(Box<D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163>,Box<D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74>,Box<D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd>,Box<D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626>,Box<D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358>,Box<D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329>,Box<D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6>,Box<D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04>,u64) }
impl D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259" => match constructor { 0 if arguments.len() == 9 => Ok(Self::C0(Box::new(D_d91be336b8ec6eb1904338ca45c752da972e2b62338094c9508ed30e27215163::decode(&arguments[0])?),Box::new(D_df86c7cadc60d4eef79c96d9cc64a9971c03132d3351af808f06127607da6c74::decode(&arguments[1])?),Box::new(D_775b94a9c3ee9a9a54339a5b74586fab596fc599a9f4ce00bad318b3c8de2fbd::decode(&arguments[2])?),Box::new(D_85fe3480106fa23e84bf844c51bfd10ed8860690bc20afd6fd08cf514e48d626::decode(&arguments[3])?),Box::new(D_df07fbf1f1aa1fbd7f1b9a8d8566e1e905d805b4fbbbda6e723872c93dfb6358::decode(&arguments[4])?),Box::new(D_cac29cd07ca8425f56b51c3e4b047504574606d2054189087ad0cc2b6705e329::decode(&arguments[5])?),Box::new(D_273604fa8cc2eefea99058c73ecddef5801a1a92f2a55b59868fa832bf5eb5c6::decode(&arguments[6])?),Box::new(D_e47d1e6f43936398e1aa2ed542ee22677c6ed9b3e34ef946f6af36daa7631d04::decode(&arguments[7])?),decode_u64(&arguments[8])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2,b3,b4,b5,b6,b7,b8) => Value::Data { datatype: "a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode(),(b2).encode(),(b3).encode(),(b4).encode(),(b5).encode(),(b6).encode(),(b7).encode(),Value::U64(*b8)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c { C0(Box<D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973>,Box<D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb>) }
impl D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&arguments[0])?),Box::new(D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_c6041689b6fa37aaa6c75447955debe10d1ba5a93148855af3095620fb785ef9(v55: &D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856,v56: &D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4) -> D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { match v55 { D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C0 => { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C0 },D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::C1(v57,v58) => { match v56 { D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C0 => { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C0 },D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::C1(v59,v60) => { D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::C1(Box::new((v57.as_ref()).clone()),Box::new((v59.as_ref()).clone()),Box::new(d_c6041689b6fa37aaa6c75447955debe10d1ba5a93148855af3095620fb785ef9(v58.as_ref(),v60.as_ref()))) } } } } }
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
pub enum D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { C0(Box<D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856>,Box<D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4>) }
impl D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(Box::new(D_09e174a8ddb786a92dd22bb64a247c3ae7d17a9c1efcaaaab0da3959a5b3b856::decode(&arguments[0])?),Box::new(D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b".into(), constructor: 0, arguments: vec![(b0).encode(),(b1).encode()] }, } }
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4 { C0,C1(Box<D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259>,Box<D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4>) }
impl D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_a3064804483b2b7e85fcbf0b298c719c02933ff6cfc8a1d227d134f97c533259::decode(&arguments[0])?),Box::new(D_f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "f002bc7cf6ceae48d8be15179f6ee2a833e646f7123675b25d0d43df9b94f3e4".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513(v61: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v62: &D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c) -> D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab::C0 }
pub fn f_01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443(v63: &D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { d_01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443(v63) }
pub fn f_14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d(v64: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v65: &D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c) -> D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b { d_14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d(v64,v65) }
pub fn f_17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc(v66: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v67: &D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973) -> D_3d12d8ba19659021fe47080f47179e33788fc6233c45621617906b0b28eeefcb { d_17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc(v66,v67) }
pub fn f_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(v68: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b) -> D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629 { d_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(v68) }
pub fn f_f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513(v69: &D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b,v70: &D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c) -> D_76e84d825359851bdb24c0f1633582e64076d4704f2524b24a3a10470d8624ab { d_f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513(v69,v70) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443" if args.len() == 1 => {
let a0 = D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::decode(&args[0])?;
let result = f_01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443(&a0); Ok((result).encode()) },
"14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d" if args.len() == 2 => {
let a0 = D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::decode(&args[0])?;
let a1 = D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c::decode(&args[1])?;
let result = f_14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d(&a0,&a1); Ok((result).encode()) },
"17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc" if args.len() == 2 => {
let a0 = D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::decode(&args[0])?;
let a1 = D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&args[1])?;
let result = f_17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc(&a0,&a1); Ok((result).encode()) },
"93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb" if args.len() == 1 => {
let a0 = D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::decode(&args[0])?;
let result = f_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(&a0); Ok((result).encode()) },
"f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513" if args.len() == 2 => {
let a0 = D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b::decode(&args[0])?;
let a1 = D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c::decode(&args[1])?;
let result = f_f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513(&a0,&a1); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }

pub struct Machine { state: D_d5bf3e4e878e96621f557ab08ab7742a815a7ffcc00bb1961556d9109e028d4b }
impl Machine {
pub fn new(logical: &Value) -> Result<Self,&'static str> { validate_inputs(std::slice::from_ref(logical))?; let input=D_e4a63f17c7b78b52de8557f26f66b17ee0e7f571f3a218833da3981ccf83c629::decode(logical)?; Ok(Self {state:f_01d6e3a29ac67dd6a6fefc4ca626fd08f320649a0688868b68b0d737c8613443(&input)}) }
pub fn snapshot(&self) -> Value { let result=f_93645d95694617d63ff817bc72e7cfa6eab54a55fd95330fc4e1c998ec0518eb(&self.state); (result).encode() }
pub fn restore(&mut self, logical: &Value) -> Result<(),&'static str> { let next=Self::new(logical)?; *self=next; Ok(()) }
pub fn apply(&mut self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"write" if args.len()==1 => { let a0=D_b3d8149f99f9fc391be84a606403e44f817d87ae2e2a931f378523ec12a84e0c::decode(&args[0])?; let reply=f_f464256cea6b87c58742b23ae83017058032bfe09976dfcb36fe6442f0d6b513(&self.state,&a0); let next=f_14736a3d6edb5ba04b040549452ffbb99d6296e9c059d14ff25966d533548b8d(&self.state,&a0); self.state=next; Ok((reply).encode()) },
_=>Err("unknown machine operation or argument count mismatch") } }
pub fn query(&self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"lookup" if args.len()==1 => { let a0=D_d221a5b98c63fc35aeaca82abdd968846eb9022ab3573fea88c391b44d400973::decode(&args[0])?; let result=f_17fef4c1ad5d6c3bea7876e89f3a15ee14963d0cdb6e8a0cb8b6198d365e23bc(&self.state,&a0); Ok((result).encode()) },
_=>Err("unknown machine query or argument count mismatch") } }
}
