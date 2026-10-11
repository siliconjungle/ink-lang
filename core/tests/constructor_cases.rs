use ink_core::logic::{
    Branch, Case, Constructor, Context, Declaration, Equation, Proof, Sort, Term,
};

fn v(n: &str) -> Term {
    Term::Var(n.into())
}
fn data(tag: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: "optional".into(),
        constructor: tag,
        arguments: args,
    }
}
fn projected(t: Term) -> Term {
    Term::Match {
        scrutinee: Box::new(t),
        branches: vec![
            Branch {
                bindings: vec![],
                body: Term::U64(0),
            },
            Branch {
                bindings: vec!["item".into()],
                body: v("item"),
            },
        ],
    }
}
fn hole(p: Proof) -> Proof {
    Proof::Substitute {
        variable: "hole".into(),
        context: projected(v("hole")),
        equality: Box::new(p),
    }
}
fn context() -> Context {
    let mut c = Context::default();
    c.declare(
        "optional".into(),
        &Declaration::Datatype {
            constructors: vec![
                Constructor {
                    name: "None".into(),
                    fields: vec![],
                },
                Constructor {
                    name: "Some".into(),
                    fields: vec![Sort::U64],
                },
            ],
        },
    )
    .unwrap();
    c
}

#[test]
fn exhaustive_constructor_elimination_preserves_conditional_premises() {
    let c = context();
    let params = vec![("input".into(), Sort::Data("optional".into()))];
    let conditions = vec![Equation {
        from: v("input"),
        to: data(1, vec![Term::U64(17)]),
    }];
    let from = projected(v("input"));
    let to = Term::U64(17);
    // Case elimination adds no recursive hypotheses and may retain premises
    // dependent on the scrutinee. The original premise proves both branches.
    let proof = Proof::Cases {
        scrutinee: Some(v("input")),
        variable: None,
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec![],
                proof: hole(Proof::Hypothesis(0)),
            },
            Case {
                bindings: vec!["value".into()],
                proof: hole(Proof::Hypothesis(0)),
            },
        ],
    };
    c.check(&params, &conditions, &from, &to, &proof).unwrap();
    assert!(c.check(&params, &[], &from, &to, &proof).is_err());
}

#[test]
fn constructor_cases_cannot_supply_induction_or_unchecked_equalities() {
    let c = context();
    let params = vec![("input".into(), Sort::Data("optional".into()))];
    let from = projected(v("input"));
    let to = from.clone();
    let valid = Proof::Cases {
        scrutinee: Some(v("input")),
        variable: None,
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec![],
                proof: Proof::Refl(from.clone()),
            },
            Case {
                bindings: vec!["value".into()],
                proof: Proof::Refl(from.clone()),
            },
        ],
    };
    c.check(&params, &[], &from, &to, &valid).unwrap();
    let mut ambiguous = valid.clone();
    if let Proof::Cases { variable, .. } = &mut ambiguous { *variable = Some("input".into()); }
    assert!(c.check(&params, &[], &from, &to, &ambiguous).is_err());
    let mut missing = valid.clone();
    if let Proof::Cases { scrutinee, .. } = &mut missing { *scrutinee = None; }
    assert!(c.check(&params, &[], &from, &to, &missing).is_err());
    let mut bad = valid.clone();
    if let Proof::Cases { cases, .. } = &mut bad {
        cases.pop();
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = valid.clone();
    if let Proof::Cases { scrutinee, .. } = &mut bad {
        *scrutinee = Some(Term::U64(0));
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = valid.clone();
    if let Proof::Cases { cases, .. } = &mut bad {
        cases[1].bindings = vec!["input".into()];
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = valid.clone();
    if let Proof::Cases { cases, .. } = &mut bad {
        cases[1].proof = Proof::Hypothesis(1);
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = valid.clone();
    if let Proof::Cases { cases, .. } = &mut bad {
        cases[1].proof = Proof::GeneralizedHypothesis {
            index: 0,
            arguments: vec![],
        };
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
    let mut bad = valid;
    if let Proof::Cases { cases, .. } = &mut bad {
        cases[1].proof = Proof::Convert {
            from: Term::U64(0),
            to: Term::U64(1),
        };
    }
    assert!(c.check(&params, &[], &from, &to, &bad).is_err());
}

#[test]
fn projection_checks_types_but_does_not_expand_discarded_fields() {
    let mut c = Context::default();
    c.declare(
        "tree".into(),
        &Declaration::Datatype {
            constructors: vec![
                Constructor {
                    name: "Leaf".into(),
                    fields: vec![],
                },
                Constructor {
                    name: "Fork".into(),
                    fields: vec![Sort::SelfType, Sort::SelfType],
                },
            ],
        },
    )
    .unwrap();
    let data = Sort::Data("tree".into());
    c.declare(
        "duplicate".into(),
        &Declaration::Function {
            params: vec![("t".into(), data.clone())],
            result: data.clone(),
            recursive: None,
            body: Term::Construct {
                datatype: "tree".into(),
                constructor: 1,
                arguments: vec![v("t"), v("t")],
            },
        },
    )
    .unwrap();
    c.declare(
        "projection".into(),
        &Declaration::Function {
            params: vec![("t".into(), data)],
            result: Sort::U64,
            recursive: None,
            body: Term::Match {
                scrutinee: Box::new(v("t")),
                branches: vec![
                    Branch {
                        bindings: vec![],
                        body: Term::U64(7),
                    },
                    Branch {
                        bindings: vec!["left".into(), "right".into()],
                        body: Term::U64(7),
                    },
                ],
            },
        },
    )
    .unwrap();
    let mut term = Term::Construct {
        datatype: "tree".into(),
        constructor: 0,
        arguments: vec![],
    };
    for _ in 0..18 {
        term = Term::Call {
            function: "duplicate".into(),
            arguments: vec![term],
        };
    }
    let projected = Term::Call {
        function: "projection".into(),
        arguments: vec![term],
    };
    assert_eq!(c.evaluate(&[], &projected).unwrap(), Term::U64(7));
    c.check(
        &[],
        &[],
        &projected,
        &Term::U64(7),
        &Proof::Convert {
            from: projected.clone(),
            to: Term::U64(7),
        },
    )
    .unwrap();
    let invalid = Term::Call {
        function: "projection".into(),
        arguments: vec![Term::U64(0)],
    };
    assert!(c.evaluate(&[], &invalid).is_err());
    assert!(c
        .check(
            &[],
            &[],
            &invalid,
            &Term::U64(7),
            &Proof::Convert {
                from: invalid.clone(),
                to: Term::U64(7)
            }
        )
        .is_err());
    // Demanding the entire exponential value still consumes the bounded work.
    let Term::Call { arguments, .. } = projected else {
        unreachable!()
    };
    assert!(c.evaluate(&[], &arguments[0]).is_err());
}

#[test]
fn conversion_computes_stuck_branch_bodies_without_assuming_equal_results() {
    let c = context();
    let params = vec![("input".into(), Sort::Data("optional".into()))];
    let expression = |n| Term::Match {
        scrutinee: Box::new(v("input")),
        branches: vec![
            Branch {
                bindings: vec![],
                body: Term::If {
                    condition: Box::new(Term::Bool(true)),
                    on_true: Box::new(Term::U64(n)),
                    on_false: Box::new(Term::U64(99)),
                },
            },
            Branch {
                bindings: vec!["item".into()],
                body: v("item"),
            },
        ],
    };
    let expected = Term::Match {
        scrutinee: Box::new(v("input")),
        branches: vec![
            Branch {
                bindings: vec![],
                body: Term::U64(7),
            },
            Branch {
                bindings: vec!["renamed".into()],
                body: v("renamed"),
            },
        ],
    };
    c.check(
        &params,
        &[],
        &expression(7),
        &expected,
        &Proof::Convert {
            from: expression(7),
            to: expected.clone(),
        },
    )
    .unwrap();
    assert!(c
        .check(
            &params,
            &[],
            &expression(8),
            &expected,
            &Proof::Convert {
                from: expression(8),
                to: expected.clone()
            }
        )
        .is_err());
    assert!(c
        .check(
            &[("$a0".into(), Sort::U64)],
            &[],
            &v("$a0"),
            &v("$a0"),
            &Proof::Refl(v("$a0"))
        )
        .is_err());
}

#[test]
fn induction_reduces_discarded_arguments_but_rejects_dependent_premises() {
    let mut c = context();
    c.declare("constant".into(), &Declaration::Function {
        params: vec![("ignored".into(), Sort::Data("optional".into()))],
        result: Sort::Bool, body: Term::Bool(true), recursive: None,
    }).unwrap();
    let from = v("input");
    let proof = Proof::Induction {
        variable: "input".into(), from: from.clone(), to: from.clone(),
        cases: vec![Case { bindings: vec![], proof: Proof::Refl(data(0,vec![])) },
                    Case { bindings: vec!["value".into()], proof: Proof::Refl(data(1,vec![v("value")])) }],
    };
    let params = [("input".into(), Sort::Data("optional".into()))];
    let discarded = Equation {from: Term::Call {function:"constant".into(),arguments:vec![from.clone()]},to:Term::Bool(true)};
    c.check(&params,&[discarded],&from,&from,&proof).unwrap();
    let dependent = Equation {from:from.clone(),to:data(0,vec![])};
    assert!(c.check(&params,&[dependent],&from,&from,&proof).is_err());
}
