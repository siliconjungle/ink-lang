use serde_json::{json, Value};
use verified_language::{
    action_model::Projection, core::CheckedModule, stateful::Runtime, syntax::parse,
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/scalable-state.ink");
fn row(n: u64) -> Value {
    json!({"name":format!("row-{n}"),"quantity":n,"small":(n as u32),"signed":(n as i32),"exact":{"Int":format!("-{}000000000000000000000",n)},"weight":{"F32Bits":if n%2==0 {0x7fc12345u32}else{0x80000000u32}}})
}
#[test]
fn batches_intersections_and_touched_row_rollback_preserve_all_observations() {
    let module = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    let projection = Projection::derive(&module).unwrap();
    assert_eq!(projection.actions.len(), module.program().actions.len());
    let mut rt = Runtime::new(module.program().clone()).unwrap();
    let mut requests = vec![
        (
            "batch",
            json!([[9, 1, 9, 3], [row(9), row(1), row(19), row(3)]]),
        ),
        ("keys", json!([])),
        ("values", json!([])),
        ("quantity_total", json!([])),
        ("select", json!([[9, 2, 1], [null, null, null]])),
        ("intersection", json!([])),
        ("restrict", json!([[9, 9, 3, 0, 1]])),
        ("batch", json!([[8, 7], [row(8)]])),
        ("fail", json!([[9, 1, 9], [row(20), row(30), row(40)]])),
        ("keys", json!([])),
        ("values", json!([])),
        ("remove", json!([[9, 9, 999]])),
        ("batch", json!([[], []])),
        ("restrict", json!([[]])),
        ("scan_total", json!([])),
        ("scan_small", json!([])),
        ("scan_signed", json!([])),
        ("scan_exact", json!([])),
        ("scan_weight", json!([])),
        ("count_big", json!([3])),
        ("shifted", json!([u64::MAX])),
    ];
    let mut seed = 0x9e3779b97f4a7c15u64;
    for i in 0..50 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let k = seed % 12;
        requests.push(match i % 5 {
            0 => ("put", json!([k, row(seed)])),
            1 => (
                "batch",
                json!([[k, (k + 1) % 12, k], [row(i), row(i + 1), row(i + 2)]]),
            ),
            2 => ("remove", json!([[k, (k + 3) % 12]])),
            3 => ("fail", json!([[k, k], [row(i), row(i + 1)]])),
            _ => ("intersection", json!([])),
        });
    }
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in requests {
        let before = rt.checkpoint_portable().unwrap();
        let reply = rt.invoke_json(name, &args).unwrap().json();
        let after = rt.checkpoint_portable().unwrap();
        if reply["committed"] == false {
            assert_eq!(before, after, "{name}");
        }
        if name == "keys" && expected.len() == 1 {
            assert_eq!(reply["result"], json!([1, 3, 9]));
        }
        if name == "intersection" && expected.len() == 5 {
            assert_eq!(reply["result"], json!([1, 9]));
        }
        if name == "restrict" && expected.len() == 6 {
            assert_eq!(reply["result"], json!([1, 3, 9]));
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply},"snapshot":after}));
    }
    // A body may write successfully and then fail at the commit boundary.
    let mut checkpoint: Value = serde_json::from_slice(&rt.checkpoint().unwrap()).unwrap();
    checkpoint["version"] = json!(u64::MAX);
    let mut exhausted = Runtime::restore(
        module.program().clone(),
        &serde_json::to_vec(&checkpoint).unwrap(),
    )
    .unwrap();
    steps.push(json!({"restore":exhausted.checkpoint_portable().unwrap()}));
    for (name, args) in [
        ("batch", json!([[0, 9, 0], [row(5), row(6), row(7)]])),
        ("keys", json!([])),
    ] {
        let before = exhausted.checkpoint_portable().unwrap();
        let reply = match exhausted.invoke_json(name, &args) {
            Ok(outcome) => json!({"outcome":outcome.json()}),
            Err(error) => json!({"host_error":error}),
        };
        assert_eq!(exhausted.checkpoint_portable().unwrap(), before);
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":before}));
    }
    parity::conformance(
        "scalable-state-parity",
        module.program().clone(),
        SOURCE,
        steps.clone(),
        expected.clone(),
    );
    parity::conformance_indexed(
        "scalable-state-indexed-parity",
        module.program().clone(),
        SOURCE,
        steps,
        expected,
    );
}
#[test]
fn bulk_permissions_and_argument_types_are_checked() {
    for source in [
        "query bad(ks:List<u64>,vs:List<u64>)->Result<Unit,String> reads(T){return T.put_many(ks,vs);}",
        "query bad()->List<u32> reads(T){return T.keys();}",
        "query bad()->List<u64> reads(T){return T.shared_keys(T.keys());}",
        "query bad()->u64 reads(T){return T.sum_by(fn(v)=>true);}",
        "query bad()->Int reads(T){return T.count_where(fn(v)=>v);}",
        "change bad()->Result<Unit,String> writes(T){T.sum_by(fn(v)=>T.put(v,v));return Ok(());}",
        "query bad(ks:List<u32>)->List<u64> reads(T){return T.intersect_keys(ks);}",
        "change bad(ks:List<u64>)->Result<Unit,String> reads(T){T.remove_many(ks);return Ok(());}",
    ] { assert!(CheckedModule::from_source(parse(&format!("module bad;state T:Table<u64,u64> = Table.empty();{source}")).unwrap()).is_err(),"{source}"); }
}

#[test]
fn bulk_and_shared_keys_preserve_utf8_identity_and_signed_order() {
    const SOURCE: &str = include_str!("../examples/shared-keys.ink");
    let module = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    Projection::derive(&module).unwrap();
    let mut rt = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("text", json!([["𐀀", "\u{e000}", "a", "𐀀"], [1, 2, 3, 4]])),
        ("marks", json!([["𐀀", "a"], [null, null]])),
        ("shared", json!([])),
        ("selected", json!([["𐀀", "\u{e000}", "a", "a"]])),
        ("marks", json!([["x", "y", "\u{e000}"], [null, null, null]])),
        ("shared", json!([])),
        (
            "ids",
            json!([
                [
                    "ffffffffffffffffffffffffffffffff",
                    "00000000000000000000000000000001"
                ],
                [1, 2]
            ]),
        ),
        (
            "ids_query",
            json!([[
                "ffffffffffffffffffffffffffffffff",
                "00000000000000000000000000000001",
                "ffffffffffffffffffffffffffffffff"
            ]]),
        ),
        ("flags", json!([[3, -2, -1, 3], [1, 2, 3, 4]])),
        ("flags_query", json!([])),
    ] {
        let result = rt.invoke_json(name, &args).unwrap().json();
        if name == "selected" {
            assert_eq!(result["result"], json!(["a", "\u{e000}", "𐀀"]));
        }
        if name == "flags_query" {
            assert_eq!(result["result"], json!([-2, -1, 3]));
        }
        steps.push(json!({"call":name,"args":args}));
        expected
            .push(json!({"reply":{"outcome":result},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    parity::conformance(
        "shared-key-domain-parity",
        module.program().clone(),
        SOURCE,
        steps.clone(),
        expected.clone(),
    );
    parity::conformance_indexed(
        "shared-key-domain-indexed-parity",
        module.program().clone(),
        SOURCE,
        steps,
        expected,
    );
}

#[test]
fn structured_preparation_preserves_transactions_restore_and_private_values() {
    let source = format!(
        "{}\n{}",
        include_str!("../examples/structured-keeps.ink"),
        r#"
fn scalar_same(x:f32)->Bool{return x==x;}
query reflexive()->Bool reads(PreparedRows){return PreparedRows==PreparedRows;}
fn scalar_nodes(p:Prepared)->Bool{return p.rows.map(fn(row)=>scalar_same(row.values.at_or(0,0.0))).at_or(0,true);}
query scalar()->Bool reads(PreparedRows){return PreparedRows.fold(fn(p)=>scalar_nodes(p),fn(error)=>true);}
"#
    );
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let mut runtime = Runtime::from_checked(&module).unwrap();
    let node = |name: &str, bits: u32| json!({"name":name,"values":[{"F32Bits":bits},0.5],"next":{"Some":{"name":"child","values":[-0.0],"next":{"None":null}}}});
    let a = node("first 😀", 0x7fa12345);
    let b = node("second", 0x80000000);
    let mut steps = vec![];
    let mut expected = vec![];
    let mut saved = None;
    for (name, args) in [
        ("value", json!([])),
        ("value", json!([])),
        ("names", json!([])),
        ("owner", json!(["ffffffffffffffffffffffffffffffff"])),
        ("value", json!([])),
        ("put", json!([0, a.clone()])),
        ("value", json!([])),
        ("names", json!([])),
        ("appended", json!([])),
        ("names", json!([])),
        ("reflexive", json!([])),
        ("scalar", json!([])),
        ("unrelated", json!([73])),
        ("value", json!([])),
        ("peek_put", json!([0, b.clone()])),
        ("reflexive", json!([])),
        ("scalar", json!([])),
        ("value", json!([])),
        ("names", json!([])),
        ("aborted", json!([0, a.clone()])),
        ("value", json!([])),
        ("names", json!([])),
        ("put", json!([1, a.clone()])),
        ("names", json!([])),
        ("remove", json!([0])),
        ("value", json!([])),
        ("remove", json!([1])),
        ("value", json!([])),
        ("value", json!([])),
        ("names", json!([])),
    ] {
        let before = runtime.checkpoint_portable().unwrap();
        let reply = runtime.invoke_json(name, &args).unwrap();
        let checkpoint = runtime.checkpoint_portable().unwrap();
        if !reply.committed {
            assert_eq!(before, checkpoint);
        }
        if name == "peek_put" {
            saved = Some(checkpoint.clone());
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":checkpoint}));
    }
    let saved = saved.unwrap();
    runtime = Runtime::restore_portable_checked(&module, &saved).unwrap();
    steps.push(json!({"restore":saved}));
    for name in ["value", "names", "appended", "value"] {
        let reply = runtime.invoke_json(name, &json!([])).unwrap();
        steps.push(json!({"call":name,"args":[]}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"pure":"batch","args":[[0.,0.5,-1.]],"expect_gpu":true}));
    expected.push(
        json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":runtime.checkpoint_portable().unwrap()}),
    );
    parity::conformance_checked("structured-keep-parity", &module, &source, steps, expected);
    let directory =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/structured-keep-parity");
    let output = std::process::Command::new("node")
        .arg("tests/fixtures/structured-keeps.mjs")
        .arg(&directory)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
}
