use verified_language::{
    core::{CheckedModule, Type},
    source_routing::{self, Literal, Package, Stage, ValueRef},
    syntax,
};
fn module(s: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(s).unwrap()).unwrap()
}
fn stage(id: &str, function: &str, arguments: Vec<ValueRef>) -> Stage {
    Stage {
        id: id.into(),
        function: function.into(),
        arguments,
        backend: "opaque/backend".into(),
        domain: "opaque/domain".into(),
    }
}
fn package(m: &CheckedModule, entry: &str, stages: Vec<Stage>, output: ValueRef) -> Package {
    Package {
        schema: 1,
        semantics: source_routing::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        entry: entry.into(),
        stages,
        output,
    }
}
fn fixture() -> (CheckedModule, Package) {
    let m=module("module routed; fn bulk(xs: List<u32>, k: u32) -> u32 { return sum(xs.map(fn(x) => x * k)); } fn finish(x: u32, b: u32) -> u32 { return x + b; } fn entry(xs: List<u32>, k: u32, b: u32) -> u32 { return finish(bulk(xs, k), b); }");
    let p = package(
        &m,
        "entry",
        vec![
            stage("bulk", "bulk", vec![ValueRef::Input(0), ValueRef::Input(1)]),
            stage(
                "finish",
                "finish",
                vec![ValueRef::Stage("bulk".into()), ValueRef::Input(2)],
            ),
        ],
        ValueRef::Stage("finish".into()),
    );
    (m, p)
}
#[test]
fn actual_source_graph_and_opaque_placement_are_checked() {
    let (m, mut p) = fixture();
    let checked = source_routing::check(&m, &p).unwrap();
    assert_eq!(checked.stage_types()["bulk"], Type::U32);
    assert_eq!(checked.composition(), &m.program().functions[2].body);
    p.stages[0].backend = "not-installed".into();
    source_routing::check(&m, &p).unwrap();
    let baseline = package(
        &m,
        "entry",
        vec![stage(
            "whole",
            "entry",
            vec![ValueRef::Input(0), ValueRef::Input(1), ValueRef::Input(2)],
        )],
        ValueRef::Stage("whole".into()),
    );
    source_routing::check(&m, &baseline).unwrap();
}
#[test]
fn full_pin_types_edges_and_actual_expression_reject_forgery() {
    let (m, p) = fixture();
    let mut bad = p.clone();
    bad.input_core_sha256 = "0".repeat(64);
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[0].arguments[1] = ValueRef::Input(2);
    assert!(source_routing::check(&m, &bad)
        .unwrap_err()
        .contains("reconstruct"));
    let mut bad = p.clone();
    bad.stages[0].arguments[1] = ValueRef::Input(0);
    assert!(source_routing::check(&m, &bad)
        .unwrap_err()
        .contains("type"));
    let mut bad = p.clone();
    bad.stages[0].arguments[1] = ValueRef::Stage("finish".into());
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[1].id = "bulk".into();
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[1].arguments.pop();
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.output = ValueRef::Input(0);
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.stages.push(stage(
        "orphan",
        "finish",
        vec![ValueRef::Input(1), ValueRef::Input(2)],
    ));
    assert!(source_routing::check(&m, &bad)
        .unwrap_err()
        .contains("unused"));
    let mut changed = m.program().clone();
    changed.functions[2].body = syntax::Expr::Call(
        "finish".into(),
        vec![
            syntax::Expr::Call(
                "bulk".into(),
                vec![
                    syntax::Expr::Var("xs".into()),
                    syntax::Expr::Var("k".into()),
                ],
            ),
            syntax::Expr::Num(7),
        ],
    );
    let changed = CheckedModule::from_source(changed).unwrap();
    let mut bad = p.clone();
    bad.input_core_sha256 = changed.identity().unwrap();
    assert!(source_routing::check(&changed, &bad)
        .unwrap_err()
        .contains("reconstruct"));
    let mut bad = p.clone();
    bad.stages[0].function = "sum".into();
    assert!(source_routing::check(&m, &bad).is_err());
    let mut bad = p.clone();
    bad.stages = vec![p.stages[0].clone(); 33];
    assert!(source_routing::check(&m, &bad)
        .unwrap_err()
        .contains("limit"));
    let mut bad = p.clone();
    bad.stages[0].backend.clear();
    assert!(source_routing::check(&m, &bad).is_err());
    let mut raw = serde_json::to_value(&p).unwrap();
    raw["trusted"] = serde_json::Value::Bool(true);
    assert!(serde_json::from_value::<Package>(raw).is_err());
}
#[test]
fn width_safe_literals_identity_and_lazy_control() {
    let m=module("module literal; fn word(x: u64) -> u64 { return x; } fn entry() -> u64 { return word(18446744073709551615); } fn bit(x: Bool) -> Bool { return x; } fn yes() -> Bool { return bit(true); } fn identity(x: u32) -> u32 { return x; }");
    let mut p = package(
        &m,
        "entry",
        vec![stage(
            "word",
            "word",
            vec![ValueRef::Literal(Literal::U64(u64::MAX.to_string()))],
        )],
        ValueRef::Stage("word".into()),
    );
    source_routing::check(&m, &p).unwrap();
    for text in ["", "00", "-1", "18446744073709551616", " 1", "1.0"] {
        p.stages[0].arguments[0] = ValueRef::Literal(Literal::U64(text.into()));
        assert!(source_routing::check(&m, &p).is_err());
    }
    let p = package(
        &m,
        "yes",
        vec![stage(
            "bit",
            "bit",
            vec![ValueRef::Literal(Literal::Bool(true))],
        )],
        ValueRef::Stage("bit".into()),
    );
    source_routing::check(&m, &p).unwrap();
    source_routing::check(&m, &package(&m, "identity", vec![], ValueRef::Input(0))).unwrap();
    let m=module("module lazy; fn f(x: u32) -> u32 { return x + 1; } fn entry(x: u32, b: Bool) -> u32 { return choose(b, f(x), x); }");
    let p = package(
        &m,
        "entry",
        vec![stage("speculated", "f", vec![ValueRef::Input(0)])],
        ValueRef::Stage("speculated".into()),
    );
    assert!(source_routing::check(&m, &p)
        .unwrap_err()
        .contains("reconstruct"));
}
#[test]
fn shared_graph_expansion_is_bounded_before_cloning() {
    let m=module("module budget; fn pair(x: u32, y: u32) -> u32 { return x + y; } fn entry(x: u32) -> u32 { return x; }");
    let mut stages = vec![stage(
        "s0",
        "pair",
        vec![ValueRef::Input(0), ValueRef::Input(0)],
    )];
    for i in 1..32 {
        let prior = ValueRef::Stage(format!("s{}", i - 1));
        stages.push(stage(&format!("s{i}"), "pair", vec![prior.clone(), prior]));
    }
    let p = package(&m, "entry", stages, ValueRef::Stage("s31".into()));
    assert!(source_routing::check(&m, &p)
        .unwrap_err()
        .contains("expansion limit"));
}

#[test]
fn portable_compute_requires_a_distinct_observation_contract() {
    let m=module("module portable; fn flag(x: f32) -> Bool { return x > 0.0; } fn entry(x: f32) -> Bool { return flag(x); }");
    assert_eq!(m.semantics(), verified_language::core::COMPUTE_SEMANTICS);
    let p = package(
        &m,
        "entry",
        vec![stage("flag", "flag", vec![ValueRef::Input(0)])],
        ValueRef::Stage("flag".into()),
    );
    assert!(source_routing::check(&m, &p)
        .unwrap_err()
        .contains("observation contract"));
}
