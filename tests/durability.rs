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
