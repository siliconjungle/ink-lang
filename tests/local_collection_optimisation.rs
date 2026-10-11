use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    eval,
    laws::{self, Catalogue, CheckedCatalogue, Law, Proof},
    optimisation::{self, Package, Site},
    registry,
    semantic::{self as s, Node},
    syntax,
};
const SOURCE: &str = include_str!("../examples/local-collection-optimisation.ink");
fn module() -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&format!("{SOURCE}\nquery readiness()->u32{{return 1;}}\nfn bits(xs:List<f32>,i:u32,f:f32)->f32{{return buffer(xs).at_or(i,f);}}")).unwrap()).unwrap()
}
fn view() -> registry::Bundle {
    serde_json::from_slice(&fs::read("knowledge/store/local-collection-view.json").unwrap())
        .unwrap()
}
fn run(m: &CheckedModule, name: &str, args: Value) -> Value {
    let p = m.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let vs = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(x, (_, ty))| eval::Value::from_program_json(x, ty, p).unwrap())
        .collect();
    eval::call(p, name, vs, &mut 10_000_000).unwrap().json()
}
fn one(law: Law) -> Catalogue {
    let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(id, law)]),
    }
}
#[test]
fn all_new_proofs_check_and_rehashed_false_proofs_are_rejected() {
    let m = module();
    let c = registry::CheckedBundle::check(&view())
        .unwrap()
        .catalogue()
        .unwrap();
    CheckedCatalogue::check(&c, m.program()).unwrap();
    assert_eq!(c.roots.len(), 45);
    for name in [
        "rewrite/local-buffer/read-index-u32",
        "rewrite/collections/filter-fusion-u32",
        "rewrite/stopping/initial-stop-u32",
    ] {
        let names: Value =
            serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
        let mut law = c.objects[names[name].as_str().unwrap()].clone();
        match name {
            "rewrite/local-buffer/read-index-u32" => {
                let Node::Op(_, args) = &mut law.to.node else {
                    panic!()
                };
                args[1] = s::op(
                    s::value(Type::U32),
                    "binary:+",
                    vec![args[1].clone(), s::word(Type::U32, 1)],
                );
            }
            "rewrite/collections/filter-fusion-u32" => {
                let Node::Op(_, args) = &mut law.to.node else {
                    panic!()
                };
                let Node::Lambda(body) = &mut args[1].node else {
                    panic!()
                };
                let Node::Op(name, _) = &mut body.node else {
                    panic!()
                };
                *name = "binary:||".into();
            }
            _ => {
                let Node::Op(_, args) = &mut law.from.node else {
                    panic!()
                };
                args[2] = s::lambda(
                    s::value(Type::U32),
                    s::term(s::value(Type::Bool), Node::Bool(false)),
                );
            }
        }
        assert!(
            CheckedCatalogue::check(&one(law), m.program()).is_err(),
            "accepted {name}"
        );
    }
    let p=CheckedModule::from_source(syntax::parse("module P;fn run(limit:u32,x:u32)->u32{return repeat_until(limit,x,fn(a)=>false,fn(i)=>fn(a)=>a+1);}").unwrap()).unwrap();
    let term = optimisation::subject(&p).unwrap().functions["run"].clone();
    let Node::Op(_, args) = term.node else {
        panic!()
    };
    let names: Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    let law = names["rewrite/stopping/guarded-zero-bound-u32"]
        .as_str()
        .unwrap()
        .to_string();
    let mut package = Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: p.identity().unwrap(),
        knowledge: view(),
        applications: vec![Site {
            function: "run".into(),
            path: vec![],
            law,
            arguments: BTreeMap::from([
                ("limit".into(), args[0].clone()),
                ("initial".into(), args[1].clone()),
                ("stop".into(), args[2].clone()),
                ("step".into(), args[3].clone()),
            ]),
            premises: vec![],
        }],
        action_replacement: None,
    };
    assert!(optimisation::check(&p, &package).is_err());
    package.applications[0].premises.push(Proof::Normalize);
    assert!(optimisation::check(&p, &package).is_err());
}
fn plan(m: &CheckedModule, dir: &Path, snapshot: &Path, root: &Path) -> Package {
    fs::create_dir_all(dir).unwrap();
    let core = dir.join("core.json");
    fs::write(&core, m.bytes().unwrap()).unwrap();
    let out = dir.join("selection.json");
    let result = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(&core)
        .arg("--snapshot")
        .arg(snapshot)
        .arg("--knowledge-root")
        .arg(root)
        .args(["--budget", "1024", "-o"])
        .arg(&out)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    serde_json::from_slice(&fs::read(out).unwrap()).unwrap()
}
#[path = "support/parity.rs"]
mod parity;
#[test]
fn database_changes_plans_with_same_compiler_and_all_cpu_paths_agree() {
    let m = module();
    let compiler_hash = Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap());
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/local-collection-selection");
    fs::create_dir_all(&dir).unwrap();
    let empty = dir.join("empty");
    let py = Command::new("python3")
        .env("PYTHONPATH", root.join("knowledge"))
        .arg("-c")
        .arg("import sys;from ink_knowledge import Store;Store.publish(sys.argv[1],[],{})")
        .arg(&empty)
        .output()
        .unwrap();
    assert!(py.status.success());
    let base = plan(
        &m,
        &dir.join("baseline"),
        &empty.join("store/snapshot.json"),
        &empty,
    );
    assert!(base.applications.is_empty());
    assert_eq!(
        optimisation::check(&m, &base)
            .unwrap()
            .module()
            .identity()
            .unwrap(),
        m.identity().unwrap()
    );
    let package = plan(
        &m,
        &dir.join("selected"),
        &root.join("knowledge/store/snapshot.json"),
        &root.join("knowledge"),
    );
    let selected = optimisation::check(&m, &package).unwrap();
    let functions = package
        .applications
        .iter()
        .map(|s| s.function.as_str())
        .collect::<std::collections::BTreeSet<_>>();
    for name in [
        "copy_roundtrip",
        "copy_length",
        "copy_get",
        "visible",
        "unchanged",
        "zero",
        "pre_stopped",
        "guarded_zero",
        "bits",
        "already_done",
    ] {
        assert!(functions.contains(name), "missing {name}");
    }
    assert!(!functions.contains("running"));
    assert_eq!(
        Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap()),
        compiler_hash
    );
    let snapshot = verified_language::stateful::Runtime::new(m.program().clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut add = |name: &str, args: Value, want: Value| {
        let actual = run(&m, name, args.clone());
        assert_eq!(actual, want);
        assert_eq!(run(selected.module(), name, args.clone()), actual);
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":actual},"snapshot":snapshot}));
    };
    for n in [0, 1, 2, 31, 257] {
        let xs = (0..n).map(|i| (i * 17) % 23).collect::<Vec<u32>>();
        add("copy_roundtrip", json!([xs]), json!(xs));
        add("copy_length", json!([xs]), json!(n));
        for i in [0, n.saturating_sub(1), n, u32::MAX] {
            add(
                "copy_get",
                json!([xs, i, 99]),
                json!(xs.get(i as usize).copied().unwrap_or(99)),
            );
        }
        add(
            "visible",
            json!([xs, 5, 12]),
            json!(xs
                .iter()
                .copied()
                .filter(|x| *x >= 5 && *x < 12)
                .collect::<Vec<_>>()),
        );
        add("unchanged", json!([xs]), json!(xs));
    }
    for limit in [0, 1, u32::MAX] {
        for x in [0, u32::MAX] {
            add("pre_stopped", json!([limit, x]), json!(x));
            add("guarded_zero", json!([limit, x]), json!(x));
        }
    }
    for x in [0, 9, u32::MAX] {
        add("zero", json!([x]), json!(x));
    }
    for (limit, x, goal) in [(0, 0, 0), (u32::MAX, 7, 6), (u32::MAX, 5, 6)] {
        add("already_done", json!([limit, x, goal]), json!(x));
    }
    for (limit, x, want) in [(0, 0, 0), (2, 9, 12), (3, u32::MAX - 1, 4)] {
        add("running", json!([limit, x]), json!(want));
    }
    let bits = [0x80000000u32, 0x7fc01234, 0x7f800000];
    let xs = bits
        .iter()
        .map(|b| json!({"F32Bits":b}))
        .collect::<Vec<_>>();
    for i in [0, 1, 2, 3, u32::MAX] {
        add(
            "bits",
            json!([xs,i,{"F32Bits":0x7fc05678u32}]),
            eval::Value::F32(bits.get(i as usize).copied().unwrap_or(0x7fc05678)).json(),
        );
    }
    let source=format!("{SOURCE}\nquery readiness()->u32{{return 1;}}\nfn bits(xs:List<f32>,i:u32,f:f32)->f32{{return buffer(xs).at_or(i,f);}}");
    parity::conformance_selected(
        "local-collection-proofs",
        &selected,
        &source,
        steps,
        expected,
    );
}

#[test]
fn larger_views_match_the_canonical_python_store_tree() {
    let m = module();
    let mut c = registry::CheckedBundle::check(&view())
        .unwrap()
        .catalogue()
        .unwrap();
    for n in 0..84 {
        let x = s::free(s::value(Type::U32), "x");
        let from = s::op(
            s::value(Type::U32),
            "binary:+",
            vec![x, s::word(Type::U32, n)],
        );
        let law = Law {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            params: BTreeMap::from([("x".into(), s::value(Type::U32))]),
            conditions: vec![],
            from: from.clone(),
            to: from,
            proof: Proof::Normalize,
            dependencies: vec![],
            definition_context: None,
        };
        let extra = one(law);
        c.roots.extend(extra.roots);
        c.objects.extend(extra.objects);
    }
    assert_eq!(c.objects.len(), 129);
    let bundle = registry::from_catalogue(&c).unwrap();
    registry::CheckedBundle::check(&bundle)
        .unwrap()
        .verify(m.program())
        .unwrap();
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/local-collection-merkle");
    fs::create_dir_all(&dir).unwrap();
    let file = dir.join("bundle.json");
    fs::write(&file, serde_json::to_vec(&bundle).unwrap()).unwrap();
    let result=Command::new("python3").env("PYTHONPATH","knowledge").arg("-c").arg("import json,sys;from ink_knowledge import Store;b=json.load(open(sys.argv[1]));s=Store.publish(sys.argv[2],b['objects'].values(),{});assert s.snapshot==b['snapshot'];assert all(s.witness(i)==w for i,w in b['membership'].items())").arg(&file).arg(dir.join("store-root")).output().unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
