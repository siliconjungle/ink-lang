//! Content-addressed definitions/theorems, bounded dependency closure and selected rewrites.
use crate::{
    check,
    equality::{self, Equation, Proof},
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
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub dependencies: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<Equation>,
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
    evidence: equality::Context,
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
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum DefinitionKind {
    Definition,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DefinitionObject {
    kind: DefinitionKind,
    schema: u32,
    semantics: String,
    name: String,
    params: Vec<(String, Type)>,
    result: Type,
    body: Expr,
    #[serde(default)]
    dependencies: Vec<String>,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(untagged)]
enum Entry {
    Definition(DefinitionObject),
    Theorem(Object),
}
impl Entry {
    fn metadata(&self) -> (u32, &str, &[String]) {
        match self {
            Self::Definition(d) => (d.schema, &d.semantics, &d.dependencies),
            Self::Theorem(t) => (t.schema, &t.semantics, &t.dependencies),
        }
    }
}
#[derive(Debug)]
pub struct Database {
    pub lock: Lock,
    pub rules: Vec<CheckedRule>,
    pub closure: Vec<String>,
}
fn identity(id: &str) -> LangResult<()> {
    if id.len() != 64
        || !id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("invalid knowledge identity".into());
    }
    Ok(())
}
fn rewrite_eligible(object: &Object) -> LangResult<()> {
    if matches!(object.from, Expr::Var(_)) {
        return Err("bare-variable rewrite patterns are disabled".into());
    }
    let mut a = BTreeSet::new();
    let mut b = BTreeSet::new();
    vars(&object.from, &mut a);
    vars(&object.to, &mut b);
    for condition in &object.conditions {
        vars(&condition.from, &mut b);
        vars(&condition.to, &mut b);
    }
    if !b.is_subset(&a) {
        return Err("unbound replacement variable".into());
    }
    Ok(())
}
struct Loader<'a> {
    root: &'a Path,
    context: equality::Context,
    checked: BTreeSet<String>,
    active: BTreeSet<String>,
    theorems: BTreeMap<String, Object>,
    bytes: usize,
}
impl Loader<'_> {
    fn visit(&mut self, id: &str, depth: usize) -> LangResult<()> {
        identity(id)?;
        if self.checked.contains(id) {
            return Ok(());
        }
        if depth > 64 || self.checked.len() + self.active.len() >= 128 {
            return Err("knowledge dependency closure limit".into());
        }
        if !self.active.insert(id.to_owned()) {
            return Err("cyclic knowledge dependency".into());
        }
        let bytes = read_bounded(
            &self.root.join("objects").join(format!("{id}.json")),
            4_000_000,
        )?;
        self.bytes += bytes.len();
        if self.bytes > 16_000_000 {
            return Err("knowledge database budget exceeded".into());
        }
        if format!("{:x}", Sha256::digest(&bytes)) != id {
            return Err("knowledge content hash mismatch".into());
        }
        let entry: Entry =
            serde_json::from_slice(&bytes).map_err(|e| format!("invalid knowledge object: {e}"))?;
        let (schema, semantics, dependencies) = entry.metadata();
        if schema != 1 || semantics != SEMANTICS {
            return Err("incompatible knowledge semantics".into());
        }
        if dependencies.len() > 128 {
            return Err("knowledge dependency count limit".into());
        }
        let mut unique = BTreeSet::new();
        for dependency in dependencies {
            if !unique.insert(dependency) {
                return Err("duplicate knowledge dependency".into());
            }
            self.visit(dependency, depth + 1)?;
        }
        // Direct imports only. Being present elsewhere in the database grants no authority.
        let mut local = self.context.subset(dependencies)?;
        match entry {
            Entry::Definition(definition) => {
                let _metadata = (&definition.kind, &definition.name);
                local.define(
                    id.to_owned(),
                    &definition.params,
                    &definition.result,
                    &definition.body,
                )?;
            }
            Entry::Theorem(mut theorem) => {
                let (from, to, conditions) = local.prove_under(
                    id.to_owned(),
                    &theorem.params,
                    &theorem.conditions,
                    &theorem.from,
                    &theorem.to,
                    &theorem.proof,
                )?;
                theorem.from = from;
                theorem.to = to;
                theorem.conditions = conditions;
                self.theorems.insert(id.to_owned(), theorem);
            }
        }
        self.context.import(&local, id)?;
        self.active.remove(id);
        self.checked.insert(id.to_owned());
        Ok(())
    }
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
pub fn load(lock_path: &Path) -> LangResult<Database> {
    let lock: Lock =
        serde_json::from_slice(&read_bounded(lock_path, 64_000)?).map_err(|e| e.to_string())?;
    if lock.schema != 1 || lock.semantics != SEMANTICS || lock.objects.len() > 128 {
        return Err("unsupported knowledge lock".into());
    }
    let mut loader = Loader {
        root: lock_path.parent().unwrap_or(Path::new(".")),
        context: equality::Context::default(),
        checked: BTreeSet::new(),
        active: BTreeSet::new(),
        theorems: BTreeMap::new(),
        bytes: 0,
    };
    let mut roots = BTreeSet::new();
    for id in &lock.objects {
        if !roots.insert(id) {
            return Err("duplicate knowledge identity".into());
        }
        loader.visit(id, 0)?;
    }
    let mut rules = Vec::new();
    for id in &lock.objects {
        if let Some(object) = loader.theorems.remove(id) {
            rewrite_eligible(&object)?;
            rules.push(CheckedRule {
                id: id.clone(),
                object,
                evidence: loader.context.subset(&[id.clone()])?,
            });
        }
    }
    Ok(Database {
        lock,
        rules,
        closure: loader.checked.into_iter().collect(),
    })
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
fn scalar_params(env: &check::Env) -> Vec<(String, Type)> {
    env.iter()
        .filter(|(_, ty)| matches!(ty, Type::Bool | Type::U64))
        .map(|(name, ty)| (name.clone(), ty.clone()))
        .collect()
}
fn discharge(
    condition: &Equation,
    hypotheses: &[Equation],
    evidence: &equality::Context,
    params: &[(String, Type)],
) -> Option<Proof> {
    let proof = if condition.from == condition.to {
        Proof::Refl(condition.from.clone())
    } else if let Some(index) = hypotheses
        .iter()
        .position(|hypothesis| hypothesis == condition)
    {
        Proof::Hypothesis(index)
    } else if let Some(index) = hypotheses
        .iter()
        .position(|hypothesis| hypothesis.from == condition.to && hypothesis.to == condition.from)
    {
        Proof::Sym(Box::new(Proof::Hypothesis(index)))
    } else {
        Proof::Compute {
            from: condition.from.clone(),
            to: condition.to.clone(),
        }
    };
    evidence
        .check_under(params, hypotheses, &condition.from, &condition.to, &proof)
        .ok()?;
    Some(proof)
}
fn rewrite(
    e: &Expr,
    env: &check::Env,
    rules: &[CheckedRule],
    hypotheses: &[Equation],
    used: &mut Vec<String>,
    fuel: &mut usize,
) -> LangResult<(Expr, Proof)> {
    if *fuel == 0 {
        return Err("rewrite traversal budget exceeded".into());
    }
    *fuel -= 1;
    let (mut out, mut trace) = match e {
        Expr::Binary(op, a, b) => {
            let (left, lp) = rewrite(a, env, rules, hypotheses, used, fuel)?;
            let mut local = hypotheses.to_vec();
            let short = ["&&", "||"].contains(&op.as_str());
            if short {
                local.push(Equation {
                    from: (**a).clone(),
                    to: Expr::Bool(op == "&&"),
                });
            }
            let (right, rp) = rewrite(b, env, rules, &local, used, fuel)?;
            let proof = if short {
                Proof::ShortCircuit {
                    op: op.clone(),
                    left: Box::new(lp),
                    right: Box::new(rp),
                }
            } else {
                Proof::Binary {
                    op: op.clone(),
                    left: Box::new(lp),
                    right: Box::new(rp),
                }
            };
            (
                Expr::Binary(op.clone(), Box::new(left), Box::new(right)),
                proof,
            )
        }
        _ => (e.clone(), Proof::Refl(e.clone())),
    };
    let params = scalar_params(env);
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
        if rule.object.params.iter().any(|(name, ty)| {
            bindings.get(name).is_some_and(|value| {
                equality::term_type(value, env, &mut budget).as_ref() != Ok(ty)
            })
        }) {
            continue;
        }
        let next = instantiate(&rule.object.to, &bindings, fuel, 0)?;
        if next == out {
            continue;
        }
        let mut premises = Vec::new();
        let mut applicable = true;
        for condition in &rule.object.conditions {
            let condition = Equation {
                from: instantiate(&condition.from, &bindings, fuel, 0)?,
                to: instantiate(&condition.to, &bindings, fuel, 0)?,
            };
            if let Some(proof) = discharge(&condition, hypotheses, &rule.evidence, &params) {
                premises.push(proof);
            } else {
                applicable = false;
                break;
            }
        }
        if !applicable {
            continue;
        }
        let arguments = rule
            .object
            .params
            .iter()
            .map(|(name, ty)| {
                bindings.get(name).cloned().unwrap_or_else(|| match ty {
                    Type::Bool => Expr::Bool(false),
                    _ => Expr::Num(0),
                })
            })
            .collect();
        let application = Proof::UseConditional {
            theorem: rule.id.clone(),
            arguments,
            premises,
        };
        // Search supplies a proposal. The kernel checks its exact instantiated equality.
        rule.evidence
            .check_under(&params, hypotheses, &out, &next, &application)?;
        trace = Proof::Trans(Box::new(trace), Box::new(application));
        out = next;
        used.push(rule.id.clone());
    }
    Ok((out, trace))
}
pub fn apply(program: &mut Program, rules: &[CheckedRule]) -> LangResult<Vec<String>> {
    check::check(program)?;
    if rules.is_empty() {
        return Ok(Vec::new());
    }
    let mut context = equality::Context::default();
    for rule in rules {
        context.import(&rule.evidence, &rule.id)?;
    }
    let mut used = Vec::new();
    for function in &mut program.functions {
        let env = check::params_env(&function.params)?;
        if equality::term_type(&function.body, &env, &mut equality::Budget::new()).is_ok() {
            let (candidate, proof) =
                rewrite(&function.body, &env, rules, &[], &mut used, &mut 100_000)?;
            // The whole function proof closes every branch assumption. No premise
            // provided by the optimiser can escape into an unconditional build.
            if candidate != function.body {
                context.check(&scalar_params(&env), &function.body, &candidate, &proof)?;
            }
            function.body = candidate;
        }
    }
    check::check(program)?;
    Ok(used)
}
