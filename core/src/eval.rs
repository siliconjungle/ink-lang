use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Value {
    U64(u64),
    U32(u32),
    I32(i32),
    F32(u32),
    F64(u64),
    Vector(Vec<Value>),
    Record(String, BTreeMap<String, Value>),
    Bool(bool),
    List(Vec<Value>),
    Buffer(crate::temporary::OwnedBuffer<Value>),
    Map(crate::temporary::OwnedMap<LocalKey, Value>),
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
            Self::F64(bits) => crate::float64::json_bits(*bits),
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
            Self::Buffer(_) | Self::Map(_) => serde_json::Value::Null,
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
            Type::F64 => crate::float64::from_json_bits(v).map(Self::F64),
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
            Type::U32 | Type::U64 | Type::I32 | Type::F32 | Type::F64 | Type::Vector(..) | Type::Bool => {
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
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum LocalKey {
    U32(u32),
    U64(u64),
    I32(i32),
    Bool(bool),
}
impl LocalKey {
    fn from_value(v: Value) -> LangResult<Self> {
        Ok(match v {
            Value::U32(x) => Self::U32(x),
            Value::U64(x) => Self::U64(x),
            Value::I32(x) => Self::I32(x),
            Value::Bool(x) => Self::Bool(x),
            _ => return Err("local map key type".into()),
        })
    }
    fn value(self) -> Value {
        match self {
            Self::U32(x) => Value::U32(x),
            Self::U64(x) => Value::U64(x),
            Self::I32(x) => Value::I32(x),
            Self::Bool(x) => Value::Bool(x),
        }
    }
}
type Env = BTreeMap<String, Value>;

// Weighted nesting bounds include variant-specific frames and contextual typing.
// This budget is checked in both debug and release small-stack regressions.
const MAX_DEPTH: usize = 384;
fn charge(fuel: &mut u64, cost: u64) -> LangResult<()> {
    *fuel = fuel
        .checked_sub(cost)
        .ok_or("interpreter evaluation budget exhausted")?;
    Ok(())
}
// Count copied cells iteratively, including compute records/vectors and the
// existing opaque state values. Copy costs cannot evade the execution budget.
fn weight(value: &Value) -> u64 {
    if !matches!(
        value,
        Value::List(_) | Value::Vector(_) | Value::Record(..) | Value::Opaque(_)
    ) {
        return 0;
    }
    let mut pending = vec![value];
    let mut opaque = Vec::new();
    let mut cost = 0u64;
    while let Some(v) = pending.pop() {
        match v {
            Value::List(xs) | Value::Vector(xs) => {
                cost = cost.saturating_add(xs.len() as u64);
                pending.extend(xs);
            }
            Value::Record(_, fields) => {
                cost = cost.saturating_add(fields.len() as u64);
                pending.extend(fields.values());
            }
            Value::Opaque(v) => opaque.push(v),
            _ => {}
        }
    }
    while let Some(v) = opaque.pop() {
        use crate::stateful::Value as S;
        match v {
            S::List(xs) => {
                cost = cost.saturating_add(xs.len() as u64);
                opaque.extend(xs);
            }
            S::Record(_, fs) => {
                cost = cost.saturating_add(fs.len() as u64);
                opaque.extend(fs.values());
            }
            S::Option(Some(v)) | S::Result(_, v) => {
                cost = cost.saturating_add(1);
                opaque.push(v);
            }
            S::String(s) => cost = cost.saturating_add(s.len() as u64),
            S::Int(n) => cost = cost.saturating_add(n.bits().div_ceil(8)),
            _ => {}
        }
    }
    cost
}
fn copy_value(value: &Value, fuel: &mut u64) -> LangResult<Value> {
    charge(fuel, weight(value))?;
    Ok(value.clone())
}
// Capture lexical dependencies only. Copy costs still charge the actual values
// retained by the evaluator; unrelated prepared data does not enter a callback.
fn copy_scope(env: &Env, body: &Expr, shadow: Option<&str>, fuel: &mut u64) -> LangResult<Env> {
    let mut captured = Env::new();
    for name in crate::analysis::free_variables(body) {
        if Some(name.as_str()) != shadow {
            if let Some(value) = env.get(&name) {
                captured.insert(name, copy_value(value, fuel)?);
            }
        }
    }
    Ok(captured)
}

// Immutable lexical projections can observe a child without first copying its
// containing record. Charge every traversed expression and copy the result.
fn lexical_place<'a>(e: &Expr, env: &'a Env) -> Option<&'a Value> {
    match e {
        Expr::Var(name) => env.get(name),
        Expr::Field(base, field) => match lexical_place(base, env)? {
            Value::Record(_, fields) => fields.get(field),
            Value::Vector(values) => ["x", "y", "z", "w"].iter().position(|f| *f == field)
                .and_then(|i| values.get(i)),
            _ => None,
        },
        _ => None,
    }
}
fn charge_place(e: &Expr, fuel: &mut u64, depth: usize) -> LangResult<()> {
    charge(fuel, 1)?;
    if depth > MAX_DEPTH { return Err("interpreter evaluation nesting limit exceeded".into()); }
    if let Expr::Field(base, _) = e { charge_place(base, fuel, depth + 2)?; }
    Ok(())
}

fn expr(
    e: &Expr,
    env: &Env,
    types: &crate::check::Env,
    p: &Program,
    fuel: &mut u64,
    want: Option<&Type>,
    depth: usize,
) -> LangResult<Value> {
    if *fuel == 0 {
        return Err("interpreter evaluation budget exhausted".into());
    }
    *fuel -= 1;
    if depth > MAX_DEPTH {
        return Err("interpreter evaluation nesting limit exceeded".into());
    }
    let depth = depth
        + match e {
            Expr::Method(..) => 8,
            Expr::Call(..) | Expr::Let(..) | Expr::Record(..) => 4,
            Expr::Field(..) | Expr::Neg(..) => 2,
            _ => 1,
        };
    // Function bodies are checked on entry. Arithmetic operands inherit their
    // checked numeric context; do not recheck the entire subtree per operation.
    let ty = match (e, want) {
        (Expr::Binary(op, _, _), Some(t))
            if ["+", "-", "*"].contains(&op.as_str()) && crate::check::is_numeric_value(t) =>
        {
            t.clone()
        }
        _ => crate::check::infer_context(e, types, p, want)?,
    };
    let frame = Frame {
        env,
        types,
        p,
        depth,
    };
    match e {
        Expr::Call(n, _) if n == "list" || crate::word::primitive(n) => {
            evaluate_value_constructor(e, frame, fuel, ty)
        }
        Expr::Call(n, _)
            if [
                "repeat_until",
                "buffer",
                "buffer_fill",
                "length",
                "parallel_map",
            ]
            .contains(&n.as_str()) =>
        {
            evaluate_local(e, frame, fuel, ty)
        }
        Expr::Method(x, _, _)
            if matches!(x.as_ref(),Expr::Var(n) if n=="Buffer" || n=="Map")
                || crate::check::infer(x, types, p)
                    .is_ok_and(|t| matches!(t, Type::Buffer(_) | Type::Map(..))) =>
        {
            evaluate_local(e, frame, fuel, ty)
        }
        Expr::Float(bits) => Ok(Value::F32(*bits)),
        Expr::Double(bits) => Ok(Value::F64(*bits)),
        Expr::String(text) => {
            charge(fuel, text.len() as u64)?;
            Ok(Value::Opaque(crate::stateful::Value::String(text.clone())))
        }
        Expr::Neg(_) => evaluate_negation(e, frame, fuel, ty),
        Expr::Let(..) => evaluate_binding(e, frame, fuel, ty),
        Expr::Record(..) => evaluate_record(e, frame, fuel, ty),
        Expr::Field(..) => evaluate_field(e, frame, fuel, ty),
        Expr::Call(n, _) if ["vec2", "vec3", "vec4"].contains(&n.as_str()) => {
            evaluate_vector(e, frame, fuel, ty)
        }
        Expr::Call(n, _) if n == "repeat" => evaluate_repeat(e, frame, fuel, ty),
        Expr::Call(n, _) if n == "quot_or" || n == "rem_or" => {
            evaluate_division(e, frame, fuel, ty)
        }
        Expr::Method(_, n, _) if n == "drop" || n == "take" => evaluate_slice(e, frame, fuel, ty),
        Expr::Method(_, n, _) if n == "at_or" => evaluate_index(e, frame, fuel, ty),
        Expr::Method(_, n, _) if n == "concat" => evaluate_concat(e, frame, fuel, ty),
        Expr::Method(_, n, _) if ["zip", "map_indexed", "scan", "sort"].contains(&n.as_str()) => {
            evaluate_array_operation(e, frame, fuel, ty)
        }
        Expr::Call(n, _) if n == "choose" => evaluate_choose(e, frame, fuel, ty),
        Expr::Call(n, _) if n == "fold_until" => evaluate_fold_until(e, frame, fuel, ty),
        Expr::Call(n, _) if n == "foldr" || n == "foldl" => evaluate_foldr(e, frame, fuel, ty),
        Expr::Num(_) | Expr::Bool(_) | Expr::Unit | Expr::Var(_) => {
            evaluate_literal(e, frame, fuel, ty)
        }
        Expr::Binary(..) => evaluate_binary(e, frame, fuel, ty),
        Expr::Call(..) => evaluate_apply(e, frame, fuel, ty),
        Expr::Method(..) => evaluate_map_filter(e, frame, fuel, ty),
        Expr::Lambda(..) => Err("lambda cannot be evaluated outside collection operator".into()),
        _ => Err("use stateful execution for this expression".into()),
    }
}

// Literal conversion must not enlarge every arithmetic recursion frame.
#[inline(never)]
fn evaluate_literal(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let env = frame.env;
    match e {
        Expr::Num(n) => Ok(if ty == Type::Int {
            Value::Opaque(crate::stateful::Value::Int(num_bigint::BigInt::from(*n)))
        } else if ty == Type::I32 {
            Value::I32(*n as i32)
        } else if ty == Type::F64 {
            Value::F64((*n as f64).to_bits())
        } else if ty == Type::F32 {
            Value::F32((*n as f32).to_bits())
        } else if ty == Type::U32 {
            Value::U32(u32::try_from(*n).map_err(|_| "literal outside u32 range")?)
        } else {
            Value::U64(*n)
        }),
        Expr::Bool(b) => Ok(Value::Bool(*b)),
        Expr::Unit => Ok(Value::Opaque(crate::stateful::Value::Unit)),
        Expr::Var(n) if n == "None" => Ok(Value::Opaque(crate::stateful::Value::Option(None))),
        Expr::Var(n) => copy_value(env.get(n).ok_or_else(|| format!("unbound {n}"))?, fuel),
        _ => unreachable!(),
    }
}

// Keep constructor temporaries out of the common recursive evaluation frame.
// In particular, word conversion owns opaque values and argument vectors.
#[inline(never)]
fn evaluate_value_constructor(
    e: &Expr,
    frame: Frame<'_>,
    fuel: &mut u64,
    ty: Type,
) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if n == "list" => {
            let Type::List(inner) = &ty else {
                return Err("list result type".into());
            };
            args.iter()
                .map(|e| expr(e, env, types, p, fuel, Some(inner), depth))
                .collect::<LangResult<Vec<_>>>()
                .map(Value::List)
        }
        Expr::Call(n, args) if crate::word::primitive(n) => {
            let ts = crate::word::arguments(n, &ty);
            let args = args
                .iter()
                .zip(ts)
                .map(|(e, t)| {
                    expr(e, env, types, p, fuel, Some(&t), depth)
                        .and_then(crate::stateful::Value::from_eval)
                })
                .collect::<LangResult<Vec<_>>>()?;
            crate::word::evaluate(n, &args)?.to_eval()
        }
        _ => unreachable!(),
    }
}

// A separate frame keeps deeply nested evaluation from reserving stack space
// for every other expression variant at each level.
#[derive(Clone, Copy)]
struct Frame<'a> {
    env: &'a Env,
    types: &'a crate::check::Env,
    p: &'a Program,
    depth: usize,
}

#[inline(never)]
fn evaluate_slice(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    let Expr::Method(x, n, a) = e else {
        unreachable!()
    };
    let Value::List(mut xs) = expr(x, env, types, p, fuel, Some(&ty), depth)? else {
        unreachable!()
    };
    let Value::U32(k) = expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)? else {
        unreachable!()
    };
    let k = (k as usize).min(xs.len());
    if n == "drop" {
        xs.drain(..k);
    } else {
        xs.truncate(k);
    }
    Ok(Value::List(xs))
}

#[inline(never)]
fn evaluate_negation(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Neg(e) => {
            if ty == Type::I32 {
                if let Expr::Num(n) = e.as_ref() {
                    return Ok(Value::I32((*n as i32).wrapping_neg()));
                }
            }
            let v = expr(e, env, types, p, fuel, Some(&ty), depth)?;
            Ok(match v {
                Value::I32(x) => Value::I32(x.wrapping_neg()),
                Value::U32(x) => Value::U32(x.wrapping_neg()),
                Value::U64(x) => Value::U64(x.wrapping_neg()),
                Value::F32(b) => Value::F32(b ^ 0x80000000),
                Value::F64(b) => Value::F64(b ^ 0x8000000000000000),
                Value::Opaque(crate::stateful::Value::Int(x)) => {
                    Value::Opaque(crate::stateful::Value::Int(-x))
                }
                _ => return Err("numeric negation".into()),
            })
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_binding(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Let(n, t, a, b) => {
            let at = crate::check::infer_context(a, types, p, t.as_deref())?;
            let value = expr(a, env, types, p, fuel, Some(&at), depth)?;
            let mut local = copy_scope(env, b, Some(n), fuel)?;
            local.insert(n.clone(), value);
            let mut ts = types.clone();
            ts.insert(n.clone(), at);
            // A sequence of lexical bindings needs one evaluator frame. Keep
            // the recursion bound for nested RHS expressions and function
            // calls; source elaboration must not turn a long straight-line
            // function into an artificial recursion failure. Charge each expression
            // and only the values actually retained by its continuation.
            let mut tail = b.as_ref();
            while let Expr::Let(n, t, a, b) = tail {
                charge(fuel, 1)?;
                crate::check::infer_context(tail, &ts, p, Some(&ty))?;
                let at = crate::check::infer_context(a, &ts, p, t.as_deref())?;
                let value = expr(a, &local, &ts, p, fuel, Some(&at), depth)?;
                local = copy_scope(&local, b, Some(n), fuel)?;
                local.insert(n.clone(), value);
                ts.insert(n.clone(), at);
                tail = b.as_ref();
            }
            expr(tail, &local, &ts, p, fuel, Some(&ty), depth)
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_record(e: &Expr, frame: Frame<'_>, fuel: &mut u64, _ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Record(n, fields) => {
            let mut out = BTreeMap::new();
            for (name, e) in fields {
                let t = &p.records[n].iter().find(|(f, _)| f == name).unwrap().1;
                out.insert(name.clone(), expr(e, env, types, p, fuel, Some(t), depth)?);
            }
            Ok(Value::Record(n.clone(), out))
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_field(e: &Expr, frame: Frame<'_>, fuel: &mut u64, _ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Field(e, n) => {
            if let Expr::Var(en) = e.as_ref() {
                if !env.contains_key(en)
                    && p.enums.get(en).is_some_and(|variants| variants.contains(n))
                {
                    return Ok(Value::Opaque(crate::stateful::Value::Enum(
                        en.clone(),
                        n.clone(),
                    )));
                }
            }
            if let Some(value) = lexical_place(e, env) {
                charge_place(e, fuel, depth)?;
                return match value {
                    Value::Record(_, fields) => copy_value(fields.get(n).ok_or("missing field")?, fuel),
                    Value::Vector(values) => copy_value(&values[["x", "y", "z", "w"].iter().position(|f| *f == n).unwrap()], fuel),
                    _ => Err("field access needs record/vector".into()),
                };
            }
            let v = expr(e, env, types, p, fuel, None, depth)?;
            match v {
                Value::Record(_, fields) => copy_value(fields.get(n).ok_or("missing field")?, fuel),
                Value::Vector(xs) => copy_value(
                    &xs[["x", "y", "z", "w"].iter().position(|f| *f == n).unwrap()],
                    fuel,
                ),
                _ => Err("field access needs record/vector".into()),
            }
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_vector(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if ["vec2", "vec3", "vec4"].contains(&n.as_str()) => {
            let Type::Vector(t, _) = &ty else {
                return Err("vector type".into());
            };
            args.iter()
                .map(|e| expr(e, env, types, p, fuel, Some(t), depth))
                .collect::<LangResult<Vec<_>>>()
                .map(Value::Vector)
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_repeat(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if n == "repeat" => {
            let Expr::Num(bound) = args[0] else {
                return Err("repeat bound".into());
            };
            let mut acc = expr(&args[1], env, types, p, fuel, Some(&ty), depth)?;
            let Expr::Lambda(index, l) = &args[2] else {
                return Err("repeat index lambda".into());
            };
            let Expr::Lambda(name, body) = l.as_ref() else {
                return Err("repeat accumulator lambda".into());
            };
            let mut ts = types.clone();
            ts.insert(index.clone(), Type::U32);
            ts.insert(name.clone(), ty.clone());
            let mut local = copy_scope(env, &args[2], None, fuel)?;
            for i in 0..bound {
                local.insert(index.clone(), Value::U32(i as u32));
                local.insert(name.clone(), acc);
                acc = expr(body, &local, &ts, p, fuel, Some(&ty), depth)?;
            }
            Ok(acc)
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_division(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if n == "quot_or" || n == "rem_or" => {
            let a = expr(&args[0], env, types, p, fuel, Some(&ty), depth)?;
            let b = expr(&args[1], env, types, p, fuel, Some(&ty), depth)?;
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
                expr(&args[2], env, types, p, fuel, Some(&ty), depth)
            }
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_index(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Method(xs, n, args) if n == "at_or" => {
            if let Some(Value::List(values)) = lexical_place(xs, env) {
                charge_place(xs, fuel, depth)?;
                let Value::U32(i) = expr(&args[0], env, types, p, fuel, Some(&Type::U32), depth)? else {
                    return Err("at_or index".into());
                };
                return match values.get(i as usize) {
                    Some(value) => copy_value(value, fuel),
                    None => expr(&args[1], env, types, p, fuel, Some(&ty), depth),
                };
            }
            let Value::List(xs) = expr(xs, env, types, p, fuel, None, depth)? else {
                return Err("at_or list".into());
            };
            let Value::U32(i) = expr(&args[0], env, types, p, fuel, Some(&Type::U32), depth)?
            else {
                return Err("at_or index".into());
            };
            if let Some(v) = xs.get(i as usize) {
                copy_value(v, fuel)
            } else {
                expr(&args[1], env, types, p, fuel, Some(&ty), depth)
            }
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_concat(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    let Expr::Method(xs, _, args) = e else {
        unreachable!("expression dispatch");
    };
    let Value::List(mut left) = expr(xs, env, types, p, fuel, Some(&ty), depth)? else {
        return Err("concat requires a list".into());
    };
    let Value::List(mut right) = expr(&args[0], env, types, p, fuel, Some(&ty), depth)? else {
        return Err("concat requires a list".into());
    };
    // Operands are owned values. Move their elements without changing the
    // caller's lists or duplicating nested values beyond ordinary evaluation.
    let len = left
        .len()
        .checked_add(right.len())
        .ok_or("concat list length overflow")?;
    charge(
        fuel,
        u64::try_from(len).map_err(|_| "concat list length exceeds evaluation budget")?,
    )?;
    left.try_reserve(right.len())
        .map_err(|_| "concat allocation limit")?;
    left.append(&mut right);
    Ok(Value::List(left))
}

#[inline(never)]
fn evaluate_array_operation(
    e: &Expr,
    frame: Frame<'_>,
    fuel: &mut u64,
    ty: Type,
) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Method(xs, n, args)
            if ["zip", "map_indexed", "scan", "sort"].contains(&n.as_str()) =>
        {
            let Value::List(mut values) = expr(xs, env, types, p, fuel, None, depth)? else {
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
                let Value::List(ys) = expr(&args[0], env, types, p, fuel, None, depth)? else {
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
            let mut local = copy_scope(env, lambda, None, fuel)?;
            let mut ts = types.clone();
            for (i, x) in values.into_iter().enumerate() {
                if n == "zip" && i >= other.len() {
                    break;
                }
                if n == "zip" {
                    local.insert(a.clone(), x);
                    local.insert(b.clone(), copy_value(&other[i], fuel)?);
                    ts.insert(a.clone(), (*input).clone());
                    let Type::List(t) = crate::check::infer(&args[0], types, p)? else {
                        return Err("zip type".into());
                    };
                    ts.insert(b.clone(), *t);
                } else {
                    local.insert(a.clone(), Value::U32(i as u32));
                    local.insert(b.clone(), x);
                    ts.insert(a.clone(), Type::U32);
                    ts.insert(b.clone(), (*input).clone());
                }
                out.push(expr(body, &local, &ts, p, fuel, Some(output), depth)?);
            }
            Ok(Value::List(out))
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_choose(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if n == "choose" => {
            if args.len() != 3 {
                return Err("choose argument count".into());
            }
            match expr(&args[0], env, types, p, fuel, Some(&Type::Bool), depth)? {
                Value::Bool(true) => expr(&args[1], env, types, p, fuel, Some(&ty), depth),
                Value::Bool(false) => expr(&args[2], env, types, p, fuel, Some(&ty), depth),
                _ => Err("choose condition must be Bool".into()),
            }
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_fold_until(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame { env, types, p, depth } = frame;
    let Expr::Call(_, args) = e else { unreachable!("expression dispatch") };
    if args.len() != 4 { return Err("fold_until argument count".into()); }
    let Value::List(xs) = expr(&args[0], env, types, p, fuel, None, depth)? else {
        return Err("fold_until needs a list".into());
    };
    let mut acc = expr(&args[1], env, types, p, fuel, Some(&ty), depth)?;
    let Type::List(item_type) = crate::check::infer(&args[0], types, p)? else {
        return Err("fold_until needs a list".into());
    };
    let Expr::Lambda(stop_item, stop_inner) = &args[2] else { return Err("fold_until lambda".into()); };
    let Expr::Lambda(stop_state, stop_body) = stop_inner.as_ref() else { return Err("fold_until nested lambda".into()); };
    let Expr::Lambda(step_item, step_inner) = &args[3] else { return Err("fold_until lambda".into()); };
    let Expr::Lambda(step_state, step_body) = step_inner.as_ref() else { return Err("fold_until nested lambda".into()); };
    // Capture the enclosing scope once, as foldr does. Both callbacks observe
    // the old accumulator; only the stop callback needs copies of moved values.
    let mut stop_env = copy_scope(env, &args[2], None, fuel)?;
    let mut step_env = copy_scope(env, &args[3], None, fuel)?;
    let mut stop_types = types.clone();
    stop_types.insert(stop_item.clone(), (*item_type).clone());
    stop_types.insert(stop_state.clone(), ty.clone());
    let mut step_types = types.clone();
    step_types.insert(step_item.clone(), *item_type);
    step_types.insert(step_state.clone(), ty.clone());
    for x in xs {
        stop_env.insert(stop_item.clone(), copy_value(&x, fuel)?);
        stop_env.insert(stop_state.clone(), copy_value(&acc, fuel)?);
        let Value::Bool(stopped) = expr(stop_body, &stop_env, &stop_types, p, fuel, Some(&Type::Bool), depth)? else {
            return Err("fold_until stop condition".into());
        };
        step_env.insert(step_item.clone(), x);
        step_env.insert(step_state.clone(), acc);
        acc = expr(step_body, &step_env, &step_types, p, fuel, Some(&ty), depth)?;
        if stopped { break; }
    }
    Ok(acc)
}

#[inline(never)]
fn evaluate_foldr(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) if n == "foldr" || n == "foldl" => {
            if args.len() != 3 {
                return Err("foldr argument count".into());
            }
            let Value::List(xs) = expr(&args[0], env, types, p, fuel, None, depth)? else {
                return Err("foldr needs a list".into());
            };
            let mut rest_value = expr(&args[1], env, types, p, fuel, Some(&ty), depth)?;
            let Expr::Lambda(item, inner) = &args[2] else {
                return Err("foldr needs a lambda".into());
            };
            let Expr::Lambda(rest, body) = inner.as_ref() else {
                return Err("foldr needs a nested lambda".into());
            };
            let mut local = copy_scope(env, &args[2], None, fuel)?;
            let Type::List(item_type) = crate::check::infer(&args[0], types, p)? else {
                return Err("foldr needs a list".into());
            };
            let mut local_types = types.clone();
            local_types.insert(item.clone(), *item_type);
            local_types.insert(rest.clone(), ty.clone());
            let mut xs = xs;
            if n == "foldr" {
                xs.reverse();
            }
            for x in xs {
                local.insert(item.clone(), x);
                local.insert(rest.clone(), rest_value);
                rest_value = expr(body, &local, &local_types, p, fuel, Some(&ty), depth)?;
            }
            Ok(rest_value)
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_binary(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Binary(op, a, b) => {
            let operand_ty = if crate::check::is_numeric_value(&ty) {
                Some(ty.clone())
            } else {
                crate::check::hint(a, types, p).or_else(|| crate::check::hint(b, types, p))
            };
            let av = expr(a, env, types, p, fuel, operand_ty.as_ref(), depth)?;
            if op == "&&" && av == Value::Bool(false) {
                return Ok(av);
            }
            if op == "||" && av == Value::Bool(true) {
                return Ok(av);
            }
            let bv = expr(b, env, types, p, fuel, operand_ty.as_ref(), depth)?;
            binary_values(op, av, bv)
        }
        _ => unreachable!("expression dispatch"),
    }
}

// One explicit binary32 operation boundary. Payload bits are retained for
// transport/negation; arithmetic NaNs have a single cross-target spelling.
#[inline(never)]
pub(crate) fn arithmetic_f32_bits(value: f32) -> u32 {
    crate::logic::canonical_f32_bits(value)
}

#[inline(never)]
fn binary_values(op: &str, av: Value, bv: Value) -> LangResult<Value> {
    match (&av, &bv, op) {
        (
            Value::Opaque(crate::stateful::Value::Int(a)),
            Value::Opaque(crate::stateful::Value::Int(b)),
            op,
        ) => {
            use crate::stateful::Value as S;
            Ok(match op {
                "+" => Value::Opaque(S::Int(a + b)),
                "-" => Value::Opaque(S::Int(a - b)),
                "*" => Value::Opaque(S::Int(a * b)),
                "<" => Value::Bool(a < b),
                ">" => Value::Bool(a > b),
                "<=" => Value::Bool(a <= b),
                ">=" => Value::Bool(a >= b),
                "==" => Value::Bool(a == b),
                "!=" => Value::Bool(a != b),
                _ => return Err("exact integer operator".into()),
            })
        }
        (Value::F64(a), Value::F64(b), op) => {
            let (a,b)=(f64::from_bits(*a),f64::from_bits(*b));
            Ok(match op {
                "+"=>Value::F64(crate::float64::canonical_bits(a+b)),
                "-"=>Value::F64(crate::float64::canonical_bits(a-b)),
                "*"=>Value::F64(crate::float64::canonical_bits(a*b)),
                "<"=>Value::Bool(a<b),">"=>Value::Bool(a>b),"<="=>Value::Bool(a<=b),">="=>Value::Bool(a>=b),
                "=="=>Value::Bool(a==b),"!="=>Value::Bool(a!=b),
                _=>return Err("f64 operator".into()),
            })
        }
        (Value::F32(a), Value::F32(b), op) => {
            let a = f32::from_bits(*a);
            let b = f32::from_bits(*b);
            Ok(match op {
                "+" => Value::F32(crate::logic::canonical_f32_bits(a + b)),
                "-" => Value::F32(crate::logic::canonical_f32_bits(a - b)),
                "*" => Value::F32(crate::logic::canonical_f32_bits(a * b)),
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

#[inline(never)]
fn evaluate_apply(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, args) => {
            if crate::primitives::primitive(n) {
                let first=crate::primitives::input_type(n,args.first(),|e|crate::check::infer(e,types,p))?;
                let (params,_)=crate::primitives::signature(n,first.as_ref())?;
                let vals=args.iter().zip(params).map(|(e,t)|expr(e,env,types,p,fuel,Some(&t),depth).and_then(crate::stateful::Value::from_eval)).collect::<LangResult<Vec<_>>>()?;
                return crate::primitives::evaluate(n,&vals)?.to_eval();
            }
            if [
                "Int",
                "Some",
                "Ok",
                "Err",
                "checked_add",
                "checked_sub",
                "checked_mul",
            ]
            .contains(&n.as_str())
            {
                return evaluate_value_builtin(n, args, frame, fuel, &ty);
            }
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
            let mut vals = Vec::with_capacity(args.len());
            for (e, t) in args.iter().zip(&expected) {
                vals.push(expr(e, env, types, p, fuel, t.as_ref(), depth)?);
            }
            if n == "sum" || n == "count" {
                if let Some(Value::List(xs)) = vals.first() {
                    if n == "count" {
                        return Ok(if ty == Type::Int {
                            Value::Opaque(crate::stateful::Value::Int(xs.len().into()))
                        } else {
                            Value::U64(xs.len() as u64)
                        });
                    }
                    if ty == Type::Int {
                        let mut sum = num_bigint::BigInt::from(0);
                        for x in xs {
                            let Value::Opaque(crate::stateful::Value::Int(x)) = x else {
                                return Err("exact sum type".into());
                            };
                            sum += x;
                        }
                        return Ok(Value::Opaque(crate::stateful::Value::Int(sum)));
                    }
                    if ty == Type::F64 {
                        let mut result=0.0f64;
                        for x in xs{let Value::F64(bits)=x else{return Err("binary64 sum type".into());};
                            result=f64::from_bits(crate::float64::canonical_bits(result+f64::from_bits(*bits)));
                        }
                        return Ok(Value::F64(crate::float64::canonical_bits(result)));
                    }
                    if ty == Type::F32 {
                        let mut result = 0.0f32;
                        for x in xs {
                            let Value::F32(b) = x else {
                                return Err("float sum type".into());
                            };
                            result =
                                f32::from_bits(arithmetic_f32_bits(result + f32::from_bits(*b)));
                        }
                        return Ok(Value::F32(crate::logic::canonical_f32_bits(result)));
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
            call_at(p, n, vals, fuel, depth)
        }
        _ => unreachable!("expression dispatch"),
    }
}

#[inline(never)]
fn evaluate_map_filter(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Method(xs, n, args) => {
            let receiver_type = crate::check::infer(xs, types, p)?;
            if matches!(receiver_type, Type::Option(_) | Type::Result(..)) {
                use crate::stateful::Value as S;
                let Value::Opaque(value) =
                    expr(xs, env, types, p, fuel, Some(&receiver_type), depth)?
                else {
                    return Err("variant receiver".into());
                };
                if n == "fold" {
                    let (branch, value, input) = match (&value, &receiver_type) {
                        (S::Option(Some(v)), Type::Option(t)) => {
                            (0, v.as_ref().clone(), t.as_ref().clone())
                        }
                        (S::Option(None), Type::Option(_)) => (1, S::Unit, Type::Unit),
                        (S::Result(true, v), Type::Result(t, _)) => {
                            (0, v.as_ref().clone(), t.as_ref().clone())
                        }
                        (S::Result(false, v), Type::Result(_, t)) => {
                            (1, v.as_ref().clone(), t.as_ref().clone())
                        }
                        _ => return Err("variant fold carrier".into()),
                    };
                    let Expr::Lambda(var, body) = &args[branch] else {
                        return Err("variant fold callback".into());
                    };
                    let mut local = copy_scope(env, &args[branch], None, fuel)?;
                    local.insert(var.clone(), value.to_eval()?);
                    let mut local_types = types.clone();
                    local_types.insert(var.clone(), input);
                    return expr(body, &local, &local_types, p, fuel, Some(&ty), depth);
                }
                if n == "ok_or" {
                    let error = S::from_eval(expr(&args[0], env, types, p, fuel, None, depth)?)?;
                    let S::Option(v) = value else {
                        return Err("ok_or requires Option".into());
                    };
                    return Ok(Value::Opaque(match v {
                        Some(v) => S::Result(true, v),
                        None => S::Result(false, Box::new(error)),
                    }));
                }
                let (payload, input_type) = match (&value, &receiver_type, n.as_str()) {
                    (S::Option(Some(v)), Type::Option(t), "map")
                    | (S::Result(true, v), Type::Result(t, _), "map")
                    | (S::Result(false, v), Type::Result(_, t), "map_err") => {
                        (v.as_ref(), t.as_ref())
                    }
                    _ => return Ok(Value::Opaque(value)),
                };
                let Expr::Lambda(var, body) = &args[0] else {
                    return Err("variant lambda".into());
                };
                let mut local = copy_scope(env, &args[0], None, fuel)?;
                local.insert(var.clone(), payload.to_eval()?);
                let mut ts = types.clone();
                ts.insert(var.clone(), input_type.clone());
                let output_type = match (&ty, n.as_str()) {
                    (Type::Option(t), _)
                    | (Type::Result(t, _), "map")
                    | (Type::Result(_, t), "map_err") => t.as_ref(),
                    _ => return Err("variant output".into()),
                };
                let mapped = Box::new(S::from_eval(expr(
                    body,
                    &local,
                    &ts,
                    p,
                    fuel,
                    Some(output_type),
                    depth,
                )?)?);
                return Ok(Value::Opaque(match value {
                    S::Option(_) => S::Option(Some(mapped)),
                    S::Result(ok, _) => S::Result(ok, mapped),
                    _ => unreachable!(),
                }));
            }
            let vals = if let Value::List(xs) = expr(
                xs,
                env,
                types,
                p,
                fuel,
                if n == "filter" { Some(&ty) } else { None },
                depth,
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
            let mut local = copy_scope(env, &args[0], None, fuel)?;
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
            for v in vals {
                local.insert(var.clone(), copy_value(&v, fuel)?);
                let r = expr(body, &local, &local_types, p, fuel, Some(&body_ty), depth)?;
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
        _ => unreachable!("expression dispatch"),
    }
}

fn evaluate_value_builtin(
    n: &str,
    args: &[Expr],
    frame: Frame<'_>,
    fuel: &mut u64,
    ty: &Type,
) -> LangResult<Value> {
    use crate::stateful::Value as S;
    let context = match (n, ty) {
        ("Some", Type::Option(t)) | ("Ok", Type::Result(t, _)) | ("Err", Type::Result(_, t)) => {
            Some(t.as_ref())
        }
        ("checked_add" | "checked_sub" | "checked_mul", Type::Result(t, _)) => Some(t.as_ref()),
        _ => None,
    };
    let first = expr(
        &args[0],
        frame.env,
        frame.types,
        frame.p,
        fuel,
        context,
        frame.depth,
    )?;
    let result = match n {
        "Some" => S::Option(Some(Box::new(S::from_eval(first)?))),
        "Ok" | "Err" => S::Result(n == "Ok", Box::new(S::from_eval(first)?)),
        "Int" => S::Int(match first {
            Value::U32(v) => v.into(),
            Value::U64(v) => v.into(),
            Value::I32(v) => v.into(),
            Value::Opaque(S::Int(v)) => v,
            _ => return Err("Int input".into()),
        }),
        _ => {
            let second = expr(
                &args[1],
                frame.env,
                frame.types,
                frame.p,
                fuel,
                context,
                frame.depth,
            )?;
            macro_rules! checked {
                ($a:expr, $b:expr, $variant:ident) => {{
                    let value = match n {
                        "checked_add" => $a.checked_add($b),
                        "checked_sub" => $a.checked_sub($b),
                        _ => $a.checked_mul($b),
                    };
                    value.map(S::$variant)
                }};
            }
            let value = match (first, second) {
                (Value::U32(a), Value::U32(b)) => checked!(a, b, U32),
                (Value::U64(a), Value::U64(b)) => checked!(a, b, U64),
                (Value::I32(a), Value::I32(b)) => checked!(a, b, I32),
                _ => return Err("checked integer operands".into()),
            };
            S::Result(
                value.is_some(),
                Box::new(
                    value.unwrap_or_else(|| S::Enum("ArithmeticError".into(), "Overflow".into())),
                ),
            )
        }
    };
    Ok(Value::Opaque(result))
}

/// Evaluate a closed primitive expression with the reference semantics. Used by
/// generic proof computation; no synthetic function name can intercept it.
pub(crate) fn closed(e: &Expr, p: &Program, want: &Type, fuel: &mut u64) -> LangResult<Value> {
    expr(
        e,
        &BTreeMap::new(),
        &crate::check::Env::new(),
        p,
        fuel,
        Some(want),
        0,
    )
}

pub fn call(p: &Program, name: &str, args: Vec<Value>, fuel: &mut u64) -> LangResult<Value> {
    if !p.contracts.is_empty() || !p.termination.is_empty(){crate::core::CheckedModule::from_source(p.clone())?;}
    else {crate::check::check(p)?;}
    call_verified(p,name,args,fuel)
}
/// Reuse a sealed module's admission while retaining ordinary argument checks,
/// ingress predicates and evaluation fuel. Raw programs still use `call`.
pub fn call_checked(
    module: &crate::core::CheckedModule,
    name: &str,
    args: Vec<Value>,
    fuel: &mut u64,
) -> LangResult<Value> {
    call_verified(module.program(), name, args, fuel)
}
pub(crate) fn call_verified(p:&Program,name:&str,args:Vec<Value>,fuel:&mut u64)->LangResult<Value>{
    let f = p
        .functions
        .iter()
        .find(|f| f.name == name)
        .ok_or("unknown function")?;
    if crate::local_collections::owned(&f.result, p)
        || f.params
            .iter()
            .any(|(_, t)| crate::local_collections::owned(t, p))
    {
        return Err("temporary storage is internal to a pure invocation".into());
    }
    if let Some(guard)=p.contracts.precondition_checks.get(name){
        if call_at(p,guard,args.clone(),fuel,0)?!=Value::Bool(true){return Err("contract precondition failed".into());}
    }
    call_at(p, name, args, fuel, 0)
}
fn call_at(
    p: &Program,
    name: &str,
    args: Vec<Value>,
    fuel: &mut u64,
    depth: usize,
) -> LangResult<Value> {
    let f = p
        .functions
        .iter()
        .find(|f| f.name == name)
        .ok_or_else(|| format!("unknown function {name}"))?;
    if args.len() != f.params.len() {
        return Err("argument count mismatch".into());
    }
    for (v, (_, t)) in args.iter().zip(&f.params) {
        if !crate::local_collections::owned(t, p)
            && Value::from_program_json(&v.json(), t, p)? != *v
        {
            return Err("argument type mismatch".into());
        }
    }
    let types = crate::check::params_env(&f.params)?;
    crate::check::infer_as(&f.body, &types, p, &f.result)?;
    let env: Env = f.params.iter().map(|(n, _)| n.clone()).zip(args).collect();
    if !crate::recursion::recursive(f) {
        return expr(&f.body, &env, &types, p, fuel, Some(&f.result), depth);
    }
    call_recursive(p, f, env, types, fuel, depth)
}

#[inline(never)]
fn call_recursive(
    p: &Program,
    f: &Function,
    mut env: Env,
    types: crate::check::Env,
    fuel: &mut u64,
    depth: usize,
) -> LangResult<Value> {
    loop {
        charge(fuel, 1)?;
        let mut local = env;
        let mut ts = types.clone();
        let mut body = &f.body;
        loop {
            match body {
                Expr::Let(n, annotation, a, b) => {
                    let t = crate::check::infer_context(a, &ts, p, annotation.as_deref())?;
                    let value = expr(a, &local, &ts, p, fuel, Some(&t), depth)?;
                    local.insert(n.clone(), value);
                    ts.insert(n.clone(), t);
                    body = b;
                }
                Expr::Call(n, a) if n == "choose" => {
                    let condition = expr(&a[0], &local, &ts, p, fuel, Some(&Type::Bool), depth)?;
                    body = if condition == Value::Bool(true) {
                        &a[1]
                    } else {
                        &a[2]
                    };
                }
                Expr::Call(n, a) if n == &f.name => {
                    let mut values = vec![];
                    for (a, (_, t)) in a.iter().zip(&f.params) {
                        values.push(expr(a, &local, &ts, p, fuel, Some(t), depth)?);
                    }
                    env = f
                        .params
                        .iter()
                        .map(|(n, _)| n.clone())
                        .zip(values)
                        .collect();
                    break;
                }
                _ => return expr(body, &local, &ts, p, fuel, Some(&f.result), depth),
            }
        }
    }
}

/// Execute the exact module admitted by the shared selection boundary.
pub fn call_selected(
    selected: &crate::optimisation::CheckedSelection,
    name: &str,
    args: Vec<Value>,
    fuel: &mut u64,
) -> LangResult<Value> {
    call_checked(selected.module(), name, args, fuel)
}

#[inline(never)]
fn evaluate_local(e: &Expr, frame: Frame<'_>, fuel: &mut u64, ty: Type) -> LangResult<Value> {
    let Frame {
        env,
        types,
        p,
        depth,
    } = frame;
    match e {
        Expr::Call(n, a) if n == "parallel_map" => {
            let Type::List(inner) = crate::check::infer(&a[0], types, p)? else {
                unreachable!()
            };
            let Type::List(out) = &ty else { unreachable!() };
            let Value::List(xs) = expr(&a[0], env, types, p, fuel, None, depth)? else {
                unreachable!()
            };
            expr(&a[1], env, types, p, fuel, Some(&Type::U32), depth)?;
            Ok(Value::List(indexed_values(
                xs, &a[2], env, types, p, fuel, &inner, out, depth,
            )?))
        }
        Expr::Call(n, a) if n == "length" => {
            let Value::List(xs) = expr(&a[0], env, types, p, fuel, None, depth)? else {
                unreachable!()
            };
            Ok(Value::U32(
                xs.len().try_into().map_err(|_| "list exceeds u32")?,
            ))
        }
        Expr::Call(n, a) if n == "repeat_until" => {
            let Value::U32(limit) = expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)?
            else {
                return Err("repeat_until limit".into());
            };
            let mut acc = expr(&a[1], env, types, p, fuel, Some(&ty), depth)?;
            let Expr::Lambda(stop_name, stop) = &a[2] else {
                unreachable!()
            };
            let Expr::Lambda(index, l) = &a[3] else {
                unreachable!()
            };
            let Expr::Lambda(name, body) = l.as_ref() else {
                unreachable!()
            };
            let mut ts = types.clone();
            ts.insert(index.clone(), Type::U32);
            ts.insert(name.clone(), ty.clone());
            let mut stop_ts = types.clone();
            stop_ts.insert(stop_name.clone(), ty.clone());
            let mut local = copy_scope(env, &a[3], None, fuel)?;
            let mut stop_env = copy_scope(env, &a[2], None, fuel)?;
            for i in 0..limit {
                charge(fuel, 1)?;
                stop_env.insert(stop_name.clone(), copy_value(&acc, fuel)?);
                if expr(stop, &stop_env, &stop_ts, p, fuel, Some(&Type::Bool), depth)?
                    == Value::Bool(true)
                {
                    break;
                }
                local.insert(index.clone(), Value::U32(i));
                local.insert(name.clone(), acc);
                acc = expr(body, &local, &ts, p, fuel, Some(&ty), depth)?;
            }
            Ok(acc)
        }
        Expr::Call(n, a) if n == "buffer" => {
            let Type::Buffer(t) = &ty else { unreachable!() };
            let Value::List(xs) = expr(
                &a[0],
                env,
                types,
                p,
                fuel,
                Some(&Type::List(t.clone())),
                depth,
            )?
            else {
                unreachable!()
            };
            Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(xs)))
        }
        Expr::Call(n, a) if n == "buffer_fill" => {
            let Type::Buffer(t) = &ty else { unreachable!() };
            let Value::U32(n) = expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)? else {
                unreachable!()
            };
            let v = expr(&a[1], env, types, p, fuel, Some(t), depth)?;
            charge(fuel, (n as u64).saturating_mul(1 + weight(&v)))?;
            Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(
                vec![v; n as usize],
            )))
        }
        Expr::Method(x, n, a) => {
            if matches!(x.as_ref(),Expr::Var(n) if n=="Buffer" || n=="Map") {
                return Ok(match ty {
                    Type::Buffer(_) => Value::Buffer(crate::temporary::OwnedBuffer::new(vec![])),
                    Type::Map(..) => Value::Map(crate::temporary::OwnedMap::new()),
                    _ => unreachable!(),
                });
            }
            let xt = crate::check::infer(x, types, p)?;
            let v = expr(x, env, types, p, fuel, Some(&xt), depth)?;
            match (v, xt) {
                (Value::Buffer(b), Type::Buffer(t)) => {
                    if n=="borrow_range" {
                        let Value::U32(start)=expr(&a[0],env,types,p,fuel,Some(&Type::U32),depth)? else {unreachable!()};
                        let Value::U32(count)=expr(&a[1],env,types,p,fuel,Some(&Type::U32),depth)? else {unreachable!()};
                        let Expr::Lambda(name,body)=&a[2] else {unreachable!()};
                        let begin=start.min(b.len());let size=count.min(b.len()-begin);
                        let cost=(0..size).fold(0u64,|cost,i|cost.saturating_add(1+b.with_item(begin+i,|v|weight(v.unwrap()))));
                        charge(fuel,cost)?;
                        let view=Value::Buffer(b.range_snapshot(start,count));
                        let mut local=copy_scope(env,&a[2],None,fuel)?;local.insert(name.clone(),view);
                        let mut ts=types.clone();ts.insert(name.clone(),Type::Buffer(t.clone()));
                        return expr(body,&local,&ts,p,fuel,Some(&ty),depth);
                    }
                    if n == "map_indexed" {
                        let xs =
                            indexed_values(b.freeze(), &a[0], env, types, p, fuel, &t, &t, depth)?;
                        return Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(xs)));
                    }
                    if n == "map" {
                        let Expr::Lambda(item, body) = &a[0] else {
                            unreachable!()
                        };
                        let mut local = copy_scope(env, &a[0], None, fuel)?;
                        let mut ts = types.clone();
                        ts.insert(item.clone(), *t.clone());
                        let mut ys = vec![];
                        for v in b.freeze() {
                            local.insert(item.clone(), v);
                            ys.push(expr(body, &local, &ts, p, fuel, Some(&t), depth)?);
                        }
                        return Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(ys)));
                    }
                    if n == "filter" {
                        let Expr::Lambda(item, body) = &a[0] else {
                            unreachable!()
                        };
                        let mut local = copy_scope(env, &a[0], None, fuel)?;
                        let mut ts = types.clone();
                        ts.insert(item.clone(), *t.clone());
                        let mut ys = vec![];
                        for v in b.freeze() {
                            local.insert(item.clone(), v.clone());
                            if expr(body, &local, &ts, p, fuel, Some(&Type::Bool), depth)?
                                == Value::Bool(true)
                            {
                                ys.push(v);
                            }
                        }
                        return Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(ys)));
                    }
                    if n == "scan" {
                        let mut acc = match t.as_ref() {
                            Type::U32 => Value::U32(0),
                            Type::U64 => Value::U64(0),
                            Type::I32 => Value::I32(0),
                            Type::F32 => Value::F32(0),
                            Type::F64 => Value::F64(0),
                            _ => return Err("buffer scan numeric type".into()),
                        };
                        let mut ys = vec![];
                        for v in b.freeze() {
                            charge(fuel, 1)?;
                            acc = binary_values("+", acc, v)?;
                            ys.push(acc.clone());
                        }
                        return Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(ys)));
                    }
                    if n == "map_parallel" {
                        expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)?;
                        let xs =
                            indexed_values(b.freeze(), &a[1], env, types, p, fuel, &t, &t, depth)?;
                        return Ok(Value::Buffer(crate::temporary::OwnedBuffer::new(xs)));
                    }
                    if n == "append" {
                        let Value::Buffer(other) = expr(
                            &a[0],
                            env,
                            types,
                            p,
                            fuel,
                            Some(&Type::Buffer(t.clone())),
                            depth,
                        )?
                        else {
                            unreachable!()
                        };
                        charge(fuel, other.len() as u64)?;
                        return Ok(Value::Buffer(b.append(other)));
                    }
                    if n == "split_at" {
                        let Value::U32(at) =
                            expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)?
                        else {
                            unreachable!()
                        };
                        let (left, right) = b.split(at);
                        let Expr::Lambda(l, rest) = &a[1] else {
                            unreachable!()
                        };
                        let Expr::Lambda(r, body) = rest.as_ref() else {
                            unreachable!()
                        };
                        let mut local = copy_scope(env, &a[1], None, fuel)?;
                        let mut ts = types.clone();
                        local.insert(l.clone(), Value::Buffer(left));
                        local.insert(r.clone(), Value::Buffer(right));
                        ts.insert(l.clone(), Type::Buffer(t.clone()));
                        ts.insert(r.clone(), Type::Buffer(t.clone()));
                        return expr(body, &local, &ts, p, fuel, Some(&ty), depth);
                    }
                    if n == "len" {
                        return Ok(Value::U32(b.len()));
                    }
                    if n == "freeze" {
                        return Ok(Value::List(b.freeze()));
                    }
                    if n == "pop" {
                        return Ok(Value::Buffer(b.pop()));
                    }
                    if n == "copy_within" || n == "fill_range" {
                        let Value::U32(first) =
                            expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)?
                        else {
                            unreachable!()
                        };
                        let Value::U32(second) =
                            expr(&a[1], env, types, p, fuel, Some(&Type::U32), depth)?
                        else {
                            unreachable!()
                        };
                        if n == "fill_range" {
                            let v = expr(&a[2], env, types, p, fuel, Some(&t), depth)?;
                            let touched = second.min(b.len().saturating_sub(first));
                            charge(fuel, (touched as u64).saturating_mul(1 + weight(&v)))?;
                            return Ok(Value::Buffer(b.fill_range(first, second, v)));
                        }
                        let Value::U32(count) =
                            expr(&a[2], env, types, p, fuel, Some(&Type::U32), depth)?
                        else {
                            unreachable!()
                        };
                        let touched = count
                            .min(b.len().saturating_sub(first))
                            .min(b.len().saturating_sub(second));
                        // Charge reachable value copies before allocating the snapshot.
                        for index in first..first.saturating_add(touched) {
                            b.with_item(index, |v| charge(fuel, 1 + weight(v.unwrap())))?;
                        }
                        return Ok(Value::Buffer(b.copy_within(first, second, count)));
                    }
                    let Value::U32(i) = (if n == "push" {
                        Value::U32(0)
                    } else {
                        expr(&a[0], env, types, p, fuel, Some(&Type::U32), depth)?
                    }) else {
                        unreachable!()
                    };
                    match n.as_str() {
                        "at_or" => b.with_item(i, |v| match v {
                            Some(v) => copy_value(v, fuel),
                            None => expr(&a[1], env, types, p, fuel, Some(&t), depth),
                        }),
                        "set" => {
                            let value = expr(&a[1], env, types, p, fuel, Some(&t), depth)?;
                            Ok(Value::Buffer(b.set(i, value)))
                        }
                        "swap" => {
                            let Value::U32(j) =
                                expr(&a[1], env, types, p, fuel, Some(&Type::U32), depth)?
                            else {
                                unreachable!()
                            };
                            Ok(Value::Buffer(b.swap(i, j)))
                        }
                        "push" => {
                            let value = expr(&a[0], env, types, p, fuel, Some(&t), depth)?;
                            charge(fuel, 1 + weight(&value))?;
                            Ok(Value::Buffer(b.push(value)))
                        }
                        "truncate" => Ok(Value::Buffer(b.truncate(i))),
                        _ => Err("buffer method".into()),
                    }
                }
                (Value::Map(m), Type::Map(k, t)) => {
                    if n == "len" {
                        return Ok(Value::U32(m.len()));
                    }
                    if n == "keys" {
                        charge(fuel, m.len() as u64)?;
                        return Ok(Value::List(
                            m.keys().into_iter().map(LocalKey::value).collect(),
                        ));
                    }
                    if n == "values" {
                        m.with_values(|vs| {
                            charge(
                                fuel,
                                vs.fold(m.len() as u64, |n, v| n.saturating_add(weight(v))),
                            )
                        })?;
                        return Ok(Value::List(m.values()));
                    }
                    let key =
                        LocalKey::from_value(expr(&a[0], env, types, p, fuel, Some(&k), depth)?)?;
                    match n.as_str() {
                        "contains" => Ok(Value::Bool(m.contains(&key))),
                        "get_or" => m.with_value(&key, |v| match v {
                            Some(v) => copy_value(v, fuel),
                            None => expr(&a[1], env, types, p, fuel, Some(&t), depth),
                        }),
                        "set" => {
                            let v = expr(&a[1], env, types, p, fuel, Some(&t), depth)?;
                            charge(fuel, 1 + weight(&v))?;
                            Ok(Value::Map(m.set(key, v)))
                        }
                        "remove" => Ok(Value::Map(m.remove(&key))),
                        _ => Err("map method".into()),
                    }
                }
                _ => Err("temporary value type".into()),
            }
        }
        _ => unreachable!(),
    }
}

fn indexed_values(
    xs: Vec<Value>,
    callback: &Expr,
    env: &Env,
    types: &crate::check::Env,
    p: &Program,
    fuel: &mut u64,
    input: &Type,
    output: &Type,
    depth: usize,
) -> LangResult<Vec<Value>> {
    let Expr::Lambda(index, rest) = callback else {
        unreachable!()
    };
    let Expr::Lambda(item, body) = rest.as_ref() else {
        unreachable!()
    };
    let mut local = copy_scope(env, callback, None, fuel)?;
    let mut ts = types.clone();
    ts.insert(index.clone(), Type::U32);
    ts.insert(item.clone(), input.clone());
    let mut out = Vec::with_capacity(xs.len());
    for (i, x) in xs.into_iter().enumerate() {
        charge(fuel, 1)?;
        local.insert(
            index.clone(),
            Value::U32(i.try_into().map_err(|_| "list exceeds u32")?),
        );
        local.insert(item.clone(), x);
        out.push(expr(body, &local, &ts, p, fuel, Some(output), depth)?);
    }
    Ok(out)
}
