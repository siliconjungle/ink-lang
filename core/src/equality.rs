//! Equality calculus over total scalar semantics, with no algebraic rewrite laws.
use crate::{
    check::{self, Env},
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Proof {
    Hypothesis(usize),
    UseConditional {
        theorem: String,
        arguments: Vec<Expr>,
        premises: Vec<Proof>,
    },
    ShortCircuit {
        op: String,
        left: Box<Proof>,
        right: Box<Proof>,
    },
    Refl(Expr),
    Use {
        theorem: String,
        arguments: Vec<Expr>,
    },
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
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Equation {
    pub from: Expr,
    pub to: Expr,
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
// Simultaneous substitution: inserted arguments are never substituted again.
fn substitute(
    e: &Expr,
    bindings: &BTreeMap<String, Expr>,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<Expr> {
    budget.step(depth)?;
    match e {
        Expr::Var(n) if bindings.contains_key(n) => {
            substitute(&bindings[n], &BTreeMap::new(), budget, depth + 1)
        }
        Expr::Binary(op, a, b) => Ok(Expr::Binary(
            op.clone(),
            Box::new(substitute(a, bindings, budget, depth + 1)?),
            Box::new(substitute(b, bindings, budget, depth + 1)?),
        )),
        Expr::Var(_) | Expr::Num(_) | Expr::Bool(_) => Ok(e.clone()),
        _ => Err("substitution requires expanded scalar terms".into()),
    }
}
#[derive(Clone, Debug)]
struct Definition {
    params: Vec<(String, Type)>,
    result: Type,
    body: Expr,
}
#[derive(Clone, Debug)]
struct Theorem {
    conditions: Vec<Equation>,
    params: Vec<(String, Type)>,
    from: Expr,
    to: Expr,
}
/// Only checked definitions and proved theorems can enter this context.
#[derive(Clone, Debug, Default)]
pub struct Context {
    definitions: BTreeMap<String, Definition>,
    theorems: BTreeMap<String, Theorem>,
}
fn params_env(params: &[(String, Type)]) -> LangResult<Env> {
    if params.len() > 64
        || params
            .iter()
            .any(|(_, t)| !matches!(t, Type::Bool | Type::U64))
    {
        return Err("invalid equality context".into());
    }
    check::params_env(params)
}
impl Context {
    fn vacant(&self, id: &str) -> LangResult<()> {
        if self.definitions.contains_key(id) || self.theorems.contains_key(id) {
            return Err("duplicate proof context identity".into());
        }
        Ok(())
    }
    pub fn subset(&self, ids: &[String]) -> LangResult<Self> {
        let mut result = Self::default();
        for id in ids {
            result.vacant(id)?;
            if let Some(definition) = self.definitions.get(id) {
                result.definitions.insert(id.clone(), definition.clone());
            } else if let Some(theorem) = self.theorems.get(id) {
                result.theorems.insert(id.clone(), theorem.clone());
            } else {
                return Err("unchecked dependency".into());
            }
        }
        Ok(result)
    }
    // Import only opaque, already checked entries; callers cannot construct their internals.
    pub fn import(&mut self, other: &Self, id: &str) -> LangResult<()> {
        self.vacant(id)?;
        let entry = other.subset(&[id.to_owned()])?;
        self.definitions.extend(entry.definitions);
        self.theorems.extend(entry.theorems);
        Ok(())
    }
    pub fn define(
        &mut self,
        id: String,
        params: &[(String, Type)],
        result: &Type,
        body: &Expr,
    ) -> LangResult<()> {
        self.vacant(&id)?;
        if !matches!(result, Type::Bool | Type::U64) {
            return Err("invalid definition result type".into());
        }
        let env = params_env(params)?;
        let mut budget = Budget::new();
        let body = expand(body, &env, self, &mut budget, 0)?;
        if &term_type(&body, &env, &mut budget)? != result {
            return Err("definition result type mismatch".into());
        }
        self.definitions.insert(
            id,
            Definition {
                params: params.to_vec(),
                result: result.clone(),
                body,
            },
        );
        Ok(())
    }
    pub fn check(
        &self,
        params: &[(String, Type)],
        from: &Expr,
        to: &Expr,
        proof: &Proof,
    ) -> LangResult<(Expr, Expr)> {
        self.check_under(params, &[], from, to, proof)
    }
    pub fn check_under(
        &self,
        params: &[(String, Type)],
        conditions: &[Equation],
        from: &Expr,
        to: &Expr,
        proof: &Proof,
    ) -> LangResult<(Expr, Expr)> {
        let env = params_env(params)?;
        let mut budget = Budget::new();
        let hypotheses = prepare_conditions(conditions, &env, self, &mut budget)?;
        let from = expand(from, &env, self, &mut budget, 0)?;
        let to = expand(to, &env, self, &mut budget, 0)?;
        pair(&from, &to, &env, &mut budget)?;
        let (a, b) = derive(proof, &env, self, &hypotheses, &mut budget, 0)?;
        if a != from || b != to {
            return Err("proof proves a different statement".into());
        }
        Ok((from, to))
    }
    pub fn prove(
        &mut self,
        id: String,
        params: &[(String, Type)],
        from: &Expr,
        to: &Expr,
        proof: &Proof,
    ) -> LangResult<(Expr, Expr)> {
        self.prove_under(id, params, &[], from, to, proof)
            .map(|(a, b, _)| (a, b))
    }
    pub fn prove_under(
        &mut self,
        id: String,
        params: &[(String, Type)],
        conditions: &[Equation],
        from: &Expr,
        to: &Expr,
        proof: &Proof,
    ) -> LangResult<(Expr, Expr, Vec<Equation>)> {
        self.vacant(&id)?;
        if conditions.len() > 64 {
            return Err("theorem condition count limit".into());
        }
        let (from, to) = self.check_under(params, conditions, from, to, proof)?;
        let env = params_env(params)?;
        let conditions = prepare_conditions(conditions, &env, self, &mut Budget::new())?;
        self.theorems.insert(
            id,
            Theorem {
                params: params.to_vec(),
                conditions: conditions.clone(),
                from: from.clone(),
                to: to.clone(),
            },
        );
        Ok((from, to, conditions))
    }
}
fn prepare_conditions(
    conditions: &[Equation],
    env: &Env,
    context: &Context,
    budget: &mut Budget,
) -> LangResult<Vec<Equation>> {
    if conditions.len() > 128 {
        return Err("proof condition count limit".into());
    }
    conditions
        .iter()
        .map(|condition| {
            let from = expand(&condition.from, env, context, budget, 0)?;
            let to = expand(&condition.to, env, context, budget, 0)?;
            pair(&from, &to, env, budget)?;
            Ok(Equation { from, to })
        })
        .collect()
}
fn arguments(
    params: &[(String, Type)],
    args: &[Expr],
    env: &Env,
    context: &Context,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<BTreeMap<String, Expr>> {
    if params.len() != args.len() {
        return Err("proof application argument count mismatch".into());
    }
    let mut bindings = BTreeMap::new();
    for ((name, ty), argument) in params.iter().zip(args) {
        let value = expand(argument, env, context, budget, depth + 1)?;
        if term_type(&value, env, budget)? != *ty {
            return Err("proof application argument type mismatch".into());
        }
        bindings.insert(name.clone(), value);
    }
    Ok(bindings)
}
// Calls in proof objects resolve only to checked content identities, never source names.
fn expand(
    e: &Expr,
    env: &Env,
    context: &Context,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<Expr> {
    budget.step(depth)?;
    let result = match e {
        Expr::Call(id, args) => {
            let definition = context
                .definitions
                .get(id)
                .ok_or("unknown or undeclared definition")?;
            let bindings = arguments(&definition.params, args, env, context, budget, depth + 1)?;
            let expanded = substitute(&definition.body, &bindings, budget, depth + 1)?;
            if term_type(&expanded, env, budget)? != definition.result {
                return Err("definition instantiation type mismatch".into());
            }
            expanded
        }
        Expr::Binary(op, a, b) => Expr::Binary(
            op.clone(),
            Box::new(expand(a, env, context, budget, depth + 1)?),
            Box::new(expand(b, env, context, budget, depth + 1)?),
        ),
        Expr::Var(_) | Expr::Num(_) | Expr::Bool(_) => e.clone(),
        _ => return Err("proof definitions require total scalar expressions".into()),
    };
    term_type(&result, env, budget)?;
    Ok(result)
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
fn derive(
    p: &Proof,
    env: &Env,
    context: &Context,
    hypotheses: &[Equation],
    budget: &mut Budget,
    depth: usize,
) -> LangResult<(Expr, Expr)> {
    budget.step(depth)?;
    let (a, b) = match p {
        Proof::Hypothesis(index) => {
            let equation = hypotheses.get(*index).ok_or("unknown proof hypothesis")?;
            (equation.from.clone(), equation.to.clone())
        }
        Proof::UseConditional {
            theorem,
            arguments: args,
            premises,
        } => {
            let theorem = context
                .theorems
                .get(theorem)
                .ok_or("unknown or undeclared theorem")?;
            if premises.len() != theorem.conditions.len() {
                return Err("theorem premise count mismatch".into());
            }
            let bindings = arguments(&theorem.params, args, env, context, budget, 0)?;
            for (condition, proof) in theorem.conditions.iter().zip(premises) {
                let want = (
                    substitute(&condition.from, &bindings, budget, 0)?,
                    substitute(&condition.to, &bindings, budget, 0)?,
                );
                if derive(proof, env, context, hypotheses, budget, depth + 1)? != want {
                    return Err("theorem premise proves a different condition".into());
                }
            }
            (
                substitute(&theorem.from, &bindings, budget, 0)?,
                substitute(&theorem.to, &bindings, budget, 0)?,
            )
        }
        Proof::ShortCircuit { op, left, right } => {
            if !["&&", "||"].contains(&op.as_str()) {
                return Err("short circuit congruence requires a Boolean operator".into());
            }
            let (a, b) = derive(left, env, context, hypotheses, budget, depth + 1)?;
            if term_type(&a, env, budget)? != Type::Bool
                || term_type(&b, env, budget)? != Type::Bool
            {
                return Err("short circuit condition must be Boolean".into());
            }
            let mut local = hypotheses.to_vec();
            if local.len() >= 128 {
                return Err("proof hypothesis count limit".into());
            }
            local.push(Equation {
                from: a.clone(),
                to: Expr::Bool(op == "&&"),
            });
            let (c, d) = derive(right, env, context, &local, budget, depth + 1)?;
            (
                Expr::Binary(op.clone(), Box::new(a), Box::new(c)),
                Expr::Binary(op.clone(), Box::new(b), Box::new(d)),
            )
        }
        Proof::Refl(t) => {
            let t = expand(t, env, context, budget, 0)?;
            (t.clone(), t)
        }
        Proof::Use {
            theorem,
            arguments: args,
        } => {
            let theorem = context
                .theorems
                .get(theorem)
                .ok_or("unknown or undeclared theorem")?;
            if !theorem.conditions.is_empty() {
                return Err("conditional theorem requires premise proofs".into());
            }
            let bindings = arguments(&theorem.params, args, env, context, budget, 0)?;
            (
                substitute(&theorem.from, &bindings, budget, 0)?,
                substitute(&theorem.to, &bindings, budget, 0)?,
            )
        }
        Proof::Compute { from, to } => {
            let from = expand(from, env, context, budget, 0)?;
            let to = expand(to, env, context, budget, 0)?;
            pair(&from, &to, env, budget)?;
            if compute(&from, budget, 0)? != compute(&to, budget, 0)? {
                return Err("primitive evaluation does not establish equality".into());
            }
            (from.clone(), to.clone())
        }
        Proof::Sym(p) => {
            let (a, b) = derive(p, env, context, hypotheses, budget, depth + 1)?;
            (b, a)
        }
        Proof::Trans(p, q) => {
            let (a, b) = derive(p, env, context, hypotheses, budget, depth + 1)?;
            let (c, d) = derive(q, env, context, hypotheses, budget, depth + 1)?;
            if b != c {
                return Err("transitivity middle terms differ".into());
            }
            (a, d)
        }
        Proof::Binary { op, left, right } => {
            let (a, b) = derive(left, env, context, hypotheses, budget, depth + 1)?;
            let (c, d) = derive(right, env, context, hypotheses, budget, depth + 1)?;
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
            let from = expand(from, env, context, budget, 0)?;
            let to = expand(to, env, context, budget, 0)?;
            pair(&from, &to, env, budget)?;
            let mut local = env.clone();
            local.remove(variable);
            for (value, proof) in [(false, on_false), (true, on_true)] {
                let binding = [(variable.clone(), Expr::Bool(value))].into();
                let want = (
                    substitute(&from, &binding, budget, 0)?,
                    substitute(&to, &binding, budget, 0)?,
                );
                let local_hypotheses = hypotheses
                    .iter()
                    .map(|equation| {
                        Ok(Equation {
                            from: substitute(&equation.from, &binding, budget, 0)?,
                            to: substitute(&equation.to, &binding, budget, 0)?,
                        })
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                if derive(proof, &local, context, &local_hypotheses, budget, depth + 1)? != want {
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
    Context::default()
        .prove("target".into(), params, from, to, proof)
        .map(|_| ())
}
