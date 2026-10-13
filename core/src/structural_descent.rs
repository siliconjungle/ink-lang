//! Descent through immutable finite values. A projection is a proper subvalue;
//! aliases retain that relation, constructors and unknown calls do not. This
//! rule concerns value structure, independent of source datatype names/layouts.
use crate::{
    check,
    syntax::{Expr, Function, Program, Type},
    LangResult,
};
use std::collections::BTreeMap;

#[derive(Clone)]
struct Value {
    ty: Type,
    descendant: Option<bool>,
}
fn unknown(ty: Type) -> Value {
    Value {
        ty,
        descendant: None,
    }
}
fn child(ty: Type, parent: &Value) -> Value {
    Value {
        ty,
        descendant: parent.descendant.map(|_| true),
    }
}
fn common(a: Value, b: Value) -> Value {
    Value {
        ty: a.ty,
        descendant: match (a.descendant, b.descendant) {
            (Some(a), Some(b)) => Some(a && b),
            _ => None,
        },
    }
}
struct Walk<'a> {
    program: &'a Program,
    function: &'a Function,
    index: usize,
    work: usize,
}
impl Walk<'_> {
    fn callback(
        &mut self,
        e: &Expr,
        inputs: &[Value],
        env: &BTreeMap<String, Value>,
        depth: usize,
    ) -> LangResult<Value> {
        let Some((first, rest)) = inputs.split_first() else {
            return self.expression(e, env, depth + 1);
        };
        let Expr::Lambda(name, body) = e else {
            // A named callback remains independently checked. We do not infer
            // a subvalue relation across an opaque helper boundary.
            self.expression(e, env, depth + 1)?;
            return Ok(unknown(Type::Unit));
        };
        let mut local = env.clone();
        local.insert(name.clone(), first.clone());
        self.callback(body, rest, &local, depth + 1)
    }
    fn expression(
        &mut self,
        e: &Expr,
        env: &BTreeMap<String, Value>,
        depth: usize,
    ) -> LangResult<Value> {
        if depth > 128 || self.work == 0 {
            return Err("structural descent resource limit".into());
        }
        self.work -= 1;
        let types = || env.iter().map(|(n, v)| (n.clone(), v.ty.clone())).collect();
        Ok(match e {
            Expr::Var(name) => env.get(name).cloned().unwrap_or(unknown(Type::Unit)),
            Expr::Field(base, name) => {
                let base = self.expression(base, env, depth + 1)?;
                let Type::Named(record) = &base.ty else {
                    return Err("structural descent field type".into());
                };
                let ty = self
                    .program
                    .records
                    .get(record)
                    .and_then(|fs| fs.iter().find(|(n, _)| n == name))
                    .ok_or("structural descent field missing")?
                    .1
                    .clone();
                child(ty, &base)
            }
            Expr::Let(name, annotation, initial, body) => {
                let mut value = self.expression(initial, env, depth + 1)?;
                if let Some(ty) = annotation {
                    value.ty = *ty.clone();
                }
                let mut local = env.clone();
                local.insert(name.clone(), value);
                self.expression(body, &local, depth + 1)?
            }
            Expr::Call(name, args) if name == &self.function.name => {
                let mut values = vec![];
                for arg in args {
                    values.push(self.expression(arg, env, depth + 1)?);
                }
                if values.get(self.index).and_then(|v| v.descendant) != Some(true) {
                    return Err("recursive call is not on a proper structural subvalue".into());
                }
                unknown(self.function.result.clone())
            }
            Expr::Call(name, args) if name == "choose" && args.len() == 3 => {
                self.expression(&args[0], env, depth + 1)?;
                let left = self.expression(&args[1], env, depth + 1)?;
                let right = self.expression(&args[2], env, depth + 1)?;
                common(left, right)
            }
            Expr::Call(name, args)
                if ["foldl", "foldr"].contains(&name.as_str()) && args.len() == 3 =>
            {
                let list = self.expression(&args[0], env, depth + 1)?;
                let initial = self.expression(&args[1], env, depth + 1)?;
                let Type::List(item) = &list.ty else {
                    return Err("structural descent fold input".into());
                };
                self.callback(
                    &args[2],
                    &[child(*item.clone(), &list), unknown(initial.ty.clone())],
                    env,
                    depth + 1,
                )?;
                unknown(initial.ty)
            }
            Expr::Method(receiver, name, args) => {
                let receiver = self.expression(receiver, env, depth + 1)?;
                match (&receiver.ty, name.as_str(), args.as_slice()) {
                    (Type::Option(item), "fold", [yes, no]) => {
                        let left =
                            self.callback(yes, &[child(*item.clone(), &receiver)], env, depth + 1)?;
                        let right = self.callback(no, &[unknown(Type::Unit)], env, depth + 1)?;
                        common(left, right)
                    }
                    (Type::Result(ok, error), "fold", [yes, no]) => {
                        let left =
                            self.callback(yes, &[child(*ok.clone(), &receiver)], env, depth + 1)?;
                        let right =
                            self.callback(no, &[child(*error.clone(), &receiver)], env, depth + 1)?;
                        common(left, right)
                    }
                    (Type::List(item), "map" | "filter" | "map_parallel", [callback]) => {
                        let result = self.callback(
                            callback,
                            &[child(*item.clone(), &receiver)],
                            env,
                            depth + 1,
                        )?;
                        unknown(Type::List(Box::new(if name == "filter" {
                            *item.clone()
                        } else {
                            result.ty
                        })))
                    }
                    _ => {
                        for arg in args {
                            self.expression(arg, env, depth + 1)?;
                        }
                        unknown(check::infer(e, &types(), self.program).unwrap_or(Type::Unit))
                    }
                }
            }
            // Unvisited lambda domains cannot certify recursive arguments.
            Expr::Lambda(name, body) => {
                let mut local = env.clone();
                local.insert(name.clone(), unknown(Type::Unit));
                self.expression(body, &local, depth + 1)?;
                unknown(Type::Unit)
            }
            _ => {
                for child in crate::analysis::children(e) {
                    self.expression(child, env, depth + 1)?;
                }
                unknown(check::infer(e, &types(), self.program).unwrap_or(Type::Unit))
            }
        })
    }
}
pub(crate) fn check(function: &Function, program: &Program) -> LangResult<()> {
    for (index, (_, ty)) in function.params.iter().enumerate() {
        if !matches!(
            ty,
            Type::Named(_) | Type::List(_) | Type::Option(_) | Type::Result(..)
        ) {
            continue;
        }
        let env = function
            .params
            .iter()
            .enumerate()
            .map(|(i, (n, t))| {
                (
                    n.clone(),
                    Value {
                        ty: t.clone(),
                        descendant: if i == index { Some(false) } else { None },
                    },
                )
            })
            .collect();
        if (Walk {
            program,
            function,
            index,
            work: 50_000,
        })
        .expression(&function.body, &env, 0)
        .is_ok()
        {
            return Ok(());
        }
    }
    Err("no structural parameter decreases at every recursive call".into())
}
