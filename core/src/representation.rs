//! Source-bound physical representations expressed as canonical knowledge data.
//! Fixed source semantics and general equality checking only. No layout,
//! maintenance algorithm, search pattern or profitability rule lives here.
use crate::{
    action_model::Projection,
    core::CheckedModule,
    definition, library,
    logic::{Branch, Context, Declaration, Equation, Proof, Sort, Term},
    machine::{Obligation, Relation},
    registry::{self, Bundle, Entry, Kind},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-source-representation-v1";
pub const MIGRATION_SEMANTICS: &str = "ink-representation-migration-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Action {
    pub execute: String,
    pub result: Sort,
    pub next: String,
    pub observe: String,
    pub preservation: Vec<Proof>,
    pub observation: Proof,
    /// A proved projection of the public result, without portable logical state.
    /// Checkpoint/restore continue to use the separately proved decode function.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub compact: Option<CompactObservation>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CompactObservation {
    pub observe: String,
    pub result: Sort,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    /// Exact fixed source definitions are part of the entry dependency closure.
    pub source_objects: Vec<String>,
    pub logical_state: Sort,
    pub physical_state: Sort,
    pub encode: String,
    pub decode: String,
    pub relations: Vec<Relation>,
    pub initialisation: Vec<Proof>,
    pub snapshot: Proof,
    pub actions: BTreeMap<String, Action>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub schema: u32,
    pub semantics: String,
    pub input_core_sha256: String,
    pub knowledge: Bundle,
    pub representation: String,
}
#[derive(Clone, Debug)]
pub struct CheckedRepresentation {
    module: CheckedModule,
    projection: Projection,
    request: Request,
    plan: Plan,
    context: Context,
    definition: definition::CheckedDefinition,
    obligations: Vec<Obligation>,
}
impl CheckedRepresentation {
    pub fn module(&self) -> &CheckedModule {
        &self.module
    }
    pub fn projection(&self) -> &Projection {
        &self.projection
    }
    pub fn plan(&self) -> &Plan {
        &self.plan
    }
    pub fn request(&self) -> &Request {
        &self.request
    }
    pub fn definition(&self) -> &definition::CheckedDefinition {
        &self.definition
    }
    pub fn obligations(&self) -> &[Obligation] {
        &self.obligations
    }
    pub fn context(&self) -> &Context {
        &self.context
    }
}
fn v(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(id: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments,
    }
}
fn relation(r: &Relation, physical: Term, logical: Term) -> Equation {
    let args = vec![physical, logical];
    Equation {
        from: call(&r.left, args.clone()),
        to: call(&r.right, args),
    }
}
fn declaration(bundle: &Bundle, id: &str) -> LangResult<Declaration> {
    let e = bundle
        .objects
        .get(id)
        .ok_or("missing representation definition")?;
    if e.semantics != library::SEMANTICS || !matches!(e.kind, Kind::Definition | Kind::Theorem) {
        return Err("representation role must be a mathematical definition".into());
    }
    serde_json::from_value(e.payload["declaration"].clone()).map_err(|e| e.to_string())
}
fn signature(bundle: &Bundle, id: &str) -> LangResult<(Vec<Sort>, Sort)> {
    match declaration(bundle, id)? {
        Declaration::Function { params, result, .. } => {
            Ok((params.into_iter().map(|x| x.1).collect(), result))
        }
        _ => Err("representation role must be an executable function".into()),
    }
}
fn expect(bundle: &Bundle, id: &str, args: &[Sort], result: &Sort) -> LangResult<()> {
    let (actual, r) = signature(bundle, id)?;
    if actual != args || &r != result {
        return Err(format!("representation signature mismatch: {id}"));
    }
    Ok(())
}
fn mathematics(bundle: &Bundle) -> LangResult<Bundle> {
    // Authenticated metadata gives no theorem authority. Only independently
    // checked declarations are projected into the mathematical context.
    let objects: BTreeMap<_, _> = bundle
        .objects
        .iter()
        .filter(|(_, e)| e.semantics == library::SEMANTICS)
        .map(|(i, e)| (i.clone(), e.clone()))
        .collect();
    Ok(Bundle {
        schema: 1,
        snapshot: bundle.snapshot.clone(),
        roots: objects.keys().cloned().collect(),
        membership: bundle
            .membership
            .iter()
            .filter(|(i, _)| objects.contains_key(*i))
            .map(|(i, m)| (i.clone(), m.clone()))
            .collect(),
        objects,
    })
}
fn prove(
    context: &Context,
    goals: &mut Vec<Obligation>,
    role: String,
    params: &[(String, Sort)],
    conditions: &[Equation],
    equation: Equation,
    proof: &Proof,
) -> LangResult<()> {
    context
        .check(params, conditions, &equation.from, &equation.to, proof)
        .map_err(|e| format!("{role}: {e}"))?;
    goals.push(Obligation {
        role,
        params: params.to_vec(),
        conditions: conditions.to_vec(),
        equation,
    });
    Ok(())
}
fn post_state(t: Term) -> Term {
    Term::Match {
        scrutinee: Box::new(t),
        branches: vec![
            Branch {
                bindings: vec![
                    "post_reply".into(),
                    "post_committed".into(),
                    "post_version".into(),
                    "post_rows".into(),
                    "post_events".into(),
                ],
                body: v("post_rows"),
            },
            Branch {
                bindings: vec![
                    "post_host".into(),
                    "post_version".into(),
                    "post_rows".into(),
                ],
                body: v("post_rows"),
            },
        ],
    }
}
/// Fixed standalone observation: reply, commit flag, version and ordered events,
/// or host failure and version. Physical next-state has its own obligation.
fn compact_projection(t: Term, datatype: &str) -> Term {
    let branches = vec![
        (
            vec![
                "compact_reply",
                "compact_commit",
                "compact_version",
                "compact_rows",
                "compact_events",
            ],
            0,
            vec![
                "compact_reply",
                "compact_commit",
                "compact_version",
                "compact_events",
            ],
        ),
        (
            vec!["compact_host", "compact_version", "compact_rows"],
            1,
            vec!["compact_host", "compact_version"],
        ),
    ]
    .into_iter()
    .map(|(bindings, constructor, kept)| Branch {
        bindings: bindings.into_iter().map(String::from).collect(),
        body: Term::Construct {
            datatype: datatype.into(),
            constructor,
            arguments: kept.into_iter().map(v).collect(),
        },
    })
    .collect();
    Term::Match {
        scrutinee: Box::new(t),
        branches,
    }
}
pub fn check(module: &CheckedModule, request: &Request) -> LangResult<CheckedRepresentation> {
    if request.schema != 1
        || request.semantics != SEMANTICS
        || request.input_core_sha256 != module.identity()?
    {
        return Err("representation does not match exact source/semantics".into());
    }
    if registry::canonical(request)?.len() > registry::MAX_VIEW_BYTES {
        return Err("representation byte limit".into());
    }
    registry::CheckedBundle::authenticate(&request.knowledge)?;
    if !request.knowledge.roots.contains(&request.representation) {
        return Err("representation is not a pinned root".into());
    }
    let entry = &request.knowledge.objects[&request.representation];
    if entry.kind != Kind::Representation || entry.semantics != SEMANTICS {
        return Err("incompatible representation entry".into());
    }
    let plan: Plan = serde_json::from_value(entry.payload.clone()).map_err(|e| e.to_string())?;
    // Interface and dependency closure are derived, never trusted search labels.
    if registry::canonical(entry)? != registry::canonical(&plan.entry()?)? {
        return Err("representation interface/dependency mismatch".into());
    }
    let projection = Projection::derive(module)?;
    if plan.logical_state != Sort::Data(projection.state.clone())
        || plan.actions.keys().ne(projection.actions.keys())
    {
        return Err("representation must cover the complete source state and every action".into());
    }
    if plan.source_objects != projection.objects.keys().cloned().collect::<Vec<_>>() {
        return Err("representation source-definition index mismatch".into());
    }
    for (id, expected) in &projection.objects {
        if request.knowledge.objects.get(id).is_none_or(|actual| {
            registry::canonical(actual).ok() != registry::canonical(expected).ok()
        }) {
            return Err("representation is missing exact source definitions".into());
        }
    }
    if plan.relations.is_empty()
        || plan.relations.len() > 8
        || plan.initialisation.len() != plan.relations.len()
        || plan.actions.len() > 32
    {
        return Err("representation relation/action limit or missing initialisation".into());
    }
    if matches!(plan.physical_state, Sort::SelfType) {
        return Err("unresolved physical state".into());
    }
    let math = mathematics(&request.knowledge)?;
    let mut exports = BTreeSet::from([plan.encode.clone(), plan.decode.clone()]);
    for a in plan.actions.values() {
        exports.extend([a.execute.clone(), a.next.clone()]);
        exports.insert(
            a.compact
                .as_ref()
                .map(|c| c.observe.clone())
                .unwrap_or_else(|| a.observe.clone()),
        );
    }
    let (definition, context) =
        definition::check_registry_with_context(&math, &exports.into_iter().collect::<Vec<_>>())?;
    let l = &plan.logical_state;
    let p = &plan.physical_state;
    expect(&math, &plan.encode, &[l.clone()], p)?;
    expect(&math, &plan.decode, &[p.clone()], l)?;
    let mut goals = vec![];
    let mut unique = BTreeSet::new();
    for (i, (r, proof)) in plan.relations.iter().zip(&plan.initialisation).enumerate() {
        if !unique.insert((r.left.clone(), r.right.clone())) {
            return Err("duplicate representation relation".into());
        }
        let (args, result) = signature(&math, &r.left)?;
        if args != [p.clone(), l.clone()] {
            return Err("representation relation signature".into());
        }
        expect(&math, &r.right, &args, &result)?;
        prove(
            &context,
            &mut goals,
            format!("initialisation/{i}"),
            &[("logical".into(), l.clone())],
            &[],
            relation(r, call(&plan.encode, vec![v("logical")]), v("logical")),
            proof,
        )?;
    }
    let params = vec![
        ("physical".into(), p.clone()),
        ("logical".into(), l.clone()),
    ];
    let conditions: Vec<_> = plan
        .relations
        .iter()
        .map(|r| relation(r, v("physical"), v("logical")))
        .collect();
    prove(
        &context,
        &mut goals,
        "snapshot".into(),
        &params,
        &conditions,
        Equation {
            from: call(&plan.decode, vec![v("physical")]),
            to: v("logical"),
        },
        &plan.snapshot,
    )?;
    for (name, a) in &plan.actions {
        let source = &projection.actions[name];
        let mut physical_args = source
            .params
            .iter()
            .map(|x| x.1.clone())
            .collect::<Vec<_>>();
        physical_args[0] = p.clone();
        expect(&math, &a.execute, &physical_args, &a.result)?;
        expect(&math, &a.next, &[a.result.clone()], p)?;
        expect(&math, &a.observe, &[a.result.clone()], &source.result)?;
        if a.preservation.len() != plan.relations.len() {
            return Err("missing action preservation proof".into());
        }
        let mut pa = params.clone();
        pa.extend_from_slice(&source.params[1..]);
        let mut args = vec![v("physical")];
        args.extend(source.params[1..].iter().map(|x| v(&x.0)));
        let executed = call(&a.execute, args);
        let mut args = vec![v("logical")];
        args.extend(source.params[1..].iter().map(|x| v(&x.0)));
        let original = call(&source.function, args);
        prove(
            &context,
            &mut goals,
            format!("{name}/observation"),
            &pa,
            &conditions,
            Equation {
                from: call(&a.observe, vec![executed.clone()]),
                to: original.clone(),
            },
            &a.observation,
        )?;
        if let Some(compact) = &a.compact {
            let Sort::Data(id) = &compact.result else {
                return Err("compact observation requires datatype".into());
            };
            let Sort::Data(original_id) = &source.result else {
                return Err("source observation datatype".into());
            };
            let Declaration::Datatype {
                constructors: original_fields,
            } = declaration(&math, original_id)?
            else {
                return Err("source observation datatype".into());
            };
            let Declaration::Datatype {
                constructors: compact_fields,
            } = declaration(&math, id)?
            else {
                return Err("compact observation datatype".into());
            };
            if original_fields.len() != 2
                || original_fields[0].fields.len() != 5
                || original_fields[1].fields.len() != 3
                || compact_fields.len() != 2
                || compact_fields[0].fields
                    != [0, 1, 2, 4].map(|i| original_fields[0].fields[i].clone())
                || compact_fields[1].fields != [0, 1].map(|i| original_fields[1].fields[i].clone())
            {
                return Err("compact observation interface mismatch".into());
            }
            expect(
                &math,
                &compact.observe,
                &[a.result.clone()],
                &compact.result,
            )?;
            prove(
                &context,
                &mut goals,
                format!("{name}/compact-observation"),
                &pa,
                &conditions,
                Equation {
                    from: call(&compact.observe, vec![executed.clone()]),
                    to: compact_projection(original.clone(), id),
                },
                &compact.proof,
            )?;
        }
        for (i, (r, proof)) in plan.relations.iter().zip(&a.preservation).enumerate() {
            prove(
                &context,
                &mut goals,
                format!("{name}/preservation/{i}"),
                &pa,
                &conditions,
                relation(
                    r,
                    call(&a.next, vec![executed.clone()]),
                    post_state(original.clone()),
                ),
                proof,
            )?;
        }
    }
    // The literal witness and context own everything needed after admission.
    // Release the projected JSON before sealing the public request copy.
    drop(math);
    Ok(CheckedRepresentation {
        module: module.clone(),
        projection,
        request: request.clone(),
        plan,
        context,
        definition,
        obligations: goals,
    })
}
fn references(value: &serde_json::Value, out: &mut BTreeSet<String>) {
    match value {
        serde_json::Value::String(s)
            if s.len() == 64
                && s.bytes()
                    .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c)) =>
        {
            out.insert(s.clone());
        }
        serde_json::Value::Array(xs) => {
            for x in xs {
                references(x, out)
            }
        }
        serde_json::Value::Object(xs) => {
            for x in xs.values() {
                references(x, out)
            }
        }
        _ => {}
    }
}
impl Plan {
    pub fn entry(&self) -> LangResult<Entry> {
        let payload = serde_json::to_value(self).map_err(|e| e.to_string())?;
        let mut deps = BTreeSet::new();
        references(&payload, &mut deps);
        Ok(Entry {
            schema: 1,
            kind: Kind::Representation,
            semantics: SEMANTICS.into(),
            dependencies: deps.into_iter().collect(),
            interface: registry::Interface {
                parameters: BTreeMap::from([(
                    "logical".into(),
                    serde_json::to_value(&self.logical_state).unwrap(),
                )]),
                result: serde_json::to_value(&self.physical_state).unwrap(),
                operations: self.actions.keys().cloned().collect(),
                effects: vec!["source-transitions".into()],
                conditions: vec![],
            },
            payload,
        })
    }
}
/// Optional direct physical migration. The universal decode/encode route needs
/// no new theorem: its two obligations are already sealed by each endpoint.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Migration {
    pub from: String,
    pub to: String,
    pub function: String,
    pub preservation: Vec<Proof>,
}
impl Migration {
    pub fn entry(&self) -> LangResult<Entry> {
        let payload = serde_json::to_value(self).map_err(|e| e.to_string())?;
        let mut deps = BTreeSet::new();
        references(&payload, &mut deps);
        Ok(Entry {
            schema: 1,
            kind: Kind::Bridge,
            semantics: MIGRATION_SEMANTICS.into(),
            dependencies: deps.into_iter().collect(),
            interface: registry::Interface {
                parameters: BTreeMap::new(),
                result: serde_json::Value::Null,
                operations: vec!["migrate".into()],
                effects: vec![],
                conditions: vec![],
            },
            payload,
        })
    }
}
#[derive(Clone, Debug)]
pub struct CheckedMigration {
    obligations: Vec<Obligation>,
    source: String,
    from: String,
    to: String,
    function: String,
    context: Context,
    definition: definition::CheckedDefinition,
}
impl CheckedMigration {
    pub fn obligations(&self) -> &[Obligation] {
        &self.obligations
    }
    pub fn source_identity(&self) -> &str {
        &self.source
    }
    pub fn function(&self) -> &str {
        &self.function
    }
    pub fn context(&self) -> &Context {
        &self.context
    }
    pub fn definition(&self) -> &definition::CheckedDefinition {
        &self.definition
    }
    pub fn endpoints(&self) -> (&str, &str) {
        (&self.from, &self.to)
    }
}
pub fn check_migration(
    from: &CheckedRepresentation,
    to: &CheckedRepresentation,
    bundle: &Bundle,
    root: &str,
) -> LangResult<CheckedMigration> {
    if from.module.identity()? != to.module.identity()? {
        return Err("migration changes source program".into());
    }
    registry::CheckedBundle::check(bundle)?;
    if !bundle.roots.iter().any(|r| r == root) {
        return Err("migration is not a pinned root".into());
    }
    let entry = bundle.objects.get(root).ok_or("missing migration entry")?;
    if entry.kind != Kind::Bridge || entry.semantics != MIGRATION_SEMANTICS {
        return Err("migration entry domain".into());
    }
    let migration: Migration =
        serde_json::from_value(entry.payload.clone()).map_err(|e| e.to_string())?;
    if registry::canonical(entry)? != registry::canonical(&migration.entry()?)?
        || migration.from != from.request.representation
        || migration.to != to.request.representation
    {
        return Err("migration endpoint/interface mismatch".into());
    }
    // Independently pinned endpoints must carry the exact same immutable bytes.
    for endpoint in [from, to] {
        for (id, e) in &endpoint.request.knowledge.objects {
            if bundle
                .objects
                .get(id)
                .is_none_or(|a| registry::canonical(a).ok() != registry::canonical(e).ok())
            {
                return Err("migration missing pinned endpoint closure".into());
            }
        }
    }
    let math = mathematics(bundle)?;
    let (definition, context) =
        definition::check_registry_with_context(&math, &[migration.function.clone()])?;
    expect(
        &math,
        &migration.function,
        &[from.plan.physical_state.clone()],
        &to.plan.physical_state,
    )?;
    if migration.preservation.len() != to.plan.relations.len() {
        return Err("missing migration preservation".into());
    }
    let params = vec![
        ("physical".into(), from.plan.physical_state.clone()),
        ("logical".into(), from.plan.logical_state.clone()),
    ];
    let conditions: Vec<_> = from
        .plan
        .relations
        .iter()
        .map(|r| relation(r, v("physical"), v("logical")))
        .collect();
    let mut goals = vec![];
    for (i, (r, proof)) in to
        .plan
        .relations
        .iter()
        .zip(&migration.preservation)
        .enumerate()
    {
        prove(
            &context,
            &mut goals,
            format!("migration/{i}"),
            &params,
            &conditions,
            relation(
                r,
                call(&migration.function, vec![v("physical")]),
                v("logical"),
            ),
            proof,
        )?;
    }
    Ok(CheckedMigration {
        obligations: goals,
        source: from.module.identity()?,
        from: migration.from,
        to: migration.to,
        function: migration.function,
        context,
        definition,
    })
}
