use ink_core::{
    core::{CheckedModule, PRIMITIVE_SEMANTICS},
    eval, primitives,
    syntax::parse,
};
use serde_json::json;
#[test]
fn new_operations_bind_a_new_core_and_fail_closed_on_wrong_types() {
    let m=CheckedModule::from_source(parse("module math;fn root(x:f32)->f32{return sqrt(x);}fn divide(x:f32,y:f32)->f32{return x/y;}").unwrap()).unwrap();
    assert_eq!(m.semantics(), PRIMITIVE_SEMANTICS);
    assert_eq!(
        m.bytes().unwrap(),
        CheckedModule::from_bytes(&m.bytes().unwrap())
            .unwrap()
            .bytes()
            .unwrap()
    );
    let mut old: serde_json::Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    old["semantics"] = json!("ink-executable-core-v10");
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&old).unwrap()).is_err());
    for body in [
        "fn root(x:u32)->u32{return sqrt(x);}",
        "fn root(x:u32)->u32{return x/2;}",
        "fn root(x:f32)->f32{return floor(x,x);}",
        "fn sqrt(x:f32)->f32{return x;}",
        "fn root(x:String)->u32{return popcount(x);}",
    ] {
        assert!(
            CheckedModule::from_source(parse(&format!("module bad;{body}")).unwrap()).is_err(),
            "{body}"
        );
    }
}
#[test]
fn reference_sqrt_uses_exact_integer_rounding() {
    let known = [
        (0, 0),
        (0x80000000, 0x80000000),
        (0x3f800000, 0x3f800000),
        (0x40800000, 0x40000000),
        (0x40000000, 0x3fb504f3),
        (0x7f800000, 0x7f800000),
        (0xff800000, 0x7fc00000),
        (0x7fa12345, 0x7fc00000),
        (0xbf800000, 0x7fc00000),
    ];
    for (x, y) in known {
        assert_eq!(primitives::sqrt_bits(x), y);
    }
    let mut x = 123u32;
    for _ in 0..50000 {
        x = x.wrapping_mul(1664525).wrapping_add(1013904223);
        let expected = ink_core::logic::canonical_f32_bits(f32::from_bits(x).sqrt());
        assert_eq!(primitives::sqrt_bits(x), expected, "{x:08x}");
    }
    // Exponent boundaries, all subnormal normalisation lengths, values adjacent
    // to squares and significand carry boundaries supplement uniform raw bits.
    for exponent in 0..255u32 {
        for mantissa in [0, 1, 2, 0x3fffff, 0x400000, 0x7ffffd, 0x7ffffe, 0x7fffff] {
            let x = (exponent << 23) | mantissa;
            assert_eq!(
                primitives::sqrt_bits(x),
                ink_core::logic::canonical_f32_bits(f32::from_bits(x).sqrt())
            );
        }
    }
    for i in 0..23 {
        for x in [(1u32 << i) - 1, 1 << i, (1 << i) + 1] {
            assert_eq!(
                primitives::sqrt_bits(x),
                ink_core::logic::canonical_f32_bits(f32::from_bits(x).sqrt())
            );
        }
    }
}
#[test]
fn float_division_rounding_and_utf8_coordinates_have_fixed_meanings() {
    let p=parse("module p;fn quotient(x:f32,y:f32)->f32{return x/y;}fn integral(x:f32)->f32{return round_ties_even(x);}fn substring(s:String,a:u32,b:u32)->Option<String>{return string_slice(s,a,b);}fn locate(s:String,n:String,a:u32)->Option<u32>{return string_find(s,n,a);}").unwrap();
    let run = |name, args: serde_json::Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let a = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        eval::call(&p, name, a, &mut 10000).unwrap().json()
    };
    assert_eq!(
        run("quotient", json!([0.0, 0.0])),
        json!({"F32Bits":0x7fc00000u32})
    );
    for (x, y) in [(0.5, 0.0), (1.5, 2.0), (2.5, 2.0), (-1.5, -2.0)] {
        assert_eq!(run("integral", json!([x])), json!(y));
    }
    assert_eq!(
        run("substring", json!(["aé😀z", 1, 3])),
        json!({"Some":"é"})
    );
    assert_eq!(
        run("substring", json!(["aé😀z", 2, 3])),
        json!({"None":null})
    );
    assert_eq!(run("locate", json!(["aé😀z", "😀", 0])), json!({"Some":3}));
    assert_eq!(run("locate", json!(["aé😀z", "", 2])), json!({"None":null}));
}
#[test]
fn closed_new_operations_replay_in_the_semantic_proof_kernel() {
    use ink_core::{
        laws::{self, Catalogue, CheckedCatalogue, Law, Proof},
        optimisation, registry, semantic,
    };
    let p=parse("module proofs;fn root()->f32{return sqrt(4.0);}fn cast()->Option<Int>{return int_from_f32(42.0);}fn bytes()->Option<String>{return string_slice(\"aé😀\",1,3);}").unwrap();
    let m = CheckedModule::from_source(p).unwrap();
    let subject = optimisation::subject(&m).unwrap();
    let s = semantic::value;
    let word = |ty, n| semantic::term(s(ty), semantic::Node::Word(n));
    for (name, to) in [
        (
            "root",
            semantic::term(
                s(ink_core::syntax::Type::F32),
                semantic::Node::Float(2f32.to_bits()),
            ),
        ),
        (
            "cast",
            semantic::op(
                s(ink_core::syntax::Type::Option(Box::new(
                    ink_core::syntax::Type::Int,
                ))),
                "call:Some",
                vec![word(ink_core::syntax::Type::Int, 42)],
            ),
        ),
        (
            "bytes",
            semantic::op(
                s(ink_core::syntax::Type::Option(Box::new(
                    ink_core::syntax::Type::String,
                ))),
                "call:Some",
                vec![semantic::term(
                    s(ink_core::syntax::Type::String),
                    semantic::Node::String("é".into()),
                )],
            ),
        ),
    ] {
        let law = Law {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            types: vec![],
            assumptions: vec![],
            params: Default::default(),
            conditions: vec![],
            from: subject.functions[name].clone(),
            to,
            proof: Proof::Normalize,
            dependencies: vec![],
            definition_context: None,
        };
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let c = Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: [(id, law)].into(),
        };
        CheckedCatalogue::check(&c, m.program()).unwrap();
    }
}
