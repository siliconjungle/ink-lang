use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

fn source() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/storage-regions/main.ink")
}
fn program() -> CheckedModule {
    let mut p = modules::load(source()).unwrap().program;
    verified_language::contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/storage-regions/proofs.json")).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p).unwrap()
}
fn pure(module: &CheckedModule, name: &str, args: &Value) -> Value {
    let p = module.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let values = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, ty))| eval::Value::from_program_json(v, ty, p).unwrap())
        .collect();
    match eval::call_checked(module, name, values, &mut 10_000_000) {
        Ok(v) => json!({"value":v.json()}),
        Err(e) => json!({"host_error":e}),
    }
}
fn fixture_thread(run: fn()) {
    // Debug-mode checking of this large proof fixture exceeds the test runner's
    // default 2 MiB stack. Proof/AST work and depth limits remain unchanged.
    std::thread::Builder::new()
        .stack_size(16 * 1024 * 1024)
        .spawn(run)
        .unwrap()
        .join()
        .unwrap();
}

#[test]
fn storage_interfaces_execute_and_validate_boundaries_across_targets() {
    fixture_thread(storage_interfaces_run);
}
fn storage_interfaces_run() {
    let checked = program();
    let p = checked.program().clone();
    let arena = json!({"items":[5,6,7],"spans":[
        {"start":0,"count":0},{"start":0,"count":2},{"start":2,"count":1}]});
    let arena_error = p
        .enums
        .iter()
        .find(|(_, v)| v == &&vec!["Limit".to_string(), "Invalid".to_string()])
        .unwrap()
        .0;
    let chunk_error = p
        .enums
        .iter()
        .find(|(_, v)| {
            v == &&vec![
                "Width".to_string(),
                "Limit".to_string(),
                "Invalid".to_string(),
            ]
        })
        .unwrap()
        .0;
    let invalid = json!({"host_error":"contract precondition failed"});
    let cases = vec![
        (
            "arena_roundtrip",
            json!([[], 0]),
            json!({"value":{"Ok":[]}}),
        ),
        (
            "arena_roundtrip",
            json!([[[], []], 0]),
            json!({"value":{"Ok":[[],[]]}}),
        ),
        (
            "arena_roundtrip",
            json!([[[0, u32::MAX], [], [7]], 3]),
            json!({"value":{"Ok":[[0,u32::MAX],[],[7]]}}),
        ),
        (
            "arena_roundtrip",
            json!([[[1, 2], [3]], 2]),
            json!({"value":{"Err":format!("{arena_error}.Limit")}}),
        ),
        (
            "arena_roundtrip",
            json!([[[1]], 0]),
            json!({"value":{"Err":format!("{arena_error}.Limit")}}),
        ),
        (
            "arena_words",
            json!([[[1, 2], [], [3]], u32::MAX]),
            json!({"value":{"Ok":[1,2,3]}}),
        ),
        (
            "arena_lookup",
            json!([arena, 0]),
            json!({"value":{"Some":[]}}),
        ),
        (
            "arena_lookup",
            json!([arena, 1]),
            json!({"value":{"Some":[5,6]}}),
        ),
        (
            "arena_lookup",
            json!([arena, 2]),
            json!({"value":{"Some":[7]}}),
        ),
        (
            "arena_lookup",
            json!([arena, 3]),
            json!({"value":{"None":null}}),
        ),
        (
            "arena_read",
            json!([arena,{"slot":0,"extent":4}]),
            json!({"value":{"None":null}}),
        ),
        (
            "arena_read",
            json!([arena,{"slot":3,"extent":3}]),
            invalid.clone(),
        ),
        (
            "arena_lookup",
            json!([{"items":[1],"spans":[{"start":2,"count":0}]},0]),
            invalid.clone(),
        ),
        (
            "arena_lookup",
            json!([{"items":[1],"spans":[{"start":0,"count":u32::MAX}]},0]),
            invalid.clone(),
        ),
        (
            "arena_lookup",
            json!([{"items":[1],"spans":[{"start":u32::MAX,"count":2}]},0]),
            invalid.clone(),
        ),
        (
            "chunks_roundtrip",
            json!([[], 0]),
            json!({"value":{"Err":format!("{chunk_error}.Width")}}),
        ),
        (
            "chunks_roundtrip",
            json!([[], 2]),
            json!({"value":{"Ok":[]}}),
        ),
        (
            "chunks_roundtrip",
            json!([[0, u32::MAX, 7], 1]),
            json!({"value":{"Ok":[0,u32::MAX,7]}}),
        ),
        (
            "chunks_roundtrip",
            json!([[1, 2, 3, 4, 5], 2]),
            json!({"value":{"Ok":[1,2,3,4,5]}}),
        ),
        (
            "chunks_blocks",
            json!([[1, 2, 3, 4, 5], 2]),
            json!({"value":{"Ok":[[1,2],[3,4],[5]]}}),
        ),
        (
            "chunks_blocks",
            json!([[1, 2, 3, 4], 2]),
            json!({"value":{"Ok":[[1,2],[3,4]]}}),
        ),
        (
            "chunks_blocks",
            json!([[1, 2, 3], u32::MAX]),
            json!({"value":{"Ok":[[1,2,3]]}}),
        ),
        ("chunks_blocks", json!([[], 1]), json!({"value":{"Ok":[]}})),
        (
            "chunks_unwrap",
            json!([{"blocks":[],"width":0}]),
            invalid.clone(),
        ),
        (
            "chunks_unwrap",
            json!([{"blocks":[[]],"width":2}]),
            invalid.clone(),
        ),
        (
            "chunks_unwrap",
            json!([{"blocks":[[1,2,3]],"width":2}]),
            invalid,
        ),
        (
            "chunks_unwrap",
            json!([{"blocks":[[1],[2,3]],"width":3}]),
            json!({"value":[1,2,3]}),
        ),
    ];
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (name, args, reply) in cases {
        assert_eq!(pure(&checked, name, &args), reply, "{name} {args}");
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    for (name, args) in [
        ("set", json!([11])),
        ("abort", json!([19])),
        ("current", json!([])),
    ] {
        let reply = runtime.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let numeric_args = json!([[0, u32::MAX]]);
    let numeric = pure(&checked, "numeric", &numeric_args);
    assert_eq!(numeric, json!({"value":[1,0]}));
    steps.push(json!({"pure":"numeric","args":numeric_args,"expect_gpu":true}));
    expected.push(json!({"reply":numeric,"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance(
        "invariant-value-storage-regions",
        p,
        &fs::read_to_string(source()).unwrap(),
        steps,
        expected,
    );
}

#[test]
fn storage_results_require_replayed_proofs() {
    fixture_thread(storage_proofs_run);
}
fn storage_proofs_run() {
    let mut p = modules::load(source()).unwrap().program;
    let mut evidence: Value =
        serde_json::from_str(include_str!("fixtures/storage-regions/proofs.json")).unwrap();
    for proof in evidence["proofs"].as_object_mut().unwrap().values_mut() {
        *proof = json!("Normalize");
    }
    evidence["knowledge"] = Value::Null;
    verified_language::contracts::attach(&mut p, serde_json::from_value(evidence).unwrap())
        .unwrap();
    assert!(CheckedModule::from_source(p).is_err());
}

#[test]
fn generic_storage_preserves_strings_records_and_nested_payloads_across_targets() {
    fixture_thread(generic_storage_run);
}
fn generic_storage_run() {
    let file =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/storage-generic/main.ink");
    let mut p = modules::load(&file).unwrap().program;
    verified_language::contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/storage-generic/proofs.json")).unwrap(),
    )
    .unwrap();
    let checked = CheckedModule::from_source(p).unwrap();
    let p = checked.program().clone();
    let arena_error = p
        .enums
        .iter()
        .find(|(_, v)| v == &&vec!["Limit".to_string(), "Invalid".to_string()])
        .unwrap()
        .0;
    let chunk_error = p
        .enums
        .iter()
        .find(|(_, v)| {
            v == &&vec![
                "Width".to_string(),
                "Limit".to_string(),
                "Invalid".to_string(),
            ]
        })
        .unwrap()
        .0;
    let first = json!({"name":"α","values":[0,u32::MAX]});
    let second = json!({"name":"","values":[]});
    let cases = vec![
        ("text_rows", json!([[], 0]), json!({"value":{"Ok":[]}})),
        (
            "text_rows",
            json!([[[], ["α", ""], ["line\nend"]], 3]),
            json!({"value":{"Ok":[[],["α",""],["line\nend"]]}}),
        ),
        (
            "text_rows",
            json!([[["a", "b"]], 1]),
            json!({"value":{"Err":format!("{arena_error}.Limit")}}),
        ),
        (
            "text_chunks",
            json!([["α", "", "z"], 2]),
            json!({"value":{"Ok":[["α",""],["z"]]}}),
        ),
        ("text_chunks", json!([[], 1]), json!({"value":{"Ok":[]}})),
        (
            "text_chunks",
            json!([["a"], 0]),
            json!({"value":{"Err":format!("{chunk_error}.Width")}}),
        ),
        (
            "record_rows",
            json!([[[], [first, second], [first]], 3]),
            json!({"value":{"Ok":[[],[first,second],[first]]}}),
        ),
        (
            "record_rows",
            json!([[[first]], 0]),
            json!({"value":{"Err":format!("{arena_error}.Limit")}}),
        ),
        (
            "record_chunks",
            json!([[first, second, first], 2]),
            json!({"value":{"Ok":[first,second,first]}}),
        ),
        (
            "record_chunks",
            json!([[], u32::MAX]),
            json!({"value":{"Ok":[]}}),
        ),
        (
            "nested_rows",
            json!([[[[], [1, 2]], [], [[3]]], 3]),
            json!({"value":{"Ok":[[[],[1,2]],[],[[3]]]}}),
        ),
        (
            "nested_rows",
            json!([[[[1, 2]]], 0]),
            json!({"value":{"Err":format!("{arena_error}.Limit")}}),
        ),
        (
            "text_read",
            json!([{"items":["α",""],"spans":[{"start":0,"count":2}]},{"slot":0,"extent":1}]),
            json!({"value":{"Some":["α",""]}}),
        ),
        (
            "text_read",
            json!([{"items":["α"],"spans":[{"start":0,"count":1}]},{"slot":0,"extent":2}]),
            json!({"value":{"None":null}}),
        ),
        (
            "text_read",
            json!([{"items":["α"],"spans":[{"start":0,"count":2}]},{"slot":0,"extent":1}]),
            json!({"host_error":"contract precondition failed"}),
        ),
    ];
    let snapshot = Runtime::new(p.clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, reply) in cases {
        assert_eq!(pure(&checked, name, &args), reply, "{name} {args}");
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":reply,"snapshot":snapshot}));
    }
    let args = json!([[0, u32::MAX]]);
    let reply = pure(&checked, "numeric", &args);
    assert_eq!(reply, json!({"value":[1,0]}));
    steps.push(json!({"pure":"numeric","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":reply,"snapshot":snapshot}));
    parity::conformance(
        "invariant-value-storage-generic",
        p,
        &fs::read_to_string(file).unwrap(),
        steps,
        expected,
    );
}

#[test]
fn generic_storage_handles_reject_element_type_confusion_and_representation_access() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/storage-generic-rejection");
    fs::create_dir_all(&dir).unwrap();
    let prefix="module storage_rejection;import \"../../knowledge/libraries/storage-regions.ink\" as arena;";
    for source in [
        "fn wrong(value:arena.Arena<String>,handle:arena.Handle<u32>)->Option<List<String>>{return arena.read<String>(value,handle);}",
        "fn reveal(value:arena.Arena<String>)->List<String>{return value.items;}",
        "fn forge()->arena.Handle<String>{return arena.Handle<String>{slot:0,extent:1};}",
    ] {
        let file=dir.join("main.ink");fs::write(&file,format!("{prefix}{source}")).unwrap();
        assert!(modules::load(&file).is_err(),"{source}");
    }
}
