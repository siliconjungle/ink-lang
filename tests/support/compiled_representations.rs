//! Conformance against ordinary compiled programs. No generic stateful executor.
use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule, representation::CheckedRepresentation, stateful::Runtime,
};

pub fn history(
    module: &CheckedModule,
    plans: &[CheckedRepresentation],
    steps: Vec<Value>,
    name: &str,
) {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("build")
        .join(name);
    fs::create_dir_all(root.join("src")).unwrap();
    let mut baseline = Runtime::new(module.program().clone()).unwrap();
    let mut oracle = vec![];
    for step in steps {
        if step.get("migrate").is_some() {
            oracle.push(step);
            continue;
        }
        let reply = baseline
            .invoke_json(step["call"].as_str().unwrap(), &step["args"])
            .unwrap()
            .json();
        oracle.push(json!({"call":step["call"],"args":step["args"],"reply":reply,"snapshot":baseline.checkpoint_portable().unwrap()}));
    }
    let mut code = verified_language::representations::compiled_bundle(plans).unwrap();
    for forbidden in [
        "ink_runtime",
        "ink_core",
        "CheckedRepresentation",
        "logic::Term",
    ] {
        assert!(!code.contains(forbidden));
    }
    let oracle = serde_json::to_string(&oracle).unwrap();
    code.push_str(&format!(
        "\nconst ORACLE:&str={oracle:?};\nconst COUNT:usize={};\n",
        plans.len()
    ));
    code.push_str(r#"
fn main(){
 let steps:Vec<Json>=serde_json::from_str(ORACLE).unwrap();
 for initial in 0..COUNT{
  let mut current=initial;let mut program=Program::new(current).unwrap();
  for step in &steps{
   if let Some(target)=step["migrate"].as_u64(){
    let before=program.checkpoint().unwrap();program.switch(target as usize).unwrap();
    assert_eq!(program.checkpoint().unwrap(),before);current=target as usize;continue;
   }
   assert_eq!(program.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap(),step["reply"]);
   let expected:Vec<u8>=serde_json::from_value(step["snapshot"].clone()).unwrap();
   assert_eq!(program.checkpoint().unwrap(),expected);
   program=Program::restore(current,&expected).unwrap();
  }
  let before=program.checkpoint().unwrap();
  assert!(program.switch(COUNT).is_err());assert_eq!(program.checkpoint().unwrap(),before);
  let mut corrupt=before.clone();let last=corrupt.len()-1;corrupt[last]^=1;
  assert!(Program::restore(current,&corrupt).is_err());assert_eq!(program.checkpoint().unwrap(),before);
 }
 println!("compiled variants preserve histories, rollback, events, restore and atomic portable migration");
}
"#);
    fs::write(root.join("src/main.rs"), code).unwrap();
    fs::write(root.join("oracle.json"), oracle).unwrap();
    let package = format!("ink-compiled-{name}");
    fs::write(root.join("Cargo.toml"),format!("[package]\nname={package:?}\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[dependencies]\nserde_json={{version=\"1\",features=[\"float_roundtrip\"]}}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n")).unwrap();
    let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/compiled-history-target");
    let output = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(&target)
        .output()
        .unwrap();
    fs::write(root.join("build.log"), &output.stderr).unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new(target.join("debug").join(package))
        .env("PATH", "")
        .current_dir(&root)
        .output()
        .unwrap();
    fs::write(root.join("run.log"), &output.stdout).unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
