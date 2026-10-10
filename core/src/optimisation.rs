//! One checked selection boundary for interpreters, lowerers and routers.
//! No matching, search, profitability decisions or optimisation laws live here.
use crate::{
    core::CheckedModule,
    laws::{Catalogue, CheckedCatalogue, Equation, Proof},
    semantic::{self as s, Budget, Env, Node, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
pub const SEMANTICS: &str = "ink-evidence-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Site {
    pub function: String,
    pub path: Vec<usize>,
    pub law: String,
    pub arguments: BTreeMap<String, Term>,
    pub premises: Vec<Proof>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub knowledge: crate::registry::Bundle,
    pub applications: Vec<Site>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_replacement: Option<crate::action_model::Replacement>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub semantics: String,
    pub input_core_sha256: String,
    pub selected_core_sha256: String,
    pub snapshot_sha256: String,
    pub closure: Vec<String>,
    pub applied_laws: Vec<String>,
}
#[derive(Clone, Debug)]
pub struct CheckedSelection {
    input: CheckedModule,
    module: CheckedModule,
    evidence: Evidence,
    package: Package,
}
impl CheckedSelection {
    pub fn input_module(&self) -> &CheckedModule {
        &self.input
    }
    pub fn module(&self) -> &CheckedModule {
        &self.module
    }
    pub fn evidence(&self) -> &Evidence {
        &self.evidence
    }
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn into_module(self) -> CheckedModule {
        self.module
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Subject {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub functions: BTreeMap<String, Term>,
    pub unavailable: Vec<String>,
}
pub fn subject(module: &CheckedModule) -> LangResult<Subject> {
    let p = module.program();
    let mut functions = BTreeMap::new();
    let mut unavailable = vec![];
    for f in &p.functions {
        match s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result) {
            Ok(t) => {
                functions.insert(f.name.clone(), t);
            }
            Err(e) => unavailable.push(format!("function {}: {e}", f.name)),
        }
    }
    match crate::action_semantic::Regions::derive(module, &mut Budget::new()) {
        Ok(regions) => {
            for (key, r) in regions.entries {
                functions.insert(key, r.term);
            }
        }
        Err(e) => unavailable.push(format!("action/keep projection: {e}")),
    }
    Ok(Subject {
        schema: 1,
        semantics: s::SEMANTICS.into(),
        input_core_sha256: module.identity()?,
        functions,
        unavailable,
    })
}
pub fn check(module: &CheckedModule, package: &Package) -> LangResult<CheckedSelection> {
    if package.schema != 1
        || package.semantics != SEMANTICS
        || package.input_core_sha256 != module.identity()?
    {
        return Err("selection does not match exact input module/semantics".into());
    }
    if package.applications.len() > 4096
        || serde_json::to_vec(package)
            .map_err(|e| e.to_string())?
            .len()
            > 16_000_000
    {
        return Err("selection package limit".into());
    }
    if let Some(replacement) = &package.action_replacement {
        if !package.applications.is_empty() {
            return Err(
                "compose expression and action selections as separately checked steps".into(),
            );
        }
        let selected = crate::action_model::check(module, &package.knowledge, replacement)?;
        return Ok(CheckedSelection {
            input: module.clone(),
            module: selected.clone(),
            package: package.clone(),
            evidence: Evidence {
                semantics: SEMANTICS.into(),
                input_core_sha256: module.identity()?,
                selected_core_sha256: selected.identity()?,
                snapshot_sha256: crate::registry::identity(&package.knowledge.snapshot)?,
                closure: package.knowledge.objects.keys().cloned().collect(),
                applied_laws: crate::action_model::used_theorems(
                    &replacement.proofs,
                    &package.knowledge,
                )?,
            },
        });
    }
    let p = module.program();
    let knowledge = crate::registry::CheckedBundle::check(&package.knowledge)?;
    let laws = CheckedCatalogue::check(&knowledge.catalogue()?, p)?;
    check_with_catalogue(module, package, &laws)
}
fn check_with_catalogue(
    module: &CheckedModule,
    package: &Package,
    laws: &CheckedCatalogue,
) -> LangResult<CheckedSelection> {
    if package.applications.is_empty() {
        return Ok(CheckedSelection {
            input: module.clone(),
            module: module.clone(),
            package: package.clone(),
            evidence: Evidence {
                semantics: SEMANTICS.into(),
                input_core_sha256: module.identity()?,
                selected_core_sha256: module.identity()?,
                snapshot_sha256: crate::registry::identity(&package.knowledge.snapshot)?,
                closure: laws.closure(),
                applied_laws: vec![],
            },
        });
    }
    let p = module.program();
    let mut budget = Budget::new();
    let regions = crate::action_semantic::Regions::derive(module, &mut budget)?;
    let mut bodies = BTreeMap::new();
    let mut parameters = BTreeMap::new();
    for f in &p.functions {
        if let Ok(t) = s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result) {
            bodies.insert(f.name.clone(), t);
            parameters.insert(f.name.clone(), f.params.clone());
        }
    }
    for (key, r) in &regions.entries {
        bodies.insert(key.clone(), r.term.clone());
        parameters.insert(key.clone(), r.proof_params.clone());
    }
    let mut used = vec![];
    for application in &package.applications {
        if !laws.roots().contains(&application.law) {
            return Err("application law is not an enabled catalogue root".into());
        }
        let params = parameters
            .get(&application.function)
            .ok_or("selection function/region missing")?;
        let mut env: Env = params
            .iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect();
        let body = bodies
            .get(&application.function)
            .ok_or("selection body missing")?;
        let mut target = body;
        let mut scope = vec![];
        let mut facts = if let Some(r) = regions.entries.get(&application.function) {
            crate::action_semantic::copy_facts(&r.facts, &mut budget)?
        } else {
            vec![]
        };
        for index in &application.path {
            budget.step(scope.len())?;
            if let Node::Op(n, args) = &target.node {
                let flag = match (n.as_str(), *index) {
                    ("call:choose", 1) | ("binary:&&", 1) => Some(true),
                    ("call:choose", 2) | ("binary:||", 1) => Some(false),
                    _ => None,
                };
                if let Some(flag) = flag {
                    facts.push(Equation {
                        from: s::open_scope(&args[0], &scope, &mut budget)?,
                        to: s::term(s::value(crate::core::Type::Bool), Node::Bool(flag)),
                    });
                }
            }
            if let (Node::Lambda(_), Sort::Arrow(parameter, _)) = (&target.node, &target.sort) {
                let mut name = format!("__ink_scope_{}", scope.len());
                while env.contains_key(&name) {
                    name.push('_')
                }
                env.insert(name.clone(), (**parameter).clone());
                scope.push((name, (**parameter).clone()));
            }
            target = s::children(target)
                .get(*index)
                .copied()
                .ok_or("selection path out of range")?;
        }
        let arguments = application
            .arguments
            .iter()
            .map(|(n, t)| Ok((n.clone(), s::open_scope(t, &scope, &mut budget)?)))
            .collect::<LangResult<BTreeMap<_, _>>>()?;
        let law = laws.law(&application.law)?;
        // Local binders become fresh universal parameters, never assumptions.
        for (n, sort) in &law.params {
            let arg = arguments.get(n).ok_or("missing selection argument")?;
            s::validate(arg, &env, p, &mut budget)?;
            if &arg.sort != sort {
                return Err("selection argument sort mismatch".into());
            }
        }
        if arguments.len() != law.params.len() || application.premises.len() != law.conditions.len()
        {
            return Err("selection instantiation arity".into());
        }
        for (condition, proof) in law.conditions.iter().zip(&application.premises) {
            let proof = crate::laws::open_proof(proof, &scope, &mut budget)?;
            laws.prove(
                p,
                &env,
                &facts,
                &crate::laws::sub_equation(condition, &arguments, &mut budget)?,
                &proof,
                &mut budget,
                0,
            )?;
        }
        let from = s::substitute(&law.from, &arguments, &mut budget)?;
        let to = s::substitute(&law.to, &arguments, &mut budget)?;
        // Match exact endpoints in the same opened local context.
        let closed = s::open_scope(target, &scope, &mut budget)?;
        if from != closed {
            return Err("law does not match exact selected expression".into());
        }
        let shifted = s::close_scope(&to, &scope, &mut budget)?;
        let selected = replace_path(body, &application.path, shifted, &mut budget, 0)?;
        let value_params = regions
            .entries
            .get(&application.function)
            .map(|r| &r.params)
            .unwrap_or(params);
        let outer_env: Env = value_params
            .iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect();
        s::validate(&selected, &outer_env, p, &mut budget)?;
        bodies.insert(application.function.clone(), selected);
        used.push(application.law.clone());
    }
    let mut selected = p.clone();
    for f in &mut selected.functions {
        if !bodies.contains_key(&f.name) {
            continue;
        }
        let original = s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
        if bodies[&f.name] != original {
            f.body = s::reify(&bodies[&f.name], p)?;
            // Reification is a semantic bridge, checked rather than inferred
            // from a producer's selected source or claimed identity.
            let actual =
                s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
            let env = f
                .params
                .iter()
                .map(|(n, t)| (n.clone(), s::value(t.clone())))
                .collect();
            laws.prove(
                p,
                &env,
                &[],
                &Equation {
                    from: bodies[&f.name].clone(),
                    to: actual,
                },
                &Proof::Normalize,
                &mut budget,
                0,
            )?;
        }
    }
    let mut expressions = BTreeMap::new();
    for (key, r) in &regions.entries {
        if bodies[key] != r.term {
            let (expr, actual) = regions.reify(key, &bodies[key], p, &mut budget)?;
            let env = r
                .params
                .iter()
                .map(|(n, t)| (n.clone(), s::value(t.clone())))
                .collect();
            laws.prove(
                p,
                &env,
                &[],
                &Equation {
                    from: bodies[key].clone(),
                    to: actual,
                },
                &Proof::Normalize,
                &mut budget,
                0,
            )?;
            expressions.insert(key.clone(), expr);
        }
    }
    regions.apply(&mut selected, expressions)?;
    // Statements and effects retain their positions; only admitted total pure
    // expression regions change. Storage declarations and footprints are intact.
    let selected = CheckedModule::from_source(selected)?;
    let evidence = Evidence {
        semantics: SEMANTICS.into(),
        input_core_sha256: module.identity()?,
        selected_core_sha256: selected.identity()?,
        snapshot_sha256: crate::registry::identity(&package.knowledge.snapshot)?,
        closure: laws.closure(),
        applied_laws: used,
    };
    Ok(CheckedSelection {
        input: module.clone(),
        module: selected,
        evidence,
        package: package.clone(),
    })
}
/// A bounded checker session validates a shared dependency closure once. The
/// producer may submit many proposals; none receives authority from the session.
pub struct SelectionChecker {
    module: CheckedModule,
    knowledge: crate::registry::Bundle,
    laws: CheckedCatalogue,
}
impl SelectionChecker {
    pub fn new(module: CheckedModule, knowledge: crate::registry::Bundle) -> LangResult<Self> {
        let checked = crate::registry::CheckedBundle::check(&knowledge)?;
        let laws = CheckedCatalogue::check(&checked.catalogue()?, module.program())?;
        Ok(Self {
            module,
            knowledge,
            laws,
        })
    }
    pub fn check(&self, applications: Vec<Site>) -> LangResult<CheckedSelection> {
        if applications.len() > 4096
            || serde_json::to_vec(&applications)
                .map_err(|e| e.to_string())?
                .len()
                > 16_000_000
        {
            return Err("selection application limit".into());
        }
        let package = Package {
            schema: 1,
            semantics: SEMANTICS.into(),
            input_core_sha256: self.module.identity()?,
            knowledge: self.knowledge.clone(),
            applications,
            action_replacement: None,
        };
        check_with_catalogue(&self.module, &package, &self.laws)
    }
}
fn replace_path(t: &Term, path: &[usize], new: Term, b: &mut Budget, d: usize) -> LangResult<Term> {
    b.step(d)?;
    if path.is_empty() {
        return Ok(new);
    }
    let child = s::children(t)
        .get(path[0])
        .copied()
        .ok_or("selection path out of range")?;
    s::replace_child(t, path[0], replace_path(child, &path[1..], new, b, d + 1)?)
}
/// Explicit expression equivalence lets a router justify a different source
/// composition with the same catalogue and proof calculus used for selection.
pub fn equivalent(
    module: &CheckedModule,
    catalogue: &Catalogue,
    params: &[(String, crate::core::Type)],
    result: &crate::core::Type,
    from: &crate::core::Expr,
    to: &crate::core::Expr,
    proof: &Proof,
) -> LangResult<String> {
    let p = module.program();
    let env = crate::check::params_env(params)?;
    let goal = Equation {
        from: s::elaborate(from, &env, p, result)?,
        to: s::elaborate(to, &env, p, result)?,
    };
    let laws = CheckedCatalogue::check(catalogue, p)?;
    laws.prove(
        p,
        &env.iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect(),
        &[],
        &goal,
        proof,
        &mut Budget::new(),
        0,
    )?;
    Ok(laws.identity().into())
}
