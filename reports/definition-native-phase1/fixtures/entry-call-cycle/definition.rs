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
fn d_3d34228ec16e46cda2161be433f246267d95d762476762f5c2014a6c89212531(v0: u64) -> u64 { d_52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59(v0) }
fn d_52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59(v1: u64) -> u64 { (v1).wrapping_add(1u64) }
pub fn f_52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59(v2: u64) -> u64 { d_3d34228ec16e46cda2161be433f246267d95d762476762f5c2014a6c89212531(v2) }
pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {
"52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59" if args.len() == 1 => {
let a0 = decode_u64(&args[0])?;
let result = f_52776482a4ed88f1811ea2e06a04f9558b250c4b8710de42972a08771e8aaf59(a0); Ok(Value::U64(result)) },
_ => Err("unknown export or argument count mismatch") } }
