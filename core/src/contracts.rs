//! Source contracts are proof obligations, never trusted annotations.
//! Specifications describe admitted behaviour. Implementations and database laws
//! remain untrusted until the existing semantic/inductive kernels check them.
use crate::{
    core::*,
    laws::{self, Catalogue, CheckedCatalogue, Equation, Proof},
    semantic as s, LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

mod calls;
mod callbacks;
pub(crate) mod facts;
mod refinement;
pub(crate) mod state;
pub use refinement::{check_refinement, prepare, Body, Refinement};
pub use facts::SiteFacts;
pub(crate) mod cells;
pub(crate) mod collections;
pub mod values;
pub use state::{StateObligation, StateObligations};

pub const SEMANTICS: &str = "ink-contracts-v1";
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Contracts {
    #[serde(default, skip_serializing_if="BTreeMap::is_empty")]
    pub action_protocols: BTreeMap<String, crate::protocol::Execution>,
    /// Predicates on immutable nominal values, in the single `value` binder.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub value_invariants: BTreeMap<String, Expr>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub value_constructors: BTreeMap<String, String>,
    /// Fixed, raw-value validation bodies; these do not assume their inputs valid.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub value_validators: BTreeMap<String, Type>,
    /// Derived type obligations, authenticated again against the actual module.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub inferred: BTreeMap<String, Specification>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub specifications: Vec<Specification>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub implementations: Vec<Implementation>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub invariants: Vec<Expr>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub private_states: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub invariant_checks: Vec<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub precondition_checks: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub proofs: BTreeMap<String, Proof>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub knowledge: Option<crate::registry::Bundle>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub state_proofs: BTreeMap<String, crate::logic::Proof>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub state_knowledge: Option<crate::registry::Bundle>,
}
impl Contracts {
    pub fn is_empty(&self) -> bool {
        self.action_protocols.is_empty()
            && self.value_invariants.is_empty()
            && self.value_constructors.is_empty()
            && self.value_validators.is_empty()
            && self.inferred.is_empty()
            && self.specifications.is_empty()
            && self.implementations.is_empty()
            && self.invariants.is_empty()
            && self.private_states.is_empty()
            && self.invariant_checks.is_empty()
            && self.precondition_checks.is_empty()
            && self.proofs.is_empty()
            && self.knowledge.is_none()
            && self.state_proofs.is_empty()
            && self.state_knowledge.is_none()
    }
}

/// Explicit behavioural specifications and exact, source-derived value contracts
/// use the same existing proof and ingress interfaces. Inferred contracts do not
/// make an ordinary function eligible for specification refinement.
pub fn specifications(p: &Program) -> Vec<Specification> {
    let mut out = p.contracts.specifications.clone();
    for (name, inferred) in &p.contracts.inferred {
        if let Some(spec) = out.iter_mut().find(|s| &s.name == name) {
            spec.requires.extend(inferred.requires.clone());
            spec.ensures.extend(inferred.ensures.clone());
        } else {
            out.push(inferred.clone());
        }
    }
    out
}

pub(crate) fn specification(p: &Program, name: &str) -> Option<Specification> {
    let owner = p.contracts.implementations.iter().find(|i| i.name == name)
        .map_or(name, |i| i.specification.as_str());
    let explicit = p.contracts.specifications.iter().find(|s| s.name == owner);
    let inferred = p.contracts.inferred.get(owner);
    match (explicit, inferred) {
        (Some(spec), Some(inferred)) => {
            let mut spec = spec.clone();
            spec.requires.extend(inferred.requires.clone());
            spec.ensures.extend(inferred.ensures.clone());
            Some(spec)
        }
        (Some(spec), None) | (None, Some(spec)) => Some(spec.clone()),
        _ => None,
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Specification {
    pub name: String,
    pub kind: Option<ActionKind>,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub reads: Vec<String>,
    pub writes: Vec<String>,
    pub emits: Vec<String>,
    pub requires: Vec<Expr>,
    pub ensures: Vec<Expr>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Implementation {
    pub name: String,
    pub specification: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub body: Vec<Statement>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Obligation {
    pub name: String,
    pub params: s::Env,
    pub conditions: Vec<Equation>,
    pub goal: Equation,
}
pub(crate) fn assertion(t: s::Term) -> Equation {
    if let s::Node::Op(n, args) = &t.node {
        if n == "binary:==" && args.len() == 2 && args[0].sort != s::value(Type::F32) {
            return Equation {
                from: args[0].clone(),
                to: args[1].clone(),
            };
        }
    }
    Equation {
        from: t,
        to: truth(),
    }
}
fn truth() -> s::Term {
    s::term(s::value(Type::Bool), s::Node::Bool(true))
}
fn predicate(e: &Expr, env: &crate::check::Env, p: &Program) -> LangResult<s::Term> {
    crate::check::infer_as(e, env, p, &Type::Bool)?;
    let term = s::elaborate(e, env, p, &Type::Bool)?;
    if p.contracts.value_invariants.is_empty() { Ok(term) }
    else { s::beta_normalize(&term, &mut s::Budget::new()) }
}
/// Pure obligations are exported verbatim for untrusted proof production.
pub fn obligations(p: &Program) -> LangResult<Vec<Obligation>> {
    let mut out = Vec::new();
    let mut names = BTreeSet::new();
    for spec in &specifications(p) {
        if !names.insert(&spec.name) || spec.ensures.is_empty() {
            return Err("duplicate specification or missing ensures clause".into());
        }
        if spec.kind.is_some() {
            continue;
        }
        let params = crate::check::params_env(&spec.params)?;
        if params.contains_key("result") {
            return Err("result is reserved in specifications".into());
        }
        let mut conditions = spec
            .requires
            .iter()
            .map(|e| Ok(assertion(predicate(e, &params, p)?)))
            .collect::<LangResult<Vec<_>>>()?;
        facts::expand_conjunctions(&mut conditions)?;
        let mut env = params.clone();
        env.insert("result".into(), spec.result.clone());
        for name in std::iter::once(&spec.name).chain(
            p.contracts
                .implementations
                .iter()
                .filter(|i| i.specification == spec.name)
                .map(|i| &i.name),
        ) {
            let f = p
                .functions
                .iter()
                .find(|f| &f.name == name)
                .ok_or("missing executable implementation")?;
            if f.params != spec.params || f.result != spec.result {
                return Err("implementation signature differs from specification".into());
            }
            let body = s::elaborate(&f.body, &params, p, &f.result)?;
            for (i, e) in spec.ensures.iter().enumerate() {
                let from = s::substitute(
                    &predicate(e, &env, p)?,
                    &BTreeMap::from([("result".into(), body.clone())]),
                    &mut s::Budget::new(),
                )?;
                out.push(Obligation {
                    name: format!("{name}:ensures:{i}"),
                    params: params
                        .iter()
                        .map(|(n, t)| (n.clone(), s::value(t.clone())))
                        .collect(),
                    conditions: conditions.clone(),
                    goal: assertion(from),
                });
            }
        }
        if !p.contracts.inferred.contains_key(&spec.name) && !p
            .contracts
            .implementations
            .iter()
            .any(|i| i.specification == spec.name)
        {
            return Err(format!("specification {} has no implementation", spec.name));
        }
    }
    if !specifications(p)
        .iter()
        .any(|s| s.kind.is_none() && !s.requires.is_empty())
    {
        return Ok(out);
    }
    let mut executable = p.clone();
    executable.contracts = Contracts::default();
    let catalogue = CheckedCatalogue::check(&Catalogue {
        schema: 1, semantics: laws::SEMANTICS.into(), roots: vec![], objects: BTreeMap::new(),
    }, &executable)?;
    // Only call sites with an actual precondition need semantic proof terms.
    // Unrelated checked functions may use values outside that proof domain.
    // Each callee's own body and specification remain checked independently.
    let mut guarded=BTreeSet::new();
    for spec in specifications(p).into_iter().filter(|s|s.kind.is_none()&&!s.requires.is_empty()) {
        guarded.insert(spec.name.clone());
        guarded.extend(p.contracts.implementations.iter().filter(|i|i.specification==spec.name).map(|i|i.name.clone()));
    }
    for f in &p.functions {
        let mut callees = BTreeSet::new();
        crate::check::calls(&f.body, &mut callees);
        if callees.is_disjoint(&guarded) { continue; }
        let env = crate::check::params_env(&f.params)?;
        let owner = specification(p, &f.name);
        let mut conditions = if let Some(spec) = owner {
            spec.requires
                .iter()
                .map(|e| Ok(assertion(predicate(e, &env, p)?)))
                .collect::<LangResult<Vec<_>>>()?
        } else {
            vec![]
        };
        facts::expand_conjunctions(&mut conditions)?;
        let term = s::elaborate(&f.body, &env, p, &f.result)?;
        let semantic_env = env
            .iter()
            .map(|(n, t)| (n.clone(), s::value(t.clone())))
            .collect();
        call_obligations(
            &term,
            p,
            &semantic_env,
            &conditions,
            &[],
            &f.name,
            &mut vec![],
            &mut out,
            &mut s::Budget::new(),
            &catalogue,
            &executable,
        )?;
    }
    Ok(out)
}
fn call_obligations(
    t: &s::Term,
    p: &Program,
    env: &s::Env,
    conditions: &[Equation],
    scope: &[(String, s::Sort)],
    owner: &str,
    path: &mut Vec<usize>,
    out: &mut Vec<Obligation>,
    budget: &mut s::Budget,
    catalogue: &CheckedCatalogue,
    executable: &Program,
) -> LangResult<()> {
    let mut conditions = conditions.to_vec();
    facts::expand_conjunctions(&mut conditions)?;
    // Postconditions are introduced only in call-site obligations. Every
    // implementation's own postconditions are checked independently above;
    // using a callee contract cannot justify that same contract circularly.
    facts::consequences(p, executable, &s::open_scope(t, scope, budget)?, env,
        &mut conditions, catalogue, budget, 0)?;
    budget.step(path.len())?;
    if let s::Node::Op(n, args) = &t.node {
        if let Some(name) = n.strip_prefix("call:") {
            if let Some(spec) = specification(p, name).filter(|s| s.kind.is_none()) {
                let parameters = crate::check::params_env(&spec.params)?;
                let substitutions = spec
                    .params
                    .iter()
                    .zip(args)
                    .map(|((n, _), a)| Ok((n.clone(), s::open_scope(a, scope, budget)?)))
                    .collect::<LangResult<BTreeMap<_, _>>>()?;
                for (i, e) in spec.requires.iter().enumerate() {
                    let from =
                        s::substitute(&predicate(e, &parameters, p)?, &substitutions, budget)?;
                    out.push(Obligation {
                        name: format!("{owner}:call:{path:?}:requires:{i}"),
                        params: env.clone(),
                        conditions: conditions.clone(),
                        goal: assertion(from),
                    });
                }
            }
        }
    }
    let mut local = env.clone();
    let mut scope = scope.to_vec();
    if let s::Node::Lambda(_) = &t.node {
        let s::Sort::Arrow(input, _) = &t.sort else {
            return Err("invalid contract binder".into());
        };
        let n = callbacks::binder_name(&local, scope.len());
        local.insert(n.clone(), (**input).clone());
        scope.push((n, (**input).clone()));
    }
    for (i, child) in s::children(t).into_iter().enumerate() {
        let mut facts = conditions.clone();
        if let s::Node::Op(n, args) = &t.node {
            let flag = match (n.as_str(), i) {
                ("call:choose", 1) | ("binary:&&", 1) => Some(true),
                ("call:choose", 2) | ("binary:||", 1) => Some(false),
                _ => None,
            };
            if let Some(v) = flag {
                let condition = s::open_scope(&args[0], &scope, budget)?;
                facts.push(if v { assertion(condition) } else { Equation {
                    from: condition,
                    to: s::term(s::value(Type::Bool), s::Node::Bool(false)),
                }});
            }
            if n == "apply" && i == 0 && args.len() == 2 {
                if let (s::Node::Lambda(_), s::Sort::Arrow(parameter, _)) = (&args[0].node, &args[0].sort) {
                    let name = callbacks::binder_name(&local, scope.len());
                    facts.push(Equation {
                        from: s::free((**parameter).clone(), &name),
                        to: s::open_scope(&args[1], &scope, budget)?,
                    });
                }
            }
        }
        path.push(i);
        let start = out.len();
        call_obligations(child, p, &local, &facts, &scope, owner, path, out, budget, catalogue, executable)?;
        path.pop();
        callbacks::lift(t, i, &local, &conditions, &scope, &mut out[start..], budget,
            catalogue, executable)?;
    }
    Ok(())
}

/// Shared pure-expression call obligations for readonly computation inside an
/// action. State observations are supplied as typed free values by the action
/// walker; this grants no state invariant or fact across a mutation.
fn expression_obligations(
    p: &Program,
    e: &Expr,
    env: &crate::check::Env,
    facts: &[Expr],
) -> LangResult<Vec<Obligation>> {
    let ty = crate::check::infer(e, env, p)?;
    let term = s::elaborate(e, env, p, &ty)?;
    let mut conditions = facts
        .iter()
        .map(|e| Ok(assertion(predicate(e, env, p)?)))
        .collect::<LangResult<Vec<_>>>()?;
    facts::expand_conjunctions(&mut conditions)?;
    let semantic_env = env
        .iter()
        .map(|(n, t)| (n.clone(), s::value(t.clone())))
        .collect();
    let mut executable = p.clone();
    executable.contracts = Contracts::default();
    let catalogue = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        &executable,
    )?;
    let mut out = vec![];
    call_obligations(
        &term,
        p,
        &semantic_env,
        &conditions,
        &[],
        "expression",
        &mut vec![],
        &mut out,
        &mut s::Budget::new(),
        &catalogue,
        &executable,
    )?;
    Ok(out)
}

pub fn check(module: &CheckedModule) -> LangResult<()> {
    let p = module.program();
    let c = &p.contracts;
    if c.is_empty() {
        return Ok(());
    }
    values::check(p)?;
    if c.specifications.len() + c.implementations.len() + c.invariants.len() > 256
        || c.proofs.len() > 4096
        || c.state_proofs.len() > 4096
    {
        return Err("contract resource limit".into());
    }
    let mut implementations = BTreeSet::new();
    for implementation in &c.implementations {
        if !implementation.body.is_empty()
            || !implementations.insert(&implementation.name)
            || c.specifications
                .iter()
                .any(|s| s.name == implementation.name)
            || !c
                .specifications
                .iter()
                .any(|s| s.name == implementation.specification)
        {
            return Err("invalid executable implementation metadata".into());
        }
    }
    if c.private_states.iter().collect::<BTreeSet<_>>().len() != c.private_states.len() {
        return Err("duplicate private state".into());
    }
    if c.invariants.len() != c.invariant_checks.len() {
        return Err("missing invariant ingress checks".into());
    }
    for (predicate, name) in c.invariants.iter().zip(&c.invariant_checks) {
        let action = p
            .actions
            .iter()
            .find(|a| &a.name == name)
            .ok_or("missing invariant check action")?;
        if action.kind != ActionKind::Query
            || !action.params.is_empty()
            || action.result != Type::Bool
            || !action.writes.is_empty()
            || !action.emits.is_empty()
            || serde_json::to_value(&action.body).map_err(|e| e.to_string())?
                != serde_json::to_value(vec![Statement::Return(predicate.clone())])
                    .map_err(|e| e.to_string())?
        {
            return Err("invariant ingress check differs from predicate".into());
        }
    }
    let mut expected_checks = BTreeSet::new();
    for spec in &specifications(p) {
        if spec.requires.is_empty() {
            continue;
        }
        for name in std::iter::once(&spec.name).chain(
            c.implementations
                .iter()
                .filter(|i| i.specification == spec.name)
                .map(|i| &i.name),
        ) {
            expected_checks.insert(name.clone());
            let guard = c
                .precondition_checks
                .get(name)
                .ok_or("missing precondition ingress guard")?;
            if c.precondition_checks.contains_key(guard) {
                return Err("precondition guard cannot itself require a precondition".into());
            }
            let expected = conjunction(&spec.requires);
            let valid = if spec.kind.is_none() {
                p.functions.iter().any(|f| {
                    &f.name == guard
                        && f.params == spec.params
                        && f.result == Type::Bool
                        && serde_json::to_value(&f.body).ok()
                            == serde_json::to_value(&expected).ok()
                })
            } else {
                p.actions.iter().any(|a| {
                    &a.name == guard
                        && a.kind == ActionKind::Query
                        && a.params == spec.params
                        && a.result == Type::Bool
                        && a.writes.is_empty()
                        && a.emits.is_empty()
                        && serde_json::to_value(&a.body).ok()
                            == serde_json::to_value(vec![Statement::Return(expected.clone())]).ok()
                })
            };
            if !valid {
                return Err("precondition ingress guard differs from specification".into());
            }
        }
    }
    if !expected_checks.iter().eq(c.precondition_checks.keys()) {
        return Err("unexpected precondition ingress guard".into());
    }
    for name in &c.private_states {
        if !p.states.iter().any(|s| &s.name == name) {
            return Err("unknown private state".into());
        }
    }

    if c.specifications.len() + c.implementations.len() + c.invariants.len() > 256
        || c.proofs.len() > 4096
    {
        return Err("contract resource limit".into());
    }
    state::check(module)?;
    let catalogue = if let Some(bundle) = &c.knowledge {
        crate::registry::CheckedBundle::check(bundle)?.catalogue()?
    } else {
        Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        }
    };
    let mut executable = p.clone();
    executable.contracts = Contracts::default();
    let laws = CheckedCatalogue::check(&catalogue, &executable)?;
    let goals = obligations(p)?;
    let mut used = BTreeSet::new();
    for g in goals {
        let proof = c.proofs.get(&g.name).unwrap_or(&Proof::Normalize);
        laws.prove(
            &executable,
            &g.params,
            &g.conditions,
            &g.goal,
            proof,
            &mut s::Budget::new(),
            0,
        )
        .map_err(|e| format!("contract {}: {e}", g.name))?;
        used.insert(g.name);
    }
    if c.proofs.keys().any(|n| !used.contains(n)) {
        return Err("proof supplied for unknown contract obligation".into());
    }
    Ok(())
}

pub fn needs_state(program: &Program) -> LangResult<bool> {
    Ok(!program.contracts.invariants.is_empty()
        || specifications(program)
            .iter()
            .any(|s| s.kind.is_some())
        || !calls::actions(program)?.is_empty())
}

pub fn state_obligations(program: &Program) -> LangResult<StateObligations> {
    state::derive(program)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub schema: u32,
    pub semantics: String,
    pub source_sha256: String,
    #[serde(default)]
    pub proofs: BTreeMap<String, Proof>,
    #[serde(default)]
    pub state_proofs: BTreeMap<String, crate::logic::Proof>,
    #[serde(default)]
    pub knowledge: Option<crate::registry::Bundle>,
    #[serde(default)]
    pub state_knowledge: Option<crate::registry::Bundle>,
}
pub fn subject_identity(p: &Program) -> LangResult<String> {
    let mut p = p.clone();
    p.contracts.proofs.clear();
    p.contracts.state_proofs.clear();
    p.contracts.knowledge = None;
    p.contracts.state_knowledge = None;
    crate::registry::identity(&p)
}
pub fn attach(p: &mut Program, e: Evidence) -> LangResult<()> {
    if e.schema != 1 || e.semantics != SEMANTICS || e.source_sha256 != subject_identity(p)? {
        return Err("contract evidence does not match exact source/semantics".into());
    }
    p.contracts.proofs = e.proofs;
    p.contracts.state_proofs = e.state_proofs;
    p.contracts.knowledge = e.knowledge;
    p.contracts.state_knowledge = e.state_knowledge;
    Ok(())
}

fn conjunction(predicates: &[Expr]) -> Expr {
    predicates
        .iter()
        .rev()
        .cloned()
        .fold(Expr::Bool(true), |rest, e| {
            Expr::Binary("&&".into(), Box::new(e), Box::new(rest))
        })
}
/// Add ordinary readonly query bodies used only at untrusted snapshot ingress.
/// Their exact bodies are rechecked with the declared invariants.
pub(crate) fn install_guards(p: &mut Program) -> LangResult<()> {
    if !p.contracts.invariant_checks.is_empty() {
        return Err("source supplies generated invariant checks".into());
    }
    for (i, predicate) in p.contracts.invariants.iter().enumerate() {
        let mut name = format!("__ink_invariant_{i}");
        while p.actions.iter().any(|a| a.name == name)
            || p.functions.iter().any(|a| a.name == name)
            || p.states.iter().chain(&p.keeps).any(|s| s.name == name)
        {
            name.push('_');
        }
        p.actions.push(Action {
            name: name.clone(),
            kind: ActionKind::Query,
            params: vec![],
            result: Type::Bool,
            reads: p
                .states
                .iter()
                .chain(&p.keeps)
                .map(|s| s.name.clone())
                .collect(),
            writes: vec![],
            emits: vec![],
            body: vec![Statement::Return(predicate.clone())],
        });
        p.contracts.invariant_checks.push(name);
    }
    for (i, spec) in specifications(p).iter().enumerate() {
        if spec.requires.is_empty() {
            continue;
        }
        let mut guard = format!("__ink_requires_{i}");
        while p.functions.iter().any(|f| f.name == guard)
            || p.actions.iter().any(|a| a.name == guard)
            || p.states.iter().chain(&p.keeps).any(|s| s.name == guard)
        {
            guard.push('_');
        }
        let body = conjunction(&spec.requires);
        if spec.kind.is_none() {
            p.functions.push(Function {
                name: guard.clone(),
                params: spec.params.clone(),
                result: Type::Bool,
                body,
            });
        } else {
            p.actions.push(Action {
                name: guard.clone(),
                kind: ActionKind::Query,
                params: spec.params.clone(),
                result: Type::Bool,
                reads: p
                    .states
                    .iter()
                    .chain(&p.keeps)
                    .map(|s| s.name.clone())
                    .collect(),
                writes: vec![],
                emits: vec![],
                body: vec![Statement::Return(body)],
            });
        }
        for name in std::iter::once(&spec.name).chain(
            p.contracts
                .implementations
                .iter()
                .filter(|j| j.specification == spec.name)
                .map(|j| &j.name),
        ) {
            p.contracts
                .precondition_checks
                .insert(name.clone(), guard.clone());
        }
    }
    Ok(())
}

/// Check one externally proposed derivation for the source-derived obligation.
/// This authoring endpoint does not admit a module or an implementation.
pub fn check_proof(
    p: &Program,
    name: &str,
    proof: serde_json::Value,
    bundle: Option<&crate::registry::Bundle>,
) -> LangResult<()> {
    ProofContext::new(p)?.check(name, proof, bundle)
}

/// An immutable source context for repeated authoring attempts. Its executable
/// structure and source-derived obligations are reused; every proposed proof
/// and dependency bundle is still checked independently. This does not admit
/// the source contracts or make the original program executable.
pub struct ProofContext {
    source: Program,
    executable: CheckedModule,
    pure: Vec<Obligation>,
    pure_names: BTreeMap<String, usize>,
    empty_catalogue: CheckedCatalogue,
    state: Option<StateObligations>,
}
impl ProofContext {
    pub fn new(p: &Program) -> LangResult<Self> {
        let pure = obligations(p)?;
        let pure_names = pure.iter().enumerate()
            .map(|(i, g)| (g.name.clone(), i))
            .collect();
        let mut executable = p.clone();
        executable.contracts = Contracts::default();
        let executable = CheckedModule::from_source(executable)?;
        let empty_catalogue = CheckedCatalogue::check(
            &Catalogue {
                schema: 1,
                semantics: laws::SEMANTICS.into(),
                roots: vec![],
                objects: BTreeMap::new(),
            },
            executable.program(),
        )?;
        Ok(Self {
            source: p.clone(),
            executable,
            pure,
            pure_names,
            empty_catalogue,
            state: None,
        })
    }
    pub fn source_identity(&self) -> LangResult<String> {
        subject_identity(&self.source)
    }
    /// Export the same source-derived goals used by this context, in derivation
    /// order. The returned document is authoring data, never proof authority.
    pub fn export_obligations(&mut self) -> LangResult<serde_json::Value> {
        let pure = serde_json::to_value(&self.pure).map_err(|e| e.to_string())?;
        fn called_helpers(value: &serde_json::Value, program: &Program, names: &mut BTreeSet<String>) {
            match value {
                serde_json::Value::String(value) => if let Some(name) = value.strip_prefix("call:") {
                    if program.functions.iter().any(|f| f.name == name) { names.insert(name.into()); }
                },
                serde_json::Value::Array(values) => for value in values { called_helpers(value, program, names); },
                serde_json::Value::Object(fields) => for value in fields.values() { called_helpers(value, program, names); },
                _ => (),
            }
        }
        let mut roots = BTreeSet::new();
        called_helpers(&pure, &self.source, &mut roots);
        let definition_context = crate::definition_context::DefinitionContext::capture(
            &self.executable, &roots.into_iter().collect::<Vec<_>>(),
        )?;
        let state = if needs_state(&self.source)? {
            if self.state.is_none() { self.state = Some(state::derive(&self.source)?); }
            self.state.as_ref()
        } else { None };
        Ok(serde_json::json!({"schema":1,"semantics":SEMANTICS,
            "source_sha256":self.source_identity()?,"pure":pure,"state":state,
            "definition_context":definition_context}))
    }
    pub fn check(
        &mut self,
        name: &str,
        proof: serde_json::Value,
        bundle: Option<&crate::registry::Bundle>,
    ) -> LangResult<()> {
        if let Some(&index) = self.pure_names.get(name) {
            let g = &self.pure[index];
            let catalogue = if let Some(b) = bundle {
                Some(crate::registry::CheckedBundle::check(b)?.catalogue()?)
            } else {
                None
            };
            let checked = catalogue
                .as_ref()
                .map(|c| CheckedCatalogue::check(c, self.executable.program()))
                .transpose()?;
            let laws = checked.as_ref().unwrap_or(&self.empty_catalogue);
            return laws.prove(
                self.executable.program(),
                &g.params,
                &g.conditions,
                &g.goal,
                &serde_json::from_value(proof).map_err(|e| e.to_string())?,
                &mut s::Budget::new(),
                0,
            );
        }
        if self.state.is_none() {
            self.state = Some(state::derive(&self.source)?);
        }
        let derived = self.state.as_ref().expect("derived state context");
        let cx = state::context(derived, bundle)?;
        let g = derived
            .obligations
            .iter()
            .find(|g| g.name == name)
            .ok_or("unknown contract obligation")?;
        cx.check(
            &g.params,
            &g.conditions,
            &g.goal.from,
            &g.goal.to,
            &serde_json::from_value(proof).map_err(|e| e.to_string())?,
        )
    }
}
