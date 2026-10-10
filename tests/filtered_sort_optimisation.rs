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
const SOURCE: &str = include_str!("../examples/filtered-sort.ink");
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
fn filtered_sort_dependencies_and_predicate_premises_are_checked() {
    let m = module();
    let bundle: registry::Bundle =
        serde_json::from_slice(&fs::read("knowledge/store/filtered-sort-view.json").unwrap())
            .unwrap();
    let c = registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.roots.len(), 9);
    assert_eq!(c.objects.len(), 27);
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    for name in [
        "insert-length-kept-u32",
        "insert-count-dropped-i32",
        "length-u64",
        "count-u32",
        "insert-sum-kept-u32",
        "sum-u32",
    ] {
        let mut law = c.objects[names[format!("rewrite/filtered-sort/{name}")]
            .as_str()
            .unwrap()]
        .clone();
        let s::Sort::Value(ty) = &law.to.sort else {
            panic!()
        };
        let ty = ty.clone();
        law.to = s::op(
            law.to.sort.clone(),
            "binary:+",
            vec![law.to.clone(), s::word(ty, 1)],
        );
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let mut objects = c.objects.clone();
        objects.insert(id.clone(), law);
        assert!(
            CheckedCatalogue::check(
                &Catalogue {
                    schema: 1,
                    semantics: verified_language::laws::SEMANTICS.into(),
                    roots: vec![id],
                    objects
                },
                m.program()
            )
            .is_err(),
            "accepted false {name}"
        );
    }
    for name in ["insert-count-kept-u32", "insert-sum-dropped-i32"] {
        let mut law = c.objects[names[format!("rewrite/filtered-sort/{name}")]
            .as_str()
            .unwrap()]
        .clone();
        let Node::Bool(flag) = &mut law.conditions[0].to.node else {
            panic!()
        };
        *flag = !*flag;
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let mut objects = c.objects.clone();
        objects.insert(id.clone(), law);
        assert!(
            CheckedCatalogue::check(
                &Catalogue {
                    schema: 1,
                    semantics: verified_language::laws::SEMANTICS.into(),
                    roots: vec![id],
                    objects
                },
                m.program()
            )
            .is_err(),
            "accepted swapped premise {name}"
        );
    }
    let mut missing = c.clone();
    missing.objects.remove(
        names["rewrite/filtered-sort/insert-count-kept-u32"]
            .as_str()
            .unwrap(),
    );
    assert!(CheckedCatalogue::check(&missing, m.program()).is_err());
}
#[test]
fn filtered_sort_selection_is_incremental_and_preserves_cpu_results() {
    let m = module();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/filtered-sort-selection");
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
    let prior = dir.join("prior-knowledge");
    let r=Command::new("python3").args(["-c",r#"import sys,shutil
from pathlib import Path
root,prior=map(Path,sys.argv[1:]);data=prior/'store';data.mkdir(parents=True,exist_ok=True)
for name in ['objects','trees','snapshots']:
 p=data/name
 if not p.exists():p.symlink_to(root/'store'/name,target_is_directory=True)
shutil.copyfile(root/'store/names.json',data/'names.json')
shutil.copyfile(root/'store/snapshots/229e3d87fa2ca12d83f0f297b5f04a431c25730c47b248a0e600910b38f6f6a0.json',data/'snapshot.json')"#]).arg(root.join("knowledge")).arg(&prior).output().unwrap();
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    let prior_package = plan(&m, &dir.join("prior"), &prior);
    let prior_selected = optimisation::check(&m, &prior_package).unwrap();
    let package = plan(&m, &dir.join("selected"), &root.join("knowledge"));
    let selected = optimisation::check(&m, &package).unwrap();
    let subject = optimisation::subject(selected.module()).unwrap();
    let prior_subject = optimisation::subject(prior_selected.module()).unwrap();
    fn contains_sort(t: &s::Term) -> bool {
        matches!(&t.node,Node::Op(n,_) if n=="method:sort")
            || s::children(t).iter().any(|c| contains_sort(c))
    }
    for name in [
        "filtered_length",
        "filtered_count",
        "filtered_sum",
        "wide_length",
        "wide_count",
        "wide_sum",
        "signed_length",
        "signed_count",
        "signed_sum",
        "captured",
    ] {
        assert!(
            package.applications.iter().any(|a| a.function == name),
            "missing {name}"
        );
        assert!(
            !contains_sort(&subject.functions[name]),
            "sort remains in {name}"
        );
        assert!(
            contains_sort(&prior_subject.functions[name]),
            "prior DB unexpectedly erases sort in {name}"
        );
    }
    assert!(!package
        .applications
        .iter()
        .any(|a| a.function == "filtered_values"));
    assert!(contains_sort(&subject.functions["filtered_values"]));
    let site = package
        .applications
        .iter()
        .find(|a| a.function == "filtered_count")
        .unwrap()
        .clone();
    let mut forged = package.clone();
    forged.applications = vec![optimisation::Site {
        function: "filtered_values".into(),
        ..site.clone()
    }];
    assert!(optimisation::check(&m, &forged).is_err());
    let mut changed = site;
    changed.arguments.insert(
        "p".into(),
        s::lambda(
            s::value(verified_language::core::Type::U32),
            s::term(
                s::value(verified_language::core::Type::Bool),
                Node::Bool(true),
            ),
        ),
    );
    forged.applications = vec![changed];
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
        assert_eq!(run(&m, name, args.clone()), want, "source {name}");
        assert_eq!(
            run(prior_selected.module(), name, args.clone()),
            want,
            "prior {name}"
        );
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
        for limit in [0u32, 32, u32::MAX] {
            let retained = xs
                .iter()
                .copied()
                .filter(|x| *x < limit)
                .collect::<Vec<_>>();
            let mut sorted = retained.clone();
            sorted.sort();
            add("filtered_length", json!([xs, limit]), json!(retained.len()));
            add("filtered_count", json!([xs, limit]), json!(retained.len()));
            add(
                "filtered_sum",
                json!([xs, limit]),
                json!(retained.iter().fold(0u32, |a, x| a.wrapping_add(*x))),
            );
            add("filtered_values", json!([xs, limit]), json!(sorted));
        }
    }
    for xs in [vec![], vec![u64::MAX, 0, 1, 1 << 63], vec![9, 8, 7, 7]] {
        for limit in [0u64, 8, u64::MAX] {
            let retained = xs
                .iter()
                .copied()
                .filter(|x| *x < limit)
                .collect::<Vec<_>>();
            add("wide_length", json!([xs, limit]), json!(retained.len()));
            add("wide_count", json!([xs, limit]), json!(retained.len()));
            add(
                "wide_sum",
                json!([xs, limit]),
                json!(retained.iter().fold(0u64, |a, x| a.wrapping_add(*x))),
            );
        }
    }
    for xs in [vec![], vec![i32::MIN, i32::MAX, -1, 0], vec![9, -8, -7, -7]] {
        for limit in [i32::MIN, 0, i32::MAX] {
            let retained = xs
                .iter()
                .copied()
                .filter(|x| *x < limit)
                .collect::<Vec<_>>();
            add("signed_length", json!([xs, limit]), json!(retained.len()));
            add("signed_count", json!([xs, limit]), json!(retained.len()));
            add(
                "signed_sum",
                json!([xs, limit]),
                json!(retained.iter().fold(0i32, |a, x| a.wrapping_add(*x))),
            );
        }
    }
    for (xs, limits) in [
        (vec![], vec![0u32, 1]),
        (vec![0, u32::MAX, 7], vec![]),
        (vec![0, u32::MAX, 7], vec![0, 7, 8, u32::MAX]),
    ] {
        let want = limits
            .iter()
            .map(|limit| xs.iter().filter(|x| **x < *limit).count())
            .collect::<Vec<_>>();
        add("captured", json!([xs, limits]), json!(want));
    }
    assert_eq!(steps.len(), 117);
    parity::conformance_selected(
        "filtered-sort-proofs",
        &selected,
        &source(),
        steps,
        expected,
    );
}
