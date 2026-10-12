use ink_core::{core::CheckedModule, syntax};
fn checked(s: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(s)?)
}
#[test]
fn specifications_check_each_implementation_and_round_trip() {
    let m=checked("module c; spec fn f(x:u32)->u32 ensures result == x + 1; implementation a for f { return x+1; } implementation b for f { return 1+x; }").unwrap();
    CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
}
#[test]
fn false_and_missing_implementations_reject() {
    assert!(checked("module c; spec fn f(x:u32)->u32 ensures result == x+1; implementation a for f { return x; }").is_err());
    assert!(checked("module c; spec fn f(x:u32)->u32 ensures result == x;").is_err());
}
#[test]
fn default_body_cannot_bypass_contract() {
    let m = checked(
        "module c; spec fn f(x:u32)->u32 ensures result == x; implementation a for f { return x; }",
    )
    .unwrap();
    let mut p = m.into_program();
    p.functions.iter_mut().find(|f| f.name == "f").unwrap().body = ink_core::core::Expr::Num(0);
    assert!(CheckedModule::from_source(p).is_err());
}
#[test]
fn callers_must_establish_preconditions() {
    let src="module c; spec fn f(x:u32)->u32 requires x == 0; ensures result == x; implementation a for f { return x; }";
    checked(&format!("{src} fn good()->u32 {{return f(0);}} ")).unwrap();
    assert!(checked(&format!("{src} fn bad()->u32 {{return f(1);}} ")).is_err());
}
#[test]
fn invariant_initialisation_is_checked() {
    checked("module c; state T:Table<u64,u64>=Table.empty(); invariant true; query q()->u64 {return 0;}").unwrap();
    assert!(checked("module c; state T:Table<u64,u64>=Table.empty(); invariant false; query q()->u64 {return 0;}").is_err());
}
#[test]
fn relational_query_captures_before() {
    checked("module c; state T:Table<u64,u64>=Table.empty(); spec query q(k:u64)->Bool reads(T) ensures result == before(T.contains(k)); implementation direct for q { return T.contains(k); }").unwrap();
}
#[test]
fn state_postcondition_rejects_wrong_reply() {
    assert!(checked("module c; state T:Table<u64,u64>=Table.empty(); spec query q()->Bool reads(T) ensures result; implementation wrong for q {return false;}").is_err());
}
#[test]
fn private_value_state_uses_transactions() {
    let m=checked("module c; private state N:u64=4; change set(n:u64)->Result<Unit,String> writes(N) {N=n;return Ok(());} query read()->u64 reads(N){return N;}").unwrap();
    assert!(matches!(
        m.program().states[0].ty,
        ink_core::core::Type::Table(..)
    ));
}
#[test]
fn total_change_and_before() {
    let p=syntax::parse("module c; private state N:u64=0; spec change set(n:u64)->Unit reads(N) writes(N) ensures N == n; implementation assign for set {N=n;return ();}").unwrap();
    assert!(!ink_core::contracts::state_obligations(&p)
        .unwrap()
        .obligations
        .is_empty());
    checked("module c; private state N:u64=0; change set(n:u64)->Unit writes(N){N=n;return ();} change twice()->Unit writes(N){set(1);set(2);return ();}").unwrap();
}
#[test]
fn finite_multisets_and_uniqueness() {
    checked("module c; spec fn ok()->Bool ensures result; implementation test for ok {return multiset(list(1,2,1)) == multiset(list(2,1)) + singleton(1);}").unwrap();
    assert!(checked("module c; spec fn ok()->Bool ensures result; implementation test for ok {return multiset(list(1,1)) == multiset(list(1));}").is_err());
    checked("module c; spec fn ok()->Bool ensures result; implementation test for ok {return unique(list(1,2,3));}").unwrap();
    assert!(checked("module c; spec fn ok()->Bool ensures result; implementation test for ok {return unique(list(1,2,1));}").is_err());
}
#[test]
fn generic_contract_instances() {
    checked("module c; spec fn same<T>(x:T)->T ensures result == x; implementation identity for same {return x;} fn use_it()->u64{return same<u64>(4);}").unwrap();
    assert!(checked("module c; spec fn same<T>(x:T)->T ensures result == x; implementation bad for same {return x;} fn use_it()->u64{return same<u64>(4);} fn bad_call()->u64{return bad<u64>(2);}").is_ok());
}
#[test]
fn callback_contract_instances() {
    checked("module c; spec fn apply<T>(x:T,f:fn(T)->T)->T ensures result == f(x); implementation direct for apply {return f(x);} fn run(x:u64)->u64{return apply<u64>(x,fn(n)=>n+1);}").unwrap();
    assert!(checked("module c; spec fn apply<T>(x:T,f:fn(T)->T)->T ensures result == f(x); implementation wrong for apply {return x;} fn run(x:u64)->u64{return apply<u64>(x,fn(n)=>n+1);}").is_err());
}
#[test]
fn action_callers_establish_preconditions() {
    let prefix="module c; spec fn f(x:u64)->u64 requires x==0; ensures result==x; implementation identity for f{return x;}";
    checked(&format!("{prefix} query good()->u64{{return f(0);}}")).unwrap();
    assert!(checked(&format!("{prefix} query bad()->u64{{return f(1);}}")).is_err());
}
#[test]
fn public_preconditions_and_total_change_runtime() {
    use ink_core::{
        eval,
        stateful::{Runtime, Value},
    };
    let m=checked("module c; private state N:u64=0; spec fn f(x:u64)->u64 requires x==0; ensures result==x; implementation identity for f{return x;} change set(n:u64)->Unit writes(N){N=n;return ();} query read()->u64 reads(N){return N;}").unwrap();
    assert!(eval::call(m.program(), "f", vec![eval::Value::U64(1)], &mut 10000).is_err());
    let mut r = Runtime::new(m.into_program()).unwrap();
    assert!(r.invoke("set", vec![Value::U64(7)]).unwrap().committed);
    assert_eq!(r.invoke("read", vec![]).unwrap().result, Value::U64(7));
}
#[test]
fn metadata_and_ingress_guards_are_authenticated() {
    let m=checked("module c; spec fn f(x:u32)->u32 requires x==0; ensures result==x; implementation a for f{return x;}").unwrap();
    let mut p = m.program().clone();
    p.contracts.precondition_checks.clear();
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = m.program().clone();
    let guard = p.contracts.precondition_checks["f"].clone();
    p.functions
        .iter_mut()
        .find(|f| f.name == guard)
        .unwrap()
        .body = syntax::Expr::Bool(true);
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = m.program().clone();
    p.contracts.implementations[0].specification = "missing".into();
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = m.into_program();
    p.contracts.implementations[0].body = vec![syntax::Statement::Return(syntax::Expr::Num(0))];
    assert!(CheckedModule::from_source(p).is_err());
}
#[test]
fn refinement_allows_different_permitted_values_but_rechecks_callers() {
    use ink_core::{
        contracts::{self, Body, Evidence, Refinement},
        core::Expr,
    };
    let source="module c; spec fn f()->u32 ensures result==1 || result==2; implementation a for f{return 1;}";
    let m = checked(source).unwrap();
    let bodies = std::collections::BTreeMap::from([("f".into(), Body::Pure(Expr::Num(2)))]);
    let p = contracts::prepare(&m, &bodies).unwrap();
    let evidence = Evidence {
        schema: 1,
        semantics: contracts::SEMANTICS.into(),
        source_sha256: contracts::subject_identity(&p).unwrap(),
        proofs: Default::default(),
        state_proofs: Default::default(),
        knowledge: None,
        state_knowledge: None,
    };
    let selected = contracts::check_refinement(
        &m,
        &Refinement {
            bodies: bodies.clone(),
            evidence,
        },
    )
    .unwrap();
    assert_eq!(
        ink_core::eval::call(selected.program(), "f", vec![], &mut 1000)
            .unwrap()
            .json(),
        serde_json::json!(2)
    );
    let m = checked(&format!(
        "{source} spec fn g()->u32 ensures result==1; implementation g1 for g{{return f();}}"
    ))
    .unwrap();
    let p = contracts::prepare(&m, &bodies).unwrap();
    let evidence = Evidence {
        schema: 1,
        semantics: contracts::SEMANTICS.into(),
        source_sha256: contracts::subject_identity(&p).unwrap(),
        proofs: Default::default(),
        state_proofs: Default::default(),
        knowledge: None,
        state_knowledge: None,
    };
    assert!(contracts::check_refinement(&m, &Refinement { bodies, evidence }).is_err());
}
#[test]
fn scalar_float_equality_is_not_structural_reflexivity() {
    assert!(checked("module c; spec fn reflexive(x:f32)->Bool ensures result; implementation a for reflexive{return x==x;}").is_err());
    checked("module c; spec fn reflexive(x:f32)->Bool ensures result; implementation a for reflexive{return list(x)==list(x);}").unwrap();
}
#[test]
fn uniqueness_sugar_does_not_override_user_functions() {
    let m=checked("module c; fn unique(xs:List<u32>)->Bool{return false;} fn use_it()->Bool{return unique(list(1,2));}").unwrap();
    assert_eq!(
        ink_core::eval::call(m.program(), "use_it", vec![], &mut 1000)
            .unwrap()
            .json(),
        serde_json::json!(false)
    );
}
#[test]
fn action_callback_shadowing_cannot_reuse_outer_preconditions() {
    let source="module shadow;spec fn f(x:u64)->u64 requires x==0;ensures result==x;implementation id for f{return x;} spec query outer(x:u64)->List<u64> requires x==0;ensures true;implementation bad for outer{return list(1).map(fn(x)=>f(x));}";
    assert!(checked(source).is_err());
}
#[test]
fn action_callback_guards_establish_preconditions_in_their_own_scope() {
    let source="module scope;spec fn f(x:u64)->u64 requires x==0;ensures result==x;implementation id for f{return x;} query map(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>choose(x==0,f(x),0));}";
    checked(source).unwrap();
}
#[test]
fn keep_initializers_cannot_bypass_callee_preconditions() {
    assert!(checked("module keeps;spec fn f(x:u64)->u64 requires x==0;ensures result==x;implementation id for f{return x;} keep K:u64=f(1);query read()->u64 reads(K){return K;}").is_err());
    checked("module keeps;spec fn f(x:u64)->u64 requires x==0;ensures result==x;implementation id for f{return x;} keep K:u64=f(0);query read()->u64 reads(K){return K;}").unwrap();
}

#[test]
fn list_state_invariants_reject_duplicate_initial_ids() {
    assert!(checked("module duplicate;record Job{id:u32,value:u32,}private state Ready:List<Job>=[Job{id:1,value:2},Job{id:1,value:3}];invariant unique_ids(Ready);").is_err());
    checked("module empty;record Job{id:u32,value:u32,}private state Ready:List<Job>=[];invariant unique_ids(Ready);").unwrap();
}
