use ink_core::{contracts, core::CheckedModule, eval, syntax};

fn checked(source: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(source)?)
}

#[test]
fn approximation_is_a_checked_contract_not_an_equality_permission() {
    checked("module a;spec fn copy(x:Int)->Int approximates x within absolute 0;implementation identity for copy{return x;}").unwrap();
    checked("module a;spec fn rounded()->u32 approximates 101 within absolute 1;implementation lower for rounded{return 100;}").unwrap();
    assert!(checked("module a;spec fn wrong()->u32 approximates 101 within absolute 0;implementation lower for wrong{return 100;}").is_err());
    assert!(checked("module a;spec fn wrong()->Int approximates 0 within absolute -1;implementation zero for wrong{return 0;}").is_err());
    for ty in ["u32", "u64", "i32", "Int"] {
        checked(&format!("module a;spec fn copy(x:{ty})->{ty} approximates x within absolute 0;implementation identity for copy{{return x;}}")).unwrap();
    }
}

#[test]
fn integer_error_does_not_wrap_at_either_word_boundary() {
    for (ty, high) in [("u32", "4294967295"), ("u64", "18446744073709551615")] {
        let source=format!("module a;spec fn wrong()->{ty} approximates {high} within absolute 1;implementation zero for wrong{{return 0;}}");
        assert!(checked(&source).is_err(), "{ty} distance wrapped");
    }
    assert!(checked("module a;spec fn wrong()->i32 approximates -2147483648 within absolute 1;implementation high for wrong{return 2147483647;}").is_err());
}

#[test]
fn float_ulps_distinguish_neighbors_and_exclude_nonfinite_results() {
    for (actual, expected, budget, valid) in [
        (0u32, 0x80000000u32, 0, true), (1, 0, 1, true),
        (0x80000001, 1, 2, true), (0x80000001, 1, 1, false),
        (0x3f800001, 0x3f800000, 1, true), (0x3f800001, 0x3f800000, 0, false),
        (0x7f800000, 0x7f800000, 0, false), (0x7fc00000, 0x7fc00000, 0, false),
    ] {
        let source=format!("module a;spec fn estimate()->f32 approximates f32_from_bits({expected}) within ulps {budget};implementation selected for estimate{{return f32_from_bits({actual});}}");
        let result=checked(&source);
        assert_eq!(result.is_ok(), valid, "{actual:x} {expected:x} {budget}: {result:?}");
    }
    assert!(syntax::parse("module a;spec fn f()->f32 approximates 0.0 within absolute 1;implementation z for f{return 0.0;}").is_err());
}

#[test]
fn reference_and_budget_binders_cannot_capture_source_names() {
    let module=checked("module a;spec fn copy(__ink_local_0:u64,__ink_local_1:u64)->u64 approximates __ink_local_0 within absolute 0;ensures result==__ink_local_0;implementation id for copy{return __ink_local_0;}").unwrap();
    assert_eq!(eval::call(module.program(),"copy",vec![eval::Value::U64(u64::MAX),eval::Value::U64(0)],&mut 10000).unwrap().json(),serde_json::json!(u64::MAX));
}

#[test]
fn widening_a_contract_cannot_reuse_source_bound_evidence() {
    let original=syntax::parse("module a;spec fn f()->u32 approximates 3 within absolute 1;implementation lower for f{return 2;}").unwrap();
    let evidence=contracts::Evidence{schema:1,semantics:contracts::SEMANTICS.into(),source_sha256:contracts::subject_identity(&original).unwrap(),proofs:Default::default(),state_proofs:Default::default(),knowledge:None,state_knowledge:None};
    let mut changed=syntax::parse("module a;spec fn f()->u32 approximates 3 within absolute 0;implementation lower for f{return 2;}").unwrap();
    assert!(contracts::attach(&mut changed,evidence).is_err());
}

#[test]
fn rational_relative_budgets_use_exact_products_and_handle_zero_reference() {
    for (actual, reference, num, den, valid) in [
        (99i64,100i64,1i64,100i64,true),(98,100,1,100,false),
        (-99,-100,1,100,true),(0,0,1,100,true),(1,0,1,100,false),
        (100,100,1,0,false),(100,100,-1,100,false),(100,100,1,-1,false),
    ] {
        let source=format!("module a;spec fn estimate()->Int approximates {reference} within relative({num},{den});implementation selected for estimate{{return {actual};}}");
        assert_eq!(checked(&source).is_ok(),valid,"{source}");
    }
    let source="module a;spec fn estimate()->u64 approximates 18446744073709551615 within relative(1,18446744073709551615);implementation near for estimate{return 18446744073709551614;}";
    checked(source).unwrap();
    assert!(checked(&source.replace("18446744073709551614", "0")).is_err());
}
