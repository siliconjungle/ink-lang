//! Bounded authoring of external executable laws. This constructs and checks
//! ordinary evidence; source labels and tactic spellings confer no authority.
use crate::{
    check,
    core::CheckedModule,
    definition_context::DefinitionContext,
    laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof},
    registry::{self, Bundle, CheckedBundle, Entry},
    semantic as s,
    syntax::Program,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub proof: Proof,
    #[serde(default)]
    pub conditions: Vec<Equation>,
}
#[derive(Debug)]
pub struct Authored {
    pub bundle: Bundle,
    pub names: BTreeMap<String, String>,
}
fn dependencies(
    proof: &Proof,
    out: &mut BTreeSet<String>,
    budget: &mut s::Budget,
    depth: usize,
) -> LangResult<()> {
    budget.step(depth)?;
    match proof {
        Proof::Use { law, premises, .. } => {
            out.insert(law.clone());
            for p in premises {
                dependencies(p, out, budget, depth + 1)?;
            }
        }
        Proof::Sym(p) => dependencies(p, out, budget, depth + 1)?,
        Proof::Trans { left, right, .. } => {
            dependencies(left, out, budget, depth + 1)?;
            dependencies(right, out, budget, depth + 1)?;
        }
        Proof::Congruence(ps) => {
            for p in ps {
                dependencies(p, out, budget, depth + 1)?;
            }
        }
        Proof::Cases {
            on_false, on_true, ..
        } => {
            dependencies(on_false, out, budget, depth + 1)?;
            dependencies(on_true, out, budget, depth + 1)?;
        }
        Proof::Induction { base, step, .. } | Proof::GeneralizedInduction { base, step, .. } => {
            dependencies(base, out, budget, depth + 1)?;
            dependencies(step, out, budget, depth + 1)?;
        }
        Proof::AssertEquality { premise, body, .. } => {
            dependencies(premise, out, budget, depth + 1)?;
            dependencies(body, out, budget, depth + 1)?;
        }
        Proof::Normalize | Proof::Hypothesis(_) | Proof::GeneralizedHypothesis { .. } => {}
    }
    Ok(())
}
fn callees(
    t: &s::Term,
    p: &Program,
    out: &mut BTreeSet<String>,
    b: &mut s::Budget,
    d: usize,
) -> LangResult<()> {
    b.step(d)?;
    if let s::Node::Op(n, _) = &t.node {
        if let Some(n) = n.strip_prefix("call:") {
            if p.functions.iter().any(|f| f.name == n) {
                out.insert(n.into());
            }
        }
    }
    for t in s::children(t) {
        callees(t, p, out, b, d + 1)?;
    }
    Ok(())
}
/// Authored source is separate from executable application admission. External
/// proof inputs retain the existing kernel representation, dependency checks,
/// applicability conditions and resource bounds.
pub fn compile(
    mut program: Program,
    mut evidence: BTreeMap<String, Evidence>,
    dependencies_bundle: Option<&Bundle>,
) -> LangResult<Authored> {
    let rules = std::mem::take(&mut program.rules);
    // Module labels are authoring namespaces, not executable identifiers or proof meaning.
    program.module.clear();
    if rules.is_empty() || rules.len() > 64 || evidence.len() > 64 {
        return Err(
            "law authoring requires 1..64 declarations and at most 64 evidence entries".into(),
        );
    }
    if !program.actions.is_empty()
        || !program.states.is_empty()
        || !program.keeps.is_empty()
        || !program.events.is_empty()
    {
        return Err("law authoring source contains executable state or effects".into());
    }
    crate::core::validate_value_groups(
        rules
            .iter()
            .map(|r| (r.params.as_slice(), vec![&r.from, &r.to])),
    )?;
    let module = CheckedModule::from_source(program)?;
    let p = module.program();
    let mut catalogue = if let Some(bundle) = dependencies_bundle {
        CheckedBundle::check(bundle)?.catalogue()?
    } else {
        Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        }
    };
    catalogue.roots.clear();
    let mut names = BTreeMap::new();
    let mut budget = s::Budget::new();
    for rule in rules {
        if names.contains_key(&rule.name) {
            return Err(format!("duplicate authored law {}", rule.name));
        }
        let env = check::params_env(&rule.params)?;
        let ty = check::infer(&rule.from, &env, p)?;
        check::infer_as(&rule.to, &env, p, &ty)?;
        let from = s::elaborate(&rule.from, &env, p, &ty)?;
        let to = s::elaborate(&rule.to, &env, p, &ty)?;
        let supplied = evidence.remove(&rule.name);
        let proof = match rule.tactic.as_str() {
            "normalize" if supplied.is_none() => Evidence {
                proof: Proof::Normalize,
                conditions: vec![],
            },
            "provided" => {
                supplied.ok_or_else(|| format!("missing proof evidence for {}", rule.name))?
            }
            _ => {
                return Err(format!(
                    "unsupported or ambiguous authoring tactic {}",
                    rule.tactic
                ))
            }
        };
        let mut uses = BTreeSet::new();
        dependencies(&proof.proof, &mut uses, &mut budget, 0)?;
        let mut calls = BTreeSet::new();
        callees(&from, p, &mut calls, &mut budget, 0)?;
        callees(&to, p, &mut calls, &mut budget, 0)?;
        for equation in &proof.conditions {
            callees(&equation.from, p, &mut calls, &mut budget, 0)?;
            callees(&equation.to, p, &mut calls, &mut budget, 0)?;
        }
        let context = if calls.is_empty() && p.records.is_empty() && p.enums.is_empty() {
            None
        } else {
            Some(DefinitionContext::capture(
                &module,
                &calls.into_iter().collect::<Vec<_>>(),
            )?)
        };
        let law = Law {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            params: env.into_iter().map(|(n, t)| (n, s::value(t))).collect(),
            conditions: proof.conditions,
            from,
            to,
            proof: proof.proof,
            dependencies: uses.into_iter().collect(),
            definition_context: context,
        };
        let id = registry::identity(&Entry::from_law(&law)?)?;
        catalogue.objects.insert(id.clone(), law);
        catalogue.roots.push(id.clone());
        names.insert(rule.name, id);
    }
    if !evidence.is_empty() {
        return Err("unused proof evidence label".into());
    }
    catalogue.roots.sort();
    catalogue.roots.dedup();
    CheckedCatalogue::check(&catalogue, p)?;
    Ok(Authored {
        bundle: registry::from_catalogue(&catalogue)?,
        names,
    })
}
