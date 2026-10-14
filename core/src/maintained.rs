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
    pub inverse: String,
    pub zero: Term,
    pub factorisation: Proof,
    pub identity: Proof,
    pub associativity: Proof,
    pub commutativity: Proof,
    pub cancellation: Proof,
    pub insertion: Proof,
    pub deletion: Proof,
    pub replacement: Proof,
    /// Optional database implementation of the group replacement operation.
    /// Admission checks it for arbitrary totals and contributions, not a profile.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub update: Option<Update>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contribution_choice: Option<Update>,
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
pub fn fold(subject: &Subject, view: &View) -> Declaration {
    Declaration::Function {
        params: vec![("rows".into(), Sort::Data(subject.rows.clone()))],
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
                    body: call(
                        &view.combine,
                        vec![
                            call(&view.contribution, vec![var("key"), var("row")]),
                            Term::SelfCall(vec![var("tail")]),
                        ],
                    ),
                },
            ],
        },
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
        let declaration = fold(&s, view);
        let dependencies = vec![
            s.rows.clone(),
            view.contribution.clone(),
            view.combine.clone(),
        ];
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
            view.inverse.clone(),
            s.query.clone(),
        ]);
        if let Some(update) = &view.update {
            exports.insert(update.function.clone());
        }
        if let Some(choice) = &view.contribution_choice {
            exports.insert(choice.function.clone());
        }
        selected.push((s, id));
    }
    let (definition, context) = definition::check_registry_with_context(
        &package.knowledge,
        &exports.into_iter().collect::<Vec<_>>(),
    )?;
    let mut zeros = vec![];
    for ((s, fold), v) in selected.iter().zip(&package.views) {
        let signatures = [
            (&v.contribution, vec![s.key.clone(), s.row.clone()]),
            (&v.combine, vec![s.result.clone(), s.result.clone()]),
            (&v.inverse, vec![s.result.clone()]),
        ];
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
        let params = s
            .bindings
            .iter()
            .cloned()
            .zip(fields.iter().cloned())
            .collect::<Vec<_>>();
        let goals = [
            (
                "factorisation",
                params,
                Equation {
                    from: s.value.clone(),
                    to: call(fold, vec![var(&s.bindings[s.root])]),
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
            (
                "cancellation",
                vec![("a".into(), s.result.clone())],
                Equation {
                    from: combine(call(&v.inverse, vec![var("a")]), var("a")),
                    to: v.zero.clone(),
                },
                &v.cancellation,
            ),
        ];
        for (role, params, eq, proof) in goals {
            context
                .check(&params, &[], &eq.from, &eq.to, proof)
                .map_err(|e| format!("{}/{}: {e}", v.keep, role))?;
        }
        let contribution = |row| call(&v.contribution, vec![var("key"), row]);
        let node = |row| Term::Construct {
            datatype: s.rows.clone(),
            constructor: 1,
            arguments: vec![var("key"), row, var("tail")],
        };
        let total = |rows| call(fold, vec![rows]);
        let params = vec![
            ("key".into(), s.key.clone()),
            ("row".into(), s.row.clone()),
            ("tail".into(), Sort::Data(s.rows.clone())),
        ];
        let old = contribution(var("row"));
        let neg = call(&v.inverse, vec![old.clone()]);
        let mutation_goals = [
            (
                "insertion",
                params.clone(),
                Equation {
                    from: combine(total(var("tail")), old),
                    to: total(node(var("row"))),
                },
                &v.insertion,
            ),
            (
                "deletion",
                params.clone(),
                Equation {
                    from: combine(total(node(var("row"))), neg.clone()),
                    to: total(var("tail")),
                },
                &v.deletion,
            ),
            (
                "replacement",
                vec![
                    params[0].clone(),
                    params[1].clone(),
                    ("new".into(), s.row.clone()),
                    params[2].clone(),
                ],
                Equation {
                    from: combine(
                        total(node(var("row"))),
                        combine(neg, contribution(var("new"))),
                    ),
                    to: total(node(var("new"))),
                },
                &v.replacement,
            ),
        ];
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
