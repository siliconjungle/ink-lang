//! Ordered parallel work has the same value semantics as indexed mapping.
//! Scheduling hints never establish independence or optimisation authority.
use crate::{
    check::{self, Env},
    syntax::*,
    LangResult,
};

pub fn map_type(
    xs: &Expr,
    grain: &Expr,
    callback: &Expr,
    env: &Env,
    p: &Program,
    want: Option<&Type>,
    buffer: bool,
) -> LangResult<Type> {
    let input = check::infer(xs, env, p)?;
    let inner = match input {
        Type::List(t) if !buffer => t,
        Type::Buffer(t) if buffer => t,
        _ => return Err("parallel mapping requires a list or owned buffer".into()),
    };
    check::infer_as(grain, env, p, &Type::U32)?;
    let Expr::Lambda(index, rest) = callback else {
        return Err("parallel map requires index lambda".into());
    };
    let Expr::Lambda(item, body) = rest.as_ref() else {
        return Err("parallel map requires element lambda".into());
    };
    if index == item {
        return Err("parallel map parameters must be distinct".into());
    }
    let mut local = env.clone();
    local.insert(index.clone(), Type::U32);
    local.insert(item.clone(), *inner.clone());
    let expected = if buffer {
        Some(inner.as_ref())
    } else {
        match want {
            Some(Type::List(t)) => Some(t.as_ref()),
            _ => None,
        }
    };
    let out = check::infer_context(body, &local, p, expected)?;
    if expected.is_some_and(|t| t != &out) {
        return Err("parallel map result type mismatch".into());
    }
    if crate::local_collections::owned(&out, p) {
        return Err("parallel results cannot contain owned storage".into());
    }
    // Unlike sequential callbacks, parallel callbacks cannot even borrow captured
    // owners. Local storage constructed separately by each invocation is allowed.
    fn captures(e: &Expr, names: &mut std::collections::BTreeSet<String>) {
        match e {
            Expr::Var(n) => {
                names.insert(n.clone());
            }
            Expr::Lambda(n, b) => {
                let mut local = Default::default();
                captures(b, &mut local);
                local.remove(n);
                names.extend(local);
            }
            Expr::Let(n, _, a, b) => {
                captures(a, names);
                let mut local = Default::default();
                captures(b, &mut local);
                local.remove(n);
                names.extend(local);
            }
            Expr::Binary(_, a, b) => {
                captures(a, names);
                captures(b, names);
            }
            Expr::Call(_, args) => {
                for a in args {
                    captures(a, names);
                }
            }
            Expr::Method(x, _, args) => {
                captures(x, names);
                for a in args {
                    captures(a, names);
                }
            }
            Expr::Field(x, _) | Expr::Neg(x) | Expr::Try(x) => captures(x, names),
            Expr::Record(_, fs) => {
                for (_, e) in fs {
                    captures(e, names);
                }
            }
            _ => (),
        }
    }
    let mut names = Default::default();
    captures(callback, &mut names);
    if names.iter().any(|n| {
        env.get(n)
            .is_some_and(|t| crate::local_collections::owned(t, p))
    }) {
        return Err("parallel callback cannot capture owned temporary storage".into());
    }
    Ok(if buffer {
        Type::Buffer(Box::new(out))
    } else {
        Type::List(Box::new(out))
    })
}
