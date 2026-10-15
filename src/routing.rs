//! Pure typed composition across opaque execution domains. Target APIs and cost
//! selection do not belong here. This checks mathematical composition only;
//! physical bridges, backend code and scheduling remain separate trust duties.
use crate::{
    definition,
    library::{self, Bundle, Object},
    logic::{Declaration, Proof, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-pure-routing-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum ValueRef {
    Input(usize),
    Stage(String),
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Stage {
    pub id: String,
    pub function: String,
    /// Opaque backend package identity, never a theorem authority.
    pub backend: String,
    /// Opaque execution domain; core does not know CPU/GPU APIs.
    pub domain: String,
    pub arguments: Vec<ValueRef>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub bundle_sha256: String,
    pub entry: String,
    pub stages: Vec<Stage>,
    pub output: ValueRef,
    pub preservation: Proof,
}
#[derive(Debug)]
pub struct CheckedRouting {
    package: Package,
    definitions: definition::CheckedDefinition,
    params: Vec<(String, Sort)>,
    result: Sort,
    stage_sorts: BTreeMap<String, Sort>,
    composition: Term,
}
impl CheckedRouting {
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn definitions(&self) -> &definition::CheckedDefinition {
        &self.definitions
    }
    pub fn params(&self) -> &[(String, Sort)] {
        &self.params
    }
    pub fn result(&self) -> &Sort {
        &self.result
    }
    pub fn stage_sorts(&self) -> &BTreeMap<String, Sort> {
        &self.stage_sorts
    }
    pub fn composition(&self) -> &Term {
        &self.composition
    }
}
fn name(s: &str) -> LangResult<()> {
    if s.is_empty()
        || s.len() > 128
        || !s
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.' | b':' | b'/'))
    {
        return Err("invalid routing identifier".into());
    }
    Ok(())
}
fn signature(
    objects: &BTreeMap<String, Object>,
    roots: &[String],
    id: &str,
) -> LangResult<(Vec<(String, Sort)>, Sort)> {
    if !roots.iter().any(|x| x == id) {
        return Err("routing function is not a public root".into());
    }
    match &objects
        .get(id)
        .ok_or("missing routing function")?
        .declaration
    {
        Declaration::Function { params, result, .. } => Ok((params.clone(), result.clone())),
        _ => Err("routing endpoint must be a checked function".into()),
    }
}
fn resolve(
    reference: &ValueRef,
    params: &[(String, Sort)],
    stages: &BTreeMap<String, (Sort, Term)>,
) -> LangResult<(Sort, Term)> {
    match reference {
        ValueRef::Input(i) => params
            .get(*i)
            .map(|(n, s)| (s.clone(), Term::Var(n.clone())))
            .ok_or("routing input index out of range".into()),
        ValueRef::Stage(id) => stages
            .get(id)
            .cloned()
            .ok_or("routing edge names a missing or future stage".into()),
    }
}
/// All placements are untrusted labels. Checked equalities certify abstract
/// function composition, never the honesty or speed of a backend/transport.
pub fn check(bundle: &Bundle, package: &Package) -> LangResult<CheckedRouting> {
    if package.schema != 1 || package.semantics != SEMANTICS {
        return Err("incompatible routing semantics".into());
    }
    if package.stages.is_empty() || package.stages.len() > 32 {
        return Err("routing stage count limit".into());
    }
    let library = library::load_bundle(bundle)?;
    let identity = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(bundle).map_err(|e| e.to_string())?)
    );
    if identity != package.bundle_sha256 {
        return Err("routing bundle identity mismatch".into());
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
    let (params, result) = signature(&objects, &bundle.lock.objects, &package.entry)?;
    let mut values = BTreeMap::new();
    let mut exports = BTreeSet::new();
    // Expanded DAGs can duplicate terms exponentially. Bound their accumulated
    // canonical bytes before admitting or handing the composition to the kernel.
    let mut expansion_bytes = 0usize;
    for stage in &package.stages {
        name(&stage.id)?;
        name(&stage.backend)?;
        name(&stage.domain)?;
        if values.contains_key(&stage.id) {
            return Err("duplicate routing stage".into());
        }
        let (required, sort) = signature(&objects, &bundle.lock.objects, &stage.function)?;
        if required.len() != stage.arguments.len() {
            return Err("routing stage arity mismatch".into());
        }
        let mut args = Vec::new();
        for (reference, (_, expected)) in stage.arguments.iter().zip(&required) {
            let (actual, term) = resolve(reference, &params, &values)?;
            if &actual != expected {
                return Err(
                    "routing edge type mismatch; supply an explicit checked conversion stage"
                        .into(),
                );
            }
            args.push(term);
        }
        let term = Term::Call {
            function: stage.function.clone(),
            arguments: args,
        };
        expansion_bytes += serde_json::to_vec(&term).map_err(|e| e.to_string())?.len();
        if expansion_bytes > 1_000_000 {
            return Err("routing composition expansion limit".into());
        }
        values.insert(stage.id.clone(), (sort, term));
        exports.insert(stage.function.clone());
    }
    let (actual, composition) = resolve(&package.output, &params, &values)?;
    if actual != result {
        return Err("routing output type mismatch".into());
    }
    // Every stage must contribute to the result. This avoids accepting unproved
    // orphan execution, especially before an effects interface is introduced.
    let mut used = BTreeSet::new();
    let mut work = vec![&package.output];
    while let Some(reference) = work.pop() {
        if let ValueRef::Stage(id) = reference {
            if used.insert(id.clone()) {
                let stage = package
                    .stages
                    .iter()
                    .find(|s| &s.id == id)
                    .ok_or("missing routing stage")?;
                work.extend(stage.arguments.iter());
            }
        }
    }
    if used.len() != package.stages.len() {
        return Err("routing contains unused stages".into());
    }
    library.context.check(
        &params,
        &[],
        &Term::Call {
            function: package.entry.clone(),
            arguments: params.iter().map(|(n, _)| Term::Var(n.clone())).collect(),
        },
        &composition,
        &package.preservation,
    )?;
    let definitions = definition::check(bundle, &exports.into_iter().collect::<Vec<_>>(), None)?;
    Ok(CheckedRouting {
        package: package.clone(),
        definitions,
        params,
        result,
        stage_sorts: values
            .into_iter()
            .map(|(id, (sort, _))| (id, sort))
            .collect(),
        composition,
    })
}
