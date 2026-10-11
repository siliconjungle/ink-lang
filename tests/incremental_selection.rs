use serde_json::{json, Value};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::Path,
    process::{Command, Stdio},
};
#[test]
fn sealed_admissions_are_source_and_snapshot_bound_and_fail_atomically() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/incremental-session-test");
    fs::create_dir_all(&dir).unwrap();
    let source = root.join("examples/bulk-collections.ink");
    let core = dir.join("core.json");
    assert!(Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-core")
        .arg(source)
        .arg("-o")
        .arg(&core)
        .status()
        .unwrap()
        .success());
    let script="from ink_knowledge import Store;import json,sys;from pathlib import Path;s=Store('knowledge');ids=json.load(open('knowledge/store/bulk-collection-view.json'))['roots'];p=Path(sys.argv[1]);[(p/('view-'+str(i)+'.json')).write_text(json.dumps(s.bundle(ids[i:i+1]))) for i in range(3)]";
    assert!(Command::new("python3")
        .args(["-c", script])
        .arg(&dir)
        .env("PYTHONPATH", root.join("knowledge"))
        .status()
        .unwrap()
        .success());
    let mut child = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("selection-session")
        .arg(&core)
        .arg(dir.join("view-0.json"))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    fn read(out: &mut impl BufRead) -> Value {
        let mut line = String::new();
        out.read_line(&mut line).unwrap();
        serde_json::from_str(&line).unwrap()
    }
    fn send(input: &mut impl Write, out: &mut impl BufRead, value: Value) -> Value {
        writeln!(input, "{}", value).unwrap();
        input.flush().unwrap();
        read(out)
    }
    assert_eq!(read(&mut output)["incremental"], true);
    let view: Value = serde_json::from_slice(&fs::read(dir.join("view-1.json")).unwrap()).unwrap();
    let result = send(&mut input, &mut output, json!({"admit":view}));
    assert_eq!(result["admitted"], true);
    assert_eq!(result["added"], 1);
    let result = send(&mut input, &mut output, json!({"admit":view}));
    assert_eq!(result["added"], 0);
    let mut forged = view.clone();
    let key = forged["objects"]
        .as_object()
        .unwrap()
        .keys()
        .next()
        .unwrap()
        .clone();
    forged["objects"][key]["semantics"] = json!("forged");
    assert_eq!(
        send(&mut input, &mut output, json!({"admit":forged}))["admitted"],
        false
    );
    let mut missing = view.clone();
    missing["membership"] = json!({});
    assert_eq!(
        send(&mut input, &mut output, json!({"admit":missing}))["admitted"],
        false
    );
    let mut other = view.clone();
    other["snapshot"]["root"] = json!("0".repeat(64));
    assert_eq!(
        send(&mut input, &mut output, json!({"admit":other}))["admitted"],
        false
    );
    assert_eq!(send(&mut input, &mut output, json!([]))["checked"], true);
    drop(input);
    assert!(child.wait().unwrap().success());
}
