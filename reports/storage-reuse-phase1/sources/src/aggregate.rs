//! Row-local aggregate execution. Legacy v1 certificates use polynomial
//! authority; v2 checks the actual source update against database sum proofs.
//! Table projection and transaction execution still form a trusted boundary.
use crate::{syntax::*, LangResult};
use num_bigint::BigInt;
use num_traits::Zero;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

type Poly = BTreeMap<Vec<String>, BigInt>;
fn term(p: &mut Poly, m: Vec<String>, c: BigInt) -> LangResult<()> {
    let n = p.get(&m).cloned().unwrap_or_default() + c;
    if n.is_zero() {
        p.remove(&m);
    } else {
        p.insert(m, n);
    }
    if p.len() > 256 {
        return Err("aggregate proof polynomial budget exhausted".into());
    }
    Ok(())
}
fn normal(e: &Expr, env: &BTreeMap<String, Expr>, budget: &mut usize) -> LangResult<Poly> {
    if *budget == 0 {
        return Err("aggregate proof budget exhausted".into());
    }
    *budget -= 1;
    match e {
        Expr::Num(n) => {
            let mut p = Poly::new();
            term(&mut p, vec![], BigInt::from(*n))?;
            Ok(p)
        }
        Expr::Var(n) => {
            if let Some(x) = env.get(n) {
                normal(x, &BTreeMap::new(), budget)
            } else {
                Ok([(vec![n.clone()], BigInt::from(1))].into())
            }
        }
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
            let mut x = normal(a, env, budget)?;
            let y = normal(b, env, budget)?;
            if op == "*" {
                let mut z = Poly::new();
                for (am, ac) in x {
                    for (bm, bc) in &y {
                        if *budget == 0 {
                            return Err("aggregate proof multiplication budget exhausted".into());
                        }
                        *budget -= 1;
                        let mut m = am.clone();
                        m.extend(bm.clone());
                        if m.len() > 8 {
                            return Err("aggregate polynomial degree limit".into());
                        }
                        m.sort();
                        term(&mut z, m, &ac * bc)?;
                    }
                }
                Ok(z)
            } else {
                for (m, c) in y {
                    term(&mut x, m, if op == "-" { -c } else { c })?;
                }
                Ok(x)
            }
        }
        _ => Err("aggregate update must use exact-integer +, - and * only".into()),
    }
}
fn var(n: &str) -> Expr {
    Expr::Var(n.into())
}
fn plus(a: Expr, b: Expr) -> Expr {
    Expr::Binary("+".into(), Box::new(a), Box::new(b))
}
fn vars(e: &Expr, out: &mut std::collections::BTreeSet<String>) {
    match e {
        Expr::Var(n) => {
            out.insert(n.clone());
        }
        Expr::Binary(_, a, b) => {
            vars(a, out);
            vars(b, out);
        }
        _ => {}
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Certificate {
    pub version: u32,
    pub semantics: String,
    pub insert: Expr,
    pub replace: Expr,
    pub remove: Expr,
    pub obligations: Vec<Vec<(Vec<String>, BigInt)>>,
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub evidence: Option<crate::exact_maintenance::Evidence>,
}
fn check_obligations(c: &Certificate) -> LangResult<Vec<Vec<(Vec<String>, BigInt)>>> {
    if c.version != 1 || c.semantics != "finite-map-pointwise-exact-sum-v1" {
        return Err("unsupported aggregate semantics".into());
    }
    let mut results = Vec::new();
    for (kind, e, allowed, want) in [
        (
            "insert",
            &c.insert,
            vec!["total", "new"],
            plus(var("rest"), var("new")),
        ),
        (
            "replace",
            &c.replace,
            vec!["total", "old", "new"],
            plus(var("rest"), var("new")),
        ),
        ("remove", &c.remove, vec!["total", "old"], var("rest")),
    ] {
        let mut used = std::collections::BTreeSet::new();
        vars(e, &mut used);
        if used.iter().any(|x| !allowed.contains(&x.as_str())) {
            return Err(format!("unbound variable in {kind} certificate"));
        }
        let total = if kind == "insert" {
            var("rest")
        } else {
            plus(var("rest"), var("old"))
        };
        let substitutions = [("total".into(), total)].into();
        let got = normal(e, &substitutions, &mut 100000)?;
        let expected = normal(&want, &BTreeMap::new(), &mut 100000)?;
        if got != expected {
            return Err(format!("{kind} does not preserve the exact-sum invariant"));
        }
        results.push(got.into_iter().collect());
    }
    Ok(results)
}
fn id(c: &Certificate) -> LangResult<String> {
    // Preserve archived v1 identities; v2 binds the complete proof bundle too.
    let data = if c.version == 1 {
        serde_json::to_vec(&(c.version, &c.semantics, &c.insert, &c.replace, &c.remove))
    } else {
        serde_json::to_vec(&(
            c.version,
            &c.semantics,
            &c.insert,
            &c.replace,
            &c.remove,
            &c.evidence,
        ))
    }
    .map_err(|e| e.to_string())?;
    Ok(format!("{:x}", Sha256::digest(data)))
}
fn source_updates(p: &Program) -> LangResult<[Expr; 3]> {
    if p.functions.len() != 3
        || !p.states.is_empty()
        || !p.keeps.is_empty()
        || !p.actions.is_empty()
        || !p.rules.is_empty()
        || !p.records.is_empty()
        || !p.enums.is_empty()
        || !p.ids.is_empty()
        || !p.events.is_empty()
    {
        return Err("maintenance package requires exactly three pure update functions".into());
    }
    let get = |n: &str, names: Vec<&str>| -> LangResult<Expr> {
        let f = p
            .functions
            .iter()
            .find(|f| f.name == n)
            .ok_or_else(|| format!("missing {n}"))?;
        if f.result != Type::Int
            || f.params
                != names
                    .into_iter()
                    .map(|s| (s.into(), Type::Int))
                    .collect::<Vec<_>>()
        {
            return Err(format!(
                "{n} requires the exact-integer maintenance signature"
            ));
        }
        Ok(f.body.clone())
    };
    Ok([
        get("insert", vec!["total", "new"])?,
        get("replace", vec!["total", "old", "new"])?,
        get("remove", vec!["total", "old"])?,
    ])
}
pub fn prove(p: &Program) -> LangResult<Certificate> {
    let [insert, replace, remove] = source_updates(p)?;
    let mut c = Certificate {
        version: 1,
        semantics: "finite-map-pointwise-exact-sum-v1".into(),
        insert,
        replace,
        remove,
        obligations: vec![],
        id: String::new(),
        evidence: None,
    };
    c.obligations = check_obligations(&c)?;
    c.id = id(&c)?;
    Ok(c)
}
pub fn prove_database(
    p: &Program,
    evidence: crate::exact_maintenance::Evidence,
) -> LangResult<Certificate> {
    let [insert, replace, remove] = source_updates(p)?;
    let mut c = Certificate {
        version: if evidence.journal.is_some() { 3 } else { 2 },
        semantics: if evidence.journal.is_some() {
            crate::exact_maintenance::JOURNAL_SEMANTICS
        } else {
            crate::exact_maintenance::SEMANTICS
        }
        .into(),
        insert,
        replace,
        remove,
        obligations: vec![],
        id: String::new(),
        evidence: Some(evidence),
    };
    crate::exact_maintenance::verify(&c, c.evidence.as_ref().unwrap())?;
    c.id = id(&c)?;
    Ok(c)
}
pub fn verify(c: &Certificate) -> LangResult<()> {
    if c.version == 2 || c.version == 3 {
        crate::exact_maintenance::verify(
            c,
            c.evidence
                .as_ref()
                .ok_or("missing database maintenance evidence")?,
        )?;
    } else {
        if c.evidence.is_some() {
            return Err("legacy certificate cannot contain database evidence".into());
        }
        if c.obligations != check_obligations(c)? {
            return Err("tampered aggregate certificate".into());
        }
    }
    if c.id != id(c)? {
        return Err("tampered aggregate certificate".into());
    }
    Ok(())
}
pub fn update(
    c: &Certificate,
    total: &BigInt,
    old: Option<&BigInt>,
    new: Option<&BigInt>,
) -> BigInt {
    let e = match (old, new) {
        (None, Some(_)) => &c.insert,
        (Some(_), Some(_)) => &c.replace,
        (Some(_), None) => &c.remove,
        (None, None) => return total.clone(),
    };
    evaluate(e, total, old, new, None)
}
pub fn journal(c: &Certificate) -> Option<&crate::exact_maintenance::Journal> {
    c.evidence.as_ref().and_then(|e| e.journal.as_ref())
}
#[derive(Debug)]
pub enum CacheUndo {
    Snapshot(BigInt),
    Saved { kind: u8, value: BigInt },
    Unchanged,
}
pub fn update_journal(
    c: &Certificate,
    total: &BigInt,
    old: Option<&BigInt>,
    new: Option<&BigInt>,
) -> (BigInt, CacheUndo) {
    if let Some(journal) = journal(c) {
        let kind = match (old, new) {
            (None, Some(_)) => 0,
            (Some(_), Some(_)) => 1,
            (Some(_), None) => 2,
            (None, None) => return (total.clone(), CacheUndo::Unchanged),
        };
        let action = journal.action(kind);
        let saved = evaluate(&action.save, total, old, new, None);
        let next = evaluate(&action.apply, total, old, new, Some(&saved));
        (next, CacheUndo::Saved { kind, value: saved })
    } else {
        (
            update(c, total, old, new),
            CacheUndo::Snapshot(total.clone()),
        )
    }
}
pub fn restore_journal(c: &Certificate, total: &BigInt, undo: CacheUndo) -> BigInt {
    match undo {
        CacheUndo::Snapshot(before) => before,
        CacheUndo::Unchanged => total.clone(),
        CacheUndo::Saved { kind, value } => evaluate(
            &journal(c)
                .expect("stable checked journal")
                .action(kind)
                .restore,
            total,
            None,
            None,
            Some(&value),
        ),
    }
}
fn evaluate(
    e: &Expr,
    total: &BigInt,
    old: Option<&BigInt>,
    new: Option<&BigInt>,
    saved: Option<&BigInt>,
) -> BigInt {
    match e {
        Expr::Num(n) => BigInt::from(*n),
        Expr::Var(n) => match n.as_str() {
            "total" => total.clone(),
            "old" => old.expect("verified old binding").clone(),
            "new" => new.expect("verified new binding").clone(),
            "saved" => saved.expect("verified saved binding").clone(),
            _ => unreachable!("checked binding"),
        },
        Expr::Binary(op, a, b) => {
            let a = evaluate(a, total, old, new, saved);
            let b = evaluate(b, total, old, new, saved);
            match op.as_str() {
                "+" => a + b,
                "-" => a - b,
                "*" => a * b,
                _ => unreachable!("checked operator"),
            }
        }
        _ => unreachable!("checked expression"),
    }
}

#[derive(Clone, Debug)]
pub struct Plan {
    pub root: String,
    pub stages: Vec<(String, String, Expr)>,
    pub count: bool,
}
pub fn plan(keep: &BindingDecl) -> Option<Plan> {
    if keep.ty != Type::Int {
        return None;
    }
    let (op, args) = if let Expr::Call(n, a) = &keep.value {
        (n, a)
    } else {
        return None;
    };
    if !["sum", "count"].contains(&op.as_str()) || args.len() != 1 {
        return None;
    }
    fn pure(e: &Expr, binder: &str) -> bool {
        match e {
            Expr::Num(_) | Expr::Bool(_) => true,
            Expr::Var(n) => n == binder,
            Expr::Field(x, _) => pure(x, binder),
            Expr::Binary(_, a, b) => pure(a, binder) && pure(b, binder),
            Expr::Call(n, xs) if n == "Int" => xs.len() == 1 && pure(&xs[0], binder),
            _ => false,
        }
    }
    fn walk(e: &Expr, stages: &mut Vec<(String, String, Expr)>) -> Option<String> {
        if let Expr::Method(x, m, args) = e {
            if m == "values" && args.is_empty() {
                if let Expr::Var(root) = &**x {
                    return Some(root.clone());
                }
            }
            if ["map", "filter"].contains(&m.as_str()) && args.len() == 1 {
                if let Expr::Lambda(v, b) = &args[0] {
                    if pure(b, v) {
                        let root = walk(x, stages)?;
                        stages.push((m.clone(), v.clone(), *b.clone()));
                        return Some(root);
                    }
                }
            }
        }
        None
    }
    let mut stages = vec![];
    let root = walk(&args[0], &mut stages)?;
    Some(Plan {
        root,
        stages,
        count: op == "count",
    })
}
