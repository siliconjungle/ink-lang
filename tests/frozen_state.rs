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
fn frozen_helper_chunks_preserve_long_computation_live_updates_and_checkpoints_on_all_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    for repeat in [4usize, 16, 64] {
        let source = include_str!("../examples/frozen-program.ink");
        let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
        let mut trace: serde_json::Value = serde_json::from_str(include_str!("../examples/frozen-program-training.json")).unwrap();
        let short = trace["observations"][0]["args"][0].as_array().unwrap().clone();
        trace["observations"][0]["args"][0] = json!((0..repeat).flat_map(|_|short.clone()).collect::<Vec<_>>());
        let trained = verified_language::training::replay(&module, &serde_json::from_value(trace).unwrap()).unwrap();
        let frozen = verified_language::freezing::restrict(&module, &trained.snapshot, &["Structure".into()]).unwrap();
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/frozen-composition-authoring-{}",repeat*8));
        fs::create_dir_all(&root).unwrap();
        let input = root.join("frozen.core.json");
        fs::write(&input, frozen.module.bytes().unwrap()).unwrap();
        fs::write(root.join("initial.snapshot"), &frozen.snapshot).unwrap();
        let file = root.join("plan.json");
        ok(Command::new("python3").arg("knowledge/producers/frozen_composition.py")
            .arg(&input).arg("--ink").arg(env!("CARGO_BIN_EXE_ink"))
            .arg("-o").arg(&file).output().unwrap());
        let package: verified_language::planning::Package = serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
        let plan = verified_language::planning::check(&frozen.module, &package).unwrap();
        assert_eq!(package.steps.len(), 2);
        assert_eq!(plan.module().program().functions.len(), frozen.module.program().functions.len()+repeat.ilog2() as usize+1);
        assert_eq!(plan.module().program().contracts.learning.trainable, vec!["Weights".to_string()]);
        fs::write(root.join("selected.core.json"), plan.module().bytes().unwrap()).unwrap();
        let serve = plan.module().program().actions.iter().find(|a|a.name=="serve").unwrap();
        let body = serde_json::to_string(&serve.body).unwrap();
        assert!(!body.contains("Structure") && !body.contains("evaluate") && !body.contains("foldl"));
        let mut bad = serde_json::to_value(&package).unwrap();
        bad["steps"][1]["package"]["action_replacement"]["proofs"]["serve"] = json!({"Hypothesis":999});
        let bad = serde_json::from_value(bad).unwrap();
        assert!(verified_language::planning::check(&frozen.module,&bad).err().unwrap().contains("action serve"));
        let mut baseline = Runtime::restore_portable_checked(&frozen.module,&frozen.snapshot).unwrap();
        let layout = snapshot::layout(frozen.module.program()).unwrap();
        let mut changed = snapshot_wire::decode(&layout,&frozen.snapshot,Default::default()).unwrap();
        let structure = layout.roots.iter().position(|(name,_,_)|name=="Structure").unwrap();
        changed.tables[structure][0].1[0] = json!("Op.Bias");
        let forged = snapshot_wire::encode(&layout,&changed,Default::default()).unwrap();
        assert!(Runtime::restore_portable_checked(&frozen.module,&forged).err().unwrap().contains("frozen"));
        let mut steps = vec![json!({"restore":frozen.snapshot}),json!({"reject_restore":forged,"restore_error":"frozen"})];
        let mut expected = vec![];
        let inputs = [0u32,0x80000000,1,0x80000001,0x3dcccccd,0xbf000001,0x7f7fffff,
            0x7f800000,0xff800000,0x7fa01234,0xffc05678];
        for (index,bits) in inputs.into_iter().enumerate() {
            for (name,args) in [
                ("retune",json!([{"scale":{"F32Bits":bits},"bias":{"F32Bits":inputs[(index+3)%inputs.len()]}},index%3==0])),
                ("set_live",json!([{"F32Bits":bits}])),
            ].into_iter().chain(inputs.into_iter().map(|x|("serve",json!([{"F32Bits":x}])))) {
                let reply = baseline.invoke_json(name,&args).unwrap();
                steps.push(json!({"call":name,"args":args}));
                expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
            }
        }
        steps.push(json!({"restore":baseline.checkpoint_portable().unwrap()}));
        // Compare the complete generated root with the independent evaluator
        // of the original traversal, including exceptional raw F32 classes.
        let evaluator = frozen.module.program().functions.iter().find(|f| f.name == "evaluate").unwrap();
        let helper = &plan.module().program().functions.last().unwrap().name;
        assert!(helper.starts_with("__frozen_proposal_"));
        let code = json!((0..repeat).flat_map(|_|short.clone()).collect::<Vec<_>>());
        for (index, bits) in inputs.into_iter().enumerate() {
            let weights = json!({"scale":{"F32Bits":inputs[(index+3)%inputs.len()]},"bias":{"F32Bits":inputs[(index+5)%inputs.len()]}});
            let args = vec![code.clone(),weights.clone(),json!({"F32Bits":bits})];
            let typed = args.iter().zip(&evaluator.params).map(|(v,(_,t))|
                verified_language::eval::Value::from_program_json(v,t,frozen.module.program()).unwrap()).collect();
            let value = verified_language::eval::call(frozen.module.program(),"evaluate",typed,&mut 1000000).unwrap().json();
            steps.push(json!({"pure":helper,"args":[weights,{"F32Bits":bits}],"expect_gpu":true}));
            expected.push(json!({"reply":{"value":value},"snapshot":baseline.checkpoint_portable().unwrap()}));
        }
        steps.push(json!({"pure":"numeric","args":[[0.,0.5,1.]],"expect_gpu":true}));
        expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":baseline.checkpoint_portable().unwrap()}));
        parity::conformance_planned(&format!("frozen-composition-{}-parity",repeat*8),&plan,source,steps,expected);
    }
}

#[test]
fn learned_instruction_program_resumes_adapts_and_freezes_with_complete_proofs() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    use verified_language::{modules, training};
    let source = include_str!("../examples/learned-program.ink");
    let module = CheckedModule::from_source(modules::load("examples/learned-program.ink").unwrap().program).unwrap();
    let trace: training::Trace = serde_json::from_str(include_str!("../examples/learned-program-training.json")).unwrap();
    let complete = training::replay(&module, &trace).unwrap();
    let split = 131;
    let encoded = serde_json::to_value(&trace).unwrap();
    let observations = encoded["observations"].as_array().unwrap();
    let first: training::Trace = serde_json::from_value(json!({"schema":1,"epochs":1,"observations":&observations[..split]})).unwrap();
    let rest: training::Trace = serde_json::from_value(json!({"schema":1,"epochs":1,"observations":&observations[split..]})).unwrap();
    let first = training::replay(&module, &first).unwrap();
    let resumed = training::replay_from(&module, &rest, Some(&first.snapshot)).unwrap();
    assert_eq!(complete.snapshot, resumed.snapshot);
    let mut runtime = Runtime::restore_portable_checked(&module, &complete.snapshot).unwrap();
    let policy = runtime.invoke_json("policy", &json!([])).unwrap().result.json();
    assert_eq!(policy["Ok"]["steps"], 384);
    for name in ["weights", "first", "second"] {
        assert_eq!(policy["Ok"][name].as_array().unwrap().len(),16);
    }
    let weights: Vec<f64> = policy["Ok"]["weights"].as_array().unwrap().iter().map(|v|v.as_f64().unwrap()).collect();
    let inputs = [-4.0_f32,-1.5,-0.25,0.0,0.75,2.0,4.0];
    let evaluate = |motif: [usize;4], input: f32| {
        let mut x = input;
        for _ in 0..8 { for op in motif {
            x = match op { 0=>x, 1=>x*0.75, 2=>x+0.25, 3=>if x>0.0{x}else{0.0}, _=>unreachable!() };
        }}
        x
    };
    let mut matching = 0; let mut mass = 0.0;
    for code in 0..256 {
        let motif = [code/64,(code/16)%4,(code/4)%4,code%4];
        if inputs.iter().all(|x| evaluate(motif,*x).to_bits()==evaluate([2,1,3,0],*x).to_bits()) {
            matching += 1;
            mass += (0..4).map(|slot| {
                let masses:Vec<_> = weights[slot*4..slot*4+4].iter().map(|z| ((*z as f32)*(*z as f32)+0.1_f32) as f64).collect();
                masses[motif[slot]]/masses.iter().sum::<f64>()
            }).product::<f64>();
        }
    }
    assert_eq!(matching,11); assert!(mass>0.8,"matching program probability: {mass}");
    let code = runtime.invoke_json("structure",&json!([])).unwrap().result.json();
    assert_eq!(code.as_array().unwrap().len(),32);
    let loss = runtime.invoke_json("loss",&json!([])).unwrap().result.json();
    assert!((loss["Ok"].as_f64().unwrap()-24e-6).abs()<1e-10);
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/learned-program-parity");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("training.snapshot"),&complete.snapshot).unwrap();
    fs::write(root.join("split.snapshot"),&first.snapshot).unwrap();
    fs::write(root.join("training.receipt.json"),serde_json::to_vec_pretty(&complete.receipt).unwrap()).unwrap();
    fs::write(root.join("learning.json"),serde_json::to_vec_pretty(&json!({"matching_motifs":matching,"initial_probability":matching as f64/256.0,"trained_probability":mass})).unwrap()).unwrap();
    // Continuous runtime learning uses exactly the same authored action and
    // complete optimizer state as offline replay, including rollback.
    let mut steps=vec![json!({"restore":complete.snapshot})];let mut expected=vec![];
    for (name,args) in [
        ("episode",json!([[0.1,0.2,0.3,0.4],0.02,1])),
        ("aborted",json!([[0.3,0.4,0.5,0.6],0.02,1])),
        ("episode",json!([[0.1,0.2,0.3,1.0],0.02,1])),
        ("retarget",json!([[{"input":-1.,"target":0.5},{"input":1.,"target":0.75}],0.000001,1])),
        ("episode",json!([[0.1,0.2,0.3,0.4],0.02,1])),
        ("episode",json!([[0.1,0.2,0.3,0.4],0.02,2])),
        ("policy",json!([])),("loss",json!([])),
    ] {
        let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(name,&args).unwrap();
        if !reply.committed { assert_eq!(before,runtime.checkpoint_portable().unwrap()); }
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance_checked("learned-program-adaptive-parity",&module,source,steps,expected);
    let frozen=verified_language::freezing::restrict(&module,&complete.snapshot,&["Structure".into()]).unwrap();
    let input=root.join("frozen.core.json");fs::write(&input,frozen.module.bytes().unwrap()).unwrap();
    let file=root.join("plan.json");
    ok(Command::new("python3").arg("knowledge/producers/frozen_composition.py").arg(&input)
        .arg("--ink").arg(env!("CARGO_BIN_EXE_ink")).arg("-o").arg(&file).output().unwrap());
    let package=serde_json::from_slice(&fs::read(&file).unwrap()).unwrap();
    let plan=verified_language::planning::check(&frozen.module,&package).unwrap();
    fs::write(root.join("selected.core.json"),plan.module().bytes().unwrap()).unwrap();
    for name in ["episode","aborted"] {assert!(!plan.module().program().actions.iter().any(|a|a.name==name));}
    for name in ["Weights","Policy","Target"] {assert!(plan.module().program().contracts.learning.trainable.contains(&name.into()));}
    let mut runtime=Runtime::restore_portable_checked(&frozen.module,&frozen.snapshot).unwrap();
    let mut steps=vec![json!({"restore":frozen.snapshot})];let mut expected=vec![];
    let goal=json!([[{"input":-1.,"target":0.5},{"input":1.,"target":0.75}],0.000001,1]);
    for (name,args) in [
        ("serve",json!([0.375])),("loss",json!([])),
        ("retune",json!([{"scale":0.5,"bias":0.125},false])),
        ("serve",json!([-1.5])),("loss",json!([])),
        ("retune",json!([{"scale":0.75,"bias":0.25},true])),
        ("retune",json!([{"scale":2.,"bias":0.25},false])),
        ("set_live",json!([0.125])),("serve",json!([0.375])),
        ("retarget",goal.clone()),("retarget",goal),("loss",json!([])),("policy",json!([])),
    ] {
        let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(name,&args).unwrap();
        if !reply.committed {assert_eq!(before,runtime.checkpoint_portable().unwrap());}
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let helper=&plan.module().program().functions.iter().rev().find(|f|
        f.name.starts_with("__frozen_proposal_") && f.result==syntax::Type::F32 && f.params.len()==2
        && f.params[0].1==syntax::Type::Named("Coefficients".into()) && f.params[1].1==syntax::Type::F32).unwrap().name;
    let evaluator=frozen.module.program().functions.iter().find(|f|f.name=="evaluate").unwrap();
    for bits in [0u32,0x80000000,1,0x80000001,0x3dcccccd,0xbf000001,0x7f7fffff,0x7f800000,0xff800000,0x7fa01234,0xffc05678] {
        let w=json!({"scale":0.75,"bias":0.25});let x=json!({"F32Bits":bits});
        let args=[code.clone(),w.clone(),x.clone()].iter().zip(&evaluator.params).map(|(v,(_,ty))|
            verified_language::eval::Value::from_program_json(v,ty,frozen.module.program()).unwrap()).collect();
        let value=verified_language::eval::call(frozen.module.program(),"evaluate",args,&mut 1000000).unwrap().json();
        steps.push(json!({"pure":helper,"args":[w,x],"expect_gpu":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance_planned("learned-program-frozen-parity",&plan,source,steps,expected);
}

#[test]
fn shared_frozen_parameter_lists_preserve_complete_results_and_live_learning_on_all_targets() {
    let _guard = COMPILED.lock().unwrap_or_else(|e| e.into_inner());
    let source = include_str!("../examples/frozen-parameters.ink");
    let original = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let trace = serde_json::from_str(include_str!("../examples/frozen-parameters-training.json")).unwrap();
    let trained = verified_language::training::replay(&original,&trace).unwrap();
    let frozen = verified_language::freezing::restrict(&original,&trained.snapshot,&["Model".into()]).unwrap();
    let module = frozen.module;
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/shared-frozen-parameters");
    fs::create_dir_all(&root).unwrap();
    let input=root.join("input.core.json");fs::write(&input,module.bytes().unwrap()).unwrap();
    let packet_file=root.join("selection.json");
    ok(Command::new("python3").arg("knowledge/producers/frozen_specialization.py")
        .arg(&input).arg("--ink").arg(env!("CARGO_BIN_EXE_ink"))
        .arg("-o").arg(&packet_file).output().unwrap());
    let packet=serde_json::from_slice(&fs::read(&packet_file).unwrap()).unwrap();
    let selected=verified_language::optimisation::check(&module,&packet).unwrap();
    fs::write(root.join("selected.core.json"),selected.module().bytes().unwrap()).unwrap();
    let all=selected.module().program().actions.iter().find(|a|a.name=="all").unwrap();
    assert!(!serde_json::to_string(&all.body).unwrap().contains("Model"));
    assert!(selected.module().program().contracts.learning.trainable.contains(&"Weights".into()));
    assert!(!selected.module().program().actions.iter().any(|a|a.name=="configure"));
    let mut baseline=Runtime::restore_portable_checked(&module,&frozen.snapshot).unwrap();
    assert_eq!(baseline.invoke_json("live",&json!([])).unwrap().result.json(),json!(0.5));
    let Value::List(configured)=baseline.invoke_json("all",&json!([])).unwrap().result else {panic!("configured parameter list")};
    assert_eq!(configured.len(),244);
    for (index,bits) in [(1,0x80000000),(4,0x7fa01234),(5,0xffc05678),(6,0x7f800000),(7,0xff800000),(243,0x80000000)] {
        let Value::F32(actual)=&configured[index] else {panic!("configured F32 bits")};
        assert_eq!(*actual,bits);
    }
    let seed=baseline.checkpoint_portable().unwrap();fs::write(root.join("initial.snapshot"),&seed).unwrap();
    let mut implementation=Runtime::restore_portable_selected(&selected,&seed).unwrap();
    let layout=snapshot::layout(module.program()).unwrap();
    let mut changed=snapshot_wire::decode(&layout,&seed,Default::default()).unwrap();
    let model=layout.roots.iter().position(|(name,_,_)|name=="Model").unwrap();
    changed.tables[model][0].1[4]=Value::F32(0x7fa01235).json();
    let forged=snapshot_wire::encode(&layout,&changed,Default::default()).unwrap();
    assert!(Runtime::restore_portable_checked(&module,&forged).err().unwrap().contains("frozen"));
    let mut steps=vec![json!({"restore":seed}),json!({"reject_restore":forged,"restore_error":"frozen"})];let mut expected=vec![];
    for (i,bits) in [0u32,0x80000000,1,0x3dcccccd,0x7f7fffff,0x7f800000,0x7fa01234,0xffc05678].into_iter().enumerate() {
        for (name,args) in [("retune",json!([{"F32Bits":bits},i%3==0])),("live",json!([])),("all",json!([])),("present",json!([]))] {
            let reply=baseline.invoke_json(name,&args).unwrap();
            assert_eq!(reply.json(),implementation.invoke_json(name,&args).unwrap().json());
            assert_eq!(baseline.checkpoint_portable().unwrap(),implementation.checkpoint_portable().unwrap());
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":baseline.checkpoint_portable().unwrap()}));
        }
    }
    steps.push(json!({"restore":baseline.checkpoint_portable().unwrap()}));
    steps.push(json!({"pure":"numeric","args":[[0.,0.5,1.]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":baseline.checkpoint_portable().unwrap()}));
    parity::conformance_selected("shared-frozen-parameters-parity",&selected,source,steps,expected);
    let artifact=root.join(format!("artifact-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
    ok(Command::new(env!("CARGO_BIN_EXE_ink")).args([
        "build-model","examples/frozen-parameters.ink","examples/frozen-parameters-training.json",
        "--freeze-roots","Model","--specialize-frozen","--target","javascript","-o",
    ]).arg(&artifact).output().unwrap());
    verified_language::training::verify_model(&artifact,true).unwrap();
    ok(Command::new("node").arg("tests/fixtures/frozen-numeric-build.mjs").arg(&artifact)
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("build/shared-frozen-parameters-parity")).output().unwrap());
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
