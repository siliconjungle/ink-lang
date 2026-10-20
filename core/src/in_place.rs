//! Unique-ownership facts for private list storage. A lowering fact, not a
//! proof rule: it never changes a program's meaning, only whether a backend
//! may extend a list's storage instead of copying it.
//!
//! `xs.concat(ys)` may append to `xs`'s storage when nothing can observe the
//! old `xs` afterwards: this occurrence is the final use of its place, and the
//! place's outer list is referenced by nothing else. Ownership starts at fresh
//! allocations (list literals and list operations that build a new list),
//! moves through final uses, `let`, record fields, `choose` and fold
//! accumulators, and is lost by any earlier use that could retain a reference
//! (binding, storing, returning, capture, a call that may return its input).
//! Parameters, list elements and anything a callback captures are never owned.
//! Every unknown construct fails closed to copying.
use crate::check;
use crate::core::{Expr, Program, Type};
use std::collections::{BTreeMap, BTreeSet};

/// Receiver expressions (`Var` or `Field(Var, _)`) whose `concat` may append
/// in place. Identities refer to this borrowed tree only.
#[derive(Default, Debug)]
pub struct InPlace {
    sites: BTreeSet<usize>,
    reusable: BTreeSet<usize>,
}
impl InPlace {
    pub fn contains(&self, receiver: &Expr) -> bool {
        self.sites.contains(&ptr(receiver))
    }
    pub fn len(&self) -> usize {
        self.sites.len()
    }
    pub fn is_empty(&self) -> bool {
        self.sites.is_empty()
    }
    /// Unique, dead outer-list storage for a sequential stage or call argument. This does not
    /// authorize element reuse, stage reordering, or moving a shared parameter.
    pub fn can_reuse(&self, receiver: &Expr) -> bool {
        self.reusable.contains(&ptr(receiver))
    }
}

/// Methods whose result is a newly allocated outer list in every backend that
/// consumes these facts.
const FRESH: &[&str] = &["concat", "map", "filter", "take", "drop", "sort", "scan", "zip", "map_indexed"];
/// Receiver positions that only read the list.
const READS: &[&str] = &["concat", "map", "filter", "take", "drop", "sort", "scan", "zip", "map_indexed", "at_or"];
const FOLDS: &[&str] = &["foldl", "foldr"];
const MAX_NODES: usize = 4096;

fn ptr(e: &Expr) -> usize {
    e as *const Expr as usize
}

type Place = (usize, Option<String>);

#[derive(Default)]
struct Facts {
    /// Variable occurrence -> binding identity.
    binding: BTreeMap<usize, usize>,
    /// Binder node (`Let` or `Lambda`) -> identity of the name it binds.
    binders: BTreeMap<usize, usize>,
    /// Identities read inside a lambda that binds them outside it.
    captured: BTreeSet<usize>,
    /// Occurrences (the Var, or the Field over a Var) that end their place.
    finals: BTreeSet<usize>,
    /// Places some earlier occurrence may have retained. `(id, None)` retains
    /// the whole value and therefore every field.
    retained: BTreeSet<Place>,
}

fn resolve(e: &Expr, env: &BTreeMap<String, usize>, scope: usize, f: &mut Facts, next: &mut usize) {
    match e {
        Expr::Var(n) => {
            if let Some(id) = env.get(n) {
                f.binding.insert(ptr(e), *id);
                if *id < scope {
                    f.captured.insert(*id);
                }
            }
        }
        Expr::Let(n, _, a, b) => {
            resolve(a, env, scope, f, next);
            let mut local = env.clone();
            local.insert(n.clone(), *next);
            f.binders.insert(ptr(e), *next);
            *next += 1;
            resolve(b, &local, scope, f, next);
        }
        Expr::Lambda(..) => {
            // Curried parameters share one invocation scope; everything bound
            // before it is captured.
            let start = *next;
            let mut local = env.clone();
            let mut body = e;
            while let Expr::Lambda(n, b) = body {
                local.insert(n.clone(), *next);
                f.binders.insert(ptr(body), *next);
                *next += 1;
                body = b;
            }
            resolve(body, &local, start, f, next);
        }
        _ => {
            for c in crate::analysis::children(e) {
                resolve(c, env, scope, f, next);
            }
        }
    }
}

fn place(e: &Expr, f: &Facts) -> Option<(usize, Place)> {
    match e {
        Expr::Var(_) => f.binding.get(&ptr(e)).map(|id| (ptr(e), (*id, None))),
        Expr::Field(inner, field) => match inner.as_ref() {
            Expr::Var(_) => f
                .binding
                .get(&ptr(inner))
                .map(|id| (ptr(e), (*id, Some(field.clone())))),
            _ => None,
        },
        _ => None,
    }
}

fn is_live(live: &BTreeSet<Place>, p: &Place) -> bool {
    match &p.1 {
        None => live.iter().any(|(id, _)| *id == p.0),
        Some(_) => live.contains(&(p.0, None)) || live.contains(p),
    }
}

/// Backward liveness in evaluation order. Branches of `choose` and the right
/// operand of `&&`/`||` may not run. A lambda body is its own invocation scope.
fn liveness(e: &Expr, mut live: BTreeSet<Place>, f: &mut Facts) -> BTreeSet<Place> {
    if let Some((occurrence, p)) = place(e, f) {
        if !f.captured.contains(&p.0) && !is_live(&live, &p) {
            f.finals.insert(occurrence);
        }
        live.insert(p);
        return live;
    }
    match e {
        Expr::Let(_, _, a, b) => {
            let after = liveness(b, live, f);
            liveness(a, after, f)
        }
        Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
            let mut join = liveness(&args[1], live.clone(), f);
            join.extend(liveness(&args[2], live, f));
            liveness(&args[0], join, f)
        }
        Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
            let mut join = liveness(b, live.clone(), f);
            join.extend(live);
            liveness(a, join, f)
        }
        Expr::Lambda(..) => {
            let mut body = e;
            while let Expr::Lambda(_, b) = body {
                body = b;
            }
            liveness(body, BTreeSet::new(), f);
            live
        }
        _ => {
            for c in crate::analysis::children(e).into_iter().rev() {
                live = liveness(c, live, f);
            }
            live
        }
    }
}

fn contains_list(t: &Type, p: &Program, seen: &mut BTreeSet<String>) -> bool {
    match t {
        Type::List(_) | Type::Buffer(_) | Type::Map(..) | Type::Table(..) | Type::Vector(..) => true,
        Type::Option(t) => contains_list(t, p, seen),
        Type::Result(a, b) => contains_list(a, p, seen) || contains_list(b, p, seen),
        Type::Named(n) if seen.insert(n.clone()) => p
            .records
            .get(n)
            .is_some_and(|fs| fs.iter().any(|(_, t)| contains_list(t, p, seen))),
        Type::Named(_) => true,
        Type::Unknown => true,
        _ => false,
    }
}

fn mentions_root(args: &[Expr], root: usize, facts: &Facts) -> bool {
    let mut found = false;
    for arg in args {
        crate::analysis::walk(arg, |node| {
            found |= place(node, facts).is_some_and(|(_, other)| other.0 == root);
        });
    }
    found
}

/// Mark places whose earlier, non-final occurrences sit where the value may
/// be retained. A final occurrence is a move and retains nothing.
fn retention(e: &Expr, parent: Option<(&Expr, usize)>, f: &mut Facts, p: &Program) {
    if let Some((occurrence, pl)) = place(e, f) {
        if !f.finals.contains(&occurrence) {
            let reads = match parent {
                Some((Expr::Method(_, m, args), 0)) => {
                    // A receiver is evaluated before its arguments, but read
                    // afterward. Keep its pending loan when a later operand
                    // mentions the same root (e.g. a.zip(a.map(...), ...)).
                    READS.contains(&m.as_str()) && !mentions_root(args, pl.0, f)
                },
                Some((Expr::Method(_, m, _), _)) => m == "concat",
                Some((Expr::Binary(..), _)) | Some((Expr::Field(..), _)) => true,
                Some((Expr::Call(n, args), 0)) if FOLDS.contains(&n.as_str()) || n == "fold_until" => !mentions_root(&args[1..], pl.0, f),
                Some((Expr::Call(n, args), index)) => !mentions_root(&args[index+1..], pl.0, f) && p
                    .functions
                    .iter()
                    .find(|g| &g.name == n)
                    .is_some_and(|g| !contains_list(&g.result, p, &mut BTreeSet::new())),
                _ => false,
            };
            if !reads {
                f.retained.insert(pl);
            }
        }
        if matches!(e, Expr::Field(..)) {
            return;
        }
    }
    for (i, c) in crate::analysis::children(e).into_iter().enumerate() {
        retention(c, Some((e, i)), f, p);
    }
}

#[derive(Clone)]
struct Binding {
    id: usize,
    ty: Type,
    owned: bool,
}
type Scope = BTreeMap<String, Binding>;

struct Owner<'a> {
    p: &'a Program,
    f: &'a Facts,
    sites: BTreeSet<usize>,
    reusable: BTreeSet<usize>,
    fresh_functions: &'a BTreeSet<String>,
}

impl Owner<'_> {
    fn list_free(&self, t: &Type) -> bool {
        !contains_list(t, self.p, &mut BTreeSet::new())
    }
    /// Values whose owned storage is exactly their outer list or their direct
    /// list fields. Nested list-bearing structure is never treated as owned.
    fn ownable(&self, t: &Type) -> bool {
        match t {
            Type::List(_) => true,
            Type::Named(n) => self.p.records.get(n).is_some_and(|fs| {
                fs.iter().all(|(_, t)| matches!(t, Type::List(_)) || self.list_free(t))
            }),
            _ => false,
        }
    }
    fn usable(&self, pl: &Place, b: &Binding) -> bool {
        b.owned
            && !self.f.captured.contains(&pl.0)
            && match &pl.1 {
                None => !self.f.retained.iter().any(|(id, _)| *id == pl.0),
                Some(_) => !self.f.retained.contains(&(pl.0, None)) && !self.f.retained.contains(pl),
            }
    }
    fn infer(&self, e: &Expr, scope: &Scope) -> Option<Type> {
        self.infer_as(e, scope, None)
    }
    fn infer_as(&self, e: &Expr, scope: &Scope, want: Option<&Type>) -> Option<Type> {
        let env: check::Env = scope.iter().map(|(n, b)| (n.clone(), b.ty.clone())).collect();
        check::infer_context(e, &env, self.p, want).ok()
    }
    /// Whether `e`'s value owns its storage, recording in-place sites found on
    /// the way. `None` aborts the whole analysis (fail closed).
    fn owned(&mut self, e: &Expr, scope: &Scope, want: Option<&Type>, depth: usize) -> Option<bool> {
        if depth > 256 {
            return None;
        }
        let ty = self.infer_as(e, scope, want);
        // Values without lists cannot alias list storage.
        let trivially = ty.as_ref().is_some_and(|t| self.list_free(t));
        if let Some((occurrence, pl)) = place(e, self.f) {
            let binding = scope.values().find(|b| b.id == pl.0);
            let owned = binding.is_some_and(|b| {
                self.f.finals.contains(&occurrence)
                    && self.usable(&pl, b)
                    && ty.as_ref().is_some_and(|t| self.ownable(t))
            });
            return Some(trivially || owned);
        }
        Some(match e {
            Expr::Let(n, annotation, a, b) => {
                let owned = self.owned(a, scope, annotation.as_deref(), depth + 1)?;
                // Unannotated literals may not infer without context; such a
                // binding is simply never owned.
                let ty = match annotation {
                    Some(t) => (**t).clone(),
                    None => self.infer_as(a, scope, None).unwrap_or(Type::Unknown),
                };
                let id = *self.f.binders.get(&ptr(e))?;
                let mut local = scope.clone();
                let owned = owned && self.ownable(&ty);
                local.insert(n.clone(), Binding { id, ty, owned });
                self.owned(b, &local, want, depth + 1)?
            }
            Expr::Call(n, args) if n == "list" => {
                for a in args {
                    self.owned(a, scope, None, depth + 1)?;
                }
                true
            }
            Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
                self.owned(&args[0], scope, None, depth + 1)?;
                let branch = ty.clone().or_else(|| want.cloned());
                let a = self.owned(&args[1], scope, branch.as_ref(), depth + 1)?;
                let b = self.owned(&args[2], scope, branch.as_ref(), depth + 1)?;
                trivially || (a && b)
            }
            Expr::Call(n, args)
                if FOLDS.contains(&n.as_str()) && args.len() == 3 && matches!(&args[2], Expr::Lambda(_, b) if matches!(b.as_ref(), Expr::Lambda(..))) =>
            {
                self.owned(&args[0], scope, None, depth + 1)?;
                let init = self.owned(&args[1], scope, ty.as_ref().or(want), depth + 1)?;
                // `[]` has no type of its own; the fold's result type is the
                // accumulator's. Without types, the step is analysed unowned.
                let types = match (self.infer(&args[0], scope), self.infer_as(&args[1], scope, ty.as_ref().or(want)).or_else(|| ty.clone())) {
                    (Some(Type::List(element)), Some(accumulator)) => Some((element, accumulator)),
                    _ => None,
                };
                let Some((element, accumulator)) = types else {
                    self.owned(&args[2], scope, None, depth + 1)?;
                    return Some(trivially);
                };
                let Expr::Lambda(x, inner) = &args[2] else { unreachable!() };
                let Expr::Lambda(acc, body) = inner.as_ref() else { unreachable!() };
                let xid = *self.f.binders.get(&ptr(&args[2]))?;
                let aid = *self.f.binders.get(&ptr(inner.as_ref()))?;
                let bind = |owned: bool, this: &Self| {
                    let mut local = scope.clone();
                    local.insert(x.clone(), Binding { id: xid, ty: (*element).clone(), owned: false });
                    let owned = owned && this.ownable(&accumulator);
                    local.insert(acc.clone(), Binding { id: aid, ty: accumulator.clone(), owned });
                    local
                };
                // Assume the accumulator is owned; keep the assumption only if
                // every step returns an owned accumulator (induction over the
                // iterations). Sites found under a failed assumption are dropped.
                let saved = self.sites.clone();
                let saved_reusable = self.reusable.clone();
                let assumed = init && {
                    let local = bind(true, self);
                    self.owned(body, &local, Some(&accumulator), depth + 1)?
                };
                if !assumed {
                    self.sites = saved;
                    self.reusable = saved_reusable;
                    let local = bind(false, self);
                    self.owned(body, &local, Some(&accumulator), depth + 1)?;
                }
                trivially || assumed
            }
            Expr::Method(receiver, m, args) => {
                let receiver_owned = self.owned(receiver, scope, None, depth + 1)?;
                for a in args {
                    self.owned(a, scope, None, depth + 1)?;
                }
                if m == "concat" && args.len() == 1 && receiver_owned && place(receiver, self.f).is_some()
                    && matches!(self.infer(receiver, scope), Some(Type::List(_)))
                {
                    self.sites.insert(ptr(receiver));
                }
                if receiver_owned && matches!(self.infer(receiver, scope), Some(Type::List(_)))
                    && ["map", "map_indexed", "filter", "scan"].contains(&m.as_str()) {
                    self.reusable.insert(ptr(receiver));
                }
                trivially || FRESH.contains(&m.as_str())
            }
            Expr::Call(n, args) => {
                for a in args {
                    let owned = self.owned(a, scope, None, depth + 1)?;
                    if owned && self.p.functions.iter().any(|f| &f.name == n)
                        && matches!(self.infer(a, scope), Some(Type::List(_))) {
                        self.reusable.insert(ptr(a));
                    }
                }
                trivially || self.fresh_functions.contains(n)
            }
            Expr::Record(name, fields) => {
                let mut all = true;
                let declared = self.p.records.get(name);
                for (field, value) in fields {
                    let owned = self.owned(value, scope, None, depth + 1)?;
                    let declared = declared.and_then(|fs| fs.iter().find(|(n, _)| n == field)).map(|(_, t)| t);
                    if !declared.is_some_and(|t| self.list_free(t)) {
                        all &= owned;
                    }
                }
                trivially || (all && ty.as_ref().is_some_and(|t| self.ownable(t)))
            }
            Expr::Field(inner, _) => {
                // A field of a temporary record, which dies here.
                let owned = self.owned(inner, scope, None, depth + 1)?;
                trivially || (owned && ty.as_ref().is_some_and(|t| self.ownable(t)))
            }
            Expr::Lambda(..) => {
                // Other callbacks: parameters are never owned; their own fresh
                // locals still may be.
                let mut body = e;
                let mut local = scope.clone();
                while let Expr::Lambda(n, b) = body {
                    let id = *self.f.binders.get(&ptr(body))?;
                    local.insert(n.clone(), Binding { id, ty: Type::Unknown, owned: false });
                    body = b;
                }
                self.owned(body, &local, None, depth + 1)?;
                false
            }
            _ => {
                for c in crate::analysis::children(e) {
                    self.owned(c, scope, None, depth + 1)?;
                }
                trivially
            }
        })
    }
}

/// In-place append sites of one function body.
pub fn analyse(body: &Expr, params: &[(String, Type)], p: &Program) -> InPlace {
    analyse_with_result(body, params, None, p)
}

/// As `analyse`, with the body's declared result type as inference context.
pub fn analyse_with_result(body: &Expr, params: &[(String, Type)], result: Option<&Type>, p: &Program) -> InPlace {
    analyse_with_unique_lists(body, params, result, p, &[])
}

/// Private literal expansion may transfer a proven unique List argument into
/// its corresponding parameter. The caller must supply facts from this same
/// analysis; public/borrowed parameters must always use the ordinary entry.
pub fn analyse_with_unique_lists(body: &Expr, params: &[(String, Type)], result: Option<&Type>, p: &Program,
    unique: &[bool]) -> InPlace {
    // Bottom-up summaries start with shared parameters and no assumptions.
    // Only wholly fresh results propagate across calls; identity/recursive or
    // exhausted helpers retain ordinary copying. Summaries never import sites
    // from another borrowed expression tree.
    let mut fresh = BTreeSet::new();
    let mut remaining = 16_384usize;
    for _ in 0..8 {
        let before = fresh.len();
        for f in &p.functions {
            if fresh.contains(&f.name) || !matches!(f.result, Type::List(_) | Type::Named(_)) { continue; }
            let allowance = remaining.min(MAX_NODES);
            let Some(nodes) = crate::analysis::node_count(&f.body, allowance) else {
                remaining -= allowance;
                if remaining == 0 { break; }
                continue;
            };
            remaining -= nodes;
            if analyse_known(&f.body, &f.params, Some(&f.result), p, &fresh, &[]).is_some_and(|(_, owned)| owned) {
                fresh.insert(f.name.clone());
            }
            if remaining == 0 { break; }
        }
        if fresh.len() == before || remaining == 0 { break; }
    }
    let mut ordinary = analyse_known(body, params, result, p, &BTreeSet::new(), unique)
        .map_or_else(InPlace::default, |(sites, _)| sites);
    // Existing append consumers retain their original facts. New consumers
    // explicitly request the stronger cross-helper storage-reuse capability.
    if let Some((extended, _)) = analyse_known(body, params, result, p, &fresh, unique) {
        ordinary.reusable = extended.reusable;
    }
    ordinary
}

fn analyse_known(body: &Expr, params: &[(String, Type)], result: Option<&Type>, p: &Program,
    fresh_functions: &BTreeSet<String>, unique: &[bool]) -> Option<(InPlace, bool)> {
    if crate::analysis::node_count(body, MAX_NODES).is_none() {
        return None;
    }
    let mut f = Facts::default();
    let mut next = params.len();
    let env: BTreeMap<String, usize> = params.iter().enumerate().map(|(i, (n, _))| (n.clone(), i)).collect();
    resolve(body, &env, 0, &mut f, &mut next);
    liveness(body, BTreeSet::new(), &mut f);
    retention(body, None, &mut f, p);
    let scope: Scope = params
        .iter()
        .enumerate()
        .map(|(i, (n, t))| (n.clone(), Binding { id: i, ty: t.clone(), owned: matches!(t,Type::List(_)) && unique.get(i)==Some(&true) }))
        .collect();
    let mut owner = Owner { p, f: &f, sites: BTreeSet::new(), reusable: BTreeSet::new(), fresh_functions };
    let owned = owner.owned(body, &scope, result, 0)?;
    Some((InPlace { sites: owner.sites, reusable: owner.reusable }, owned))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sites(source: &str) -> BTreeMap<String, usize> {
        let p = crate::syntax::parse(source).unwrap();
        let module = crate::core::CheckedModule::from_source(p).unwrap();
        let p = module.program();
        p.functions
            .iter()
            .map(|f| (f.name.clone(), analyse_with_result(&f.body, &f.params, Some(&f.result), p).len()))
            .collect()
    }
    #[test]
    fn accumulating_loops_append_in_place() {
        let found = sites(
            "module m;\n\
             record S { seen:Bool, last:u32, output:List<u32>, }\n\
             fn contains(xs:List<u32>,x:u32)->Bool{return foldl(xs,false,fn(y)=>fn(a)=>a || y==x);}\n\
             pub fn compact(xs:List<u32>)->List<u32>{var out:List<u32>=[];for x in xs {if !contains(out,x){out=out.concat([x]);}}return out;}\n\
             pub fn distinct(xs:List<u32>)->List<u32>{return foldl(xs,S{seen:false,last:0,output:[]},fn(x)=>fn(a)=>choose(!a.seen || a.last!=x,S{seen:true,last:x,output:a.output.concat([x])},a)).output;}\n",
        );
        assert_eq!(found["compact"], 1);
        assert_eq!(found["distinct"], 1);
        assert_eq!(found["contains"], 0);
    }
    #[test]
    fn shared_storage_is_copied() {
        let found = sites(
            "module m;\n\
             record P { a:List<u32>, b:List<u32>, }\n\
             fn first(xs:List<u32>)->List<u32>{return xs;}\n\
             pub fn parameter(xs:List<u32>)->List<u32>{return xs.concat([1]);}\n\
             pub fn kept(xs:List<u32>)->P{let ys=xs.concat([1]);let zs=ys;return P{a:zs,b:ys.concat([2])};}\n\
             pub fn called(xs:List<u32>)->P{let ys=xs.concat([1]);let zs=first(ys);return P{a:zs,b:ys.concat([2])};}\n\
             pub fn captured(xs:List<u32>)->List<List<u32>>{let ys=xs.concat([1]);return xs.map(fn(x)=>ys.concat([x]));}\n\
             pub fn element(xs:List<List<u32>>)->List<u32>{return foldl(xs,[],fn(x)=>fn(a)=>x.concat(a));}\n\
             pub fn parameter_init(xs:List<u32>,zs:List<u32>)->List<u32>{return foldl(xs,zs,fn(x)=>fn(a)=>a.concat([x]));}\n\
             pub fn fresh_init(xs:List<u32>)->List<u32>{return foldl(xs,[],fn(x)=>fn(a)=>a.concat([x]));}\n\
             pub fn leaked_step(xs:List<u32>,zs:List<u32>)->List<u32>{return foldl(xs,[],fn(x)=>fn(a)=>choose(x>3,zs,a.concat([x])));}\n\
             fn total(xs:List<u32>)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+x);}\n\
             pub fn read_then_move(xs:List<u32>)->u32{let ys=xs.concat(xs);let n=total(ys);return total(ys.concat([n]));}\n",
        );
        assert_eq!(found["parameter"], 0, "parameters are never owned");
        assert_eq!(found["kept"], 0, "an alias retained the storage");
        assert_eq!(found["called"], 0, "a callee may return its argument");
        assert_eq!(found["captured"], 0, "callbacks run repeatedly");
        assert_eq!(found["element"], 0, "list elements are shared");
        assert_eq!(found["parameter_init"], 0, "the accumulator starts as a parameter");
        assert_eq!(found["fresh_init"], 1);
        assert_eq!(found["leaked_step"], 0, "a step may return shared storage");
        assert_eq!(found["read_then_move"], 1, "reads do not retain");
    }

    #[test]
    fn sequential_storage_reuse_is_fresh_across_helpers_and_respects_pending_loans() {
        let p = crate::syntax::parse("module reuse;record Pair{left:List<u32>,right:List<u32>,}\n\
          fn fresh(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}\n\
          fn relay(xs:List<u32>)->List<u32>{return fresh(xs);}\n\
          fn identity(xs:List<u32>)->List<u32>{return xs;}\n\
          fn pipeline(xs:List<u32>)->List<u32>{return relay(xs).map(fn(x)=>x+1).filter(fn(x)=>x>2).scan();}\n\
          fn borrowed(xs:List<u32>)->List<u32>{return identity(xs).map(fn(x)=>x+1);}\n\
          fn shared(xs:List<u32>)->Pair{let a=fresh(xs);return Pair{left:a,right:a.map(fn(x)=>x+1)};}\n\
          fn pending(xs:List<u32>)->List<u32>{let a=fresh(xs);return a.zip(a.map(fn(x)=>x+1),fn(x)=>fn(y)=>x+y);}\n\
          fn captured(xs:List<u32>)->List<u32>{let a=fresh(xs);return a.map(fn(x)=>x+sum(a));}\n\
          fn failed_induction(xs:List<u32>,ys:List<u32>)->List<u32>{return foldl(xs,[],fn(x)=>fn(a)=>choose(x>0,ys,a.map(fn(y)=>y+x)));}").unwrap();
        let module=crate::core::CheckedModule::from_source(p).unwrap();let p=module.program();
        let counts: BTreeMap<_,_>=p.functions.iter().map(|f| {
            let facts=analyse_with_result(&f.body,&f.params,Some(&f.result),p);
            let mut count=0;
            crate::analysis::walk(&f.body,|e|if let Expr::Method(receiver,_,_)=e {count+=usize::from(facts.can_reuse(receiver));});
            (f.name.as_str(),count)
        }).collect();
        assert_eq!(counts["pipeline"],3);
        for name in ["borrowed","shared","pending","captured","failed_induction"] {assert_eq!(counts[name],0,"{name}");}
    }

    #[test]
    fn private_list_transfer_keeps_callee_alias_and_pending_operand_checks() {
        let p=crate::syntax::parse("module transfer;\n\
          fn step(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}\n\
          fn pending(xs:List<u32>)->List<u32>{return xs.zip(xs.map(fn(x)=>x+1),fn(x)=>fn(y)=>x+y);}\n\
          fn caller(xs:List<u32>)->List<u32>{let ys=step(xs);return step(ys);}").unwrap();
        let module=crate::core::CheckedModule::from_source(p).unwrap();let p=module.program();
        for f in &p.functions[..2] {
            let facts=analyse_with_unique_lists(&f.body,&f.params,Some(&f.result),p,&[true]);
            let mut count=0;
            crate::analysis::walk(&f.body,|e|if let Expr::Method(receiver,_,_)=e {count+=usize::from(facts.can_reuse(receiver));});
            assert_eq!(count,usize::from(f.name=="step"));
        }
        let f=&p.functions[2];let facts=analyse_with_result(&f.body,&f.params,Some(&f.result),p);
        let Expr::Let(_,_,_,body)=&f.body else {panic!("caller binding")};
        let Expr::Call(_,args)=body.as_ref() else {panic!("caller invocation")};
        assert!(facts.can_reuse(&args[0]));
    }
}
