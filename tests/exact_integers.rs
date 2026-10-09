use num_bigint::BigInt;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};
use verified_language::{
    library::{self, Object},
    logic::{Context, Declaration, Proof, Sort, Term},
};

fn root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/exact-integers")
}
fn names() -> BTreeMap<String, String> {
    serde_json::from_slice(&fs::read(root().join("names.json")).unwrap()).unwrap()
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
fn natural(ids: &BTreeMap<String, String>, n: usize) -> Term {
    (0..n).fold(ctor(&ids["Natural"], 0, vec![]), |t, _| {
        ctor(&ids["Natural"], 1, vec![t])
    })
}
fn integer(ids: &BTreeMap<String, String>, n: i64) -> Term {
    if n == 0 {
        ctor(&ids["Integer"], 0, vec![])
    } else {
        ctor(
            &ids["Integer"],
            if n > 0 { 1 } else { 2 },
            vec![natural(ids, (n.unsigned_abs() - 1) as usize)],
        )
    }
}
fn decode(ids: &BTreeMap<String, String>, term: &Term) -> BigInt {
    let Term::Construct {
        datatype,
        constructor,
        arguments,
    } = term
    else {
        panic!("not a canonical integer: {term:?}")
    };
    assert_eq!(datatype, &ids["Integer"]);
    if *constructor == 0 {
        assert!(arguments.is_empty());
        return BigInt::from(0);
    }
    assert_eq!(arguments.len(), 1);
    let mut n = 1usize;
    let mut t = &arguments[0];
    loop {
        let Term::Construct {
            datatype,
            constructor,
            arguments,
        } = t
        else {
            panic!("not a canonical magnitude")
        };
        assert_eq!(datatype, &ids["Natural"]);
        if *constructor == 0 {
            assert!(arguments.is_empty());
            break;
        }
        assert_eq!(*constructor, 1);
        assert_eq!(arguments.len(), 1);
        n += 1;
        t = &arguments[0];
    }
    if *constructor == 1 {
        BigInt::from(n)
    } else {
        assert_eq!(*constructor, 2);
        -BigInt::from(n)
    }
}
fn evaluate(ctx: &Context, ids: &BTreeMap<String, String>, name: &str, args: Vec<Term>) -> BigInt {
    decode(ids, &ctx.evaluate(&[], &call(&ids[name], args)).unwrap())
}
fn list(ids: &BTreeMap<String, String>, xs: &[i64]) -> Term {
    xs.iter()
        .rev()
        .fold(ctor(&ids["IntegerList"], 0, vec![]), |t, &x| {
            ctor(&ids["IntegerList"], 1, vec![integer(ids, x), t])
        })
}

#[test]
fn independently_defined_integers_agree_with_bigint_and_cross_zero() {
    let library = library::load(&root().join("lock.json")).unwrap();
    assert_eq!(library.closure.len(), 35);
    let ids = names();
    let ctx = library.context;
    for x in -10..=10 {
        let term = integer(&ids, x);
        assert_eq!(
            evaluate(&ctx, &ids, "successor", vec![term.clone()]),
            BigInt::from(x) + 1
        );
        assert_eq!(
            evaluate(&ctx, &ids, "predecessor", vec![term.clone()]),
            BigInt::from(x) - 1
        );
        assert_eq!(
            evaluate(&ctx, &ids, "negation", vec![term.clone()]),
            -BigInt::from(x)
        );
        for y in -10..=10 {
            assert_eq!(
                evaluate(&ctx, &ids, "addition", vec![term.clone(), integer(&ids, y)]),
                BigInt::from(x) + BigInt::from(y)
            );
            assert_eq!(
                evaluate(
                    &ctx,
                    &ids,
                    "subtraction",
                    vec![term.clone(), integer(&ids, y)]
                ),
                BigInt::from(x) - BigInt::from(y)
            );
        }
        for n in 0..=8 {
            assert_eq!(
                evaluate(
                    &ctx,
                    &ids,
                    "repeat_successor",
                    vec![natural(&ids, n), term.clone()]
                ),
                BigInt::from(x) + n
            );
            assert_eq!(
                evaluate(
                    &ctx,
                    &ids,
                    "repeat_predecessor",
                    vec![natural(&ids, n), term.clone()]
                ),
                BigInt::from(x) - n
            );
        }
    }
}

#[test]
fn general_induction_proves_arbitrary_position_sum_updates_not_sampled_laws() {
    let ids = names();
    let ctx = library::load(&root().join("lock.json")).unwrap().context;
    for name in ["sum_insert", "sum_replace", "sum_remove"] {
        let object: Object = serde_json::from_slice(
            &fs::read(root().join("objects").join(format!("{}.json", ids[name]))).unwrap(),
        )
        .unwrap();
        let Declaration::Theorem {
            params,
            conditions,
            from,
            to,
            proof,
        } = object.declaration
        else {
            panic!()
        };
        ctx.check(&params, &conditions, &from, &to, &proof).unwrap();
        assert!(ctx
            .check(
                &params,
                &conditions,
                &from,
                &to,
                &Proof::Convert {
                    from: from.clone(),
                    to: to.clone()
                }
            )
            .is_err());
        ctx.check(
            &params,
            &conditions,
            &from,
            &to,
            &Proof::Use {
                theorem: ids[name].clone(),
                arguments: params.iter().map(|(n, _)| Term::Var(n.clone())).collect(),
                premises: vec![],
            },
        )
        .unwrap();
    }
    let vectors = [vec![], vec![0], vec![-1], vec![2, -3, 2], vec![-2, 1, 0]];
    for prefix in &vectors {
        for suffix in &vectors {
            for old in [-3, 0, 3] {
                for new in [-2, 0, 2] {
                    let sum =
                        |xs: &[i64]| evaluate(&ctx, &ids, "sum_integers", vec![list(&ids, xs)]);
                    let mut before = prefix.clone();
                    before.push(old);
                    before.extend(suffix);
                    let mut after = prefix.clone();
                    after.push(new);
                    after.extend(suffix);
                    let mut removed = prefix.clone();
                    removed.extend(suffix);
                    let before_total = sum(&before);
                    let after_total = sum(&after);
                    let removed_total = sum(&removed);
                    assert_eq!(&before_total - old + new, after_total);
                    assert_eq!(&before_total - old, removed_total);
                    assert_eq!(removed_total + new, after_total);
                    assert_eq!(before_total, before.iter().map(|&n| BigInt::from(n)).sum());
                    assert_eq!(after_total, after.iter().map(|&n| BigInt::from(n)).sum());
                }
            }
        }
    }
}

#[test]
fn rehashed_false_theorem_and_missing_direct_import_are_rejected() {
    let ids = names();
    let mut object: Object = serde_json::from_slice(
        &fs::read(
            root()
                .join("objects")
                .join(format!("{}.json", ids["sum_replace"])),
        )
        .unwrap(),
    )
    .unwrap();
    let fixture =
        std::env::temp_dir().join(format!("ink-exact-integer-negative-{}", std::process::id()));
    fs::create_dir_all(fixture.join("objects")).unwrap();
    for entry in fs::read_dir(root().join("objects")).unwrap() {
        let entry = entry.unwrap();
        fs::copy(
            entry.path(),
            fixture.join("objects").join(entry.file_name()),
        )
        .unwrap();
    }
    let Declaration::Theorem {
        from, to, proof, ..
    } = &mut object.declaration
    else {
        panic!()
    };
    *to = Term::Var("new".into());
    *proof = Proof::Refl(from.clone());
    let bytes = serde_json::to_vec(&object).unwrap();
    let identity = format!("{:x}", Sha256::digest(&bytes));
    fs::write(
        fixture.join("objects").join(format!("{identity}.json")),
        bytes,
    )
    .unwrap();
    fs::write(
        fixture.join("lock.json"),
        serde_json::to_vec(
            &serde_json::json!({"schema":1,"semantics":library::SEMANTICS,"objects":[identity]}),
        )
        .unwrap(),
    )
    .unwrap();
    assert!(library::load(&fixture.join("lock.json")).is_err());
    let mut object: Object = serde_json::from_slice(
        &fs::read(
            root()
                .join("objects")
                .join(format!("{}.json", ids["sum_append"])),
        )
        .unwrap(),
    )
    .unwrap();
    object
        .dependencies
        .retain(|id| id != &ids["addition_associates"]);
    let bytes = serde_json::to_vec(&object).unwrap();
    let identity = format!("{:x}", Sha256::digest(&bytes));
    fs::write(
        fixture.join("objects").join(format!("{identity}.json")),
        bytes,
    )
    .unwrap();
    fs::write(
        fixture.join("lock.json"),
        serde_json::to_vec(
            &serde_json::json!({"schema":1,"semantics":library::SEMANTICS,"objects":[identity]}),
        )
        .unwrap(),
    )
    .unwrap();
    assert!(library::load(&fixture.join("lock.json"))
        .unwrap_err()
        .contains("undeclared"));
    fs::remove_dir_all(fixture).unwrap();
    // A hidden type dependency cannot be used for induction without a direct
    // import, even though the complete datatype remains checked internally.
    let ctx = library::load(&root().join("lock.json")).unwrap().context;
    let local = ctx.subset(&[ids["Integer"].clone()]).unwrap();
    assert!(local
        .check(
            &[("n".into(), Sort::Data(ids["Natural"].clone()))],
            &[],
            &Term::Var("n".into()),
            &Term::Var("n".into()),
            &Proof::Refl(Term::Var("n".into()))
        )
        .is_err());
}
