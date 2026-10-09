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
    match e {
        Expr::Num(n) => Ok(format!("BigInt::from({n}u64)")),
        Expr::Var(n) => Ok(format!("{}.clone()", ident(n))),
        Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => Ok(format!(
            "({} {op} {})",
            exact_expression(a)?,
            exact_expression(b)?
        )),
        _ => Err("invalid exact certificate expression".into()),
    }
}
struct Emitter<'a> {
    p: &'a Program,
    plans: BTreeMap<String, aggregate::Plan>,
    serial: usize,
}
impl Emitter<'_> {
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
        serial: 0,
    };
    let mut out = String::from(
        "#![allow(non_camel_case_types,non_snake_case,unused_variables,unused_parens,dead_code)]\n",
    );
    out.push_str(include_str!("state_native_support.txt"));
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
                write!(out, ",cache_{}:BigInt", ident(n)).unwrap();
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
        writeln!(out, "cache_{}:BigInt,", ident(n)).unwrap();
    }
    out.push_str("}\nimpl Default for State {fn default()->Self{Self::new()}}\nimpl State {pub fn new()->Self{Self{version:0,staged:vec![],outbox:vec![],undo:vec![],\n");
    for s in &p.states {
        writeln!(out, "{}:BTreeMap::new(),", ident(&s.name)).unwrap();
    }
    for n in emitter.plans.keys() {
        writeln!(out, "cache_{}:BigInt::from(0u8),", ident(n)).unwrap();
    }
    out.push_str("}}\n");
    out.push_str("pub fn version(&self)->u64{self.version}\npub fn outbox(&self)->&[Event]{&self.outbox}\npub fn acknowledge_through(&mut self,commit:u64,position:u64){self.outbox.retain(|e|(e.commit,e.position)>(commit,position));}\n");
    for (n, plan) in emitter.plans.clone() {
        out.push_str(&emitter.contribution(&n, &plan)?);
    }
    // A single typed write primitive per root owns its undo and cache entries.
    for s in &p.states {
        let field = ident(&s.name);
        let Type::Table(k, v) = &s.ty else {
            unreachable!()
        };
        writeln!(out,"fn set_{field}(&mut self,key:{},value:Option<{}>)->Option<{}>{{let old=self.{field}.get(&key).cloned();",ty(k)?,ty(v)?,ty(v)?).unwrap();
        write!(
            out,
            "self.undo.push(Undo::{field}{{key:key.clone(),old:old.clone()"
        )
        .unwrap();
        for (n, plan) in &emitter.plans {
            if plan.root == s.name {
                write!(out, ",cache_{}:self.cache_{}.clone()", ident(n), ident(n)).unwrap();
            }
        }
        out.push_str("});\n");
        for (n, plan) in emitter.plans.clone() {
            if plan.root != s.name {
                continue;
            }
            let id = ident(&n);
            let c = certificate.unwrap();
            writeln!(out,"{{let total=self.cache_{id}.clone();let old_part=old.as_ref().map(Self::contribution_{id});let new_part=value.as_ref().map(Self::contribution_{id});self.cache_{id}=match (old_part,new_part){{").unwrap();
            for (pattern, e, vars) in [
                ("(None,Some(new))", &c.insert, vec!["total", "new"]),
                (
                    "(Some(old),Some(new))",
                    &c.replace,
                    vec!["total", "old", "new"],
                ),
                ("(Some(old),None)", &c.remove, vec!["total", "old"]),
            ] {
                let expr = exact_expression(e)?;
                write!(out, "{pattern}=>{{").unwrap();
                for v in vars {
                    write!(out, "let {}={v};", ident(v)).unwrap();
                }
                writeln!(out, "{expr}}},").unwrap();
            }
            out.push_str("(None,None)=>total};}\n");
        }
        writeln!(out,"match value{{Some(v)=>{{self.{field}.insert(key,v);}},None=>{{self.{field}.remove(&key);}}}}old}}\n").unwrap();
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
                write!(out, "self.cache_{}=cache_{};", ident(n), ident(n)).unwrap();
            }
        }
        out.push_str("},\n");
    }
    out.push_str("}}self.staged.clear();}\n");
    for k in &p.keeps {
        let body = if emitter.plans.contains_key(&k.name) {
            format!("self.cache_{}.clone()", ident(&k.name))
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
 let file=std::env::args().nth(1).ok_or("expected SCRIPT.json")?;
 let script:serde_json::Value=serde_json::from_slice(&std::fs::read(file).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
 let mut state=State::new();let mut output=vec![];
 for step in script.as_array().ok_or("expected script array")? {
  output.push(state.invoke_json(step.get("call").and_then(serde_json::Value::as_str).ok_or("missing call")?,step.get("args").ok_or("missing args")?)?);
 }
 println!("{}",serde_json::to_string_pretty(&output).map_err(|e|e.to_string())?);Ok(())
}
fn main()->std::process::ExitCode{match run(){Ok(())=>std::process::ExitCode::SUCCESS,Err(e)=>{eprintln!("error: {e}");std::process::ExitCode::FAILURE}}}
"#;
