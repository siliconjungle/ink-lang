//! Fixed scalar/text meanings. Algorithms and optimisation laws stay external.
use crate::{core::Type, stateful::Value as V, LangResult};
pub const NAMES: &[&str] = &[
    "sqrt",
    "f32_div",
    "is_nan",
    "is_finite",
    "floor",
    "ceil",
    "trunc",
    "round_ties_even",
    "f32_bits",
    "f32_from_bits",
    "f32_from_u32",
    "f32_from_u64",
    "f32_from_i32",
    "f32_from_int",
    "int_from_f32",
    "u32_from_f32",
    "u64_from_f32",
    "i32_from_f32",
    "popcount",
    "leading_zeros",
    "trailing_zeros",
    "string_byte_len",
    "string_byte_at",
    "string_slice",
    "string_concat",
    "string_find",
];
pub fn primitive(n: &str) -> bool {
    NAMES.contains(&n)
}
pub fn bit_count(n: &str) -> bool {
    ["popcount", "leading_zeros", "trailing_zeros"].contains(&n)
}
pub fn signature(n: &str, first: Option<&Type>) -> LangResult<(Vec<Type>, Type)> {
    use Type::*;
    let option = |t| Option(Box::new(t));
    Ok(match n {
        "sqrt" | "floor" | "ceil" | "trunc" | "round_ties_even" => (vec![F32], F32),
        "f32_div" => (vec![F32, F32], F32),
        "is_nan" | "is_finite" => (vec![F32], Bool),
        "f32_bits" => (vec![F32], U32),
        "f32_from_bits" => (vec![U32], F32),
        "f32_from_u32" => (vec![U32], F32),
        "f32_from_u64" => (vec![U64], F32),
        "f32_from_i32" => (vec![I32], F32),
        "f32_from_int" => (vec![Int], F32),
        "int_from_f32" => (vec![F32], option(Int)),
        "u32_from_f32" => (vec![F32], option(U32)),
        "u64_from_f32" => (vec![F32], option(U64)),
        "i32_from_f32" => (vec![F32], option(I32)),
        n if bit_count(n) => {
            let t = first.cloned().unwrap_or(U64);
            if !crate::check::is_word(&t) {
                return Err("bit count requires fixed word".into());
            }
            (vec![t], U32)
        }
        "string_byte_len" => (vec![String], U32),
        "string_byte_at" => (vec![String, U32], option(U32)),
        "string_slice" => (vec![String, U32, U32], option(String)),
        "string_concat" => (vec![String, String], String),
        "string_find" => (vec![String, String, U32], option(U32)),
        _ => return Err(format!("unknown fixed primitive {n}")),
    })
}
/// Independent integer square root over the exact significand, with final
/// nearest rounding. The radicand is <2^48; positive results are always normal.
pub fn sqrt_bits(bits: u32) -> u32 {
    let a = bits & 0x7fffffff;
    if a == 0 {
        return bits;
    }
    if a > 0x7f800000 || bits & 0x80000000 != 0 {
        return 0x7fc00000;
    }
    if a == 0x7f800000 {
        return bits;
    }
    let raw = (bits >> 23) & 255;
    let mut m = (bits & 0x7fffff) | if raw == 0 { 0 } else { 1 << 23 };
    let mut e = if raw == 0 { -126 } else { raw as i32 - 127 };
    while m < 1 << 23 {
        m <<= 1;
        e -= 1;
    }
    let odd = e & 1;
    let mut half = (e - odd) / 2;
    let n = (m as u64) << (23 + odd);
    let mut lo = 0u64;
    let mut hi = 1u64 << 24;
    while lo + 1 < hi {
        let mid = (lo + hi) / 2;
        if mid * mid <= n {
            lo = mid
        } else {
            hi = mid
        }
    }
    if n - lo * lo > lo {
        lo += 1;
    }
    if lo == 1 << 24 {
        lo >>= 1;
        half += 1;
    }
    (((half + 127) as u32) << 23) | ((lo as u32) & 0x7fffff)
}
pub fn evaluate(n: &str, a: &[V]) -> LangResult<V> {
    let f = |i| match a.get(i) {
        Some(V::F32(b)) => Ok(f32::from_bits(*b)),
        _ => Err("expected F32".to_string()),
    };
    let u = |i| match a.get(i) {
        Some(V::U32(b)) => Ok(*b),
        _ => Err("expected U32".to_string()),
    };
    let s = |i| match a.get(i) {
        Some(V::String(s)) => Ok(s.as_str()),
        _ => Err("expected String".to_string()),
    };
    let float = |x| V::F32(crate::logic::canonical_f32_bits(x));
    let option = |x: Option<V>| V::Option(x.map(Box::new));
    Ok(match n {
        "sqrt" => V::F32(sqrt_bits(f(0)?.to_bits())),
        "f32_div" => float(f(0)? / f(1)?),
        "is_nan" => V::Bool(f(0)?.is_nan()),
        "is_finite" => V::Bool(f(0)?.is_finite()),
        "floor" => float(f(0)?.floor()),
        "ceil" => float(f(0)?.ceil()),
        "trunc" => float(f(0)?.trunc()),
        "round_ties_even" => float(f(0)?.round_ties_even()),
        "f32_bits" => V::U32(f(0)?.to_bits()),
        "f32_from_bits" => V::F32(u(0)?),
        "f32_from_u32" => float(u(0)? as f32),
        "f32_from_u64" => {
            let Some(V::U64(x)) = a.first() else {
                return Err("expected U64".into());
            };
            float(*x as f32)
        }
        "f32_from_i32" => {
            let Some(V::I32(x)) = a.first() else {
                return Err("expected I32".into());
            };
            float(*x as f32)
        }
        "f32_from_int" => {
            use num_traits::ToPrimitive;
            let Some(V::Int(x)) = a.first() else {
                return Err("expected Int".into());
            };
            float(x.to_f32().ok_or("Int to float conversion")?)
        }
        "int_from_f32" => {
            use num_traits::FromPrimitive;
            option(num_bigint::BigInt::from_f32(f(0)?).map(V::Int))
        }
        "u32_from_f32" => {
            let x = f(0)?.trunc();
            option((x.is_finite() && x >= 0.0 && x < 4294967296.0).then(|| V::U32(x as u32)))
        }
        "u64_from_f32" => {
            let x = f(0)?.trunc();
            option(
                (x.is_finite() && x >= 0.0 && x < 18446744073709551616.0).then(|| V::U64(x as u64)),
            )
        }
        "i32_from_f32" => {
            let x = f(0)?.trunc();
            option(
                (x.is_finite() && x >= -2147483648.0 && x < 2147483648.0).then(|| V::I32(x as i32)),
            )
        }
        n if bit_count(n) => {
            macro_rules! count {
                ($x:expr) => {
                    match n {
                        "popcount" => $x.count_ones(),
                        "leading_zeros" => $x.leading_zeros(),
                        _ => $x.trailing_zeros(),
                    }
                };
            }
            V::U32(match a.first() {
                Some(V::U32(x)) => count!(*x),
                Some(V::U64(x)) => count!(*x),
                Some(V::I32(x)) => count!(*x),
                _ => return Err("expected word".into()),
            })
        }
        "string_byte_len" => V::U32(
            s(0)?
                .len()
                .try_into()
                .map_err(|_| "String exceeds U32 byte length")?,
        ),
        "string_byte_at" => option(
            s(0)?
                .as_bytes()
                .get(u(1)? as usize)
                .map(|b| V::U32(*b as u32)),
        ),
        "string_slice" => option(
            s(0)?
                .get(u(1)? as usize..u(2)? as usize)
                .map(|s| V::String(s.into())),
        ),
        "string_concat" => {
            let x = s(0)?;
            let y = s(1)?;
            if x.len()
                .checked_add(y.len())
                .is_none_or(|n| n > u32::MAX as usize)
            {
                return Err("String exceeds U32 byte length".into());
            }
            V::String(format!("{x}{y}"))
        }
        "string_find" => {
            let text = s(0)?;
            let from = u(2)? as usize;
            option(
                text.get(from..)
                    .and_then(|s| s.find(s_find(a)))
                    .map(|i| V::U32((from + i) as u32)),
            )
        }
        _ => return Err("unsupported fixed primitive".into()),
    })
}
fn s_find(a: &[V]) -> &str {
    if let V::String(s) = &a[1] {
        s
    } else {
        unreachable!("checked String needle")
    }
}
