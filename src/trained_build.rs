//! Capture, fit and compile in a private staging directory, then publish one bundle.
use crate::{core::CheckedModule, training, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
struct Staging(PathBuf);
impl Drop for Staging {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn hash(path: &Path) -> LangResult<String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count]);
    }
    Ok(format!("{:x}", digest.finalize()))
}
fn files(root: &Path, dir: &Path, out: &mut BTreeMap<String, Value>) -> LangResult<()> {
    fn walk(
        root: &Path,
        dir: &Path,
        out: &mut BTreeMap<String, Value>,
        depth: usize,
        nodes: &mut usize,
        total: &mut u64,
    ) -> LangResult<()> {
        if depth > 48 {
            return Err("artifact directory depth limit".into());
        }
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            *nodes += 1;
            if *nodes > 8192 {
                return Err("artifact file inventory limit".into());
            }
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            let kind = entry.file_type().map_err(|e| e.to_string())?;
            if kind.is_symlink() {
                return Err("trained artifacts cannot contain symlinks".into());
            }
            if kind.is_dir() {
                if entry.file_name() == "target" {
                    return Err("trained artifact unexpectedly contains a compiler cache".into());
                }
                walk(root, &path, out, depth + 1, nodes, total)?;
            } else if kind.is_file() {
                let bytes = entry.metadata().map_err(|e| e.to_string())?.len();
                *total = total.checked_add(bytes).ok_or("artifact byte overflow")?;
                if *total > 1024 * 1024 * 1024 {
                    return Err("artifact total byte limit".into());
                }
                let name = path
                    .strip_prefix(root)
                    .map_err(|e| e.to_string())?
                    .to_str()
                    .ok_or("artifact filename is not UTF-8")?
                    .replace('\\', "/");
                out.insert(name, json!({"bytes":bytes,"sha256":hash(&path)?}));
            } else {
                return Err("unsupported artifact file type".into());
            }
        }
        Ok(())
    }
    walk(root, dir, out, 0, &mut 0, &mut 0)
}

pub fn build_model(
    module: &CheckedModule,
    trace_bytes: &[u8],
    initial: Option<&[u8]>,
    target: &str,
    destination: &Path,
    cargo: Option<&str>,
) -> LangResult<Value> {
    if trace_bytes.len() > 16_000_000 || initial.is_some_and(|bytes| bytes.len() > 64_000_000) {
        return Err("trained build input byte limit".into());
    }
    let target = match target {
        "gpu" => "webgpu",
        s => s,
    };
    if !["javascript", "rust", "native", "wasm32", "webgpu"].contains(&target) {
        return Err("unsupported trained artifact target".into());
    }
    if fs::symlink_metadata(destination).is_ok() {
        return Err(
            "trained artifact destination already exists; publish to a new directory".into(),
        );
    }
    let name = destination
        .file_name()
        .ok_or("trained artifact requires a new directory name")?;
    let parent = destination
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let parent = fs::canonicalize(parent).map_err(|e| e.to_string())?;
    let destination = parent.join(name);
    let trace: training::Trace = serde_json::from_slice(trace_bytes).map_err(|e| e.to_string())?;
    let trained = training::replay_from(module, &trace, initial)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let staging = Staging(parent.join(format!(".ink-model-{}-{stamp}", std::process::id())));
    fs::create_dir(&staging.0).map_err(|e| e.to_string())?;
    let write = |name: &str, bytes: &[u8]| {
        fs::write(staging.0.join(name), bytes).map_err(|e| e.to_string())
    };
    write("source.core.json", &module.bytes()?)?;
    write("trace.json", trace_bytes)?;
    write("model.snapshot", &trained.snapshot)?;
    write(
        "training.receipt.json",
        &serde_json::to_vec_pretty(&trained.receipt).map_err(|e| e.to_string())?,
    )?;
    crate::runtime::emit_durable_hosts(&staging.0.join("hosts"))?;
    fs::write(
        staging.0.join("hosts/state-wasm.mjs"),
        crate::runtime::STATE_WASM_HOST,
    )
    .map_err(|e| e.to_string())?;
    if let Some(bytes) = initial {
        write("parent.snapshot", bytes)?;
    }
    let artifact = match target {
        "javascript" => "program.mjs".to_string(),
        "wasm32" => "program.wasm".into(),
        "native" => format!("program{}", std::env::consts::EXE_SUFFIX),
        _ => "program".into(),
    };
    let compiler = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut command = Command::new(&compiler);
    command
        .arg("build")
        .arg(staging.0.join("source.core.json"))
        .arg("--core")
        .arg("--initial-state")
        .arg(staging.0.join("model.snapshot"))
        .arg("--target")
        .arg(target)
        .arg("-o")
        .arg(staging.0.join(&artifact));
    command.env(
        "INK_COMPILED_TARGET_DIR",
        parent.join(".ink-compiled-cache"),
    );
    if let Some(cargo) = cargo {
        command.arg("--cargo").arg(cargo);
    }
    let compiled = command.output().map_err(|e| e.to_string())?;
    if !compiled.status.success() {
        return Err(format!(
            "trained artifact compilation failed: {}",
            String::from_utf8_lossy(&compiled.stderr)
        ));
    }
    // Source-project targets must remain verifiable after a --locked build with
    // an external target directory. Capture dependency resolution before hashing.
    fn lock_projects(dir: &Path, cargo: &str) -> LangResult<()> {
        if dir.join("Cargo.toml").is_file() && !dir.join("Cargo.lock").is_file() {
            let result = Command::new(cargo)
                .arg("generate-lockfile")
                .arg("--manifest-path")
                .arg(dir.join("Cargo.toml"))
                .output()
                .map_err(|e| e.to_string())?;
            if !result.status.success() {
                return Err(format!(
                    "trained dependency capture failed: {}",
                    String::from_utf8_lossy(&result.stderr)
                ));
            }
        }
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                lock_projects(&entry.path(), cargo)?;
            }
        }
        Ok(())
    }
    let cargo = cargo
        .map(String::from)
        .or_else(|| std::env::var("INK_CARGO").ok())
        .unwrap_or_else(|| "cargo".into());
    lock_projects(&staging.0, &cargo)?;
    let plan_path = if ["rust", "webgpu"].contains(&target) {
        staging.0.join(&artifact).join("plan.json")
    } else {
        staging.0.join(format!("{artifact}.plan.json"))
    };
    let mut plan: Value = serde_json::from_slice(&fs::read(&plan_path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if plan["input_core_sha256"] != module.identity()?
        || plan["initial_state"]["snapshot_sha256"] != trained.receipt["snapshot_sha256"]
    {
        return Err("compiled trained artifact binding mismatch".into());
    }
    if plan.get("source").is_some() {
        plan["source"] = json!("source.core.json");
        fs::write(
            plan_path,
            serde_json::to_vec_pretty(&plan).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    }
    let entry = match target {
        "wasm32" => "program.wasm.entry.mjs".to_string(),
        "webgpu" => "program/ink-gpu.mjs".into(),
        "rust" => "program/Cargo.toml".into(),
        _ => artifact.clone(),
    };
    let mut inventory = BTreeMap::new();
    files(&staging.0, &staging.0, &mut inventory)?;
    let manifest = json!({"schema":1,"semantics":"ink-trained-artifact-v1","mode":"adaptive","target":target,"entry":entry,"source_core_sha256":module.identity()?,"compiler_sha256":hash(&compiler)?,"training":trained.receipt,"files":inventory,"scope":"Captured checked module, explicit trace, complete optimizer/application checkpoint and compiled startup factory. Runtime learning remains enabled. No frozen specialization, convergence, approximation or compiler-correctness proof."});
    write(
        "artifact.json",
        &serde_json::to_vec_pretty(&manifest).map_err(|e| e.to_string())?,
    )?;
    verify_model(&staging.0, false)?;
    let manifest_sha256 = hash(&staging.0.join("artifact.json"))?;
    if fs::symlink_metadata(&destination).is_ok() {
        return Err("trained artifact destination appeared during compilation".into());
    }
    fs::rename(&staging.0, &destination).map_err(|e| e.to_string())?;
    Ok(
        json!({"status":"published","directory":destination,"manifest_sha256":manifest_sha256,"source_core_sha256":module.identity()?,"snapshot_sha256":manifest["training"]["snapshot_sha256"],"target":target,"mode":"adaptive"}),
    )
}
pub fn verify_model(directory: &Path, replay: bool) -> LangResult<Value> {
    let read = |name: &str, max: u64| -> LangResult<Vec<u8>> {
        let mut out = Vec::new();
        fs::File::open(directory.join(name))
            .map_err(|e| e.to_string())?
            .take(max + 1)
            .read_to_end(&mut out)
            .map_err(|e| e.to_string())?;
        if out.len() as u64 > max {
            return Err("trained artifact input byte limit".into());
        }
        Ok(out)
    };
    let manifest: Value =
        serde_json::from_slice(&read("artifact.json", 16_000_000)?).map_err(|e| e.to_string())?;
    if manifest["schema"] != 1
        || manifest["semantics"] != "ink-trained-artifact-v1"
        || manifest["mode"] != "adaptive"
    {
        return Err("trained artifact format".into());
    }
    let mut inventory = BTreeMap::new();
    files(directory, directory, &mut inventory)?;
    inventory.remove("artifact.json");
    if serde_json::to_value(&inventory).map_err(|e| e.to_string())? != manifest["files"] {
        return Err("trained artifact file inventory or hash mismatch".into());
    }
    let entry = manifest["entry"].as_str().ok_or("missing trained entry")?;
    if !inventory.contains_key(entry) {
        return Err("missing trained entry artifact".into());
    }
    let module =
        CheckedModule::from_bytes(&read("source.core.json", crate::core::MAX_BYTES as u64)?)?;
    let seed = read("model.snapshot", 64_000_000)?;
    crate::stateful::Runtime::restore_portable_checked(&module, &seed)?;
    let receipt: Value = serde_json::from_slice(&read("training.receipt.json", 16_000_000)?)
        .map_err(|e| e.to_string())?;
    if receipt != manifest["training"]
        || receipt["source_core_sha256"] != module.identity()?
        || manifest["source_core_sha256"] != module.identity()?
        || receipt["snapshot_sha256"] != inventory["model.snapshot"]["sha256"]
    {
        return Err("trained artifact source/checkpoint binding mismatch".into());
    }
    let plan_path = match manifest["target"].as_str() {
        Some("javascript") => "program.mjs.plan.json",
        Some("wasm32") => "program.wasm.plan.json",
        Some("native") => {
            if cfg!(windows) {
                "program.exe.plan.json"
            } else {
                "program.plan.json"
            }
        }
        Some("rust" | "webgpu") => "program/plan.json",
        _ => return Err("invalid trained artifact target".into()),
    };
    let plan: Value =
        serde_json::from_slice(&read(plan_path, 64_000_000)?).map_err(|e| e.to_string())?;
    if plan["input_core_sha256"] != module.identity()?
        || plan["selected_core_sha256"] != module.identity()?
        || plan["initial_state"]["snapshot_sha256"] != receipt["snapshot_sha256"]
    {
        return Err("compiled initial state binding mismatch".into());
    }
    for (name, binding) in &inventory {
        if name.ends_with("initial.snapshot") && binding["sha256"] != receipt["snapshot_sha256"] {
            return Err("compiled initial checkpoint binding mismatch".into());
        }
    }
    if manifest["target"] == "webgpu" {
        let gpu: Value = serde_json::from_slice(&read("program/manifest.json", 16_000_000)?)
            .map_err(|e| e.to_string())?;
        let file = gpu["initial_state"]["file"]
            .as_str()
            .ok_or("GPU initial state descriptor")?;
        let binding = inventory
            .get(&format!("program/{file}"))
            .ok_or("GPU initial state file binding")?;
        let javascript = inventory
            .get("program/program.mjs")
            .ok_or("GPU JavaScript entry binding")?;
        if gpu["initial_state"]["sha256"] != receipt["snapshot_sha256"]
            || gpu["initial_state"]["bytes"] != binding["bytes"]
            || gpu["initial_state"]["sha256"] != binding["sha256"]
            || gpu["javascript_sha256"] != javascript["sha256"]
        {
            return Err("GPU initialized artifact binding mismatch".into());
        }
    }
    let parent = if receipt["initial_snapshot_sha256"].is_null() {
        None
    } else {
        Some(read("parent.snapshot", 64_000_000)?)
    };
    if parent
        .as_ref()
        .map(|bytes| format!("{:x}", Sha256::digest(bytes)))
        != receipt["initial_snapshot_sha256"]
            .as_str()
            .map(String::from)
    {
        return Err("trained artifact parent binding mismatch".into());
    }
    let trace: training::Trace =
        serde_json::from_slice(&read("trace.json", 16_000_000)?).map_err(|e| e.to_string())?;
    if receipt["trace_sha256"]
        != format!(
            "{:x}",
            Sha256::digest(serde_json::to_vec(&trace).map_err(|e| e.to_string())?)
        )
    {
        return Err("trained artifact trace binding mismatch".into());
    }
    if replay {
        let repeated = training::replay_from(&module, &trace, parent.as_deref())?;
        if repeated.snapshot != seed || repeated.receipt != receipt {
            return Err("trained artifact replay mismatch".into());
        }
    }
    Ok(
        json!({"status":"checked","mode":"adaptive","source_core_sha256":module.identity()?,"snapshot_sha256":receipt["snapshot_sha256"],"files":inventory.len(),"training_replayed":replay,"scope":"Local artifact integrity, checked source and typed checkpoint; optional deterministic training replay. No authenticity, compiler-correctness or convergence proof."}),
    )
}
