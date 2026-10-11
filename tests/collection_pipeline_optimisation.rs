use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    eval,
    laws::{Catalogue, CheckedCatalogue},
    optimisation::{self, Package},
    registry,
    semantic::{self as s, Node},
    syntax,
};
const SOURCE: &str = include_str!("../examples/collection-pipelines.ink");
fn source() -> String {
    format!("{SOURCE}\nquery readiness()->u32{{return 1;}}")
}
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&source()).unwrap()).unwrap()
}
fn view() -> registry::Bundle {
    serde_json::from_slice(&fs::read("knowledge/store/collection-pipeline-view.json").unwrap())
        .unwrap()
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
#[test]
fn pipeline_proofs_replay_and_rehashed_false_laws_fail() {
    let m = module();
    let c = registry::CheckedBundle::check(&view())
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.roots.len(), 80);
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    for name in [
        "length-map-u32-bool",
        "fold-map-difference-u32",
        "fold-filter-difference-u32",
        "sum-filter-map-u32",
        "fold-map-difference-f32",
    ] {
        let mut law =
            c.objects[names[format!("rewrite/pipelines/{name}")].as_str().unwrap()].clone();
        if name.starts_with("length") {
            law.to = s::op(
                s::value(Type::U32),
                "binary:+",
                vec![law.to, s::word(Type::U32, 1)],
            );
        } else if name.starts_with("sum-") {
            let Node::Op(_, args) = &mut law.to.node else {
                panic!()
            };
            args[1] = s::word(Type::U32, 1);
        } else {
            let Node::Op(_, args) = &mut law.to.node else {
                panic!()
            };
            let Node::Lambda(body) = &mut args[2].node else {
                panic!()
            };
            let Node::Lambda(body) = &mut body.node else {
                panic!()
            };
            let Node::Op(_, parts) = &mut body.node else {
                panic!()
            };
            if name.starts_with("fold-filter") {
                parts[0] = s::term(s::value(Type::Bool), Node::Bool(false));
            } else {
                parts.swap(0, 1);
            }
        }
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let bad = Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id, law)]),
        };
        assert!(
            CheckedCatalogue::check(&bad, m.program()).is_err(),
            "accepted false {name}"
        );
    }
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
        .args(["--budget", "1024", "--rounds", "32", "-o"])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap()
}
#[path = "support/parity.rs"]
mod parity;
#[test]
fn database_only_selection_removes_pipelines_and_preserves_cpu_results() {
    let m = module();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/collection-pipeline-selection");
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
    let baseline = plan(&m, &dir.join("baseline"), &empty);
    assert!(baseline.applications.is_empty());
    let package = plan(&m, &dir.join("selected"), &root.join("knowledge"));
    let selected = optimisation::check(&m, &package).unwrap();
    let subject = optimisation::subject(selected.module()).unwrap();
    for f in &m.program().functions {
        assert!(
            package.applications.iter().any(|a| a.function == f.name),
            "missing {}",
            f.name
        );
    }
    for name in [
        "mapped_fold",
        "filtered_fold",
        "pipeline_fold",
        "float_fold",
        "wide_fold",
        "signed_fold",
        "mapped_sum",
        "filtered_sum",
        "pipeline_sum",
        "float_filter_fold",
        "float_pipeline_fold",
    ] {
        let Node::Op(op, args) = &subject.functions[name].node else {
            panic!("missing fold")
        };
        assert_eq!(op, "call:foldr");
        assert!(
            matches!(&args[0].node,Node::Free(x) if x=="xs"),
            "intermediate remains in {name}"
        );
    }
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
    for n in [0, 1, 2, 7, 32, 257] {
        let xs = (0..n)
            .map(|i| i * 17 % 64)
            .chain(
                [0, u32::MAX, 1, 1 << 31]
                    .into_iter()
                    .take(if n == 0 { 0 } else { 4 }),
            )
            .collect::<Vec<u32>>();
        let seed = u32::MAX - 2;
        let mapped = xs
            .iter()
            .map(|x| x.wrapping_mul(17).wrapping_add(3))
            .collect::<Vec<_>>();
        let filtered = xs.iter().copied().filter(|x| *x < 40).collect::<Vec<_>>();
        let both = filtered
            .iter()
            .map(|x| x.wrapping_mul(17).wrapping_add(3))
            .collect::<Vec<_>>();
        let fold = |ys: &[u32]| ys.iter().rev().fold(seed, |acc, x| x.wrapping_sub(acc));
        let sum = |ys: &[u32]| ys.iter().fold(0u32, |acc, x| acc.wrapping_add(*x));
        add("mapped_length", json!([xs]), json!(xs.len()));
        add("converted_length", json!([xs, 40]), json!(xs.len()));
        add("mapped_fold", json!([xs, seed]), json!(fold(&mapped)));
        add(
            "filtered_fold",
            json!([xs, 40, seed]),
            json!(fold(&filtered)),
        );
        add("pipeline_fold", json!([xs, 40, seed]), json!(fold(&both)));
        add("discarded_length", json!([xs]), json!(0));
        add("discarded_count", json!([xs]), json!(0));
        add("mapped_sum", json!([xs]), json!(sum(&mapped)));
        add("filtered_sum", json!([xs, 40]), json!(sum(&filtered)));
        add("pipeline_sum", json!([xs, 40]), json!(sum(&both)));
    }
    for xs in [vec![], vec![0u64, 1, u64::MAX, 1 << 63], vec![9, 8, 7]] {
        let seed = u64::MAX - 2;
        let want = xs.iter().rev().fold(seed, |a, x| {
            x.wrapping_mul(17).wrapping_add(3).wrapping_sub(a)
        });
        add("wide_fold", json!([xs, seed]), json!(want));
    }
    for xs in [vec![], vec![i32::MIN, 0, -1, i32::MAX], vec![-9, -8, -7]] {
        let seed = i32::MAX;
        let want = xs
            .iter()
            .filter(|x| **x < 0)
            .rev()
            .fold(seed, |a, x| x.wrapping_sub(a));
        add("signed_fold", json!([xs, seed]), json!(want));
    }
    for bits in [
        vec![],
        vec![0x80000000, 0, 0x3f800000, 0xbf800000],
        vec![0x7fc01234, 0x7f800000, 0xff800000],
        vec![0x4b800000, 0x3f800000, 0xcb800000, 1],
    ] {
        let xs = bits
            .iter()
            .map(|b| json!({"F32Bits":b}))
            .collect::<Vec<_>>();
        let values = bits.iter().map(|b| f32::from_bits(*b)).collect::<Vec<_>>();
        let scale = 1.25f32;
        let offset = -0.5f32;
        let seed = -0.0f32;
        let fold = |ys: &[f32]| ys.iter().rev().fold(seed, |a, x| *x - a);
        let mapped = values
            .iter()
            .map(|x| *x * scale + offset)
            .collect::<Vec<_>>();
        let filtered = values
            .iter()
            .copied()
            .filter(|x| *x < 2.0)
            .collect::<Vec<_>>();
        let both = filtered
            .iter()
            .map(|x| *x * scale + offset)
            .collect::<Vec<_>>();
        // Ink arithmetic canonicalises NaNs; Rust arithmetic may retain payloads.
        let v = |x: f32| eval::Value::F32(if x.is_nan() { 0x7fc00000 } else { x.to_bits() }).json();
        add(
            "float_fold",
            json!([xs, scale, offset, v(seed)]),
            v(fold(&mapped)),
        );
        add(
            "float_filter_fold",
            json!([xs, 2.0, v(seed)]),
            v(fold(&filtered)),
        );
        add(
            "float_pipeline_fold",
            json!([xs, 2.0, scale, offset, v(seed)]),
            v(fold(&both)),
        );
    }
    assert_eq!(steps.len(), 78);
    parity::conformance_selected(
        "collection-pipeline-proofs",
        &selected,
        &source(),
        steps,
        expected,
    );
}
