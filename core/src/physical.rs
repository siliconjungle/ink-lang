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
pub struct Reservation {
    pub function: String,
    #[serde(default)]
    pub parameter: String,
    #[serde(default,skip_serializing_if="Option::is_none")]
    pub capacity:Option<crate::syntax::Expr>,
    #[serde(default)]
    pub fields: Vec<String>,
    pub evidence: crate::property::Package,
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
    #[serde(default)]
    pub reservations: Vec<Reservation>,
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
            && (2..=17).contains(&cs[1].fields.len())
            && cs[1].fields.last() == Some(&Sort::SelfType)
            && cs[1].fields[..cs[1].fields.len()-1].iter().all(|s|matches!(s,Sort::Bool|Sort::U64|Sort::Data(_))))
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
    if plan.reservations.len()>4096 || representation.is_some() && !plan.reservations.is_empty() {
        return Err("oversized or unsupported source reservations".into());
    }
    // A capacity expression executes before the body. Its calls must not add
    // a recursion cycle through any other instrumented function.
    if !plan.reservations.is_empty() {
        use std::collections::BTreeMap;
        let names=module.program().functions.iter().map(|f|f.name.clone()).collect::<BTreeSet<_>>();
        let calls=|e:&crate::syntax::Expr|{
            let mut result=BTreeSet::new();let mut pending=vec![e];
            while let Some(e)=pending.pop(){
                if let crate::syntax::Expr::Call(n,_)=e{if names.contains(n){result.insert(n.clone());}}
                pending.extend(crate::analysis::children(e));
            }
            result
        };
        let mut graph=module.program().functions.iter().map(|f|(f.name.clone(),calls(&f.body))).collect::<BTreeMap<_,_>>();
        for r in &plan.reservations {if let Some(e)=&r.capacity{graph.entry(r.function.clone()).or_default().extend(calls(e));}}
        let mut work=0usize;
        for r in &plan.reservations {if let Some(e)=&r.capacity{
            let mut pending=calls(e).into_iter().collect::<Vec<_>>();let mut seen=BTreeSet::new();
            while let Some(n)=pending.pop(){
                work+=1;if work>1_000_000{return Err("reservation dependency walk limit".into());}
                if n==r.function{return Err("reservation expression creates a recursive execution path".into());}
                if seen.insert(n.clone()){if let Some(edges)=graph.get(&n){pending.extend(edges.iter().cloned());}}
            }
        }}
    }
    let mut reserved = BTreeSet::new();
    for reservation in &plan.reservations {
        use crate::semantic::{self as s,Node};
        let p=module.program();
        let f=p.functions.iter().find(|f|f.name==reservation.function).ok_or("reservation function missing")?;
        if !reserved.insert(&f.name) || !matches!(f.result,crate::syntax::Type::List(_)) {
            return Err("reservation requires unique finite sequence result/input".into());
        }
        let env=crate::check::params_env(&f.params)?;
        let body=s::elaborate(&f.body,&env,p,&f.result)?;
        let count=|v|s::op(s::value(crate::syntax::Type::Int),"call:count",vec![v]);
        let capacity=if let Some(expression)=&reservation.capacity {
            if !reservation.parameter.is_empty()||!reservation.fields.is_empty(){return Err("reservation capacity forms are exclusive".into());}
            let mut pending=vec![expression];
            while let Some(e)=pending.pop(){
                if let crate::syntax::Expr::Var(n)=e {if env.get(n).is_some_and(|t|crate::local_collections::owned(t,p)){return Err("reservation expression cannot consume an affine input".into());}}
                pending.extend(crate::analysis::children(e));
            }
            let ty=crate::check::infer_context(expression,&env,p,None)?;
            if !matches!(ty,crate::syntax::Type::Int|crate::syntax::Type::U32|crate::syntax::Type::U64){return Err("reservation expression must return an exact count or unsigned word".into());}
            let term=s::elaborate(expression,&env,p,&ty)?;
            if ty==crate::syntax::Type::Int {term}else{s::op(s::value(crate::syntax::Type::Int),"call:Int",vec![term])}
        } else {
            let param=f.params.iter().find(|(n,_)|*n==reservation.parameter).ok_or("reservation parameter missing")?;
            if reservation.fields.len()>64 {return Err("reservation projection depth limit".into());}
            let mut projection=crate::syntax::Expr::Var(param.0.clone());
            for field in &reservation.fields{projection=crate::syntax::Expr::Field(Box::new(projection),field.clone());}
            let ty=crate::check::infer_context(&projection,&env,p,None)?;
            if !matches!(ty,crate::syntax::Type::List(_)){return Err("reservation capacity is not a finite sequence".into());}
            count(s::elaborate(&projection,&env,p,&ty)?)
        };
        let expected=crate::laws::Equation {
            from:s::op(s::value(crate::syntax::Type::Bool),"binary:<=",vec![count(body),capacity]),
            to:s::term(s::value(crate::syntax::Type::Bool),Node::Bool(true)),
        };
        let facts=crate::property::check(module,&reservation.evidence)?;
        if !facts.equations().iter().any(|e|e==&expected) { return Err("reservation lacks a proved exact cardinality bound".into()); }
    }
    // Generic lexical type validation is independent of strategy authoring.
    // A source hash alone cannot turn a scalar variable into a list borrow.
    let p = module.program();
    let mut read_sites = BTreeSet::new();
    for f in &p.functions {
        let mut failure = None;
        crate::analysis::typed_walk(p, f, |e, env| {
            let lexical = crate::collection_facts::lexical_projection(e);
            let rooted = lexical.as_ref().is_some_and(|(root, _)| matches!(
                env.get(*root), Some(crate::syntax::Type::Named(_) | crate::syntax::Type::List(_))));
            if rooted && crate::check::infer(e, env, p).is_ok() {
                match registry::identity(e) { Ok(id) => {read_sites.insert(id);}, Err(e) => failure=Some(e) }
            }
        })?;
        if let Some(error) = failure {return Err(error)}
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
