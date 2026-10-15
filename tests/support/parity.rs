use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::core::CheckedModule;
fn compile(root: &Path) {
    let out = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .arg("--target-dir").arg(root.join("target"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
#[allow(dead_code)]
pub(crate) fn conformance(
    name: &str,
    p: verified_language::syntax::Program,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    let module = CheckedModule::from_source(p).unwrap();
    conformance_checked(name, &module, source, steps, expected)
}
#[allow(dead_code)]
pub(crate) fn conformance_checked(
    name: &str,
    module: &CheckedModule,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    conformance_inner(name, module, None, None, None, source, steps, expected)
}
#[allow(dead_code)]
pub(crate) fn conformance_selected(
    name: &str,
    selected: &verified_language::optimisation::CheckedSelection,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    conformance_inner(
        name,
        selected.module(),
        Some(selected),
        None,
        None,
        source,
        steps,
        expected,
    )
}
#[allow(dead_code)]
pub(crate) fn conformance_indexed(
    name: &str,
    p: verified_language::syntax::Program,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    conformance_inner(
        name,
        &CheckedModule::from_source(p).unwrap(),
        None,
        None,
        Some(verified_language::state_native::TableStorage::IndexedSlots),
        source,
        steps,
        expected,
    )
}
#[allow(dead_code)]
pub(crate) fn conformance_planned(
    name: &str,
    plan: &verified_language::planning::CheckedPlan,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    conformance_inner(
        name,
        plan.module(),
        None,
        Some(plan),
        None,
        source,
        steps,
        expected,
    )
}
fn conformance_inner(
    name: &str,
    module: &CheckedModule,
    selected: Option<&verified_language::optimisation::CheckedSelection>,
    planned: Option<&verified_language::planning::CheckedPlan>,
    table_storage: Option<verified_language::state_native::TableStorage>,
    source: &str,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        assert!(
            std::env::var_os("INK_TEST_WASM").is_some(),
            "complete-target parity forbids skipping Wasm: set INK_TEST_WASM"
        );
    }
    // Emission, building and execution form one operation for these GPU
    // fixtures: their generated package names and Cargo target are shared.
    // Lock before emission so source mtimes cannot precede another fixture's
    // cached build-script outputs, or let it replace the executable before run.
    static GPU_ARTIFACTS: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _gpu_artifacts = std::env::var_os("INK_TEST_WGPU").map(|_| {
        GPU_ARTIFACTS
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    });
    let p = module.program();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/{name}"));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), source).unwrap();
    if let Some(selected) = selected {
        fs::write(
            root.join("input-core.json"),
            selected.input_module().bytes().unwrap(),
        )
        .unwrap();
        fs::write(
            root.join("selected-core.json"),
            selected.module().bytes().unwrap(),
        )
        .unwrap();
        fs::write(
            root.join("selection.json"),
            serde_json::to_vec_pretty(selected.package()).unwrap(),
        )
        .unwrap();
    }
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
        if let Some(plan) = planned {
            verified_language::runtime::emit_planned(plan, &root.join("gpu-module")).unwrap();
        } else if let Some(selected) = selected {
            verified_language::runtime::emit_selected(selected, &root.join("gpu-module")).unwrap();
        } else {
            verified_language::runtime::emit_gpu(&p, &root.join("gpu-module")).unwrap();
        }
    }
    if std::env::var_os("INK_TEST_WGPU").is_some()
        && (name == "lowering-parity"
            || steps.iter().any(|s| s["expect_gpu"] == true)
            || name == "universal-control"
            || name.starts_with("generated-parity")
            || name == "modules-parity"
            || name == "numerical-state-parity"
            || name == "language-foundations-parity"
            || name == "generic-libraries-parity"
            || name == "query-expressions-parity"
            || name.starts_with("invariant-value")
            || name == "bulk-workloads-parity"
            || name == "competitive-workloads-parity"
            || selected.is_some()
            || planned.is_some())
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
        let packed_pure = fs::read_to_string(project.join("Cargo.toml"))
            .unwrap()
            .contains("name = \"ink-gpu-program\"");
        let mut gpu_steps: Vec<_> = steps
            .iter()
            .filter(|s| s["reject_restore"].is_null())
            .cloned()
            .collect();
        for step in &mut gpu_steps {
            if step["pure"].is_string() {
                step["backend"] = json!(if step["cpu_only"] == true {
                    "cpu"
                } else if step["expect_gpu"] == true {
                    "gpu-required"
                } else {
                    "gpu"
                });
                if packed_pure {
                    step["call"] = step["pure"].clone();
                }
            }
        }
        fs::write(
            root.join("gpu-script.json"),
            serde_json::to_vec(&gpu_steps).unwrap(),
        )
        .unwrap();
        let mut command = Command::new(target.join(if packed_pure {
            "debug/ink-gpu-program"
        } else {
            "debug/ink-module-program"
        }));
        if packed_pure {
            command.arg("--script");
        }
        command.arg(root.join("gpu-script.json"));
        if !packed_pure{command.arg("--snapshot-out").arg(root.join("gpu-final.snapshot"));}
        let out = command.output().unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        if !packed_pure{
            if let Some(final_state)=expected.last(){
                let snapshot:Vec<u8>=serde_json::from_value(final_state["snapshot"].clone()).unwrap();
                assert_eq!(fs::read(root.join("gpu-final.snapshot")).unwrap(),snapshot,"GPU host final portable checkpoint");
            }
            // The native module CLI validates a restore before creating its
            // state. Exercise malformed/fixed-row inputs through that actual
            // host, rather than inferring rejection from the separate CPU run.
            for (index,step)in steps.iter().enumerate().filter(|(_,s)|s["reject_restore"].is_array()){
                let bytes:Vec<u8>=serde_json::from_value(step["reject_restore"].clone()).unwrap();
                let path=root.join(format!("gpu-invalid-restore-{index}.snapshot"));fs::write(&path,bytes).unwrap();
                let script=root.join("gpu-empty-script.json");fs::write(&script,"[]").unwrap();
                let rejected=Command::new(target.join("debug/ink-module-program")).arg(&script).arg("--restore").arg(&path).output().unwrap();
                assert!(!rejected.status.success(),"GPU host accepted an invalid restored checkpoint");
                let message=String::from_utf8_lossy(&rejected.stderr);
                assert!(message.contains(step["restore_error"].as_str().unwrap_or("invariant")),"GPU host failed for a different reason: {message}");
                fs::write(root.join(format!("gpu-invalid-restore-{index}.log")),rejected.stderr).unwrap();
            }
        }
        // Hosts may return one ordered array or packed receipts per line.
        // Decode the complete array before interpreting individual lines.
        let actual: Vec<Value> = if let Ok(receipts) = serde_json::from_slice(&out.stdout) {
            receipts
        } else {
            assert!(
                packed_pure,
                "module host must return an ordered receipt array"
            );
            std::str::from_utf8(&out.stdout)
                .unwrap()
                .lines()
                .map(|line| serde_json::from_str(line).unwrap())
                .collect()
        };
        fs::write(
            root.join("gpu-receipts.json"),
            serde_json::to_vec(&actual).unwrap(),
        )
        .unwrap();
        let calls = gpu_steps
            .iter()
            .filter(|s| s["restore"].is_null())
            .collect::<Vec<_>>();
        assert_eq!(actual.len(), expected.len());
        let mut gpu_calls = 0;
        for (i, ((a, e), s)) in actual.iter().zip(&expected).zip(calls).enumerate() {
            let mut expected_reply = e["reply"].clone();
            let reply = if a["host_error"].is_string() {
                a.clone()
            } else if let Some(name) = s["pure"].as_str() {
                let f = p.functions.iter().find(|f| f.name == name).unwrap();
                let descriptor =
                    ink_abi::describe(&f.result, &p.records, &p.enums, &p.ids).unwrap();
                // Packed u64 wire values use decimal strings above the safe
                // JSON range. Compare through the shared ABI, preserving bits.
                if ink_abi::packed_width(&descriptor).is_ok() {
                    expected_reply = json!({"value":ink_abi::packed::unpack(&ink_abi::packed::pack(&e["reply"]["value"], &descriptor).unwrap(), &descriptor)});
                    json!({"value":ink_abi::packed::unpack(&ink_abi::packed::pack(&a["value"], &descriptor).unwrap(), &descriptor)})
                } else {
                    json!({"value":a["value"]})
                }
            } else {
                json!({"outcome":a})
            };
            assert_eq!(reply, expected_reply, "wgpu result {i}");
            if a["backend"] == "gpu" {
                gpu_calls += 1;
            }
            if s["cpu_only"] == true && a["host_error"].is_null() {
                assert_eq!(a["backend"], "cpu", "explicit CPU float-bit contract: {s}");
            }
            if ([
                "repeated_arrays",
                "choose_arrays",
                "composition",
                "prefix",
                "ordered",
                "particles",
                "flags",
            ]
            .contains(&s["pure"].as_str().unwrap_or(""))
                && s["cpu_only"] != true)
                || s["expect_gpu"] == true
            {
                assert_eq!(a["backend"], "gpu", "expected eligible GPU kernel: {s}");
            }
        }
        println!(
            "wgpu: {} results matched; {gpu_calls} GPU calls",
            actual.len()
        );
        if !packed_pure {
            let manifest: Value =
                serde_json::from_slice(&fs::read(root.join("gpu-module/manifest.json")).unwrap())
                    .unwrap();
            let rejected = steps
                .iter()
                .filter(|step| {
                    step["pure"].is_string()
                        && manifest["functions"]
                            .as_array()
                            .unwrap()
                            .iter()
                            .any(|f| f["name"] == step["pure"] && f["gpu"] == false)
                })
                .map(|step| {
                    let mut step = step.clone();
                    step["backend"] = json!("gpu-required");
                    step
                })
                .collect::<Vec<_>>();
            if !rejected.is_empty() {
                let script = root.join("required-gpu-errors.json");
                fs::write(&script, serde_json::to_vec(&rejected).unwrap()).unwrap();
                let output = Command::new(target.join("debug/ink-module-program"))
                    .arg(script)
                    .output()
                    .unwrap();
                assert!(
                    output.status.success(),
                    "{}",
                    String::from_utf8_lossy(&output.stderr)
                );
                let replies: Vec<Value> = serde_json::from_slice(&output.stdout).unwrap();
                assert_eq!(replies.len(), rejected.len());
                for reply in replies {
                    assert!(
                        reply["host_error"].is_string(),
                        "required unsupported GPU call fell back: {reply}"
                    );
                }
            }
        }
    }
    let rust = root.join("rust");
    fs::create_dir_all(rust.join("src")).unwrap();
    fs::write(
        rust.join("src/lib.rs"),
        format!(
            "{}{}",
            if let Some(plan) = planned {
                verified_language::state_native::emit_planned(plan).unwrap()
            } else if let Some(selected) = selected {
                verified_language::state_native::emit_selected(selected).unwrap()
            } else {
                verified_language::state_native::emit_checked_with_table_storage(
                    module,
                    table_storage.unwrap_or(verified_language::state_native::TableStorage::Ordered),
                )
                .unwrap()
            },
            verified_language::runtime::STATE_WASM_ABI
        ),
    )
    .unwrap();
    fs::write(
        rust.join("src/main.rs"),
        include_str!("../lowering-parity-runner.rs.txt"),
    )
    .unwrap();
    fs::write(rust.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nnum-bigint=\"=0.4.8\"\nserde_json={version=\"=1.0.151\",features=[\"float_roundtrip\"]}\nsha2=\"=0.10.9\"\n[workspace]\n").unwrap();
    for dir in [&rust] {
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

    fs::write(
        root.join("program.mjs"),
        if let Some(plan) = planned {
            verified_language::javascript::lower_planned(plan)
                .unwrap()
                .javascript
        } else if let Some(selected) = selected {
            verified_language::javascript::lower_selected(selected)
                .unwrap()
                .javascript
        } else {
            verified_language::javascript::lower(module)
                .unwrap()
                .javascript
        },
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
    if std::env::var_os("INK_TEST_WASM").is_some() || std::env::var_os("INK_TEST_WASM").is_some() {
        for dir in [&rust] {
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
            .arg(dir.join("Cargo.toml"))
            .arg("--target-dir").arg(dir.join("target"));

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
