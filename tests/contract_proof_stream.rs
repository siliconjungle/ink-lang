use serde_json::{json, Value};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::PathBuf,
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
};
const SOURCE:&str="module stream;spec fn identity(x:u32)->u32 ensures result==x;implementation same for identity{return x;}";
fn start(name: &str) -> (PathBuf, Child, ChildStdin, BufReader<ChildStdout>, Value) {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("build")
        .join(name);
    fs::create_dir_all(&dir).unwrap();
    let file = dir.join("source.ink");
    fs::write(&file, SOURCE).unwrap();
    let export = dir.join("obligations.json");
    let mut child = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("check-contract-proof-stream")
        .arg(&file)
        .arg("--export-obligations").arg(&export)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut line = String::new();
    output.read_line(&mut line).unwrap();
    let ready: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(ready["status"], "ready");
    let goals: Value = serde_json::from_slice(&fs::read(&export).unwrap()).unwrap();
    assert_eq!(goals["source_sha256"], ready["source_sha256"]);
    let direct = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-contract-obligations").arg(&file).arg("-o").arg(dir.join("direct.json"))
        .output().unwrap();
    assert!(direct.status.success());
    assert_eq!(fs::read(&export).unwrap(), fs::read(dir.join("direct.json")).unwrap());
    // Later filesystem edits are not read as checker premises.
    fs::write(&export, b"{\"pure\":[]}").unwrap();
    (file, child, input, output, ready)
}
fn ask(input: &mut ChildStdin, output: &mut BufReader<ChildStdout>, request: Value) -> Value {
    writeln!(input, "{request}").unwrap();
    input.flush().unwrap();
    let mut line = String::new();
    output.read_line(&mut line).unwrap();
    serde_json::from_str(&line).unwrap()
}
#[test]
fn streamed_attempts_replay_each_proof_and_remain_bound_to_the_initial_source() {
    let (file, child, mut input, mut output, ready) = start("contract-proof-stream");
    let valid = json!({"name":"same:ensures:0","proof":"Normalize","knowledge":null});
    assert_eq!(
        ask(&mut input, &mut output, valid.clone())["status"],
        "checked"
    );
    assert_eq!(
        ask(
            &mut input,
            &mut output,
            json!({"name":"same:ensures:0","proof":{"Hypothesis":99},"knowledge":null})
        )["status"],
        "rejected"
    );
    assert_eq!(
        ask(
            &mut input,
            &mut output,
            json!({"name":"same:ensures:0","proof":"Normalize","knowledge":null,"goal":true})
        )["status"],
        "rejected"
    );
    assert_eq!(
        ask(
            &mut input,
            &mut output,
            json!({"name":"missing","proof":"Normalize","knowledge":null})
        )["status"],
        "rejected"
    );
    fs::write(&file, SOURCE.replace("return x;", "return 0;")).unwrap();
    assert_eq!(ask(&mut input, &mut output, valid)["status"], "checked");
    drop(input);
    let result = child.wait_with_output().unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let changed = verified_language::modules::load(&file).unwrap().program;
    assert_ne!(
        verified_language::contracts::subject_identity(&changed).unwrap(),
        ready["source_sha256"]
    );
    assert!(verified_language::core::CheckedModule::from_source(changed).is_err());
}
#[test]
fn stream_requests_keep_the_existing_transport_byte_limit() {
    let (_, child, mut input, _, _) = start("contract-proof-stream-limit");
    let bytes = vec![b' '; verified_language::registry::MAX_VIEW_BYTES + 1];
    input.write_all(&bytes).unwrap();
    drop(input);
    let result = child.wait_with_output().unwrap();
    assert!(!result.status.success());
    assert!(String::from_utf8_lossy(&result.stderr).contains("contract proof request byte limit"));
}

#[test]
fn state_proof_stream_replays_existing_dependencies_for_each_attempt() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let evidence: Value =
        serde_json::from_str(include_str!("fixtures/abstract-interfaces/proofs.json")).unwrap();
    let export = root.join("build/contract-state-stream-export.json");
    let mut child = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("check-contract-proof-stream")
        .arg(root.join("tests/fixtures/abstract-interfaces/main.ink"))
        .arg("--export-obligations").arg(&export)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let mut input = child.stdin.take().unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut line = String::new();
    output.read_line(&mut line).unwrap();
    let ready: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(ready["source_sha256"], evidence["source_sha256"]);
    let goals: Value = serde_json::from_slice(&fs::read(export).unwrap()).unwrap();
    assert_eq!(goals["source_sha256"], ready["source_sha256"]);
    assert_eq!(goals["state"]["obligations"].as_array().unwrap().len(), evidence["state_proofs"].as_object().unwrap().len());
    for (name, proof) in evidence["state_proofs"].as_object().unwrap() {
        let answer = ask(
            &mut input,
            &mut output,
            json!({"name":name,"proof":proof,"knowledge":evidence["state_knowledge"]}),
        );
        assert_eq!(answer["status"], "checked", "{answer}");
        let answer = ask(
            &mut input,
            &mut output,
            json!({"name":name,"proof":{"Hypothesis":999},"knowledge":evidence["state_knowledge"]}),
        );
        assert_eq!(answer["status"], "rejected", "{answer}");
    }
    drop(input);
    let result = child.wait_with_output().unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}

#[test]
fn plain_stream_remains_available_and_failed_export_never_announces_readiness() {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("build/contract-stream-ready");
    fs::create_dir_all(&dir).unwrap();
    let file = dir.join("source.ink");
    fs::write(&file, SOURCE).unwrap();
    let plain = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("check-contract-proof-stream").arg(&file)
        .stdin(Stdio::null()).output().unwrap();
    assert!(plain.status.success(), "{}", String::from_utf8_lossy(&plain.stderr));
    let ready: Value = serde_json::from_slice(&plain.stdout).unwrap();
    assert_eq!(ready["status"], "ready");
    assert_eq!(ready.as_object().unwrap().len(), 2);
    // A directory is not an output file. No successful-ready frame may precede
    // the error, since the producer would otherwise read a stale/missing export.
    let failed = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("check-contract-proof-stream").arg(&file)
        .arg("--export-obligations").arg(&dir)
        .stdin(Stdio::null()).output().unwrap();
    assert!(!failed.status.success());
    assert!(failed.stdout.is_empty());
}
