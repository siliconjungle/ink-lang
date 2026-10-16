use ink_core::core::CheckedModule;
pub fn layout(module: &CheckedModule, name: &str) -> ink_core::record_codec::Layout {
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
