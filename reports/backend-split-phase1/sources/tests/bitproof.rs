use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicUsize, Ordering},
};
use verified_language::{
    check,
    eval::{self, Value},
    implementation::{self, Package},
    library::{self, Object},
    logic::{Branch, Case, Context, Declaration, Equation, Proof, Sort, Term},
    native, syntax,
};

static NEXT: AtomicUsize = AtomicUsize::new(0);
fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/bitvector")
}
fn names() -> BTreeMap<String, String> {
    serde_json::from_slice(&fs::read(root().join("names.json")).unwrap()).unwrap()
}
fn object(name: &str) -> Object {
    serde_json::from_slice(
        &fs::read(
            root()
                .join("objects")
                .join(format!("{}.json", names()[name])),
        )
        .unwrap(),
    )
    .unwrap()
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn binary(op: &str, a: Term, b: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(a),
        right: Box::new(b),
    }
}
fn package() -> Package {
    serde_json::from_slice(&fs::read(root().join("proposal.json")).unwrap()).unwrap()
}
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!(
            "ink-bitproof-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(p.join("objects")).unwrap();
        fs::copy(root().join("lock.json"), p.join("lock.json")).unwrap();
        for entry in fs::read_dir(root().join("objects")).unwrap() {
            let entry = entry.unwrap();
            fs::copy(entry.path(), p.join("objects").join(entry.file_name())).unwrap();
        }
        Self(p)
    }
    fn package(&self, p: &Package) -> PathBuf {
        let path = self.0.join("proposal.json");
        fs::write(&path, serde_json::to_vec(p).unwrap()).unwrap();
        path
    }
    fn isolated_object(&self, o: &Object) -> PathBuf {
        // Rehash the altered object and update its root. This deliberately gets
        // past content-address checking to test semantic rejection by the kernel.
        let bytes = serde_json::to_vec(o).unwrap();
        let id = format!("{:x}", Sha256::digest(&bytes));
        fs::write(self.0.join("objects").join(format!("{id}.json")), bytes).unwrap();
        let path = self.0.join("isolated.json");
        fs::write(
            &path,
            serde_json::to_vec(
                &serde_json::json!({"schema":1,"semantics":library::SEMANTICS,"objects":[id]}),
            )
            .unwrap(),
        )
        .unwrap();
        path
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        fs::remove_dir_all(&self.0).unwrap();
    }
}

#[test]
fn real_database_proofs_authorise_exact_source_and_preserve_full_width_values() {
    let fixture = Fixture::new();
    let before = syntax::parse(&fs::read_to_string(root().join("kernels.ink")).unwrap()).unwrap();
    let mut after = before.clone();
    check::check(&before).unwrap();
    let evidence = implementation::apply(&mut after, &fixture.package(&package())).unwrap();
    assert_eq!(evidence.library_closure.len(), 10);
    assert_eq!(evidence.checked_proposals.len(), 8);
    assert_ne!(
        native::emit(&before).unwrap(),
        native::emit(&after).unwrap()
    );
    // Both baseline and checked implementations must compile under the normal
    // strict backend diagnostics; valid x <= x needs no optimisation database.
    for (name, program) in [("baseline", &before), ("checked", &after)] {
        let source = fixture.0.join(format!("{name}.c"));
        fs::write(&source, native::emit(program).unwrap()).unwrap();
        let result = std::process::Command::new("clang")
            .args(["-O3", "-std=c11", "-Wall", "-Wextra", "-Werror", "-c"])
            .arg(&source)
            .arg("-o")
            .arg(fixture.0.join(format!("{name}.o")))
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{name}: {}",
            String::from_utf8_lossy(&result.stderr)
        );
    }
    let boundary = [0, 1, 2, u64::MAX, u64::MAX - 1, 1 << 63, (1 << 63) - 1];
    let mut seed = 7319u64;
    for i in 0..512 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let x = if i < boundary.len() {
            boundary[i]
        } else {
            seed
        };
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let y = if i < boundary.len() {
            boundary[boundary.len() - 1 - i]
        } else {
            seed
        };
        for name in [
            "add_zero",
            "subtract_self",
            "add_commute",
            "cancel_add",
            "multiply_zero",
            "unsigned_reflexive",
            "unsigned_maximum",
            "choose_equal",
        ] {
            let args = match name {
                "add_commute" | "cancel_add" => vec![Value::U64(x), Value::U64(y)],
                "choose_equal" => vec![Value::U64(x), Value::Bool(i % 2 == 0)],
                _ => vec![Value::U64(x)],
            };
            let expected = match name {
                "subtract_self" | "multiply_zero" => Value::U64(0),
                "add_commute" => Value::U64(x.wrapping_add(y)),
                "unsigned_reflexive" | "unsigned_maximum" => Value::Bool(true),
                _ => Value::U64(x),
            };
            assert_eq!(
                eval::call(&before, name, args.clone(), &mut 10_000).unwrap(),
                expected
            );
            assert_eq!(
                eval::call(&after, name, args, &mut 10_000).unwrap(),
                expected
            );
        }
    }
}

#[test]
fn conditional_certificate_requires_the_exact_scoped_premise() {
    let ctx = library::load(&root().join("lock.json")).unwrap().context;
    let Declaration::Theorem {
        params,
        conditions,
        from,
        to,
        proof,
    } = object("given_equal").declaration
    else {
        panic!()
    };
    ctx.check(&params, &conditions, &from, &to, &proof).unwrap();
    assert!(ctx
        .check(&params, &[], &from, &to, &proof)
        .unwrap_err()
        .contains("hypothesis"));
    let wrong = vec![Equation {
        from: var("p0"),
        to: Term::U64(0),
    }];
    assert!(ctx
        .check(&params, &wrong, &from, &to, &proof)
        .unwrap_err()
        .contains("identity"));
    let mut unbound = proof.clone();
    if let Proof::BitVector { hypotheses, .. } = &mut unbound {
        hypotheses.clear();
    }
    assert!(ctx
        .check(&params, &conditions, &from, &to, &unbound)
        .unwrap_err()
        .contains("identity"));
    let use_proof = Proof::Use {
        theorem: names()["given_equal"].clone(),
        arguments: vec![var("p0"), var("p1")],
        premises: vec![Proof::Hypothesis(0)],
    };
    ctx.check(&params, &conditions, &from, &to, &use_proof)
        .unwrap();
    assert!(ctx.check(&params, &wrong, &from, &to, &use_proof).is_err());
    assert!(ctx.check(&params, &[], &from, &to, &use_proof).is_err());
    // A premise that depends on a different pair of variables cannot be reused.
    let swapped = vec![Equation {
        from: var("p1"),
        to: Term::U64(0),
    }];
    assert!(ctx.check(&params, &swapped, &from, &to, &proof).is_err());
}

#[test]
fn content_rehashed_false_and_corrupt_proofs_still_fail_kernel_checks() {
    let fixture = Fixture::new();
    for case in 0..5 {
        let mut o = object("given_equal");
        let Declaration::Theorem {
            params,
            conditions,
            from,
            to,
            proof,
        } = &mut o.declaration
        else {
            panic!()
        };
        let Proof::BitVector {
            from: proof_from,
            to: proof_to,
            hypotheses,
            certificate,
        } = proof
        else {
            panic!()
        };
        match case {
            0 => {
                conditions.clear();
                hypotheses.clear();
            }
            1 => {
                *to = Term::U64(1);
                *proof_to = to.clone();
            }
            2 => {
                certificate.steps.last_mut().unwrap().hints.clear();
            }
            3 => {
                certificate.steps[0].hints.push(usize::MAX);
            }
            _ => {
                *from = binary("+", var("p0"), var("p1"));
                *proof_from = from.clone();
            }
        }
        // Even replacing the circuit digest cannot turn a certificate for one
        // obligation into a valid refutation of a different, false obligation.
        certificate.problem_sha256 = Context::default()
            .bitvector_problem(params, conditions, from, to)
            .unwrap()
            .identity()
            .into();
        assert!(
            library::load(&fixture.isolated_object(&o)).is_err(),
            "accepted rehashed corruption {case}"
        );
    }
}

#[test]
fn arithmetic_theorem_composes_with_induction_over_database_defined_lists() {
    let ids = names();
    let datatype = ids["List64"].clone();
    let mut ctx = library::load(&root().join("lock.json")).unwrap().context;
    let cons = |h: Term, t: Term| Term::Construct {
        datatype: datatype.clone(),
        constructor: 1,
        arguments: vec![h, t],
    };
    let nil = Term::Construct {
        datatype: datatype.clone(),
        constructor: 0,
        arguments: vec![],
    };
    ctx.declare(
        "add_zero_map".into(),
        &Declaration::Function {
            params: vec![("xs".into(), Sort::Data(datatype.clone()))],
            result: Sort::Data(datatype.clone()),
            recursive: Some(0),
            body: Term::Match {
                scrutinee: Box::new(var("xs")),
                branches: vec![
                    Branch {
                        bindings: vec![],
                        body: nil.clone(),
                    },
                    Branch {
                        bindings: vec!["h".into(), "t".into()],
                        body: cons(
                            binary("+", var("h"), Term::U64(0)),
                            Term::SelfCall(vec![var("t")]),
                        ),
                    },
                ],
            },
        },
    )
    .unwrap();
    let from = Term::Call {
        function: "add_zero_map".into(),
        arguments: vec![var("xs")],
    };
    let to = var("xs");
    let proof = Proof::Induction {
        variable: "xs".into(),
        from: from.clone(),
        to: to.clone(),
        cases: vec![
            Case {
                bindings: vec![],
                proof: Proof::Refl(nil),
            },
            Case {
                bindings: vec!["h".into(), "t".into()],
                proof: Proof::Construct {
                    datatype: datatype.clone(),
                    constructor: 1,
                    arguments: vec![
                        Proof::Use {
                            theorem: ids["add_zero"].clone(),
                            arguments: vec![var("h")],
                            premises: vec![],
                        },
                        Proof::Hypothesis(0),
                    ],
                },
            },
        ],
    };
    let params = vec![("xs".into(), Sort::Data(datatype.clone()))];
    ctx.check(&params, &[], &from, &to, &proof).unwrap();
    assert!(ctx
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
        .is_err());
    for xs in [vec![], vec![0, u64::MAX, 1 << 63], (0..10).collect()] {
        let list = xs.into_iter().rev().fold(
            Term::Construct {
                datatype: ids["List64"].clone(),
                constructor: 0,
                arguments: vec![],
            },
            |t, h| cons(Term::U64(h), t),
        );
        assert_eq!(
            ctx.evaluate(
                &[],
                &Term::Call {
                    function: "add_zero_map".into(),
                    arguments: vec![list.clone()]
                }
            )
            .unwrap(),
            list
        );
    }
}

#[test]
fn stale_source_and_conditional_theorem_cannot_bypass_whole_function_proof() {
    let fixture = Fixture::new();
    let original = syntax::parse(&fs::read_to_string(root().join("kernels.ink")).unwrap()).unwrap();
    let good = package();
    let snapshot = serde_json::to_vec(&original).unwrap();
    for case in 0..3 {
        let mut p = good.clone();
        match case {
            0 => p.proposals[1].from = syntax::Expr::Num(1),
            1 => p.proposals[1].to = syntax::Expr::Num(1),
            _ => {
                p.proposals[1].proof = Proof::Use {
                    theorem: names()["given_equal"].clone(),
                    arguments: vec![var("p0"), Term::U64(0)],
                    premises: vec![Proof::Refl(var("p0"))],
                }
            }
        }
        let mut after = original.clone();
        assert!(implementation::apply(&mut after, &fixture.package(&p)).is_err());
        assert_eq!(
            serde_json::to_vec(&after).unwrap(),
            snapshot,
            "partial changes survived failure"
        );
    }
}
