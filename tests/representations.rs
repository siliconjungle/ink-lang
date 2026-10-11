use serde::Deserialize;
use serde_json::json;
use std::{fs, path::PathBuf, process::Command};
#[path = "support/compiled_representations.rs"]
mod compiled;
use verified_language::{
    core::CheckedModule,
    registry::Bundle,
    representation::{self, Request},
    syntax::parse,
};
const SOURCE: &str = include_str!("../examples/action-transitions.ink");
#[derive(Deserialize)]
struct Proposal {
    requests: Vec<Request>,
    migration: Bridge,
}

#[test]
fn compiled_migrations_preserve_future_actions_rollback_events_and_snapshots() {
    let (module, proposal, _) = proposal(SOURCE, "compiled-migration-proposal");
    let plans = proposal
        .requests
        .iter()
        .map(|r| representation::check(&module, r).unwrap())
        .collect::<Vec<_>>();
    representation::check_migration(
        &plans[0],
        &plans[1],
        &proposal.migration.knowledge,
        &proposal.migration.root,
    )
    .unwrap();
    let mut steps = vec![];
    for i in 0..45u64 {
        let (name, args) = match i % 3 {
            0 => ("put", json!([i % 7, i * 9])),
            1 => ("erase", json!([i % 7, i % 2 == 0])),
            _ => ("get", json!([i % 7])),
        };
        steps.push(json!({"call":name,"args":args}));
        if i == 9 {
            steps.push(json!({"migrate":1}));
        }
        if i == 20 {
            steps.push(json!({"migrate":0}));
        }
    }
    compiled::history(&module, &plans, steps, "migration-history");
}

#[test]
fn published_retention_entries_compile_and_switch_without_live_catalogue() {
    let source = include_str!("../knowledge/research/source-representations/app.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let plans = ["retained-direct", "retained-query-cache"]
        .iter()
        .map(|name| {
            let request = serde_json::from_slice(
                &fs::read(format!(
                    "knowledge/research/source-representations/{name}.json"
                ))
                .unwrap(),
            )
            .unwrap();
            representation::check(&module, &request).unwrap()
        })
        .collect::<Vec<_>>();
    let bridge: Bridge = serde_json::from_slice(
        &fs::read("knowledge/research/source-representations/retained-migration.json").unwrap(),
    )
    .unwrap();
    representation::check_migration(&plans[0], &plans[1], &bridge.knowledge, &bridge.root).unwrap();
    let mut steps = vec![];
    for i in 0..24 {
        let (name, args) = match i % 4 {
            0 => ("put", json!([i % 3, i])),
            1 => ("get", json!([i % 3])),
            2 => ("erase", json!([i % 3, i % 8 == 2])),
            _ => ("zero", json!([])),
        };
        steps.push(json!({"call":name,"args":args}));
        if i == 7 {
            steps.push(json!({"migrate":1}));
        }
    }
    compiled::history(&module, &plans, steps, "published-retention-history");
}

#[test]
fn filtered_aggregate_proofs_and_compiled_migrations_cover_updates_and_rollback() {
    let module = CheckedModule::from_source(
        parse(include_str!("../examples/filtered-aggregate.ink")).unwrap(),
    )
    .unwrap();
    let plans = ["direct", "refresh", "sum-delta", "count-delta"]
        .iter()
        .map(|label| {
            let request = serde_json::from_slice(
                &fs::read(format!(
                    "knowledge/research/filtered-aggregate/{label}.json"
                ))
                .unwrap(),
            )
            .unwrap();
            representation::check(&module, &request).unwrap()
        })
        .collect::<Vec<_>>();
    for (index, label) in [(2, "sum"), (3, "count")] {
        let bridge: Bridge = serde_json::from_slice(
            &fs::read(format!(
                "knowledge/research/filtered-aggregate/{label}-forward.json"
            ))
            .unwrap(),
        )
        .unwrap();
        representation::check_migration(&plans[0], &plans[index], &bridge.knowledge, &bridge.root)
            .unwrap();
    }
    let mut steps = vec![];
    for i in 0..28u64 {
        for (name, args) in [
            (
                "put",
                json!([
                    i % 4,
                    if i % 3 == 0 { u64::MAX } else { i },
                    i % 2 == 0,
                    i % 7 == 0
                ]),
            ),
            ("erase", json!([(i + 1) % 4, i % 5 == 0])),
            ("total_query", json!([])),
            ("count_query", json!([])),
        ] {
            steps.push(json!({"call":name,"args":args}));
        }
        if [3, 9, 17, 23].contains(&i) {
            steps.push(json!({"migrate":if i==3{2}else if i==9{3}else if i==17{0}else{1}}));
        }
    }
    compiled::history(&module, &plans, steps, "filtered-aggregate-history");
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
            .env("INK_DISTRIBUTION", root.join("absent-catalogue"))
            .current_dir(std::env::temp_dir())
            .output()
            .unwrap()
    };
    for target in ["c", "javascript", "c-wasm", "rust-wasm"] {
        let out=run(vec!["execute-representation".into(),
            root.join("app.ink").display().to_string(),
            root.join("request-0.json").display().to_string(),
            root.join("calls.json").display().to_string(),
            "--target".into(),target.into()]);
        assert!(!out.status.success(), "unsupported convenience target must not silently run Rust");
        assert!(String::from_utf8_lossy(&out.stderr).contains("use emit-representation --target"));
    }
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
    let mut baseline = verified_language::stateful::Runtime::new(parse(SOURCE).unwrap()).unwrap();
    baseline.invoke_json("put", &json!([0, 19])).unwrap();
    assert_eq!(
        fs::read(root.join("snapshot.bin")).unwrap(),
        baseline.checkpoint_portable().unwrap()
    );
    fs::write(
        root.join("resume.json"),
        serde_json::to_vec(&json!([{"call":"put","args":[1,42]},{"call":"get","args":[1]}]))
            .unwrap(),
    )
    .unwrap();
    let out = run(vec![
        "execute-representation".into(),
        root.join("app.ink").display().to_string(),
        root.join("request-1.json").display().to_string(),
        root.join("resume.json").display().to_string(),
        "--restore".into(),
        root.join("snapshot.bin").display().to_string(),
        "--snapshot-out".into(),
        root.join("resumed.bin").display().to_string(),
    ]);
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let replies: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(
        replies[0],
        baseline.invoke_json("put", &json!([1, 42])).unwrap().json()
    );
    assert_eq!(
        replies[1],
        baseline.invoke_json("get", &json!([1])).unwrap().json()
    );
    assert_eq!(
        fs::read(root.join("resumed.bin")).unwrap(),
        baseline.checkpoint_portable().unwrap()
    );
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
    let protected = root.join("protected.bin");
    fs::write(&protected, "original").unwrap();
    for script in [
        json!([{"call":"put","args":[null,19]}]),
        json!([{"call":"put","args":[0,19]},{"migrate":root.join("invalid.json")}]),
    ] {
        fs::write(
            root.join("invalid-calls.json"),
            serde_json::to_vec(&script).unwrap(),
        )
        .unwrap();
        let out = run(vec![
            "execute-representation".into(),
            root.join("app.ink").display().to_string(),
            root.join("request-0.json").display().to_string(),
            root.join("invalid-calls.json").display().to_string(),
            "--snapshot-out".into(),
            protected.display().to_string(),
        ]);
        assert!(!out.status.success());
        assert_eq!(fs::read_to_string(&protected).unwrap(), "original");
    }
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
