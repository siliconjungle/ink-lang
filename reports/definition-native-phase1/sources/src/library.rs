//! Immutable first-order proof libraries. This registers checked mathematical
//! entries; it does not authorise an unchecked correspondence to source code.
use crate::{
    knowledge::{identity, read_bounded, Lock},
    logic::{Context, Declaration},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
};
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
/// Portable raw object bytes retain their original content identities. Loading
/// a bundle uses the same checker and direct-import rules as loading from disk.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Bundle {
    pub lock: Lock,
    pub objects: BTreeMap<String, String>,
}
enum Source<'a> {
    Disk(&'a Path),
    Inline(&'a BTreeMap<String, String>),
}
struct Loader<'a> {
    source: Source<'a>,
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
        let bytes = match &self.source {
            Source::Disk(root) => {
                read_bounded(&root.join("objects").join(format!("{id}.json")), 4_000_000)?
            }
            Source::Inline(objects) => objects
                .get(id)
                .ok_or("missing bundled proof library object")?
                .as_bytes()
                .to_vec(),
        };
        if bytes.len() > 4_000_000 {
            return Err("proof library object exceeds size limit".into());
        }
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
    load_with_pin(lock_path, None)
}
/// Bind a package to the exact lock bytes that are parsed, avoiding a second
/// read between hash validation and dependency resolution.
pub fn load_pinned(lock_path: &Path, sha256: &str) -> LangResult<Library> {
    crate::knowledge::identity(sha256)?;
    load_with_pin(lock_path, Some(sha256))
}
fn load_with_pin(lock_path: &Path, pin: Option<&str>) -> LangResult<Library> {
    let bytes = read_bounded(lock_path, 64_000)?;
    if let Some(pin) = pin {
        if format!("{:x}", Sha256::digest(&bytes)) != pin {
            return Err("proof library lock identity mismatch".into());
        }
    }
    let lock: Lock = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    load_from(
        lock,
        Source::Disk(lock_path.parent().unwrap_or(Path::new("."))),
    )
}
fn load_from(lock: Lock, source: Source<'_>) -> LangResult<Library> {
    if lock.schema != 1 || lock.semantics != SEMANTICS || lock.objects.len() > 128 {
        return Err("unsupported proof library lock".into());
    }
    let mut loader = Loader {
        source,
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
pub fn load_bundle(bundle: &Bundle) -> LangResult<Library> {
    if bundle.objects.len() > 128 {
        return Err("bundled proof library object count limit".into());
    }
    let mut bytes = 0usize;
    for (id, object) in &bundle.objects {
        identity(id)?;
        bytes = bytes
            .checked_add(object.len())
            .ok_or("proof library byte overflow")?;
        if object.len() > 4_000_000 || bytes > 16_000_000 {
            return Err("bundled proof library byte budget exceeded".into());
        }
    }
    let library = load_from(bundle.lock.clone(), Source::Inline(&bundle.objects))?;
    if library.closure.len() != bundle.objects.len() {
        return Err("unreferenced bundled proof library object".into());
    }
    Ok(library)
}

/// Select checked public roots and their immutable dependency closure. The
/// complete input is checked first; selecting a subset cannot hide a bad entry.
/// Dependencies remain private unless explicitly listed as requested roots.
pub fn project(bundle: &Bundle, roots: &[String]) -> LangResult<Bundle> {
    load_bundle(bundle)?;
    if roots.len() > 128 {
        return Err("proof library root count limit".into());
    }
    let mut unique = BTreeSet::new();
    let mut pending = Vec::new();
    for root in roots {
        identity(root)?;
        if !unique.insert(root.clone()) {
            return Err("duplicate projected proof library root".into());
        }
        if !bundle.objects.contains_key(root) {
            return Err("unknown projected proof library root".into());
        }
        pending.push(root.clone());
    }
    let mut selected = BTreeSet::new();
    while let Some(id) = pending.pop() {
        if !selected.insert(id.clone()) {
            continue;
        }
        let object: Object =
            serde_json::from_str(&bundle.objects[&id]).map_err(|e| e.to_string())?;
        pending.extend(object.dependencies);
    }
    let projected = Bundle {
        lock: Lock {
            schema: bundle.lock.schema,
            semantics: bundle.lock.semantics.clone(),
            objects: roots.to_vec(),
        },
        objects: selected
            .into_iter()
            .map(|id| (id.clone(), bundle.objects[&id].clone()))
            .collect(),
    };
    load_bundle(&projected)?;
    Ok(projected)
}
pub fn bundle(lock_path: &Path) -> LangResult<Bundle> {
    let library = load(lock_path)?;
    let root = lock_path.parent().unwrap_or(Path::new("."));
    let mut objects = BTreeMap::new();
    for id in &library.closure {
        let bytes = read_bounded(&root.join("objects").join(format!("{id}.json")), 4_000_000)?;
        objects.insert(
            id.clone(),
            String::from_utf8(bytes).map_err(|e| e.to_string())?,
        );
    }
    let bundle = Bundle {
        lock: library.lock,
        objects,
    };
    // Check the returned bytes too: a disk change between reads grants nothing.
    load_bundle(&bundle)?;
    Ok(bundle)
}
