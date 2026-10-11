//! Fixed word operations. Width, signedness and wrapping counts are semantics,
//! while identities and alternative algorithms belong in external knowledge.
use crate::{stateful::Value, syntax::Type, LangResult};
pub const NAMES: &[&str] = &[
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
    if name == "word_not" {
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
