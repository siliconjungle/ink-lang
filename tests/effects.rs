use serde_json::{json, Value};
use verified_language::{
    action_ir::CheckedActions,
    core::CheckedModule,
    effects::{CheckedEffects, Exit, ValueShape},
    stateful::Runtime,
    syntax::parse,
};
const APP: &str = include_str!("../examples/action-control.ink");
fn actions(source: &str) -> CheckedActions {
    CheckedActions::elaborate(&CheckedModule::from_source(parse(source).unwrap()).unwrap()).unwrap()
}
#[test]
fn source_effects_preserve_abrupt_exits_lazy_calls_and_transitive_keep_reads() {
    let ir = actions(APP);
    let effects = CheckedEffects::derive(&ir).unwrap();
    assert_eq!(effects.actions_identity(), ir.identity().unwrap());
    assert_eq!(effects.source_identity(), ir.source_identity());
    for name in ["ignore", "capture"] {
        let s = effects.action(name).unwrap();
        assert!(s.access.writes.contains("Rows"));
        assert!(s.access.emits.contains("seen"));
        assert!(s
            .paths
            .iter()
            .any(|p| p.exit == Exit::Abort && p.written && p.emitted));
        // A poisoned callee cannot resume to the caller's final Ok.
        assert!(!s.paths.iter().any(|p| p.exit == Exit::Return));
    }
    let lazy = effects.action("short_circuit").unwrap();
    assert!(lazy.access.writes.is_empty());
    assert!(lazy.access.emits.is_empty());
    assert!(!lazy.access.calls.contains("truth"));
    assert!(!lazy.paths.iter().any(|p| p.exit == Exit::Abort));
    let constructors = effects.action("discarded_constructors").unwrap();
    assert!(!constructors.paths.iter().any(|p| p.exit == Exit::Abort));
    assert!(constructors
        .paths
        .iter()
        .any(|p| p.exit == Exit::Return && p.value == ValueShape::Ok));
    let eager = effects.action("eager_fallback").unwrap();
    assert!(eager.access.calls.contains("error_value"));
    assert!(eager.access.emits.contains("seen"));
    let total = effects.action("total_query").unwrap();
    assert!(total.access.keeps.contains("total"));
    assert!(total.access.reads.contains("Rows"));
    assert!(total.access.writes.is_empty());
    let runtime = Runtime::new(parse(APP).unwrap()).unwrap();
    assert_eq!(runtime.effects().bytes().unwrap(), effects.bytes().unwrap());
}
#[test]
fn domain_exits_before_and_after_effects_and_query_error_values_are_distinct() {
    let source = format!(
        "{}\n{}",
        APP,
        r#"
query ordinary()->Result<Unit,Error> {return Err(Error.Missing);}
query raising()->Result<Unit,Error> {return Err(Error.Missing)?;}
change value_only()->Result<Unit,Error> {ordinary();return Ok(());}
change propagated()->Result<Unit,Error> {ordinary()?;return Ok(());}
change nested_query()->Result<Unit,Error> {raising();return Ok(());}
change before()->Result<Unit,Error> writes(Rows) emits(seen) {poison();return Ok(());}
change fail_first()->Result<Unit,Error> writes(Rows) emits(seen) {
 return Err(Error.Missing)?;Rows.remove(0);emit seen(6);return Ok(());
}
change read_then()->Result<Unit,Error> reads(Rows) emits(seen) {
 Rows.get(0).ok_or(Error.Missing)?;emit seen(6);return Ok(());
}
change maybe(yes:Bool)->Result<Unit,Error> writes(Rows) emits(seen) {
 if yes {Rows.remove(0);return Err(Error.Missing);}else{emit seen(3);return Ok(());}
}
"#
    );
    let ir = actions(&source);
    let effects = CheckedEffects::derive(&ir).unwrap();
    assert!(!effects
        .action("value_only")
        .unwrap()
        .paths
        .iter()
        .any(|p| p.exit == Exit::Abort));
    for name in ["propagated", "fail_first"] {
        let s = effects.action(name).unwrap();
        assert!(s
            .paths
            .iter()
            .any(|p| p.exit == Exit::Abort && !p.written && !p.emitted));
        assert!(!s.paths.iter().any(|p| p.exit == Exit::Return));
    }
    assert!(!effects
        .action("nested_query")
        .unwrap()
        .paths
        .iter()
        .any(|p| p.exit == Exit::Abort));
    assert!(effects
        .action("nested_query")
        .unwrap()
        .paths
        .iter()
        .any(|p| p.exit == Exit::Return && p.value == ValueShape::Ok));
    let first = effects.action("fail_first").unwrap();
    assert!(first.access.writes.is_empty() && first.access.emits.is_empty());
    let read = effects.action("read_then").unwrap();
    assert!(read
        .paths
        .iter()
        .any(|p| p.exit == Exit::Abort && !p.emitted));
    assert!(!read
        .paths
        .iter()
        .any(|p| p.exit == Exit::Abort && p.emitted));
    assert!(read.paths.iter().any(|p| p.exit == Exit::Host && p.emitted));
    let maybe = effects.action("maybe").unwrap();
    assert!(maybe
        .paths
        .iter()
        .any(|p| p.exit == Exit::Return && p.value == ValueShape::Err && p.written && !p.emitted));
    assert!(maybe
        .paths
        .iter()
        .any(|p| p.exit == Exit::Return && p.value == ValueShape::Ok && !p.written && p.emitted));
    assert!(!maybe.paths.iter().any(|p| p.written && p.emitted));
}
#[test]
fn callback_reads_are_conditional_and_effect_artifacts_are_rechecked() {
    let source = format!(
        "{}\n{}",
        APP,
        r#"
query see(x:u32)->u32 reads(Rows){Rows.get(x);return x;}
query never()->Option<u32> reads(Rows){return None.map(fn(x)=>see(x));}
query maybe_read(input:Option<u32>)->Option<u32> reads(Rows){return input.map(fn(x)=>see(x));}
query from_list()->List<u32> reads(Rows){return Rows.values().map(fn(row)=>see(row.value));}
keep alias:Int=total;
query alias_query()->Int reads(alias){return alias;}
"#
    );
    let ir = actions(&source);
    let e = CheckedEffects::derive(&ir).unwrap();
    assert!(e.action("never").unwrap().access.reads.is_empty());
    for name in ["maybe_read", "from_list"] {
        assert!(e.action(name).unwrap().access.reads.contains("Rows"));
    }
    assert!(e
        .action("alias_query")
        .unwrap()
        .access
        .keeps
        .contains("total"));
    assert!(e
        .action("alias_query")
        .unwrap()
        .access
        .reads
        .contains("Rows"));
    let original: Value = serde_json::from_slice(&e.bytes().unwrap()).unwrap();
    assert_eq!(
        e.identity().unwrap(),
        CheckedEffects::from_bytes(&ir, &e.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap()
    );
    for field in ["source", "actions_identity", "semantics"] {
        let mut forged = original.clone();
        forged[field] = json!("fake");
        assert!(CheckedEffects::from_bytes(&ir, &serde_json::to_vec(&forged).unwrap()).is_err());
    }
    let mut forged = original.clone();
    forged["actions"]["from_list"]["access"]["reads"] = json!([]);
    assert!(CheckedEffects::from_bytes(&ir, &serde_json::to_vec(&forged).unwrap()).is_err());
    let mut forged = original.clone();
    forged["actions"]["maybe_read"]["paths"] = json!([]);
    assert!(CheckedEffects::from_bytes(&ir, &serde_json::to_vec(&forged).unwrap()).is_err());
    let mut forged = original;
    forged["trusted"] = json!(true);
    assert!(CheckedEffects::from_bytes(&ir, &serde_json::to_vec(&forged).unwrap()).is_err());
    assert!(CheckedEffects::from_bytes(&actions(APP), &e.bytes().unwrap()).is_err());
    assert!(
        CheckedEffects::from_bytes(&ir, &vec![b' '; verified_language::core::MAX_BYTES + 1])
            .is_err()
    );
}

#[test]
fn observed_reference_prefixes_fit_the_source_judgment_through_future_calls() {
    let mut runtime = Runtime::new(parse(APP).unwrap()).unwrap();
    let mut word = 0x2198acd7430db832u64;
    let calls = [
        "create",
        "advance",
        "record_order",
        "argument_order",
        "eager_fallback",
        "ignore",
        "capture",
        "branch",
        "short_circuit",
        "read_tentative",
        "sum_changed",
        "total_query",
        "discarded_constructors",
        "contextual_none",
        "constrained_none",
    ];
    for _ in 0..1000 {
        word ^= word << 13;
        word ^= word >> 7;
        word ^= word << 17;
        let name = calls[word as usize % calls.len()];
        let args = if name == "advance" {
            json!([if word & 1 == 0 {
                u32::MAX as u64
            } else {
                word % 100
            }])
        } else if name == "branch" {
            json!([word & 1 == 0])
        } else {
            json!([])
        };
        let before = runtime.checkpoint_portable().unwrap();
        let reply = runtime.invoke_json(name, &args).unwrap();
        let actual = runtime.last_body_path().unwrap();
        assert!(
            runtime
                .effects()
                .action(name)
                .unwrap()
                .paths
                .contains(&actual),
            "{name}: {actual:?}"
        );
        if !reply.committed {
            assert_eq!(before, runtime.checkpoint_portable().unwrap());
        }
    }
    assert!(runtime.invoke_json("missing", &json!([])).is_err());
    assert!(runtime.last_body_path().is_none());
    assert!(runtime.invoke_json("advance", &json!(["wrong"])).is_err());
    assert!(runtime.last_body_path().is_none());
}

#[test]
fn query_and_keep_domain_errors_exit_locally_without_poisoning_other_error_types() {
    let source = include_str!("../examples/query-errors.ink");
    let mut runtime = Runtime::new(parse(source).unwrap()).unwrap();
    for name in ["ignored", "captured", "keep_value"] {
        let outcome = runtime.invoke_json(name, &json!([])).unwrap();
        assert!(outcome.committed);
        assert_eq!(outcome.result.json(), json!({"Ok":null}));
        let path = runtime.last_body_path().unwrap();
        assert!(runtime
            .effects()
            .action(name)
            .unwrap()
            .paths
            .contains(&path));
        assert!(!runtime
            .effects()
            .action(name)
            .unwrap()
            .paths
            .iter()
            .any(|p| p.exit == Exit::Abort));
    }
    runtime.invoke_json("create", &json!([])).unwrap();
    let callback = runtime.invoke_json("callback", &json!([])).unwrap();
    assert_eq!(callback.result.json(), json!([{"Err":"OtherError.Bad"}]));
    for name in ["propagated", "keep_propagated"] {
        let before = runtime.checkpoint_portable().unwrap();
        let result = runtime.invoke_json(name, &json!([])).unwrap();
        assert!(!result.committed);
        assert_eq!(result.result.json(), json!({"Err":"OtherError.Bad"}));
        assert_eq!(before, runtime.checkpoint_portable().unwrap());
        let path = runtime.last_body_path().unwrap();
        assert_eq!(path.exit, Exit::Abort);
        assert!(runtime
            .effects()
            .action(name)
            .unwrap()
            .paths
            .contains(&path));
    }
    assert!(runtime
        .effects()
        .keep("failed")
        .unwrap()
        .paths
        .iter()
        .any(|p| p.exit == Exit::Next && p.value == ValueShape::Err));
}
