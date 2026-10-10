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
pub enum D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { C0(Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>,u64,u64) }
impl D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7" => match constructor { 0 if arguments.len() == 3 => Ok(Self::C0(Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[0])?),decode_u64(&arguments[1])?,decode_u64(&arguments[2])?)), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2) => Value::Data { datatype: "0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7".into(), constructor: 0, arguments: vec![(b0).encode(),Value::U64(*b1),Value::U64(*b2)] }, } }
}
fn d_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v0: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { match v0 { D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::C0(v1,v2,v3) => { D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7::C0(Box::new((v3.as_ref()).clone()),*v2,*v1) } } }
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
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 { C0(u64,u64,Box<D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3>) }
impl D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3 {
 fn decode(v: &Value) -> Result<Self, &'static str> { match v { Value::Data { datatype, constructor, arguments } if datatype == "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3" => match constructor { 0 if arguments.len() == 3 => Ok(Self::C0(decode_u64(&arguments[0])?,decode_u64(&arguments[1])?,Box::new(D_3cfdfa6c8a872c4c45b999af45b2c8dcbeb3fdf00b40563e7c65846d22e606b3::decode(&arguments[2])?))), _ => Err("constructor or field count mismatch") }, _ => Err("datatype mismatch") } }
 fn encode(&self) -> Value { match self { Self::C0(b0,b1,b2) => Value::Data { datatype: "a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3".into(), constructor: 0, arguments: vec![Value::U64(*b0),Value::U64(*b1),(b2).encode()] }, } }
}
pub fn f_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v4: &D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3) -> D_0ced8edc73e21e330e4c4c158bf32958b9f9718593c86b33ea8c2996b6688ad7 { d_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(v4) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320" if args.len() == 1 => {
let a0 = D_a6664b98a19c588d935cf2499a0228692e61a53222c9cff4344e5197a195a5d3::decode(&args[0])?;
let result = f_392c822266ef77ba2910455f159af541388db68e2d10ca356998956993b51320(&a0); Ok((result).encode()) },
_ => Err("unknown export or argument count mismatch") } }
