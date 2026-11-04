//! Standalone core coverage for learnable-hole lowering and admission.
use ink_core::{core::CheckedModule, syntax};

const SOURCE: &str = "module h;
enum E { A, B, C, }
fn authored(e: E) -> Option<E> { if e == E.A { return Some(E.B); } return None; }
fn pick(e: E) -> E { return authored(e).unwrap_or(learn fill(e): choice<E>); }
fn score(x: f32) -> f32 ensures result >= 0.0 { return x + learn adjust([x]): Mlp<1, 3, 1> else 0.0; }
objective wrong(xs: List<E>) -> f32 { return foldl(xs, 0.0, fn(e)=>fn(t)=>t + choose(pick(e) == E.C, 0.0, 1.0)); }";

#[test]
fn holes_lower_into_checked_ordinary_declarations() {
    let m = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let d = &m.program().contracts.learning;
    assert_eq!(d.holes.iter().map(|h| (h.name.as_str(), h.admission.as_str())).collect::<Vec<_>>(),
        [("fill", "error-path"), ("adjust", "guarded")]);
    assert_eq!((d.holes[0].parameters, d.holes[0].choices), (3, 3));
    assert_eq!(d.holes[1].parameters, 10);
    assert_eq!(d.objectives, ["wrong"]);
    let pick = m.program().functions.iter().find(|f| f.name == "pick").unwrap();
    assert_eq!(pick.params.last().unwrap().0, "__holes");
    assert!(CheckedModule::from_bytes(&m.bytes().unwrap()).is_ok());
}

#[test]
fn unadmitted_holes_and_stray_guards_are_rejected() {
    for (source, message) in [
        ("module n; fn f(x: f32) -> f32 { return x + learn a([x]): Mlp<1, 2, 1>; }", "not admitted"),
        ("module n; fn f(x: f32) -> f32 ensures result >= 0.0 { return x; }", "has none"),
        ("module n; enum E { A, } fn g(e: E) -> Option<E> { return None; } fn f(e: E) -> E { return g(e).unwrap_or(learn a(e): choice<E>); } objective o(x: f32) -> f32 { return x; }", "does not depend"),
    ] {
        let error = syntax::parse(source).and_then(CheckedModule::from_source).unwrap_err();
        assert!(error.contains(message), "{error}");
    }
    // `learn change` keeps its meaning beside expression holes.
    syntax::parse("module n; trainable state W: f32 = 0.0; learn change set(x: f32) -> Result<Unit, String> writes(W) { W = x; return Ok(()); }")
        .and_then(CheckedModule::from_source).unwrap();
}
