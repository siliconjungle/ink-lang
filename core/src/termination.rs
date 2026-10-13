//! Authored unsigned measures. Source projection derives every strict-descent
//! obligation; authenticated database entries supply independently checked RUP.
//! No producer, measure name, hash or annotation is termination authority.
use crate::{
    bounds,
    core::{Expr, Program},
    registry, LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-source-termination-v1";
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Declarations {
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub measures: BTreeMap<String, Expr>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub knowledge: Option<registry::Bundle>,
}
impl Declarations {
    pub fn is_empty(&self) -> bool {
        self.measures.is_empty() && self.knowledge.is_none()
    }
}

/// Bind the complete elaborated executable source and measure declarations.
/// Descent uses no contract assumptions. Contract metadata and proof bytes are
/// excluded, so independent authoring contexts can replay the same universal
/// descent without a content-addressing cycle. Generated guard bodies stay bound.
pub fn subject_identity(p: &Program) -> LangResult<String> {
    let mut source = p.clone();
    source.termination.knowledge = None;
    source.contracts = Default::default();
    registry::identity(&source)
}

/// Authoring accepts unadmitted source; its output grants no executable authority.
pub fn obligations(p: &Program) -> LangResult<Vec<bounds::Obligation>> {
    if p.termination.measures.len() > 256 {
        return Err("termination measure count limit".into());
    }
    let mut out = vec![];
    for (name, measure) in &p.termination.measures {
        let f = p
            .functions
            .iter()
            .find(|f| &f.name == name)
            .ok_or("termination function missing")?;
        // Measures must be independently total. In particular, proving a
        // recursive call decreases cannot invoke that same recursion to measure it.
        let mut pending = vec![measure];
        let mut visited = BTreeSet::new();
        let mut work = 0;
        while let Some(expression) = pending.pop() {
            work += 1;
            if work > 50_000 {
                return Err("termination measure dependency limit".into());
            }
            if let Expr::Call(callee, _) = expression {
                if let Some(helper) = p.functions.iter().find(|f| &f.name == callee) {
                    if callee == name || crate::recursion::recursive(helper) {
                        return Err("termination measure depends on recursive execution".into());
                    }
                    if visited.insert(callee) {
                        pending.push(&helper.body);
                    }
                }
            }
            pending.extend(crate::analysis::children(expression));
        }
        out.extend(bounds::measure_obligations(p, f, measure)?);
        if out.len() > 4096 {
            return Err("termination call site limit".into());
        }
    }
    Ok(out)
}

pub fn check(p: &Program) -> LangResult<()> {
    if p.termination.is_empty() {
        return Ok(());
    }
    if p.termination.measures.is_empty() {
        return Err("termination evidence without measures".into());
    }
    let goals: BTreeMap<_, _> = obligations(p)?
        .into_iter()
        .map(|g| (g.site.clone(), g))
        .collect();
    let bundle = p
        .termination
        .knowledge
        .as_ref()
        .ok_or("authored termination measures require checked evidence")?;
    let checked = registry::CheckedBundle::check(bundle)?;
    let source = subject_identity(p)?;
    let mut proved = BTreeSet::new();
    for id in &checked.bundle().roots {
        let object = &checked.bundle().objects[id];
        if object.kind != registry::Kind::Definition
            || object.semantics != SEMANTICS
            || !object.dependencies.is_empty()
        {
            return Err("termination certificate domain mismatch".into());
        }
        let proof: bounds::Certificate =
            serde_json::from_value(object.payload.clone()).map_err(|e| e.to_string())?;
        if proof.source != source || !proved.insert(proof.site.clone()) {
            return Err("termination source or duplicate site mismatch".into());
        }
        let goal = goals
            .get(&proof.site)
            .ok_or("termination recursive site missing")?;
        if proof.obligation_sha256 != registry::identity(goal)? {
            return Err("termination obligation mismatch".into());
        }
        let problem = crate::logic::Context::default().bitvector_problem(
            &goal.params,
            &goal.conditions,
            &goal.from,
            &goal.to,
        )?;
        crate::bitproof::verify(&problem, &proof.proof)?;
    }
    if proved != goals.keys().cloned().collect() {
        return Err("termination evidence omits a recursive call".into());
    }
    Ok(())
}
