//! Source-level record abstraction. Access origins survive specialisation and
//! disappear before executable encoding. They grant no invariant or rewrite.
use crate::{
    core::{Expr, Function, Program, Statement, Type},
    LangResult,
};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

fn expressions(p: &Program, mut visit: impl FnMut(&Expr)) {
    fn block(body: &[Statement], visit: &mut impl FnMut(&Expr)) {
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Expr(e)
                | Statement::Emit(_, e) => visit(e),
                Statement::If(e, a, b) => {
                    visit(e);
                    block(a, visit);
                    block(b, visit);
                }
            }
        }
    }
    for f in &p.functions {
        visit(&f.body);
    }
    for a in &p.actions {
        block(&a.body, &mut visit);
    }
    for d in p.states.iter().chain(&p.keeps) {
        visit(&d.value);
    }
    for r in &p.rules {
        visit(&r.from);
        visit(&r.to);
    }
    for spec in &p.contracts.specifications {
        for e in spec.requires.iter().chain(&spec.ensures) {
            visit(e);
        }
    }
    for e in p
        .contracts
        .invariants
        .iter()
        .chain(p.contracts.value_invariants.values())
    {
        visit(e);
    }
}
fn mutate(p: &mut Program, visit: &mut impl FnMut(&mut Expr) -> LangResult<()>) -> LangResult<()> {
    fn block(
        body: &mut [Statement],
        visit: &mut impl FnMut(&mut Expr) -> LangResult<()>,
    ) -> LangResult<()> {
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Expr(e)
                | Statement::Emit(_, e) => visit(e)?,
                Statement::If(e, a, b) => {
                    visit(e)?;
                    block(a, visit)?;
                    block(b, visit)?;
                }
            }
        }
        Ok(())
    }
    for f in &mut p.functions {
        visit(&mut f.body)?;
    }
    for a in &mut p.actions {
        block(&mut a.body, visit)?;
    }
    for d in p.states.iter_mut().chain(&mut p.keeps) {
        visit(&mut d.value)?;
    }
    for r in &mut p.rules {
        visit(&mut r.from)?;
        visit(&mut r.to)?;
    }
    for spec in &mut p.contracts.specifications {
        for e in spec.requires.iter_mut().chain(&mut spec.ensures) {
            visit(e)?;
        }
    }
    for e in p
        .contracts
        .invariants
        .iter_mut()
        .chain(p.contracts.value_invariants.values_mut())
    {
        visit(e)?;
    }
    Ok(())
}
fn map(
    e: &mut Expr,
    depth: usize,
    visit: &mut impl FnMut(&mut Expr) -> LangResult<()>,
) -> LangResult<()> {
    if depth > 256 {
        return Err("source abstraction depth limit".into());
    }
    match e {
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
            map(a, depth + 1, visit)?;
            map(b, depth + 1, visit)?;
        }
        Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Try(b) | Expr::Field(b, _) => {
            map(b, depth + 1, visit)?
        }
        Expr::Call(_, args) => {
            for e in args {
                map(e, depth + 1, visit)?;
            }
        }
        Expr::Method(e, _, args) => {
            map(e, depth + 1, visit)?;
            for e in args {
                map(e, depth + 1, visit)?;
            }
        }
        Expr::Record(_, fields) => {
            for (_, e) in fields {
                map(e, depth + 1, visit)?;
            }
        }
        _ => (),
    }
    visit(e)
}

pub(crate) fn mark(
    p: &mut Program,
    origins: &mut BTreeMap<String, String>,
    avoid: &BTreeSet<String>,
) -> LangResult<()> {
    let mut occupied = avoid.clone();
    occupied.extend(
        p.records
            .keys()
            .chain(p.enums.keys())
            .chain(p.events.keys())
            .cloned(),
    );
    occupied.extend(p.ids.iter().cloned());
    occupied.extend(
        p.functions
            .iter()
            .map(|f| f.name.clone())
            .chain(p.actions.iter().map(|a| a.name.clone())),
    );
    occupied.extend(p.states.iter().chain(&p.keeps).map(|d| d.name.clone()));
    occupied.extend(
        p.functions
            .iter()
            .flat_map(|f| f.params.iter().map(|(n, _)| n.clone()))
            .chain(
                p.actions
                    .iter()
                    .flat_map(|a| a.params.iter().map(|(n, _)| n.clone())),
            ),
    );
    expressions(p, |e| {
        crate::analysis::walk(e, |e| match e {
            Expr::Var(n) | Expr::Lambda(n, _) | Expr::Call(n, _) => {
                occupied.insert(n.clone());
            }
            Expr::Let(n, _, _, _) if !origins.contains_key(n) => {
                occupied.insert(n.clone());
            }
            _ => (),
        })
    });
    // Rebase parser-created markers against every module's source names before
    // callbacks can be moved between modules. Hash spelling never grants scope.
    let mut renames = BTreeMap::new();
    for name in origins.keys() {
        let mut fresh = name.clone();
        while occupied.contains(&fresh) {
            fresh.push('_');
        }
        occupied.insert(fresh.clone());
        renames.insert(name.clone(), fresh);
    }
    mutate(p, &mut |e| {
        map(e, 0, &mut |e| {
            if let Expr::Let(name, _, _, _) = e {
                if let Some(fresh) = renames.get(name) {
                    *name = fresh.clone();
                }
            }
            Ok(())
        })
    })?;
    *origins = std::mem::take(origins)
        .into_iter()
        .map(|(name, scope)| (renames[&name].clone(), scope))
        .collect();
    let scope = p.module.clone();
    let marker = if let Some((name, _)) = origins.iter().find(|(_, owner)| *owner == &scope) {
        name.clone()
    } else {
        let mut name = format!("__ink_origin_{:x}", Sha256::digest(scope.as_bytes()));
        while occupied.contains(&name) {
            name.push('_');
        }
        origins.insert(name.clone(), scope);
        name
    };
    fn annotate(
        e: &mut Expr,
        origins: &BTreeMap<String, String>,
        marker: &str,
        depth: usize,
    ) -> LangResult<()> {
        if depth > 256 {
            return Err("source origin depth limit".into());
        }
        if matches!(e,Expr::Let(name,_,_,_) if origins.contains_key(name)) {
            return Ok(());
        }
        match e {
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
                annotate(a, origins, marker, depth + 1)?;
                annotate(b, origins, marker, depth + 1)?;
            }
            Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Try(b) | Expr::Field(b, _) => {
                annotate(b, origins, marker, depth + 1)?
            }
            Expr::Call(_, args) => {
                for e in args {
                    annotate(e, origins, marker, depth + 1)?;
                }
            }
            Expr::Method(e, _, args) => {
                annotate(e, origins, marker, depth + 1)?;
                for e in args {
                    annotate(e, origins, marker, depth + 1)?;
                }
            }
            Expr::Record(_, fields) => {
                for (_, e) in fields {
                    annotate(e, origins, marker, depth + 1)?;
                }
            }
            _ => (),
        }
        if matches!(e, Expr::Field(..) | Expr::Record(..)) {
            let body = std::mem::replace(e, Expr::Unit);
            *e = Expr::Let(
                marker.into(),
                Some(Box::new(Type::Unit)),
                Box::new(Expr::Unit),
                Box::new(body),
            );
        }
        Ok(())
    }
    mutate(p, &mut |e| annotate(e, origins, &marker, 0))
}

fn access<'a>(e: &'a Expr, origins: &'a BTreeMap<String, String>) -> Option<(&'a str, &'a Expr)> {
    if let Expr::Let(name, _, _, body) = e {
        origins
            .get(name)
            .map(|origin| (origin.as_str(), body.as_ref()))
    } else {
        None
    }
}
fn owner<'a>(
    e: &Expr,
    ty: Option<&Type>,
    opaque: &'a BTreeMap<String, String>,
) -> Option<(&'a str, &'a str)> {
    let name = match e {
        Expr::Record(name, _) => Some(name),
        Expr::Field(..) => match ty {
            Some(Type::Named(name)) => Some(name),
            _ => None,
        },
        _ => None,
    }?;
    opaque
        .get_key_value(name)
        .map(|(name, owner)| (name.as_str(), owner.as_str()))
}
fn permitted(
    e: &Expr,
    ty: Option<&Type>,
    origin: &str,
    opaque: &BTreeMap<String, String>,
) -> LangResult<()> {
    if let Some((name, owner)) = owner(e, ty, opaque) {
        if owner != origin {
            return Err(format!(
                "abstract record {name}: representation access outside its defining module"
            ));
        }
    }
    Ok(())
}

fn inspect(
    p: &Program,
    f: &Function,
    opaque: &BTreeMap<String, String>,
    origins: &BTreeMap<String, String>,
) -> LangResult<()> {
    let mut expected = BTreeSet::new();
    crate::analysis::walk(&f.body, |e| {
        if access(e, origins).is_some() {
            expected.insert(e as *const Expr as usize);
        }
    });
    if expected.is_empty() {
        return Ok(());
    }
    let mut checked = BTreeSet::new();
    let mut error = None;
    let walk = crate::analysis::typed_walk(p, f, |e, env| {
        if error.is_some() {
            return;
        }
        if let Some((origin, body)) = access(e, origins) {
            let ty = match body {
                Expr::Field(receiver, _) => {
                    if matches!(receiver.as_ref(),Expr::Var(name) if p.enums.contains_key(name) && !env.contains_key(name))
                    {
                        None
                    } else {
                        match crate::check::infer(receiver, env, p) {
                            Ok(ty) => Some(ty),
                            Err(_) => return,
                        }
                    }
                }
                _ => None,
            };
            if let Err(e) = permitted(body, ty.as_ref(), origin, opaque) {
                error = Some(e);
            }
            checked.insert(e as *const Expr as usize);
        }
    });
    if let Some(error) = error {
        return Err(error);
    }
    walk?;
    if checked != expected {
        return Err(format!(
            "{}: unresolved abstract access callback scope",
            f.name
        ));
    }
    Ok(())
}
fn inspect_state(
    p: &Program,
    e: &Expr,
    types: &BTreeMap<usize, Type>,
    opaque: &BTreeMap<String, String>,
    origins: &BTreeMap<String, String>,
) -> LangResult<()> {
    let mut error = None;
    crate::analysis::walk(e, |e| {
        if error.is_some() {
            return;
        }
        if let Some((origin, body)) = access(e, origins) {
            let ty = if let Expr::Field(receiver, _) = body {
                types.get(&(receiver.as_ref() as *const Expr as usize))
            } else {
                None
            };
            if matches!(body, Expr::Field(..)) && ty.is_none() {
                if !matches!(body,Expr::Field(receiver,_) if matches!(receiver.as_ref(),Expr::Var(name) if p.enums.contains_key(name)))
                {
                    error = Some("unresolved abstract state access type".into());
                    return;
                }
            }
            if let Err(e) = permitted(body, ty, origin, opaque) {
                error = Some(e);
            }
        }
    });
    error.map_or(Ok(()), Err)
}

pub(crate) fn check_and_strip(
    p: &mut Program,
    opaque: &BTreeMap<String, String>,
    origins: &BTreeMap<String, String>,
) -> LangResult<()> {
    if !opaque.is_empty() {
        for f in &p.functions {
            inspect(p, f, opaque, origins)?;
        }
        for a in &p.actions {
            let types = crate::statecheck::action_typing(p, a)?;
            fn block(
                p: &Program,
                body: &[Statement],
                types: &BTreeMap<usize, Type>,
                opaque: &BTreeMap<String, String>,
                origins: &BTreeMap<String, String>,
            ) -> LangResult<()> {
                for s in body {
                    match s {
                        Statement::Let(_, _, e)
                        | Statement::Return(e)
                        | Statement::Expr(e)
                        | Statement::Emit(_, e) => inspect_state(p, e, types, opaque, origins)?,
                        Statement::If(e, a, b) => {
                            inspect_state(p, e, types, opaque, origins)?;
                            block(p, a, types, opaque, origins)?;
                            block(p, b, types, opaque, origins)?;
                        }
                    }
                }
                Ok(())
            }
            block(p, &a.body, &types.values, opaque, origins)?;
        }
        for d in p.states.iter().chain(&p.keeps) {
            let f = Function {
                name: d.name.clone(),
                params: vec![],
                result: d.ty.clone(),
                body: d.value.clone(),
            };
            if let Err(pure_error) = inspect(p, &f, opaque, origins) {
                let typing = crate::statecheck::keep_typing(p, d).map_err(|_| pure_error)?;
                inspect_state(p, &d.value, &typing.values, opaque, origins)?;
            }
        }
        // Before is a same-typed logical observation. Removing it here is only
        // for access typing; the actual contract semantics are checked later.
        let predicate = |e: &Expr, params: Vec<(String, Type)>| -> LangResult<()> {
            let mut e = e.clone();
            map(&mut e, 0, &mut |e| {
                if let Expr::Call(name, args) = e {
                    if name == "before" && args.len() == 1 {
                        *e = args.remove(0);
                    }
                }
                Ok(())
            })?;
            let f = Function {
                name: "abstract predicate".into(),
                params,
                result: Type::Bool,
                body: e,
            };
            if inspect(p, &f, opaque, origins).is_ok() {
                return Ok(());
            }
            let a = crate::core::Action {
                name: f.name.clone(),
                kind: crate::core::ActionKind::Query,
                params: f.params.clone(),
                result: Type::Bool,
                reads: p
                    .states
                    .iter()
                    .chain(&p.keeps)
                    .map(|d| d.name.clone())
                    .collect(),
                writes: vec![],
                emits: vec![],
                body: vec![Statement::Return(f.body)],
            };
            let typing = crate::statecheck::action_typing(p, &a)?;
            if let Statement::Return(e) = &a.body[0] {
                inspect_state(p, e, &typing.values, opaque, origins)?;
            }
            Ok(())
        };
        for spec in &p.contracts.specifications {
            for e in &spec.requires {
                predicate(e, spec.params.clone())?;
            }
            for e in &spec.ensures {
                let mut params = spec.params.clone();
                params.push(("result".into(), spec.result.clone()));
                predicate(e, params)?;
            }
        }
        for e in &p.contracts.invariants {
            predicate(e, vec![])?;
        }
        for (name, e) in &p.contracts.value_invariants {
            predicate(e, vec![("value".into(), Type::Named(name.clone()))])?;
        }
        for r in &p.rules {
            inspect(
                p,
                &Function {
                    name: r.name.clone(),
                    params: r.params.clone(),
                    result: crate::check::infer(&r.from, &crate::check::params_env(&r.params)?, p)?,
                    body: r.from.clone(),
                },
                opaque,
                origins,
            )?;
            inspect(
                p,
                &Function {
                    name: r.name.clone(),
                    params: r.params.clone(),
                    result: crate::check::infer(&r.to, &crate::check::params_env(&r.params)?, p)?,
                    body: r.to.clone(),
                },
                opaque,
                origins,
            )?;
        }
        let constructors: BTreeSet<_> = p
            .contracts
            .value_invariants
            .keys()
            .filter(|name| opaque.contains_key(*name))
            .map(|name| format!("__ink_construct_{:x}", Sha256::digest(name.as_bytes())))
            .collect();
        let mut forged = false;
        expressions(p, |e| {
            crate::analysis::walk(e, |e| {
                forged |= matches!(e,Expr::Call(name,_) if constructors.contains(name));
            })
        });
        if forged {
            return Err(
                "abstract record constructors must use the declared source interface".into(),
            );
        }
    }
    mutate(p, &mut |e| {
        map(e, 0, &mut |e| {
            if let Expr::Let(name, annotation, value, body) = e {
                if origins.contains_key(name) {
                    if annotation.as_deref() != Some(&Type::Unit) || value.as_ref() != &Expr::Unit {
                        return Err("invalid source access origin".into());
                    }
                    *e = std::mem::replace(body, Box::new(Expr::Unit))
                        .as_ref()
                        .clone();
                }
            }
            Ok(())
        })
    })
}
