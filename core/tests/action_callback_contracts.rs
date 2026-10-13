use ink_core::{contracts, core::CheckedModule, syntax};
const SOURCE: &str = include_str!("fixtures/action-callback-values.ink");
#[test]
fn callback_requirements_bind_actual_action_parameters_and_state_observations() {
    let p = syntax::parse(SOURCE).unwrap();
    let obligations = contracts::state_obligations(&p).unwrap();
    for owner in ["items", "current", "maybe", "either", "store", "abort"] {
        let goals = obligations
            .obligations
            .iter()
            .filter(|g| g.name.starts_with(&format!("{owner}:action-call:")))
            .collect::<Vec<_>>();
        assert!(!goals.is_empty(), "{owner}");
        assert!(
            goals.iter().all(|g| !g
                .params
                .iter()
                .any(|(n, _)| n.starts_with("__contract_binder"))),
            "{owner}"
        );
        if owner == "current" {
            assert!(
                goals.iter().all(|g| g.params.len() == 2+p.actions.iter().find(|a|a.name==owner).unwrap().params.len()),
                "goals={:?}, source={:?}",
                goals.iter().map(|g| &g.params).collect::<Vec<_>>(),
                p.actions.iter().find(|a|a.name==owner).unwrap().params,
            );
            assert!(goals.iter().all(|g| !g.conditions.is_empty()));
        }
    }
}
#[test]
fn unsafe_calls_in_action_callbacks_do_not_become_nominal_or_state_assumptions() {
    let source = "module unsafe;
      record Raw {valid:Bool,}
      spec fn read(v:Raw)->Bool requires v.valid; ensures result;
      implementation read_impl for read{return v.valid;}
      query values(xs:List<Raw>)->List<Bool>{return xs.map(fn(v)=>read(v));}";
    assert!(CheckedModule::from_source(syntax::parse(source).unwrap())
        .unwrap_err()
        .contains("action-call"));
    let source = "module stale;
      private state Counter:u32=1;invariant Counter>0;
      spec fn positive(x:u32)->u32 requires x>0;ensures result==x;
      implementation body for positive{return x;}
      change invalid()->Result<Unit,String> reads(Counter) writes(Counter){
        Counter=0;let values=[0].map(fn(v)=>positive(Counter));return Err(\"abort\");
      }";
    assert!(CheckedModule::from_source(syntax::parse(source).unwrap())
        .unwrap_err()
        .contains("action-call"));
}

#[test]
fn checked_action_callbacks_preserve_commit_abort_events_and_raw_ingress() {
    use ink_core::stateful::Runtime;
    use serde_json::json;
    let mut p = syntax::parse(SOURCE).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/action-callback-values-proofs.json")).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut rt = Runtime::new(p).unwrap();
    let input = json!([[{"item":1,"valid":true},{"item":2,"valid":true}]]);
    let stored = rt.invoke_json("store", &input).unwrap();
    assert!(stored.committed);
    assert_eq!(stored.events.len(), 1);
    assert_eq!(stored.events[0].value.json(), json!(3));
    let checkpoint = rt.checkpoint_portable().unwrap();
    assert_eq!(
        rt.invoke_json("current", &json!([])).unwrap().result.json(),
        json!([1, 2])
    );
    let aborted = rt
        .invoke_json("abort", &json!([[{"item":11,"valid":true}]]))
        .unwrap();
    assert!(!aborted.committed);
    assert!(aborted.events.is_empty());
    assert_eq!(rt.checkpoint_portable().unwrap(), checkpoint);
    assert!(rt
        .invoke_json("store", &json!([[{"item":1,"valid":false}]]))
        .is_err());
    assert_eq!(rt.checkpoint_portable().unwrap(), checkpoint);
}

#[test]
fn guarded_calls_and_eager_fallback_calls_keep_their_execution_scope() {
    let source="module guards;
      spec fn zero(x:u64)->u64 requires x==0;ensures result==x;
      implementation body for zero{return x;}
      query values(xs:List<u64>,enabled:Bool)->List<u64>{return xs.map(fn(x)=>choose(x==0&&enabled,zero(x),0));}";
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let source="module fallback;
      refined record Valid{item:u32,valid:Bool,}invariant value.valid;
      fn observe(v:Valid)->u32{return v.item;}
      spec fn make(x:u32)->Valid requires x>0;ensures result.valid;
      implementation body for make{return Valid{item:x,valid:true};}
      query invalid()->List<u32>{let xs:Option<List<Valid>>=Some([Valid{item:1,valid:true}]);return xs.unwrap_or([make(0)]).map(fn(v)=>observe(v));}";
    let error=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap_err();
    assert!(error.contains("action-call"),"{error}");
}
