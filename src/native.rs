use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;

#[derive(Clone)]
enum Binding {
    Scalar(String, Type),
    List(String, String, Type),
}
type Env = BTreeMap<String, Binding>;

fn ctype(t: &Type) -> LangResult<&'static str> {
    match t {
        Type::U64 => Ok("uint64_t"),
        Type::U32 => Ok("uint32_t"),
        Type::Bool => Ok("bool"),
        _ => Err("native result must be scalar in this milestone".into()),
    }
}

fn signature(f: &Function) -> LangResult<String> {
    let mut args = Vec::new();
    for (i, (_, t)) in f.params.iter().enumerate() {
        match t {
            Type::List(inner) if crate::check::is_word(inner) => {
                args.push(format!("const {} *lang_a{i}_data", ctype(inner)?));
                args.push(format!("size_t lang_a{i}_len"));
            }
            Type::List(_) => return Err("native list ABI requires u32/u64 elements".into()),
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
    fn types(env: &Env) -> crate::check::Env {
        env.iter()
            .map(|(n, b)| {
                (
                    n.clone(),
                    match b {
                        Binding::Scalar(_, t) => t.clone(),
                        Binding::List(_, _, t) => Type::List(Box::new(t.clone())),
                    },
                )
            })
            .collect()
    }
    fn list(
        &mut self,
        e: &Expr,
        env: &Env,
        want: Option<&Type>,
    ) -> LangResult<(String, String, bool)> {
        let Type::List(element) = crate::check::infer_context(e, &Self::types(env), self.p, want)?
        else {
            return Err("expected list".into());
        };
        match e {
            Expr::Var(n) => match env.get(n) {
                Some(Binding::List(data, len, _)) => Ok((data.clone(), len.clone(), false)),
                _ => Err("expected list binding".into()),
            },
            Expr::Method(xs, method, args) => {
                let (input, len, owned) =
                    self.list(xs, env, if method == "filter" { want } else { None })?;
                let Some(Expr::Lambda(var, body)) = args.first() else {
                    return Err("collection lambda missing".into());
                };
                let output = self.fresh();
                let count = self.fresh();
                let index = self.fresh();
                self.line(format!(
                    "{} *{output} = lang_allocate({len}, sizeof({}));",
                    ctype(&element)?,
                    ctype(&element)?
                ));
                self.line(format!("size_t {count} = 0;"));
                self.line(format!(
                    "for (size_t {index}=0; {index}<{len}; ++{index}) {{"
                ));
                self.indent += 1;
                let value = self.fresh();
                let Type::List(input_type) = crate::check::infer_context(
                    xs,
                    &Self::types(env),
                    self.p,
                    if method == "filter" { want } else { None },
                )?
                else {
                    return Err("expected list".into());
                };
                self.line(format!("{} {value}={input}[{index}];", ctype(&input_type)?));
                self.line(format!("(void){value};"));
                let mut local = env.clone();
                local.insert(var.clone(), Binding::Scalar(value.clone(), *input_type));
                let expression = self.scalar(
                    body,
                    &local,
                    Some(if method == "filter" {
                        &Type::Bool
                    } else {
                        &element
                    }),
                )?;
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
    fn scalar(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<String> {
        let types = Self::types(env);
        let ty = crate::check::infer_context(e, &types, self.p, want)?;
        match e {
            Expr::Call(n, args) if n == "choose" => {
                let condition = self.scalar(&args[0], env, Some(&Type::Bool))?;
                let result = self.fresh();
                self.line(format!("{} {result};", ctype(&ty)?));
                self.line(format!("if ({condition}) {{"));
                self.indent += 1;
                let value = self.scalar(&args[1], env, Some(&ty))?;
                self.line(format!("{result}={value};"));
                self.indent -= 1;
                self.line("} else {");
                self.indent += 1;
                let value = self.scalar(&args[2], env, Some(&ty))?;
                self.line(format!("{result}={value};"));
                self.indent -= 1;
                self.line("}");
                Ok(result)
            }

            Expr::Num(n) => Ok(format!(
                "{}({n})",
                if ty == Type::U32 {
                    "UINT32_C"
                } else {
                    "UINT64_C"
                }
            )),
            Expr::Bool(b) => Ok(if *b { "true" } else { "false" }.into()),
            Expr::Var(n) => match env.get(n) {
                Some(Binding::Scalar(x, _)) => Ok(x.clone()),
                _ => Err(format!("{n} is not a scalar binding")),
            },
            Expr::Binary(op, a, b) => {
                // C's short-circuit rules only apply inside expressions. Materialise the
                // right branch conditionally when it contains generated aggregate loops.
                let operand_ty = if crate::check::is_word(&ty) {
                    Some(ty.clone())
                } else {
                    crate::check::hint(a, &types, self.p)
                        .or_else(|| crate::check::hint(b, &types, self.p))
                };
                let x = self.scalar(a, env, operand_ty.as_ref())?;
                if op == "&&" || op == "||" {
                    let t = self.fresh();
                    self.line(format!("bool {t} = {x};"));
                    self.line(format!(
                        "if ({}{}) {{",
                        if op == "||" { "!" } else { "" },
                        t
                    ));
                    self.indent += 1;
                    let y = self.scalar(b, env, operand_ty.as_ref())?;
                    self.line(format!("{t} = {y};"));
                    self.indent -= 1;
                    self.line("}");
                    Ok(t)
                } else {
                    let y = self.scalar(b, env, operand_ty.as_ref())?;
                    Ok(if ty == Type::U32 {
                        format!("((uint32_t)({x} {op} {y}))")
                    } else {
                        format!("({x} {op} {y})")
                    })
                }
            }
            Expr::Call(n, args) if n == "foldr" => {
                let list_want = if n == "sum" || n == "foldr" {
                    Some(Type::List(Box::new(ty.clone())))
                } else {
                    None
                };
                let (data, len, owned) = self.list(&args[0], env, list_want.as_ref())?;
                let initial = self.scalar(&args[1], env, Some(&ty))?;
                let Expr::Lambda(item, inner) = &args[2] else {
                    return Err("foldr lambda".into());
                };
                let Expr::Lambda(rest, body) = inner.as_ref() else {
                    return Err("foldr nested lambda".into());
                };
                let accumulator = self.fresh();
                let index = self.fresh();
                let value = self.fresh();
                self.line(format!("{} {accumulator}={initial};", ctype(&ty)?));
                self.line(format!(
                    "for (size_t {index}={len}; {index}>0; --{index}) {{"
                ));
                self.indent += 1;
                self.line(format!("{} {value}={data}[{index}-1];", ctype(&ty)?));
                self.line(format!("(void){value};"));
                let mut local = env.clone();
                local.insert(item.clone(), Binding::Scalar(value, ty.clone()));
                local.insert(
                    rest.clone(),
                    Binding::Scalar(accumulator.clone(), ty.clone()),
                );
                let result = self.scalar(body, &local, Some(&ty))?;
                self.line(format!("{accumulator}={result};"));
                self.indent -= 1;
                self.line("}");
                if owned {
                    self.line(format!("lang_release({data});"));
                }
                Ok(accumulator)
            }
            Expr::Call(n, args) if n == "sum" || n == "count" => {
                let list_want = if n == "sum" || n == "foldr" {
                    Some(Type::List(Box::new(ty.clone())))
                } else {
                    None
                };
                let (data, len, owned) = self.list(&args[0], env, list_want.as_ref())?;
                let result = self.fresh();
                if n == "count" {
                    self.line(format!("uint64_t {result}=(uint64_t){len};"));
                } else {
                    let index = self.fresh();
                    self.line(format!("{} {result}=0;", ctype(&ty)?));
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
                        let (ptr, len, owned) = self.list(e, env, Some(t))?;
                        if owned {
                            owned_lists.push(ptr.clone());
                        }
                        ca.push(ptr);
                        ca.push(len);
                    } else {
                        ca.push(self.scalar(e, env, Some(t))?);
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
    // Self-comparisons are valid source computations, including with no database.
    // Preserve their literal lowering; do not turn a C style warning into an
    // Ink error or install a hidden simplification law to avoid the warning.
    let mut out=String::from("/* Generated by lang. Trusted C/Clang lowering; word arithmetic is modular at its checked width. */\n#include <stdint.h>\n#include <stddef.h>\n#include <stdbool.h>\n#if defined(__clang__)\n#pragma clang diagnostic ignored \"-Wtautological-compare\"\n#endif\n");
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
                    Binding::List(
                        format!("lang_a{i}_data"),
                        format!("lang_a{i}_len"),
                        if let Type::List(t) = t {
                            (**t).clone()
                        } else {
                            unreachable!()
                        },
                    )
                } else {
                    Binding::Scalar(format!("lang_a{i}"), t.clone())
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
            if let Binding::List(data, len, t) = binding {
                em.line(format!("lang_input({data},{len},sizeof({}));", ctype(t)?));
            }
        }
        // A checked rewrite can eliminate the last use of any ABI parameter.
        for binding in env.values() {
            match binding {
                Binding::Scalar(name, _) => em.line(format!("(void){name};")),
                Binding::List(data, len, _) => {
                    em.line(format!("(void){data};"));
                    em.line(format!("(void){len};"));
                }
            }
        }
        let value = em.scalar(&f.body, &env, Some(&f.result))?;
        let result = em.fresh();
        em.line(format!("{} {result}={value};", ctype(&f.result)?));
        em.line("lang_exit(lang_saved_frame);");
        em.line(format!("return {result};"));
        out.push_str(&em.lines);
        out.push_str("}\n");
    }
    Ok(out)
}
