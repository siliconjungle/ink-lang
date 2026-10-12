//! Context mechanisms are independent of the knowledge checkout and backends.
use ink_core::{
    core::{CheckedModule, Type},
    definition_context::DefinitionContext,
    eval::{self, Value},
    laws::{self, Catalogue, CheckedCatalogue, Law, Proof},
    optimisation::{self, Package, Site},
    registry,
    semantic::{self as s, Node},
    syntax,
};
use serde_json::json;
use std::collections::BTreeMap;

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(&format!("module Context; {source}")).unwrap())
        .unwrap()
}
fn id(law: &Law) -> String {
    registry::identity(&registry::Entry::from_law(law).unwrap()).unwrap()
}
fn catalogue(laws: Vec<Law>) -> Catalogue {
    let objects: BTreeMap<_, _> = laws.into_iter().map(|law| (id(&law), law)).collect();
    Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: objects.keys().cloned().collect(),
        objects,
    }
}
fn package(m: &CheckedModule, c: &Catalogue, applications: Vec<Site>) -> Package {
    Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: registry::from_catalogue(c).unwrap(),
        applications,
        action_replacement: None,
    }
}
fn normalize(m: &CheckedModule, from: &str, to: s::Term, roots: &[&str]) -> Law {
    let f = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == from)
        .unwrap();
    Law {
        types: vec![],
        assumptions: vec![],
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        params: f
            .params
            .iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect(),
        conditions: vec![],
        from: optimisation::subject(m).unwrap().functions[from].clone(),
        to,
        proof: Proof::Normalize,
        dependencies: vec![],
        definition_context: Some(
            DefinitionContext::capture(m, &roots.iter().map(|n| n.to_string()).collect::<Vec<_>>())
                .unwrap(),
        ),
    }
}
fn site(law: &Law, function: &str) -> Site {
    Site {
        function: function.into(),
        path: vec![],
        law: id(law),
        arguments: law
            .params
            .iter()
            .map(|(n, s)| (n.clone(), s::free(s.clone(), n)))
            .collect(),
        premises: vec![],
    }
}

#[test]
fn portable_admission_requires_exact_original_definitions_at_application() {
    let m = module("fn leaf(x:u32)->u32{return x+1;} fn helper(x:u32)->u32{return leaf(x);} pub fn entry(x:u32)->u32{return helper(x);}");
    let x = s::free(s::value(Type::U32), "x");
    let to = s::op(
        x.sort.clone(),
        "binary:+",
        vec![x.clone(), s::word(Type::U32, 1)],
    );
    let law = normalize(&m, "entry", to, &["helper"]);
    let c = catalogue(vec![law.clone()]);
    let dummy = module("fn identity(x:u32)->u32{return x;}");
    let admitted = CheckedCatalogue::check(&c, dummy.program()).unwrap();
    assert!(admitted.require_applicable().is_err());
    registry::CheckedBundle::check(&registry::from_catalogue(&c).unwrap())
        .unwrap()
        .verify(dummy.program())
        .unwrap();
    let result = optimisation::check(&m, &package(&m, &c, vec![site(&law, "entry")])).unwrap();
    for x in [0, u32::MAX, 17] {
        assert_eq!(
            eval::call(
                result.module().program(),
                "entry",
                vec![Value::U32(x)],
                &mut 10000
            )
            .unwrap(),
            Value::U32(x.wrapping_add(1))
        );
    }
    for source in [
        "fn leaf(x:u32)->u32{return x+2;} fn helper(x:u32)->u32{return leaf(x);} fn entry(x:u32)->u32{return helper(x);}",
        "fn leaf(x:u32)->u32{return x+1;} fn helper(x:u32)->u32{return leaf(x)+1;} fn entry(x:u32)->u32{return helper(x);}",
        "fn leaf(x:u32)->u32{return x+1;} fn helper(y:u32)->u32{return leaf(y);} fn entry(x:u32)->u32{return helper(x);}",
        "fn leaf(x:u64)->u64{return x+1;} fn helper(x:u64)->u64{return leaf(x);} fn entry(x:u32)->u32{return x;}",
        "fn entry(x:u32)->u32{return x+1;}",
    ] {
        let changed = module(source);
        // Rebinding package input identity is not enough to make stale defs valid.
        assert!(optimisation::check(&changed,&package(&changed,&c,vec![])).is_err(),"{source}");
        assert!(optimisation::SelectionChecker::new(changed,registry::from_catalogue(&c).unwrap()).is_err());
    }
    let unrelated = module("fn leaf(x:u32)->u32{return x+1;} fn helper(x:u32)->u32{return leaf(x);} fn entry(x:u32)->u32{return helper(x);} fn unrelated(x:u32)->u32{return x*99;}");
    optimisation::check(
        &unrelated,
        &package(&unrelated, &c, vec![site(&law, "entry")]),
    )
    .unwrap();
}

#[test]
fn rehashed_false_contexts_and_unbound_dependencies_have_no_authority() {
    let m = module("fn helper(x:u32)->u32{return x+1;} fn entry(x:u32)->u32{return helper(x);}");
    let x = s::free(s::value(Type::U32), "x");
    let good = normalize(
        &m,
        "entry",
        s::op(
            x.sort.clone(),
            "binary:+",
            vec![x.clone(), s::word(Type::U32, 1)],
        ),
        &["helper"],
    );
    let mut wrong = good.clone();
    wrong.to = x.clone();
    assert_ne!(id(&good), id(&wrong));
    assert!(CheckedCatalogue::check(&catalogue(vec![wrong]), &Default::default()).is_err());
    let mut forged = good.clone();
    let d = &mut forged
        .definition_context
        .as_mut()
        .unwrap()
        .definitions
        .get_mut("helper")
        .unwrap();
    d.definition.body = s::op(
        x.sort.clone(),
        "binary:+",
        vec![x.clone(), s::word(Type::U32, 2)],
    );
    // A correctly hashed, typed changed definition still must prove its equation.
    d.sha256 = registry::identity(&d.definition).unwrap();
    assert!(CheckedCatalogue::check(&catalogue(vec![forged]), &Default::default()).is_err());
    let mut no_context = good.clone();
    no_context.definition_context = None;
    assert!(CheckedCatalogue::check(&catalogue(vec![no_context.clone()]), m.program()).is_err());
    no_context.proof = Proof::Use {
        types: Default::default(),
        assumptions: vec![],
        law: id(&good),
        arguments: BTreeMap::from([("x".into(), x)]),
        premises: vec![],
    };
    no_context.dependencies = vec![id(&good)];
    assert!(CheckedCatalogue::check(&catalogue(vec![good, no_context]), m.program()).is_err());
}

fn map_fusion(t: Type) -> Law {
    let s = s::value(t);
    let ls = s::value(Type::List(Box::new(match &s {
        s::Sort::Value(t) => t.clone(),
        _ => unreachable!(),
    })));
    let fs = s::arrow(s.clone(), s.clone());
    let xs = s::free(ls.clone(), "xs");
    let f = s::free(fs.clone(), "f");
    let g = s::free(fs.clone(), "g");
    let from = s::op(
        ls.clone(),
        "method:map",
        vec![
            s::op(ls.clone(), "method:map", vec![xs.clone(), f.clone()]),
            g.clone(),
        ],
    );
    let to = s::op(
        ls,
        "method:map",
        vec![
            xs,
            s::lambda(
                s.clone(),
                s::op(
                    s.clone(),
                    "apply",
                    vec![
                        g,
                        s::op(s.clone(), "apply", vec![f, s::term(s, Node::Bound(0))]),
                    ],
                ),
            ),
        ],
    );
    Law {
        types: vec![],
        assumptions: vec![],
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        params: BTreeMap::from([
            ("xs".into(), from.sort.clone()),
            ("f".into(), fs.clone()),
            ("g".into(), fs),
        ]),
        conditions: vec![],
        from,
        to,
        proof: Proof::Induction {
            variable: "xs".into(),
            names: vec!["head".into(), "tail".into()],
            base: Box::new(Proof::Normalize),
            step: Box::new(Proof::Normalize),
        },
        dependencies: vec![],
        definition_context: None,
    }
}

#[test]
fn generic_laws_apply_inside_helpers_and_contextual_composed_callers() {
    for (spelling, ty, values, ks) in [
        (
            "u32",
            Type::U32,
            json!([0, 1, 7, u32::MAX]),
            vec![json!(0), json!(7), json!(u32::MAX)],
        ),
        (
            "i32",
            Type::I32,
            json!([i32::MIN, -1, 0, i32::MAX]),
            vec![json!(0), json!(-7), json!(i32::MAX)],
        ),
        (
            "u64",
            Type::U64,
            json!([0, 9007199254740993u64, u64::MAX]),
            vec![json!(0), json!(7), json!(u64::MAX)],
        ),
        (
            "f32",
            Type::F32,
            json!([{"F32Bits":0x80000000u32},{"F32Bits":0x7fc01234u32},{"F32Bits":0x7f800000u32},{"F32Bits":0xff800000u32},1.25]),
            vec![
                json!({"F32Bits":0x80000000u32}),
                json!({"F32Bits":0x7fc54321u32}),
                json!({"F32Bits":0x7f800000u32}),
                json!(7.0),
            ],
        ),
    ] {
        for held_out in [false, true] {
            let source = if held_out {
                format!("fn calibrate(x:{spelling},k:{spelling})->{spelling}{{let k:{spelling}=x+k; return choose(x<k,k,x-k);}} fn adjust(x:{spelling},k:{spelling})->{spelling}{{let x:{spelling}=x*k; return choose(x<k,x-k,x+k);}} fn helper(xs:List<{spelling}>,k:{spelling})->List<{spelling}>{{return xs.map(fn(x)=>calibrate(x,k)).map(fn(x)=>adjust(x,k));}} pub fn entry(xs:List<{spelling}>,k:{spelling})->List<{spelling}>{{return helper(xs,k);}}")
            } else {
                format!("fn calibrate(x:{spelling},k:{spelling})->{spelling}{{return x+k;}} fn helper(xs:List<{spelling}>,k:{spelling})->List<{spelling}>{{return xs.map(fn(x)=>calibrate(x,k)).map(fn(x)=>choose(x<k,x*7,x-k));}} pub fn entry(xs:List<{spelling}>,k:{spelling})->List<{spelling}>{{return helper(xs,k);}}")
            };
            let m = module(&source);
            let generic = map_fusion(ty.clone());
            let subject = optimisation::subject(&m).unwrap();
            let middle = subject.functions["helper"].clone();
            let args0 = s::children(&middle);
            let args1 = s::children(args0[0]);
            let arguments = BTreeMap::from([
                ("xs".into(), args1[0].clone()),
                ("f".into(), args1[1].clone()),
                ("g".into(), args0[1].clone()),
            ]);
            let target = s::substitute(&generic.to, &arguments, &mut s::Budget::new()).unwrap();
            let mut bridge = normalize(&m, "entry", target, &["helper"]);
            bridge.dependencies = vec![id(&generic)];
            bridge.proof = Proof::Trans {
                middle,
                left: Box::new(Proof::Normalize),
                right: Box::new(Proof::Use {
                    types: Default::default(),
                    assumptions: vec![],
                    law: id(&generic),
                    arguments: arguments.clone(),
                    premises: vec![],
                }),
            };
            let c = catalogue(vec![generic.clone(), bridge.clone()]);
            CheckedCatalogue::check(&c, &Default::default()).unwrap();
            let helper = optimisation::check(
                &m,
                &package(
                    &m,
                    &c,
                    vec![Site {
                        function: "helper".into(),
                        path: vec![],
                        law: id(&generic),
                        arguments,
                        premises: vec![],
                    }],
                ),
            )
            .unwrap();
            let caller =
                optimisation::check(&m, &package(&m, &c, vec![site(&bridge, "entry")])).unwrap();
            let both = optimisation::check(
                &m,
                &package(
                    &m,
                    &c,
                    vec![
                        site(&bridge, "entry"),
                        helper.package().applications[0].clone(),
                    ],
                ),
            )
            .unwrap();
            for list in [json!([]), values.clone()] {
                for k in &ks {
                    let inputs = vec![
                        Value::from_program_json(
                            &list,
                            &Type::List(Box::new(ty.clone())),
                            m.program(),
                        )
                        .unwrap(),
                        Value::from_program_json(k, &ty, m.program()).unwrap(),
                    ];
                    let original =
                        eval::call(m.program(), "entry", inputs.clone(), &mut 100000).unwrap();
                    for selected in [helper.module(), caller.module(), both.module()] {
                        assert_eq!(
                            eval::call(selected.program(), "entry", inputs.clone(), &mut 100000)
                                .unwrap(),
                            original,
                            "{spelling}"
                        );
                    }
                }
            }
            if let Ok(dir) = std::env::var("INK_CONTEXT_EVIDENCE_DIR") {
                let path = std::path::Path::new(&dir);
                std::fs::create_dir_all(path).unwrap();
                let stem = format!(
                    "{spelling}-{}",
                    if held_out { "heldout" } else { "primary" }
                );
                std::fs::write(
                    path.join(format!("{stem}-context-view.json")),
                    registry::canonical(&registry::from_catalogue(&c).unwrap()).unwrap(),
                )
                .unwrap();
                std::fs::write(
                    path.join(format!("{stem}-input.core.json")),
                    m.bytes().unwrap(),
                )
                .unwrap();
                std::fs::write(
                    path.join(format!("{stem}-selection.json")),
                    serde_json::to_vec(caller.package()).unwrap(),
                )
                .unwrap();
                std::fs::write(
                    path.join(format!("{stem}-selected.core.json")),
                    caller.module().bytes().unwrap(),
                )
                .unwrap();
            }
        }
    }
}

#[test]
fn lexical_capture_context_identity_and_context_free_bytes_are_explicit() {
    let m=module("fn helper(x:u32,k:u32)->u32{let x:u32=x+k; return choose(x<k,x,k);} fn entry(x:u32,k:u32)->u32{return helper(x,k);}");
    let helper = optimisation::subject(&m).unwrap().functions["helper"].clone();
    let good = normalize(&m, "entry", helper, &["helper"]);
    let c = catalogue(vec![good.clone()]);
    let selected = optimisation::check(&m, &package(&m, &c, vec![site(&good, "entry")])).unwrap();
    for (x, k) in [(0, 7), (u32::MAX, 7), (9, 0)] {
        let args = vec![Value::U32(x), Value::U32(k)];
        assert_eq!(
            eval::call(m.program(), "entry", args.clone(), &mut 10000).unwrap(),
            eval::call(selected.module().program(), "entry", args, &mut 10000).unwrap()
        );
    }
    let generic = map_fusion(Type::U32);
    let bytes = serde_json::to_value(registry::Entry::from_law(&generic).unwrap()).unwrap();
    assert!(bytes["payload"].get("definition_context").is_none());
    let mut tampered = good;
    tampered
        .definition_context
        .as_mut()
        .unwrap()
        .definitions
        .get_mut("helper")
        .unwrap()
        .sha256 = "0".repeat(64);
    assert!(CheckedCatalogue::check(&catalogue(vec![tampered]), &Default::default()).is_err());
}
