use ink_core::{core::Type, LangResult};
pub fn expression(n: &str, a: &[String], first: Option<&Type>, native: bool) -> LangResult<String> {
    let x = &a[0];
    if first==Some(&Type::F64)&&ink_core::primitives::floating_operation(n){
        return Ok(match n{
            "is_nan"=>format!("Number.isNaN(__dfNumber({x}))"),
            "is_finite"=>format!("Number.isFinite(__dfNumber({x}))"),
            "round_ties_even"=>format!("__ink_round_even_f64(__dfNumber({x}))"),
            _=>format!("Math.{n}(__dfNumber({x}))"),
        });
    }
    let number = |x: &str| format!("{}({x})", if native { "__nfNumber" } else { "__float" });
    let float = |x: String| format!("{}({x})", if native { "Math.fround" } else { "__bits" });
    Ok(match n {
        "f64_div"=>format!("(__dfNumber({x})/__dfNumber({}))",a[1]),
        "f64_bits"=>format!("__dfBits({x})"),
        "f64_from_bits"=>format!("__dfFromBits({x})"),
        "f64_from_f32"=>format!("{}({x})",if native{"__nfNumber"}else{"__float"}),
        "f32_from_f64"=>float(format!("__dfNumber({x})")),
        "f64_from_u32"|"f64_from_i32"=>x.clone(),
        "f64_from_u64"|"f64_from_int"=>format!("Number({x})"),
        "int_from_f64"=>format!("__ink_int_from_float(__dfNumber({x}))"),
        "u32_from_f64"|"u64_from_f64"|"i32_from_f64"=>format!("__ink_from_float(__dfNumber({x}),{:?})",&n[..3]),
        "sqrt" | "floor" | "ceil" | "trunc" => float(format!("Math.{n}({})", number(x))),
        "round_ties_even" => float(format!("__ink_round_even({})", number(x))),
        "f32_div" => float(format!("({})/({})", number(x), number(&a[1]))),
        "is_nan" => format!("Number.isNaN({})", number(x)),
        "is_finite" => format!("Number.isFinite({})", number(x)),
        "f32_bits" => {
            if native {
                format!("__nfBits({x})")
            } else {
                x.clone()
            }
        }
        "f32_from_bits" => {
            if native {
                format!("__nfFromBits({x})")
            } else {
                x.clone()
            }
        }
        "f32_from_u32" | "f32_from_i32" => float(x.clone()),
        "f32_from_u64" | "f32_from_int" => float(format!("__ink_big_float({x})")),
        "int_from_f32" => format!("__ink_int_from_float({})", number(x)),
        "u32_from_f32" | "u64_from_f32" | "i32_from_f32" => {
            format!("__ink_from_float({}, {:?})", number(x), &n[..3])
        }
        "popcount" | "leading_zeros" | "trailing_zeros" => format!(
            "__ink_count({x},{:?},{})",
            n,
            if first == Some(&Type::U64) { 64 } else { 32 }
        ),
        "string_byte_len" => format!("__ink_byte_len({x})"),
        "string_byte_at" => format!("__ink_byte_at({x},{})", a[1]),
        "string_slice" => format!("__ink_slice({x},{},{})", a[1], a[2]),
        "string_concat" => format!("__ink_concat({x},{})", a[1]),
        "string_find" => format!("__ink_find({x},{},{})", a[1], a[2]),
        _ => return Err("unsupported primitive in JavaScript lowering".into()),
    })
}
