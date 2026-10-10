//! Literal pure-expression Rust lowering for functions embedded in stateful
//! projects. Shares contextual typing with the C and GPU backends.
use crate::{check, syntax::*, LangResult};
struct Emitter<'a> {
    p: &'a Program,
    next: usize,
}
impl Emitter<'_> {
    fn fresh(&mut self) -> String {
        let n = format!("ink_pure_{}", self.next);
        self.next += 1;
        n
    }
    fn expr(&mut self, e: &Expr, env: &check::Env, want: Option<&Type>) -> LangResult<String> {
        let t = check::infer_context(e, env, self.p, want)?;
        Ok(match e {
            Expr::Num(n) => format!("{n}{}", if t == Type::U32 { "u32" } else { "u64" }),
            Expr::Bool(b) => b.to_string(),
            Expr::Var(n) => format!("l_{n}.clone()"),
            Expr::Binary(op, a, b) => {
                let operand = if check::is_word(&t) {
                    Some(t.clone())
                } else {
                    check::hint(a, env, self.p).or_else(|| check::hint(b, env, self.p))
                };
                let a = self.expr(a, env, operand.as_ref())?;
                let b = self.expr(b, env, operand.as_ref())?;
                match op.as_str() {
                    "+" => format!("({a}).wrapping_add({b})"),
                    "-" => format!("({a}).wrapping_sub({b})"),
                    "*" => format!("({a}).wrapping_mul({b})"),
                    _ => format!("(({a}) {op} ({b}))"),
                }
            }
            Expr::Call(n, args) if n == "choose" => format!(
                "if {} {{{}}} else {{{}}}",
                self.expr(&args[0], env, Some(&Type::Bool))?,
                self.expr(&args[1], env, Some(&t))?,
                self.expr(&args[2], env, Some(&t))?
            ),
            Expr::Call(n, args) if n == "sum" || n == "count" => {
                let list_want = if n == "sum" {
                    Some(Type::List(Box::new(t.clone())))
                } else {
                    None
                };
                let xs = self.expr(&args[0], env, list_want.as_ref())?;
                if n == "count" {
                    format!("(({xs}).len() as u64)")
                } else {
                    format!("({xs}).into_iter().fold(0{}, |ink_acc,ink_value|ink_acc.wrapping_add(ink_value))",if t==Type::U32 {"u32"}else{"u64"})
                }
            }
            Expr::Call(n, args) if n == "foldr" => {
                let xs = self.expr(&args[0], env, None)?;
                let initial = self.expr(&args[1], env, Some(&t))?;
                let Expr::Lambda(item, inner) = &args[2] else {
                    return Err("foldr lambda".into());
                };
                let Expr::Lambda(rest, body) = inner.as_ref() else {
                    return Err("foldr nested lambda".into());
                };
                let mut local = env.clone();
                local.insert(item.clone(), t.clone());
                local.insert(rest.clone(), t.clone());
                let body = self.expr(body, &local, Some(&t))?;
                let acc = self.fresh();
                let value = self.fresh();
                format!("({xs}).into_iter().rev().fold({initial}, |{acc},{value}|{{let l_{item}={value};let l_{rest}={acc};{body}}})")
            }
            Expr::Call(n, args) => {
                let f = self
                    .p
                    .functions
                    .iter()
                    .find(|f| &f.name == n)
                    .ok_or("unknown pure function")?
                    .clone();
                let mut bindings = String::new();
                let mut names = Vec::new();
                for (e, (_, t)) in args.iter().zip(&f.params) {
                    let value = self.expr(e, env, Some(t))?;
                    let name = self.fresh();
                    bindings.push_str(&format!("let {name}={value};"));
                    names.push(name);
                }
                format!("{{{bindings}self.function_l_{n}({})}}", names.join(","))
            }
            Expr::Method(xs, n, args) => {
                let context = if n == "filter" { Some(&t) } else { None };
                let Type::List(inner) = check::infer_context(xs, env, self.p, context)? else {
                    return Err("expected list".into());
                };
                let receiver = self.expr(xs, env, context)?;
                let Expr::Lambda(var, body) = &args[0] else {
                    return Err("missing lambda".into());
                };
                let mut local = env.clone();
                local.insert(var.clone(), *inner);
                let Type::List(output) = &t else {
                    return Err("expected list result".into());
                };
                let body = self.expr(
                    body,
                    &local,
                    Some(if n == "filter" { &Type::Bool } else { output }),
                )?;
                if n == "map" {
                    format!(
                        "({receiver}).into_iter().map(|l_{var}|{body}).collect::<Vec<{}>>()",
                        if **output == Type::U32 { "u32" } else { "u64" }
                    )
                } else {
                    format!("({receiver}).into_iter().filter(|ink_ref|{{let l_{var}=(*ink_ref).clone();{body}}}).collect::<Vec<_>>()")
                }
            }
            _ => return Err("unsupported pure Rust expression".into()),
        })
    }
}
pub fn body(p: &Program, f: &Function) -> LangResult<String> {
    Emitter { p, next: 0 }.expr(&f.body, &check::params_env(&f.params)?, Some(&f.result))
}
