use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
    sync::atomic::{AtomicU32, Ordering},
};
use verified_language::{core::CheckedModule, stateful::Runtime, training};
static NEXT: AtomicU32 = AtomicU32::new(0);
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("build/trained-build-validation")
}
fn fresh(name: &str) -> PathBuf {
    root().join(format!(
        "{name}-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ))
}
fn ok(output: Output) -> Output {
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    output
}
fn trace() -> training::Trace {
    training::Trace {
        schema: 1,
        epochs: 4,
        observations: [(0., 0., 0.2), (1., 0., 0.7), (0., 1., 0.7), (1., 1., 0.2)]
            .iter()
            .map(|(width, length, target)| training::Observation {
                call: "observe".into(),
                args: json!([{"width":width,"length":length},target,0.1]),
            })
            .collect(),
    }
}
fn build(target: &str, source: &str, trace: &Path, parent: Option<&Path>, out: &Path) -> Output {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_ink"));
    cmd.current_dir(env!("CARGO_MANIFEST_DIR"))
        .args(["build-model", source])
        .arg(trace)
        .args(["--target", target, "-o"])
        .arg(out);
    if let Some(parent) = parent {
        cmd.arg("--restore").arg(parent);
    }
    cmd.output().unwrap()
}
fn verify(out: &Path) {
    let output = ok(Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("verify-model")
        .arg(out)
        .arg("--replay")
        .output()
        .unwrap());
    let v: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(v["training_replayed"], true);
}
fn fixture() -> (CheckedModule, Vec<u8>, PathBuf, Vec<Value>) {
    fs::create_dir_all(root()).unwrap();
    let t = trace();
    let trace_file = fresh("trace.json");
    fs::write(&trace_file, serde_json::to_vec(&t).unwrap()).unwrap();
    let module = CheckedModule::from_source(
        verified_language::modules::load("examples/adaptive-layout.ink")
            .unwrap()
            .program,
    )
    .unwrap();
    let trained = training::replay(&module, &t).unwrap();
    let mut rt = Runtime::restore_portable_checked(&module, &trained.snapshot).unwrap();
    let mut cases = vec![];
    for (call, args) in [
        ("suggest", json!([{"width":0.5,"length":0.5}])),
        ("observe", json!([{"width":0.3,"length":0.7},0.4,0.05])),
        ("authored", json!([73])),
        ("suggest", json!([{"width":0.2,"length":0.8}])),
    ] {
        let out = rt.invoke_json(call, &args).unwrap();
        cases.push(json!({"id":call,"call":call,"args":args,"outcome":out.json(),"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    (module, trained.snapshot, trace_file, cases)
}
#[test]
fn build_stage_packages_trained_state_and_continues_across_cpu_targets() {
    let (module, seed, trace, cases) = fixture();
    let cases_file = fresh("cases.json");
    fs::write(&cases_file, serde_json::to_vec(&cases).unwrap()).unwrap();
    let mut targets = vec!["javascript", "native", "rust"];
    if std::env::var_os("INK_TEST_WASM").is_some() {
        targets.push("wasm32");
    } else if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        panic!("required trained-build Wasm coverage needs INK_TEST_WASM");
    }
    for target in targets {
        let directory = fresh(target);
        ok(build(
            target,
            "examples/adaptive-layout.ink",
            &trace,
            None,
            &directory,
        ));
        verify(&directory);
        assert_eq!(fs::read(directory.join("model.snapshot")).unwrap(), seed);
        let checked =
            CheckedModule::from_bytes(&fs::read(directory.join("source.core.json")).unwrap())
                .unwrap();
        assert_eq!(checked.identity().unwrap(), module.identity().unwrap());
        if target == "javascript" || target == "wasm32" {
            let out = ok(Command::new("node")
                .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/trained-build.mjs"))
                .arg(&directory)
                .arg(&cases_file)
                .output()
                .unwrap());
            println!("{}", String::from_utf8_lossy(&out.stdout));
        } else {
            let script = fresh("native-script.json");
            let calls: Vec<_> = cases
                .iter()
                .enumerate()
                .map(|(i, s)| json!({"id":format!("call-{i}"),"call":s["call"],"args":s["args"]}))
                .collect();
            fs::write(&script, serde_json::to_vec(&calls).unwrap()).unwrap();
            let checkpoint = fresh("native.snapshot");
            let mut cmd = if target == "rust" {
                let mut c = Command::new(env!("CARGO"));
                c.args(["run", "--quiet", "--release", "--locked", "--manifest-path"])
                    .arg(directory.join("program/Cargo.toml"))
                    .arg("--target-dir")
                    .arg(root().join("rust-project-cache"))
                    .arg("--");
                c
            } else {
                Command::new(directory.join(format!("program{}", std::env::consts::EXE_SUFFIX)))
            };
            let out = ok(cmd
                .arg(&script)
                .arg("--snapshot-out")
                .arg(&checkpoint)
                .output()
                .unwrap());
            let actual: Vec<Value> = serde_json::from_slice(&out.stdout).unwrap();
            assert_eq!(
                actual,
                cases
                    .iter()
                    .map(|v| v["outcome"].clone())
                    .collect::<Vec<_>>()
            );
            assert_eq!(
                fs::read(&checkpoint).unwrap(),
                serde_json::from_value::<Vec<u8>>(cases.last().unwrap()["snapshot"].clone())
                    .unwrap()
            );
            if target == "native" {
                let store = fresh("native.inkstate");
                let durable_snapshot = fresh("durable.snapshot");
                let binary = directory.join(format!("program{}", std::env::consts::EXE_SUFFIX));
                ok(Command::new(&binary)
                    .arg(&script)
                    .arg("--durable")
                    .arg(&store)
                    .arg("--snapshot-out")
                    .arg(&durable_snapshot)
                    .output()
                    .unwrap());
                assert_eq!(
                    fs::read(&durable_snapshot).unwrap(),
                    fs::read(&checkpoint).unwrap()
                );
                let read = fresh("read.json");
                fs::write(&read,serde_json::to_vec(&json!([{"id":"read-final","call":cases.last().unwrap()["call"],"args":cases.last().unwrap()["args"]}])).unwrap()).unwrap();
                let output = ok(Command::new(&binary)
                    .arg(&read)
                    .arg("--durable")
                    .arg(&store)
                    .arg("--snapshot-out")
                    .arg(&durable_snapshot)
                    .output()
                    .unwrap());
                assert_eq!(
                    serde_json::from_slice::<Vec<Value>>(&output.stdout).unwrap(),
                    vec![cases.last().unwrap()["outcome"].clone()]
                );
                assert_eq!(
                    fs::read(&durable_snapshot).unwrap(),
                    fs::read(&checkpoint).unwrap()
                );
                ok(Command::new(&binary)
                    .arg(&read)
                    .arg("--restore")
                    .arg(&checkpoint)
                    .arg("--snapshot-out")
                    .arg(&durable_snapshot)
                    .output()
                    .unwrap());
                assert_eq!(
                    fs::read(&durable_snapshot).unwrap(),
                    fs::read(&checkpoint).unwrap()
                );
            }
            println!("{target}: seeded startup, learning, application state and exact checkpoint matched");
        }
        verify(&directory);
    }
}
#[test]
fn trained_adam_build_resumes_all_moments_and_control_state() {
    fs::create_dir_all(root()).unwrap();
    let directory = fresh("adam");
    let parent = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("reports/reverse-learning-2026-10-15/first.snapshot");
    let trace = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("reports/reverse-learning-2026-10-15/trace-6.json");
    ok(build(
        "javascript",
        "examples/neural-adaptive.ink",
        &trace,
        Some(&parent),
        &directory,
    ));
    verify(&directory);
    assert_eq!(
        fs::read(directory.join("model.snapshot")).unwrap(),
        fs::read("reports/reverse-learning-2026-10-15/complete.snapshot").unwrap()
    );
    let cases = fresh("adam-cases.json");
    fs::write(&cases, b"[]").unwrap();
    ok(Command::new("node")
        .arg("tests/fixtures/trained-build.mjs")
        .arg(&directory)
        .arg(cases)
        .output()
        .unwrap());
}
#[test]
fn failed_training_and_tampered_artifacts_fail_without_replacing_publication() {
    let (module, _, trace, _) = fixture();
    let directory = fresh("immutable");
    ok(build(
        "javascript",
        "examples/adaptive-layout.ink",
        &trace,
        None,
        &directory,
    ));
    let manifest = fs::read(directory.join("artifact.json")).unwrap();
    assert!(!build(
        "javascript",
        "examples/adaptive-layout.ink",
        &trace,
        None,
        &directory
    )
    .status
    .success());
    assert_eq!(fs::read(directory.join("artifact.json")).unwrap(), manifest);
    let bad = fresh("bad-trace.json");
    fs::write(
        &bad,
        serde_json::to_vec(
            &json!({"schema":1,"epochs":1,"observations":[{"call":"authored","args":[3]}]}),
        )
        .unwrap(),
    )
    .unwrap();
    let rejected = fresh("rejected");
    assert!(!build(
        "javascript",
        "examples/adaptive-layout.ink",
        &bad,
        None,
        &rejected
    )
    .status
    .success());
    assert!(!rejected.exists());
    let private = directory.join("program.mjs.initial.snapshot");
    let original_seed = fs::read(&private).unwrap();
    let replacement = Runtime::from_checked(&module)
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    fs::write(&private, &replacement).unwrap();
    let mut changed: Value = serde_json::from_slice(&manifest).unwrap();
    use sha2::{Digest, Sha256};
    changed["files"]["program.mjs.initial.snapshot"] =
        json!({"bytes":replacement.len(),"sha256":format!("{:x}",Sha256::digest(&replacement))});
    fs::write(
        directory.join("artifact.json"),
        serde_json::to_vec(&changed).unwrap(),
    )
    .unwrap();
    assert!(training::verify_model(&directory, false)
        .unwrap_err()
        .contains("compiled initial checkpoint"));
    fs::write(&private, original_seed).unwrap();
    fs::write(directory.join("artifact.json"), manifest).unwrap();
    fs::write(directory.join("program.mjs"), "changed").unwrap();
    assert!(training::verify_model(&directory, false).is_err());
    let failed = fresh("failed-toolchain");
    let output = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["build-model", "examples/adaptive-layout.ink"])
        .arg(&trace)
        .args([
            "--target",
            "native",
            "--cargo",
            "/nonexistent/ink-cargo",
            "-o",
        ])
        .arg(&failed)
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(!failed.exists());
}

#[test]
fn trained_gpu_module_initializes_the_same_state_and_dispatches_numeric_work() {
    if std::env::var_os("INK_TEST_WGPU").is_none() {
        eprintln!("trained GPU execution requires INK_TEST_WGPU");
        return;
    }
    let (_, seed, trace, cases) = fixture();
    let directory = fresh("webgpu");
    ok(build(
        "webgpu",
        "examples/adaptive-layout.ink",
        &trace,
        None,
        &directory,
    ));
    verify(&directory);
    let project = directory.join("program/native");
    let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-gpu-target");
    ok(Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(project.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(&target)
        .output()
        .unwrap());
    let script = fresh("gpu-script.json");
    fs::write(
        &script,
        serde_json::to_vec(&json!([
            {"call":"suggest","args":[{"width":0.5,"length":0.5}]},
            {"pure":"batch","args":[[0.0,0.5,1.0,-1.0],0.25],"backend":"gpu-required"}
        ]))
        .unwrap(),
    )
    .unwrap();
    let snapshot = fresh("gpu.snapshot");
    let output = ok(Command::new(target.join(format!(
        "debug/ink-module-program{}",
        std::env::consts::EXE_SUFFIX
    )))
    .arg(script)
    .arg("--snapshot-out")
    .arg(&snapshot)
    .output()
    .unwrap());
    let rows: Vec<Value> = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(rows[0], cases[0]["outcome"]);
    assert_eq!(rows[1]["backend"], "gpu");
    assert_eq!(rows[1]["value"], json!([0., 0.0625, 0.25, 0.25]));
    assert_eq!(fs::read(snapshot).unwrap(), seed);
    fs::write(
        directory.join("../trained-gpu-receipts.json"),
        serde_json::to_vec(&rows).unwrap(),
    )
    .unwrap();
    verify(&directory);
    let original = fs::read(directory.join("program/manifest.json")).unwrap();
    let mut gpu: Value = serde_json::from_slice(&original).unwrap();
    gpu["initial_state"]["sha256"] = json!("0".repeat(64));
    let changed = serde_json::to_vec(&gpu).unwrap();
    fs::write(directory.join("program/manifest.json"), &changed).unwrap();
    let original_artifact = fs::read(directory.join("artifact.json")).unwrap();
    let mut artifact: Value = serde_json::from_slice(&original_artifact).unwrap();
    use sha2::{Digest, Sha256};
    artifact["files"]["program/manifest.json"] =
        json!({"bytes":changed.len(),"sha256":format!("{:x}",Sha256::digest(&changed))});
    fs::write(
        directory.join("artifact.json"),
        serde_json::to_vec(&artifact).unwrap(),
    )
    .unwrap();
    assert!(training::verify_model(&directory, false)
        .unwrap_err()
        .contains("GPU initialized"));
    fs::write(directory.join("program/manifest.json"), original).unwrap();
    fs::write(directory.join("artifact.json"), &original_artifact).unwrap();
    // A rehashed inventory can omit a required component; reject it without a panic.
    let javascript = directory.join("program/program.mjs");
    let javascript_bytes = fs::read(&javascript).unwrap();
    fs::remove_file(&javascript).unwrap();
    let mut artifact: Value = serde_json::from_slice(&original_artifact).unwrap();
    artifact["files"].as_object_mut().unwrap().remove("program/program.mjs");
    fs::write(directory.join("artifact.json"), serde_json::to_vec(&artifact).unwrap()).unwrap();
    assert!(training::verify_model(&directory, false)
        .unwrap_err()
        .contains("GPU JavaScript entry binding"));
    fs::write(javascript, javascript_bytes).unwrap();
    fs::write(directory.join("artifact.json"), original_artifact).unwrap();
    println!("trained GPU module: seeded query, exact full snapshot and one required GPU dispatch matched");
}

#[test]
fn build_stage_candidate_continues_in_the_programmable_continuous_service() {
    fs::create_dir_all(root()).unwrap();
    let trace = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("reports/continuous-learning-2026-10-15/offline-trace.json");
    let expected = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("reports/continuous-learning-2026-10-15/complete.snapshot");
    let mut targets = vec!["javascript"];
    if std::env::var_os("INK_TEST_WASM").is_some() {
        targets.push("wasm32");
    }
    for target in targets {
        let directory = fresh("continuous");
        ok(build(
            target,
            "examples/continuous-learning.ink",
            &trace,
            None,
            &directory,
        ));
        verify(&directory);
        let output = ok(Command::new("node")
            .arg("tests/fixtures/trained-continuous.mjs")
            .arg(&directory)
            .arg(&expected)
            .output()
            .unwrap());
        println!("{}: {}", target, String::from_utf8_lossy(&output.stdout));
    }
}
