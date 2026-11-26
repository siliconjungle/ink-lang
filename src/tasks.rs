//! External effects and tasks.
//!
//! `effect NAME(params) -> T;` declares a typed request to the outside world
//! (a network call, a model, a file). Ink never executes an effect: a host
//! handler does, and its reply re-enters Ink only through the declared type.
//! `task NAME(params) -> T { .. }` orchestrates effects, queries, changes and
//! pure values as a list of `let` steps ending in `return`.
//!
//! Lowering is source desugaring into existing constructs only. Every
//! expression in a task becomes the body of a generated readonly query that
//! takes exactly the task names it uses, so the ordinary checker types and
//! checks it. The task itself becomes a manifest in `contracts.tasks`: steps,
//! the generated queries that compute their arguments, and the steps each one
//! waits for. Hosts run the manifest; no executable-core primitive, backend or
//! semantics version changes. See docs/effect-tasks.md.
//!
//! Ordering is fixed here, not by hosts. Queries, changes and `ordered`
//! effects wait for every earlier step, so state and ordered effects are
//! observed in source order. Other effects and values wait only for the steps
//! whose names they use, so independent requests may run concurrently. A task
//! result is the one sequential execution in source order would produce from
//! the same effect replies.
use crate::{analysis::free_variables, core::*, surface::SurfaceProgram, LangResult};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const PREFIX: &str = "__task_";
const MAX_TASKS: usize = 64;
const MAX_EFFECTS: usize = 128;
const MAX_STEPS: usize = 128;

/// An effect declaration as written.
#[derive(Clone, Debug)]
pub struct EffectSpec {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub ordered: bool,
}

/// One task statement as written: `[let NAME[: T] =] EXPR [ensures P else F];`
#[derive(Clone, Debug)]
pub struct StepSpec {
    pub bind: Option<String>,
    pub ty: Option<Type>,
    pub expr: Expr,
    pub guard: Option<(Expr, Expr)>,
}

#[derive(Clone, Debug)]
pub struct TaskSpec {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub steps: Vec<StepSpec>,
    pub ret: Expr,
}

/// Lowered effect metadata. `declarations` is the source text of the named
/// types the effect's signature reaches, for hosts that describe the expected
/// reply (for example to a language model). It is not proof evidence.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Effect {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub ordered: bool,
    pub signature: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub declarations: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Effect,
    Query,
    Change,
    Value,
}

/// One lowered step. Every generated query named here takes the values of
/// `uses`, in order (and `accept` additionally the step's value).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Step {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bind: Option<String>,
    pub kind: Kind,
    /// Effect or action called, or the generated value query.
    pub callee: String,
    /// Generated queries computing the callee's arguments.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub args: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub uses: Vec<String>,
    /// `?`: an `Err` reply ends the task with that error.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub propagate: bool,
    /// Effects only: query that type-checks the reply and evaluates `ensures`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accept: Option<String>,
    /// Effects only: the authored `else` value.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback: Option<String>,
    /// Earlier steps that must complete first.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub after: Vec<u32>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Task {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub steps: Vec<Step>,
    /// Generated query computing the result, and the names it uses.
    pub ret: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub ret_uses: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Tasks {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub effects: Vec<Effect>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tasks: Vec<Task>,
}
impl Tasks {
    pub fn is_empty(&self) -> bool {
        self.effects.is_empty() && self.tasks.is_empty()
    }
}

pub fn type_source(t: &Type) -> String {
    match t {
        Type::U64 => "u64".into(),
        Type::U32 => "u32".into(),
        Type::I32 => "i32".into(),
        Type::F32 => "f32".into(),
        Type::F64 => "f64".into(),
        Type::Int => "Int".into(),
        Type::Unit => "Unit".into(),
        Type::String => "String".into(),
        Type::Bool => "Bool".into(),
        Type::Vector(x, n) => format!("Vector<{}, {n}>", type_source(x)),
        Type::List(x) => format!("List<{}>", type_source(x)),
        Type::Buffer(x) => format!("Buffer<{}>", type_source(x)),
        Type::Map(k, v) => format!("Map<{}, {}>", type_source(k), type_source(v)),
        Type::Table(k, v) => format!("Table<{}, {}>", type_source(k), type_source(v)),
        Type::Option(x) => format!("Option<{}>", type_source(x)),
        Type::Result(a, b) => format!("Result<{}, {}>", type_source(a), type_source(b)),
        Type::Named(n) => n.clone(),
        Type::Unknown => "_".into(),
    }
}

fn named(t: &Type, out: &mut Vec<String>) {
    match t {
        Type::Named(n) => out.push(n.clone()),
        Type::Vector(x, _) | Type::List(x) | Type::Buffer(x) | Type::Option(x) => named(x, out),
        Type::Map(a, b) | Type::Table(a, b) | Type::Result(a, b) => {
            named(a, out);
            named(b, out);
        }
        _ => {}
    }
}

/// Source text of the records and enums reachable from `types`.
fn declarations(p: &Program, types: &[&Type]) -> String {
    let mut pending = vec![];
    types.iter().for_each(|t| named(t, &mut pending));
    let (mut seen, mut out) = (BTreeSet::new(), vec![]);
    while let Some(n) = pending.pop() {
        if !seen.insert(n.clone()) || out.len() >= 64 {
            continue;
        }
        if let Some(fields) = p.records.get(&n) {
            fields.iter().for_each(|(_, t)| named(t, &mut pending));
            let body: Vec<String> = fields.iter().map(|(f, t)| format!("{f}: {}, ", type_source(t))).collect();
            out.push(format!("record {n} {{ {}}}", body.concat()));
        } else if let Some(variants) = p.enums.get(&n) {
            out.push(format!("enum {n} {{ {}}}", variants.iter().map(|v| format!("{v}, ")).collect::<String>()));
        }
    }
    out.sort();
    out.join("\n")
}

fn query(name: String, params: Vec<(String, Type)>, result: Type, body: Expr) -> Action {
    Action {
        name,
        kind: ActionKind::Query,
        params,
        result,
        reads: vec![],
        writes: vec![],
        emits: vec![],
        body: vec![Statement::Return(body)],
    }
}

fn taken(p: &Program, name: &str) -> bool {
    p.functions.iter().any(|f| f.name == name)
        || p.actions.iter().any(|a| a.name == name)
        || p.states.iter().any(|s| s.name == name)
        || p.keeps.iter().any(|s| s.name == name)
        || p.records.contains_key(name)
        || p.enums.contains_key(name)
}

pub fn lower(s: &mut SurfaceProgram, effects: Vec<EffectSpec>, tasks: Vec<TaskSpec>) -> LangResult<()> {
    if effects.len() > MAX_EFFECTS || tasks.len() > MAX_TASKS {
        return Err(format!("effect limit is {MAX_EFFECTS} and task limit is {MAX_TASKS}"));
    }
    let p = &mut s.program;
    if p.functions.iter().map(|f| &f.name).chain(p.actions.iter().map(|a| &a.name)).any(|n| n.starts_with(PREFIX)) {
        return Err(format!("names starting with {PREFIX} are reserved for tasks"));
    }
    let mut manifest = Tasks::default();
    let mut seen = BTreeSet::new();
    for e in &effects {
        if !seen.insert(e.name.clone()) || taken(p, &e.name) {
            return Err(format!("effect {} is declared twice or collides with another declaration", e.name));
        }
        let mut params = BTreeSet::new();
        if e.params.iter().any(|(n, _)| !params.insert(n)) {
            return Err(format!("effect {} has duplicate parameters", e.name));
        }
        let types: Vec<&Type> = e.params.iter().map(|(_, t)| t).chain([&e.result]).collect();
        manifest.effects.push(Effect {
            name: e.name.clone(),
            params: e.params.clone(),
            result: e.result.clone(),
            ordered: e.ordered,
            signature: format!(
                "{}({}) -> {}",
                e.name,
                e.params.iter().map(|(n, t)| format!("{n}: {}", type_source(t))).collect::<Vec<_>>().join(", "),
                type_source(&e.result)
            ),
            declarations: declarations(p, &types),
        });
    }
    let mut generated = vec![];
    for t in tasks {
        if !seen.insert(t.name.clone()) || taken(p, &t.name) {
            return Err(format!("task {} is declared twice or collides with another declaration", t.name));
        }
        if t.steps.len() > MAX_STEPS {
            return Err(format!("task {}: step limit is {MAX_STEPS}", t.name));
        }
        let mut context: Vec<(String, Type)> = t.params.clone();
        let mut binder: BTreeMap<String, Option<u32>> = BTreeMap::new();
        for (n, _) in &t.params {
            if binder.insert(n.clone(), None).is_some() {
                return Err(format!("task {}: duplicate parameter {n}", t.name));
            }
        }
        let uses_of = |exprs: &[&Expr], context: &[(String, Type)], exclude: Option<&str>| -> Vec<(String, Type)> {
            let mut free = BTreeSet::new();
            exprs.iter().for_each(|e| free.extend(free_variables(e)));
            context.iter().filter(|(n, _)| free.contains(n) && Some(n.as_str()) != exclude).cloned().collect()
        };
        let mut steps = vec![];
        for (i, step) in t.steps.iter().enumerate() {
            let at = format!("task {} step {}", t.name, i + 1);
            let (inner, propagate) = match &step.expr {
                Expr::Try(x) => (x.as_ref(), true),
                x => (x, false),
            };
            let stem = format!("{PREFIX}{}_{i}", t.name);
            let call = match inner {
                Expr::Call(c, args) => Some((c, args)),
                _ => None,
            };
            let effect = call.and_then(|(c, _)| effects.iter().find(|e| &e.name == c));
            let action = call.and_then(|(c, _)| p.actions.iter().find(|a| &a.name == c));
            let (kind, callee, raw, params, args) = if let (Some(e), Some((_, args))) = (effect, call) {
                (Kind::Effect, e.name.clone(), e.result.clone(), e.params.clone(), args.clone())
            } else if let (Some(a), Some((_, args))) = (action, call) {
                let kind = if a.kind == ActionKind::Query { Kind::Query } else { Kind::Change };
                (kind, a.name.clone(), a.result.clone(), a.params.clone(), args.clone())
            } else {
                if propagate {
                    return Err(format!("{at}: `?` applies to effect and action calls"));
                }
                let ty = step.ty.clone().ok_or_else(|| format!("{at}: a value step needs a type annotation, `let NAME: TYPE = ..`"))?;
                (Kind::Value, format!("{stem}_value"), ty, vec![], vec![step.expr.clone()])
            };
            if kind != Kind::Value && args.len() != params.len() {
                return Err(format!("{at}: {callee} takes {} arguments", params.len()));
            }
            if step.guard.is_some() && (kind != Kind::Effect || propagate || step.bind.is_none()) {
                return Err(format!("{at}: `ensures .. else ..` guards a bound effect result without `?`"));
            }
            let bound = if propagate {
                let Type::Result(ok, err) = &raw else {
                    return Err(format!("{at}: `?` needs a Result, not {}", type_source(&raw)));
                };
                match &t.result {
                    Type::Result(_, e) if e == err => {}
                    _ => {
                        return Err(format!(
                            "{at}: `?` needs the task to return Result<_, {}>",
                            type_source(err)
                        ))
                    }
                }
                ok.as_ref().clone()
            } else {
                raw.clone()
            };
            if let Some(declared) = &step.ty {
                if declared != &bound {
                    return Err(format!("{at}: annotated {} but the step yields {}", type_source(declared), type_source(&bound)));
                }
            }
            let mut exprs: Vec<&Expr> = args.iter().collect();
            if let Some((pred, fallback)) = &step.guard {
                exprs.push(pred);
                exprs.push(fallback);
            }
            let uses = uses_of(&exprs, &context, step.bind.as_deref());
            let mut after: BTreeSet<u32> = uses.iter().filter_map(|(n, _)| binder[n]).collect();
            let barrier = matches!(kind, Kind::Query | Kind::Change) || effect.is_some_and(|e| e.ordered);
            if barrier {
                after.extend(0..i as u32);
            }
            let mut lowered = Step {
                bind: step.bind.clone(),
                kind: kind.clone(),
                callee: callee.clone(),
                args: vec![],
                uses: uses.iter().map(|(n, _)| n.clone()).collect(),
                propagate,
                accept: None,
                fallback: None,
                after: after.into_iter().collect(),
            };
            if kind == Kind::Value {
                generated.push(query(callee.clone(), uses.clone(), raw.clone(), step.expr.clone()));
            } else {
                for (j, (arg, (_, ty))) in args.iter().zip(&params).enumerate() {
                    let name = format!("{stem}_a{j}");
                    generated.push(query(name.clone(), uses.clone(), ty.clone(), arg.clone()));
                    lowered.args.push(name);
                }
            }
            if kind == Kind::Effect {
                let name = format!("{stem}_accept");
                let value = step.bind.clone().unwrap_or_else(|| "__task_value".into());
                let mut params = uses.clone();
                params.push((value, raw.clone()));
                let body = step.guard.as_ref().map(|(pred, _)| pred.clone()).unwrap_or(Expr::Bool(true));
                generated.push(query(name.clone(), params, Type::Bool, body));
                lowered.accept = Some(name);
                if let Some((_, fallback)) = &step.guard {
                    let name = format!("{stem}_else");
                    generated.push(query(name.clone(), uses.clone(), raw.clone(), fallback.clone()));
                    lowered.fallback = Some(name);
                }
            }
            if let Some(b) = &step.bind {
                if binder.insert(b.clone(), Some(i as u32)).is_some() {
                    return Err(format!("{at}: {b} is already bound in this task"));
                }
                context.push((b.clone(), bound));
            }
            steps.push(lowered);
        }
        let ret_uses = uses_of(&[&t.ret], &context, None);
        let ret = format!("{PREFIX}{}_return", t.name);
        generated.push(query(ret.clone(), ret_uses.clone(), t.result.clone(), t.ret.clone()));
        manifest.tasks.push(Task {
            name: t.name.clone(),
            params: t.params.clone(),
            result: t.result.clone(),
            steps,
            ret,
            ret_uses: ret_uses.into_iter().map(|(n, _)| n).collect(),
        });
    }
    p.actions.extend(generated);
    p.contracts.tasks = manifest;
    Ok(())
}

fn find<'a>(p: &'a Program, name: &str) -> LangResult<&'a Action> {
    p.actions
        .iter()
        .find(|a| a.name == name && a.kind == ActionKind::Query && a.writes.is_empty() && a.emits.is_empty())
        .ok_or_else(|| format!("task manifest names a missing generated query {name}"))
}

/// Check the manifest against the program it describes. The generated
/// queries carry the real typing; this keeps hosts' metadata consistent.
pub fn check(p: &Program) -> LangResult<()> {
    let m = &p.contracts.tasks;
    if m.effects.len() > MAX_EFFECTS || m.tasks.len() > MAX_TASKS {
        return Err("task manifest limit".into());
    }
    let mut names = BTreeSet::new();
    for e in &m.effects {
        if !names.insert(&e.name) || taken(p, &e.name) {
            return Err(format!("effect {} collides with another declaration", e.name));
        }
    }
    for t in &m.tasks {
        if !names.insert(&t.name) || t.steps.len() > MAX_STEPS {
            return Err(format!("task {} is duplicated or too long", t.name));
        }
        let mut context: BTreeMap<&str, (Type, Option<u32>)> = t.params.iter().map(|(n, ty)| (n.as_str(), (ty.clone(), None))).collect();
        if context.len() != t.params.len() {
            return Err(format!("task {}: duplicate parameter", t.name));
        }
        let typed = |uses: &[String], context: &BTreeMap<&str, (Type, Option<u32>)>| -> LangResult<Vec<(String, Type)>> {
            uses.iter()
                .map(|n| context.get(n.as_str()).map(|(t, _)| (n.clone(), t.clone())).ok_or_else(|| format!("task uses unbound {n}")))
                .collect()
        };
        for (i, s) in t.steps.iter().enumerate() {
            let at = format!("task {} step {}", t.name, i + 1);
            let uses = typed(&s.uses, &context)?;
            let deps: BTreeSet<u32> = s.uses.iter().filter_map(|n| context[n.as_str()].1).collect();
            if s.after.windows(2).any(|w| w[0] >= w[1]) || s.after.iter().any(|&j| j as usize >= i) || !deps.iter().all(|d| s.after.contains(d)) {
                return Err(format!("{at}: invalid dependencies"));
            }
            let expect = |name: &str, params: &[(String, Type)], result: &Type| -> LangResult<()> {
                let q = find(p, name)?;
                if q.params != params || &q.result != result {
                    return Err(format!("{at}: generated query {name} has the wrong signature"));
                }
                Ok(())
            };
            let (raw, barrier) = match s.kind {
                Kind::Value => {
                    if !s.args.is_empty() || s.accept.is_some() || s.fallback.is_some() || s.propagate {
                        return Err(format!("{at}: malformed value step"));
                    }
                    (find(p, &s.callee)?.result.clone(), false)
                }
                Kind::Effect => {
                    let e = m.effects.iter().find(|e| e.name == s.callee).ok_or_else(|| format!("{at}: unknown effect {}", s.callee))?;
                    if s.args.len() != e.params.len() {
                        return Err(format!("{at}: wrong effect arity"));
                    }
                    for (q, (_, ty)) in s.args.iter().zip(&e.params) {
                        expect(q, &uses, ty)?;
                    }
                    let accept = s.accept.as_ref().ok_or_else(|| format!("{at}: effect step needs accept"))?;
                    let mut params = uses.clone();
                    params.push((s.bind.clone().unwrap_or_else(|| "__task_value".into()), e.result.clone()));
                    expect(accept, &params, &Type::Bool)?;
                    if let Some(f) = &s.fallback {
                        if s.propagate || s.bind.is_none() {
                            return Err(format!("{at}: malformed guarded effect"));
                        }
                        expect(f, &uses, &e.result)?;
                    }
                    (e.result.clone(), e.ordered)
                }
                Kind::Query | Kind::Change => {
                    let a = p.actions.iter().find(|a| a.name == s.callee).ok_or_else(|| format!("{at}: unknown action {}", s.callee))?;
                    if (a.kind == ActionKind::Query) != (s.kind == Kind::Query) || s.args.len() != a.params.len() || s.accept.is_some() || s.fallback.is_some() {
                        return Err(format!("{at}: malformed action step"));
                    }
                    for (q, (_, ty)) in s.args.iter().zip(&a.params) {
                        expect(q, &uses, ty)?;
                    }
                    (a.result.clone(), true)
                }
            };
            if s.kind == Kind::Value {
                expect(&s.callee, &uses, &raw)?;
            }
            if barrier && s.after.len() != i {
                return Err(format!("{at}: queries, changes and ordered effects wait for every earlier step"));
            }
            let bound = if s.propagate {
                match (&raw, &t.result) {
                    (Type::Result(ok, e), Type::Result(_, te)) if e == te => ok.as_ref().clone(),
                    _ => return Err(format!("{at}: `?` needs matching Result error types")),
                }
            } else {
                raw
            };
            if let Some(b) = &s.bind {
                if context.insert(b.as_str(), (bound, Some(i as u32))).is_some() {
                    return Err(format!("{at}: {b} rebound"));
                }
            }
        }
        let uses = typed(&t.ret_uses, &context)?;
        let q = find(p, &t.ret)?;
        if q.params != uses || q.result != t.result {
            return Err(format!("task {}: result query has the wrong signature", t.name));
        }
    }
    Ok(())
}
