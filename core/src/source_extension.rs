//! Conservative typed definitions supplied by knowledge. This admits bodies,
//! not replacements: ordinary equality proofs still authorise their use.
use crate::{
    core::{CheckedModule, Function, Type},
    registry, LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-source-extension-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Definitions {
    pub functions: Vec<Function>,
    #[serde(default)]
    pub ids: Vec<String>,
    #[serde(default)]
    pub records: BTreeMap<String, Vec<(String, Type)>>,
    #[serde(default)]
    pub enums: BTreeMap<String, Vec<String>>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub knowledge: registry::Bundle,
    pub extension: String,
}
fn name(n: &str) -> LangResult<()> {
    let mut bytes = n.bytes();
    if !bytes
        .next()
        .is_some_and(|c| c.is_ascii_alphabetic() || c == b'_')
        || !bytes.all(|c| c.is_ascii_alphanumeric() || c == b'_')
        || n.len() > 256
    {
        return Err("extension identifier is not a bounded source name".into());
    }
    Ok(())
}
pub fn check(module: &CheckedModule, request: &Request) -> LangResult<CheckedModule> {
    if request.schema != 1
        || request.semantics != SEMANTICS
        || request.input_core_sha256 != module.identity()?
    {
        return Err("source extension input/semantics mismatch".into());
    }
    registry::CheckedBundle::check(&request.knowledge)?;
    if !request.knowledge.roots.contains(&request.extension) {
        return Err("source extension is not an enabled root".into());
    }
    let entry = request
        .knowledge
        .objects
        .get(&request.extension)
        .ok_or("source extension object missing")?;
    if entry.kind != registry::Kind::Definition || entry.semantics != SEMANTICS {
        return Err("source extension entry role mismatch".into());
    }
    let definitions: Definitions =
        serde_json::from_value(entry.payload.clone()).map_err(|e| e.to_string())?;
    let size = definitions.functions.len()
        + definitions.ids.len()
        + definitions.records.len()
        + definitions.enums.len();
    if size == 0 || size > 256 {
        return Err("source extension declaration limit".into());
    }
    let mut p = module.program().clone();
    let mut names: BTreeSet<String> = p
        .functions
        .iter()
        .map(|f| f.name.clone())
        .chain(p.actions.iter().map(|f| f.name.clone()))
        .chain(p.states.iter().map(|f| f.name.clone()))
        .chain(p.keeps.iter().map(|f| f.name.clone()))
        .chain(p.events.keys().cloned())
        .chain(p.ids.iter().cloned())
        .chain(p.records.keys().cloned())
        .chain(p.enums.keys().cloned())
        .collect();
    // Protect implicit builtin/type references as well as declared globals.
    fn references(v: &serde_json::Value, out: &mut BTreeSet<String>) {
        match v {
            serde_json::Value::Object(fields) => {
                if let Some(n) = fields.get("Named").and_then(|v| v.as_str()) {
                    out.insert(n.into());
                }
                if let Some(n) = fields
                    .get("Call")
                    .and_then(|v| v.get(0))
                    .and_then(|v| v.as_str())
                {
                    out.insert(n.into());
                }
                if let Some(n) = fields
                    .get("Var")
                    .and_then(|v| v.as_str())
                    .and_then(|n| n.split_once('.').map(|v| v.0))
                {
                    out.insert(n.into());
                }
                for v in fields.values() {
                    references(v, out);
                }
            }
            serde_json::Value::Array(values) => {
                for v in values {
                    references(v, out);
                }
            }
            _ => (),
        }
    }
    references(
        &serde_json::to_value(&p).map_err(|e| e.to_string())?,
        &mut names,
    );
    names.insert("ArithmeticError".into());
    for n in definitions
        .functions
        .iter()
        .map(|f| &f.name)
        .chain(definitions.ids.iter())
        .chain(definitions.records.keys())
        .chain(definitions.enums.keys())
    {
        name(n)?;
        if !names.insert(n.clone()) {
            return Err("source extension shadows an existing declaration".into());
        }
    }
    for f in &definitions.functions {
        for (n, _) in &f.params {
            name(n)?;
        }
    }
    for fields in definitions.records.values() {
        for (n, _) in fields {
            name(n)?;
        }
    }
    for variants in definitions.enums.values() {
        for n in variants {
            name(n)?;
        }
    }
    p.functions.extend(definitions.functions);
    p.ids.extend(definitions.ids);
    p.records.extend(definitions.records);
    p.enums.extend(definitions.enums);
    // Fixed type, purity, ownership, binding and termination checks. No raw host
    // code, foreign instructions, producer identities or unchecked assumptions.
    CheckedModule::from_source(p)
}
