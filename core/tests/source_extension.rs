use ink_core::{
    core::{CheckedModule, Expr, Function, Program, Type},
    planning, registry, source_extension as ext,
};
use std::collections::BTreeMap;
fn original() -> CheckedModule {
    CheckedModule::from_source(Program {
        module: "base".into(),
        functions: vec![Function {
            name: "run".into(),
            params: vec![("x".into(), Type::U32)],
            result: Type::U32,
            body: Expr::Var("x".into()),
        }],
        ..Default::default()
    })
    .unwrap()
}
fn request(m: &CheckedModule, defs: ext::Definitions) -> ext::Request {
    let payload = serde_json::to_value(defs).unwrap();
    let obj:registry::Entry=serde_json::from_value(serde_json::json!({"schema":1,"kind":"definition","semantics":ext::SEMANTICS,"dependencies":[],"payload":payload,"interface":{"parameters":{},"result":null,"effects":[],"conditions":[],"operations":[]}})).unwrap();
    // Derive metadata through the same generic registry interface as authoring.
    let mut obj = obj;
    obj.interface.operations = vec![];
    let id = registry::identity(&obj).unwrap();
    let leaf = registry::identity(&serde_json::json!({"schema":1,"entries":[id]})).unwrap();
    ext::Request {
        schema: 1,
        semantics: ext::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        extension: id.clone(),
        knowledge: registry::Bundle {
            schema: 1,
            snapshot: registry::Snapshot {
                schema: 1,
                semantics: registry::SNAPSHOT_SEMANTICS.into(),
                root: leaf,
            },
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id.clone(), obj)]),
            membership: BTreeMap::from([(
                id.clone(),
                registry::Membership {
                    entries: vec![id],
                    path: vec![],
                },
            )]),
        },
    }
}
fn definitions() -> ext::Definitions {
    ext::Definitions {
        functions: vec![Function {
            name: "derived".into(),
            params: vec![("x".into(), Type::U32)],
            result: Type::U32,
            body: Expr::Var("x".into()),
        }],
        ids: vec![],
        records: BTreeMap::from([("Scratch".into(), vec![("value".into(), Type::U32)])]),
        enums: BTreeMap::new(),
    }
}
#[test]
fn definitions_are_conservative_and_compose_without_changing_snapshots() {
    let m = original();
    let r = request(&m, definitions());
    let n = ext::check(&m, &r).unwrap();
    assert_eq!(n.program().functions.len(), 2);
    assert_eq!(n.program().functions[0].name, "run");
    assert_eq!(
        ink_core::snapshot::layout(m.program()).unwrap().roots,
        ink_core::snapshot::layout(n.program()).unwrap().roots
    );
    let p = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps: vec![planning::Step::Extension(r)],
    };
    let selected = planning::check(&m, &p).unwrap();
    assert_eq!(
        selected.original().identity().unwrap(),
        m.identity().unwrap()
    );
    assert_eq!(selected.module().identity().unwrap(), n.identity().unwrap());
}
#[test]
fn hashes_and_membership_do_not_admit_bad_definitions_or_shadowing() {
    let m = original();
    for name in ["run", "count", "ArithmeticError", "bad-name"] {
        let mut d = definitions();
        d.functions[0].name = name.into();
        assert!(ext::check(&m, &request(&m, d)).is_err(), "{name}");
    }
    let mut d = definitions();
    d.functions[0].body = Expr::Bool(true);
    assert!(ext::check(&m, &request(&m, d)).is_err());
    let mut d = definitions();
    d.functions[0].body = Expr::Call("derived".into(), vec![Expr::Var("x".into())]);
    assert!(ext::check(&m, &request(&m, d)).is_err());
    let mut r = request(&m, definitions());
    r.input_core_sha256 = "0".repeat(64);
    assert!(ext::check(&m, &r).is_err());
    let mut r = request(&m, definitions());
    r.knowledge.objects.get_mut(&r.extension).unwrap().payload["functions"][0]["result"] =
        serde_json::json!("Bool");
    assert!(ext::check(&m, &r).is_err());
}

#[test]
fn extensions_cannot_change_source_or_add_host_code() {
    let m = original();
    let mut r = request(&m, definitions());
    let object = r.knowledge.objects.get_mut(&r.extension).unwrap();
    object.payload["actions"] = serde_json::json!([]);
    let id = registry::identity(object).unwrap();
    let object = object.clone();
    r.knowledge.objects.clear();
    r.knowledge.objects.insert(id.clone(), object);
    r.extension = id.clone();
    r.knowledge.roots = vec![id.clone()];
    r.knowledge.snapshot.root =
        registry::identity(&serde_json::json!({"schema":1,"entries":[id.clone()]})).unwrap();
    r.knowledge.membership = BTreeMap::from([(
        id.clone(),
        registry::Membership {
            entries: vec![id],
            path: vec![],
        },
    )]);
    assert!(ext::check(&m, &r).unwrap_err().contains("unknown field"));
    let mut d = definitions();
    d.enums.insert("Scratch".into(), vec!["One".into()]);
    assert!(ext::check(&m, &request(&m, d)).is_err());
}
