//! Exact finite carriers at a comparison use site. This changes neither Ink's
//! unbounded Int values nor any collection computation. JavaScript Array lengths
//! are exact Numbers (at most 2^32-1); both operands below are therefore exact
//! integers, so all six comparisons agree with their BigInt counterparts.
use ink_core::syntax::{Expr, Type};

fn operand(e: &Expr) -> bool {
    match e {
        Expr::Num(n) => *n <= 9_007_199_254_740_991,
        Expr::Call(name, args) => name == "count" && args.len() == 1,
        _ => false,
    }
}

pub(crate) fn comparison(op: &str, ty: &Type, a: &Expr, b: &Expr) -> bool {
    *ty == Type::Int
        && matches!(op, "==" | "!=" | "<" | "<=" | ">" | ">=")
        && operand(a) && operand(b)
}

pub(crate) fn emit(op: &str, a: &str, b: &str) -> String {
    let op = match op { "==" => "===", "!=" => "!==", _ => op };
    format!("(({a}) {op} ({b}))")
}
