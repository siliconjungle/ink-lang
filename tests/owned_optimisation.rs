use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    eval,
    laws::{Catalogue, CheckedCatalogue},
    optimisation::{self, Package},
    registry, syntax,
};
const SOURCE: &str = include_str!("../examples/owned-collection-optimisation.ink");
#[path = "support/parity.rs"]
mod parity;
#[test]
fn owned_database_laws_are_checked_and_false_updates_reject() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let view: registry::Bundle =
        serde_json::from_slice(&fs::read("knowledge/store/owned-collection-view.json").unwrap())
            .unwrap();
    let catalogue = registry::CheckedBundle::check(&view)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(catalogue.roots.len(), 215);
    for id in &catalogue.roots {
        CheckedCatalogue::check(
            &Catalogue {
                roots: vec![id.clone()],
                objects: BTreeMap::from([(id.clone(), catalogue.objects[id].clone())]),
                ..catalogue.clone()
            },
            module.program(),
        )
        .unwrap_or_else(|e| panic!("{id}: {e}"));
    }
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    let mut law = catalogue.objects[names["rewrite/owned-map/u64-u32/read-write"]
        .as_str()
        .unwrap()]
    .clone();
    law.to = verified_language::semantic::word(verified_language::core::Type::U32, 0);
    let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    assert!(CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id, law)])
        },
        module.program()
    )
    .is_err());
}
#[test]
fn checked_owned_selection_removes_work_and_all_cpu_paths_agree() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/owned-selection");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("core.json"), module.bytes().unwrap()).unwrap();
    let out = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(dir.join("core.json"))
        .args([
            "--knowledge-root",
            "knowledge",
            "--snapshot",
            "knowledge/store/snapshot.json",
            "--budget",
            "4096",
            "--rounds",
            "32",
            "-o",
        ])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let package: Package =
        serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&module, &package).unwrap();
    for name in [
        "read_written",
        "contains_written",
        "read_removed",
        "push_length",
        "no_iterations",
    ] {
        assert!(
            package.applications.iter().any(|a| a.function == name),
            "missing {name}"
        );
    }
    let snapshot = verified_language::stateful::Runtime::new(module.program().clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("read_written", json!([0, 19, 71])),
        ("read_written", json!([u64::MAX, 0, u32::MAX])),
        ("contains_written", json!([-1, 1.25])),
        ("read_removed", json!([u32::MAX, 17, 99])),
        ("push_length", json!([[], 4])),
        ("push_length", json!([[1, 2, 3], 4])),
        ("no_iterations", json!([[1, 2, 3]])),
    ] {
        let f = module
            .program()
            .functions
            .iter()
            .find(|f| f.name == name)
            .unwrap();
        let values: Vec<_> = f
            .params
            .iter()
            .zip(args.as_array().unwrap())
            .map(|((_, t), v)| eval::Value::from_program_json(v, t, module.program()).unwrap())
            .collect();
        let reply = eval::call(module.program(), name, values.clone(), &mut 100000)
            .unwrap()
            .json();
        assert_eq!(
            eval::call(selected.module().program(), name, values, &mut 100000)
                .unwrap()
                .json(),
            reply
        );
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":reply},"snapshot":snapshot}));
    }
    parity::conformance_selected("owned-selection", &selected, SOURCE, steps, expected);
}
