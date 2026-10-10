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
    let p: Proposal =
        serde_json::from_slice(&fs::read(root.join("proposal.json")).unwrap()).unwrap();
    let a = representation::check(&m, &p.requests[0]).unwrap();
    let b = representation::check(&m, &p.requests[1]).unwrap();
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
let mut session=ink_runtime::representation::Session::new(a.clone(),Native).unwrap();let mut base=Runtime::new(m.program().clone()).unwrap();
for i in 0..36u64{{let (name,args)=match i%3{{0=>("put",serde_json::json!([i%5,i*11])),1=>("erase",serde_json::json!([i%5,i%2==0])),_=>("get",serde_json::json!([i%5]))}};
assert_eq!(session.invoke_json(name,&args).unwrap(),base.invoke_json(name,&args).unwrap().json());assert_eq!(session.invoke_json("zero",&serde_json::json!([])).unwrap(),base.invoke_json("zero",&serde_json::json!([])).unwrap().json());assert_eq!(session.checkpoint().unwrap(),base.checkpoint_portable().unwrap());
if i==8{{session.migrate_direct(b.clone(),&bridge).unwrap();}}if i==17{{session.migrate(a.clone()).unwrap();}}if i==26{{session=ink_runtime::representation::Session::restore(b.clone(),&session.checkpoint().unwrap(),Native).unwrap();}}
}}
}}
"#,proposal=root.join("proposal.json").to_str().unwrap()));
    fs::write(root.join("native.rs"), source).unwrap();
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
    let output = rustc.output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
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
    let (m, _, root) = proposal(SOURCE, "representation-optimised");
    let selected = CheckedModule::from_source(
        parse(&SOURCE.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);")).unwrap(),
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
fn retired_specialised_admission_cannot_select_production_optimisations() {
    if cfg!(feature = "legacy-optimisation-research") {
        return;
    }
    let old = verified_language::syntax::parse(include_str!(
        "../knowledge/research/sum-maintenance.lang"
    ))
    .unwrap();
    assert!(verified_language::aggregate::prove(&old)
        .unwrap_err()
        .contains("retired"));
    let p = verified_language::syntax::parse(SOURCE).unwrap();
    let policy = verified_language::storage::Policy {
        schema: 1,
        semantics: verified_language::storage::SEMANTICS.into(),
        maintenance_id: None,
        roots: std::collections::BTreeMap::from([(
            "Rows".into(),
            verified_language::storage::TableStorage {
                layout: verified_language::storage::Layout::Columns,
                promote_at: Some(3),
            },
        )]),
    };
    assert!(policy.check(&p, None).unwrap_err().contains("retired"));
    assert!(verified_language::state_native::emit_with_storage(&p, None, true, None).is_err());
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
