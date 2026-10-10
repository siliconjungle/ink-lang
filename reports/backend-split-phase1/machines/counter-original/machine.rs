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
pub enum D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 { C0(u64,u64),C1,C2 }
impl D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)),
1 if arguments.len() == 0 => Ok(Self::C1),
2 if arguments.len() == 0 => Ok(Self::C2), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] },
Self::C1 => Value::Data { datatype: "12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8".into(), constructor: 1, arguments: vec![] },
Self::C2 => Value::Data { datatype: "12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8".into(), constructor: 2, arguments: vec![] }, } }
}
fn d_27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56(v0: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3,v1: bool,v2: u64) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { match v0 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v3,v4,v5) => { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(if ((v1) | (((*v4) == (18446744073709551615u64)))) { *v3 } else { (*v3).wrapping_add(v2) },if ((v1) | (((*v4) == (18446744073709551615u64)))) { *v4 } else { (*v4).wrapping_add(1u64) },Box::new(if ((v1) | (((*v4) == (18446744073709551615u64)))) { (v5.as_ref()).clone() } else { d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v5.as_ref(),&(D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6::C0((*v3).wrapping_add(v2),(*v4).wrapping_add(1u64)))) })) } } }
fn d_334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1(v6: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> u64 { match v6 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v7,v8,v9) => { *v7 } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { C0,C1(Box<D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6>,Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>) }
impl D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6::decode(&arguments[0])?),Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
fn d_3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06(v10: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3,v11: bool,v12: u64) -> D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 { match v10 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v13,v14,v15) => { if v11 { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C1 } else { if ((*v14) == (18446744073709551615u64)) { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C2 } else { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C0((*v13).wrapping_add(v12),(*v14).wrapping_add(1u64)) } } } } }
fn d_6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e(v16: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> u64 { match v16 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v17,v18,v19) => { *v18 } } }
fn d_6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e(v20: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { match v20 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v21,v22,v23) => { (v23.as_ref()).clone() } } }
fn d_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(v24: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { (v24).clone() }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6 { C0(u64,u64) }
impl D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { C0(u64,u64,Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>) }
impl D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3" => match constructor { 0 if arguments.len() == 3 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?,Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2) => Value::Data { datatype: "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1),(b2).encode()] }, } }
}
fn d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v25: &D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3,v26: &D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { match v25 { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C0 => { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(Box::new((v26).clone()),Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C0)) },D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(v27,v28) => { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(Box::new((v27.as_ref()).clone()),Box::new(d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v28.as_ref(),v26))) } } }
pub fn f_27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56(v29: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3,v30: bool,v31: u64) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { d_27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56(v29,v30,v31) }
pub fn f_334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1(v32: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> u64 { d_334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1(v32) }
pub fn f_3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06(v33: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3,v34: bool,v35: u64) -> D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 { d_3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06(v33,v34,v35) }
pub fn f_6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e(v36: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> u64 { d_6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e(v36) }
pub fn f_6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e(v37: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { d_6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e(v37) }
pub fn f_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(v38: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { d_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(v38) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56" if args.len() == 3 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let a1 = decode_bool(&args[1])?;
let a2 = decode_u64(&args[2])?;
let result = f_27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56(&a0,a1,a2); Ok((result).encode()) },
"334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1(&a0); Ok(Value::U64(result)) },
"3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06" if args.len() == 3 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let a1 = decode_bool(&args[1])?;
let a2 = decode_u64(&args[2])?;
let result = f_3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06(&a0,a1,a2); Ok((result).encode()) },
"6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e(&a0); Ok(Value::U64(result)) },
"6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e(&a0); Ok((result).encode()) },
"6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }

pub struct Machine { state: D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 }
impl Machine {
pub fn new(logical: &Value) -> Result<Self,&'static str> { validate_inputs(std::slice::from_ref(logical))?; let input=D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(logical)?; Ok(Self {state:f_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(&input)}) }
pub fn snapshot(&self) -> Value { let result=f_6d1bc505a0ce6a881e5b4869a2348f97a235dfa8b088dd549bbe8644941055f1(&self.state); (result).encode() }
pub fn restore(&mut self, logical: &Value) -> Result<(),&'static str> { let next=Self::new(logical)?; *self=next; Ok(()) }
pub fn apply(&mut self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"change" if args.len()==2 => { let a0=decode_bool(&args[0])?;let a1=decode_u64(&args[1])?; let reply=f_3ed9193f4cf3842a2794da9b72456e08a8ae9e94e629e915e9a937faf6986b06(&self.state,a0,a1); let next=f_27716c1c74383eb4270bb1b5986366703ab533fcdf928cb74c643d01f0a0ad56(&self.state,a0,a1); self.state=next; Ok((reply).encode()) },
_=>Err("unknown machine operation or argument count mismatch") } }
pub fn query(&self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"count" if args.len()==0 => {  let result=f_334b1661816d98776a86f59eda649158eb3635b1c76ed3fa995a6f971d7dc0d1(&self.state); Ok(Value::U64(result)) },
"commit" if args.len()==0 => {  let result=f_6b5916508ced4e01adb8a8c9e4143152cc8b1370ae8a9eb560dd0486a471168e(&self.state); Ok(Value::U64(result)) },
"events" if args.len()==0 => {  let result=f_6d109839b4b6d4c320256e0d1aeb696f99457d097dbc0bdad61857734732f77e(&self.state); Ok((result).encode()) },
_=>Err("unknown machine query or argument count mismatch") } }
}
