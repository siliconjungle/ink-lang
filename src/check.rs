use crate::{syntax::*, LangResult};
use std::collections::{BTreeMap, BTreeSet};
pub type Env = BTreeMap<String, Type>;

pub fn infer(e: &Expr, env: &Env, p: &Program) -> LangResult<Type> {
    match e {
        Expr::Num(_) => Ok(Type::U64),
        Expr::Bool(_) => Ok(Type::Bool),
        Expr::Var(n) => env
            .get(n)
            .cloned()
            .ok_or_else(|| format!("unbound name {n}")),
        Expr::Binary(op, a, b) => {
            let at = infer(a, env, p)?;
            let bt = infer(b, env, p)?;
            if at != bt {
                return Err(format!(
                    "operator {op}: different operand types {at:?}, {bt:?}"
                ));
            }
            match op.as_str() {
                "+" | "-" | "*" if at == Type::U64 => Ok(Type::U64),
                "<" | ">" | "<=" | ">=" if at == Type::U64 => Ok(Type::Bool),
                "==" | "!=" if at == Type::U64 || at == Type::Bool => Ok(Type::Bool),
                "&&" | "||" if at == Type::Bool => Ok(Type::Bool),
                _ => Err(format!("operator {op} does not accept {at:?}")),
            }
        }
        Expr::Call(n, args) if n == "sum" || n == "count" => {
            if args.len() != 1 {
                return Err(format!("{n} expects one argument"));
            }
            let t = infer(&args[0], env, p)?;
            if t != Type::List(Box::new(Type::U64)) {
                return Err(format!("{n} requires List<u64> in this milestone"));
            }
            Ok(Type::U64)
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
            for (arg, (_, want)) in args.iter().zip(&f.params) {
                let got = infer(arg, env, p)?;
                if &got != want {
                    return Err(format!("{n}: expected {want:?}, got {got:?}"));
                }
            }
            Ok(f.result.clone())
        }
        Expr::Method(xs, n, args) => {
            let inner = if let Type::List(t) = infer(xs, env, p)? {
                *t
            } else {
                return Err(format!("method {n} requires a list"));
            };
            if args.len() != 1 {
                return Err(format!("{n} expects one lambda"));
            }
            let (var, body) = if let Expr::Lambda(v, b) = &args[0] {
                (v, b)
            } else {
                return Err(format!("{n} expects a lambda"));
            };
            let mut local = env.clone();
            local.insert(var.clone(), inner.clone());
            let out = infer(body, &local, p)?;
            match n.as_str() {
                "map" if out == Type::U64 => Ok(Type::List(Box::new(out))),
                "filter" if out == Type::Bool => Ok(Type::List(Box::new(inner))),
                _ => Err(format!(
                    "unsupported method or invalid lambda type: {n}, {out:?}"
                )),
            }
        }
        Expr::Lambda(..) => Err(
            "lambda is only permitted as a collection operator argument in this milestone".into(),
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
            if n != "sum" && n != "count" {
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
        if ["sum", "count"].contains(&f.name.as_str()) || !names.insert(f.name.clone()) {
            return Err(format!("reserved or duplicate function {}", f.name));
        }
        let got = infer(&f.body, &params_env(&f.params)?, p)?;
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
    Ok(())
}
