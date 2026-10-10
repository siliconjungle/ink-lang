use serde_json::json;
use sha2::{Digest, Sha256};
use std::{fs, path::Path};
use verified_language::{
    core::{CheckedModule, Expr},
    eval::{self, Value},
    implementation::{self, Package, ReplacementPackage},
    native, stateful, syntax,
};

fn pure() -> syntax::Program {
    syntax::parse("module sample; fn f(xs: List<u64>, offset: u64) -> u64 { return foldr(xs, 0, fn(x) => fn(rest) => rest * 3 + x + offset); }").unwrap()
}
fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

#[test]
fn checked_core_roundtrips_preserve_full_width_order_and_native_source() {
    let program = pure();
    let checked = CheckedModule::from_source(program.clone()).unwrap();
    let restored = CheckedModule::from_bytes(&checked.bytes().unwrap()).unwrap();
    assert_eq!(checked.identity().unwrap(), restored.identity().unwrap());
    assert_eq!(
        native::emit(&program).unwrap(),
        native::emit(restored.pure_program().unwrap()).unwrap()
    );
    for xs in [vec![], vec![0, 1, 3], vec![u64::MAX, 1 << 63, u64::MAX - 1]] {
        let args = vec![
            Value::List(xs.iter().copied().map(Value::U64).collect()),
            Value::U64(u64::MAX),
        ];
        // Independent right-to-left modular oracle; order matters here.
        let expected = xs.iter().rev().fold(0u64, |rest, x| {
            rest.wrapping_mul(3).wrapping_add(*x).wrapping_add(u64::MAX)
        });
        assert_eq!(
            eval::call(restored.program(), "f", args, &mut 10000).unwrap(),
            Value::U64(expected)
        );
    }
    let pretty = serde_json::to_vec_pretty(
        &serde_json::from_slice::<serde_json::Value>(&checked.bytes().unwrap()).unwrap(),
    )
    .unwrap();
    assert_eq!(
        CheckedModule::from_bytes(&pretty)
            .unwrap()
            .identity()
            .unwrap(),
        checked.identity().unwrap()
    );
}

#[test]
fn core_rejects_unresolved_types_unsafe_identifiers_inline_rules_and_false_types() {
    let base = CheckedModule::from_source(pure()).unwrap();
    let valid: serde_json::Value = serde_json::from_slice(&base.bytes().unwrap()).unwrap();
    let changes: Vec<Box<dyn Fn(&mut serde_json::Value)>> = vec![
        Box::new(|v| v["schema"] = json!(2)),
        Box::new(|v| v["semantics"] = json!("invented-core")),
        Box::new(|v| v["trusted"] = json!(true)),
        Box::new(|v| v["program"]["trusted"] = json!(true)),
        Box::new(|v| v["program"]["functions"][0]["trusted"] = json!(true)),
        Box::new(|v| v["program"]["functions"][0]["params"][0][1] = json!("Unknown")),
        Box::new(|v| v["program"]["functions"][0]["name"] = json!("f();evil")),
        Box::new(|v| v["program"]["functions"][0]["result"] = json!("Bool")),
        Box::new(|v| {
            v["program"]["functions"][0]["body"] =
                json!({"Call":["f",[{"Var":"xs"},{"Var":"offset"}]]})
        }),
    ];
    for change in changes {
        let mut altered = valid.clone();
        change(&mut altered);
        assert!(
            CheckedModule::from_bytes(&serde_json::to_vec(&altered).unwrap()).is_err(),
            "accepted {altered}"
        );
    }
    let inline =
        syntax::parse("module t; rewrite r(x:u64){from x+0; to x; proof by arithmetic;}").unwrap();
    assert!(CheckedModule::from_source(inline).is_err());
    let mut deep = pure();
    for _ in 0..40 {
        deep.functions[0].body = Expr::Binary(
            "+".into(),
            Box::new(deep.functions[0].body.clone()),
            Box::new(Expr::Num(0)),
        );
    }
    assert!(CheckedModule::from_source(deep).is_err());
}

#[test]
fn state_core_roundtrip_preserves_failures_events_and_portable_snapshots() {
    let program = syntax::parse(include_str!("../examples/inventory.lang")).unwrap();
    let checked = CheckedModule::from_source(program.clone()).unwrap();
    assert!(checked.pure_program().is_err());
    let restored = CheckedModule::from_bytes(&checked.bytes().unwrap()).unwrap();
    let script: Vec<serde_json::Value> =
        serde_json::from_str(include_str!("../examples/inventory-script.json")).unwrap();
    let mut a = stateful::Runtime::new(program).unwrap();
    let mut b = stateful::Runtime::new(restored.into_program()).unwrap();
    for call in script {
        let name = call["call"].as_str().unwrap();
        assert_eq!(
            a.invoke_json(name, &call["args"]).unwrap().json(),
            b.invoke_json(name, &call["args"]).unwrap().json()
        );
        assert_eq!(
            a.checkpoint_portable().unwrap(),
            b.checkpoint_portable().unwrap()
        );
    }
}

#[test]
fn pinned_replacement_rejects_stale_inputs_wrong_domain_changed_locks_and_forged_proofs_atomically()
{
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/collections");
    let original = syntax::parse(&fs::read_to_string(root.join("kernels.lang")).unwrap()).unwrap();
    let package: Package =
        serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    let lock = fs::read(root.join("lock.json")).unwrap();
    let core = CheckedModule::from_source(original.clone()).unwrap();
    let envelope = ReplacementPackage {
        schema: 1,
        semantics: implementation::REPLACEMENT_SEMANTICS.into(),
        core_semantics: verified_language::core::SEMANTICS.into(),
        input_core_sha256: core.identity().unwrap(),
        observations: "pure-total-values-v1".into(),
        library_lock_sha256: hash(&lock),
        package,
    };
    let temp = std::env::temp_dir().join(format!("ink-core-replacement-{}", std::process::id()));
    fs::create_dir_all(temp.join("objects")).unwrap();
    for entry in fs::read_dir(root.join("objects")).unwrap() {
        let entry = entry.unwrap();
        fs::copy(entry.path(), temp.join("objects").join(entry.file_name())).unwrap();
    }
    fs::write(temp.join("lock.json"), &lock).unwrap();
    let path = temp.join("replacement.json");
    let write = |p: &ReplacementPackage| fs::write(&path, serde_json::to_vec(p).unwrap()).unwrap();
    write(&envelope);
    let mut selected = original.clone();
    let evidence = implementation::apply_replacement(&mut selected, &path).unwrap();
    assert_ne!(evidence.input_core_sha256, evidence.selected_core_sha256);
    assert_eq!(
        evidence.selected_core_sha256,
        CheckedModule::from_source(selected.clone())
            .unwrap()
            .identity()
            .unwrap()
    );
    let mutations: Vec<Box<dyn Fn(&mut ReplacementPackage)>> = vec![
        Box::new(|p| p.input_core_sha256 = "0".repeat(64)),
        Box::new(|p| p.core_semantics = "future-core".into()),
        Box::new(|p| p.observations = "state-and-events".into()),
        Box::new(|p| p.library_lock_sha256 = "0".repeat(64)),
        Box::new(|p| p.package.library = "../lock.json".into()),
        Box::new(|p| p.package.proposals[0].to = Expr::Num(0)),
    ];
    for mutate in mutations {
        let mut bad = envelope.clone();
        mutate(&mut bad);
        write(&bad);
        let mut input = original.clone();
        assert!(implementation::apply_replacement(&mut input, &path).is_err());
        assert_eq!(
            serde_json::to_vec(&input).unwrap(),
            serde_json::to_vec(&original).unwrap()
        );
    }
    write(&envelope);
    let mut stale = original.clone();
    stale.functions[0].params[0].0 = "changed".into();
    assert!(implementation::apply_replacement(&mut stale, &path).is_err());
    // Identical closure, changed root order: identity mismatch must precede use.
    let mut changed: serde_json::Value = serde_json::from_slice(&lock).unwrap();
    changed["objects"].as_array_mut().unwrap().reverse();
    fs::write(
        temp.join("lock.json"),
        serde_json::to_vec(&changed).unwrap(),
    )
    .unwrap();
    let mut input = original.clone();
    assert!(implementation::apply_replacement(&mut input, &path).is_err());
    // Restore the pin then fully rehash a false theorem and update the lock:
    // hashes establish identity, never truth. Existing kernel must reject it.
    let mut changed: serde_json::Value = serde_json::from_slice(&lock).unwrap();
    let mut forged = false;
    for id in changed["objects"].as_array_mut().unwrap() {
        let object_path = temp
            .join("objects")
            .join(format!("{}.json", id.as_str().unwrap()));
        let mut object: serde_json::Value =
            serde_json::from_slice(&fs::read(object_path).unwrap()).unwrap();
        if let Some(theorem) = object["declaration"].get_mut("Theorem") {
            if theorem["from"] == theorem["to"] {
                continue;
            }
            theorem["proof"] = json!({"Refl":theorem["from"].clone()});
            let bytes = serde_json::to_vec(&object).unwrap();
            let identity = hash(&bytes);
            fs::write(temp.join("objects").join(format!("{identity}.json")), bytes).unwrap();
            *id = json!(identity);
            forged = true;
            break;
        }
    }
    assert!(forged);
    let bytes = serde_json::to_vec(&changed).unwrap();
    fs::write(temp.join("lock.json"), &bytes).unwrap();
    let mut forgery = envelope.clone();
    forgery.library_lock_sha256 = hash(&bytes);
    write(&forgery);
    let mut input = original.clone();
    assert!(implementation::apply_replacement(&mut input, &path).is_err());
    assert_eq!(
        serde_json::to_vec(&input).unwrap(),
        serde_json::to_vec(&original).unwrap()
    );
    fs::remove_dir_all(temp).unwrap();
}
