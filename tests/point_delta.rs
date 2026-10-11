use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    representation::{self, Request},
    syntax,
};
const SOURCE: &str = include_str!("../examples/point-query-delta.ink");
fn native(timed: bool) {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(if timed {
        "build/point-delta-benchmark"
    } else {
        "build/point-delta-native"
    });
    fs::create_dir_all(&root).unwrap();
    let mut plans = vec![];
    for label in ["direct", "refresh", "delta"] {
        let bytes = fs::read(format!("knowledge/research/point-delta/{label}.json")).unwrap();
        let request: Request = serde_json::from_slice(&bytes).unwrap();
        plans.push(representation::check(&module, &request).unwrap());
        fs::write(root.join(format!("{label}.json")), bytes).unwrap();
    }
    let reverse: serde_json::Value =
        serde_json::from_slice(&fs::read("knowledge/research/point-delta/reverse.json").unwrap())
            .unwrap();
    let reverse_migration = representation::check_migration(
        &plans[1],
        &plans[0],
        &serde_json::from_value(reverse["knowledge"].clone()).unwrap(),
        reverse["root"].as_str().unwrap(),
    )
    .unwrap();
    fs::copy(
        "knowledge/research/point-delta/reverse.json",
        root.join("reverse.json"),
    )
    .unwrap();
    let mut generated = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    let bridge: serde_json::Value =
        serde_json::from_slice(&fs::read("knowledge/research/point-delta/forward.json").unwrap())
            .unwrap();
    let migration = representation::check_migration(
        &plans[1],
        &plans[2],
        &serde_json::from_value(bridge["knowledge"].clone()).unwrap(),
        bridge["root"].as_str().unwrap(),
    )
    .unwrap();
    fs::copy(
        "knowledge/research/point-delta/forward.json",
        root.join("forward.json"),
    )
    .unwrap();
    generated.push_str(
        &verified_language::representation_native::lower(&plans, &[migration, reverse_migration])
            .unwrap(),
    );
    generated.push_str(&format!(
        "\nconst SOURCE:&str={SOURCE:?};\nconst DIRECTORY:&str={:?};\nconst TIMED:bool={timed};\n",
        root.to_str().unwrap()
    ));
    generated.push_str(include_str!("../bench/point-delta/driver.rs.txt"));
    fs::write(root.join("native.rs"), generated).unwrap();
    compile_native(&root, timed);
    let output = Command::new(root.join("native"))
        .env("PATH", "")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    if timed {
        fs::write(root.join("result.json"), &output.stdout).unwrap();
    } else {
        println!("{}", String::from_utf8_lossy(&output.stdout));
    }
}
#[test]
fn point_deltas_preserve_complete_native_histories() {
    native(false);
}
#[test]
#[ignore = "manual instrumented lifecycle/memory benchmark"]
fn benchmark_point_delta_lifecycle() {
    native(true);
}
fn compile_native(root: &std::path::Path, optimised: bool) {
    let deps = std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap()
        .to_owned();
    let mut rustc = Command::new("rustc");
    rustc
        .arg("--edition=2021")
        .arg(root.join("native.rs"))
        .arg("-o")
        .arg(root.join("native"))
        .arg("-L")
        .arg(format!("dependency={}", deps.display()));
    for name in ["verified_language", "serde_json"] {
        let file = fs::read_dir(&deps)
            .unwrap()
            .map(|e| e.unwrap().path())
            .filter(|p| {
                p.file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .starts_with(&format!("lib{name}-"))
                    && p.extension().is_some_and(|e| e == "rlib")
            })
            .max_by_key(|p| fs::metadata(p).unwrap().modified().unwrap())
            .unwrap();
        rustc
            .arg("--extern")
            .arg(format!("{name}={}", file.display()));
    }
    if optimised {
        rustc.arg("-O");
    }
    if !cfg!(debug_assertions) {
        // Cargo release dependencies contain LLVM bitcode. Let rustc consume
        // it instead of passing newer IR to the system Apple linker.
        rustc.args(["-C", "lto=thin", "-C", "embed-bitcode=yes"]);
    }
    let output = rustc.output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn source_lists_and_reductions_preserve_state_events_and_native_transport() {
    let source = include_str!("../examples/list-representations.ink");
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/list-representation-native");
    fs::create_dir_all(&root).unwrap();
    fs::write(
        root.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    let out = Command::new("python3")
        .arg("knowledge/producers/representations.py")
        .arg(root.join("model.json"))
        .arg("-o")
        .arg(root.join("proposal.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let proposal: serde_json::Value =
        serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    let plans: Vec<_> = proposal["requests"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| {
            representation::check(&module, &serde_json::from_value(r.clone()).unwrap()).unwrap()
        })
        .collect();
    for (index, r) in proposal["requests"].as_array().unwrap().iter().enumerate() {
        fs::write(
            root.join(format!("{index}.json")),
            serde_json::to_vec(r).unwrap(),
        )
        .unwrap();
    }
    let mut code = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    code.push_str(&verified_language::representation_native::lower(&plans, &[]).unwrap());
    code.push_str(&format!(
        "\nconst SOURCE:&str={source:?};\nconst DIRECTORY:&str={:?};\n",
        root.to_str().unwrap()
    ));
    code.push_str(r#"
fn main(){
 use serde_json::json;use ink_runtime::representation::{Session,Reference};
 let module=ink_core::core::CheckedModule::from_source(ink_core::syntax::parse(SOURCE).unwrap()).unwrap();
 for index in 0..2{
  let request:ink_core::representation::Request=serde_json::from_slice(&std::fs::read(format!("{DIRECTORY}/{index}.json")).unwrap()).unwrap();let plan=ink_core::representation::check(&module,&request).unwrap();
  let mut native=Session::new(plan.clone(),Native).unwrap();let mut reference=Session::new(plan.clone(),Reference).unwrap();let mut baseline=ink_core::stateful::Runtime::new(module.program().clone()).unwrap();
  for i in 0..18u64{let values=if i%3==0{vec![]}else{vec![i,u64::MAX,1]};
   for (action,args) in [("put",json!([i%3,values,i%4==0])),("get",json!([i%3])),("total",json!([values])),("size",json!([values]))]{
    let expected=baseline.invoke_json(action,&args).unwrap().json();assert_eq!(native.invoke_json(action,&args).unwrap(),expected);assert_eq!(reference.invoke_json(action,&args).unwrap(),expected);assert_eq!(native.checkpoint().unwrap(),baseline.checkpoint_portable().unwrap());assert_eq!(reference.checkpoint().unwrap(),native.checkpoint().unwrap());
   }
  }
  let bytes=native.checkpoint().unwrap();native=Session::restore(plan,&bytes,Native).unwrap();assert_eq!(native.checkpoint().unwrap(),bytes);
 }
}
"#);
    fs::write(root.join("native.rs"), code).unwrap();
    compile_native(&root, false);
    let out = Command::new(root.join("native"))
        .env("PATH", "")
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn measured_selection_rechecks_candidates_and_bridges_before_ranking() {
    let output = Command::new("python3")
        .args([
            "planner/tests/representation_selection_integration.py",
            env!("CARGO_BIN_EXE_ink"),
            "examples/point-query-delta.ink",
            "knowledge/research/point-delta",
        ])
        .env("PYTHONPATH", "planner:knowledge")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
