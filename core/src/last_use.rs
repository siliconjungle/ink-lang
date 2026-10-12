//! Conservative lexical final-use facts for literal ownership lowering.
//! No algebraic rewrite or workload-specific strategy is selected here.
use crate::core::Expr;
use std::collections::{BTreeMap, BTreeSet};

/// Sites refer to this borrowed expression tree only; they are never proof IDs.
#[derive(Default)]
pub struct LastUses {
    sites: BTreeSet<usize>,
}
impl LastUses {
    pub fn contains(&self, expression: &Expr) -> bool {
        self.sites.contains(&(expression as *const Expr as usize))
    }
}

/// Captured bindings remain shared, even when a callback is syntactically last:
/// callbacks may run repeatedly. Shadowing uses fresh binding identities.
/// Excessive depth/node count fails closed to ordinary copying.
pub fn analyse<'a>(body: &'a Expr, parameters: impl IntoIterator<Item = &'a str>) -> LastUses {
    struct Walk {
        next: usize,
        nodes: usize,
        uses: Vec<(usize, usize)>,
        captured: BTreeSet<usize>,
    }
    fn visit(e: &Expr, env: &BTreeMap<String, usize>, w: &mut Walk, depth: usize) -> Option<()> {
        w.nodes += 1;
        if depth > 256 || w.nodes > 1_000_000 {
            return None;
        }
        match e {
            Expr::Var(n) => {
                if let Some(id) = env.get(n) {
                    w.uses.push((*id, e as *const Expr as usize));
                }
            }
            Expr::Let(n, _, a, b) => {
                visit(a, env, w, depth + 1)?;
                let mut local = env.clone();
                local.insert(n.clone(), w.next);
                w.next += 1;
                visit(b, &local, w, depth + 1)?;
            }
            Expr::Lambda(n, b) => {
                for name in crate::analysis::free_variables(e) {
                    if let Some(id) = env.get(&name) {
                        w.captured.insert(*id);
                    }
                }
                let mut local = env.clone();
                local.insert(n.clone(), w.next);
                w.next += 1;
                visit(b, &local, w, depth + 1)?;
            }
            _ => {
                for child in crate::analysis::children(e) {
                    visit(child, env, w, depth + 1)?;
                }
            }
        }
        Some(())
    }
    let env: BTreeMap<_, _> = parameters
        .into_iter()
        .enumerate()
        .map(|(i, n)| (n.to_owned(), i))
        .collect();
    let mut w = Walk {
        next: env.len(),
        nodes: 0,
        uses: vec![],
        captured: BTreeSet::new(),
    };
    if visit(body, &env, &mut w, 0).is_none() {
        return LastUses::default();
    }
    let mut seen = w.captured;
    let sites = w
        .uses
        .into_iter()
        .rev()
        .filter_map(|(id, site)| if seen.insert(id) { Some(site) } else { None })
        .collect();
    LastUses { sites }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn v(n: &str) -> Expr {
        Expr::Var(n.into())
    }
    #[test]
    fn eager_arguments_and_shadowing() {
        let e = Expr::Let(
            "xs".into(),
            None,
            Box::new(v("xs")),
            Box::new(Expr::Call("pair".into(), vec![v("xs"), v("xs")])),
        );
        let facts = analyse(&e, ["xs"]);
        let Expr::Let(_, _, a, b) = &e else {
            unreachable!()
        };
        let Expr::Call(_, args) = b.as_ref() else {
            unreachable!()
        };
        assert!(facts.contains(a));
        assert!(!facts.contains(&args[0]));
        assert!(facts.contains(&args[1]));
    }
    #[test]
    fn repeated_callback_captures_never_move() {
        let e = Expr::Call(
            "pair".into(),
            vec![
                Expr::Lambda(
                    "i".into(),
                    Box::new(Expr::Call("get".into(), vec![v("xs"), v("i")])),
                ),
                v("xs"),
            ],
        );
        let facts = analyse(&e, ["xs"]);
        let Expr::Call(_, args) = &e else {
            unreachable!()
        };
        assert!(!facts.contains(&args[1]));
        let Expr::Lambda(_, b) = &args[0] else {
            unreachable!()
        };
        let Expr::Call(_, args) = b.as_ref() else {
            unreachable!()
        };
        assert!(!facts.contains(&args[0]));
        assert!(facts.contains(&args[1]));
    }
    #[test]
    fn branch_order_is_conservative_and_depth_fails_closed() {
        let e = Expr::Call("choose".into(), vec![Expr::Bool(true), v("xs"), v("xs")]);
        let f = analyse(&e, ["xs"]);
        let Expr::Call(_, a) = &e else { unreachable!() };
        assert!(!f.contains(&a[1]));
        assert!(f.contains(&a[2]));
        let mut deep = v("xs");
        for _ in 0..257 {
            deep = Expr::Neg(Box::new(deep));
        }
        assert!(analyse(&deep, ["xs"]).sites.is_empty());
    }
}
