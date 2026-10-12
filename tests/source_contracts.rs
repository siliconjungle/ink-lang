use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use verified_language::{
    contracts, core::CheckedModule, eval, optimisation, registry, stateful::Runtime, syntax,
};
#[path = "support/parity.rs"]
mod parity;
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf()
}
fn author(file: &str, output: &str) -> (syntax::Program, PathBuf) {
    let dir = root().join("build").join(output);
    fs::create_dir_all(&dir).unwrap();
    let o = Command::new("python3")
        .current_dir(root())
        .env("PYTHONPATH", root().join("knowledge"))
        .args(["-m", "producers.contract_proofs", file])
        .arg(&dir)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink")])
        .output()
        .unwrap();
    assert!(o.status.success(), "{}", String::from_utf8_lossy(&o.stderr));
    let mut p = verified_language::modules::load(root().join(file))
        .unwrap()
        .program;
    contracts::attach(
        &mut p,
        serde_json::from_slice(&fs::read(dir.join("evidence.json")).unwrap()).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    (p, dir)
}
#[test]
fn contracts_invariants_and_boundaries_across_targets() {
    let (p, _) = author("examples/source-contracts.ink", "source-contract-proofs");
    let source = fs::read_to_string(root().join("examples/source-contracts.ink")).unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("read", json!([])),
        ("reset", json!([0])),
        ("reset", json!([1])),
        ("twice", json!([])),
        ("read", json!([])),
    ] {
        let reply = match r.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(e) => json!({"host_error":e}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":r.checkpoint_portable().unwrap()}));
    }
    for (name, args, want) in [
        ("only_zero", json!([0]), json!(0)),
        ("increment", json!([7]), json!(8)),
        ("bags", json!([[1, 2, 1], [1, 1, 2]]), json!(true)),
        ("bags", json!([[1, 1], [1]]), json!(false)),
        (
            "float_bags",
            json!([[0.0],[{"F32Bits":2147483648u32}]]),
            json!(false),
        ),
        ("unique_values", json!([[1, 2, 1]]), json!(false)),
        (
            "ids",
            json!([[{"id":1,"value":2},{"id":2,"value":2}]]),
            json!(true),
        ),
        (
            "unique_keys",
            json!([[{"id":1,"value":2},{"id":1,"value":3}]]),
            json!(false),
        ),
    ] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, values, &mut 1000000).unwrap().json(),
            want
        );
        steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
        expected.push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    let error = eval::call(&p, "only_zero", vec![eval::Value::U64(1)], &mut 10000).unwrap_err();
    steps.push(json!({"pure":"only_zero","args":[1],"cpu_only":true}));
    expected
        .push(json!({"reply":{"host_error":error},"snapshot":r.checkpoint_portable().unwrap()}));

    // A correctly encoded snapshot with a false invariant must still be rejected.
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let valid = r.checkpoint_portable().unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!(1))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance("source-contracts-parity", p, &source, steps, expected);
}
#[test]
fn database_refinement_replays_and_emits_across_targets() {
    let out = root().join("build/contract-candidates");
    let command = Command::new("python3")
        .current_dir(root())
        .env("PYTHONPATH", root().join("knowledge"))
        .args([
            "-m",
            "producers.contract_candidates",
            "examples/contract-optimisations.ink",
        ])
        .arg(&out)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink")])
        .output()
        .unwrap();
    assert!(
        command.status.success(),
        "{}",
        String::from_utf8_lossy(&command.stderr)
    );
    let report: Value =
        serde_json::from_slice(&fs::read(out.join("candidates.json")).unwrap()).unwrap();
    assert_eq!(
        report["candidates"].as_array().unwrap().len(),
        4,
        "{report}"
    );
    let input = CheckedModule::from_bytes(&fs::read(out.join("input-core.json")).unwrap()).unwrap();
    let source = fs::read_to_string(root().join("examples/contract-optimisations.ink")).unwrap();
    for (index, id) in report["candidates"].as_array().unwrap().iter().enumerate() {
        let entry: registry::Entry = serde_json::from_slice(
            &fs::read(out.join(format!("store/objects/{}.json", id.as_str().unwrap()))).unwrap(),
        )
        .unwrap();
        let packet: optimisation::Package =
            serde_json::from_value(entry.payload["package"].clone()).unwrap();
        let selected = optimisation::check(&input, &packet).unwrap();
        let snapshot = Runtime::new_selected(&selected)
            .unwrap()
            .checkpoint_portable()
            .unwrap();
        let steps = vec![
            json!({"pure":"zero","args":[[0,1,18446744073709551615u64]],"cpu_only":true}),
            json!({"pure":"copy","args":[[1,2,4294967295u32]],"expect_gpu":true}),
            json!({"pure":"sorted","args":[[1,2,3]],"cpu_only":true}),
            json!({"pure":"ids_are_unique","args":[[{"id":1,"value":7},{"id":2,"value":7}]],"cpu_only":true}),
        ];
        let expected = [
            json!(0),
            json!([1, 2, 4294967295u32]),
            json!([1, 2, 3]),
            json!(true),
        ]
        .into_iter()
        .map(|value| json!({"reply":{"value":value},"snapshot":snapshot}))
        .collect();
        parity::conformance_selected(
            &format!("contract-refinement-{index}"),
            &selected,
            &source,
            steps,
            expected,
        );
        let mut bad = packet.clone();
        if let Some(r) = &mut bad.contract_refinement {
            let name = r.bodies.keys().next().unwrap().clone();
            r.bodies
                .insert(name, contracts::Body::Pure(syntax::Expr::Num(99)));
        }
        assert!(optimisation::check(&input, &bad).is_err());
    }
}
#[test]
fn total_changes_commit_and_nested_failures_roll_back_across_targets() {
    let source = r#"module total;
 private state N:u64=0;event Changed:u64;
 change set(n:u64)->Option<u64> writes(N) emits(Changed){N=n;emit Changed(n);return None;}
 change twice()->u64 writes(N) emits(Changed){set(1);set(2);return 3;}
 change fail()->Result<Unit,String> writes(N) emits(Changed){set(9);return Err("no");}
 query read()->u64 reads(N){return N;}
 "#;
    let p = syntax::parse(source).unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("set", json!([5])),
        ("read", json!([])),
        ("twice", json!([])),
        ("read", json!([])),
        ("fail", json!([])),
        ("read", json!([])),
    ] {
        let result = r.invoke_json(name, &args).unwrap();
        if name == "set" || name == "twice" {
            assert!(result.committed);
        }
        if name == "fail" {
            assert!(!result.committed);
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":result.json()},"snapshot":r.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance("total-changes-parity", p, source, steps, expected);
}
#[test]
fn imported_contracts_and_private_roots() {
    let dir = root().join("build/imported-contracts");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("lib.ink"),"module helper; private state Secret:u64=4; spec fn same<T>(x:T)->T ensures result==x; implementation id for same{return x;} query read()->u64 reads(Secret){return Secret;}").unwrap();
    let source =
        "module client;import \"lib.ink\" as helper;fn run()->u32{return helper.same<u32>(7);}";
    fs::write(dir.join("main.ink"), source).unwrap();
    let p = verified_language::modules::load(dir.join("main.ink"))
        .unwrap()
        .program;
    CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(
        eval::call(&p, "run", vec![], &mut 1000).unwrap().json(),
        json!(7)
    );
    fs::write(dir.join("main.ink"),"module client;import \"lib.ink\" as helper;query steal()->u64 reads(helper.Secret){return helper.Secret;}").unwrap();
    assert!(verified_language::modules::load(dir.join("main.ink")).is_err());
}
#[test]
fn contract_laws_transfer_without_new_helper_certificates() {
    let (p, dir) = author(
        "examples/contract-optimisations.ink",
        "contract-transfer-proofs",
    );
    let mut evidence: contracts::Evidence =
        serde_json::from_slice(&fs::read(dir.join("evidence.json")).unwrap()).unwrap();
    let source = fs::read_to_string(root().join("examples/contract-optimisations.ink"))
        .unwrap()
        .replace("contract_optimisations", "unfamiliar")
        .replace("zero", "annihilate")
        .replace("scan for", "walk for");
    let mut next = syntax::parse(&(source + "\nfn unrelated(x:Bool)->Bool{return x;}")).unwrap();
    assert_ne!(
        contracts::subject_identity(&p).unwrap(),
        contracts::subject_identity(&next).unwrap()
    );
    evidence.source_sha256 = contracts::subject_identity(&next).unwrap();
    evidence.proofs = evidence
        .proofs
        .into_iter()
        .map(|(key, proof)| {
            (
                key.replace("zero:", "annihilate:")
                    .replace("scan:", "walk:"),
                proof,
            )
        })
        .collect();
    contracts::attach(&mut next, evidence).unwrap();
    CheckedModule::from_source(next).unwrap();
}
#[test]
fn javascript_bound_and_destination_entries_enforce_preconditions() {
    let source="module guard;spec fn copy(xs:List<u32>,n:u32)->List<u32> requires n==0;ensures result==xs;implementation direct for copy{return xs;} spec query unavailable()->u64 requires false;ensures result==0;implementation zero for unavailable{return 0;}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let emitted = verified_language::javascript::lower(&module).unwrap();
    let dir = root().join("build/contract-entrypoints");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), emitted.javascript).unwrap();
    fs::write(dir.join("check.mjs"),"import assert from 'node:assert/strict';import * as p from './program.mjs';const dest=new Uint32Array([7,8,9]);assert.throws(()=>p.callInto('copy',[[1,2],1],dest),/contract precondition failed/);assert.deepEqual([...dest],[7,8,9]);const state=p.createState();assert.throws(()=>state.bind('unavailable')(),/contract precondition failed/);assert.throws(()=>state.bind('unavailable',{resultOnly:true})(),/contract precondition failed/);").unwrap();
    let done = Command::new("node")
        .arg(dir.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        done.status.success(),
        "{}",
        String::from_utf8_lossy(&done.stderr)
    );
}

#[test]
fn unique_state_invariants_and_bag_queries_across_targets() {
    let (p, _) = author("examples/state-contracts.ink", "state-contract-proofs");
    let source = fs::read_to_string(root().join("examples/state-contracts.ink")).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let one = json!({"id":1,"value":7});
    let two = json!({"id":2,"value":9});
    let duplicate = json!({"id":1,"value":99});
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("length_ready", json!([])),
        ("replace_all", json!([[one, two]])),
        ("length_ready", json!([])),
        ("same_bag", json!([[two, one]])),
        ("add_bag", json!([[two], one])),
        ("same_bag", json!([[one, one]])),
        ("replace_all", json!([[one, duplicate]])),
        ("contents", json!([])),
        ("clear", json!([])),
        ("contents", json!([])),
    ] {
        let reply = match runtime.invoke_json(name, &args) {
            Ok(out) => json!({"outcome":out.json()}),
            Err(e) => json!({"host_error":e}),
        };
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    assert!(expected[6]["reply"]["host_error"]
        .as_str()
        .unwrap()
        .contains("precondition"));
    assert_eq!(expected[5]["snapshot"], expected[6]["snapshot"]);
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let valid = runtime.checkpoint_portable().unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!([one, duplicate]))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance("state-contracts-parity", p, &source, steps, expected);
}
