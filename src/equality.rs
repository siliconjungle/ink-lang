//! Equality calculus over total scalar semantics, with no algebraic rewrite laws.
use crate::{
    check::{self, Env},
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Proof {
    Refl(Expr),
    Compute {
        from: Expr,
        to: Expr,
    },
    Sym(Box<Proof>),
    Trans(Box<Proof>, Box<Proof>),
    Binary {
        op: String,
        left: Box<Proof>,
        right: Box<Proof>,
    },
    BoolCases {
        variable: String,
        from: Expr,
        to: Expr,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
}
pub struct Budget {
    remaining: usize,
}
impl Budget {
    pub fn new() -> Self {
        Self { remaining: 100_000 }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if self.remaining == 0 || depth > 128 {
            return Err("equality proof resource limit".into());
        }
        self.remaining -= 1;
        Ok(())
    }
}
impl Default for Budget {
    fn default() -> Self {
        Self::new()
    }
}
fn scalar(e: &Expr, budget: &mut Budget, depth: usize) -> LangResult<()> {
    budget.step(depth)?;
    match e {
        Expr::Var(_) | Expr::Num(_) | Expr::Bool(_) => Ok(()),
        Expr::Binary(_, a, b) => {
            scalar(a, budget, depth + 1)?;
            scalar(b, budget, depth + 1)
        }
        _ => Err("equality calculus requires total scalar expressions".into()),
    }
}
pub fn term_type(e: &Expr, env: &Env, budget: &mut Budget) -> LangResult<Type> {
    scalar(e, budget, 0)?;
    let ty = check::infer(e, env, &Program::default())?;
    if !matches!(ty, Type::Bool | Type::U64) {
        return Err("non-scalar proof type".into());
    }
    Ok(ty)
}
fn pair(a: &Expr, b: &Expr, env: &Env, budget: &mut Budget) -> LangResult<()> {
    if term_type(a, env, budget)? != term_type(b, env, budget)? {
        return Err("equality type mismatch".into());
    }
    Ok(())
}
pub fn substitute(e: &Expr, bindings: &std::collections::BTreeMap<String, Expr>) -> Expr {
    match e {
        Expr::Var(n) => bindings.get(n).cloned().unwrap_or_else(|| e.clone()),
        Expr::Binary(op, a, b) => Expr::Binary(
            op.clone(),
            Box::new(substitute(a, bindings)),
            Box::new(substitute(b, bindings)),
        ),
        _ => e.clone(),
    }
}
// Only execute primitives on literals. No symbolic identities such as x+0=x.
fn compute(e: &Expr, budget: &mut Budget, depth: usize) -> LangResult<Expr> {
    budget.step(depth)?;
    let Expr::Binary(op, a, b) = e else {
        return Ok(e.clone());
    };
    let a = compute(a, budget, depth + 1)?;
    let b = compute(b, budget, depth + 1)?;
    let value = match (&a, &b) {
        (Expr::Num(x), Expr::Num(y)) => match op.as_str() {
            "+" => Some(Expr::Num(x.wrapping_add(*y))),
            "-" => Some(Expr::Num(x.wrapping_sub(*y))),
            "*" => Some(Expr::Num(x.wrapping_mul(*y))),
            "==" => Some(Expr::Bool(x == y)),
            "!=" => Some(Expr::Bool(x != y)),
            "<" => Some(Expr::Bool(x < y)),
            "<=" => Some(Expr::Bool(x <= y)),
            ">" => Some(Expr::Bool(x > y)),
            ">=" => Some(Expr::Bool(x >= y)),
            _ => None,
        },
        (Expr::Bool(x), Expr::Bool(y)) => match op.as_str() {
            "&&" => Some(Expr::Bool(*x && *y)),
            "||" => Some(Expr::Bool(*x || *y)),
            "==" => Some(Expr::Bool(x == y)),
            "!=" => Some(Expr::Bool(x != y)),
            _ => None,
        },
        _ => None,
    };
    Ok(value.unwrap_or_else(|| Expr::Binary(op.clone(), Box::new(a), Box::new(b))))
}
fn derive(p: &Proof, env: &Env, budget: &mut Budget, depth: usize) -> LangResult<(Expr, Expr)> {
    budget.step(depth)?;
    let (a, b) = match p {
        Proof::Refl(t) => (t.clone(), t.clone()),
        Proof::Compute { from, to } => {
            pair(from, to, env, budget)?;
            if compute(from, budget, 0)? != compute(to, budget, 0)? {
                return Err("primitive evaluation does not establish equality".into());
            }
            (from.clone(), to.clone())
        }
        Proof::Sym(p) => {
            let (a, b) = derive(p, env, budget, depth + 1)?;
            (b, a)
        }
        Proof::Trans(p, q) => {
            let (a, b) = derive(p, env, budget, depth + 1)?;
            let (c, d) = derive(q, env, budget, depth + 1)?;
            if b != c {
                return Err("transitivity middle terms differ".into());
            }
            (a, d)
        }
        Proof::Binary { op, left, right } => {
            let (a, b) = derive(left, env, budget, depth + 1)?;
            let (c, d) = derive(right, env, budget, depth + 1)?;
            (
                Expr::Binary(op.clone(), Box::new(a), Box::new(c)),
                Expr::Binary(op.clone(), Box::new(b), Box::new(d)),
            )
        }
        Proof::BoolCases {
            variable,
            from,
            to,
            on_false,
            on_true,
        } => {
            if env.get(variable) != Some(&Type::Bool) {
                return Err("case variable must have Bool type".into());
            }
            pair(from, to, env, budget)?;
            let mut local = env.clone();
            local.remove(variable);
            for (value, proof) in [(false, on_false), (true, on_true)] {
                let binding = [(variable.clone(), Expr::Bool(value))].into();
                let want = (substitute(from, &binding), substitute(to, &binding));
                if derive(proof, &local, budget, depth + 1)? != want {
                    return Err("case branch does not prove the instantiated statement".into());
                }
            }
            (from.clone(), to.clone())
        }
    };
    pair(&a, &b, env, budget)?;
    Ok((a, b))
}
pub fn verify(params: &[(String, Type)], from: &Expr, to: &Expr, proof: &Proof) -> LangResult<()> {
    if params.len() > 64
        || params
            .iter()
            .any(|(_, t)| !matches!(t, Type::Bool | Type::U64))
    {
        return Err("invalid equality context".into());
    }
    let env = check::params_env(params)?;
    let mut budget = Budget::new();
    pair(from, to, &env, &mut budget)?;
    let (a, b) = derive(proof, &env, &mut budget, 0)?;
    if &a != from || &b != to {
        return Err("proof proves a different statement".into());
    }
    Ok(())
}
