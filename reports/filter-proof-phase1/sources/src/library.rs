//! Immutable first-order proof libraries. This registers checked mathematical
//! entries; it does not authorise an unchecked correspondence to source code.
use crate::{
    knowledge::{identity, read_bounded, Lock},
    logic::{Context, Declaration},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, path::Path};
pub const SEMANTICS: &str = "first-order-inductive-equality-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Object {
    pub schema: u32,
    pub semantics: String,
    pub name: String,
    pub dependencies: Vec<String>,
    pub declaration: Declaration,
}
#[derive(Debug)]
pub struct Library {
    pub lock: Lock,
    pub context: Context,
    pub closure: Vec<String>,
}
struct Loader<'a> {
    root: &'a Path,
    context: Context,
    checked: BTreeSet<String>,
    active: BTreeSet<String>,
    bytes: usize,
}
impl Loader<'_> {
    fn visit(&mut self, id: &str, depth: usize) -> LangResult<()> {
        identity(id)?;
        if self.checked.contains(id) {
            return Ok(());
        }
        if depth > 64 || self.checked.len() + self.active.len() >= 128 {
            return Err("proof library closure limit".into());
        }
        if !self.active.insert(id.into()) {
            return Err("cyclic proof library dependency".into());
        }
        let bytes = read_bounded(
            &self.root.join("objects").join(format!("{id}.json")),
            4_000_000,
        )?;
        self.bytes += bytes.len();
        if self.bytes > 16_000_000 {
            return Err("proof library byte budget exceeded".into());
        }
        if format!("{:x}", Sha256::digest(&bytes)) != id {
            return Err("proof library content hash mismatch".into());
        }
        let object: Object = serde_json::from_slice(&bytes)
            .map_err(|e| format!("invalid proof library object: {e}"))?;
        if object.schema != 1 || object.semantics != SEMANTICS {
            return Err("incompatible proof library semantics".into());
        }
        if object.dependencies.len() > 128 {
            return Err("proof library dependency count limit".into());
        }
        let mut unique = BTreeSet::new();
        for dependency in &object.dependencies {
            if !unique.insert(dependency) {
                return Err("duplicate proof library dependency".into());
            }
            self.visit(dependency, depth + 1)?;
        }
        let mut local = self.context.subset(&object.dependencies)?;
        local.declare(id.to_owned(), &object.declaration)?;
        self.context.import(&local, id)?;
        self.active.remove(id);
        self.checked.insert(id.to_owned());
        Ok(())
    }
}
pub fn load(lock_path: &Path) -> LangResult<Library> {
    let lock: Lock =
        serde_json::from_slice(&read_bounded(lock_path, 64_000)?).map_err(|e| e.to_string())?;
    if lock.schema != 1 || lock.semantics != SEMANTICS || lock.objects.len() > 128 {
        return Err("unsupported proof library lock".into());
    }
    let mut loader = Loader {
        root: lock_path.parent().unwrap_or(Path::new(".")),
        context: Context::default(),
        checked: BTreeSet::new(),
        active: BTreeSet::new(),
        bytes: 0,
    };
    let mut roots = BTreeSet::new();
    for id in &lock.objects {
        if !roots.insert(id) {
            return Err("duplicate proof library root".into());
        }
        loader.visit(id, 0)?;
    }
    Ok(Library {
        context: loader.context.subset(&lock.objects)?,
        lock,
        closure: loader.checked.into_iter().collect(),
    })
}
