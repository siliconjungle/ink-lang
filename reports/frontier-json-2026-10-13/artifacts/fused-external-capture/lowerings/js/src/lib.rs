//! Literal JavaScript emission for checked pure Ink, with no optimisation laws.
use ink_core::{check, core::CheckedModule, syntax::*, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub struct Emission {
    pub javascript: String,
    pub manifest: Value,
}
pub mod definition;
pub mod portable_definition;
mod state;
mod state_capture;
mod value_layout;
mod owned_values;
mod wire_values;
mod compiled_values;
mod value_capture;
mod primitives;
type Env = BTreeMap<String, (String, Type)>;
fn quote(s: &str) -> String {
    serde_json::to_string(s).unwrap()
}
fn descriptor(t: &Type, p: &Program, _seen: &mut BTreeSet<String>) -> LangResult<Value> {
    ink_abi::describe(t, &p.records, &p.enums, &p.ids)
}
fn arithmetic(op: &str, a: &str, b: &str, t: &Type) -> String {
    match t {
        Type::U64 => format!("__u64(({a}) {op} ({b}))"),
        Type::Int => format!("(({a}) {op} ({b}))"),
        Type::U32 => {
            if op == "*" {
                format!("(Math.imul({a},{b}) >>> 0)")
            } else {
                format!("((({a}) {op} ({b})) >>> 0)")
            }
        }
        Type::I32 => {
            if op == "*" {
                format!("Math.imul({a},{b})")
            } else {
                format!("((({a}) {op} ({b})) | 0)")
            }
        }
        Type::F32 => format!("__bits(__float({a}) {op} __float({b}))"),
        _ => unreachable!("checked arithmetic type"),
    }
}
fn zero(t: &Type) -> &'static str {
    if matches!(t, Type::U64 | Type::Int) {
        "0n"
    } else {
        "0"
    }
}

fn needs_parallel(e: &Expr, p: &Program, seen: &mut std::collections::BTreeSet<String>) -> bool {
    let mut found = false;
    ink_core::analysis::walk(e, |node: &Expr| match node {
        Expr::Call(name, _) => {
            if name == "parallel_map" {
                found = true;
            } else if seen.insert(name.clone()) {
                if let Some(f) = p.functions.iter().find(|f| f.name == *name) {
                    found |= needs_parallel(&f.body, p, seen);
                }
            }
        }
        Expr::Method(_, name, _) if name == "map_parallel" => found = true,
        _ => {}
    });
    found
}
struct TypedEquality<'a> {
    p: &'a Program,
    prefix: &'static str,
    native_f32: bool,
    elisions: BTreeSet<String>,
    equalities: BTreeMap<String, (String, String)>,
}
impl<'a> TypedEquality<'a> {
    fn new(p: &'a Program, prefix: &'static str) -> Self {
        Self { p, prefix, native_f32: false, elisions: BTreeSet::new(), equalities: BTreeMap::new() }
    }
    fn source(&self) -> String {
        self.equalities.values().map(|(_, source)| source.as_str()).collect()
    }
    // Fixed structural equality compares contained F32 bits in either carrier;
    // top-level scalar F32 equality alone uses IEEE comparison.
    fn expr(&mut self, t: &Type, a: &str, b: &str) -> LangResult<String> {
        if self.native_f32 && *t == Type::F32 {
            return Ok(format!("(__nfBits({a})===__nfBits({b}))"));
        }
        let key = serde_json::to_string(t).map_err(|e| e.to_string())?;
        if let Some((name, _)) = self.equalities.get(&key) {
            return Ok(format!("{name}({a},{b})"));
        }
        let composite = matches!(
            t,
            Type::List(_) | Type::Vector(..) | Type::Option(_) | Type::Result(..)
        ) || matches!(t, Type::Named(n) if self.p.records.contains_key(n));
        if !composite {
            return Ok(format!("({a}==={b})"));
        }
        let name = format!("{}{}", self.prefix, self.equalities.len());
        self.equalities
            .insert(key.clone(), (name.clone(), String::new()));
        let body = match t {
            Type::List(inner) | Type::Vector(inner, _) => {
                let item = self.expr(inner, "a[i]", "b[i]")?;
                format!("if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!({item}))return false;return true;")
            }
            Type::Option(inner) => {
                let item = self.expr(inner, "a.Some", "b.Some")?;
                format!("const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||{item});")
            }
            Type::Result(ok, err) => {
                let yes = self.expr(ok, "a.Ok", "b.Ok")?;
                let no = self.expr(err, "a.Err", "b.Err")?;
                format!("const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?{yes}:{no});")
            }
            Type::Named(n) => {
                let fields = self.p.records[n].clone();
                if self.elisions.contains(n) {
                    let child=self.expr(&fields[0].1,"a","b")?;
                    self.equalities.insert(key,(name.clone(),format!("function {name}(a,b){{return {child};}}\n")));
                    return Ok(format!("{name}({a},{b})"));
                }
                let checks = fields
                    .iter()
                    .map(|(field, ty)| {
                        self.expr(
                            ty,
                            &format!("a[{}]", quote(field)),
                            &format!("b[{}]", quote(field)),
                        )
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                format!(
                    "return {};",
                    if checks.is_empty() {
                        "true".into()
                    } else {
                        checks.join("&&")
                    }
                )
            }
            _ => unreachable!(),
        };
        self.equalities.insert(
            key,
            (
                name.clone(),
                format!("function {name}(a,b){{if(a===b)return true;{body}}}\n"),
            ),
        );
        Ok(format!("{name}({a},{b})"))
    }
}
struct Emitter<'a> {
    p: &'a Program,
    next: usize,
    budget: usize,
    depth: usize,
    lines: String,
    callbacks: Vec<(String, String)>,
    equality: TypedEquality<'a>,
    native_f32: bool,
    /// Unique-ownership facts of the function being emitted (see
    /// `ink_core::in_place`). Empty for recursive functions.
    in_place: ink_core::in_place::InPlace,
}
impl Emitter<'_> {
    fn arithmetic(&self, op: &str, a: &str, b: &str, t: &Type) -> String {
        if self.native_f32 && *t == Type::F32 {
            format!("Math.fround(__nfNumber({a}) {op} __nfNumber({b}))")
        } else { arithmetic(op,a,b,t) }
    }
    fn value_equal(&mut self, t: &Type, a: &str, b: &str) -> LangResult<String> {
        self.equality.expr(t, a, b)
    }
    fn fresh(&mut self) -> String {
        let n = format!("v{}", self.next);
        self.next += 1;
        n
    }
    fn line(&mut self, s: impl AsRef<str>) {
        self.lines.push_str(s.as_ref());
        self.lines.push('\n');
    }
    fn bind(&mut self, value: &str) -> String {
        let name = self.fresh();
        self.line(format!("const {name}={value};"));
        name
    }
    fn parallel(
        &mut self,
        input: String,
        grain: String,
        callback: &Expr,
        env: &Env,
        inner: &Type,
        result: &Type,
    ) -> LangResult<String> {
        let captures: Vec<_> = env
            .iter()
            .filter(|(n, (_, t))| {
                ink_core::analysis::references_free(callback, n)
                    && !ink_core::local_collections::owned(t, self.p)
            })
            .collect();
        let name = self.fresh();
        let saved = std::mem::take(&mut self.lines);
        let mut local = Env::new();
        for (i, (n, (_, t))) in captures.iter().enumerate() {
            local.insert((*n).clone(), (format!("captures[{i}]"), t.clone()));
        }
        let (body, local) = Self::callback(
            callback,
            &local,
            &[("index".into(), Type::U32), ("item".into(), inner.clone())],
        )?;
        let value = self.expr(body, &local, Some(result))?;
        let lines = std::mem::replace(&mut self.lines, saved);
        self.callbacks.push((
            name.clone(),
            format!("function(captures,index,item){{{lines}return {value};}}"),
        ));
        Ok(format!(
            "__parallel({}, {input}, {grain}, [{}])",
            quote(&name),
            captures
                .iter()
                .map(|(_, (v, _))| v.as_str())
                .collect::<Vec<_>>()
                .join(",")
        ))
    }
    fn types(env: &Env) -> check::Env {
        env.iter()
            .map(|(n, (_, t))| (n.clone(), t.clone()))
            .collect()
    }
    fn infer(&self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<Type> {
        check::infer_context(e, &Self::types(env), self.p, want)
    }

    // Bind callback arguments into a lexical environment at compile time. The
    // target loop executes the checked body directly, not a callback closure.
    fn callback<'a>(
        e: &'a Expr,
        env: &Env,
        params: &[(String, Type)],
    ) -> LangResult<(&'a Expr, Env)> {
        let mut local = env.clone();
        let mut body = e;
        for (value, ty) in params {
            let Expr::Lambda(name, rest) = body else {
                return Err("expected collection lambda".into());
            };
            local.insert(name.clone(), (value.clone(), ty.clone()));
            body = rest;
        }
        Ok((body, local))
    }
    fn destination_store(&mut self, destination: &str, index: &str, value: &str, conversion: &str) {
        let value = if conversion.is_empty() {
            value.to_owned()
        } else {
            format!("{conversion}({value})")
        };
        self.line(format!("{destination}[{index}]={value};"));
    }
    // Explicit caller storage applies to the terminal stage only. The return
    // expression is the logical length, independent of destination capacity.
    fn list_into(
        &mut self,
        e: &Expr,
        env: &Env,
        ty: &Type,
        destination: &str,
        conversion: &str,
    ) -> LangResult<String> {
        if self.budget == 0 {
            return Err("JavaScript emission budget exceeded".into());
        }
        self.budget -= 1;
        let Type::List(output) = ty else {
            return Err("destination requires list result".into());
        };
        match e {
            Expr::Let(n, annotation, a, b) => {
                let at = self.infer(a, env, annotation.as_deref())?;
                if at == *ty && ink_core::collection_facts::returned_alias(b, n) {
                    // Only alias binders remain: place the initializer directly
                    // in caller storage and retain its logical count. Capacity
                    // is never used as the source collection's extent.
                    return self.list_into(a, env, ty, destination, conversion);
                }
                let value = self.expr(a, env, Some(&at))?;
                let value = self.bind(&value);
                let mut local = env.clone();
                local.insert(n.clone(), (value, at));
                self.list_into(b, &local, ty, destination, conversion)
            }
            Expr::Call(n, args) if n == "choose" => {
                let condition = self.expr(&args[0], env, Some(&Type::Bool))?;
                let count = self.fresh();
                self.line(format!("let {count};if({condition}){{"));
                let left = self.list_into(&args[1], env, ty, destination, conversion)?;
                self.line(format!("{count}={left};}}else{{"));
                let right = self.list_into(&args[2], env, ty, destination, conversion)?;
                self.line(format!("{count}={right};}}"));
                Ok(count)
            }
            Expr::Call(n, args) if self.p.functions.iter().any(|f| &f.name == n) => {
                let (index, f) = self
                    .p
                    .functions
                    .iter()
                    .enumerate()
                    .find(|(_, f)| &f.name == n)
                    .unwrap();
                let f = f.clone();
                let mut values = Vec::new();
                for (arg, (_, ty)) in args.iter().zip(&f.params) {
                    let value = self.expr(arg, env, Some(ty))?;
                    values.push(self.bind(&value));
                }
                values.push(destination.to_owned());
                Ok(self.bind(&format!("__into{index}({})", values.join(","))))
            }
            Expr::Method(receiver, method, args)
                if ["concat", "scan", "map", "filter", "map_indexed", "zip"]
                    .contains(&method.as_str()) =>
            {
                let context = if method == "filter" || method == "concat" {
                    Some(ty)
                } else {
                    None
                };
                let Type::List(inner) = self.infer(receiver, env, context)? else {
                    return Err("list receiver required".into());
                };
                let value = self.expr(receiver, env, context)?;
                let xs = self.bind(&value);
                let logical_len: Option<String> = None;
                if method == "concat" {
                    let ys = self.expr(&args[0], env, Some(ty))?;
                    let ys = self.bind(&ys);
                    let left = self.bind(&format!("{xs}.length"));
                    let right = self.bind(&format!("{ys}.length"));
                    for (source, offset, length) in [
                        (&xs, "0".to_owned(), left.clone()),
                        (&ys, left.clone(), right.clone()),
                    ] {
                        let i = self.fresh();
                        self.line(format!("for(let {i}=0;{i}<{length};{i}++){{"));
                        self.destination_store(
                            destination,
                            &format!("{offset}+{i}"),
                            &format!("{source}[{i}]"),
                            conversion,
                        );
                        self.line("}");
                    }
                    return Ok(self.bind(&format!("{left}+{right}")));
                }
                let mut second = None;
                let len = if method == "zip" {
                    let Type::List(other) = self.infer(&args[0], env, None)? else {
                        return Err("zip receiver required".into());
                    };
                    let ys = self.expr(&args[0], env, None)?;
                    let ys = self.bind(&ys);
                    let len = self.bind(&format!("Math.min({xs}.length,{ys}.length)"));
                    second = Some((ys, *other));
                    len
                } else {
                    logical_len.unwrap_or_else(|| self.bind(&format!("{xs}.length")))
                };
                if method == "scan" {
                    let acc = self.fresh();
                    self.line(format!("let {acc}={};", zero(&inner)));
                    let i = self.fresh();
                    self.line(format!("for(let {i}=0;{i}<{len};{i}++){{"));
                    let element = self.bind(&format!("{xs}[{i}]"));
                    self.line(format!(
                        "{acc}={};",
                        self.arithmetic("+", &acc, &element, &inner)
                    ));
                    self.destination_store(destination, &i, &acc, conversion);
                    self.line("}");
                    return Ok(len);
                }
                if !["map", "filter", "map_indexed", "zip"].contains(&method.as_str()) {
                    return Err(format!("unsupported destination method {method}"));
                }
                let count = self.fresh();
                if method == "filter" {
                    self.line(format!("let {count}=0;"));
                }
                let i = self.fresh();
                self.line(format!("for(let {i}=0;{i}<{len};{i}++){{"));
                let element = self.bind(&format!("{xs}[{i}]"));
                let (callback, params, result) = if let Some((ys, other)) = second {
                    let right = self.bind(&format!("{ys}[{i}]"));
                    (
                        &args[1],
                        vec![(element.clone(), *inner), (right, other)],
                        output.as_ref(),
                    )
                } else if method == "map_indexed" {
                    let idx = self.bind(&format!("({i}>>>0)"));
                    (
                        &args[0],
                        vec![(idx, Type::U32), (element.clone(), *inner)],
                        output.as_ref(),
                    )
                } else {
                    (
                        &args[0],
                        vec![(element.clone(), *inner)],
                        if method == "filter" {
                            &Type::Bool
                        } else {
                            output.as_ref()
                        },
                    )
                };
                let (body, local) = Self::callback(callback, env, &params)?;
                let value = self.expr(body, &local, Some(result))?;
                if method == "filter" {
                    self.line(format!("if({value}){{"));
                    self.destination_store(
                        destination,
                        &format!("{count}++"),
                        &element,
                        conversion,
                    );
                    self.line("}");
                } else {
                    self.destination_store(destination, &i, &value, conversion);
                }
                self.line("}");
                Ok(if method == "filter" { count } else { len })
            }
            _ => {
                // Ordinary result fallback (including sort): evaluate once,
                // then copy/convert once. It never aliases caller inputs.
                let result = self.expr(e, env, Some(ty))?;
                let result = self.bind(&result);
                let count = self.bind(&format!("{result}.length"));
                let i = self.fresh();
                self.line(format!("for(let {i}=0;{i}<{count};{i}++){{"));
                self.destination_store(destination, &i, &format!("{result}[{i}]"), conversion);
                self.line("}");
                Ok(count)
            }
        }
    }
    // Keep collection emission off the recursive scalar emitter's stack frame.
    fn collection_expr(
        &mut self,
        _e: &Expr,
        xs: &Expr,
        method: &String,
        args: &[Expr],
        env: &Env,
        t: &Type,
    ) -> LangResult<String> {
        let context = if method == "filter" || method == "concat" {
            Some(t)
        } else {
            None
        };
        let Type::List(inner) = self.infer(xs, env, context)? else {
            unreachable!()
        };
        // The receiver's storage is unique and dead after this use.
        let in_place = method == "concat" && self.in_place.contains(xs);
        let xs = self.expr(xs, env, context)?;
        let xs = self.bind(&xs);
        Ok(match method.as_str() {
            "concat" if in_place => {
                let ys = self.expr(&args[0], env, Some(t))?;
                let ys = self.bind(&ys);
                let right = self.bind(&format!("{ys}.length"));
                let j = self.fresh();
                self.line(format!("for(let {j}=0;{j}<{right};{j}++){{{xs}.push({ys}[{j}]);}}"));
                xs
            }
            "at_or" => {
                let idx = self.expr(&args[0], env, Some(&Type::U32))?;
                let idx = self.bind(&idx);
                let out = self.fresh();
                self.line(format!(
                    "let {out};if({idx}<{xs}.length){{{out}={xs}[{idx}];}}else{{"
                ));
                let fallback = self.expr(&args[1], env, Some(t))?;
                self.line(format!("{out}={fallback};}}"));
                out
            }
            "drop" | "take" => {
                let count = self.expr(&args[0], env, Some(&Type::U32))?;
                if method == "drop" {
                    format!("{xs}.slice({count})")
                } else {
                    format!("{xs}.slice(0,{count})")
                }
            }
            "sort" => format!("__sort({xs})"),
            "concat" => {
                let ys = self.expr(&args[0], env, Some(t))?;
                let ys = self.bind(&ys);
                let left = self.bind(&format!("{xs}.length"));
                let right = self.bind(&format!("{ys}.length"));
                let out = self.bind(&format!("new Array({left}+{right})"));
                let i = self.fresh();
                self.line(format!(
                    "for(let {i}=0;{i}<{left};{i}++){{{out}[{i}]={xs}[{i}];}}"
                ));
                let j = self.fresh();
                self.line(format!(
                    "for(let {j}=0;{j}<{right};{j}++){{{out}[{left}+{j}]={ys}[{j}];}}"
                ));
                out
            }
            "scan" => {
                let len = self.bind(&format!("{xs}.length"));
                let out = self.bind(&format!("new Array({len})"));
                let acc = self.fresh();
                self.line(format!("let {acc}={};", zero(&inner)));
                let i = self.fresh();
                self.line(format!("for(let {i}=0;{i}<{len};{i}++){{"));
                let element = self.bind(&format!("{xs}[{i}]"));
                self.line(format!(
                    "{acc}={};{out}[{i}]={acc};}}",
                    self.arithmetic("+", &acc, &element, &inner)
                ));
                out
            }
            "map" | "filter" | "map_indexed" | "zip" => {
                let Type::List(output) = t else {
                    unreachable!()
                };
                let mut second = None;
                let len = if method == "zip" {
                    let Type::List(other) = self.infer(&args[0], env, None)? else {
                        unreachable!()
                    };
                    let ys = self.expr(&args[0], env, None)?;
                    let ys = self.bind(&ys);
                    let len = self.bind(&format!("Math.min({xs}.length,{ys}.length)"));
                    second = Some((ys, *other));
                    len
                } else {
                    self.bind(&format!("{xs}.length"))
                };
                let out = self.bind(&if method == "filter" {
                    "[]".into()
                } else {
                    format!("new Array({len})")
                });
                let i = self.fresh();
                self.line(format!("for(let {i}=0;{i}<{len};{i}++){{"));
                let element = self.bind(&format!("{xs}[{i}]"));
                let (callback, params, result) = if let Some((ys, other)) = second {
                    let right = self.bind(&format!("{ys}[{i}]"));
                    (
                        &args[1],
                        vec![(element.clone(), *inner), (right, other)],
                        output.as_ref(),
                    )
                } else if method == "map_indexed" {
                    let idx = self.bind(&format!("({i}>>>0)"));
                    (
                        &args[0],
                        vec![(idx, Type::U32), (element.clone(), *inner)],
                        output.as_ref(),
                    )
                } else {
                    (
                        &args[0],
                        vec![(element.clone(), *inner)],
                        if method == "filter" {
                            &Type::Bool
                        } else {
                            output.as_ref()
                        },
                    )
                };
                let (body, local) = Self::callback(callback, env, &params)?;
                let value = self.expr(body, &local, Some(result))?;
                if method == "filter" {
                    self.line(format!("if({value}){{{out}.push({element});}}"));
                } else {
                    self.line(format!("{out}[{i}]={value};"));
                }
                self.line("}");
                out
            }
            _ => return Err(format!("unsupported JavaScript method {method}")),
        })
    }
    // Emit prerequisite statements and return the final value expression. Each
    // caller materializes a value before emitting later operands or mutating an
    // accumulator. Lazy subexpressions are emitted inside their actual branch.
    fn tail(&mut self, e: &Expr, env: &Env, f: &Function, targets: &Env) -> LangResult<()> {
        match e {
            Expr::Let(n, annotation, a, b) => {
                let t = self.infer(a, env, annotation.as_deref())?;
                let value = self.expr(a, env, Some(&t))?;
                let mut local = env.clone();
                local.insert(n.clone(), (value, t));
                self.tail(b, &local, f, targets)?;
            }
            Expr::Call(n, a) if n == "choose" => {
                let value = self.expr(&a[0], env, Some(&Type::Bool))?;
                self.line(format!("if({value}){{"));
                self.tail(&a[1], env, f, targets)?;
                self.line("}else{");
                self.tail(&a[2], env, f, targets)?;
                self.line("}");
            }
            Expr::Call(n, a) if n == &f.name => {
                let mut values = vec![];
                for (a, (_, t)) in a.iter().zip(&f.params) {
                    let v = self.expr(a, env, Some(t))?;
                    let v = self.bind(&v);
                    values.push(v);
                }
                for ((n, _), v) in f.params.iter().zip(values) {
                    let target = &targets[n].0;
                    self.line(format!("{target}={v};"));
                }
                self.line("continue;");
            }
            _ => {
                let v = self.expr(e, env, Some(&f.result))?;
                self.line(format!("return {v};"));
            }
        }
        Ok(())
    }
    fn expr(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<String> {
        // Target resource bound, matching C's scalar emission guard. A known
        // expression nesting cannot exceed the bounded emitter stack.
        if self.depth >= 48 {
            return Err("JavaScript expression emission depth budget exceeded".into());
        }
        self.depth += 1;
        let result = self.expr_inner(e, env, want).and_then(|value| {
            // Borrow trusted host containers. Normalize scalar reads at demand,
            // including callbacks and at_or, instead of copying their ancestors.
            // Every other F32 constructor/arithmetic/call already produces the
            // internal carrier. Re-rounding each computed subtree is redundant.
            if self.native_f32 && matches!(e,Expr::Var(_)|Expr::Field(..)|Expr::Method(..)) && self.infer(e,env,want)? == Type::F32 {
                Ok(format!("__nfValue({value})"))
            } else { Ok(value) }
        });
        self.depth -= 1;
        result
    }
    fn expr_inner(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<String> {
        if self.budget == 0 {
            return Err("JavaScript emission budget exceeded".into());
        }
        self.budget -= 1;
        let t = self.infer(e, env, want)?;
        Ok(match e {
            Expr::Num(n) => match t {
                Type::U64 | Type::Int => format!("{n}n"),
                Type::F32 if self.native_f32 => format!("__nfFromBits({})", (*n as f32).to_bits()),
                Type::F32 => format!("{}", (*n as f32).to_bits()),
                _ => n.to_string(),
            },
            Expr::Float(b) if self.native_f32 => format!("__nfFromBits({b})"),
            Expr::Float(b) => b.to_string(),
            Expr::Bool(b) => b.to_string(),
            Expr::String(s) => quote(s),
            Expr::Unit => "null".into(),
            Expr::Try(a) => {
                let value = self.expr(a, env, None)?;
                format!("__try({value})")
            }
            Expr::Var(n) if n == "None" => "({None:null})".into(),
            Expr::Var(n) => env.get(n).ok_or("unbound JavaScript variable")?.0.clone(),
            Expr::Neg(a) => {
                if t == Type::I32 {
                    if let Expr::Num(n) = a.as_ref() {
                        return Ok(format!("{}", (*n as i32).wrapping_neg()));
                    }
                }
                let value = self.expr(a, env, Some(&t))?;
                let value = self.bind(&value);
                if t == Type::F32 && self.native_f32 {
                    format!("__nfNeg({value})")
                } else if t == Type::F32 {
                    format!("(({value} ^ 2147483648) >>> 0)")
                } else {
                    self.arithmetic("-", zero(&t), &value, &t)
                }
            }
            Expr::Let(n, annotation, a, b) => {
                let at = self.infer(a, env, annotation.as_deref())?;
                let value = self.expr(a, env, Some(&at))?;
                let value = self.bind(&value);
                let mut local = env.clone();
                local.insert(n.clone(), (value, at));
                self.expr(b, &local, Some(&t))?
            }
            Expr::Record(n, fields) if self.equality.elisions.contains(n) => {
                self.expr(&fields[0].1,env,Some(&self.p.records[n][0].1))?
            }
            Expr::Record(n, fields) => {
                let mut values = Vec::new();
                for (field, expr) in fields {
                    let ft = &self.p.records[n]
                        .iter()
                        .find(|(f, _)| f == field)
                        .unwrap()
                        .1;
                    let value = self.expr(expr, env, Some(ft))?;
                    let value = self.bind(&value);
                    values.push(format!("[{}]:{value}", quote(field)));
                }
                format!("({{{}}})", values.join(","))
            }
            Expr::Field(a, n) if matches!(a.as_ref(),Expr::Var(root) if !env.contains_key(root) && (self.p.enums.contains_key(root)||root=="ArithmeticError")) =>
            {
                let Expr::Var(root) = a.as_ref() else {
                    unreachable!()
                };
                quote(&format!("{root}.{n}"))
            }
            Expr::Field(a, n) => {
                let at = self.infer(a, env, None)?;
                let av = self.expr(a, env, None)?;
                let av = self.bind(&av);
                if matches!(&at,Type::Named(n) if self.equality.elisions.contains(n)) {return Ok(av);}
                let field = if matches!(at, Type::Vector(..)) {
                    ["x", "y", "z", "w"]
                        .iter()
                        .position(|f| f == n)
                        .unwrap()
                        .to_string()
                } else {
                    quote(n)
                };
                format!("{av}[{field}]")
            }
            Expr::Binary(op, a, b) => {
                let ts = Self::types(env);
                let context = if check::is_numeric_value(&t) {
                    Some(t.clone())
                } else {
                    check::hint(a, &ts, self.p).or_else(|| check::hint(b, &ts, self.p))
                };
                let at = self.infer(a, env, context.as_ref())?;
                // Literal record equality evaluates every field in source order,
                // then compares stored values without allocating either wrapper.
                if op == "==" || op == "!=" {
                    if let (Expr::Record(an, aa), Expr::Record(bn, ba)) = (a.as_ref(), b.as_ref()) {
                        if an == bn {
                            let fields = self.p.records[an].clone();
                            let mut values = Vec::new();
                            for args in [aa, ba] {
                                let mut row = BTreeMap::new();
                                for (field, expr) in args {
                                    let ft = &fields.iter().find(|(n, _)| n == field).unwrap().1;
                                    let v = self.expr(expr, env, Some(ft))?;
                                    row.insert(field.clone(), self.bind(&v));
                                }
                                values.push(row);
                            }
                            let checks = fields
                                .iter()
                                .map(|(n, ft)| self.value_equal(ft, &values[0][n], &values[1][n]))
                                .collect::<LangResult<Vec<_>>>()?;
                            let eq = if checks.is_empty() {
                                "true".into()
                            } else {
                                checks.join("&&")
                            };
                            return Ok(format!("{}({eq})", if op == "!=" { "!" } else { "" }));
                        }
                    }
                }
                let av = self.expr(a, env, Some(&at))?;
                let av = self.bind(&av);
                if op == "&&" || op == "||" {
                    let out = self.fresh();
                    self.line(format!(
                        "let {out}={av};if({}{out}){{",
                        if op == "||" { "!" } else { "" }
                    ));
                    let bv = self.expr(b, env, Some(&at))?;
                    self.line(format!("{out}={bv};}}"));
                    return Ok(out);
                }
                let bv = self.expr(b, env, Some(&at))?;
                let bv = self.bind(&bv);
                if ["+", "-", "*"].contains(&op.as_str()) {
                    self.arithmetic(op, &av, &bv, &at)
                } else if (op == "==" || op == "!=") && at != Type::F32 {
                    format!(
                        "{}{}",
                        if op == "!=" { "!" } else { "" },
                        self.value_equal(&at, &av, &bv)?
                    )
                } else {
                    let (av, bv) = if at == Type::F32 {
                        (format!("{}({av})",if self.native_f32 {"__nfNumber"}else{"__float"}), format!("{}({bv})",if self.native_f32 {"__nfNumber"}else{"__float"}))
                    } else {
                        (av, bv)
                    };
                    let op = match op.as_str() {
                        "==" => "===",
                        "!=" => "!==",
                        _ => op,
                    };
                    format!("(({av}) {op} ({bv}))")
                }
            }
            Expr::Call(n,args) if ink_core::primitives::primitive(n) => {
                let first=if ink_core::primitives::bit_count(n){args.first().map(|a|self.infer(a,env,None)).transpose()?}else{None};
                let (params,_)=ink_core::primitives::signature(n,first.as_ref())?;
                let values=args.iter().zip(params).map(|(a,t)|self.expr(a,env,Some(&t))).collect::<LangResult<Vec<_>>>()?;
                crate::primitives::expression(n,&values,first.as_ref(),self.native_f32)?
            }
            Expr::Call(n, args) if ["vec2", "vec3", "vec4"].contains(&n.as_str()) => {
                let Type::Vector(inner, _) = &t else {
                    unreachable!()
                };
                let mut values = Vec::new();
                for expr in args {
                    let value = self.expr(expr, env, Some(inner))?;
                    values.push(self.bind(&value));
                }
                format!("[{}]", values.join(","))
            }
            Expr::Call(n, args) if n == "choose" => {
                let c = self.expr(&args[0], env, Some(&Type::Bool))?;
                let out = self.fresh();
                self.line(format!("let {out};if({c}){{"));
                let a = self.expr(&args[1], env, Some(&t))?;
                self.line(format!("{out}={a};}}else{{"));
                let b = self.expr(&args[2], env, Some(&t))?;
                self.line(format!("{out}={b};}}"));
                out
            }
            Expr::Call(n, args) if n == "quot_or" || n == "rem_or" => {
                let a = self.expr(&args[0], env, Some(&t))?;
                let a = self.bind(&a);
                let b = self.expr(&args[1], env, Some(&t))?;
                let b = self.bind(&b);
                let out = self.fresh();
                let overflow = if t == Type::I32 {
                    format!("||({a}===-2147483648&&{b}===-1)")
                } else {
                    String::new()
                };
                self.line(format!("let {out};if({b}==={} {overflow}){{", zero(&t)));
                let fallback = self.expr(&args[2], env, Some(&t))?;
                self.line(format!("{out}={fallback};}}else{{"));
                let op = if n == "rem_or" { "%" } else { "/" };
                let value = if t == Type::U64 {
                    format!("({a}{op}{b})")
                } else if n == "rem_or" {
                    format!("(({a}%{b})+0)")
                } else {
                    format!("(Math.trunc({a}/{b})+0)")
                };
                self.line(format!("{out}={value};}}"));
                out
            }
            Expr::Call(n, args) if n == "length" => {
                format!("({}).length", self.expr(&args[0], env, None)?)
            }
            Expr::Call(n, args) if n == "parallel_map" => {
                let input = self.expr(&args[0], env, None)?;
                let input = self.bind(&input);
                let grain = self.expr(&args[1], env, Some(&Type::U32))?;
                let grain = self.bind(&grain);
                let Type::List(inner) = self.infer(&args[0], env, None)? else {
                    unreachable!()
                };
                let Type::List(result) = &t else {
                    unreachable!()
                };
                self.parallel(input, grain, &args[2], env, &inner, result)?
            }
            Expr::Call(n, args) if n == "repeat_until" => {
                let limit = self.expr(&args[0], env, Some(&Type::U32))?;
                let limit = self.bind(&limit);
                let initial = self.expr(&args[1], env, Some(&t))?;
                let out = self.fresh();
                self.line(format!("let {out}={initial};"));
                let index = self.fresh();
                self.line(format!("for(let {index}=0;{index}<{limit};{index}++){{"));
                let (stop, local) = Self::callback(&args[2], env, &[(out.clone(), t.clone())])?;
                let stop = self.expr(stop, &local, Some(&Type::Bool))?;
                self.line(format!("if({stop}){{break;}}"));
                let idx = self.bind(&format!("({index}>>>0)"));
                let (body, local) =
                    Self::callback(&args[3], env, &[(idx, Type::U32), (out.clone(), t.clone())])?;
                let value = self.expr(body, &local, Some(&t))?;
                self.line(format!("{out}={value};}}"));
                out
            }
            Expr::Call(n, args) if n == "buffer" || n == "buffer_fill" => {
                let Type::Buffer(inner) = &t else {
                    unreachable!()
                };
                if n == "buffer" {
                    format!(
                        "new __InkBuffer(Array.from({}))",
                        self.expr(&args[0], env, Some(&Type::List(inner.clone())))?
                    )
                } else {
                    format!(
                        "__bufferFill({},{})",
                        self.expr(&args[0], env, Some(&Type::U32))?,
                        self.expr(&args[1], env, Some(inner))?
                    )
                }
            }
            Expr::Method(x, _, _) if matches!(x.as_ref(),Expr::Var(v) if v=="Buffer" || v=="Map") => {
                if matches!(t, Type::Buffer(_)) {
                    "new __InkBuffer([])".into()
                } else {
                    "new Map()".into()
                }
            }
            Expr::Method(x, n, args)
                if matches!(self.infer(x, env, None)?, Type::Buffer(_) | Type::Map(..)) =>
            {
                let xt = self.infer(x, env, None)?;
                let xv = self.expr(x, env, None)?;
                let xv = self.bind(&xv);
                if n == "filter" {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    let i = self.fresh();
                    let kept = self.fresh();
                    self.line(format!(
                        "let {kept}=0;for(let {i}=0;{i}<{xv}.length;{i}++){{"
                    ));
                    let element = self.bind(&format!("{xv}.item({i})"));
                    let (body, local) =
                        Self::callback(&args[0], env, &[(element.clone(), *inner.clone())])?;
                    let pred = self.expr(body, &local, Some(&Type::Bool))?;
                    self.line(format!(
                        "if({pred}){{{xv}.set({kept}++,{element});}}}}{xv}.length={kept};"
                    ));
                    return Ok(xv);
                }
                if ["map", "map_indexed", "scan"].contains(&n.as_str()) {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    let i = self.fresh();
                    let acc = self.fresh();
                    if n == "scan" {
                        self.line(format!("let {acc}={};", zero(inner)));
                    }
                    self.line(format!("for(let {i}=0;{i}<{xv}.length;{i}++){{"));
                    let element = self.bind(&format!("{xv}.item({i})"));
                    let value = if n == "scan" {
                        let add = self.arithmetic("+", &acc, &element, inner);
                        self.line(format!("{acc}={add};"));
                        acc
                    } else {
                        let params = if n == "map" {
                            vec![(element, *inner.clone())]
                        } else {
                            vec![(format!("({i}>>>0)"), Type::U32), (element, *inner.clone())]
                        };
                        let (body, local) = Self::callback(&args[0], env, &params)?;
                        self.expr(body, &local, Some(inner))?
                    };
                    self.line(format!("{xv}.set({i},{value});}}"));
                    return Ok(xv);
                }
                if n == "map_parallel" {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    let grain = self.expr(&args[0], env, Some(&Type::U32))?;
                    let grain = self.bind(&grain);
                    return Ok(format!(
                        "new __InkBuffer({})",
                        self.parallel(xv, grain, &args[1], env, inner, inner)?
                    ));
                }
                if n == "split_at" {
                    let at = self.expr(&args[0], env, Some(&Type::U32))?;
                    let at = self.bind(&at);
                    let parts = self.bind(&format!("__bufferSplit({xv},{at})"));
                    let (body, local) = Self::callback(
                        &args[1],
                        env,
                        &[
                            (format!("{parts}[0]"), xt.clone()),
                            (format!("{parts}[1]"), xt.clone()),
                        ],
                    )?;
                    return self.expr(body, &local, Some(&xt));
                }
                if n == "append" {
                    let other = self.expr(&args[0], env, Some(&xt))?;
                    let other = self.bind(&other);
                    return Ok(format!("__bufferAppend({xv},{other})"));
                }
                if n == "fill_range" || n == "copy_within" {
                    let Type::Buffer(inner) = &xt else {
                        unreachable!()
                    };
                    let a = self.expr(&args[0], env, Some(&Type::U32))?;
                    let a = self.bind(&a);
                    let b = self.expr(&args[1], env, Some(&Type::U32))?;
                    let b = self.bind(&b);
                    let c = self.expr(
                        &args[2],
                        env,
                        Some(if n == "fill_range" { inner } else { &Type::U32 }),
                    )?;
                    let c = self.bind(&c);
                    return Ok(format!("{xv}.{n}({a},{b},{c})"));
                }
                let (key, value) = match &xt {
                    Type::Buffer(inner) => (Type::U32, inner.as_ref()),
                    Type::Map(k, v) => (*k.clone(), v.as_ref()),
                    _ => unreachable!(),
                };
                let kv = if args.is_empty() {
                    String::new()
                } else {
                    let v =
                        self.expr(&args[0], env, Some(if n == "push" { value } else { &key }))?;
                    self.bind(&v)
                };
                match n.as_str() {
                    "len" => format!(
                        "({xv}).{}",
                        if matches!(xt, Type::Buffer(_)) {
                            "length"
                        } else {
                            "size"
                        }
                    ),
                    "at_or" | "get_or" => {
                        let out = self.fresh();
                        let condition = if n == "at_or" {
                            format!("{kv}<{xv}.length")
                        } else {
                            format!("{xv}.has({kv})")
                        };
                        let access = if n == "at_or" {
                            format!("{xv}.item({kv})")
                        } else {
                            format!("{xv}.get({kv})")
                        };
                        self.line(format!(
                            "let {out};if({condition}){{{out}={access};}}else{{"
                        ));
                        let fallback = self.expr(&args[1], env, Some(value))?;
                        self.line(format!("{out}={fallback};}}"));
                        out
                    }
                    "contains" => format!("({xv}).has({kv})"),
                    "keys" | "values" => format!("__mapEntries({xv}, {})", n == "keys"),
                    "freeze" => format!("{xv}.freeze()"),
                    "set" => format!(
                        "__tempSet({xv},{kv},{},{})",
                        self.expr(&args[1], env, Some(value))?,
                        matches!(xt, Type::Map(..))
                    ),
                    "swap" => format!(
                        "__bufferSwap({xv},{kv},{})",
                        self.expr(&args[1], env, Some(&Type::U32))?
                    ),
                    "push" | "pop" | "truncate" | "remove" => {
                        format!("__tempEdit({xv},{},{kv})", quote(n))
                    }
                    _ => return Err("temporary method".into()),
                }
            }
            Expr::Call(n, args) if n == "repeat" => {
                let Expr::Num(bound) = args[0] else {
                    unreachable!()
                };
                let initial = self.expr(&args[1], env, Some(&t))?;
                let out = self.fresh();
                self.line(format!("let {out}={initial};"));
                let index = self.fresh();
                self.line(format!("for(let {index}=0;{index}<{bound};{index}++){{"));
                let idx = self.bind(&format!("({index}>>>0)"));
                let (body, local) =
                    Self::callback(&args[2], env, &[(idx, Type::U32), (out.clone(), t.clone())])?;
                let value = self.expr(body, &local, Some(&t))?;
                self.line(format!("{out}={value};}}"));
                out
            }
            Expr::Call(n, args) if n == "foldr" || n == "foldl" || n == "fold_until" => {
                let Type::List(inner) = self.infer(&args[0], env, None)? else {
                    unreachable!()
                };
                let xs = self.expr(&args[0], env, None)?;
                let xs = self.bind(&xs);
                let initial = self.expr(&args[1], env, Some(&t))?;
                let out = self.fresh();
                let index = self.fresh();
                self.line(format!("let {out}={initial};"));
                self.line(if n == "foldr" {
                    format!("for(let {index}={xs}.length-1;{index}>=0;{index}--){{")
                } else {
                    format!("for(let {index}=0;{index}<{xs}.length;{index}++){{")
                });
                let element = self.bind(&format!("{xs}[{index}]"));
                let values = [(element, *inner), (out.clone(), t.clone())];
                let stop = if n == "fold_until" {
                    let (body, local) = Self::callback(&args[2], env, &values)?;
                    let condition = self.expr(body, &local, Some(&Type::Bool))?;
                    Some(self.bind(&condition))
                } else {
                    None
                };
                let (body, local) =
                    Self::callback(&args[if n == "fold_until" { 3 } else { 2 }], env, &values)?;
                let value = self.expr(body, &local, Some(&t))?;
                self.line(format!("{out}={value};"));
                if let Some(flag) = stop {
                    self.line(format!("if({flag})break;"));
                }
                self.line("}");
                out
            }
            Expr::Call(n, args) if n == "sum" || n == "count" => {
                let context = if n == "sum" {
                    Some(Type::List(Box::new(t.clone())))
                } else {
                    None
                };
                let xs = self.expr(&args[0], env, context.as_ref())?;
                let xs = self.bind(&xs);
                if n == "count" {
                    format!("BigInt({xs}.length)")
                } else {
                    let out = self.fresh();
                    let index = self.fresh();
                    self.line(format!(
                        "let {out}={};for(let {index}=0;{index}<{xs}.length;{index}++){{",
                        zero(&t)
                    ));
                    let value = self.bind(&format!("{xs}[{index}]"));
                    self.line(format!("{out}={};}}", self.arithmetic("+", &out, &value, &t)));
                    out
                }
            }
            Expr::Call(n, args) if n == "list" => {
                let Type::List(inner) = &t else {
                    return Err("list type".into());
                };
                let mut values = Vec::new();
                for e in args {
                    let value = self.expr(e, env, Some(inner))?;
                    values.push(self.bind(&value));
                }
                format!("[{}]", values.join(","))
            }
            Expr::Call(n, args) if ink_core::word::primitive(n) => {
                let ts = ink_core::word::arguments(n, &t);
                let mut vals = vec![];
                for (a, t) in args.iter().zip(ts) {
                    let v = self.expr(a, env, Some(&t))?;
                    vals.push(self.bind(&v));
                }
                format!(
                    "__word({},{},{},{})",
                    quote(n),
                    vals[0],
                    vals.get(1).map(String::as_str).unwrap_or("0"),
                    match t {
                        Type::I32 => -32,
                        Type::U32 => 32,
                        _ => 64,
                    }
                )
            }
            Expr::Call(n, args) if ["Some", "Ok", "Err"].contains(&n.as_str()) => {
                let inner = match (&t, n.as_str()) {
                    (Type::Option(a), "Some") | (Type::Result(a, _), "Ok") => a.as_ref(),
                    (Type::Result(_, b), "Err") => b.as_ref(),
                    _ => return Err("variant type".into()),
                };
                let value = self.expr(&args[0], env, Some(inner))?;
                format!("({{{n}:{value}}})")
            }
            Expr::Call(n, args) if n == "Int" => {
                let value = self.expr(&args[0], env, None)?;
                format!("BigInt({value})")
            }
            Expr::Call(n, args)
                if ["checked_add", "checked_sub", "checked_mul"].contains(&n.as_str()) =>
            {
                let Type::Result(at, _) = &t else {
                    return Err("checked arithmetic type".into());
                };
                let at = *at.clone();
                let a = self.expr(&args[0], env, Some(&at))?;
                let a = self.bind(&a);
                let b = self.expr(&args[1], env, Some(&at))?;
                let b = self.bind(&b);
                format!(
                    "__checked({},{a},{b},{})",
                    quote(n),
                    if at == Type::I32 {
                        -32
                    } else if at == Type::U32 {
                        32
                    } else {
                        64
                    }
                )
            }
            Expr::Call(n, args) => {
                let (index, f) = self
                    .p
                    .functions
                    .iter()
                    .enumerate()
                    .find(|(_, f)| &f.name == n)
                    .ok_or("unknown JavaScript function")?;
                let f = f.clone();
                let mut values = Vec::new();
                for (expr, (_, ty)) in args.iter().zip(&f.params) {
                    let value = self.expr(expr, env, Some(ty))?;
                    values.push(self.bind(&value));
                }
                Ok::<_, String>(format!("__fn{index}({})", values.join(",")))?
            }
            Expr::Method(xs, method, args)
                if matches!(
                    self.infer(xs, env, None)?,
                    Type::Option(_) | Type::Result(..)
                ) =>
            {
                let xt = self.infer(xs, env, None)?;
                let value = self.expr(xs, env, None)?;
                let value = self.bind(&value);
                if method == "fold" {
                    let (a, b, tag_a, tag_b) = match &xt {
                        Type::Option(a) => (a.as_ref().clone(), Type::Unit, "Some", "None"),
                        Type::Result(a, b) => (a.as_ref().clone(), b.as_ref().clone(), "Ok", "Err"),
                        _ => unreachable!(),
                    };
                    let out = self.fresh();
                    self.line(format!(
                        "let {out};if(Object.hasOwn({value},{})){{",
                        quote(tag_a)
                    ));
                    let item = self.bind(&format!("{value}[{}]", quote(tag_a)));
                    let (body, local) = Self::callback(&args[0], env, &[(item, a)])?;
                    let body = self.expr(body, &local, Some(&t))?;
                    self.line(format!("{out}={body};}}else{{"));
                    let item = self.bind(&if tag_b == "None" {
                        "null".into()
                    } else {
                        format!("{value}[{}]", quote(tag_b))
                    });
                    let (body, local) = Self::callback(&args[1], env, &[(item, b)])?;
                    let body = self.expr(body, &local, Some(&t))?;
                    self.line(format!("{out}={body};}}"));
                    return Ok(out);
                }
                let (tag, inner) = match (&xt, method.as_str()) {
                    (Type::Option(a), _) => ("Some", a.as_ref()),
                    (Type::Result(a, _), "map") => ("Ok", a.as_ref()),
                    (Type::Result(_, b), "map_err") => ("Err", b.as_ref()),
                    _ => return Err("unsupported variant method".into()),
                };
                if method == "ok_or" {
                    let error = self.expr(&args[0], env, None)?;
                    format!("__okOr({value},{error})")
                } else {
                    let out = self.fresh();
                    self.line(format!(
                        "let {out};if(Object.hasOwn({value},{})){{",
                        quote(tag)
                    ));
                    let item = self.bind(&format!("{value}[{}]", quote(tag)));
                    let result = match (&t, method.as_str()) {
                        (Type::Option(a), _) | (Type::Result(a, _), "map") => a.as_ref(),
                        (Type::Result(_, b), "map_err") => b.as_ref(),
                        _ => return Err("variant map result".into()),
                    };
                    let (body, local) = Self::callback(&args[0], env, &[(item, inner.clone())])?;
                    let mapped = self.expr(body, &local, Some(result))?;
                    self.line(format!(
                        "{out}=({{{tag}:{mapped}}});}}else{{{out}={value};}}"
                    ));
                    out
                }
            }
            Expr::Method(xs, method, args) => self.collection_expr(e, xs, method, args, env, &t)?,
            _ => return Err(
                "JavaScript lowering supports pure function expressions, not stateful operations"
                    .into(),
            ),
        })
    }
}
/// Emit an ES module. Backend implementation and the JavaScript engine are
/// trusted; checked source/rewrite evidence does not certify emitted machine code.
pub fn lower(module: &CheckedModule) -> LangResult<Emission> {
    lower_with_layout(module, None, &BTreeSet::new())
}
pub fn lower_planned(plan: &ink_core::planning::CheckedPlan) -> LangResult<Emission> {
    plan.require_source_storage_capability(true,true)?;
    let layout=ink_core::snapshot::layout(plan.original().program())?;
    let elisions=plan.physical().map(|p|p.plan().record_elisions.iter().map(|l|l.record.clone()).collect()).unwrap_or_default();
    let mut emission=lower_with_layout(plan.module(),Some(&layout),&elisions)?;
    if let Some(physical)=plan.physical(){
        if !physical.plan().dense_prefixes.is_empty(){
            let prefixes=plan.module().program().states.iter().map(|s|physical.plan().dense_prefixes.iter().find(|p|p.table==s.name).map(|p|p.capacity).unwrap_or(0)).collect::<Vec<_>>();
            emission.javascript=emission.javascript.replace("const __stateMetadata=",&format!("const __densePrefixes={};\nconst __stateMetadata=",serde_json::to_string(&prefixes).map_err(|e|e.to_string())?));
            emission.javascript=emission.javascript.replace("__createState(__stateMetadata,__actions,__stateInputCaptures)","__createState(__stateMetadata,__actions,__stateInputCaptures,[],__densePrefixes)");
        }
    }
    if let Some(views)=plan.maintained(){
        let support=representation_program::maintained_support(plan.module(),views,&elisions)?;
        emission.javascript=format!("{support}{}",emission.javascript);
        emission.javascript=emission.javascript.replace("__createState(__stateMetadata,__actions,__stateInputCaptures)","__createState(__stateMetadata,__actions,__stateInputCaptures,__compiledMaintained)");
        emission.javascript=emission.javascript.replace("__createState(__stateMetadata,__actions,__stateInputCaptures,[],__densePrefixes)","__createState(__stateMetadata,__actions,__stateInputCaptures,__compiledMaintained,__densePrefixes)");
        emission.manifest["maintained"]=json!({"source":views.package().input_core_sha256,"keeps":views.package().views.iter().map(|v|&v.keep).collect::<Vec<_>>(),"knowledge_snapshot":views.package().knowledge.snapshot.root});
    }
    emission.manifest["compiled_plan"]=json!({"source":plan.original().identity()?,"plan":ink_core::registry::identity(plan.package())?});
    Ok(emission)
}
/// Emit selected code with the snapshot origin authenticated by the core.
pub fn lower_selected(selected: &ink_core::optimisation::CheckedSelection) -> LangResult<Emission> {
    let layout = ink_core::snapshot::selected_layout(selected)?;
    let mut emission = lower_with_layout(selected.module(), Some(&layout), &BTreeSet::new())?;
    emission.manifest["selection"] =
        serde_json::to_value(selected.evidence()).map_err(|e| e.to_string())?;
    Ok(emission)
}
fn lower_with_layout(
    module: &CheckedModule,
    layout: Option<&ink_core::snapshot_wire::Layout>,
    elisions: &BTreeSet<String>,
) -> LangResult<Emission> {
    let p = module.program();
    // Stateful functions share the exact-bit carrier with actions/snapshots.
    // Pure modules can borrow native float inputs without a state bridge.
    let native_f32 = p.actions.is_empty() && p.states.is_empty() && p.keeps.is_empty();
    let mut equality=TypedEquality::new(p,"__valueEqual");
    equality.native_f32=native_f32;
    equality.elisions=elisions.clone();
    let mut emitter = Emitter {
        p,
        next: 0,
        budget: 200_000,
        depth: 0,
        lines: String::new(),
        callbacks: Vec::new(),
        equality,
        native_f32,
        in_place: Default::default(),
    };
    let mut javascript = String::new();
    let mut functions = vec![];
    let mut input_types = vec![];
    for (i, f) in p.functions.iter().enumerate() {
        let params = f
            .params
            .iter()
            .map(|(n, t)| Ok(json!({"name":n,"type":descriptor(t,p,&mut BTreeSet::new())?})))
            .collect::<LangResult<Vec<_>>>()?;
        let result = descriptor(&f.result, p, &mut BTreeSet::new())?;
        // Conversion follows actual lexical field demand in the checked body.
        // Unknown calls/whole values retain the complete declared representation.
        // Contract predicates execute at the public boundary and therefore keep
        // full inputs as well. Exported logical type metadata never narrows.
        let demand = ink_core::input_demand::fields(f,p);
        let projected = params.iter().zip(demand).map(|(param,fields)| {
            let mut ty=param["type"].clone();
            if !p.contracts.precondition_checks.contains_key(&f.name) {
                if let Some(fields)=fields {
                    let carrier=if ty["kind"]=="list" { &mut ty["element"] } else { &mut ty };
                    if carrier["kind"]=="record" {
                        if let Some(values)=carrier["fields"].as_array_mut() {
                            values.retain(|field|field["name"].as_str().is_some_and(|name|fields.contains(name)));
                        }
                    }
                }
            }
            ty
        }).collect::<Vec<_>>();
        // Whole-value escape/equality keeps eager capture semantics, including
        // single reads of accessor-backed fields. Field-only consumers borrow.
        let captures=ink_core::input_demand::fields(f,p).into_iter().map(|fields|fields.is_none()).collect::<Vec<_>>();
        input_types.push(json!({"types":projected,"capture":captures}));
        let mut env = Env::new();
        let mut vars = vec![];
        for (n, t) in &f.params {
            let v = emitter.fresh();
            env.insert(n.clone(), (v.clone(), t.clone()));
            vars.push(v);
        }
        emitter.lines.clear();
        emitter.in_place = if ink_core::recursion::recursive(f) {
            Default::default()
        } else {
            ink_core::in_place::analyse_with_result(&f.body, &f.params, Some(&f.result), p)
        };
        let body = if ink_core::recursion::recursive(f) {
            emitter.line("while(true){");
            emitter.tail(&f.body, &env, f, &env)?;
            emitter.line("}");
            "undefined".into()
        } else {
            emitter.expr(&f.body, &env, Some(&f.result))?
        };
        javascript.push_str(&format!(
            "function __fn{i}({}){{\n{}return {body};}}\n",
            if vars.is_empty() {
                String::new()
            } else {
                vars.join(",")
            },
            emitter.lines
        ));
        let destination = if matches!(f.result, Type::List(_)) {
            json!({"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"})
        } else {
            Value::Null
        };
        functions.push(json!({"index":i,"name":f.name,"precondition":p.contracts.precondition_checks.get(&f.name).and_then(|n|p.functions.iter().position(|f|&f.name==n)),"params":params,"result":result,"parallel":needs_parallel(&f.body,p,&mut std::collections::BTreeSet::new()),"destination":destination,"internal":ink_core::local_collections::owned(&f.result,p)||f.params.iter().any(|(_,t)|ink_core::local_collections::owned(t,p))}));
    }
    // A separate budget ensures adding the destination capability does not
    // change the ordinary entrypoints' emission resource limits.
    emitter.budget = 200_000;
    for (i, f) in p.functions.iter().enumerate() {
        if !matches!(f.result, Type::List(_)) {
            continue;
        }
        let mut env = Env::new();
        let mut vars = Vec::new();
        for (n, t) in &f.params {
            let v = emitter.fresh();
            env.insert(n.clone(), (v.clone(), t.clone()));
            vars.push(v);
        }
        let destination = emitter.fresh();
        vars.push(destination.clone());
        emitter.lines.clear();
        emitter.in_place = if ink_core::recursion::recursive(f) {
            Default::default()
        } else {
            ink_core::in_place::analyse_with_result(&f.body, &f.params, Some(&f.result), p)
        };
        let conversion = if !elisions.is_empty() || functions[i]["result"]["element"]
            .to_string()
            .contains("\"kind\":\"f32\"")
            || functions[i]["result"]["element"]
                .to_string()
                .contains("\"kind\":\"int\"")
        {
            format!("__intoOutput{i}")
        } else {
            String::new()
        };
        let count = emitter.list_into(&f.body, &env, &f.result, &destination, &conversion)?;
        javascript.push_str(&format!(
            "function __into{i}({}){{\n{}return {count};}}\n",
            vars.join(","),
            emitter.lines
        ));
    }
    javascript.push_str(&emitter.equality.source());
    let mut interface = json!({"schema":1,"backend":"javascript","abi":"ink-javascript-trusted-values-v2","destination_abi":{"name":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned","capacity":"trusted","aliasing":"destination-disjoint-from-all-reachable-inputs","tail":"unwritten"},"core_semantics":module.semantics(),"core_sha256":module.identity()?,"functions":functions});
    // Emit only helpers referenced by the compiled expressions. Descriptor
    // conversion is needed solely for signatures containing binary32 values.
    let needs_conversion = !elisions.is_empty() || interface.to_string().contains("\"kind\":\"f32\"")
        || interface.to_string().contains("\"kind\":\"int\"")
        || interface.to_string().contains("\"kind\":\"id\"");
    if !emitter.callbacks.is_empty() {
        javascript.push_str(&format!(
            "const __parallelCallbacks=Object.freeze({{{}}});\n",
            emitter
                .callbacks
                .iter()
                .map(|(n, b)| format!("{}:{b}", quote(n)))
                .collect::<Vec<_>>()
                .join(",")
        ));
    }
    let mut helpers = String::new();
    for section in include_str!("values.mjs").split("// @helper ").skip(1) {
        let (name, source) = section.split_once('\n').unwrap();
        let used = if name == "state-validation" {
            !p.actions.is_empty() || !p.states.is_empty() || !p.keeps.is_empty()
        } else if name == "representation" {
            needs_conversion
                || !p.actions.is_empty()
                || !p.states.is_empty()
                || !p.keeps.is_empty()
                || javascript.contains("__bits(")
                || javascript.contains("__float(")
                || javascript.contains("__nf") || javascript.contains("__ink_")
        } else {
            javascript.contains(name)
                || !p.actions.is_empty()
                || !p.states.is_empty()
                || !p.keeps.is_empty()
        };
        if used {
            helpers.push_str(source);
        }
    }
    if javascript.contains("__ink_") || module.semantics()==ink_core::core::PRIMITIVE_SEMANTICS {helpers.push_str(include_str!("primitives.mjs"));}
    let temporary = include_str!("temporary.mjs");
    if [
        "__InkBuffer",
        "__bufferSplit",
        "__bufferAppend",
        "__tempCopy",
        "__mapGet",
        "__mapEntries",
        "__tempSet",
        "__bufferSwap",
        "__tempEdit",
        "__bufferFill",
    ]
    .iter()
    .any(|name| javascript.contains(name))
    {
        helpers.push_str(temporary);
    }
    let has_state = !p.actions.is_empty() || !p.states.is_empty() || !p.keeps.is_empty();
    let support = include_str!("state.mjs");
    if !has_state
        && ["__try", "__checked", "__okOr", "__mapValue", "__equal"]
            .iter()
            .any(|name| javascript.contains(name))
    {
        let pure = support
            .split("const __encoder=")
            .next()
            .unwrap()
            .split_once('\n')
            .unwrap()
            .1;
        helpers.push_str(pure);
    }
    if has_state || javascript.contains("__word(") {
        helpers.push_str(include_str!("word.mjs"));
    }
    javascript = format!("const __recordElisions=new Set({});\nconst __nativeF32={native_f32};\n",serde_json::to_string(elisions).map_err(|e|e.to_string())?) + &helpers + &javascript;
    let named = p
        .records
        .keys()
        .map(|n| {
            Ok((
                n.clone(),
                descriptor(&Type::Named(n.clone()), p, &mut BTreeSet::new())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    javascript.push_str(&format!(
        "const __namedTypes={};\n",
        serde_json::to_string(&named).map_err(|e| e.to_string())?
    ));
    let state = if !p.actions.is_empty() || !p.states.is_empty() || !p.keeps.is_empty() {
        let (code, metadata) = if let Some(layout) = layout {
            state::emit_with_elisions(module, layout, elisions)?
        } else {
            state::emit_with_elisions(module, &ink_core::snapshot::layout(p)?, elisions)?
        };
        javascript.push_str(include_str!("snapshot.mjs"));
        javascript.push_str(&code);
        Some(metadata)
    } else {
        None
    };
    interface["private_record_elisions"]=json!(elisions);
    interface["f32_storage"] = json!(if native_f32 {"native-number-with-exact-nonfinite-tags"} else {"exact-u32-bits"});
    interface["wire"] = ink_abi::wire_contract::source_contract(p)?;
    interface["state"] = serde_json::to_value(state).map_err(|e| e.to_string())?;
    interface["named_types"] = serde_json::to_value(named).map_err(|e| e.to_string())?;
    javascript.push_str(&format!(
        "export const metadata = {};\nconst __implementations=[{}];\n",
        interface,
        (0..p.functions.len())
            .map(|i| format!("__fn{i}"))
            .collect::<Vec<_>>()
            .join(",")
    ));
    javascript.push_str(r#"
function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
"#);
    if needs_conversion {
        javascript.push_str(&format!("const __inputTypes={};\n",serde_json::to_string(&input_types).map_err(|e|e.to_string())?));
        javascript.push_str(
            r#"
// Descriptor work occurs once at module initialisation, never per word-list call.
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const output=__representation(f.result,true);
  const body=__implementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>{const context=new WeakMap();return output(implementation(...(needsInput ? args.map((v,i)=>input[i](v,context)) : args)),context);};
  return [f.name,entry];
})));
"#,
        );
    } else if p.contracts.precondition_checks.is_empty() {
        javascript.push_str("export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));\n");
    } else {
        javascript.push_str("export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,f.precondition==null?__implementations[f.index]:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return __implementations[f.index](...args);}])));\n");
    }
    // Owned temporaries are an internal capability, not a caller-value check.
    // Public trusted numeric entries remain direct functions without guards.
    let internal_cases = functions
        .iter()
        .filter(|f| f["internal"] == json!(true))
        .map(|f| format!("case {}:", f["name"]))
        .collect::<Vec<_>>()
        .join("");
    if internal_cases.is_empty() {
        javascript
            .push_str("export function call(name,args) { return functions[name](...args); }\n");
    } else {
        javascript.push_str(&format!("export function call(name,args) {{switch(name){{{internal_cases}throw new Error('temporary storage is internal to a pure invocation');}}return functions[name](...args);}}\n"));
    }
    javascript.push_str(ink_abi::VALUE_WIRE_JS_SOURCE);
    javascript.push_str(ink_abi::JSON_VALUE_JS_SOURCE);
    let mut owned = owned_values::OwnedValues::private(p,elisions,native_f32);
    let mut owned_entries = Vec::new();
    let mut unsupported_owned = Vec::new();
    for (i, function) in p.functions.iter().enumerate() {
        if interface["functions"][i]["internal"] == json!(true)
            || !interface["wire"]["functions"][&function.name]["unsupported"].is_null() { continue; }
        match owned.for_type(&function.result) {
            Ok(copy) => owned_entries.push(format!("[{},{}]", quote(&function.name), copy)),
            Err(reason) => unsupported_owned.push(json!({"function":function.name,"reason":reason})),
        }
    }
    javascript.push_str(&owned.source());
    javascript.push_str(&format!("const __ownedFunctions=Object.freeze(Object.fromEntries([{}]));\n", owned_entries.join(",")));
    let mut wire = wire_values::WireValues::new();
    let mut wire_entries = Vec::new();
    for (name, schema) in interface["wire"]["functions"].as_object().ok_or("wire functions")? {
        if !schema["unsupported"].is_null() { continue; }
        if let (Ok(arguments), Ok(result)) = (wire.for_schema(&schema["arguments"]), wire.for_schema(&schema["result"])) {
            wire_entries.push(format!("[{},[{},{}]]",quote(name),arguments,result));
        }
    }
    javascript.push_str(&wire.source());
    javascript.push_str(&format!("const __wireReaders=Object.freeze(Object.fromEntries([{}]));\n",wire_entries.join(",")));
    if needs_conversion {
        javascript.push_str(r#"
const __ownedImplementations=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>{
 const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
 const body=__implementations[f.index];
 const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
 return [f.name,input.every(c=>c===__identity)?implementation:(...args)=>{const context=new WeakMap();return implementation(...args.map((v,i)=>input[i](v,context)));}];
})));
"#);
    } else {
        javascript.push_str("const __ownedImplementations=functions;\n");
    }
    javascript.push_str(r#"
export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze(Object.hasOwn(__wireReaders,name)?{arguments:createCompiledValueCodec(s.arguments,__wireReaders[name][0]),result:createCompiledValueCodec(s.result,__wireReaders[name][1])}:{arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
function __callEncoded(name,bytes,limits,compact){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const input=compact?codecs.arguments.compact():codecs.arguments,output=compact?codecs.result.compact():codecs.result;
 const entry=__compiledEntries.get(name);
 if(entry){
  entry.argumentCodec??=createCompiledValueCodec(metadata.wire.functions[name].arguments,entry.arguments);
  const values=(compact?entry.argumentCodec.compact():entry.argumentCodec).decode(bytes,limits),args=f.params.map(p=>values[p.name]);
  if(entry.precondition!==null&&__implementations[entry.precondition](...args)!==true)throw Error('contract precondition failed');
  return __compiledEncodeResult(entry,__implementations[entry.index](...args),limits,compact);
 }
 const values=input.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return output.encode(result,limits);
}
export function callBinary(name,bytes,limits={}){return __callEncoded(name,bytes,limits,false);}
export function callCompact(name,bytes,limits={}){return __callEncoded(name,bytes,limits,true);}
// Same stable, well-typed caller inputs as call; the result owns every container.
// The checked source return type justifies trusted copying, not arbitrary input.
export function callOwned(name,args,limits={}){
 if(!Object.hasOwn(__ownedFunctions,name)||!Object.hasOwn(functions,name))throw Error('unsupported owned function');
 const result=__ownedImplementations[name](...args);return __ownedFunctions[name](result,createValueCaptureBudget(limits),0);
}
"#);
    javascript.push_str(&compiled_values::emit(p,elisions,native_f32)?);
    for (i, f) in p.functions.iter().enumerate() {
        if matches!(f.result, Type::List(_))
            && (!elisions.is_empty() || interface["functions"][i]["result"]["element"]
                .to_string()
                .contains("\"kind\":\"f32\"")
            || interface["functions"][i]["result"]["element"]
                .to_string()
                .contains("\"kind\":\"int\""))
        {
            javascript.push_str(&format!("const __intoOutput{i}=__representation(metadata.functions[{i}].result.element,true);\n"));
        }
    }
    javascript.push_str(&format!(
        "const __intoImplementations=[{}];\n",
        p.functions
            .iter()
            .enumerate()
            .map(|(i, f)| if matches!(f.result, Type::List(_)) {
                format!("__into{i}")
            } else {
                "null".into()
            })
            .collect::<Vec<_>>()
            .join(",")
    ));
    if needs_conversion {
        javascript.push_str(r#"
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
"#);
    } else if p.contracts.precondition_checks.is_empty() {
        javascript.push_str("export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));\n");
    } else {
        javascript.push_str("export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,f.precondition==null?__intoImplementations[f.index]:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return __intoImplementations[f.index](...args);}])) );\n");
    }
    if internal_cases.is_empty() {
        javascript.push_str("export function callInto(name,args,destination){return functionsInto[name](...args,destination);}\n");
    } else {
        javascript.push_str(&format!("export function callInto(name,args,destination){{switch(name){{{internal_cases}throw new Error('temporary storage is internal to a pure invocation');}}return functionsInto[name](...args,destination);}}\n"));
    }

    if !emitter.callbacks.is_empty() {
        javascript.push_str(include_str!("parallel.mjs"));
    }
    let mut manifest = interface;
    manifest["javascript_sha256"] = json!(format!("{:x}", Sha256::digest(javascript.as_bytes())));
    manifest["trusted"] = json!([
        "Ink checker and source correspondence",
        "JavaScript emitter and representation conversion",
        "JavaScript engine and host"
    ]);
    manifest["caller_contract"]=json!("trusted, well-typed target-native values; no input validation, snapshot capture or host resource budgets");
    manifest["owned_result_contract"] = json!({"functions":owned_entries.len(),"unsupported":unsupported_owned,"inputs":"same trusted caller contract","results":"canonical detached values with ABI byte/node/depth limits"});
    manifest["scope"]=json!("trusted pure functions and temporary collections; state/actions with portable snapshots and ordered transaction events");
    Ok(Emission {
        javascript,
        manifest,
    })
}

mod definition_literal;
pub mod representation_program;
