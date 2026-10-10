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
            Path::new(env!("CARGO_MANIFEST_DIR")).join(if name == "route_selection.py" {
                "planner/route.py"
            } else {
                "planner/ink_planner/source_routing.py"
            }),
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
    let knowledge = dir.join("knowledge/research");
    let target = dir.join("target.json");
    let workload = dir.join("workload.json");
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
    fs::write(&target,br#"{"hardware":"test-device","driver":"test-driver","toolchain":"test-toolchain","backend":"mixed","bridge":"host"}"#).unwrap();
    fs::write(
        &workload,
        br#"{"shape":[100],"distribution":"synthetic","concurrency":1,"residency":"host"}"#,
    )
    .unwrap();
    let publish = |plans: Vec<(String, Vec<&str>)>| {
        let records:Vec<Value>=plans.into_iter().map(|(plan,samples)|json!({"schema":1,"program":m.identity().unwrap(),"entries":[],"plan":plan,"target":serde_json::from_slice::<Value>(&fs::read(&target).unwrap()).unwrap(),"workload":serde_json::from_slice::<Value>(&fs::read(&workload).unwrap()).unwrap(),"metrics":{"complete_call_ns":samples,"peak_bytes":400}})).collect();
        let input = dir.join("observations.json");
        fs::write(&input, serde_json::to_vec(&records).unwrap()).unwrap();
        let result=Command::new("python3").env("PYTHONPATH",Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge"))
            .arg("-c").arg("import sys,json;from ink_knowledge import Store;s=Store.publish(sys.argv[1],[]);[s.observe(o) for o in json.load(open(sys.argv[2]))];s.rebuild()")
            .arg(&knowledge).arg(&input).output().unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
    };
    publish(vec![
        (digest(&baseline), vec!["10000000", "11000000", "9000000"]),
        (digest(&mixed), vec!["1000000", "2000000", "1000000"]),
    ]);
    let args = [
        "--compiler",
        compiler,
        "--core",
        text(&core),
        "--baseline",
        text(&baseline),
        "--candidates",
        text(&candidates),
        "--knowledge-root",
        text(&knowledge),
        "--target",
        text(&target),
        "--workload",
        text(&workload),
        "-o",
        text(&output),
    ];
    let r = tool("route_selection.py", &args);
    assert!(r.status.success(), "{}", String::from_utf8_lossy(&r.stderr));
    assert_eq!(fs::read(&output).unwrap(), fs::read(&mixed).unwrap());
    let mut forged: Value = serde_json::from_slice(&fs::read(&mixed).unwrap()).unwrap();
    forged["stages"][1]["arguments"][0] = json!({"Literal":{"U32":0}});
    fs::write(&mixed, serde_json::to_vec(&forged).unwrap()).unwrap();
    publish(vec![(digest(&mixed), vec!["0", "0", "0"])]);
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
    // A different device cannot borrow the favourable observation.
    fs::write(&target,br#"{"hardware":"different-device","driver":"test-driver","toolchain":"test-toolchain","backend":"mixed","bridge":"host"}"#).unwrap();
    let r = tool("route_selection.py", &args);
    assert!(r.status.success());
    assert_eq!(fs::read(&output).unwrap(), fs::read(&baseline).unwrap());
    // Restore the target, then tamper with immutable observation content.
    fs::write(&target,br#"{"hardware":"test-device","driver":"test-driver","toolchain":"test-toolchain","backend":"mixed","bridge":"host"}"#).unwrap();
    let observation = fs::read_dir(knowledge.join("store/observations"))
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let mut forged: Value = serde_json::from_slice(&fs::read(&observation).unwrap()).unwrap();
    forged["metrics"]["complete_call_ns"] = json!(["0"]);
    fs::write(observation, serde_json::to_vec(&forged).unwrap()).unwrap();
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
