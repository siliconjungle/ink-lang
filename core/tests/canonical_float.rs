use ink_core::{
    core::{CheckedModule, CANONICAL_FLOAT_SEMANTICS},
    eval,
    logic::{f32_primitive, Term},
    stateful::Runtime,
    syntax::parse,
};
use serde_json::json;
#[test]
fn arithmetic_is_canonical_but_transport_and_negation_preserve_payloads() {
    let source="module floats;fn add(a:f32,b:f32)->f32{return a+b;}fn identity(a:f32)->f32{return a;}fn neg(a:f32)->f32{return -a;}query arithmetic(a:f32,b:f32)->f32{return a+b;}";
    let p = parse(source).unwrap();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(m.semantics(), CANONICAL_FLOAT_SEMANTICS);
    let payload = 0x7fa12345u32;
    for (name, wanted) in [("identity", payload), ("neg", payload ^ 0x80000000)] {
        let v = eval::call(&p, name, vec![eval::Value::F32(payload)], &mut 10000).unwrap();
        assert_eq!(v, eval::Value::F32(wanted));
    }
    for (a, b) in [
        (payload, 0),
        (0x7fc54321, 0xffc01234),
        (0x7f800000, 0xff800000),
    ] {
        assert_eq!(
            f32_primitive("f32:+", a as u64, b as u64).unwrap(),
            Term::U64(0x7fc00000)
        );
        assert_eq!(
            eval::call(
                &p,
                "add",
                vec![eval::Value::F32(a), eval::Value::F32(b)],
                &mut 10000
            )
            .unwrap(),
            eval::Value::F32(0x7fc00000)
        );
        let mut rt = Runtime::new(p.clone()).unwrap();
        assert_eq!(
            rt.invoke_json("arithmetic", &json!([{"F32Bits":a},{"F32Bits":b}]))
                .unwrap()
                .result
                .json(),
            json!({"F32Bits":0x7fc00000u32})
        );
    }
    let mut old: serde_json::Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    old["semantics"] = json!("ink-executable-core-v4");
    assert!(
        CheckedModule::from_bytes(&serde_json::to_vec(&old).unwrap())
            .unwrap_err()
            .contains("version")
    );
}
