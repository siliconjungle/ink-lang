//! Source-bound pure expression regions in ordered actions and keeps.
//! This is a total-value contextual bridge, not whole-action or layout semantics.
use crate::{
    action_ir::{Body, CheckedActions, ExprType, Instruction, Kind, NodeId},
    core::{CheckedModule, Expr, Program, Type},
    semantic::{self as s, Budget, Env, Node, Sort, Term},
    LangResult,
};
use std::collections::{BTreeMap, BTreeSet};

pub(crate) struct Region {
    pub term: Term,
    pub params: Vec<(String, Type)>,
    pub proof_params: Vec<(String, Type)>,
    pub facts: Vec<crate::laws::Equation>,
    pub action: bool,
    pub owner: usize,
    pub node: NodeId,
    pub names: BTreeMap<String, String>,
}
pub(crate) struct Regions {
    pub actions: CheckedActions,
    pub entries: BTreeMap<String, Region>,
}
fn children(k: &Kind) -> Vec<NodeId> {
    match k {
        Kind::Record { fields, .. } => fields.iter().map(|(_, v)| *v).collect(),
        Kind::Field { receiver, .. } => vec![*receiver],
        Kind::Binary { left, right, .. } | Kind::And { left, right } | Kind::Or { left, right } => {
            vec![*left, *right]
        }
        Kind::Try { value } => vec![*value],
        Kind::Builtin { arguments, .. }
        | Kind::PureCall { arguments, .. }
        | Kind::QueryCall { arguments, .. }
        | Kind::ChangeCall { arguments, .. }
        | Kind::Table { arguments, .. } => arguments.clone(),
        Kind::Method {
            receiver,
            arguments,
            ..
        } => std::iter::once(*receiver)
            .chain(arguments.iter().copied())
            .collect(),
        Kind::Lambda { body, .. } => vec![*body],
        _ => vec![],
    }
}
fn total(body: &Body, id: NodeId, b: &mut Budget, d: usize) -> LangResult<bool> {
    b.step(d)?;
    match &body.nodes[id].kind {
        // Reject from the sealed kind before translating names. Even a root
        // named like a synthetic slot can never masquerade as a local value.
        Kind::State(_)
        | Kind::Keep(_)
        | Kind::Try { .. }
        | Kind::QueryCall { .. }
        | Kind::ChangeCall { .. }
        | Kind::Table { .. } => Ok(false),
        k => {
            for i in children(k) {
                if !total(body, i, b, d + 1)? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
    }
}
fn translate(body: &Body, p: &Program, id: NodeId, b: &mut Budget, d: usize) -> LangResult<Term> {
    b.step(d)?;
    let n = &body.nodes[id];
    let sort = match &n.ty {
        ExprType::Value(t) => s::value(t.clone()),
        ExprType::Lambda { parameter, result } => {
            s::arrow(s::value(parameter.clone()), s::value(result.clone()))
        }
    };
    let args = |xs: &[NodeId], b: &mut Budget| {
        xs.iter()
            .map(|i| translate(body, p, *i, b, d + 1))
            .collect::<LangResult<Vec<_>>>()
    };
    Ok(match &n.kind {
        Kind::Number(n) => s::term(sort, Node::Word(*n)),
        Kind::Bool(n) => s::term(sort, Node::Bool(*n)),
        Kind::Local(i) => s::free(sort, &format!("__ink_slot_{i}")),
        Kind::Record { name, fields } => {
            let mut out = vec![];
            for i in 0..p.records[name].len() {
                let id = fields
                    .iter()
                    .find(|(field, _)| *field == i)
                    .ok_or("missing checked record field")?
                    .1;
                out.push(translate(body, p, id, b, d + 1)?);
            }
            s::op(sort, &format!("record:{name}"), out)
        }
        Kind::Field {
            record,
            receiver,
            field,
        } => s::op(
            sort,
            &format!("field:{}", p.records[record][*field].0),
            vec![translate(body, p, *receiver, b, d + 1)?],
        ),
        Kind::Binary { op, left, right } => {
            s::op(sort, &format!("binary:{op}"), args(&[*left, *right], b)?)
        }
        Kind::And { left, right } => s::op(sort, "binary:&&", args(&[*left, *right], b)?),
        Kind::Or { left, right } => s::op(sort, "binary:||", args(&[*left, *right], b)?),
        Kind::Builtin { name, arguments } => {
            s::op(sort, &format!("call:{name}"), args(arguments, b)?)
        }
        Kind::PureCall {
            function,
            arguments,
        } => s::op(
            sort,
            &format!("call:{}", p.functions[*function].name),
            args(arguments, b)?,
        ),
        Kind::Method {
            receiver,
            method,
            arguments,
        } => {
            let mut out = vec![translate(body, p, *receiver, b, d + 1)?];
            out.extend(args(arguments, b)?);
            s::op(sort, &format!("method:{method}"), out)
        }
        Kind::Lambda {
            parameter,
            body: id,
        } => {
            let t = translate(body, p, *id, b, d + 1)?;
            let t = s::close_scope(
                &t,
                &[(
                    format!("__ink_slot_{parameter}"),
                    s::value(body.slots[*parameter].ty.clone()),
                )],
                b,
            )?;
            s::lambda(s::value(body.slots[*parameter].ty.clone()), t)
        }
        _ => return Err("node has no total-value correspondence".into()),
    })
}
fn free(t: &Term, out: &mut BTreeSet<String>, b: &mut Budget, d: usize) -> LangResult<()> {
    b.step(d)?;
    if let Node::Free(n) = &t.node {
        out.insert(n.clone());
    }
    for x in s::children(t) {
        free(x, out, b, d + 1)?;
    }
    Ok(())
}
pub(crate) fn copy_facts(
    facts: &[crate::laws::Equation],
    b: &mut Budget,
) -> LangResult<Vec<crate::laws::Equation>> {
    facts
        .iter()
        .map(|f| {
            Ok(crate::laws::Equation {
                from: s::shift_into(&f.from, 0, b)?,
                to: s::shift_into(&f.to, 0, b)?,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn checked(source: &str) -> CheckedModule {
        CheckedModule::from_source(crate::syntax::parse(source).unwrap()).unwrap()
    }
    #[test]
    fn copying_branch_facts_consumes_work_per_copied_node() {
        let fact = crate::laws::Equation {
            from: s::op(
                s::value(Type::U32),
                "binary:+",
                vec![
                    s::free(s::value(Type::U32), "x"),
                    s::term(s::value(Type::U32), Node::Word(0)),
                ],
            ),
            to: s::free(s::value(Type::U32), "x"),
        };
        let mut exhausted = Budget { remaining: 3 };
        assert!(copy_facts(&[fact.clone()], &mut exhausted).is_err());
        let mut exact = Budget { remaining: 4 };
        assert_eq!(copy_facts(&[fact.clone()], &mut exact).unwrap(), vec![fact]);
        assert_eq!(exact.remaining, 0);
    }
    #[test]
    fn exhausted_projection_never_returns_partial_authority() {
        let m = checked("module m; query f(x:u32)->u32{return x+0;}");
        assert!(Regions::derive(&m, &mut Budget { remaining: 0 }).is_err());
        assert!(!Regions::derive(&m, &mut Budget::new())
            .unwrap()
            .entries
            .is_empty());
    }
    #[test]
    fn unsupported_total_value_projection_keeps_the_source_available() {
        let m = checked("module m; query f(x:Int)->Int{return x+1;}");
        let before = m.bytes().unwrap();
        let subject = crate::optimisation::subject(&m).unwrap();
        assert!(!subject.functions.values().any(|t| matches!(&t.node,
            Node::Op(op, _) if op == "binary:+")));
        assert_eq!(m.bytes().unwrap(), before);
    }
}
fn validate_used(t: &Term, env: &Env, p: &Program, b: &mut Budget) -> LangResult<()> {
    let mut names = BTreeSet::new();
    free(t, &mut names, b, 0)?;
    let local = names
        .into_iter()
        .map(|n| Ok((n.clone(), env.get(&n).ok_or("unknown action slot")?.clone())))
        .collect::<LangResult<Env>>()?;
    s::validate(t, &local, p, b)
}
impl Regions {
    pub fn derive(module: &CheckedModule, b: &mut Budget) -> LangResult<Self> {
        let actions = CheckedActions::elaborate(module)?;
        let mut entries = BTreeMap::new();
        for (action, count) in [
            (true, module.program().actions.len()),
            (false, module.program().keeps.len()),
        ] {
            for owner in 0..count {
                let body = if action {
                    actions.action(owner)
                } else {
                    actions.keep(owner)
                }
                .unwrap();
                let env: Env = body
                    .slots
                    .iter()
                    .enumerate()
                    .map(|(i, s)| (format!("__ink_slot_{i}"), s::value(s.ty.clone())))
                    .collect();
                fn collect(
                    body: &Body,
                    p: &Program,
                    id: NodeId,
                    env: &Env,
                    out: &mut Vec<(NodeId, Term, Vec<crate::laws::Equation>)>,
                    facts: &[crate::laws::Equation],
                    b: &mut Budget,
                    d: usize,
                ) -> LangResult<()> {
                    b.step(d)?;
                    if matches!(body.nodes[id].ty, ExprType::Value(_)) && total(body, id, b, 0)? {
                        if let Ok(t) = translate(body, p, id, b, 0) {
                            if validate_used(&t, env, p, b).is_ok() {
                                out.push((id, t, copy_facts(facts, b)?));
                                return Ok(());
                            }
                        }
                    }
                    for child in children(&body.nodes[id].kind) {
                        collect(body, p, child, env, out, facts, b, d + 1)?;
                    }
                    Ok(())
                }
                fn block(
                    body: &Body,
                    p: &Program,
                    xs: &[Instruction],
                    env: &Env,
                    facts: &[crate::laws::Equation],
                    out: &mut Vec<(NodeId, Term, Vec<crate::laws::Equation>)>,
                    b: &mut Budget,
                    d: usize,
                ) -> LangResult<()> {
                    b.step(d)?;
                    for step in xs {
                        match step {
                            Instruction::Let { value, .. }
                            | Instruction::Return(value)
                            | Instruction::Eval(value)
                            | Instruction::Emit { value, .. } => {
                                collect(body, p, *value, env, out, facts, b, 0)?
                            }
                            Instruction::If {
                                condition,
                                on_true,
                                on_false,
                            } => {
                                collect(body, p, *condition, env, out, facts, b, 0)?;
                                let guard = if total(body, *condition, b, 0)? {
                                    translate(body, p, *condition, b, 0)
                                        .ok()
                                        .filter(|t| validate_used(t, env, p, b).is_ok())
                                } else {
                                    None
                                };
                                for (branch, flag) in [(on_true, true), (on_false, false)] {
                                    let mut scoped = copy_facts(facts, b)?;
                                    if let Some(t) = &guard {
                                        scoped.push(crate::laws::Equation {
                                            from: s::shift_into(t, 0, b)?,
                                            to: s::term(s::value(Type::Bool), Node::Bool(flag)),
                                        });
                                    }
                                    block(body, p, branch, env, &scoped, out, b, d + 1)?;
                                }
                            }
                        }
                    }
                    Ok(())
                }
                let mut regions = vec![];
                block(
                    body,
                    module.program(),
                    &body.instructions,
                    &env,
                    &[],
                    &mut regions,
                    b,
                    0,
                )?;
                if let Some(root) = body.value {
                    collect(body, module.program(), root, &env, &mut regions, &[], b, 0)?;
                }
                for (node, term, facts) in regions {
                    let mut names = BTreeSet::new();
                    free(&term, &mut names, b, 0)?;
                    let mut params = vec![];
                    let mut originals = BTreeMap::new();
                    for n in names {
                        b.step(0)?;
                        let i = n
                            .strip_prefix("__ink_slot_")
                            .and_then(|n| n.parse::<usize>().ok())
                            .ok_or("unknown free action slot")?;
                        let slot = body.slots.get(i).ok_or("unknown free action slot")?;
                        params.push((n.clone(), slot.ty.clone()));
                        originals.insert(n, slot.name.clone());
                    }
                    let mut proof_names = BTreeSet::new();
                    for fact in &facts {
                        free(&fact.from, &mut proof_names, b, 0)?;
                        free(&fact.to, &mut proof_names, b, 0)?;
                    }
                    let mut proof_params = params.clone();
                    for n in proof_names {
                        if !originals.contains_key(&n) {
                            b.step(0)?;
                            let i = n
                                .strip_prefix("__ink_slot_")
                                .and_then(|n| n.parse::<usize>().ok())
                                .ok_or("unknown guard slot")?;
                            proof_params.push((
                                n,
                                body.slots.get(i).ok_or("unknown guard slot")?.ty.clone(),
                            ));
                        }
                    }
                    if originals.values().collect::<BTreeSet<_>>().len() != originals.len() {
                        return Err("ambiguous source scope in pure region".into());
                    }
                    let name = if action {
                        &module.program().actions[owner].name
                    } else {
                        &module.program().keeps[owner].name
                    };
                    let key = format!("@{}/{name}/{node}", if action { "action" } else { "keep" });
                    if entries
                        .insert(
                            key,
                            Region {
                                term,
                                params,
                                proof_params,
                                facts,
                                action,
                                owner,
                                node,
                                names: originals,
                            },
                        )
                        .is_some()
                    {
                        return Err("duplicate action region".into());
                    }
                }
            }
        }
        Ok(Self { actions, entries })
    }
    /// Rename free locals before reification, so fresh callback binders avoid
    /// actual source names. Re-elaboration must return to the same slot terms.
    pub fn reify(
        &self,
        key: &str,
        t: &Term,
        p: &Program,
        b: &mut Budget,
    ) -> LangResult<(Expr, Term)> {
        let r = self
            .entries
            .get(key)
            .ok_or("unknown source action region")?;
        let replacements = r
            .params
            .iter()
            .map(|(n, ty)| (n.clone(), s::free(s::value(ty.clone()), &r.names[n])))
            .collect();
        let source_term = s::substitute(t, &replacements, b)?;
        let e = s::reify(&source_term, p)?;
        let source_env = r
            .params
            .iter()
            .map(|(n, ty)| (r.names[n].clone(), ty.clone()))
            .collect();
        let Sort::Value(result) = &t.sort else {
            return Err("action region must return a value".into());
        };
        let actual = s::elaborate(&e, &source_env, p, result)?;
        let reverse = r
            .params
            .iter()
            .map(|(n, ty)| (r.names[n].clone(), s::free(s::value(ty.clone()), n)))
            .collect();
        Ok((e, s::substitute(&actual, &reverse, b)?))
    }
    pub fn apply(&self, p: &mut Program, replacements: BTreeMap<String, Expr>) -> LangResult<()> {
        let mut grouped: BTreeMap<(bool, usize), BTreeMap<NodeId, Expr>> = BTreeMap::new();
        for (key, e) in replacements {
            let r = self
                .entries
                .get(&key)
                .ok_or("unknown source action region")?;
            grouped
                .entry((r.action, r.owner))
                .or_default()
                .insert(r.node, e);
        }
        for ((action, owner), entries) in grouped {
            let body = if action {
                self.actions.action(owner)
            } else {
                self.actions.keep(owner)
            }
            .unwrap();
            if action {
                p.actions[owner].body = body.rebuild(
                    self.actions.module().program(),
                    &body.instructions,
                    false,
                    &entries,
                )?;
            } else {
                p.keeps[owner].value = body.expression(
                    self.actions.module().program(),
                    body.value.unwrap(),
                    &entries,
                )?;
            }
        }
        Ok(())
    }
}
