use std::{
    fs,
    path::Path,
    process::Command,
    sync::atomic::{AtomicUsize, Ordering},
};
use verified_language::{
    core::CheckedModule,
    equality::{self, Proof},
    eval::{self, Value},
    implementation, native,
    syntax::{self, Expr, Type},
};
static NEXT: AtomicUsize = AtomicUsize::new(0);
fn external_apply(program: &mut syntax::Program) -> Vec<String> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let temp = std::env::temp_dir().join(format!(
        "ink-scalar-search-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    fs::create_dir_all(&temp).unwrap();
    fs::write(
        temp.join("input.json"),
        CheckedModule::from_source(program.clone())
            .unwrap()
            .bytes()
            .unwrap(),
    )
    .unwrap();
    let result = Command::new("python3")
        .arg(root.join("planner/research/rewrite_search.py"))
        .arg(temp.join("input.json"))
        .args(["--core", "--compiler", env!("CARGO_BIN_EXE_ink"), "--rules"])
        .arg(root.join("knowledge/research/scalar-logic/rewrite-index.json"))
        .arg("--output-dir")
        .arg(temp.join("package"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let evidence =
        implementation::apply_replacement(program, &temp.join("package/replacement.json")).unwrap();
    let names = evidence
        .equality
        .checked_proposals
        .iter()
        .map(|p| p.function.clone())
        .collect();
    fs::remove_dir_all(temp).unwrap();
    names
}
fn var(s: &str) -> Expr {
    Expr::Var(s.into())
}
fn bin(op: &str, a: Expr, b: Expr) -> Expr {
    Expr::Binary(op.into(), Box::new(a), Box::new(b))
}
// Archived proof bytes are mathematical fuzz fixtures, not a legacy loader.
#[derive(serde::Deserialize)]
struct ScalarFixture {
    params: Vec<(String, Type)>,
    from: Expr,
    to: Expr,
    proof: Proof,
}
fn objects() -> Vec<ScalarFixture> {
    let lock: serde_json::Value =
        serde_json::from_slice(&fs::read("knowledge/research/boolean/lock.json").unwrap()).unwrap();
    lock["objects"]
        .as_array()
        .unwrap()
        .iter()
        .map(|id| {
            serde_json::from_slice(
                &fs::read(format!(
                    "knowledge/research/boolean/objects/{}.json",
                    id.as_str().unwrap()
                ))
                .unwrap(),
            )
            .unwrap()
        })
        .collect()
}

#[test]
fn equality_rules_validate_types_endpoints_and_case_contexts() {
    let a = Expr::Num(u64::MAX);
    let b = Expr::Num(1);
    let sum = bin("+", a, b);
    let compute = Proof::Compute {
        from: sum.clone(),
        to: Expr::Num(0),
    };
    equality::verify(&[], &sum, &Expr::Num(0), &compute).unwrap();
    let symmetric = Proof::Sym(Box::new(compute.clone()));
    equality::verify(&[], &Expr::Num(0), &sum, &symmetric).unwrap();
    let trans = Proof::Trans(Box::new(compute.clone()), Box::new(symmetric));
    equality::verify(&[], &sum, &sum, &trans).unwrap();
    let context = Proof::Binary {
        op: "==".into(),
        left: Box::new(compute),
        right: Box::new(Proof::Refl(Expr::Num(0))),
    };
    equality::verify(
        &[],
        &bin("==", sum, Expr::Num(0)),
        &bin("==", Expr::Num(0), Expr::Num(0)),
        &context,
    )
    .unwrap();
    assert!(equality::verify(
        &[],
        &Expr::Bool(true),
        &Expr::Num(1),
        &Proof::Compute {
            from: Expr::Bool(true),
            to: Expr::Num(1)
        }
    )
    .is_err());
    for mut obj in objects() {
        equality::verify(&obj.params, &obj.from, &obj.to, &obj.proof).unwrap();
        obj.to = Expr::Bool(false); // original proof must not authorize a different statement
        assert!(equality::verify(&obj.params, &obj.from, &obj.to, &obj.proof).is_err());
    }
    let mut obj = objects().remove(0);
    if let Proof::BoolCases {
        on_true, on_false, ..
    } = &mut obj.proof
    {
        *on_true = on_false.clone();
    }
    assert!(equality::verify(&obj.params, &obj.from, &obj.to, &obj.proof).is_err());
    let mut obj = objects().remove(0);
    obj.params[0].1 = Type::U64;
    assert!(equality::verify(&obj.params, &obj.from, &obj.to, &obj.proof).is_err());
    // Algebra isn't a trusted Compute rule: a producer must supply a real derivation.
    assert!(equality::verify(
        &[("x".into(), Type::U64)],
        &bin("+", var("x"), Expr::Num(0)),
        &var("x"),
        &Proof::Compute {
            from: bin("+", var("x"), Expr::Num(0)),
            to: var("x")
        }
    )
    .is_err());
    let bad = Proof::Trans(
        Box::new(Proof::Refl(Expr::Bool(false))),
        Box::new(Proof::Refl(Expr::Bool(true))),
    );
    assert!(equality::verify(&[], &Expr::Bool(false), &Expr::Bool(true), &bad).is_err());
    let mut huge = Proof::Refl(Expr::Bool(true));
    for _ in 0..140 {
        huge = Proof::Sym(Box::new(huge));
    }
    assert!(equality::verify(&[], &Expr::Bool(true), &Expr::Bool(true), &huge).is_err());
}

#[test]
fn checked_definitions_and_reused_lemmas_preserve_substitution_scope() {
    let mut context = equality::Context::default();
    let params = vec![("a".into(), Type::Bool), ("b".into(), Type::Bool)];
    context
        .define("first".into(), &params, &Type::Bool, &var("a"))
        .unwrap();
    let call = Expr::Call("first".into(), vec![var("b"), var("a")]);
    // Substitution is simultaneous: first(b,a)=b, not a.
    context
        .prove(
            "first_swapped".into(),
            &params,
            &call,
            &var("b"),
            &Proof::Refl(call.clone()),
        )
        .unwrap();
    assert!(context
        .prove(
            "wrong_swap".into(),
            &params,
            &call,
            &var("a"),
            &Proof::Refl(call.clone())
        )
        .is_err());
    let arguments = vec![Expr::Bool(true), Expr::Bool(false)];
    let proof = Proof::Use {
        theorem: "first_swapped".into(),
        arguments,
    };
    context
        .prove(
            "instantiated".into(),
            &[],
            &Expr::Bool(false),
            &Expr::Bool(false),
            &proof,
        )
        .unwrap();
    // Even an erased definition argument must be correctly typed and in scope.
    for bad in [Expr::Num(1), var("unknown")] {
        let call = Expr::Call("first".into(), vec![Expr::Bool(true), bad]);
        assert!(context
            .prove(
                "ill_typed".into(),
                &[],
                &call,
                &Expr::Bool(true),
                &Proof::Refl(call.clone())
            )
            .is_err());
    }
    assert!(context
        .define(
            "recursive".into(),
            &[],
            &Type::Bool,
            &Expr::Call("recursive".into(), vec![])
        )
        .is_err());
    assert!(context
        .prove(
            "circular".into(),
            &[],
            &Expr::Bool(false),
            &Expr::Bool(true),
            &Proof::Use {
                theorem: "circular".into(),
                arguments: vec![]
            }
        )
        .is_err());
    assert!(context
        .prove(
            "wrong_arity".into(),
            &[],
            &Expr::Bool(true),
            &Expr::Bool(true),
            &Proof::Use {
                theorem: "first_swapped".into(),
                arguments: vec![Expr::Bool(true)]
            }
        )
        .is_err());
    assert!(context
        .prove(
            "wrong_type".into(),
            &[],
            &Expr::Bool(true),
            &Expr::Bool(true),
            &Proof::Use {
                theorem: "first_swapped".into(),
                arguments: vec![Expr::Bool(true), Expr::Num(1)]
            }
        )
        .is_err());
    assert!(context
        .define("first".into(), &params, &Type::Bool, &var("b"))
        .is_err());
    assert!(context.subset(&["missing".into()]).is_err());
}

#[test]
fn conditional_theorems_cannot_escape_their_premises() {
    use equality::Equation;
    let params = vec![("a".into(), Type::Bool)];
    let condition = Equation {
        from: var("a"),
        to: Expr::Bool(true),
    };
    let mut context = equality::Context::default();
    context
        .prove_under(
            "known".into(),
            &params,
            &[condition.clone()],
            &var("a"),
            &Expr::Bool(true),
            &Proof::Hypothesis(0),
        )
        .unwrap();
    let application = Proof::UseConditional {
        theorem: "known".into(),
        arguments: vec![var("a")],
        premises: vec![Proof::Hypothesis(0)],
    };
    assert!(context
        .check(&params, &var("a"), &Expr::Bool(true), &application)
        .is_err());
    assert!(context
        .check(
            &params,
            &var("a"),
            &Expr::Bool(true),
            &Proof::Use {
                theorem: "known".into(),
                arguments: vec![var("a")]
            }
        )
        .is_err());
    assert!(context
        .check(&params, &var("a"), &Expr::Bool(true), &Proof::Hypothesis(0))
        .is_err());
    assert!(context
        .check_under(
            &params,
            &[condition.clone()],
            &var("a"),
            &Expr::Bool(true),
            &Proof::Hypothesis(1)
        )
        .is_err());
    let valid = Proof::ShortCircuit {
        op: "&&".into(),
        left: Box::new(Proof::Refl(var("a"))),
        right: Box::new(application.clone()),
    };
    context
        .check(
            &params,
            &bin("&&", var("a"), var("a")),
            &bin("&&", var("a"), Expr::Bool(true)),
            &valid,
        )
        .unwrap();
    let wrong_guard = Proof::ShortCircuit {
        op: "||".into(),
        left: Box::new(Proof::Refl(var("a"))),
        right: Box::new(application.clone()),
    };
    assert!(context
        .check(
            &params,
            &bin("||", var("a"), var("a")),
            &bin("||", var("a"), Expr::Bool(true)),
            &wrong_guard
        )
        .is_err());
    let wrong_premise = Proof::UseConditional {
        theorem: "known".into(),
        arguments: vec![var("a")],
        premises: vec![Proof::Refl(Expr::Bool(true))],
    };
    assert!(context
        .check_under(
            &params,
            &[condition.clone()],
            &var("a"),
            &Expr::Bool(true),
            &wrong_premise
        )
        .is_err());
    let cases = Proof::BoolCases {
        variable: "a".into(),
        from: var("a"),
        to: Expr::Bool(true),
        on_false: Box::new(Proof::Hypothesis(0)),
        on_true: Box::new(Proof::Hypothesis(0)),
    };
    // Cases substitute both the statement and its hypotheses, without changing indices.
    context
        .check_under(&params, &[condition], &var("a"), &Expr::Bool(true), &cases)
        .unwrap();
    let impossible = Equation {
        from: Expr::Bool(false),
        to: Expr::Bool(true),
    };
    context
        .prove_under(
            "impossible".into(),
            &[],
            &[impossible],
            &Expr::Bool(false),
            &Expr::Bool(true),
            &Proof::Hypothesis(0),
        )
        .unwrap();
    let forged = Proof::UseConditional {
        theorem: "impossible".into(),
        arguments: vec![],
        premises: vec![Proof::Compute {
            from: Expr::Bool(false),
            to: Expr::Bool(true),
        }],
    };
    assert!(context
        .check(&[], &Expr::Bool(false), &Expr::Bool(true), &forged)
        .is_err());
}

#[test]
fn conditional_database_rewrites_only_where_guard_proofs_are_available() {
    let original = syntax::parse(include_str!("../examples/conditional.lang")).unwrap();
    let mut changed = original.clone();
    assert_eq!(external_apply(&mut changed).len(), 3);
    assert_eq!(original.functions[2].body, changed.functions[2].body); // unguarded remains unchanged
    for name in ["conjunction", "disjunction"] {
        for a in [false, true] {
            for b in [false, true] {
                for c in [false, true] {
                    let args = vec![Value::Bool(a), Value::Bool(b), Value::Bool(c)];
                    assert_eq!(
                        eval::call(&original, name, args.clone(), &mut 1000).unwrap(),
                        eval::call(&changed, name, args, &mut 1000).unwrap()
                    );
                }
            }
        }
    }
    for x in [0, 1, 1 << 63, u64::MAX] {
        for limit in [0, 1, 1 << 63, u64::MAX] {
            for b in [false, true] {
                for c in [false, true] {
                    let args = vec![
                        Value::U64(x),
                        Value::U64(limit),
                        Value::Bool(b),
                        Value::Bool(c),
                    ];
                    assert_eq!(
                        eval::call(&original, "numeric", args.clone(), &mut 1000).unwrap(),
                        eval::call(&changed, "numeric", args, &mut 1000).unwrap()
                    );
                }
            }
        }
    }
    // Opposite guard and arbitrary profiles are insufficient to apply a=true.
    let mut opposite = syntax::parse(
        "module t; fn f(a: Bool,b: Bool,c: Bool)->Bool{return a || ((a && b) || c);}",
    )
    .unwrap();
    assert!(external_apply(&mut opposite).is_empty());
    // A rewritten left operand must not supply an unproved assumption about the old one.
    let mut nested = syntax::parse(
        "module t; fn f(a: Bool,b: Bool,c: Bool)->Bool{return a && ((a && b) && ((a && b) || c));}",
    )
    .unwrap();
    let before = nested.clone();
    external_apply(&mut nested);
    for a in [false, true] {
        for b in [false, true] {
            for c in [false, true] {
                let args = vec![Value::Bool(a), Value::Bool(b), Value::Bool(c)];
                assert_eq!(
                    eval::call(&before, "f", args.clone(), &mut 1000).unwrap(),
                    eval::call(&nested, "f", args, &mut 1000).unwrap()
                );
            }
        }
    }
}
