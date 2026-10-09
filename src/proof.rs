//! A bounded decision procedure for polynomial equality in Z/(2^64).
//! This is NOT a general dependent-type kernel or a proof of the native backend.
use crate::{check, syntax::*, LangResult};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

type Polynomial = BTreeMap<Vec<String>, u64>;
const MAX_TERMS: usize = 4096;
const MAX_DEGREE: usize = 32;

fn add_term(p: &mut Polynomial, m: Vec<String>, n: u64) -> LangResult<()> {
    let n = p.get(&m).copied().unwrap_or(0).wrapping_add(n);
    if n == 0 {
        p.remove(&m);
    } else {
        p.insert(m, n);
    }
    if p.len() > MAX_TERMS {
        return Err("polynomial proof term budget exceeded".into());
    }
    Ok(())
}

fn norm(e: &Expr, budget: &mut usize) -> LangResult<Polynomial> {
    if *budget == 0 {
        return Err("proof operation budget exhausted".into());
    }
    *budget -= 1;
    match e {
        Expr::Num(n) => {
            let mut p = Polynomial::new();
            add_term(&mut p, vec![], *n)?;
            Ok(p)
        }
        Expr::Var(n) => Ok([(vec![n.clone()], 1)].into()),
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
            let mut x = norm(a, budget)?;
            let y = norm(b, budget)?;
            if op == "*" {
                let mut z = Polynomial::new();
                for (am, ac) in x {
                    for (bm, bc) in &y {
                        if *budget == 0 {
                            return Err("proof multiplication budget exhausted".into());
                        }
                        *budget -= 1;
                        if am.len() + bm.len() > MAX_DEGREE {
                            return Err("proof degree budget exceeded".into());
                        }
                        let mut m = am.clone();
                        m.extend(bm.iter().cloned());
                        m.sort();
                        add_term(&mut z, m, ac.wrapping_mul(*bc))?;
                    }
                }
                Ok(z)
            } else {
                for (m, c) in y {
                    add_term(&mut x, m, if op == "-" { c.wrapping_neg() } else { c })?;
                }
                Ok(x)
            }
        }
        _ => Err("arithmetic proof only accepts u64 polynomial expressions".into()),
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Certificate {
    pub schema: u32,
    pub semantics: String,
    pub rule: Rewrite,
    pub normal_form: Vec<(Vec<String>, u64)>,
    pub id: String,
}

fn digest(rule: &Rewrite) -> LangResult<String> {
    let bytes =
        serde_json::to_vec(&(1u32, "u64-modular-ring-v1", rule)).map_err(|e| e.to_string())?;
    Ok(format!("{:x}", Sha256::digest(bytes)))
}

pub fn prove(rule: &Rewrite) -> LangResult<Certificate> {
    if rule.tactic != "arithmetic" && rule.tactic != "normalize" {
        return Err("unsupported proof tactic; no unchecked assumptions accepted".into());
    }
    if rule.params.iter().any(|(_, t)| *t != Type::U64) {
        return Err("ring certificates require u64 parameters".into());
    }
    let env = check::params_env(&rule.params)?;
    if matches!(rule.from, Expr::Var(_)) {
        return Err(
            "a bare metavariable pattern requires typed matching, not yet implemented".into(),
        );
    }
    fn variables(e: &Expr, out: &mut std::collections::BTreeSet<String>) {
        match e {
            Expr::Var(n) => {
                out.insert(n.clone());
            }
            Expr::Binary(_, a, b) => {
                variables(a, out);
                variables(b, out);
            }
            _ => {}
        }
    }
    let mut from_vars = std::collections::BTreeSet::new();
    let mut to_vars = std::collections::BTreeSet::new();
    variables(&rule.from, &mut from_vars);
    variables(&rule.to, &mut to_vars);
    if !to_vars.is_subset(&from_vars) {
        return Err("replacement contains an unbound pattern variable".into());
    }
    for e in [&rule.from, &rule.to] {
        if check::infer(e, &env, &Program::default())? != Type::U64 {
            return Err("rewrite must have u64 type".into());
        }
    }
    let a = norm(&rule.from, &mut 1_000_000)?;
    let b = norm(&rule.to, &mut 1_000_000)?;
    if a != b {
        return Err(format!(
            "{}: proposed equality is not established by modular polynomial normalisation",
            rule.name
        ));
    }
    Ok(Certificate {
        schema: 1,
        semantics: "u64-modular-ring-v1".into(),
        rule: rule.clone(),
        normal_form: a.into_iter().collect(),
        id: digest(rule)?,
    })
}

pub fn verify(c: &Certificate) -> LangResult<()> {
    if c.schema != 1 || c.semantics != "u64-modular-ring-v1" {
        return Err("unsupported certificate semantics".into());
    }
    let expected = prove(&c.rule)?;
    if expected.id != c.id || expected.normal_form != c.normal_form {
        return Err("tampered certificate or dependency identity".into());
    }
    Ok(())
}

fn matches(pattern: &Expr, value: &Expr, bindings: &mut BTreeMap<String, Expr>) -> bool {
    match (pattern, value) {
        (Expr::Var(n), e) => {
            if let Some(old) = bindings.get(n) {
                old == e
            } else {
                bindings.insert(n.clone(), e.clone());
                true
            }
        }
        (Expr::Num(a), Expr::Num(b)) => a == b,
        (Expr::Binary(op, a, b), Expr::Binary(vop, x, y)) => {
            op == vop && matches(a, x, bindings) && matches(b, y, bindings)
        }
        _ => false,
    }
}
fn substitute(e: &Expr, b: &BTreeMap<String, Expr>) -> Expr {
    match e {
        Expr::Var(n) => b[n].clone(),
        Expr::Binary(op, a, c) => Expr::Binary(
            op.clone(),
            Box::new(substitute(a, b)),
            Box::new(substitute(c, b)),
        ),
        _ => e.clone(),
    }
}

pub fn optimise(
    e: &Expr,
    rules: &[Certificate],
    used: &mut Vec<String>,
    budget: &mut usize,
) -> Expr {
    if *budget == 0 {
        return e.clone();
    }
    *budget -= 1;
    let mut out = match e {
        Expr::Binary(op, a, b) => Expr::Binary(
            op.clone(),
            Box::new(optimise(a, rules, used, budget)),
            Box::new(optimise(b, rules, used, budget)),
        ),
        Expr::Call(n, args) => Expr::Call(
            n.clone(),
            args.iter()
                .map(|x| optimise(x, rules, used, budget))
                .collect(),
        ),
        Expr::Method(x, n, args) => Expr::Method(
            Box::new(optimise(x, rules, used, budget)),
            n.clone(),
            args.iter()
                .map(|x| optimise(x, rules, used, budget))
                .collect(),
        ),
        Expr::Lambda(n, x) => Expr::Lambda(n.clone(), Box::new(optimise(x, rules, used, budget))),
        _ => e.clone(),
    };
    // One bottom-up pass; no saturation loops or unbounded rewrite expansion.
    for c in rules {
        if *budget == 0 {
            break;
        }
        *budget -= 1;
        let mut bindings = BTreeMap::new();
        if matches(&c.rule.from, &out, &mut bindings) {
            let next = substitute(&c.rule.to, &bindings);
            if next != out {
                out = next;
                used.push(c.id.clone());
            }
        }
    }
    out
}
