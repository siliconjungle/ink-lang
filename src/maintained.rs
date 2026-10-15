//! Checked factorisation of source keeps through commutative groups.
//! The database supplies contributions, group operations and every equality.
//! Native cell mutation implements the admitted fold; caches are auxiliary and
//! are reconstructed at snapshot ingress, never trusted from snapshot bytes.
use crate::contracts::Contracts;
use crate::{
    action_model::Projection,
    core::CheckedModule,
    definition,
    logic::{Branch, Declaration, Equation, Proof, Sort, Term},
    registry,
    syntax::*,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-maintained-fold-v1";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct View {
    pub keep: String,
    pub table: String,
    pub contribution: String,
    pub combine: String,
    /// Group inverse; empty for an extremum view, which has none.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub inverse: String,
    pub zero: Term,
    pub factorisation: Proof,
    pub identity: Proof,
    pub associativity: Proof,
    pub commutativity: Proof,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cancellation: Option<Proof>,
    pub insertion: Proof,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deletion: Option<Proof>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replacement: Option<Proof>,
    /// A word maximum or minimum instead of a group: `combine` is proved equal
    /// to the fixed word max/min, so the fixed controller keeps the multiset of
    /// contributions and reads its largest or smallest member (or `zero`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub extremum: Option<Extremum>,
    /// Optional database implementation of the group replacement operation.
    /// Admission checks it for arbitrary totals and contributions, not a profile.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub update: Option<Update>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contribution_choice: Option<Update>,
    /// A grouped view of a one-parameter source query: `group(key, row)` is the
    /// word each row belongs to, and the query equals the fold over rows whose
    /// group equals its parameter. The fixed controller keeps one total per
    /// group and answers the query by a lookup (`zero` when absent).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    /// A row-aware replacement may preserve predicates instead of first
    /// materialising two group contributions. The complete group equation is
    /// checked for arbitrary totals, keys and rows.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub row_update: Option<Update>,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Order {
    Max,
    Min,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Extremum {
    pub order: Order,
    /// `combine(a, b) = if a < b { b } else { a }` (max) or `{ a } else { b }` (min).
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Update {
    pub function: String,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub knowledge: registry::Bundle,
    pub views: Vec<View>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Subject {
    pub keep: String,
    pub table: String,
    pub root: usize,
    pub row: Sort,
    pub key: Sort,
    pub result: Sort,
    pub rows: String,
    pub state: String,
    pub query: String,
    pub value: Term,
    pub bindings: Vec<String>,
    /// The query parameter variable of a grouped subject (a one-parameter
    /// source query, named by `keep`); absent for a keep.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameter: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Subjects {
    pub source: String,
    pub objects: BTreeMap<String, registry::Entry>,
    pub subjects: Vec<Subject>,
}
#[derive(Clone, Debug)]
pub struct CheckedViews {
    package: Package,
    definition: definition::CheckedDefinition,
    subjects: Vec<Subject>,
    zeros: Vec<Term>,
}
impl CheckedViews {
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn definition(&self) -> &definition::CheckedDefinition {
        &self.definition
    }
    pub fn subjects(&self) -> &[Subject] {
        &self.subjects
    }
    pub fn zeros(&self) -> &[Term] {
        &self.zeros
    }
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(f: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: f.into(),
        arguments: args,
    }
}

/// Export exact source observations. Names only identify sites, never laws.
pub fn subjects(module: &CheckedModule) -> LangResult<Subjects> {
    let mut p = module.program().clone();
    p.contracts = Contracts::default();
    let mut names = vec![];
    for (i, k) in module.program().keeps.iter().enumerate() {
        let mut name = format!("__ink_maintained_{i}");
        while p.actions.iter().any(|a| a.name == name) || p.functions.iter().any(|f| f.name == name)
        {
            name.push('_');
        }
        p.actions.push(Action {
            name: name.clone(),
            kind: ActionKind::Query,
            params: vec![],
            result: k.ty.clone(),
            reads: p
                .states
                .iter()
                .chain(&p.keeps)
                .map(|s| s.name.clone())
                .collect(),
            writes: vec![],
            emits: vec![],
            body: vec![Statement::Return(Expr::Var(k.name.clone()))],
        });
        names.push(name);
    }
    let m = CheckedModule::from_source(p)?;
    let projection = Projection::derive(&m)?;
    let ir = crate::action_ir::CheckedActions::elaborate(module)?;
    let effects = crate::effects::CheckedEffects::derive(&ir)?;
    let mut out = vec![];
    for (i, k) in module.program().keeps.iter().enumerate() {
        let reads = &effects
            .keep(&k.name)
            .ok_or("keep effects missing")?
            .access
            .reads;
        let roots = module
            .program()
            .states
            .iter()
            .enumerate()
            .filter(|(_, s)| reads.contains(&s.name))
            .collect::<Vec<_>>();
        // A view factors through one root. Products of independent views compose.
        if roots.len() != 1 || !matches!(k.ty, Type::U64 | Type::Bool) {
            continue;
        }
        let (root, s) = roots[0];
        let a = &projection.actions[&names[i]];
        let Term::Construct {
            arguments,
            constructor: 0,
            ..
        } = &a.case.normal
        else {
            continue;
        };
        let table = &projection.tables[root];
        let d: Declaration = serde_json::from_value(
            projection.objects[&table.datatype].payload["declaration"].clone(),
        )
        .map_err(|e| e.to_string())?;
        let Declaration::Datatype { constructors } = d else {
            return Err("table carrier".into());
        };
        out.push(Subject {
            keep: k.name.clone(),
            table: s.name.clone(),
            root,
            row: constructors[1].fields[1].clone(),
            key: constructors[1].fields[0].clone(),
            result: if k.ty == Type::Bool {
                Sort::Bool
            } else {
                Sort::U64
            },
            rows: table.datatype.clone(),
            state: projection.state.clone(),
            query: a.function.clone(),
            value: arguments[0].clone(),
            bindings: a.case.bindings.clone(),
            parameter: None,
        });
    }
    // One-parameter word queries over one root may be grouped views. Their
    // observation is the reply value with the parameter free.
    for q in &module.program().actions {
        if q.kind != ActionKind::Query
            || q.params.len() != 1
            || !matches!(q.params[0].1, Type::U64 | Type::U32 | Type::I32)
            || !matches!(q.result, Type::U64 | Type::Bool)
            || !q.writes.is_empty()
            || !q.emits.is_empty()
            || module.program().contracts.precondition_checks.contains_key(&q.name)
        {
            continue;
        }
        let Some(summary) = effects.action(&q.name) else { continue };
        if !summary.access.keeps.is_empty() {
            continue;
        }
        let roots = module
            .program()
            .states
            .iter()
            .enumerate()
            .filter(|(_, s)| summary.access.reads.contains(&s.name))
            .collect::<Vec<_>>();
        if roots.len() != 1 {
            continue;
        }
        let (root, s) = roots[0];
        let Some(a) = projection.actions.get(&q.name) else { continue };
        let Term::Construct { arguments, constructor: 0, .. } = &a.case.normal else {
            continue;
        };
        let Some((parameter, Sort::U64)) = a.case.params.last() else { continue };
        let table = &projection.tables[root];
        let d: Declaration = serde_json::from_value(
            projection.objects[&table.datatype].payload["declaration"].clone(),
        )
        .map_err(|e| e.to_string())?;
        let Declaration::Datatype { constructors } = d else {
            return Err("table carrier".into());
        };
        out.push(Subject {
            keep: q.name.clone(),
            table: s.name.clone(),
            root,
            row: constructors[1].fields[1].clone(),
            key: constructors[1].fields[0].clone(),
            result: if q.result == Type::Bool { Sort::Bool } else { Sort::U64 },
            rows: table.datatype.clone(),
            state: projection.state.clone(),
            query: a.function.clone(),
            value: arguments[0].clone(),
            bindings: a.case.bindings.clone(),
            parameter: Some(parameter.clone()),
        });
    }
    Ok(Subjects {
        source: module.identity()?,
        objects: projection.objects,
        subjects: out,
    })
}

/// Fixed fold meaning for an arbitrary row sequence (including duplicates).
/// This describes a carrier, not a proposed aggregate algorithm recogniser.
/// A grouped view's fold ranges over one group: rows whose group differs from
/// `group_parameter` contribute `zero`.
pub fn fold(subject: &Subject, view: &View) -> Declaration {
    let mut params = vec![("rows".into(), Sort::Data(subject.rows.clone()))];
    let mut recurse = vec![var("tail")];
    let mut contribution = call(&view.contribution, vec![var("key"), var("row")]);
    if let Some(group) = &view.group {
        params.push(("group_parameter".into(), Sort::U64));
        recurse.push(var("group_parameter"));
        contribution = masked(group, contribution, var("row"), &view.zero);
    }
    Declaration::Function {
        params,
        result: subject.result.clone(),
        recursive: Some(0),
        body: Term::Match {
            scrutinee: Box::new(var("rows")),
            branches: vec![
                Branch {
                    bindings: vec![],
                    body: view.zero.clone(),
                },
                Branch {
                    bindings: vec!["key".into(), "row".into(), "tail".into()],
                    body: call(&view.combine, vec![contribution, Term::SelfCall(recurse)]),
                },
            ],
        },
    }
}
/// `contribution` when the row's group is the fold's parameter, else `zero`.
fn masked(group: &str, contribution: Term, row: Term, zero: &Term) -> Term {
    Term::If {
        condition: Box::new(Term::Binary {
            op: "==".into(),
            left: Box::new(call(group, vec![var("key"), row])),
            right: Box::new(var("group_parameter")),
        }),
        on_true: Box::new(contribution),
        on_false: Box::new(zero.clone()),
    }
}
pub fn check(module: &CheckedModule, package: &Package) -> LangResult<CheckedViews> {
    if package.schema != 1
        || package.semantics != SEMANTICS
        || package.input_core_sha256 != module.identity()?
        || package.views.is_empty()
        || package.views.len() > 64
    {
        return Err("maintained fold binding/count mismatch".into());
    }
    // Definition admission below authenticates the complete borrowed bundle and
    // replays its mathematical declarations. Do not authenticate and clone that
    // same proof closure first; membership alone grants no additional authority.
    let source = subjects(module)?;
    for (id, obj) in &source.objects {
        if package
            .knowledge
            .objects
            .get(id)
            .is_none_or(|e| registry::canonical(e).ok() != registry::canonical(obj).ok())
        {
            return Err("maintained fold source definitions missing or changed".into());
        }
    }
    let mut exports = BTreeSet::new();
    let mut selected = vec![];
    let mut seen = BTreeSet::new();
    for view in &package.views {
        if !seen.insert(&view.keep) {
            return Err("duplicate maintained keep".into());
        }
        let s = source
            .subjects
            .iter()
            .find(|s| s.keep == view.keep && s.table == view.table)
            .ok_or("maintained keep/root capability")?
            .clone();
        if s.parameter.is_some() != view.group.is_some() {
            return Err("maintained grouped view must name a one-parameter query".into());
        }
        let declaration = fold(&s, view);
        let mut dependencies = vec![
            s.rows.clone(),
            view.contribution.clone(),
            view.combine.clone(),
        ];
        if let Some(group) = &view.group {
            dependencies.push(group.clone());
            exports.insert(group.clone());
        }
        let object = registry::Entry::from_declaration(&declaration, dependencies)?;
        let id = registry::identity(&object)?;
        if package
            .knowledge
            .objects
            .get(&id)
            .is_none_or(|e| registry::canonical(e).ok() != registry::canonical(&object).ok())
        {
            return Err("maintained fold fixed meaning missing".into());
        }
        exports.extend([
            id.clone(),
            view.contribution.clone(),
            view.combine.clone(),
            s.query.clone(),
        ]);
        if view.extremum.is_none() {
            exports.insert(view.inverse.clone());
        }
        if let Some(update) = &view.update {
            exports.insert(update.function.clone());
        }
        if let Some(choice) = &view.contribution_choice {
            exports.insert(choice.function.clone());
        }
        if let Some(update) = &view.row_update {
            exports.insert(update.function.clone());
        }
        selected.push((s, id));
    }
    let (definition, context) = definition::check_registry_with_context(
        &package.knowledge,
        &exports.into_iter().collect::<Vec<_>>(),
    )?;
    let mut zeros = vec![];
    for ((s, fold), v) in selected.iter().zip(&package.views) {
        // A view is either a commutative group (inverse, cancellation, deletion
        // and replacement) or a word extremum (none of those): never a mix.
        let group = v.extremum.is_none();
        if group != (!v.inverse.is_empty() && v.cancellation.is_some() && v.deletion.is_some() && v.replacement.is_some())
            || (!group && (!v.inverse.is_empty() || v.cancellation.is_some() || v.deletion.is_some()
                || v.replacement.is_some() || v.update.is_some() || s.result != Sort::U64
                || v.group.is_some()))
        {
            return Err("maintained view must be a complete group or a word extremum".into());
        }
        let mut signatures = vec![
            (&v.contribution, vec![s.key.clone(), s.row.clone()]),
            (&v.combine, vec![s.result.clone(), s.result.clone()]),
        ];
        if group {
            signatures.push((&v.inverse, vec![s.result.clone()]));
        }
        let word = Sort::U64;
        for (id, want) in signatures {
            let d: Declaration = serde_json::from_value(
                package.knowledge.objects[id].payload["declaration"].clone(),
            )
            .map_err(|e| e.to_string())?;
            if !matches!(d,Declaration::Function{params,result,..} if params.iter().map(|x|x.1.clone()).collect::<Vec<_>>()==want&&result==s.result)
            {
                return Err("maintained group signature".into());
            }
        }
        if let Some(g) = &v.group {
            let d: Declaration = serde_json::from_value(
                package.knowledge.objects.get(g).ok_or("maintained group function missing")?.payload["declaration"].clone(),
            )
            .map_err(|e| e.to_string())?;
            if !matches!(d, Declaration::Function { params, result, .. }
                if params.iter().map(|x| x.1.clone()).collect::<Vec<_>>() == vec![s.key.clone(), s.row.clone()] && result == word)
            {
                return Err("maintained group function signature".into());
            }
        }
        let combine = |a, b| call(&v.combine, vec![a, b]);
        if let Some(choice) = &v.contribution_choice {
            let d: Declaration = serde_json::from_value(
                package.knowledge.objects.get(&choice.function)
                    .ok_or("maintained contribution choice missing")?.payload["declaration"].clone(),
            ).map_err(|e| e.to_string())?;
            if !matches!(d, Declaration::Function { params, result, .. }
                if params.iter().map(|x|x.1.clone()).collect::<Vec<_>>() == vec![s.key.clone(),s.row.clone()]
                    && result == s.result) {
                return Err("maintained contribution choice signature".into());
            }
            context.check(&[("key".into(),s.key.clone()),("row".into(),s.row.clone())], &[],
                &call(&v.contribution, vec![var("key"),var("row")]),
                &call(&choice.function, vec![var("key"),var("row")]),
                &choice.proof).map_err(|e|format!("{}/contribution choice: {e}",v.keep))?;
        }
        if let Some(update) = &v.update {
            let d: Declaration = serde_json::from_value(
                package.knowledge.objects.get(&update.function)
                    .ok_or("maintained update definition missing")?.payload["declaration"].clone(),
            ).map_err(|e| e.to_string())?;
            if !matches!(d, Declaration::Function { params, result, .. }
                if params.iter().map(|x|x.1.clone()).collect::<Vec<_>>() == vec![s.result.clone();3]
                    && result == s.result) {
                return Err("maintained update signature".into());
            }
            let params = ["total", "old", "new"].map(|n|(n.into(),s.result.clone()));
            context.check(&params, &[],
                &combine(combine(var("total"), call(&v.inverse, vec![var("old")])), var("new")),
                &call(&update.function, vec![var("total"),var("old"),var("new")]),
                &update.proof).map_err(|e|format!("{}/update: {e}",v.keep))?;
        }
        if let Some(update) = &v.row_update {
            let d: Declaration = serde_json::from_value(
                package.knowledge.objects.get(&update.function)
                    .ok_or("maintained row update definition missing")?.payload["declaration"].clone(),
            ).map_err(|e| e.to_string())?;
            if !matches!(d, Declaration::Function { params, result, .. }
                if params.iter().map(|x|x.1.clone()).collect::<Vec<_>>()
                    == vec![s.result.clone(),s.key.clone(),s.row.clone(),s.row.clone()]
                    && result == s.result) {
                return Err("maintained row update signature".into());
            }
            let contribution = |row| call(&v.contribution, vec![var("key"),row]);
            context.check(&[
                ("total".into(),s.result.clone()),("key".into(),s.key.clone()),
                ("old".into(),s.row.clone()),("new".into(),s.row.clone()),
            ], &[],
                &combine(combine(var("total"),call(&v.inverse,vec![contribution(var("old"))])),contribution(var("new"))),
                &call(&update.function,vec![var("total"),var("key"),var("old"),var("new")]),
                &update.proof).map_err(|e|format!("{}/row update: {e}",v.keep))?;
        }
        let state: Declaration =
            serde_json::from_value(source.objects[&s.state].payload["declaration"].clone())
                .map_err(|e| e.to_string())?;
        let Declaration::Datatype { constructors } = state else {
            return Err("maintained source state carrier".into());
        };
        let fields = &constructors
            .first()
            .ok_or("maintained source state constructor")?
            .fields;
        if fields.len() != s.bindings.len() {
            return Err("maintained source state bindings".into());
        }
        let mut params = s
            .bindings
            .iter()
            .cloned()
            .zip(fields.iter().cloned())
            .collect::<Vec<_>>();
        let mut factored = vec![var(&s.bindings[s.root])];
        if let Some(parameter) = &s.parameter {
            if params.iter().any(|(n, _)| n == parameter) {
                return Err("maintained grouped parameter binding".into());
            }
            params.push((parameter.clone(), Sort::U64));
            factored.push(var(parameter));
        }
        let goals = [
            (
                "factorisation",
                params,
                Equation {
                    from: s.value.clone(),
                    to: call(fold, factored),
                },
                &v.factorisation,
            ),
            (
                "identity",
                vec![("a".into(), s.result.clone())],
                Equation {
                    from: combine(v.zero.clone(), var("a")),
                    to: var("a"),
                },
                &v.identity,
            ),
            (
                "associativity",
                vec![
                    ("a".into(), s.result.clone()),
                    ("b".into(), s.result.clone()),
                    ("c".into(), s.result.clone()),
                ],
                Equation {
                    from: combine(combine(var("a"), var("b")), var("c")),
                    to: combine(var("a"), combine(var("b"), var("c"))),
                },
                &v.associativity,
            ),
            (
                "commutativity",
                vec![
                    ("a".into(), s.result.clone()),
                    ("b".into(), s.result.clone()),
                ],
                Equation {
                    from: combine(var("a"), var("b")),
                    to: combine(var("b"), var("a")),
                },
                &v.commutativity,
            ),
        ];
        let mut goals = goals.to_vec();
        if let Some(cancellation) = &v.cancellation {
            goals.push((
                "cancellation",
                vec![("a".into(), s.result.clone())],
                Equation {
                    from: combine(call(&v.inverse, vec![var("a")]), var("a")),
                    to: v.zero.clone(),
                },
                cancellation,
            ));
        }
        if let Some(extremum) = &v.extremum {
            let less = Term::Binary { op: "<".into(), left: Box::new(var("a")), right: Box::new(var("b")) };
            let (when_less, otherwise) = match extremum.order {
                Order::Max => (var("b"), var("a")),
                Order::Min => (var("a"), var("b")),
            };
            goals.push((
                "extremum",
                vec![("a".into(), Sort::U64), ("b".into(), Sort::U64)],
                Equation {
                    from: combine(var("a"), var("b")),
                    to: Term::If { condition: Box::new(less), on_true: Box::new(when_less), on_false: Box::new(otherwise) },
                },
                &extremum.proof,
            ));
        }
        for (role, params, eq, proof) in goals {
            context
                .check(&params, &[], &eq.from, &eq.to, proof)
                .map_err(|e| format!("{}/{}: {e}", v.keep, role))?;
        }
        // Per-cell equations of the (grouped) fold, for every group parameter.
        let contribution = |row: Term| {
            let c = call(&v.contribution, vec![var("key"), row.clone()]);
            match &v.group {
                Some(g) => masked(g, c, row, &v.zero),
                None => c,
            }
        };
        let node = |row| Term::Construct {
            datatype: s.rows.clone(),
            constructor: 1,
            arguments: vec![var("key"), row, var("tail")],
        };
        let total = |rows| {
            let mut args = vec![rows];
            if v.group.is_some() {
                args.push(var("group_parameter"));
            }
            call(fold, args)
        };
        let mut params = vec![
            ("key".into(), s.key.clone()),
            ("row".into(), s.row.clone()),
            ("tail".into(), Sort::Data(s.rows.clone())),
        ];
        if v.group.is_some() {
            params.push(("group_parameter".into(), Sort::U64));
        }
        let old = contribution(var("row"));
        let neg = call(&v.inverse, vec![old.clone()]);
        let mut mutation_goals = vec![
            (
                "insertion",
                params.clone(),
                Equation {
                    from: combine(total(var("tail")), old),
                    to: total(node(var("row"))),
                },
                &v.insertion,
            ),
        ];
        if let (Some(deletion), Some(replacement)) = (&v.deletion, &v.replacement) {
            mutation_goals.extend([
            (
                "deletion",
                params.clone(),
                Equation {
                    from: combine(total(node(var("row"))), neg.clone()),
                    to: total(var("tail")),
                },
                deletion,
            ),
            (
                "replacement",
                {
                    let mut p = vec![params[0].clone(), params[1].clone(), ("new".into(), s.row.clone())];
                    p.extend(params[2..].iter().cloned());
                    p
                },
                Equation {
                    from: combine(
                        total(node(var("row"))),
                        combine(neg, contribution(var("new"))),
                    ),
                    to: total(node(var("new"))),
                },
                replacement,
            ),
            ]);
        }
        for (role, params, eq, proof) in mutation_goals {
            context
                .check(&params, &[], &eq.from, &eq.to, proof)
                .map_err(|e| format!("{}/{}: {e}", v.keep, role))?;
        }
        let zero = context.evaluate(&[], &v.zero)?;
        if !matches!(zero, Term::Bool(_) | Term::U64(_)) {
            return Err("maintained zero must be a closed scalar".into());
        }
        zeros.push(zero);
    }
    Ok(CheckedViews {
        package: package.clone(),
        definition,
        subjects: selected.into_iter().map(|x| x.0).collect(),
        zeros,
    })
}
