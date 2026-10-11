use serde::Deserialize;
use serde_json::json;
use std::{fs, path::PathBuf, process::Command};
use verified_language::runtime::representation::{Reference, Session};
use verified_language::{
    core::CheckedModule,
    registry::Bundle,
    representation::{self, Request},
    stateful::Runtime,
    syntax::parse,
};
const SOURCE: &str = include_str!("../examples/action-transitions.ink");
#[derive(Deserialize)]
struct Proposal {
    requests: Vec<Request>,
    migration: Bridge,
}
#[derive(Deserialize)]
struct Bridge {
    root: String,
    knowledge: Bundle,
}
#[test]
fn published_retention_entries_replay_without_a_producer_or_index() {
    let module = CheckedModule::from_source(
        parse(include_str!(
            "../knowledge/research/source-representations/app.ink"
        ))
        .unwrap(),
    )
    .unwrap();
    let from: Request = serde_json::from_str(include_str!(
        "../knowledge/research/source-representations/retained-direct.json"
    ))
    .unwrap();
    let to: Request = serde_json::from_str(include_str!(
        "../knowledge/research/source-representations/retained-query-cache.json"
    ))
    .unwrap();
    let bridge: Bridge = serde_json::from_str(include_str!(
        "../knowledge/research/source-representations/retained-migration.json"
    ))
    .unwrap();
    let a = representation::check(&module, &from).unwrap();
    let b = representation::check(&module, &to).unwrap();
    let migration =
        representation::check_migration(&a, &b, &bridge.knowledge, &bridge.root).unwrap();
    let mut session = Session::new(a, Reference).unwrap();
    let mut baseline = Runtime::new(module.program().clone()).unwrap();
    for i in 0..24 {
        let (name, args) = match i % 4 {
            0 => ("put", json!([i % 3, i])),
            1 => ("get", json!([i % 3])),
            2 => ("erase", json!([i % 3, i % 8 == 2])),
            _ => ("zero", json!([])),
        };
        assert_eq!(
            session.invoke_json(name, &args).unwrap(),
            baseline.invoke_json(name, &args).unwrap().json()
        );
        assert_eq!(
            session.checkpoint().unwrap(),
            baseline.checkpoint_portable().unwrap()
        );
        if i == 7 {
            session.migrate_direct(b.clone(), &migration).unwrap();
        }
    }
}
fn proposal(source: &str, name: &str) -> (CheckedModule, Proposal, PathBuf) {
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("build")
        .join(name);
    fs::create_dir_all(&root).unwrap();
    fs::write(
        root.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    let out = Command::new("python3")
        .args(["knowledge/producers/representations.py"])
        .arg(root.join("model.json"))
        .arg("-o")
        .arg(root.join("proposal.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let p = serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    (module, p, root)
}
#[test]
fn migrations_preserve_future_actions_rollback_events_and_exact_snapshots() {
    let (m, p, _) = proposal(SOURCE, "source-representations");
    let a = representation::check(&m, &p.requests[0]).unwrap();
    let b = representation::check(&m, &p.requests[1]).unwrap();
    let bridge =
        representation::check_migration(&a, &b, &p.migration.knowledge, &p.migration.root).unwrap();
    let mut rt = Session::new(a.clone(), Reference).unwrap();
    let mut baseline = Runtime::new(m.program().clone()).unwrap();
    for i in 0..45u64 {
        let (name, args) = match i % 3 {
            0 => ("put", json!([i % 7, i * 9])),
            1 => ("erase", json!([i % 7, i % 2 == 0])),
            _ => ("get", json!([i % 7])),
        };
        assert_eq!(
            rt.invoke_json(name, &args).unwrap(),
            baseline.invoke_json(name, &args).unwrap().json()
        );
        assert_eq!(
            rt.checkpoint().unwrap(),
            baseline.checkpoint_portable().unwrap()
        );
        if i == 9 {
            rt.migrate_direct(b.clone(), &bridge).unwrap();
        }
        if i == 20 {
            rt.migrate(a.clone()).unwrap();
        }
        if i == 30 {
            rt = Session::restore(b.clone(), &rt.checkpoint().unwrap(), Reference).unwrap();
        }
    }
    let restored =
        Runtime::restore_portable(m.program().clone(), &rt.checkpoint().unwrap()).unwrap();
    assert_eq!(
        restored.checkpoint_portable().unwrap(),
        rt.checkpoint().unwrap()
    );
}
#[test]
fn original_program_binding_and_missing_proofs_fail_closed() {
    let (m, p, _) = proposal(SOURCE, "representation-adversarial");
    let wrong = CheckedModule::from_source(
        parse(&SOURCE.replace("emit seen(value);", "emit seen(key);")).unwrap(),
    )
    .unwrap();
    assert!(representation::check(&wrong, &p.requests[0]).is_err());
    let mut corrupt = p.requests[0].clone();
    let id = corrupt.representation.clone();
    corrupt.knowledge.objects.get_mut(&id).unwrap().payload["actions"]["erase"]["preservation"] =
        json!([]);
    assert!(representation::check(&m, &corrupt).is_err());
    let mut missing = p.requests[0].clone();
    missing.knowledge.objects.remove(
        &verified_language::action_model::Projection::derive(&m)
            .unwrap()
            .actions["put"]
            .function,
    );
    assert!(representation::check(&m, &missing).is_err());
}
#[test]
fn snapshot_root_order_is_source_independent() {
    let source = SOURCE.replace(
        "state Rows:",
        "state Z:Table<u64,u64> = Table.empty();\nstate Rows:",
    );
    let (m, p, _) = proposal(&source, "representation-root-order");
    let c = representation::check(&m, &p.requests[1]).unwrap();
    let mut base = Runtime::new(m.program().clone()).unwrap();
    base.invoke_json("put", &json!([7, 19])).unwrap();
    let mut s = Session::restore(c, &base.checkpoint_portable().unwrap(), Reference).unwrap();
    assert_eq!(s.checkpoint().unwrap(), base.checkpoint_portable().unwrap());
    assert_eq!(
        s.invoke_json("get", &json!([7])).unwrap(),
        base.invoke_json("get", &json!([7])).unwrap().json()
    );
}
#[test]
fn cached_query_is_database_code_checked_against_unchanged_source() {
    let source = SOURCE.replace(
        "query get(",
        "query zero()->Option<u64> reads(Rows){return Rows.get(0);}\nquery get(",
    );
    let (m, _, root) = proposal(&source, "representation-query-cache");
    let out = Command::new("python3")
        .arg("knowledge/producers/representations.py")
        .arg(root.join("model.json"))
        .args(["--cache-query", "zero", "-o"])
        .arg(root.join("cached.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let p: Proposal = serde_json::from_slice(&fs::read(root.join("cached.json")).unwrap()).unwrap();
    let c = representation::check(&m, &p.requests[1]).unwrap();
    let mut session = Session::new(c, Reference).unwrap();
    let mut base = Runtime::new(m.program().clone()).unwrap();
    for (name, args) in [
        ("zero", json!([])),
        ("put", json!([0, 43])),
        ("zero", json!([])),
        ("erase", json!([0, true])),
        ("zero", json!([])),
        ("erase", json!([0, false])),
        ("zero", json!([])),
    ] {
        assert_eq!(
            session.invoke_json(name, &args).unwrap(),
            base.invoke_json(name, &args).unwrap().json()
        );
        assert_eq!(
            session.checkpoint().unwrap(),
            base.checkpoint_portable().unwrap()
        );
    }
}
#[test]
fn compiled_database_definitions_execute_and_migrate_offline() {
    let actual_source = SOURCE.replace(
        "query get(",
        "query zero()->Option<u64> reads(Rows){return Rows.get(0);}\nquery get(",
    );
    let (m, _, root) = proposal(&actual_source, "representation-native");
    let out = Command::new("python3")
        .arg("knowledge/producers/representations.py")
        .arg(root.join("model.json"))
        .args(["--cache-query", "zero", "-o"])
        .arg(root.join("proposal.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    // A planner may share one pinned closure across multiple selections. The
    // native identity must also include exports, not only mathematical bytes.
    let mut raw: serde_json::Value =
        serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    let shared = raw["migration"]["knowledge"].clone();
    for i in 0..2 {
        raw["requests"][i]["knowledge"] = shared.clone();
    }
    fs::write(
        root.join("proposal.json"),
        serde_json::to_vec(&raw).unwrap(),
    )
    .unwrap();
    let p: Proposal = serde_json::from_value(raw).unwrap();
    let a = representation::check(&m, &p.requests[0]).unwrap();
    let b = representation::check(&m, &p.requests[1]).unwrap();
    assert_eq!(
        a.definition().bundle_sha256(),
        b.definition().bundle_sha256()
    );
    assert_ne!(a.definition().exports(), b.definition().exports());
    let migration =
        representation::check_migration(&a, &b, &p.migration.knowledge, &p.migration.root).unwrap();
    let mut source = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    source
        .push_str(&verified_language::representation_native::lower(&[a, b], &[migration]).unwrap());
    source.push_str(&format!(r#"
fn main(){{
use verified_language::{{representation,core::CheckedModule,syntax::parse,stateful::Runtime}};
let source={actual_source:?};let m=CheckedModule::from_source(parse(source).unwrap()).unwrap();
let p:serde_json::Value=serde_json::from_slice(&std::fs::read({proposal:?}).unwrap()).unwrap();
let a=representation::check(&m,&serde_json::from_value(p["requests"][0].clone()).unwrap()).unwrap();
let b=representation::check(&m,&serde_json::from_value(p["requests"][1].clone()).unwrap()).unwrap();
let bridge=representation::check_migration(&a,&b,&serde_json::from_value(p["migration"]["knowledge"].clone()).unwrap(),p["migration"]["root"].as_str().unwrap()).unwrap();
struct Unfused;
impl ink_runtime::representation::Executor for Unfused{{
fn execute(&self,d:&ink_core::definition::CheckedDefinition,c:&ink_core::logic::Context,f:&str,x:Vec<ink_core::logic::Term>)->ink_core::LangResult<ink_core::logic::Term>{{ink_runtime::representation::Executor::execute(&Native,d,c,f,x)}}
}}
let mut session=ink_runtime::representation::Session::new(a.clone(),Native).unwrap();let mut fallback=ink_runtime::representation::Session::new(a.clone(),Unfused).unwrap();let mut base=Runtime::new(m.program().clone()).unwrap();
for key in 1..=48u64{{let args=serde_json::json!([key,key*2]);let expected=base.invoke_json("put",&args).unwrap().json();assert_eq!(session.invoke_json("put",&args).unwrap(),expected);assert_eq!(fallback.invoke_json("put",&args).unwrap(),expected);}}
for key in [0,1,48,999]{{let args=serde_json::json!([key]);let expected=base.invoke_json("get",&args).unwrap().json();assert_eq!(session.invoke_json("get",&args).unwrap(),expected);assert_eq!(fallback.invoke_json("get",&args).unwrap(),expected);}}
for i in 0..36u64{{let (name,args)=match i%3{{0=>("put",serde_json::json!([i%5,i*11])),1=>("erase",serde_json::json!([i%5,i%2==0])),_=>("get",serde_json::json!([i%5]))}};
let expected=base.invoke_json(name,&args).unwrap().json();assert_eq!(session.invoke_json(name,&args).unwrap(),expected);assert_eq!(fallback.invoke_json(name,&args).unwrap(),expected);
let expected=base.invoke_json("zero",&serde_json::json!([])).unwrap().json();assert_eq!(session.invoke_json("zero",&serde_json::json!([])).unwrap(),expected);assert_eq!(fallback.invoke_json("zero",&serde_json::json!([])).unwrap(),expected);assert_eq!(session.checkpoint().unwrap(),base.checkpoint_portable().unwrap());assert_eq!(fallback.checkpoint().unwrap(),session.checkpoint().unwrap());
if i==8{{session.migrate_direct(b.clone(),&bridge).unwrap();fallback.migrate_direct(b.clone(),&bridge).unwrap();}}if i==17{{session.migrate(a.clone()).unwrap();fallback.migrate(a.clone()).unwrap();}}if i==26{{session=ink_runtime::representation::Session::restore(b.clone(),&session.checkpoint().unwrap(),Native).unwrap();fallback=ink_runtime::representation::Session::restore(b.clone(),&fallback.checkpoint().unwrap(),Unfused).unwrap();}}
}}
}}
"#,proposal=root.join("proposal.json").to_str().unwrap()));
    fs::write(root.join("native.rs"), source).unwrap();
    compile_native(&root, false);
    let output = Command::new(root.join("native"))
        .env("PATH", "")
        .current_dir(std::env::temp_dir())
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
#[test]
fn database_optimises_complete_actions_without_compiler_patterns() {
    let source = include_str!("../examples/representation-cache-maintenance.ink");
    let (m, _, root) = proposal(source, "representation-optimised");
    let selected = CheckedModule::from_source(
        parse(&source.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);")).unwrap(),
    )
    .unwrap();
    fs::write(root.join("selected.json"), selected.bytes().unwrap()).unwrap();
    fs::write(
        root.join("selected-model.json"),
        serde_json::to_vec(
            &verified_language::action_model::Projection::derive(&selected).unwrap(),
        )
        .unwrap(),
    )
    .unwrap();
    let out = Command::new("python3")
        .arg("knowledge/producers/action_replacement.py")
        .arg(root.join("model.json"))
        .arg(root.join("selected-model.json"))
        .arg(root.join("selected.json"))
        .arg("-o")
        .arg(root.join("replacement.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new("python3")
        .arg("knowledge/producers/representations.py")
        .arg(root.join("model.json"))
        .args(["--cache-query", "zero", "--preserve-cache"])
        .arg("--replacement")
        .arg(root.join("replacement.json"))
        .arg("--selected-model")
        .arg(root.join("selected-model.json"))
        .arg("-o")
        .arg(root.join("optimised.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let p: Proposal =
        serde_json::from_slice(&fs::read(root.join("optimised.json")).unwrap()).unwrap();
    let a = representation::check(&m, &p.requests[0]).unwrap();
    let b = representation::check(&m, &p.requests[1]).unwrap();
    let bridge =
        representation::check_migration(&a, &b, &p.migration.knowledge, &p.migration.root).unwrap();
    let mut s = Session::new(a, Reference).unwrap();
    let mut base = Runtime::new(m.program().clone()).unwrap();
    for i in 0..30u64 {
        let (name, args) = if i % 3 == 0 {
            ("put", json!([i % 4, i]))
        } else {
            ("erase", json!([i % 4, i % 2 == 0]))
        };
        assert_eq!(
            s.invoke_json(name, &args).unwrap(),
            base.invoke_json(name, &args).unwrap().json()
        );
        if i == 10 {
            s.migrate_direct(b.clone(), &bridge).unwrap();
        }
        assert_eq!(s.checkpoint().unwrap(), base.checkpoint_portable().unwrap());
    }
}

#[test]
fn well_hashed_false_proof_is_rejected_after_mathematical_typechecking() {
    let (m, p, root) = proposal(SOURCE, "representation-rehashed-proof");
    let mut request = p.requests[0].clone();
    let mut plan: representation::Plan = serde_json::from_value(
        request.knowledge.objects[&request.representation]
            .payload
            .clone(),
    )
    .unwrap();
    plan.snapshot = verified_language::logic::Proof::Refl(verified_language::logic::Term::Var(
        "logical".into(),
    ));
    let entry = plan.entry().unwrap();
    let id = verified_language::registry::identity(&entry).unwrap();
    request.knowledge.objects.remove(&request.representation);
    request.knowledge.objects.insert(id.clone(), entry);
    request.representation = id.clone();
    fs::write(
        root.join("mutated.json"),
        serde_json::to_vec(&request).unwrap(),
    )
    .unwrap();
    let script = r#"import json,sys,tempfile
sys.path.insert(0,'knowledge')
from ink_knowledge import Store
p=json.load(open(sys.argv[1]));objects=p['knowledge']['objects']
with tempfile.TemporaryDirectory() as d:
 p['knowledge']=Store.publish(d,objects.values()).bundle(list(objects))
 print(json.dumps(p))
"#;
    let out = Command::new("python3")
        .args(["-c", script])
        .arg(root.join("mutated.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let request: Request = serde_json::from_slice(&out.stdout).unwrap();
    verified_language::registry::CheckedBundle::check(&request.knowledge).unwrap();
    assert!(representation::check(&m, &request)
        .unwrap_err()
        .contains("snapshot"));
}
#[test]
fn failed_migration_is_atomic_and_exhausted_commits_do_not_publish() {
    use verified_language::{
        definition::CheckedDefinition,
        logic::{Context, Term},
        LangResult,
    };
    struct Failing {
        reject: String,
    }
    impl verified_language::runtime::representation::Executor for Failing {
        fn execute(
            &self,
            d: &CheckedDefinition,
            c: &Context,
            f: &str,
            x: Vec<Term>,
        ) -> LangResult<Term> {
            if f == self.reject {
                return Err("injected target failure".into());
            }
            verified_language::runtime::representation::Executor::execute(&Reference, d, c, f, x)
        }
    }
    let (m, p, _) = proposal(SOURCE, "representation-atomic");
    let a = representation::check(&m, &p.requests[0]).unwrap();
    let b = representation::check(&m, &p.requests[1]).unwrap();
    let mut s = Session::new(
        a.clone(),
        Failing {
            reject: b.plan().encode.clone(),
        },
    )
    .unwrap();
    s.invoke_json("put", &json!([0, 12])).unwrap();
    let previous = s.checkpoint().unwrap();
    assert!(s.migrate(b).is_err());
    assert_eq!(s.representation(), a.request().representation);
    assert_eq!(s.checkpoint().unwrap(), previous);
    let layout = verified_language::snapshot::layout(m.program()).unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &previous, Default::default()).unwrap();
    logical.version = u64::MAX;
    let bytes =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    let mut s = Session::restore(a, &bytes, Reference).unwrap();
    assert!(s.invoke_json("put", &json!([0, 99])).is_err());
    assert_eq!(s.checkpoint().unwrap(), bytes);
    let mut baseline = Runtime::restore_portable(m.program().clone(), &bytes).unwrap();
    assert_eq!(
        s.invoke_json("erase", &json!([0, true])).unwrap(),
        baseline
            .invoke_json("erase", &json!([0, true]))
            .unwrap()
            .json()
    );
    assert_eq!(s.checkpoint().unwrap(), bytes);
}
#[test]
fn frozen_cli_replay_needs_no_live_catalogue_and_checks_before_writing() {
    let (_, p, root) = proposal(SOURCE, "representation-cli");
    fs::write(root.join("app.ink"), SOURCE).unwrap();
    for (i, r) in p.requests.iter().enumerate() {
        fs::write(
            root.join(format!("request-{i}.json")),
            serde_json::to_vec(r).unwrap(),
        )
        .unwrap();
    }
    fs::write(
        root.join("bridge.json"),
        serde_json::to_vec(&json!({"root":p.migration.root,"knowledge":p.migration.knowledge}))
            .unwrap(),
    )
    .unwrap();
    fs::write(root.join("calls.json"),serde_json::to_vec(&json!([{"call":"put","args":[0,19]},{"migrate":root.join("request-1.json")},{"call":"get","args":[0]}])).unwrap()).unwrap();
    let cli = env!("CARGO_BIN_EXE_ink");
    let run = |args: Vec<String>| {
        Command::new(cli)
            .args(args)
            .env("PATH", "")
            .env("INK_DISTRIBUTION", root.join("absent-catalogue"))
            .current_dir(std::env::temp_dir())
            .output()
            .unwrap()
    };
    for args in [
        vec![
            "check-representation".into(),
            root.join("app.ink").display().to_string(),
            root.join("request-0.json").display().to_string(),
        ],
        vec![
            "check-migration".into(),
            root.join("app.ink").display().to_string(),
            root.join("request-0.json").display().to_string(),
            root.join("request-1.json").display().to_string(),
            root.join("bridge.json").display().to_string(),
        ],
        vec![
            "execute-representation".into(),
            root.join("app.ink").display().to_string(),
            root.join("request-0.json").display().to_string(),
            root.join("calls.json").display().to_string(),
            "--snapshot-out".into(),
            root.join("snapshot.bin").display().to_string(),
        ],
    ] {
        let out = run(args);
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
    }
    let protected = root.join("protected.rs");
    fs::write(&protected, "original").unwrap();
    let mut invalid = p.requests[0].clone();
    invalid.input_core_sha256 = "0".repeat(64);
    fs::write(
        root.join("invalid.json"),
        serde_json::to_vec(&invalid).unwrap(),
    )
    .unwrap();
    let out = run(vec![
        "emit-representation".into(),
        root.join("app.ink").display().to_string(),
        root.join("invalid.json").display().to_string(),
        "-o".into(),
        protected.display().to_string(),
    ]);
    assert!(!out.status.success());
    assert_eq!(fs::read_to_string(protected).unwrap(), "original");
}

fn compile_native(root: &std::path::Path, optimised: bool) {
    // Cargo selects one coherent graph, including serde_json's feature and
    // crate identities. Independently choosing the newest rlibs can combine
    // incompatible debug/release or production/research builds.
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // Preserve the invoking test's library profile; `optimised` controls the
    // generated driver separately, as recorded by the manual benchmarks.
    let release = !cfg!(debug_assertions);
    let mut cargo = Command::new(env!("CARGO"));
    cargo
        .args(["build", "--offline", "--lib", "--message-format=json"])
        .arg("--manifest-path")
        .arg(manifest.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(manifest.join("build/representation-fixture-target"))
        .env_remove("CARGO_TARGET_DIR");
    if release {
        cargo.arg("--release");
    }

    let graph = cargo.output().unwrap();
    assert!(
        graph.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&graph.stderr),
        String::from_utf8_lossy(&graph.stdout)
    );
    let artifacts = String::from_utf8(graph.stdout)
        .unwrap()
        .lines()
        .filter_map(|line| serde_json::from_str::<serde_json::Value>(line).ok())
        .filter(|message| message["reason"] == "compiler-artifact")
        .collect::<Vec<_>>();
    let library = |name: &str| {
        let files = artifacts
            .iter()
            .filter(|artifact| artifact["target"]["name"] == name)
            .flat_map(|artifact| artifact["filenames"].as_array().unwrap())
            .filter_map(|file| file.as_str())
            .map(PathBuf::from)
            .filter(|file| {
                file.extension()
                    .is_some_and(|extension| extension == "rlib")
            })
            .collect::<Vec<_>>();
        assert_eq!(files.len(), 1, "one Cargo artifact required for {name}");
        files.into_iter().next().unwrap()
    };
    let language = library("verified_language");
    let json = library("serde_json");
    let deps = [language.parent().unwrap(), json.parent().unwrap()]
        .into_iter()
        .collect::<std::collections::BTreeSet<_>>();
    let mut rustc = Command::new("rustc");
    rustc
        .arg("--edition=2021")
        .arg(root.join("native.rs"))
        .arg("-o")
        .arg(root.join("native"));
    for directory in deps {
        rustc
            .arg("-L")
            .arg(format!("dependency={}", directory.display()));
    }
    for (name, file) in [("verified_language", language), ("serde_json", json)] {
        rustc
            .arg("--extern")
            .arg(format!("{name}={}", file.display()));
    }
    if optimised {
        rustc.arg("-O");
    }
    if release {
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
#[ignore = "manual performance measurement; no timing assertion"]
fn benchmark_representation_execution() {
    let source = include_str!("../examples/representation-migrations.ink");
    let (module, _, root) = proposal(source, "representation-benchmark");
    let mut plans = vec![];
    for (label, extra) in [("rebuild", vec!["--rebuild-queries"]), ("retain", vec![])] {
        let mut command = Command::new("python3");
        command
            .arg("knowledge/producers/representations.py")
            .arg(root.join("model.json"))
            .args(["--cache-query", "zero", "-o"])
            .arg(root.join(format!("{label}.json")))
            .args(extra);
        let output = command.output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let proposal: Proposal =
            serde_json::from_slice(&fs::read(root.join(format!("{label}.json"))).unwrap()).unwrap();
        plans.push(representation::check(&module, &proposal.requests[1]).unwrap());
    }
    let mut generated = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    generated.push_str(&verified_language::representation_native::lower(&plans, &[]).unwrap());
    generated.push_str(&format!(
        "\nconst SOURCE:&str={source:?};\nconst DIRECTORY:&str={:?};\nconst LIBRARY_PROFILE:&str={:?};\n",
        root.to_str().unwrap(),
        if cfg!(debug_assertions) { "debug" } else { "release" }
    ));
    generated.push_str(include_str!("../bench/representations/driver.rs.txt"));
    fs::write(root.join("native.rs"), generated).unwrap();
    compile_native(&root, true);
    let output = Command::new(root.join("native")).output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    fs::write(
        root.join("result.json"),
        serde_json::to_vec_pretty(&report).unwrap(),
    )
    .unwrap();
    println!("{}", serde_json::to_string_pretty(&report).unwrap());
}

fn cache_maintenance_native(name: &str, timed: bool, composed: bool, compact_queries: bool) {
    let source = include_str!("../examples/representation-cache-maintenance.ink");
    let (module, _, root) = proposal(source, name);
    if composed {
        let selected = CheckedModule::from_source(
            parse(&source.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);"))
                .unwrap(),
        )
        .unwrap();
        fs::write(root.join("selected.json"), selected.bytes().unwrap()).unwrap();
        fs::write(
            root.join("selected-model.json"),
            serde_json::to_vec(
                &verified_language::action_model::Projection::derive(&selected).unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        let output = Command::new("python3")
            .arg("knowledge/producers/action_replacement.py")
            .arg(root.join("model.json"))
            .arg(root.join("selected-model.json"))
            .arg(root.join("selected.json"))
            .arg("-o")
            .arg(root.join("replacement.json"))
            .current_dir(env!("CARGO_MANIFEST_DIR"))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
    let mut plans = vec![];
    let before = if compact_queries {
        vec!["--preserve-cache"]
    } else {
        vec![]
    };
    for (label, extra) in [("refresh", before), ("preserve", vec!["--preserve-cache"])] {
        let mut command = Command::new("python3");
        command
            .arg("knowledge/producers/representations.py")
            .arg(root.join("model.json"))
            .args(["--cache-query", "zero", "-o"])
            .arg(root.join(format!("{label}.json")))
            .args(extra)
            .current_dir(env!("CARGO_MANIFEST_DIR"));
        if compact_queries && label == "preserve" {
            command.arg("--compact-queries");
        }
        if composed && (label == "preserve" || compact_queries) {
            command
                .arg("--replacement")
                .arg(root.join("replacement.json"))
                .arg("--selected-model")
                .arg(root.join("selected-model.json"));
        }
        let output = command.output().unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let p: Proposal =
            serde_json::from_slice(&fs::read(root.join(format!("{label}.json"))).unwrap()).unwrap();
        let a = representation::check(&module, &p.requests[0]).unwrap();
        let b = representation::check(&module, &p.requests[1]).unwrap();
        representation::check_migration(&a, &b, &p.migration.knowledge, &p.migration.root).unwrap();
        if compact_queries {
            plans.push(a);
        }
        plans.push(b);
    }
    let mut generated = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    generated.push_str(&verified_language::representation_native::lower(&plans, &[]).unwrap());
    generated.push_str(&format!("\nconst SOURCE:&str={source:?};\nconst DIRECTORY:&str={:?};\nconst TIMED:bool={timed};\nconst COMPOSED:bool={composed};\nconst LIBRARY_PROFILE:&str={:?};\n",root.to_str().unwrap(),if cfg!(debug_assertions) { "debug" } else { "release" }));
    generated.push_str(if compact_queries {
        include_str!("../bench/representations/compact-queries.rs.txt")
    } else {
        include_str!("../bench/representations/cache-maintenance.rs.txt")
    });
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
        let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        fs::write(
            root.join("result.json"),
            serde_json::to_vec_pretty(&report).unwrap(),
        )
        .unwrap();
        println!("{}", serde_json::to_string_pretty(&report).unwrap());
    }
}
#[test]
fn cache_maintenance_preserves_abort_unrelated_commit_and_affected_commit() {
    cache_maintenance_native("cache-maintenance-native", false, false, false);
}
#[test]
#[ignore = "manual performance measurement; no timing assertion"]
fn benchmark_cache_maintenance() {
    cache_maintenance_native("cache-maintenance-benchmark", true, false, false);
}
#[test]
fn cache_dependency_heuristic_cannot_authorise_a_false_update() {
    let source = include_str!("../examples/representation-cache-maintenance.ink");
    let (module, _, root) = proposal(source, "cache-maintenance-adversarial");
    let script = r#"import json,sys
sys.path.insert(0,'knowledge/producers')
from representations import generate
from cache_maintenance import leaves
p=json.load(open(sys.argv[1]));a=p['actions']['put'];rows=1
# Lie to the untrusted authoring heuristic: all put branches leave Rows unchanged.
# Keep the authenticated source objects and source function entirely intact.
for leaf in leaves(a['case']['normal']):
 if leaf['constructor']==0 and leaf['arguments'][1]=={'Bool':True}:
  leaf['arguments'][3]['Construct']['arguments'][rows]={'Var':a['case']['bindings'][rows]}
result=generate(p,sys.argv[2],cache_query='zero',preserve_cache=True)
print(json.dumps(result))
"#;
    let output = Command::new("python3")
        .args(["-c", script])
        .arg(root.join("model.json"))
        .arg(root.join("false-database"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let p: Proposal = serde_json::from_slice(&output.stdout).unwrap();
    verified_language::registry::CheckedBundle::check(&p.requests[1].knowledge).unwrap();
    let error = representation::check(&module, &p.requests[1]).unwrap_err();
    assert!(
        error.contains("definitional computation does not prove equality"),
        "{error}"
    );
}

#[test]
fn published_cache_maintenance_replays_and_migrates_offline() {
    let module = CheckedModule::from_source(
        parse(include_str!(
            "../knowledge/research/cache-maintenance/app.ink"
        ))
        .unwrap(),
    )
    .unwrap();
    for (from_json, to_json, bridge_json) in [
        (
            include_str!("../knowledge/research/cache-maintenance/direct.json"),
            include_str!("../knowledge/research/cache-maintenance/preserve.json"),
            include_str!("../knowledge/research/cache-maintenance/migration.json"),
        ),
        (
            include_str!("../knowledge/research/cache-maintenance/composed-direct.json"),
            include_str!("../knowledge/research/cache-maintenance/composed.json"),
            include_str!("../knowledge/research/cache-maintenance/composed-migration.json"),
        ),
        (
            include_str!("../knowledge/research/compact-queries/direct.json"),
            include_str!("../knowledge/research/compact-queries/cached.json"),
            include_str!("../knowledge/research/compact-queries/migration.json"),
        ),
    ] {
        let from: Request = serde_json::from_str(from_json).unwrap();
        let to: Request = serde_json::from_str(to_json).unwrap();
        let bridge: Bridge = serde_json::from_str(bridge_json).unwrap();
        let a = representation::check(&module, &from).unwrap();
        let b = representation::check(&module, &to).unwrap();
        let migration =
            representation::check_migration(&a, &b, &bridge.knowledge, &bridge.root).unwrap();
        let mut session = Session::new(a, Reference).unwrap();
        let mut baseline = Runtime::new(module.program().clone()).unwrap();
        let calls: serde_json::Value = serde_json::from_str(include_str!(
            "../knowledge/research/cache-maintenance/calls.json"
        ))
        .unwrap();
        for (i, call) in calls.as_array().unwrap().iter().enumerate() {
            if i == 1 {
                session.migrate_direct(b.clone(), &migration).unwrap();
            }
            if i == 4 {
                session =
                    Session::restore(b.clone(), &session.checkpoint().unwrap(), Reference).unwrap();
            }
            let name = call["call"].as_str().unwrap();
            assert_eq!(
                session.invoke_json(name, &call["args"]).unwrap(),
                baseline.invoke_json(name, &call["args"]).unwrap().json()
            );
            assert_eq!(
                session.checkpoint().unwrap(),
                baseline.checkpoint_portable().unwrap()
            );
        }
    }
}

#[test]
fn state_reusing_database_bridges_preserve_native_histories_without_encoding() {
    let source = include_str!("../examples/representation-cache-maintenance.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("build/layout-switch-native");
    fs::create_dir_all(&root).unwrap();
    for (label, bytes) in [
        (
            "previous",
            include_str!("../knowledge/research/compact-queries/previous.json"),
        ),
        (
            "cached",
            include_str!("../knowledge/research/compact-queries/cached.json"),
        ),
        (
            "forward",
            include_str!("../knowledge/research/layout-switch/forward.json"),
        ),
        (
            "backward",
            include_str!("../knowledge/research/layout-switch/backward.json"),
        ),
    ] {
        fs::write(root.join(format!("{label}.json")), bytes).unwrap();
    }
    let load = |label: &str| {
        let request =
            serde_json::from_slice(&fs::read(root.join(format!("{label}.json"))).unwrap()).unwrap();
        representation::check(&module, &request).unwrap()
    };
    let old = load("previous");
    let new = load("cached");
    let mut bridges = vec![];
    for (label, before, after) in [("forward", &old, &new), ("backward", &new, &old)] {
        let frozen: Bridge =
            serde_json::from_slice(&fs::read(root.join(format!("{label}.json"))).unwrap()).unwrap();
        bridges.push(
            representation::check_migration(before, after, &frozen.knowledge, &frozen.root)
                .unwrap(),
        );
        let output = Command::new("python3")
            .arg("knowledge/producers/representation_bridge.py")
            .arg(root.join(if label == "forward" {
                "previous.json"
            } else {
                "cached.json"
            }))
            .arg(root.join(if label == "forward" {
                "cached.json"
            } else {
                "previous.json"
            }))
            .arg("-o")
            .arg(root.join(format!("generated-{label}.json")))
            .current_dir(env!("CARGO_MANIFEST_DIR"))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let generated: Bridge = serde_json::from_slice(
            &fs::read(root.join(format!("generated-{label}.json"))).unwrap(),
        )
        .unwrap();
        assert_eq!(generated.root, frozen.root);
        representation::check_migration(before, after, &generated.knowledge, &generated.root)
            .unwrap();
    }
    let mut generated = String::from(
        "use verified_language as ink_core;\nuse verified_language::runtime as ink_runtime;\n",
    );
    generated
        .push_str(&verified_language::representation_native::lower(&[old, new], &bridges).unwrap());
    generated.push_str(&format!(
        "\nconst SOURCE:&str={source:?};\nconst DIRECTORY:&str={:?};\n",
        root.to_str().unwrap()
    ));
    generated.push_str(include_str!(
        "../bench/representations/layout-switch.rs.txt"
    ));
    fs::write(root.join("native.rs"), generated).unwrap();
    compile_native(&root, false);
    let output = Command::new(root.join("native"))
        .env("PATH", "")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn state_reusing_bridge_rejects_a_rehashed_false_preservation_proof() {
    let module = CheckedModule::from_source(
        parse(include_str!(
            "../examples/representation-cache-maintenance.ink"
        ))
        .unwrap(),
    )
    .unwrap();
    let old: Request = serde_json::from_str(include_str!(
        "../knowledge/research/compact-queries/previous.json"
    ))
    .unwrap();
    let new: Request = serde_json::from_str(include_str!(
        "../knowledge/research/compact-queries/cached.json"
    ))
    .unwrap();
    let before = representation::check(&module, &old).unwrap();
    let after = representation::check(&module, &new).unwrap();
    let script = r#"import json,sys,tempfile
sys.path.insert(0,'knowledge')
sys.path.insert(0,'knowledge/producers')
from ink_knowledge import Store,identity
from representations import refs
p=json.load(open('knowledge/research/layout-switch/forward.json'))
objects=p['knowledge']['objects'];bridge=objects.pop(p['root'])
bridge['payload']['preservation']=[{'Refl':{'Var':'logical'}}]
bridge['dependencies']=sorted(refs(bridge['payload']))
root=identity(bridge);objects[root]=bridge
with tempfile.TemporaryDirectory() as d:
 print(json.dumps(dict(root=root,knowledge=Store.publish(d,objects.values()).bundle([root]))))
"#;
    let output = Command::new("python3")
        .args(["-c", script])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let bridge: Bridge = serde_json::from_slice(&output.stdout).unwrap();
    verified_language::registry::CheckedBundle::check(&bridge.knowledge).unwrap();
    let error = representation::check_migration(&before, &after, &bridge.knowledge, &bridge.root)
        .unwrap_err();
    assert!(
        error.contains("inductive proof proves a different statement"),
        "{error}"
    );
}

#[test]
#[ignore = "manual performance measurement; no timing assertion"]
fn benchmark_composed_cache_maintenance() {
    cache_maintenance_native("composed-cache-maintenance-benchmark", true, true, false);
}

#[test]
fn compact_query_transitions_preserve_native_and_reference_histories() {
    cache_maintenance_native("compact-query-native", false, true, true);
}
#[test]
#[ignore = "manual performance measurement; no timing assertion"]
fn benchmark_compact_query_transitions() {
    cache_maintenance_native("compact-query-benchmark", true, true, true);
}

#[test]
fn compact_query_cannot_substitute_a_false_cached_reply() {
    let source = include_str!("../examples/representation-cache-maintenance.ink");
    let (module, _, root) = proposal(source, "compact-query-adversarial");
    let script = r#"import json,sys
sys.path.insert(0,'knowledge/producers')
from representations import generate
p=json.load(open(sys.argv[1]));a=p['actions']['zero']
sort=p['objects'][a['result']['Data']]['payload']['declaration']['Datatype']['constructors'][0]['fields'][0]
# Lie only in the untrusted source-case metadata. Keep all exact source objects.
a['case']['normal']['Construct']['arguments'][0]={'Construct':{'datatype':sort['Data'],'constructor':0,'arguments':[]}}
print(json.dumps(generate(p,sys.argv[2],cache_query='zero',preserve_cache=True,compact_queries=True)))
"#;
    let output = Command::new("python3")
        .args(["-c", script])
        .arg(root.join("model.json"))
        .arg(root.join("false-database"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let p: Proposal = serde_json::from_slice(&output.stdout).unwrap();
    verified_language::registry::CheckedBundle::check(&p.requests[1].knowledge).unwrap();
    let error = representation::check(&module, &p.requests[1]).unwrap_err();
    assert!(
        error.contains("definitional computation does not prove equality"),
        "{error}"
    );
}
