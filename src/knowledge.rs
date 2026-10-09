//! Content-addressed self-contained equality objects and explicit ordered lockfiles.
use crate::{
    check,
    equality::{self, Proof},
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::File,
    io::Read,
    path::Path,
};

pub const SEMANTICS: &str = "total-scalar-equality-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Object {
    pub schema: u32,
    pub semantics: String,
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub from: Expr,
    pub to: Expr,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Lock {
    pub schema: u32,
    pub semantics: String,
    pub objects: Vec<String>,
}
#[derive(Clone, Debug)]
pub struct CheckedRule {
    id: String,
    object: Object,
}
fn vars(e: &Expr, out: &mut BTreeSet<String>) {
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
fn check_object(id: String, object: Object) -> LangResult<CheckedRule> {
    if object.schema != 1 || object.semantics != SEMANTICS {
        return Err("incompatible knowledge semantics".into());
    }
    equality::verify(&object.params, &object.from, &object.to, &object.proof)?;
    if matches!(object.from, Expr::Var(_)) {
        return Err("bare-variable rewrite patterns are disabled".into());
    }
    let mut a = BTreeSet::new();
    let mut b = BTreeSet::new();
    vars(&object.from, &mut a);
    vars(&object.to, &mut b);
    if !b.is_subset(&a) {
        return Err("unbound replacement variable".into());
    }
    Ok(CheckedRule { id, object })
}
fn read_bounded(path: &Path, limit: usize) -> LangResult<Vec<u8>> {
    let mut bytes = Vec::new();
    File::open(path)
        .map_err(|e| format!("{}: {e}", path.display()))?
        .take(limit as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("knowledge file exceeds size limit".into());
    }
    Ok(bytes)
}
pub fn load(lock_path: &Path) -> LangResult<(Lock, Vec<CheckedRule>)> {
    let lock: Lock =
        serde_json::from_slice(&read_bounded(lock_path, 64_000)?).map_err(|e| e.to_string())?;
    if lock.schema != 1 || lock.semantics != SEMANTICS || lock.objects.len() > 128 {
        return Err("unsupported knowledge lock".into());
    }
    let root = lock_path.parent().unwrap_or(Path::new("."));
    let mut seen = BTreeSet::new();
    let mut rules = Vec::new();
    let mut total = 0;
    for id in &lock.objects {
        if id.len() != 64
            || !id
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
            || !seen.insert(id.clone())
        {
            return Err("invalid or duplicate knowledge identity".into());
        }
        let bytes = read_bounded(&root.join("objects").join(format!("{id}.json")), 4_000_000)?;
        total += bytes.len();
        if total > 16_000_000 {
            return Err("knowledge database budget exceeded".into());
        }
        if format!("{:x}", Sha256::digest(&bytes)) != *id {
            return Err("knowledge content hash mismatch".into());
        }
        let object = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        rules.push(check_object(id.clone(), object)?);
    }
    Ok((lock, rules))
}
fn matches(p: &Expr, e: &Expr, bindings: &mut BTreeMap<String, Expr>) -> bool {
    match (p, e) {
        (Expr::Var(n), _) => {
            if let Some(old) = bindings.get(n) {
                old == e
            } else {
                bindings.insert(n.clone(), e.clone());
                true
            }
        }
        (Expr::Bool(a), Expr::Bool(b)) => a == b,
        (Expr::Num(a), Expr::Num(b)) => a == b,
        (Expr::Binary(op, a, b), Expr::Binary(other, c, d)) => {
            op == other && matches(a, c, bindings) && matches(b, d, bindings)
        }
        _ => false,
    }
}
fn instantiate(
    e: &Expr,
    bindings: &BTreeMap<String, Expr>,
    fuel: &mut usize,
    depth: usize,
) -> LangResult<Expr> {
    if *fuel == 0 || depth > 128 {
        return Err("rewrite expansion budget exceeded".into());
    }
    *fuel -= 1;
    match e {
        Expr::Var(n) if bindings.contains_key(n) => {
            instantiate(&bindings[n], &BTreeMap::new(), fuel, depth + 1)
        }
        Expr::Binary(op, a, b) => Ok(Expr::Binary(
            op.clone(),
            Box::new(instantiate(a, bindings, fuel, depth + 1)?),
            Box::new(instantiate(b, bindings, fuel, depth + 1)?),
        )),
        _ => Ok(e.clone()),
    }
}
fn rewrite(
    e: &Expr,
    env: &check::Env,
    rules: &[CheckedRule],
    used: &mut Vec<String>,
    fuel: &mut usize,
) -> LangResult<Expr> {
    if *fuel == 0 {
        return Err("rewrite traversal budget exceeded".into());
    }
    *fuel -= 1;
    let mut out = match e {
        Expr::Binary(op, a, b) => Expr::Binary(
            op.clone(),
            Box::new(rewrite(a, env, rules, used, fuel)?),
            Box::new(rewrite(b, env, rules, used, fuel)?),
        ),
        _ => e.clone(),
    };
    for rule in rules {
        if *fuel == 0 {
            return Err("rewrite matching budget exceeded".into());
        }
        *fuel -= 1;
        let mut bindings = BTreeMap::new();
        if !matches(&rule.object.from, &out, &mut bindings) {
            continue;
        }
        let mut budget = equality::Budget::new();
        let mut valid = true;
        for (name, ty) in &rule.object.params {
            if let Some(value) = bindings.get(name) {
                if equality::term_type(value, env, &mut budget).as_ref() != Ok(ty) {
                    valid = false;
                    break;
                }
            }
        }
        if !valid {
            continue;
        }
        let next = instantiate(&rule.object.to, &bindings, fuel, 0)?;
        if next != out {
            out = next;
            used.push(rule.id.clone());
        }
    }
    Ok(out)
}
pub fn apply(program: &mut Program, rules: &[CheckedRule]) -> LangResult<Vec<String>> {
    check::check(program)?;
    let mut used = Vec::new();
    for function in &mut program.functions {
        let env = check::params_env(&function.params)?;
        // Only whole finite scalar bodies: no calls, effects, loops or binders.
        if equality::term_type(&function.body, &env, &mut equality::Budget::new()).is_ok() {
            function.body = rewrite(&function.body, &env, rules, &mut used, &mut 100_000)?;
        }
    }
    check::check(program)?;
    Ok(used)
}
