//! Bounded authoring of external laws. One source form, `law`, covers
//! concrete and general laws (type parameters, function parameters,
//! conditions, quantified assumptions and proofs); `rewrite` is its concrete
//! special case. This constructs ordinary kernel laws and proofs and checks
//! them; source labels and tactic spellings confer no authority.
use crate::{
    check,
    core::{CheckedModule, Expr, Function, Type},
    definition_context::DefinitionContext,
    law_syntax::{HypothesisRef, LawDecl, Tactic},
    laws::{self, Assumption, Catalogue, CheckedCatalogue, Equation, Instance, Law, Proof},
    registry::{self, Bundle, CheckedBundle, Entry},
    semantic::{self as s, Env, Node, Sort, Term},
    syntax::{LawSource, Program},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub proof: Proof,
    #[serde(default)]
    pub conditions: Vec<Equation>,
}
#[derive(Debug)]
pub struct Authored {
    pub bundle: Bundle,
    pub names: BTreeMap<String, String>,
}
fn dependencies(
    proof: &Proof,
    out: &mut BTreeSet<String>,
    budget: &mut s::Budget,
    depth: usize,
) -> LangResult<()> {
    budget.step(depth)?;
    match proof {
        Proof::Use {
            law,
            premises,
            assumptions,
            ..
        } => {
            out.insert(law.clone());
            for p in premises.iter().chain(assumptions) {
                dependencies(p, out, budget, depth + 1)?;
            }
        }
        Proof::Assume { premises, .. } => {
            for p in premises {
                dependencies(p, out, budget, depth + 1)?;
            }
        }
        Proof::Sym(p) => dependencies(p, out, budget, depth + 1)?,
        Proof::Trans { left, right, .. } => {
            dependencies(left, out, budget, depth + 1)?;
            dependencies(right, out, budget, depth + 1)?;
        }
        Proof::Congruence(ps) => {
            for p in ps {
                dependencies(p, out, budget, depth + 1)?;
            }
        }
        Proof::Forall { body, .. } | Proof::Order { body, .. } => {
            dependencies(body, out, budget, depth + 1)?
        }
        Proof::MapExtensional { presence, values, .. } => {
            dependencies(presence, out, budget, depth + 1)?;
            dependencies(values, out, budget, depth + 1)?;
        }
        Proof::Cases {
            on_false, on_true, ..
        } => {
            dependencies(on_false, out, budget, depth + 1)?;
            dependencies(on_true, out, budget, depth + 1)?;
        }
        Proof::Induction { base, step, .. } | Proof::GeneralizedInduction { base, step, .. } => {
            dependencies(base, out, budget, depth + 1)?;
            dependencies(step, out, budget, depth + 1)?;
        }
        Proof::Variants { first, second, .. } => {
            dependencies(first, out, budget, depth + 1)?;
            dependencies(second, out, budget, depth + 1)?;
        }
        Proof::AssertEquality { premise, body, .. } => {
            dependencies(premise, out, budget, depth + 1)?;
            dependencies(body, out, budget, depth + 1)?;
        }
        Proof::BitVector { .. } | Proof::Word { .. } | Proof::Linear { .. } | Proof::Normalize | Proof::Unfold | Proof::Hypothesis(_) | Proof::GeneralizedHypothesis { .. } => {}
    }
    Ok(())
}
fn callees(
    t: &s::Term,
    p: &Program,
    out: &mut BTreeSet<String>,
    b: &mut s::Budget,
    d: usize,
) -> LangResult<()> {
    b.step(d)?;
    if let s::Node::Op(n, _) = &t.node {
        if let Some(n) = n.strip_prefix("call:") {
            if p.functions.iter().any(|f| f.name == n) {
                out.insert(n.into());
            }
        }
    }
    for t in s::children(t) {
        callees(t, p, out, b, d + 1)?;
    }
    Ok(())
}
/// Authored source is separate from executable application admission. External
/// proof inputs retain the existing kernel representation, dependency checks,
/// applicability conditions and resource bounds.
pub fn compile(
    program: Program,
    evidence: BTreeMap<String, Evidence>,
    dependencies_bundle: Option<&Bundle>,
) -> LangResult<Authored> {
    compile_source(
        LawSource {
            program,
            laws: vec![],
        },
        evidence,
        dependencies_bundle,
    )
}
/// Check every `rewrite` and `law` declaration of an external law source and
/// emit them as one bundle. Declarations may use earlier ones by name.
pub fn compile_source(
    source: LawSource,
    mut evidence: BTreeMap<String, Evidence>,
    dependencies_bundle: Option<&Bundle>,
) -> LangResult<Authored> {
    let LawSource {
        mut program,
        laws: declared,
    } = source;
    let rules = std::mem::take(&mut program.rules);
    // Module labels are authoring namespaces, not executable identifiers or proof meaning.
    program.module.clear();
    let total = rules.len() + declared.len();
    if total == 0 || total > 64 || evidence.len() > 64 {
        return Err(
            "law authoring requires 1..64 declarations and at most 64 evidence entries".into(),
        );
    }
    if !program.actions.is_empty()
        || !program.states.is_empty()
        || !program.keeps.is_empty()
        || !program.events.is_empty()
    {
        return Err("law authoring source contains executable state or effects".into());
    }
    crate::core::validate_value_groups(
        rules
            .iter()
            .map(|r| (r.params.as_slice(), vec![&r.from, &r.to])),
    )?;
    let module = CheckedModule::from_source(program)?;
    let p = module.program();
    // A rewrite is the concrete special case of a law.
    let mut decls = vec![];
    for r in rules {
        let proof = match r.tactic.as_str() {
            "normalize" => Tactic::Normalize,
            "provided" => Tactic::Provided,
            other => return Err(format!("unsupported or ambiguous authoring tactic {other}")),
        };
        decls.push(LawDecl {
            name: r.name,
            types: vec![],
            params: r.params.into_iter().map(|(n, t)| (n, s::value(t))).collect(),
            requires: vec![],
            assumes: vec![],
            from: r.from,
            to: r.to,
            proof,
        });
    }
    decls.extend(declared);
    let mut catalogue = if let Some(bundle) = dependencies_bundle {
        CheckedBundle::check(bundle)?.catalogue()?
    } else {
        Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        }
    };
    catalogue.roots.clear();
    let mut names = BTreeMap::new();
    let mut orders = BTreeMap::new();
    let mut budget = s::Budget::new();
    for decl in decls {
        if names.contains_key(&decl.name) {
            return Err(format!("duplicate authored law {}", decl.name));
        }
        let law = author(&module, &decl, &mut evidence, &catalogue, &names, &orders, &mut budget)
            .map_err(|e| format!("law {}: {e}", decl.name))?;
        let id = registry::identity(&Entry::from_law(&law)?)?;
        catalogue.objects.insert(id.clone(), law);
        // Check each declaration as it is added, so failures name it.
        CheckedCatalogue::check(
            &Catalogue {
                roots: vec![id.clone()],
                ..catalogue.clone()
            },
            p,
        )
        .map_err(|e| format!("law {}: {e}", decl.name))?;
        catalogue.roots.push(id.clone());
        orders.insert(
            decl.name.clone(),
            decl.params.iter().map(|(n, _)| n.clone()).collect::<Vec<_>>(),
        );
        names.insert(decl.name, id);
    }
    if !evidence.is_empty() {
        return Err("unused proof evidence label".into());
    }
    catalogue.roots.sort();
    catalogue.roots.dedup();
    CheckedCatalogue::check(&catalogue, p)?;
    Ok(Authored {
        bundle: registry::from_catalogue(&catalogue)?,
        names,
    })
}

/// Prepare an unproved scalar obligation from the same source elaboration used
/// for admission. This never returns a catalogue or an admitted law.
pub fn source_bitvector_problem(source:LawSource,name:&str)->LangResult<crate::bitproof::Problem>{
    Ok(source_bitvector_obligation(source,name)?.problem)
}
pub struct ScalarObligation {
    pub problem:crate::bitproof::Problem,
    pub condition_count:usize,
}
pub fn source_bitvector_obligation(source:LawSource,name:&str)->LangResult<ScalarObligation>{
    let LawSource{mut program,laws}=source;
    if laws.is_empty() || laws.len()>64{return Err("source bit obligation needs 1..64 law declarations".into());}
    if !program.rules.is_empty() || !program.actions.is_empty() || !program.states.is_empty() || !program.keeps.is_empty() || !program.events.is_empty(){
        return Err("source bit obligation requires a pure external law module".into());
    }
    let mut found=laws.iter().filter(|d|d.name==name);
    let mut decl=found.next().ok_or("unknown source law")?.clone();
    if found.next().is_some(){return Err("duplicate source law name".into());}
    if !decl.types.is_empty() || !decl.assumes.is_empty(){return Err("source bit obligation does not export quantified type parameters or assumptions".into());}
    // Export checks meanings and types; proof search remains external. The
    // ordinary compile_source path still replays the supplied proof afterwards.
    decl.proof=Tactic::Normalize;program.module.clear();
    let module=CheckedModule::from_source(program)?;
    let catalogue=Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()};
    let law=author(&module,&decl,&mut BTreeMap::new(),&catalogue,&BTreeMap::new(),&BTreeMap::new(),&mut s::Budget::new())?;
    let condition_count=law.conditions.len();
    let problem=laws::bitvector_problem(module.program(),&law.params,&law.conditions,&Equation{from:law.from,to:law.to})?;
    Ok(ScalarObligation{problem,condition_count})
}

/// A function parameter, elaborated through a signature-only helper whose
/// calls become applications of the parameter.
struct FnParam {
    sort: Sort,
    inputs: Vec<Type>,
    helper: String,
}
const HELPER: &str = "__law_fn_";
/// Elaboration scope of one law: its helper module plus signature-only
/// declarations for type and function parameters. Never checked as a module.
struct Scope<'a> {
    p: &'a Program,
    aug: Program,
    fns: BTreeMap<String, FnParam>,
    fresh: std::cell::Cell<usize>,
}
fn arrows(sort: &Sort) -> LangResult<(Vec<Type>, Type)> {
    let mut inputs = vec![];
    let mut at = sort;
    loop {
        match at {
            Sort::Arrow(a, c) => {
                let Sort::Value(t) = &**a else {
                    return Err("function parameters take values".into());
                };
                inputs.push(t.clone());
                at = c;
            }
            Sort::Value(t) => return Ok((inputs, t.clone())),
            Sort::Nat => return Err("invalid law sort".into()),
        }
    }
}
impl<'a> Scope<'a> {
    fn new(p: &'a Program, types: &[String], params: &[(String, Sort)]) -> LangResult<Self> {
        let mut aug = p.clone();
        for t in types {
            if t.is_empty()
                || !t.as_bytes()[0].is_ascii_alphabetic()
                || !t.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_')
                || aug.ids.contains(t)
                || aug.records.contains_key(t)
                || aug.enums.contains_key(t)
            {
                return Err(format!("type parameter {t} is invalid or collides with a declared type"));
            }
            aug.ids.push(t.clone());
        }
        let mut fns = BTreeMap::new();
        for (name, sort) in params {
            if let Sort::Arrow(..) = sort {
                let (inputs, output) = arrows(sort)?;
                let helper = format!("{HELPER}{name}");
                if aug.functions.iter().any(|f| f.name == helper) {
                    return Err("generated helper name collision".into());
                }
                aug.functions.push(Function {
                    name: helper.clone(),
                    params: inputs
                        .iter()
                        .enumerate()
                        .map(|(i, t)| (format!("a{i}"), t.clone()))
                        .collect(),
                    result: output.clone(),
                    body: Expr::Unit,
                });
                fns.insert(
                    name.clone(),
                    FnParam {
                        sort: sort.clone(),
                        inputs,
                        helper,
                    },
                );
            }
        }
        Ok(Self {
            p,
            aug,
            fns,
            fresh: std::cell::Cell::new(0),
        })
    }
    /// Calls of function parameters go to their helpers; partial and bare
    /// uses are eta-expanded. Lambda and let binders shadow parameters.
    fn transform(&self, e: &Expr, shadow: &mut Vec<String>) -> LangResult<Expr> {
        let shadowed=matches!(e,Expr::Call(name,_) if shadow.contains(name)||self.fns.contains_key(name)||self.aug.functions.iter().any(|f|&f.name==name));
        if !shadowed {
            let prefix=loop {
                let index=self.fresh.get();self.fresh.set(index+1);
                let prefix=format!("__law_collection_{index}");
                let mut collision=shadow.iter().any(|name|name.starts_with(&prefix));
                crate::analysis::walk(e,|e|match e{Expr::Var(n)|Expr::Lambda(n,_)|Expr::Let(n,_,_,_)=>collision|=n.starts_with(&prefix),_=>()});
                if !collision{break prefix;}
            };
            if let Some(lowered)=crate::contracts::collections::lower(e,&prefix)? {
                return self.transform(&lowered,shadow);
            }
        }
        let visible = |n: &str, shadow: &Vec<String>| {
            !shadow.iter().any(|x| x == n) && self.fns.contains_key(n)
        };
        Ok(match e {
            Expr::Var(n) if visible(n, shadow) => self.eta(n, vec![])?,
            Expr::Call(n, args) if visible(n, shadow) => {
                let args = args
                    .iter()
                    .map(|a| self.transform(a, shadow))
                    .collect::<LangResult<Vec<_>>>()?;
                let f = &self.fns[n];
                if args.len() > f.inputs.len() {
                    return Err(format!("{n} applied to too many arguments"));
                }
                if args.len() == f.inputs.len() {
                    Expr::Call(f.helper.clone(), args)
                } else {
                    self.eta(n, args)?
                }
            }
            Expr::Lambda(x, body) => {
                shadow.push(x.clone());
                let body = self.transform(body, shadow);
                shadow.pop();
                Expr::Lambda(x.clone(), Box::new(body?))
            }
            Expr::Let(x, t, a, body) => {
                let a = self.transform(a, shadow)?;
                shadow.push(x.clone());
                let body = self.transform(body, shadow);
                shadow.pop();
                Expr::Let(x.clone(), t.clone(), Box::new(a), Box::new(body?))
            }
            Expr::Call(n, args) => Expr::Call(
                n.clone(),
                args.iter()
                    .map(|a| self.transform(a, shadow))
                    .collect::<LangResult<_>>()?,
            ),
            Expr::Method(r, m, args) => Expr::Method(
                Box::new(self.transform(r, shadow)?),
                m.clone(),
                args.iter()
                    .map(|a| self.transform(a, shadow))
                    .collect::<LangResult<_>>()?,
            ),
            // External law bodies do not pass through executable surface
            // elaboration. Their currently admitted floating domain is F32;
            // preserve its canonical division spelling after the parser became
            // width-neutral. Binary64 proof terms remain explicitly unsupported
            // by semantic admission, rather than borrowing F32 rewrite rules.
            Expr::Binary(o, a, b) if o == "/" => Expr::Call(
                "f32_div".into(),
                vec![self.transform(a, shadow)?, self.transform(b, shadow)?],
            ),
            Expr::Binary(o, a, b) => Expr::Binary(
                o.clone(),
                Box::new(self.transform(a, shadow)?),
                Box::new(self.transform(b, shadow)?),
            ),
            Expr::Neg(a) => Expr::Neg(Box::new(self.transform(a, shadow)?)),
            Expr::Field(a, f) => Expr::Field(Box::new(self.transform(a, shadow)?), f.clone()),
            Expr::Try(a) => Expr::Try(Box::new(self.transform(a, shadow)?)),
            Expr::Record(n, fs) => Expr::Record(
                n.clone(),
                fs.iter()
                    .map(|(f, a)| Ok((f.clone(), self.transform(a, shadow)?)))
                    .collect::<LangResult<_>>()?,
            ),
            other => other.clone(),
        })
    }
    fn eta(&self, n: &str, given: Vec<Expr>) -> LangResult<Expr> {
        let f = &self.fns[n];
        let mut args = given;
        let mut names = vec![];
        for _ in args.len()..f.inputs.len() {
            let k = self.fresh.get();
            self.fresh.set(k + 1);
            let x = format!("__law_eta{k}");
            names.push(x.clone());
            args.push(Expr::Var(x));
        }
        let mut e = Expr::Call(f.helper.clone(), args);
        for x in names.into_iter().rev() {
            e = Expr::Lambda(x, Box::new(e));
        }
        Ok(e)
    }
    /// Helper calls back to applications of the function parameter.
    fn post(&self, t: &Term, b: &mut s::Budget, d: usize) -> LangResult<Term> {
        b.step(d)?;
        if let Node::Op(n, args) = &t.node {
            if let Some(name) = n.strip_prefix("call:").and_then(|h| h.strip_prefix(HELPER)) {
                let f = self.fns.get(name).ok_or("unknown function parameter helper")?;
                let mut out = s::free(f.sort.clone(), name);
                for a in args {
                    let a = self.post(a, b, d + 1)?;
                    let Sort::Arrow(_, result) = out.sort.clone() else {
                        return Err("function parameter arity".into());
                    };
                    out = s::op(*result, "apply", vec![out, a]);
                }
                return Ok(out);
            }
        }
        s::try_map_children(t, |c| self.post(c, b, d + 1))
    }
    fn value(&self, e: &Expr, env: &check::Env, want: Option<&Type>) -> LangResult<(Term, Type)> {
        let e = self.resolved(e, env)?;
        let e = self.transform(&e, &mut vec![])?;
        let ty = match want {
            Some(t) => check::infer_as(&e, env, &self.aug, t)?,
            None => check::infer(&e, env, &self.aug)?,
        };
        let t = s::elaborate(&e, env, &self.aug, &ty)?;
        Ok((self.post(&t, &mut s::Budget::new(), 0)?, ty))
    }
    fn pair(&self, a: &Expr, c: &Expr, env: &check::Env) -> LangResult<Equation> {
        let (from, ty) = self.value(a, env, None)?;
        let (to, _) = self.value(c, env, Some(&ty))?;
        Ok(Equation { from, to })
    }
    /// `a == b` is an equation; any other condition is a Bool fact.
    fn condition(&self, e: &Expr, env: &check::Env) -> LangResult<Equation> {
        let e=self.resolved(e,env)?;
        let e=self.transform(&e,&mut vec![])?;
        match &e {
            Expr::Binary(o, a, c) if o == "==" => self.pair(a, c, env),
            e => {
                let (from, _) = self.value(e, env, Some(&Type::Bool))?;
                Ok(Equation {
                    from,
                    to: s::term(s::value(Type::Bool), Node::Bool(true)),
                })
            }
        }
    }
    fn resolved(&self,e:&Expr,env:&check::Env)->LangResult<Expr> {
        let mut e=e.clone();
        let declared=self.aug.functions.iter().map(|f|f.name.clone()).chain(self.fns.keys().cloned()).collect();
        crate::contracts::collections::resolve_expression(&mut e,&declared,&env.keys().cloned().collect())?;
        Ok(e)
    }
    /// An argument for a parameter of the given sort. Function arguments are
    /// lambdas (curried or `fn(a, b) =>`), function parameters in scope, or
    /// named helper functions.
    fn argument(&self, e: &Expr, want: &Sort, env: &check::Env) -> LangResult<Term> {
        let Sort::Arrow(..) = want else {
            let Sort::Value(t) = want else {
                return Err("invalid argument sort".into());
            };
            return Ok(self.value(e, env, Some(t))?.0);
        };
        if let Expr::Var(n) = e {
            if !env.contains_key(n) {
                if let Some(f) = self.fns.get(n) {
                    if &f.sort != want {
                        return Err(format!("function argument {n} has the wrong type"));
                    }
                    return Ok(s::free(f.sort.clone(), n));
                }
                if self.p.functions.iter().any(|f| &f.name == n) {
                    let (inputs, _) = arrows(want)?;
                    let names = (0..inputs.len())
                        .map(|i| format!("__law_arg{i}"))
                        .collect::<Vec<_>>();
                    let mut lambda = Expr::Call(n.clone(), names.iter().map(|x| Expr::Var(x.clone())).collect());
                    for x in names.into_iter().rev() {
                        lambda = Expr::Lambda(x, Box::new(lambda));
                    }
                    return self.argument(&lambda, want, env);
                }
            }
        }
        let (inputs, output) = arrows(want)?;
        let mut body = e;
        let mut names = vec![];
        let mut local = env.clone();
        for t in &inputs {
            let Expr::Lambda(x, inner) = body else {
                return Err(format!(
                    "function argument needs {} parameters",
                    inputs.len()
                ));
            };
            names.push((x.clone(), s::value(t.clone())));
            local.insert(x.clone(), t.clone());
            body = inner;
        }
        let (term, _) = self.value(body, &local, Some(&output))?;
        let mut b = s::Budget::new();
        let mut out = s::close_scope(&term, &names, &mut b)?;
        for (_, sort) in names.iter().rev() {
            out = s::lambda(sort.clone(), out);
        }
        Ok(out)
    }
}

fn law_params(params: &[(String, Sort)]) -> Vec<(String, Sort)> {
    params.to_vec()
}
fn type_mentions(t: &Type, p: &Program) -> bool {
    match t {
        Type::Named(n) => p.records.contains_key(n) || p.enums.contains_key(n) || p.ids.contains(n),
        Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => type_mentions(x, p),
        Type::Map(a, b) | Type::Result(a, b) | Type::Table(a, b) => type_mentions(a, p) || type_mentions(b, p),
        _ => false,
    }
}
fn sort_mentions(s: &Sort, p: &Program) -> bool {
    match s {
        Sort::Value(t) => type_mentions(t, p),
        Sort::Arrow(a, c) => sort_mentions(a, p) || sort_mentions(c, p),
        Sort::Nat => false,
    }
}
fn mentions_declared(t: &Term, p: &Program) -> bool {
    sort_mentions(&t.sort, p)
        || matches!(&t.node, Node::Op(n, _) if n.starts_with("record:"))
        || s::children(t).into_iter().any(|c| mentions_declared(c, p))
}
fn source_env(env: &Env) -> check::Env {
    env.iter()
        .filter_map(|(n, sort)| match sort {
            Sort::Value(t) => Some((n.clone(), t.clone())),
            _ => None,
        })
        .collect()
}
fn fresh(env: &Env, base: &str) -> String {
    let mut n = base.to_string();
    while env.contains_key(&n) {
        n.push('_')
    }
    n
}
fn same_head(a: &Term, b: &Term) -> bool {
    if a.sort != b.sort {
        return false;
    }
    match (&a.node, &b.node) {
        (Node::Op(n, a), Node::Op(m, b)) => n == m && a.len() == b.len(),
        (Node::Lambda(_), Node::Lambda(_)) | (Node::Cons(..), Node::Cons(..)) => true,
        _ => a == b,
    }
}
/// `established` proves `goal` up to normalisation of either end.
fn wrap(proof: Proof, established: &Equation, goal: &Equation, exact: bool) -> Proof {
    if exact || established == goal {
        return proof;
    }
    let mut p = proof;
    if established.to != goal.to {
        p = Proof::Trans {
            middle: established.to.clone(),
            left: Box::new(p),
            right: Box::new(Proof::Normalize),
        };
    }
    if established.from != goal.from {
        p = Proof::Trans {
            middle: established.from.clone(),
            left: Box::new(Proof::Normalize),
            right: Box::new(p),
        };
    }
    p
}
fn unify(pattern: &Type, actual: &Type, params: &[String], out: &mut BTreeMap<String, Type>) -> LangResult<()> {
    match (pattern, actual) {
        (Type::Named(n), _) if params.contains(n) => match out.get(n) {
            Some(t) if t != actual => Err(format!("type parameter {n} inferred inconsistently")),
            _ => {
                out.insert(n.clone(), actual.clone());
                Ok(())
            }
        },
        (Type::List(a), Type::List(b))
        | (Type::Buffer(a), Type::Buffer(b))
        | (Type::Option(a), Type::Option(b)) => unify(a, b, params, out),
        (Type::Map(a, c), Type::Map(b, e)) | (Type::Result(a, c), Type::Result(b, e)) => {
            unify(a, b, params, out)?;
            unify(c, e, params, out)
        }
        (a, b) if a == b => Ok(()),
        _ => Err("argument type does not match the law".into()),
    }
}

/// Goal-directed lowering of tactics. It mirrors the kernel's goal flow only
/// to construct terms; the kernel checks the result independently.
struct Cx {
    env: Env,
    hyps: Vec<(Option<String>, Equation)>,
    schemas: Vec<(Env, Equation)>,
    ih: Option<usize>,
}
struct Lower<'a> {
    scope: &'a Scope<'a>,
    catalogue: &'a Catalogue,
    names: &'a BTreeMap<String, String>,
    orders: &'a BTreeMap<String, Vec<String>>,
    assumptions: &'a [Assumption],
    assumption_orders: &'a [Vec<String>],
    budget: &'a mut s::Budget,
}
impl Lower<'_> {
    fn lower(&mut self, t: &Tactic, goal: &Equation, cx: &Cx, depth: usize) -> LangResult<Proof> {
        self.budget.step(depth)?;
        let values = source_env(&cx.env);
        Ok(match t {
            Tactic::Normalize => Proof::Normalize,
            Tactic::Provided => return Err("provided evidence covers a whole law".into()),
            Tactic::Hypothesis(r) => {
                let i = match r {
                    HypothesisRef::Index(i) => *i,
                    HypothesisRef::Name(n) => cx
                        .hyps
                        .iter()
                        .rposition(|(l, _)| l.as_deref() == Some(n))
                        .ok_or_else(|| format!("unknown hypothesis {n}"))?,
                };
                let h = &cx.hyps.get(i).ok_or("hypothesis index out of range")?.1;
                wrap(Proof::Hypothesis(i), h, goal, false)
            }
            Tactic::Ih(args) => {
                if args.is_empty() {
                    if let Some(i) = cx.ih {
                        return Ok(wrap(Proof::Hypothesis(i), &cx.hyps[i].1, goal, false));
                    }
                }
                let index = cx.schemas.len().checked_sub(1).ok_or("no induction hypothesis in scope")?;
                let (params, equation) = &cx.schemas[index];
                let mut arguments = BTreeMap::new();
                for (n, sort) in params {
                    let e = args
                        .iter()
                        .find(|(x, _)| x == n)
                        .map(|(_, e)| e.clone())
                        .unwrap_or(Expr::Var(n.clone()));
                    arguments.insert(n.clone(), self.scope.argument(&e, sort, &values)?);
                }
                if args.iter().any(|(x, _)| !params.contains_key(x)) {
                    return Err("ih argument is not a generalized variable".into());
                }
                let established = laws::sub_equation(equation, &arguments, self.budget)?;
                wrap(
                    Proof::GeneralizedHypothesis { index, arguments },
                    &established,
                    goal,
                    false,
                )
            }
            Tactic::Symmetry(t) => Proof::Sym(Box::new(self.lower(
                t,
                &Equation {
                    from: goal.to.clone(),
                    to: goal.from.clone(),
                },
                cx,
                depth + 1,
            )?)),
            Tactic::Congruence(ts) => {
                if let (Node::Lambda(a), Node::Lambda(c)) = (&goal.from.node, &goal.to.node) {
                    let Sort::Arrow(x, _) = &goal.from.sort else {
                        return Err("lambda congruence".into());
                    };
                    let name = fresh(&cx.env, "__congruence");
                    let arg = s::free((**x).clone(), &name);
                    let mut inner = Cx {
                        env: cx.env.clone(),
                        hyps: cx.hyps.clone(),
                        schemas: cx.schemas.clone(),
                        ih: cx.ih,
                    };
                    inner.env.insert(name, arg.sort.clone());
                    let child = Equation {
                        from: s::beta(a, &arg, self.budget)?,
                        to: s::beta(c, &arg, self.budget)?,
                    };
                    let [t] = ts.as_slice() else {
                        return Err("lambda congruence takes one proof".into());
                    };
                    Proof::Congruence(vec![self.lower(t, &child, &inner, depth + 1)?])
                } else {
                    let (a, c) = (s::children(&goal.from), s::children(&goal.to));
                    if !same_head(&goal.from, &goal.to) || a.len() != ts.len() {
                        return Err("congruence structure mismatch".into());
                    }
                    let mut out = vec![];
                    for ((x, y), t) in a.into_iter().zip(c).zip(ts) {
                        out.push(self.lower(
                            t,
                            &Equation {
                                from: x.clone(),
                                to: y.clone(),
                            },
                            cx,
                            depth + 1,
                        )?);
                    }
                    Proof::Congruence(out)
                }
            }
            Tactic::Calc { middles, proofs } => {
                let Sort::Value(ty) = &goal.from.sort else {
                    return Err("calculation over a function".into());
                };
                let mut points = vec![goal.from.clone()];
                for m in middles {
                    points.push(self.scope.value(m, &values, Some(ty))?.0);
                }
                points.push(goal.to.clone());
                let mut steps = vec![];
                for (i, t) in proofs.iter().enumerate() {
                    steps.push(self.lower(
                        t,
                        &Equation {
                            from: points[i].clone(),
                            to: points[i + 1].clone(),
                        },
                        cx,
                        depth + 1,
                    )?);
                }
                // p0 ; (p1 ; (... ; pn))
                let mut proof = steps.pop().ok_or("empty calculation")?;
                for (i, step) in steps.into_iter().enumerate().rev() {
                    proof = Proof::Trans {
                        middle: points[i + 1].clone(),
                        left: Box::new(step),
                        right: Box::new(proof),
                    };
                }
                proof
            }
            Tactic::Cases {
                condition,
                on_true,
                on_false,
            } => {
                let (c, _) = self.scope.value(condition, &values, Some(&Type::Bool))?;
                let branch = |flag: bool, t: &Tactic, this: &mut Self| -> LangResult<Proof> {
                    let mut hyps = cx.hyps.clone();
                    hyps.push((
                        None,
                        Equation {
                            from: c.clone(),
                            to: s::term(s::value(Type::Bool), Node::Bool(flag)),
                        },
                    ));
                    this.lower(
                        t,
                        goal,
                        &Cx {
                            env: cx.env.clone(),
                            hyps,
                            schemas: cx.schemas.clone(),
                            ih: cx.ih,
                        },
                        depth + 1,
                    )
                };
                let on_false = branch(false, on_false, self)?;
                let on_true = branch(true, on_true, self)?;
                Proof::Cases {
                    condition: c,
                    on_false: Box::new(on_false),
                    on_true: Box::new(on_true),
                }
            }
            Tactic::Variants {
                variable,
                names,
                first,
                second,
            } => {
                let sort = cx
                    .env
                    .get(variable)
                    .ok_or_else(|| format!("unknown case variable {variable}"))?
                    .clone();
                let cases: [(&str, Option<(String, Type)>); 2] = match &sort {
                    Sort::Value(Type::Option(t)) => [
                        ("call:None", None),
                        ("call:Some", Some((names[0].clone(), (**t).clone()))),
                    ],
                    Sort::Value(Type::Result(t, e)) => [
                        ("call:Ok", Some((names[0].clone(), (**t).clone()))),
                        ("call:Err", Some((names[names.len() - 1].clone(), (**e).clone()))),
                    ],
                    _ => return Err("variant cases need an Option or Result variable".into()),
                };
                let mut out = vec![];
                for ((constructor, binder), t) in cases.into_iter().zip([first, second]) {
                    let mut env = cx.env.clone();
                    env.remove(variable);
                    let args = match binder {
                        Some((n, ty)) => {
                            env.insert(n.clone(), s::value(ty.clone()));
                            vec![s::free(s::value(ty), &n)]
                        }
                        None => vec![],
                    };
                    let sub = BTreeMap::from([(variable.clone(), s::op(sort.clone(), constructor, args))]);
                    let hyps = cx
                        .hyps
                        .iter()
                        .map(|(l, h)| Ok((l.clone(), laws::sub_equation(h, &sub, self.budget)?)))
                        .collect::<LangResult<Vec<_>>>()?;
                    let g = laws::sub_equation(goal, &sub, self.budget)?;
                    out.push(self.lower(
                        t,
                        &g,
                        &Cx {
                            env,
                            hyps,
                            schemas: cx.schemas.clone(),
                            ih: cx.ih,
                        },
                        depth + 1,
                    )?);
                }
                let second = out.pop().unwrap();
                let first = out.pop().unwrap();
                Proof::Variants {
                    variable: variable.clone(),
                    names: names.clone(),
                    first: Box::new(first),
                    second: Box::new(second),
                }
            }
            Tactic::Induction {
                variable,
                generalizing,
                names,
                base,
                step,
            } => {
                let sort = cx
                    .env
                    .get(variable)
                    .ok_or_else(|| format!("unknown induction variable {variable}"))?
                    .clone();
                let mut env = cx.env.clone();
                env.remove(variable);
                let (names, zero, next, ih_arg, guard) = match &sort {
                    Sort::Value(Type::List(item)) => {
                        let names = if names.is_empty() {
                            let head = fresh(&cx.env, &format!("{variable}_head"));
                            let mut named = cx.env.clone();
                            named.insert(head.clone(), s::value((**item).clone()));
                            vec![head, fresh(&named, &format!("{variable}_tail"))]
                        } else { names.clone() };
                        if names.len() != 2 { return Err("list induction requires two binders".into()); }
                        let head = s::free(s::value((**item).clone()), &names[0]);
                        let tail = s::free(sort.clone(), &names[1]);
                        env.insert(names[0].clone(), head.sort.clone());
                        env.insert(names[1].clone(), sort.clone());
                        (names, s::term(sort.clone(), Node::Nil),
                         s::term(sort.clone(), Node::Cons(Box::new(head), Box::new(tail.clone()))), tail, None)
                    }
                    Sort::Value(ty @ (Type::U32 | Type::U64)) => {
                        let names = if names.is_empty() { vec![fresh(&cx.env, &format!("{variable}_previous"))] } else { names.clone() };
                        if names.len() != 1 { return Err("word induction requires one binder".into()); }
                        let previous = s::free(sort.clone(), &names[0]);
                        env.insert(names[0].clone(), sort.clone());
                        let guard = Equation {
                            from:s::op(s::value(Type::Bool),"binary:<",vec![previous.clone(),s::word(ty.clone(),if *ty==Type::U32 {u32::MAX as u64}else{u64::MAX})]),
                            to:s::term(s::value(Type::Bool),Node::Bool(true)),
                        };
                        (names,s::word(ty.clone(),0),s::op(sort.clone(),"binary:+",vec![previous.clone(),s::word(ty.clone(),1)]),previous,Some(guard))
                    }
                    _ => return Err("induction is over a list or unsigned word".into()),
                };
                let sub = |arg: Term| BTreeMap::from([(variable.clone(), arg)]);
                let base_goal = laws::sub_equation(goal, &sub(zero), self.budget)?;
                let base = self.lower(base, &base_goal, &Cx {
                    env:env.clone(), hyps:cx.hyps.clone(), schemas:cx.schemas.clone(), ih:cx.ih,
                }, depth+1)?;
                let hypothesis = laws::sub_equation(goal, &sub(ih_arg), self.budget)?;
                let step_goal = laws::sub_equation(goal, &sub(next), self.budget)?;
                let mut inner = Cx {
                    env,
                    hyps: cx.hyps.clone(),
                    schemas: cx.schemas.clone(),
                    ih: cx.ih,
                };
                if generalizing.is_empty() {
                    inner.hyps.push((Some("ih".into()), hypothesis));
                    inner.ih = Some(inner.hyps.len() - 1);
                } else {
                    let mut params = Env::new();
                    for n in generalizing {
                        params.insert(
                            n.clone(),
                            cx.env.get(n).ok_or("unknown generalized variable")?.clone(),
                        );
                    }
                    inner.schemas.push((params, hypothesis));
                    inner.ih = None;
                }
                if let Some(guard) = guard { inner.hyps.push((Some("successor_bound".into()), guard)); }
                let step = self.lower(step, &step_goal, &inner, depth + 1)?;
                if generalizing.is_empty() {
                    Proof::Induction {
                        variable: variable.clone(),
                        names,
                        base: Box::new(base),
                        step: Box::new(step),
                    }
                } else {
                    Proof::GeneralizedInduction {
                        variable: variable.clone(),
                        generalize: generalizing.clone(),
                        names,
                        base: Box::new(base),
                        step: Box::new(step),
                    }
                }
            }
            Tactic::Use {
                law,
                types,
                args,
                premises,
                assumptions,
                exact,
            } => {
                let id = self
                    .names
                    .get(law)
                    .ok_or_else(|| format!("unknown law {law} (laws are used after their declaration)"))?
                    .clone();
                let used = self.catalogue.objects.get(&id).ok_or("missing used law")?.clone();
                let order = self.orders.get(law).ok_or("missing law parameter order")?;
                if args.len() != order.len() {
                    return Err(format!("{law} takes {} arguments", order.len()));
                }
                let mut map = BTreeMap::new();
                if !types.is_empty() {
                    if types.len() != used.types.len() {
                        return Err(format!("{law} takes {} type arguments", used.types.len()));
                    }
                    for (n, t) in used.types.iter().zip(types) {
                        map.insert(n.clone(), t.clone());
                    }
                } else if !used.types.is_empty() {
                    // Infer type arguments from value arguments.
                    for (name, e) in order.iter().zip(args) {
                        if let Sort::Value(pattern) = &used.params[name] {
                            if let Ok((_, actual)) = self.scope.value(e, &values, None) {
                                unify(pattern, &actual, &used.types, &mut map)?;
                            }
                        }
                    }
                    if let Some(missing) = used.types.iter().find(|t| !map.contains_key(*t)) {
                        return Err(format!(
                            "cannot infer type parameter {missing} of {law}; write {law}<...>"
                        ));
                    }
                }
                let inst = Instance::new(&used, &map, self.budget)?;
                let mut arguments = BTreeMap::new();
                for (name, e) in order.iter().zip(args) {
                    arguments.insert(name.clone(), self.scope.argument(e, &inst.params[name], &values)?);
                }
                let established = Equation {
                    from: s::substitute(&inst.from, &arguments, self.budget)?,
                    to: s::substitute(&inst.to, &arguments, self.budget)?,
                };
                let mut lowered_premises = vec![];
                for (i, condition) in inst.conditions.iter().enumerate() {
                    let t = premises.get(i).unwrap_or(&Tactic::Normalize);
                    let g = laws::sub_equation(condition, &arguments, self.budget)?;
                    lowered_premises.push(self.lower(t, &g, cx, depth + 1)?);
                }
                if premises.len() > inst.conditions.len() {
                    return Err(format!("{law} has {} conditions", inst.conditions.len()));
                }
                let mut lowered_assumptions = vec![];
                for (i, a) in inst.assumptions.iter().enumerate() {
                    let t = assumptions.get(i).unwrap_or(&Tactic::Normalize);
                    // The kernel's fresh names for the assumption's own parameters.
                    let mut local = cx.env.clone();
                    let mut rename = arguments.clone();
                    for (n, sort) in &a.params {
                        let name = fresh(&local, &format!("__assumed_{n}"));
                        local.insert(name.clone(), sort.clone());
                        rename.insert(n.clone(), s::free(sort.clone(), &name));
                    }
                    let mut hyps = cx.hyps.clone();
                    for c in &a.conditions {
                        hyps.push((None, laws::sub_equation(c, &rename, self.budget)?));
                    }
                    let g = Equation {
                        from: s::substitute(&a.from, &rename, self.budget)?,
                        to: s::substitute(&a.to, &rename, self.budget)?,
                    };
                    lowered_assumptions.push(self.lower(
                        t,
                        &g,
                        &Cx {
                            env: local,
                            hyps,
                            schemas: vec![],
                            ih: None,
                        },
                        depth + 1,
                    )?);
                }
                if assumptions.len() > inst.assumptions.len() {
                    return Err(format!("{law} has {} assumptions", inst.assumptions.len()));
                }
                wrap(
                    Proof::Use {
                        law: id,
                        arguments,
                        premises: lowered_premises,
                        types: map,
                        assumptions: lowered_assumptions,
                    },
                    &established,
                    goal,
                    *exact,
                )
            }
            Tactic::Assumption {
                name,
                args,
                premises,
                exact,
            } => {
                let index = self
                    .assumptions
                    .iter()
                    .position(|a| &a.name == name)
                    .ok_or_else(|| format!("unknown assumption {name}"))?;
                let a = &self.assumptions[index];
                let order = &self.assumption_orders[index];
                if args.len() != order.len() {
                    return Err(format!("assumption {name} takes {} arguments", order.len()));
                }
                let mut arguments = BTreeMap::new();
                for (n, e) in order.iter().zip(args) {
                    arguments.insert(n.clone(), self.scope.argument(e, &a.params[n], &values)?);
                }
                let established = Equation {
                    from: s::substitute(&a.from, &arguments, self.budget)?,
                    to: s::substitute(&a.to, &arguments, self.budget)?,
                };
                let mut lowered = vec![];
                for (i, condition) in a.conditions.iter().enumerate() {
                    let t = premises.get(i).unwrap_or(&Tactic::Normalize);
                    let g = laws::sub_equation(condition, &arguments, self.budget)?;
                    lowered.push(self.lower(t, &g, cx, depth + 1)?);
                }
                wrap(
                    Proof::Assume {
                        index,
                        arguments,
                        premises: lowered,
                    },
                    &established,
                    goal,
                    *exact,
                )
            }
            Tactic::Assert {
                from,
                to,
                premise,
                body,
            } => {
                let equality = self.scope.pair(from, to, &values)?;
                let proposition = s::op(
                    s::value(Type::Bool),
                    "binary:==",
                    vec![equality.from.clone(), equality.to.clone()],
                );
                let premise = self.lower(
                    premise,
                    &Equation {
                        from: proposition,
                        to: s::term(s::value(Type::Bool), Node::Bool(true)),
                    },
                    cx,
                    depth + 1,
                )?;
                let mut hyps = cx.hyps.clone();
                hyps.push((None, equality.clone()));
                let body = self.lower(
                    body,
                    goal,
                    &Cx {
                        env: cx.env.clone(),
                        hyps,
                        schemas: cx.schemas.clone(),
                        ih: cx.ih,
                    },
                    depth + 1,
                )?;
                Proof::AssertEquality {
                    equality,
                    premise: Box::new(premise),
                    body: Box::new(body),
                }
            }
            Tactic::Order { atoms, body } => {
                let mut terms = vec![];
                let mut sort: Option<Type> = None;
                for a in atoms {
                    let (t, ty) = self.scope.value(a, &values, sort.as_ref())?;
                    sort.get_or_insert(ty);
                    terms.push(t);
                }
                // Region facts are appended after the existing hypotheses, so
                // the body's hypothesis references keep their meaning.
                Proof::Order {
                    atoms: terms,
                    body: Box::new(self.lower(body, goal, cx, depth + 1)?),
                }
            }
        })
    }
}

fn author(
    module: &CheckedModule,
    decl: &LawDecl,
    evidence: &mut BTreeMap<String, Evidence>,
    catalogue: &Catalogue,
    names: &BTreeMap<String, String>,
    orders: &BTreeMap<String, Vec<String>>,
    budget: &mut s::Budget,
) -> LangResult<Law> {
    let p = module.program();
    if decl.params.len() > 64 || decl.requires.len() > 64 || decl.assumes.len() > 32 {
        return Err("law declaration size limit".into());
    }
    let scope = Scope::new(p, &decl.types, &decl.params)?;
    let mut env = Env::new();
    for (n, sort) in &decl.params {
        if env.insert(n.clone(), sort.clone()).is_some() {
            return Err(format!("duplicate parameter {n}"));
        }
    }
    let values = source_env(&env);
    let statement = scope.pair(&decl.from, &decl.to, &values)?;
    let mut conditions = vec![];
    let mut labels = vec![];
    for (label, e) in &decl.requires {
        conditions.push(scope.condition(e, &values)?);
        labels.push(label.clone());
    }
    let mut assumptions = vec![];
    let mut assumption_orders = vec![];
    for a in &decl.assumes {
        let mut own = values.clone();
        let mut params = Env::new();
        for (n, t) in &a.params {
            if env.contains_key(n) || params.insert(n.clone(), s::value(t.clone())).is_some() {
                return Err(format!("assumption {} parameter {n} shadows another", a.name));
            }
            own.insert(n.clone(), t.clone());
        }
        let equation = scope.pair(&a.from, &a.to, &own)?;
        assumptions.push(Assumption {
            name: a.name.clone(),
            params,
            conditions: a
                .requires
                .iter()
                .map(|c| scope.condition(c, &own))
                .collect::<LangResult<_>>()?,
            from: equation.from,
            to: equation.to,
        });
        assumption_orders.push(a.params.iter().map(|(n, _)| n.clone()).collect::<Vec<_>>());
    }
    let supplied = evidence.remove(&decl.name);
    let proof = match &decl.proof {
        Tactic::Provided => {
            let supplied = supplied.ok_or_else(|| "missing proof evidence".to_string())?;
            if !supplied.conditions.is_empty() {
                if !conditions.is_empty() {
                    return Err("conditions come from requires or from evidence, not both".into());
                }
                conditions = supplied.conditions;
            }
            supplied.proof
        }
        t => {
            if supplied.is_some() {
                return Err("proof evidence given for a law proved in source".into());
            }
            let cx = Cx {
                env: env.clone(),
                hyps: labels.into_iter().zip(conditions.iter().cloned()).collect(),
                schemas: vec![],
                ih: None,
            };
            Lower {
                scope: &scope,
                catalogue,
                names,
                orders,
                assumptions: &assumptions,
                assumption_orders: &assumption_orders,
                budget,
            }
            .lower(t, &statement, &cx, 0)?
        }
    };
    let mut uses = BTreeSet::new();
    dependencies(&proof, &mut uses, budget, 0)?;
    let mut calls = BTreeSet::new();
    let mut terms = vec![&statement.from, &statement.to];
    for e in &conditions {
        terms.extend([&e.from, &e.to]);
    }
    for a in &assumptions {
        terms.extend([&a.from, &a.to]);
        for e in &a.conditions {
            terms.extend([&e.from, &e.to]);
        }
    }
    let mut declared = false;
    for t in terms {
        callees(t, p, &mut calls, budget, 0)?;
        declared |= mentions_declared(t, p);
    }
    for (_, sort) in &law_params(&decl.params) {
        declared |= sort_mentions(sort, p);
    }
    // A law needs a definition context only when it mentions the source's
    // functions or declared types; otherwise it is portable.
    let context = if calls.is_empty() && !declared {
        None
    } else {
        Some(DefinitionContext::capture(
            module,
            &calls.into_iter().collect::<Vec<_>>(),
        )?)
    };
    let mut law = Law {
        schema: 1,
        semantics: String::new(),
        params: env,
        conditions,
        from: statement.from,
        to: statement.to,
        proof,
        dependencies: uses.into_iter().collect(),
        definition_context: context,
        types: decl.types.clone(),
        assumptions,
    };
    law.semantics = laws::required_semantics(&law).into();
    Ok(law)
}
