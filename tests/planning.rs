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
#[test]
fn envelopes_do_not_consume_individual_json_field_depth_budgets() {
    use ink_core::logic::{Declaration,Sort,Term};
    use serde_json::json;
    use std::collections::BTreeMap;
    let m=module();let mut found=None;
    for levels in 48..64 {
        let mut body=Term::Var("x".into());
        for _ in 0..levels {body=Term::Binary{op:"+".into(),left:Box::new(body),right:Box::new(Term::U64(0))};}
        let declaration=Declaration::Function{params:vec![("x".into(),Sort::U64)],result:Sort::U64,body,recursive:None};
        let entry=registry::Entry::from_declaration(&declaration,vec![]).unwrap();
        let Ok(id)=registry::identity(&entry) else {continue};
        let entries=vec![id.clone()];
        let view=registry::Bundle{schema:1,snapshot:registry::Snapshot{schema:1,semantics:registry::SNAPSHOT_SEMANTICS.into(),
            root:registry::identity(&json!({"schema":1,"entries":entries})).unwrap()},roots:entries.clone(),
            membership:BTreeMap::from([(id.clone(),registry::Membership{entries,path:vec![]})]),objects:BTreeMap::from([(id,entry)])};
        if registry::canonical_bundle(&view).is_err(){continue;}
        let packet=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),steps:vec![
            planning::Step::Rewrite(optimisation::Package{schema:1,semantics:optimisation::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),knowledge:view,
                applications:vec![],action_replacement:Some(serde_json::from_value(json!({
                    "selected":serde_json::from_slice::<serde_json::Value>(&m.bytes().unwrap()).unwrap(),"proofs":{}})).unwrap()),contract_refinement:None})]};
        let wire=planning::canonical(&packet).unwrap();
        if serde_json::from_slice::<serde_json::Value>(&wire).is_err(){found=Some((packet,wire));break;}
    }
    let (packet,wire)=found.expect("valid deep field inside a larger envelope");
    let parsed=planning::from_bytes(&wire).unwrap();
    planning::check(&m,&parsed).unwrap();
    assert_eq!(planning::identity(&parsed).unwrap(),planning::identity(&packet).unwrap());
    assert_eq!(planning::wire_identity(&wire).unwrap(),planning::identity(&packet).unwrap());
    let mut explicit=serde_json::to_value(&packet).unwrap();
    explicit["steps"][0]["package"]["contract_refinement"]=serde_json::Value::Null;
    let explicit_wire=serde_json::to_vec(&explicit).unwrap();
    let explicit_packet=planning::from_bytes(&explicit_wire).unwrap();
    assert_eq!(planning::identity(&explicit_packet).unwrap(),planning::identity(&packet).unwrap());
    assert_ne!(planning::wire_identity(&explicit_wire).unwrap(),planning::wire_identity(&wire).unwrap());
    let mut bad=serde_json::to_value(&packet).unwrap();let mut deep=serde_json::Value::Null;
    for _ in 0..129 {deep=json!([deep]);}
    bad["steps"][0]["package"]["knowledge"]["objects"].as_object_mut().unwrap().values_mut().next().unwrap()["payload"]["too_deep"]=deep;
    assert!(planning::from_bytes(&serde_json::to_vec(&bad).unwrap()).unwrap_err().contains("JSON field depth limit"));
    let deep=format!("{}0{}","[".repeat(257),"]".repeat(257));
    assert!(planning::from_bytes(deep.as_bytes()).unwrap_err().contains("envelope depth limit"));
    assert!(planning::from_bytes(&[wire.clone(),b" false".to_vec()].concat()).is_err());
}

#[test]
fn json_payloads_keep_literal_keys_and_wire_request_presence() {
    let mut entry=registry::Entry::from_declaration(&ink_core::logic::Declaration::Function{
        params:vec![],result:ink_core::logic::Sort::U64,body:ink_core::logic::Term::U64(7),recursive:None},vec![]).unwrap();
    entry.payload["$serde_json::private::RawValue"]=serde_json::json!("7");
    let wire=registry::canonical(&entry).unwrap();
    let parsed:registry::Entry=serde_json::from_slice(&wire).unwrap();
    assert_eq!(parsed.payload,entry.payload);
    let packet=serde_json::json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":module().identity().unwrap(),"steps":[]});
    let wire=serde_json::to_vec(&packet).unwrap();
    assert_eq!(planning::wire_identity(&wire).unwrap(),registry::identity(&packet).unwrap());
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
        tables: Default::default(), buffers:Default::default(), bounds:None, columns:vec![],record_elisions:vec![],sum_spines:vec![],column_maps:None,
        dense_prefixes:vec![],
        dictionary_tables:vec![],boundary_readers:vec![],
        borrow_reads: vec![],
        borrow_rows: vec![],
        definitions: Default::default(),
        packed_datatypes: vec![],
        memo_functions: vec![],
        reservations: vec![],inline_functions:vec![],
    };
    physical::check(&m, None, &p).unwrap();
    assert!(serde_json::to_value(&p).unwrap().get("inline_functions").is_none());
    let mut hinted=p.clone();hinted.inline_functions=vec!["value".into()];
    assert!(physical::check(&m,None,&hinted).unwrap().inlines_function("value"));
    for names in [vec!["missing".into()],vec!["value".into(),"value".into()],vec!["value".into(),"missing".into()]] {
        let mut wrong=p.clone();wrong.inline_functions=names;
        assert!(physical::check(&m,None,&wrong).is_err());
    }
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

#[test]
fn longest_prefix_and_rejections_match_fresh_admission() {
    let m = module();
    let mut checker = planning::Checker::new(m.clone());
    let package = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps: vec![planning::Step::Properties(fact(&m)); 12],
    };
    for length in [1, 5, 3, 5, 8, 8, 6, 10] {
        let mut p = package.clone();
        p.steps.truncate(length);
        let actual = checker.check(&p).unwrap();
        let expected = planning::check(&m, &p).unwrap();
        assert_eq!(
            registry::canonical(actual.package()).unwrap(),
            registry::canonical(expected.package()).unwrap()
        );
        assert_eq!(actual.module().identity().unwrap(), expected.module().identity().unwrap());
        assert_eq!(actual.properties().len(), expected.properties().len());
        for (actual, expected) in actual.properties().iter().zip(expected.properties()) {
            assert_eq!(actual.equations(), expected.equations());
        }
    }
    checker.check(&package).unwrap();
    assert_eq!(checker.reused_steps(), 10);
    for kind in 0..4 {
        let mut wrong = package.clone();
        match kind {
            0 => wrong.schema = 2,
            1 => wrong.semantics = "not-a-plan".into(),
            2 => wrong.input_core_sha256 = "0".repeat(64),
            _ => {
                if let planning::Step::Properties(p) = &mut wrong.steps[7] {
                    p.facts[0].value = s::word(ink_core::syntax::Type::U32, 17);
                }
            },
        }
        assert!(checker.check(&wrong).is_err());
        assert!(planning::check(&m, &wrong).is_err());
        checker.check(&package).unwrap();
        assert_eq!(checker.reused_steps(), 12);
    }
    let changed = CheckedModule::from_source(
        parse("module properties;fn value(x:u32)->u32{return x+1;}").unwrap()
    ).unwrap();
    assert!(planning::Checker::new(changed).check(&package).is_err());
}
