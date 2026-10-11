use serde_json::{json, Value};
use std::{fs, path::PathBuf, process::Command};
use verified_language::{
    core::CheckedModule,
    representation::{self, Request},
    stateful::Runtime,
    syntax::parse,
};

fn root(name: &str) -> PathBuf {
    // Also runnable from the small, core+Rust-only validation workspace.
    let root = std::env::var_os("INK_STANDALONE_TEST_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    let output = std::env::var_os("INK_STANDALONE_ARTIFACT_ROOT").map(PathBuf::from).unwrap_or_else(||root.join("build")).join(name);
    fs::create_dir_all(&output).unwrap();
    output
}
fn run(source: &str, request: &Request, calls: Vec<(&str, Value)>, name: &str) {
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let checked = representation::check(&module, request).unwrap();
    let mut code = ink_lowering_rust::representation_program::lower(&checked).unwrap();
    for forbidden in [
        "ink_core",
        "ink_runtime",
        "CheckedRepresentation",
        "CheckedDefinition",
        "registry::identity",
        "pub enum Value",
        "Context",
        "logic::Term",
    ] {
        assert!(
            !code.contains(forbidden),
            "generated executable retains {forbidden}"
        );
    }
    let output = root(name);
    let mut source = Runtime::new(module.program().clone()).unwrap();
    let mut oracle = vec![];
    for (action, args) in calls {
        let reply = source.invoke_json(action, &args).unwrap().json();
        oracle.push(json!({"call":action,"args":args,"reply":reply,"snapshot":source.checkpoint_portable().unwrap()}));
    }
    let oracle = serde_json::to_string(&oracle).unwrap();
    code.push_str(&format!("\nconst ORACLE:&str={oracle:?};\n"));
    code.push_str(r#"
fn main(){
 let mut state=State::new().unwrap();
 let calls:Vec<Json>=serde_json::from_str(ORACLE).unwrap();
 for call in &calls{
  let action=call["call"].as_str().unwrap();
  assert_eq!(state.invoke_json(action,&call["args"]).unwrap(),call["reply"]);
  let bytes:Vec<u8>=serde_json::from_value(call["snapshot"].clone()).unwrap();
  assert_eq!(state.checkpoint().unwrap(),bytes);
  state=State::restore(&bytes).unwrap();
  assert_eq!(state.checkpoint().unwrap(),bytes);
 }
 let before=state.checkpoint().unwrap();
 assert_eq!(state.invoke_json("__unknown",&json!([])).unwrap_err(),"unknown action __unknown");
 assert_eq!(state.checkpoint().unwrap(),before);
 let mut broken=before.clone();broken[12]^=1;assert!(State::restore(&broken).is_err());
 let mut broken=before.clone();let end=broken.len()-1;broken[end]^=1;assert!(State::restore(&broken).is_err());
 assert!(State::restore(&before[..before.len()-1]).is_err());
 state.acknowledge_through(u64::MAX,u64::MAX);
 let acknowledged=state.checkpoint().unwrap();let restored=State::restore(&acknowledged).unwrap();assert_eq!(restored.checkpoint().unwrap(),acknowledged);
 let saved=portable::decode(&state.layout,&acknowledged,SnapshotLimits::default()).unwrap();
 let full=portable::encode(&state.layout,&portable::Logical{version:u64::MAX,..saved},SnapshotLimits::default()).unwrap();
 let mut exhausted=State::restore(&full).unwrap();
 for call in &calls{
  if call["reply"]["committed"]==json!(true){
   assert!(exhausted.invoke_json(call["call"].as_str().unwrap(),&call["args"]).is_err());
   assert_eq!(exhausted.checkpoint().unwrap(),full);break;
  }
 }
 // No call needs snapshot encoding; checkpoint remains the explicit boundary.
 state.layout.roots.clear();
 let call=calls.iter().find(|c|c["reply"]["committed"]==json!(true)).unwrap();
 assert!(state.invoke_json(call["call"].as_str().unwrap(),&call["args"]).is_ok());
 assert!(state.checkpoint().is_err());
 println!("standalone exact replies/snapshots, restore, events, source errors and caller-trusted execution passed");
}
"#);
    fs::create_dir_all(output.join("src")).unwrap();
    fs::write(output.join("src/main.rs"), code).unwrap();
    fs::write(output.join("oracle.json"), oracle).unwrap();
    // The emitted application has only ordinary data/codec dependencies.
    fs::write(output.join("Cargo.toml"),"[package]\nname=\"standalone-representation-test\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[dependencies]\nserde_json=\"1\"\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n").unwrap();
    let graph = Command::new("cargo")
        .args(["build", "--offline", "--manifest-path"])
        .arg(output.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(root("standalone-target"))
        .env("CARGO_INCREMENTAL", "0")
        .output()
        .unwrap();
    fs::write(output.join("build.log"), &graph.stderr).unwrap();
    assert!(
        graph.status.success(),
        "{}",
        String::from_utf8_lossy(&graph.stderr)
    );
    let empty = output.join("empty");
    fs::create_dir_all(&empty).unwrap();
    let binary = root("standalone-target").join("debug/standalone-representation-test");
    let result = Command::new(binary)
        .current_dir(empty)
        .env("PATH", "")
        .output()
        .unwrap();
    fs::write(output.join("run.log"), &result.stdout).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}

#[test]
fn compiled_point_candidates_need_no_checker_or_runtime() {
    let source = include_str!("../examples/point-query-delta.ink");
    for (label, request) in [
        (
            "direct",
            include_str!("../knowledge/research/point-delta/direct.json"),
        ),
        (
            "refresh",
            include_str!("../knowledge/research/point-delta/refresh.json"),
        ),
        (
            "delta",
            include_str!("../knowledge/research/point-delta/delta.json"),
        ),
    ] {
        let calls = vec![
            ("zero", json!([])),
            ("replace_zero", json!([9, false])),
            ("erase_zero", json!([true])),
            ("put", json!([0, 7])),
            ("put", json!([17, 42])),
            ("get", json!([17])),
            ("replace_zero", json!([10, false])),
            ("replace_zero", json!([99, true])),
            ("erase_zero", json!([true])),
            ("zero", json!([])),
            ("erase_zero", json!([false])),
            ("zero", json!([])),
            ("put", json!([0, 123])),
            ("zero", json!([])),
        ];
        run(
            source,
            &serde_json::from_str(request).unwrap(),
            calls,
            &format!("standalone-point-{label}"),
        );
    }
}

fn proposal(source: &str, name: &str) -> Request {
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let output = root(name);
    fs::write(
        output.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    let repository = std::env::var_os("INK_STANDALONE_TEST_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")));
    let result = Command::new("python3")
        .arg(repository.join("knowledge/producers/representations.py"))
        .arg(output.join("model.json"))
        .arg("-o")
        .arg(output.join("proposal.json"))
        .current_dir(repository)
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let bundle: Value =
        serde_json::from_slice(&fs::read(output.join("proposal.json")).unwrap()).unwrap();
    serde_json::from_value(bundle["requests"][0].clone()).unwrap()
}
#[test]
fn compiled_lists_events_and_reductions_keep_exact_snapshots() {
    let source = include_str!("../examples/list-representations.ink");
    let request = proposal(source, "standalone-list-proposal");
    run(
        source,
        &request,
        vec![
            ("get", json!([0])),
            ("put", json!([0, [1, 2, 3], false])),
            ("put", json!([0, [9, 10], true])),
            ("get", json!([0])),
            ("total", json!([[2, 3, 5]])),
            ("size", json!([[2, 3, 5]])),
            ("put", json!([19, [], false])),
            ("get", json!([19])),
        ],
        "standalone-list",
    );
}
#[test]
fn compiled_nominal_nested_values_and_multiple_tables() {
    let source = r#"module typed_standalone;
enum Error{Failed,} enum Colour{Red,Blue,}
record Item{colour:Colour,values:List<u64>,maybe:Option<u64>,result:Result<u64,Error>,}
state Z:Table<u64,Item> = Table.empty(); state A:Table<u64,u64> = Table.empty();
event item:Item; event number:u64;
change put(key:u64,value:Item,fail:Bool)->Result<Unit,Error> writes(Z) emits(item){Z.remove(key);Z.insert(key,value);emit item(value);if fail{return Err(Error.Failed);}return Ok(());}
change set_a(key:u64,value:u64)->Result<Unit,Error> writes(A) emits(number){A.remove(key);A.insert(key,value);emit number(value);return Ok(());}
query get(key:u64)->Option<Item> reads(Z){return Z.get(key);}
"#;
    let request = proposal(source, "standalone-nominal-proposal");
    let a = json!({"colour":"Colour.Red","values":[1,2],"maybe":{"Some":3},"result":{"Ok":4}});
    let b = json!({"colour":"Colour.Blue","values":[],"maybe":{"None":null},"result":{"Err":"Error.Failed"}});
    run(
        source,
        &request,
        vec![
            ("get", json!([9])),
            ("set_a", json!([2, 43])),
            ("put", json!([9, a, false])),
            ("get", json!([9])),
            ("put", json!([9, b.clone(), true])),
            ("get", json!([9])),
            ("put", json!([9, b, false])),
            ("get", json!([9])),
        ],
        "standalone-nominal",
    );
}
