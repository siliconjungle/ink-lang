use crate::{syntax::*, LangResult};
use std::collections::{BTreeMap, BTreeSet};
pub type Env = BTreeMap<String, Type>;

pub fn is_word(t: &Type) -> bool {
    matches!(t, Type::U32 | Type::U64 | Type::I32)
}

pub fn is_number(t: &Type) -> bool {
    is_word(t) || *t == Type::F32
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
/// Contextual numeric type hint shared by independent backends.
pub fn hint(e: &Expr, env: &Env, p: &Program) -> Option<Type> {
    match e {
        Expr::Num(_) => None,
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
            hint(a, env, p).or_else(|| hint(b, env, p))
        }
        _ => infer(e, env, p).ok().filter(is_number),
    }
}
/// Source typing with an explicit expected context, shared by backends.
pub fn infer_context(e: &Expr, env: &Env, p: &Program, want: Option<&Type>) -> LangResult<Type> {
    match e {
        Expr::Float(_) => Ok(Type::F32),
        Expr::Neg(e) => {
            let ty = want
                .filter(|t| is_number(t))
                .cloned()
                .or_else(|| hint(e, env, p))
                .unwrap_or(Type::I32);
            if let (Type::I32, Expr::Num(n)) = (&ty, e.as_ref()) {
                if *n <= 2147483648 {
                    return Ok(Type::I32);
                }
            }
            infer_as(e, env, p, &ty)?;
            if !is_number(&ty) {
                return Err("negation requires numeric value".into());
            }
            Ok(ty)
        }
        Expr::Let(n, t, a, b) => {
            let ty = infer_context(a, env, p, t.as_deref())?;
            if t.as_deref().is_some_and(|t| t != &ty) {
                return Err("let binding type mismatch".into());
            }
            let mut local = env.clone();
            local.insert(n.clone(), ty);
            infer_context(b, &local, p, want)
        }
        Expr::Record(n, fields) => {
            let schema = p.records.get(n).ok_or("unknown record")?;
            if fields.len() != schema.len() {
                return Err("record field count mismatch".into());
            }
            let mut names = BTreeSet::new();
            for (name, e) in fields {
                if !names.insert(name) {
                    return Err("duplicate record field".into());
                }
                let ty = schema
                    .iter()
                    .find(|(f, _)| f == name)
                    .ok_or("unknown record field")?;
                infer_as(e, env, p, &ty.1)?;
            }
            Ok(Type::Named(n.clone()))
        }
        Expr::Field(e, n) => match infer(e, env, p)? {
            Type::Named(record) => p
                .records
                .get(&record)
                .and_then(|fs| fs.iter().find(|(f, _)| f == n))
                .map(|(_, t)| t.clone())
                .ok_or("unknown record field".into()),
            Type::Vector(t, k) => {
                let index = ["x", "y", "z", "w"]
                    .iter()
                    .position(|f| *f == n)
                    .ok_or("unknown vector component")?;
                if index >= k as usize {
                    return Err("vector component outside dimension".into());
                }
                Ok(*t)
            }
            _ => Err("field access requires record/vector".into()),
        },
        Expr::Num(n) => {
            if want == Some(&Type::I32) {
                if *n > i32::MAX as u64 {
                    return Err("literal outside i32 range".into());
                }
                return Ok(Type::I32);
            }
            if want == Some(&Type::F32) {
                let f = *n as f32;
                if f as u128 != *n as u128 {
                    return Err("integer literal is not exact in f32; use a decimal literal".into());
                }
                return Ok(Type::F32);
            }
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
                want.filter(|t| is_number(t)).cloned()
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
                "+" | "-" | "*" if is_number(&at) => Ok(at),
                "<" | ">" | "<=" | ">=" if is_number(&at) => Ok(Type::Bool),
                "==" | "!=" if is_number(&at) || at == Type::Bool => Ok(Type::Bool),
                "&&" | "||" if at == Type::Bool => Ok(Type::Bool),
                _ => Err(format!("operator {op} does not accept {at:?}")),
            }
        }
        Expr::Call(n, args) if ["vec2", "vec3", "vec4"].contains(&n.as_str()) => {
            let k = n.as_bytes()[3] - b'0';
            if args.len() != k as usize {
                return Err("vector arity mismatch".into());
            }
            let context = match want {
                Some(Type::Vector(t, m)) if *m == k => Some(&**t),
                _ => None,
            };
            let ty = infer_context(&args[0], env, p, context)?;
            if !matches!(ty, Type::U32 | Type::I32 | Type::F32) {
                return Err("vector components require 32-bit numeric values".into());
            }
            for e in &args[1..] {
                infer_as(e, env, p, &ty)?;
            }
            Ok(Type::Vector(Box::new(ty), k))
        }
        Expr::Call(n, args) if n == "repeat" => {
            if args.len() != 3 {
                return Err(
                    "repeat expects bound, initial value and nested index/accumulator lambda"
                        .into(),
                );
            }
            let Expr::Num(bound) = args[0] else {
                return Err("repeat requires literal bound".into());
            };
            if bound > 65536 {
                return Err("repeat bound exceeds 65536".into());
            }
            let ty = infer_context(&args[1], env, p, want)?;
            let Expr::Lambda(index, inner) = &args[2] else {
                return Err("repeat index lambda".into());
            };
            let Expr::Lambda(acc, body) = inner.as_ref() else {
                return Err("repeat accumulator lambda".into());
            };
            let mut local = env.clone();
            local.insert(index.clone(), Type::U32);
            local.insert(acc.clone(), ty.clone());
            infer_as(body, &local, p, &ty)?;
            Ok(ty)
        }
        Expr::Call(n, args) if n == "quot_or" || n == "rem_or" => {
            if args.len() != 3 {
                return Err("division expects two operands and zero/overflow fallback".into());
            }
            let ty = infer_context(&args[0], env, p, want)?;
            if !is_word(&ty) {
                return Err("integer division requires word values".into());
            }
            for e in &args[1..] {
                infer_as(e, env, p, &ty)?;
            }
            Ok(ty)
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

            infer_as(&args[2], env, p, &ty)?;
            Ok(ty)
        }
        Expr::Call(n, args) if n == "sum" || n == "count" => {
            if args.len() != 1 {
                return Err(format!("{n} expects one argument"));
            }
            let list_want = if n == "sum" {
                want.filter(|t| is_number(t))
                    .map(|t| Type::List(Box::new(t.clone())))
            } else {
                None
            };
            let ty = infer_context(&args[0], env, p, list_want.as_ref())?;
            if n == "count" && matches!(ty, Type::List(_)) {
                return Ok(Type::U64);
            }
            match ty {
                Type::List(t) if is_number(&t) => Ok(if n == "count" { Type::U64 } else { *t }),
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
            if !is_number(&t) {
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
            if n == "at_or" {
                if args.len() != 2 {
                    return Err("at_or expects index and fallback".into());
                }
                infer_as(&args[0], env, p, &Type::U32)?;
                infer_as(&args[1], env, p, &inner)?;
                return Ok(*inner);
            }
            if n == "scan" || n == "sort" {
                if !args.is_empty() || !is_word(&inner) {
                    return Err("scan/sort require integer list and no arguments".into());
                }
                return Ok(Type::List(inner));
            }
            if n == "zip" {
                if args.len() != 2 {
                    return Err("zip expects second list and nested lambda".into());
                }
                let Type::List(other) = infer(&args[0], env, p)? else {
                    return Err("zip needs list".into());
                };
                let Expr::Lambda(a, l) = &args[1] else {
                    return Err("zip lambda".into());
                };
                let Expr::Lambda(b, body) = l.as_ref() else {
                    return Err("zip nested lambda".into());
                };
                let mut local = env.clone();
                local.insert(a.clone(), *inner);
                local.insert(b.clone(), *other);
                let ctx = match want {
                    Some(Type::List(t)) => Some(&**t),
                    _ => None,
                };
                let ty = infer_context(body, &local, p, ctx)?;
                return Ok(Type::List(Box::new(ty)));
            }
            if args.len() != 1 {
                return Err("collection method requires one lambda".into());
            }
            if n == "map_indexed" {
                let Expr::Lambda(index, inner_lambda) = &args[0] else {
                    return Err("map_indexed index lambda".into());
                };
                let Expr::Lambda(var, body) = inner_lambda.as_ref() else {
                    return Err("map_indexed element lambda".into());
                };
                let mut local = env.clone();
                local.insert(index.clone(), Type::U32);
                local.insert(var.clone(), *inner);
                let ctx = match want {
                    Some(Type::List(t)) => Some(&**t),
                    _ => None,
                };
                return Ok(Type::List(Box::new(infer_context(body, &local, p, ctx)?)));
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
            if ![
                "sum", "count", "foldr", "choose", "repeat", "vec2", "vec3", "vec4", "quot_or",
                "rem_or",
            ]
            .contains(&n.as_str())
            {
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
        Expr::Lambda(_, e) | Expr::Neg(e) | Expr::Field(e, _) => calls(e, out),
        Expr::Let(_, _, a, b) => {
            calls(a, out);
            calls(b, out);
        }
        Expr::Record(_, fields) => {
            for (_, e) in fields {
                calls(e, out);
            }
        }
        _ => {}
    }
}

pub fn check(p: &Program) -> LangResult<()> {
    let mut names = BTreeSet::new();
    for f in &p.functions {
        for (_, t) in &f.params {
            crate::statecheck::validate_type(t, p)?;
        }
        crate::statecheck::validate_type(&f.result, p)?;
        if [
            "sum", "count", "foldr", "choose", "repeat", "vec2", "vec3", "vec4", "quot_or",
            "rem_or",
        ]
        .contains(&f.name.as_str())
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
