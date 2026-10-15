//! Source approximation clauses expand to ordinary, checked postconditions.
//! There is no approximate equality axiom and no authority attached to syntax.
use crate::{core::{Expr, Type}, LangResult};

fn call(name: &str, args: Vec<Expr>) -> Expr { Expr::Call(name.into(), args) }
fn var(name: &str) -> Expr { Expr::Var(name.into()) }
fn bin(op: &str, left: Expr, right: Expr) -> Expr {
    Expr::Binary(op.into(), Box::new(left), Box::new(right))
}
fn integer(value: Expr) -> Expr { call("Int", vec![value]) }
fn bind(name: &str, ty: Type, value: Expr, body: Expr) -> Expr {
    Expr::Let(name.into(), Some(Box::new(ty)), Box::new(value), Box::new(body))
}
fn distance(left: Expr, right: Expr) -> Expr {
    call("choose", vec![bin("<", left.clone(), right.clone()),
        bin("-", right.clone(), left.clone()), bin("-", left, right)])
}
// Both signed zeros have the same rank. Adjacent finite values on either side
// of zero differ by one. NaNs and infinities are excluded by the predicate.
fn rank(bits: Expr) -> Expr {
    let magnitude = call("word_and", vec![bits.clone(), Expr::Num(0x7fff_ffff)]);
    call("choose", vec![bin("!=", call("word_and", vec![bits, Expr::Num(0x8000_0000)]), Expr::Num(0)),
        bin("-", Expr::Num(0x8000_0000), magnitude.clone()),
        bin("+", Expr::Num(0x8000_0000), magnitude)])
}

pub(crate) fn predicate(result: &Type, reference: Expr, metric: &str, budget: Expr,
    names: [String; 4]) -> LangResult<Expr> {
    let [expected, limit, left, right] = names;
    let actual = var("result");
    let nonnegative = bin(">=", var(&limit), integer(Expr::Num(0)));
    let condition = match (metric, result) {
        ("absolute", Type::Int | Type::U32 | Type::U64 | Type::I32) => {
            let a=integer(actual); let r=integer(var(&expected));
            bin("&&", nonnegative, bin("&&",
                bin("<=", bin("-",a.clone(),r.clone()),var(&limit)),
                bin("<=", bin("-",r,a),var(&limit))))
        }
        ("ulps", Type::F32) => {
            let close = bin("<=", distance(integer(var(&left)), integer(var(&right))), var(&limit));
            let close = bind(&left, Type::U32, rank(call("f32_bits", vec![actual.clone()])),
                bind(&right, Type::U32, rank(call("f32_bits", vec![var(&expected)])), close));
            bin("&&", nonnegative, bin("&&", call("is_finite", vec![actual]),
                bin("&&", call("is_finite", vec![var(&expected)]), close)))
        }
        _ => return Err("approximation requires absolute with an integer result, or ulps with f32".into()),
    };
    // Explicit types prevent a large word reference from being narrowed by a
    // literal budget. Exact Int subtraction prevents unsigned/signed overflow.
    Ok(bind(&expected, result.clone(), reference,
        bind(&limit, Type::Int, integer(budget), condition)))
}

pub(crate) fn relative(result: &Type, reference: Expr, numerator: Expr, denominator: Expr,
    names: [String; 4]) -> LangResult<Expr> {
    if !matches!(result, Type::Int | Type::U32 | Type::U64 | Type::I32) {
        return Err("relative approximation requires an integer result".into());
    }
    let [expected, num, den, scale] = names;
    let r=integer(var(&expected)); let a=integer(var("result"));
    let bound=bin("*",var(&scale),var(&num));
    let condition=bin("&&",bin(">=",var(&num),integer(Expr::Num(0))),
        bin("&&",bin(">",var(&den),integer(Expr::Num(0))),
            bin("&&",bin("<=",bin("*",bin("-",a.clone(),r.clone()),var(&den)),bound.clone()),
                bin("<=",bin("*",bin("-",r.clone(),a),var(&den)),bound))));
    let magnitude=call("choose",vec![bin("<",r.clone(),integer(Expr::Num(0))),Expr::Neg(Box::new(r.clone())),r]);
    Ok(bind(&expected,result.clone(),reference,
        bind(&num,Type::Int,integer(numerator),
            bind(&den,Type::Int,integer(denominator),bind(&scale,Type::Int,magnitude,condition)))))
}
