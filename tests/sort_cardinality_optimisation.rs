use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    eval,
    laws::{Catalogue, CheckedCatalogue},
    optimisation::{self, Package},
    registry,
    semantic::{self as s, Node},
    syntax,
};
const SOURCE: &str = include_str!("../examples/sort-cardinality.ink");
fn source() -> String {
    format!("{SOURCE}\nquery readiness()->u32{{return 1;}}")
}
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&source()).unwrap()).unwrap()
}
fn run(m: &CheckedModule, name: &str, args: Value) -> Value {
    let p = m.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let values = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(x, (_, ty))| eval::Value::from_program_json(x, ty, p).unwrap())
        .collect();
    eval::call(p, name, values, &mut 10_000_000).unwrap().json()
}
fn plan(m: &CheckedModule, dir: &Path, root: &Path) -> Package {
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("core.json"), m.bytes().unwrap()).unwrap();
    let r = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(dir.join("core.json"))
        .arg("--snapshot")
        .arg(root.join("store/snapshot.json"))
        .arg("--knowledge-root")
        .arg(root)
        .args(["--budget", "4096", "--rounds", "32", "-o"])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap()
}
#[path = "support/parity.rs"]
mod parity;

#[test]
fn sort_cardinality_dependencies_replay_and_false_laws_fail() {
    let m = module();
    let bundle: registry::Bundle =
        serde_json::from_slice(&fs::read("knowledge/store/sort-cardinality-view.json").unwrap())
            .unwrap();
    let c = registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.roots.len(), 9);
    assert_eq!(c.objects.len(), 18);
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    for name in [
        "insert-length-u32",
        "insert-count-i32",
        "length-u64",
        "count-u32",
        "insert-sum-u32",
        "sum-u32",
    ] {
        let mut law = c.objects[names[format!("rewrite/sort/{name}")].as_str().unwrap()].clone();
        let s::Sort::Value(result_type) = &law.to.sort else {
            panic!()
        };
        let result_type = result_type.clone();
        law.to = s::op(
            law.to.sort.clone(),
            "binary:+",
            vec![law.to.clone(), s::word(result_type, 1)],
        );
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let mut objects = c.objects.clone();
        objects.insert(id.clone(), law);
        let bad = Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![id],
            objects,
        };
        assert!(
            CheckedCatalogue::check(&bad, m.program()).is_err(),
            "accepted false {name}"
        );
    }
    let mut missing = c.clone();
    missing
        .objects
        .remove(names["rewrite/sort/insert-count-u32"].as_str().unwrap());
    assert!(CheckedCatalogue::check(&missing, m.program()).is_err());
}

#[test]
fn selection_erases_only_unobserved_sort_and_matches_all_cpu_paths() {
    let m = module();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/sort-cardinality-selection");
    fs::create_dir_all(&dir).unwrap();
    let compiler = Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap());
    let empty = dir.join("empty");
    let r = Command::new("python3")
        .env("PYTHONPATH", root.join("knowledge"))
        .args([
            "-c",
            "import sys;from ink_knowledge import Store;Store.publish(sys.argv[1],[],{})",
        ])
        .arg(&empty)
        .output()
        .unwrap();
    assert!(r.status.success());
    assert!(plan(&m, &dir.join("baseline"), &empty)
        .applications
        .is_empty());
    let package = plan(&m, &dir.join("selected"), &root.join("knowledge"));
    let selected = optimisation::check(&m, &package).unwrap();
    let subject = optimisation::subject(selected.module()).unwrap();
    for name in [
        "sorted_length",
        "sorted_count",
        "wide_length",
        "wide_count",
        "signed_length",
        "signed_count",
        "sorted_sum",
        "wide_sum",
        "signed_sum",
    ] {
        assert!(package.applications.iter().any(|a| a.function == name));
        let Node::Op(op, args) = &subject.functions[name].node else {
            panic!()
        };
        assert_eq!(
            op,
            if name.ends_with("length") {
                "call:length"
            } else if name.ends_with("sum") {
                "call:sum"
            } else {
                "call:count"
            }
        );
        assert!(matches!(&args[0].node,Node::Free(x) if x=="xs"));
    }
    let Node::Op(_, args) = &subject.functions["pipeline_count"].node else {
        panic!()
    };
    let Node::Op(op, _) = &args[0].node else {
        panic!()
    };
    assert_eq!(op, "method:filter");
    assert!(!package
        .applications
        .iter()
        .any(|a| a.function == "sorted_values"));
    let Node::Op(op, _) = &subject.functions["sorted_values"].node else {
        panic!()
    };
    assert_eq!(op, "method:sort");
    // Correct cardinality does not authorise removing an observed ordering.
    let mut forged = package.clone();
    let site = forged
        .applications
        .iter()
        .find(|a| a.function == "sorted_count")
        .unwrap()
        .clone();
    forged.applications = vec![optimisation::Site {
        function: "sorted_values".into(),
        ..site
    }];
    assert!(optimisation::check(&m, &forged).is_err());
    assert_eq!(
        compiler,
        Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap())
    );
    let snapshot = verified_language::stateful::Runtime::new(m.program().clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut add = |name: &str, args: Value, want: Value| {
        assert_eq!(run(&m, name, args.clone()), want, "baseline {name}");
        assert_eq!(
            run(selected.module(), name, args.clone()),
            want,
            "selected {name}"
        );
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
    };
    for xs in [
        vec![],
        vec![0],
        vec![u32::MAX, 0, 1, 1 << 31, 0],
        (0..257).map(|i| i * 17 % 64).collect(),
        (0..31).rev().collect(),
    ] {
        let mut sorted = xs.clone();
        sorted.sort();
        add("sorted_length", json!([xs]), json!(xs.len()));
        add("sorted_count", json!([xs]), json!(xs.len()));
        add(
            "sorted_sum",
            json!([xs]),
            json!(xs.iter().fold(0u32, |a, x| a.wrapping_add(*x))),
        );
        add("sorted_values", json!([xs]), json!(sorted));
        for limit in [0u32, 32, u32::MAX] {
            let want = xs.iter().filter(|x| **x < limit).count();
            add("pipeline_count", json!([xs, limit]), json!(want));
        }
    }
    for xs in [vec![], vec![u64::MAX, 0, 1, 1 << 63], vec![9, 8, 7, 7]] {
        add("wide_length", json!([xs]), json!(xs.len()));
        add("wide_count", json!([xs]), json!(xs.len()));
        add(
            "wide_sum",
            json!([xs]),
            json!(xs.iter().fold(0u64, |a, x| a.wrapping_add(*x))),
        );
    }
    for xs in [vec![], vec![i32::MIN, i32::MAX, -1, 0], vec![9, -8, -7, -7]] {
        add("signed_length", json!([xs]), json!(xs.len()));
        add("signed_count", json!([xs]), json!(xs.len()));
        add(
            "signed_sum",
            json!([xs]),
            json!(xs.iter().fold(0i32, |a, x| a.wrapping_add(*x))),
        );
    }
    assert_eq!(steps.len(), 53);
    parity::conformance_selected(
        "sort-cardinality-proofs",
        &selected,
        &source(),
        steps,
        expected,
    );
}
