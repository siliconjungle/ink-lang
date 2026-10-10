use serde_json::{json, Value as Json};
use std::{fs, path::Path, process::Command};
use verified_language::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Sort, Term},
    optimisation::{self, Package},
    stateful::{Runtime, Value},
    syntax::{parse, Type},
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/action-transitions.ink");
fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(parse(source).unwrap()).unwrap()
}
fn c(id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor,
        arguments,
    }
}
fn call(id: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments,
    }
}
fn data(s: &Sort) -> &str {
    if let Sort::Data(i) = s {
        i
    } else {
        panic!("datatype")
    }
}
fn encode(m: &Projection, p: &verified_language::syntax::Program, t: &Type, v: &Value) -> Term {
    let id = || data(&m.types[&serde_json::to_string(t).unwrap()]);
    match (t, v) {
        (Type::U64, Value::U64(x)) => Term::U64(*x),
        (Type::Bool, Value::Bool(x)) => Term::Bool(*x),
        (Type::Unit, Value::Unit) => c(id(), 0, vec![]),
        (Type::Named(n), Value::Enum(_, x)) => c(
            id(),
            p.enums[n].iter().position(|v| v == x).unwrap(),
            vec![],
        ),
        (Type::Named(n), Value::Record(_, xs)) => c(
            id(),
            0,
            p.records[n]
                .iter()
                .map(|(f, t)| encode(m, p, t, &xs[f]))
                .collect(),
        ),
        (Type::Option(_), Value::Option(None)) => c(id(), 0, vec![]),
        (Type::Option(t), Value::Option(Some(x))) => c(id(), 1, vec![encode(m, p, t, x)]),
        (Type::Result(a, e), Value::Result(ok, x)) => c(
            id(),
            usize::from(!ok),
            vec![encode(m, p, if *ok { a } else { e }, x)],
        ),
        _ => panic!("codec subset {t:?} {v:?}"),
    }
}
fn state(m: &Projection, p: &verified_language::syntax::Program, checkpoint: &[u8]) -> Term {
    let snapshot: Json = serde_json::from_slice(checkpoint).unwrap();
    c(
        &m.state,
        0,
        p.states
            .iter()
            .zip(&m.tables)
            .map(|(root, t)| {
                let rows: Vec<(Value, Value)> = serde_json::from_value(
                    snapshot["tables"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .find(|x| x[0] == root.name)
                        .unwrap()[1]
                        .clone(),
                )
                .unwrap();
                rows.into_iter()
                    .rev()
                    .fold(c(&t.datatype, 0, vec![]), |tail, (k, row)| {
                        let Value::U64(k) = k else { panic!("word key") };
                        c(
                            &t.datatype,
                            1,
                            vec![Term::U64(k), encode(m, p, &t.value_type, &row), tail],
                        )
                    })
            })
            .collect(),
    )
}
fn package(original: &CheckedModule, selected: &CheckedModule, name: &str) -> Package {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/{name}"));
    fs::create_dir_all(&root).unwrap();
    for (n, x) in [
        ("original-model", Projection::derive(original).unwrap()),
        ("selected-model", Projection::derive(selected).unwrap()),
    ] {
        fs::write(
            root.join(format!("{n}.json")),
            serde_json::to_vec(&x).unwrap(),
        )
        .unwrap();
    }
    fs::write(root.join("selected-core.json"), selected.bytes().unwrap()).unwrap();
    let out = Command::new("python3")
        .arg("knowledge/producers/action_replacement.py")
        .arg(root.join("original-model.json"))
        .arg(root.join("selected-model.json"))
        .arg(root.join("selected-core.json"))
        .args(["-o"])
        .arg(root.join("selection.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    serde_json::from_slice(&fs::read(root.join("selection.json")).unwrap()).unwrap()
}
#[test]
fn complete_projected_transitions_match_reference_state_replies_events_and_rollback() {
    let m = module(SOURCE);
    let projection = Projection::derive(&m).unwrap();
    let context = projection.context().unwrap();
    let mut rt = Runtime::new(m.program().clone()).unwrap();
    let mut seed = 42u64;
    for i in 0..120 {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let key = if i % 17 == 0 { u64::MAX } else { seed % 11 };
        let (name, args) = match i % 3 {
            0 => ("put", vec![Value::U64(key), Value::U64(seed)]),
            1 => ("erase", vec![Value::U64(key), Value::Bool(i % 2 == 0)]),
            _ => ("get", vec![Value::U64(key)]),
        };
        let a = m.program().actions.iter().find(|a| a.name == name).unwrap();
        let previous = rt.checkpoint().unwrap();
        let mut terms = vec![
            state(&projection, m.program(), &previous),
            Term::U64(rt.version()),
        ];
        terms.extend(
            a.params
                .iter()
                .zip(&args)
                .map(|((_, t), v)| encode(&projection, m.program(), t, v)),
        );
        let actual = context
            .evaluate(&[], &call(&projection.actions[name].function, terms))
            .unwrap();
        let outcome = rt.invoke(name, args).unwrap();
        let event_type = projection.objects[&projection.events].payload["declaration"]["Datatype"]
            ["constructors"][1]["fields"][0]["Data"]
            .as_str()
            .unwrap();
        let events =
            outcome
                .events
                .iter()
                .rev()
                .fold(c(&projection.events, 0, vec![]), |tail, e| {
                    c(
                        &projection.events,
                        1,
                        vec![
                            c(
                                event_type,
                                0,
                                vec![Term::U64(if let Value::U64(x) = e.value {
                                    x
                                } else {
                                    panic!()
                                })],
                            ),
                            tail,
                        ],
                    )
                });
        let expected = c(
            data(&projection.actions[name].result),
            0,
            vec![
                encode(&projection, m.program(), &a.result, &outcome.result),
                Term::Bool(outcome.committed),
                Term::U64(outcome.version),
                state(&projection, m.program(), &rt.checkpoint().unwrap()),
                events,
            ],
        );
        assert_eq!(actual, expected, "transition {i} {name}");
    }
    // Version exhaustion is a host error with unchanged roots and staged events
    // discarded, even though the body has tentatively changed the table.
    let mut checkpoint: Json = serde_json::from_slice(&rt.checkpoint().unwrap()).unwrap();
    checkpoint["version"] = json!(u64::MAX);
    let bytes = serde_json::to_vec(&checkpoint).unwrap();
    let mut exhausted = Runtime::restore(m.program().clone(), &bytes).unwrap();
    let initial = state(&projection, m.program(), &bytes);
    let actual = context
        .evaluate(
            &[],
            &call(
                &projection.actions["put"].function,
                vec![
                    initial.clone(),
                    Term::U64(u64::MAX),
                    Term::U64(2),
                    Term::U64(4),
                ],
            ),
        )
        .unwrap();
    assert_eq!(
        actual,
        c(
            data(&projection.actions["put"].result),
            1,
            vec![Term::U64(1), Term::U64(u64::MAX), initial]
        )
    );
    assert!(exhausted
        .invoke_json("put", &json!([2, 4]))
        .unwrap_err()
        .contains("commit sequence exhausted"));
    assert_eq!(
        checkpoint,
        serde_json::from_slice::<Json>(&exhausted.checkpoint().unwrap()).unwrap()
    );
}
#[test]
fn database_remove_law_admits_a_complete_action_and_rejects_changed_observations() {
    let m = module(SOURCE);
    let z = module(&SOURCE.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);"));
    let p = package(&m, &z, "action-transitions-admission");
    let checked = optimisation::check(&m, &p).unwrap();
    assert_eq!(checked.module().bytes().unwrap(), z.bytes().unwrap());
    let mut missing = p.clone();
    missing
        .action_replacement
        .as_mut()
        .unwrap()
        .proofs
        .remove("get");
    assert!(optimisation::check(&m, &missing)
        .unwrap_err()
        .contains("every action proof"));
    for changed in [
        SOURCE.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key+1);"),
        SOURCE.replace("emit seen(key);", "emit seen(key+1);"),
        SOURCE.replace("return Err(Error.Failed);", "return Ok(());"),
        SOURCE.replace("Table<u64,u64>", "Table<u64,Bool>"),
    ] {
        if let Ok(z) = parse(&changed).and_then(CheckedModule::from_source) {
            let mut wrong = p.clone();
            wrong.action_replacement.as_mut().unwrap().selected =
                serde_json::from_slice(&z.bytes().unwrap()).unwrap();
            assert!(optimisation::check(&m, &wrong).is_err());
        }
    }
    let mut wrong_source = p.clone();
    wrong_source.input_core_sha256 = z.identity().unwrap();
    assert!(optimisation::check(&m, &wrong_source).is_err());
    let mut original = Runtime::new(m.program().clone()).unwrap();
    let mut selected = Runtime::new_selected(&checked).unwrap();
    for i in 0..70 {
        let (name, args) = match i % 4 {
            0 => ("put", json!([i % 9, i])),
            1 => ("erase", json!([i % 9, false])),
            2 => ("erase", json!([i % 9, true])),
            _ => ("get", json!([i % 9])),
        };
        assert_eq!(
            original.invoke_json(name, &args).unwrap().json(),
            selected.invoke_json(name, &args).unwrap().json()
        );
        assert_eq!(
            original.checkpoint().unwrap(),
            selected.checkpoint().unwrap()
        );
        let portable = original.checkpoint_portable().unwrap();
        assert_eq!(portable, selected.checkpoint_portable().unwrap());
        selected = Runtime::restore_portable_selected(&checked, &portable).unwrap();
        original = Runtime::restore_portable(
            m.program().clone(),
            &selected.checkpoint_portable().unwrap(),
        )
        .unwrap();
    }
    // Altering authenticated mathematical bytes never grants source binding.
    let mut malformed = p.clone();
    let first = malformed.knowledge.objects.values_mut().next().unwrap();
    first.payload = json!({"declaration":{"Datatype":{"constructors":[]}}});
    assert!(optimisation::check(&m, &malformed).is_err());
}
#[test]
fn unsupported_effectful_expressions_and_domain_types_fail_closed() {
    for s in [
        SOURCE.replace("Rows.remove(key); Rows.remove(key);", "erase(key,false);"),
        SOURCE.replace("return Ok(());", "return Ok(checked_add(1,2)?);"),
        SOURCE
            .replace("Table<u64,u64>", "Table<u64,u32>")
            .replace("value:u64", "value:u32"),
        SOURCE.replace(
            "Rows.remove(key); Rows.remove(key);",
            "let old=Rows.remove(key);",
        ),
    ] {
        if let Ok(m) = parse(&s).and_then(CheckedModule::from_source) {
            assert!(Projection::derive(&m).is_err());
        }
    }
}
#[test]
fn checked_whole_actions_execute_through_compiled_backends_and_restore_original_snapshots() {
    let m = module(SOURCE);
    let z = module(&SOURCE.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);"));
    let p = package(&m, &z, "action-transitions-native-evidence");
    let checked = optimisation::check(&m, &p).unwrap();
    let mut rt = Runtime::new(m.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("put", json!([0, 10])),
        ("put", json!([u64::MAX, 20])),
        ("put", json!([0, 30])),
        ("erase", json!([0, true])),
        ("get", json!([0])),
        ("erase", json!([0, false])),
        ("get", json!([0])),
        ("erase", json!([0, false])),
        ("get", json!([u64::MAX])),
        ("put", json!([1, 40])),
    ] {
        let outcome = rt.invoke_json(name, &args).unwrap();
        let checkpoint = rt.checkpoint_portable().unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":checkpoint}));
        if name == "get" && args == json!([0]) {
            steps.push(json!({"restore":checkpoint}));
        }
    }
    parity::conformance_selected(
        "action-transitions-native",
        &checked,
        SOURCE,
        steps,
        expected,
    );
}
#[test]
fn one_parametric_database_law_composes_across_distinct_table_row_sorts() {
    let source = r#"module two_tables; enum Error{Failed,} state Words:Table<u64,u64> = Table.empty(); state Flags:Table<u64,Bool> = Table.empty();
 change trim(k:u64)->Result<Unit,Error> writes(Words,Flags){Words.remove(k);Words.remove(k);Flags.remove(k);Flags.remove(k);return Ok(());}
 query flag(k:u64)->Option<Bool> reads(Flags){return Flags.get(k);}"#;
    let m = module(source);
    let z = module(
        &source
            .replace("Words.remove(k);Words.remove(k);", "Words.remove(k);")
            .replace("Flags.remove(k);Flags.remove(k);", "Flags.remove(k);"),
    );
    let p = package(&m, &z, "action-transitions-composition");
    let selected = optimisation::check(&m, &p).unwrap();
    assert_eq!(selected.evidence().applied_laws.len(), 1);
    let mut original = Runtime::new(m.program().clone()).unwrap();
    let mut compiled = Runtime::new_selected(&selected).unwrap();
    for key in [0, 1, u64::MAX] {
        assert_eq!(
            original.invoke_json("trim", &json!([key])).unwrap().json(),
            compiled.invoke_json("trim", &json!([key])).unwrap().json()
        );
        assert_eq!(
            original.checkpoint_portable().unwrap(),
            compiled.checkpoint_portable().unwrap()
        );
    }
    let proof = &p.action_replacement.as_ref().unwrap().proofs["trim"];
    let mut text = serde_json::to_value(proof).unwrap();
    fn remove_interpretation(value: &mut Json) -> bool {
        match value {
            Json::Object(xs) => {
                if let Some(instance) = xs.get_mut("Instance") {
                    instance["definitions"] = json!({});
                    return true;
                }
                xs.values_mut().any(remove_interpretation)
            }
            Json::Array(xs) => xs.iter_mut().any(remove_interpretation),
            _ => false,
        }
    }
    assert!(remove_interpretation(&mut text));
    let mut wrong = p.clone();
    wrong
        .action_replacement
        .as_mut()
        .unwrap()
        .proofs
        .insert("trim".into(), serde_json::from_value(text).unwrap());
    assert!(optimisation::check(&m, &wrong).is_err());
}
#[test]
fn authentic_source_definitions_do_not_make_a_wrong_replacement_proof_valid() {
    let original = module(SOURCE);
    let selected =
        module(&SOURCE.replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);"));
    let mut p = package(&original, &selected, "action-transitions-false-equation");
    let wrong = module(
        &SOURCE
            .replace("Rows.remove(key); Rows.remove(key);", "Rows.remove(key);")
            .replace("emit seen(key);", "emit seen(key+1);"),
    );
    let projection = Projection::derive(&wrong).unwrap();
    let root =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("build/action-transitions-false-equation");
    fs::write(
        root.join("wrong-model.json"),
        serde_json::to_vec(&projection).unwrap(),
    )
    .unwrap();
    let script = r#"import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'knowledge')
from ink_knowledge import Store
p=json.loads(Path(sys.argv[1]).read_text());m=json.loads(Path(sys.argv[2]).read_text())
objects={**p['knowledge']['objects'],**m['objects']};roots=sorted(set(p['knowledge']['roots'])|{a['function'] for a in m['actions'].values()})
with tempfile.TemporaryDirectory() as d:print(json.dumps(Store.publish(d,objects.values()).bundle(roots)))
"#;
    let out = Command::new("python3")
        .args(["-c", script])
        .arg(root.join("selection.json"))
        .arg(root.join("wrong-model.json"))
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    p.knowledge = serde_json::from_slice(&out.stdout).unwrap();
    p.action_replacement.as_mut().unwrap().selected =
        serde_json::from_slice(&wrong.bytes().unwrap()).unwrap();
    verified_language::registry::CheckedBundle::check(&p.knowledge)
        .unwrap()
        .first_order_context()
        .unwrap();
    let error = optimisation::check(&original, &p).unwrap_err();
    assert!(error.contains("different statement"), "{error}");
}
#[test]
fn frozen_whole_action_replay_and_inspection_need_no_producer_or_live_database(){
 let m=module(SOURCE);let z=module(&SOURCE.replace("Rows.remove(key); Rows.remove(key);","Rows.remove(key);"));let p=package(&m,&z,"action-transitions-offline");let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/action-transitions-offline");fs::write(root.join("source.ink"),SOURCE).unwrap();fs::write(root.join("original-core.json"),m.bytes().unwrap()).unwrap();
 let cli=env!("CARGO_BIN_EXE_ink");let run=|args:Vec<String>|Command::new(cli).args(args).env("PATH","").env("INK_DISTRIBUTION",root.join("missing-assets")).current_dir(std::env::temp_dir()).output().unwrap();
 let output=run(vec!["check-selection".into(),root.join("original-core.json").display().to_string(),root.join("selection.json").display().to_string()]);assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
 let output=run(vec!["explain".into(),root.join("source.ink").display().to_string(),"--selection".into(),root.join("selection.json").display().to_string()]);assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));let plan:Json=serde_json::from_slice(&output.stdout).unwrap();assert_eq!(plan["whole_action_selection"]["actions"],json!(["erase","get","put"]));assert_eq!(plan["selection"]["applied_laws"].as_array().unwrap().len(),1);assert_eq!(plan["selected_core_sha256"],z.identity().unwrap());
 let protected=root.join("protected-core.json");fs::write(&protected,b"keep original").unwrap();let mut invalid=p;invalid.action_replacement.as_mut().unwrap().proofs.remove("erase");fs::write(root.join("invalid-selection.json"),serde_json::to_vec(&invalid).unwrap()).unwrap();
 let output=run(vec!["emit-core".into(),root.join("source.ink").display().to_string(),"--selection".into(),root.join("invalid-selection.json").display().to_string(),"-o".into(),protected.display().to_string()]);assert!(!output.status.success());assert_eq!(fs::read(&protected).unwrap(),b"keep original");
}
