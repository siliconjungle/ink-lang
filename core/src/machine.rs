//! Sequential state refinement from checked, database-defined functions.
//! Relations and algorithms are package data. Protocol control, lowering and
//! the backend remain trusted; no source-action correspondence is implicit.
use crate::{
    library::{self, Bundle, Object},
    logic::{Context, Declaration, Equation, Proof, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-relational-machine-v1";
pub const OBSERVATIONS: &str = "first-order-sequential-state-values-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Relation {
    pub left: String,
    pub right: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Operation {
    pub name: String,
    pub logical_step: String,
    pub physical_step: String,
    pub logical_reply: String,
    pub physical_reply: String,
    pub preservation: Vec<Proof>,
    pub reply: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Query {
    pub name: String,
    pub logical: String,
    pub physical: String,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub observations: String,
    pub bundle_sha256: String,
    pub logical_state: Sort,
    pub physical_state: Sort,
    pub encode: String,
    pub decode: String,
    pub relations: Vec<Relation>,
    pub initialisation: Vec<Proof>,
    pub snapshot: Proof,
    pub operations: Vec<Operation>,
    pub queries: Vec<Query>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Obligation {
    pub role: String,
    pub params: Vec<(String, Sort)>,
    pub conditions: Vec<Equation>,
    pub equation: Equation,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(id: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments: args,
    }
}
fn identifier(n: &str) -> LangResult<()> {
    if n.is_empty() || n.len() > 64 || !n.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_') {
        return Err("invalid machine entry name".into());
    }
    Ok(())
}
struct Checker<'a> {
    objects: BTreeMap<String, Object>,
    roots: &'a [String],
    context: Context,
    goals: Vec<Obligation>,
}
impl Checker<'_> {
    fn signature(&self, id: &str) -> LangResult<(Vec<Sort>, Sort)> {
        if !self.roots.iter().any(|r| r == id) {
            return Err("machine role is not a public library root".into());
        }
        match &self
            .objects
            .get(id)
            .ok_or("missing machine role")?
            .declaration
        {
            Declaration::Function { params, result, .. } => {
                Ok((params.iter().map(|p| p.1.clone()).collect(), result.clone()))
            }
            _ => Err("machine role must be a checked function".into()),
        }
    }
    fn expect(&self, id: &str, args: &[Sort], result: &Sort) -> LangResult<()> {
        let (actual, r) = self.signature(id)?;
        if actual != args || &r != result {
            return Err("machine role signature mismatch".into());
        }
        Ok(())
    }
    fn pair(
        &self,
        logical: &str,
        physical: &str,
        l: &Sort,
        p: &Sort,
    ) -> LangResult<(Vec<Sort>, Sort)> {
        let (params, result) = self.signature(logical)?;
        if params.first() != Some(l) || params.len() > 64 {
            return Err("logical machine entry signature mismatch".into());
        }
        let args = &params[1..];
        let mut expected = vec![p.clone()];
        expected.extend_from_slice(args);
        self.expect(physical, &expected, &result)?;
        Ok((args.to_vec(), result))
    }
    fn prove(
        &mut self,
        role: String,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: Term,
        to: Term,
        proof: &Proof,
    ) -> LangResult<()> {
        self.context
            .check(params, conditions, &from, &to, proof)
            .map_err(|e| format!("{role}: {e}"))?;
        self.goals.push(Obligation {
            role,
            params: params.to_vec(),
            conditions: conditions.to_vec(),
            equation: Equation { from, to },
        });
        Ok(())
    }
}
fn params(package: &Package, args: &[Sort]) -> Vec<(String, Sort)> {
    let mut p = vec![
        ("logical".into(), package.logical_state.clone()),
        ("physical".into(), package.physical_state.clone()),
    ];
    p.extend(
        args.iter()
            .enumerate()
            .map(|(i, s)| (format!("arg{i}"), s.clone())),
    );
    p
}
fn arguments(state: Term, count: usize) -> Vec<Term> {
    let mut a = vec![state];
    a.extend((0..count).map(|i| var(&format!("arg{i}"))));
    a
}
fn relation(r: &Relation, physical: Term, logical: Term) -> Equation {
    let a = vec![physical, logical];
    Equation {
        from: call(&r.left, a.clone()),
        to: call(&r.right, a),
    }
}
/// Every relation clause is an equality between two checked functions of
/// (physical,logical). No application condition is assumed at initialisation;
/// later obligations use only the relation established by this sealed protocol.
/// The backend receives this immutable admission witness, never an assumed relation.
#[derive(Debug)]
pub struct CheckedMachine {
    package: Package,
    definition: crate::definition::CheckedDefinition,
    obligations: Vec<Obligation>,
    op_signatures: Vec<(Vec<Sort>, Sort)>,
    query_signatures: Vec<(Vec<Sort>, Sort)>,
}
impl CheckedMachine {
    pub fn package(&self) -> &Package {
        &self.package
    }
    pub fn definition(&self) -> &crate::definition::CheckedDefinition {
        &self.definition
    }
    pub fn obligations(&self) -> &[Obligation] {
        &self.obligations
    }
    pub fn operations(&self) -> &[(Vec<Sort>, Sort)] {
        &self.op_signatures
    }
    pub fn queries(&self) -> &[(Vec<Sort>, Sort)] {
        &self.query_signatures
    }
}
pub fn check(bundle: &Bundle, package: &Package) -> LangResult<CheckedMachine> {
    let library = library::load_bundle(bundle)?;
    if package.schema != 1 || package.semantics != SEMANTICS || package.observations != OBSERVATIONS
    {
        return Err("incompatible machine semantics".into());
    }
    let pin = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(bundle).map_err(|e| e.to_string())?)
    );
    if pin != package.bundle_sha256 {
        return Err("machine bundle identity mismatch".into());
    }
    if package.relations.len() > 8
        || package.operations.len() > 16
        || package.queries.len() > 16
        || package.initialisation.len() != package.relations.len()
    {
        return Err("machine package count limit or missing initialisation proof".into());
    }
    let count = 1
        + package.relations.len()
        + package.operations.len() * (package.relations.len() + 1)
        + package.queries.len();
    if count > 128 {
        return Err("machine proof obligation limit".into());
    }
    let objects = bundle
        .objects
        .iter()
        .map(|(id, raw)| {
            Ok((
                id.clone(),
                serde_json::from_str::<Object>(raw).map_err(|e| e.to_string())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let mut checker = Checker {
        objects,
        roots: &bundle.lock.objects,
        context: library.context,
        goals: Vec::new(),
    };
    let l = &package.logical_state;
    let p = &package.physical_state;
    // SelfType cannot escape datatype fields; the proof checker also validates
    // all actual parameter sorts and direct-import visibility.
    if matches!(l, Sort::SelfType) || matches!(p, Sort::SelfType) {
        return Err("unresolved machine sort".into());
    }
    checker.expect(&package.encode, &[l.clone()], p)?;
    checker.expect(&package.decode, &[p.clone()], l)?;
    let mut clauses = BTreeSet::new();
    for r in &package.relations {
        if !clauses.insert((r.left.clone(), r.right.clone())) {
            return Err("duplicate machine relation clause".into());
        }
        let (s, result) = checker.signature(&r.left)?;
        if s != [p.clone(), l.clone()] {
            return Err("machine relation signature mismatch".into());
        }
        checker.expect(&r.right, &s, &result)?;
    }
    let initial_params = vec![("logical".into(), l.clone())];
    for (i, (r, proof)) in package
        .relations
        .iter()
        .zip(&package.initialisation)
        .enumerate()
    {
        let eq = relation(
            r,
            call(&package.encode, vec![var("logical")]),
            var("logical"),
        );
        checker.prove(
            format!("initialisation/{i}"),
            &initial_params,
            &[],
            eq.from,
            eq.to,
            proof,
        )?;
    }
    let conditions: Vec<_> = package
        .relations
        .iter()
        .map(|r| relation(r, var("physical"), var("logical")))
        .collect();
    checker.prove(
        "snapshot".into(),
        &params(package, &[]),
        &conditions,
        call(&package.decode, vec![var("physical")]),
        var("logical"),
        &package.snapshot,
    )?;
    let mut exports = BTreeSet::from([package.encode.clone(), package.decode.clone()]);
    let mut op_signatures = Vec::new();
    let mut names = BTreeSet::new();
    for op in &package.operations {
        identifier(&op.name)?;
        if !names.insert(&op.name) || op.preservation.len() != package.relations.len() {
            return Err("duplicate machine operation or missing preservation proof".into());
        }
        let (logical_params, logical_result) = checker.signature(&op.logical_step)?;
        if logical_params.first() != Some(l) || &logical_result != l || logical_params.len() > 63 {
            return Err("logical step signature mismatch".into());
        }
        let args = &logical_params[1..];
        let mut physical_params = vec![p.clone()];
        physical_params.extend_from_slice(args);
        checker.expect(&op.physical_step, &physical_params, p)?;
        let (reply_args, reply_result) =
            checker.pair(&op.logical_reply, &op.physical_reply, l, p)?;
        if reply_args != args {
            return Err("step/reply argument mismatch".into());
        }
        let pa = params(package, args);
        for (i, (r, proof)) in package.relations.iter().zip(&op.preservation).enumerate() {
            let eq = relation(
                r,
                call(&op.physical_step, arguments(var("physical"), args.len())),
                call(&op.logical_step, arguments(var("logical"), args.len())),
            );
            checker.prove(
                format!("{}/preservation/{i}", op.name),
                &pa,
                &conditions,
                eq.from,
                eq.to,
                proof,
            )?;
        }
        checker.prove(
            format!("{}/reply", op.name),
            &pa,
            &conditions,
            call(&op.physical_reply, arguments(var("physical"), args.len())),
            call(&op.logical_reply, arguments(var("logical"), args.len())),
            &op.reply,
        )?;
        exports.insert(op.physical_step.clone());
        exports.insert(op.physical_reply.clone());
        op_signatures.push((args.to_vec(), reply_result));
    }
    let mut query_signatures = Vec::new();
    names.clear();
    for q in &package.queries {
        identifier(&q.name)?;
        if !names.insert(&q.name) {
            return Err("duplicate machine query".into());
        }
        let (args, result) = checker.pair(&q.logical, &q.physical, l, p)?;
        if args.len() > 62 {
            return Err("machine query argument limit".into());
        }
        checker.prove(
            format!("{}/query", q.name),
            &params(package, &args),
            &conditions,
            call(&q.physical, arguments(var("physical"), args.len())),
            call(&q.logical, arguments(var("logical"), args.len())),
            &q.proof,
        )?;
        exports.insert(q.physical.clone());
        query_signatures.push((args, result));
    }
    let definition =
        crate::definition::check(bundle, &exports.into_iter().collect::<Vec<_>>(), None)?;
    Ok(CheckedMachine {
        package: package.clone(),
        definition,
        obligations: checker.goals,
        op_signatures,
        query_signatures,
    })
}
