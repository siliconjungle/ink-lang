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
fn d_02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1(v0: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7,v1: bool,v2: u64) -> D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 { match v0 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v3,v4,v5) => { if v1 { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C1 } else { if ((*v4) == (18446744073709551615u64)) { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C2 } else { D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8::C0((*v5).wrapping_add(v2),(*v4).wrapping_add(1u64)) } } } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { C0(Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>,u64,u64) }
impl D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7" => match constructor { 0 if arguments.len() == 3 => Ok(Self::C0(Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[0])?),decode_u64(&arguments[1])?,decode_u64(&arguments[2])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2) => Value::Data { datatype: "0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7".into(), constructor: 0, arguments: vec![(b0).encode(),Value::U64(*b1),Value::U64(*b2)] }, } }
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
fn d_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v6: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { match v6 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v7,v8,v9) => { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(Box::new((v9.as_ref()).clone()),*v8,*v7) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { C0,C1(Box<D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6>,Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>) }
impl D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3" => match constructor { 0 if arguments.len() == 0 => Ok(Self::C0),
1 if arguments.len() == 2 => Ok(Self::C1(Box::new(D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6::decode(&arguments[0])?),Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[1])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0 => Value::Data { datatype: "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3".into(), constructor: 0, arguments: vec![] },
Self::C1(b0,b1) => Value::Data { datatype: "3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3".into(), constructor: 1, arguments: vec![(b0).encode(),(b1).encode()] }, } }
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6 { C0(u64,u64) }
impl D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6" => match constructor { 0 if arguments.len() == 2 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1) => Value::Data { datatype: "83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1)] }, } }
}
fn d_8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045(v10: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> u64 { match v10 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v11,v12,v13) => { *v13 } } }
fn d_8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e(v14: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7,v15: bool,v16: u64) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { match v14 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v17,v18,v19) => { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(Box::new(if ((v15) | (((*v18) == (18446744073709551615u64)))) { (v17.as_ref()).clone() } else { d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v17.as_ref(),&(D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6::C0((*v19).wrapping_add(v16),(*v18).wrapping_add(1u64)))) }),if ((v15) | (((*v18) == (18446744073709551615u64)))) { *v18 } else { (*v18).wrapping_add(1u64) },if ((v15) | (((*v18) == (18446744073709551615u64)))) { *v19 } else { (*v19).wrapping_add(v16) }) } } }
fn d_a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa(v20: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> u64 { match v20 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v21,v22,v23) => { *v22 } } }
fn d_a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f(v24: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { match v24 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v25,v26,v27) => { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(*v27,*v26,Box::new((v25.as_ref()).clone())) } } }
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { C0(u64,u64,Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>) }
impl D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3" => match constructor { 0 if arguments.len() == 3 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?,Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2) => Value::Data { datatype: "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1),(b2).encode()] }, } }
}
fn d_cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8(v28: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { match v28 { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(v29,v30,v31) => { (v29.as_ref()).clone() } } }
fn d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v32: &D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3,v33: &D_83e559bfca237f79a99a54a452f70005322a6f8084b008acd83a59c84626c3a6) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { match v32 { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C0 => { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(Box::new((v33).clone()),Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C0)) },D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(v34,v35) => { D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::C1(Box::new((v34.as_ref()).clone()),Box::new(d_cf3430be7175c316fdadc33df598c3d738a94f2812ad2a676e0d593b93a72780(v35.as_ref(),v33))) } } }
pub fn f_02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1(v36: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7,v37: bool,v38: u64) -> D_12b25f00a729b54e79c45592d17ed84a40bfee97eec934b7b304f8862f41e1c8 { d_02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1(v36,v37,v38) }
pub fn f_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v39: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { d_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v39) }
pub fn f_8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045(v40: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> u64 { d_8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045(v40) }
pub fn f_8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e(v41: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7,v42: bool,v43: u64) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { d_8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e(v41,v42,v43) }
pub fn f_a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa(v44: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> u64 { d_a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa(v44) }
pub fn f_a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f(v45: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { d_a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f(v45) }
pub fn f_cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8(v46: &D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7) -> D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3 { d_cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8(v46) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1" if args.len() == 3 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let a1 = decode_bool(&args[1])?;
let a2 = decode_u64(&args[2])?;
let result = f_02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1(&a0,a1,a2); Ok((result).encode()) },
"392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(&a0); Ok((result).encode()) },
"8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045" if args.len() == 1 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let result = f_8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045(&a0); Ok(Value::U64(result)) },
"8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e" if args.len() == 3 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let a1 = decode_bool(&args[1])?;
let a2 = decode_u64(&args[2])?;
let result = f_8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e(&a0,a1,a2); Ok((result).encode()) },
"a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa" if args.len() == 1 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let result = f_a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa(&a0); Ok(Value::U64(result)) },
"a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f" if args.len() == 1 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let result = f_a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f(&a0); Ok((result).encode()) },
"cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8" if args.len() == 1 => {
let a0 = D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::decode(&args[0])?;
let result = f_cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }

pub struct Machine { state: D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 }
impl Machine {
pub fn new(logical: &Value) -> Result<Self,&'static str> { validate_inputs(std::slice::from_ref(logical))?; let input=D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(logical)?; Ok(Self {state:f_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(&input)}) }
pub fn snapshot(&self) -> Value { let result=f_a50deac628a229bc551a039454e73f2934609172d581927d09317e2509543b4f(&self.state); (result).encode() }
pub fn restore(&mut self, logical: &Value) -> Result<(),&'static str> { let next=Self::new(logical)?; *self=next; Ok(()) }
pub fn apply(&mut self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"change" if args.len()==2 => { let a0=decode_bool(&args[0])?;let a1=decode_u64(&args[1])?; let reply=f_02eb5dbf18f3053fbf882506bdfe080e6ada3293dcc697a48433e5263c8d56f1(&self.state,a0,a1); let next=f_8d310a203e2377025bb6c62a14039434bdfa19fc673b3c8ebf8b985e52b5bb9e(&self.state,a0,a1); self.state=next; Ok((reply).encode()) },
_=>Err("unknown machine operation or argument count mismatch") } }
pub fn query(&self, name: &str, args: &[Value]) -> Result<Value,&'static str> { validate_inputs(args)?; match name {
"count" if args.len()==0 => {  let result=f_8be9c83846d7ad00691a44524c5faba3d229ec592b59d870cfe37f5306609045(&self.state); Ok(Value::U64(result)) },
"commit" if args.len()==0 => {  let result=f_a24c360f7b0959f0fabf81544e6135db2c1ff4e8c03133057b76ec2c3af7c3fa(&self.state); Ok(Value::U64(result)) },
"events" if args.len()==0 => {  let result=f_cafeb5a31a1e950d7d84625a8ca46874af5a8a95d2b64110e196068f4fde85f8(&self.state); Ok((result).encode()) },
_=>Err("unknown machine query or argument count mismatch") } }
}
