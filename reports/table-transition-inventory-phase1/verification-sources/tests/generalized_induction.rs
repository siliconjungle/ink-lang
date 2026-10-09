use verified_language::logic::{
    Branch, Case, Constructor, Context, Declaration, Equation, Proof, Sort, Term,
};

fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn cons(h: Term, t: Term) -> Term {
    Term::Construct {
        datatype: "list".into(),
        constructor: 1,
        arguments: vec![h, t],
    }
}
fn nil() -> Term {
    Term::Construct {
        datatype: "list".into(),
        constructor: 0,
        arguments: vec![],
    }
}
fn call(n: &str, xs: Term, acc: Term, flag: Term) -> Term {
    Term::Call {
        function: n.into(),
        arguments: vec![xs, acc, flag],
    }
}
fn setup() -> (Context, Vec<(String, Sort)>, Term, Term, Proof) {
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
    let list = Sort::Data("list".into());
    let params = vec![
        ("xs".into(), list.clone()),
        ("acc".into(), list.clone()),
        ("flag".into(), Sort::Bool),
    ];
    let advance = Term::If {
        condition: Box::new(var("flag")),
        on_true: Box::new(cons(var("h"), var("acc"))),
        on_false: Box::new(var("acc")),
    };
    for n in ["first", "second"] {
        c.declare(
            n.into(),
            &Declaration::Function {
                params: params.clone(),
                result: list.clone(),
                recursive: Some(0),
                body: Term::Match {
                    scrutinee: Box::new(var("xs")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: var("acc"),
                        },
                        Branch {
                            bindings: vec!["h".into(), "t".into()],
                            body: Term::SelfCall(vec![var("t"), advance.clone(), var("flag")]),
                        },
                    ],
                },
            },
        )
        .unwrap();
    }
    let from = call("first", var("xs"), var("acc"), var("flag"));
    let to = call("second", var("xs"), var("acc"), var("flag"));
    let proof = Proof::GeneralizedInduction {
        variable: "xs".into(),
        generalize: vec!["acc".into()],
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec![],
                proof: Proof::Refl(var("acc")),
            },
            Case {
                bindings: vec!["h".into(), "t".into()],
                proof: Proof::GeneralizedHypothesis {
                    index: 0,
                    arguments: vec![advance],
                },
            },
        ],
    };
    (c, params, from, to, proof)
}

#[test]
fn induction_can_instantiate_a_changing_accumulator_without_changing_the_recursive_argument() {
    let (mut c, params, from, to, proof) = setup();
    c.check(&params, &[], &from, &to, &proof).unwrap();
    c.declare(
        "equivalence".into(),
        &Declaration::Theorem {
            params: params.clone(),
            conditions: vec![],
            from: from.clone(),
            to: to.clone(),
            proof: proof.clone(),
        },
    )
    .unwrap();
    let input = cons(Term::U64(3), cons(Term::U64(7), nil()));
    let acc = cons(Term::U64(99), nil());
    for flag in [false, true] {
        let actual = c
            .evaluate(
                &[],
                &call("first", input.clone(), acc.clone(), Term::Bool(flag)),
            )
            .unwrap();
        assert_eq!(
            actual,
            if flag {
                cons(Term::U64(7), cons(Term::U64(3), acc.clone()))
            } else {
                acc.clone()
            }
        );
        c.check(
            &[],
            &[],
            &call("first", input.clone(), acc.clone(), Term::Bool(flag)),
            &call("second", input.clone(), acc.clone(), Term::Bool(flag)),
            &Proof::Use {
                theorem: "equivalence".into(),
                arguments: vec![input.clone(), acc.clone(), Term::Bool(flag)],
                premises: vec![],
            },
        )
        .unwrap();
    }
    // Ordinary induction fixes acc; it cannot supply the changed-state fact.
    let Proof::GeneralizedInduction {
        variable,
        from: pf,
        to: pt,
        cases,
        ..
    } = proof.clone()
    else {
        unreachable!()
    };
    let mut ordinary = cases;
    ordinary[1].proof = Proof::Hypothesis(0);
    assert!(c
        .check(
            &params,
            &[],
            &from,
            &to,
            &Proof::Induction {
                variable,
                from: pf,
                to: pt,
                cases: ordinary
            }
        )
        .is_err());
    let mut split = proof;
    if let Proof::GeneralizedInduction { cases, .. } = &mut split {
        cases[1].proof = Proof::BoolCases {
            variable: "flag".into(),
            from: call("first", cons(var("h"), var("t")), var("acc"), var("flag")),
            to: call("second", cons(var("h"), var("t")), var("acc"), var("flag")),
            on_false: Box::new(Proof::GeneralizedHypothesis {
                index: 0,
                arguments: vec![var("acc")],
            }),
            on_true: Box::new(Proof::GeneralizedHypothesis {
                index: 0,
                arguments: vec![cons(var("h"), var("acc"))],
            }),
        };
    }
    c.check(&params, &[], &from, &to, &split).unwrap();
    // If flag is quantified as well, case analysis must not specialize that
    // bound parameter inside the schema; each branch explicitly supplies it.
    if let Proof::GeneralizedInduction {
        generalize, cases, ..
    } = &mut split
    {
        generalize.push("flag".into());
        if let Proof::BoolCases {
            on_false, on_true, ..
        } = &mut cases[1].proof
        {
            if let Proof::GeneralizedHypothesis { arguments, .. } = on_false.as_mut() {
                arguments.push(Term::Bool(false));
            }
            if let Proof::GeneralizedHypothesis { arguments, .. } = on_true.as_mut() {
                arguments.push(Term::Bool(true));
            }
        }
    }
    c.check(&params, &[], &from, &to, &split).unwrap();
}

#[test]
fn generalized_hypotheses_are_typed_scoped_and_cannot_quantify_fixed_assumptions() {
    let (c, params, from, to, proof) = setup();
    for names in [vec!["xs"], vec!["acc", "acc"], vec!["missing"]] {
        let mut bad = proof.clone();
        if let Proof::GeneralizedInduction { generalize, .. } = &mut bad {
            *generalize = names.into_iter().map(str::to_owned).collect();
        }
        assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    }
    for replacement in [
        Proof::GeneralizedHypothesis {
            index: 1,
            arguments: vec![var("acc")],
        },
        Proof::GeneralizedHypothesis {
            index: 0,
            arguments: vec![Term::U64(1)],
        },
        Proof::GeneralizedHypothesis {
            index: 0,
            arguments: vec![],
        },
        Proof::GeneralizedHypothesis {
            index: 0,
            arguments: vec![var("xs")],
        }, // recursive binder removed
    ] {
        let mut bad = proof.clone();
        if let Proof::GeneralizedInduction { cases, .. } = &mut bad {
            cases[1].proof = replacement;
        }
        assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    }
    assert!(c
        .check(
            &params,
            &[],
            &from,
            &to,
            &Proof::GeneralizedHypothesis {
                index: 0,
                arguments: vec![var("acc")]
            }
        )
        .is_err());
    let mut bad = proof.clone();
    if let Proof::GeneralizedInduction { cases, .. } = &mut bad {
        cases[0].proof = Proof::GeneralizedHypothesis {
            index: 0,
            arguments: vec![var("acc")],
        };
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    for equation in [
        Equation {
            from: var("acc"),
            to: nil(),
        },
        Equation {
            from: var("xs"),
            to: nil(),
        },
    ] {
        assert!(c
            .check(&params, &[equation], &from, &to, &proof)
            .unwrap_err()
            .contains("variable-dependent"));
    }
    let mut bad = proof.clone();
    if let Proof::GeneralizedInduction { cases, .. } = &mut bad {
        cases.pop();
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = proof;
    if let Proof::GeneralizedInduction { generalize, .. } = &mut bad {
        *generalize = vec!["acc".into(); 65];
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
}
