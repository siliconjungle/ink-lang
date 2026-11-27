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


fn law_for(program: &ink_core::core::Program, name: &str) -> ink_core::laws::Law {
    let g = contracts::obligations(program).unwrap().into_iter().find(|g| g.name == name).unwrap();
    let mut executable = program.clone();
    executable.contracts = Default::default();
    let executable = CheckedModule::from_source(executable).unwrap();
    let roots = executable.program().functions.iter().map(|f| f.name.clone()).collect::<Vec<_>>();
    ink_core::laws::Law {
        schema: 1, semantics: ink_core::laws::SEMANTICS.into(),
        params: g.params, conditions: g.conditions, from: g.goal.from, to: g.goal.to,
        proof: ink_core::laws::Proof::Normalize, dependencies: vec![],
        definition_context: Some(ink_core::definition_context::DefinitionContext::capture(&executable, &roots).unwrap()),
        types: vec![], assumptions: vec![],
    }
}
fn law_id(law: &ink_core::laws::Law) -> String {
    ink_core::registry::identity(&ink_core::registry::Entry::from_law(law).unwrap()).unwrap()
}
fn view(laws: Vec<ink_core::laws::Law>) -> ink_core::registry::Bundle {
    let objects = laws.into_iter().map(|law| (law_id(&law), law)).collect::<std::collections::BTreeMap<_, _>>();
    ink_core::registry::from_catalogue(&ink_core::laws::Catalogue {
        schema: 1, semantics: ink_core::laws::SEMANTICS.into(),
        roots: objects.keys().cloned().collect(), objects,
    }).unwrap()
}
fn use_law(law: &ink_core::laws::Law) -> serde_json::Value {
    json!({"Use": {"law": law_id(law), "arguments": law.params.iter()
        .map(|(n, t)| (n.clone(), ink_core::semantic::free(t.clone(), n)))
        .collect::<std::collections::BTreeMap<_, _>>(), "premises": []}})
}

#[test]
fn authoring_reuse_authenticates_every_view_and_checks_every_proposal() {
    let p = syntax::parse("module reuse; spec fn id(x:u32)->u32 ensures result==x; implementation same for id{return x;}").unwrap();
    let law = law_for(&p, "same:ensures:0");
    let good = view(vec![law.clone()]);
    let proof = use_law(&law);
    let mut context = ProofContext::new(&p).unwrap();
    for _ in 0..2 { context.check("same:ensures:0", proof.clone(), Some(&good)).unwrap(); }
    // Same claimed IDs, changed proof bytes must still authenticate.
    let mut edited = good.clone();
    edited.objects.get_mut(&law_id(&law)).unwrap().payload["proof"] = json!({"Hypothesis":999});
    assert!(context.check("same:ensures:0", proof.clone(), Some(&edited)).unwrap_err().contains("content mismatch"));
    let mut membership = good.clone();
    membership.snapshot.root = "0".repeat(64);
    assert!(context.check("same:ensures:0", proof.clone(), Some(&membership)).unwrap_err().contains("pinned snapshot"));
    // Rehashing and publishing a new snapshot still cannot turn invalid proof
    // bytes into a checked law, including an overlapping valid catalogue.
    let mut false_law = law.clone();
    false_law.proof = ink_core::laws::Proof::Hypothesis(999);
    let forged = view(vec![law.clone(), false_law]);
    assert!(context.check("same:ensures:0", proof.clone(), Some(&forged)).is_err());
    // Valid dependency admission never caches the verdict of a later proposal.
    assert!(context.check("same:ensures:0", json!({"Hypothesis":999}), Some(&good)).is_err());
    context.check("same:ensures:0", proof, Some(&good)).unwrap();
}

#[test]
fn authoring_views_do_not_accumulate_laws_or_import_missing_dependencies() {
    let p = syntax::parse("module views; spec fn id(x:u32)->u32 ensures result==x; implementation same for id{return x;}").unwrap();
    let law = law_for(&p, "same:ensures:0");
    let first = view(vec![law.clone()]);
    let mut dependent = law.clone();
    dependent.dependencies = vec![law_id(&law)];
    dependent.proof = serde_json::from_value(use_law(&law)).unwrap();
    let full = view(vec![law.clone(), dependent.clone()]);
    let mut context = ProofContext::new(&p).unwrap();
    context.check("same:ensures:0", use_law(&dependent), Some(&full)).unwrap();
    // Even a formerly checked root requires its complete authenticated closure.
    let mut missing = full.clone();
    missing.objects.remove(&law_id(&law)); missing.membership.remove(&law_id(&law));
    missing.roots = vec![law_id(&dependent)];
    assert!(context.check("same:ensures:0", use_law(&dependent), Some(&missing)).unwrap_err().contains("missing knowledge dependency"));
    for bundle in [None, Some(&view(vec![])), Some(&first)] {
        assert!(context.check("same:ensures:0", use_law(&dependent), bundle).unwrap_err().contains("checked dependency closure"));
    }
    // A changed snapshot may reuse overlapping checked entries, but its own
    // complete view determines the laws available to this request.
    context.check("same:ensures:0", use_law(&dependent), Some(&full)).unwrap();
    assert!(context.check("same:ensures:0", use_law(&law), None).is_err());
}

#[test]
fn reusable_authoring_laws_remain_bound_to_the_executable_definitions() {
    let source = "module definitions; fn helper(x:u32)->u32{return x;} spec fn id(x:u32)->u32 ensures result==x; implementation same for id{return helper(x);}";
    let p = syntax::parse(source).unwrap();
    let law = law_for(&p, "same:ensures:0");
    let bundle = view(vec![law.clone()]);
    let mut context = ProofContext::new(&p).unwrap();
    context.check("same:ensures:0", use_law(&law), Some(&bundle)).unwrap();
    let changed = syntax::parse(&source.replace("return x;", "return 0;")).unwrap();
    assert!(ProofContext::new(&changed).unwrap().check("same:ensures:0", use_law(&law), Some(&bundle)).is_err());
    context.check("same:ensures:0", use_law(&law), Some(&bundle)).unwrap();
}
