use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
    time::{SystemTime, UNIX_EPOCH},
};
use verified_language::{core::CheckedModule, syntax};
fn temp() -> PathBuf {
    static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let p = std::env::temp_dir().join(format!(
        "ink-route-tools-{}-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    ));
    fs::create_dir(&p).unwrap();
    p
}
fn tool(name: &str, args: &[&str]) -> Output {
    Command::new("python3")
        .arg(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("knowledge/tools")
                .join(name),
        )
        .args(args)
        .output()
        .unwrap()
}
fn text(p: &Path) -> &str {
    p.to_str().unwrap()
}
fn digest(p: &Path) -> String {
    format!("{:x}", Sha256::digest(fs::read(p).unwrap()))
}
#[test]
fn external_partitioning_and_selection_never_promote_costs_to_proofs() {
    let dir = temp();
    let core = dir.join("core.json");
    let baseline = dir.join("baseline.json");
    let mixed = dir.join("mixed.json");
    let placements = dir.join("placements.json");
    let candidates = dir.join("candidates.json");
    let measurements = dir.join("measurements.json");
    let output = dir.join("selected.json");
    let m=CheckedModule::from_source(syntax::parse("module tools; fn bulk(xs: List<u32>) -> u32 { return sum(xs); } fn finish(x: u32) -> u32 { return x + 1; } fn entry(xs: List<u32>) -> u32 { return finish(bulk(xs)); }").unwrap()).unwrap();
    fs::write(&core, m.bytes().unwrap()).unwrap();
    fs::write(&placements, b"{\"bulk\":\"gpu\"}").unwrap();
    let compiler = env!("CARGO_BIN_EXE_ink");
    let args = [
        "--compiler",
        compiler,
        "--core",
        text(&core),
        "--entry",
        "entry",
        "--baseline",
        "-o",
        text(&baseline),
    ];
    assert!(tool("source_routing.py", &args).status.success());
    let args = [
        "--compiler",
        compiler,
        "--core",
        text(&core),
        "--entry",
        "entry",
        "--placements",
        text(&placements),
        "-o",
        text(&mixed),
    ];
    let r = tool("source_routing.py", &args);
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    fs::write(&candidates, b"[\"mixed.json\"]").unwrap();
    let mut samples = serde_json::Map::new();
    samples.insert(digest(&baseline), json!([10, 11, 9]));
    samples.insert(digest(&mixed), json!([1, 2, 1]));
    let profile = json!({"schema":1,"core_sha256":m.identity().unwrap(),"entry":"entry","metric":"complete-call-ms","target":"test-target","workload":"synthetic costs only; no performance claim","samples":samples});
    fs::write(&measurements, serde_json::to_vec(&profile).unwrap()).unwrap();
    let args = [
        "--compiler",
        compiler,
        "--core",
        text(&core),
        "--baseline",
        text(&baseline),
        "--candidates",
        text(&candidates),
        "--measurements",
        text(&measurements),
        "-o",
        text(&output),
    ];
    let r = tool("route_selection.py", &args);
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    assert_eq!(fs::read(&output).unwrap(), fs::read(&mixed).unwrap());
    let mut forged: Value = serde_json::from_slice(&fs::read(&mixed).unwrap()).unwrap();
    forged["stages"][1]["arguments"][0] = json!({"Literal":{"U32":0}});
    fs::write(&mixed, serde_json::to_vec(&forged).unwrap()).unwrap();
    let mut forged_profile = profile.clone();
    forged_profile["samples"][digest(&mixed)] = json!([0, 0, 0]);
    fs::write(&measurements, serde_json::to_vec(&forged_profile).unwrap()).unwrap();
    let r = tool("route_selection.py", &args);
    assert!(r.status.success());
    assert_eq!(fs::read(&output).unwrap(), fs::read(&baseline).unwrap());
    let receipt: Value = serde_json::from_slice(&r.stdout).unwrap();
    assert_eq!(receipt["rejected"].as_array().unwrap().len(), 1);
    let mut limited = args.to_vec();
    limited.extend(["--max-candidates", "0"]);
    let r = tool("route_selection.py", &limited);
    assert!(r.status.success());
    assert_eq!(fs::read(&output).unwrap(), fs::read(&baseline).unwrap());
    forged_profile["samples"][digest(&baseline)] = json!([-1]);
    fs::write(&measurements, serde_json::to_vec(&forged_profile).unwrap()).unwrap();
    fs::write(&output, b"preserved").unwrap();
    let r = tool("route_selection.py", &args);
    assert!(!r.status.success());
    assert_eq!(fs::read(&output).unwrap(), b"preserved");
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn external_producer_shares_repeated_pure_calls_under_unchanged_structural_checker() {
    let dir = temp();
    let core = dir.join("core.json");
    let route = dir.join("route.json");
    let placements = dir.join("placements.json");
    let m=CheckedModule::from_source(syntax::parse("module sharing; fn bulk(xs: List<u32>) -> u32 { return sum(xs); } fn combine(a: u32, b: u32) -> u32 { return a + b; } fn entry(xs: List<u32>) -> u32 { return combine(bulk(xs), bulk(xs)); }").unwrap()).unwrap();
    fs::write(&core, m.bytes().unwrap()).unwrap();
    fs::write(&placements, b"{\"bulk\":\"gpu\"}").unwrap();
    let r = tool(
        "source_routing.py",
        &[
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
            text(&core),
            "--entry",
            "entry",
            "--placements",
            text(&placements),
            "-o",
            text(&route),
        ],
    );
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    let package: verified_language::source_routing::Package =
        serde_json::from_slice(&fs::read(&route).unwrap()).unwrap();
    assert_eq!(package.stages.len(), 2);
    assert_eq!(
        serde_json::to_value(&package.stages[1].arguments[0]).unwrap(),
        serde_json::to_value(&package.stages[1].arguments[1]).unwrap()
    );
    verified_language::source_routing::check(&m, &package).unwrap();
    fs::remove_dir_all(dir).unwrap();
}
