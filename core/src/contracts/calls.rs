//! Conservative call-site preconditions for action bodies. Facts about state are
//! not carried across mutations; the caller must prove the condition for the
//! current state. Parameter facts survive only while their bindings are intact.
use super::*;
#[derive(Clone)]
pub(super) struct CallCondition {
    pub name: String,
    pub owner: String,
    pub params: Vec<(String, Type)>,
    pub conditions: Vec<Expr>,
    pub predicate: Expr,
    pub observations: Option<Vec<(String, Type, Expr)>>,
    pub guarantee: Option<ResultGuarantee>,
    pub requirement: Option<CallRequirement>,
    pub consumer: Option<usize>,
}
#[derive(Clone)]
pub(super) struct CallRequirement {
    pub site: usize,
    pub params: Vec<(String,Type)>,
    pub predicate: Expr,
}
#[derive(Clone)]
pub(super) struct ResultGuarantee {
    pub site: usize,
    pub callee: String,
    pub arguments: Vec<Expr>,
    pub ensure: Expr,
}
pub(super) fn actions(p: &Program) -> LangResult<Vec<CallCondition>> {
    let mut out = vec![];
    if !specifications(p)
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
        let owner = specification(p, &action.name);
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
                    typing.values.get(&(e as *const Expr as usize))
                        .ok_or("missing checked action binding type")?.clone()
                };
                facts.retain(|f| !crate::analysis::references_free(f, n));
                let previous=env.clone();env.insert(n.clone(), t.clone());
                binding_facts(p,&previous,n,&t,e,&mut facts,owner,serial,out)?;
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
    if let Some(checks) = callback_conditions(p, typing, e, env, facts, owner, *serial)? {
        *serial += checks.len();
        out.extend(checks);
        return Ok(());
    }
    // Only retain immutable parameter facts. Each occurrence receives a separate
    // source-derived obligation, even when the same specification is called twice.
    if let Expr::Let(name, annotation, value, body) = e {
        expression(p, typing, value, env, facts, owner, serial, out)?;
        let ty = if let Some(ty) = annotation {
            (**ty).clone()
        } else {
            typing.values.get(&(value.as_ref() as *const Expr as usize))
                .ok_or("missing checked action expression binding type")?.clone()
        };
        let mut local = env.clone();
        local.insert(name.clone(), ty);
        let mut facts = facts
            .iter()
            .filter(|f| !crate::analysis::references_free(f, name))
            .cloned()
            .collect::<Vec<_>>();
        binding_facts(p,env,name,&local[name],value,&mut facts,owner,serial,out)?;
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
        let Some(spec) = specification(p, name) else {
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
                    || p.states.iter().chain(&p.keeps).any(|s|s.name==fresh)
                    || crate::analysis::mentions_variable(predicate, &fresh)
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
                owner: owner.into(),
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
                observations: None,
                guarantee: None,
                requirement: Some(CallRequirement {site:e as *const Expr as usize,
                    params:spec.params.clone(),predicate:predicate.clone()}),
                consumer: None,
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

/// Reuse semantic callback domains for a pure subexpression. State slots are
/// observations, never inferred validity premises. The ghost query reads them
/// from its universally quantified current state; only the existing readonly
/// action rule may subsequently supply boundary invariants.
fn callback_conditions(
    p: &Program,
    typing: &crate::statecheck::Typing,
    e: &Expr,
    env: &crate::check::Env,
    facts: &[Expr],
    owner: &str,
    serial: usize,
) -> LangResult<Option<Vec<CallCondition>>> {
    let arguments = match e {
        Expr::Call(_, args) | Expr::Method(_, _, args) => args,
        _ => return Ok(None),
    };
    if !arguments.iter().any(|e| matches!(e, Expr::Lambda(..))) {
        return Ok(None);
    }
    let mut pure_env = env.clone();
    let mut global = BTreeSet::new();
    let mut observations = vec![];
    for state in p.states.iter().chain(&p.keeps) {
        if !pure_env.contains_key(&state.name)
            && (crate::analysis::references_free(e, &state.name)
                || facts
                    .iter()
                    .any(|f| crate::analysis::references_free(f, &state.name)))
        {
            pure_env.insert(state.name.clone(), state.ty.clone());
            global.insert(state.name.clone());
            observations.push((
                state.name.clone(),
                state.ty.clone(),
                Expr::Var(state.name.clone()),
            ));
        }
    }
    let mut captures = vec![];
    let mut occupied = BTreeSet::new();
    crate::analysis::walk(e, |e| match e {
        Expr::Var(n) | Expr::Lambda(n, _) | Expr::Let(n, _, _, _) => {
            occupied.insert(n.clone());
        }
        _ => (),
    });
    let Ok(value) = capture_queries(
        p,
        typing,
        e,
        &mut pure_env,
        &mut global,
        &mut observations,
        &mut captures,
        &occupied,
        0,
        0,
    ) else {
        return Ok(None);
    };
    let mut needed=crate::analysis::free_variables(&value);
    for fact in facts {needed.extend(crate::analysis::free_variables(fact));}
    // A captured query can depend on caller locals that disappear from the
    // reified pure predicate. Retain those inputs for its readonly observation.
    loop {
        let before=needed.len();
        for (name,_,expression) in &observations {
            if needed.contains(name) {
                needed.extend(crate::analysis::free_variables(expression).into_iter()
                    .filter(|n|env.contains_key(n)));
            }
        }
        if needed.len()==before {break;}
    }
    pure_env.retain(|name, _|needed.contains(name));
    observations.retain(|(name, _, _)| pure_env.contains_key(name));
    // Unsupported total-value correspondence retains the original, stronger
    // action obligation. It never becomes an assumed callback guarantee.
    let Ok(goals) = super::expression_obligations(p, &value, &pure_env, facts) else {
        return Ok(None);
    };
    if goals.is_empty() {
        return Ok(None);
    }
    let mut out = vec![];
    let mut next = serial;
    for capture in captures {
        expression(p, typing, capture, env, facts, owner, &mut next, &mut out)?;
    }
    for (index, goal) in goals.into_iter().enumerate() {
        let predicate = equation_expression(&goal.goal, p)?;
        let conditions = goal
            .conditions
            .iter()
            .map(|e| equation_expression(e, p))
            .collect::<LangResult<Vec<_>>>()?;
        let mut params = vec![];
        for (name, sort) in goal.params {
            if global.contains(&name) {
                continue;
            }
            let s::Sort::Value(ty) = sort else {
                return Ok(None);
            };
            if crate::local_collections::owned(&ty, p) {
                return Ok(None);
            }
            if crate::analysis::references_free(&predicate, &name)
                || observations.iter().any(|(_,_,e)|crate::analysis::references_free(e,&name))
                || conditions
                    .iter()
                    .any(|e| crate::analysis::references_free(e, &name))
            {
                params.push((name, ty));
            }
        }
        let consumer=params.iter().all(|(name,_)|env.contains_key(name))
            .then_some(e as *const Expr as usize);
        out.push(CallCondition {
            name: format!("{owner}:action-call:{}:requires", next + index),
            owner: owner.into(),
            params,
            conditions,
            predicate,
            observations: Some(observations.clone()),
            guarantee: None,
            requirement: None,
            consumer,
        });
    }
    Ok(Some(out))
}

/// A readonly call outside callbacks is one observation of the expression's
/// current state. Its own preconditions remain separate action obligations.
/// Dependent query calls inside callbacks retain the stronger legacy path until
/// their state-and-argument relation has a total pure correspondence.
fn capture_queries<'a>(
    p: &Program,
    typing: &crate::statecheck::Typing,
    e: &'a Expr,
    env: &mut crate::check::Env,
    global: &mut BTreeSet<String>,
    observations: &mut Vec<(String, Type, Expr)>,
    captures: &mut Vec<&'a Expr>,
    occupied: &BTreeSet<String>,
    scope: usize,
    depth: usize,
) -> LangResult<Expr> {
    if depth > 128 || observations.len() > 128 {
        return Err("action observation limit".into());
    }
    if let Expr::Method(receiver, name, args) = e {
        if let Expr::Var(root) = receiver.as_ref() {
            if (scope == 0 || args.iter().all(|e|crate::analysis::free_variables(e).is_empty()))
                && global.contains(root)
                && p.states.iter().any(|s| s.name == *root)
                && ["get", "contains", "values", "keys", "intersect_keys"].contains(&name.as_str())
                && args.iter().all(|e| crate::check::infer(e, env, p).is_ok())
            {
                let ty = typing
                    .values
                    .get(&(e as *const Expr as usize))
                    .ok_or("missing observation typing")?
                    .clone();
                let mut fresh = format!("__ink_observation_{}", observations.len());
                while env.contains_key(&fresh) || occupied.contains(&fresh) {
                    fresh.push('_')
                }
                env.insert(fresh.clone(), ty.clone());
                global.insert(fresh.clone());
                observations.push((fresh.clone(), ty, e.clone()));
                captures.push(e);
                return Ok(Expr::Var(fresh));
            }
        }
    }
    if let Expr::Call(name, args) = e {
        if let Some(action) = p.actions.iter().find(|a| &a.name == name) {
            if (scope != 0 && (!args.is_empty() || !unconditional_readonly(p,name)))
                || action.kind != ActionKind::Query
                || !action.writes.is_empty()
                || !action.emits.is_empty()
                || action.params.len() != args.len()
                || args
                    .iter()
                    .zip(&action.params)
                    .any(|(e, (_, ty))| crate::check::infer_as(e, env, p, ty).is_err())
            {
                return Err("action call lacks readonly total correspondence".into());
            }
            let mut fresh = format!("__ink_observation_{}", observations.len());
            while env.contains_key(&fresh) || occupied.contains(&fresh) {
                fresh.push('_')
            }
            env.insert(fresh.clone(), action.result.clone());
            global.insert(fresh.clone());
            observations.push((fresh.clone(), action.result.clone(), e.clone()));
            captures.push(e);
            return Ok(Expr::Var(fresh));
        }
    }
    let recurse = |e: &'a Expr,
                   env: &mut crate::check::Env,
                   global: &mut BTreeSet<String>,
                   observations: &mut Vec<(String, Type, Expr)>,
                   captures: &mut Vec<&'a Expr>,
                   scope| {
        capture_queries(
            p,
            typing,
            e,
            env,
            global,
            observations,
            captures,
            occupied,
            scope,
            depth + 1,
        )
    };
    if let Expr::Method(receiver, name, args) = e {
        if name == "unwrap_or" && args.len() == 1 {
            let receiver = recurse(receiver, env, global, observations, captures, scope)?;
            let fallback = recurse(&args[0], env, global, observations, captures, scope)?;
            let ty = typing
                .values
                .get(&(e as *const Expr as usize))
                .ok_or("missing fallback observation typing")?
                .clone();
            let fresh = |base: &str| {
                let mut n = base.to_owned();
                while env.contains_key(&n) || occupied.contains(&n) {
                    n.push('_')
                }
                n
            };
            let name = fresh("__ink_observation_fallback");
            let value = fresh("__ink_observation_value");
            let unit = fresh("__ink_observation_unit");
            // Action unwrap_or evaluates its fallback eagerly. Bind it outside
            // the variant fold, so its calls retain unconditional obligations.
            return Ok(Expr::Let(
                name.clone(),
                Some(Box::new(ty)),
                Box::new(fallback),
                Box::new(Expr::Method(
                    Box::new(receiver),
                    "fold".into(),
                    vec![
                        Expr::Lambda(value.clone(), Box::new(Expr::Var(value))),
                        Expr::Lambda(unit, Box::new(Expr::Var(name))),
                    ],
                )),
            ));
        }
    }
    Ok(match e {
        Expr::Lambda(n, body) => Expr::Lambda(
            n.clone(),
            Box::new(recurse(
                body,
                env,
                global,
                observations,
                captures,
                scope + 1,
            )?),
        ),
        Expr::Let(n, ty, value, body) => Expr::Let(
            n.clone(),
            ty.clone(),
            Box::new(recurse(value, env, global, observations, captures, scope)?),
            Box::new(recurse(
                body,
                env,
                global,
                observations,
                captures,
                scope + 1,
            )?),
        ),
        Expr::Neg(x) => Expr::Neg(Box::new(recurse(
            x,
            env,
            global,
            observations,
            captures,
            scope,
        )?)),
        Expr::Try(_) => return Err("fallible observation lacks total correspondence".into()),
        Expr::Field(x, n) => Expr::Field(
            Box::new(recurse(x, env, global, observations, captures, scope)?),
            n.clone(),
        ),
        Expr::Binary(n, a, b) => Expr::Binary(
            n.clone(),
            Box::new(recurse(a, env, global, observations, captures, scope)?),
            Box::new(recurse(
                b,
                env,
                global,
                observations,
                captures,
                scope + usize::from(n == "&&" || n == "||"),
            )?),
        ),
        Expr::Call(n, args) => Expr::Call(
            n.clone(),
            args.iter()
                .enumerate()
                .map(|(i, e)| {
                    recurse(
                        e,
                        env,
                        global,
                        observations,
                        captures,
                        scope + usize::from(n == "choose" && i > 0),
                    )
                })
                .collect::<LangResult<_>>()?,
        ),
        Expr::Method(x, n, args) => Expr::Method(
            Box::new(recurse(x, env, global, observations, captures, scope)?),
            n.clone(),
            args.iter()
                .map(|e| recurse(e, env, global, observations, captures, scope))
                .collect::<LangResult<_>>()?,
        ),
        Expr::Record(n, fields) => Expr::Record(
            n.clone(),
            fields
                .iter()
                .map(|(n, e)| {
                    Ok((
                        n.clone(),
                        recurse(e, env, global, observations, captures, scope)?,
                    ))
                })
                .collect::<LangResult<_>>()?,
        ),
        _ => e.clone(),
    })
}

/// State observations independent of callback binders may be sampled at entry
/// only when their complete source closure has no conditional call contracts.
/// Unknown/dependent/contract-bearing queries retain the stronger path. This
/// structural capability grants no rewrite or result guarantee by name.
fn unconditional_readonly(p:&Program,name:&str)->bool {
    let mut pending=vec![name.to_owned()];let mut seen=BTreeSet::new();
    while let Some(name)=pending.pop() {
        if !seen.insert(name.clone()){continue;}
        if let Some(spec)=specification(p,&name) {
            if spec.requires.iter().chain(&spec.ensures).any(|e|!matches!(e,Expr::Bool(true))) {return false;}
        }
        let mut expressions=vec![];
        if let Some(a)=p.actions.iter().find(|a|a.name==name) {
            if a.kind!=ActionKind::Query || !a.writes.is_empty() || !a.emits.is_empty(){return false;}
            let mut statements=a.body.iter().collect::<Vec<_>>();
            while let Some(s)=statements.pop() {
                match s {
                    Statement::Let(_,_,e)|Statement::Return(e)|Statement::Emit(_,e)|Statement::Expr(e)=>expressions.push(e),
                    Statement::If(e,yes,no)=>{expressions.push(e);statements.extend(yes);statements.extend(no);},
                }
            }
        } else if let Some(f)=p.functions.iter().find(|f|f.name==name) {
            expressions.push(&f.body);
        } else {continue;}
        for e in expressions {
            crate::analysis::walk(e,|e|if let Expr::Call(name,_)=e {
                if p.actions.iter().any(|a|a.name==*name) || p.functions.iter().any(|f|f.name==*name) {pending.push(name.clone());}
            });
        }
    }
    true
}
fn equation_expression(e: &Equation, p: &Program) -> LangResult<Expr> {
    let predicate = if e.to.node == s::Node::Bool(true) {
        e.from.clone()
    } else {
        s::op(
            s::value(Type::Bool),
            "value:equal",
            vec![e.from.clone(), e.to.clone()],
        )
    };
    s::reify(&predicate, p)
}

/// Immutable result-only guarantees can survive later writes. State observations
/// never become persistent facts: action clauses must typecheck as pure predicates
/// of the captured result and pure immutable arguments. The complete module
/// separately proves every callee postcondition and caller precondition.
fn binding_facts(
    p: &Program,
    env: &crate::check::Env,
    name: &str,
    ty: &Type,
    value: &Expr,
    facts: &mut Vec<Expr>,
    owner: &str,
    serial: &mut usize,
    out: &mut Vec<CallCondition>,
) -> LangResult<()> {
    if crate::analysis::references_free(value, name) || crate::local_collections::owned(ty, p) {
        return Ok(());
    }
    let pure = crate::check::infer_as(value, env, p, ty).is_ok();
    if pure {
        let bound = Expr::Var(name.into());
        let (left, right) = if *ty == Type::F32 {
            (
                Expr::Call("list".into(), vec![bound]),
                Expr::Call("list".into(), vec![value.clone()]),
            )
        } else {
            (bound, value.clone())
        };
        facts.push(Expr::Binary("==".into(), Box::new(left), Box::new(right)));
    }
    if let Expr::Call(callee, args) = value {
        if let Some(spec) = specification(p, callee) {
            if spec.result != *ty || spec.params.len() != args.len() {
                return Ok(());
            }
            if !pure
                && (spec.kind.is_none()
                    || spec
                        .params
                        .iter()
                        .zip(args)
                        .any(|((_, ty), arg)| crate::check::infer_as(arg, env, p, ty).is_err()))
            {
                return Ok(());
            }
            let predicate_env = spec
                .params
                .iter()
                .cloned()
                .chain(std::iter::once(("result".into(), ty.clone())))
                .collect();
            let mut names = BTreeMap::new();
            for (index, n) in spec
                .params
                .iter()
                .map(|(n, _)| n.as_str())
                .chain(std::iter::once("result"))
                .enumerate()
            {
                let mut fresh = format!("__ink_binding_{index}");
                while env.contains_key(&fresh)
                    || p.states.iter().chain(&p.keeps).any(|s|s.name==fresh)
                    || fresh == name
                    || spec
                        .ensures
                        .iter()
                        .chain(args)
                        .any(|e| crate::analysis::mentions_variable(e, &fresh))
                    || names.values().any(|n| n == &fresh)
                {
                    fresh.push('_')
                }
                names.insert(n.into(), fresh);
            }
            let prior = facts.clone();
            for (index, ensure) in spec.ensures.iter().enumerate() {
                if !pure && crate::check::infer_as(ensure, &predicate_env, p, &Type::Bool).is_err()
                {
                    continue;
                }
                if !pure && !matches!(ensure, Expr::Bool(true)) {
                    // Action guarantees may depend on boundary state invariants.
                    // Establish the exact result clause at this call before
                    // transporting it as an immutable captured-value fact.
                    out.push(CallCondition {
                        name: format!("{owner}:action-guarantee:{}:ensures:{index}", *serial),
                        owner: owner.into(),
                        params: env.iter().map(|(n, t)| (n.clone(), t.clone())).collect(),
                        conditions: prior.clone(),
                        predicate: Expr::Bool(true),
                        observations: None,
                        guarantee: Some(ResultGuarantee {
                            site: value as *const Expr as usize,
                            callee: callee.clone(),
                            arguments: args.clone(),
                            ensure: ensure.clone(),
                        }),
                        requirement: None,
                        consumer: None,
                    });
                    *serial += 1;
                }
                let mut predicate = crate::syntax::rename_expression(ensure, &names);
                predicate = Expr::Let(
                    names["result"].clone(),
                    Some(Box::new(ty.clone())),
                    Box::new(Expr::Var(name.into())),
                    Box::new(predicate),
                );
                for ((n, t), arg) in spec.params.iter().zip(args).rev() {
                    predicate = Expr::Let(
                        names[n].clone(),
                        Some(Box::new(t.clone())),
                        Box::new(arg.clone()),
                        Box::new(predicate),
                    )
                }
                facts.push(predicate);
            }
        }
    }
    if facts.len() > 1024 {
        return Err("action contract fact count limit".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn callback_consumers_keep_state_observations_out_of_lexical_parameters() {
        let p=crate::syntax::parse(include_str!("../../tests/fixtures/action-callback-values.ink")).unwrap();
        let goals=actions(&p).unwrap();
        for g in goals.iter().filter(|g|g.owner=="current") {
            assert!(g.consumer.is_some(),"params={:?}, observations={:?}",g.params,g.observations);
            assert!(g.params.is_empty(),"{:?}",g.params);
        }
    }
    #[test]
    fn closed_state_reads_inside_callbacks_keep_the_consumer_entry_site() {
        let p=crate::syntax::parse("module entry;private state Counter:u32=1;
         spec fn read(x:u32,c:u32)->u32 requires c>0;ensures result==x;
         implementation body for read{return x;}
         change repair(xs:List<u32>)->Result<Unit,String> writes(Counter){Counter=2;
          let values=xs.map(fn(x)=>read(x,Counter));return Ok(());}").unwrap();
        for g in actions(&p).unwrap().iter().filter(|g|g.owner=="repair") {
            assert!(g.consumer.is_some(),"params={:?}, observations={:?}",g.params,g.observations);
        }
    }
    #[test]
    fn action_domains_remove_callback_parameters_before_transition_projection() {
        let p = crate::syntax::parse(include_str!(
            "../../tests/fixtures/action-callback-values.ink"
        ))
        .unwrap();
        let conditions = actions(&p).unwrap();
        for owner in ["items", "current", "maybe", "either", "store", "abort"] {
            let goals = conditions
                .iter()
                .filter(|g| g.owner == owner)
                .collect::<Vec<_>>();
            assert!(!goals.is_empty());
            assert!(goals.iter().all(|g| g.observations.is_some()), "{owner}");
            assert!(
                goals.iter().all(|g| !g.params.iter().any(|(n, _)| n == "x"
                    || (n == "v" && !["maybe", "either"].contains(&owner))
                    || n.starts_with("__contract_binder"))),
                "{owner}"
            );
        }
    }
}
