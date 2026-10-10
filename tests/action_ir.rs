use serde_json::json;
use verified_language::{
    action_ir::{CheckedActions, ExprType, Kind},
    core::CheckedModule,
    stateful::{Runtime, Value},
    syntax::parse,
};
const APP: &str = include_str!("../examples/action-control.ink");
fn module() -> CheckedModule {
    CheckedModule::from_source(parse(APP).unwrap()).unwrap()
}

#[test]
fn typed_trees_resolve_scopes_callbacks_order_and_abrupt_exits() {
    let module = module();
    let ir = CheckedActions::elaborate(&module).unwrap();
    let bytes = ir.bytes().unwrap();
    assert_eq!(ir.source_identity(), module.identity().unwrap());
    assert!(!String::from_utf8(bytes.clone())
        .unwrap()
        .contains("\"Unknown\""));
    assert_eq!(
        ir.identity().unwrap(),
        CheckedActions::from_bytes(&module, &bytes)
            .unwrap()
            .identity()
            .unwrap()
    );
    for (i, a) in module.program().actions.iter().enumerate() {
        let body = ir.action(i).unwrap();
        if a.name == "record_order" {
            assert!(body.nodes.iter().any(|n|matches!(&n.kind,Kind::Record{name,fields} if name=="Pair" && fields.iter().map(|(i,_)|*i).collect::<Vec<_>>()==[1,0])));
        }
        if a.name == "ignore" {
            assert!(body
                .nodes
                .iter()
                .any(|n| matches!(n.kind, Kind::ChangeCall { .. })));
        }
        if a.name == "short_circuit" {
            assert!(body
                .nodes
                .iter()
                .any(|n| matches!(n.kind, Kind::And { .. })));
            assert!(body.nodes.iter().any(|n| matches!(n.kind, Kind::Or { .. })));
        }
        if a.name == "contextual_none" {
            assert!(body.nodes.iter().any(|n|matches!(&n.ty,ExprType::Lambda{parameter,result} if *parameter==verified_language::core::Type::U32 && *result==verified_language::core::Type::Option(Box::new(verified_language::core::Type::U32)))));
        }
        if a.name == "constrained_none" {
            assert!(body.nodes.iter().any(|n|matches!(&n.ty,ExprType::Lambda{parameter,..} if *parameter==verified_language::core::Type::U64)));
        }
    }
    let execution = ir.execution().unwrap();
    for action in execution.actions() {
        // Retained trees outlive temporary Arc clones without changing judgments.
        let owned = action.clone();
        assert_eq!(owned.name, action.name);
    }
}

#[test]
fn altered_types_effect_calls_references_and_control_flow_cannot_forge_a_witness() {
    let module = module();
    let ir = CheckedActions::elaborate(&module).unwrap();
    let original: serde_json::Value = serde_json::from_slice(&ir.bytes().unwrap()).unwrap();
    let edits: Vec<Box<dyn Fn(&mut serde_json::Value)>> = vec![
        Box::new(|v| v["schema"] = json!(2)),
        Box::new(|v| v["semantics"] = json!("invented")),
        Box::new(|v| v["source"] = json!("0".repeat(64))),
        Box::new(|v| v["trusted"] = json!(true)),
        Box::new(|v| v["actions"][0]["nodes"][0]["ty"] = json!({"Value":"U64"})),
        Box::new(|v| v["actions"][0]["nodes"][0]["kind"] = json!({"Local":99999})),
        Box::new(|v| v["actions"][0]["instructions"][0]["If"]["condition"] = json!(99999)),
        Box::new(|v| {
            let branch = &mut v["actions"][0]["instructions"][0]["If"];
            let yes = branch["on_true"].clone();
            branch["on_true"] = branch["on_false"].clone();
            branch["on_false"] = yes;
        }),
        Box::new(|v| {
            for a in v["actions"].as_array_mut().unwrap() {
                for n in a["nodes"].as_array_mut().unwrap() {
                    if let Some(call) = n["kind"].get("ChangeCall") {
                        n["kind"] = json!({"QueryCall":call.clone()});
                        return;
                    }
                }
            }
            panic!("missing change call");
        }),
    ];
    for edit in edits {
        let mut value = original.clone();
        edit(&mut value);
        assert!(CheckedActions::from_bytes(&module, &serde_json::to_vec(&value).unwrap()).is_err());
    }
    let mut other = module.program().clone();
    other.functions[0].name = "other_pair".into();
    // A different complete source also fails even if action syntax stays equal.
    other.functions.push(verified_language::core::Function {
        name: "pair".into(),
        ..module.program().functions[0].clone()
    });
    let other = CheckedModule::from_source(other).unwrap();
    assert!(CheckedActions::from_bytes(&other, &ir.bytes().unwrap()).is_err());
    assert!(CheckedActions::from_bytes(
        &module,
        &vec![b' '; verified_language::core::MAX_BYTES + 1]
    )
    .is_err());
}

#[test]
fn execution_uses_checked_types_for_effectful_empty_sum_and_preserves_snapshots() {
    let p = module().into_program();
    let mut rt = Runtime::new(p.clone()).unwrap();
    assert_eq!(
        rt.action_ir().source_identity(),
        CheckedModule::from_source(p).unwrap().identity().unwrap()
    );
    rt.invoke("create", vec![]).unwrap();
    let order = rt.invoke("record_order", vec![]).unwrap();
    assert_eq!(order.result.json(), json!({"Ok":{"a":10,"b":8}}));
    assert_eq!(
        order
            .events
            .iter()
            .map(|e| e.value.json())
            .collect::<Vec<_>>(),
        [json!(8), json!(10)]
    );
    let args = rt.invoke("argument_order", vec![]).unwrap();
    assert_eq!(args.result.json(), json!({"Ok":{"a":13,"b":17}}));
    let fallback = rt.invoke("eager_fallback", vec![]).unwrap();
    assert_eq!(fallback.events[0].value, Value::U32(99));
    let before = rt.checkpoint_portable().unwrap();
    for call in ["ignore", "capture"] {
        let failed = rt.invoke(call, vec![]).unwrap();
        assert!(!failed.committed);
        assert!(failed.events.is_empty());
        assert_eq!(rt.checkpoint_portable().unwrap(), before);
    }
    assert!(rt
        .invoke("short_circuit", vec![])
        .unwrap()
        .events
        .is_empty());
    assert_eq!(
        rt.invoke("read_tentative", vec![]).unwrap().result.json(),
        json!({"Ok":{"Int":"18"}})
    );
    assert_eq!(
        rt.invoke("sum_changed", vec![]).unwrap().result,
        Value::Result(true, Box::new(Value::U32(0)))
    );
    assert_eq!(
        rt.invoke("contextual_none", vec![]).unwrap().result,
        Value::Option(None)
    );
    assert_eq!(
        rt.invoke("constrained_none", vec![]).unwrap().result,
        Value::Option(None)
    );
    assert!(
        rt.invoke("discarded_constructors", vec![])
            .unwrap()
            .committed
    );
    let bytes = rt.checkpoint_portable().unwrap();
    let mut restored = Runtime::restore_portable(rt.program().clone(), &bytes).unwrap();
    assert_eq!(
        restored.invoke("total_query", vec![]).unwrap().json(),
        rt.invoke("total_query", vec![]).unwrap().json()
    );
    assert_eq!(restored.checkpoint_portable().unwrap(), bytes);
}

#[test]
fn dead_code_remains_in_the_tree_and_still_needs_type_and_effect_checks() {
    for source in [
        "module bad; query q()->u32{return 0; missing();}",
        "module bad; query q(b:Bool)->u32{if b{return 1;}else{return 2;} emit absent(3);}",
    ] {
        assert!(CheckedModule::from_source(parse(source).unwrap()).is_err());
    }
    let module = CheckedModule::from_source(
        parse("module valid;query q()->u32{return 0;let n:u32=1;return n;}").unwrap(),
    )
    .unwrap();
    let ir = CheckedActions::elaborate(&module).unwrap();
    assert_eq!(ir.action(0).unwrap().instructions.len(), 3);
    assert_eq!(
        Runtime::new(module.into_program())
            .unwrap()
            .invoke("q", vec![])
            .unwrap()
            .result,
        Value::U32(0)
    );
}
