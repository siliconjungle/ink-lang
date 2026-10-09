use sha2::{Digest, Sha256};
use std::{fs, path::Path};
use verified_language::{
    equality::{self, Proof},
    eval::{self, Value},
    knowledge::{self, Object},
    native,
    syntax::{self, Expr, Type},
};
fn var(s: &str) -> Expr {
    Expr::Var(s.into())
}
fn bin(op: &str, a: Expr, b: Expr) -> Expr {
    Expr::Binary(op.into(), Box::new(a), Box::new(b))
}
fn objects() -> Vec<Object> {
    let (lock, _) = knowledge::load(Path::new("knowledge/boolean/lock.json")).unwrap();
    lock.objects
        .iter()
        .map(|id| {
            serde_json::from_slice(
                &fs::read(format!("knowledge/boolean/objects/{id}.json")).unwrap(),
            )
            .unwrap()
        })
        .collect()
}
#[test]
fn checked_database_preserves_all_boolean_inputs_and_word_boundaries() {
    let (_, rules) = knowledge::load(Path::new("knowledge/boolean/lock.json")).unwrap();
    let original = syntax::parse(include_str!("../examples/boolean.lang")).unwrap();
    let mut changed = original.clone();
    assert_eq!(knowledge::apply(&mut changed, &rules).unwrap().len(), 2);
    assert_ne!(
        native::emit(&original).unwrap(),
        native::emit(&changed).unwrap()
    );
    let mut empty = original.clone();
    assert!(knowledge::apply(&mut empty, &[]).unwrap().is_empty());
    assert_eq!(
        native::emit(&original).unwrap(),
        native::emit(&empty).unwrap()
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
    // Potentially partial calls are outside the certified total fragment.
    let mut calls = syntax::parse(
        "module t; fn f(a: Bool) -> Bool {return a;} fn g(a: Bool) -> Bool {return f(a) && f(a);}",
    )
    .unwrap();
    let before = native::emit(&calls).unwrap();
    assert!(knowledge::apply(&mut calls, &rules).unwrap().is_empty());
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
