//! Conservative call-site preconditions for action bodies. Facts about state are
//! not carried across mutations; the caller must prove the condition for the
//! current state. Parameter facts survive only while their bindings are intact.
use super::*;
#[derive(Clone)]
pub(super) struct CallCondition {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub conditions: Vec<Expr>,
    pub predicate: Expr,
}
pub(super) fn actions(p: &Program) -> LangResult<Vec<CallCondition>> {
    let mut out = vec![];
    if !p
        .contracts
        .specifications
        .iter()
        .any(|s| !s.requires.is_empty())
    {
        return Ok(out);
    }
    let keep_actions = p
        .keeps
        .iter()
        .map(|keep| Action {
            name: format!("keep:{}", keep.name),
            kind: ActionKind::Query,
            params: vec![],
            result: keep.ty.clone(),
            reads: p
                .states
                .iter()
                .chain(&p.keeps)
                .map(|d| d.name.clone())
                .collect(),
            writes: vec![],
            emits: vec![],
            body: vec![Statement::Return(keep.value.clone())],
        })
        .collect::<Vec<_>>();
    for action in p.actions.iter().chain(&keep_actions) {
        let owner = p.contracts.specifications.iter().find(|s| {
            s.name == action.name
                || p.contracts
                    .implementations
                    .iter()
                    .any(|i| i.name == action.name && i.specification == s.name)
        });
        let env = crate::check::params_env(&action.params)?;
        let facts = owner
            .map(|s| {
                s.requires
                    .iter()
                    .filter(|e| crate::check::infer_as(e, &env, p, &Type::Bool).is_ok())
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();
        let typing = crate::statecheck::action_typing(p, action)?;
        block(
            p,
            &typing,
            &action.body,
            &env,
            &facts,
            &action.name,
            &mut 0,
            &mut out,
        )?;
    }
    Ok(out)
}
fn block(
    p: &Program,
    typing: &crate::statecheck::Typing,
    body: &[Statement],
    env: &crate::check::Env,
    facts: &Vec<Expr>,
    owner: &str,
    serial: &mut usize,
    out: &mut Vec<CallCondition>,
) -> LangResult<()> {
    let mut env = env.clone();
    let mut facts = facts.clone();
    for s in body {
        match s {
            Statement::Let(n, ty, e) => {
                expression(p, typing, e, &env, &facts, owner, serial, out)?;
                let t = if let Some(t) = ty {
                    t.clone()
                } else {
                    crate::statecheck::expression_type(p, e, &env)?
                };
                facts.retain(|f| !crate::analysis::references_free(f, n));
                env.insert(n.clone(), t);
            }
            Statement::Return(e) | Statement::Emit(_, e) | Statement::Expr(e) => {
                expression(p, typing, e, &env, &facts, owner, serial, out)?
            }
            Statement::If(e, yes, no) => {
                expression(p, typing, e, &env, &facts, owner, serial, out)?;
                let pure = crate::check::infer_as(e, &env, p, &Type::Bool).is_ok();
                let mut a = facts.clone();
                let mut b = facts.clone();
                if pure {
                    a.push(e.clone());
                    b.push(Expr::Binary(
                        "==".into(),
                        Box::new(e.clone()),
                        Box::new(Expr::Bool(false)),
                    ));
                }
                block(p, typing, yes, &env, &a, owner, serial, out)?;
                block(p, typing, no, &env, &b, owner, serial, out)?;
            }
        }
    }
    Ok(())
}
fn expression(
    p: &Program,
    typing: &crate::statecheck::Typing,
    e: &Expr,
    env: &crate::check::Env,
    facts: &[Expr],
    owner: &str,
    serial: &mut usize,
    out: &mut Vec<CallCondition>,
) -> LangResult<()> {
    // Only retain immutable parameter facts. Each occurrence receives a separate
    // source-derived obligation, even when the same specification is called twice.
    if let Expr::Let(name, annotation, value, body) = e {
        expression(p, typing, value, env, facts, owner, serial, out)?;
        let ty = if let Some(ty) = annotation {
            (**ty).clone()
        } else {
            crate::statecheck::expression_type(p, value, env)?
        };
        let mut local = env.clone();
        local.insert(name.clone(), ty);
        let facts = facts
            .iter()
            .filter(|f| !crate::analysis::references_free(f, name))
            .cloned()
            .collect::<Vec<_>>();
        return expression(p, typing, body, &local, &facts, owner, serial, out);
    }
    if let Expr::Lambda(name, body) = e {
        // Use the checker's lexical callback type, never an outer binding's facts.
        let (parameter, _) = typing
            .lambdas
            .get(&(e as *const Expr as usize))
            .ok_or("missing contract callback typing")?;
        let mut local = env.clone();
        local.insert(name.clone(), parameter.clone());
        let facts = facts
            .iter()
            .filter(|f| !crate::analysis::references_free(f, name))
            .cloned()
            .collect::<Vec<_>>();
        return expression(p, typing, body, &local, &facts, owner, serial, out);
    }
    if let Expr::Call(name, args) = e {
        if name == "choose"
            && args.len() == 3
            && crate::check::infer_as(&args[0], env, p, &Type::Bool).is_ok()
        {
            expression(p, typing, &args[0], env, facts, owner, serial, out)?;
            for (branch, flag) in [(1, true), (2, false)] {
                let mut local = facts.to_vec();
                local.push(if flag {
                    args[0].clone()
                } else {
                    Expr::Binary(
                        "==".into(),
                        Box::new(args[0].clone()),
                        Box::new(Expr::Bool(false)),
                    )
                });
                expression(p, typing, &args[branch], env, &local, owner, serial, out)?;
            }
            return Ok(());
        }
    }
    if let Expr::Binary(op, a, b) = e {
        if (op == "&&" || op == "||") && crate::check::infer_as(a, env, p, &Type::Bool).is_ok() {
            expression(p, typing, a, env, facts, owner, serial, out)?;
            let mut local = facts.to_vec();
            local.push(if op == "&&" {
                (**a).clone()
            } else {
                Expr::Binary("==".into(), a.clone(), Box::new(Expr::Bool(false)))
            });
            return expression(p, typing, b, env, &local, owner, serial, out);
        }
    }
    let calls = if let Expr::Call(name, args) = e {
        vec![(name, args)]
    } else {
        vec![]
    };
    for (name, args) in calls {
        let Some(spec) = p.contracts.specifications.iter().find(|s| {
            &s.name == name
                || p.contracts
                    .implementations
                    .iter()
                    .any(|i| &i.name == name && i.specification == s.name)
        }) else {
            continue;
        };
        for predicate in &spec.requires {
            let mut value = predicate.clone();
            // Simultaneous, capture-avoiding substitution by lexical Let bindings.
            // Reject argument captures by formal names rather than reinterpret them.
            let mut names = BTreeMap::new();
            for (i, (n, _)) in spec.params.iter().enumerate() {
                let mut fresh = format!("__ink_call_{}_{}", *serial, i);
                while env.contains_key(&fresh)
                    || crate::analysis::references_free(predicate, &fresh)
                {
                    fresh.push('_');
                }
                names.insert(n.clone(), fresh);
            }
            value = crate::syntax::rename_expression(&value, &names);
            for ((n, t), arg) in spec.params.iter().zip(args).rev() {
                value = Expr::Let(
                    names[n].clone(),
                    Some(Box::new(t.clone())),
                    Box::new(arg.clone()),
                    Box::new(value),
                );
            }
            out.push(CallCondition {
                name: format!("{owner}:action-call:{}:requires", *serial),
                params: env
                    .iter()
                    .filter(|(n, _)| {
                        crate::analysis::references_free(&value, n)
                            || facts.iter().any(|f| crate::analysis::references_free(f, n))
                    })
                    .map(|(n, t)| (n.clone(), t.clone()))
                    .collect(),
                conditions: facts.to_vec(),
                predicate: value,
            });
            *serial += 1;
        }
    }
    match e {
        Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => {
            expression(p, typing, x, env, facts, owner, serial, out)?
        }
        Expr::Binary(_, a, b) => {
            expression(p, typing, a, env, facts, owner, serial, out)?;
            expression(p, typing, b, env, facts, owner, serial, out)?;
        }
        Expr::Call(_, args) => {
            for arg in args {
                expression(p, typing, arg, env, facts, owner, serial, out)?;
            }
        }
        Expr::Method(receiver, _, args) => {
            expression(p, typing, receiver, env, facts, owner, serial, out)?;
            for arg in args {
                expression(p, typing, arg, env, facts, owner, serial, out)?;
            }
        }
        Expr::Record(_, fields) => {
            for (_, value) in fields {
                expression(p, typing, value, env, facts, owner, serial, out)?;
            }
        }
        _ => (),
    }
    Ok(())
}
