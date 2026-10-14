//! Source-location-bound unchecked-read capabilities. Fixed control-flow and
//! wrapping word semantics construct obligations; the database supplies RUP
//! refutations. Hashes and discovery metadata never authorise an access.
use crate::{
    bitproof, check,
    core::CheckedModule,
    logic::{Equation, Sort, Term},
    registry,
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
pub const SEMANTICS: &str = "ink-source-read-capability-v1";
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(deny_unknown_fields)]
pub struct Site {
    pub function: String,
    pub path: Vec<usize>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Obligation {
    pub site: Site,
    pub params: Vec<(String, Sort)>,
    pub conditions: Vec<Equation>,
    pub from: Term,
    pub to: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Certificate {
    pub source: String,
    pub site: Site,
    pub obligation_sha256: String,
    pub proof: bitproof::Certificate,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub knowledge: registry::Bundle,
}
#[derive(Clone, Debug, Default)]
pub struct CheckedBounds {
    sites: BTreeSet<Site>,
}
impl CheckedBounds {
    pub fn allows(&self, function: &str, path: &[usize]) -> bool {
        self.sites.contains(&Site {
            function: function.into(),
            path: path.into(),
        })
    }
}
fn bin(op: &str, a: Term, b: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(a),
        right: Box::new(b),
    }
}
fn eq(a: Term, b: Term) -> Equation {
    Equation { from: a, to: b }
}
type Scope = BTreeMap<String, (Type, Expr)>;
struct Walk<'a> {
    p: &'a Program,
    function: String,
    next: usize,
    params: BTreeMap<String, Sort>,
    types: BTreeMap<String, Type>,
    opaque: BTreeMap<String, Term>,
    word_bounds: Vec<Equation>,
    out: Vec<Obligation>,
    map_out: Vec<crate::column_codec::MapObligation>,
    nodes: usize,
    measure: Option<Vec<(Expr, Type, Term)>>,
}
impl Walk<'_> {
    fn fresh(&mut self, t: &Type) -> Expr {
        let n = format!("binding_{}", self.next);
        self.next += 1;
        self.types.insert(n.clone(), t.clone());
        if let Some(sort) = match t {
            Type::U32 | Type::U64 => Some(Sort::U64),
            Type::Bool => Some(Sort::Bool),
            _ => None,
        } {
            self.params.insert(n.clone(), sort);
            if *t == Type::U32 {
                self.word_bounds.push(eq(
                    bin("<=", Term::Var(n.clone()), Term::U64(u32::MAX as u64)),
                    Term::Bool(true),
                ));
            }
        }
        Expr::Var(n)
    }
    fn types(env: &Scope) -> check::Env {
        env.iter()
            .map(|(n, (t, _))| (n.clone(), t.clone()))
            .collect()
    }
    fn alias(t: &Type, value: Expr) -> LangResult<Expr> {
        if matches!(
            t,
            Type::U32 | Type::U64 | Type::I32 | Type::F32 | Type::Bool
        ) {
            let n = format!("typed_{}", registry::identity(&(t, &value))?);
            Ok(Expr::Let(
                n.clone(),
                Some(Box::new(t.clone())),
                Box::new(value),
                Box::new(Expr::Var(n)),
            ))
        } else {
            Ok(value)
        }
    }
    // Substitute lexical aliases without conflating shadowed or loop bindings.
    fn image(&self, e: &Expr, env: &Scope, d: usize) -> LangResult<Expr> {
        if d > 64 {
            return Err("bounds alias depth".into());
        }
        let image = match e {
            Expr::Var(n) => env
                .get(n)
                .map(|(_, e)| e.clone())
                .unwrap_or_else(|| e.clone()),
            Expr::Let(n, t, a, b) => {
                let ty = t
                    .as_deref()
                    .cloned()
                    .map(Ok)
                    .unwrap_or_else(|| check::infer(a, &Self::types(env), self.p));
                let value = self.image(a, env, d + 1)?;
                let mut local = env.clone();
                if let Ok(ty) = ty {
                    local.insert(n.clone(), (ty.clone(), Self::alias(&ty, value)?));
                    self.image(b, &local, d + 1)?
                } else {
                    // An opaque callback has deliberately unknown parameter
                    // types. Preserve its untyped let instead of trying to
                    // infer a record projection under the placeholder Unit.
                    // Rename the binder so captured outer aliases cannot be
                    // captured here. This image stays opaque to scalar proofs.
                    let binder = format!("let_{}", registry::identity(&(e, env))?);
                    local.insert(n.clone(), (Type::Unit, Expr::Var(binder.clone())));
                    Expr::Let(binder, t.clone(), Box::new(value), Box::new(self.image(b, &local, d + 1)?))
                }
            }
            Expr::Record(n, fields) => Expr::Record(
                n.clone(),
                fields
                    .iter()
                    .map(|(n, e)| Ok((n.clone(), self.image(e, env, d + 1)?)))
                    .collect::<LangResult<_>>()?,
            ),
            Expr::Try(a) => Expr::Try(Box::new(self.image(a, env, d + 1)?)),
            Expr::Lambda(n, b) => {
                let binder = format!("lambda_{}", registry::identity(&(e, env))?);
                let mut local = env.clone();
                local.insert(n.clone(), (Type::Unit, Expr::Var(binder.clone())));
                Expr::Lambda(binder, Box::new(self.image(b, &local, d + 1)?))
            }
            Expr::Neg(a) => Expr::Neg(Box::new(self.image(a, env, d + 1)?)),
            Expr::Binary(n, a, b) => Expr::Binary(
                n.clone(),
                Box::new(self.image(a, env, d + 1)?),
                Box::new(self.image(b, env, d + 1)?),
            ),
            Expr::Field(a, n) => Expr::Field(Box::new(self.image(a, env, d + 1)?), n.clone()),
            Expr::Method(a, n, args) => Expr::Method(
                Box::new(self.image(a, env, d + 1)?),
                n.clone(),
                args.iter()
                    .map(|a| self.image(a, env, d + 1))
                    .collect::<LangResult<_>>()?,
            ),
            Expr::Call(n, args) => Expr::Call(
                n.clone(),
                args.iter()
                    .map(|a| self.image(a, env, d + 1))
                    .collect::<LangResult<_>>()?,
            ),
            _ => e.clone(),
        };
        if crate::analysis::node_count(&image, 8192).is_none() {
            return Err("bounds image size limit".into());
        }
        Ok(image)
    }
    fn atom(&mut self, image: &Expr, t: &Type) -> LangResult<Term> {
        let key = registry::identity(&(image, t))?;
        if let Some(v) = self.opaque.get(&key) {
            return Ok(v.clone());
        }
        let Expr::Var(n) = self.fresh(t) else {
            unreachable!()
        };
        let v = Term::Var(n);
        self.opaque.insert(key, v.clone());
        Ok(v)
    }
    fn scalar(&mut self, e: &Expr, env: &Scope, want: &Type, d: usize) -> LangResult<Term> {
        if d > 48 {
            return Err("bounds scalar depth".into());
        }
        let image = self.image(e, env, 0)?;
        self.scalar_image(&image, want, d)
    }
    fn scalar_image(&mut self, e: &Expr, t: &Type, d: usize) -> LangResult<Term> {
        if d > 48 {
            return Err("bounds scalar depth".into());
        }
        let mask = |x| {
            if *t == Type::U32 {
                bin("&", x, Term::U64(u32::MAX as u64))
            } else {
                x
            }
        };
        Ok(match e {
            Expr::Let(n, Some(ty), value, body) if matches!(body.as_ref(),Expr::Var(v)if v==n) => {
                self.scalar_image(value, ty, d + 1)?
            }
            Expr::Num(n) if matches!(t, Type::U32 | Type::U64) => Term::U64(*n),
            Expr::Bool(v) => Term::Bool(*v),
            Expr::Var(n) if self.params.contains_key(n) => Term::Var(n.clone()),
            Expr::Binary(op, a, b)
                if [
                    "+", "-", "*", "&", "==", "!=", "<", ">", "<=", ">=", "&&", "||",
                ]
                .contains(&op.as_str()) =>
            {
                let hint = check::hint(a, &self.types, self.p)
                    .or_else(|| check::hint(b, &self.types, self.p));
                let operand = if ["+", "-", "*"].contains(&op.as_str()) {
                    t.clone()
                } else {
                    check::infer_context(a, &self.types, self.p, hint.as_ref())?
                };
                if !matches!(operand, Type::Bool | Type::U32 | Type::U64) {
                    return self.atom(e, t);
                }
                let value = bin(
                    op,
                    self.scalar_image(a, &operand, d + 1)?,
                    self.scalar_image(b, &operand, d + 1)?,
                );
                if ["+", "-", "*", "&"].contains(&op.as_str()) {
                    mask(value)
                } else {
                    value
                }
            }
            Expr::Call(n, args) if n == "choose" && args.len() == 3 => Term::If {
                condition: Box::new(self.scalar_image(&args[0], &Type::Bool, d + 1)?),
                on_true: Box::new(self.scalar_image(&args[1], t, d + 1)?),
                on_false: Box::new(self.scalar_image(&args[2], t, d + 1)?),
            },
            Expr::Call(n, args) if self.p.functions.iter().any(|f| f.name == *n) => {
                let f = self.p.functions.iter().find(|f| f.name == *n).unwrap();
                if crate::recursion::recursive(f) {
                    return self.atom(e, t);
                }
                if args.len() != f.params.len() {
                    return Err("bounds helper arity".into());
                }
                let local: Scope = f
                    .params
                    .iter()
                    .zip(args)
                    .map(|((n, t), a)| Ok((n.clone(), (t.clone(), Self::alias(t, a.clone())?))))
                    .collect::<LangResult<_>>()?;
                let body = self.image(&f.body, &local, 0)?;
                self.scalar_image(&body, t, d + 1)?
            }
            // Unsupported scalar operations are independent typed values, never axioms.
            _ => self.atom(e, t)?,
        })
    }
    fn descend(
        &mut self,
        e: &Expr,
        env: &Scope,
        facts: &[Equation],
        path: &mut Vec<usize>,
        child: usize,
        want: Option<&Type>,
        d: usize,
    ) -> LangResult<()> {
        path.push(child);
        let result = self.visit(e, env, facts, path, want, d + 1).map_err(|error| {
            if error.starts_with("bounds at ") { error }
            else { format!("bounds at {} {:?}: {error}", self.function, path) }
        });
        path.pop();
        result
    }
    fn lambda(
        &mut self,
        e: &Expr,
        env: &Scope,
        facts: &[Equation],
        path: &mut Vec<usize>,
        types: &[Type],
        bound: Option<Term>,
        result: Option<&Type>,
        d: usize,
    ) -> LangResult<()> {
        let mut local = env.clone();
        let mut body = e;
        let mut fs = facts.to_vec();
        for (i, t) in types.iter().enumerate() {
            let Expr::Lambda(n, b) = body else {
                return Ok(());
            };
            let v = self.fresh(t);
            if i == 0 {
                if let Some(limit) = &bound {
                    let Expr::Var(v) = &v else { unreachable!() };
                    fs.push(eq(
                        bin("<", Term::Var(v.clone()), limit.clone()),
                        Term::Bool(true),
                    ));
                }
            }
            local.insert(n.clone(), (t.clone(), v));
            body = b;
            path.push(0);
        }
        let result = self.visit(body, &local, &fs, path, result, d + types.len());
        for _ in types {
            path.pop();
        }
        result
    }
    fn visit(
        &mut self,
        e: &Expr,
        env: &Scope,
        facts: &[Equation],
        path: &mut Vec<usize>,
        want: Option<&Type>,
        d: usize,
    ) -> LangResult<()> {
        self.nodes += 1;
        if d > 64 || self.nodes > 50_000 {
            return Err("bounds source walk limit".into());
        }
        match e {
            Expr::Call(n, args) if n == &self.function && self.measure.is_some() => {
                let measures = self.measure.clone().unwrap();
                let function = self.p.functions.iter().find(|f| &f.name == n).ok_or("termination function missing")?;
                if args.len() != function.params.len() { return Err("termination recursive arity".into()); }
                let mut call_scope = Scope::new();
                for (i, ((name, ty), arg)) in function.params.iter().zip(args).enumerate() {
                    self.descend(arg, env, facts, path, i, Some(ty), d)?;
                    let actual = self.image(arg, env, 0)?;
                    call_scope.insert(name.clone(), (ty.clone(), Self::alias(ty, actual)?));
                }
                let mut descent=None;let mut equal:Option<Term>=None;
                for (measure,ty,current) in measures {
                    let next=self.scalar(&measure,&call_scope,&ty,0)?;
                    let less=bin("<",next.clone(),current.clone());
                    let less=if let Some(prefix)=&equal{bin("&&",prefix.clone(),less)}else{less};
                    descent=Some(if let Some(previous)=descent{bin("||",previous,less)}else{less});
                    let same=bin("==",next,current);
                    equal=Some(if let Some(prefix)=equal{bin("&&",prefix,same)}else{same});
                }
                // Keep scalar obligation bytes stable for existing packets.
                let descent=descent.ok_or("termination measure product is empty")?;
                let mut conditions = self.word_bounds.clone();
                conditions.extend_from_slice(facts);
                self.out.push(Obligation {
                    site: Site { function: self.function.clone(), path: path.clone() },
                    params: self.params.iter().map(|(n,t)|(n.clone(),t.clone())).collect(),
                    conditions,
                    from: descent,
                    to: Term::Bool(true),
                });
            }
            Expr::Let(n, t, a, b) => {
                self.descend(a, env, facts, path, 0, t.as_deref(), d)?;
                let ty = check::infer_context(a, &Self::types(env), self.p, t.as_deref())?;
                let mut local = env.clone();
                local.insert(
                    n.clone(),
                    (ty.clone(), Self::alias(&ty, self.image(a, env, 0)?)?),
                );
                self.descend(b, &local, facts, path, 1, want, d)?
            }
            Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
                self.descend(&args[0], env, facts, path, 0, Some(&Type::Bool), d)?;
                let c = self.scalar(&args[0], env, &Type::Bool, 0)?;
                for (i, truth) in [(1, true), (2, false)] {
                    let mut fs = facts.to_vec();
                    fs.push(eq(c.clone(), Term::Bool(truth)));
                    self.descend(&args[i], env, &fs, path, i, want, d)?;
                }
            }
            Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
                self.descend(a, env, facts, path, 0, Some(&Type::Bool), d)?;
                let c = self.scalar(a, env, &Type::Bool, 0)?;
                let mut fs = facts.to_vec();
                fs.push(eq(c, Term::Bool(op == "&&")));
                self.descend(b, env, &fs, path, 1, Some(&Type::Bool), d)?
            }
            Expr::Call(n, args) if n == "repeat" || n == "repeat_until" => {
                let ty = check::infer_context(e, &Self::types(env), self.p, want)?;
                // An enclosing primitive may provide a numeric context that
                // this partial walker does not resolve. Decline that callback;
                // guessing U64 for a contextual U32 accumulator would be unsafe.
                if want.is_none()
                    && matches!(ty, Type::U32 | Type::U64 | Type::I32 | Type::F32)
                    && check::hint(&args[1], &Self::types(env), self.p).is_none()
                {
                    return Ok(());
                }
                self.descend(&args[0], env, facts, path, 0, Some(&Type::U32), d)?;
                self.descend(&args[1], env, facts, path, 1, Some(&ty), d)?;
                let limit = self.scalar(&args[0], env, &Type::U32, 0)?;
                let callback = if n == "repeat" { 2 } else { 3 };
                if callback == 3 {
                    path.push(2);
                    self.lambda(
                        &args[2],
                        env,
                        facts,
                        path,
                        &[ty.clone()],
                        None,
                        Some(&Type::Bool),
                        d + 1,
                    )?;
                    path.pop();
                }
                path.push(callback);
                self.lambda(
                    &args[callback],
                    env,
                    facts,
                    path,
                    &[Type::U32, ty.clone()],
                    Some(limit),
                    Some(&ty),
                    d + 1,
                )?;
                path.pop();
            }
            Expr::Method(receiver, name, args) => {
                let rt = check::infer(receiver, &Self::types(env), self.p).ok();
                if name == "at_or"
                    && args.len() == 2
                    && matches!(rt, Some(Type::List(_) | Type::Buffer(_)))
                {
                    let index = self.scalar(&args[0], env, &Type::U32, 0)?;
                    let length = if matches!(rt, Some(Type::List(_))) {
                        Expr::Call("length".into(), vec![*receiver.clone()])
                    } else {
                        Expr::Method(receiver.clone(), "len".into(), vec![])
                    };
                    let length = self.scalar(&length, env, &Type::U32, 0)?;
                    let mut conditions = self.word_bounds.clone();
                    conditions.extend_from_slice(facts);
                    self.out.push(Obligation {
                        site: Site {
                            function: self.function.clone(),
                            path: path.clone(),
                        },
                        params: self
                            .params
                            .iter()
                            .map(|(n, t)| (n.clone(), t.clone()))
                            .collect(),
                        conditions,
                        from: bin("<", index, length),
                        to: Term::Bool(true),
                    });
                }
                if name == "map" && args.len() == 1 {
                    if let (Some(Type::List(t) | Type::Buffer(t)), Expr::Lambda(parameter, body)) =
                        (&rt, &args[0])
                    {
                        let record = match t.as_ref() {
                            Type::Named(n) if self.p.records.contains_key(n) => Some(n.clone()),
                            Type::U32 => Some("@U32".into()),
                            Type::U64 => Some("@U64".into()),
                            Type::Bool => Some("@Bool".into()),
                            _ => None,
                        };
                        if let Some(record) = record {
                            if let Ok(schema) = crate::column_codec::schema(self.p, &record) {
                                let mut local = Self::types(env);
                                local.insert(parameter.clone(), *t.clone());
                                if let Ok(value) =
                                    crate::semantic::elaborate(body, &local, self.p, t)
                                {
                                    let input = crate::semantic::term(
                                        crate::semantic::value(*t.clone()),
                                        crate::semantic::Node::Free(parameter.clone()),
                                    );
                                    for (field, ty) in schema.fields {
                                        let project = |v| {
                                            if record.starts_with('@') {
                                                v
                                            } else {
                                                crate::semantic::op(
                                                    crate::semantic::value(ty.clone()),
                                                    &format!("field:{field}"),
                                                    vec![v],
                                                )
                                            }
                                        };
                                        self.map_out.push(crate::column_codec::MapObligation {
                                            site: Site {
                                                function: self.function.clone(),
                                                path: path.clone(),
                                            },
                                            record: record.clone(),
                                            field: field.clone(),
                                            params: local
                                                .iter()
                                                .map(|(n, t)| {
                                                    (n.clone(), crate::semantic::value(t.clone()))
                                                })
                                                .collect(),
                                            equation: crate::laws::Equation {
                                                from: project(value.clone()),
                                                to: project(input.clone()),
                                            },
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                self.descend(receiver, env, facts, path, 0, None, d)?;
                for (i, arg) in args.iter().enumerate() {
                    let types = match (&rt, name.as_str(), i) {
                        (Some(t@Type::Buffer(_)),"borrow_range",2)=>Some(vec![t.clone()]),
                        (Some(Type::List(t) | Type::Buffer(t)), "map" | "filter", 0) => {
                            Some(vec![*t.clone()])
                        }
                        (Some(Type::List(t) | Type::Buffer(t)), "map_indexed", 0) => {
                            Some(vec![Type::U32, *t.clone()])
                        }
                        _ => None,
                    };
                    path.push(i + 1);
                    if let Some(types) = types {
                        let output = if name=="borrow_range" {
                            check::infer_context(e,&Self::types(env),self.p,want).ok()
                        } else if name == "filter" {
                            Some(Type::Bool)
                        } else {
                            check::infer_context(e, &Self::types(env), self.p, want)
                                .ok()
                                .and_then(|t| match t {
                                    Type::List(t) | Type::Buffer(t) => Some(*t),
                                    _ => None,
                                })
                        };
                        self.lambda(arg, env, facts, path, &types, None, output.as_ref(), d + 1)?;
                    } else {
                        // Fixed collection signatures supply the value context
                        // to nested folds. Without it a literal accumulator can
                        // default to U64 before meeting a U32 element read.
                        let expected = rt.as_ref().and_then(|t|
                            crate::analysis::collection_argument_context(t,name,i));
                        self.visit(arg, env, facts, path, expected.as_ref(), d + 1)?;
                    }
                    path.pop();
                }
            }
            Expr::Lambda(_, _) => (), // Unknown callback capabilities remain unavailable.
            _ => {
                for (i, child) in crate::analysis::children(e).into_iter().enumerate() {
                    let expected = match e {
                        Expr::Record(n, fs) => self.p.records[n]
                            .iter()
                            .find(|(n, _)| n == &fs[i].0)
                            .map(|(_, t)| t.clone()),
                        Expr::Call(n, _) => self
                            .p
                            .functions
                            .iter()
                            .find(|f| &f.name == n)
                            .and_then(|f| f.params.get(i))
                            .map(|(_, t)| t.clone()),
                        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
                            check::infer_context(e, &Self::types(env), self.p, want).ok()
                        }
                        _ => None,
                    };
                    self.descend(child, env, facts, path, i, expected.as_ref(), d)?;
                }
            }
        }
        Ok(())
    }
}
fn derive(
    module: &CheckedModule,
) -> LangResult<(Vec<Obligation>, Vec<crate::column_codec::MapObligation>)> {
    let p = module.program();
    let mut out = vec![];
    let mut maps = vec![];
    for f in &p.functions {
        let mut w = Walk {
            p,
            function: f.name.clone(),
            next: 0,
            params: BTreeMap::new(),
            types: BTreeMap::new(),
            opaque: BTreeMap::new(),
            word_bounds: vec![],
            out: vec![],
            map_out: vec![],
            nodes: 0,
            measure: None,
        };
        let mut env = Scope::new();
        for (n, t) in &f.params {
            let v = w.fresh(t);
            env.insert(n.clone(), (t.clone(), v));
        }
        // The admitted module has checked every caller and its public ingress.
        // Carry those exact interface premises into the physical obligation;
        // unsupported scalar structure stays an opaque typed value. A producer
        // must still prove the site's actual bound under these premises.
        let mut facts = vec![];
        if let Some(specification) = crate::contracts::specification(p, &f.name) {
            for predicate in &specification.requires {
                let condition = w.scalar(predicate, &env, &Type::Bool, 0)?;
                facts.push(eq(condition, Term::Bool(true)));
            }
        }
        w.visit(&f.body, &env, &facts, &mut vec![], Some(&f.result), 0)
            .map_err(|error| format!("bounds function {}: {error}", f.name))?;
        out.extend(w.out);
        maps.extend(w.map_out);
        if out.len() + maps.len() > 4096 {
            return Err("physical capability site count limit".into());
        }
    }
    Ok((out, maps))
}
/// Proof-authoring projection only. No CheckedModule is created by this API.
/// The same lexical/scalar meanings used for bounds derive strict descent.
pub(crate) fn measure_obligations(p: &Program, f: &crate::core::Function, measure: &Expr) -> LangResult<Vec<Obligation>> {
    let measures=match measure {Expr::Call(name,args) if name=="list"=>args.iter().collect::<Vec<_>>(),_=>vec![measure]};
    if measures.is_empty()||measures.len()>16{return Err("termination product needs 1..16 unsigned components".into())}
    let types=measures.iter().map(|measure|check::infer(measure,&check::params_env(&f.params)?,p)).collect::<LangResult<Vec<_>>>()?;
    if types.iter().any(|ty|!matches!(ty,Type::U32|Type::U64)){return Err("termination measure must be an unsigned word".into())}
    let mut w = Walk {
        p, function: f.name.clone(), next: 0, params: BTreeMap::new(), types: BTreeMap::new(),
        opaque: BTreeMap::new(), word_bounds: vec![], out: vec![], map_out: vec![], nodes: 0, measure: None,
    };
    let mut env = Scope::new();
    for (n,t) in &f.params { let v=w.fresh(t); env.insert(n.clone(), (t.clone(), v)); }
    let mut current=vec![];
    for (measure,ty) in measures.into_iter().zip(types){let entry=w.scalar(measure,&env,&ty,0)?;current.push((measure.clone(),ty,entry));}
    w.measure=Some(current);
    w.visit(&f.body, &env, &[], &mut vec![], Some(&f.result), 0)?;
    let mut sites = BTreeSet::new();
    fn calls(e:&Expr,name:&str,path:&mut Vec<usize>,out:&mut BTreeSet<Vec<usize>>) {
        if matches!(e,Expr::Call(n,_) if n==name) {out.insert(path.clone());}
        for (i,child) in crate::analysis::children(e).into_iter().enumerate() {
            path.push(i); calls(child,name,path,out); path.pop();
        }
    }
    calls(&f.body,&f.name,&mut vec![],&mut sites);
    let recursive: Vec<_> = w.out.into_iter().filter(|g| sites.contains(&g.site.path)).collect();
    if sites.is_empty() || recursive.len()!=sites.len() || recursive.iter().map(|g|g.site.path.clone()).collect::<BTreeSet<_>>()!=sites {
        return Err("termination requires coverage of every recursive call; unsupported callback domain".into());
    }
    Ok(recursive)
}
pub fn obligations(module: &CheckedModule) -> LangResult<Vec<Obligation>> {
    Ok(derive(module)?.0)
}
pub fn map_obligations(
    module: &CheckedModule,
) -> LangResult<Vec<crate::column_codec::MapObligation>> {
    Ok(derive(module)?.1)
}
pub fn check(module: &CheckedModule, p: &Package) -> LangResult<CheckedBounds> {
    let view = registry::CheckedBundle::check(&p.knowledge)?;
    let source = module.identity()?;
    let goals: BTreeMap<_, _> = obligations(module)?
        .into_iter()
        .map(|g| (g.site.clone(), g))
        .collect();
    let mut sites = BTreeSet::new();
    for id in &view.bundle().roots {
        let entry = &view.bundle().objects[id];
        if entry.kind != registry::Kind::Definition
            || entry.semantics != SEMANTICS
            || !entry.dependencies.is_empty()
        {
            return Err("bounds certificate domain mismatch".into());
        }
        let c: Certificate =
            serde_json::from_value(entry.payload.clone()).map_err(|e| e.to_string())?;
        if c.source != source || !sites.insert(c.site.clone()) {
            return Err("bounds source or duplicate site mismatch".into());
        }
        let goal = goals.get(&c.site).ok_or("bounds source site missing")?;
        if c.obligation_sha256 != registry::identity(goal)? {
            return Err("bounds obligation mismatch".into());
        }
        let problem = crate::logic::Context::default().bitvector_problem(
            &goal.params,
            &goal.conditions,
            &goal.from,
            &goal.to,
        )?;
        bitproof::verify(&problem, &c.proof)?;
    }
    Ok(CheckedBounds { sites })
}

#[cfg(test)]
mod callback_image_tests {
    use super::*;

    #[test]
    fn opaque_fold_images_preserve_record_local_bindings() {
        let source = r#"module callback_images;
record Row { value:u32, }
fn scan(xs:List<Row>,index:u32)->u32 {
    var values:Buffer<u32>=Buffer.empty();
    for row in xs { let value=row.value; values=values.push(value); }
    let result=values.freeze();
    return result.at_or(index,0);
}
"#;
        let module=CheckedModule::from_source(crate::syntax::parse(source).unwrap()).unwrap();
        let goals=obligations(&module).unwrap();
        assert_eq!(goals.len(),1);
        assert_eq!(goals[0].site.function,"scan");
        // No bounds authority is created merely by succeeding at projection.
        assert!(matches!(goals[0].from,Term::Binary{ref op,..} if op=="<"));
    }

    #[test]
    fn opaque_callback_images_do_not_merge_distinct_captures() {
        let p=crate::syntax::parse("module image; record R { x:u32, }").unwrap();
        let w=Walk {p:&p,function:"test".into(),next:0,params:BTreeMap::new(),types:BTreeMap::new(),opaque:BTreeMap::new(),word_bounds:vec![],out:vec![],map_out:vec![],nodes:0,measure:None};
        let var=|n:&str|Expr::Var(n.into());
        let body=Expr::Lambda("row".into(),Box::new(Expr::Let("local".into(),None,Box::new(Expr::Field(Box::new(var("row")),"x".into())),Box::new(Expr::Binary("+".into(),Box::new(var("local")),Box::new(var("outer")))))));
        let env=|n|BTreeMap::from([("outer".into(),(Type::U32,Expr::Num(n)))]);
        assert_ne!(w.image(&body,&env(1),0).unwrap(),w.image(&body,&env(2),0).unwrap());
        assert_eq!(w.image(&body,&env(1),0).unwrap(),w.image(&body,&env(1),0).unwrap());
    }

    #[test]
    fn buffer_element_context_reaches_nested_unsigned_folds() {
        let p=crate::syntax::parse(r#"module nested_context;
fn collect(xs:List<u32>,n:u32)->List<u32>{
 let out:Buffer<u32>=Buffer.empty();
 return out.push(repeat_until(n,0,fn(s)=>false,fn(i)=>fn(s)=>s+xs.at_or(i,0))).freeze();
}
"#).unwrap();
        crate::analysis::typed_walk_context(&p,&p.functions[0],|e,_,want| {
            if matches!(e,Expr::Call(n,_)if n=="repeat_until") {assert_eq!(want,Some(&Type::U32));}
        }).unwrap();
        let goals=obligations(&CheckedModule::from_source(p).unwrap()).unwrap();
        assert_eq!(goals.len(),1);
        assert_eq!(goals[0].site.function,"collect");
    }
}
