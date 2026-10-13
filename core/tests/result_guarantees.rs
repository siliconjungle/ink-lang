use ink_core::{contracts, core::CheckedModule, syntax};
const HEADER: &str = "module guarantees;
 private state Counter:u32=1;invariant Counter>0;
 spec query positive()->u32 reads(Counter) ensures result>0;
 implementation read for positive{return Counter;}
 spec fn need(x:u32)->u32 requires x>0;ensures result==x;
 implementation identity for need{return x;}";
fn parse(body: &str) -> ink_core::core::Program {
    syntax::parse(&format!("{HEADER}{body}")).unwrap()
}
#[test]
fn query_result_guarantees_require_actual_state_support_before_transport() {
    let p=parse("change broken()->Result<Unit,String> reads(Counter) writes(Counter){Counter=0;let captured=positive();let observed=need(captured);return Err(\"rollback\");}");
    let goals = contracts::state_obligations(&p).unwrap();
    let guarantee = goals
        .obligations
        .iter()
        .find(|g| g.name.starts_with("broken:action-guarantee:"))
        .unwrap();
    assert!(guarantee.conditions.is_empty());
    assert_eq!(guarantee.params.len(), 2);
    assert!(CheckedModule::from_source(p).is_err());
}
#[test]
fn readonly_callers_can_discharge_a_query_guarantee_from_boundary_invariants() {
    let p =
        parse("query safe()->u32 reads(Counter){let captured=positive();return need(captured);}");
    let goals = contracts::state_obligations(&p).unwrap();
    let guarantee = goals
        .obligations
        .iter()
        .find(|g| g.name.starts_with("safe:action-guarantee:"))
        .unwrap();
    assert!(!guarantee.conditions.is_empty());
    CheckedModule::from_source(p).unwrap();
}
#[test]
fn independent_result_guarantees_survive_writes_without_ambient_state_facts() {
    let p=parse("spec query echo(x:u32)->u32 requires x>0;ensures result>0;
      implementation echo_body for echo{return x;}
      change safe()->Result<Unit,String> writes(Counter){Counter=0;let captured=echo(1);let observed=need(captured);return Err(\"rollback\");}");
    let goals = contracts::state_obligations(&p).unwrap();
    let guarantee = goals
        .obligations
        .iter()
        .find(|g| g.name.starts_with("safe:action-guarantee:"))
        .unwrap();
    assert_eq!(guarantee.conditions.len(), 1);
    CheckedModule::from_source(p).unwrap();
}

#[test]
fn checked_query_and_change_result_guarantees_replay_as_canonical_source_evidence() {
    let source = include_str!("fixtures/result-guarantees.ink");
    let mut p = syntax::parse(source).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!(
            "fixtures/result-guarantees-proofs.json"
        ))
        .unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = ink_core::stateful::Runtime::new(p).unwrap();
    let before = rt.checkpoint_portable().unwrap();
    for name in ["safe_echo", "safe_change"] {
        let result = rt.invoke_json(name, &serde_json::json!([])).unwrap();
        assert!(!result.committed);
        assert_eq!(rt.checkpoint_portable().unwrap(), before);
    }
    assert_eq!(
        rt.invoke_json("safe_read", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(1)
    );
}
