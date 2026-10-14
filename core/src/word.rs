//! Fixed word operations. Width, signedness and wrapping counts are semantics,
//! while identities and alternative algorithms belong in external knowledge.
use crate::{stateful::Value, syntax::Type, LangResult};
pub const NAMES: &[&str] = &[
    "word_widen_u32_to_u64",
    "word_narrow_u64_to_u32",
    "word_not",
    "word_and",
    "word_or",
    "word_xor",
    "wrapping_shl",
    "wrapping_shr",
    "rotate_left",
    "rotate_right",
];
pub fn primitive(name: &str) -> bool {
    NAMES.contains(&name)
}
pub fn conversion(name: &str) -> Option<(Type,Type)> {
    match name {
        "word_widen_u32_to_u64" => Some((Type::U32,Type::U64)),
        "word_narrow_u64_to_u32" => Some((Type::U64,Type::U32)),
        _ => None,
    }
}
pub fn unary(name: &str) -> bool {name == "word_not" || conversion(name).is_some()}
pub fn count(name: &str) -> bool {
    [
        "wrapping_shl",
        "wrapping_shr",
        "rotate_left",
        "rotate_right",
    ]
    .contains(&name)
}
pub fn arguments(name: &str, result: &Type) -> Vec<Type> {
    if let Some((input,_))=conversion(name) {
        vec![input]
    } else if name == "word_not" {
        vec![result.clone()]
    } else {
        vec![
            result.clone(),
            if count(name) {
                Type::U32
            } else {
                result.clone()
            },
        ]
    }
}
pub fn evaluate(name: &str, args: &[Value]) -> LangResult<Value> {
    if conversion(name).is_some() {
        return match (name,args) {
            ("word_widen_u32_to_u64",[Value::U32(x)]) => Ok(Value::U64(u64::from(*x))),
            ("word_narrow_u64_to_u32",[Value::U64(x)]) => Ok(Value::U32(*x as u32)),
            _ => Err("word conversion arity or input type".into()),
        };
    }
    macro_rules! apply {
        ($a:expr,$t:ty,$variant:ident) => {{
            let a = *$a;
            let result = if name == "word_not" {
                !a
            } else if count(name) {
                let Some(Value::U32(k)) = args.get(1) else {
                    return Err("word shift expects u32 count".into());
                };
                match name {
                    "wrapping_shl" => a.wrapping_shl(*k),
                    "wrapping_shr" => a.wrapping_shr(*k),
                    "rotate_left" => a.rotate_left(*k),
                    _ => a.rotate_right(*k),
                }
            } else {
                let Some(Value::$variant(b)) = args.get(1) else {
                    return Err("word operands differ".into());
                };
                match name {
                    "word_and" => a & b,
                    "word_or" => a | b,
                    "word_xor" => a ^ b,
                    _ => return Err("unknown word operation".into()),
                }
            };
            Ok(Value::$variant(result))
        }};
    }
    if !primitive(name) || args.len() != if name == "word_not" { 1 } else { 2 } {
        return Err("word operation arity".into());
    }
    match &args[0] {
        Value::U32(a) => apply!(a, u32, U32),
        Value::U64(a) => apply!(a, u64, U64),
        Value::I32(a) => apply!(a, i32, I32),
        _ => Err("word operation requires fixed integers".into()),
    }
}
