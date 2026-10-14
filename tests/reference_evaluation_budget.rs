use std::{fs, process::Command};

#[test]
fn explicit_reference_budget_is_bounded_and_preserves_results() {
    let dir = std::env::temp_dir().join(format!("ink-reference-budget-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let source = dir.join("main.ink");
    let args = dir.join("args.json");
    fs::write(&source, "module reference_budget; fn f(x:u32)->u32{return x+x;}").unwrap();
    fs::write(&args, "[7]").unwrap();
    let invoke = |budget: Option<&str>| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_ink"));
        command.arg("run").arg(&source).arg("f").arg(&args);
        if let Some(value) = budget { command.args(["--evaluation-budget", value]); }
        command.output().unwrap()
    };
    let baseline = invoke(None);
    assert!(baseline.status.success());
    assert_eq!(String::from_utf8_lossy(&baseline.stdout).trim(), "14");
    let explicit = invoke(Some("1000"));
    assert!(explicit.status.success());
    assert_eq!(explicit.stdout, baseline.stdout);
    let exhausted = invoke(Some("1"));
    assert!(!exhausted.status.success());
    assert!(String::from_utf8_lossy(&exhausted.stderr).contains("evaluation budget exhausted"));
    for invalid in ["0", "-1", "invalid", "10000000001"] {
        let result = invoke(Some(invalid));
        assert!(!result.status.success(), "accepted {invalid}");
        assert!(String::from_utf8_lossy(&result.stderr).contains("evaluation budget"));
    }
    fs::remove_dir_all(dir).unwrap();
}
