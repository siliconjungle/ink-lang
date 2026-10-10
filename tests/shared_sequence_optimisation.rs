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
const SOURCE: &str = include_str!("../examples/shared-sequences.ink");
fn source() -> String {
    format!("{SOURCE}\nquery readiness()->u32{{return 1;}}")
}
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&source()).unwrap()).unwrap()
}
fn view() -> registry::Bundle {
    serde_json::from_slice(&fs::read("knowledge/store/shared-sequence-view.json").unwrap()).unwrap()
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
fn shared_proofs_replay_and_rehashed_false_laws_fail() {
    let m = module();
    let c = registry::CheckedBundle::check(&view())
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.roots.len(), 83);
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    for name in [
        "count-map-u32-bool",
        "zip-self-first-u32",
        "zip-right-map-difference-u32",
        "zip-both-map-product-u32",
        "zip-both-map-product-f32",
    ] {
        let mut law = c.objects[names[format!("rewrite/shared/{name}")].as_str().unwrap()].clone();
        if name.starts_with("count") {
            law.to = s::op(
                s::value(Type::U64),
                "binary:+",
                vec![law.to, s::word(Type::U64, 1)],
            );
        } else if name.starts_with("zip-self") {
            let Node::Op(_, args) = &mut law.from.node else {
                panic!()
            };
            args[1] = s::op(
                args[1].sort.clone(),
                "method:filter",
                vec![
                    args[1].clone(),
                    s::lambda(
                        s::value(Type::U32),
                        s::term(s::value(Type::Bool), Node::Bool(false)),
                    ),
                ],
            );
        } else {
            let Node::Op(_, args) = &mut law.to.node else {
                panic!()
            };
            let Node::Lambda(body) = &mut args[1].node else {
                panic!()
            };
            let Node::Op(operator, operands) = &mut body.node else {
                panic!()
            };
            if name.contains("difference") {
                operands.swap(0, 1);
            } else if name.ends_with("f32") {
                *operator = "binary:+".into();
            } else {
                operands[1] = s::term(s::value(Type::U32), Node::Bound(0));
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
#[test]
fn same_sequence_is_required_and_fusion_matches_all_cpu_paths() {
    let m = module();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/shared-sequence-selection");
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
    for f in &m.program().functions {
        if f.name != "unrelated" {
            assert!(
                package.applications.iter().any(|a| a.function == f.name),
                "missing {}",
                f.name
            );
        }
    }
    assert!(!package
        .applications
        .iter()
        .any(|a| a.function == "unrelated"));
    let subject = optimisation::subject(selected.module()).unwrap();
    for name in [
        "self_sum",
        "left_product",
        "right_difference",
        "pair_values",
        "wide_pair",
        "signed_pair",
        "float_pair",
    ] {
        let Node::Op(op, args) = &subject.functions[name].node else {
            panic!()
        };
        assert_eq!(op, "method:map");
        assert!(
            matches!(&args[0].node,Node::Free(x) if x=="xs"),
            "intermediate in {name}"
        );
    }
    let Node::Op(op, args) = &subject.functions["pair_total"].node else {
        panic!()
    };
    assert_eq!(op, "call:foldr");
    assert!(matches!(&args[0].node,Node::Free(x) if x=="xs"));
    // Exact syntactic provenance is required even when two runtime arrays happen to agree.
    let original = optimisation::subject(&m).unwrap();
    let Node::Op(_, args) = &original.functions["unrelated"].node else {
        panic!()
    };
    let Node::Op(_, left) = &args[0].node else {
        panic!()
    };
    let Node::Op(_, right) = &args[1].node else {
        panic!()
    };
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    let mut forged = package.clone();
    forged.applications = vec![optimisation::Site {
        function: "unrelated".into(),
        path: vec![],
        law: names["rewrite/shared/zip-both-map-product-u32"]
            .as_str()
            .unwrap()
            .into(),
        arguments: BTreeMap::from([
            ("xs".into(), left[0].clone()),
            ("f".into(), left[1].clone()),
            ("g".into(), right[1].clone()),
        ]),
        premises: vec![],
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
    for n in [0, 1, 2, 31, 257] {
        let xs = (0..n)
            .map(|i| i * 17 % 64)
            .chain(
                [0, u32::MAX, 1, 1 << 31]
                    .into_iter()
                    .take(if n == 0 { 0 } else { 4 }),
            )
            .collect::<Vec<u32>>();
        let map = |f: &dyn Fn(u32) -> u32| xs.iter().copied().map(f).collect::<Vec<_>>();
        let f = |x: u32| x.wrapping_mul(17).wrapping_add(3);
        let g = |x: u32| x.wrapping_mul(5).wrapping_add(1);
        let pairs = map(&|x| f(x).wrapping_mul(g(x)));
        add("counted", json!([xs]), json!(xs.len()));
        add("counted_flags", json!([xs, 40]), json!(xs.len()));
        add("project_first", json!([xs]), json!(xs));
        add("project_second", json!([xs]), json!(xs));
        add("self_sum", json!([xs]), json!(map(&|x| x.wrapping_add(x))));
        add(
            "left_product",
            json!([xs, 17]),
            json!(map(&|x| f(x).wrapping_mul(x))),
        );
        add(
            "right_difference",
            json!([xs, 1]),
            json!(map(&|x| x.wrapping_sub(g(x)))),
        );
        add("pair_values", json!([xs]), json!(pairs));
        add(
            "pair_total",
            json!([xs]),
            json!(pairs.iter().fold(0u32, |a, x| a.wrapping_add(*x))),
        );
        let ys = vec![9u32, 8, 7];
        let unrelated = xs
            .iter()
            .zip(&ys)
            .map(|(x, y)| f(*x).wrapping_mul(g(*y)))
            .collect::<Vec<_>>();
        add("unrelated", json!([xs, ys]), json!(unrelated));
    }
    for xs in [vec![], vec![0u64, 1, u64::MAX, 1 << 63], vec![9, 8, 7]] {
        let want = xs
            .iter()
            .map(|x| {
                x.wrapping_mul(17)
                    .wrapping_add(3)
                    .wrapping_sub(x.wrapping_mul(5).wrapping_add(1))
            })
            .collect::<Vec<_>>();
        add("wide_pair", json!([xs]), json!(want));
    }
    for xs in [vec![], vec![i32::MIN, 0, -1, i32::MAX], vec![-9, -8, -7]] {
        let want = xs
            .iter()
            .map(|x| {
                x.wrapping_mul(17)
                    .wrapping_add(3)
                    .wrapping_sub(x.wrapping_mul(5).wrapping_add(1))
            })
            .collect::<Vec<_>>();
        add("signed_pair", json!([xs]), json!(want));
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
        let scale = 1.25f32;
        let offset = -0.5f32;
        let want = bits
            .iter()
            .map(|b| {
                let x = f32::from_bits(*b);
                eval::Value::F32(((x * scale + offset) * (x + 1.0)).to_bits()).json()
            })
            .collect::<Vec<_>>();
        let unchanged = bits
            .iter()
            .map(|b| eval::Value::F32(*b).json())
            .collect::<Vec<_>>();
        add("float_pair", json!([xs, scale, offset]), json!(want));
        add("float_first", json!([xs]), json!(unchanged));
    }
    for (xs, weights) in [
        (vec![], vec![1u32]),
        (vec![0, u32::MAX, 7], vec![]),
        (vec![0, u32::MAX, 7], vec![0, 1, u32::MAX]),
    ] {
        let want = xs
            .iter()
            .map(|k| {
                weights.iter().fold(0u32, |a, w| {
                    a.wrapping_add(w.wrapping_add(*k).wrapping_mul(w.wrapping_sub(*k)))
                })
            })
            .collect::<Vec<_>>();
        add("captured", json!([xs, weights]), json!(want));
    }
    assert_eq!(steps.len(), 67);
    parity::conformance_selected(
        "shared-sequence-proofs",
        &selected,
        &source(),
        steps,
        expected,
    );
}
