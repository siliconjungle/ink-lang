use ink_core::{
    core::CheckedModule,
    snapshot, snapshot_wire,
    stateful::{Runtime, Value},
    syntax,
};
use serde_json::json;

fn module(bits: u32) -> CheckedModule {
    let mut p=syntax::parse("module frozen; state Model:Table<u32,f32>=Table.empty(); state Live:Table<u32,u32>=Table.empty(); query bits()->u32 reads(Model){return f32_bits(Model.get(0).unwrap_or(0.0));} change set(value:u32)->Result<Unit,String> writes(Live){Live.put(0,value);return Ok(());}").unwrap();
    p.frozen
        .insert("Model".into(), vec![(json!(0), Value::F32(bits).json())]);
    CheckedModule::from_source(p).unwrap()
}

#[test]
fn fixed_initial_values_have_versioned_source_identity_and_raw_float_bits() {
    for bits in [0, 0x80000000, 0x7fa12345, 0x7f800000, 1] {
        let m = module(bits);
        assert_eq!(m.semantics(), ink_core::core::FROZEN_STATE_SEMANTICS);
        let m = CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
        let mut rt = Runtime::from_checked(&m).unwrap();
        assert_eq!(
            rt.invoke_json("bits", &json!([])).unwrap().result.json(),
            json!(bits)
        );
        let snapshot = rt.checkpoint_portable().unwrap();
        assert_eq!(
            Runtime::restore_portable_checked(&m, &snapshot)
                .unwrap()
                .checkpoint_portable()
                .unwrap(),
            snapshot
        );
        let json_snapshot = rt.checkpoint().unwrap();
        assert_eq!(
            Runtime::restore_checked(&m, &json_snapshot)
                .unwrap()
                .checkpoint()
                .unwrap(),
            json_snapshot
        );
        assert!(Runtime::restore_portable_checked(&module(bits ^ 1), &snapshot).is_err());
    }
}

#[test]
fn restore_rejects_changed_deleted_and_added_frozen_rows_but_preserves_live_changes() {
    let m = module(0x80000000);
    let mut rt = Runtime::from_checked(&m).unwrap();
    assert!(rt.invoke_json("set", &json!([42])).unwrap().committed);
    let bytes = rt.checkpoint_portable().unwrap();
    let layout = snapshot::layout(m.program()).unwrap();
    let original = snapshot_wire::decode(&layout, &bytes, Default::default()).unwrap();
    let root = layout
        .roots
        .iter()
        .position(|(n, _, _)| n == "Model")
        .unwrap();
    for rows in [
        vec![],
        vec![(json!(0), json!(0.0))],
        vec![
            (json!(0), Value::F32(0x80000000).json()),
            (json!(1), json!(1.0)),
        ],
    ] {
        let mut changed = original.clone();
        changed.tables[root] = rows;
        let forged = snapshot_wire::encode(&layout, &changed, Default::default()).unwrap();
        assert!(Runtime::restore_portable_checked(&m, &forged)
            .err()
            .unwrap()
            .contains("frozen"));
    }
    assert_eq!(
        Runtime::restore_portable_checked(&m, &bytes)
            .unwrap()
            .checkpoint_portable()
            .unwrap(),
        bytes
    );
}

#[test]
fn immutable_capabilities_and_data_are_checked_after_transport() {
    let m = module(0);
    let mut p = m.program().clone();
    assert!(ink_core::action_ir::CheckedActions::elaborate(&m).is_err());
    assert!(ink_core::action_ir::CheckedActions::elaborate_with_frozen_roots(&m).is_ok());
    p.actions
        .iter_mut()
        .find(|a| a.name == "set")
        .unwrap()
        .writes
        .push("Model".into());
    assert!(CheckedModule::from_source(p)
        .unwrap_err()
        .contains("frozen"));
    let mut p = m.program().clone();
    p.contracts.learning.trainable.push("Model".into());
    assert!(CheckedModule::from_source(p)
        .unwrap_err()
        .contains("frozen"));
    let mut p = m.program().clone();
    p.frozen.insert("Missing".into(), vec![]);
    assert!(CheckedModule::from_source(p)
        .unwrap_err()
        .contains("unknown frozen"));
    let mut p = m.program().clone();
    p.frozen.insert(
        "Model".into(),
        vec![(json!(0), json!(0.)), (json!(0), json!(1.))],
    );
    assert!(CheckedModule::from_source(p)
        .unwrap_err()
        .contains("ordered"));
    let mut json: serde_json::Value = serde_json::from_slice(&m.bytes().unwrap()).unwrap();
    json["semantics"] = json!(ink_core::core::PRIMITIVE_SEMANTICS);
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&json).unwrap()).is_err());
}

#[test]
fn state_contract_initial_obligations_use_the_fixed_data() {
    let mut p=syntax::parse("module fixed; state Model:Table<u32,u32>=Table.empty(); invariant Model.get(0).unwrap_or(0)==42; query get()->u32 reads(Model){return Model.get(0).unwrap_or(0);}").unwrap();
    p.frozen.insert("Model".into(), vec![(json!(0), json!(42))]);
    let m = CheckedModule::from_source(p).unwrap();
    let mut rt = Runtime::from_checked(&m).unwrap();
    assert_eq!(
        rt.invoke_json("get", &json!([])).unwrap().result.json(),
        json!(42)
    );
    let projection = ink_core::action_model::Projection::derive(&m).unwrap();
    assert!(projection.initial_state.is_some());
}

#[test]
fn frozen_lookup_constants_follow_from_checked_source_domain_not_a_hint() {
    use ink_core::{
        action_model::Projection,
        core::Type,
        logic::{Proof, Sort, Term},
    };
    let mut p=syntax::parse("module fixed; state Model:Table<u32,u32>=Table.empty(); query get()->Option<u32> reads(Model){return Model.get(0);}").unwrap();
    p.frozen.insert("Model".into(), vec![(json!(0), json!(42))]);
    let m = CheckedModule::from_source(p).unwrap();
    let model = Projection::derive(&m).unwrap();
    assert_eq!(model.source_domain.len(), 1);
    let equation = &model.source_domain[0];
    let get = |rows| Term::Call {
        function: model.tables[0].get.clone(),
        arguments: vec![rows, Term::U64(0)],
    };
    let Sort::Data(option) =
        &model.types[&serde_json::to_string(&Type::Option(Box::new(Type::U32))).unwrap()]
    else {
        panic!("option carrier")
    };
    let expected = Term::Construct {
        datatype: option.clone(),
        constructor: 1,
        arguments: vec![Term::U64(42)],
    };
    let proof = Proof::Trans(
        Box::new(Proof::Substitute {
            variable: "rows".into(),
            context: get(Term::Var("rows".into())),
            equality: Box::new(Proof::Hypothesis(0)),
        }),
        Box::new(Proof::Convert {
            from: get(equation.to.clone()),
            to: expected.clone(),
        }),
    );
    let params = vec![("initial".into(), Sort::Data(model.state.clone()))];
    let context = model.context().unwrap();
    context
        .check(
            &params,
            &model.source_domain,
            &get(equation.from.clone()),
            &expected,
            &proof,
        )
        .unwrap();
    assert!(context
        .check(&params, &[], &get(equation.from.clone()), &expected, &proof)
        .is_err());
    let wrong = Term::Construct {
        datatype: option.clone(),
        constructor: 1,
        arguments: vec![Term::U64(43)],
    };
    assert!(context
        .check(
            &params,
            &model.source_domain,
            &get(equation.from.clone()),
            &wrong,
            &proof
        )
        .is_err());
    let mut mutable = m.program().clone();
    mutable.frozen.clear();
    assert!(
        Projection::derive(&CheckedModule::from_source(mutable).unwrap())
            .unwrap()
            .source_domain
            .is_empty()
    );
}

#[test]
fn fixed_values_must_satisfy_existing_nominal_invariants() {
    let source="module values; refined record Small { x:u32, } invariant value.x<10; state Model:Table<u32,Small>=Table.empty(); query marker()->u32 reads(Model){return 0;}";
    let mut p = syntax::parse(source).unwrap();
    p.frozen
        .insert("Model".into(), vec![(json!(0), json!({"x":3}))]);
    let m = CheckedModule::from_source(p.clone()).unwrap();
    Runtime::from_checked(&m).unwrap();
    p.frozen.get_mut("Model").unwrap()[0].1 = json!({"x":12});
    assert!(CheckedModule::from_source(p).is_err());
}

#[test]
fn complete_action_specialization_uses_only_immutable_input_facts() {
    use ink_core::optimisation::{self, Package};
    let module = CheckedModule::from_bytes(include_bytes!("fixtures/frozen-specialization.core.json")).unwrap();
    let packet: Package = serde_json::from_slice(include_bytes!("fixtures/frozen-specialization.selection.json")).unwrap();
    let checked = optimisation::check(&module, &packet).unwrap();
    assert_eq!(checked.evidence().assumptions, ["ink-frozen-roots-v1"]);
    let mut original = Runtime::from_checked(&module).unwrap();
    let mut selected = Runtime::new_selected(&checked).unwrap();
    for x in [0, 1, 7, 255, u64::MAX-8, u64::MAX] {
        for (name, args) in [("put", json!([x,x])), ("serve", json!([x]))] {
            assert_eq!(original.invoke_json(name,&args).unwrap().json(),
                       selected.invoke_json(name,&args).unwrap().json());
            assert_eq!(original.checkpoint_portable().unwrap(), selected.checkpoint_portable().unwrap());
        }
    }
    // Rebind all ordinary source identities, including the selected source.
    // The same proof must still reject a different frozen value.
    for changed in [false, true] {
        let mut p = module.program().clone();
        if changed {
            p.frozen.get_mut("Bias").unwrap()[0].1 = json!(10);
        } else {
            p.frozen.get_mut("Choice").unwrap()[0].1 = json!(false);
        }
        let wrong = CheckedModule::from_source(p).unwrap();
        let mut forged = packet.clone();
        forged.input_core_sha256 = wrong.identity().unwrap();
        let replacement = forged.action_replacement.as_mut().unwrap();
        let selected = CheckedModule::from_bytes(&serde_json::to_vec(&replacement.selected).unwrap()).unwrap();
        let mut p = selected.program().clone();
        p.frozen = wrong.program().frozen.clone();
        replacement.selected = serde_json::from_slice(&CheckedModule::from_source(p).unwrap().bytes().unwrap()).unwrap();
        assert!(optimisation::check(&wrong,&forged).is_err());
    }
    // Removing a fixed capability cannot preserve the old assumption, even
    // when no source writer happens to exist for that root.
    let mut p = module.program().clone();
    p.frozen.clear();
    let mutable = CheckedModule::from_source(p).unwrap();
    let mut forged = packet.clone();
    forged.input_core_sha256 = mutable.identity().unwrap();
    let replacement = forged.action_replacement.as_mut().unwrap();
    let selected = CheckedModule::from_bytes(&serde_json::to_vec(&replacement.selected).unwrap()).unwrap();
    let mut p = selected.program().clone();
    p.frozen.clear();
    replacement.selected = serde_json::from_slice(&CheckedModule::from_source(p).unwrap().bytes().unwrap()).unwrap();
    assert!(optimisation::check(&mutable,&forged).is_err());
    assert!(ink_core::action_model::Projection::derive(&mutable).unwrap().frozen_domain.is_empty());
    let mut missing = packet;
    missing.action_replacement.as_mut().unwrap().proofs.remove("put");
    assert!(optimisation::check(&module,&missing).is_err());
}

#[test]
fn helper_enum_and_word_and_correspondence_preserve_all_widths() {
    use ink_core::action_model::Projection;
    let p = syntax::parse("module enum_bits; enum Variant{Full,Packed,} fn evaluate(v:Variant,x:u64)->u64{return choose(v==Variant.Packed,word_and(x,255),x);} query q(v:Variant,x:u64)->u64{return evaluate(v,x);} query narrow(x:u32)->u32{return word_and(x,255);} query signed(x:i32)->i32{return word_and(x,-1);}").unwrap();
    let m = CheckedModule::from_source(p).unwrap();
    let projection = Projection::derive(&m).unwrap();
    let context = projection.context().unwrap();
    let mut runtime = Runtime::from_checked(&m).unwrap();
    let initial = ink_core::logic::Term::Construct{datatype:projection.state.clone(),constructor:0,arguments:vec![]};
    for variant in ["Variant.Full","Variant.Packed"] {
        for x in [0,1,255,256,u64::MAX] {
            let a = &projection.actions["q"];
            let term = ink_core::logic::Term::Call{function:a.function.clone(),arguments:vec![
                initial.clone(),
                ink_core::logic::Term::U64(0),
                ink_core::logic::Term::Construct{datatype:match &a.params[2].1{ink_core::logic::Sort::Data(d)=>d.clone(),_=>panic!()},constructor:usize::from(variant=="Variant.Packed"),arguments:vec![]},
                ink_core::logic::Term::U64(x)]};
            let ink_core::logic::Term::Construct{arguments,..}=context.evaluate(&[],&term).unwrap() else{panic!()};
            assert_eq!(arguments[0], ink_core::logic::Term::U64(runtime.invoke_json("q",&json!([variant,x])).unwrap().result.json().as_u64().unwrap()));
        }
    }
    for bits in [0,1,255,256,0x80000000,u32::MAX] {
        for name in ["narrow","signed"] {
            let a=&projection.actions[name];
            let term=ink_core::logic::Term::Call{function:a.function.clone(),arguments:vec![
                initial.clone(),ink_core::logic::Term::U64(0),
                ink_core::logic::Term::U64(bits as u64)]};
            let ink_core::logic::Term::Construct{arguments,..}=context.evaluate(&[],&term).unwrap() else{panic!()};
            let argument=if name=="signed"{json!([bits as i32])}else{json!([bits])};
            let expected=runtime.invoke_json(name,&argument).unwrap().result.json();
            let word=if name=="signed"{expected.as_i64().unwrap() as i32 as u32 as u64}else{expected.as_u64().unwrap()};
            assert_eq!(arguments[0],ink_core::logic::Term::U64(word));
        }
    }
}
