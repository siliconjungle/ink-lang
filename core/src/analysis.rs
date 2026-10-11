//! Shared structural and lexical analysis. This module grants no rewrite authority.
use crate::core::Expr;
use std::collections::BTreeSet;

/// Immediate children in source evaluation order. Exhaustive over executable IR.
pub fn children(e: &Expr) -> Vec<&Expr> {
    match e {
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => vec![a, b],
        Expr::Lambda(_, a) | Expr::Neg(a) | Expr::Field(a, _) | Expr::Try(a) => vec![a],
        Expr::Call(_, args) => args.iter().collect(),
        Expr::Method(receiver, _, args) => std::iter::once(receiver.as_ref()).chain(args).collect(),
        Expr::Record(_, fields) => fields.iter().map(|(_, e)| e).collect(),
        Expr::Num(_)
        | Expr::Float(_)
        | Expr::Bool(_)
        | Expr::String(_)
        | Expr::Unit
        | Expr::Var(_) => vec![],
    }
}

/// Iterative traversal: source nesting cannot exhaust the analysis call stack.
pub fn walk(e: &Expr, mut visit: impl FnMut(&Expr)) {
    let mut pending = vec![e];
    while let Some(e) = pending.pop() {
        visit(e);
        pending.extend(children(e).into_iter().rev());
    }
}

pub fn node_count(e: &Expr, limit: usize) -> Option<usize> {
    let mut pending = vec![e];
    let mut count = 0usize;
    while let Some(e) = pending.pop() {
        count = count.checked_add(1)?;
        if count > limit {
            return None;
        }
        pending.extend(children(e));
    }
    Some(count)
}

pub fn free_variables(e: &Expr) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut pending = vec![(e, BTreeSet::new())];
    while let Some((e, scope)) = pending.pop() {
        match e {
            Expr::Var(n) => {
                if !scope.contains(n) {
                    out.insert(n.clone());
                }
            }
            Expr::Let(n, _, initializer, body) => {
                pending.push((initializer, scope.clone()));
                let mut local = scope;
                local.insert(n.clone());
                pending.push((body, local));
            }
            Expr::Lambda(n, body) => {
                let mut local = scope;
                local.insert(n.clone());
                pending.push((body, local));
            }
            _ => pending.extend(children(e).into_iter().map(|e| (e, scope.clone()))),
        }
    }
    out
}

pub fn references_free(e: &Expr, name: &str) -> bool {
    free_variables(e).contains(name)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shadowing_applies_to_body_but_not_initializer() {
        let v = |n: &str| Box::new(Expr::Var(n.into()));
        let e = Expr::Let(
            "a".into(),
            None,
            v("a"),
            Box::new(Expr::Lambda("a".into(), v("a"))),
        );
        assert_eq!(free_variables(&e), BTreeSet::from(["a".into()]));
        assert_eq!(node_count(&e, 4), Some(4));
        assert_eq!(node_count(&e, 3), None);
        let e = Expr::Lambda("a".into(), Box::new(e));
        assert!(free_variables(&e).is_empty());
    }
    #[test]
    fn captures_under_try_record_and_method_are_seen() {
        let e = Expr::Try(Box::new(Expr::Record(
            "R".into(),
            vec![(
                "x".into(),
                Expr::Method(
                    Box::new(Expr::Var("xs".into())),
                    "map".into(),
                    vec![Expr::Lambda(
                        "x".into(),
                        Box::new(Expr::Var("capture".into())),
                    )],
                ),
            )],
        )));
        assert_eq!(
            free_variables(&e),
            BTreeSet::from(["xs".into(), "capture".into()])
        );
    }
}
