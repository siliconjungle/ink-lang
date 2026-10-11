use serde_json::{json, Value as Json};
use verified_language::{
    action_ir::CheckedActions, action_model::Projection, core::CheckedModule, stateful::Runtime,
    syntax::parse,
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/stateful-numerics.ink");
fn envelope(bits: u32, word: i32) -> Json {
    let sample = json!({"value":{"F32Bits":bits},"point":[{"F32Bits":bits},{"F32Bits":bits^0x80000000}],"trail":[{"F32Bits":bits},{"F32Bits":bits^0x80000000}],"word":word,"signed":[i32::MIN,i32::MAX],"words":[u32::MAX,0]});
    json!({"items":[sample],"maybe":{"Some":sample},"answer":{"Ok":sample}})
}
#[test]
fn numerical_actions_have_explicit_version_and_no_float_proof_authority() {
    let m = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    let checked = CheckedActions::elaborate(&m).unwrap();
    let wire: Json = serde_json::from_slice(&checked.bytes().unwrap()).unwrap();
    assert_eq!(wire["semantics"], "ink-typed-actions-v2");
    assert!(Projection::derive(&m).is_err());
    let archived = CheckedModule::from_source(
        parse(include_str!(
            "../reports/typed-execution-phase1/frames/source.ink"
        ))
        .unwrap(),
    )
    .unwrap();
    CheckedActions::from_bytes(
        &archived,
        include_bytes!("fixtures/typed-actions-v1-numerical-baseline.json"),
    )
    .unwrap();
    let mut old = wire;
    old["semantics"] = json!("ink-typed-actions-v1");
    assert!(CheckedActions::from_bytes(&m, &serde_json::to_vec(&old).unwrap()).is_err());
    let unrelated = CheckedModule::from_source(
        parse("module old;fn unused(x:f32)->f32{return x;}query q(x:u64)->u64{return x;}").unwrap(),
    )
    .unwrap();
    let bytes = CheckedActions::elaborate(&unrelated)
        .unwrap()
        .bytes()
        .unwrap();
    assert_eq!(
        serde_json::from_slice::<Json>(&bytes).unwrap()["semantics"],
        "ink-typed-actions-v1"
    );
    for key in ["f32", "Vec2<f32>", "Vec2<i32>", "Envelope"] {
        let s = SOURCE.replace("Table<i32,Envelope>", &format!("Table<{key},Envelope>"));
        assert!(
            CheckedModule::from_source(parse(&s).unwrap()).is_err(),
            "{key}"
        );
    }
}
#[test]
fn numerical_storage_rollback_events_and_pure_calls_match_all_cpu_paths() {
    let p = parse(SOURCE).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut calls = vec![
        ("increment", json!([i32::MAX])),
        ("increment", json!([i32::MIN])),
        ("checked", json!([i32::MAX, 1])),
        ("checked", json!([i32::MIN, -1])),
        ("checked", json!([-10, 3])),
        ("exact", json!([i32::MIN])),
        ("equal", json!([{"F32Bits":0},{"F32Bits":0x80000000u32}])),
        ("same", json!([envelope(0, 0), envelope(0x80000000, 0)])),
        ("step", json!([[1.0, -2.0], 0.5])),
        ("constructed", json!([1.5, 2.5])),
    ];
    calls.extend([
        ("signed_negated", json!([i32::MIN])),
        ("signed_negated", json!([i32::MAX])),
        ("checked_subtracted", json!([i32::MIN,1])),
        ("checked_subtracted", json!([i32::MAX,-1])),
        ("checked_subtracted", json!([-3,-7])),
        ("checked_multiplied", json!([i32::MIN,-1])),
        ("checked_multiplied", json!([i32::MAX,2])),
        ("checked_multiplied", json!([-3,7])),
        ("signed_sum",json!([[]])),
        ("signed_sum",json!([[i32::MAX,1]])),
        ("triple",json!([[i32::MIN,0,i32::MAX]])),
        ("four",json!([[{ "F32Bits": 0x7f812345u32 },-0.0,{ "F32Bits": 1 },{ "F32Bits": 0x7f800000u32 }]])),
        ("minimum", json!([])),
        ("int_vector", json!([i32::MAX])),
        ("word_vector", json!([0])),
        ("added", json!([16777216.0, 1.0])),
        ("added", json!([-0.0, -0.0])),
        ("multiplied", json!([3.4028234663852886e38, 2.0])),
        ("multiplied", json!([1.401298464324817e-45, 0.5])),
        ("contextual", json!([3.0])),
        ("summed", json!([[]])),
        ("summed", json!([[16777216.0, 1.0, -16777216.0]])),
        ("divided", json!([i32::MIN, -1])),
        ("divided", json!([-7, 2])),
        ("divided", json!([7, 0])),
        (
            "same",
            json!([envelope(0x7fc12345, 1), envelope(0x7fc12346, 1)]),
        ),
    ]);
    for bits in [
        0, 0x80000000, 1, 0x007fffff, 0x00800000, 0x7f800000, 0xff800000, 0x7fc12345, 0x7f812345,
    ] {
        calls.push(("negated", json!([{"F32Bits":bits}])));
        calls.push(("equal", json!([{"F32Bits":bits},{"F32Bits":bits}])));
        calls.push((
            "same",
            json!([envelope(bits, i32::MIN), envelope(bits, i32::MIN)]),
        ));
        calls.push(("put", json!([-1, envelope(bits, i32::MIN), false])));
        calls.push(("get", json!([-1])));
        calls.push(("component", json!([[{"F32Bits":bits},{"F32Bits":bits}]])));
    }
    calls.extend([
        ("put", json!([i32::MIN, envelope(0, i32::MAX), false])),
        ("put", json!([i32::MAX, envelope(1, 1), false])),
        ("store_product", json!([10, -0.0, 1.0, envelope(0, 0)])),
        (
            "store_product",
            json!([11, 1.401298464324817e-45, 0.5, envelope(0, 0)]),
        ),
        (
            "store_product",
            json!([12, 3.4028234663852886e38, 2.0, envelope(0, 0)]),
        ),
        ("rows", json!([])),
        ("put", json!([-1, envelope(0, 0), true])),
        ("get", json!([-1])),
        ("erase", json!([-1])),
        ("aggregate", json!([])),
    ]);
    for (name, args) in calls {
        let reply = rt
            .invoke_json(name, &args)
            .unwrap_or_else(|e| panic!("{name}: {e}"));
        if name == "same" && args[0] == args[1] {
            assert_eq!(reply.result.json(), json!(true));
        }
        let snapshot = rt.checkpoint_portable().unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":snapshot}));
        rt = Runtime::restore_portable(p.clone(), &snapshot).unwrap();
        assert_eq!(snapshot, rt.checkpoint_portable().unwrap());
        steps.push(json!({"restore":snapshot}));
    }
    let xs = vec![
        verified_language::eval::Value::I32(i32::MIN),
        verified_language::eval::Value::I32(i32::MAX),
        verified_language::eval::Value::I32(0),
    ];
    let value = verified_language::eval::call(
        &p,
        "gpu_words",
        vec![verified_language::eval::Value::List(xs)],
        &mut 10000,
    )
    .unwrap()
    .json();
    steps.push(json!({"pure":"gpu_words","args":[[i32::MIN,i32::MAX,0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance("numerical-state-parity", p, SOURCE, steps, expected);
}

#[test]
fn malformed_numerical_inputs_fail_before_state_or_outbox_changes() {
    let p = parse(SOURCE).unwrap();
    let mut rt = Runtime::new(p).unwrap();
    let before = rt.checkpoint_portable().unwrap();
    let mut short = envelope(0, 0);
    short["maybe"]["Some"]["point"] = json!([1.0]);
    let mut badword = envelope(0, 0);
    badword["answer"]["Ok"]["word"] = json!(2147483648u64);
    for (name, args) in [
        ("component", json!([[1.0]])),
        ("negated", json!([1e100])),
        ("negated", json!([{"F32Bits":4294967296u64}])),
        ("negated", json!([{"F32Bits":0,"extra":1}])),
        ("increment", json!([2147483648u64])),
        ("put", json!([0, short, false])),
        ("put", json!([0, badword, false])),
    ] {
        assert!(rt.invoke_json(name, &args).is_err(), "{name}");
        assert_eq!(before, rt.checkpoint_portable().unwrap());
    }
    for source in [
        "module bad;query q()->i32{return 2147483648;}",
        "module bad;query q()->f32{return 16777217;}",
        "module bad;query q(x:f32)->i32{return x;}",
        "module bad;query q(x:f32)->Int{return Int(x);}",
        "module bad;query q(x:Vec2<f32>)->f32{return x.z;}",
    ] {
        assert!(
            CheckedModule::from_source(parse(source).unwrap()).is_err(),
            "{source}"
        );
    }
}
