//! Compatibility checking of historical scalar mathematical libraries.
//! Compilation consumes externally produced replacement proofs; there is no search here.
use crate::{
    equality::{self, Equation, Proof},
    syntax::{Expr, Type},
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
    pub theorems: Vec<String>,
    pub closure: Vec<String>,
}
pub(crate) fn identity(id: &str) -> LangResult<()> {
    if id.len() != 64
        || !id
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
    {
        return Err("invalid knowledge identity".into());
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
pub(crate) fn read_bounded(path: &Path, limit: usize) -> LangResult<Vec<u8>> {
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
    let theorems = lock
        .objects
        .iter()
        .filter(|id| loader.theorems.contains_key(*id))
        .cloned()
        .collect();
    Ok(Database {
        lock,
        theorems,
        closure: loader.checked.into_iter().collect(),
    })
}
