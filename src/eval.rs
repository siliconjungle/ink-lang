use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    U64(u64),
    U32(u32),
    I32(i32),
    F32(u32),
    Vector(Vec<Value>),
    Record(String, BTreeMap<String, Value>),
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
            Self::I32(x) => (*x).into(),
            Self::F32(bits) => {
                let x = f32::from_bits(*bits);
                if x.is_finite() {
                    serde_json::json!(x)
                } else {
                    serde_json::json!({"F32Bits":bits})
                }
            }
            Self::Vector(xs) => xs.iter().map(Self::json).collect(),
            Self::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), v.json())).collect(),
            Self::Bool(x) => (*x).into(),
            Self::List(xs) => xs.iter().map(Self::json).collect(),
            Self::Opaque(v) => v.json(),
        }
    }
    pub fn from_json(v: &serde_json::Value, t: &Type) -> LangResult<Self> {
        match t {
            Type::I32 => v
                .as_i64()
                .and_then(|n| i32::try_from(n).ok())
                .map(Self::I32)
                .ok_or("expected i32".into()),
            Type::F32 => {
                let bits = if let Some(b) = v.get("F32Bits") {
                    if v.as_object().is_none_or(|o| o.len() != 1) {
                        return Err("expected only F32Bits field".into());
                    }
                    u32::try_from(b.as_u64().ok_or("expected f32 bits")?)
                        .map_err(|_| "f32 bits outside range")?
                } else {
                    let x = v.as_f64().ok_or("expected f32")? as f32;
                    if !x.is_finite() {
                        return Err("finite f32 input required; use explicit F32Bits for exceptional CPU values".into());
                    }
                    x.to_bits()
                };
                Ok(Self::F32(bits))
            }
            Type::Vector(t, n) => {
                let xs = v.as_array().ok_or("expected vector array")?;
                if xs.len() != *n as usize {
                    return Err("vector dimension mismatch".into());
                }
                xs.iter()
                    .map(|x| Self::from_json(x, t))
                    .collect::<LangResult<Vec<_>>>()
                    .map(Self::Vector)
            }
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
            Type::U32 | Type::U64 | Type::I32 | Type::F32 | Type::Vector(..) | Type::Bool => {
                Self::from_json(v, t)
            }
            Type::Named(n) if p.records.contains_key(n) => {
                let fs = &p.records[n];
                let obj = v.as_object().ok_or("expected record object")?;
                if obj.len() != fs.len() {
                    return Err("record field count mismatch".into());
                }
                let fields = fs
                    .iter()
                    .map(|(name, t)| {
                        Ok((
                            name.clone(),
                            Self::from_program_json(
                                obj.get(name).ok_or("missing record field")?,
                                t,
                                p,
                            )?,
                        ))
                    })
                    .collect::<LangResult<BTreeMap<_, _>>>()?;
                Ok(Self::Record(n.clone(), fields))
            }
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

/// Nested expression frames. Deeper evaluation is rejected, so the stack
/// needed is bounded independently of the host; see `EVAL_STACK`.
const MAX_DEPTH: usize = 512;
thread_local! {
    static DEPTH: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
}
struct Nesting;
impl Nesting {
    fn enter() -> LangResult<Self> {
        DEPTH.with(|d| {
            let n = d.get();
            if n >= MAX_DEPTH {
                return Err("interpreter evaluation nesting limit exceeded".to_string());
            }
            d.set(n + 1);
            Ok(Nesting)
        })
    }
}
impl Drop for Nesting {
    fn drop(&mut self) {
        DEPTH.with(|d| d.set(d.get() - 1));
    }
}
/// A scope copy is charged like copying each of its values.
fn copy_env(env: &Env, fuel: &mut u64) -> LangResult<Env> {
    charge(
        fuel,
        env.values().fold(0, |n, v| n.saturating_add(weight(v))),
    )?;
    Ok(env.clone())
}
/// An unoptimised build uses roughly 16-24 KiB of stack per nesting level, so
/// the outermost call evaluates on its own thread with room for MAX_DEPTH
/// levels instead of relying on the caller's (often 2 MiB) stack.
const EVAL_STACK: usize = 64 << 20;
fn charge(fuel: &mut u64, n: u64) -> LangResult<()> {
    *fuel = fuel
        .checked_sub(n)
        .ok_or("interpreter evaluation budget exhausted")?;
    Ok(())
}
/// Copying a value costs fuel in proportion to its list elements, so a large
/// list cannot be duplicated per element or per reference for free.
fn weight(v: &Value) -> u64 {
    match v {
        Value::List(xs) | Value::Vector(xs) => xs
            .iter()
            .fold(xs.len() as u64, |n, x| n.saturating_add(weight(x))),
        Value::Record(_, fs) => fs.values().fold(0, |n, x| n.saturating_add(weight(x))),
        _ => 0,
    }
}

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
    let _nesting = Nesting::enter()?;
    let ty = crate::check::infer_context(e, types, p, want)?;
    match e {
        Expr::Float(bits) => Ok(Value::F32(*bits)),
        Expr::Neg(e) => {
            if ty == Type::I32 {
                if let Expr::Num(n) = e.as_ref() {
                    return Ok(Value::I32((*n as i32).wrapping_neg()));
                }
            }
            let v = expr(e, env, types, p, fuel, Some(&ty))?;
            Ok(match v {
                Value::I32(x) => Value::I32(x.wrapping_neg()),
                Value::U32(x) => Value::U32(x.wrapping_neg()),
                Value::U64(x) => Value::U64(x.wrapping_neg()),
                Value::F32(b) => Value::F32(b ^ 0x80000000),
                _ => return Err("numeric negation".into()),
            })
        }
        Expr::Let(n, t, a, b) => {
            let at = crate::check::infer_context(a, types, p, t.as_deref())?;
            let value = expr(a, env, types, p, fuel, Some(&at))?;
            let mut local = copy_env(env, fuel)?;
            local.insert(n.clone(), value);
            let mut ts = types.clone();
            ts.insert(n.clone(), at);
            expr(b, &local, &ts, p, fuel, Some(&ty))
        }
        Expr::Record(n, fields) => {
            let mut out = BTreeMap::new();
            for (name, e) in fields {
                let t = &p.records[n].iter().find(|(f, _)| f == name).unwrap().1;
                out.insert(name.clone(), expr(e, env, types, p, fuel, Some(t))?);
            }
            Ok(Value::Record(n.clone(), out))
        }
        Expr::Field(e, n) => {
            let v = expr(e, env, types, p, fuel, None)?;
            match v {
                Value::Record(_, fields) => fields.get(n).cloned().ok_or("missing field".into()),
                Value::Vector(xs) => {
                    Ok(xs[["x", "y", "z", "w"].iter().position(|f| *f == n).unwrap()].clone())
                }
                _ => Err("field access needs record/vector".into()),
            }
        }
        Expr::Call(n, args) if ["vec2", "vec3", "vec4"].contains(&n.as_str()) => {
            let Type::Vector(t, _) = &ty else {
                return Err("vector type".into());
            };
            args.iter()
                .map(|e| expr(e, env, types, p, fuel, Some(t)))
                .collect::<LangResult<Vec<_>>>()
                .map(Value::Vector)
        }
        Expr::Call(n, args) if n == "repeat" => {
            let Expr::Num(bound) = args[0] else {
                return Err("repeat bound".into());
            };
            let mut acc = expr(&args[1], env, types, p, fuel, Some(&ty))?;
            let Expr::Lambda(index, l) = &args[2] else {
                return Err("repeat index lambda".into());
            };
            let Expr::Lambda(name, body) = l.as_ref() else {
                return Err("repeat accumulator lambda".into());
            };
            let mut ts = types.clone();
            ts.insert(index.clone(), Type::U32);
            ts.insert(name.clone(), ty.clone());
            // One scope copy per operator; each iteration rebinds the same names.
            let mut local = copy_env(env, fuel)?;
            for i in 0..bound {
                local.insert(index.clone(), Value::U32(i as u32));
                local.insert(name.clone(), acc);
                acc = expr(body, &local, &ts, p, fuel, Some(&ty))?;
            }
            Ok(acc)
        }
        Expr::Call(n, args) if n == "quot_or" || n == "rem_or" => {
            let a = expr(&args[0], env, types, p, fuel, Some(&ty))?;
            let b = expr(&args[1], env, types, p, fuel, Some(&ty))?;
            let result = match (&a, &b) {
                (Value::U32(a), Value::U32(b)) => if n == "quot_or" {
                    a.checked_div(*b)
                } else {
                    a.checked_rem(*b)
                }
                .map(Value::U32),
                (Value::I32(a), Value::I32(b)) => if n == "quot_or" {
                    a.checked_div(*b)
                } else {
                    a.checked_rem(*b)
                }
                .map(Value::I32),
                (Value::U64(a), Value::U64(b)) => if n == "quot_or" {
                    a.checked_div(*b)
                } else {
                    a.checked_rem(*b)
                }
                .map(Value::U64),
                _ => return Err("integer division types".into()),
            };
            if let Some(v) = result {
                Ok(v)
            } else {
                expr(&args[2], env, types, p, fuel, Some(&ty))
            }
        }
        Expr::Method(xs, n, args) if n == "at_or" => {
            let Value::List(xs) = expr(xs, env, types, p, fuel, None)? else {
                return Err("at_or list".into());
            };
            let Value::U32(i) = expr(&args[0], env, types, p, fuel, Some(&Type::U32))? else {
                return Err("at_or index".into());
            };
            if let Some(v) = xs.get(i as usize) {
                Ok(v.clone())
            } else {
                expr(&args[1], env, types, p, fuel, Some(&ty))
            }
        }
        Expr::Method(xs, n, args)
            if ["zip", "map_indexed", "scan", "sort"].contains(&n.as_str()) =>
        {
            let Value::List(mut values) = expr(xs, env, types, p, fuel, None)? else {
                return Err("array operator needs list".into());
            };
            let Type::List(input) = crate::check::infer(xs, types, p)? else {
                return Err("array element type".into());
            };
            if n == "sort" {
                values.sort_by(|a, b| match (a, b) {
                    (Value::U32(a), Value::U32(b)) => a.cmp(b),
                    (Value::I32(a), Value::I32(b)) => a.cmp(b),
                    (Value::U64(a), Value::U64(b)) => a.cmp(b),
                    _ => unreachable!(),
                });
                return Ok(Value::List(values));
            }
            if n == "scan" {
                let mut acc = match &*input {
                    Type::U32 => Value::U32(0),
                    Type::I32 => Value::I32(0),
                    _ => Value::U64(0),
                };
                for x in &mut values {
                    acc = match (&acc, &*x) {
                        (Value::U32(a), Value::U32(b)) => Value::U32(a.wrapping_add(*b)),
                        (Value::I32(a), Value::I32(b)) => Value::I32(a.wrapping_add(*b)),
                        (Value::U64(a), Value::U64(b)) => Value::U64(a.wrapping_add(*b)),
                        _ => unreachable!(),
                    };
                    *x = acc.clone();
                }
                return Ok(Value::List(values));
            }
            let (lambda, other) = if n == "zip" {
                let Value::List(ys) = expr(&args[0], env, types, p, fuel, None)? else {
                    return Err("zip list".into());
                };
                (&args[1], ys)
            } else {
                (&args[0], Vec::new())
            };
            let Expr::Lambda(a, l) = lambda else {
                return Err("nested lambda".into());
            };
            let Expr::Lambda(b, body) = l.as_ref() else {
                return Err("nested lambda".into());
            };
            let Type::List(output) = &ty else {
                return Err("output list".into());
            };
            let mut out = Vec::new();
            // One scope copy per operator; each iteration rebinds the same names.
            let mut local = copy_env(env, fuel)?;
            let mut ts = types.clone();
            if n == "zip" {
                ts.insert(a.clone(), (*input).clone());
                let Type::List(t) = crate::check::infer(&args[0], types, p)? else {
                    return Err("zip type".into());
                };
                ts.insert(b.clone(), *t);
            } else {
                ts.insert(a.clone(), Type::U32);
                ts.insert(b.clone(), (*input).clone());
            }
            for (i, x) in values.into_iter().enumerate() {
                if n == "zip" && i >= other.len() {
                    break;
                }
                if n == "zip" {
                    charge(fuel, weight(&other[i]))?;
                    local.insert(a.clone(), x);
                    local.insert(b.clone(), other[i].clone());
                } else {
                    local.insert(a.clone(), Value::U32(i as u32));
                    local.insert(b.clone(), x);
                }
                out.push(expr(body, &local, &ts, p, fuel, Some(output))?);
            }
            Ok(Value::List(out))
        }
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
            // One scope copy per operator; each iteration rebinds the same names.
            let mut local = copy_env(env, fuel)?;
            let mut local_types = types.clone();
            local_types.insert(item.clone(), ty.clone());
            local_types.insert(rest.clone(), ty.clone());
            for x in xs.into_iter().rev() {
                local.insert(item.clone(), x);
                local.insert(rest.clone(), rest_value);
                rest_value = expr(body, &local, &local_types, p, fuel, Some(&ty))?;
            }
            Ok(rest_value)
        }
        Expr::Num(n) => Ok(if ty == Type::I32 {
            Value::I32(*n as i32)
        } else if ty == Type::F32 {
            Value::F32((*n as f32).to_bits())
        } else if ty == Type::U32 {
            Value::U32(u32::try_from(*n).map_err(|_| "literal outside u32 range")?)
        } else {
            Value::U64(*n)
        }),
        Expr::Bool(b) => Ok(Value::Bool(*b)),
        Expr::Var(n) => {
            let v = env.get(n).ok_or_else(|| format!("unbound {n}"))?;
            charge(fuel, weight(v))?;
            Ok(v.clone())
        }
        Expr::Binary(op, a, b) => {
            let operand_ty = if crate::check::is_number(&ty) {
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
                (Value::F32(a), Value::F32(b), op) => {
                    let a = f32::from_bits(*a);
                    let b = f32::from_bits(*b);
                    Ok(match op {
                        "+" => Value::F32((a + b).to_bits()),
                        "-" => Value::F32((a - b).to_bits()),
                        "*" => Value::F32((a * b).to_bits()),
                        "<" => Value::Bool(a < b),
                        ">" => Value::Bool(a > b),
                        "<=" => Value::Bool(a <= b),
                        ">=" => Value::Bool(a >= b),
                        "==" => Value::Bool(a == b),
                        "!=" => Value::Bool(a != b),
                        _ => return Err("f32 operator".into()),
                    })
                }
                (Value::I32(a), Value::I32(b), op) => Ok(match op {
                    "+" => Value::I32(a.wrapping_add(*b)),
                    "-" => Value::I32(a.wrapping_sub(*b)),
                    "*" => Value::I32(a.wrapping_mul(*b)),
                    "<" => Value::Bool(a < b),
                    ">" => Value::Bool(a > b),
                    "<=" => Value::Bool(a <= b),
                    ">=" => Value::Bool(a >= b),
                    _ => Value::Bool(if op == "==" { a == b } else { a != b }),
                }),
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
                    if ty == Type::F32 {
                        let mut result = 0.0f32;
                        for x in xs {
                            let Value::F32(b) = x else {
                                return Err("float sum type".into());
                            };
                            result += f32::from_bits(*b);
                        }
                        return Ok(Value::F32(result.to_bits()));
                    }
                    if ty == Type::I32 {
                        let mut result = 0i32;
                        for x in xs {
                            let Value::I32(x) = x else {
                                return Err("i32 sum type".into());
                            };
                            result = result.wrapping_add(*x);
                        }
                        return Ok(Value::I32(result));
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
            let Type::List(inner) = crate::check::infer_context(
                xs,
                types,
                p,
                if n == "filter" { Some(&ty) } else { None },
            )?
            else {
                return Err("expected list".into());
            };
            // One scope copy per operator; each iteration rebinds the same name.
            let mut local = copy_env(env, fuel)?;
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
            for v in vals {
                charge(fuel, weight(&v))?;
                local.insert(var.clone(), v.clone());
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
    if DEPTH.with(|d| d.get()) > 0 {
        return call_here(p, name, args, fuel);
    }
    // Outermost entry: evaluate with a stack sized for the nesting bound.
    #[cfg(not(target_family = "wasm"))]
    {
        let start = *fuel;
        std::thread::scope(|scope| {
            let handle = std::thread::Builder::new()
                .name("ink-eval".into())
                .stack_size(EVAL_STACK)
                .spawn_scoped(scope, move || {
                    let mut left = start;
                    let r = call_here(p, name, args, &mut left);
                    (r, left)
                })
                .map_err(|e| format!("could not start interpreter thread: {e}"))?;
            match handle.join() {
                Ok((r, left)) => {
                    *fuel = left;
                    r
                }
                Err(panic) => std::panic::resume_unwind(panic),
            }
        })
    }
    #[cfg(target_family = "wasm")]
    call_here(p, name, args, fuel)
}
fn call_here(p: &Program, name: &str, args: Vec<Value>, fuel: &mut u64) -> LangResult<Value> {
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
