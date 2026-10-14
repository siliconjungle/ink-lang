//! Scoped consequences of checked source contracts. This is source correspondence,
//! not a transformation catalogue. Search receives descriptions; admission derives
//! them again from the exact module. Committed-state invariants are not ambient
//! hypotheses inside a transaction.
use super::*;
use crate::semantic::{Budget, Env, Node, Sort, Term};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SiteFacts {
    pub path: Vec<usize>,
    pub parameters: Env,
    pub conditions: Vec<Equation>,
}

pub(crate) struct Scope<'a> {
    pub target: &'a Term,
    pub parameters: Env,
    pub binders: Vec<(String, Sort)>,
    pub conditions: Vec<Equation>,
}

fn specification(p: &Program, name: &str) -> Option<Specification> {
    super::specification(p, name).filter(|s| s.kind.is_none())
}

pub(crate) fn entry(p: &Program, name: &str) -> LangResult<Vec<Equation>> {
    let Some(spec) = specification(p, name) else { return Ok(vec![]) };
    let env = crate::check::params_env(&spec.params)?;
    let mut facts=spec.requires.iter().map(|e| Ok(assertion(predicate(e, &env, p)?))).collect::<LangResult<Vec<_>>>()?;
    expand_conjunctions(&mut facts)?;
    Ok(facts)
}

pub(crate) fn expand_conjunctions(facts:&mut Vec<Equation>)->LangResult<()> {
    let mut index=0;
    while index<facts.len() {
        let fact=facts[index].clone();index+=1;
        if fact.to==s::term(s::value(Type::Bool),Node::Bool(true)) {
            if let Node::Op(op,args)=fact.from.node {
                if op=="binary:&&" && args.len()==2 {
                    for term in args {
                        let component=assertion(term);
                        if !facts.contains(&component) {
                            if facts.len()>=1024{return Err("source fact count limit".into())}
                            facts.push(component);
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

/// Call postconditions may be used only after establishing every actual
/// precondition. Arguments and result observations remain exact semantic terms.
/// No callback's bound variable escapes into its enclosing scope.
pub(crate) fn consequences(
    p: &Program, proof_program: &Program, term: &Term, env: &Env, facts: &mut Vec<Equation>,
    laws: &CheckedCatalogue, budget: &mut Budget, depth: usize,
) -> LangResult<()> {
    if p.contracts.specifications.is_empty() && p.contracts.inferred.is_empty() { return Ok(()) }
    budget.step(depth)?;
    if matches!(term.node, Node::Lambda(_)) { return Ok(()) }
    for child in s::children(term) {
        consequences(p, proof_program, child, env, facts, laws, budget, depth + 1)?;
    }
    let Node::Op(operation, args) = &term.node else { return Ok(()) };
    let Some(name) = operation.strip_prefix("call:") else { return Ok(()) };
    let Some(spec) = specification(p, name) else { return Ok(()) };
    if args.len() != spec.params.len() { return Err("contract fact call arity".into()) }
    let mut substitutions = spec.params.iter().zip(args)
        .map(|((n, _), a)| (n.clone(), a.clone())).collect::<BTreeMap<_, _>>();
    let mut declared = crate::check::params_env(&spec.params)?;
    for e in &spec.requires {
        let goal = assertion(s::substitute(&predicate(e, &declared, p)?, &substitutions, budget)?);
        if laws.prove(proof_program, env, facts, &goal, &Proof::Normalize, budget, 0).is_err() {
            return Ok(())
        }
    }
    declared.insert("result".into(), spec.result.clone());
    substitutions.insert("result".into(), term.clone());
    for e in &spec.ensures {
        let fact = assertion(s::substitute(&predicate(e, &declared, p)?, &substitutions, budget)?);
        if !facts.contains(&fact) {
            if facts.len() >= 1024 { return Err("source fact count limit".into()) }
            facts.push(fact);
        }
    }
    expand_conjunctions(facts)?;
    Ok(())
}

pub(crate) fn at<'a>(
    p: &Program, body: &'a Term, params: &[(String, Type)], initial: Vec<Equation>,
    path: &[usize], laws: &CheckedCatalogue, budget: &mut Budget,
) -> LangResult<Scope<'a>> {
    let mut target = body;
    let mut parameters: Env = params.iter().map(|(n, t)| (n.clone(), s::value(t.clone()))).collect();
    let mut binders = vec![];
    let mut conditions = initial;
    let mut argument = None;
    for index in path {
        budget.step(binders.len())?;
        let opened = s::open_scope(target, &binders, budget)?;
        consequences(p, p, &opened, &parameters, &mut conditions, laws, budget, 0)?;
        let mut next_argument = None;
        if let Node::Op(n, args) = &target.node {
            let flag = match (n.as_str(), *index) {
                ("call:choose", 1) | ("binary:&&", 1) => Some(true),
                ("call:choose", 2) | ("binary:||", 1) => Some(false),
                _ => None,
            };
            if let Some(flag) = flag {
                conditions.push(Equation {
                    from: s::open_scope(&args[0], &binders, budget)?,
                    to: s::term(s::value(Type::Bool), Node::Bool(flag)),
                });
            }
            if n == "apply" && *index == 0 && args.len() == 2
                && matches!(args[0].node, Node::Lambda(_)) {
                next_argument = Some(s::open_scope(&args[1], &binders, budget)?);
            }
        }
        if let (Node::Lambda(_), Sort::Arrow(parameter, _)) = (&target.node, &target.sort) {
            let mut name = format!("__ink_scope_{}", binders.len());
            while parameters.contains_key(&name) { name.push('_') }
            parameters.insert(name.clone(), (**parameter).clone());
            if let Some(value) = argument.take() {
                conditions.push(Equation { from: s::free((**parameter).clone(), &name), to: value });
            }
            binders.push((name, (**parameter).clone()));
        }
        argument = next_argument;
        target = s::children(target).get(*index).copied().ok_or("selection path out of range")?;
    }
    let opened = s::open_scope(target, &binders, budget)?;
    consequences(p, p, &opened, &parameters, &mut conditions, laws, budget, 0)?;
    Ok(Scope { target, parameters, binders, conditions })
}

pub(crate) fn describe(
    p: &Program, _name: &str, body: &Term, params: &[(String, Type)], initial: Vec<Equation>,
    laws: &CheckedCatalogue,
) -> LangResult<Vec<SiteFacts>> {
    let mut pending = vec![(body, vec![])];
    let mut out = vec![];
    let mut budget = Budget::new();
    let mut visited = 0;
    while let Some((term, path)) = pending.pop() {
        visited += 1;
        if visited > 1024 { break }
        let scope = at(p, body, params, initial.clone(), &path, laws, &mut budget)?;
        if !scope.conditions.is_empty() {
            out.push(SiteFacts { path: path.clone(), parameters: scope.parameters, conditions: scope.conditions });
        }
        for (index, child) in s::children(term).into_iter().enumerate().rev() {
            let mut next = path.clone(); next.push(index); pending.push((child, next));
        }
    }
    Ok(out)
}
