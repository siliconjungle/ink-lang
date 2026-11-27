//! Binary64 fixed/reference operations. Syntax, typed values and transport live
//! in their usual core modules; target support and proof admission are separate.
//! Square root uses exact integer significands, independently of target sqrt.

pub const CANONICAL_NAN: u64 = 0x7ff8_0000_0000_0000;

pub fn canonical_bits(value: f64) -> u64 {
    if value.is_nan() { CANONICAL_NAN } else { value.to_bits() }
}

/// Correctly round the square root of a binary64 bit pattern to nearest/even.
/// Positive nonzero roots are normal, including roots of subnormal inputs.
/// Squaring a 53-bit candidate fits in u128; no floating operation is used.
pub fn sqrt_bits(bits: u64) -> u64 {
    let magnitude = bits & 0x7fff_ffff_ffff_ffff;
    if magnitude == 0 { return bits; }
    if magnitude > 0x7ff0_0000_0000_0000 || bits & 0x8000_0000_0000_0000 != 0 {
        return CANONICAL_NAN;
    }
    if magnitude == 0x7ff0_0000_0000_0000 { return bits; }
    let raw = (bits >> 52) & 2047;
    let mut significand = (bits & 0x000f_ffff_ffff_ffff) | if raw == 0 { 0 } else { 1 << 52 };
    let mut exponent = if raw == 0 { -1022 } else { raw as i32 - 1023 };
    while significand < 1 << 52 { significand <<= 1; exponent -= 1; }
    let odd = exponent & 1;
    let mut half = (exponent - odd) / 2;
    let radicand = (significand as u128) << (52 + odd);
    let mut lo = 0u128;
    let mut hi = 1u128 << 53;
    while lo + 1 < hi {
        let mid = (lo + hi) / 2;
        if mid * mid <= radicand { lo = mid; } else { hi = mid; }
    }
    // The squared half-integer midpoint is lo²+lo+1/4. An integer radicand
    // cannot tie there, so comparing the exact integer remainder suffices.
    if radicand - lo * lo > lo { lo += 1; }
    if lo == 1 << 53 { lo >>= 1; half += 1; }
    (((half + 1023) as u64) << 52) | ((lo as u64) & 0x000f_ffff_ffff_ffff)
}

/// Exact host boundary. Raw binary64 payloads use decimal strings because a
/// JSON/JavaScript Number cannot represent every 64-bit word exactly.
pub fn from_json_bits(value:&serde_json::Value)->crate::LangResult<u64>{crate::snapshot_wire::f64_bits_from_json(value)}
pub fn json_bits(bits:u64)->serde_json::Value{crate::snapshot_wire::f64_bits_to_json(bits)}
/// Detect only typed/executable binary64 use. Text containing "F64" does not
/// change an old module's identity. Ordinary older modules retain their version.
pub(crate) fn type_needed(t:&crate::core::Type)->bool {
    use crate::core::Type;
    match t {
        Type::F64=>true,
        Type::List(t)|Type::Buffer(t)|Type::Option(t)|Type::Vector(t,_)=>type_needed(t),
        Type::Result(a,b)|Type::Map(a,b)|Type::Table(a,b)=>type_needed(a)||type_needed(b),
        _=>false,
    }
}
pub(crate) fn needed(p:&crate::core::Program)->bool {
    use crate::core::{Expr,Statement};
    let ty=type_needed;
    fn expr(e:&Expr)->bool {
        let mut found=false;
        crate::analysis::walk(e,|e|{found|=matches!(e,Expr::Double(_));
            if let Expr::Let(_,Some(t),_,_)=e{found|=type_needed(t);}
            if let Expr::Call(n,_)=e{found|=crate::primitives::primitive(n)&&(n.starts_with("f64_")||n.ends_with("_f64"));}
        });found
    }
    fn statements(block:&[Statement])->bool {
        let mut pending=vec![block];
        while let Some(block)=pending.pop(){for s in block{match s {
            Statement::Let(_,annotation,e)=>if annotation.as_ref().is_some_and(type_needed)||expr(e){return true;},
            Statement::If(e,a,b)=>{if expr(e){return true;}pending.extend([a.as_slice(),b.as_slice()]);},
            Statement::Return(e)|Statement::Expr(e)|Statement::Emit(_,e)=>if expr(e){return true;},
        }}}false
    }
    p.records.values().any(|fs|fs.iter().any(|(_,t)|ty(t)))
        ||p.states.iter().chain(&p.keeps).any(|d|ty(&d.ty)||expr(&d.value))
        ||p.events.values().any(ty)
        ||p.functions.iter().any(|f|ty(&f.result)||f.params.iter().any(|(_,t)|ty(t))||expr(&f.body))
        ||p.actions.iter().any(|a|ty(&a.result)||a.params.iter().any(|(_,t)|ty(t))||statements(&a.body))
}

/// Binary64 fixed primitives. Nonfinite arithmetic results canonicalize NaNs;
/// bit reinterpretation/transport never canonicalizes stored payloads.
pub(crate) fn evaluate(n:&str,a:&[crate::stateful::Value])->crate::LangResult<crate::stateful::Value>{
    use crate::stateful::Value as V;
    use num_traits::{ToPrimitive,FromPrimitive};
    let count=if n=="f64_div"{2}else{1};
    if a.len()!=count{return Err(format!("{n}: argument count mismatch"));}
    let f=|i|match a.get(i){Some(V::F64(x))=>Ok(f64::from_bits(*x)),_=>Err("expected f64".to_string())};
    let output=|x|V::F64(canonical_bits(x));
    let option=|x:Option<V>|V::Option(x.map(Box::new));
    Ok(match n {
        "sqrt"=>V::F64(sqrt_bits(f(0)?.to_bits())),
        "f64_div"=>output(f(0)?/f(1)?),
        "is_nan"=>V::Bool(f(0)?.is_nan()),"is_finite"=>V::Bool(f(0)?.is_finite()),
        "floor"=>output(f(0)?.floor()),"ceil"=>output(f(0)?.ceil()),"trunc"=>output(f(0)?.trunc()),"round_ties_even"=>output(f(0)?.round_ties_even()),
        "f64_bits"=>V::U64(f(0)?.to_bits()),
        "f64_from_bits"=>{let V::U64(x)=a[0]else{return Err("expected u64 bits".into());};V::F64(x)},
        "f64_from_f32"=>{let V::F32(x)=a[0]else{return Err("expected f32".into());};output(f32::from_bits(x)as f64)},
        "f32_from_f64"=>V::F32(crate::logic::canonical_f32_bits(f(0)?as f32)),
        "f64_from_u32"=>{let V::U32(x)=a[0]else{return Err("expected u32".into());};output(x as f64)},
        "f64_from_u64"=>{let V::U64(x)=a[0]else{return Err("expected u64".into());};output(x as f64)},
        "f64_from_i32"=>{let V::I32(x)=a[0]else{return Err("expected i32".into());};output(x as f64)},
        "f64_from_int"=>{let V::Int(x)=&a[0]else{return Err("expected Int".into());};output(x.to_f64().ok_or("Int to f64 conversion")?)},
        "int_from_f64"=>option(num_bigint::BigInt::from_f64(f(0)?).map(V::Int)),
        "u32_from_f64"=>{let x=f(0)?.trunc();option((x.is_finite()&&x>=0.0&&x<4294967296.0).then(||V::U32(x as u32)))},
        "u64_from_f64"=>{let x=f(0)?.trunc();option((x.is_finite()&&x>=0.0&&x<18446744073709551616.0).then(||V::U64(x as u64)))},
        "i32_from_f64"=>{let x=f(0)?.trunc();option((x.is_finite()&&x>=-2147483648.0&&x<2147483648.0).then(||V::I32(x as i32)))},
        _=>return Err("unsupported binary64 primitive".into()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn compare(bits: u64) {
        assert_eq!(sqrt_bits(bits), canonical_bits(f64::from_bits(bits).sqrt()), "input {bits:016x}");
    }
    #[test]
    fn signs_payloads_exponent_edges_and_subnormal_boundaries_match_hardware() {
        assert_eq!(sqrt_bits(0),0);
        assert_eq!(sqrt_bits(1u64 << 63),1u64 << 63);
        for sign in [0,1u64<<63] {
            for exponent in 0..=2047u64 {
                for fraction in [0,1,2,0x0007_ffff_ffff_ffff,0x000f_ffff_ffff_fffe,0x000f_ffff_ffff_ffff] {
                    compare(sign | (exponent<<52) | fraction);
                }
            }
        }
    }
    #[test]
    fn independent_integer_rounding_matches_deterministic_raw_bit_samples() {
        let mut state=0x8e9d_5aaa_6391_32dfu64;
        for _ in 0..100_000 {
            state^=state<<13;state^=state>>7;state^=state<<17;
            compare(state);compare(state & 0x7fff_ffff_ffff_ffff);
        }
        // Square and neighboring-input cases cover the exact-result boundary
        // separately from the broad exponent and raw-bit samples.
        for n in 1..10_000u64 {
            let square=((n as f64)*(n as f64)).to_bits();
            compare(square-1);compare(square);compare(square+1);
        }
    }
}
