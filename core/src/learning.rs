//! Explicit learning capabilities. Learning is an ordinary, deterministic change
//! with a restricted write set. These declarations grant no equality, gradient,
//! approximation or profitability authority.
use crate::{core::*, LangResult};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Declarations {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub trainable: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub adaptive: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub learn: Vec<String>,
}
impl Declarations {
    pub fn is_empty(&self) -> bool {
        self.trainable.is_empty() && self.adaptive.is_empty() && self.learn.is_empty()
    }
}

pub fn check(p: &Program) -> LangResult<()> {
    let d = &p.contracts.learning;
    for names in [&d.trainable, &d.adaptive, &d.learn] {
        if names.len() > 256 || names.iter().collect::<BTreeSet<_>>().len() != names.len() {
            return Err("duplicate learning declaration or learning resource limit".into());
        }
    }
    for name in &d.trainable {
        if !p.states.iter().any(|s| &s.name == name) {
            return Err(format!("trainable state does not exist: {name}"));
        }
    }
    for name in &d.learn {
        let a = p.actions.iter().find(|a| &a.name == name)
            .ok_or_else(|| format!("learning action does not exist: {name}"))?;
        if a.kind != ActionKind::Change || a.writes.is_empty()
            || a.writes.iter().any(|n| !d.trainable.contains(n)) {
            return Err(format!("learning action {name} must write only designated trainable state"));
        }
    }
    for a in &p.actions {
        if !d.learn.contains(&a.name) && a.writes.iter().any(|n| d.trainable.contains(n)) {
            return Err(format!("only a learn change may write trainable state: {}", a.name));
        }
    }
    for name in &d.adaptive {
        if let Some(f) = p.functions.iter().find(|f| &f.name == name) {
            if f.params.is_empty() {
                return Err(format!("adaptive function {name} needs explicit inputs"));
            }
        } else if let Some(a) = p.actions.iter().find(|a| &a.name == name) {
            if a.kind != ActionKind::Query {
                return Err(format!("adaptive action {name} must be a readonly query"));
            }
        } else {
            return Err(format!("adaptive computation does not exist: {name}; generic adaptive functions must be instantiated explicitly"));
        }
    }
    Ok(())
}
