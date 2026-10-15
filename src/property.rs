//! Source-bound property certificates. Producers choose propositions and proofs;
//! this adapter only binds the subject and invokes the existing equality kernel.
use crate::{
    core::CheckedModule,
    laws::{CheckedCatalogue, Equation, Proof},
    registry::{self, Bundle},
    semantic::{self as s, Budget, Env, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SEMANTICS: &str = "ink-source-properties-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Fact {
    pub function: String,
    /// A typed observation with the distinguished free variable below.
    pub context: Term,
    pub subject_variable: String,
    pub value: Term,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub knowledge: Bundle,
    pub facts: Vec<Fact>,
}
#[derive(Clone, Debug)]
pub struct CheckedProperties {
    package: Package,
    equations: Vec<Equation>,
}
impl CheckedProperties {
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn equations(&self) -> &[Equation] {
        &self.equations
    }
}
pub fn check(module: &CheckedModule, package: &Package) -> LangResult<CheckedProperties> {
    if package.schema != 1
        || package.semantics != SEMANTICS
        || package.input_core_sha256 != module.identity()?
        || package.facts.len() > 4096
    {
        return Err("property package source/semantics/count mismatch".into());
    }
    let view = registry::CheckedBundle::check(&package.knowledge)?;
    let p = module.program();
    let laws = CheckedCatalogue::check(&view.catalogue()?, p)?;
    let mut budget = Budget::new();
    let mut equations = vec![];
    for fact in &package.facts {
        let f = p
            .functions
            .iter()
            .find(|f| f.name == fact.function)
            .ok_or("property subject function missing")?;
        let params = crate::check::params_env(&f.params)?;
        let env: Env = params
            .iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect();
        if fact.subject_variable.is_empty() || env.contains_key(&fact.subject_variable) {
            return Err("property subject variable collides with source scope".into());
        }
        let body = s::elaborate(&f.body, &params, p, &f.result)?;
        let mut observation_env = env.clone();
        observation_env.insert(fact.subject_variable.clone(), body.sort.clone());
        s::validate(&fact.context, &observation_env, p, &mut budget)?;
        let mut pending = vec![&fact.context];
        let mut mentions_subject = false;
        while let Some(term) = pending.pop() {
            mentions_subject |= matches!(&term.node,s::Node::Free(n)if n==&fact.subject_variable);
            pending.extend(s::children(term));
        }
        if !mentions_subject {
            return Err("property observation does not refer to its subject".into());
        }
        // Binding an arbitrary checked observation is sufficient. Property names
        // never grant allocation, aliasing, effect or rewrite authority.
        let from = s::substitute(
            &fact.context,
            &BTreeMap::from([(fact.subject_variable.clone(), body)]),
            &mut budget,
        )?;
        let goal = Equation {
            from,
            to: fact.value.clone(),
        };
        laws.prove(p, &env, &[], &goal, &fact.proof, &mut budget, 0)?;
        equations.push(goal);
    }
    Ok(CheckedProperties {
        package: package.clone(),
        equations,
    })
}
