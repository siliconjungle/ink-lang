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
    fn list(&mut self, e: &Expr, env: &Env) -> LangResult<(String, String, bool)> {
        match e {
            Expr::Var(n) => match env.get(n) {
                Some(Binding::List(data, len)) => Ok((data.clone(), len.clone(), false)),
                _ => Err("expected list binding".into()),
            },
            Expr::Method(xs, method, args) => {
                let (input, len, owned) = self.list(xs, env)?;
                let Some(Expr::Lambda(var, body)) = args.first() else {
                    return Err("collection lambda missing".into());
                };
                let output = self.fresh();
                let count = self.fresh();
                let index = self.fresh();
                self.line(format!("uint64_t *{output} = lang_allocate({len});"));
                self.line(format!("size_t {count} = 0;"));
                self.line(format!(
                    "for (size_t {index}=0; {index}<{len}; ++{index}) {{"
                ));
                self.indent += 1;
                let value = self.fresh();
                self.line(format!("uint64_t {value}={input}[{index}];"));
                self.line(format!("(void){value};"));
                let mut local = env.clone();
                local.insert(var.clone(), Binding::Scalar(value.clone()));
                let expression = self.scalar(body, &local)?;
                match method.as_str() {
                    "map" => self.line(format!("{output}[{count}++] = {expression};")),
                    "filter" => {
                        self.line(format!("if ({expression}) {output}[{count}++] = {value};"))
                    }
                    _ => return Err("unsupported collection operation".into()),
                }
                self.indent -= 1;
                self.line("}");
                if owned {
                    self.line(format!("lang_release({input});"));
                }
                Ok((output, count, true))
            }
            _ => Err("native list expression not supported".into()),
        }
    }
    fn scalar(&mut self, e: &Expr, env: &Env) -> LangResult<String> {
        match e {
            Expr::Call(n, args) if n == "choose" => {
                let condition = self.scalar(&args[0], env)?;
                let result = self.fresh();
                self.line(format!("uint64_t {result};"));
                self.line(format!("if ({condition}) {{"));
                self.indent += 1;
                let value = self.scalar(&args[1], env)?;
                self.line(format!("{result}={value};"));
                self.indent -= 1;
                self.line("} else {");
                self.indent += 1;
                let value = self.scalar(&args[2], env)?;
                self.line(format!("{result}={value};"));
                self.indent -= 1;
                self.line("}");
                Ok(result)
            }

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
            Expr::Call(n, args) if n == "foldr" => {
                let (data, len, owned) = self.list(&args[0], env)?;
                let initial = self.scalar(&args[1], env)?;
                let Expr::Lambda(item, inner) = &args[2] else {
                    return Err("foldr lambda".into());
                };
                let Expr::Lambda(rest, body) = inner.as_ref() else {
                    return Err("foldr nested lambda".into());
                };
                let accumulator = self.fresh();
                let index = self.fresh();
                let value = self.fresh();
                self.line(format!("uint64_t {accumulator}={initial};"));
                self.line(format!(
                    "for (size_t {index}={len}; {index}>0; --{index}) {{"
                ));
                self.indent += 1;
                self.line(format!("uint64_t {value}={data}[{index}-1];"));
                self.line(format!("(void){value};"));
                let mut local = env.clone();
                local.insert(item.clone(), Binding::Scalar(value));
                local.insert(rest.clone(), Binding::Scalar(accumulator.clone()));
                let result = self.scalar(body, &local)?;
                self.line(format!("{accumulator}={result};"));
                self.indent -= 1;
                self.line("}");
                if owned {
                    self.line(format!("lang_release({data});"));
                }
                Ok(accumulator)
            }
            Expr::Call(n, args) if n == "sum" || n == "count" => {
                let (data, len, owned) = self.list(&args[0], env)?;
                let result = self.fresh();
                if n == "count" {
                    self.line(format!("uint64_t {result}=(uint64_t){len};"));
                } else {
                    let index = self.fresh();
                    self.line(format!("uint64_t {result}=0;"));
                    self.line(format!(
                        "for (size_t {index}={len}; {index}>0; --{index}) {{"
                    ));
                    self.indent += 1;
                    self.line(format!("{result} += {data}[{index}-1];"));
                    self.indent -= 1;
                    self.line("}");
                }
                if owned {
                    self.line(format!("lang_release({data});"));
                }
                Ok(result)
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
                let mut owned_lists = Vec::new();
                for (e, (_, t)) in args.iter().zip(&f.params) {
                    if matches!(t, Type::List(_)) {
                        let (ptr, len, owned) = self.list(e, env)?;
                        if owned {
                            owned_lists.push(ptr.clone());
                        }
                        ca.push(ptr);
                        ca.push(len);
                    } else {
                        ca.push(self.scalar(e, env)?);
                    }
                }
                let result = self.fresh();
                self.line(format!(
                    "{} {result}=lang_fn_{n}({});",
                    ctype(&f.result)?,
                    ca.join(", ")
                ));
                for pointer in owned_lists {
                    self.line(format!("lang_release({pointer});"));
                }
                Ok(result)
            }
            _ => Err("native scalar expression not yet supported".into()),
        }
    }
}

pub fn emit(p: &Program) -> LangResult<String> {
    if !p.states.is_empty() || !p.actions.is_empty() || !p.keeps.is_empty() {
        return Err("native stateful code generation is not implemented yet; use lang execute for reference execution".into());
    }
    let mut out=String::from("/* Generated by lang. Trusted C/Clang lowering; u64 arithmetic is modular. */\n#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n");
    out.push_str(include_str!("pure_alloc.c"));
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
        em.line("lang_frame lang_saved_frame=lang_enter();");
        for binding in env.values() {
            if let Binding::List(data, len) = binding {
                em.line(format!("lang_input({data},{len});"));
            }
        }
        // A checked rewrite can eliminate the last use of any ABI parameter.
        for binding in env.values() {
            match binding {
                Binding::Scalar(name) => em.line(format!("(void){name};")),
                Binding::List(data, len) => {
                    em.line(format!("(void){data};"));
                    em.line(format!("(void){len};"));
                }
            }
        }
        let value = em.scalar(&f.body, &env)?;
        let result = em.fresh();
        em.line(format!("{} {result}={value};", ctype(&f.result)?));
        em.line("lang_exit(lang_saved_frame);");
        em.line(format!("return {result};"));
        out.push_str(&em.lines);
        out.push_str("}\n");
    }
    Ok(out)
}
