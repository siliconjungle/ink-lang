use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, syntax::parse};
#[test]
fn compiled_durable_state_recovers_before_reply_and_keeps_outbox() {
    let module =
        CheckedModule::from_source(parse(include_str!("../examples/inventory.lang")).unwrap())
            .unwrap();
    let dir = Path::new("build/durable-state");
    fs::create_dir_all(dir).unwrap();
    fs::write(
        dir.join("program.mjs"),
        ink_lowering_js::lower(&module).unwrap().javascript,
    )
    .unwrap();
    fs::write(dir.join("state-wasm.mjs"), ink_runtime::STATE_WASM_HOST).unwrap();
    ink_runtime::emit_durable_hosts(dir).unwrap();
    for backend in ["javascript", "c", "rust"] {
        if backend != "javascript" {
            let Some(zig) = std::env::var_os("INK_TEST_ZIG") else {
                continue;
            };
            let project = dir.join(backend);
            if backend == "c" {
                ink_runtime::emit_c_program(&module, &project).unwrap();
            } else {
                ink_runtime::emit_rust_program(
                    &ink_lowering_rust::state_native::emit(module.program(), None).unwrap(),
                    &project,
                )
                .unwrap();
            }
            ink_runtime::toolchain::complete_program(
                &project,
                true,
                &project.join("program.wasm"),
                "cargo",
                Some(&zig.to_string_lossy()),
            )
            .unwrap();
        }
        let status = Command::new("node")
            .args([
                "tests/durable-generated.mjs",
                &dir.to_string_lossy(),
                backend,
            ])
            .status()
            .unwrap();
        assert!(status.success(), "durability failed for {backend}");
    }
}

#[path = "../runtime/tests/durable.rs"]
mod host_failure_injection;

#[test]
fn generated_native_durable_hosts_recover_and_retry_after_process_death() {
    let module =
        CheckedModule::from_source(parse(include_str!("../examples/inventory.lang")).unwrap())
            .unwrap();
    let root = Path::new("build/durable-native");
    fs::create_dir_all(root).unwrap();
    for backend in ["c", "rust"] {
        let dir = root.join(backend);
        if backend == "c" {
            ink_runtime::emit_c_program(&module, &dir).unwrap();
        } else {
            ink_runtime::emit_rust_program(
                &ink_lowering_rust::state_native::emit(module.program(), None).unwrap(),
                &dir,
            )
            .unwrap();
        }
        let binary = dir.join("program");
        ink_runtime::toolchain::complete_program(&dir, false, &binary, "cargo", None).unwrap();
        let file = dir.join("state.inkd");
        let _ = fs::remove_file(&file);
        if backend == "rust" {
            fs::copy(root.join("c-initial.inkd"), &file).unwrap();
        }
        let id = "00000000000000000000000000000001";
        let run = |steps: serde_json::Value| {
            let script = dir.join("script.json");
            fs::write(&script, serde_json::to_vec(&steps).unwrap()).unwrap();
            let out = Command::new(&binary)
                .arg(&script)
                .arg("--durable")
                .arg(&file)
                .output()
                .unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
            serde_json::from_slice::<serde_json::Value>(&out.stdout).unwrap()
        };
        run(
            serde_json::json!([{"id":"create","call":"create","args":[id,"雪\u{0}😀",10]},{"id":"update","call":"restock","args":[id,2]}]),
        );
        if backend == "c" {
            fs::copy(&file, root.join("c-initial.inkd")).unwrap();
        }
        // Compile a real process that exits after durable publish but before reply.
        fs::create_dir_all(dir.join("src/bin")).unwrap();
        fs::write(
            dir.join("src/bin/crash.rs"),
            include_str!("support/durable/crash.rs"),
        )
        .unwrap();
        let built = Command::new("cargo")
            .args(["build", "--release", "--bin", "crash", "--manifest-path"])
            .arg(dir.join("Cargo.toml"))
            .output()
            .unwrap();
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
        let killed = Command::new(dir.join("target/release/crash"))
            .arg(&file)
            .status()
            .unwrap();
        assert_eq!(killed.code(), Some(73));
        let replies = run(
            serde_json::json!([{"id":"lost-reply","call":"restock","args":[id,5]},{"id":"read","call":"stock_of","args":[id]},{"id":"overflow","call":"restock","args":[id,4294967295u32]}]),
        );
        assert_eq!(replies[1]["result"]["Some"], 17);
        assert_eq!(replies[2]["committed"], false);
        assert_eq!(replies[0]["version"], 3);
        assert_eq!(replies[2]["version"], 3);
        let pending = || {
            let out = Command::new(dir.join("target/release/crash"))
                .arg(&file)
                .arg("inspect")
                .output()
                .unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
            serde_json::from_slice::<serde_json::Value>(&out.stdout).unwrap()
        };
        assert_eq!(pending().as_array().unwrap().len(), 2);
        run(
            serde_json::json!([{"acknowledge":[3,0]},{"id":"after-ack","call":"stock_of","args":[id]}]),
        );
        assert!(pending().as_array().unwrap().is_empty());
        let snapshot = dir.join("portable.snapshot");
        let out = Command::new(&binary)
            .arg(dir.join("script.json"))
            .arg("--durable")
            .arg(&file)
            .arg("--snapshot-out")
            .arg(&snapshot)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        if backend == "rust" {
            assert_eq!(
                fs::read(snapshot).unwrap(),
                fs::read(root.join("c/portable.snapshot")).unwrap()
            );
        }
        let mut bytes = fs::read(&file).unwrap();
        bytes[12] ^= 1;
        fs::write(&file, bytes).unwrap();
        let rejected = Command::new(&binary)
            .arg(dir.join("script.json"))
            .arg("--durable")
            .arg(&file)
            .output()
            .unwrap();
        assert!(!rejected.status.success());
        assert!(String::from_utf8_lossy(&rejected.stderr).contains("checksum"));
        println!("{backend}: native process death, retry deduplication, abort, outbox acknowledgements and corruption rejection passed");
    }
}
