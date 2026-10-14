use ink_core::{
    contracts,
    core::{CheckedModule, Expr, Type, VALUE_INVARIANT_SEMANTICS},
    eval, syntax,
};

const SMALL: &str = "module values; refined record Small { x:u32, } invariant value.x < 10;";
fn checked(source: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(source)?)
}

#[test]
fn one_interface_fact_reaches_semantic_and_physical_consumers() {
    let module = checked("module facts;
      refined record Indexed { items:List<u32>, index:u32, }
        invariant value.index < length(value.items);
      spec fn known(value:Indexed)->Bool ensures result;
      implementation observe for known {return value.index < length(value.items);}
      fn lookup(value:Indexed,fallback:u32)->u32 {return value.items.at_or(value.index,fallback);}
      fn other(value:Indexed,index:u32,fallback:u32)->u32 {return value.items.at_or(index,fallback);}").unwrap();
    let goals = ink_core::bounds::obligations(&module).unwrap();
    let exact = goals.iter().find(|g| g.site.function == "lookup").unwrap();
    assert!(exact
        .conditions
        .iter()
        .any(|condition| condition.from == exact.from && condition.to == exact.to));
    let other = goals.iter().find(|g| g.site.function == "other").unwrap();
    assert!(!other
        .conditions
        .iter()
        .any(|condition| condition.from == other.from && condition.to == other.to));
    let mut forged = module.program().clone();
    forged
        .contracts
        .inferred
        .get_mut("other")
        .unwrap()
        .requires
        .push(Expr::Binary(
            "<".into(),
            Box::new(Expr::Var("index".into())),
            Box::new(Expr::Call(
                "length".into(),
                vec![Expr::Field(
                    Box::new(Expr::Var("value".into())),
                    "items".into(),
                )],
            )),
        ));
    assert!(CheckedModule::from_source(forged).is_err());
}

#[test]
fn invariant_index_certificate_is_checked_and_cannot_move_to_another_index() {
    let module = checked(include_str!("fixtures/invariant-indexed.ink")).unwrap();
    let mut plan: ink_core::physical::Plan =
        serde_json::from_str(include_str!("fixtures/invariant-indexed.plan.json")).unwrap();
    let capability = ink_core::physical::check(&module, None, &plan).unwrap();
    assert!(capability.bounds().allows("lookup", &[]));
    assert!(!capability.bounds().allows("other", &[]));
    let bundle = &mut plan.bounds.as_mut().unwrap().knowledge;
    let old = bundle.roots[0].clone();
    let mut entry = bundle.objects.remove(&old).unwrap();
    let goal = ink_core::bounds::obligations(&module)
        .unwrap()
        .into_iter()
        .find(|g| g.site.function == "other")
        .unwrap();
    entry.payload["site"] = serde_json::to_value(&goal.site).unwrap();
    entry.payload["obligation_sha256"] = ink_core::registry::identity(&goal).unwrap().into();
    let id = ink_core::registry::identity(&entry).unwrap();
    bundle.objects.insert(id.clone(), entry);
    bundle.roots = vec![id.clone()];
    bundle.snapshot.root =
        ink_core::registry::identity(&serde_json::json!({"schema":1,"entries":[id]})).unwrap();
    bundle.membership = std::collections::BTreeMap::from([(
        id.clone(),
        ink_core::registry::Membership {
            entries: vec![id],
            path: vec![],
        },
    )]);
    assert!(ink_core::physical::check(&module, None, &plan).is_err());
}

#[test]
fn value_invariants_preserve_transactions_and_validate_portable_restore() {
    use ink_core::stateful::Runtime;
    let mut p = syntax::parse(include_str!("fixtures/invariant-value-state.ink")).unwrap();
    contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/invariant-value-state-proofs.json")).unwrap(),
    )
    .unwrap();
    let checked = CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime = Runtime::from_checked(&checked).unwrap();
    runtime
        .invoke_json("set", &serde_json::json!([{"value":0}]))
        .unwrap();
    let committed = runtime.checkpoint_portable().unwrap();
    runtime
        .invoke_json("abort", &serde_json::json!([{"value":0}]))
        .unwrap();
    assert_eq!(runtime.checkpoint_portable().unwrap(), committed);
    assert_eq!(
        runtime
            .invoke_json("set", &serde_json::json!([{"value":1}]))
            .unwrap_err(),
        "contract precondition failed"
    );
    assert_eq!(runtime.checkpoint_portable().unwrap(), committed);
    let layout = ink_core::snapshot::layout(&p).unwrap();
    let mut logical =
        ink_core::snapshot_wire::decode(&layout, &committed, Default::default()).unwrap();
    logical.tables[0] = vec![(serde_json::json!(0), serde_json::json!({"value":1}))];
    let forged = ink_core::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable_checked(&checked, &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    assert!(Runtime::restore_portable(p, &forged)
        .err()
        .unwrap()
        .contains("invariant"));
}

#[test]
fn construction_preservation_and_type_facts_are_checked() {
    let module = checked(&format!(
        "{SMALL}
      fn literal()->Small {{return Small {{x:3}};}}
      fn copy(v:Small)->Small {{return v;}}
      spec fn known(v:Small)->Bool ensures result;
      implementation observe for known {{return v.x < 10;}}"
    ))
    .unwrap();
    assert_eq!(module.semantics(), VALUE_INVARIANT_SEMANTICS);
    assert_eq!(module.program().contracts.value_invariants.len(), 1);
    CheckedModule::from_bytes(&module.bytes().unwrap()).unwrap();
    assert_eq!(
        eval::call(module.program(), "literal", vec![], &mut 10000)
            .unwrap()
            .json(),
        serde_json::json!({"x":3})
    );
    assert!(checked(&format!(
        "{SMALL} fn invalid()->Small {{return Small {{x:10}};}}"
    ))
    .is_err());
    assert!(checked(&format!(
        "{SMALL} fn unguarded(x:u32)->Small {{return Small {{x:x}};}}"
    ))
    .is_err());
}

#[test]
fn collection_named_source_functions_keep_their_lexical_meaning() {
    let module=checked("module lexical;
      fn unique(x:u32)->Bool{return x==7;}
      fn multiset(x:u32)->Bool{return x==7;}
      fn singleton(x:u32)->Bool{return x==8;}
      fn own(x:u32)->Bool{return unique(x) && multiset(x) && !singleton(x);}").unwrap();
    assert_eq!(eval::call(module.program(),"own",vec![eval::Value::U32(7)],&mut 10_000).unwrap(),eval::Value::Bool(true));
    assert_eq!(eval::call(module.program(),"own",vec![eval::Value::U32(8)],&mut 10_000).unwrap(),eval::Value::Bool(false));
}

#[test]
fn public_ingress_validates_once_and_internal_calls_use_proved_facts() {
    let module = checked(&format!(
        "{SMALL}
      fn known(v:Small)->Bool {{return v.x < 10;}}
      fn twice(v:Small)->Bool {{return known(v) && known(v);}}"
    ))
    .unwrap();
    let ty = Type::Named("Small".into());
    for (x, valid) in [(0, true), (9, true), (10, false), (u32::MAX, false)] {
        let arg =
            eval::Value::from_program_json(&serde_json::json!({"x":x}), &ty, module.program())
                .unwrap();
        let result = eval::call(module.program(), "twice", vec![arg], &mut 10000);
        assert_eq!(result.is_ok(), valid);
        if valid {
            assert_eq!(result.unwrap(), eval::Value::Bool(true));
        }
    }
}

#[test]
fn generic_and_nested_values_cannot_hide_invalid_elements() {
    let module = checked(
        "module generic;
      refined record Valid<T> { item:T, valid:Bool, } invariant value.valid;
      fn make()->Valid<u32> {return Valid<u32>{item:7,valid:true};}
      fn identity(xs:List<Valid<u32>>)->List<Valid<u32>> {return xs;}
      fn optional(v:Option<Valid<u32>>)->Option<Valid<u32>> {return v;}",
    )
    .unwrap();
    let f = module
        .program()
        .functions
        .iter()
        .find(|f| f.name == "identity")
        .unwrap();
    for (input, valid) in [
        (serde_json::json!([]), true),
        (serde_json::json!([{"item":7,"valid":true}]), true),
        (
            serde_json::json!([{"item":7,"valid":true},{"item":9,"valid":false}]),
            false,
        ),
    ] {
        let arg = eval::Value::from_program_json(&input, &f.params[0].1, module.program()).unwrap();
        assert_eq!(
            eval::call(module.program(), "identity", vec![arg], &mut 100000).is_ok(),
            valid
        );
    }
    assert!(checked(
        "module generic; refined record Valid<T> { item:T, valid:Bool, } invariant value.valid;
      fn bad()->Valid<u32>{return Valid<u32>{item:7,valid:false};}"
    )
    .is_err());
}

#[test]
fn authenticated_metadata_and_raw_core_construction_reject_forgery() {
    let module = checked(&format!("{SMALL} fn copy(v:Small)->Small {{return v;}}")).unwrap();
    let mut p = module.program().clone();
    p.contracts
        .inferred
        .get_mut("copy")
        .unwrap()
        .requires
        .clear();
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = module.program().clone();
    p.contracts.value_constructors.clear();
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = module.program().clone();
    p.functions
        .iter_mut()
        .find(|f| f.name == "copy")
        .unwrap()
        .body = Expr::Record("Small".into(), vec![("x".into(), Expr::Num(99))]);
    assert!(CheckedModule::from_source(p).is_err());
    let mut p = module.program().clone();
    let name = p.contracts.value_constructors["Small"].clone();
    p.functions
        .iter_mut()
        .find(|f| f.name == name)
        .unwrap()
        .body = Expr::Record("Small".into(), vec![("x".into(), Expr::Num(99))]);
    assert!(CheckedModule::from_source(p).is_err());
    let mut bytes: serde_json::Value = serde_json::from_slice(&module.bytes().unwrap()).unwrap();
    bytes["semantics"] = serde_json::json!("ink-executable-core-v10");
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&bytes).unwrap()).is_err());
}

#[test]
fn inferred_invariant_contract_does_not_weaken_an_exact_function() {
    let module = checked(&format!("{SMALL} fn copy(v:Small)->Small {{return v;}}")).unwrap();
    let bodies = std::collections::BTreeMap::from([(
        "copy".into(),
        contracts::Body::Pure(Expr::Var("v".into())),
    )]);
    assert!(contracts::prepare(&module, &bodies).is_err());
}

#[test]
fn predicates_are_pure_and_closed_over_their_own_value() {
    assert!(checked(
        "module bad; refined record R{x:u32,} invariant other==0; fn f()->u32{return 0;}"
    )
    .is_err());
    assert!(checked(
        "module bad; refined record R{x:u32,} invariant value.x; fn f()->u32{return 0;}"
    )
    .is_err());
    checked(
        "module tags; enum Mode{Valid,Invalid,}
      refined record Valid{tag:Mode,} invariant value.tag==Mode.Valid;
      fn make()->Valid{return Valid{tag:Mode.Valid};}",
    )
    .unwrap();
    assert!(checked(
        "module tags; enum Mode{Valid,Invalid,}
      refined record Valid{tag:Mode,} invariant value.tag==Mode.Valid;
      fn bad()->Valid{return Valid{tag:Mode.Invalid};}"
    )
    .is_err());
}

#[test]
fn raw_nested_validators_do_not_assume_their_input_invariant() {
    let module = checked(&format!(
        "{SMALL} fn identity(xs:List<Small>)->List<Small>{{return xs;}}"
    ))
    .unwrap();
    let (name, ty) = module
        .program()
        .contracts
        .value_validators
        .iter()
        .next()
        .unwrap();
    let invalid =
        eval::Value::from_program_json(&serde_json::json!([{"x":99}]), ty, module.program())
            .unwrap();
    assert_eq!(
        eval::call(module.program(), name, vec![invalid], &mut 100000).unwrap(),
        eval::Value::Bool(false)
    );
    let mut p = module.program().clone();
    p.functions
        .iter_mut()
        .find(|f| &f.name == name)
        .unwrap()
        .body = Expr::Bool(true);
    assert!(CheckedModule::from_source(p).is_err());
}

#[test]
fn recursive_raw_validators_check_every_finite_nested_value_without_self_assumptions() {
    let source = format!("{SMALL}record Node{{payload:Small,children:List<Node>,}}fn identity(node:Node)->Node{{return node;}}fn payload(node:Node)->Small{{return node.payload;}}");
    let module = checked(&source).unwrap();
    let ty = Type::Named("Node".into());
    let valid = serde_json::json!({"payload":{"x":1},"children":[{"payload":{"x":2},"children":[]}]});
    let invalid = serde_json::json!({"payload":{"x":1},"children":[{"payload":{"x":99},"children":[]}]});
    let (validator, _) = module.program().contracts.value_validators.iter().find(|(_,t)| *t==&ty).unwrap();
    assert!(!module.program().contracts.inferred.contains_key(validator));
    for (value, expected) in [(valid.clone(),true),(invalid.clone(),false)] {
        let input = eval::Value::from_program_json(&value,&ty,module.program()).unwrap();
        assert_eq!(eval::call_checked(&module,validator,vec![input],&mut 100000).unwrap(),eval::Value::Bool(expected));
    }
    let bad = eval::Value::from_program_json(&invalid,&ty,module.program()).unwrap();
    assert_eq!(eval::call_checked(&module,"identity",vec![bad],&mut 100000).unwrap_err(),"contract precondition failed");
    let good = eval::Value::from_program_json(&valid,&ty,module.program()).unwrap();
    assert_eq!(eval::call_checked(&module,"payload",vec![good.clone()],&mut 100000).unwrap().json(),serde_json::json!({"x":1}));
    assert_eq!(eval::call_checked(&module,"identity",vec![good.clone()],&mut 100000).unwrap(),good);
    let mut forged = module.program().clone();
    forged.functions.iter_mut().find(|f| &f.name==validator).unwrap().body=Expr::Bool(true);
    assert!(CheckedModule::from_source(forged).is_err());
    let source=format!("{SMALL}record A{{payload:Small,next:Option<B>,}}record B{{next:Option<A>,}}fn identity(x:A)->A{{return x;}}");
    let module=checked(&source).unwrap();
    let bad=eval::Value::from_program_json(&serde_json::json!({"payload":{"x":1},"next":{"Some":{"next":{"Some":{"payload":{"x":99},"next":{"None":null}}}}}}),&Type::Named("A".into()),module.program()).unwrap();
    assert_eq!(eval::call_checked(&module,"identity",vec![bad],&mut 100000).unwrap_err(),"contract precondition failed");
    // A recursive validator stays an actual obligation on unknown inputs.
    // In particular, neither its nominal schema nor a symbolic fold is proof.
    let source=format!("{SMALL}record Node{{payload:Small,children:List<Node>,}}
      fn forge(xs:List<u32>)->List<Node>{{return xs.map(fn(x)=>Node{{payload:Small{{x:x}},children:[]}});}}");
    assert!(checked(&source).is_err());
}

#[test]
fn guarded_construction_and_reserved_field_names_are_hygienic() {
    checked(&format!(
        "{SMALL}
      spec fn make(x:u32)->Small requires x<10; ensures result.x==x;
      implementation construct for make {{return Small{{x:x}};}}
      fn use_it()->Small {{return make(9);}}"
    ))
    .unwrap();
    checked(
        "module fields; refined record R{result:u32,value:u32,}
      invariant value.result < 10 && value.value < 10;
      fn make()->R{return R{value:2,result:1};}",
    )
    .unwrap();
}

#[test]
fn unrelated_recursive_values_remain_supported() {
    checked(&format!(
        "{SMALL}
      record Node{{children:List<Node>,}}
      fn identity(v:Node)->Node{{return v;}}
      fn make()->Small{{return Small{{x:1}};}}"
    ))
    .unwrap();
}

#[test]
fn construction_preserves_action_field_order_and_events() {
    use ink_core::stateful::Runtime;
    let mut program = syntax::parse(include_str!("fixtures/value-invariant-order.ink")).unwrap();
    // Independently authored ordinary first-order evidence covers both normal
    // execution and version exhaustion. Core-only replay needs no database.
    contracts::attach(&mut program,
        serde_json::from_str(include_str!("fixtures/value-invariant-order-evidence.json")).unwrap()).unwrap();
    let module = CheckedModule::from_source(program).unwrap();
    let mut runtime = Runtime::new(module.into_program()).unwrap();
    let outcome = runtime
        .invoke_json("make", &serde_json::json!([]))
        .unwrap()
        .json();
    assert_eq!(outcome["result"], serde_json::json!({"first":1,"second":2}));
    assert_eq!(outcome["events"][0]["value"], serde_json::json!(2));
    assert_eq!(outcome["events"][1]["value"], serde_json::json!(1));
}
