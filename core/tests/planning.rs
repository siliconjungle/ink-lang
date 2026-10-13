use ink_core::{
    core::CheckedModule,
    laws::Proof,
    optimisation, physical, planning, property, registry,
    semantic::{self as s, Node},
    syntax::parse,
};
fn module() -> CheckedModule {
    CheckedModule::from_source(parse("module properties;fn value(x:u32)->u32{return x;}").unwrap())
        .unwrap()
}
fn empty() -> registry::Bundle {
    serde_json::from_value(serde_json::json!({"schema":1,"snapshot":{"schema":1,"semantics":registry::SNAPSHOT_SEMANTICS,
        "root":registry::identity(&serde_json::json!({"schema":1,"entries":[]})).unwrap()},"roots":[],"objects":{},"membership":{}})).unwrap()
}
fn fact(m: &CheckedModule) -> property::Package {
    property::Package {
        schema: 1,
        semantics: property::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: empty(),
        facts: vec![property::Fact {
            function: "value".into(),
            subject_variable: "subject".into(),
            context: s::term(
                s::value(ink_core::syntax::Type::U32),
                Node::Free("subject".into()),
            ),
            value: s::term(
                s::value(ink_core::syntax::Type::U32),
                Node::Free("x".into()),
            ),
            proof: Proof::Normalize,
        }],
    }
}
#[test]
fn properties_bind_actual_source_and_reject_false_or_stale_statements() {
    let m = module();
    let packet = fact(&m);
    let checked = property::check(&m, &packet).unwrap();
    assert_eq!(checked.equations().len(), 1);
    let mut wrong = packet.clone();
    wrong.facts[0].value = s::word(ink_core::syntax::Type::U32, 3);
    assert!(property::check(&m, &wrong).is_err());
    let mut wrong = packet.clone();
    wrong.facts[0].context = s::word(ink_core::syntax::Type::U32, 3);
    wrong.facts[0].value = wrong.facts[0].context.clone();
    assert!(property::check(&m, &wrong).is_err());
    let mut wrong = packet.clone();
    wrong.facts[0].subject_variable = "x".into();
    assert!(property::check(&m, &wrong).is_err());
    let changed = CheckedModule::from_source(
        parse("module properties;fn value(x:u32)->u32{return x+1;}").unwrap(),
    )
    .unwrap();
    assert!(property::check(&changed, &packet).is_err());
}
#[test]
fn repeated_layers_have_no_artificial_round_ceiling() {
    let m = module();
    let rewrite = optimisation::Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: empty(),
        applications: vec![],
        action_replacement: None,
        contract_refinement: None,
    };
    let mut steps = vec![];
    for _ in 0..130 {
        steps.push(planning::Step::Properties(fact(&m)));
        steps.push(planning::Step::Rewrite(rewrite.clone()));
    }
    let packet = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps,
    };
    let checked = planning::check(&m, &packet).unwrap();
    assert_eq!(checked.module().identity().unwrap(), m.identity().unwrap());
    assert!(checked.properties().is_empty());
    let mut invalid = packet;
    invalid.input_core_sha256 = "0".repeat(64);
    assert!(planning::check(&m, &invalid).is_err());
}
#[test]
fn physical_metadata_cannot_select_missing_source_or_fake_definition_sites() {
    let m = module();
    let p = physical::Plan {
        schema: 1,
        semantics: physical::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        representation: None,
        tables: Default::default(), buffers:Default::default(), bounds:None, columns:vec![],column_maps:None,
        dense_prefixes:vec![],
        borrow_reads: vec![],
        borrow_rows: vec![],
        definitions: Default::default(),
        packed_datatypes: vec![],
        memo_functions: vec![],
        reservations: vec![],
    };
    physical::check(&m, None, &p).unwrap();
    let mut wrong = p.clone();
    wrong.borrow_rows = vec!["0".repeat(64)];
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut wrong = p.clone();
    wrong.memo_functions = vec!["0".repeat(64)];
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut wrong = p.clone();
    wrong.borrow_reads =
        vec![registry::identity(&ink_core::syntax::Expr::Var("x".into())).unwrap()];
    assert!(physical::check(&m, None, &wrong).is_err());
    let mut wrong = p;
    wrong.input_core_sha256 = "0".repeat(64);
    assert!(physical::check(&m, None, &wrong).is_err());
}

#[test]
fn sealed_prefix_reuse_never_authorises_modified_proof_bytes() {
    let m = module();
    let mut checker = planning::Checker::new(m.clone());
    let first = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps: vec![planning::Step::Properties(fact(&m))],
    };
    checker.check(&first).unwrap();
    let mut next = first.clone();
    next.steps.push(planning::Step::Properties(fact(&m)));
    checker.check(&next).unwrap();
    assert_eq!(checker.reused_steps(), 1);
    let mut false_packet = next.clone();
    if let planning::Step::Properties(p) = &mut false_packet.steps[0] {
        p.facts[0].value = s::word(ink_core::syntax::Type::U32, 8);
    }
    assert!(checker.check(&false_packet).is_err());
    assert_eq!(planning::check(&m, &next).unwrap().properties().len(), 2);
    checker.check(&next).unwrap();
    assert_eq!(checker.reused_steps(), 2);
}
