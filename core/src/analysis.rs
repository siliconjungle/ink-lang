//! Shared structural and lexical analysis. This module grants no rewrite authority.
use crate::core::{Expr,Type,Program};
use std::collections::{BTreeMap,BTreeSet};

/// Immediate children in source evaluation order. Exhaustive over executable IR.
pub fn children(e: &Expr) -> Vec<&Expr> {
    match e {
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => vec![a, b],
        Expr::Lambda(_, a) | Expr::Neg(a) | Expr::Field(a, _) | Expr::Try(a) => vec![a],
        Expr::Call(_, args) => args.iter().collect(),
        Expr::Method(receiver, _, args) => std::iter::once(receiver.as_ref()).chain(args).collect(),
        Expr::Record(_, fields) => fields.iter().map(|(_, e)| e).collect(),
        Expr::Num(_)
        | Expr::Float(_)
        | Expr::Bool(_)
        | Expr::String(_)
        | Expr::Unit
        | Expr::Var(_) => vec![],
    }
}

/// Iterative traversal: source nesting cannot exhaust the analysis call stack.
pub fn walk(e: &Expr, mut visit: impl FnMut(&Expr)) {
    let mut pending = vec![e];
    while let Some(e) = pending.pop() {
        visit(e);
        pending.extend(children(e).into_iter().rev());
    }
}

pub fn node_count(e: &Expr, limit: usize) -> Option<usize> {
    let mut pending = vec![e];
    let mut count = 0usize;
    while let Some(e) = pending.pop() {
        count = count.checked_add(1)?;
        if count > limit {
            return None;
        }
        pending.extend(children(e));
    }
    Some(count)
}

pub fn free_variables(e: &Expr) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let mut pending = vec![(e, BTreeSet::new())];
    while let Some((e, scope)) = pending.pop() {
        match e {
            Expr::Var(n) => {
                if !scope.contains(n) {
                    out.insert(n.clone());
                }
            }
            Expr::Let(n, _, initializer, body) => {
                pending.push((initializer, scope.clone()));
                let mut local = scope;
                local.insert(n.clone());
                pending.push((body, local));
            }
            Expr::Lambda(n, body) => {
                let mut local = scope;
                local.insert(n.clone());
                pending.push((body, local));
            }
            _ => pending.extend(children(e).into_iter().map(|e| (e, scope.clone()))),
        }
    }
    out
}

pub fn references_free(e: &Expr, name: &str) -> bool {
    free_variables(e).contains(name)
}

/// Fresh substitution targets must avoid bound names as well as free uses.
/// Renaming a free variable to an existing binder would otherwise capture it.
pub fn mentions_variable(e: &Expr, name: &str) -> bool {
    let mut found=false;
    walk(e,|e|if matches!(e,Expr::Var(n)|Expr::Lambda(n,_)|Expr::Let(n,_,_,_) if n==name){found=true});
    found
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn contextual_walk_retains_variant_callback_and_constructor_types() {
        let checked = crate::core::CheckedModule::from_source(crate::syntax::parse(
            "module walk;fn mapped(x:Result<u32,Bool>)->Result<u32,Bool>{return x.map(fn(v)=>v+1);} fn errors(x:Result<u32,Bool>)->Result<u32,Bool>{return x.map_err(fn(v)=>v);} fn fold(x:Result<u32,Bool>)->u32{return x.fold(fn(v)=>v,fn(b)=>0);} fn optional(x:Option<u32>)->Option<u32>{return x.map(fn(v)=>v+1);} fn typed()->Result<u32,Bool>{return Ok(0);}",
        ).unwrap()).unwrap();
        let p=checked.program();
        let mut numbers=Vec::new();
        for f in &p.functions {
            typed_walk_context(p,f,|e,env,want| {
                if matches!(e,Expr::Num(_)) {
                    numbers.push(crate::check::infer_context(e,env,p,want).unwrap());
                }
            }).unwrap();
        }
        assert!(!numbers.is_empty());
        assert!(numbers.iter().all(|t| *t==Type::U32));
    }
    #[test]
    fn shadowing_applies_to_body_but_not_initializer() {
        let v = |n: &str| Box::new(Expr::Var(n.into()));
        let e = Expr::Let(
            "a".into(),
            None,
            v("a"),
            Box::new(Expr::Lambda("a".into(), v("a"))),
        );
        assert_eq!(free_variables(&e), BTreeSet::from(["a".into()]));
        assert_eq!(node_count(&e, 4), Some(4));
        assert_eq!(node_count(&e, 3), None);
        let e = Expr::Lambda("a".into(), Box::new(e));
        assert!(free_variables(&e).is_empty());
    }
    #[test]
    fn captures_under_try_record_and_method_are_seen() {
        let e = Expr::Try(Box::new(Expr::Record(
            "R".into(),
            vec![(
                "x".into(),
                Expr::Method(
                    Box::new(Expr::Var("xs".into())),
                    "map".into(),
                    vec![Expr::Lambda(
                        "x".into(),
                        Box::new(Expr::Var("capture".into())),
                    )],
                ),
            )],
        )));
        assert_eq!(
            free_variables(&e),
            BTreeSet::from(["xs".into(), "capture".into()])
        );
    }
}

/// Stable source paths paired with this expression tree's borrowed node addresses.
pub fn paths(e: &Expr) -> std::collections::BTreeMap<usize, Vec<usize>> {
    let mut result = std::collections::BTreeMap::new();
    let mut pending = vec![(e, vec![])];
    while let Some((e, path)) = pending.pop() {
        result.insert(e as *const Expr as usize, path.clone());
        for (i, child) in children(e).into_iter().enumerate() {
            let mut p = path.clone();
            p.push(i);
            pending.push((child, p));
        }
    }
    result
}

/// Visit checked pure source with lexical types, including fixed callback scopes.
/// This exposes admissible places; it neither chooses borrowing nor grants a
/// rewrite. Unknown callback scopes are skipped. Resource exhaustion is an error.
pub fn typed_walk(
    program: &crate::core::Program,
    function: &crate::core::Function,
    mut visit: impl FnMut(&Expr, &crate::check::Env),
) -> crate::LangResult<()> {
    typed_walk_context(program,function,|expression,env,_|visit(expression,env))
}
/// Preserve the expected type when exposing lexical source judgments. Consumers
/// must not reinterpret contextually typed literals with an unrelated default.
pub fn typed_walk_context(
    program: &crate::core::Program,
    function: &crate::core::Function,
    mut visit: impl FnMut(&Expr, &crate::check::Env, Option<&crate::core::Type>),
) -> crate::LangResult<()> {
    use crate::core::Type;
    type Pending<'a> = (&'a Expr, crate::check::Env, Option<Type>, usize);
    fn callback<'a>(
        expression: &'a Expr,
        parameters: &[Type],
        result: Option<Type>,
        env: &crate::check::Env,
        depth: usize,
        pending: &mut Vec<Pending<'a>>,
    ) {
        let mut body = expression;
        let mut local = env.clone();
        let mut depth = depth;
        for ty in parameters {
            let Expr::Lambda(name, nested) = body else {
                pending.push((body, local, None, depth));
                return;
            };
            local.insert(name.clone(), ty.clone());
            body = nested;
            depth += 1;
        }
        pending.push((body, local, result, depth));
    }
    let mut pending = vec![(
        &function.body,
        crate::check::params_env(&function.params)?,
        Some(function.result.clone()),
        0usize,
    )];
    let mut nodes = 0usize;
    while let Some((e, env, want, depth)) = pending.pop() {
        nodes += 1;
        if nodes > 1_000_000 || depth > 256 {
            return Err("typed source walk limit".into());
        }
        visit(e, &env, want.as_ref());
        match e {
            Expr::Let(name, annotation, initial, body) => {
                let ty =
                    crate::check::infer_context(initial, &env, program, annotation.as_deref())?;
                let mut local = env.clone();
                local.insert(name.clone(), ty.clone());
                pending.push((body, local, want, depth + 1));
                pending.push((initial, env, Some(ty), depth + 1));
            }
            Expr::Record(name, fields) => {
                for (field, value) in fields {
                    let ty = program
                        .records
                        .get(name)
                        .and_then(|fs| fs.iter().find(|(n, _)| n == field))
                        .map(|(_, t)| t.clone());
                    pending.push((value, env.clone(), ty, depth + 1));
                }
            }
            Expr::Call(name, args)
                if ["foldr", "foldl", "fold_until"].contains(&name.as_str())
                    && args.len() == if name == "fold_until" { 4 } else { 3 } =>
            {
                let result = crate::check::infer_context(e, &env, program, want.as_ref())?;
                let Type::List(item) = crate::check::infer(&args[0], &env, program)? else {
                    return Err("typed fold receiver".into());
                };
                let parameters = [*item, result.clone()];
                for (i, arg) in args.iter().enumerate().skip(2) {
                    callback(
                        arg,
                        &parameters,
                        Some(if name == "fold_until" && i == 2 {
                            Type::Bool
                        } else {
                            result.clone()
                        }),
                        &env,
                        depth + 1,
                        &mut pending,
                    );
                }
                pending.push((&args[1], env.clone(), Some(result), depth + 1));
                pending.push((&args[0], env, None, depth + 1));
            }
            Expr::Method(receiver,name,args) if ["fold","map","map_err"].contains(&name.as_str())
                && matches!(crate::check::infer(receiver,&env,program)?,Type::Option(_)|Type::Result(..)) => {
                let input=crate::check::infer(receiver,&env,program)?;
                let result=crate::check::infer_context(e,&env,program,want.as_ref())?;
                if name=="fold" {
                    let parameters=match input {Type::Option(t)=>vec![*t,Type::Unit],Type::Result(a,b)=>vec![*a,*b],_=>unreachable!()};
                    for (arg,parameter) in args.iter().zip(parameters){callback(arg,&[parameter],Some(result.clone()),&env,depth+1,&mut pending);}
                } else {
                    let (parameter,output)=match (input,result,name.as_str()) {
                        (Type::Option(a),Type::Option(b),"map")=>(*a,*b),
                        (Type::Result(a,_),Type::Result(b,_),"map")=>(*a,*b),
                        (Type::Result(_,a),Type::Result(_,b),"map_err")=>(*a,*b),
                        _=>return Err("typed variant callback".into()),
                    };
                    callback(&args[0],&[parameter],Some(output),&env,depth+1,&mut pending);
                }
                pending.push((receiver,env,None,depth+1));
            }
            Expr::Call(name,args) if ["repeat","repeat_until"].contains(&name.as_str()) => {
                let result=crate::check::infer_context(e,&env,program,want.as_ref())?;
                let step=if name=="repeat" {2}else{3};
                callback(&args[step],&[Type::U32,result.clone()],Some(result.clone()),&env,depth+1,&mut pending);
                if step==3 {callback(&args[2],&[result.clone()],Some(Type::Bool),&env,depth+1,&mut pending);}
                pending.push((&args[1],env.clone(),Some(result),depth+1));
                pending.push((&args[0],env,Some(Type::U32),depth+1));
            }
            Expr::Call(name,args) if name=="parallel_map" && args.len()==3 => {
                let Type::List(input)=crate::check::infer(&args[0],&env,program)? else{return Err("typed parallel receiver".into())};
                let Type::List(output)=crate::check::infer_context(e,&env,program,want.as_ref())? else{return Err("typed parallel result".into())};
                callback(&args[2],&[Type::U32,*input],Some(*output),&env,depth+1,&mut pending);
                pending.push((&args[1],env.clone(),Some(Type::U32),depth+1));pending.push((&args[0],env,None,depth+1));
            }
            Expr::Method(receiver,name,args) if name=="split_at" && args.len()==2 => {
                let input=crate::check::infer(receiver,&env,program)?;
                if !matches!(input,Type::Buffer(_)){return Err("typed split receiver".into())}
                callback(&args[1],&[input.clone(),input.clone()],Some(input),&env,depth+1,&mut pending);
                pending.push((&args[0],env.clone(),Some(Type::U32),depth+1));pending.push((receiver,env,None,depth+1));
            }
            Expr::Method(receiver,name,args) if name=="map_parallel" && args.len()==2 => {
                let input=crate::check::infer(receiver,&env,program)?;
                let item=match input{Type::List(t)|Type::Buffer(t)=>*t,_=>return Err("typed parallel receiver".into())};
                let result=crate::check::infer_context(e,&env,program,want.as_ref())?;
                let output=match result{Type::List(t)|Type::Buffer(t)=>*t,_=>return Err("typed parallel result".into())};
                callback(&args[1],&[Type::U32,item],Some(output),&env,depth+1,&mut pending);
                pending.push((&args[0],env.clone(),Some(Type::U32),depth+1));pending.push((receiver,env,None,depth+1));
            }
            Expr::Call(name,args) if ["Ok","Err","Some"].contains(&name.as_str()) && args.len()==1 => {
                let result=crate::check::infer_context(e,&env,program,want.as_ref())?;
                let child=match (name.as_str(),result) {
                    ("Some",Type::Option(a))|("Ok",Type::Result(a,_))=>*a,
                    ("Err",Type::Result(_,b))=>*b,
                    _=>return Err("typed constructor correspondence".into()),
                };
                pending.push((&args[0],env,Some(child),depth+1));
            }
            Expr::Method(receiver, name, args)
                if ["map", "filter", "map_indexed", "zip"].contains(&name.as_str())
                    && args.len() == if name == "zip" { 2 } else { 1 } =>
            {
                let input = crate::check::infer(receiver, &env, program)?;
                let item = match input {
                    Type::List(t) | Type::Vector(t, _) | Type::Buffer(t) => *t,
                    _ => return Err("typed sequence receiver".into()),
                };
                let result = crate::check::infer_context(e, &env, program, want.as_ref())?;
                let output = match result {
                    Type::List(t) | Type::Vector(t, _) | Type::Buffer(t) => Some(*t),
                    _ => None,
                };
                if name == "zip" {
                    let Type::List(other) = crate::check::infer(&args[0], &env, program)? else {
                        return Err("typed zip receiver".into());
                    };
                    callback(
                        &args[1],
                        &[item, *other],
                        output,
                        &env,
                        depth + 1,
                        &mut pending,
                    );
                    pending.push((&args[0], env.clone(), None, depth + 1));
                } else {
                    let parameters = if name == "map_indexed" {
                        vec![Type::U32, item]
                    } else {
                        vec![item]
                    };
                    callback(
                        &args[0],
                        &parameters,
                        if name == "filter" {
                            Some(Type::Bool)
                        } else {
                            output
                        },
                        &env,
                        depth + 1,
                        &mut pending,
                    );
                }
                pending.push((receiver, env, None, depth + 1));
            }
            Expr::Call(name, args) if name == "choose" && args.len() == 3 => {
                pending.push((&args[0], env.clone(), Some(Type::Bool), depth + 1));
                pending.push((&args[1], env.clone(), want.clone(), depth + 1));
                pending.push((&args[2], env, want, depth + 1));
            }
            Expr::Call(name, args) if program.functions.iter().any(|f| &f.name == name) => {
                let callee = program.functions.iter().find(|f| &f.name == name).unwrap();
                for (arg, (_, ty)) in args.iter().zip(&callee.params) {
                    pending.push((arg, env.clone(), Some(ty.clone()), depth + 1));
                }
            }
            Expr::Binary(op, left, right)
                if ["+", "-", "*", "&", "|", "^", "&&", "||"].contains(&op.as_str()) =>
            {
                let ty = crate::check::infer_context(e, &env, program, want.as_ref()).ok();
                pending.push((left, env.clone(), ty.clone(), depth + 1));
                pending.push((right, env, ty, depth + 1));
            }
            Expr::Lambda(_, _) => (),
            _ => {
                for child in children(e) {
                    pending.push((child, env.clone(), None, depth + 1));
                }
            }
        }
    }
    Ok(())
}

fn type_children(ty: &Type, out: &mut BTreeSet<String>) {
    match ty {
        Type::Named(n) => { out.insert(n.clone()); }
        Type::List(t) | Type::Option(t) | Type::Vector(t, _) | Type::Buffer(t) => type_children(t, out),
        Type::Result(a,b) | Type::Table(a,b) | Type::Map(a,b) => { type_children(a,out);type_children(b,out); }
        _ => (),
    }
}
/// All nominal records on a recursive type path. No representation selection
/// follows from this fact; consumers keep their own ownership/codec checks.
pub fn cyclic_records(p: &Program) -> BTreeSet<String> {
    let edges=p.records.iter().map(|(n,fs)| {
        let mut xs=BTreeSet::new();for (_,t) in fs {type_children(t,&mut xs);}
        (n.clone(),xs)
    }).collect::<BTreeMap<_,_>>();
    edges.keys().filter(|root| {
        let mut pending=edges[*root].iter().cloned().collect::<Vec<_>>();let mut seen=BTreeSet::new();
        while let Some(n)=pending.pop() {
            if &n==*root {return true;}
            if seen.insert(n.clone()) {if let Some(xs)=edges.get(&n) {pending.extend(xs.iter().cloned());}}
        }
        false
    }).cloned().collect()
}
