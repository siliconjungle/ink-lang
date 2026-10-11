//! Bounded source-derived collection facts for literal target storage placement.
//!
//! Facts are advisory, recomputed from the selected checked program, and never
//! grant equality or admission authority. Unknown constructs, recursion and
//! exhausted budgets lose facts. Allocation failure is outside pure totality.
use crate::{
    check,
    core::{Expr, Program, Type},
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LengthExpr {
    Input(String),
    Constant(usize),
    Sum(Box<Self>, Box<Self>),
    Min(Box<Self>, Box<Self>),
    Max(Box<Self>, Box<Self>),
}
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct LengthFacts {
    pub exact: Option<LengthExpr>,
    pub upper_bound: Option<LengthExpr>,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Ownership {
    Borrowed,
    Fresh,
    Unknown,
}
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Facts {
    pub ty: Option<Type>,
    pub length: LengthFacts,
    /// Possible borrowed result origins. Fresh storage has no borrowed aliases.
    pub aliases: BTreeSet<String>,
    /// Lexically free caller values read, including through helper arguments.
    pub captures: BTreeSet<String>,
    pub ownership: Ownership,
    pub pure_total: bool,
}
impl Facts {
    fn unknown(ty: Option<Type>) -> Self {
        Self {
            ty,
            length: LengthFacts::default(),
            aliases: BTreeSet::new(),
            captures: BTreeSet::new(),
            ownership: Ownership::Unknown,
            pure_total: false,
        }
    }
    fn scalar(ty: Option<Type>) -> Self {
        Self {
            pure_total: true,
            ..Self::unknown(ty)
        }
    }
    fn input(name: &str, ty: &Type) -> Self {
        let mut out = Self::scalar(Some(ty.clone()));
        out.captures.insert(name.into());
        if matches!(ty, Type::List(_)) {
            out.ownership = Ownership::Borrowed;
            out.aliases.insert(name.into());
            out.length = LengthFacts {
                exact: Some(LengthExpr::Input(name.into())),
                upper_bound: Some(LengthExpr::Input(name.into())),
            };
        }
        out
    }
}
type Env = BTreeMap<String, Facts>;
const MAX_NODES: usize = 16_384;
const MAX_DEPTH: usize = 16;
const MAX_HELPERS: usize = 8;
// A cheap explicit-stack preflight precedes every recursive type query and
// helper-body expansion. Nested emitter frames cannot add an unbounded typing
// traversal even when only a shallow prefix of facts would be consumed.
fn bounded(e: &Expr) -> bool {
    let mut pending = vec![(e, 0usize)];
    let mut nodes = 0;
    while let Some((e, depth)) = pending.pop() {
        nodes += 1;
        if depth > MAX_DEPTH || nodes > MAX_NODES {
            return false;
        }
        match e {
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
                pending.push((a, depth + 1));
                pending.push((b, depth + 1));
            }
            Expr::Neg(a) | Expr::Lambda(_, a) | Expr::Field(a, _) | Expr::Try(a) => {
                pending.push((a, depth + 1))
            }
            Expr::Call(_, a) => pending.extend(a.iter().map(|a| (a, depth + 1))),
            Expr::Method(a, _, b) => {
                pending.push((a, depth + 1));
                pending.extend(b.iter().map(|b| (b, depth + 1)));
            }
            Expr::Record(_, a) => pending.extend(a.iter().map(|(_, a)| (a, depth + 1))),
            _ => {}
        }
    }
    true
}

struct Analysis<'a> {
    p: &'a Program,
    remaining: usize,
    helpers: Vec<String>,
}
fn types(env: &Env) -> check::Env {
    env.iter()
        .filter_map(|(n, f)| f.ty.clone().map(|t| (n.clone(), t)))
        .collect()
}
fn merged(mut out: Facts, args: &[Facts]) -> Facts {
    out.pure_total &= args.iter().all(|a| a.pure_total);
    for a in args {
        out.captures.extend(a.captures.iter().cloned());
    }
    out
}
fn pair(
    a: Option<LengthExpr>,
    b: Option<LengthExpr>,
    op: fn(Box<LengthExpr>, Box<LengthExpr>) -> LengthExpr,
) -> Option<LengthExpr> {
    Some(op(Box::new(a?), Box::new(b?)))
}
impl Analysis<'_> {
    fn walk(&mut self, e: &Expr, env: &Env, want: Option<&Type>, depth: usize) -> Facts {
        if self.remaining == 0 || depth > MAX_DEPTH || !bounded(e) {
            return Facts::unknown(want.cloned());
        }
        self.remaining -= 1;
        let inferred = check::infer_context(e, &types(env), self.p, want).ok();
        let next = depth + 1;
        match e {
            Expr::Var(n) => env
                .get(n)
                .cloned()
                .unwrap_or_else(|| Facts::unknown(inferred)),
            Expr::Num(_) | Expr::Float(_) | Expr::Bool(_) | Expr::Unit => Facts::scalar(inferred),
            Expr::Neg(a) => {
                let x = self.walk(a, env, inferred.as_ref(), next);
                merged(Facts::scalar(inferred), &[x])
            }
            Expr::Binary(_, a, b) => {
                let x = self.walk(a, env, None, next);
                let y = self.walk(b, env, x.ty.as_ref(), next);
                merged(Facts::scalar(inferred), &[x, y])
            }
            Expr::Record(_, fields) => {
                let args = fields
                    .iter()
                    .map(|(_, e)| self.walk(e, env, None, next))
                    .collect::<Vec<_>>();
                merged(Facts::scalar(inferred), &args)
            }
            Expr::Field(a, _) => {
                let x = self.walk(a, env, None, next);
                let mut out = merged(Facts::scalar(inferred.clone()), &[x]);
                if matches!(inferred, Some(Type::List(_))) {
                    out.ownership = Ownership::Unknown;
                    out.pure_total = false;
                }
                out
            }
            Expr::Let(n, annotation, a, b) => {
                let x = self.walk(a, env, annotation.as_deref(), next);
                let mut local = env.clone();
                local.insert(n.clone(), x.clone());
                let out = self.walk(b, &local, want, next);
                merged(out, &[x])
            }
            Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
                let c = self.walk(&args[0], env, Some(&Type::Bool), next);
                let a = self.walk(&args[1], env, inferred.as_ref(), next);
                let b = self.walk(&args[2], env, inferred.as_ref(), next);
                let mut out = Facts::scalar(inferred);
                out.ownership = if a.ownership == b.ownership {
                    a.ownership.clone()
                } else {
                    Ownership::Unknown
                };
                out.aliases
                    .extend(a.aliases.iter().chain(&b.aliases).cloned());
                if a.length.exact == b.length.exact {
                    out.length.exact = a.length.exact.clone();
                }
                out.length.upper_bound = if a.length.upper_bound == b.length.upper_bound {
                    a.length.upper_bound.clone()
                } else {
                    pair(
                        a.length.upper_bound.clone(),
                        b.length.upper_bound.clone(),
                        LengthExpr::Max,
                    )
                };
                merged(out, &[c, a, b])
            }
            Expr::Call(n, args) if self.p.functions.iter().any(|f| &f.name == n) => {
                let f = self.p.functions.iter().find(|f| &f.name == n).unwrap();
                if self.helpers.len() >= MAX_HELPERS
                    || self.helpers.contains(n)
                    || !bounded(&f.body)
                {
                    return Facts::unknown(Some(f.result.clone()));
                }
                let f = f.clone();
                let mut local = Env::new();
                let mut values = Vec::new();
                for (a, (n, t)) in args.iter().zip(&f.params) {
                    let v = self.walk(a, env, Some(t), next);
                    local.insert(n.clone(), v.clone());
                    values.push(v);
                }
                self.helpers.push(f.name.clone());
                let out = self.walk(&f.body, &local, Some(&f.result), next);
                self.helpers.pop();
                merged(out, &values)
            }
            Expr::Call(n, args)
                if [
                    "quot_or", "rem_or", "vec2", "vec3", "vec4", "length", "count", "sum",
                ]
                .contains(&n.as_str()) =>
            {
                let values = args
                    .iter()
                    .map(|a| self.walk(a, env, None, next))
                    .collect::<Vec<_>>();
                merged(Facts::scalar(inferred), &values)
            }
            Expr::Method(receiver, m, args)
                if [
                    "map",
                    "map_indexed",
                    "filter",
                    "scan",
                    "sort",
                    "concat",
                    "zip",
                ]
                .contains(&m.as_str()) =>
            {
                let context = if m == "filter" || m == "concat" {
                    inferred.as_ref()
                } else {
                    None
                };
                let src = self.walk(receiver, env, context, next);
                let mut values = vec![src.clone()];
                let mut out = Facts::scalar(inferred.clone());
                out.ownership = Ownership::Fresh;
                out.length = src.length.clone();
                if m == "concat" || m == "zip" {
                    let other = self.walk(
                        &args[0],
                        env,
                        if m == "concat" {
                            inferred.as_ref()
                        } else {
                            None
                        },
                        next,
                    );
                    let operator = if m == "concat" {
                        LengthExpr::Sum
                    } else {
                        LengthExpr::Min
                    };
                    out.length = LengthFacts {
                        exact: pair(
                            src.length.exact.clone(),
                            other.length.exact.clone(),
                            operator,
                        ),
                        upper_bound: pair(
                            src.length.upper_bound.clone(),
                            other.length.upper_bound.clone(),
                            operator,
                        ),
                    };
                    values.push(other);
                }
                if m == "filter" {
                    out.length.exact = None;
                }
                if m == "map" || m == "filter" || m == "map_indexed" || m == "zip" {
                    let input = match src.ty.as_ref() {
                        Some(Type::List(t)) => Some(t.as_ref().clone()),
                        _ => None,
                    };
                    let output = if m == "filter" {
                        Some(Type::Bool)
                    } else {
                        match inferred.as_ref() {
                            Some(Type::List(t)) => Some(t.as_ref().clone()),
                            _ => None,
                        }
                    };
                    let parameters = if m == "map_indexed" {
                        vec![Some(Type::U32), input]
                    } else if m == "zip" {
                        vec![
                            input,
                            match values[1].ty.as_ref() {
                                Some(Type::List(t)) => Some(t.as_ref().clone()),
                                _ => None,
                            },
                        ]
                    } else {
                        vec![input]
                    };
                    let cb = if m == "zip" { &args[1] } else { &args[0] };
                    values.push(self.callback(cb, env, &parameters, output.as_ref(), next));
                }
                merged(out, &values)
            }
            Expr::Method(receiver, m, args) if m == "at_or" => {
                let mut values = vec![self.walk(receiver, env, None, next)];
                values.extend(args.iter().map(|a| self.walk(a, env, None, next)));
                let mut out = merged(Facts::scalar(inferred.clone()), &values);
                if matches!(inferred, Some(Type::List(_))) {
                    out.ownership = Ownership::Unknown;
                    out.pure_total = false;
                }
                out
            }
            // Potential error propagation, temporary mutation, unbounded helper
            // closure and unsupported primitives retain no storage authority.
            _ => Facts::unknown(inferred),
        }
    }
    fn callback(
        &mut self,
        e: &Expr,
        env: &Env,
        params: &[Option<Type>],
        want: Option<&Type>,
        depth: usize,
    ) -> Facts {
        let mut local = env.clone();
        let mut body = e;
        for ty in params {
            let Expr::Lambda(n, b) = body else {
                return Facts::unknown(want.cloned());
            };
            local.insert(n.clone(), Facts::scalar(ty.clone()));
            body = b;
        }
        self.walk(body, &local, want, depth)
    }
}
/// Infer from the actual selected typed body. No database metadata is consumed.
pub fn infer(p: &Program, e: &Expr, env: &check::Env, want: Option<&Type>) -> Facts {
    let local = env
        .iter()
        .map(|(n, t)| (n.clone(), Facts::input(n, t)))
        .collect();
    Analysis {
        p,
        remaining: MAX_NODES,
        helpers: Vec::new(),
    }
    .walk(e, &local, want, 0)
}
/// A literal alias tail, with neither reads nor computation between binding and
/// return. This permits destination placement without deleting source work.
pub fn returned_alias(e: &Expr, name: &str) -> bool {
    match e {
        Expr::Var(n) => n == name,
        Expr::Let(n, _, a, b) => {
            matches!(a.as_ref(),Expr::Var(v) if v==name) && returned_alias(b, n)
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{core::CheckedModule, syntax::parse};
    fn fixture() -> Program {
        let p=parse("module facts;fn id(xs:List<u32>)->List<u32>{return xs;}fn make(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}fn nested(xs:List<u32>)->List<u32>{return make(id(xs));}fn exact(xs:List<u32>,ys:List<u32>,c:Bool)->List<u32>{return choose(c,nested(xs),xs.map(fn(x)=>x*2));}fn bounds(xs:List<u32>,ys:List<u32>,c:Bool)->List<u32>{return choose(c,xs.filter(fn(x)=>x>0),ys);}fn joined(xs:List<u32>,ys:List<u32>)->List<u32>{return make(xs).concat(ys).zip(xs,fn(x)=>fn(y)=>x+y);}fn read(xs:List<u32>,x:u32)->u32{return xs.at_or(x,0);}fn safe(xs:List<u32>)->List<u32>{return nested(xs).map_indexed(fn(i)=>fn(x)=>x+i);}fn captures(xs:List<u32>)->List<u32>{return nested(xs).map(fn(x)=>read(xs,x));}fn borrowed(xs:List<u32>)->List<u32>{return id(xs).map(fn(x)=>x+1);}fn shared(xs:List<u32>)->List<u32>{let a=make(xs);return a.map(fn(x)=>x+1);}fn shadow(xs:List<u32>)->List<u32>{return make(xs).map(fn(xs)=>xs+1);}").unwrap();
        CheckedModule::from_source(p.clone()).unwrap();
        p
    }
    fn facts(p: &Program, name: &str) -> Facts {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        infer(
            p,
            &f.body,
            &check::params_env(&f.params).unwrap(),
            Some(&f.result),
        )
    }
    #[test]
    fn composition_lengths_aliases_and_branch_bounds_are_source_derived() {
        let p = fixture();
        let xs = LengthExpr::Input("xs".into());
        let ys = LengthExpr::Input("ys".into());
        let id = facts(&p, "id");
        assert_eq!(id.ownership, Ownership::Borrowed);
        assert_eq!(id.aliases, BTreeSet::from(["xs".into()]));
        let nested = facts(&p, "nested");
        assert_eq!(nested.ownership, Ownership::Fresh);
        assert!(nested.aliases.is_empty());
        assert_eq!(nested.length.exact, Some(xs.clone()));
        assert!(nested.pure_total);
        assert_eq!(facts(&p, "exact").length.exact, Some(xs.clone()));
        let bounded = facts(&p, "bounds");
        assert_eq!(bounded.length.exact, None);
        assert_eq!(
            bounded.length.upper_bound,
            Some(LengthExpr::Max(Box::new(xs.clone()), Box::new(ys.clone())))
        );
        assert_eq!(
            facts(&p, "joined").length.exact,
            Some(LengthExpr::Min(
                Box::new(LengthExpr::Sum(Box::new(xs.clone()), Box::new(ys))),
                Box::new(xs)
            ))
        );
    }
    #[test]
    fn returned_alias_tracks_only_lexical_alias_bindings() {
        let e =
            parse("module a;fn a(xs:List<u32>)->List<u32>{let x=xs;let y=x;return y;}").unwrap();
        let f = &e.functions[0];
        let Expr::Let(n, _, _, b) = &f.body else {
            panic!()
        };
        assert!(returned_alias(b, n));
        let e = parse("module a;fn a(xs:List<u32>)->List<u32>{let x=xs;let n=length(x);return x;}")
            .unwrap();
        let Expr::Let(n, _, _, b) = &e.functions[0].body else {
            panic!()
        };
        assert!(!returned_alias(b, n));
    }
    #[test]
    fn recursion_unknown_effects_and_error_propagation_lose_facts() {
        let mut p = fixture();
        let f = p.functions.iter_mut().find(|f| f.name == "make").unwrap();
        f.body = Expr::Call("make".into(), vec![Expr::Var("xs".into())]);
        let got = facts(&p, "nested");
        assert!(!got.pure_total);
        assert_eq!(got.ownership, Ownership::Unknown);
        assert_eq!(got.length.exact, None);
        let env = BTreeMap::from([("xs".into(), Type::List(Box::new(Type::U32)))]);
        for e in [
            Expr::Call("missing".into(), vec![]),
            Expr::Try(Box::new(Expr::Num(1))),
            Expr::Call("buffer".into(), vec![Expr::Var("xs".into())]),
        ] {
            assert!(!infer(&p, &e, &env, None).pure_total);
        }
        let p = Program::default();
        let mut e = Expr::Num(1);
        for _ in 0..80 {
            e = Expr::Neg(Box::new(e));
        }
        assert!(!infer(&p, &e, &BTreeMap::new(), Some(&Type::I32)).pure_total);
    }
}
