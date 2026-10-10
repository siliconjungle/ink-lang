use sha2::{Digest, Sha256};
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
    implementation,
    knowledge::{self, Object},
    native,
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
fn objects() -> Vec<Object> {
    let database = knowledge::load(Path::new("knowledge/research/boolean/lock.json")).unwrap();
    database
        .lock
        .objects
        .iter()
        .map(|id| {
            serde_json::from_slice(
                &fs::read(format!("knowledge/research/boolean/objects/{id}.json")).unwrap(),
            )
            .unwrap()
        })
        .collect()
}
#[test]
fn checked_database_preserves_all_boolean_inputs_and_word_boundaries() {
    let original = syntax::parse(include_str!("../examples/boolean.lang")).unwrap();
    let mut changed = original.clone();
    assert_eq!(external_apply(&mut changed).len(), 2);
    assert_ne!(
        native::emit(&original).unwrap(),
        native::emit(&changed).unwrap()
    );
    for a in [false, true] {
        for b in [false, true] {
            let args = vec![Value::Bool(a), Value::Bool(b)];
            assert_eq!(
                eval::call(&original, "decision", args.clone(), &mut 1000).unwrap(),
                eval::call(&changed, "decision", args, &mut 1000).unwrap()
            );
        }
    }
    for x in [0, 1, 1 << 63, u64::MAX] {
        for limit in [0, 1, 1 << 63, u64::MAX] {
            let args = vec![Value::U64(x), Value::U64(limit)];
            assert_eq!(
                eval::call(&original, "repeated", args.clone(), &mut 1000).unwrap(),
                eval::call(&changed, "repeated", args, &mut 1000).unwrap()
            );
        }
    }
    // Calls are outside this external search producer's scalar subset.
    let mut calls = syntax::parse(
        "module t; fn f(a: Bool) -> Bool {return a;} fn g(a: Bool) -> Bool {return f(a) && f(a);}",
    )
    .unwrap();
    let mut unused =
        syntax::parse("module t; fn f(a: Bool, xs: List<u64>) -> Bool {return a && a;}").unwrap();
    assert_eq!(external_apply(&mut unused).len(), 1);
    assert_eq!(unused.functions[0].body, var("a"));
    let before = native::emit(&calls).unwrap();
    assert!(external_apply(&mut calls).is_empty());
    assert_eq!(before, native::emit(&calls).unwrap());
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
fn database_rejects_forgery_wrong_hash_and_incompatible_semantics() {
    let dir = std::env::temp_dir().join(format!("vl-knowledge-{}", std::process::id()));
    fs::create_dir_all(dir.join("objects")).unwrap();
    let mut obj = objects().remove(0);
    let install = |obj: &Object| {
        let bytes = serde_json::to_vec(obj).unwrap();
        let id = format!("{:x}", Sha256::digest(&bytes));
        fs::write(dir.join("objects").join(format!("{id}.json")), bytes).unwrap();
        let lock = knowledge::Lock {
            schema: 1,
            semantics: knowledge::SEMANTICS.into(),
            objects: vec![id.clone()],
        };
        fs::write(dir.join("lock.json"), serde_json::to_vec(&lock).unwrap()).unwrap();
        id
    };
    let id = install(&obj);
    knowledge::load(&dir.join("lock.json")).unwrap();
    fs::write(dir.join("objects").join(format!("{id}.json")), b"{}").unwrap();
    assert!(knowledge::load(&dir.join("lock.json"))
        .unwrap_err()
        .contains("hash mismatch"));
    obj.proof = Proof::Refl(obj.from.clone());
    install(&obj);
    assert!(knowledge::load(&dir.join("lock.json")).is_err()); // rehashing doesn't repair an invalid proof
    obj = objects().remove(0);
    obj.semantics = "checked-u32".into();
    install(&obj);
    assert!(knowledge::load(&dir.join("lock.json")).is_err());
    let lock = knowledge::Lock {
        schema: 1,
        semantics: knowledge::SEMANTICS.into(),
        objects: vec!["../outside".into()],
    };
    fs::write(dir.join("lock.json"), serde_json::to_vec(&lock).unwrap()).unwrap();
    assert!(knowledge::load(&dir.join("lock.json")).is_err());
    fs::remove_dir_all(dir).unwrap();
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
fn dependency_closure_checks_all_imports_but_selects_only_roots() {
    let source = Path::new("knowledge/research/composed");
    let db = knowledge::load(&source.join("lock.json")).unwrap();
    assert_eq!(db.closure.len(), 7);
    assert_eq!(db.theorems.len(), 1);
    let original = syntax::parse(include_str!("../examples/composed.lang")).unwrap();
    let mut changed = original.clone();
    assert_eq!(external_apply(&mut changed), vec!["decision"]);
    assert_eq!(changed.functions[0].body, bin("<", var("x"), var("limit")));
    for x in [0, 1, 1 << 63, u64::MAX] {
        for limit in [0, 1, 1 << 63, u64::MAX] {
            for flag in [false, true] {
                let args = vec![Value::U64(x), Value::U64(limit), Value::Bool(flag)];
                assert_eq!(
                    eval::call(&original, "decision", args.clone(), &mut 1000).unwrap(),
                    eval::call(&changed, "decision", args, &mut 1000).unwrap()
                );
            }
        }
    }
    let dir = std::env::temp_dir().join(format!("vl-dependencies-{}", std::process::id()));
    fs::create_dir_all(dir.join("objects")).unwrap();
    for entry in fs::read_dir(source.join("objects")).unwrap() {
        let entry = entry.unwrap();
        fs::copy(entry.path(), dir.join("objects").join(entry.file_name())).unwrap();
    }
    let names: serde_json::Value =
        serde_json::from_slice(&fs::read(source.join("names.json")).unwrap()).unwrap();
    let root = names["combined_comparison"].as_str().unwrap();
    let mut object: serde_json::Value = serde_json::from_slice(
        &fs::read(dir.join("objects").join(format!("{root}.json"))).unwrap(),
    )
    .unwrap();
    let write_object = |object: &serde_json::Value| {
        let bytes = serde_json::to_vec(object).unwrap();
        let id = format!("{:x}", Sha256::digest(&bytes));
        fs::write(dir.join("objects").join(format!("{id}.json")), bytes).unwrap();
        id
    };
    let write_lock = |objects: Vec<String>| {
        let lock = knowledge::Lock {
            schema: 1,
            semantics: knowledge::SEMANTICS.into(),
            objects,
        };
        fs::write(dir.join("lock.json"), serde_json::to_vec(&lock).unwrap()).unwrap();
    };
    // Being verified as a different root does not make an undeclared import visible.
    let composition = names["combined_decision"].as_str().unwrap().to_owned();
    object["dependencies"]
        .as_array_mut()
        .unwrap()
        .retain(|x| x.as_str() != Some(&composition));
    let altered = write_object(&object);
    write_lock(vec![composition.clone(), altered]);
    assert!(knowledge::load(&dir.join("lock.json"))
        .unwrap_err()
        .contains("undeclared theorem"));
    write_lock(vec![root.into()]);
    let leaf = dir
        .join("objects")
        .join(format!("{}.json", names["decision"].as_str().unwrap()));
    let bytes = fs::read(&leaf).unwrap();
    fs::remove_file(&leaf).unwrap();
    assert!(knowledge::load(&dir.join("lock.json")).is_err());
    fs::write(&leaf, b"{}").unwrap();
    assert!(knowledge::load(&dir.join("lock.json"))
        .unwrap_err()
        .contains("hash mismatch"));
    fs::write(&leaf, bytes).unwrap();
    knowledge::load(&dir.join("lock.json")).unwrap();
    // A deep chain of tiny, valid definitions still has a bounded loader depth.
    let mut last = None;
    for index in 0..66 {
        let mut object = serde_json::json!({"schema":1,"semantics":knowledge::SEMANTICS,"kind":"definition","name":format!("chain{index}"),"params":[],"result":"Bool","body":{"Bool":true}});
        if let Some(previous) = &last {
            object["body"] = serde_json::json!({"Call":[previous,[]]});
            object["dependencies"] = serde_json::json!([previous]);
        }
        last = Some(write_object(&object));
    }
    write_lock(vec![last.unwrap()]);
    assert!(knowledge::load(&dir.join("lock.json"))
        .unwrap_err()
        .contains("closure limit"));
    fs::remove_dir_all(dir).unwrap();
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
    let db = knowledge::load(Path::new("knowledge/research/conditional/lock.json")).unwrap();
    assert_eq!(db.closure.len(), 4);
    assert_eq!(db.theorems.len(), 2);
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
