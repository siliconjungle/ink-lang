use ink_core::{
    core::CheckedModule,
    eval::{self, Value},
    syntax::parse,
};
#[test]
fn exact_float_contract_is_source_bound_and_preserves_transport_bits() {
    for source in [
        "module f;fn q(x:f32)->f32{return x;}",
        "module f;fn q()->Bool{return 1.5+2.5==4.0;}",
        "module f;fn q()->Bool{let x:f32=1;return x==x;}",
    ] {
        let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
        assert_eq!(checked.semantics(), "ink-executable-core-v6");
        assert_eq!(
            CheckedModule::from_bytes(&checked.bytes().unwrap())
                .unwrap()
                .identity()
                .unwrap(),
            checked.identity().unwrap()
        );
        let mut forged: serde_json::Value =
            serde_json::from_slice(&checked.bytes().unwrap()).unwrap();
        forged["semantics"] = "ink-executable-core-v2".into();
        assert!(CheckedModule::from_bytes(&serde_json::to_vec(&forged).unwrap()).is_err());
    }
    let p=parse("module f;fn identity(x:f32)->f32{return x;}fn negative(x:f32)->f32{return -x;}fn plus(x:f32,y:f32)->f32{return x+y;}fn total(xs:List<f32>)->f32{return sum(xs);}").unwrap();
    for bits in [1u32, 0x80000000, 0x7f800000, 0x7fc12345, 0xff812345] {
        assert_eq!(
            eval::call(&p, "identity", vec![Value::F32(bits)], &mut 100000).unwrap(),
            Value::F32(bits)
        );
        assert_eq!(
            eval::call(&p, "negative", vec![Value::F32(bits)], &mut 100000).unwrap(),
            Value::F32(bits ^ 0x80000000)
        );
    }
    assert_eq!(
        eval::call(
            &p,
            "plus",
            vec![Value::F32(0xff812345), Value::F32(1)],
            &mut 100000
        )
        .unwrap(),
        Value::F32(0x7fc00000)
    );
    assert_eq!(
        eval::call(
            &p,
            "total",
            vec![Value::List(vec![Value::F32(0xff812345)])],
            &mut 100000
        )
        .unwrap(),
        Value::F32(0x7fc00000)
    );
    assert_eq!(
        eval::call(&p, "plus", vec![Value::F32(1), Value::F32(1)], &mut 100000).unwrap(),
        Value::F32(2)
    );
}
