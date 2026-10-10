use serde_json::json;
use verified_language::{stateful::Runtime, syntax::parse};
const APP: &str = include_str!("../examples/typed-frames.ink");

#[test]
fn slot_scopes_captures_and_callback_error_frames_preserve_observations() {
    let p = parse(APP).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    for (key, amount) in [(1, 2), (2, 8)] {
        assert!(
            rt.invoke_json("insert", &json!([key, amount]))
                .unwrap()
                .committed
        );
    }
    let before = rt.checkpoint_portable().unwrap();
    for take in [false, true] {
        let result = rt.invoke_json("shadow", &json!([10, take])).unwrap();
        assert_eq!(result.result.json(), json!([{"Some":12},{"Some":18}]));
        assert!(!result.committed);
        assert_eq!(rt.checkpoint_portable().unwrap(), before);
    }
    assert_eq!(
        rt.invoke_json("nested", &json!([99]))
            .unwrap()
            .result
            .json(),
        json!([[4, 10], [10, 16]])
    );
    // A query's ? returns a local Err; the second callback must still execute.
    assert_eq!(
        rt.invoke_json("errors", &json!([])).unwrap().result.json(),
        json!([{"Ok":8},{"Err":"Error.Missing"}])
    );
    let result = rt.invoke_json("emit_list", &json!([7])).unwrap();
    assert!(result.committed);
    assert_eq!(result.events[0].value.json(), json!(17));
    let before = rt.checkpoint_portable().unwrap();
    let result = rt.invoke_json("abort_after_callback", &json!([])).unwrap();
    assert!(!result.committed);
    assert!(result.events.is_empty());
    assert_eq!(result.result.json(), json!({"Err":"Error.Missing"}));
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    let mut restored = Runtime::restore_portable(p, &before).unwrap();
    assert_eq!(
        restored
            .invoke_json("nested", &json!([0]))
            .unwrap()
            .result
            .json(),
        json!([[4, 10], [10, 16]])
    );
    assert_eq!(restored.checkpoint_portable().unwrap(), before);
}

#[test]
fn archived_native_and_wasm_observations_still_match_direct_execution() {
    for mode in ["scan", "maintained", "query-errors"] {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("reports/action-effects-phase1")
            .join(mode);
        let source = std::fs::read_to_string(root.join("source.ink")).unwrap();
        let mut rt = Runtime::new(parse(&source).unwrap()).unwrap();
        if mode == "maintained" {
            let certificate = verified_language::aggregate::prove(
                &parse(include_str!("../knowledge/research/sum-maintenance.lang")).unwrap(),
            )
            .unwrap();
            rt.enable_maintenance(certificate).unwrap();
        }
        let script: serde_json::Value =
            serde_json::from_slice(&std::fs::read(root.join("script.json")).unwrap()).unwrap();
        let expected: serde_json::Value =
            serde_json::from_slice(&std::fs::read(root.join("expected.json")).unwrap()).unwrap();
        for (call, expected) in script
            .as_array()
            .unwrap()
            .iter()
            .zip(expected.as_array().unwrap())
        {
            let result = rt
                .invoke_json(call["call"].as_str().unwrap(), &call["args"])
                .unwrap();
            assert_eq!(
                result.json(),
                expected["outcome"],
                "{mode}: {}",
                call["call"]
            );
            let snapshot: Vec<u8> = expected["snapshot"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_u64().unwrap() as u8)
                .collect();
            assert_eq!(
                rt.checkpoint_portable().unwrap(),
                snapshot,
                "{mode}: {}",
                call["call"]
            );
        }
        assert_eq!(
            script.as_array().unwrap().len(),
            expected.as_array().unwrap().len()
        );
    }
}

#[test]
fn table_resources_cannot_escape_into_values_and_literal_operations_still_work() {
    use verified_language::{action_ir::CheckedActions, core::CheckedModule};
    let prefix = "module roots; state Rows:Table<u32,u32> = Table.empty(); ";
    for source in [
        "query value()->Table<u32,u32> reads(Rows){return Rows;}",
        "query value()->Unit reads(Rows){Rows; return ();}",
        "query value()->Unit reads(Rows){let alias=Rows; return ();}",
        "query value(x:Table<u32,u32>)->Unit{return ();}",
        "keep alias:Table<u32,u32> = Rows;",
        "event escaped:Option<Table<u32,u32>>;",
        "record Holder {table:Table<u32,u32>,}",
        "state Nested:Table<u32,Table<u32,u32>> = Table.empty();",
        "fn identity(x:Table<u32,u32>)->Table<u32,u32>{return x;}",
    ] {
        let error =
            CheckedModule::from_source(parse(&format!("{prefix}{source}")).unwrap()).unwrap_err();
        assert!(error.contains("root"), "{source}: {error}");
    }
    let source = format!("{prefix} query values()->List<u32> reads(Rows) {{return Rows.values().map(fn(Rows)=>Rows+1);}}");
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let actions = CheckedActions::elaborate(&module).unwrap();
    CheckedActions::from_bytes(&module, &actions.bytes().unwrap()).unwrap();
    assert_eq!(
        Runtime::new(module.into_program())
            .unwrap()
            .invoke_json("values", &json!([]))
            .unwrap()
            .result
            .json(),
        json!([])
    );
}
