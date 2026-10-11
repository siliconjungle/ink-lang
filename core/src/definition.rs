//! Target-independent admission of executable definitions and replacements.
use crate::{
    library::{self, Bundle, Object},
    logic::{Declaration, Proof, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
pub const SELECTION_SEMANTICS: &str = "ink-definition-selection-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Replacement {
    pub original: String,
    pub replacement: String,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SelectionPackage {
    pub schema: u32,
    pub semantics: String,
    pub observations: String,
    pub bundle_sha256: String,
    pub proposals: Vec<Replacement>,
}

/// No deserialisation or mutable access: obtaining this witness checks all proofs.
#[derive(Clone, Debug)]
pub struct CheckedDefinition {
    bundle: Bundle,
    exports: Vec<String>,
    choices: BTreeMap<String, String>,
    bundle_sha256: String,
    closure: Vec<String>,
    selection_sha256: Option<String>,
}
impl CheckedDefinition {
    /// Literal executable declarations from this already checked closure.
    /// This grants no source replacement authority; backends must also bind
    /// export choices and the sealed executable identity.
    pub fn executable_declarations(&self) -> LangResult<BTreeMap<String, Declaration>> {
        self.bundle
            .objects
            .iter()
            .filter_map(|(id, bytes)| {
                let parsed = serde_json::from_str::<Object>(bytes);
                match parsed {
                    Ok(Object {
                        declaration:
                            d @ (Declaration::Datatype { .. } | Declaration::Function { .. }),
                        ..
                    }) => Some(Ok((id.clone(), d))),
                    Ok(_) => None,
                    Err(e) => Some(Err(e.to_string())),
                }
            })
            .collect()
    }
    /// Executable dependency graph rooted at the already selected exports.
    /// Proof dependencies remain checked in the bundle, but are not program
    /// dependencies. Internal calls retain their original targets.
    /// This is compile-time reachability, not new admission or proof authority.
    pub fn reachable_executable_declarations(&self) -> LangResult<BTreeMap<String, Declaration>> {
        fn sort(s: &Sort, pending: &mut Vec<String>) {
            if let Sort::Data(id) = s {
                pending.push(id.clone());
            }
        }
        fn term(
            t: &Term,
            pending: &mut Vec<String>,
            nodes: &mut usize,
            depth: usize,
        ) -> LangResult<()> {
            *nodes += 1;
            if depth > 128 || *nodes > 100_000 {
                return Err("definition lowering resource limit".into());
            }
            match t {
                Term::Construct {
                    datatype,
                    arguments,
                    ..
                } => {
                    pending.push(datatype.clone());
                    for a in arguments {
                        term(a, pending, nodes, depth + 1)?;
                    }
                }
                Term::Call {
                    function,
                    arguments,
                } => {
                    pending.push(function.clone());
                    for a in arguments {
                        term(a, pending, nodes, depth + 1)?;
                    }
                }
                Term::SelfCall(arguments) => {
                    for a in arguments {
                        term(a, pending, nodes, depth + 1)?;
                    }
                }
                Term::Binary { left, right, .. } => {
                    term(left, pending, nodes, depth + 1)?;
                    term(right, pending, nodes, depth + 1)?;
                }
                Term::If {
                    condition,
                    on_true,
                    on_false,
                } => {
                    term(condition, pending, nodes, depth + 1)?;
                    term(on_true, pending, nodes, depth + 1)?;
                    term(on_false, pending, nodes, depth + 1)?;
                }
                Term::Match {
                    scrutinee,
                    branches,
                } => {
                    term(scrutinee, pending, nodes, depth + 1)?;
                    for b in branches {
                        term(&b.body, pending, nodes, depth + 1)?;
                    }
                }
                Term::Var(_) | Term::Bool(_) | Term::U64(_) => (),
            }
            Ok(())
        }
        let declarations = self.executable_declarations()?;
        let mut pending = self
            .exports
            .iter()
            .map(|id| self.choices.get(id).unwrap_or(id).clone())
            .collect::<Vec<_>>();
        let mut selected = BTreeMap::new();
        let mut nodes = 0;
        while let Some(id) = pending.pop() {
            if selected.contains_key(&id) {
                continue;
            }
            let d = declarations
                .get(&id)
                .ok_or("non-executable definition dependency")?;
            selected.insert(id, d.clone());
            match d {
                Declaration::Datatype { constructors } => {
                    for c in constructors {
                        for s in &c.fields {
                            sort(s, &mut pending);
                        }
                    }
                }
                Declaration::Function {
                    params,
                    result,
                    body,
                    ..
                } => {
                    for (_, s) in params {
                        sort(s, &mut pending);
                    }
                    sort(result, &mut pending);
                    term(body, &mut pending, &mut nodes, 0)?;
                }
                _ => unreachable!("filtered executable declarations"),
            }
        }
        Ok(selected)
    }
    pub fn bundle(&self) -> &Bundle {
        &self.bundle
    }
    pub fn exports(&self) -> &[String] {
        &self.exports
    }
    pub fn choices(&self) -> &BTreeMap<String, String> {
        &self.choices
    }
    pub fn bundle_sha256(&self) -> &str {
        &self.bundle_sha256
    }
    pub fn closure(&self) -> &[String] {
        &self.closure
    }
    pub fn selection_sha256(&self) -> Option<&str> {
        self.selection_sha256.as_deref()
    }
}
/// Seal literal executable definitions from an authenticated canonical view.
pub fn check_registry(
    bundle: &crate::registry::Bundle,
    exports: &[String],
) -> LangResult<CheckedDefinition> {
    let view = crate::registry::CheckedBundle::check(bundle)?;
    view.first_order_context()?;
    if exports.is_empty() || exports.len() > 128 {
        return Err("definition export count limit".into());
    }
    let mut unique = BTreeSet::new();
    let mut objects = BTreeMap::new();
    for (id, entry) in &bundle.objects {
        let declaration: Declaration = serde_json::from_value(entry.payload["declaration"].clone())
            .map_err(|e| e.to_string())?;
        let object = Object {
            schema: 1,
            semantics: library::SEMANTICS.into(),
            name: id.clone(),
            dependencies: entry.dependencies.clone(),
            declaration,
        };
        objects.insert(
            id.clone(),
            serde_json::to_string(&object).map_err(|e| e.to_string())?,
        );
    }
    for id in exports {
        if !bundle.roots.contains(id) || !unique.insert(id.clone()) {
            return Err("definition export must be a unique public root".into());
        }
        let object: Object = serde_json::from_str(objects.get(id).ok_or("missing export")?)
            .map_err(|e| e.to_string())?;
        if !matches!(object.declaration, Declaration::Function { .. }) {
            return Err("definition export must be a function".into());
        }
    }
    // Internal lowering adapter only. Entry identities are retained; these
    // bytes cannot pass the separate raw-library hash admission path.
    Ok(CheckedDefinition {
        bundle: Bundle {
            lock: crate::content::Lock {
                schema: 1,
                semantics: library::SEMANTICS.into(),
                objects: bundle.roots.clone(),
            },
            objects,
        },
        exports: exports.to_vec(),
        choices: BTreeMap::new(),
        bundle_sha256: crate::registry::identity(bundle)?,
        closure: bundle.objects.keys().cloned().collect(),
        selection_sha256: None,
    })
}
pub fn check(
    bundle: &Bundle,
    exports: &[String],
    selection: Option<&SelectionPackage>,
) -> LangResult<CheckedDefinition> {
    let checked = library::load_bundle(bundle)?;
    let bundle_sha256 = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(bundle).map_err(|e| e.to_string())?)
    );
    if exports.is_empty() || exports.len() > 128 {
        return Err("definition export count limit".into());
    }
    let mut unique = BTreeSet::new();
    for id in exports {
        if !bundle.lock.objects.contains(id) {
            return Err("definition export is not a public root".into());
        }
        if !unique.insert(id) {
            return Err("duplicate definition export".into());
        }
    }
    let objects = bundle
        .objects
        .iter()
        .map(|(id, raw)| {
            Ok((
                id.clone(),
                serde_json::from_str::<Object>(raw).map_err(|e| e.to_string())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let mut choices = BTreeMap::new();
    if let Some(package) = selection {
        if package.schema != 1
            || package.semantics != SELECTION_SEMANTICS
            || package.observations != "first-order-total-values-v1"
        {
            return Err("incompatible definition selection semantics".into());
        }
        if package.bundle_sha256 != bundle_sha256 {
            return Err("definition selection bundle identity mismatch".into());
        }
        if package.proposals.len() > 128 {
            return Err("definition proposal count limit".into());
        }
        for proposal in &package.proposals {
            if !exports.contains(&proposal.original) {
                return Err("definition proposal does not name an export".into());
            }
            if !bundle.lock.objects.contains(&proposal.replacement) {
                return Err("replacement is not a public root".into());
            }
            if choices
                .insert(proposal.original.clone(), proposal.replacement.clone())
                .is_some()
            {
                return Err("duplicate definition proposal".into());
            }
            let (Some(original), Some(replacement)) = (
                objects.get(&proposal.original),
                objects.get(&proposal.replacement),
            ) else {
                return Err("missing replacement definition".into());
            };
            let (
                Declaration::Function { params, result, .. },
                Declaration::Function {
                    params: to_params,
                    result: to_result,
                    ..
                },
            ) = (&original.declaration, &replacement.declaration)
            else {
                return Err("replacement endpoints must be functions".into());
            };
            if result != to_result
                || params.iter().map(|p| &p.1).collect::<Vec<_>>()
                    != to_params.iter().map(|p| &p.1).collect::<Vec<_>>()
            {
                return Err("replacement function signature mismatch".into());
            }
            let args: Vec<_> = params.iter().map(|p| Term::Var(p.0.clone())).collect();
            checked.context.check(
                params,
                &[],
                &Term::Call {
                    function: proposal.original.clone(),
                    arguments: args.clone(),
                },
                &Term::Call {
                    function: proposal.replacement.clone(),
                    arguments: args,
                },
                &proposal.proof,
            )?;
        }
    }
    for id in exports {
        if !matches!(objects[id].declaration, Declaration::Function { .. }) {
            return Err("definition export must be a function".into());
        }
    }
    Ok(CheckedDefinition {
        bundle: bundle.clone(),
        exports: exports.to_vec(),
        choices,
        bundle_sha256,
        closure: checked.closure,
        selection_sha256: selection
            .map(|p| {
                serde_json::to_vec(p)
                    .map(|bytes| format!("{:x}", Sha256::digest(bytes)))
                    .map_err(|e| e.to_string())
            })
            .transpose()?,
    })
}

/// Transport is untrusted; it cannot deserialise into CheckedDefinition.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub schema: u32,
    pub semantics: String,
    pub bundle: Bundle,
    pub exports: Vec<String>,
    pub selection: Option<SelectionPackage>,
}
pub const REQUEST_SEMANTICS: &str = "ink-definition-lowering-input-v1";
impl Request {
    pub fn from_bytes(bytes: &[u8]) -> LangResult<CheckedDefinition> {
        if bytes.len() > 16_000_000 {
            return Err("definition lowering input exceeds size limit".into());
        }
        let request: Self = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        if request.schema != 1 || request.semantics != REQUEST_SEMANTICS {
            return Err("incompatible definition lowering input".into());
        }
        check(
            &request.bundle,
            &request.exports,
            request.selection.as_ref(),
        )
    }
}
