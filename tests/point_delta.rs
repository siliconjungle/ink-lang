use std::{fs, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    representation::{self, Request},
    syntax,
};
const SOURCE: &str = include_str!("../examples/point-query-delta.ink");
fn native(timed: bool) { native_driver(timed, include_str!("../bench/point-delta/driver.rs.txt")); }
fn native_driver(timed: bool, driver: &str) { native_backend(timed, driver, "rust"); }
fn native_backend(timed: bool, driver: &str, backend: &str) {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let directory = if timed { "build/point-delta-benchmark".to_string() } else {format!("build/point-delta-native-{backend}")};
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(directory);
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
    let bridges=[migration,reverse_migration];
    match backend {
        "rust" => generated.push_str(&verified_language::representation_native::lower(&plans,&bridges).unwrap()),
        "c" => {
            let emitted=ink_lowering_c::representation::lower(&plans,&bridges).unwrap();
            for(i,c)in emitted.c.iter().enumerate(){let input=root.join(format!("definition_{i}.c"));let object=root.join(format!("definition_{i}.o"));fs::write(&input,c).unwrap();let out=Command::new("clang").args(["-std=c11","-O2","-c"]).arg(&input).arg("-o").arg(&object).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));}
            generated.push_str(&emitted.adapter);
        }
        "javascript" => {
            let output=root.join("definitions.mjs");fs::write(&output,verified_language::javascript::representation::lower(&plans,&bridges).unwrap()).unwrap();
            let node=Command::new("which").arg("node").output().unwrap();assert!(node.status.success());let node=String::from_utf8(node.stdout).unwrap().trim().to_string();
            let host=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("runtime/js/definition-host.mjs");
            generated.push_str(&format!("pub struct Native;impl ink_runtime::representation::Executor for Native{{fn execute(&self,d:&ink_core::definition::CheckedDefinition,c:&ink_core::logic::Context,f:&str,a:Vec<ink_core::logic::Term>)->ink_core::LangResult<ink_core::logic::Term>{{static PROCESS:std::sync::OnceLock<ink_runtime::definition_process::Executor>=std::sync::OnceLock::new();let executor=PROCESS.get_or_init(||ink_runtime::definition_process::Executor::spawn(std::process::Command::new({node:?}).arg({host:?}).arg({output:?})).unwrap());executor.execute(d,c,f,a)}}}}\n"));
        }
        _ => panic!("backend"),
    }

    generated.push_str(&format!(
        "\nconst SOURCE:&str={SOURCE:?};\nconst DIRECTORY:&str={:?};\nconst TIMED:bool={timed};\n",
        root.to_str().unwrap()
    ));
    generated.push_str(driver);
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
    for entry in fs::read_dir(root).unwrap(){let path=entry.unwrap().path();if path.extension().is_some_and(|x|x=="o"){rustc.arg("-C").arg(format!("link-arg={}",path.display()));}}
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

#[test]
#[ignore = "manual merged-main scaling and stage-allocation benchmark"]
fn benchmark_representation_scaling() {
    native_driver(true, include_str!("../bench/point-delta/scaling.rs.txt"));
}

#[test]
fn point_deltas_execute_literal_c_with_runtime_host() { native_backend(false, include_str!("../bench/point-delta/driver.rs.txt"), "c"); }
#[test]
fn point_deltas_execute_literal_javascript_with_runtime_host() { native_backend(false, include_str!("../bench/point-delta/driver.rs.txt"), "javascript"); }

fn proposal_histories(source:&str,backend:&str,label:&str,script:serde_json::Value){
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/{label}-{backend}"));fs::create_dir_all(&root).unwrap();
    fs::write(root.join("model.json"),serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
    let mut producer=Command::new("python3");producer.arg("knowledge/producers/representations.py").arg(root.join("model.json")).args(["--cache-query","total_query"]);if !label.contains("exact"){producer.arg("--preserve-cache");}let out=producer.arg("-o").arg(root.join("proposal.json")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
    let proposal:serde_json::Value=serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    let plans=proposal["requests"].as_array().unwrap().iter().map(|r|representation::check(&module,&serde_json::from_value(r.clone()).unwrap()).unwrap()).collect::<Vec<_>>();
    let migration=representation::check_migration(&plans[0],&plans[1],&serde_json::from_value(proposal["migration"]["knowledge"].clone()).unwrap(),proposal["migration"]["root"].as_str().unwrap()).unwrap();
    let mut generated=String::from("use verified_language as ink_core;use verified_language::runtime as ink_runtime;\n");
    match backend{
      "rust"=>generated.push_str(&verified_language::representation_native::lower(&plans,&[migration]).unwrap()),
      "c"=>{let emitted=ink_lowering_c::representation::lower(&plans,&[migration]).unwrap();for(i,c)in emitted.c.iter().enumerate(){let input=root.join(format!("definition_{i}.c"));fs::write(&input,c).unwrap();let out=Command::new("clang").args(["-std=c11","-O2","-c"]).arg(input).arg("-o").arg(root.join(format!("definition_{i}.o"))).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));}generated.push_str(&emitted.adapter);},
      "javascript"=>{let path=root.join("definitions.mjs");fs::write(&path,verified_language::javascript::representation::lower(&plans,&[migration]).unwrap()).unwrap();let node=Command::new("which").arg("node").output().unwrap();let node=String::from_utf8(node.stdout).unwrap().trim().to_string();let host=Path::new(env!("CARGO_MANIFEST_DIR")).join("runtime/js/definition-host.mjs");generated.push_str(&format!("pub struct Native;impl ink_runtime::representation::Executor for Native{{fn execute(&self,d:&ink_core::definition::CheckedDefinition,c:&ink_core::logic::Context,f:&str,a:Vec<ink_core::logic::Term>)->ink_core::LangResult<ink_core::logic::Term>{{static P:std::sync::OnceLock<ink_runtime::definition_process::Executor>=std::sync::OnceLock::new();P.get_or_init(||ink_runtime::definition_process::Executor::spawn(std::process::Command::new({node:?}).arg({host:?}).arg({path:?})).unwrap()).execute(d,c,f,a)}}}}\n"));},_=>panic!("backend")
    }
    fs::write(root.join("script.json"),serde_json::to_vec(&script).unwrap()).unwrap();
    generated.push_str(&format!("const SOURCE:&str={source:?};const ROOT:&str={:?};",root.to_str().unwrap()));
    generated.push_str(r#"
fn main(){use ink_runtime::representation::{Session,Reference};let module=ink_core::core::CheckedModule::from_source(ink_core::syntax::parse(SOURCE).unwrap()).unwrap();let proposal:serde_json::Value=serde_json::from_slice(&std::fs::read(format!("{ROOT}/proposal.json")).unwrap()).unwrap();let plans=proposal["requests"].as_array().unwrap().iter().map(|r|ink_core::representation::check(&module,&serde_json::from_value(r.clone()).unwrap()).unwrap()).collect::<Vec<_>>();let bridge=ink_core::representation::check_migration(&plans[0],&plans[1],&serde_json::from_value(proposal["migration"]["knowledge"].clone()).unwrap(),proposal["migration"]["root"].as_str().unwrap()).unwrap();let script:serde_json::Value=serde_json::from_slice(&std::fs::read(format!("{ROOT}/script.json")).unwrap()).unwrap();for start in 0..2 {let mut native=Session::new(plans[start].clone(),Native).unwrap();let mut reference=Session::new(plans[start].clone(),Reference).unwrap();let mut baseline=ink_core::stateful::Runtime::new(module.program().clone()).unwrap();for(i,s)in script.as_array().unwrap().iter().enumerate(){let action=s["call"].as_str().unwrap();let expected=baseline.invoke_json(action,&s["args"]).unwrap().json();assert_eq!(native.invoke_json(action,&s["args"]).unwrap(),expected,"native {action} step {i}");assert_eq!(reference.invoke_json(action,&s["args"]).unwrap(),expected,"reference {action} step {i}");let bytes=baseline.checkpoint_portable().unwrap();assert_eq!(native.checkpoint().unwrap(),bytes);assert_eq!(reference.checkpoint().unwrap(),bytes);if i==3&&start==0{native.migrate_direct(plans[1].clone(),&bridge).unwrap();reference.migrate_direct(plans[1].clone(),&bridge).unwrap();}if i==9{native.migrate(plans[0].clone()).unwrap();reference.migrate(plans[0].clone()).unwrap();}}}}
"#);
    fs::write(root.join("native.rs"),generated).unwrap();compile_native(&root,false);let out=Command::new(root.join("native")).env("PATH","").output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
}
#[test]
fn exact_numbers_keeps_and_arithmetic_match_all_host_backends(){
    use serde_json::json;
    let ints=["0","1","-1","18446744073709551617","-987654321987654321987654321","87654321987654321987654321"];
    let mut script=vec![];
    for (i,n)in ints.iter().enumerate(){script.push(json!({"call":"put","args":[i,{"Int":n},i%2==0,false]}));script.push(json!({"call":"put","args":[i,{"Int":"999"},true,true]}));for action in ["total_query","count_query"]{script.push(json!({"call":action,"args":[]}));}for action in ["addition","subtraction","multiplication","less"]{script.push(json!({"call":action,"args":[{"Int":n},{"Int":ints[(i+1)%ints.len()]}]}));}script.push(json!({"call":"negative","args":[{"Int":n}]}));}
    for backend in ["rust","c","javascript"]{proposal_histories(include_str!("../examples/exact-representation.ink"),backend,"exact-representation",json!(script));}
}
#[test]
fn filtered_keeps_match_all_host_backends(){
    use serde_json::json;let mut script=vec![];
    for i in 0..24u64{script.push(json!({"call":"put","args":[i%4,if i%3==0{u64::MAX}else{i},i%2==0,i%7==0]}));script.push(json!({"call":"erase","args":[(i+1)%4,i%5==0]}));for action in ["total_query","count_query"]{script.push(json!({"call":action,"args":[]}));}}
    for backend in ["rust","c","javascript"]{proposal_histories(include_str!("../examples/filtered-aggregate.ink"),backend,"filtered-representation",json!(script));}
}

fn aggregate_driver(timed:bool,backend:&str){
 let source=include_str!("../examples/filtered-aggregate.ink");let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();let directory=Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/filtered-aggregate");let root=Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/aggregate-{backend}"));fs::create_dir_all(&root).unwrap();
 let plans=["direct","refresh","sum-delta","count-delta"].iter().map(|label|{let r=serde_json::from_slice(&fs::read(directory.join(format!("{label}.json"))).unwrap()).unwrap();representation::check(&module,&r).unwrap()}).collect::<Vec<_>>();let bridges=[(2,"sum"),(3,"count")].iter().map(|(i,label)|{let v:serde_json::Value=serde_json::from_slice(&fs::read(directory.join(format!("{label}-forward.json"))).unwrap()).unwrap();representation::check_migration(&plans[0],&plans[*i],&serde_json::from_value(v["knowledge"].clone()).unwrap(),v["root"].as_str().unwrap()).unwrap()}).collect::<Vec<_>>();
 let mut code=String::from("use verified_language as ink_core;use verified_language::runtime as ink_runtime;\n");match backend{
 "rust"=>code.push_str(&verified_language::representation_native::lower(&plans,&bridges).unwrap()),
 "c"=>{let emission=ink_lowering_c::representation::lower(&plans,&bridges).unwrap();for(i,c)in emission.c.iter().enumerate(){let input=root.join(format!("definition_{i}.c"));fs::write(&input,c).unwrap();let output=Command::new("clang").args(["-std=c11","-O2","-c"]).arg(input).arg("-o").arg(root.join(format!("definition_{i}.o"))).output().unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));}code.push_str(&emission.adapter)},
 "javascript"=>{let path=root.join("definitions.mjs");fs::write(&path,verified_language::javascript::representation::lower(&plans,&bridges).unwrap()).unwrap();let node=Command::new("which").arg("node").output().unwrap();let node=String::from_utf8(node.stdout).unwrap().trim().to_string();let host=Path::new(env!("CARGO_MANIFEST_DIR")).join("runtime/js/definition-host.mjs");code.push_str(&format!("pub struct Native;impl ink_runtime::representation::Executor for Native{{fn execute(&self,d:&ink_core::definition::CheckedDefinition,c:&ink_core::logic::Context,f:&str,a:Vec<ink_core::logic::Term>)->ink_core::LangResult<ink_core::logic::Term>{{static P:std::sync::OnceLock<ink_runtime::definition_process::Executor>=std::sync::OnceLock::new();P.get_or_init(||ink_runtime::definition_process::Executor::spawn(std::process::Command::new({node:?}).arg({host:?}).arg({path:?})).unwrap()).execute(d,c,f,a)}}}}\n"));},_=>panic!("backend")}
 code.push_str(&format!("const SOURCE:&str={source:?};const DIRECTORY:&str={:?};const TIMED:bool={timed};",directory.to_str().unwrap()));code.push_str(include_str!("../bench/point-delta/aggregate.rs.txt"));fs::write(root.join("native.rs"),code).unwrap();compile_native(&root,timed);let result=Command::new(root.join("native")).env("PATH","").output().unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));if timed{fs::write(root.join("result.json"),result.stdout).unwrap();}
}
#[test]
fn aggregate_deltas_prove_and_execute_histories(){for backend in ["rust","c","javascript"]{aggregate_driver(false,backend);}}
#[test]
#[ignore="manual full aggregate scaling benchmark"]
fn benchmark_aggregate_scaling(){aggregate_driver(true,"rust");}
