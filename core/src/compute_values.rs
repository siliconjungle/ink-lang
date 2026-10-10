//! Classification of source values requiring the packed compute ABI.
use crate::syntax::*;
pub fn needed(p: &Program) -> bool {
    fn ty(t: &Type) -> bool {
        match t {
            Type::I32 | Type::F32 | Type::Vector(..) | Type::Named(_) => true,
            Type::List(t) => matches!(**t, Type::Bool) || ty(t),
            _ => false,
        }
    }
    fn expr(e: &Expr) -> bool {
        match e {
            Expr::Float(_) | Expr::Neg(_) | Expr::Let(..) | Expr::Record(..) | Expr::Field(..) => {
                true
            }
            Expr::Call(n, a) => {
                ["repeat", "vec2", "vec3", "vec4", "quot_or", "rem_or"].contains(&n.as_str())
                    || a.iter().any(expr)
            }
            Expr::Method(x, n, a) => {
                ["zip", "map_indexed", "at_or", "scan", "sort"].contains(&n.as_str())
                    || expr(x)
                    || a.iter().any(expr)
            }
            Expr::Binary(_, a, b) => expr(a) || expr(b),
            Expr::Lambda(_, b) => expr(b),
            _ => false,
        }
    }
    p.functions.iter().any(|f| {
        matches!(f.result, Type::List(_))
            || ty(&f.result)
            || f.params.iter().any(|(_, t)| ty(t))
            || expr(&f.body)
    })
}
