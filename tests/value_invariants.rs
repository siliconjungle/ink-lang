use serde_json::json;
use std::{fs, path::Path};
use verified_language::{core::CheckedModule, eval, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn imported_invariant_interfaces_validate_on_complete_targets() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let source = root.join("examples/invariant-values.ink");
    let p = verified_language::modules::load(&source).unwrap().program;
    CheckedModule::from_source(p.clone()).unwrap();
    let runtime = Runtime::new(p.clone()).unwrap();
    let snapshot = runtime.checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, want) in [
        ("unique_example", json!([]), json!({"items":[1,2,3]})),
        (
            "unique_elements",
            json!([{"items":[1,2,3]}]),
            json!([1, 2, 3]),
        ),
        ("known_unique", json!([{"items":[]}]), json!(true)),
        ("known_unique", json!([{"items":[u32::MAX,0]}]), json!(true)),
        (
            "known_sorted",
            json!([{"items":[0,0,u32::MAX]}]),
            json!(true),
        ),
        ("known_bound", json!([{"index":2,"limit":3}]), json!(true)),
        (
            "indexed_value",
            json!([{"items":[7,9],"index":1},99]),
            json!(9),
        ),
        (
            "indexed_valid",
            json!([{"items":[7,9],"index":0}]),
            json!(true),
        ),
        ("numeric", json!([[0, u32::MAX]]), json!([1, 0])),
    ] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, values, &mut 10_000_000)
                .unwrap()
                .json(),
            want
        );
        let mut step = json!({"pure":name,"args":args,"cpu_only":name!="numeric"});
        if name == "numeric" {
            step["expect_gpu"] = json!(true);
        }
        steps.push(step);
        expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
    }
    for (name, args) in [
        ("known_unique", json!([{"items":[1,1]}])),
        ("known_sorted", json!([{"items":[2,1]}])),
        ("known_bound", json!([{"index":3,"limit":3}])),
        ("known_bound", json!([{"index":0,"limit":0}])),
        ("indexed_value", json!([{"items":[],"index":0},99])),
        ("indexed_value", json!([{"items":[7],"index":1},99])),
    ] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let error = eval::call(&p, name, values, &mut 10_000_000).unwrap_err();
        assert_eq!(error, "contract precondition failed");
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":{"host_error":error},"snapshot":snapshot}));
    }
    parity::conformance(
        "invariant-values-parity",
        p,
        &fs::read_to_string(source).unwrap(),
        steps,
        expected,
    );
}

#[test]
fn imported_value_declarations_and_predicate_capture_are_linked() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let p = verified_language::modules::load(root.join("examples/invariant-values.ink"))
        .unwrap()
        .program;
    assert_eq!(p.contracts.value_invariants.len(), 4);
    let exported =
        verified_language::optimisation::subject(&CheckedModule::from_source(p).unwrap()).unwrap();
    for name in [
        "known_unique",
        "known_sorted",
        "known_bound",
        "indexed_valid",
    ] {
        assert!(
            exported
                .contexts
                .get(name)
                .is_some_and(|sites| sites.iter().any(|site| !site.conditions.is_empty())),
            "{name}"
        );
    }
    assert!(exported.unavailable.is_empty());
}

#[test]
fn an_importer_cannot_shadow_the_library_invariant_predicate() {
    let root=Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir=root.join("build/invariant-import-isolation");
    fs::create_dir_all(&dir).unwrap();
    let library=root.join("knowledge/libraries/invariant-values.ink");
    let import=format!("module isolation; import {} as checked;",serde_json::to_string(library.to_str().unwrap()).unwrap());
    let invalid=format!("{import} fn unique(items:List<u32>)->Bool{{return true;}}
        fn make()->checked.Unique<u32>{{return checked.wrap_unique<u32>([1,1]);}}");
    fs::write(dir.join("invalid.ink"),invalid).unwrap();
    let p=verified_language::modules::load(dir.join("invalid.ink")).unwrap().program;
    assert!(CheckedModule::from_source(p).is_err());
    let valid=format!("{import} fn unique(items:List<u32>)->Bool{{return true;}}
        fn imported(value:checked.Unique<u32>)->Bool{{return checked.known_unique<u32>(value);}}");
    fs::write(dir.join("valid.ink"),valid).unwrap();
    let p=verified_language::modules::load(dir.join("valid.ink")).unwrap().program;
    CheckedModule::from_source(p.clone()).unwrap();
    let f=p.functions.iter().find(|f|f.name=="imported").unwrap();
    let arg=eval::Value::from_program_json(&json!({"items":[1,1]}),&f.params[0].1,&p).unwrap();
    assert_eq!(eval::call(&p,"imported",vec![arg],&mut 100_000).unwrap_err(),"contract precondition failed");
    assert_eq!(eval::call(&p,"unique",vec![eval::Value::List(vec![])],&mut 1000).unwrap(),eval::Value::Bool(true));
}

#[test]
fn invariant_values_preserve_state_events_rollback_and_checked_restore_across_targets() {
    use verified_language::{contracts, syntax};
    let source = include_str!("../core/tests/fixtures/invariant-value-state.ink");
    assert_eq!(
        source,
        include_str!("../examples/invariant-value-state.ink")
    );
    let mut p = syntax::parse(source).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!(
            "../core/tests/fixtures/invariant-value-state-proofs.json"
        ))
        .unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("read", json!([])),
        ("set", json!([{"value":0}])),
        ("abort", json!([{"value":0}])),
        ("set", json!([{"value":1}])),
        ("read", json!([])),
        ("set", json!([{"value":0}])),
    ] {
        let reply = match runtime.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(error) => json!({"host_error":error}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    assert_eq!(expected[1]["snapshot"], expected[2]["snapshot"]);
    assert_eq!(expected[1]["snapshot"], expected[3]["snapshot"]);
    assert_eq!(
        expected[3]["reply"]["host_error"],
        json!("contract precondition failed")
    );
    let valid = runtime.checkpoint_portable().unwrap();
    steps.push(json!({"restore":valid}));
    runtime = Runtime::restore_portable(p.clone(), &valid).unwrap();
    let reply = runtime.invoke_json("read", &json!([])).unwrap();
    steps.push(json!({"call":"read","args":[]}));
    expected.push(
        json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}),
    );
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!({"value":1}))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance("invariant-value-state-parity", p, source, steps, expected);
}

#[test]
fn one_interface_fact_emits_a_checked_physical_read_on_native_and_wasm() {
    use std::process::Command;
    use verified_language::{physical, planning, syntax};
    let source = include_str!("../core/tests/fixtures/invariant-indexed.ink");
    let p = syntax::parse(source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let plan: physical::Plan = serde_json::from_str(include_str!(
        "../core/tests/fixtures/invariant-indexed.plan.json"
    ))
    .unwrap();
    let checked = physical::check(&module, None, &plan).unwrap();
    assert!(checked.bounds().allows("lookup", &[]));
    assert!(!checked.bounds().allows("other", &[]));
    let package = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        steps: vec![planning::Step::Physical(plan)],
    };
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/invariant-index-physical-parity");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), source).unwrap();
    fs::write(
        root.join("plan.json"),
        serde_json::to_vec(&package).unwrap(),
    )
    .unwrap();
    let runtime = Runtime::new(p.clone()).unwrap();
    let snapshot = runtime.checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, want) in [
        ("lookup", json!([{"items":[7,9],"index":1},99]), json!(9)),
        (
            "lookup",
            json!([{"items":[u32::MAX],"index":0},0]),
            json!(u32::MAX),
        ),
        (
            "other",
            json!([{"items":[7],"index":0},u32::MAX,99]),
            json!(99),
        ),
        ("known", json!([{"items":[7],"index":0}]), json!(true)),
    ] {
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
    }
    for args in [
        json!([{"items":[],"index":0},99]),
        json!([{"items":[7],"index":1},99]),
    ] {
        steps.push(json!({"pure":"lookup","args":args}));
        expected.push(
            json!({"reply":{"host_error":"contract precondition failed"},"snapshot":snapshot}),
        );
    }
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    let output = Command::new("python3")
        .arg("tools/physical_capability_conformance.py")
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&root)
        .arg("--source")
        .arg(root.join("source.ink"))
        .arg("--plan")
        .arg(root.join("plan.json"))
        .output()
        .unwrap();
    fs::write(
        root.join("run.log"),
        [output.stdout.as_slice(), output.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let emitted = fs::read_to_string(root.join("selected.rs")).unwrap();
    let lookup = emitted
        .lines()
        .find(|line| line.contains("pub fn function_l_lookup("))
        .unwrap();
    let other = emitted
        .lines()
        .find(|line| line.contains("pub fn function_l_other("))
        .unwrap();
    assert!(lookup.contains("get_unchecked"));
    assert!(!other.contains("get_unchecked"));
}
