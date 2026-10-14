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
    // The invariant is an entry premise; the source prefix has already written
    // zero when the observation runs, so that premise cannot validate its value.
    assert_eq!(guarantee.conditions.len(), 1);
    assert_eq!(guarantee.params.len(), 2);
    assert!(CheckedModule::from_source(p).is_err());
}
#[test]
fn readonly_callers_can_discharge_a_query_guarantee_from_boundary_invariants() {
    let mut p =
        parse("query safe()->u32 reads(Counter){let captured=positive();return need(captured);}");
    let goals = contracts::state_obligations(&p).unwrap();
    let guarantee = goals
        .obligations
        .iter()
        .find(|g| g.name.starts_with("safe:action-guarantee:"))
        .unwrap();
    assert!(!guarantee.conditions.is_empty());
    // Transport the boundary premise through the Boolean safety continuation
    // with ordinary congruence, rather than treating the interface as authority.
    let ink_core::logic::Term::If {
        condition,
        on_true,
        on_false,
    } = &guarantee.goal.from
    else {
        panic!("expected a conditional safety observation");
    };
    assert_eq!(**condition, guarantee.conditions[0].from);
    p.contracts.state_proofs.insert(
        guarantee.name.clone(),
        ink_core::logic::Proof::Substitute {
            variable: "proof_flag".into(),
            context: ink_core::logic::Term::If {
                condition: Box::new(ink_core::logic::Term::Var("proof_flag".into())),
                on_true: on_true.clone(),
                on_false: on_false.clone(),
            },
            equality: Box::new(ink_core::logic::Proof::Hypothesis(0)),
        },
    );
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
fn captured_guarantees_resolve_the_actual_shadowed_lexical_slot() {
    let p = parse(
        "spec query echo(x:u32)->u32 requires true;ensures result==x;
      implementation echo_body for echo{return x;}
      query shadowed()->u32{let n:u32=1;let n:u32=2;let captured=echo(n);return captured;}",
    );
    let checked = CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = ink_core::stateful::Runtime::new(checked.into_program()).unwrap();
    assert_eq!(
        rt.invoke_json("shadowed", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(2)
    );
}

#[test]
fn checked_query_and_change_result_guarantees_replay_as_canonical_source_evidence() {
    let source = include_str!("fixtures/result-guarantees.ink");
    let mut p = syntax::parse(source).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/result-guarantees-proofs.json")).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = ink_core::stateful::Runtime::new(p).unwrap();
    let before = rt.checkpoint_portable().unwrap();
    for name in ["safe_echo", "safe_change", "repair", "repair_nested"] {
        let result = rt.invoke_json(name, &serde_json::json!([])).unwrap();
        assert!(!result.committed);
        assert!(result.events.is_empty());
        assert_eq!(rt.checkpoint_portable().unwrap(), before);
    }
    assert_eq!(
        rt.invoke_json("safe_read", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(1)
    );
    let result = rt
        .invoke_json("repair_commit", &serde_json::json!([]))
        .unwrap();
    assert!(result.committed);
    assert_eq!(
        result
            .events
            .iter()
            .map(|e| e.value.json())
            .collect::<Vec<_>>(),
        vec![serde_json::json!(0), serde_json::json!(2)]
    );
    assert_eq!(
        rt.invoke_json("safe_read", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(2)
    );
}
