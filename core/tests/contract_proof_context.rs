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
