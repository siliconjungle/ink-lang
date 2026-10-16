use ink_core::{
    action_model::Projection,
    core::CheckedModule,
    logic::{self, Context, Proof, Term},
    stateful::Runtime,
    syntax,
};
use serde_json::json;

// Integer-only round-to-nearest, ties-to-even oracle; no host float conversion.
fn oracle(magnitude: u64, negative: bool) -> u32 {
    if magnitude == 0 {
        return 0;
    }
    let mut exponent = 63 - magnitude.leading_zeros();
    let mut significand = if exponent <= 23 {
        magnitude << (23 - exponent)
    } else {
        let shift = exponent - 23;
        let integral = magnitude >> shift;
        let remainder = magnitude & ((1u64 << shift) - 1);
        let halfway = 1u64 << (shift - 1);
        integral + u64::from(remainder > halfway || (remainder == halfway && integral & 1 != 0))
    };
    if significand == 1 << 24 {
        significand >>= 1;
        exponent += 1;
    }
    (u32::from(negative) << 31) | ((exponent + 127) << 23) | (significand as u32 & 0x7fffff)
}
fn conversion(op: &str, word: u64) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(Term::U64(word)),
        right: Box::new(Term::U64(0)),
    }
}
#[test]
fn fixed_width_float_meanings_match_integer_rounding_and_reject_wrong_results() {
    let mut words = vec![
        0,
        1,
        2,
        (1 << 24) - 1,
        1 << 24,
        (1 << 24) + 1,
        (1 << 24) + 3,
        u32::MAX as u64,
        1 << 32,
        (1 << 63) - 1,
        1 << 63,
        (1 << 63) + 1,
        u64::MAX,
    ];
    let mut next = 0x6a09e667f3bcc909u64;
    for _ in 0..1024 {
        next = next.wrapping_mul(6364136223846793005).wrapping_add(1);
        words.push(next);
    }
    for word in words {
        let signed = word as u32 as i32;
        for (op, expected) in [
            ("f32:from_u32", oracle(word as u32 as u64, false)),
            ("f32:from_u64", oracle(word, false)),
            (
                "f32:from_i32",
                oracle((signed as i64).unsigned_abs(), signed < 0),
            ),
        ] {
            assert_eq!(
                logic::f32_primitive(op, word, 0).unwrap(),
                Term::U64(expected as u64)
            );
            let term = conversion(op, word);
            assert_eq!(
                Context::default().evaluate(&[], &term).unwrap(),
                Term::U64(expected as u64)
            );
        }
    }
    let term = conversion("f32:from_u32", 16777217);
    let wrong = Term::U64(16777218f32.to_bits() as u64);
    assert!(Context::default()
        .check(
            &[],
            &[],
            &term,
            &wrong,
            &Proof::Convert {
                from: term.clone(),
                to: wrong.clone()
            }
        )
        .is_err());
    assert!(Context::default()
        .evaluate(&[], &conversion("f32:from_u16", 7))
        .is_err());
}

#[test]
fn direct_and_helper_action_correspondence_keep_all_conversion_bits() {
    let source="module conversions;state Marker:Table<u32,u32>=Table.empty();fn helper32(x:u32)->u32{return f32_bits(f32_from_u32(x));}fn helper64(x:u64)->u32{return f32_bits(f32_from_u64(x));}fn helper_signed(x:i32)->u32{return f32_bits(f32_from_i32(x));}query direct32(x:u32)->u32{return f32_bits(f32_from_u32(x));}query direct64(x:u64)->u32{return f32_bits(f32_from_u64(x));}query direct_signed(x:i32)->u32{return f32_bits(f32_from_i32(x));}query pure32(x:u32)->u32{return helper32(x);}query pure64(x:u64)->u32{return helper64(x);}query pure_signed(x:i32)->u32{return helper_signed(x);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let model = Projection::derive(&module).unwrap();
    let context = model.context().unwrap();
    let empty = Term::Construct {
        datatype: model.tables[0].datatype.clone(),
        constructor: 0,
        arguments: vec![],
    };
    let initial = Term::Construct {
        datatype: model.state.clone(),
        constructor: 0,
        arguments: vec![empty],
    };
    for word in [
        0,
        1,
        (1u64 << 24) + 1,
        (1 << 24) + 3,
        u32::MAX as u64,
        (1 << 63) - 1,
        1 << 63,
        u64::MAX,
    ] {
        let signed = word as u32 as i32;
        for (direct, pure, encoded, input, wanted) in [
            (
                "direct32",
                "pure32",
                word as u32 as u64,
                json!([word as u32]),
                oracle(word as u32 as u64, false),
            ),
            (
                "direct64",
                "pure64",
                word,
                json!([word]),
                oracle(word, false),
            ),
            (
                "direct_signed",
                "pure_signed",
                signed as u32 as u64,
                json!([signed]),
                oracle((signed as i64).unsigned_abs(), signed < 0),
            ),
        ] {
            for name in [direct, pure] {
                let mut runtime = Runtime::from_checked(&module).unwrap();
                assert_eq!(
                    runtime.invoke_json(name, &input).unwrap().result.json(),
                    json!(wanted)
                );
                let call = Term::Call {
                    function: model.actions[name].function.clone(),
                    arguments: vec![initial.clone(), Term::U64(0), Term::U64(encoded)],
                };
                let Term::Construct { arguments, .. } = context.evaluate(&[], &call).unwrap()
                else {
                    panic!()
                };
                assert_eq!(arguments[0], Term::U64(wanted as u64));
                assert_eq!(arguments[3], initial);
            }
        }
    }
}
