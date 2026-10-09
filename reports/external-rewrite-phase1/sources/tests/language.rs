use verified_language::{
    check,
    eval::{self, Value},
    native,
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
        "module t; state x: u64 = ;",
        "module t; fn f(x: u64)->u64{return 18446744073709551616;}",
        "module t; /*",
        "module t; fn f(x: u64)->u64{return @;}",
    ] {
        assert!(parse(s).is_err());
    }
}
#[test]
fn arbitrary_symbol_names_cannot_collide_with_c_temporaries() {
    let p=parse("module t; fn f(xs: List<u64>, lang_t0: u64) -> u64 { return sum(xs.map(fn(lang_a0) => lang_a0 + lang_t0)); }").unwrap();
    check::check(&p).unwrap();
    assert!(native::emit(&p).unwrap().contains("lang_a1"));
}
