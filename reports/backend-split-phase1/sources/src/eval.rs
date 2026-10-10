use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    U64(u64),
    U32(u32),
    Bool(bool),
    List(Vec<Value>),
    // The pure grammar can carry existing stateful value types unchanged.
    // They are validated with the program's declarations at the host boundary;
    // word operations still require their explicit checked word types.
    Opaque(crate::stateful::Value),
}
impl Value {
    pub fn json(&self) -> serde_json::Value {
        match self {
            Self::U64(x) => (*x).into(),
            Self::U32(x) => (*x).into(),
            Self::Bool(x) => (*x).into(),
            Self::List(xs) => xs.iter().map(Self::json).collect(),
            Self::Opaque(v) => v.json(),
        }
    }
    pub fn from_json(v: &serde_json::Value, t: &Type) -> LangResult<Self> {
        match t {
            Type::U64 => v
                .as_u64()
                .map(Self::U64)
                .ok_or_else(|| "expected u64 JSON value".into()),
            Type::U32 => v
                .as_u64()
                .and_then(|n| u32::try_from(n).ok())
                .map(Self::U32)
                .ok_or_else(|| "expected u32 JSON value".into()),
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
    pub fn from_program_json(v: &serde_json::Value, t: &Type, p: &Program) -> LangResult<Self> {
        match t {
            Type::U32 | Type::U64 | Type::Bool => Self::from_json(v, t),
            Type::List(t) => v
                .as_array()
                .ok_or("expected JSON array")?
                .iter()
                .map(|x| Self::from_program_json(x, t, p))
                .collect::<LangResult<Vec<_>>>()
                .map(Self::List),
            _ => crate::stateful::Value::from_json(v, t, p).map(Self::Opaque),
        }
    }
}
type Env = BTreeMap<String, Value>;

fn expr(
    e: &Expr,
    env: &Env,
    types: &crate::check::Env,
    p: &Program,
    fuel: &mut u64,
    want: Option<&Type>,
) -> LangResult<Value> {
    if *fuel == 0 {
        return Err("interpreter evaluation budget exhausted".into());
    }
    *fuel -= 1;
    let ty = crate::check::infer_context(e, types, p, want)?;
    match e {
        Expr::Call(n, args) if n == "choose" => {
            if args.len() != 3 {
                return Err("choose argument count".into());
            }
            match expr(&args[0], env, types, p, fuel, Some(&Type::Bool))? {
                Value::Bool(true) => expr(&args[1], env, types, p, fuel, Some(&ty)),
                Value::Bool(false) => expr(&args[2], env, types, p, fuel, Some(&ty)),
                _ => Err("choose condition must be Bool".into()),
            }
        }
        Expr::Call(n, args) if n == "foldr" => {
            if args.len() != 3 {
                return Err("foldr argument count".into());
            }
            let Value::List(xs) = expr(&args[0], env, types, p, fuel, None)? else {
                return Err("foldr needs a list".into());
            };
            let mut rest_value = expr(&args[1], env, types, p, fuel, Some(&ty))?;
            let Expr::Lambda(item, inner) = &args[2] else {
                return Err("foldr needs a lambda".into());
            };
            let Expr::Lambda(rest, body) = inner.as_ref() else {
                return Err("foldr needs a nested lambda".into());
            };
            for x in xs.into_iter().rev() {
                let mut local = env.clone();
                let mut local_types = types.clone();
                local_types.insert(item.clone(), ty.clone());
                local_types.insert(rest.clone(), ty.clone());
                local.insert(item.clone(), x);
                local.insert(rest.clone(), rest_value);
                rest_value = expr(body, &local, &local_types, p, fuel, Some(&ty))?;
            }
            Ok(rest_value)
        }
        Expr::Num(n) => Ok(if ty == Type::U32 {
            Value::U32(u32::try_from(*n).map_err(|_| "literal outside u32 range")?)
        } else {
            Value::U64(*n)
        }),
        Expr::Bool(b) => Ok(Value::Bool(*b)),
        Expr::Var(n) => env.get(n).cloned().ok_or_else(|| format!("unbound {n}")),
        Expr::Binary(op, a, b) => {
            let operand_ty = if crate::check::is_word(&ty) {
                Some(ty.clone())
            } else {
                crate::check::hint(a, types, p).or_else(|| crate::check::hint(b, types, p))
            };
            let av = expr(a, env, types, p, fuel, operand_ty.as_ref())?;
            if op == "&&" && av == Value::Bool(false) {
                return Ok(av);
            }
            if op == "||" && av == Value::Bool(true) {
                return Ok(av);
            }
            let bv = expr(b, env, types, p, fuel, operand_ty.as_ref())?;
            match (&av, &bv, op.as_str()) {
                (Value::U32(a), Value::U32(b), "+") => Ok(Value::U32(a.wrapping_add(*b))),
                (Value::U32(a), Value::U32(b), "-") => Ok(Value::U32(a.wrapping_sub(*b))),
                (Value::U32(a), Value::U32(b), "*") => Ok(Value::U32(a.wrapping_mul(*b))),
                (Value::U32(a), Value::U32(b), "<") => Ok(Value::Bool(a < b)),
                (Value::U32(a), Value::U32(b), ">") => Ok(Value::Bool(a > b)),
                (Value::U32(a), Value::U32(b), "<=") => Ok(Value::Bool(a <= b)),
                (Value::U32(a), Value::U32(b), ">=") => Ok(Value::Bool(a >= b)),
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
            let expected: Vec<Option<Type>> = if n == "sum" || n == "count" {
                vec![if n == "sum" {
                    Some(Type::List(Box::new(ty.clone())))
                } else {
                    None
                }]
            } else {
                p.functions
                    .iter()
                    .find(|f| &f.name == n)
                    .ok_or("unknown function")?
                    .params
                    .iter()
                    .map(|(_, t)| Some(t.clone()))
                    .collect()
            };
            let vals = args
                .iter()
                .zip(&expected)
                .map(|(e, t)| expr(e, env, types, p, fuel, t.as_ref()))
                .collect::<LangResult<Vec<_>>>()?;
            if n == "sum" || n == "count" {
                if let Some(Value::List(xs)) = vals.first() {
                    if n == "count" {
                        return Ok(Value::U64(xs.len() as u64));
                    }
                    if ty == Type::U32 {
                        let mut sum = 0u32;
                        for x in xs {
                            let Value::U32(v) = x else {
                                return Err("sum type error".into());
                            };
                            sum = sum.wrapping_add(*v);
                        }
                        return Ok(Value::U32(sum));
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
            let vals = if let Value::List(xs) = expr(
                xs,
                env,
                types,
                p,
                fuel,
                if n == "filter" { Some(&ty) } else { None },
            )? {
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
                let Type::List(inner) = crate::check::infer_context(
                    xs,
                    types,
                    p,
                    if n == "filter" { Some(&ty) } else { None },
                )?
                else {
                    return Err("expected list".into());
                };
                let mut local_types = types.clone();
                local_types.insert(var.clone(), *inner);
                let body_ty = if n == "filter" {
                    Type::Bool
                } else {
                    let Type::List(t) = &ty else {
                        return Err("map type".into());
                    };
                    (**t).clone()
                };
                let r = expr(body, &local, &local_types, p, fuel, Some(&body_ty))?;
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
    for (v, (_, t)) in args.iter().zip(&f.params) {
        if Value::from_program_json(&v.json(), t, p)? != *v {
            return Err("argument type mismatch".into());
        }
    }
    let types = crate::check::params_env(&f.params)?;
    let env = f.params.iter().map(|(n, _)| n.clone()).zip(args).collect();
    expr(&f.body, &env, &types, p, fuel, Some(&f.result))
}
