use ink_core::{core::CheckedModule, physical, record_codec, registry, syntax::parse};
fn layout(module: &CheckedModule, name: &str) -> ink_core::record_codec::Layout {
    use ink_core::{
        logic::{self, Sort, Term},
        registry,
    };
    let schema = ink_core::record_codec::schema(module, name).unwrap();
    let var = |n: &str| Term::Var(n.into());
    let call = |f: &str, x: Term| Term::Call {
        function: f.into(),
        arguments: vec![x],
    };
    let round = |x: Term| call(&schema.decode, call(&schema.encode, x));
    let wrapped = var("wrapped");
    let payload = var("payload");
    let node = Term::Construct {
        datatype: schema.wrapper.clone(),
        constructor: 0,
        arguments: vec![payload.clone()],
    };
    let mut objects = schema.entries.clone();
    let mut roots = vec![];
    for declaration in [
        logic::Declaration::Theorem {
            params: vec![("wrapped".into(), Sort::Data(schema.wrapper.clone()))],
            conditions: vec![],
            from: round(wrapped.clone()),
            to: wrapped.clone(),
            proof: logic::Proof::Cases {
                variable: Some("wrapped".into()),
                scrutinee: None,
                from: round(wrapped.clone()),
                to: wrapped,
                cases: vec![logic::Case {
                    bindings: vec!["payload".into()],
                    proof: logic::Proof::Convert {
                        from: round(node.clone()),
                        to: node,
                    },
                }],
            },
        },
        logic::Declaration::Theorem {
            params: vec![("payload".into(), schema.payload.clone())],
            conditions: vec![],
            from: call(&schema.encode, call(&schema.decode, payload.clone())),
            to: payload.clone(),
            proof: logic::Proof::Convert {
                from: call(&schema.encode, call(&schema.decode, payload.clone())),
                to: payload,
            },
        },
    ] {
        let entry = registry::Entry::from_declaration(
            &declaration,
            schema.entries.keys().cloned().collect(),
        )
        .unwrap();
        let id = registry::identity(&entry).unwrap();
        objects.insert(id.clone(), entry);
        roots.push(id);
    }
    let roundtrip = roots[0].clone();
    let inverse = roots[1].clone();
    roots.sort();
    let ids = objects.keys().cloned().collect::<Vec<_>>();
    let bundle:registry::Bundle=serde_json::from_value(serde_json::json!({"schema":1,"snapshot":{"schema":1,"semantics":registry::SNAPSHOT_SEMANTICS,"root":registry::identity(&serde_json::json!({"schema":1,"entries":ids})).unwrap()},"roots":roots,"objects":objects,"membership":ids.iter().map(|id|(id.clone(),serde_json::json!({"entries":ids,"path":[]}))).collect::<std::collections::BTreeMap<_,_>>()})).unwrap();
    ink_core::record_codec::Layout {
        record: name.into(),
        knowledge: bundle,
        roundtrip,
        inverse,
    }
}
#[test]
fn codecs_bind_source_shapes_and_require_both_unconditional_equalities() {
    let module=CheckedModule::from_source(parse("module codecs;record Text{value:String,} record Exact{value:Int,} record Child{data:List<u32>,flag:Bool,} record Wrap{value:Child,} enum Tree{Leaf(u32),Branch(List<Tree>),} record Root{value:Tree,} fn identity(x:Wrap)->Wrap{return x;}").unwrap()).unwrap();
    for name in ["Text", "Exact", "Wrap", "Root"] {
        let l = layout(&module, name);
        record_codec::check(&module, &l).unwrap();
        let mut wrong = l.clone();
        wrong.roundtrip = wrong.inverse.clone();
        assert!(record_codec::check(&module, &wrong).is_err());
        let mut wrong = l.clone();
        wrong.inverse = wrong.roundtrip.clone();
        assert!(record_codec::check(&module, &wrong).is_err());
        let mut forged = l.clone();
        let mut entry = forged.knowledge.objects.remove(&l.roundtrip).unwrap();
        entry.payload["declaration"]["Theorem"]["proof"] = serde_json::json!({"Hypothesis":0});
        let id = registry::identity(&entry).unwrap();
        forged.knowledge.objects.insert(id.clone(), entry);
        forged.roundtrip = id.clone();
        forged.knowledge.roots = vec![id, forged.inverse.clone()];
        forged.knowledge.roots.sort();
        let ids = forged.knowledge.objects.keys().cloned().collect::<Vec<_>>();
        forged.knowledge.snapshot.root =
            registry::identity(&serde_json::json!({"schema":1,"entries":ids})).unwrap();
        forged.knowledge.membership = ids
            .iter()
            .map(|id| {
                (
                    id.clone(),
                    registry::Membership {
                        entries: ids.clone(),
                        path: vec![],
                    },
                )
            })
            .collect();
        assert!(registry::CheckedBundle::check(&forged.knowledge).is_ok());
        assert!(record_codec::check(&module, &forged).is_err());
    }
    assert!(record_codec::schema(&module, "Child").is_err());
    assert!(record_codec::schema(&module, "Missing").is_err());
    let l = layout(&module, "Wrap");
    let mut p:physical::Plan=serde_json::from_value(serde_json::json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"record_elisions":[l]})).unwrap();
    physical::check(&module, None, &p).unwrap();
    p.input_core_sha256 = "0".repeat(64);
    assert!(physical::check(&module, None, &p).is_err());
    p.input_core_sha256 = module.identity().unwrap();
    p.record_elisions.push(p.record_elisions[0].clone());
    assert!(physical::check(&module, None, &p).is_err());
}
