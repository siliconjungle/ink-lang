use verified_language::logic::{
    Branch, Case, Constructor, Context, Declaration, Equation, Proof, Sort, Term,
};
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(id: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments: args,
    }
}
fn ctor(id: &str, index: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: index,
        arguments: args,
    }
}
fn binary(op: &str, a: Term, b: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(a),
        right: Box::new(b),
    }
}
fn list_context() -> Context {
    let mut c = Context::default();
    c.declare(
        "list".into(),
        &Declaration::Datatype {
            constructors: vec![
                Constructor {
                    name: "Nil".into(),
                    fields: vec![],
                },
                Constructor {
                    name: "Cons".into(),
                    fields: vec![Sort::U64, Sort::SelfType],
                },
            ],
        },
    )
    .unwrap();
    c
}
fn map(body: Term) -> Declaration {
    Declaration::Function {
        params: vec![("xs".into(), Sort::Data("list".into()))],
        result: Sort::Data("list".into()),
        recursive: Some(0),
        body: Term::Match {
            scrutinee: Box::new(var("xs")),
            branches: vec![
                Branch {
                    bindings: vec![],
                    body: ctor("list", 0, vec![]),
                },
                Branch {
                    bindings: vec!["h".into(), "t".into()],
                    body: ctor("list", 1, vec![body, Term::SelfCall(vec![var("t")])]),
                },
            ],
        },
    }
}
fn fusion(c: &mut Context) -> (Term, Term, Proof) {
    c.declare("twice".into(), &map(binary("*", var("h"), Term::U64(2))))
        .unwrap();
    c.declare("inc".into(), &map(binary("+", var("h"), Term::U64(1))))
        .unwrap();
    c.declare(
        "combined".into(),
        &map(binary(
            "+",
            binary("*", var("h"), Term::U64(2)),
            Term::U64(1),
        )),
    )
    .unwrap();
    let from = call("inc", vec![call("twice", vec![var("xs")])]);
    let to = call("combined", vec![var("xs")]);
    let proof = Proof::Induction {
        variable: "xs".into(),
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec![],
                proof: Proof::Refl(ctor("list", 0, vec![])),
            },
            Case {
                bindings: vec!["h".into(), "t".into()],
                proof: Proof::Construct {
                    datatype: "list".into(),
                    constructor: 1,
                    arguments: vec![
                        Proof::Refl(binary(
                            "+",
                            binary("*", var("h"), Term::U64(2)),
                            Term::U64(1),
                        )),
                        Proof::Hypothesis(0),
                    ],
                },
            },
        ],
    };
    (from, to, proof)
}
#[test]
fn arbitrary_recursive_list_functions_are_equal_by_induction_not_sampling() {
    let mut c = list_context();
    let (from, to, proof) = fusion(&mut c);
    let params = vec![("xs".into(), Sort::Data("list".into()))];
    c.declare(
        "fusion".into(),
        &Declaration::Theorem {
            params: params.clone(),
            conditions: vec![],
            from: from.clone(),
            to: to.clone(),
            proof: proof.clone(),
        },
    )
    .unwrap();
    c.check(
        &params,
        &[],
        &from,
        &to,
        &Proof::Use {
            theorem: "fusion".into(),
            arguments: vec![var("xs")],
            premises: vec![],
        },
    )
    .unwrap();
    for xs in [vec![], vec![0, 1, u64::MAX, 1 << 63], (0..8).collect()] {
        let list = xs
            .iter()
            .rev()
            .fold(ctor("list", 0, vec![]), |tail, &head| {
                ctor("list", 1, vec![Term::U64(head), tail])
            });
        let a = c
            .evaluate(&[], &call("inc", vec![call("twice", vec![list.clone()])]))
            .unwrap();
        let b = c.evaluate(&[], &call("combined", vec![list])).unwrap();
        assert_eq!(a, b);
        // Compare independently to the stated modular arithmetic.
        let expected = xs
            .iter()
            .rev()
            .fold(ctor("list", 0, vec![]), |tail, &head| {
                ctor(
                    "list",
                    1,
                    vec![Term::U64(head.wrapping_mul(2).wrapping_add(1)), tail],
                )
            });
        assert_eq!(a, expected);
    }
    assert!(c
        .check(
            &params,
            &[],
            &from,
            &to,
            &Proof::Convert {
                from: from.clone(),
                to: to.clone()
            }
        )
        .is_err()); // unbounded law needs induction
    let mut bad = proof.clone();
    if let Proof::Induction { cases, .. } = &mut bad {
        cases.pop();
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = proof.clone();
    if let Proof::Induction { cases, .. } = &mut bad {
        if let Proof::Construct { arguments, .. } = &mut cases[1].proof {
            arguments[1] = Proof::Hypothesis(1);
        }
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    assert!(c
        .check(&params, &[], &from, &to, &Proof::Hypothesis(0))
        .is_err());
    // Premises depending on xs cannot be silently granted to its tail.
    let conditions = vec![Equation {
        from: var("xs"),
        to: ctor("list", 0, vec![]),
    }];
    assert!(c
        .check(&params, &conditions, &from, &to, &proof)
        .unwrap_err()
        .contains("variable-dependent"));
    let mut bad = proof.clone();
    if let Proof::Induction { cases, .. } = &mut bad {
        cases[1].bindings[0] = "xs".into();
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
}
#[test]
fn induction_is_generic_and_supplies_one_hypothesis_per_recursive_field() {
    let mut c = Context::default();
    c.declare(
        "tree".into(),
        &Declaration::Datatype {
            constructors: vec![
                Constructor {
                    name: "Leaf".into(),
                    fields: vec![Sort::U64],
                },
                Constructor {
                    name: "Fork".into(),
                    fields: vec![Sort::SelfType, Sort::SelfType],
                },
            ],
        },
    )
    .unwrap();
    let ty = Sort::Data("tree".into());
    c.declare(
        "copy".into(),
        &Declaration::Function {
            params: vec![("tree".into(), ty.clone())],
            result: ty.clone(),
            recursive: Some(0),
            body: Term::Match {
                scrutinee: Box::new(var("tree")),
                branches: vec![
                    Branch {
                        bindings: vec!["value".into()],
                        body: ctor("tree", 0, vec![var("value")]),
                    },
                    Branch {
                        bindings: vec!["left".into(), "right".into()],
                        body: ctor(
                            "tree",
                            1,
                            vec![
                                Term::SelfCall(vec![var("left")]),
                                Term::SelfCall(vec![var("right")]),
                            ],
                        ),
                    },
                ],
            },
        },
    )
    .unwrap();
    let from = call("copy", vec![var("tree")]);
    let to = var("tree");
    let proof = Proof::Induction {
        variable: "tree".into(),
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec!["value".into()],
                proof: Proof::Refl(ctor("tree", 0, vec![var("value")])),
            },
            Case {
                bindings: vec!["left".into(), "right".into()],
                proof: Proof::Construct {
                    datatype: "tree".into(),
                    constructor: 1,
                    arguments: vec![Proof::Hypothesis(0), Proof::Hypothesis(1)],
                },
            },
        ],
    };
    c.check(&[("tree".into(), ty)], &[], &from, &to, &proof)
        .unwrap();
    let tree = ctor(
        "tree",
        1,
        vec![
            ctor("tree", 0, vec![Term::U64(7)]),
            ctor(
                "tree",
                1,
                vec![
                    ctor("tree", 0, vec![Term::U64(9)]),
                    ctor("tree", 0, vec![Term::U64(u64::MAX)]),
                ],
            ),
        ],
    );
    assert_eq!(
        c.evaluate(&[], &call("copy", vec![tree.clone()])).unwrap(),
        tree
    );
}
#[test]
fn recursion_types_binders_and_literal_computation_have_negative_checks() {
    let mut c = list_context();
    let mut bad = map(var("h"));
    if let Declaration::Function {
        body: Term::Match { branches, .. },
        ..
    } = &mut bad
    {
        branches[1].body = Term::SelfCall(vec![var("xs")]);
    }
    assert!(c
        .declare("loop".into(), &bad)
        .unwrap_err()
        .contains("strict structural subterm"));
    let mut bad = map(var("h"));
    if let Declaration::Function {
        body: Term::Match { branches, .. },
        ..
    } = &mut bad
    {
        branches[1].body = Term::SelfCall(vec![ctor("list", 1, vec![var("h"), var("t")])]);
    }
    assert!(c.declare("grows".into(), &bad).is_err());
    let mut bad = map(Term::Bool(true));
    assert!(c.declare("wrong_element".into(), &bad).is_err());
    if let Declaration::Function { recursive, .. } = &mut bad {
        *recursive = Some(1);
    }
    assert!(c.declare("wrong_index".into(), &bad).is_err());
    assert!(c
        .check(
            &[("x".into(), Sort::U64)],
            &[],
            &binary("+", var("x"), Term::U64(0)),
            &var("x"),
            &Proof::Convert {
                from: binary("+", var("x"), Term::U64(0)),
                to: var("x")
            }
        )
        .is_err());
    c.check(
        &[],
        &[],
        &binary("+", Term::U64(u64::MAX), Term::U64(1)),
        &Term::U64(0),
        &Proof::Convert {
            from: binary("+", Term::U64(u64::MAX), Term::U64(1)),
            to: Term::U64(0),
        },
    )
    .unwrap();
    assert!(c.evaluate(&[], &Term::SelfCall(vec![])).is_err());
    assert!(c.evaluate(&[], &ctor("list", 2, vec![])).is_err());
    assert!(c
        .declare(
            "missing_type".into(),
            &Declaration::Datatype {
                constructors: vec![Constructor {
                    name: "Bad".into(),
                    fields: vec![Sort::Data("missing".into())]
                }]
            }
        )
        .is_err());
    assert!(c
        .declare(
            "self_result".into(),
            &Declaration::Function {
                params: vec![],
                result: Sort::SelfType,
                body: Term::U64(0),
                recursive: None
            }
        )
        .is_err());
    let mut huge = Proof::Refl(Term::Bool(true));
    for _ in 0..140 {
        huge = Proof::Sym(Box::new(huge));
    }
    assert!(c
        .check(&[], &[], &Term::Bool(true), &Term::Bool(true), &huge)
        .is_err());
}
#[test]
fn substitution_avoids_capture_and_imports_keep_checked_internal_dependencies() {
    let mut c = list_context();
    c.declare(
        "choose".into(),
        &Declaration::Function {
            params: vec![
                ("value".into(), Sort::U64),
                ("xs".into(), Sort::Data("list".into())),
            ],
            result: Sort::U64,
            recursive: None,
            body: Term::Match {
                scrutinee: Box::new(var("xs")),
                branches: vec![
                    Branch {
                        bindings: vec![],
                        body: var("value"),
                    },
                    Branch {
                        bindings: vec!["x".into(), "tail".into()],
                        body: var("value"),
                    },
                ],
            },
        },
    )
    .unwrap();
    let list = ctor("list", 1, vec![Term::U64(7), ctor("list", 0, vec![])]);
    assert_eq!(
        c.evaluate(
            &[("x".into(), Sort::U64)],
            &call("choose", vec![var("x"), list.clone()])
        )
        .unwrap(),
        var("x")
    );
    assert!(c
        .check(
            &[("x".into(), Sort::U64)],
            &[],
            &call("choose", vec![var("x"), list]),
            &Term::U64(7),
            &Proof::Convert {
                from: var("x"),
                to: Term::U64(7)
            }
        )
        .is_err());
    let params = vec![("a".into(), Sort::U64), ("b".into(), Sort::U64)];
    c.declare(
        "first".into(),
        &Declaration::Function {
            params: params.clone(),
            result: Sort::U64,
            body: var("a"),
            recursive: None,
        },
    )
    .unwrap();
    assert_eq!(
        c.evaluate(&params, &call("first", vec![var("b"), var("a")]))
            .unwrap(),
        var("b")
    );
    assert!(c
        .evaluate(&[], &call("first", vec![Term::U64(1), Term::Bool(false)]))
        .is_err());
    c.declare(
        "second_call".into(),
        &Declaration::Function {
            params: params.clone(),
            result: Sort::U64,
            body: call("first", vec![var("b"), var("a")]),
            recursive: None,
        },
    )
    .unwrap();
    let imported = c.subset(&["second_call".into()]).unwrap();
    assert_eq!(
        imported
            .evaluate(&[], &call("second_call", vec![Term::U64(3), Term::U64(4)]))
            .unwrap(),
        Term::U64(4)
    );
    assert!(imported
        .evaluate(&[], &call("first", vec![Term::U64(3), Term::U64(4)]))
        .is_err()); // not a direct import
    let mut conflict = Context::default();
    conflict
        .declare(
            "first".into(),
            &Declaration::Function {
                params,
                result: Sort::U64,
                body: Term::U64(99),
                recursive: None,
            },
        )
        .unwrap();
    let mut imported = imported;
    assert!(imported.import(&conflict, "first").is_err());
}

#[test]
fn boolean_cases_premises_and_congruence_do_not_create_unconditional_assumptions() {
    let mut c = Context::default();
    let params = vec![("flag".into(), Sort::Bool)];
    let condition = Equation {
        from: var("flag"),
        to: Term::Bool(true),
    };
    c.declare(
        "under".into(),
        &Declaration::Theorem {
            params: params.clone(),
            conditions: vec![condition.clone()],
            from: var("flag"),
            to: Term::Bool(true),
            proof: Proof::Hypothesis(0),
        },
    )
    .unwrap();
    let use_under = |arg: Term, premises: Vec<Proof>| Proof::Use {
        theorem: "under".into(),
        arguments: vec![arg],
        premises,
    };
    assert!(c
        .check(
            &params,
            &[],
            &var("flag"),
            &Term::Bool(true),
            &use_under(var("flag"), vec![Proof::Hypothesis(0)])
        )
        .is_err());
    assert!(c
        .check(
            &[],
            &[],
            &Term::Bool(false),
            &Term::Bool(true),
            &use_under(Term::Bool(false), vec![Proof::Refl(Term::Bool(false))])
        )
        .is_err());
    assert!(c
        .check(
            &[],
            &[],
            &Term::Bool(true),
            &Term::Bool(true),
            &use_under(Term::Bool(true), vec![])
        )
        .is_err());
    c.check(
        &[],
        &[],
        &Term::Bool(true),
        &Term::Bool(true),
        &use_under(Term::Bool(true), vec![Proof::Refl(Term::Bool(true))]),
    )
    .unwrap();
    let cases = Proof::BoolCases {
        variable: "flag".into(),
        from: var("flag"),
        to: Term::Bool(true),
        on_false: Box::new(Proof::Hypothesis(0)),
        on_true: Box::new(Proof::Hypothesis(0)),
    };
    c.check(
        &params,
        &[condition],
        &var("flag"),
        &Term::Bool(true),
        &cases,
    )
    .unwrap();
    let from = binary("&&", var("flag"), var("flag"));
    let proof = Proof::BoolCases {
        variable: "flag".into(),
        from: from.clone(),
        to: var("flag"),
        on_false: Box::new(Proof::Convert {
            from: binary("&&", Term::Bool(false), Term::Bool(false)),
            to: Term::Bool(false),
        }),
        on_true: Box::new(Proof::Convert {
            from: binary("&&", Term::Bool(true), Term::Bool(true)),
            to: Term::Bool(true),
        }),
    };
    c.check(&params, &[], &from, &var("flag"), &proof).unwrap();
    let bad = Proof::Trans(
        Box::new(Proof::Refl(Term::Bool(false))),
        Box::new(Proof::Refl(Term::Bool(true))),
    );
    assert!(c
        .check(&[], &[], &Term::Bool(false), &Term::Bool(true), &bad)
        .is_err());
    c.check(
        &[],
        &[],
        &Term::Bool(true),
        &Term::Bool(true),
        &Proof::Sym(Box::new(Proof::Refl(Term::Bool(true)))),
    )
    .unwrap();
    let binary_proof = Proof::Binary {
        op: "+".into(),
        left: Box::new(Proof::Convert {
            from: binary("+", Term::U64(2), Term::U64(3)),
            to: Term::U64(5),
        }),
        right: Box::new(Proof::Refl(Term::U64(1))),
    };
    c.check(&[], &[], &Term::U64(6), &Term::U64(6), &binary_proof)
        .unwrap();
    c.declare(
        "first".into(),
        &Declaration::Function {
            params: vec![("a".into(), Sort::U64), ("b".into(), Sort::U64)],
            result: Sort::U64,
            body: var("a"),
            recursive: None,
        },
    )
    .unwrap();
    let proof = Proof::Call {
        function: "first".into(),
        arguments: vec![Proof::Refl(Term::U64(5)), Proof::Refl(Term::Bool(false))],
    };
    assert!(c
        .check(&[], &[], &Term::U64(5), &Term::U64(5), &proof)
        .is_err()); // erased argument must still type-check
}

#[test]
fn library_roots_are_explicit_and_transitive_dependencies_do_not_grant_visibility() {
    use std::{fs, path::Path};
    use verified_language::library;
    let lib = library::load(Path::new("knowledge/inductive/lock.json")).unwrap();
    assert_eq!(lib.closure.len(), 12);
    let names: serde_json::Value =
        serde_json::from_slice(&fs::read("knowledge/inductive/names.json").unwrap()).unwrap();
    let id = |n: &str| names[n].as_str().unwrap();
    let list = ctor(
        id("List64"),
        1,
        vec![Term::U64(u64::MAX), ctor(id("List64"), 0, vec![])],
    );
    let from = call(
        id("map_inc"),
        vec![call(id("map_double"), vec![list.clone()])],
    );
    let to = call(id("map_composed"), vec![list.clone()]);
    lib.context
        .check(
            &[],
            &[],
            &from,
            &to,
            &Proof::Use {
                theorem: id("map_composition").into(),
                arguments: vec![list],
                premises: vec![],
            },
        )
        .unwrap();
    assert!(lib
        .context
        .evaluate(&[], &call(id("double"), vec![Term::U64(3)]))
        .is_err());
    // double is not a root, but composed may execute its checked private dependency.
    assert_eq!(
        lib.context
            .evaluate(&[], &call(id("composed"), vec![Term::U64(u64::MAX)]))
            .unwrap(),
        Term::U64(u64::MAX)
    );
    // The scalar rewrite loader must not misinterpret this new logical domain.
    assert!(
        verified_language::knowledge::load(Path::new("knowledge/inductive/lock.json")).is_err()
    );
}
