//! Distribution tooling for proof-checked database representations.
use crate::{
    core::CheckedModule,
    representation::{self, CheckedRepresentation, Request},
    LangResult,
};
use serde_json::{json, Value};
use std::{fs, path::Path};
fn read(path: &str) -> LangResult<Vec<u8>> {
    let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if size > 16_000_000 {
        return Err("representation input byte limit".into());
    }
    fs::read(path).map_err(|e| e.to_string())
}
pub fn load(module: &CheckedModule, path: &str) -> LangResult<CheckedRepresentation> {
    let request: Request = serde_json::from_slice(&read(path)?).map_err(|e| e.to_string())?;
    representation::check(module, &request)
}
pub fn run(cmd: &str, module: CheckedModule, args: &[String]) -> LangResult<()> {
    let package = args.get(2).ok_or("missing representation request JSON")?;
    let checked = load(&module, package)?;
    let value = |key: &str| {
        args.iter()
            .position(|a| a == key)
            .and_then(|i| args.get(i + 1))
    };
    match cmd {
        "check-migration" => {
            let to = load(
                &module,
                args.get(3).ok_or("missing target representation request")?,
            )?;
            let bridge: Value =
                serde_json::from_slice(&read(args.get(4).ok_or("missing bridge JSON")?)?)
                    .map_err(|e| e.to_string())?;
            let bundle =
                serde_json::from_value(bridge["knowledge"].clone()).map_err(|e| e.to_string())?;
            let root = bridge["root"].as_str().ok_or("missing bridge root")?;
            let migration = representation::check_migration(&checked, &to, &bundle, root)?;
            println!(
                "{}",
                json!({"status":"checked","migration":root,"from":migration.endpoints().0,"to":migration.endpoints().1,"obligations":migration.obligations()})
            );
        }
        "check-representation" => println!(
            "{}",
            json!({"status":"checked","representation":checked.request().representation,"source":module.identity()?,"obligations":checked.obligations(),"trust":["fixed source semantics","general equality checker","literal backend","host and snapshot codecs"]})
        ),
        "emit-representation" => {
            let output = value("-o").ok_or("emit-representation requires -o OUTPUT")?;
            emit(
                &checked,
                value("--target").map(String::as_str).unwrap_or("rust"),
                Path::new(output),
            )?;
        }
        "execute-representation" => {
            let script: Value =
                serde_json::from_slice(&read(args.get(3).ok_or("missing script JSON")?)?)
                    .map_err(|e| e.to_string())?;
            let mut session = if let Some(file) = value("--restore") {
                crate::runtime::representation::Session::restore(
                    checked,
                    &read(file)?,
                    crate::runtime::representation::Reference,
                )?
            } else {
                crate::runtime::representation::Session::new(
                    checked,
                    crate::runtime::representation::Reference,
                )?
            };
            let mut replies = vec![];
            for step in script.as_array().ok_or("script must be an array")? {
                if let Some(path) = step.get("migrate").and_then(Value::as_str) {
                    session.migrate(load(&module, path)?)?;
                    replies.push(
                        json!({"migrated":session.representation(),"version":session.version()}),
                    );
                } else {
                    replies.push(
                        session.invoke_json(
                            step["call"]
                                .as_str()
                                .ok_or("script step needs call or migrate")?,
                            step.get("args").ok_or("script step needs args")?,
                        )?,
                    );
                }
            }
            if let Some(file) = value("--snapshot-out") {
                fs::write(file, session.checkpoint()?).map_err(|e| e.to_string())?;
            }
            println!(
                "{}",
                serde_json::to_string_pretty(&replies).map_err(|e| e.to_string())?
            );
        }
        _ => return Err("unknown representation command".into()),
    }
    Ok(())
}

/// Compile-time target selection. Every emitted artifact is standalone and
/// carries the same checked program's portable snapshot namespace.
pub fn emit(checked: &CheckedRepresentation, target: &str, output: &Path) -> LangResult<()> {
    match target {
        "rust" => write(
            output,
            &ink_lowering_rust::representation_program::lower(checked)?,
        ),
        "rust-memo" => write(output,&ink_lowering_rust::representation_program::lower_memo(checked)?),
        "rust-wasm-memo" => project(output,&ink_lowering_rust::representation_program::lower_memo(checked)?,None,target),
        "rust-packed" => write(
            output,
            &ink_lowering_rust::representation_program::lower_packed(checked)?,
        ),
        "rust-wasm-packed" => project(
            output,
            &ink_lowering_rust::representation_program::lower_packed(checked)?,
            None,
            target,
        ),
        "javascript" | "js" => write(
            output,
            &ink_lowering_js::representation_program::lower(checked)?,
        ),
        "webgpu" => write(
            output,
            &ink_lowering_gpu::lower_representation_web(checked)?,
        ),
        "rust-wasm" => project(
            output,
            &ink_lowering_rust::representation_program::lower(checked)?,
            None,
            target,
        ),
        "c" | "wasm" | "wasm32" | "wgpu" | "gpu" => {
            let emitted = match target {
                "wasm" | "wasm32" => ink_lowering_wasm::lower_representation(checked)?,
                "wgpu" | "gpu" => ink_lowering_gpu::lower_representation(checked)?,
                _ => ink_lowering_c::representation_program::lower(checked)?,
            };
            project(output, &emitted.rust, Some(&emitted.c), target)
        }
        _ => Err(format!("unknown representation target {target}")),
    }
}
fn write(output: &Path, source: &str) -> LangResult<()> {
    if let Some(parent) = output.parent().filter(|p| !p.as_os_str().is_empty()) {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(output, source).map_err(|e| e.to_string())
}
fn project(output: &Path, source: &str, c: Option<&str>, target: &str) -> LangResult<()> {
    let mut source = source.to_owned();
    source.push_str(crate::runtime::REPRESENTATION_ABI_SOURCE);
    write(&output.join("src/lib.rs"), &source)?;
    write(&output.join("Cargo.toml"), "[package]\nname=\"ink-compiled-representation\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n")?;
    if let Some(c) = c {
        write(&output.join("representation.c"), c)?;
        write(
            &output.join("build.rs"),
            include_str!("representation-build.rs.txt"),
        )?;
    } else {
        write(&output.join("build.rs"), "fn main(){if std::env::var(\"TARGET\").unwrap().starts_with(\"wasm32\"){println!(\"cargo:rustc-link-arg=-zstack-size=8388608\");}}\n")?;
    }
    write(
        &output.join("state-wasm.mjs"),
        include_str!("../runtime/hosts/state-wasm.mjs"),
    )?;
    write(
        &output.join("state-abi.h"),
        include_str!("../runtime/hosts/state-abi.h"),
    )?;
    write(&output.join("README.md"), &format!("Standalone {target} representation. Build with `cargo build --offline`. For Wasm add `--target wasm32-unknown-unknown` (the project declares an 8 MiB stack); set INK_CC and INK_AR to cross-compiler wrappers for C/Wasm. Exports the ordinary handle/buffer state ABI. C and GPU host projects use literal C functions and typed Rust storage; browser WebGPU uses literal JavaScript host code. Recursive representations execute on the host. No Ink runtime, proof package or checker dependency is linked. Caller arguments must have declared types, arity, shapes and canonical ranges. Generated calls do not type-check input; bad data is unsafe, may crash or produce wrong results, and raw native pointer APIs may corrupt memory. JSON parsing/representation conversion and explicit portable checkpoint integrity checks remain. Source and proof checks happen during compilation.\n"))
}
