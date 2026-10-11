use std::process::Command;

#[test]
#[ignore = "manual standalone scaling, compilation and migration measurements"]
fn benchmark_standalone_aggregate_scaling() {
    use std::{fs, path::Path, time::Instant};
    use verified_language::{core::CheckedModule, representation, syntax::parse};
    let repository = Path::new(env!("CARGO_MANIFEST_DIR"));
    let root = repository.join("build/standalone-aggregate-benchmark");
    fs::create_dir_all(root.join("src")).unwrap();
    let source = include_str!("../examples/filtered-aggregate.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let requests = std::env::var_os("INK_BENCH_REQUEST_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| repository.join("knowledge/research/filtered-aggregate"));
    let mut phases = vec![];
    let labels =
        std::env::var("INK_BENCH_PLANS").unwrap_or("direct,refresh,sum-delta,count-delta".into());
    let labels = labels.split(',').collect::<Vec<_>>();
    assert!(labels.len() >= 2 && labels.len() <= 16);
    let plans = labels
        .iter()
        .map(|label| {
            let start = Instant::now();
            let request =
                serde_json::from_slice(&fs::read(requests.join(format!("{label}.json"))).unwrap())
                    .unwrap();
            let plan = representation::check(&module, &request).unwrap();
            phases
                .push(serde_json::json!({"candidate":label,"check_ns":start.elapsed().as_nanos()}));
            plan
        })
        .collect::<Vec<_>>();
    let start = Instant::now();
    let mut code = verified_language::representations::compiled_bundle(&plans).unwrap();
    phases.push(serde_json::json!({"literal_emission_ns":start.elapsed().as_nanos()}));
    fs::write(
        root.join("src/ordinary.rs"),
        ink_lowering_rust::state_native::emit(module.program()).unwrap(),
    )
    .unwrap();
    code.push_str("\n#[path=\"ordinary.rs\"] mod ordinary;\n");
    code.push_str(&format!(
        "\nconst SOURCE:&str={source:?};\nconst LABELS:&[&str]=&{labels:?};\n"
    ));
    code.push_str(include_str!(
        "../bench/point-delta/standalone-aggregate.rs.txt"
    ));
    fs::write(root.join("src/main.rs"), code).unwrap();
    fs::write(root.join("Cargo.toml"),format!("[package]\nname=\"ink-standalone-aggregate-benchmark\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[dependencies]\nverified_language={{package=\"ink\",path={:?}}}\nserde_json={{version=\"1\",features=[\"float_roundtrip\"]}}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n[features]\nallocation-profile=[]\n[profile.release]\nlto=\"thin\"\ncodegen-units=1\n",repository.to_str().unwrap())).unwrap();
    // Dependency resolution must use the same independently versioned packages
    // as the distribution, never an unrelated latest upstream backend.
    let manifest = fs::read_to_string(repository.join("Cargo.toml")).unwrap();
    let patch = manifest.find("[patch.").unwrap();
    let mut patches = manifest[patch..].to_owned();
    for path in [
        "abi",
        "native-support",
        "core",
        "lowerings/c",
        "lowerings/gpu",
        "lowerings/wasm",
        "lowerings/js",
        "lowerings/rust",
    ] {
        patches = patches.replace(
            &format!("path = {path:?}"),
            &format!("path = {:?}", repository.join(path).to_str().unwrap()),
        );
    }
    use std::io::Write;
    fs::OpenOptions::new()
        .append(true)
        .open(root.join("Cargo.toml"))
        .unwrap()
        .write_all(patches.as_bytes())
        .unwrap();
    let start = Instant::now();
    let output = Command::new(env!("CARGO"))
        .args([
            "build",
            "--offline",
            "--release",
            "--quiet",
            "--manifest-path",
        ])
        .arg(root.join("Cargo.toml"))
        .output()
        .unwrap();
    fs::write(root.join("build.log"), &output.stderr).unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    phases.push(serde_json::json!({"cargo_build_ns":start.elapsed().as_nanos(),"scope":"release benchmark and baseline harness; includes dependencies, not standalone-only rustc"}));
    fs::write(
        root.join("compilation.json"),
        serde_json::to_vec_pretty(&phases).unwrap(),
    )
    .unwrap();
    let output = Command::new(root.join("target/release/ink-standalone-aggregate-benchmark"))
        .env("INK_BENCH_ROWS", "48")
        .env("PATH", "")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    fs::write(root.join("warmup.json"), output.stdout).unwrap();
}
#[test]
fn measured_selection_rechecks_candidates_and_bridges_before_ranking() {
    let output = Command::new("python3")
        .args([
            "planner/tests/representation_selection_integration.py",
            env!("CARGO_BIN_EXE_ink"),
            "examples/point-query-delta.ink",
            "knowledge/research/point-delta",
        ])
        .env("PYTHONPATH", "planner:knowledge")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
