//! General lexical place/alias recognition. Algebraic collection analysis and
//! source-derived property authoring live in the knowledge database.
use crate::core::Expr;
const MAX_DEPTH: usize = 128;
pub fn lexical_projection(e: &Expr) -> Option<(&str, Vec<&str>)> {
    let mut receiver = e;
    let mut fields = Vec::new();
    loop {
        match receiver {
            Expr::Var(name) => {
                fields.reverse();
                return Some((name, fields));
            }
            Expr::Field(base, field) if fields.len() < MAX_DEPTH => {
                fields.push(field.as_str());
                receiver = base;
            }
            _ => return None,
        }
    }
}
pub fn returned_alias<'a>(e: &'a Expr, name: &'a str) -> bool {
    let mut body = e;
    let mut variable = name;
    for _ in 0..MAX_DEPTH {
        match body {
            Expr::Var(n) => return n == variable,
            Expr::Let(n, _, a, b) if matches!(a.as_ref(),Expr::Var(v)if v==variable) => {
                variable = n;
                body = b;
            }
            _ => return false,
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn aliases_require_literal_lexical_bindings() {
        let v = |n: &str| Expr::Var(n.into());
        let alias = Expr::Let(
            "local".into(),
            None,
            Box::new(v("input")),
            Box::new(v("local")),
        );
        assert!(returned_alias(&alias, "input"));
        assert!(!returned_alias(&alias, "other"));
        let field = Expr::Field(Box::new(v("input")), "values".into());
        assert_eq!(lexical_projection(&field), Some(("input", vec!["values"])));
        assert!(lexical_projection(&Expr::Call("helper".into(), vec![v("input")])).is_none());
    }
}
