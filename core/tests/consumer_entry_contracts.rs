use ink_core::{contracts, core::CheckedModule, syntax};
const HEADER: &str = "module consumer_entry;private state Counter:u32=1;
 spec fn guarded(x:u32,limit:u32)->u32 requires limit>0;ensures result==x;
 implementation identity for guarded{return x;}
 query rows(x:u32)->List<u32>{return [x];}";

#[test]
fn empty_callback_domains_do_not_require_a_state_fact_for_an_unexecuted_call() {
    let p=syntax::parse(&format!("{HEADER}change empty()->Result<Unit,String> writes(Counter){{
 Counter=0;let xs:List<u32>=[];let values=xs.map(fn(x)=>guarded(x,Counter));Counter=1;return Ok(());}}" )).unwrap();
    CheckedModule::from_source(p).unwrap();
}

#[test]
fn a_later_repair_cannot_validate_a_callback_executed_in_invalid_state() {
    let p=syntax::parse(&format!("{HEADER}change bad()->Result<Unit,String> writes(Counter){{
 Counter=0;let xs:List<u32>=[1];let values=xs.map(fn(x)=>guarded(x,Counter));Counter=1;return Ok(());}}" )).unwrap();
    let error = CheckedModule::from_source(p).err().unwrap();
    assert!(error.contains("bad:action-call:"), "{error}");
}

#[test]
fn readonly_receiver_observations_retain_their_lexical_inputs() {
    let p = syntax::parse(&format!(
        "{HEADER}query values()->List<u32>{{let item:u32=1;
 return rows(item).map(fn(x)=>guarded(x,1));}}"
    ))
    .unwrap();
    CheckedModule::from_source(p).unwrap();
}

#[test]
fn authored_consumer_entry_proofs_preserve_current_state_events_and_rollback() {
    let mut p = syntax::parse(include_str!("fixtures/consumer-entry.ink")).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/consumer-entry-proofs.json")).unwrap(),
    )
    .unwrap();
    let mut rt = ink_core::stateful::Runtime::new(p).unwrap();
    let before = rt.checkpoint_portable().unwrap();
    let aborted = rt
        .invoke_json("repair_abort", &serde_json::json!([[1, 2]]))
        .unwrap();
    assert!(!aborted.committed);
    assert!(aborted.events.is_empty());
    assert_eq!(rt.checkpoint_portable().unwrap(), before);
    let committed = rt
        .invoke_json("repair", &serde_json::json!([[1, 2]]))
        .unwrap();
    assert!(committed.committed);
    assert_eq!(
        committed
            .events
            .iter()
            .map(|e| e.value.json())
            .collect::<Vec<_>>(),
        vec![serde_json::json!(3)]
    );
    assert_eq!(
        rt.invoke_json("captured", &serde_json::json!([]))
            .unwrap()
            .result
            .json(),
        serde_json::json!([7])
    );
}
