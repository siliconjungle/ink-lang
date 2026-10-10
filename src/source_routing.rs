//! Literal placement of pure source calls. No algorithm or placement search.
//! Exact typed source composition is checked by reflexivity or one unfolding
//! of the original entry; physical backends and bridges remain trusted.
use crate::{
    core::{CheckedModule, Expr, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-literal-source-routing-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Literal {
    U32(u32),
    U64(String),
    Bool(bool),
}
impl Literal {
    fn source(&self) -> LangResult<(Type, Expr)> {
        Ok(match self {
            Self::U32(n) => (Type::U32, Expr::Num(*n as u64)),
            Self::Bool(b) => (Type::Bool, Expr::Bool(*b)),
            Self::U64(n) => {
                if n.is_empty()
                    || n.len() > 20
                    || !n.bytes().all(|b| b.is_ascii_digit())
                    || (n.len() > 1 && n.starts_with('0'))
                {
                    return Err("noncanonical routing u64 literal".into());
                }
                (
                    Type::U64,
                    Expr::Num(n.parse().map_err(|_| "routing u64 literal outside range")?),
                )
            }
        })
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum ValueRef {
    Input(usize),
    Stage(String),
    Literal(Literal),
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Stage {
    pub id: String,
    pub function: String,
    pub backend: String,
    pub domain: String,
    pub arguments: Vec<ValueRef>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub entry: String,
    pub stages: Vec<Stage>,
    pub output: ValueRef,
}
#[derive(Debug)]
pub struct CheckedRouting {
    module: CheckedModule,
    package: Package,
    stage_types: BTreeMap<String, Type>,
    composition: Expr,
}
impl CheckedRouting {
    pub fn module(&self) -> &CheckedModule {
        &self.module
    }
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn stage_types(&self) -> &BTreeMap<String, Type> {
        &self.stage_types
    }
    pub fn composition(&self) -> &Expr {
        &self.composition
    }
}
fn name(s: &str) -> LangResult<()> {
    if s.is_empty()
        || s.len() > 128
        || !s
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.' | b':' | b'/'))
    {
        return Err("invalid source routing identifier".into());
    }
    Ok(())
}
fn resolve(
    r: &ValueRef,
    params: &[(String, Type)],
    stages: &BTreeMap<String, (Type, Expr, usize)>,
) -> LangResult<(Type, Expr, usize)> {
    match r {
        ValueRef::Input(i) => params
            .get(*i)
            .map(|(n, t)| (t.clone(), Expr::Var(n.clone()), n.len() + 16))
            .ok_or("routing input out of range".into()),
        ValueRef::Literal(v) => {
            let (t, e) = v.source()?;
            Ok((t, e, 64))
        }
        ValueRef::Stage(n) => stages
            .get(n)
            .cloned()
            .ok_or("missing or forward source routing stage".into()),
    }
}
pub fn check(module: &CheckedModule, p: &Package) -> LangResult<CheckedRouting> {
    let source = module.pure_program()?;
    if p.schema != 1 || p.semantics != SEMANTICS {
        return Err("incompatible source routing semantics".into());
    }
    if p.input_core_sha256 != module.identity()? {
        return Err("source routing core identity mismatch".into());
    }
    if p.stages.len() > 32 {
        return Err("source routing stage limit".into());
    }
    let entry = source
        .functions
        .iter()
        .find(|f| f.name == p.entry)
        .ok_or("missing source routing entry")?;
    let mut values = BTreeMap::new();
    let mut budget = 1_000_000usize;
    for stage in &p.stages {
        name(&stage.id)?;
        name(&stage.backend)?;
        name(&stage.domain)?;
        if values.contains_key(&stage.id) {
            return Err("duplicate source routing stage".into());
        }
        let function = source
            .functions
            .iter()
            .find(|f| f.name == stage.function)
            .ok_or("routing stage is not a declared pure function")?;
        if function.params.len() != stage.arguments.len() {
            return Err("source routing arity mismatch".into());
        }
        let mut args = Vec::new();
        let mut size = stage.function.len() + 32;
        for (reference, (_, want)) in stage.arguments.iter().zip(&function.params) {
            // Check expansion size before cloning a potentially shared term.
            let estimate = match reference {
                ValueRef::Stage(n) => values
                    .get(n)
                    .map(|(_, _, size)| *size)
                    .ok_or("missing or forward source routing stage")?,
                _ => 160,
            };
            size = size
                .checked_add(estimate)
                .ok_or("source routing expansion overflow")?;
            if size > budget {
                return Err("source routing expansion limit".into());
            }
            let (ty, expr, _) = resolve(reference, &entry.params, &values)?;
            if &ty != want {
                return Err("source routing edge type mismatch".into());
            }
            args.push(expr);
        }
        budget = budget
            .checked_sub(size)
            .ok_or("source routing expansion limit")?;
        values.insert(
            stage.id.clone(),
            (
                function.result.clone(),
                Expr::Call(function.name.clone(), args),
                size,
            ),
        );
    }
    let (ty, composition, _) = resolve(&p.output, &entry.params, &values)?;
    if ty != entry.result {
        return Err("source routing output type mismatch".into());
    }
    let original = Expr::Call(
        entry.name.clone(),
        entry
            .params
            .iter()
            .map(|(n, _)| Expr::Var(n.clone()))
            .collect(),
    );
    if composition != entry.body && composition != original {
        return Err("routing does not reconstruct the actual source computation".into());
    }
    let mut used = BTreeSet::new();
    let mut work = vec![&p.output];
    while let Some(ValueRef::Stage(n)) = work.pop() {
        if used.insert(n.clone()) {
            let s = p
                .stages
                .iter()
                .find(|s| &s.id == n)
                .ok_or("missing routing output")?;
            work.extend(
                s.arguments
                    .iter()
                    .filter(|r| matches!(r, ValueRef::Stage(_))),
            );
        }
    }
    if used.len() != p.stages.len() {
        return Err("source routing contains unused execution".into());
    }
    Ok(CheckedRouting {
        module: module.clone(),
        package: p.clone(),
        stage_types: values.into_iter().map(|(n, (t, _, _))| (n, t)).collect(),
        composition,
    })
}
