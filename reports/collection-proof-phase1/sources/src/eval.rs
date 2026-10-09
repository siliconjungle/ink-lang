use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    U64(u64),
    Bool(bool),
    List(Vec<Value>),
}
impl Value {
    pub fn json(&self) -> serde_json::Value {
        match self {
            Self::U64(x) => (*x).into(),
            Self::Bool(x) => (*x).into(),
            Self::List(xs) => xs.iter().map(Self::json).collect(),
        }
    }
    pub fn from_json(v: &serde_json::Value, t: &Type) -> LangResult<Self> {
        match t {
            Type::U64 => v
                .as_u64()
                .map(Self::U64)
                .ok_or_else(|| "expected u64 JSON value".into()),
            Type::Bool => v
                .as_bool()
                .map(Self::Bool)
                .ok_or_else(|| "expected Boolean JSON value".into()),
            Type::List(t) => v
                .as_array()
                .ok_or("expected JSON array")?
                .iter()
                .map(|x| Self::from_json(x, t))
                .collect::<LangResult<Vec<_>>>()
                .map(Self::List),
            _ => Err("use stateful execution for this type".into()),
        }
    }
}
type Env = BTreeMap<String, Value>;

fn expr(e: &Expr, env: &Env, p: &Program, fuel: &mut u64) -> LangResult<Value> {
    if *fuel == 0 {
        return Err("interpreter evaluation budget exhausted".into());
    }
    *fuel -= 1;
    match e {
        Expr::Call(n, args) if n == "foldr" => {
            if args.len() != 3 {
                return Err("foldr argument count".into());
            }
            let Value::List(xs) = expr(&args[0], env, p, fuel)? else {
                return Err("foldr needs a list".into());
            };
            let mut rest_value = expr(&args[1], env, p, fuel)?;
            let Expr::Lambda(item, inner) = &args[2] else {
                return Err("foldr needs a lambda".into());
            };
            let Expr::Lambda(rest, body) = inner.as_ref() else {
                return Err("foldr needs a nested lambda".into());
            };
            for x in xs.into_iter().rev() {
                let mut local = env.clone();
                local.insert(item.clone(), x);
                local.insert(rest.clone(), rest_value);
                rest_value = expr(body, &local, p, fuel)?;
            }
            Ok(rest_value)
        }
        Expr::Num(n) => Ok(Value::U64(*n)),
        Expr::Bool(b) => Ok(Value::Bool(*b)),
        Expr::Var(n) => env.get(n).cloned().ok_or_else(|| format!("unbound {n}")),
        Expr::Binary(op, a, b) => {
            let av = expr(a, env, p, fuel)?;
            if op == "&&" && av == Value::Bool(false) {
                return Ok(av);
            }
            if op == "||" && av == Value::Bool(true) {
                return Ok(av);
            }
            let bv = expr(b, env, p, fuel)?;
            match (&av, &bv, op.as_str()) {
                (Value::U64(a), Value::U64(b), "+") => Ok(Value::U64(a.wrapping_add(*b))),
                (Value::U64(a), Value::U64(b), "-") => Ok(Value::U64(a.wrapping_sub(*b))),
                (Value::U64(a), Value::U64(b), "*") => Ok(Value::U64(a.wrapping_mul(*b))),
                (Value::U64(a), Value::U64(b), "<") => Ok(Value::Bool(a < b)),
                (Value::U64(a), Value::U64(b), ">") => Ok(Value::Bool(a > b)),
                (Value::U64(a), Value::U64(b), "<=") => Ok(Value::Bool(a <= b)),
                (Value::U64(a), Value::U64(b), ">=") => Ok(Value::Bool(a >= b)),
                (_, _, "==") => Ok(Value::Bool(av == bv)),
                (_, _, "!=") => Ok(Value::Bool(av != bv)),
                (Value::Bool(a), Value::Bool(b), "&&") => Ok(Value::Bool(*a && *b)),
                (Value::Bool(a), Value::Bool(b), "||") => Ok(Value::Bool(*a || *b)),
                _ => Err("interpreter type error".into()),
            }
        }
        Expr::Call(n, args) => {
            let vals = args
                .iter()
                .map(|e| expr(e, env, p, fuel))
                .collect::<LangResult<Vec<_>>>()?;
            if n == "sum" || n == "count" {
                if let Some(Value::List(xs)) = vals.first() {
                    if n == "count" {
                        return Ok(Value::U64(xs.len() as u64));
                    }
                    let mut s = 0u64;
                    for x in xs {
                        if let Value::U64(v) = x {
                            s = s.wrapping_add(*v);
                        } else {
                            return Err("sum type error".into());
                        }
                    }
                    return Ok(Value::U64(s));
                }
                return Err("aggregate requires a list".into());
            }
            call(p, n, vals, fuel)
        }
        Expr::Method(xs, n, args) => {
            let vals = if let Value::List(xs) = expr(xs, env, p, fuel)? {
                xs
            } else {
                return Err("expected list".into());
            };
            let (var, body) = if let Some(Expr::Lambda(v, b)) = args.first() {
                (v, b)
            } else {
                return Err("expected lambda".into());
            };
            let mut out = Vec::new();
            for v in vals {
                let mut local = env.clone();
                local.insert(var.clone(), v.clone());
                let r = expr(body, &local, p, fuel)?;
                match n.as_str() {
                    "map" => out.push(r),
                    "filter" => match r {
                        Value::Bool(true) => out.push(v),
                        Value::Bool(false) => {}
                        _ => return Err("filter type error".into()),
                    },
                    _ => return Err(format!("unknown method {n}")),
                }
            }
            Ok(Value::List(out))
        }
        Expr::Lambda(..) => Err("lambda cannot be evaluated outside collection operator".into()),
        _ => Err("use stateful execution for this expression".into()),
    }
}

pub fn call(p: &Program, name: &str, args: Vec<Value>, fuel: &mut u64) -> LangResult<Value> {
    let f = p
        .functions
        .iter()
        .find(|f| f.name == name)
        .ok_or_else(|| format!("unknown function {name}"))?;
    if args.len() != f.params.len() {
        return Err("argument count mismatch".into());
    }
    let env = f.params.iter().map(|(n, _)| n.clone()).zip(args).collect();
    expr(&f.body, &env, p, fuel)
}
