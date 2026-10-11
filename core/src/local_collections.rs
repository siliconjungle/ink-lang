//! General temporary-storage typing and affine use checking, not algorithm rules.
use crate::{
    check::{self, Env},
    syntax::*,
    LangResult,
};
use std::collections::{BTreeMap, BTreeSet};

pub fn key_type(t: &Type) -> bool {
    matches!(t, Type::U32 | Type::U64 | Type::I32 | Type::Bool)
}
pub fn owned(t: &Type, p: &Program) -> bool {
    fn walk(t: &Type, p: &Program, seen: &mut BTreeSet<String>) -> bool {
        match t {
            Type::Buffer(_) | Type::Map(..) => true,
            Type::List(t) | Type::Option(t) | Type::Vector(t, _) => walk(t, p, seen),
            Type::Result(a, b) | Type::Table(a, b) => walk(a, p, seen) || walk(b, p, seen),
            Type::Named(n) if seen.insert(n.clone()) => p
                .records
                .get(n)
                .is_some_and(|fs| fs.iter().any(|(_, t)| walk(t, p, seen))),
            _ => false,
        }
    }
    walk(t, p, &mut BTreeSet::new())
}
pub fn needed(p: &Program) -> bool {
    fn expr(e: &Expr) -> bool {
        match e {
            Expr::Call(n, a) => {
                [
                    "repeat_until",
                    "buffer",
                    "buffer_fill",
                    "length",
                    "parallel_map",
                ]
                .contains(&n.as_str())
                    || a.iter().any(expr)
            }
            Expr::Method(x, _, a) => {
                matches!(x.as_ref(), Expr::Var(n) if n=="Buffer" || n=="Map")
                    || expr(x)
                    || a.iter().any(expr)
            }
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => expr(a) || expr(b),
            Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Field(b, _) => expr(b),
            Expr::Record(_, fs) => fs.iter().any(|(_, e)| expr(e)),
            _ => false,
        }
    }
    p.events
        .values()
        .chain(p.states.iter().map(|s| &s.ty))
        .chain(p.keeps.iter().map(|s| &s.ty))
        .chain(p.actions.iter().flat_map(|a| {
            a.params
                .iter()
                .map(|(_, t)| t)
                .chain(std::iter::once(&a.result))
        }))
        .any(|t| owned(t, p))
        || p.records
            .values()
            .any(|fs| fs.iter().any(|(_, t)| owned(t, p)))
        || p.functions.iter().any(|f| {
            owned(&f.result, p) || f.params.iter().any(|(_, t)| owned(t, p)) || expr(&f.body)
        })
}

pub fn infer(e: &Expr, env: &Env, p: &Program, want: Option<&Type>) -> Option<LangResult<Type>> {
    infer_with_receiver(e, env, p, want, None)
}
pub fn infer_method(
    e: &Expr,
    env: &Env,
    p: &Program,
    want: Option<&Type>,
    receiver: Type,
) -> LangResult<Type> {
    infer_with_receiver(e, env, p, want, Some(receiver)).expect("temporary method")
}
fn infer_with_receiver(
    e: &Expr,
    env: &Env,
    p: &Program,
    want: Option<&Type>,
    receiver: Option<Type>,
) -> Option<LangResult<Type>> {
    let handled = match e {
        Expr::Call(n, _) => [
            "repeat_until",
            "buffer",
            "buffer_fill",
            "length",
            "parallel_map",
        ]
        .contains(&n.as_str()),
        Expr::Method(x, _, _) => {
            matches!(x.as_ref(),Expr::Var(n) if n=="Buffer" || n=="Map")
                || receiver
                    .as_ref()
                    .is_some_and(|t| matches!(t, Type::Buffer(_) | Type::Map(..)))
        }
        _ => false,
    };
    if !handled {
        return None;
    }
    Some((|| match e {
        Expr::Call(n, a) if n == "parallel_map" => {
            if a.len() != 3 {
                return Err("parallel_map expects list, grain and indexed callback".into());
            }
            crate::parallel::map_type(&a[0], &a[1], &a[2], env, p, want, false)
        }
        Expr::Call(n, a) if n == "length" => {
            if a.len() != 1 || !matches!(check::infer(&a[0], env, p)?, Type::List(_)) {
                return Err("length expects one list".into());
            }
            Ok(Type::U32)
        }
        Expr::Call(n, a) if n == "repeat_until" => {
            if a.len() != 4 {
                return Err("repeat_until expects limit, initial, stop lambda and nested index/accumulator step lambda".into());
            }
            check::infer_as(&a[0], env, p, &Type::U32)?;
            let t = check::infer_context(&a[1], env, p, want)?;
            let Expr::Lambda(acc, stop) = &a[2] else {
                return Err("repeat_until requires stop lambda".into());
            };
            let mut ts = env.clone();
            ts.insert(acc.clone(), t.clone());
            check::infer_as(stop, &ts, p, &Type::Bool)?;
            let Expr::Lambda(i, l) = &a[3] else {
                return Err("repeat_until requires index lambda".into());
            };
            let Expr::Lambda(acc, step) = l.as_ref() else {
                return Err("repeat_until requires accumulator lambda".into());
            };
            ts = env.clone();
            ts.insert(i.clone(), Type::U32);
            ts.insert(acc.clone(), t.clone());
            check::infer_as(step, &ts, p, &t)?;
            Ok(t)
        }
        Expr::Call(n, a) if n == "buffer" => {
            if a.len() != 1 {
                return Err("buffer expects one list".into());
            }
            let context = match want {
                Some(Type::Buffer(t)) => Some(Type::List(t.clone())),
                _ => None,
            };
            let Type::List(t) = check::infer_context(&a[0], env, p, context.as_ref())? else {
                return Err("buffer requires list".into());
            };
            if owned(&t, p) {
                return Err("buffer elements cannot own temporary storage".into());
            }
            Ok(Type::Buffer(t))
        }
        Expr::Call(n, a) if n == "buffer_fill" => {
            if a.len() != 2 {
                return Err("buffer_fill expects length and value".into());
            }
            check::infer_as(&a[0], env, p, &Type::U32)?;
            let ctx = match want {
                Some(Type::Buffer(t)) => Some(t.as_ref()),
                _ => None,
            };
            let t = check::infer_context(&a[1], env, p, ctx)?;
            if owned(&t, p) {
                return Err("buffer elements cannot own temporary storage".into());
            }
            Ok(Type::Buffer(Box::new(t)))
        }
        Expr::Method(x, n, a) => {
            if matches!(x.as_ref(),Expr::Var(v) if v=="Buffer" || v=="Map") {
                if n != "empty" || !a.is_empty() {
                    return Err("temporary constructor requires empty()".into());
                }
                let t = want.ok_or("empty temporary collection requires type annotation")?;
                if !matches!((x.as_ref(),t),(Expr::Var(v),Type::Buffer(_)) if v=="Buffer")
                    && !matches!((x.as_ref(),t),(Expr::Var(v),Type::Map(..)) if v=="Map")
                {
                    return Err("temporary constructor type mismatch".into());
                }
                crate::statecheck::validate_type(t, p)?;
                return Ok(t.clone());
            }
            let t = match receiver {
                Some(t) => t,
                None => check::infer(x, env, p)?,
            };
            if n == "len" && a.is_empty() {
                return Ok(Type::U32);
            }
            match &t {
                Type::Buffer(inner) => match n.as_str() {
                    "map" | "map_indexed" | "filter" if a.len() == 1 => {
                        let params = if n != "map_indexed" {
                            vec![*inner.clone()]
                        } else {
                            vec![Type::U32, *inner.clone()]
                        };
                        let mut body = &a[0];
                        let mut local = env.clone();
                        for t in params {
                            let Expr::Lambda(name, next) = body else {
                                return Err("buffer map callback".into());
                            };
                            local.insert(name.clone(), t);
                            body = next;
                        }
                        check::infer_as(
                            body,
                            &local,
                            p,
                            if n == "filter" { &Type::Bool } else { inner },
                        )?;
                    }
                    "scan" if a.is_empty() && check::is_number(inner) => {}
                    "map_parallel" if a.len() == 2 => {
                        return crate::parallel::map_type(x, &a[0], &a[1], env, p, want, true)
                    }
                    "append" if a.len() == 1 => {
                        check::infer_as(&a[0], env, p, &t)?;
                    }
                    "split_at" if a.len() == 2 => {
                        check::infer_as(&a[0], env, p, &Type::U32)?;
                        let Expr::Lambda(left, rest) = &a[1] else {
                            return Err("split_at requires two owner lambdas".into());
                        };
                        let Expr::Lambda(right, body) = rest.as_ref() else {
                            return Err("split_at requires two owner lambdas".into());
                        };
                        if left == right {
                            return Err("split_at owner names must differ".into());
                        };
                        let mut local = env.clone();
                        local.insert(left.clone(), t.clone());
                        local.insert(right.clone(), t.clone());
                        check::infer_as(body, &local, p, &t)?;
                    }
                    "at_or" if a.len() == 2 => {
                        check::infer_as(&a[0], env, p, &Type::U32)?;
                        check::infer_as(&a[1], env, p, inner)?;
                        return Ok(*inner.clone());
                    }
                    "set" if a.len() == 2 => {
                        check::infer_as(&a[0], env, p, &Type::U32)?;
                        check::infer_as(&a[1], env, p, inner)?;
                    }
                    "swap" if a.len() == 2 => {
                        for e in a {
                            check::infer_as(e, env, p, &Type::U32)?;
                        }
                    }
                    "push" if a.len() == 1 => {
                        check::infer_as(&a[0], env, p, inner)?;
                    }
                    "pop" if a.is_empty() => (),
                    "truncate" if a.len() == 1 => {
                        check::infer_as(&a[0], env, p, &Type::U32)?;
                    }
                    "freeze" if a.is_empty() => return Ok(Type::List(inner.clone())),
                    _ => return Err(format!("invalid Buffer method or arity: {n}")),
                },
                Type::Map(k, v) => match n.as_str() {
                    "get_or" if a.len() == 2 => {
                        check::infer_as(&a[0], env, p, k)?;
                        check::infer_as(&a[1], env, p, v)?;
                        return Ok(*v.clone());
                    }
                    "contains" if a.len() == 1 => {
                        check::infer_as(&a[0], env, p, k)?;
                        return Ok(Type::Bool);
                    }
                    "set" if a.len() == 2 => {
                        check::infer_as(&a[0], env, p, k)?;
                        check::infer_as(&a[1], env, p, v)?;
                    }
                    "remove" if a.len() == 1 => {
                        check::infer_as(&a[0], env, p, k)?;
                    }
                    "keys" if a.is_empty() => return Ok(Type::List(k.clone())),
                    "values" if a.is_empty() => return Ok(Type::List(v.clone())),
                    _ => return Err(format!("invalid Map method or arity: {n}")),
                },
                _ => return Err("temporary collection type required".into()),
            }
            Ok(t)
        }
        _ => unreachable!(),
    })())
}

#[derive(Clone, Default)]
struct Uses {
    ids: BTreeMap<String, String>,
    moved: BTreeSet<String>,
    next: usize,
}
impl Uses {
    fn bind(&mut self, n: &str) {
        let id = format!("b{}", self.next);
        self.next += 1;
        self.ids.insert(n.into(), id);
    }
    fn path(&self, e: &Expr) -> Option<String> {
        match e {
            Expr::Var(n) => self.ids.get(n).cloned(),
            Expr::Field(x, n) => self.path(x).map(|s| format!("{s}.{n}")),
            _ => None,
        }
    }
    fn use_path(&mut self, path: &str, consume: bool) -> LangResult<()> {
        if self.moved.iter().any(|m| {
            m == path
                || path.starts_with(&format!("{m}."))
                || (consume && m.starts_with(&format!("{path}.")))
        }) {
            return Err("owned temporary storage used after move".into());
        }
        if consume {
            self.moved.insert(path.into());
        }
        Ok(())
    }
    fn walk(
        &mut self,
        e: &Expr,
        env: &Env,
        p: &Program,
        want: Option<&Type>,
        borrow: bool,
    ) -> LangResult<()> {
        let t = check::infer_context(e, env, p, want)?;
        crate::statecheck::validate_type(&t, p)?;
        if let Some(path) = self.path(e) {
            return self.use_path(&path, !borrow && owned(&t, p));
        }
        match e {
            Expr::Let(n, a, x, b) => {
                let xt = check::infer_context(x, env, p, a.as_deref())?;
                self.walk(x, env, p, Some(&xt), false)?;
                let previous = self.ids.get(n).cloned();
                self.bind(n);
                let mut ts = env.clone();
                ts.insert(n.clone(), xt);
                self.walk(b, &ts, p, Some(&t), borrow)?;
                if let Some(id) = previous {
                    self.ids.insert(n.clone(), id);
                } else {
                    self.ids.remove(n);
                }
            }
            Expr::Call(n, a) if n == "parallel_map" => {
                let Type::List(inner) = check::infer(&a[0], env, p)? else {
                    unreachable!()
                };
                let Type::List(out) = &t else { unreachable!() };
                self.walk(&a[0], env, p, None, false)?;
                self.walk(&a[1], env, p, Some(&Type::U32), false)?;
                self.callback(&a[2], env, p, &[Type::U32, *inner], out, false)?;
            }
            Expr::Call(n, a) if n == "choose" => {
                self.walk(&a[0], env, p, Some(&Type::Bool), false)?;
                let mut left = self.clone();
                left.walk(&a[1], env, p, Some(&t), borrow)?;
                let mut right = self.clone();
                right.walk(&a[2], env, p, Some(&t), borrow)?;
                self.moved.extend(left.moved);
                self.moved.extend(right.moved);
                self.next = left.next.max(right.next);
            }
            Expr::Call(n, a) if n == "repeat" || n == "repeat_until" => {
                self.walk(&a[0], env, p, Some(&Type::U32), false)?;
                self.walk(&a[1], env, p, Some(&t), false)?;
                if n == "repeat_until" {
                    self.callback(&a[2], env, p, &[t.clone()], &Type::Bool, true)?;
                }
                self.callback(
                    a.last().unwrap(),
                    env,
                    p,
                    &[Type::U32, t.clone()],
                    &t,
                    false,
                )?;
            }
            Expr::Method(x, n, a) => {
                if matches!(x.as_ref(),Expr::Var(v) if v=="Buffer" || v=="Map") {
                    return Ok(());
                }
                let xt = check::infer(x, env, p)?;
                let read =
                    ["len", "at_or", "get_or", "contains", "keys", "values"].contains(&n.as_str());
                self.walk(x, env, p, Some(&xt), read)?;
                if matches!(&xt, Type::Buffer(_))
                    && ["map", "map_indexed", "filter"].contains(&n.as_str())
                {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    let params = if n != "map_indexed" {
                        vec![*inner.clone()]
                    } else {
                        vec![Type::U32, *inner.clone()]
                    };
                    self.callback(
                        &a[0],
                        env,
                        p,
                        &params,
                        if n == "filter" { &Type::Bool } else { inner },
                        false,
                    )?;
                    return Ok(());
                }
                if n == "map_parallel" {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    self.walk(&a[0], env, p, Some(&Type::U32), false)?;
                    self.callback(&a[1], env, p, &[Type::U32, *inner.clone()], inner, false)?;
                    return Ok(());
                }
                if n == "split_at" {
                    self.walk(&a[0], env, p, Some(&Type::U32), false)?;
                    self.callback(&a[1], env, p, &[xt.clone(), xt.clone()], &xt, false)?;
                    return Ok(());
                }
                let args_types: Vec<Type> = match xt {
                    Type::Buffer(inner) => match n.as_str() {
                        "at_or" | "set" => vec![Type::U32, *inner],
                        "swap" => vec![Type::U32, Type::U32],
                        "push" => vec![*inner],
                        "truncate" => vec![Type::U32],
                        "append" => vec![t.clone()],
                        _ => vec![],
                    },
                    Type::Map(k, v) => match n.as_str() {
                        "get_or" | "set" => vec![*k, *v],
                        "contains" | "remove" => vec![*k],
                        _ => vec![],
                    },
                    Type::List(inner) => match n.as_str() {
                        "map" | "filter" => {
                            self.callback(
                                &a[0],
                                env,
                                p,
                                &[*inner],
                                if n == "filter" {
                                    &Type::Bool
                                } else {
                                    let Type::List(t) = &t else { unreachable!() };
                                    t
                                },
                                false,
                            )?;
                            return Ok(());
                        }
                        "map_indexed" => {
                            let Type::List(out) = &t else { unreachable!() };
                            self.callback(&a[0], env, p, &[Type::U32, *inner], out, false)?;
                            return Ok(());
                        }
                        "zip" => {
                            let Type::List(other) = check::infer(&a[0], env, p)? else {
                                unreachable!()
                            };
                            self.walk(&a[0], env, p, None, false)?;
                            let Type::List(out) = &t else { unreachable!() };
                            self.callback(&a[1], env, p, &[*inner, *other], out, false)?;
                            return Ok(());
                        }
                        "at_or" => vec![Type::U32, *inner],
                        _ => vec![],
                    },
                    _ => vec![],
                };
                for (a, t) in a.iter().zip(args_types.iter()) {
                    self.walk(a, env, p, Some(t), false)?;
                }
            }
            Expr::Call(n, a) if n == "fold_until" => {
                self.walk(&a[0], env, p, None, false)?;
                self.walk(&a[1], env, p, Some(&t), false)?;
                let Type::List(inner) = check::infer(&a[0], env, p)? else {
                    unreachable!()
                };
                self.callback(
                    &a[2],
                    env,
                    p,
                    &[(*inner).clone(), t.clone()],
                    &Type::Bool,
                    false,
                )?;
                self.callback(&a[3], env, p, &[*inner, t.clone()], &t, false)?;
            }
            Expr::Call(n, a) if n == "foldr" => {
                self.walk(&a[0], env, p, None, false)?;
                self.walk(&a[1], env, p, Some(&t), false)?;
                let Type::List(inner) = check::infer(&a[0], env, p)? else {
                    unreachable!()
                };
                self.callback(&a[2], env, p, &[*inner, t.clone()], &t, false)?;
            }
            Expr::Call(n, a) => {
                let ts = if let Some(f) = p.functions.iter().find(|f| &f.name == n) {
                    f.params.iter().map(|(_, t)| t.clone()).collect::<Vec<_>>()
                } else if n == "buffer" {
                    let Type::Buffer(t) = &t else { unreachable!() };
                    vec![Type::List(t.clone())]
                } else if n == "buffer_fill" {
                    let Type::Buffer(t) = &t else { unreachable!() };
                    vec![Type::U32, *t.clone()]
                } else {
                    a.iter()
                        .map(|e| {
                            check::infer_context(
                                e,
                                env,
                                p,
                                if check::is_number(&t) { Some(&t) } else { None },
                            )
                        })
                        .collect::<LangResult<Vec<_>>>()?
                };
                for (e, t) in a.iter().zip(ts.iter()) {
                    self.walk(e, env, p, Some(t), false)?;
                }
            }
            Expr::Binary(op, a, b) => {
                let at = if check::is_number(&t) {
                    t.clone()
                } else {
                    check::hint(a, env, p)
                        .or_else(|| check::hint(b, env, p))
                        .unwrap_or(check::infer(a, env, p)?)
                };
                self.walk(a, env, p, Some(&at), false)?;
                if op == "&&" || op == "||" {
                    let mut branch = self.clone();
                    branch.walk(b, env, p, Some(&at), false)?;
                    self.moved.extend(branch.moved);
                    self.next = self.next.max(branch.next);
                } else {
                    self.walk(b, env, p, Some(&at), false)?;
                }
            }
            Expr::Record(n, fs) => {
                for (k, e) in fs {
                    let ft = &p.records[n].iter().find(|(f, _)| f == k).unwrap().1;
                    self.walk(e, env, p, Some(ft), false)?;
                }
            }
            Expr::Field(x, _) => self.walk(x, env, p, None, borrow || !owned(&t, p))?,
            Expr::Neg(x) => {
                if !matches!((&t, x.as_ref()), (Type::I32, Expr::Num(2147483648))) {
                    self.walk(x, env, p, Some(&t), false)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn callback(
        &mut self,
        e: &Expr,
        env: &Env,
        p: &Program,
        params: &[Type],
        result: &Type,
        borrow_acc: bool,
    ) -> LangResult<()> {
        let captured = self.ids.values().cloned().collect::<Vec<_>>();
        let before = self.moved.clone();
        let mut local = self.clone();
        let mut ts = env.clone();
        let mut body = e;
        let mut borrowed_id = None;
        for t in params {
            let Expr::Lambda(n, b) = body else {
                return Err("callback lambda".into());
            };
            local.bind(n);
            if borrow_acc {
                borrowed_id = local.ids.get(n).cloned();
            }
            ts.insert(n.clone(), t.clone());
            body = b;
        }
        local.walk(body, &ts, p, Some(result), false)?;
        for m in local.moved.difference(&before) {
            if captured
                .iter()
                .any(|id| m == id || m.starts_with(&format!("{id}.")))
                || borrowed_id
                    .as_ref()
                    .is_some_and(|id| m == id || m.starts_with(&format!("{id}.")))
            {
                return Err(
                    "callback cannot consume captured or borrowed temporary storage".into(),
                );
            }
        }
        self.next = self.next.max(local.next);
        Ok(())
    }
}
pub fn check_ownership(p: &Program) -> LangResult<()> {
    // Fast path preserves the existing checker cost for programs without locals.
    if !needed(p) {
        return Ok(());
    }

    for f in &p.functions {
        let env = check::params_env(&f.params)?;
        let mut uses = Uses::default();
        for (n, _) in &f.params {
            uses.bind(n);
        }
        uses.walk(&f.body, &env, p, Some(&f.result), false)?;
    }
    for t in p
        .events
        .values()
        .chain(p.states.iter().map(|s| &s.ty))
        .chain(p.keeps.iter().map(|s| &s.ty))
        .chain(p.actions.iter().flat_map(|a| {
            a.params
                .iter()
                .map(|(_, t)| t)
                .chain(std::iter::once(&a.result))
        }))
    {
        if owned(t, p) {
            return Err(
                "temporary storage cannot escape into actions, state, keeps or events".into(),
            );
        }
    }
    fn action_expr(e: &Expr, p: &Program) -> LangResult<()> {
        match e {
            Expr::Call(n, a) => {
                if p.functions.iter().find(|f| &f.name == n).is_some_and(|f| {
                    owned(&f.result, p) || f.params.iter().any(|(_, t)| owned(t, p))
                }) {
                    return Err("temporary helpers cannot escape into action execution".into());
                }
                for e in a {
                    action_expr(e, p)?;
                }
            }
            Expr::Method(x, _, a) => {
                action_expr(x, p)?;
                for e in a {
                    action_expr(e, p)?;
                }
            }
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
                action_expr(a, p)?;
                action_expr(b, p)?;
            }
            Expr::Field(x, _) | Expr::Lambda(_, x) | Expr::Neg(x) | Expr::Try(x) => {
                action_expr(x, p)?
            }
            Expr::Record(_, fs) => {
                for (_, e) in fs {
                    action_expr(e, p)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn actions(body: &[Statement], p: &Program) -> LangResult<()> {
        for s in body {
            match s {
                Statement::If(e, a, b) => {
                    action_expr(e, p)?;
                    actions(a, p)?;
                    actions(b, p)?;
                }
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Expr(e)
                | Statement::Emit(_, e) => action_expr(e, p)?,
            }
        }
        Ok(())
    }
    for a in &p.actions {
        actions(&a.body, p)?;
    }
    for k in &p.keeps {
        action_expr(&k.value, p)?;
    }
    Ok(())
}
