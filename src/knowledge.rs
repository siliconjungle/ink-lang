//! Content-addressed definitions/theorems, bounded dependency closure and selected rewrites.
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
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub dependencies: Vec<String>,
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
                let (from, to) = local.prove(
                    id.to_owned(),
                    &theorem.params,
                    &theorem.from,
                    &theorem.to,
                    &theorem.proof,
                )?;
                theorem.from = from;
                theorem.to = to;
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
            // Search/matching only proposes an optimisation. Recheck the exact
            // instantiated equality before accepting its replacement.
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
            let params = env
                .iter()
                .filter(|(_, ty)| matches!(ty, Type::Bool | Type::U64))
                .map(|(name, ty)| (name.clone(), ty.clone()))
                .collect::<Vec<_>>();
            rule.evidence.check(
                &params,
                &out,
                &next,
                &Proof::Use {
                    theorem: rule.id.clone(),
                    arguments,
                },
            )?;
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
