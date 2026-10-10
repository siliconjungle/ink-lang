use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::core::CheckedModule;
fn compile(root: &Path) {
    let out = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
pub(crate) fn conformance(
    name: &str,
    p: verified_language::syntax::Program,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/{name}"));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), source).unwrap();
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    if std::env::var_os("INK_TEST_GPU").is_some() || std::env::var_os("INK_TEST_WGPU").is_some() {
        verified_language::runtime::emit_gpu(&p, &root.join("gpu-module")).unwrap();
    }
    if std::env::var_os("INK_TEST_WGPU").is_some()
        && (name == "lowering-parity"
            || name.starts_with("generated-parity")
            || name == "modules-parity")
    {
        let project = root.join("gpu-module/native");
        let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-gpu-target");
        let out = Command::new(env!("CARGO"))
            .args(["build", "--offline", "--quiet", "--manifest-path"])
            .arg(project.join("Cargo.toml"))
            .arg("--target-dir")
            .arg(&target)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let mut gpu_steps = steps.clone();
        for step in &mut gpu_steps {
            if step["pure"].is_string() {
                step["backend"] = json!("gpu");
            }
        }
        fs::write(
            root.join("gpu-script.json"),
            serde_json::to_vec(&gpu_steps).unwrap(),
        )
        .unwrap();
        let out = Command::new(target.join("debug/ink-module-program"))
            .arg(root.join("gpu-script.json"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let actual: Vec<Value> = serde_json::from_slice(&out.stdout).unwrap();
        let calls = gpu_steps
            .iter()
            .filter(|s| s["restore"].is_null())
            .collect::<Vec<_>>();
        assert_eq!(actual.len(), expected.len());
        let mut gpu_calls = 0;
        for (i, ((a, e), s)) in actual.iter().zip(&expected).zip(calls).enumerate() {
            let reply = if s["pure"].is_string() {
                json!({"value":a["value"]})
            } else if a["host_error"].is_string() {
                a.clone()
            } else {
                json!({"outcome":a})
            };
            assert_eq!(reply, e["reply"], "wgpu result {i}");
            if a["backend"] == "gpu" {
                gpu_calls += 1;
            }
            if [
                "repeated_arrays",
                "choose_arrays",
                "composition",
                "prefix",
                "ordered",
                "particles",
                "flags",
            ]
            .contains(&s["pure"].as_str().unwrap_or(""))
                || s["expect_gpu"] == true
            {
                assert_eq!(a["backend"], "gpu", "expected eligible GPU kernel: {s}");
            }
        }
        println!(
            "wgpu: {} results matched; {gpu_calls} GPU calls",
            actual.len()
        );
    }
    let c = root.join("c");
    verified_language::runtime::emit_c_program(&module, &c).unwrap();
    fs::write(
        c.join("src/main.rs"),
        include_str!("../lowering-parity-runner.rs.txt"),
    )
    .unwrap();
    let rust = root.join("rust");
    fs::create_dir_all(rust.join("src")).unwrap();
    fs::write(
        rust.join("src/lib.rs"),
        format!(
            "{}{}",
            verified_language::state_native::emit(&p, None).unwrap(),
            verified_language::runtime::STATE_WASM_ABI
        ),
    )
    .unwrap();
    fs::write(
        rust.join("src/main.rs"),
        fs::read(c.join("src/main.rs")).unwrap(),
    )
    .unwrap();
    fs::write(rust.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nnum-bigint=\"=0.4.8\"\nserde_json={version=\"=1.0.151\",features=[\"float_roundtrip\"]}\nsha2=\"=0.10.9\"\n[workspace]\n").unwrap();
    for dir in [&c, &rust] {
        compile(dir);
        let out = Command::new(dir.join("target/debug/compiled-state"))
            .arg(root.join("script.json"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let actual = serde_json::from_slice::<Vec<Value>>(&out.stdout).unwrap();
        assert_eq!(actual.len(), expected.len());
        for (i, (a, b)) in actual.iter().zip(&expected).enumerate() {
            assert_eq!(a["reply"], b["reply"], "{} step {i}", dir.display());
            assert_eq!(
                a["snapshot"],
                b["snapshot"],
                "{} snapshot {i}",
                dir.display()
            );
        }
    }
    if p.functions.iter().any(|f| f.name == "wide_scan") {
        fs::write(
            root.join("host.c"),
            include_str!("../lowering-parity-host.c"),
        )
        .unwrap();
        let out = Command::new("clang")
            .args(["-std=c11", "-Wall", "-Wextra", "-Werror"])
            .arg(root.join("host.c"))
            .arg("-I")
            .arg(&c)
            .arg(c.join("target/debug/libcompiled_state.a"))
            .arg("-o")
            .arg(root.join("host"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(Command::new(root.join("host")).status().unwrap().success());
    }
    fs::write(
        root.join("program.mjs"),
        verified_language::javascript::lower(&module)
            .unwrap()
            .javascript,
    )
    .unwrap();
    fs::write(
        root.join("check.mjs"),
        include_str!("../lowering-parity.mjs"),
    )
    .unwrap();
    fs::write(
        root.join("state-wasm.mjs"),
        verified_language::runtime::STATE_WASM_HOST,
    )
    .unwrap();
    let out = Command::new("node")
        .arg(root.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    if let Ok(zig) = std::env::var("INK_TEST_ZIG") {
        for dir in [&c, &rust] {
            let mut cmd = Command::new(env!("CARGO"));
            cmd.args([
                "build",
                "--offline",
                "--quiet",
                "--lib",
                "--target",
                "wasm32-unknown-unknown",
                "--manifest-path",
            ])
            .arg(dir.join("Cargo.toml"));
            if dir == &c {
                for (name, operation) in [("zig-cc", "cc"), ("zig-ar", "ar")] {
                    let path = dir.join(name);
                    fs::write(
                        &path,
                        format!(
                            "#!/bin/sh\nexec '{}' {operation} \"$@\"\n",
                            zig.replace('\'', "'\"'\"'")
                        ),
                    )
                    .unwrap();
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
                }
                cmd.env("INK_CC", dir.join("zig-cc"))
                    .env("INK_AR", dir.join("zig-ar"))
                    .env("INK_CC_KIND", "zig");
            }
            let out = cmd.output().unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
        }
        fs::write(
            root.join("check-wasm.mjs"),
            include_str!("../lowering-parity-wasm.mjs"),
        )
        .unwrap();
        let out = Command::new("node")
            .arg(root.join("check-wasm.mjs"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        println!("{}", String::from_utf8_lossy(&out.stdout));
    }
}
