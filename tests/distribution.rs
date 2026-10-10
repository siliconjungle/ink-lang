use serde_json::Value;
use std::{fs, path::Path, process::Command};

fn success(command: &mut Command) -> Vec<u8> {
    let out = command.output().unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    out.stdout
}

#[test]
fn relocated_install_search_and_independent_offline_replay_need_no_original_paths() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let work = root.join("build/distribution-install-test");
    if work.exists() {
        fs::remove_dir_all(&work).unwrap();
    }
    fs::create_dir_all(&work).unwrap();
    let original = work.join("original prefix");
    success(
        Command::new("python3")
            .arg(root.join("tools/install.py"))
            .args(["--binary", env!("CARGO_BIN_EXE_ink"), "--prefix"])
            .arg(&original),
    );
    let refusal = Command::new("python3")
        .arg(root.join("tools/install.py"))
        .args(["--binary", env!("CARGO_BIN_EXE_ink"), "--prefix"])
        .arg(&original)
        .output()
        .unwrap();
    assert!(!refusal.status.success());
    assert!(original.join("bin/ink").is_file());
    let relocated = work.join("relocated prefix");
    fs::rename(&original, &relocated).unwrap();
    let exe = relocated.join("bin/ink");
    let outside = work.join("outside");
    fs::create_dir_all(&outside).unwrap();
    let resources = relocated.join("share/ink");
    let command = || {
        let mut c = Command::new(&exe);
        c.current_dir(&outside)
            .env_remove("INK_DISTRIBUTION")
            .env_remove("INK_KNOWLEDGE_ROOT");
        c
    };
    let doctor: Value = serde_json::from_slice(&success(command().arg("doctor"))).unwrap();
    for resource in doctor["resources"].as_array().unwrap() {
        assert_eq!(resource["available"], true);
        assert!(Path::new(resource["path"].as_str().unwrap()).starts_with(&resources));
    }
    fs::write(outside.join("main.ink"), "module installed; import \"std:words\" as words; fn identity(x:u32)->u32{return x+0;} fn bounded(x:u32)->u32{return words.clamp32(x,0,100);}").unwrap();
    fs::write(outside.join("args.json"), "[4294967295]").unwrap();
    let value = success(command().args(["run", "main.ink", "bounded", "args.json"]));
    assert_eq!(String::from_utf8(value).unwrap().trim(), "100");
    fs::write(outside.join("views.ink"), "module views; record Row{a:Int,} state Rows:Table<u64,Row> = Table.empty(); keep total:Int=sum(Rows.values().map(fn(r)=>r.a)); query get()->Int reads(total){return total;}").unwrap();
    fs::write(
        outside.join("maintenance.json"),
        include_bytes!("../knowledge/research/table-maintenance/table.json"),
    )
    .unwrap();
    success(command().args([
        "emit-state",
        "views.ink",
        "--maintenance",
        "maintenance.json",
        "--require-views",
        "-o",
        "state",
    ]));
    assert!(outside.join("state/views/total.evidence.json").is_file());
    let info: Value = serde_json::from_slice(&success(
        command()
            .args(["explain", "main.ink", "--optimise"])
            .arg(resources.join("knowledge/store/snapshot.json")),
    ))
    .unwrap();
    assert_ne!(info["input_core_sha256"], info["selected_core_sha256"]);
    assert!(!info["selection"]["applied_laws"]
        .as_array()
        .unwrap()
        .is_empty());
    success(
        command()
            .args(["build", "main.ink", "--target", "javascript", "--optimise"])
            .arg(resources.join("knowledge/store/snapshot.json"))
            .args(["-o", "program.mjs"]),
    );
    let plan: Value =
        serde_json::from_slice(&fs::read(outside.join("program.mjs.plan.json")).unwrap()).unwrap();
    fs::write(
        outside.join("selection.json"),
        serde_json::to_vec(&plan["semantic_package"]).unwrap(),
    )
    .unwrap();

    // Separate the producer package and database physically, with no sibling checkout.
    let planner = outside.join("independent planner");
    let knowledge = outside.join("independent database");
    fs::rename(resources.join("planner"), &planner).unwrap();
    fs::rename(resources.join("knowledge"), &knowledge).unwrap();
    let partial: Value = serde_json::from_slice(&success(command().arg("doctor"))).unwrap();
    assert!(partial["resources"]
        .as_array()
        .unwrap()
        .iter()
        .all(|r| r["available"] == false));

    let independent: Value = serde_json::from_slice(&success(
        command()
            .env("INK_DISTRIBUTION", outside.join("missing bundle"))
            .env("INK_KNOWLEDGE_ROOT", &knowledge)
            .args(["explain", "main.ink", "--optimise"])
            .arg(knowledge.join("store/snapshot.json"))
            .arg("--search-tool")
            .arg(planner.join("plan.py")),
    ))
    .unwrap();
    assert_eq!(info["selection"], independent["selection"]);
    let no_python = command()
        .env("INK_DISTRIBUTION", outside.join("missing bundle"))
        .env("INK_KNOWLEDGE_ROOT", &knowledge)
        .args(["explain", "main.ink", "--optimise"])
        .arg(knowledge.join("store/snapshot.json"))
        .arg("--search-tool")
        .arg(planner.join("plan.py"))
        .arg("--python")
        .arg(outside.join("missing python"))
        .output()
        .unwrap();
    assert!(!no_python.status.success());
    assert!(String::from_utf8_lossy(&no_python.stderr).contains("--python PATH"));

    // Frozen checking cannot accidentally call Python or discover a repository.
    fs::remove_dir_all(&planner).unwrap();
    fs::remove_dir_all(&knowledge).unwrap();
    let frozen: Value = serde_json::from_slice(&success(
        command()
            .env("PATH", "")
            .env("INK_DISTRIBUTION", outside.join("missing bundle"))
            .args(["explain", "main.ink", "--selection", "selection.json"]),
    ))
    .unwrap();
    assert_eq!(info["selection"], frozen["selection"]);
    assert_eq!(info["checkpoint"], frozen["checkpoint"]);
    assert!(frozen["trust"].as_array().unwrap().len() >= 3);
    let unavailable = command()
        .env("INK_DISTRIBUTION", outside.join("missing bundle"))
        .args(["explain", "main.ink", "--optimise", "missing.json"])
        .output()
        .unwrap();
    assert!(!unavailable.status.success());
    let diagnostic = String::from_utf8_lossy(&unavailable.stderr);
    assert!(diagnostic.contains("--search-tool"));
    assert!(diagnostic.contains("Frozen --selection"));

    let mut bad: Value =
        serde_json::from_slice(&fs::read(outside.join("selection.json")).unwrap()).unwrap();
    bad["input_core_sha256"] = Value::String("0".repeat(64));
    fs::write(
        outside.join("bad-selection.json"),
        serde_json::to_vec(&bad).unwrap(),
    )
    .unwrap();
    let rejected = command()
        .args(["explain", "main.ink", "--selection", "bad-selection.json"])
        .output()
        .unwrap();
    assert!(!rejected.status.success());
    assert!(rejected.stdout.is_empty());
}
