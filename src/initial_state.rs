//! Package startup state without changing the checked source or update semantics.
use crate::LangResult;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::Path};

pub fn descriptor(file: &str, bytes: &[u8]) -> Value {
    json!({"file":file,"bytes":bytes.len(),"sha256":format!("{:x}",Sha256::digest(bytes))})
}
fn filename(path: &Path) -> LangResult<&str> {
    path.file_name()
        .and_then(|s| s.to_str())
        .ok_or("artifact requires a UTF-8 filename".into())
}
fn relative(name: &str) -> String {
    // Module specifiers are URLs; JSON string escaping alone does not escape ?/#.
    let mut result = String::from("./");
    for byte in name.bytes() {
        if byte.is_ascii_alphanumeric() || b"-._~".contains(&byte) {
            result.push(byte as char);
        } else {
            result.push_str(&format!("%{byte:02X}"));
        }
    }
    serde_json::to_string(&result).unwrap()
}
pub fn javascript(out: &Path, code: &str, seed: &[u8]) -> LangResult<Value> {
    let name = filename(out)?;
    let parent = out.parent().unwrap_or(Path::new("."));
    if !parent.as_os_str().is_empty() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let raw = format!("{name}.source.mjs");
    let snapshot = format!("{name}.initial.snapshot");
    let helper = format!("{name}.initial-state.mjs");
    fs::write(parent.join(&raw), code).map_err(|e| e.to_string())?;
    fs::write(parent.join(&snapshot), seed).map_err(|e| e.to_string())?;
    fs::write(parent.join(&helper), crate::runtime::INITIAL_STATE_HOST)
        .map_err(|e| e.to_string())?;
    let binding = descriptor(&snapshot, seed);
    let entry = format!(
        r#"import * as source from {raw};
export * from {raw};
import {{readArtifact}} from {helper};
let initial;
const bytes=()=>initial??=(readArtifact(new URL({snapshot},import.meta.url),{binding}));
export async function restoreState(bytes){{const state=source.createState();try{{await state.restore(bytes);return state;}}catch(error){{state.dispose?.();throw error;}}}}
export async function createState(){{return restoreState(await bytes());}}
"#,
        raw = relative(&raw),
        helper = relative(&helper),
        snapshot = relative(&snapshot),
        binding = binding
    );
    fs::write(out, entry).map_err(|e| e.to_string())?;
    Ok(binding)
}
pub fn wasm(out: &Path, seed: &[u8]) -> LangResult<Value> {
    let name = filename(out)?;
    let parent = out.parent().unwrap_or(Path::new("."));
    let snapshot = format!("{name}.initial.snapshot");
    let helper = format!("{name}.initial-state.mjs");
    let host = format!("{name}.state-wasm.mjs");
    let entry = format!("{name}.entry.mjs");
    fs::write(parent.join(&snapshot), seed).map_err(|e| e.to_string())?;
    fs::write(parent.join(&helper), crate::runtime::INITIAL_STATE_HOST)
        .map_err(|e| e.to_string())?;
    fs::write(parent.join(&host), crate::runtime::STATE_WASM_HOST).map_err(|e| e.to_string())?;
    let wasm = fs::read(out).map_err(|e| e.to_string())?;
    if wasm.len() > 64 * 1024 * 1024 {
        return Err("initialized Wasm artifact byte limit".into());
    }
    let binding = descriptor(&snapshot, seed);
    let module = descriptor(name, &wasm);
    let code = format!(
        r#"import {{StatefulModule}} from {host};
import {{readArtifact}} from {helper};
let ready,initial;
const module=()=>ready??=readArtifact(new URL({wasm},import.meta.url),{module}).then(bytes=>StatefulModule.instantiate(bytes));
const seed=()=>initial??=readArtifact(new URL({snapshot},import.meta.url),{binding});
export async function createState(){{const [host,bytes]=await Promise.all([module(),seed()]);return host.restore(bytes);}}
export async function restoreState(bytes){{return (await module()).restore(bytes);}}
"#,
        host = relative(&host),
        helper = relative(&helper),
        wasm = relative(name),
        snapshot = relative(&snapshot),
        module = module,
        binding = binding
    );
    fs::write(parent.join(&entry), code).map_err(|e| e.to_string())?;
    Ok(json!({"snapshot":binding,"entry":entry,"wasm":module}))
}
pub fn gpu(dir: &Path, seed: &[u8]) -> LangResult<Value> {
    let path = dir.join("manifest.json");
    let mut manifest: Value = serde_json::from_slice(&fs::read(&path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if manifest["runtime_abi"] != "ink-module-v1" {
        return Err("initial state requires a complete stateful GPU module".into());
    }
    crate::runtime::emit_initial_state(&dir.join("cpu"), Some(seed))?;
    let program = dir.join("program.mjs");
    let source = fs::read_to_string(&program).map_err(|e| e.to_string())?;
    let binding = javascript(&program, &source, seed)?;
    manifest["initial_state"] = binding.clone();
    manifest["javascript_sha256"] = json!(format!(
        "{:x}",
        Sha256::digest(fs::read(&program).map_err(|e| e.to_string())?)
    ));
    fs::write(
        &path,
        serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(binding)
}
