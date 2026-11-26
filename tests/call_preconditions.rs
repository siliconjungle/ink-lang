use ink_core::{
    contracts,
    core::CheckedModule,
    syntax::{self, Expr, Type},
};

const HEADER: &str = "module preconditions;private state Counter:u32=1;
 spec query take(x:u32)->u32 reads(Counter) requires x>0;requires Counter>0;ensures result==x;
 implementation read for take{return x;}
 spec change fix()->Result<Unit,String> reads(Counter) writes(Counter) requires Counter>0;
 ensures true;implementation repair for fix{Counter=1;return Ok(());}";

#[test]
fn calls_can_use_an_explicit_repair_at_the_actual_point_of_invocation() {
    let p=syntax::parse(&format!("{HEADER}change good()->Result<Unit,String> writes(Counter){{Counter=0;Counter=1;let value=take(1);return Err(\"rollback\");}}" )).unwrap();
    let goals=contracts::state_obligations(&p).unwrap();
    let calls=goals.obligations.iter().filter(|g|g.name.starts_with("good:action-call:")).collect::<Vec<_>>();
    assert_eq!(calls.len(),2);
    assert!(calls.iter().all(|g|g.params.len()==2 && g.conditions.is_empty()));
}

#[test]
fn the_callees_own_repair_cannot_establish_its_entry_requirement() {
    let p=syntax::parse(&format!("{HEADER}change bad()->Result<Unit,String> writes(Counter){{Counter=0;let value=fix();return Ok(());}}" )).unwrap();
    let error = CheckedModule::from_source(p).err().unwrap();
    assert!(error.contains("bad:action-call:"), "{error}");
}

#[test]
fn generated_invocation_parameters_do_not_shadow_existing_global_state() {
    let p = syntax::parse(
        "module global_capture;private state __ink_invocation_0:u32=1;
      spec query take(x:u32)->u32 requires x>0;ensures true;
      implementation read for take{return x;}
      query caller()->u32{return take(1);}",
    )
    .unwrap();
    let checked = CheckedModule::from_source(p).unwrap();
    let mut rt = ink_core::stateful::Runtime::new(checked.into_program()).unwrap();
    assert_eq!(
        rt.invoke_json("caller", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(1)
    );
}

#[test]
fn a_bound_name_cannot_capture_a_generated_invocation_parameter() {
    let mut p = syntax::parse(
        "module bound_capture;
      spec fn echo(x:u32)->u32 requires x>0;ensures result==x;
      implementation identity for echo{return x;}
      query bad()->u32{return echo(0);}",
    )
    .unwrap();
    let spec = &mut p.contracts.specifications[0];
    spec.requires[0] = Expr::Let(
        "__ink_invocation_0".into(),
        Some(Box::new(Type::U32)),
        Box::new(Expr::Num(1)),
        Box::new(spec.requires[0].clone()),
    );
    assert!(CheckedModule::from_source(p).is_err());
}

#[test]
fn canonical_before_call_evidence_executes_ordered_argument_effects_once() {
    let mut p = syntax::parse(include_str!("fixtures/call-preconditions.ink")).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/call-preconditions-proofs.json")).unwrap(),
    )
    .unwrap();
    let mut rt = ink_core::stateful::Runtime::new(p).unwrap();
    let before = rt.checkpoint_portable().unwrap();
    assert!(
        !rt.invoke_json("repaired", &serde_json::json!([]))
            .unwrap()
            .committed
    );
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    let result = rt.invoke_json("arguments", &serde_json::json!([])).unwrap();
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
        rt.invoke_json("current", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!(2)
    );
}
