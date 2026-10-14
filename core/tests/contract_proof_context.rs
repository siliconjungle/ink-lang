use ink_core::{
    contracts::{self, ProofContext},
    core::CheckedModule,
    syntax,
};
use serde_json::json;
#[test]
fn authoring_context_reuses_exact_obligations_without_admitting_false_contracts() {
    let source = "module proposals;
 spec fn identity(x:u32)->u32 ensures result==x;
 implementation correct for identity{return x;}
 spec fn zero(x:u32)->u32 ensures result==0;
 implementation incorrect for zero{return x;}";
    let p = syntax::parse(source).unwrap();
    let mut context = ProofContext::new(&p).unwrap();
    assert_eq!(
        context.source_identity().unwrap(),
        contracts::subject_identity(&p).unwrap()
    );
    for name in [
        "identity:ensures:0",
        "correct:ensures:0",
        "zero:ensures:0",
        "incorrect:ensures:0",
        "missing",
    ] {
        let actual = context.check(name, json!("Normalize"), None);
        let separate = contracts::check_proof(&p, name, json!("Normalize"), None);
        assert_eq!(actual, separate, "{name}");
        assert_eq!(
            actual.is_ok(),
            name == "identity:ensures:0" || name == "correct:ensures:0"
        );
    }
    assert!(context
        .check("correct:ensures:0", json!({"Hypothesis":99}), None)
        .is_err());
    assert!(context
        .check("correct:ensures:0", json!("Normalize"), None)
        .is_ok());
    assert!(CheckedModule::from_source(p).is_err());
}
#[test]
fn authoring_context_keeps_the_original_source_after_the_callers_copy_changes() {
    let mut p=syntax::parse("module snapshot;spec fn id(x:u32)->u32 ensures result==x;implementation same for id{return x;}").unwrap();
    let mut context = ProofContext::new(&p).unwrap();
    let identity = context.source_identity().unwrap();
    p.functions
        .iter_mut()
        .find(|f| f.name == "same")
        .unwrap()
        .body = syntax::Expr::Num(0);
    assert!(context
        .check("same:ensures:0", json!("Normalize"), None)
        .is_ok());
    assert!(contracts::check_proof(&p, "same:ensures:0", json!("Normalize"), None).is_err());
    assert_eq!(context.source_identity().unwrap(), identity);
}

#[test]
fn exported_goals_preserve_derivation_order_without_becoming_proof_authority() {
    let mut p=syntax::parse("module exported;spec fn zebra(x:u32)->u32 ensures result==x;implementation alpha for zebra{return x;}spec fn zero(x:u32)->u32 ensures result==0;implementation wrong for zero{return x;}").unwrap();
    let expected = serde_json::to_value(contracts::obligations(&p).unwrap()).unwrap();
    let mut context = ProofContext::new(&p).unwrap();
    let original = context.export_obligations().unwrap();
    assert_eq!(original["pure"], expected);
    assert_eq!(original["source_sha256"], contracts::subject_identity(&p).unwrap());
    assert!(original["state"].is_null());
    // Exported trees and the caller's program are detached from the context.
    let mut edited = original.clone();
    edited["pure"] = json!([]);
    p.functions.iter_mut().find(|f| f.name == "alpha").unwrap().body = syntax::Expr::Num(0);
    assert_eq!(context.export_obligations().unwrap(), original);
    assert!(context.check("alpha:ensures:0", json!("Normalize"), None).is_ok());
    assert!(context.check("wrong:ensures:0", json!("Normalize"), None).is_err());
    assert!(CheckedModule::from_source(p).is_err());
}
