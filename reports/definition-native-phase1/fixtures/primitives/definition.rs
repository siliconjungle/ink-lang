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
fn d_079819e0a4b55246a30bb5ee2c807adaf29724c1dd9a97c056b310bee84f3df9(v0: u64,v1: u64) -> u64 { (v0).wrapping_sub(v1) }
fn d_15c8a28629343254233880b77ee97a356a984366bf9ddde33b8b28e5c77a25bc(v2: bool,v3: bool) -> bool { ((v2) != (v3)) }
fn d_2e6bf817ae07b237bf51d6d4489f20ccc466eb7ae1091b3f6cd804ce38b4ae69(v4: u64,v5: u64) -> bool { ((v4) < (v5)) }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2 { C0(u64,bool) }
impl D_2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_bool(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::Bool(*b1)] }, } }
}
fn d_339af0e705638c7abe37fa15481a12c61ea78af7f7feeb33134e2281b7ee863a(v6: u64,v7: u64) -> u64 { (v6).wrapping_add(v7) }
fn d_4b8404ea1111ab93e00a57a3021129608cdb8b60f1aba443975950dced0df3bb(v8: u64,v9: u64) -> bool { ((v8) >= (v9)) }
fn d_6d591c39527231077cbfe83aaf4feabf770c2e0b270e8e2812e16f85a61b8674(v10: bool,v11: bool) -> bool { ((v10) | (v11)) }
fn d_788fecb9bb855ae07bf0c69752f54ecd3e9bb822952c8bb897c969274c75a90c(v12: u64,v13: u64) -> bool { ((v12) <= (v13)) }
fn d_9516ed8edd757897718aff3398b3c787a591692dfa49dda3f1212e0a1b848684(v14: u64,v15: bool) -> u64 { match &(D_2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2::C0(v14,v15)) { D_2ec49a46d088ef753f63cd6527cb72c3e551422d05408947b7eaaab160d277a2::C0(v16,v17) => { if *v17 { *v16 } else { 9u64 } } } }
fn d_98ecdd7f6172e41daa38dc2a58fa429f16a0227b0c55e9b2cfaf6f19e8ac24fd(v18: u64,v19: u64) -> bool { ((v18) != (v19)) }
fn d_a39553dfb15d00e4f664200ffbdc5b8e608502c2ee5f263073a3d50d8b84b06f(v20: bool,v21: bool) -> bool { ((v20) & (v21)) }
fn d_a6d591de33b22f06c3989717f5b65c55c807b8b8681d5ce52b8c456b69abbd74(v22: bool,v23: bool) -> bool { ((v22) == (v23)) }
fn d_dba1a893b0e58be7fb1632b9e6993c7f146ba38fef989817db23d3d82f98ce4b(v24: u64,v25: u64) -> u64 { (v24).wrapping_mul(v25) }
fn d_dd890755b0bc70d8dd2e8a490465b738b71d2c3ce28517981ee4c4d3141d90eb(v26: u64,v27: u64) -> bool { ((v26) > (v27)) }
fn d_fc9eb7ef46f46681fc6423f340d227a100e77fa7a45b2231151f6f7a23c21a2d(v28: u64,v29: u64) -> bool { ((v28) == (v29)) }
pub fn f_339af0e705638c7abe37fa15481a12c61ea78af7f7feeb33134e2281b7ee863a(v30: u64,v31: u64) -> u64 { d_339af0e705638c7abe37fa15481a12c61ea78af7f7feeb33134e2281b7ee863a(v30,v31) }
pub fn f_079819e0a4b55246a30bb5ee2c807adaf29724c1dd9a97c056b310bee84f3df9(v32: u64,v33: u64) -> u64 { d_079819e0a4b55246a30bb5ee2c807adaf29724c1dd9a97c056b310bee84f3df9(v32,v33) }
pub fn f_dba1a893b0e58be7fb1632b9e6993c7f146ba38fef989817db23d3d82f98ce4b(v34: u64,v35: u64) -> u64 { d_dba1a893b0e58be7fb1632b9e6993c7f146ba38fef989817db23d3d82f98ce4b(v34,v35) }
pub fn f_fc9eb7ef46f46681fc6423f340d227a100e77fa7a45b2231151f6f7a23c21a2d(v36: u64,v37: u64) -> bool { d_fc9eb7ef46f46681fc6423f340d227a100e77fa7a45b2231151f6f7a23c21a2d(v36,v37) }
pub fn f_98ecdd7f6172e41daa38dc2a58fa429f16a0227b0c55e9b2cfaf6f19e8ac24fd(v38: u64,v39: u64) -> bool { d_98ecdd7f6172e41daa38dc2a58fa429f16a0227b0c55e9b2cfaf6f19e8ac24fd(v38,v39) }
pub fn f_2e6bf817ae07b237bf51d6d4489f20ccc466eb7ae1091b3f6cd804ce38b4ae69(v40: u64,v41: u64) -> bool { d_2e6bf817ae07b237bf51d6d4489f20ccc466eb7ae1091b3f6cd804ce38b4ae69(v40,v41) }
pub fn f_788fecb9bb855ae07bf0c69752f54ecd3e9bb822952c8bb897c969274c75a90c(v42: u64,v43: u64) -> bool { d_788fecb9bb855ae07bf0c69752f54ecd3e9bb822952c8bb897c969274c75a90c(v42,v43) }
pub fn f_dd890755b0bc70d8dd2e8a490465b738b71d2c3ce28517981ee4c4d3141d90eb(v44: u64,v45: u64) -> bool { d_dd890755b0bc70d8dd2e8a490465b738b71d2c3ce28517981ee4c4d3141d90eb(v44,v45) }
pub fn f_4b8404ea1111ab93e00a57a3021129608cdb8b60f1aba443975950dced0df3bb(v46: u64,v47: u64) -> bool { d_4b8404ea1111ab93e00a57a3021129608cdb8b60f1aba443975950dced0df3bb(v46,v47) }
pub fn f_a39553dfb15d00e4f664200ffbdc5b8e608502c2ee5f263073a3d50d8b84b06f(v48: bool,v49: bool) -> bool { d_a39553dfb15d00e4f664200ffbdc5b8e608502c2ee5f263073a3d50d8b84b06f(v48,v49) }
pub fn f_6d591c39527231077cbfe83aaf4feabf770c2e0b270e8e2812e16f85a61b8674(v50: bool,v51: bool) -> bool { d_6d591c39527231077cbfe83aaf4feabf770c2e0b270e8e2812e16f85a61b8674(v50,v51) }
pub fn f_a6d591de33b22f06c3989717f5b65c55c807b8b8681d5ce52b8c456b69abbd74(v52: bool,v53: bool) -> bool { d_a6d591de33b22f06c3989717f5b65c55c807b8b8681d5ce52b8c456b69abbd74(v52,v53) }
pub fn f_15c8a28629343254233880b77ee97a356a984366bf9ddde33b8b28e5c77a25bc(v54: bool,v55: bool) -> bool { d_15c8a28629343254233880b77ee97a356a984366bf9ddde33b8b28e5c77a25bc(v54,v55) }
pub fn f_9516ed8edd757897718aff3398b3c787a591692dfa49dda3f1212e0a1b848684(v56: u64,v57: bool) -> u64 { d_9516ed8edd757897718aff3398b3c787a591692dfa49dda3f1212e0a1b848684(v56,v57) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"339af0e705638c7abe37fa15481a12c61ea78af7f7feeb33134e2281b7ee863a" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_339af0e705638c7abe37fa15481a12c61ea78af7f7feeb33134e2281b7ee863a(a0,a1); Ok(Value::U64(result)) },
"079819e0a4b55246a30bb5ee2c807adaf29724c1dd9a97c056b310bee84f3df9" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_079819e0a4b55246a30bb5ee2c807adaf29724c1dd9a97c056b310bee84f3df9(a0,a1); Ok(Value::U64(result)) },
"dba1a893b0e58be7fb1632b9e6993c7f146ba38fef989817db23d3d82f98ce4b" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_dba1a893b0e58be7fb1632b9e6993c7f146ba38fef989817db23d3d82f98ce4b(a0,a1); Ok(Value::U64(result)) },
"fc9eb7ef46f46681fc6423f340d227a100e77fa7a45b2231151f6f7a23c21a2d" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_fc9eb7ef46f46681fc6423f340d227a100e77fa7a45b2231151f6f7a23c21a2d(a0,a1); Ok(Value::Bool(result)) },
"98ecdd7f6172e41daa38dc2a58fa429f16a0227b0c55e9b2cfaf6f19e8ac24fd" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_98ecdd7f6172e41daa38dc2a58fa429f16a0227b0c55e9b2cfaf6f19e8ac24fd(a0,a1); Ok(Value::Bool(result)) },
"2e6bf817ae07b237bf51d6d4489f20ccc466eb7ae1091b3f6cd804ce38b4ae69" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_2e6bf817ae07b237bf51d6d4489f20ccc466eb7ae1091b3f6cd804ce38b4ae69(a0,a1); Ok(Value::Bool(result)) },
"788fecb9bb855ae07bf0c69752f54ecd3e9bb822952c8bb897c969274c75a90c" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_788fecb9bb855ae07bf0c69752f54ecd3e9bb822952c8bb897c969274c75a90c(a0,a1); Ok(Value::Bool(result)) },
"dd890755b0bc70d8dd2e8a490465b738b71d2c3ce28517981ee4c4d3141d90eb" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_dd890755b0bc70d8dd2e8a490465b738b71d2c3ce28517981ee4c4d3141d90eb(a0,a1); Ok(Value::Bool(result)) },
"4b8404ea1111ab93e00a57a3021129608cdb8b60f1aba443975950dced0df3bb" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_u64(&args[1])?;
let result = f_4b8404ea1111ab93e00a57a3021129608cdb8b60f1aba443975950dced0df3bb(a0,a1); Ok(Value::Bool(result)) },
"a39553dfb15d00e4f664200ffbdc5b8e608502c2ee5f263073a3d50d8b84b06f" if args.len() == 2 => {
let a0 = decode_bool(&args[0])?;
let a1 = decode_bool(&args[1])?;
let result = f_a39553dfb15d00e4f664200ffbdc5b8e608502c2ee5f263073a3d50d8b84b06f(a0,a1); Ok(Value::Bool(result)) },
"6d591c39527231077cbfe83aaf4feabf770c2e0b270e8e2812e16f85a61b8674" if args.len() == 2 => {
let a0 = decode_bool(&args[0])?;
let a1 = decode_bool(&args[1])?;
let result = f_6d591c39527231077cbfe83aaf4feabf770c2e0b270e8e2812e16f85a61b8674(a0,a1); Ok(Value::Bool(result)) },
"a6d591de33b22f06c3989717f5b65c55c807b8b8681d5ce52b8c456b69abbd74" if args.len() == 2 => {
let a0 = decode_bool(&args[0])?;
let a1 = decode_bool(&args[1])?;
let result = f_a6d591de33b22f06c3989717f5b65c55c807b8b8681d5ce52b8c456b69abbd74(a0,a1); Ok(Value::Bool(result)) },
"15c8a28629343254233880b77ee97a356a984366bf9ddde33b8b28e5c77a25bc" if args.len() == 2 => {
let a0 = decode_bool(&args[0])?;
let a1 = decode_bool(&args[1])?;
let result = f_15c8a28629343254233880b77ee97a356a984366bf9ddde33b8b28e5c77a25bc(a0,a1); Ok(Value::Bool(result)) },
"9516ed8edd757897718aff3398b3c787a591692dfa49dda3f1212e0a1b848684" if args.len() == 2 => {
let a0 = decode_u64(&args[0])?;
let a1 = decode_bool(&args[1])?;
let result = f_9516ed8edd757897718aff3398b3c787a591692dfa49dda3f1212e0a1b848684(a0,a1); Ok(Value::U64(result)) },
_ => Err("unknown export or argument count mismatch") } }
