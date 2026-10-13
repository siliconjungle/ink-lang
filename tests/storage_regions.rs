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

#[test]
fn owned_folds_preserve_refined_elements_and_transaction_boundaries_across_targets() {
    fixture_thread(owned_folds_run);
}
fn owned_folds_run() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/owned-invariant-storage/main.ink");
    let mut p = modules::load(&file).unwrap().program;
    verified_language::contracts::attach(&mut p, serde_json::from_str(include_str!(
        "fixtures/owned-invariant-storage/proofs.json")).unwrap()).unwrap();
    let checked = CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let snapshot = runtime.checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, reply) in [
        ("copy", json!([[]]), json!({"value":[]})),
        ("copy", json!([[{"value":9},{"value":0},{"value":9}]]),
            json!({"value":[{"value":9},{"value":0},{"value":9}]})),
        ("values", json!([[{"value":3},{"value":1},{"value":8}]]), json!({"value":[3,1,8]})),
        ("copy", json!([[{"value":0},{"value":10}]]), json!({"host_error":"contract precondition failed"})),
        ("values", json!([[{"value":u32::MAX}]]), json!({"host_error":"contract precondition failed"})),
    ] {
        assert_eq!(pure(&checked, name, &args), reply);
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":reply,"snapshot":snapshot}));
    }
    let mut current = json!([]);
    for (name, args) in [
        ("current", json!([])),
        ("set", json!([[{"value":3},{"value":1}]])),
        ("abort", json!([[{"value":7}]])),
        ("current", json!([])),
        ("set", json!([[{"value":10}]])),
        ("current", json!([])),
        ("set", json!([[]])),
        ("set", json!([[{"value":9},{"value":9},{"value":0}]])),
    ] {
        let before = runtime.checkpoint_portable().unwrap();
        let reply = match runtime.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(error) => json!({"host_error":error}),
        };
        let after = runtime.checkpoint_portable().unwrap();
        if name == "abort" || !reply["host_error"].is_null() { assert_eq!(before, after); }
        if name == "current" { assert_eq!(reply["outcome"]["result"], current); }
        if name == "set" && reply["host_error"].is_null() {
            current = json!(args[0].as_array().unwrap().iter().map(|item|item["value"].clone()).collect::<Vec<_>>());
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":after}));
    }
    let valid = runtime.checkpoint_portable().unwrap();
    steps.push(json!({"restore":valid}));
    runtime = Runtime::restore_portable(p.clone(), &valid).unwrap();
    let outcome = runtime.invoke_json("current", &json!([])).unwrap();
    steps.push(json!({"call":"current","args":[]}));
    expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let mut logical = verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!([{ "value":10 }]))];
    let forged = verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged).is_err());
    steps.push(json!({"reject_restore":forged}));
    let args=json!([[0,u32::MAX]]);let reply=pure(&checked,"numeric",&args);
    assert_eq!(reply,json!({"value":[1,0]}));
    steps.push(json!({"pure":"numeric","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance("invariant-value-owned-storage",p,&fs::read_to_string(file).unwrap(),steps,expected);
}

#[test]
fn owned_fold_evidence_is_bound_to_the_original_source_and_complete_obligations() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/owned-invariant-storage/main.ink");
    let original = modules::load(file).unwrap().program;
    let evidence: verified_language::contracts::Evidence = serde_json::from_str(include_str!(
        "fixtures/owned-invariant-storage/proofs.json")).unwrap();
    let mut missing = evidence.clone();
    missing.state_proofs.remove("set:invariant:0");
    let mut p = original.clone();
    verified_language::contracts::attach(&mut p, missing).unwrap();
    assert!(CheckedModule::from_source(p).is_err());
    let mut changed = original;
    changed.functions.iter_mut().find(|f| f.name == "values").unwrap().body =
        verified_language::syntax::Expr::Call("list".into(),vec![verified_language::syntax::Expr::Num(99)]);
    assert!(verified_language::contracts::attach(&mut changed, evidence).is_err());
}

#[test]
fn database_authored_measures_execute_imports_generics_and_derived_descent_across_targets() {
    let file=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/authored-measures/main.ink");
    let mut p=modules::load_for_termination(&file).unwrap().program;
    p.termination.knowledge=Some(serde_json::from_str(include_str!("fixtures/authored-measures/proofs.json")).unwrap());
    let checked=CheckedModule::from_source(p.clone()).unwrap();
    let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
    let mut steps=vec![];let mut expected=vec![];
    for (name,args,value) in [
        ("steps",json!([0,1]),json!(0)),
        ("steps",json!([10,3]),json!(3)),
        ("steps",json!([32,1]),json!(32)),
        ("steps",json!([u32::MAX,0]),json!(0)),
        ("steps",json!([u32::MAX,u32::MAX]),json!(1)),
        ("forward",json!([10,3]),json!(7)),
        ("forward",json!([0,0]),json!(0)),
        ("forward",json!([3,10]),json!(0)),
        ("forward",json!([u32::MAX,u32::MAX-2]),json!(2)),
        ("generic",json!([0,"α"]),json!("α")),
        ("generic",json!([17,"value\nline"]),json!("value\nline")),
        ("lex",json!([0,0,u32::MAX]),json!(0)),
        ("lex",json!([0,5,7]),json!(5)),
        ("lex",json!([2,0,3]),json!(8)),
        ("lex",json!([2,2,3]),json!(10)),
    ] {
        let reply=pure(&checked,name,&args);assert_eq!(reply,json!({"value":value}));
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":reply,"snapshot":snapshot}));
    }
    let args=json!([[0,u32::MAX]]);let reply=pure(&checked,"numeric",&args);
    assert_eq!(reply,json!({"value":[1,0]}));
    steps.push(json!({"pure":"numeric","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":reply,"snapshot":snapshot}));
    parity::conformance("generated-parity-authored-measures",p,&fs::read_to_string(file).unwrap(),steps,expected);
}

#[test]
fn scoped_range_borrows_preserve_payloads_owner_lifetimes_and_action_history_across_targets() {
    let file=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/scoped-range-borrows/main.ink");
    let p=modules::load(&file).unwrap().program;
    let checked=CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime=Runtime::new(p.clone()).unwrap();
    let snapshot=runtime.checkpoint_portable().unwrap();
    let mut steps=vec![];let mut expected=vec![];
    let cell=json!({"value":3,"retained":true});
    for (name,args,value) in [
        ("read",json!([[1,2,3,4],1,2,1]),json!(7)),
        ("read",json!([[1,2,3,4],1,2,2]),json!(103)),
        ("read",json!([[1,2,3,4],u32::MAX,u32::MAX,0]),json!(103)),
        ("read",json!([[],0,u32::MAX,0]),json!(99)),
        ("nested",json!([[1,2,3,4]]),json!(3)),
        ("text",json!([["a","α","b"],1,1,0]),json!("α")),
        ("text",json!([["a","α","b"],1,1,1]),json!("fallback")),
        ("cell",json!([[cell],0,1,0]),cell.clone()),
        ("cell",json!([[{"value":u32::MAX,"retained":false}],0,1,0]),json!({"value":u32::MAX,"retained":false})),
        ("cell",json!([[cell],0,0,0]),json!({"value":99,"retained":false})),
        ("window_sum",json!([[1,2,3,4],1,2]),json!(5)),
        ("window_sum",json!([[u32::MAX,1],0,2]),json!(0)),
        ("window_sum",json!([[1,2],u32::MAX,u32::MAX]),json!(0)),
    ] {
        let reply=pure(&checked,name,&args);assert_eq!(reply,json!({"value":value}));
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":reply,"snapshot":snapshot}));
    }
    for (name,args) in [
        ("current",json!([0,u32::MAX])),
        ("set",json!([[1,2,3,4],1,2])),
        ("abort",json!([[99],0,1])),
        ("current",json!([1,2])),
        ("set",json!([[u32::MAX,1],0,2])),
        ("current",json!([0,u32::MAX])),
    ] {
        let before=runtime.checkpoint_portable().unwrap();
        let outcome=runtime.invoke_json(name,&args).unwrap();
        let after=runtime.checkpoint_portable().unwrap();
        if name=="abort" {assert_eq!(before,after);assert!(outcome.events.is_empty());}
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":after}));
    }
    let args=json!([[0,u32::MAX]]);let reply=pure(&checked,"numeric",&args);
    assert_eq!(reply,json!({"value":[1,0]}));
    steps.push(json!({"pure":"numeric","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance("invariant-value-scoped-range",p,&fs::read_to_string(&file).unwrap(),steps.clone(),expected.clone());
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/scoped-range-physical-conformance");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();
    fs::write(root.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
    fs::write(root.join("plan.json"),include_bytes!("fixtures/scoped-range-borrows/plan.json")).unwrap();
    let output=std::process::Command::new("python3").arg("tools/physical_capability_conformance.py")
        .arg("--compiler").arg(env!("CARGO_BIN_EXE_ink"))
        .arg("--root").arg(&root).arg("--plan").arg(root.join("plan.json"))
        .arg("--source").arg(file).output().unwrap();
    assert!(output.status.success(),"{}\n{}",String::from_utf8_lossy(&output.stdout),String::from_utf8_lossy(&output.stderr));
    let generated=fs::read_to_string(root.join("selected.rs")).unwrap();
    assert!(generated.contains("with_range"));
    assert_eq!(generated.matches(").get_unchecked(").count(),1,"the one certified borrowed read must reach literal lowering, without admitting the four unsafe reads");
}

#[test]
fn generic_recursive_tree_traversals_preserve_values_order_abort_and_snapshots_across_targets(){
 let file=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/recursive-trees/main.ink");
 let p=modules::load(&file).unwrap().program;
 let checked=CheckedModule::from_source(p.clone()).unwrap();let mut runtime=Runtime::new(p.clone()).unwrap();
 let leaf=|value:&str|json!({"payload":{"Ok":{"item0":value}}});
 let branch=|values:Vec<Value>|json!({"payload":{"Err":{"item0":values}}});
 let empty=branch(vec![]);let tree=branch(vec![leaf("a"),branch(vec![leaf("α"),empty.clone(),leaf("b")])]);
 let mirrored=branch(vec![branch(vec![leaf("b"),empty.clone(),leaf("α")]),leaf("a")]);
 let mut steps=vec![];let mut expected=vec![];let snapshot=runtime.checkpoint_portable().unwrap();
 for (name,args,value) in [
  ("leaves",json!([empty.clone()]),json!([])),("leaf_count",json!([empty.clone()]),json!(0)),
  ("leaves",json!([tree.clone()]),json!(["a","α","b"])),("leaf_count",json!([tree.clone()]),json!(3)),
  ("mirror",json!([tree.clone()]),mirrored),
  ("from_words",json!([[0,u32::MAX,7]]),json!([0,u32::MAX,7])),
 ] {
  let reply=pure(&checked,name,&args);assert_eq!(reply,json!({"value":value}),"{name}");
  steps.push(json!({"pure":name,"args":args,"cpu_only":true}));expected.push(json!({"reply":reply,"snapshot":snapshot}));
 }
 for (name,args) in [("store",json!([tree,false])),("store",json!([leaf("other"),true])),("words",json!([]))] {
  let before=runtime.checkpoint_portable().unwrap();let outcome=runtime.invoke_json(name,&args).unwrap();let after=runtime.checkpoint_portable().unwrap();
  if name=="store"&&args[1]==true{assert_eq!(before,after);assert!(outcome.events.is_empty());}
  if name=="words"{assert_eq!(outcome.json()["result"],json!(["a","α","b"]));}
  steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":after}));
 }
 let args=json!([[0,u32::MAX]]);let reply=pure(&checked,"numeric",&args);assert_eq!(reply,json!({"value":[1,0]}));
 steps.push(json!({"pure":"numeric","args":args,"expect_gpu":true}));expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
 parity::conformance("generated-parity-recursive-trees",p,&fs::read_to_string(file).unwrap(),steps,expected);
}
