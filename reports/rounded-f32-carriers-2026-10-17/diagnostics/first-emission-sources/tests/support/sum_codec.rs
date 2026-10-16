// Test-only codec authoring. All layout proposals undergo normal proof replay.
use ink_core::{core::CheckedModule,logic::{self,Sort,Term},registry,sum_codec::{self,Schema},syntax::Type};
// Test authoring is separate from emission. Admission replays both ordinary
// equality proofs over the compiler's exact exported codec declarations.
fn var(name: &str) -> Term {
    Term::Var(name.into())
}
fn call(name: &str, argument: Term) -> Term {
    Term::Call {
        function: name.into(),
        arguments: vec![argument],
    }
}
fn node(datatype: &str, constructor: usize, argument: Term) -> Term {
    Term::Construct {
        datatype: datatype.into(),
        constructor,
        arguments: vec![argument],
    }
}
fn round(schema: &Schema, value: Term) -> Term {
    call(&schema.decode, call(&schema.encode, value))
}
fn embed(schema: &Schema, at: usize, mut value: Term) -> Term {
    for index in (0..at).rev() {
        value = node(&schema.source_chain[index], 1, value);
    }
    value
}
fn source_cases(schema: &Schema, at: usize, variable: &str) -> logic::Proof {
    let value = embed(schema, at, var(variable));
    let leaf = format!("leaf{at}");
    let tail = format!("tail{at}");
    let left = embed(schema, at, node(&schema.source_chain[at], 0, var(&leaf)));
    let right = embed(schema, at, node(&schema.source_chain[at], 1, var(&tail)));
    let right_proof = if at + 1 == schema.source_chain.len() {
        logic::Proof::Convert {
            from: round(schema, right.clone()),
            to: right,
        }
    } else {
        source_cases(schema, at + 1, &tail)
    };
    logic::Proof::Cases {
        variable: Some(variable.into()),
        scrutinee: None,
        from: round(schema, value.clone()),
        to: value,
        cases: vec![
            logic::Case {
                bindings: vec![leaf],
                proof: logic::Proof::Convert {
                    from: round(schema, left.clone()),
                    to: left,
                },
            },
            logic::Case {
                bindings: vec![tail],
                proof: right_proof,
            },
        ],
    }
}
pub fn layout(module: &CheckedModule, ty: &Type) -> sum_codec::Layout {
    let schema = sum_codec::schema(module, ty).unwrap();
    let source = var("source");
    let flat = var("flat");
    let inverse = |value: Term| call(&schema.encode, call(&schema.decode, value));
    let cases = (0..schema.alternatives.len())
        .map(|index| {
            let name = format!("leaf{index}");
            let value = node(&schema.flat, index, var(&name));
            logic::Case {
                bindings: vec![name],
                proof: logic::Proof::Convert {
                    from: inverse(value.clone()),
                    to: value,
                },
            }
        })
        .collect();
    let declarations = [
        logic::Declaration::Theorem {
            params: vec![("source".into(), schema.source.clone())],
            conditions: vec![],
            from: round(&schema, source.clone()),
            to: source,
            proof: source_cases(&schema, 0, "source"),
        },
        logic::Declaration::Theorem {
            params: vec![("flat".into(), Sort::Data(schema.flat.clone()))],
            conditions: vec![],
            from: inverse(flat.clone()),
            to: flat.clone(),
            proof: logic::Proof::Cases {
                variable: Some("flat".into()),
                scrutinee: None,
                from: inverse(flat.clone()),
                to: flat,
                cases,
            },
        },
    ];
    let mut objects = schema.entries.clone();
    let mut roots = vec![];
    for declaration in declarations {
        let entry = registry::Entry::from_declaration(
            &declaration,
            schema.entries.keys().cloned().collect(),
        )
        .unwrap();
        let ident = registry::identity(&entry).unwrap();
        objects.insert(ident.clone(), entry);
        roots.push(ident);
    }
    let roundtrip = roots[0].clone();
    let inverse = roots[1].clone();
    roots.sort();
    let ids = objects.keys().cloned().collect::<Vec<_>>();
    assert!(ids.len() <= 64);
    let knowledge=serde_json::from_value(serde_json::json!({
        "schema":1,"snapshot":{"schema":1,"semantics":registry::SNAPSHOT_SEMANTICS,
            "root":registry::identity(&serde_json::json!({"schema":1,"entries":ids})).unwrap()},
        "roots":roots,"objects":objects,
        "membership":ids.iter().map(|id|(id.clone(),serde_json::json!({"entries":ids,"path":[]}))).collect::<std::collections::BTreeMap<_,_>>()
    })).unwrap();
    sum_codec::Layout {
        sum_type: ty.clone(),
        knowledge,
        roundtrip,
        inverse,
    }
}

