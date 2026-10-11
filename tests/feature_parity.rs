//! Required capabilities must be exercised, not inferred from equal replies.
use serde::Deserialize;
use serde_json::json;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use verified_language::{
    core::CheckedModule,
    representation::{self, CheckedRepresentation, Request},
    runtime::representation::{compiled::Compiled, Session},
    stateful::Runtime,
    syntax::parse,
};
fn root(name: &str) -> PathBuf {
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("build/enforced-parity")
        .join(name);
    fs::create_dir_all(&p).unwrap();
    p
}
fn command(command: &mut Command) {
    let out = command.output().unwrap();
    assert!(
        out.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
}
#[test]
fn parity_inventory_rejects_missing_targets_and_uncovered_features() {
    let directory = root("inventory");
    let script = Path::new(env!("CARGO_MANIFEST_DIR")).join("tools/check_feature_parity.py");
    let catalog: serde_json::Value =
        serde_json::from_str(include_str!("feature-parity.json")).unwrap();
    let run = |value: &serde_json::Value, scope: &str| {
        let path = directory.join("catalog.json");
        fs::write(&path, serde_json::to_vec(value).unwrap()).unwrap();
        Command::new("python3")
            .arg(&script)
            .args(["--scope", scope, "--catalog"])
            .arg(&path)
            .output()
            .unwrap()
    };
    assert!(run(&catalog, "cpu").status.success());
    assert!(run(&catalog, "contract").status.success());
    let mut gpu_gap = catalog.clone();
    gpu_gap["gpu_contract"]["capabilities"]["exact-binary32"]["targets"]["webgpu"] =
        json!({"status":"unsupported","reason":"test fault"});
    assert_eq!(run(&gpu_gap, "contract").status.code(), Some(1));
    assert_eq!(
        run(&catalog, "all").status.code(),
        Some(1),
        "GPU gaps must fail the full audit"
    );
    let mut omitted = catalog.clone();
    omitted["features"][0]["targets"]
        .as_object_mut()
        .unwrap()
        .remove("javascript");
    assert_eq!(run(&omitted, "cpu").status.code(), Some(2));
    let mut missing = catalog.clone();
    missing["features"][0]["targets"]["javascript"] =
        json!({"status":"unsupported","reason":"test fault"});
    assert_eq!(run(&missing, "cpu").status.code(), Some(1));
    let mut no_suite = catalog.clone();
    no_suite["features"][0]["tests"] = json!([]);
    assert_eq!(run(&no_suite, "cpu").status.code(), Some(2));
    let mut no_type = catalog.clone();
    no_type["features"][0]["types"] = json!(["U32", "I32"]);
    assert_eq!(run(&no_type, "cpu").status.code(), Some(2));
}
#[derive(Deserialize)]
struct Bridge {
    root: String,
    knowledge: verified_language::registry::Bundle,
}
fn checked() -> (
    Vec<CheckedRepresentation>,
    verified_language::representation::CheckedMigration,
) {
    let m = CheckedModule::from_source(
        parse(include_str!("../knowledge/research/keep-parity/app.ink")).unwrap(),
    )
    .unwrap();
    let a: Request = serde_json::from_str(include_str!(
        "../knowledge/research/keep-parity/representation-0.json"
    ))
    .unwrap();
    let b: Request = serde_json::from_str(include_str!(
        "../knowledge/research/keep-parity/representation-1.json"
    ))
    .unwrap();
    let bridge: Bridge = serde_json::from_str(include_str!(
        "../knowledge/research/keep-parity/migration.json"
    ))
    .unwrap();
    let a = representation::check(&m, &a).unwrap();
    let b = representation::check(&m, &b).unwrap();
    let migration =
        representation::check_migration(&a, &b, &bridge.knowledge, &bridge.root).unwrap();
    (vec![a, b], migration)
}
#[test]
fn checked_representations_execute_on_every_complete_cpu_target() {
    let (reps, migration) = checked();
    fn calls(value: &serde_json::Value, out: &mut std::collections::BTreeSet<String>) {
        match value {
            serde_json::Value::Object(object) => {
                if let Some(id) = object.get("Call").and_then(|v| v["function"].as_str()) {
                    out.insert(id.into());
                }
                for child in object.values() {
                    calls(child, out);
                }
            }
            serde_json::Value::Array(children) => {
                for child in children {
                    calls(child, out);
                }
            }
            _ => {}
        }
    }
    let cached = &reps[1];
    for root in [
        &cached.plan().actions["zero"].execute,
        &cached.plan().actions["overwrite"].next,
        &cached.plan().actions["clear"].next,
    ] {
        let mut pending = vec![root.clone()];
        let mut reached = std::collections::BTreeSet::new();
        while let Some(id) = pending.pop() {
            if reached.insert(id.clone()) {
                let body = &cached.request().knowledge.objects[&id].payload["declaration"]
                    ["Function"]["body"];
                let mut children = std::collections::BTreeSet::new();
                calls(body, &mut children);
                pending.extend(children);
            }
        }
        assert!(
            !reached.contains(&cached.plan().encode),
            "cache path silently refreshes its physical representation"
        );
        for table in &cached.projection().tables {
            assert!(
                !reached.contains(&table.get),
                "cache path silently recomputes its point query"
            );
        }
    }
    let p = reps[0].module().program();
    let work = root("representations");
    let mut defs = reps.iter().map(|r| r.definition()).collect::<Vec<_>>();
    defs.push(migration.definition());
    let zig = std::env::var("INK_TEST_ZIG").ok();
    if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        assert!(
            zig.is_some(),
            "all-target parity requires INK_TEST_ZIG; skipping Wasm is forbidden"
        );
    }
    for target in ["c", "rust", "javascript", "c-wasm", "rust-wasm"] {
        if target.ends_with("wasm") && zig.is_none() {
            continue;
        }
        let mut executor = Compiled::new();
        for d in &defs {
            verified_language::runtime::representation::compiled::prepare(
                &mut executor,
                d,
                verified_language::runtime::representation::compiled::Target::parse(target)
                    .unwrap(),
                &work.join(target),
                zig.as_deref(),
            )
            .unwrap();
        }
        // Revisited migration endpoints reuse their compiled closure. Mixing a
        // target into an already registered closure must be rejected explicitly.
        let target_kind =
            verified_language::runtime::representation::compiled::Target::parse(target).unwrap();
        verified_language::runtime::representation::compiled::prepare(
            &mut executor,
            defs[0],
            target_kind,
            &work,
            zig.as_deref(),
        )
        .unwrap();
        let other =
            if target_kind == verified_language::runtime::representation::compiled::Target::C {
                verified_language::runtime::representation::compiled::Target::Rust
            } else {
                verified_language::runtime::representation::compiled::Target::C
            };
        assert!(
            verified_language::runtime::representation::compiled::prepare(
                &mut executor,
                defs[0],
                other,
                &work,
                zig.as_deref()
            )
            .is_err()
        );
        let mut state = Session::new(reps[0].clone(), executor).unwrap();
        let mut baseline = Runtime::new(p.clone()).unwrap();
        for i in 0..32u64 {
            let (name, args) = match i % 8 {
                0 => ("put", json!([0, i * 19])),
                1 => ("zero", json!([])),
                2 => ("overwrite", json!([u64::MAX - i])),
                3 => ("get", json!([0])),
                4 => ("clear", json!([])),
                5 => ("zero", json!([])),
                6 => ("erase", json!([0, true])),
                _ => ("put", json!([1, i * 23])),
            };
            assert_eq!(
                state.invoke_json(name, &args).unwrap(),
                baseline.invoke_json(name, &args).unwrap().json(),
                "{target} action {i}"
            );
            assert_eq!(
                state.checkpoint().unwrap(),
                baseline.checkpoint_portable().unwrap(),
                "{target} snapshot {i}"
            );
            if i == 7 {
                state.migrate_direct(reps[1].clone(), &migration).unwrap();
            }
            if i == 19 {
                state.migrate(reps[0].clone()).unwrap();
            }
        }
        println!(
            "{target}: 32 action outcomes/exact checkpoints and direct/generic migrations matched"
        );
    }
    let code =
        verified_language::runtime::representation::javascript::emit(&reps, &[migration]).unwrap();
    fs::write(work.join("application.mjs"), code).unwrap();
    let mut base = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    for i in 0..24u64 {
        let (name, args) = match i % 8 {
            0 => ("put", json!([0, i * 19])),
            1 => ("zero", json!([])),
            2 => ("overwrite", json!([u64::MAX - i])),
            3 => ("get", json!([0])),
            4 => ("clear", json!([])),
            5 => ("zero", json!([])),
            6 => ("erase", json!([0, true])),
            _ => ("put", json!([1, i * 23])),
        };
        let outcome = base.invoke_json(name, &args).unwrap().json();
        steps.push(json!({"name":name,"args":args,"outcome":outcome,"snapshot":base.checkpoint_portable().unwrap()}));
    }
    fs::write(
        work.join("histories.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        work.join("state-wasm.mjs"),
        verified_language::runtime::STATE_WASM_HOST,
    )
    .unwrap();
    fs::write(
        work.join("check-application.mjs"),
        include_str!("feature-parity-representation.mjs"),
    )
    .unwrap();
    command(Command::new("node").arg(work.join("check-application.mjs")));
}
#[path = "support/parity.rs"]
mod parity;
#[test]
fn asynchronous_parallel_transactions_publish_atomically_and_roll_back() {
    let source = format!(
        "{}\n{}",
        include_str!("../examples/bend-inspired.ink"),
        r#"
enum Error {Stopped,}
state Batches:Table<u64,u32> =Table.empty();
event done:u32;
change batch(xs:List<u32>,fail:Bool)->Result<List<u32>,Error> writes(Batches) emits(done){
    let ys=parallel(xs);
    if Batches.contains(0){Batches.replace(0,sum(ys));}else{Batches.insert(0,sum(ys));}
    emit done(sum(ys));
    if fail{return Err(Error.Stopped);}else{return Ok(ys);}
}
query batch_value()->Option<u32> reads(Batches){return Batches.get(0);}
"#
    );
    let p = parse(&source).unwrap();
    let mut reference = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let xs: Vec<u32> = (0..1024).collect();
    for (name, args, asynchronous, workers) in [
        ("batch", json!([xs, false]), true, true),
        ("batch_value", json!([]), false, false),
        ("batch", json!([xs, true]), true, true),
        ("batch_value", json!([]), false, false),
        ("batch", json!([[], false]), true, false),
        ("batch_value", json!([]), false, false),
    ] {
        let reply = match reference.invoke_json(name, &args) {
            Ok(outcome) => json!({"outcome":outcome.json()}),
            Err(error) => json!({"host_error":error}),
        };
        steps.push(json!({"call":name,"args":args,"async":asynchronous,"expect_workers":workers}));
        expected.push(json!({"reply":reply,"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    parity::conformance("async-parallel-transactions", p, &source, steps, expected);
}
#[test]
fn full_width_gpu_values_use_actual_dispatch() {
    let source = include_str!("../examples/u64-parity.ink");
    let p = parse(source).unwrap();
    let r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut xs = vec![
        0u64,
        1,
        u64::MAX,
        u64::MAX - 1,
        1 << 32,
        (1 << 32) - 1,
        1 << 63,
    ];
    let mut seed = 73u64;
    for _ in 0..17 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        xs.push(seed);
    }
    let mut calls = vec![];
    for n in [0u64, 1, 17, (1 << 32) - 1, 1 << 32, 1 << 63, u64::MAX] {
        for name in [
            "add",
            "subtract",
            "multiply",
            "quotient",
            "remainder",
            "comparisons",
        ] {
            calls.push((name, json!([xs, n])));
        }
    }
    calls.extend([
        ("negate", json!([xs])),
        ("sort", json!([xs])),
        ("scan", json!([xs])),
        ("total", json!([xs])),
        ("owned", json!([xs, 0])),
        ("owned", json!([xs, 2])),
        ("owned", json!([xs, u32::MAX])),
        (
            "records",
            json!([[{"value":u64::MAX,"rank":u32::MAX},{"value":1u64<<63,"rank":4}],u64::MAX]),
        ),
        ("add", json!([[], u64::MAX])),
        ("sort", json!([[]])),
        ("total", json!([[]])),
    ]);
    for (name, args) in calls {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let inputs = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| verified_language::eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let value = verified_language::eval::call(&p, name, inputs, &mut 100000000)
            .unwrap()
            .json();
        steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    parity::conformance("generated-parity-u64", p, source, steps, expected);
}
#[test]
fn exact_binary32_uses_actual_gpu_dispatch() {
    let source = include_str!("../examples/f32-parity.ink");
    let p = parse(source).unwrap();
    let r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut bits = vec![
        0u32, 0x80000000, 1, 0x80000001, 0x7fffff, 0x800000, 0x3f000000, 0x3f800000, 0xbf800000,
        0x3fffffff, 0x7f7fffff, 0xff7fffff, 0x7f800000, 0xff800000, 0x7fc12345, 0xff812345,
    ];
    let mut seed = 107u32;
    for _ in 0..128 {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        bits.push(seed);
    }
    let xs = bits
        .iter()
        .map(|b| json!({"F32Bits":b}))
        .collect::<Vec<_>>();
    let mut calls = vec![];
    for b in [
        0u32, 0x80000000, 1, 0x800001, 0x3f000000, 0x3f800000, 0xbf800000, 0x3fffffff, 0x7f7fffff,
        0x7f800000, 0xff800000, 0xff812345,
    ] {
        for name in ["plus", "minus", "times", "ordered"] {
            calls.push((name, json!([xs,{"F32Bits":b}])));
        }
    }
    calls.extend([
        ("negative", json!([xs])),
        ("total", json!([xs])),
        ("owned", json!([xs])),
        ("plus", json!([[], 0.0])),
        ("total", json!([[]])),
    ]);
    for (name, args) in calls {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let inputs = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| verified_language::eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let value = verified_language::eval::call(&p, name, inputs, &mut 100000000)
            .unwrap()
            .json();
        steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    parity::conformance("generated-parity-f32", p, source, steps, expected);
}

#[test]
fn sealed_numeric_primitives_execute_identically_on_every_cpu_target() {
    use sha2::{Digest, Sha256};
    use verified_language::{
        definition,
        knowledge::Lock,
        library::{self, Bundle, Object},
        logic::{Declaration, Sort, Term},
        runtime::representation::Executor,
    };
    let mut bundle = Bundle {
        lock: Lock {
            schema: 1,
            semantics: library::SEMANTICS.into(),
            objects: vec![],
        },
        objects: std::collections::BTreeMap::new(),
    };
    let mut functions = vec![];
    for op in [
        "f32:+", "f32:-", "f32:*", "f32:neg", "f32:==", "f32:!=", "f32:<", "f32:<=", "f32:>",
        "f32:>=", "quot", "rem", "&",
    ] {
        let compare =
            op.starts_with("f32:") && !matches!(op, "f32:+" | "f32:-" | "f32:*" | "f32:neg");
        let object = Object {
            schema: 1,
            semantics: library::SEMANTICS.into(),
            name: "numeric_definition".into(),
            dependencies: vec![],
            declaration: Declaration::Function {
                params: vec![("x".into(), Sort::U64), ("y".into(), Sort::U64)],
                result: if compare { Sort::Bool } else { Sort::U64 },
                body: Term::Binary {
                    op: op.into(),
                    left: Box::new(Term::Var("x".into())),
                    right: Box::new(Term::Var("y".into())),
                },
                recursive: None,
            },
        };
        let raw = serde_json::to_string(&object).unwrap();
        let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
        bundle.lock.objects.push(id.clone());
        bundle.objects.insert(id.clone(), raw);
        functions.push((op, id));
    }
    let checked = definition::check(&bundle, &bundle.lock.objects, None).unwrap();
    let context = library::load_bundle(&bundle).unwrap().context;
    let zig = std::env::var("INK_TEST_ZIG").ok();
    if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        assert!(zig.is_some());
    }
    for target in ["c", "rust", "javascript", "c-wasm", "rust-wasm"] {
        if target.ends_with("wasm") && zig.is_none() {
            continue;
        }
        let mut executor = Compiled::new();
        verified_language::runtime::representation::compiled::prepare(
            &mut executor,
            &checked,
            verified_language::runtime::representation::compiled::Target::parse(target).unwrap(),
            &root("numeric-definitions").join(target),
            zig.as_deref(),
        )
        .unwrap();
        for a in [
            0u64,
            1,
            0x80000000,
            0x7f800000,
            0xff800000,
            0x7fc12345,
            0xff812345,
            0x3f800001,
            u64::MAX,
        ] {
            for b in [0u64, 1, 0x80000000, 0x7f800000, 0x7f812345, 0x3f800000] {
                for (op, id) in &functions {
                    let want = match *op {
                        "quot" => Term::U64(if b == 0 { 0 } else { a / b }),
                        "rem" => Term::U64(if b == 0 { 0 } else { a % b }),
                        "&" => Term::U64(a & b),
                        _ => verified_language::logic::f32_primitive(op, a, b).unwrap(),
                    };
                    assert_eq!(
                        executor
                            .execute(&checked, &context, id, vec![Term::U64(a), Term::U64(b)])
                            .unwrap(),
                        want,
                        "{target}/{op}/{a}/{b}"
                    );
                }
            }
        }
    }
}
