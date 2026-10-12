use serde_json::{json, Value};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
};
use verified_language::{core::CheckedModule, planning, registry, syntax};
#[test]
fn checker_binds_transport_separately_from_default_normalisation() {
    let m = CheckedModule::from_source(
        syntax::parse("module session;fn f(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}")
            .unwrap(),
    )
    .unwrap();
    let directory = std::env::temp_dir().join(format!("ink-plan-session-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    let file = directory.join("core.json");
    fs::write(&file, m.bytes().unwrap()).unwrap();
    let request = json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":verified_language::physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"borrow_reads":[registry::identity(&syntax::Expr::Var("xs".into())).unwrap()]}}]});
    let typed: planning::Package = serde_json::from_value(request.clone()).unwrap();
    assert_ne!(
        registry::identity(&typed).unwrap(),
        registry::identity(&request).unwrap()
    );
    let mut child = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("plan-session")
        .arg(file)
        .args(["--target", "rust"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .unwrap();
    let mut output = BufReader::new(child.stdout.take().unwrap());
    let mut line = String::new();
    output.read_line(&mut line).unwrap();
    assert_eq!(serde_json::from_str::<Value>(&line).unwrap()["ready"], true);
    writeln!(child.stdin.as_mut().unwrap(), "{}", request).unwrap();
    line.clear();
    output.read_line(&mut line).unwrap();
    let receipt: Value = serde_json::from_str(&line).unwrap();
    assert_eq!(receipt["status"], "checked");
    assert_eq!(
        receipt["request_sha256"],
        registry::identity(&request).unwrap()
    );
    assert_eq!(receipt["plan_sha256"], registry::identity(&typed).unwrap());
    assert_eq!(receipt["capability"]["emittable"], true);
    let mut wrong = request;
    wrong["steps"][0]["package"]["input_core_sha256"] = json!("0".repeat(64));
    writeln!(child.stdin.as_mut().unwrap(), "{}", wrong).unwrap();
    line.clear();
    output.read_line(&mut line).unwrap();
    assert!(serde_json::from_str::<Value>(&line).unwrap()["error"].is_string());
    drop(child.stdin.take());
    assert!(child.wait().unwrap().success());
    fs::remove_dir_all(directory).unwrap();
}
