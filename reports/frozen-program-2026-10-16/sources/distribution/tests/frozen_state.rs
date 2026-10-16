use serde_json::json;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::Path,
    process::{Command, Output},
    sync::Mutex,
};
use verified_language::{
    core::CheckedModule,
    snapshot, snapshot_wire,
    stateful::{Runtime, Value},
    syntax,
};
static COMPILED: Mutex<()> = Mutex::new(());
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = r#"module fixed;
id Key;
record Row { word:u64, samples:List<f32>, __proto__:String, next:Option<Row>, }
state Model:Table<u64,Row>=Table.empty();
state Names:Table<Key,String>=Table.empty();
state Empty:Table<u32,u32>=Table.empty();
state Live:Table<u32,u64>=Table.empty();
event changed:u64;
query get(key:u64)->Option<Row> reads(Model){return Model.get(key);}
query names(key:Key)->Option<String> reads(Names){return Names.get(key);}
query empty()->List<u32> reads(Empty){return Empty.keys();}
query keys()->List<u64> reads(Model){return Model.keys();}
change set(value:u64)->Result<Unit,String> writes(Live) emits(changed){Live.put(0,value);emit changed(value);return Ok(());}
query live()->Option<u64> reads(Live){return Live.get(0);}
fn batch(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.25);}
"#;
fn module() -> CheckedModule {
    let mut p = syntax::parse(SOURCE).unwrap();
    let mut next = json!({"None":null});
    // Valid stored values can be deeper than ordinary public argument capture.
    for word in 0..29 {
        next = json!({"Some":{"word":word,"samples":[1.0],"__proto__":"child","next":next}});
    }
    let row = json!({"word":u64::MAX,"samples":[Value::F32(0x80000000).json(),Value::F32(0x7fa12345).json(),Value::F32(1).json()],"__proto__":"\u{0008} frozen 😀","next":next});
    p.frozen
        .insert("Model".into(), vec![(json!(u64::MAX), row)]);
    p.frozen.insert(
        "Names".into(),
        vec![(
            json!("ffffffffffffffffffffffffffffffff"),
            json!("full opaque key"),
        )],
    );
    p.frozen.insert("Empty".into(), vec![]);
    CheckedModule::from_source(p).unwrap()
}
#[test]
fn frozen_initial_data_and_restore_boundaries_match_all_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let m = module();
    let mut rt = Runtime::from_checked(&m).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("get", json!([u64::MAX])),
        ("get", json!([0])),
        ("keys", json!([])),
        ("names", json!(["ffffffffffffffffffffffffffffffff"])),
        ("empty", json!([])),
        ("set", json!([u64::MAX])),
        ("live", json!([])),
    ] {
        let reply = rt.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":reply.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    let bytes = rt.checkpoint_portable().unwrap();
    let layout = snapshot::layout(m.program()).unwrap();
    let logical = snapshot_wire::decode(&layout, &bytes, Default::default()).unwrap();
    for name in ["Model", "Names", "Empty"] {
        let root = layout.roots.iter().position(|(n, _, _)| n == name).unwrap();
        let mut changed = logical.clone();
        if name == "Empty" {
            changed.tables[root].push((json!(0), json!(1)));
        } else {
            changed.tables[root].clear();
        }
        let forged = snapshot_wire::encode(&layout, &changed, Default::default()).unwrap();
        assert!(Runtime::restore_portable_checked(&m, &forged).is_err());
        steps.push(json!({"reject_restore":forged,"restore_error":"frozen"}));
    }
    steps.push(json!({"restore":bytes}));
    let reply = rt.invoke_json("live", &json!([])).unwrap();
    steps.push(json!({"call":"live","args":[]}));
    expected.push(
        json!({"reply":{"outcome":reply.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
    );
    steps.push(json!({"pure":"batch","args":[[0.,0.5,-1.]],"expect_gpu":true}));
    expected.push(
        json!({"reply":{"value":[0.25,0.5,1.25]},"snapshot":rt.checkpoint_portable().unwrap()}),
    );
    parity::conformance_checked("frozen-state-parity", &m, SOURCE, steps, expected);
}

#[test]
fn restricting_one_learner_preserves_other_training_and_the_complete_state_payload() {
    let m = CheckedModule::from_source(
        verified_language::modules::load("examples/learning-orchestration.ink")
            .unwrap()
            .program,
    )
    .unwrap();
    let trace = verified_language::training::Trace {
        schema: 1,
        epochs: 4,
        observations: vec![verified_language::training::Observation {
            call: "feedback".into(),
            args: json!([{"input":1.0,"target":1.0}]),
        }],
    };
    let trained = verified_language::training::replay(&m, &trace).unwrap();
    let frozen =
        verified_language::freezing::restrict(&m, &trained.snapshot, &["First".into()]).unwrap();
    for name in ["train_first", "feedback", "cancel"] {
        assert!(!frozen
            .module
            .program()
            .actions
            .iter()
            .any(|a| a.name == name));
    }
    assert_eq!(
        frozen.module.program().contracts.learning.trainable,
        ["Second", "Settings"]
    );
    let mut original = Runtime::restore_portable_checked(&m, &trained.snapshot).unwrap();
    let mut restricted =
        Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
    assert!(restricted
        .invoke_json("train_first", &json!([{"input":1.0,"target":1.0},1]))
        .is_err());
    let args = json!([{"input":0.8,"target":0.7},1]);
    assert_eq!(
        original.invoke_json("train_second", &args).unwrap().json(),
        restricted
            .invoke_json("train_second", &args)
            .unwrap()
            .json()
    );
    let old = snapshot_wire::decode(
        &snapshot::layout(m.program()).unwrap(),
        &original.checkpoint_portable().unwrap(),
        Default::default(),
    )
    .unwrap();
    let new = snapshot_wire::decode(
        &snapshot::layout(frozen.module.program()).unwrap(),
        &restricted.checkpoint_portable().unwrap(),
        Default::default(),
    )
    .unwrap();
    assert_eq!(old, new);
    assert!(Runtime::restore_portable_checked(&frozen.module, &trained.snapshot).is_err());
    let again =
        verified_language::freezing::restrict(&frozen.module, &frozen.snapshot, &["First".into()])
            .unwrap();
    assert_eq!(
        again.module.bytes().unwrap(),
        frozen.module.bytes().unwrap()
    );
    assert_eq!(again.snapshot, frozen.snapshot);
}
fn ok(out: Output) -> Output {
    assert!(
        out.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    out
}
fn build(target: &str, trace: &Path, out: &Path) -> Output {
    Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["build-model", "examples/adaptive-layout.ink"])
        .arg(trace)
        .args(["--freeze", "--target", target, "-o"])
        .arg(out)
        .output()
        .unwrap()
}
#[test]
fn trained_frozen_packages_start_and_preserve_remaining_capabilities_across_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!(
        "build/frozen-build-validation-{}",
        std::process::id()
    ));
    fs::create_dir_all(&root).unwrap();
    let trace = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("reports/trained-builds-2026-10-15/javascript/trace.json");
    let m = CheckedModule::from_source(
        verified_language::modules::load("examples/adaptive-layout.ink")
            .unwrap()
            .program,
    )
    .unwrap();
    let t = serde_json::from_slice(&fs::read(&trace).unwrap()).unwrap();
    let trained = verified_language::training::replay(&m, &t).unwrap();
    let frozen =
        verified_language::freezing::restrict(&m, &trained.snapshot, &["Model".into()]).unwrap();
    let mut rt = Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
    let mut cases = vec![];
    for (name, args) in [
        ("suggest", json!([{"width":0.5,"length":0.5}])),
        ("authored", json!([73])),
        ("suggest", json!([{"width":0.3,"length":0.7}])),
    ] {
        let outcome = rt.invoke_json(name, &args).unwrap();
        cases.push(json!({"call":name,"args":args,"outcome":outcome.json(),"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    let cases_file = root.join("cases.json");
    fs::write(&cases_file, serde_json::to_vec(&cases).unwrap()).unwrap();
    let mut targets = vec!["javascript", "native", "rust"];
    if std::env::var_os("INK_TEST_WASM").is_some() {
        targets.push("wasm32");
    }
    if std::env::var_os("INK_TEST_WGPU").is_some() {
        targets.push("webgpu");
    }
    for target in targets {
        let dir = root.join(target);
        ok(build(target, &trace, &dir));
        let verified = verified_language::training::verify_model(&dir, true).unwrap();
        assert_eq!(verified["mode"], "frozen");
        assert_eq!(verified["restriction_replayed"], true);
        assert_eq!(
            fs::read(dir.join("deployment.snapshot")).unwrap(),
            frozen.snapshot
        );
        if target == "javascript" || target == "wasm32" {
            let out = ok(Command::new("node")
                .arg("tests/fixtures/frozen-build.mjs")
                .arg(&dir)
                .arg(&cases_file)
                .output()
                .unwrap());
            println!("{}", String::from_utf8_lossy(&out.stdout));
            if target == "javascript" {
                assert_rehashed_tampering_rejected(&dir);
            }
            continue;
        }
        let executable = if target == "native" {
            dir.join(format!("program{}", std::env::consts::EXE_SUFFIX))
        } else {
            let project = dir.join(if target == "rust" {
                "program"
            } else {
                "program/native"
            });
            ok(Command::new(env!("CARGO"))
                .args(["fetch", "--locked", "--manifest-path"])
                .arg(project.join("Cargo.toml"))
                .output()
                .unwrap());
            let target_dir = if target == "rust" {
                root.join("rust-cache")
            } else {
                Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-gpu-target")
            };
            ok(Command::new(env!("CARGO"))
                .args([
                    "build",
                    "--locked",
                    "--offline",
                    "--quiet",
                    "--manifest-path",
                ])
                .arg(project.join("Cargo.toml"))
                .arg("--target-dir")
                .arg(&target_dir)
                .output()
                .unwrap());
            target_dir.join(format!(
                "debug/{}{}",
                if target == "rust" {
                    "compiled-state"
                } else {
                    "ink-module-program"
                },
                std::env::consts::EXE_SUFFIX
            ))
        };
        let mut script = cases
            .iter()
            .map(|s| json!({"call":s["call"],"args":s["args"]}))
            .collect::<Vec<_>>();
        if target == "webgpu" {
            script.push(
                json!({"pure":"batch","args":[[0.,0.5,1.,-1.],0.25],"backend":"gpu-required"}),
            );
        }
        let path = root.join(format!("{target}-script.json"));
        fs::write(&path, serde_json::to_vec(&script).unwrap()).unwrap();
        let checkpoint = root.join(format!("{target}.snapshot"));
        let out = ok(Command::new(executable)
            .arg(path)
            .arg("--snapshot-out")
            .arg(&checkpoint)
            .output()
            .unwrap());
        let rows: Vec<serde_json::Value> = serde_json::from_slice(&out.stdout).unwrap();
        for (row, expected) in rows.iter().zip(&cases) {
            assert_eq!(row, &expected["outcome"]);
        }
        if target == "webgpu" {
            assert_eq!(rows.last().unwrap()["backend"], "gpu");
            assert_eq!(
                rows.last().unwrap()["value"],
                json!([0., 0.0625, 0.25, 0.25])
            );
        }
        assert_eq!(
            fs::read(checkpoint).unwrap(),
            rt.checkpoint_portable().unwrap()
        );
        println!(
            "{target}: frozen startup, ordinary application updates and exact checkpoint matched"
        );
    }
}

// Inventory hashes establish integrity only. The restriction itself must replay.
fn assert_rehashed_tampering_rejected(dir: &Path) {
    let manifest_bytes = fs::read(dir.join("artifact.json")).unwrap();
    let original: serde_json::Value = serde_json::from_slice(&manifest_bytes).unwrap();
    for file in ["compiled.core.json", "deployment.snapshot"] {
        let path = dir.join(file);
        let before = fs::read(&path).unwrap();
        let changed = if file == "compiled.core.json" {
            let checked = CheckedModule::from_bytes(&before).unwrap();
            let mut p = checked.program().clone();
            p.frozen.get_mut("Model").unwrap()[0].1["bias"] = json!(0.75);
            CheckedModule::from_source(p).unwrap().bytes().unwrap()
        } else {
            let checked =
                CheckedModule::from_bytes(&fs::read(dir.join("compiled.core.json")).unwrap())
                    .unwrap();
            let layout = snapshot::layout(checked.program()).unwrap();
            let mut logical = snapshot_wire::decode(&layout, &before, Default::default()).unwrap();
            logical.version += 1;
            snapshot_wire::encode(&layout, &logical, Default::default()).unwrap()
        };
        fs::write(&path, &changed).unwrap();
        let mut manifest = original.clone();
        manifest["files"][file] =
            json!({"bytes":changed.len(),"sha256":format!("{:x}",Sha256::digest(&changed))});
        fs::write(
            dir.join("artifact.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
        let error = verified_language::training::verify_model(dir, false).unwrap_err();
        assert!(error.contains("restriction mismatch"), "{file}: {error}");
        fs::write(&path, before).unwrap();
        fs::write(dir.join("artifact.json"), &manifest_bytes).unwrap();
    }
    let mut manifest = original;
    manifest["restriction"]["removed_actions"] = json!([]);
    fs::write(
        dir.join("artifact.json"),
        serde_json::to_vec(&manifest).unwrap(),
    )
    .unwrap();
    assert!(verified_language::training::verify_model(dir, false)
        .unwrap_err()
        .contains("restriction mismatch"));
    fs::write(dir.join("artifact.json"), manifest_bytes).unwrap();
    verified_language::training::verify_model(dir, true).unwrap();
}

#[test]
fn neural_and_reward_models_freeze_complete_optimizer_and_control_state() {
    for (source, checkpoint, roots, args) in [
        (
            "examples/neural-adaptive.ink",
            "reports/reverse-learning-2026-10-15/complete.snapshot",
            vec!["Optimizer", "Control", "Architecture"],
            json!([vec![0.2; 10]]),
        ),
        (
            "examples/reward-policy.ink",
            "reports/policy-learning-2026-10-15/complete.snapshot",
            vec!["Agent"],
            json!([{"signal":0.7,"urgency":0.3}]),
        ),
        (
            "examples/staged-neural.ink",
            "reports/prepared-initializers-2026-10-16/neural/model.snapshot",
            vec!["Optimizer", "Control", "Architecture"],
            json!([vec![0.2; 10]]),
        ),
    ] {
        let module =
            CheckedModule::from_source(verified_language::modules::load(source).unwrap().program)
                .unwrap();
        let bytes = fs::read(checkpoint).unwrap();
        let roots = roots.into_iter().map(str::to_owned).collect::<Vec<_>>();
        let frozen = verified_language::freezing::restrict(&module, &bytes, &roots).unwrap();
        let mut adaptive = Runtime::restore_portable_checked(&module, &bytes).unwrap();
        let mut fixed =
            Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
        for (name, args) in [("model", json!([])), ("predict", args)] {
            assert_eq!(
                adaptive.invoke_json(name, &args).unwrap().json(),
                fixed.invoke_json(name, &args).unwrap().json()
            );
        }
        let before = snapshot_wire::decode(
            &snapshot::layout(module.program()).unwrap(),
            &bytes,
            Default::default(),
        )
        .unwrap();
        let after = snapshot_wire::decode(
            &snapshot::layout(frozen.module.program()).unwrap(),
            &fixed.checkpoint_portable().unwrap(),
            Default::default(),
        )
        .unwrap();
        assert_eq!(before, after);
        assert!(frozen
            .module
            .program()
            .contracts
            .learning
            .trainable
            .is_empty());
        assert!(frozen.module.program().contracts.learning.learn.is_empty());
        if source == "examples/staged-neural.ink" {
            // A checked fixed model is also the next staging input. Export the
            // real source binding and complete checkpoint, never a rebased header.
            let directory =
                Path::new(env!("CARGO_MANIFEST_DIR")).join("build/staged-neural-frozen");
            fs::create_dir_all(&directory).unwrap();
            fs::write(
                directory.join("source.core.json"),
                frozen.module.bytes().unwrap(),
            )
            .unwrap();
            fs::write(directory.join("model.snapshot"), &frozen.snapshot).unwrap();
        }
    }
}

#[test]
fn frozen_learned_structure_has_checked_complete_transitions_on_all_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let source = include_str!("../examples/adaptive-structure.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let trace =
        serde_json::from_str(include_str!("../examples/adaptive-structure-training.json")).unwrap();
    let trained = verified_language::training::replay(&module, &trace).unwrap();
    let frozen =
        verified_language::freezing::restrict(&module, &trained.snapshot, &["Choice".into()])
            .unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frozen-structure-authoring");
    fs::create_dir_all(&root).unwrap();
    let input = root.join("frozen.core.json");
    fs::write(&input, frozen.module.bytes().unwrap()).unwrap();
    let packet_file = root.join("selection.json");
    ok(Command::new("python3")
        .arg("knowledge/producers/frozen_specialization.py")
        .arg(&input)
        .arg("--ink")
        .arg(env!("CARGO_BIN_EXE_ink"))
        .arg("-o")
        .arg(&packet_file)
        .output()
        .unwrap());
    let packet = serde_json::from_slice(&fs::read(packet_file).unwrap()).unwrap();
    let selected = verified_language::optimisation::check(&frozen.module, &packet).unwrap();
    assert_ne!(
        selected.module().identity().unwrap(),
        frozen.module.identity().unwrap()
    );
    let body = serde_json::to_string(&selected.module().program().actions[0].body).unwrap();
    assert!(!body.contains("Choice") && !body.contains("evaluate") && !body.contains("expanded"));
    assert!(body.contains("word_and"));
    let mut baseline = Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
    let mut implementation =
        Runtime::restore_portable_selected(&selected, &frozen.snapshot).unwrap();
    let mut steps = vec![json!({"restore":frozen.snapshot})];
    let mut expected = vec![];
    let mut calls = vec![("choice", json!([])), ("costs", json!([]))];
    for (key, value, fail) in [
        (0, 0, false),
        (7, u64::MAX, false),
        (7, 42, true),
        (3, 255, false),
    ] {
        calls.push(("put", json!([key, value, fail])));
        for x in [0, 1, 255, 256, 1023, u64::MAX] {
            calls.push(("serve", json!([key, x])));
        }
    }
    for (name, args) in calls {
        let reply = baseline.invoke_json(name, &args).unwrap();
        assert_eq!(
            reply.json(),
            implementation.invoke_json(name, &args).unwrap().json()
        );
        assert_eq!(
            baseline.checkpoint_portable().unwrap(),
            implementation.checkpoint_portable().unwrap()
        );
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"restore":baseline.checkpoint_portable().unwrap()}));
    steps.push(json!({"pure":"batch","args":[[0.,0.5,-1.]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":baseline.checkpoint_portable().unwrap()}));
    parity::conformance_selected(
        "frozen-structure-parity",
        &selected,
        source,
        steps,
        expected,
    );
}

#[test]
fn frozen_numeric_structure_preserves_payloads_live_updates_and_all_target_snapshots() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let source = include_str!("../examples/frozen-numeric-structure.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let trace = serde_json::from_str(include_str!("../examples/frozen-numeric-structure-training.json")).unwrap();
    let trained = verified_language::training::replay(&module, &trace).unwrap();
    let frozen = verified_language::freezing::restrict(&module, &trained.snapshot, &["Model".into()]).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frozen-numeric-authoring");
    fs::create_dir_all(&root).unwrap();
    let input = root.join("frozen.core.json");
    fs::write(&input, frozen.module.bytes().unwrap()).unwrap();
    fs::write(root.join("initial.snapshot"), &frozen.snapshot).unwrap();
    let packet_file = root.join("selection.json");
    ok(Command::new("python3").arg("knowledge/producers/frozen_specialization.py")
        .arg(&input).arg("--ink").arg(env!("CARGO_BIN_EXE_ink"))
        .arg("-o").arg(&packet_file).output().unwrap());
    let packet = serde_json::from_slice(&fs::read(packet_file).unwrap()).unwrap();
    let selected = verified_language::optimisation::check(&frozen.module, &packet).unwrap();
    fs::write(root.join("selected.core.json"), selected.module().bytes().unwrap()).unwrap();
    let serve = selected.module().program().actions.iter().find(|a|a.name=="serve").unwrap();
    let body = serde_json::to_string(&serve.body).unwrap();
    assert!(!body.contains("Model") && !body.contains("evaluate") && !body.contains("kind"));
    assert!(body.contains("Live"));
    let mut baseline = Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
    let mut implementation = Runtime::restore_portable_selected(&selected, &frozen.snapshot).unwrap();
    assert_eq!(baseline.invoke_json("self_equal",&json!([])).unwrap().result.json(),json!(false));
    assert_eq!(baseline.invoke_json("is_zero",&json!([])).unwrap().result.json(),json!(true));
    assert_eq!(baseline.invoke_json("raw",&json!([1])).unwrap().result.json(),json!(0x7fa01234u32));
    assert_eq!(baseline.invoke_json("raw",&json!([2])).unwrap().result.json(),json!(0x80000000u32));
    let mut steps = vec![json!({"restore":frozen.snapshot})];
    let mut expected = vec![];
    let mut calls = vec![("self_equal",json!([])),("is_zero",json!([]))];
    for key in 0..4 {calls.push(("raw",json!([key])));}
    for (i,bits) in [0u32,0x80000000,1,0x3dcccccd,0x7f7fffff,0x7f800000,0x7fa01234,0xffc05678].into_iter().enumerate() {
        calls.push(("set_live",json!([{"F32Bits":bits},i%3==0])));
        for x in [0u32,0x80000000,0x3f000001,0x7fa05678] {
            calls.push(("serve",json!([{"F32Bits":x}])));
        }
        calls.push(("raw",json!([1])));
    }
    for (name,args) in calls {
        let reply = baseline.invoke_json(name,&args).unwrap();
        assert_eq!(reply.json(),implementation.invoke_json(name,&args).unwrap().json());
        assert_eq!(baseline.checkpoint_portable().unwrap(),implementation.checkpoint_portable().unwrap());
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"restore":baseline.checkpoint_portable().unwrap()}));
    steps.push(json!({"pure":"numeric","args":[[0.,0.5,1.]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":baseline.checkpoint_portable().unwrap()}));
    parity::conformance_selected("frozen-numeric-parity",&selected,source,steps,expected);
    let artifact=root.join(format!("artifact-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
    ok(Command::new(env!("CARGO_BIN_EXE_ink")).args([
        "build-model","examples/frozen-numeric-structure.ink","examples/frozen-numeric-structure-training.json",
        "--freeze-roots","Model","--specialize-frozen","--target","javascript","-o",
    ]).arg(&artifact).output().unwrap());
    verified_language::training::verify_model(&artifact,true).unwrap();
    ok(Command::new("node").arg("tests/fixtures/frozen-numeric-build.mjs").arg(&artifact)
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frozen-numeric-parity")).output().unwrap());
}

#[test]
fn frozen_program_keeps_weights_trainable_and_compiles_ordered_operations_on_all_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let source = include_str!("../examples/frozen-program.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let trace = serde_json::from_str(include_str!("../examples/frozen-program-training.json")).unwrap();
    let trained = verified_language::training::replay(&module, &trace).unwrap();
    let frozen = verified_language::freezing::restrict(&module, &trained.snapshot, &["Structure".into()]).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frozen-program-authoring");
    fs::create_dir_all(&root).unwrap();
    let input = root.join("frozen.core.json");
    fs::write(&input, frozen.module.bytes().unwrap()).unwrap();
    fs::write(root.join("initial.snapshot"), &frozen.snapshot).unwrap();
    let packet_file = root.join("selection.json");
    ok(Command::new("python3").arg("knowledge/producers/frozen_specialization.py")
        .arg(&input).arg("--ink").arg(env!("CARGO_BIN_EXE_ink"))
        .arg("-o").arg(&packet_file).output().unwrap());
    let packet = serde_json::from_slice(&fs::read(&packet_file).unwrap()).unwrap();
    let selected = verified_language::optimisation::check(&frozen.module, &packet).unwrap();
    fs::write(root.join("selected.core.json"), selected.module().bytes().unwrap()).unwrap();
    let program = selected.module().program();
    assert!(program.actions.iter().any(|a| a.name == "retune"));
    assert!(!program.actions.iter().any(|a| a.name == "configure"));
    assert!(program.contracts.learning.trainable.contains(&"Weights".into()));
    let serve = program.actions.iter().find(|a| a.name == "serve").unwrap();
    let body = serde_json::to_string(&serve.body).unwrap();
    for removed in ["Structure", "evaluate", "foldl", "Op"] { assert!(!body.contains(removed), "{removed}: {body}"); }
    assert!(body.contains("Weights") && body.contains("Live"));
    let mut baseline = Runtime::restore_portable_checked(&frozen.module, &frozen.snapshot).unwrap();
    let mut implementation = Runtime::restore_portable_selected(&selected, &frozen.snapshot).unwrap();
    let mut steps = vec![json!({"restore":frozen.snapshot})];
    let mut expected = vec![];
    let inputs = [0u32, 0x80000000, 1, 0x80000001, 0x3dcccccd, 0xbf000001,
                  0x7f7fffff, 0x7f800000, 0xff800000, 0x7fa01234, 0xffc05678];
    for (index, bits) in inputs.into_iter().enumerate() {
        let updates = [
            ("retune", json!([{"scale":{"F32Bits":bits},"bias":{"F32Bits":inputs[(index+3)%inputs.len()]}},index%3==0])),
            ("set_live", json!([{"F32Bits":bits}])),
        ];
        let calls = updates.into_iter().chain(inputs.into_iter().map(|x| ("serve",json!([{"F32Bits":x}]))));
        for (name, args) in calls {
            let reply = baseline.invoke_json(name, &args).unwrap();
            assert_eq!(reply.json(), implementation.invoke_json(name, &args).unwrap().json());
            assert_eq!(baseline.checkpoint_portable().unwrap(), implementation.checkpoint_portable().unwrap());
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
        }
    }
    steps.push(json!({"restore":baseline.checkpoint_portable().unwrap()}));
    steps.push(json!({"pure":"numeric","args":[[0.,0.5,1.]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":baseline.checkpoint_portable().unwrap()}));
    parity::conformance_selected("frozen-program-parity", &selected, source, steps, expected);
    let artifact = root.join(format!("artifact-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
    ok(Command::new(env!("CARGO_BIN_EXE_ink")).args([
        "build-model", "examples/frozen-program.ink", "examples/frozen-program-training.json",
        "--freeze-roots", "Structure", "--specialize-frozen", "--target", "javascript", "-o",
    ]).arg(&artifact).output().unwrap());
    verified_language::training::verify_model(&artifact, true).unwrap();
    ok(Command::new("node").arg("tests/fixtures/frozen-numeric-build.mjs").arg(&artifact)
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("build/frozen-program-parity")).output().unwrap());
}

#[test]
fn specialized_training_build_rechecks_proofs_even_after_inventory_rehashing() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join(format!("build/specialized-build-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    for target in ["javascript", "wasm32"] {
        if target == "wasm32" && std::env::var_os("INK_TEST_WASM").is_none() {
            continue;
        }
        let destination = root.join(target);
        ok(Command::new(env!("CARGO_BIN_EXE_ink"))
            .args([
                "build-model",
                "examples/adaptive-structure.ink",
                "examples/adaptive-structure-training.json",
                "--freeze-roots",
                "Choice",
                "--specialize-frozen",
                "--target",
                target,
                "-o",
            ])
            .arg(&destination)
            .output()
            .unwrap());
        verified_language::training::verify_model(&destination, true).unwrap();
        let file = destination.join("selection.json");
        let original = fs::read(&file).unwrap();
        let original_manifest = fs::read(destination.join("artifact.json")).unwrap();
        let mut packet: serde_json::Value = serde_json::from_slice(&original).unwrap();
        packet["action_replacement"]["proofs"]["serve"] = json!({"Hypothesis":999});
        let changed = serde_json::to_vec(&packet).unwrap();
        fs::write(&file, &changed).unwrap();
        let mut manifest: serde_json::Value = serde_json::from_slice(&original_manifest).unwrap();
        manifest["files"]["selection.json"] =
            json!({"bytes":changed.len(),"sha256":format!("{:x}",Sha256::digest(&changed))});
        fs::write(
            destination.join("artifact.json"),
            serde_json::to_vec(&manifest).unwrap(),
        )
        .unwrap();
        let error = verified_language::training::verify_model(&destination, false).unwrap_err();
        assert!(error.contains("action serve"), "{error}");
        fs::write(file, original).unwrap();
        fs::write(destination.join("artifact.json"), original_manifest).unwrap();
        verified_language::training::verify_model(&destination, false).unwrap();
    }
    let bad = root.join("missing-restriction");
    let rejected = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args([
            "build-model",
            "examples/adaptive-structure.ink",
            "examples/adaptive-structure-training.json",
            "--specialize-frozen",
            "--target",
            "javascript",
            "-o",
        ])
        .arg(&bad)
        .output()
        .unwrap();
    assert!(!rejected.status.success() && !bad.exists());
}

#[test]
fn authored_objective_changes_reset_scores_and_reject_stale_feedback() {
    let module = CheckedModule::from_source(
        syntax::parse(include_str!("../examples/adaptive-structure.ink")).unwrap(),
    )
    .unwrap();
    let mut rt = Runtime::from_checked(&module).unwrap();
    let observations =
        json!([{"latency":120,"energy":10,"memory":20},{"latency":30,"energy":40,"memory":5},0]);
    rt.invoke_json("observe", &observations).unwrap();
    assert_eq!(
        rt.invoke_json("choice", &json!([])).unwrap().result.json(),
        json!("Representation.Packed")
    );
    assert_eq!(
        rt.invoke_json("retarget", &json!([{"latency":0,"energy":1,"memory":0},0]))
            .unwrap()
            .result
            .json(),
        json!({"Ok":1})
    );
    assert_eq!(
        rt.invoke_json("costs", &json!([])).unwrap().result.json(),
        json!({"expanded":0,"packed":0,"observations":0})
    );
    let before = rt.checkpoint_portable().unwrap();
    assert_eq!(
        rt.invoke_json("observe", &observations)
            .unwrap()
            .result
            .json(),
        json!({"Err":"Error.Domain"})
    );
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    let mut next = observations;
    next[2] = json!(1);
    rt.invoke_json("observe", &next).unwrap();
    assert_eq!(
        rt.invoke_json("choice", &json!([])).unwrap().result.json(),
        json!("Representation.Expanded")
    );
}

#[test]
fn restored_objective_and_score_domains_are_checked_before_arithmetic() {
    let module = CheckedModule::from_source(
        syntax::parse(include_str!("../examples/adaptive-structure.ink")).unwrap(),
    )
    .unwrap();
    let mut rt = Runtime::from_checked(&module).unwrap();
    let observations =
        json!([{"latency":120,"energy":10,"memory":20},{"latency":30,"energy":40,"memory":5},0]);
    rt.invoke_json("observe", &observations).unwrap();
    let layout = snapshot::layout(module.program()).unwrap();
    let bytes = rt.checkpoint_portable().unwrap();
    for name in ["Target", "History"] {
        let mut logical = snapshot_wire::decode(&layout, &bytes, Default::default()).unwrap();
        let index = layout.roots.iter().position(|(n, _, _)| n == name).unwrap();
        if name == "Target" {
            logical.tables[index] = vec![(
                json!(0),
                json!({"weights":{"latency":u64::MAX,"energy":0,"memory":0},"version":0}),
            )];
        } else {
            logical.tables[index][0].1["expanded"] = json!(u64::MAX);
        }
        let forged = snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
        let mut restored = Runtime::restore_portable_checked(&module, &forged).unwrap();
        assert_eq!(
            restored
                .invoke_json("observe", &observations)
                .unwrap()
                .result
                .json(),
            json!({"Err":"Error.Domain"})
        );
        assert_eq!(restored.checkpoint_portable().unwrap(), forged);
    }
}
