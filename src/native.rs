use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone)]
enum Binding {
    Scalar(String),
    List(String, String),
}
type Env = BTreeMap<String, Binding>;

fn ctype(t: &Type) -> LangResult<&'static str> {
    match t {
        Type::U64 => Ok("uint64_t"),
        Type::Bool => Ok("bool"),
        _ => Err("native result must be scalar in this milestone".into()),
    }
}

fn signature(f: &Function) -> LangResult<String> {
    let mut args = Vec::new();
    for (i, (_, t)) in f.params.iter().enumerate() {
        match t {
            Type::List(inner) if **inner == Type::U64 => {
                args.push(format!("const uint64_t *lang_a{i}_data"));
                args.push(format!("size_t lang_a{i}_len"));
            }
            Type::List(_) => return Err("native list ABI currently requires u64 elements".into()),
            _ => args.push(format!("{} lang_a{i}", ctype(t)?)),
        }
    }
    Ok(format!(
        "{} lang_fn_{}({})",
        ctype(&f.result)?,
        f.name,
        if args.is_empty() {
            "void".into()
        } else {
            args.join(", ")
        }
    ))
}

struct Emitter<'a> {
    p: &'a Program,
    lines: String,
    next: usize,
    indent: usize,
}
impl Emitter<'_> {
    fn fresh(&mut self) -> String {
        let n = format!("lang_t{}", self.next);
        self.next += 1;
        n
    }
    fn line(&mut self, s: impl AsRef<str>) {
        self.lines.push_str(&"    ".repeat(self.indent));
        self.lines.push_str(s.as_ref());
        self.lines.push('\n');
    }
    fn list(&self, e: &Expr, env: &Env) -> LangResult<(String, String)> {
        if let Expr::Var(n) = e {
            if let Some(Binding::List(a, b)) = env.get(n) {
                return Ok((a.clone(), b.clone()));
            }
        }
        Err("native list arguments must currently be parameters".into())
    }
    fn pipeline<'a>(
        e: &'a Expr,
        stages: &mut Vec<(&'a str, &'a str, &'a Expr)>,
    ) -> LangResult<&'a Expr> {
        if let Expr::Method(xs, method, args) = e {
            let root = Self::pipeline(xs, stages)?;
            if let Some(Expr::Lambda(var, body)) = args.first() {
                stages.push((method, var, body));
                Ok(root)
            } else {
                Err("pipeline lambda missing".into())
            }
        } else {
            Ok(e)
        }
    }
    fn scalar(&mut self, e: &Expr, env: &Env) -> LangResult<String> {
        match e {
            Expr::Num(n) => Ok(format!("UINT64_C({n})")),
            Expr::Bool(b) => Ok(if *b { "true" } else { "false" }.into()),
            Expr::Var(n) => match env.get(n) {
                Some(Binding::Scalar(x)) => Ok(x.clone()),
                _ => Err(format!("{n} is not a scalar binding")),
            },
            Expr::Binary(op, a, b) => {
                // C's short-circuit rules only apply inside expressions. Materialise the
                // right branch conditionally when it contains generated aggregate loops.
                let x = self.scalar(a, env)?;
                if op == "&&" || op == "||" {
                    let t = self.fresh();
                    self.line(format!("bool {t} = {x};"));
                    self.line(format!(
                        "if ({}{}) {{",
                        if op == "||" { "!" } else { "" },
                        t
                    ));
                    self.indent += 1;
                    let y = self.scalar(b, env)?;
                    self.line(format!("{t} = {y};"));
                    self.indent -= 1;
                    self.line("}");
                    Ok(t)
                } else {
                    let y = self.scalar(b, env)?;
                    Ok(format!("({x} {op} {y})"))
                }
            }
            Expr::Call(n, args) if n == "sum" || n == "count" => {
                let mut stages = Vec::new();
                let root = Self::pipeline(&args[0], &mut stages)?;
                let (data, len) = self.list(root, env)?;
                let acc = self.fresh();
                let ix = self.fresh();
                let mut value = self.fresh();
                self.line(format!("uint64_t {acc} = 0;"));
                self.line(format!("for (size_t {ix} = 0; {ix} < {len}; ++{ix}) {{"));
                self.indent += 1;
                self.line(format!("uint64_t {value} = {data}[{ix}];"));
                for (method, var, body) in stages {
                    let mut local = env.clone();
                    local.insert(var.into(), Binding::Scalar(value.clone()));
                    let x = self.scalar(body, &local)?;
                    if method == "filter" {
                        self.line(format!("if (!({x})) continue;"));
                    } else if method == "map" {
                        value = self.fresh();
                        self.line(format!("uint64_t {value} = {x};"));
                    } else {
                        return Err(format!("unknown pipeline stage {method}"));
                    }
                }
                self.line(format!(
                    "{acc} += {};",
                    if n == "count" { "UINT64_C(1)" } else { &value }
                ));
                self.indent -= 1;
                self.line("}");
                Ok(acc)
            }
            Expr::Call(n, args) => {
                let f = self
                    .p
                    .functions
                    .iter()
                    .find(|f| &f.name == n)
                    .ok_or_else(|| format!("unknown function {n}"))?
                    .clone();
                let mut ca = Vec::new();
                for (e, (_, t)) in args.iter().zip(&f.params) {
                    if matches!(t, Type::List(_)) {
                        let (ptr, len) = self.list(e, env)?;
                        ca.push(ptr);
                        ca.push(len);
                    } else {
                        ca.push(self.scalar(e, env)?);
                    }
                }
                Ok(format!("lang_fn_{n}({})", ca.join(", ")))
            }
            _ => Err("native scalar expression not yet supported".into()),
        }
    }
}

pub fn emit(p: &Program) -> LangResult<String> {
    let mut out=String::from("/* Generated by lang. Trusted C/Clang lowering; u64 arithmetic is modular. */\n#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n");
    for f in &p.functions {
        out.push_str(&signature(f)?);
        out.push_str(";\n");
    }
    for f in &p.functions {
        out.push_str(&signature(f)?);
        out.push_str(" {\n");
        let mut env = Env::new();
        for (i, (n, t)) in f.params.iter().enumerate() {
            env.insert(
                n.clone(),
                if matches!(t, Type::List(_)) {
                    Binding::List(format!("lang_a{i}_data"), format!("lang_a{i}_len"))
                } else {
                    Binding::Scalar(format!("lang_a{i}"))
                },
            );
        }
        let mut em = Emitter {
            p,
            lines: String::new(),
            next: 0,
            indent: 1,
        };
        let value = em.scalar(&f.body, &env)?;
        em.line(format!("return {value};"));
        out.push_str(&em.lines);
        out.push_str("}\n");
    }
    Ok(out)
}
