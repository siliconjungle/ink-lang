use verified_language::logic::{
    Branch, Case, Constructor, Context, Declaration, Equation, Proof, Sort, Term,
};
fn v(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(f: &str, a: Vec<Term>) -> Term {
    Term::Call {
        function: f.into(),
        arguments: a,
    }
}
fn ctor(d: &str, a: Vec<Term>) -> Term {
    Term::Construct {
        datatype: d.into(),
        constructor: 0,
        arguments: a,
    }
}
fn f(params: Vec<(String, Sort)>, result: Sort, body: Term) -> Declaration {
    Declaration::Function {
        params,
        result,
        body,
        recursive: None,
    }
}
fn m(s: Term, names: &[&str], body: Term) -> Term {
    Term::Match {
        scrutinee: Box::new(s),
        branches: vec![Branch {
            bindings: names.iter().map(|n| (*n).into()).collect(),
            body,
        }],
    }
}

#[test]
fn repeated_unfolding_transport_and_roundtrip_use_ignore_bound_name_spelling() {
    let mut c = Context::default();
    for d in ["logical_pair", "physical_pair"] {
        c.declare(
            d.into(),
            &Declaration::Datatype {
                constructors: vec![Constructor {
                    name: "Pair".into(),
                    fields: vec![Sort::U64, Sort::U64],
                }],
            },
        )
        .unwrap();
    }
    let l = Sort::Data("logical_pair".into());
    let p = Sort::Data("physical_pair".into());
    c.declare(
        "encode".into(),
        &f(
            vec![("s".into(), l.clone())],
            p.clone(),
            m(
                v("s"),
                &["a", "b"],
                ctor("physical_pair", vec![v("b"), v("a")]),
            ),
        ),
    )
    .unwrap();
    c.declare(
        "decode".into(),
        &f(
            vec![("s".into(), p.clone())],
            l.clone(),
            m(
                v("s"),
                &["b", "a"],
                ctor("logical_pair", vec![v("a"), v("b")]),
            ),
        ),
    )
    .unwrap();
    let encoded = call("encode", vec![v("logical")]);
    let decoded = call("decode", vec![encoded.clone()]);
    let lc = ctor("logical_pair", vec![v("left"), v("right")]);
    c.declare(
        "roundtrip".into(),
        &Declaration::Theorem {
            params: vec![("logical".into(), l.clone())],
            conditions: vec![],
            from: decoded.clone(),
            to: v("logical"),
            proof: Proof::Induction {
                variable: "logical".into(),
                from: decoded,
                to: v("logical"),
                cases: vec![Case {
                    bindings: vec!["left".into(), "right".into()],
                    proof: Proof::Convert {
                        from: call("decode", vec![call("encode", vec![lc.clone()])]),
                        to: lc,
                    },
                }],
            },
        },
    )
    .unwrap();
    let params = vec![("logical".into(), l), ("physical".into(), p)];
    let conditions = vec![Equation {
        from: v("physical"),
        to: encoded,
    }];
    let proof = Proof::Trans(
        Box::new(Proof::Call {
            function: "decode".into(),
            arguments: vec![Proof::Hypothesis(0)],
        }),
        Box::new(Proof::Use {
            theorem: "roundtrip".into(),
            arguments: vec![v("logical")],
            premises: vec![],
        }),
    );
    c.check(
        &params,
        &conditions,
        &call("decode", vec![v("physical")]),
        &v("logical"),
        &proof,
    )
    .unwrap();
    assert!(c
        .check(
            &params,
            &[],
            &call("decode", vec![v("physical")]),
            &v("logical"),
            &proof
        )
        .is_err());
}

#[test]
fn alpha_conversion_preserves_free_variables_and_constructor_field_positions() {
    let mut c = Context::default();
    c.declare(
        "pair".into(),
        &Declaration::Datatype {
            constructors: vec![Constructor {
                name: "Pair".into(),
                fields: vec![Sort::U64, Sort::U64],
            }],
        },
    )
    .unwrap();
    let params = vec![
        ("s".into(), Sort::Data("pair".into())),
        ("free".into(), Sort::U64),
        ("other".into(), Sort::U64),
    ];
    let sum = |a, b| Term::Binary {
        op: "+".into(),
        left: Box::new(a),
        right: Box::new(b),
    };
    let a = m(v("s"), &["left", "right"], sum(v("left"), v("free")));
    let b = m(
        v("s"),
        &["renamed_left", "renamed_right"],
        sum(v("renamed_left"), v("free")),
    );
    c.check(
        &params,
        &[],
        &a,
        &b,
        &Proof::Convert {
            from: a.clone(),
            to: b.clone(),
        },
    )
    .unwrap();
    for wrong in [
        m(
            v("s"),
            &["renamed_left", "renamed_right"],
            sum(v("renamed_right"), v("free")),
        ),
        m(
            v("s"),
            &["renamed_left", "renamed_right"],
            sum(v("renamed_left"), v("other")),
        ),
        m(
            v("s"),
            &["renamed_left", "renamed_right"],
            sum(v("renamed_left"), v("renamed_left")),
        ),
    ] {
        assert!(c
            .check(
                &params,
                &[],
                &a,
                &wrong,
                &Proof::Convert {
                    from: a.clone(),
                    to: wrong.clone()
                }
            )
            .is_err());
    }
    let capture = m(v("s"), &["free", "right"], v("free"));
    assert!(c
        .check(
            &params,
            &[],
            &capture,
            &b,
            &Proof::Convert {
                from: capture.clone(),
                to: b.clone()
            }
        )
        .is_err());
}
