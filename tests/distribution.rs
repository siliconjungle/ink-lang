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
    assert!(resources.join("planner/select_implementation.py").is_file());
    assert!(resources
        .join("knowledge/producers/implementation_candidates.py")
        .is_file());
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
    // Proposals use the moved database and producer, not their checkout paths.
    let action_source = include_str!("../examples/action-transitions.ink");
    fs::write(outside.join("actions.ink"), action_source).unwrap();
    fs::write(
        outside.join("selected.ink"),
        action_source.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);"),
    )
    .unwrap();
    success(command().args(["emit-action-model", "actions.ink", "-o", "before.json"]));
    success(command().args(["emit-action-model", "selected.ink", "-o", "after.json"]));
    success(command().args(["emit-core", "selected.ink", "-o", "selected.json"]));
    success(
        Command::new("python3")
            .arg(resources.join("knowledge/producers/action_replacement.py"))
            .args([
                "before.json",
                "after.json",
                "selected.json",
                "-o",
                "whole-selection.json",
            ])
            .env_remove("INK_KNOWLEDGE_ROOT")
            .current_dir(&outside),
    );
    let whole: Value = serde_json::from_slice(&success(command().args([
        "explain",
        "actions.ink",
        "--selection",
        "whole-selection.json",
    ])))
    .unwrap();
    assert_eq!(
        whole["whole_action_selection"]["semantics"],
        "ink-action-transition-v1"
    );
    assert_eq!(
        whole["selection"]["applied_laws"].as_array().unwrap().len(),
        1
    );
    fs::write(outside.join("main.ink"), "module installed; import \"std:words\" as words; fn identity(x:u32)->u32{return x+0;} fn bounded(x:u32)->u32{return words.clamp32(x,0,100);}").unwrap();
    fs::write(outside.join("args.json"), "[4294967295]").unwrap();
    let value = success(command().args(["run", "main.ink", "bounded", "args.json"]));
    assert_eq!(String::from_utf8(value).unwrap().trim(), "100");

    let info: Value = serde_json::from_slice(&success(
        command()
            .args(["explain", "main.ink", "--search-budget", "16", "--optimise"])
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
            .args([
                "build",
                "main.ink",
                "--target",
                "javascript",
                "--search-budget",
                "16",
                "--optimise",
            ])
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

    // Recursive planning also runs solely from the relocated bundle. Select a
    // small published strategy domain to make this packaging check bounded.
    let mut registry: Value = serde_json::from_slice(
        &fs::read(resources.join("knowledge/ink_knowledge/implementation-recipes.json")).unwrap(),
    )
    .unwrap();
    registry["recipes"]
        .as_array_mut()
        .unwrap()
        .retain(|r| r["function"] == "physical");
    fs::write(
        outside.join("registry.json"),
        serde_json::to_vec(&registry).unwrap(),
    )
    .unwrap();
    fs::write(
        outside.join("mapped.ink"),
        "module moved; fn mapped(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}",
    )
    .unwrap();
    success(
        command()
            .args(["compile", "mapped.ink", "--optimise"])
            .arg(resources.join("knowledge"))
            .args([
                "--registry",
                "registry.json",
                "--target",
                "rust",
                "--search-budget",
                "4",
                "--state-limit",
                "8",
                "--planning-seconds",
                "60",
                "-o",
                "mapped.rs",
            ]),
    );
    let planning: Value = serde_json::from_slice(
        &fs::read(outside.join("mapped.rs.planning.json.receipt.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(planning["status"], "checked");
    assert!(planning["candidates"].as_array().unwrap().len() > 1);
    assert!(planning["coverage"]["entries"].as_u64().unwrap() > 1024);
    let selected = fs::read(outside.join("mapped.rs")).unwrap();

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
            .args(["explain", "main.ink", "--search-budget", "16", "--optimise"])
            .arg(knowledge.join("store/snapshot.json"))
            .arg("--search-tool")
            .arg(planner.join("plan.py")),
    ))
    .unwrap();
    assert_eq!(info["selection"], independent["selection"]);
    let no_python = command()
        .env("INK_DISTRIBUTION", outside.join("missing bundle"))
        .env("INK_KNOWLEDGE_ROOT", &knowledge)
        .args(["explain", "main.ink", "--search-budget", "16", "--optimise"])
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
    success(
        command()
            .env("PATH", "")
            .env("INK_DISTRIBUTION", outside.join("missing bundle"))
            .args([
                "compile",
                "mapped.ink",
                "--plan",
                "mapped.rs.planning.json",
                "--target",
                "rust",
                "-o",
                "mapped-replayed.rs",
            ]),
    );
    assert_eq!(
        selected,
        fs::read(outside.join("mapped-replayed.rs")).unwrap()
    );
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
    let whole_frozen: Value = serde_json::from_slice(&success(
        command()
            .env("PATH", "")
            .env("INK_DISTRIBUTION", outside.join("missing bundle"))
            .args([
                "explain",
                "actions.ink",
                "--selection",
                "whole-selection.json",
            ]),
    ))
    .unwrap();
    assert_eq!(whole["selection"], whole_frozen["selection"]);
    assert_eq!(whole["checkpoint"], whole_frozen["checkpoint"]);
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
