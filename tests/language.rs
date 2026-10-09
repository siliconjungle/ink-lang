use verified_language::{
    check,
    eval::{self, Value},
    native, proof,
    syntax::*,
};

#[test]
fn overflow_and_collection_order() {
    let p=parse("module test; fn f(xs: List<u64>) -> u64 { return sum(xs.map(fn(x) => x + 1).filter(fn(y) => y < 3)); }").unwrap();
    check::check(&p).unwrap();
    let r = eval::call(
        &p,
        "f",
        vec![Value::List(vec![
            Value::U64(u64::MAX),
            Value::U64(1),
            Value::U64(3),
        ])],
        &mut 10000,
    )
    .unwrap();
    assert_eq!(r, Value::U64(2));
}
#[test]
fn reject_invalid_types_names_and_recursion() {
    for s in [
        "module t; fn f(x: u64) -> u64 { return x + true; }",
        "module t; fn f(x: u64) -> u64 { return missing; }",
        "module t; fn f(x: u64) -> u64 { return f(x); }",
        "module t; fn f(x: u64, x: u64) -> u64 { return x; }",
        "module t; fn f(xs: List<u64>) -> u64 { return sum(xs.filter(fn(x) => x + 1)); }",
    ] {
        assert!(check::check(&parse(s).unwrap()).is_err(), "accepted {s}");
    }
}
#[test]
fn syntax_errors_are_not_silently_ignored() {
    for s in [
        "module t; state x: u64 = 0;",
        "module t; fn f(x: u64)->u64{return 18446744073709551616;}",
        "module t; /*",
        "module t; fn f(x: u64)->u64{return @;}",
    ] {
        assert!(parse(s).is_err());
    }
}
#[test]
fn ring_checker_accepts_true_rejects_false_and_tampered() {
    let p = parse(include_str!("../knowledge/ring.lang")).unwrap();
    for r in p.rules {
        let c = proof::prove(&r).unwrap();
        proof::verify(&c).unwrap();
        let mut bad = c.clone();
        bad.id.push('0');
        assert!(proof::verify(&bad).is_err());
    }
    let p =
        parse("module t; rewrite false_rule(x: u64) { from x + 1; to x; proof by arithmetic; }")
            .unwrap();
    assert!(proof::prove(&p.rules[0]).is_err());
    let p = parse(
        "module t; rewrite unbound(x: u64, y: u64) { from x * 0; to y * 0; proof by arithmetic; }",
    )
    .unwrap();
    assert!(proof::prove(&p.rules[0]).is_err());
}
#[test]
fn knowledge_changes_code_and_preserves_boundary_values() {
    let p = parse(include_str!("../examples/kernels.lang")).unwrap();
    check::check(&p).unwrap();
    let rules = parse(include_str!("../knowledge/ring.lang"))
        .unwrap()
        .rules
        .iter()
        .map(proof::prove)
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    let mut q = p.clone();
    let mut used = Vec::new();
    for f in &mut q.functions {
        f.body = proof::optimise(&f.body, &rules, &mut used, &mut 10000);
    }
    check::check(&q).unwrap();
    assert!(!used.is_empty());
    assert_ne!(native::emit(&p).unwrap(), native::emit(&q).unwrap());
    for xs in [vec![], vec![0, 1, 2], vec![u64::MAX, u64::MAX - 1, 1 << 63]] {
        let args = vec![Value::List(xs.into_iter().map(Value::U64).collect())];
        assert_eq!(
            eval::call(&p, "expanded", args.clone(), &mut 10000).unwrap(),
            eval::call(&q, "expanded", args, &mut 10000).unwrap()
        );
    }
}
#[test]
fn arbitrary_symbol_names_cannot_collide_with_c_temporaries() {
    let p=parse("module t; fn f(xs: List<u64>, lang_t0: u64) -> u64 { return sum(xs.map(fn(lang_a0) => lang_a0 + lang_t0)); }").unwrap();
    check::check(&p).unwrap();
    assert!(native::emit(&p).unwrap().contains("lang_a1"));
}
