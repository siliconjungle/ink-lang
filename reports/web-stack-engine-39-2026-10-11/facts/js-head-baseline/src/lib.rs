//! Literal JavaScript emission for checked pure Ink, with no optimisation laws.
use ink_core::{check, core::CheckedModule, syntax::*, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub struct Emission {
    pub javascript: String,
    pub manifest: Value,
}
mod state;
type Env = BTreeMap<String, (String, Type)>;
// Lexical occurrence, not identifier spelling alone: local binders shadow the
// fold accumulator, while a let initializer still uses its enclosing scope.
fn references(e: &Expr, name: &str) -> bool {
    match e {
        Expr::Var(n) => n == name,
        Expr::Let(n, _, a, b) => references(a, name) || (n != name && references(b, name)),
        Expr::Lambda(n, b) => n != name && references(b, name),
        Expr::Neg(a) | Expr::Field(a, _) | Expr::Try(a) => references(a, name),
        Expr::Binary(_, a, b) => references(a, name) || references(b, name),
        Expr::Call(_, a) => a.iter().any(|a| references(a, name)),
        Expr::Method(a, _, b) => references(a, name) || b.iter().any(|b| references(b, name)),
        Expr::Record(_, fs) => fs.iter().any(|(_, e)| references(e, name)),
        Expr::Num(_) | Expr::Float(_) | Expr::Bool(_) | Expr::String(_) | Expr::Unit => false,
    }
}
fn replacement_tree(e: &Expr, acc: &str) -> bool {
    match e {
        Expr::Call(n, a) if n == "choose" && a.len() == 3 => {
            !references(&a[0], acc) && replacement_tree(&a[1], acc) && replacement_tree(&a[2], acc)
        }
        Expr::Var(n) if n == acc => true,
        _ => !references(e, acc),
    }
}
fn quote(s: &str) -> String {
    serde_json::to_string(s).unwrap()
}
fn descriptor(t: &Type, p: &Program, seen: &mut BTreeSet<String>) -> LangResult<Value> {
    Ok(match t {
        Type::U32 => json!({"kind":"u32"}), Type::U64 => json!({"kind":"u64"}),
        Type::I32 => json!({"kind":"i32"}), Type::F32 => json!({"kind":"f32"}),
        Type::Bool => json!({"kind":"bool"}),
        Type::Unit => json!({"kind":"unit"}), Type::String => json!({"kind":"string"}), Type::Int => json!({"kind":"int"}),
        Type::Option(t) => json!({"kind":"option","element":descriptor(t,p,seen)?}),
        Type::Result(a,b) => json!({"kind":"result","ok":descriptor(a,p,seen)?,"error":descriptor(b,p,seen)?}),
        Type::Buffer(_) | Type::Map(..) => json!({"kind":"temporary"}),
        Type::List(t) => json!({"kind":"list","element":descriptor(t,p,seen)?}),
        Type::Vector(t,n) => json!({"kind":"vector","size":n,"element":descriptor(t,p,seen)?}),
        Type::Named(n) if p.ids.contains(n) => json!({"kind":"id","name":n}),
        Type::Named(n) if n == "ArithmeticError" => json!({"kind":"enum","name":n,"variants":["ArithmeticError.Overflow"]}),
        Type::Named(n) if p.enums.contains_key(n) => json!({"kind":"enum","name":n,"variants":p.enums[n].iter().map(|v|format!("{n}.{v}")).collect::<Vec<_>>()}),
        Type::Named(n) => {
            if !seen.insert(n.clone()) { return Ok(json!({"kind":"ref","name":n})); }
            let fs=p.records.get(n).ok_or("JavaScript lowering requires a record definition")?;
            let fields=fs.iter().map(|(name,t)|Ok(json!({"name":name,"type":descriptor(t,p,seen)?})))
                .collect::<LangResult<Vec<_>>>()?;
            seen.remove(n);
            json!({"kind":"record","name":n,"fields":fields})
        }
        _ => return Err(format!("JavaScript lowering does not support {t:?}; supports pure numeric, Bool, vector, record and list values")),
    })
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

// Target operational refinement only: expose bounded known pure bodies to the
// target optimizer. This is not an algebraic rewrite or a callback whitelist.
const INLINE_MAX_BODY_NODES: usize = 2048;
const INLINE_MAX_DEPTH: usize = 8;
const INLINE_NODE_BUDGET: usize = 16_384;
fn inline_body_nodes(e: &Expr) -> Option<usize> {
    let mut pending = vec![e];
    let mut count = 0;
    while let Some(e) = pending.pop() {
        count += 1;
        if count > INLINE_MAX_BODY_NODES {
            return None;
        }
        match e {
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
                pending.push(a);
                pending.push(b);
            }
            Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Field(b, _) | Expr::Try(b) => pending.push(b),
            Expr::Call(_, a) => pending.extend(a),
            Expr::Method(a, _, b) => {
                pending.push(a);
                pending.extend(b);
            }
            Expr::Record(_, fields) => pending.extend(fields.iter().map(|(_, e)| e)),
            _ => {}
        }
    }
    Some(count)
}

struct Emitter<'a> {
    p: &'a Program,
    next: usize,
    budget: usize,
    lines: String,
    inline_stack: Vec<String>,
    inline_remaining: usize,
}
impl Emitter<'_> {
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
    fn types(env: &Env) -> check::Env {
        env.iter()
            .map(|(n, (_, t))| (n.clone(), t.clone()))
            .collect()
    }
    fn infer(&self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<Type> {
        check::infer_context(e, &Self::types(env), self.p, want)
    }

    fn inline_call(&mut self, f: &Function, values: &[String]) -> Option<String> {
        let nodes = inline_body_nodes(&f.body)?;
        if self.inline_stack.len() >= INLINE_MAX_DEPTH
            || self.inline_stack.contains(&f.name)
            || nodes > self.inline_remaining
        {
            return None;
        }
        let local: Env = f
            .params
            .iter()
            .zip(values)
            .map(|((name, ty), value)| (name.clone(), (value.clone(), ty.clone())))
            .collect();
        let saved = (
            self.lines.len(),
            self.next,
            self.budget,
            self.inline_remaining,
        );
        self.inline_remaining -= nodes;
        self.inline_stack.push(f.name.clone());
        self.line(format!("/* inline {} */", f.name));
        let result = self.expr(&f.body, &local, Some(&f.result));
        self.inline_stack.pop();
        match result {
            Ok(value) => {
                // The original source-emission budget counts each definition
                // once; duplicated body work has its own bounded inline budget.
                self.budget = saved.2;
                Some(value)
            }
            Err(_) => {
                self.lines.truncate(saved.0);
                self.next = saved.1;
                self.budget = saved.2;
                self.inline_remaining = saved.3;
                None
            }
        }
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
    fn replacement_step(
        &mut self,
        e: &Expr,
        acc: &str,
        out: &str,
        env: &Env,
        t: &Type,
    ) -> LangResult<()> {
        match e {
            Expr::Call(n, a) if n == "choose" && a.len() == 3 => {
                let c = self.expr(&a[0], env, Some(&Type::Bool))?;
                self.line(format!("if({c}){{"));
                self.replacement_step(&a[1], acc, out, env, t)?;
                self.line("}else{");
                self.replacement_step(&a[2], acc, out, env, t)?;
                self.line("}");
            }
            Expr::Var(n) if n == acc => {}
            _ => {
                let value = self.expr(e, env, Some(t))?;
                self.line(format!("{out}={value};break;"));
            }
        }
        Ok(())
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
                let xs = self.expr(receiver, env, context)?;
                let xs = self.bind(&xs);
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
                    self.bind(&format!("{xs}.length"))
                };
                if method == "scan" {
                    let acc = self.fresh();
                    self.line(format!("let {acc}={};", zero(&inner)));
                    let i = self.fresh();
                    self.line(format!("for(let {i}=0;{i}<{len};{i}++){{"));
                    let element = self.bind(&format!("{xs}[{i}]"));
                    self.line(format!(
                        "{acc}={};",
                        arithmetic("+", &acc, &element, &inner)
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
    // Emit prerequisite statements and return the final value expression. Each
    // caller materializes a value before emitting later operands or mutating an
    // accumulator. Lazy subexpressions are emitted inside their actual branch.
    fn expr(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<String> {
        if self.budget == 0 {
            return Err("JavaScript emission budget exceeded".into());
        }
        self.budget -= 1;
        let t = self.infer(e, env, want)?;
        Ok(match e {
            Expr::Num(n) => match t {
                Type::U64 | Type::Int => format!("{n}n"),
                Type::F32 => format!("{}", (*n as f32).to_bits()),
                _ => n.to_string(),
            },
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
                if t == Type::F32 {
                    format!("(({value} ^ 2147483648) >>> 0)")
                } else {
                    arithmetic("-", zero(&t), &value, &t)
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
            Expr::Field(a, n) if matches!(a.as_ref(),Expr::Var(root) if self.p.enums.contains_key(root)||root=="ArithmeticError") =>
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
                let context = if check::is_number(&t) {
                    Some(t.clone())
                } else {
                    check::hint(a, &ts, self.p).or_else(|| check::hint(b, &ts, self.p))
                };
                let at = self.infer(a, env, context.as_ref())?;
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
                    arithmetic(op, &av, &bv, &at)
                } else {
                    let (av, bv) = if at == Type::F32 {
                        (format!("__float({av})"), format!("__float({bv})"))
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
                        "__tempCopy(Array.from({}))",
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
                    "[]".into()
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
                            format!("{xv}[{kv}]")
                        } else {
                            format!("{xv}.get({kv})")
                        };
                        self.line(format!(
                            "let {out};if({condition}){{{out}=__tempCopy({access});}}else{{"
                        ));
                        let fallback = self.expr(&args[1], env, Some(value))?;
                        self.line(format!("{out}={fallback};}}"));
                        out
                    }
                    "contains" => format!("({xv}).has({kv})"),
                    "keys" | "values" => format!("__mapEntries({xv}, {})", n == "keys"),
                    "freeze" => xv,
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
            Expr::Call(n, args) if n == "foldr" => {
                let Type::List(inner) = self.infer(&args[0], env, None)? else {
                    unreachable!()
                };
                let xs = self.expr(&args[0], env, None)?;
                let xs = self.bind(&xs);
                let initial = self.expr(&args[1], env, Some(&t))?;
                let out = self.fresh();
                self.line(format!("let {out}={initial};"));
                let index = self.fresh();
                let forward = matches!(t, Type::U32 | Type::I32 | Type::U64 | Type::F32)
                    && matches!(&args[2], Expr::Lambda(item, rest) if matches!(rest.as_ref(), Expr::Lambda(acc, body) if item!=acc && matches!(body.as_ref(), Expr::Call(n,a) if n=="choose"&&a.len()==3) && replacement_tree(body,acc)));
                self.line(if forward {
                    format!("for(let {index}=0;{index}<{xs}.length;{index}++){{")
                } else {
                    format!("for(let {index}={xs}.length-1;{index}>=0;{index}--){{")
                });
                let element = self.bind(&format!("{xs}[{index}]"));
                let (body, local) = Self::callback(
                    &args[2],
                    env,
                    &[(element, *inner), (out.clone(), t.clone())],
                )?;
                if forward {
                    let Expr::Lambda(_, rest) = &args[2] else {
                        unreachable!()
                    };
                    let Expr::Lambda(acc, _) = rest.as_ref() else {
                        unreachable!()
                    };
                    self.replacement_step(body, acc, &out, &local, &t)?;
                } else {
                    let value = self.expr(body, &local, Some(&t))?;
                    self.line(format!("{out}={value};"));
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
                    self.line(format!("{out}={};}}", arithmetic("+", &out, &value, &t)));
                    out
                }
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
                let at = self.infer(&args[0], env, None)?;
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
                self.inline_call(&f, &values)
                    .unwrap_or_else(|| format!("__fn{index}({})", values.join(",")))
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
            Expr::Method(xs, method, args) => {
                let context = if method == "filter" || method == "concat" {
                    Some(&t)
                } else {
                    None
                };
                let Type::List(inner) = self.infer(xs, env, context)? else {
                    unreachable!()
                };
                let xs = self.expr(xs, env, context)?;
                let xs = self.bind(&xs);
                match method.as_str() {
                    "at_or" => {
                        let idx = self.expr(&args[0], env, Some(&Type::U32))?;
                        let idx = self.bind(&idx);
                        let out = self.fresh();
                        self.line(format!(
                            "let {out};if({idx}<{xs}.length){{{out}={xs}[{idx}];}}else{{"
                        ));
                        let fallback = self.expr(&args[1], env, Some(&t))?;
                        self.line(format!("{out}={fallback};}}"));
                        out
                    }
                    "sort" => format!("__sort({xs})"),
                    "concat" => {
                        let ys = self.expr(&args[0], env, Some(&t))?;
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
                        let out = self.bind(&format!("new Array({xs}.length)"));
                        let acc = self.fresh();
                        self.line(format!("let {acc}={};", zero(&inner)));
                        let i = self.fresh();
                        self.line(format!("for(let {i}=0;{i}<{xs}.length;{i}++){{"));
                        let element = self.bind(&format!("{xs}[{i}]"));
                        self.line(format!(
                            "{acc}={};{out}[{i}]={acc};}}",
                            arithmetic("+", &acc, &element, &inner)
                        ));
                        out
                    }
                    "map" | "filter" | "map_indexed" | "zip" => {
                        let Type::List(output) = &t else {
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
                }
            }
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
    lower_with_layout(module, None)
}
/// Emit selected code with the snapshot origin authenticated by the core.
pub fn lower_selected(selected: &ink_core::optimisation::CheckedSelection) -> LangResult<Emission> {
    let layout = ink_core::snapshot::selected_layout(selected)?;
    let mut emission = lower_with_layout(selected.module(), Some(&layout))?;
    emission.manifest["selection"] =
        serde_json::to_value(selected.evidence()).map_err(|e| e.to_string())?;
    Ok(emission)
}
fn lower_with_layout(
    module: &CheckedModule,
    layout: Option<&ink_core::snapshot_wire::Layout>,
) -> LangResult<Emission> {
    let p = module.program();
    let mut emitter = Emitter {
        p,
        next: 0,
        budget: 200_000,
        lines: String::new(),
        inline_stack: Vec::new(),
        inline_remaining: INLINE_NODE_BUDGET,
    };
    let mut javascript = String::new();
    let mut functions = vec![];
    for (i, f) in p.functions.iter().enumerate() {
        let params = f
            .params
            .iter()
            .map(|(n, t)| Ok(json!({"name":n,"type":descriptor(t,p,&mut BTreeSet::new())?})))
            .collect::<LangResult<Vec<_>>>()?;
        let result = descriptor(&f.result, p, &mut BTreeSet::new())?;
        let mut env = Env::new();
        let mut vars = vec![];
        for (n, t) in &f.params {
            let v = emitter.fresh();
            env.insert(n.clone(), (v.clone(), t.clone()));
            vars.push(v);
        }
        emitter.lines.clear();
        emitter.inline_stack.clear();
        let body = emitter.expr(&f.body, &env, Some(&f.result))?;
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
        functions.push(json!({"index":i,"name":f.name,"params":params,"result":result,"destination":destination,"internal":ink_core::local_collections::owned(&f.result,p)||f.params.iter().any(|(_,t)|ink_core::local_collections::owned(t,p))}));
    }
    // A separate budget ensures adding the destination capability does not
    // change the ordinary entrypoints' bounded inlining decisions.
    emitter.budget = 200_000;
    emitter.inline_remaining = INLINE_NODE_BUDGET;
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
        emitter.inline_stack.clear();
        let conversion = if functions[i]["result"]["element"]
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
    let mut interface = json!({"schema":1,"backend":"javascript","abi":"ink-javascript-trusted-values-v2","destination_abi":{"name":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned","capacity":"trusted","aliasing":"destination-disjoint-from-all-reachable-inputs","tail":"unwritten"},"core_semantics":module.semantics(),"core_sha256":module.identity()?,"functions":functions});
    // Emit only helpers referenced by the compiled expressions. Descriptor
    // conversion is needed solely for signatures containing binary32 values.
    let needs_conversion = interface.to_string().contains("\"kind\":\"f32\"")
        || interface.to_string().contains("\"kind\":\"int\"")
        || interface.to_string().contains("\"kind\":\"id\"");
    let mut helpers = String::new();
    for section in include_str!("values.mjs").split("// @helper ").skip(1) {
        let (name, source) = section.split_once('\n').unwrap();
        let used = if name == "representation" {
            needs_conversion
                || !p.actions.is_empty()
                || !p.states.is_empty()
                || !p.keeps.is_empty()
                || javascript.contains("__bits(")
                || javascript.contains("__float(")
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
    let temporary = include_str!("temporary.mjs");
    if [
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
    javascript = helpers + &javascript;
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
            state::emit_with_layout(module, layout)?
        } else {
            state::emit(module)?
        };
        javascript.push_str(include_str!("snapshot.mjs"));
        javascript.push_str(&code);
        Some(metadata)
    } else {
        None
    };
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
        javascript.push_str(
            r#"
// Descriptor work occurs once at module initialisation, never per word-list call.
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=f.params.map(p=>__representation(p.type,false));
  const output=__representation(f.result,true);
  const implementation=__implementations[f.index];
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>output(implementation(...(needsInput ? args.map((v,i)=>input[i](v)) : args)));
  return [f.name,entry];
})));
"#,
        );
    } else {
        javascript.push_str("export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));\n");
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
    for (i, f) in p.functions.iter().enumerate() {
        if matches!(f.result, Type::List(_))
            && interface["functions"][i]["result"]["element"]
                .to_string()
                .contains("\"kind\":\"f32\"")
            || interface["functions"][i]["result"]["element"]
                .to_string()
                .contains("\"kind\":\"int\"")
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
  const input=f.params.map(p=>__representation(p.type,false));
  const implementation=__intoImplementations[f.index];
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>implementation(...input.map((convert,i)=>convert(values[i])),values[f.params.length]);
  return [f.name,entry];
})));
"#);
    } else {
        javascript.push_str("export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));\n");
    }
    if internal_cases.is_empty() {
        javascript.push_str("export function callInto(name,args,destination){return functionsInto[name](...args,destination);}\n");
    } else {
        javascript.push_str(&format!("export function callInto(name,args,destination){{switch(name){{{internal_cases}throw new Error('temporary storage is internal to a pure invocation');}}return functionsInto[name](...args,destination);}}\n"));
    }

    let mut manifest = interface;
    manifest["javascript_sha256"] = json!(format!("{:x}", Sha256::digest(javascript.as_bytes())));
    manifest["trusted"] = json!([
        "Ink checker and source correspondence",
        "JavaScript emitter and representation conversion",
        "JavaScript engine and host"
    ]);
    manifest["caller_contract"]=json!("trusted, well-typed target-native values; no input validation, snapshot capture or host resource budgets");
    manifest["scope"]=json!("trusted pure functions and temporary collections; state/actions with portable snapshots and ordered transaction events");
    Ok(Emission {
        javascript,
        manifest,
    })
}
