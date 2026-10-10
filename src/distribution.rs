//! Optional installed tools. Resource discovery grants no proof authority.
use crate::LangResult;
use serde_json::{json, Value};
use std::{env, path::PathBuf, process::Command};

pub fn resource(relative: &str) -> LangResult<PathBuf> {
    let explicit = env::var_os("INK_DISTRIBUTION");
    if explicit.as_ref().is_some_and(|root| root.is_empty()) {
        return Err(
            "INK_DISTRIBUTION is empty; provide a tool bundle directory or unset it".into(),
        );
    }
    let roots = if let Some(root) = explicit.as_ref() {
        vec![PathBuf::from(root)]
    } else {
        let mut roots = vec![];
        if let Ok(exe) = env::current_exe() {
            if let Some(prefix) = exe.parent().and_then(|p| p.parent()) {
                let installed = prefix.join("share/ink");
                if installed.is_dir() {
                    roots.push(installed);
                }
            }
        }
        if roots.is_empty() {
            roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")));
        }
        roots
    };
    for root in &roots {
        let file = root.join(relative);
        if file.is_file() {
            return Ok(file);
        }
    }
    Err(format!(
        "optional Ink tool {relative} is unavailable in {}. Install the tool bundle with tools/install.py, set INK_DISTRIBUTION to its share/ink directory, or provide --search-tool/--view-tool explicitly. Frozen --selection replay needs neither tool.",
        roots.iter().map(|p| p.display().to_string()).collect::<Vec<_>>().join(", ")
    ))
}

fn available(tool: &str) -> Value {
    match Command::new(tool).arg("--version").output() {
        Ok(out) => json!({"command":tool,"available":out.status.success(),
            "version":String::from_utf8_lossy(&out.stdout).lines().next().unwrap_or("").chars().take(300).collect::<String>(),
            "diagnostic":String::from_utf8_lossy(&out.stderr).chars().take(300).collect::<String>()}),
        Err(e) => json!({"command":tool,"available":false,"diagnostic":e.to_string()}),
    }
}

pub fn doctor(python: &str) -> Value {
    let tools = [python, "cargo", "rustc", "clang", "node", "zig"]
        .iter()
        .map(|t| available(t))
        .collect::<Vec<_>>();
    let resources = [
        "planner/plan.py",
        "knowledge/producers/view_decomposition.py",
    ]
    .iter()
    .map(|name| match resource(name) {
        Ok(path) => json!({"resource":name,"available":true,"path":path}),
        Err(e) => json!({"resource":name,"available":false,"diagnostic":e}),
    })
    .collect::<Vec<_>>();
    json!({"schema":1,"version":env!("CARGO_PKG_VERSION"),"core_semantics":crate::core::SEMANTICS,
        "executable":env::current_exe().ok(),"tools":tools,"resources":resources,
        "requirements":{"reference":"no external toolchain","javascript":"emission needs no external toolchain; execution needs a JavaScript host",
            "native":"cargo and a C compiler","wasm":"target-specific Rust/C cross toolchain","search":"Python 3.10+, planner and knowledge Python package",
            "gpu":"compiled CPU toolchain plus a supported WebGPU/wgpu device"},
        "scope":"Tool versions and file availability only; devices, target installation and proofs are not validated by doctor."})
}
