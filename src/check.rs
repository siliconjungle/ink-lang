use crate::{syntax::*, LangResult};
use std::collections::{BTreeMap, BTreeSet};
pub type Env = BTreeMap<String, Type>;

pub fn is_word(t: &Type) -> bool {
    matches!(t, Type::U32 | Type::U64)
}

// Unsuffixed literals keep the historical u64 default, but use an expected
// word type from a signature, operator or collection lambda. No implicit
// conversion of typed values is permitted.
pub fn infer(e: &Expr, env: &Env, p: &Program) -> LangResult<Type> {
    infer_context(e, env, p, None)
}
pub fn infer_as(e: &Expr, env: &Env, p: &Program, want: &Type) -> LangResult<Type> {
    let got = infer_context(e, env, p, Some(want))?;
    if &got != want {
        return Err(format!("expected {want:?}, got {got:?}"));
    }
    Ok(got)
}
pub(crate) fn hint(e: &Expr, env: &Env, p: &Program) -> Option<Type> {
    match e {
        Expr::Num(_) => None,
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
            hint(a, env, p).or_else(|| hint(b, env, p))
        }
        _ => infer(e, env, p).ok().filter(is_word),
    }
}
pub(crate) fn infer_context(
    e: &Expr,
    env: &Env,
    p: &Program,
    want: Option<&Type>,
) -> LangResult<Type> {
    match e {
        Expr::Num(n) => {
            if want == Some(&Type::U32) {
                if *n > u32::MAX as u64 {
                    return Err("literal is outside u32 range".into());
                }
                Ok(Type::U32)
            } else {
                Ok(Type::U64)
            }
        }
        Expr::Bool(_) => Ok(Type::Bool),
        Expr::Var(n) => env
            .get(n)
            .cloned()
            .ok_or_else(|| format!("unbound name {n}")),
        Expr::Binary(op, a, b) => {
            let numeric = if ["+", "-", "*"].contains(&op.as_str()) {
                want.filter(|t| is_word(t)).cloned()
            } else {
                None
            }
            .or_else(|| hint(a, env, p))
            .or_else(|| hint(b, env, p));
            let at = infer_context(a, env, p, numeric.as_ref())?;
            let bt = infer_context(b, env, p, Some(&at))?;
            if at != bt {
                return Err(format!(
                    "operator {op}: different operand types {at:?}, {bt:?}"
                ));
            }
            match op.as_str() {
                "+" | "-" | "*" if is_word(&at) => Ok(at),
                "<" | ">" | "<=" | ">=" if is_word(&at) => Ok(Type::Bool),
                "==" | "!=" if is_word(&at) || at == Type::Bool => Ok(Type::Bool),
                "&&" | "||" if at == Type::Bool => Ok(Type::Bool),
                _ => Err(format!("operator {op} does not accept {at:?}")),
            }
        }
        Expr::Call(n, args) if n == "choose" => {
            if args.len() != 3 {
                return Err("choose expects three arguments".into());
            }
            infer_as(&args[0], env, p, &Type::Bool)?;
            let context = want
                .cloned()
                .or_else(|| hint(&args[1], env, p))
                .or_else(|| hint(&args[2], env, p));
            let ty = infer_context(&args[1], env, p, context.as_ref())?;
            if !is_word(&ty) && ty != Type::Bool {
                return Err("choose branches must be scalar".into());
            }
            infer_as(&args[2], env, p, &ty)?;
            Ok(ty)
        }
        Expr::Call(n, args) if n == "sum" || n == "count" => {
            if args.len() != 1 {
                return Err(format!("{n} expects one argument"));
            }
            let list_want = if n == "sum" {
                want.filter(|t| is_word(t))
                    .map(|t| Type::List(Box::new(t.clone())))
            } else {
                None
            };
            let ty = infer_context(&args[0], env, p, list_want.as_ref())?;
            match ty {
                Type::List(t) if is_word(&t) => Ok(if n == "count" { Type::U64 } else { *t }),
                _ => Err(format!("{n} requires List<u32> or List<u64>")),
            }
        }
        Expr::Call(n, args) if n == "foldr" => {
            if args.len() != 3 {
                return Err(
                    "foldr expects list, initial value and fn(item)=>fn(rest)=>body".into(),
                );
            }
            let Type::List(t) = infer(&args[0], env, p)? else {
                return Err("foldr requires a word list".into());
            };
            if !is_word(&t) {
                return Err("foldr requires a word list".into());
            }
            infer_as(&args[1], env, p, &t)?;
            let Expr::Lambda(item, inner) = &args[2] else {
                return Err("foldr needs nested lambdas".into());
            };
            let Expr::Lambda(rest, body) = inner.as_ref() else {
                return Err("foldr needs nested lambdas".into());
            };
            let mut local = env.clone();
            local.insert(item.clone(), (*t).clone());
            local.insert(rest.clone(), (*t).clone());
            infer_as(body, &local, p, &t)?;
            Ok(*t)
        }
        Expr::Call(n, args) => {
            let f = p
                .functions
                .iter()
                .find(|f| &f.name == n)
                .ok_or_else(|| format!("unknown function {n}"))?;
            if args.len() != f.params.len() {
                return Err(format!("{n}: argument count mismatch"));
            }
            for (e, (_, t)) in args.iter().zip(&f.params) {
                infer_as(e, env, p, t)?;
            }
            Ok(f.result.clone())
        }
        Expr::Method(xs, n, args) => {
            let Type::List(inner) =
                infer_context(xs, env, p, if n == "filter" { want } else { None })?
            else {
                return Err(format!("method {n} requires a list"));
            };
            if args.len() != 1 {
                return Err("collection method requires one lambda".into());
            }
            let Expr::Lambda(var, body) = &args[0] else {
                return Err("collection method requires a lambda".into());
            };
            let mut local = env.clone();
            local.insert(var.clone(), (*inner).clone());
            match n.as_str() {
                "map" => {
                    let output_want = match want {
                        Some(Type::List(t)) => Some(&**t),
                        _ => None,
                    };
                    let out = infer_context(body, &local, p, output_want)?;
                    if !is_word(&out) {
                        return Err("map must return a word".into());
                    }
                    Ok(Type::List(Box::new(out)))
                }
                "filter" => {
                    infer_as(body, &local, p, &Type::Bool)?;
                    Ok(Type::List(inner))
                }
                _ => Err(format!("unsupported collection method {n}")),
            }
        }
        Expr::Lambda(..) => {
            Err("lambda is only permitted as a collection operator argument".into())
        }
        _ => Err(
            "stateful expression is not supported inside an expression-only pure function".into(),
        ),
    }
}

pub fn params_env(params: &[(String, Type)]) -> LangResult<Env> {
    let mut env = Env::new();
    for (n, t) in params {
        if env.insert(n.clone(), t.clone()).is_some() {
            return Err(format!("duplicate parameter {n}"));
        }
    }
    Ok(env)
}

fn calls(e: &Expr, out: &mut BTreeSet<String>) {
    match e {
        Expr::Call(n, args) => {
            if n != "sum" && n != "count" && n != "foldr" && n != "choose" {
                out.insert(n.clone());
            }
            for a in args {
                calls(a, out);
            }
        }
        Expr::Binary(_, a, b) => {
            calls(a, out);
            calls(b, out);
        }
        Expr::Method(e, _, args) => {
            calls(e, out);
            for a in args {
                calls(a, out);
            }
        }
        Expr::Lambda(_, e) => calls(e, out),
        _ => {}
    }
}

pub fn check(p: &Program) -> LangResult<()> {
    let mut names = BTreeSet::new();
    for f in &p.functions {
        if ["sum", "count", "foldr", "choose"].contains(&f.name.as_str())
            || !names.insert(f.name.clone())
        {
            return Err(format!("reserved or duplicate function {}", f.name));
        }
        let got = infer_as(&f.body, &params_env(&f.params)?, p, &f.result)?;
        if got != f.result {
            return Err(format!(
                "{}: declared {:?}, returns {got:?}",
                f.name, f.result
            ));
        }
    }
    fn visit(
        n: &str,
        p: &Program,
        stack: &mut BTreeSet<String>,
        done: &mut BTreeSet<String>,
    ) -> LangResult<()> {
        if done.contains(n) {
            return Ok(());
        }
        if stack.len() >= 128 {
            return Err("function dependency nesting limit exceeded".into());
        }
        if !stack.insert(n.into()) {
            return Err(format!(
                "recursive call to {n}: no decreasing measure has been proved"
            ));
        }
        let f = p
            .functions
            .iter()
            .find(|f| f.name == n)
            .ok_or_else(|| format!("unknown function {n}"))?;
        let mut deps = BTreeSet::new();
        calls(&f.body, &mut deps);
        for d in deps {
            visit(&d, p, stack, done)?;
        }
        stack.remove(n);
        done.insert(n.into());
        Ok(())
    }
    let mut done = BTreeSet::new();
    for f in &p.functions {
        visit(&f.name, p, &mut BTreeSet::new(), &mut done)?;
    }
    crate::statecheck::check(p)
}
