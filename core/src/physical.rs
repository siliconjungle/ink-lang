//! Explicit physical choices, bound to an admitted program. This module checks
//! generic carrier/key capabilities; it does not discover or rank strategies.
use crate::{
    core::CheckedModule,
    definition::CheckedDefinition,
    logic::{Declaration, Sort},
    registry,
    representation::CheckedRepresentation,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
pub const SEMANTICS: &str = "ink-physical-plan-v1";
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Tables {
    #[default]
    Ordered,
    IndexedSlots,
}
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Definitions {
    #[default]
    Shared,
    Packed,
    Memo,
}
#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Buffers {
    #[default]
    Scoped,
    Direct,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub representation: Option<String>,
    #[serde(default)]
    pub tables: Tables,
    #[serde(default)]
    pub buffers: Buffers,
    #[serde(default)]
    pub columns: Vec<crate::column_codec::Layout>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub column_maps: Option<crate::column_codec::MapPackage>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bounds: Option<crate::bounds::Package>,
    #[serde(default)]
    pub borrow_reads: Vec<String>,
    #[serde(default)]
    pub borrow_rows: Vec<String>,
    #[serde(default)]
    pub definitions: Definitions,
    #[serde(default)]
    pub packed_datatypes: Vec<String>,
    #[serde(default)]
    pub memo_functions: Vec<String>,
}
#[derive(Clone, Debug)]
pub struct CheckedPhysicalPlan {
    plan: Plan,
    bounds: crate::bounds::CheckedBounds,
    column_maps: crate::column_codec::CheckedMaps,
}
impl CheckedPhysicalPlan {
    pub fn column_maps(&self) -> &crate::column_codec::CheckedMaps { &self.column_maps }
    pub fn bounds(&self) -> &crate::bounds::CheckedBounds { &self.bounds }
    pub fn plan(&self) -> &Plan {
        &self.plan
    }
    pub fn borrows_read(&self, id: &str) -> bool {
        self.plan
            .borrow_reads
            .binary_search_by(|s| s.as_str().cmp(id))
            .is_ok()
    }
    pub fn borrows_row(&self, id: &str) -> bool {
        self.plan
            .borrow_rows
            .binary_search_by(|s| s.as_str().cmp(id))
            .is_ok()
    }
}
fn ids(values: &[String]) -> LangResult<()> {
    if values.len() > 4096 || !values.windows(2).all(|p| p[0] < p[1]) {
        return Err("physical sites must be bounded, unique and sorted".into());
    }
    for value in values {
        crate::content::identity(value)?;
    }
    Ok(())
}
fn definitions(plan: &Plan, definition: &CheckedDefinition) -> LangResult<()> {
    let ds = definition.reachable_executable_declarations()?;
    if plan.definitions != Definitions::Packed && !plan.packed_datatypes.is_empty()
        || plan.definitions != Definitions::Memo && !plan.memo_functions.is_empty()
    {
        return Err("physical definition strategy/site mismatch".into());
    }
    for id in &plan.packed_datatypes {
        let Some(Declaration::Datatype { constructors: cs }) = ds.get(id) else {
            return Err("packed carrier is not a reachable datatype".into());
        };
        if !(cs.len() == 2
            && cs[0].fields.is_empty()
            && cs[1].fields.len() == 2
            && cs[1].fields[1] == Sort::SelfType
            && matches!(cs[1].fields[0], Sort::Bool | Sort::U64 | Sort::Data(_)))
        {
            return Err("packed carrier does not satisfy the literal spine ABI".into());
        }
    }
    for id in &plan.memo_functions {
        let Some(Declaration::Function { params, result, .. }) = ds.get(id) else {
            return Err("memo site is not a reachable pure function".into());
        };
        if !matches!(result, Sort::Bool | Sort::U64)
            || params.len() > 5
            || params
                .iter()
                .filter(|(_, s)| matches!(s, Sort::Data(_)))
                .count()
                != 1
            || params
                .iter()
                .any(|(_, s)| !matches!(s, Sort::Bool | Sort::U64 | Sort::Data(_)))
        {
            return Err("memo site does not satisfy the immutable key ABI".into());
        }
    }
    Ok(())
}
pub fn check(
    module: &CheckedModule,
    representation: Option<&CheckedRepresentation>,
    plan: &Plan,
) -> LangResult<CheckedPhysicalPlan> {
    if plan.schema != 1
        || plan.semantics != SEMANTICS
        || plan.input_core_sha256 != module.identity()?
        || plan.representation.as_deref()
            != representation.map(|r| r.request().representation.as_str())
    {
        return Err("physical plan source/representation binding mismatch".into());
    }
    for sites in [
        &plan.borrow_reads,
        &plan.borrow_rows,
        &plan.packed_datatypes,
        &plan.memo_functions,
    ] {
        ids(sites)?;
    }
    if representation.is_some()
        && (plan.tables != Tables::Ordered
            || !plan.borrow_reads.is_empty()
            || !plan.borrow_rows.is_empty())
    {
        return Err(
            "source table/read strategies do not apply to definition representations".into(),
        );
    }
    // Generic lexical type validation is independent of strategy authoring.
    // A source hash alone cannot turn a scalar variable into a list borrow.
    let p = module.program();
    let mut read_sites = BTreeSet::new();
    for f in &p.functions {
        let env = crate::check::params_env(&f.params)?;
        let mut pending = vec![(&f.body, env)];
        let mut nodes = 0;
        while let Some((e, env)) = pending.pop() {
            nodes += 1;
            if nodes > 1_000_000 {
                return Err("physical source walk limit".into());
            }
            let lexical = crate::collection_facts::lexical_projection(e);
            let rooted = lexical.as_ref().is_some_and(|(root, _)| {
                matches!(
                    env.get(*root),
                    Some(crate::syntax::Type::Named(_) | crate::syntax::Type::List(_))
                )
            });
            if rooted && crate::check::infer(e, &env, p).is_ok() {
                read_sites.insert(registry::identity(e)?);
            }
            use crate::syntax::{Expr, Type};
            match e {
                Expr::Let(n, t, a, b) => {
                    pending.push((a, env.clone()));
                    let mut local = env;
                    local.insert(
                        n.clone(),
                        t.as_ref()
                            .map(|t| Ok(*t.clone()))
                            .unwrap_or_else(|| crate::check::infer(a, &local, p))?,
                    );
                    pending.push((b, local));
                }
                Expr::Method(a, _, args) => {
                    let receiver = crate::check::infer(a, &env, p).ok();
                    pending.push((a, env.clone()));
                    for arg in args {
                        if let (Expr::Lambda(n, b), Some(Type::List(t))) = (arg, &receiver) {
                            let mut local = env.clone();
                            local.insert(n.clone(), *t.clone());
                            pending.push((b, local));
                        } else {
                            pending.push((arg, env.clone()));
                        }
                    }
                }
                Expr::Binary(_, a, b) => {
                    pending.push((a, env.clone()));
                    pending.push((b, env));
                }
                Expr::Neg(a) | Expr::Try(a) | Expr::Field(a, _) => pending.push((a, env)),
                Expr::Call(_, args) => {
                    for a in args {
                        pending.push((a, env.clone()));
                    }
                }
                Expr::Record(_, fields) => {
                    for (_, a) in fields {
                        pending.push((a, env.clone()));
                    }
                }
                _ => (),
            }
        }
    }
    let program = serde_json::to_value(p).map_err(|e| e.to_string())?;
    let tables: BTreeSet<_> = p
        .states
        .iter()
        .filter(|s| matches!(s.ty, crate::syntax::Type::Table(..)))
        .map(|s| s.name.as_str())
        .collect();
    let mut pending = vec![&program];
    let mut row_sites = BTreeSet::new();
    let mut nodes = 0;
    let mut bytes = 0;
    while let Some(v) = pending.pop() {
        nodes += 1;
        if nodes > 1_000_000 {
            return Err("physical source walk limit".into());
        }
        match v {
            serde_json::Value::Object(m) => {
                let e = if m.len() == 1 && (m.contains_key("Method") || m.contains_key("Try")) {
                    serde_json::from_value::<crate::syntax::Expr>(v.clone()).ok()
                } else {
                    None
                };
                use crate::syntax::Expr;
                let eligible = match e.as_ref() {
                    Some(Expr::Method(base, method, _))
                        if matches!(method.as_str(), "map" | "filter") =>
                    {
                        matches!(base.as_ref(),Expr::Method(root,name,_)if matches!(name.as_str(),"values"|"get")&&matches!(root.as_ref(),Expr::Var(n)if tables.contains(n.as_str())))
                    }
                    Some(Expr::Try(inner)) => {
                        matches!(inner.as_ref(),Expr::Method(base,name,_)if name=="ok_or"&&matches!(base.as_ref(),Expr::Method(root,name,_)if name=="get"&&matches!(root.as_ref(),Expr::Var(n)if tables.contains(n.as_str()))))
                    }
                    _ => false,
                };
                if eligible {
                    bytes += registry::canonical(v)?.len();
                    if bytes > registry::MAX_VIEW_BYTES {
                        return Err("physical site hashing byte limit".into());
                    }
                    row_sites.insert(registry::identity(v)?);
                }
                pending.extend(m.values());
            }
            serde_json::Value::Array(xs) => pending.extend(xs),
            _ => (),
        }
    }
    if plan.borrow_reads.iter().any(|id| !read_sites.contains(id))
        || plan.borrow_rows.iter().any(|id| !row_sites.contains(id))
    {
        return Err("physical borrow site lacks a typed source carrier".into());
    }
    if let Some(r) = representation {
        definitions(plan, r.definition())?;
    } else if !plan.packed_datatypes.is_empty()
        || !plan.memo_functions.is_empty()
        || plan.definitions != Definitions::Shared
    {
        return Err("physical definition sites require a checked representation".into());
    }
    if plan.columns.len()>64 || !plan.columns.windows(2).all(|w|w[0].record<w[1].record){return Err("column layout ordering/count limit".into())}
    if representation.is_some()&&(!plan.columns.is_empty()||plan.bounds.is_some()||plan.column_maps.is_some()||plan.buffers!=Buffers::Scoped){return Err("source column choices do not apply to definition representations".into())}
    for layout in &plan.columns {crate::column_codec::check(module.program(),layout)?;}
    let bounds=plan.bounds.as_ref().map(|p|crate::bounds::check(module,p)).transpose()?.unwrap_or_default();
    let column_maps=plan.column_maps.as_ref().map(|p|crate::column_codec::check_maps(module,&plan.columns,p)).transpose()?.unwrap_or_default();
    Ok(CheckedPhysicalPlan { plan: plan.clone(),bounds,column_maps })
}
