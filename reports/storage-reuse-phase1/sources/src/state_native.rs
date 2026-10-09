//! Typed Rust lowering for the checked stateful subset. Generated programs do
//! not depend on this crate and do not carry an AST or expression evaluator.
use crate::{aggregate, check, syntax::*, LangResult};
use std::collections::BTreeMap;
use std::fmt::Write;

fn ident(s: &str) -> String {
    format!("l_{s}")
}
fn ty(t: &Type) -> LangResult<String> {
    Ok(match t {
        Type::U64 => "u64".into(),
        Type::U32 => "u32".into(),
        Type::Int => "BigInt".into(),
        Type::Unit => "()".into(),
        Type::String => "String".into(),
        Type::Bool => "bool".into(),
        Type::Named(n) if n == "ArithmeticError" => "()".into(),
        Type::Named(n) => ident(n),
        Type::List(a) => format!("Vec<{}>", ty(a)?),
        Type::Option(a) => format!("Option<{}>", ty(a)?),
        Type::Result(a, b) => format!("Result<{},{}>", ty(a)?, ty(b)?),
        Type::Table(a, b) => format!("BTreeMap<{},{}>", ty(a)?, ty(b)?),
        Type::Unknown => {
            return Err("native state backend needs a resolved type; add an annotation".into())
        }
    })
}
type Env = BTreeMap<String, Type>;
// Certificates inhabit exact arithmetic at every subexpression, including
// constant-only subtrees. Never infer their literals as modular u64 values.
fn exact_expression(e: &Expr) -> LangResult<String> {
    // Bindings are borrowed exact integers. Read them directly as operands;
    // arithmetic temporaries remain owned so BigInt may reuse their storage.
    // A root variable still produces the owned result required by the cache.
    fn operand(e: &Expr) -> LangResult<String> {
        if let Expr::Var(n) = e {
            Ok(ident(n))
        } else {
            exact_expression(e)
        }
    }
    match e {
        Expr::Num(n) => Ok(format!("BigInt::from({n}u64)")),
        Expr::Var(n) => Ok(format!("(*{}).clone()", ident(n))),
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
            Ok(format!("({} {op} {})", operand(a)?, operand(b)?))
        }
        _ => Err("invalid exact certificate expression".into()),
    }
}
// Ownership lowering preserves the AST and its evaluation order. Earlier
// reads of the consumed binding copy it; its final read moves the allocation.
fn exact_owned_expression(e: &Expr, owner: &str) -> LangResult<String> {
    fn occurrences(e: &Expr, owner: &str) -> usize {
        match e {
            Expr::Var(n) => usize::from(n == owner),
            Expr::Binary(_, a, b) => occurrences(a, owner) + occurrences(b, owner),
            _ => 0,
        }
    }
    fn emit(e: &Expr, owner: &str, remaining: &mut usize, operand: bool) -> LangResult<String> {
        match e {
            Expr::Var(n) if n == owner => {
                *remaining -= 1;
                Ok(if *remaining == 0 {
                    ident(n)
                } else {
                    format!("{}.clone()", ident(n))
                })
            }
            Expr::Var(n) if operand => Ok(ident(n)),
            Expr::Var(n) => Ok(format!("(*{}).clone()", ident(n))),
            Expr::Num(n) => Ok(format!("BigInt::from({n}u64)")),
            Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => {
                let a = emit(a, owner, remaining, true)?;
                let b = emit(b, owner, remaining, true)?;
                Ok(format!("({a} {op} {b})"))
            }
            _ => Err("invalid owned exact certificate expression".into()),
        }
    }
    emit(e, owner, &mut occurrences(e, owner), false)
}
struct Emitter<'a> {
    p: &'a Program,
    plans: BTreeMap<String, aggregate::Plan>,
    bounded: BTreeMap<String, BoundEvidence>,
    serial: usize,
}

#[derive(Clone, Debug, serde::Serialize)]
pub struct BoundEvidence {
    pub root: String,
    pub field: String,
    pub key_bits: u32,
    pub value_bits: u32,
    pub maximum_total: String,
    pub justification: &'static str,
}

/// Conservative range analysis for one exact sum of an unsigned row field.
/// Full key-domain cardinality is used, not an observed size or host RAM bound.
pub fn bounded_caches(p: &Program) -> BTreeMap<String, BoundEvidence> {
    use num_bigint::BigInt;
    let mut result = BTreeMap::new();
    for k in &p.keeps {
        let Some(plan) = aggregate::plan(k) else {
            continue;
        };
        if plan.count || plan.stages.len() != 1 {
            continue;
        }
        let (op, binder, body) = &plan.stages[0];
        if op != "map" {
            continue;
        }
        let Expr::Call(conversion, args) = body else {
            continue;
        };
        if conversion != "Int" || args.len() != 1 {
            continue;
        }
        let Expr::Field(base, field) = &args[0] else {
            continue;
        };
        if !matches!(&**base,Expr::Var(v) if v==binder) {
            continue;
        }
        let Some(root) = p.states.iter().find(|s| s.name == plan.root) else {
            continue;
        };
        let Type::Table(key, row) = &root.ty else {
            continue;
        };
        let key_bits = match &**key {
            Type::U32 => 32,
            Type::U64 => 64,
            Type::Named(n) if p.ids.contains(n) => 128,
            _ => continue,
        };
        let Type::Named(record) = &**row else {
            continue;
        };
        let Some(fields) = p.records.get(record) else {
            continue;
        };
        let Some((_, field_type)) = fields.iter().find(|(f, _)| f == field) else {
            continue;
        };
        let value_bits = match field_type {
            Type::U32 => 32,
            Type::U64 => 64,
            _ => continue,
        };
        let maximum = (BigInt::from(1u8) << key_bits) * ((BigInt::from(1u8) << value_bits) - 1u8);
        if maximum > BigInt::from(u128::MAX) {
            continue;
        }
        result.insert(k.name.clone(),BoundEvidence{root:root.name.clone(),field:field.clone(),key_bits,value_bits,maximum_total:maximum.to_string(),justification:"nonnegative unsigned field; finite map has at most 2^key_bits entries; maximum = 2^key_bits * (2^value_bits - 1) < 2^128"});
    }
    result
}

fn modular128_expression(e: &Expr) -> LangResult<String> {
    match e {
        Expr::Num(n) => Ok(format!("{n}u128")),
        Expr::Var(n) => Ok(ident(n)),
        Expr::Binary(op, a, b) => {
            let method = match op.as_str() {
                "+" => "wrapping_add",
                "-" => "wrapping_sub",
                "*" => "wrapping_mul",
                _ => return Err("invalid polynomial operator".into()),
            };
            Ok(format!(
                "({}).{method}({})",
                modular128_expression(a)?,
                modular128_expression(b)?
            ))
        }
        _ => Err("invalid polynomial expression".into()),
    }
}
impl Emitter<'_> {
    fn cache_type(&self, n: &str) -> &'static str {
        if self.bounded.contains_key(n) {
            "u128"
        } else {
            "BigInt"
        }
    }
    fn fresh(&mut self) -> String {
        self.serial += 1;
        format!("tmp_{}", self.serial)
    }
    fn expr(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<(String, Type)> {
        use Type as T;
        let (code, t) = match e {
            Expr::Num(n) => {
                let t = want
                    .filter(|t| matches!(t, T::U32 | T::Int))
                    .cloned()
                    .unwrap_or(T::U64);
                let s = match t {
                    T::Int => format!("BigInt::from({n}u64)"),
                    T::U32 => format!("{n}u32"),
                    _ => format!("{n}u64"),
                };
                (s, t)
            }
            Expr::Bool(v) => (v.to_string(), T::Bool),
            Expr::String(v) => (format!("{:?}.to_owned()", v), T::String),
            Expr::Unit => ("()".into(), T::Unit),
            Expr::Var(n) => {
                if let Some(t) = env.get(n) {
                    (
                        format!("<{} as Clone>::clone(&{})", ty(t)?, ident(n)),
                        t.clone(),
                    )
                } else if n == "None" {
                    (
                        "None".into(),
                        want.cloned().unwrap_or(T::Option(Box::new(T::Unknown))),
                    )
                } else if let Some(k) = self.p.keeps.iter().find(|k| &k.name == n) {
                    (format!("self.keep_{}()", ident(n)), k.ty.clone())
                } else {
                    return Err(format!("native: unsupported variable {n}"));
                }
            }
            Expr::Field(base, f) => {
                if let Expr::Var(n) = &**base {
                    if self.p.enums.contains_key(n) {
                        return Ok((format!("{}::{}", ident(n), ident(f)), T::Named(n.clone())));
                    }
                    // Avoid copying an entire record just to access one field.
                    if let Some(T::Named(n)) = env.get(n) {
                        if let Some(fields) = self.p.records.get(n) {
                            if let Some((_, t)) = fields.iter().find(|(s, _)| s == f) {
                                if let Expr::Var(v) = &**base {
                                    return Ok((
                                        format!("{}.{}.clone()", ident(v), ident(f)),
                                        t.clone(),
                                    ));
                                }
                            }
                        }
                    }
                }
                let (b, t) = self.expr(base, env, None)?;
                let T::Named(n) = t else {
                    return Err("native field requires record".into());
                };
                let t = self
                    .p
                    .records
                    .get(&n)
                    .and_then(|fs| fs.iter().find(|(s, _)| s == f))
                    .ok_or("native: unknown field")?
                    .1
                    .clone();
                (format!("({b}).{}.clone()", ident(f)), t)
            }
            Expr::Record(n, fs) => {
                let mut fields = vec![];
                for (f, e) in fs {
                    let t = &self.p.records[n].iter().find(|(x, _)| x == f).unwrap().1;
                    let (s, _) = self.expr(e, env, Some(t))?;
                    fields.push(format!("{}:{s}", ident(f)))
                }
                (
                    format!("{}{{{}}}", ident(n), fields.join(",")),
                    T::Named(n.clone()),
                )
            }
            Expr::Try(e) => {
                let (s, t) = self.expr(e, env, None)?;
                let T::Result(a, _) = t else {
                    return Err("native: ? requires Result".into());
                };
                (format!("({s})?"), *a)
            }
            Expr::Binary(op, a, b) => {
                let (mut ac, mut at) = self.expr(a, env, None)?;
                if matches!(&**a, Expr::Num(_)) {
                    let (_, bt) = self.expr(b, env, None)?;
                    if matches!(bt, T::U32 | T::Int) {
                        (ac, at) = self.expr(a, env, Some(&bt))?
                    }
                }
                let (bc, _) = self.expr(b, env, Some(&at))?;
                let arithmetic = ["+", "-", "*"].contains(&op.as_str());
                let s = if arithmetic && matches!(at, T::U32 | T::U64) {
                    let method = match op.as_str() {
                        "+" => "wrapping_add",
                        "-" => "wrapping_sub",
                        _ => "wrapping_mul",
                    };
                    format!("({ac}).{method}({bc})")
                } else {
                    format!("(({ac}) {op} ({bc}))")
                };
                (s, if arithmetic { at } else { T::Bool })
            }
            Expr::Call(n, args) => match n.as_str() {
                "Ok" | "Err" | "Some" => {
                    let inner = match (n.as_str(), want) {
                        ("Ok", Some(T::Result(a, _)))
                        | ("Err", Some(T::Result(_, a)))
                        | ("Some", Some(T::Option(a))) => Some(&**a),
                        _ => None,
                    };
                    let (s, t) = self.expr(&args[0], env, inner)?;
                    let out = want.cloned().unwrap_or_else(|| match n.as_str() {
                        "Ok" => T::Result(Box::new(t), Box::new(T::Unknown)),
                        "Err" => T::Result(Box::new(T::Unknown), Box::new(t)),
                        _ => T::Option(Box::new(t)),
                    });
                    (format!("{n}({s})"), out)
                }
                "Int" => {
                    let (s, _) = self.expr(&args[0], env, None)?;
                    (format!("BigInt::from({s})"), T::Int)
                }
                "checked_add" | "checked_sub" | "checked_mul" => {
                    let (a, t) = self.expr(&args[0], env, None)?;
                    let (b, _) = self.expr(&args[1], env, Some(&t))?;
                    (
                        format!("({a}).{n}({b}).ok_or(())"),
                        T::Result(Box::new(t), Box::new(T::Named("ArithmeticError".into()))),
                    )
                }
                "sum" | "count" => {
                    let (s, t) = self.expr(&args[0], env, None)?;
                    let T::List(t) = t else {
                        return Err("native aggregate requires list".into());
                    };
                    if n == "count" {
                        (format!("BigInt::from(({s}).len())"), T::Int)
                    } else {
                        let zero = if *t == T::Int {
                            "BigInt::from(0u8)".into()
                        } else {
                            format!("0{}", ty(&t)?)
                        };
                        let add = if *t == T::Int {
                            "a+b"
                        } else {
                            "a.wrapping_add(b)"
                        };
                        (format!("({s}).into_iter().fold({zero},|a,b|{add})"), *t)
                    }
                }
                _ => {
                    let (params, result, is_change, prefix) =
                        if let Some(a) = self.p.actions.iter().find(|a| &a.name == n) {
                            (&a.params, &a.result, a.kind == ActionKind::Change, "action")
                        } else if let Some(f) = self.p.functions.iter().find(|a| &a.name == n) {
                            (&f.params, &f.result, false, "function")
                        } else {
                            return Err(format!("native unknown call {n}"));
                        };
                    let mut bindings = String::new();
                    let mut values = vec![];
                    for (e, (_, t)) in args.iter().zip(params) {
                        let (s, _) = self.expr(e, env, Some(t))?;
                        let v = self.fresh();
                        write!(bindings, "let {v}:{rt}={s};", rt = ty(t)?).unwrap();
                        values.push(v)
                    }
                    let call = format!("self.{prefix}_{}({})", ident(n), values.join(","));
                    let call = if is_change {
                        format!("match {call} {{value @ Ok(_)=>value,Err(e)=>return Err(e)}}")
                    } else {
                        call
                    };
                    (format!("{{{bindings}{call}}}"), result.clone())
                }
            },
            Expr::Method(base, n, args) => {
                let root = if let Expr::Var(v) = &**base {
                    self.p.states.iter().find(|s| &s.name == v)
                } else {
                    None
                };
                if let Some(root) = root {
                    let T::Table(k, v) = &root.ty else {
                        unreachable!()
                    };
                    let field = ident(&root.name);
                    if n == "values" {
                        (
                            format!("self.{field}.values().cloned().collect::<Vec<_>>()"),
                            T::List(v.clone()),
                        )
                    } else {
                        let (key, _) = self.expr(&args[0], env, Some(k))?;
                        match n.as_str() {
                            "get" => (
                                format!("self.{field}.get(&({key})).cloned()"),
                                T::Option(v.clone()),
                            ),
                            "contains" => (format!("self.{field}.contains_key(&({key}))"), T::Bool),
                            "remove" => (
                                format!("{{let key={key};self.set_{field}(key,None)}}"),
                                T::Option(v.clone()),
                            ),
                            "insert" | "replace" => {
                                let (value, _) = self.expr(&args[1], env, Some(v))?;
                                (format!("{{let key={key};let value={value};self.set_{field}(key,Some(value));}}"),T::Unit)
                            }
                            _ => return Err(format!("native unsupported table method {n}")),
                        }
                    }
                } else {
                    let (s, t) = self.expr(base, env, None)?;
                    if n == "ok_or" {
                        let T::Option(inner) = t else {
                            return Err("native ok_or needs Option".into());
                        };
                        let (e, et) = self.expr(&args[0], env, None)?;
                        (format!("({s}).ok_or({e})"), T::Result(inner, Box::new(et)))
                    } else {
                        let Expr::Lambda(v, b) = &args[0] else {
                            return Err("native method needs lambda".into());
                        };
                        let inner = match (&t, n.as_str()) {
                            (T::List(t), "map" | "filter")
                            | (T::Option(t), "map")
                            | (T::Result(t, _), "map")
                            | (T::Result(_, t), "map_err") => t,
                            _ => return Err(format!("native unsupported method {n}")),
                        };
                        let mut local = env.clone();
                        local.insert(v.clone(), *inner.clone());
                        let (code, out) = self.expr(b, &local, None)?;
                        let (s, out) = match t {
                            T::List(t) => {
                                let mapped = format!(
                                    "({s}).into_iter().{n}(|{}|{{{code}}}).collect::<Vec<_>>()",
                                    ident(v)
                                );
                                (
                                    mapped,
                                    if n == "filter" {
                                        T::List(t)
                                    } else {
                                        T::List(Box::new(out))
                                    },
                                )
                            }
                            T::Option(_) => (
                                format!("({s}).map(|{}|{{{code}}})", ident(v)),
                                T::Option(Box::new(out)),
                            ),
                            T::Result(a, b) => (
                                format!("({s}).{n}(|{}|{{{code}}})", ident(v)),
                                if n == "map_err" {
                                    T::Result(a, Box::new(out))
                                } else {
                                    T::Result(Box::new(out), b)
                                },
                            ),
                            _ => unreachable!(),
                        };
                        (s, out)
                    }
                }
            }
            Expr::Lambda(..) => return Err("native lambda outside operator".into()),
        };
        Ok((code, t))
    }
    fn block(&mut self, stmts: &[Statement], env: &mut Env, result: &Type) -> LangResult<String> {
        let mut out = String::new();
        for stmt in stmts {
            match stmt {
                Statement::Let(n, annotation, e) => {
                    let (s, inferred) = self.expr(e, env, annotation.as_ref())?;
                    let t = annotation.as_ref().unwrap_or(&inferred);
                    writeln!(out, "let {}:{}={s};", ident(n), ty(t)?).unwrap();
                    env.insert(n.clone(), t.clone());
                }
                Statement::Return(e) => {
                    let (s, _) = self.expr(e, env, Some(result))?;
                    writeln!(out, "return {s};").unwrap();
                }
                Statement::If(e, a, b) => {
                    let (s, _) = self.expr(e, env, Some(&Type::Bool))?;
                    let yes = self.block(a, &mut env.clone(), result)?;
                    let no = self.block(b, &mut env.clone(), result)?;
                    writeln!(out, "if {s} {{{yes}}} else {{{no}}}").unwrap();
                }
                Statement::Emit(n, e) => {
                    let (s, _) = self.expr(e, env, Some(&self.p.events[n]))?;
                    writeln!(
                        out,
                        "{{let value={s};self.staged.push(EventData::{}(value));}}",
                        ident(n)
                    )
                    .unwrap();
                }
                Statement::Expr(e) => {
                    let (s, _) = self.expr(e, env, None)?;
                    writeln!(out, "let _={s};").unwrap();
                }
            }
        }
        Ok(out)
    }
    fn contribution(&mut self, name: &str, plan: &aggregate::Plan) -> LangResult<String> {
        let root = self
            .p
            .states
            .iter()
            .find(|s| s.name == plan.root)
            .ok_or("unknown plan root")?;
        let Type::Table(_, row) = &root.ty else {
            unreachable!()
        };
        if let Some(bound) = self.bounded.get(name) {
            return Ok(format!(
                "fn contribution_{}(row:&{})->u128{{row.{} as u128}}\n",
                ident(name),
                ty(row)?,
                ident(&bound.field)
            ));
        }
        let mut current = "row".to_string();
        let mut current_ty = *row.clone();
        let mut out = String::new();
        for (op, v, body) in &plan.stages {
            let env = [(v.clone(), current_ty.clone())].into();
            let (e, t) = self.expr(body, &env, None)?;
            if op == "filter" {
                write!(
                    out,
                    "{{let {}=&{current};if !({e}){{return BigInt::from(0u8)}}}}",
                    ident(v)
                )
                .unwrap();
            } else {
                let next = self.fresh();
                write!(out, "let {next}={{let {}=&{current};{e}}};", ident(v)).unwrap();
                current = next;
                current_ty = t;
            }
        }
        let result = if plan.count {
            "BigInt::from(1u8)".into()
        } else {
            if current_ty != Type::Int {
                return Err("native maintenance needs exact Int contributions".into());
            }
            current
        };
        Ok(format!(
            "fn contribution_{}(row:&{})->BigInt{{{out}{result}}}\n",
            ident(name),
            ty(row)?
        ))
    }
}

pub fn emit(p: &Program, certificate: Option<&aggregate::Certificate>) -> LangResult<String> {
    emit_with_bounds(p, certificate, false)
}

pub fn emit_with_bounds(
    p: &Program,
    certificate: Option<&aggregate::Certificate>,
    narrow: bool,
) -> LangResult<String> {
    check::check(p)?;
    if let Some(c) = certificate {
        aggregate::verify(c)?;
    }
    let plans = if certificate.is_some() {
        p.keeps
            .iter()
            .filter_map(|k| aggregate::plan(k).map(|v| (k.name.clone(), v)))
            .collect()
    } else {
        BTreeMap::new()
    };
    let mut emitter = Emitter {
        p,
        plans,
        bounded: if narrow && certificate.is_some() {
            bounded_caches(p)
        } else {
            BTreeMap::new()
        },
        serial: 0,
    };
    let mut out = String::from(
        "#![allow(non_camel_case_types,non_snake_case,unused_variables,unused_parens,dead_code)]\n",
    );
    out.push_str(include_str!("state_native_support.txt"));
    out.push_str("\nmod portable {\n");
    out.push_str(include_str!("snapshot_wire.rs"));
    out.push_str("\n}\npub use portable::Limits as SnapshotLimits;\n");
    let layout = crate::snapshot::layout(p)?;
    writeln!(out,"fn snapshot_layout()->portable::Layout{{portable::Layout{{program:{:?},schema:{:?},roots:vec![",layout.program,layout.schema).unwrap();
    for (n, k, v) in &layout.roots {
        writeln!(
            out,
            "({n:?}.into(),{},{}),",
            crate::snapshot::schema_code(k),
            crate::snapshot::schema_code(v)
        )
        .unwrap();
    }
    out.push_str("],events:vec![");
    for (n, t) in &layout.events {
        writeln!(out, "({n:?}.into(),{}),", crate::snapshot::schema_code(t)).unwrap();
    }
    out.push_str("]}}\n");
    // Nominal IDs remain distinct types even though their native storage is u128.
    for n in &p.ids {
        let id = ident(n);
        writeln!(out,r#"
#[derive(Clone,Copy,Debug,PartialEq,Eq,PartialOrd,Ord)] pub struct {id}(pub u128);
impl Wire for {id} {{
 fn to_json(&self)->Json{{json!(format!("{{:032x}}",self.0))}}
 fn from_json(v:&Json)->Result<Self,String>{{let s=v.as_str().ok_or("expected ID")?;if s.len()!=32 || !s.bytes().all(|b|b.is_ascii_hexdigit()){{return Err("invalid ID".into())}} Ok(Self(u128::from_str_radix(s,16).map_err(|e|e.to_string())?))}}
}}
"#).unwrap();
    }
    for (n, fs) in &p.records {
        let id = ident(n);
        let fields = fs
            .iter()
            .map(|(f, t)| Ok(format!("pub {}:{}", ident(f), ty(t)?)))
            .collect::<LangResult<Vec<_>>>()?
            .join(",");
        writeln!(out,"#[derive(Clone,Debug,PartialEq,Eq)] pub struct {id}{{{fields}}}\nimpl Wire for {id} {{fn to_json(&self)->Json{{json!({{").unwrap();
        for (f, _) in fs {
            writeln!(out, "{f:?}:self.{}.to_json(),", ident(f)).unwrap();
        }
        writeln!(out,"}})}} fn from_json(v:&Json)->Result<Self,String>{{let obj=v.as_object().ok_or(\"expected record\")?;if obj.len()!={}{{return Err(\"record field mismatch\".into())}}Ok(Self{{",fs.len()).unwrap();
        for (f, t) in fs {
            writeln!(
                out,
                "{}:<{} as Wire>::from_json(obj.get({f:?}).ok_or(\"missing field\")?)?,",
                ident(f),
                ty(t)?
            )
            .unwrap();
        }
        out.push_str("})}}\n");
    }
    for (n, variants) in &p.enums {
        let id = ident(n);
        writeln!(out,"#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub enum {id}{{{}}}\nimpl Wire for {id}{{fn to_json(&self)->Json{{match self{{",variants.iter().map(|v|ident(v)).collect::<Vec<_>>().join(",")).unwrap();
        for v in variants {
            writeln!(out, "Self::{}=>json!({:?}),", ident(v), format!("{n}.{v}")).unwrap();
        }
        out.push_str("}}fn from_json(v:&Json)->Result<Self,String>{match v.as_str(){");
        for v in variants {
            writeln!(
                out,
                "Some({:?})=>Ok(Self::{}),",
                format!("{n}.{v}"),
                ident(v)
            )
            .unwrap();
        }
        out.push_str("_=>Err(\"invalid enum\".into())}}}\n");
    }
    out.push_str("#[derive(Clone,Debug)] pub enum EventData {\n");
    for (n, t) in &p.events {
        writeln!(out, "{}({}),", ident(n), ty(t)?).unwrap();
    }
    out.push_str("}\nimpl EventData {fn wire(&self)->(&'static str,Json){match *self {\n");
    for (n, _) in &p.events {
        writeln!(out, "Self::{}(ref v)=>({n:?},v.to_json()),", ident(n)).unwrap();
    }
    out.push_str("}}}\n");
    out.push_str("enum Undo {\n");
    for s in &p.states {
        let Type::Table(k, v) = &s.ty else {
            unreachable!()
        };
        write!(
            out,
            "{} {{key:{},old:Option<{}>",
            ident(&s.name),
            ty(k)?,
            ty(v)?
        )
        .unwrap();
        for (n, plan) in &emitter.plans {
            if plan.root == s.name {
                let cache_ty = if aggregate::journal(certificate.unwrap()).is_some()
                    && !emitter.bounded.contains_key(n)
                {
                    "Option<(u8,BigInt)>"
                } else {
                    emitter.cache_type(n)
                };
                write!(out, ",cache_{}:{}", ident(n), cache_ty).unwrap();
            }
        }
        out.push_str("},\n");
    }
    out.push_str("}\n");
    out.push_str(
        "pub struct State {version:u64,staged:Vec<EventData>,outbox:Vec<Event>,undo:Vec<Undo>,\n",
    );
    for s in &p.states {
        writeln!(out, "{}:{},", ident(&s.name), ty(&s.ty)?).unwrap();
    }
    for n in emitter.plans.keys() {
        writeln!(out, "cache_{}:{},", ident(n), emitter.cache_type(n)).unwrap();
    }
    out.push_str("}\nimpl Default for State {fn default()->Self{Self::new()}}\nimpl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],\n");
    for s in &p.states {
        writeln!(out, "{}:BTreeMap::new(),", ident(&s.name)).unwrap();
    }
    for n in emitter.plans.keys() {
        writeln!(
            out,
            "cache_{}:{}::from(0u8),",
            ident(n),
            emitter.cache_type(n)
        )
        .unwrap();
    }
    out.push_str("}}\n");
    out.push_str("pub fn version(&self)->u64{self.version}\npub fn outbox(&self)->&[Event]{&self.outbox}\npub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}\n");
    out.push_str("pub fn checkpoint(&self)->Result<Vec<u8>,String>{self.checkpoint_with_limits(SnapshotLimits::default())}\npub fn checkpoint_with_limits(&self,limits:SnapshotLimits)->Result<Vec<u8>,String>{if !self.undo.is_empty()||!self.staged.is_empty(){return Err(\"checkpoint requires transaction boundary\".into())}let layout=snapshot_layout();let tables=vec![");
    for (n, _, _) in &layout.roots {
        writeln!(
            out,
            "self.{}.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect(),",
            ident(n)
        )
        .unwrap();
    }
    out.push_str("];let outbox=self.outbox.iter().map(|e|{let(channel,value)=match e.data{");
    for (i, (n, _)) in layout.events.iter().enumerate() {
        writeln!(out, "EventData::{}(ref v)=>({i},v.to_json()),", ident(n)).unwrap();
    }
    out.push_str("};portable::Event{commit:e.commit,position:e.position,channel,value}}).collect();portable::encode(&layout,&portable::Logical{version:self.version,tables,outbox},limits)}\n");
    out.push_str("pub fn restore(bytes:&[u8])->Result<Self,String>{Self::restore_with_limits(bytes,SnapshotLimits::default())}\npub fn restore_with_limits(bytes:&[u8],limits:SnapshotLimits)->Result<Self,String>{let layout=snapshot_layout();let logical=portable::decode(&layout,bytes,limits)?;let mut state=Self::new();state.version=logical.version;let mut tables=logical.tables.into_iter();");
    for (n, _, _) in &layout.roots {
        let s = p.states.iter().find(|s| &s.name == n).unwrap();
        let Type::Table(k, v) = &s.ty else {
            unreachable!()
        };
        writeln!(out,"for(k,v)in tables.next().unwrap(){{state.{}.insert(<{} as Wire>::from_json(&k)?,<{} as Wire>::from_json(&v)?);}}",ident(n),ty(k)?,ty(v)?).unwrap();
    }
    out.push_str("state.outbox=logical.outbox.into_iter().map(|e|{let data=match e.channel{");
    for (i, (n, _)) in layout.events.iter().enumerate() {
        writeln!(
            out,
            "{i}=>EventData::{}(<{} as Wire>::from_json(&e.value)?),",
            ident(n),
            ty(&p.events[n])?
        )
        .unwrap();
    }
    out.push_str("_=>return Err(\"unknown event channel\".into())};Ok(Event{commit:e.commit,position:e.position,data})}).collect::<Result<Vec<_>,String>>()?;");
    for (n, plan) in &emitter.plans {
        let id = ident(n);
        let root = ident(&plan.root);
        if emitter.bounded.contains_key(n) {
            writeln!(out,"for row in state.{root}.values(){{state.cache_{id}=state.cache_{id}.checked_add(Self::contribution_{id}(row)).ok_or(\"restored aggregate violates range\")?;}}").unwrap();
        } else {
            writeln!(out,"for row in state.{root}.values(){{state.cache_{id}+=Self::contribution_{id}(row);}}").unwrap();
        }
    }
    out.push_str("Ok(state)}\n");
    for (n, plan) in emitter.plans.clone() {
        out.push_str(&emitter.contribution(&n, &plan)?);
    }
    // A single typed write primitive per root owns its undo and cache entries.
    for s in &p.states {
        let field = ident(&s.name);
        let Type::Table(k, v) = &s.ty else {
            unreachable!()
        };
        // Ordered-map insertion/removal returns the actual previous value.
        // Reuse it for rollback instead of performing a separate lookup.
        writeln!(out,"fn set_{field}(&mut self,key:{},value:Option<{}>)->Option<{}>{{let old=match &value{{Some(v)=>self.{field}.insert(key.clone(),v.clone()),None=>self.{field}.remove(&key)}};",ty(k)?,ty(v)?,ty(v)?).unwrap();
        for (n, plan) in emitter.plans.clone() {
            if plan.root != s.name {
                continue;
            }
            let id = ident(&n);
            let c = certificate.unwrap();
            let bounded = emitter.bounded.contains_key(&n);
            let journal = aggregate::journal(c).filter(|_| !bounded);
            let total = if bounded {
                format!("self.cache_{id}.clone()")
            } else {
                format!("&self.cache_{id}")
            };
            if journal.is_none() {
                writeln!(out, "let undo_{id}=self.cache_{id}.clone();").unwrap();
            }
            writeln!(out,"let (next_{id}, saved_{id})={{let total={total};let old_part=old.as_ref().map(Self::contribution_{id});let new_part=value.as_ref().map(Self::contribution_{id});match (old_part,new_part){{").unwrap();
            for (kind, pattern, e, vars) in [
                (0, "(None,Some(new))", &c.insert, vec!["total", "new"]),
                (
                    1,
                    "(Some(old),Some(new))",
                    &c.replace,
                    vec!["total", "old", "new"],
                ),
                (2, "(Some(old),None)", &c.remove, vec!["total", "old"]),
            ] {
                write!(out, "{pattern}=>{{").unwrap();
                for v in vars {
                    let borrow = if bounded || v == "total" { "" } else { "&" };
                    write!(out, "let {}={borrow}{v};", ident(v)).unwrap();
                }
                if let Some(journal) = journal {
                    let action = journal.action(kind);
                    writeln!(out,"let saved={};let l_saved=&saved;let l_total=std::mem::take(&mut self.cache_{id});let next={};(next,Some(({kind}u8,saved))) }},", exact_expression(&action.save)?,exact_owned_expression(&action.apply,"total")?).unwrap();
                } else {
                    let expr = if bounded {
                        modular128_expression(e)?
                    } else {
                        write!(out, "let l_total=std::mem::take(&mut self.cache_{id});").unwrap();
                        exact_owned_expression(e, "total")?
                    };
                    writeln!(out, "({expr},None::<(u8,BigInt)>) }},").unwrap();
                }
            }
            let identity = if bounded {
                "total".into()
            } else {
                format!("std::mem::take(&mut self.cache_{id})")
            };
            writeln!(
                out,
                "(None,None)=>({identity},None)}}}};self.cache_{id}=next_{id};"
            )
            .unwrap();
            if journal.is_some() {
                writeln!(out, "let undo_{id}=saved_{id};").unwrap();
            }
        }
        write!(
            out,
            "self.undo.push(Undo::{field}{{key:key.clone(),old:old.clone()"
        )
        .unwrap();
        for (n, plan) in &emitter.plans {
            if plan.root == s.name {
                write!(out, ",cache_{}:undo_{}", ident(n), ident(n)).unwrap();
            }
        }
        out.push_str("});\n");
        out.push_str("old}\n");
    }
    out.push_str("fn rollback(&mut self){for undo in self.undo.drain(..).rev(){match undo{\n");
    for s in &p.states {
        let id = ident(&s.name);
        write!(out, "Undo::{id}{{key,old").unwrap();
        for (n, plan) in &emitter.plans {
            if plan.root == s.name {
                write!(out, ",cache_{}", ident(n)).unwrap();
            }
        }
        write!(out,"}}=>{{match old{{Some(v)=>{{self.{id}.insert(key,v);}},None=>{{self.{id}.remove(&key);}}}}").unwrap();
        for (n, plan) in &emitter.plans {
            if plan.root == s.name {
                let cache = ident(n);
                if let Some(journal) = certificate
                    .and_then(aggregate::journal)
                    .filter(|_| !emitter.bounded.contains_key(n))
                {
                    write!(out,"if let Some((kind,saved))=cache_{cache}{{let l_total=std::mem::take(&mut self.cache_{cache});let l_saved=&saved;self.cache_{cache}=match kind{{").unwrap();
                    for kind in 0..3 {
                        write!(
                            out,
                            "{kind}=>{},",
                            exact_owned_expression(&journal.action(kind).restore, "total")?
                        )
                        .unwrap();
                    }
                    out.push_str("_=>unreachable!(\"internal journal operation\")};}");
                } else {
                    write!(out, "self.cache_{cache}=cache_{cache};").unwrap();
                }
            }
        }
        out.push_str("},\n");
    }
    out.push_str("}}self.staged.clear();}\n");
    for k in &p.keeps {
        let body = if emitter.plans.contains_key(&k.name) {
            if emitter.bounded.contains_key(&k.name) {
                format!("BigInt::from(self.cache_{})", ident(&k.name))
            } else {
                format!("self.cache_{}.clone()", ident(&k.name))
            }
        } else {
            emitter.expr(&k.value, &Env::new(), Some(&k.ty))?.0
        };
        writeln!(
            out,
            "fn keep_{}(&mut self)->{}{{{body}}}",
            ident(&k.name),
            ty(&k.ty)?
        )
        .unwrap();
    }
    for f in &p.functions {
        let env = f.params.iter().cloned().collect();
        let body = emitter.expr(&f.body, &env, Some(&f.result))?.0;
        let params = f
            .params
            .iter()
            .map(|(n, t)| Ok(format!("{}:{}", ident(n), ty(t)?)))
            .collect::<LangResult<Vec<_>>>()?
            .join(",");
        writeln!(
            out,
            "fn function_{}(&mut self,{params})->{}{{{body}}}",
            ident(&f.name),
            ty(&f.result)?
        )
        .unwrap();
    }
    for a in &p.actions {
        // A direct bounded keep query admits an allocation-free exact host ABI.
        // The ordinary language/JSON API still returns Int. This extra view is
        // generated from checked structure, never an application name.
        if a.kind == ActionKind::Query && a.params.is_empty() && a.result == Type::Int {
            if let [Statement::Return(Expr::Var(keep))] = a.body.as_slice() {
                if emitter.bounded.contains_key(keep) {
                    writeln!(out,"pub fn query_words_{}(&self)->(u64,u64){{let v=self.cache_{};(v as u64,(v>>64) as u64)}}",ident(&a.name),ident(keep)).unwrap();
                }
            }
        }
        let id = ident(&a.name);
        let params = a
            .params
            .iter()
            .map(|(n, t)| Ok(format!("{}:{}", ident(n), ty(t)?)))
            .collect::<LangResult<Vec<_>>>()?
            .join(",");
        let args = a
            .params
            .iter()
            .map(|(n, _)| ident(n))
            .collect::<Vec<_>>()
            .join(",");
        let result = ty(&a.result)?;
        let body = emitter.block(&a.body, &mut a.params.iter().cloned().collect(), &a.result)?;
        writeln!(out,"fn action_{id}(&mut self,{params})->{result}{{{body}}}\npub fn invoke_{id}(&mut self,{params})->Result<Outcome<{result}>,String>{{let result=self.action_{id}({args});").unwrap();
        if a.kind == ActionKind::Query {
            out.push_str(
                "Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}\n",
            );
        } else {
            out.push_str("if result.is_err(){self.rollback();return Ok(Outcome{result,committed:false,version:self.version,events:vec![]})}let Some(version)=self.version.checked_add(1) else {self.rollback();return Err(\"commit sequence exhausted\".into())};self.version=version;self.undo.clear();let events=self.staged.drain(..).enumerate().map(|(position,data)|Event{commit:version,position:position as u64,data}).collect::<Vec<_>>();self.outbox.extend(events.iter().cloned());Ok(Outcome{result,committed:true,version,events})}\n");
        }
    }
    out.push_str("pub fn invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>{let args=args.as_array().ok_or(\"expected argument array\")?;match name{\n");
    for a in &p.actions {
        write!(
            out,
            "{:?}=>{{if args.len()!={}{{return Err(\"argument count mismatch\".into())}}",
            a.name,
            a.params.len()
        )
        .unwrap();
        let mut argv = vec![];
        for (i, (_, t)) in a.params.iter().enumerate() {
            write!(
                out,
                "let a{i}=<{} as Wire>::from_json(&args[{i}])?;",
                ty(t)?
            )
            .unwrap();
            argv.push(format!("a{i}"));
        }
        writeln!(
            out,
            "Ok(self.invoke_{}({})?.to_json())}},",
            ident(&a.name),
            argv.join(",")
        )
        .unwrap();
    }
    out.push_str("_=>Err(\"unknown action\".into())}}}\n");
    Ok(out)
}

pub const RUNNER: &str = r#"
use compiled_state::*;
fn run()->Result<(),String>{
 let mut args=std::env::args().skip(1);let file=args.next().ok_or("expected SCRIPT.json")?;
 let mut restore=None;let mut snapshot_out=None;
 while let Some(flag)=args.next(){let value=args.next().ok_or("missing option value")?;match flag.as_str(){"--restore"=>restore=Some(value),"--snapshot-out"=>snapshot_out=Some(value),_=>return Err(format!("unknown option {flag}"))}}
 let script:serde_json::Value=serde_json::from_slice(&std::fs::read(file).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let mut state=if let Some(file)=restore{State::restore(&std::fs::read(file).map_err(|e|e.to_string())?)?}else{State::new()};let mut output=vec![];
 for step in script.as_array().ok_or("expected script array")? {
  output.push(state.invoke_json(step.get("call").and_then(serde_json::Value::as_str).ok_or("missing call")?,step.get("args").ok_or("missing args")?)?);
 }
 if let Some(file)=snapshot_out{std::fs::write(file,state.checkpoint()?).map_err(|e|e.to_string())?;}
 println!("{}",serde_json::to_string_pretty(&output).map_err(|e|e.to_string())?);Ok(())
}
fn main()->std::process::ExitCode{match run(){Ok(())=>std::process::ExitCode::SUCCESS,Err(e)=>{eprintln!("error: {e}");std::process::ExitCode::FAILURE}}}
"#;

/// The optional single-threaded Wasm ABI is appended to a generated crate.
pub const WASM_ABI: &str = include_str!("state_wasm_support.rs");
