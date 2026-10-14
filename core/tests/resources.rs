use ink_core::{
    core::CheckedModule,
    planning, registry,
    resources::{self, Admission, Plan, Release},
    source_routing::{self, Package, Stage, ValueRef},
    syntax::parse,
};
fn fixture() -> (CheckedModule, Package, Plan) {
    let m=CheckedModule::from_source(parse("module resource;fn first(x:u32)->u32{return x+1;}fn second(x:u32)->u32{return x*2;}fn entry(x:u32)->u32{return second(first(x));}").unwrap()).unwrap();
    let stage = |id: &str, function: &str, arg| Stage {
        id: id.into(),
        function: function.into(),
        backend: "rust".into(),
        domain: "cpu".into(),
        arguments: vec![arg],
    };
    let graph = Package {
        schema: 1,
        semantics: source_routing::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        entry: "entry".into(),
        stages: vec![
            stage("a", "first", ValueRef::Input(0)),
            stage("b", "second", ValueRef::Stage("a".into())),
        ],
        output: ValueRef::Stage("b".into()),
    };
    let plan = Plan {
        schema: 1,
        semantics: resources::SEMANTICS.into(),
        route_sha256: registry::identity(&graph).unwrap(),
        releases: vec![Release {
            after: "b".into(),
            values: vec!["a".into()],
            inputs: vec![0],
        }],
        admission: Some(Admission {
            max_pending: 2,
            max_pending_bytes: 1024,
        }),
    };
    (m, graph, plan)
}
#[test]
fn release_requires_actual_final_use_and_exact_graph() {
    let (m, g, p) = fixture();
    let graph = source_routing::check(&m, &g).unwrap();
    resources::check(&graph, &p).unwrap();
    let mut bad = p.clone();
    bad.releases[0].inputs.push(99);
    assert!(resources::check(&graph, &bad).is_err());
    let mut bad = p.clone();
    bad.releases[0].after = "a".into();
    assert!(resources::check(&graph, &bad).is_err());
    let mut bad = p.clone();
    bad.releases[0].values.push("b".into());
    assert!(resources::check(&graph, &bad).is_err());
    let mut bad = p.clone();
    bad.route_sha256 = "0".repeat(64);
    assert!(resources::check(&graph, &bad).is_err());
    let mut bad = p.clone();
    bad.admission.as_mut().unwrap().max_pending = 0;
    assert!(resources::check(&graph, &bad).is_err());
    let mut bad = p.clone();
    bad.releases[0].values.push("a".into());
    assert!(resources::check(&graph, &bad).is_err());
}
#[test]
fn replay_and_replacing_route_invalidates_resources() {
    let (m, g, p) = fixture();
    let route = planning::Step::Routing(planning::Route {
        package: g,
        equivalence: None,
    });
    let mut packet = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps: vec![route.clone(), planning::Step::Resources(p)],
    };
    assert!(planning::check(&m, &packet).unwrap().resources().is_some());
    packet.steps.push(route);
    assert!(planning::check(&m, &packet).unwrap().resources().is_none());
}
