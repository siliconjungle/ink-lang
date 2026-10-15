use ink_core::{core::CheckedModule, stateful::Runtime, syntax};
use serde_json::json;

const SOURCE: &str = "module checked_runtime;state Current:u32=0;event Seen:u32;
 change set(x:u32,fail:Bool)->Result<Unit,String> writes(Current) emits(Seen){
 Current=x;emit Seen(x);if fail{return Err(\"rollback\");}return Ok(());}
 query read()->u32 reads(Current){return Current;}";

#[test]
fn checked_runtime_retains_ingress_transactions_events_and_restore_validation() {
    let mut program = syntax::parse(SOURCE).unwrap();
    let checked = CheckedModule::from_source(program.clone()).unwrap();
    let mut raw = Runtime::new(program.clone()).unwrap();
    let mut reused = Runtime::from_checked(&checked).unwrap();
    for (name,args) in [("read",json!([])),("set",json!([7,false])),("set",json!([99,true])),
        ("read",json!([])),("set",json!([4294967296u64,false])),("set",json!([1])),("missing",json!([]))] {
        let a=raw.invoke_json(name,&args).map(|o|o.json());
        let b=reused.invoke_json(name,&args).map(|o|o.json());
        assert_eq!(a,b,"{name} {args}");
        assert_eq!(raw.checkpoint().unwrap(),reused.checkpoint().unwrap());
        assert_eq!(raw.checkpoint_portable().unwrap(),reused.checkpoint_portable().unwrap());
    }
    assert_eq!(reused.invoke_json("read",&json!([])).unwrap().result.json(),json!(7));
    assert_eq!(reused.outbox().len(),1);
    let local=reused.checkpoint().unwrap();let portable=reused.checkpoint_portable().unwrap();
    let restored=Runtime::restore_checked(&checked,&local).unwrap();
    assert_eq!(restored.checkpoint().unwrap(),local);
    let restored=Runtime::restore_portable_checked(&checked,&portable).unwrap();
    assert_eq!(restored.checkpoint_portable().unwrap(),portable);
    assert!(Runtime::restore_checked(&checked,b"{}").is_err());
    assert!(Runtime::restore_portable_checked(&checked,&portable[..portable.len()/2]).is_err());
    let limits = ink_core::snapshot_wire::Limits {
        bytes: portable.len() - 1,
        ..Default::default()
    };
    assert!(Runtime::restore_portable_checked_with_limits(&checked, &portable, limits).is_err());
    // A caller's mutable copy cannot change the already admitted module.
    program.actions[0].body=vec![syntax::Statement::Return(syntax::Expr::Bool(true))];
    assert!(Runtime::new(program).is_err());
    assert_eq!(Runtime::from_checked(&checked).unwrap().invoke_json("read",&json!([])).unwrap().result.json(),json!(0));
}

#[test]
fn raw_runtime_cannot_admit_a_false_contract() {
    let p=syntax::parse("module invalid;spec fn id(x:u32)->u32 ensures result==x;implementation wrong for id{return 0;}").unwrap();
    assert!(CheckedModule::from_source(p.clone()).is_err());
    assert!(Runtime::new(p).is_err());
}
