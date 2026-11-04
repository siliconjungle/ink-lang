//! Learnable holes: `learn NAME(args): FAMILY [else FALLBACK]` in expression
//! position. A hole is an unknown pure function chosen by training from a
//! declared finite family. Lowering is a source-level desugaring into existing
//! constructs only: one trainable value state, ordinary pure helper functions,
//! a query that reads the parameters and a `learn change` that writes them.
//! No executable-core primitive, backend or semantics version changes.
//!
//! Admission is structural and local (see docs/learnable-holes.md):
//! - error path: the hole is the `None`/`Err` arm of `X.unwrap_or(hole)` or of
//!   `X.fold(fn(v)=>.., fn(_)=>hole)`. Every input on which `X` succeeds takes
//!   the authored path, so learning can only change behaviour that was a failure.
//! - guarded: the hole has `else FALLBACK` and its function declares
//!   `ensures PREDICATE`. The function runs with learned output; if the
//!   predicate fails, it runs again with every guarded hole replaced by its
//!   fallback and returns that authored result.
//! Holes in any other position are rejected. These rules grant no equality,
//! approximation, rewrite or profitability authority.
use crate::{core::*, surface::SurfaceProgram, LangResult};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const STATE: &str = "__learned";
pub const RECORD: &str = "__Learned";
pub const GET: &str = "__learn_get";
pub const SET: &str = "__learn_set";
pub const PARAM: &str = "__holes";
pub const OBJECTIVE_PREFIX: &str = "__objective_";
const HOLE_PREFIX: &str = "__hole_";
const MAX_HOLES: usize = 64;
const MAX_CHOICE_ENTRIES: u64 = 4096;
const MAX_MLP_PARAMETERS: u64 = 16_384;

/// The declared family a hole's implementation is chosen from.
#[derive(Clone, Debug, PartialEq)]
pub enum Family {
    /// A complete lookup table from finite arguments to a finite result.
    Choice(Type),
    /// A dense network: inputs, hidden widths (ReLU), outputs (linear).
    Mlp(Vec<u32>),
}

/// A hole as written in source, before lowering.
#[derive(Clone, Debug)]
pub struct HoleSpec {
    pub name: String,
    pub args: Vec<(Expr, Option<Type>)>,
    pub family: Family,
    pub fallback: Option<Expr>,
}

/// Lowered hole metadata carried in `contracts.learning.holes`. It describes
/// generated parameter layout for training tools; it is not proof evidence.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Hole {
    pub name: String,
    /// `choice` or `mlp`.
    pub family: String,
    /// The `__Learned` field holding this hole's parameters.
    pub field: String,
    /// Number of parameters (table entries or weights).
    pub parameters: u32,
    /// For `choice`: number of result values. Zero for `mlp`.
    pub choices: u32,
    /// For `mlp`: layer widths, inputs first. Empty for `choice`.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub shape: Vec<u32>,
    /// `error-path` or `guarded`.
    pub admission: String,
    /// The declaration that contains the hole.
    pub declaration: String,
}

pub fn hole_function(name: &str) -> String {
    format!("{HOLE_PREFIX}{name}")
}

fn type_source(t: &Type) -> LangResult<String> {
    Ok(match t {
        Type::Bool => "Bool".into(),
        Type::U32 => "u32".into(),
        Type::F32 => "f32".into(),
        Type::Named(n) => n.clone(),
        Type::List(x) => format!("List<{}>", type_source(x)?),
        _ => return Err(format!("learn hole: unsupported type {t:?}")),
    })
}

/// Finite values of a type usable as a `choice` argument or result.
fn finite_values(t: &Type, enums: &BTreeMap<String, Vec<String>>) -> LangResult<Vec<String>> {
    match t {
        Type::Bool => Ok(vec!["false".into(), "true".into()]),
        Type::Named(n) => {
            let variants = enums.get(n).ok_or_else(|| {
                format!("learn hole: choice types must be Bool or an enum without payloads, not {n}")
            })?;
            if variants.is_empty() {
                return Err(format!("learn hole: enum {n} has no variants"));
            }
            Ok(variants.iter().map(|v| format!("{n}.{v}")).collect())
        }
        _ => Err(format!("learn hole: choice types must be Bool or an enum without payloads, not {t:?}")),
    }
}

fn float_source(x: f32) -> String {
    let s = format!("{x:?}");
    if s.contains('.') || s.contains('e') { s } else { format!("{s}.0") }
}

/// Deterministic initial weights: small hidden-layer values from a seeded
/// generator, and a zero output layer so an untrained network returns 0.
fn initial_weights(name: &str, shape: &[u32]) -> Vec<f32> {
    let mut seed: u32 = name.bytes().fold(2166136261u32, |h, b| (h ^ b as u32).wrapping_mul(16777619));
    let mut out = Vec::new();
    for (layer, pair) in shape.windows(2).enumerate() {
        let (inputs, outputs) = (pair[0], pair[1]);
        let last = layer + 2 == shape.len();
        let scale = 1.0 / (inputs.max(1) as f32).sqrt();
        for _ in 0..outputs {
            for _ in 0..inputs {
                seed = seed.wrapping_mul(1664525).wrapping_add(1013904223);
                let unit = (seed >> 8) as f32 / (1u32 << 24) as f32 - 0.5;
                out.push(if last { 0.0 } else { unit * scale });
            }
            out.push(0.0);
        }
    }
    out
}

fn mlp_parameters(shape: &[u32]) -> u64 {
    shape.windows(2).map(|p| (p[0] as u64 + 1) * p[1] as u64).sum()
}

fn walk(e: &Expr, f: &mut impl FnMut(&Expr)) {
    f(e);
    match e {
        Expr::Neg(x) | Expr::Lambda(_, x) | Expr::Field(x, _) | Expr::Try(x) => walk(x, f),
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
            walk(a, f);
            walk(b, f);
        }
        Expr::Call(_, xs) => xs.iter().for_each(|x| walk(x, f)),
        Expr::Method(r, _, xs) => {
            walk(r, f);
            xs.iter().for_each(|x| walk(x, f));
        }
        Expr::Record(_, fs) => fs.iter().for_each(|(_, x)| walk(x, f)),
        _ => {}
    }
}

fn walk_mut(e: &mut Expr, f: &mut impl FnMut(&mut Expr)) {
    match e {
        Expr::Neg(x) | Expr::Lambda(_, x) | Expr::Field(x, _) | Expr::Try(x) => walk_mut(x, f),
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
            walk_mut(a, f);
            walk_mut(b, f);
        }
        Expr::Call(_, xs) => xs.iter_mut().for_each(|x| walk_mut(x, f)),
        Expr::Method(r, _, xs) => {
            walk_mut(r, f);
            xs.iter_mut().for_each(|x| walk_mut(x, f));
        }
        Expr::Record(_, fs) => fs.iter_mut().for_each(|(_, x)| walk_mut(x, f)),
        _ => {}
    }
    f(e);
}

fn statement_exprs(s: &Statement, f: &mut impl FnMut(&Expr)) {
    match s {
        Statement::Let(_, _, e) | Statement::Return(e) | Statement::Emit(_, e) | Statement::Expr(e) => walk(e, f),
        Statement::If(c, a, b) => {
            walk(c, f);
            a.iter().chain(b).for_each(|s| statement_exprs(s, f));
        }
    }
}

fn statement_exprs_mut(s: &mut Statement, f: &mut impl FnMut(&mut Expr)) {
    match s {
        Statement::Let(_, _, e) | Statement::Return(e) | Statement::Emit(_, e) | Statement::Expr(e) => walk_mut(e, f),
        Statement::If(c, a, b) => {
            walk_mut(c, f);
            a.iter_mut().chain(b.iter_mut()).for_each(|s| statement_exprs_mut(s, f));
        }
    }
}

fn calls_any(e: &Expr, names: &BTreeSet<String>) -> bool {
    let mut found = false;
    walk(e, &mut |x| {
        if let Expr::Call(n, _) = x {
            found |= names.contains(n);
        }
    });
    found
}

fn uses_as_value(e: &Expr, names: &BTreeSet<String>) -> Option<String> {
    let mut found = None;
    walk(e, &mut |x| {
        if let Expr::Var(n) = x {
            if names.contains(n) && found.is_none() {
                found = Some(n.clone());
            }
        }
    });
    found
}

fn count_calls(e: &Expr, name: &str) -> usize {
    let mut n = 0;
    walk(e, &mut |x| {
        if matches!(x, Expr::Call(c, _) if c == name) {
            n += 1;
        }
    });
    n
}

/// Is the hole call on an error path inside `e`?
fn error_path(e: &Expr, call: &str) -> bool {
    let mut found = false;
    walk(e, &mut |x| {
        if let Expr::Method(_, m, args) = x {
            let hole = |a: &Expr| matches!(a, Expr::Call(c, _) if c == call);
            if m == "unwrap_or" && args.len() == 1 && hole(&args[0]) {
                found = true;
            }
            if m == "fold" && args.len() == 2 && matches!(&args[1], Expr::Lambda(_, body) if hole(body)) {
                found = true;
            }
        }
    });
    found
}

/// In pure code, `.unwrap_or(hole)` becomes `.fold(fn(v)=>v, fn(_)=>hole)`,
/// which evaluates the hole only on the failure arm.
fn pure_unwrap_or(e: &mut Expr, holes: &BTreeSet<String>) {
    walk_mut(e, &mut |x| {
        if let Expr::Method(r, m, args) = x {
            if m == "unwrap_or" && args.len() == 1 && matches!(&args[0], Expr::Call(c, _) if holes.contains(c)) {
                let hole = args.pop().unwrap();
                *x = Expr::Method(
                    r.clone(),
                    "fold".into(),
                    vec![
                        Expr::Lambda("__learn_value".into(), Box::new(Expr::Var("__learn_value".into()))),
                        Expr::Lambda("__learn_failure".into(), Box::new(hole)),
                    ],
                );
            }
        }
    });
}

fn let_types(e: &Expr, out: &mut BTreeMap<String, Type>) {
    walk(e, &mut |x| {
        if let Expr::Let(n, Some(t), _, _) = x {
            out.insert(n.clone(), (**t).clone());
        }
    });
}

enum Site {
    Function(usize),
    Action(usize),
}

pub fn lower(
    s: &mut SurfaceProgram,
    holes: Vec<HoleSpec>,
    guards: BTreeMap<String, Expr>,
    objectives: Vec<String>,
) -> LangResult<()> {
    if holes.len() > MAX_HOLES {
        return Err(format!("learn hole limit is {MAX_HOLES}"));
    }
    if holes.is_empty() {
        if !objectives.is_empty() {
            return Err("objective declarations need at least one learn hole".into());
        }
        if let Some(name) = guards.keys().next() {
            return Err(format!("{name}: `ensures` without parentheses guards learn holes; this function has none"));
        }
        return Ok(());
    }
    let generic: BTreeSet<String> = s.parameters.keys().cloned().collect();
    let p = &mut s.program;
    for reserved in [STATE, RECORD, GET, SET] {
        if p.functions.iter().any(|f| f.name == reserved)
            || p.actions.iter().any(|a| a.name == reserved)
            || p.states.iter().any(|d| d.name == reserved)
            || p.records.contains_key(reserved)
        {
            return Err(format!("{reserved} is reserved for learn holes"));
        }
    }
    let mut seen = BTreeSet::new();
    for h in &holes {
        if !seen.insert(h.name.clone()) {
            return Err(format!("duplicate learn hole {}", h.name));
        }
    }
    let hole_names: BTreeSet<String> = holes.iter().map(|h| hole_function(&h.name)).collect();

    // Locate each hole and classify its admission.
    let mut manifest = Vec::new();
    let mut fields = Vec::new();
    let mut initial = Vec::new();
    let mut generated = String::new();
    let mut guarded: BTreeMap<String, Vec<(String, Expr)>> = BTreeMap::new();
    for h in &holes {
        let call = hole_function(&h.name);
        let mut sites = vec![];
        for (i, f) in p.functions.iter().enumerate() {
            let n = count_calls(&f.body, &call);
            if n > 0 {
                sites.push((Site::Function(i), n));
            }
        }
        for (i, a) in p.actions.iter().enumerate() {
            let mut n = 0;
            a.body.iter().for_each(|st| statement_exprs(st, &mut |x| {
                if matches!(x, Expr::Call(c, _) if c == &call) {
                    n += 1;
                }
            }));
            if n > 0 {
                sites.push((Site::Action(i), n));
            }
        }
        if sites.len() != 1 || sites[0].1 != 1 {
            return Err(format!("learn hole {} must appear exactly once in a function or query", h.name));
        }
        let (declaration, params, on_error_path, generic) = match sites[0].0 {
            Site::Function(i) => {
                let f = &p.functions[i];
                (f.name.clone(), f.params.clone(), error_path(&f.body, &call), generic.contains(&f.name))
            }
            Site::Action(i) => {
                let a = &p.actions[i];
                let mut path = false;
                a.body.iter().for_each(|st| statement_exprs(st, &mut |x| {
                    path |= error_path(x, &call);
                }));
                (a.name.clone(), a.params.clone(), path, false)
            }
        };
        if generic {
            return Err(format!("learn hole {} cannot appear in generic function {declaration}", h.name));
        }
        let admission = if on_error_path {
            if h.fallback.is_some() {
                return Err(format!("learn hole {}: an error-path hole takes no `else` fallback", h.name));
            }
            "error-path"
        } else if let Some(fallback) = &h.fallback {
            if !matches!(sites[0].0, Site::Function(_)) || !guards.contains_key(&declaration) {
                return Err(format!(
                    "learn hole {}: an `else` fallback needs `ensures PREDICATE` on its enclosing function {declaration}",
                    h.name
                ));
            }
            guarded.entry(declaration.clone()).or_default().push((call.clone(), fallback.clone()));
            "guarded"
        } else {
            return Err(format!(
                "learn hole {} is not admitted: put it on an error path (`x.unwrap_or(learn ..)`) or give it `else FALLBACK` inside a function with `ensures PREDICATE`",
                h.name
            ));
        };

        // Resolve argument types from annotations, parameters or typed lets.
        let mut known: BTreeMap<String, Type> = params.into_iter().collect();
        match sites[0].0 {
            Site::Function(i) => let_types(&p.functions[i].body, &mut known),
            Site::Action(i) => p.actions[i].body.iter().for_each(|st| {
                if let Statement::Let(n, Some(t), _) = st {
                    known.insert(n.clone(), t.clone());
                }
                statement_exprs(st, &mut |x| {
                    if let Expr::Let(n, Some(t), _, _) = x {
                        known.insert(n.clone(), (**t).clone());
                    }
                });
            }),
        }
        let field = h.name.clone();
        match &h.family {
            Family::Choice(result) => {
                if h.args.is_empty() || h.args.len() > 8 {
                    return Err(format!("learn hole {}: choice holes take 1 to 8 arguments", h.name));
                }
                let mut arg_types = vec![];
                for (i, (e, t)) in h.args.iter().enumerate() {
                    let t = match (t, e) {
                        (Some(t), _) => t.clone(),
                        (None, Expr::Var(n)) => known.get(n).cloned().ok_or_else(|| {
                            format!("learn hole {}: annotate argument {} as `{n}: Type`", h.name, i + 1)
                        })?,
                        _ => return Err(format!("learn hole {}: annotate argument {} as `expression: Type`", h.name, i + 1)),
                    };
                    arg_types.push(t);
                }
                let mut entries: u64 = 1;
                let mut index = String::new();
                let mut stride: u64 = 1;
                for (i, t) in arg_types.iter().enumerate() {
                    let values = finite_values(t, &p.enums)?;
                    let ord = format!("__learn_ord_{}_{}", h.name, i);
                    let body = if t == &Type::Bool {
                        "choose(x, 1, 0)".to_string()
                    } else {
                        let mut body = format!("{}", values.len() - 1);
                        for (k, v) in values.iter().enumerate().rev().skip(1) {
                            body = format!("choose(x == {v}, {k}, {body})");
                        }
                        body
                    };
                    generated.push_str(&format!("fn {ord}(x: {}) -> u32 {{ return {body}; }}\n", type_source(t)?));
                    if !index.is_empty() {
                        index.push_str(" + ");
                    }
                    index.push_str(&format!("{stride} * {ord}(a{i})"));
                    stride = stride.saturating_mul(values.len() as u64);
                    entries = entries.saturating_mul(values.len() as u64);
                }
                if entries > MAX_CHOICE_ENTRIES {
                    return Err(format!("learn hole {}: {entries} table entries exceeds {MAX_CHOICE_ENTRIES}", h.name));
                }
                let values = finite_values(result, &p.enums)?;
                let body = if result == &Type::Bool {
                    "i == 1".to_string()
                } else {
                    let mut body = values.last().unwrap().clone();
                    for (k, v) in values.iter().enumerate().rev().skip(1) {
                        body = format!("choose(i == {k}, {v}, {body})");
                    }
                    body
                };
                let to = format!("__learn_value_{}", h.name);
                generated.push_str(&format!("fn {to}(i: u32) -> {} {{ return {body}; }}\n", type_source(result)?));
                let params: Vec<String> = arg_types
                    .iter()
                    .enumerate()
                    .map(|(i, t)| Ok(format!("a{i}: {}", type_source(t)?)))
                    .collect::<LangResult<_>>()?;
                generated.push_str(&format!(
                    "fn {call}({}, {PARAM}: {RECORD}) -> {} {{ return {to}({PARAM}.{field}.at_or({index}, 0)); }}\n",
                    params.join(", "),
                    type_source(result)?
                ));
                fields.push((field.clone(), "List<u32>".to_string(), format!("foldl(next.{field}, true, fn(v)=>fn(ok)=>ok && v < {})", values.len()), entries));
                initial.push((field.clone(), format!("[{}]", vec!["0"; entries as usize].join(", "))));
                manifest.push(Hole {
                    name: h.name.clone(),
                    family: "choice".into(),
                    field,
                    parameters: entries as u32,
                    choices: values.len() as u32,
                    shape: vec![],
                    admission: admission.into(),
                    declaration,
                });
            }
            Family::Mlp(shape) => {
                if shape.len() < 2 || shape.iter().any(|w| *w == 0 || *w > 1024) {
                    return Err(format!("learn hole {}: Mlp<inputs, hidden.., outputs> widths must be 1..1024", h.name));
                }
                if h.args.len() != 1 {
                    return Err(format!("learn hole {}: Mlp holes take one List<f32> argument", h.name));
                }
                if let Some(t) = &h.args[0].1 {
                    if t != &Type::List(Box::new(Type::F32)) {
                        return Err(format!("learn hole {}: Mlp argument must be List<f32>", h.name));
                    }
                }
                let count = mlp_parameters(shape);
                if count > MAX_MLP_PARAMETERS {
                    return Err(format!("learn hole {}: {count} weights exceeds {MAX_MLP_PARAMETERS}", h.name));
                }
                let mut at: u64 = 0;
                let layers = shape.len() - 1;
                let mut body = String::new();
                for (layer, pair) in shape.windows(2).enumerate() {
                    let (inputs, outputs) = (pair[0] as u64, pair[1] as u64);
                    let name = format!("__learn_layer_{}_{layer}", h.name);
                    let sum = format!(
                        "repeat({inputs}, w.at_or({at} + j * {} + {inputs}, 0.0), fn(i)=>fn(s)=>s + w.at_or({at} + j * {} + i, 0.0) * x.at_or(i, 0.0))",
                        inputs + 1,
                        inputs + 1
                    );
                    let value = if layer + 1 == layers { sum } else { format!("__learn_relu({sum})") };
                    generated.push_str(&format!(
                        "fn {name}(w: List<f32>, x: List<f32>) -> List<f32> {{ let empty: List<f32> = []; return repeat({outputs}, empty, fn(j)=>fn(acc)=>acc.concat([{value}])); }}\n"
                    ));
                    let input = if layer == 0 { "x".to_string() } else { format!("h{}", layer - 1) };
                    body.push_str(&format!("let h{layer} = {name}({PARAM}.{field}, {input}); "));
                    at += (inputs + 1) * outputs;
                }
                let last = format!("h{}", layers - 1);
                let (result, value) = if *shape.last().unwrap() == 1 {
                    ("f32", format!("{last}.at_or(0, 0.0)"))
                } else {
                    ("List<f32>", last)
                };
                generated.push_str(&format!(
                    "fn {call}(x: List<f32>, {PARAM}: {RECORD}) -> {result} {{ {body}return {value}; }}\n"
                ));
                fields.push((field.clone(), "List<f32>".to_string(), format!("foldl(next.{field}, true, fn(v)=>fn(ok)=>ok && is_finite(v))"), count));
                let weights = initial_weights(&h.name, shape);
                initial.push((field.clone(), format!("[{}]", weights.iter().map(|x| float_source(*x)).collect::<Vec<_>>().join(", "))));
                manifest.push(Hole {
                    name: h.name.clone(),
                    family: "mlp".into(),
                    field,
                    parameters: count as u32,
                    choices: 0,
                    shape: shape.clone(),
                    admission: admission.into(),
                    declaration,
                });
            }
        }
    }
    if let Some(name) = guards.keys().find(|n| !guarded.contains_key(*n)) {
        return Err(format!("{name}: `ensures` without parentheses guards learn holes with `else`; this function has none"));
    }

    // Generated declarations, parsed as ordinary source.
    let record_fields: String = fields.iter().map(|(n, t, _, _)| format!("{n}: {t}, ")).collect();
    let initial_fields: Vec<String> = initial.iter().map(|(n, v)| format!("{n}: {v}")).collect();
    let checks: Vec<String> = fields
        .iter()
        .map(|(n, _, values, count)| format!("length(next.{n}) == {count} && {values}"))
        .collect();
    let needs_relu = generated.contains("__learn_relu(");
    let source = format!(
        "module __learn;\n\
         record {RECORD} {{ {record_fields}}}\n\
         trainable state {STATE}: {RECORD} = {RECORD}{{{}}};\n\
         {}\
         {generated}\
         fn __learn_valid(next: {RECORD}) -> Bool {{ return {}; }}\n\
         query {GET}() -> {RECORD} reads({STATE}) {{ return {STATE}; }}\n\
         learn change {SET}(next: {RECORD}) -> Result<Unit, String> writes({STATE}) {{\n\
           if !__learn_valid(next) {{ return Err(\"learn hole parameters have the wrong shape or values\"); }}\n\
           {STATE} = next;\n\
           return Ok(());\n\
         }}\n",
        initial_fields.join(", "),
        if needs_relu { "fn __learn_relu(v: f32) -> f32 { return choose(v > 0.0, v, 0.0); }\n" } else { "" },
        checks.join(" && "),
    );
    let mut record_names: Vec<String> = p.records.keys().cloned().collect();
    record_names.push(RECORD.into());
    let parsed = crate::syntax::parse_surface(&source, record_names)
        .map_err(|e| format!("learn hole lowering: {e}"))?;
    let g = parsed.program;
    let read = g
        .actions
        .iter()
        .find(|a| a.name == GET)
        .and_then(|a| match a.body.first() {
            Some(Statement::Return(e)) => Some(e.clone()),
            _ => None,
        })
        .ok_or("learn hole lowering: missing parameter read")?;

    // Guards: evaluate with learned output; fall back to the authored result.
    for (name, holes_here) in &guarded {
        let i = p.functions.iter().position(|f| &f.name == name).unwrap();
        let mut inner = p.functions[i].clone();
        inner.name = format!("__guarded_{name}");
        inner.params.push(("__learn_use".into(), Type::Bool));
        let replacements: BTreeMap<String, Expr> = holes_here.iter().cloned().collect();
        walk_mut(&mut inner.body, &mut |x| {
            if let Expr::Call(c, _) = x {
                if let Some(fallback) = replacements.get(c) {
                    let hole = x.clone();
                    *x = Expr::Call("choose".into(), vec![Expr::Var("__learn_use".into()), hole, fallback.clone()]);
                }
            }
        });
        let args = |flag: bool| {
            let mut xs: Vec<Expr> = p.functions[i].params.iter().map(|(n, _)| Expr::Var(n.clone())).collect();
            xs.push(Expr::Bool(flag));
            Expr::Call(inner.name.clone(), xs)
        };
        let guard = guards[name].clone();
        let result = p.functions[i].result.clone();
        p.functions[i].body = Expr::Let(
            "result".into(),
            Some(Box::new(result)),
            Box::new(args(true)),
            Box::new(Expr::Call("choose".into(), vec![guard, Expr::Var("result".into()), args(false)])),
        );
        p.functions.push(inner);
    }

    // Objectives are pure functions; each gets a reading query for training.
    for name in &objectives {
        let f = p
            .functions
            .iter()
            .find(|f| &f.name == name)
            .ok_or_else(|| format!("objective {name} does not exist"))?;
        if f.result != Type::F32 {
            return Err(format!("objective {name} must return f32"));
        }
        let call = Expr::Call(name.clone(), f.params.iter().map(|(n, _)| Expr::Var(n.clone())).collect());
        p.actions.push(Action {
            name: format!("{OBJECTIVE_PREFIX}{name}"),
            kind: ActionKind::Query,
            params: f.params.clone(),
            result: Type::F32,
            reads: vec![],
            writes: vec![],
            emits: vec![],
            body: vec![Statement::Return(call)],
        });
    }

    // Thread the parameters through every function that reaches a hole.
    let mut needs = hole_names.clone();
    loop {
        let before = needs.len();
        for f in &p.functions {
            if !needs.contains(&f.name) && calls_any(&f.body, &needs) {
                needs.insert(f.name.clone());
            }
        }
        if needs.len() == before {
            break;
        }
    }
    let threaded: BTreeSet<String> = needs.difference(&hole_names).cloned().collect();
    for name in &objectives {
        if !threaded.contains(name) {
            return Err(format!("objective {name} does not depend on any learn hole"));
        }
    }
    for f in &mut p.functions {
        if let Some(n) = uses_as_value(&f.body, &threaded) {
            return Err(format!("{n} contains a learn hole and cannot be used as a function value"));
        }
        if threaded.contains(&f.name) {
            if generic.contains(&f.name) {
                return Err(format!("{} reaches a learn hole and cannot be generic", f.name));
            }
            pure_unwrap_or(&mut f.body, &hole_names);
            f.params.push((PARAM.into(), Type::Named(RECORD.into())));
            walk_mut(&mut f.body, &mut |x| {
                if let Expr::Call(c, args) = x {
                    if needs.contains(c) {
                        args.push(Expr::Var(PARAM.into()));
                    }
                }
            });
        }
    }
    for a in &mut p.actions {
        let mut reaches = false;
        a.body.iter().for_each(|st| statement_exprs(st, &mut |x| {
            if let Expr::Call(c, _) = x {
                reaches |= needs.contains(c);
            }
        }));
        if !reaches {
            continue;
        }
        a.body.iter_mut().for_each(|st| statement_exprs_mut(st, &mut |x| {
            if let Expr::Call(c, args) = x {
                if needs.contains(c) {
                    args.push(Expr::Var(PARAM.into()));
                }
            }
        }));
        a.body.insert(0, Statement::Let(PARAM.into(), Some(Type::Named(RECORD.into())), read.clone()));
        if !a.reads.iter().chain(&a.writes).any(|n| n == STATE) {
            a.reads.push(STATE.into());
        }
    }
    for k in &p.keeps {
        if calls_any(&k.value, &needs) {
            return Err(format!("keep {} reaches a learn hole; read it from a query instead", k.name));
        }
    }
    let contracts = &p.contracts;
    let contract_use = contracts.invariants.iter().any(|e| calls_any(e, &needs))
        || contracts.value_invariants.values().any(|e| calls_any(e, &needs))
        || contracts.implementations.iter().any(|i| {
            let mut found = false;
            i.body.iter().for_each(|st| statement_exprs(st, &mut |x| {
                if let Expr::Call(c, _) = x {
                    found |= needs.contains(c);
                }
            }));
            found
        });
    if contract_use {
        return Err("learn holes cannot be reached from contracts, specifications or invariants".into());
    }

    // Merge the generated declarations.
    let mut g = g;
    p.records.extend(std::mem::take(&mut g.records));
    p.functions.extend(std::mem::take(&mut g.functions));
    p.states.extend(std::mem::take(&mut g.states));
    p.actions.extend(std::mem::take(&mut g.actions));
    p.contracts.learning.trainable.extend(g.contracts.learning.trainable);
    p.contracts.learning.learn.extend(g.contracts.learning.learn);
    p.contracts.learning.holes = manifest;
    p.contracts.learning.objectives = objectives;
    Ok(())
}

/// Consistency of the hole manifest with the generated declarations.
pub fn check(p: &Program) -> LangResult<()> {
    let d = &p.contracts.learning;
    if d.holes.is_empty() {
        if !d.objectives.is_empty() {
            return Err("objectives require learn holes".into());
        }
        return Ok(());
    }
    let trainable = d.trainable.iter().any(|n| n == STATE) && d.learn.iter().any(|n| n == SET);
    let frozen = p.frozen.contains_key(STATE) && !p.actions.iter().any(|a| a.writes.iter().any(|w| w == STATE));
    if !trainable && !frozen {
        return Err("learn holes require their generated parameter state with its learn change, or a frozen binding".into());
    }
    let fields = p.records.get(RECORD).ok_or("learn holes require their parameter record")?;
    if fields.len() != d.holes.len() {
        return Err("learn hole manifest does not match its parameter record".into());
    }
    for h in &d.holes {
        let expected = match h.family.as_str() {
            "choice" => Type::List(Box::new(Type::U32)),
            "mlp" => Type::List(Box::new(Type::F32)),
            _ => return Err(format!("unknown learn hole family {}", h.family)),
        };
        if !fields.iter().any(|(n, t)| n == &h.field && t == &expected) {
            return Err(format!("learn hole {} has no matching parameter field", h.name));
        }
        if !["error-path", "guarded"].contains(&h.admission.as_str()) {
            return Err(format!("learn hole {} has unknown admission {}", h.name, h.admission));
        }
        if !p.functions.iter().any(|f| f.name == hole_function(&h.name)) {
            return Err(format!("learn hole {} has no generated function", h.name));
        }
    }
    for o in &d.objectives {
        if !p.actions.iter().any(|a| a.name == format!("{OBJECTIVE_PREFIX}{o}")) {
            return Err(format!("objective {o} has no generated query"));
        }
    }
    Ok(())
}
