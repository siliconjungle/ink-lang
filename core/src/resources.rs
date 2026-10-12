//! Generic lifetime and admission contracts for a checked call graph.
//! Producers choose release points and limits. No operation-specific rule or
//! sampled size becomes proof authority, and execution order is unchanged.
use crate::{
    registry,
    source_routing::{CheckedRouting, ValueRef},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-graph-resources-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Admission {
    pub max_pending: u32,
    /// Captured ABI payload bytes, not total process/device memory.
    pub max_pending_bytes: u64,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Release {
    pub after: String,
    pub values: Vec<String>,
    #[serde(default)]
    pub inputs: Vec<usize>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub schema: u32,
    pub semantics: String,
    pub route_sha256: String,
    pub releases: Vec<Release>,
    pub admission: Option<Admission>,
}
#[derive(Clone, Debug)]
pub struct CheckedResources {
    plan: Plan,
}
impl CheckedResources {
    pub fn plan(&self) -> &Plan {
        &self.plan
    }
}
pub fn check(route: &CheckedRouting, plan: &Plan) -> LangResult<CheckedResources> {
    let graph = route.package();
    if plan.schema != 1
        || plan.semantics != SEMANTICS
        || plan.route_sha256 != registry::identity(graph)?
        || plan.releases.len() > graph.stages.len()
    {
        return Err("resource plan graph/semantics/count mismatch".into());
    }
    if let Some(a) = &plan.admission {
        if a.max_pending == 0
            || a.max_pending > 1_000_000
            || a.max_pending_bytes == 0
            || a.max_pending_bytes > 9_007_199_254_740_991
        {
            return Err("invalid resource admission credits".into());
        }
    }
    let positions: BTreeMap<_, _> = graph
        .stages
        .iter()
        .enumerate()
        .map(|(i, s)| (s.id.as_str(), i))
        .collect();
    let mut last = positions.clone();
    for (i, s) in graph.stages.iter().enumerate() {
        for reference in &s.arguments {
            if let ValueRef::Stage(id) = reference {
                last.insert(id.as_str(), i);
            }
        }
    }
    if let ValueRef::Stage(id) = &graph.output {
        last.insert(id.as_str(), graph.stages.len());
    }
    let entry = route
        .module()
        .program()
        .functions
        .iter()
        .find(|f| f.name == graph.entry)
        .ok_or("resource entry missing")?;
    let mut input_last = vec![0; entry.params.len()];
    for (i, s) in graph.stages.iter().enumerate() {
        for r in &s.arguments {
            if let ValueRef::Input(n) = r {
                input_last[*n] = i;
            }
        }
    }
    if let ValueRef::Input(n) = graph.output {
        input_last[n] = graph.stages.len();
    }
    let mut inputs_released = BTreeSet::new();
    let mut released = BTreeSet::new();
    let mut points = BTreeSet::new();
    for release in &plan.releases {
        let at = *positions
            .get(release.after.as_str())
            .ok_or("unknown release point")?;
        if !points.insert(at) || release.values.len() > graph.stages.len() {
            return Err("duplicate or oversized release point".into());
        }
        if release.inputs.len() > input_last.len() {
            return Err("oversized input release list".into());
        }
        for &input in &release.inputs {
            if *input_last.get(input).ok_or("released input out of range")? > at
                || !inputs_released.insert(input)
            {
                return Err("input release precedes final use or is duplicated".into());
            }
        }
        for value in &release.values {
            let defined = *positions
                .get(value.as_str())
                .ok_or("unknown released value")?;
            if defined > at || last[value.as_str()] > at || !released.insert(value) {
                return Err("resource release precedes final use or is duplicated".into());
            }
        }
    }
    Ok(CheckedResources { plan: plan.clone() })
}
