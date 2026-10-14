//! Syntactic descent certificates for self recursion. No inferred theorem names.
use crate::{syntax::*, LangResult};
use std::collections::BTreeMap;
fn contains(e: &Expr, name: &str) -> bool {
    match e {
        Expr::Call(n, a) => n == name || a.iter().any(|x| contains(x, name)),
        Expr::Method(x, _, a) => contains(x, name) || a.iter().any(|x| contains(x, name)),
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => contains(a, name) || contains(b, name),
        Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Field(b, _) | Expr::Try(b) => contains(b, name),
        Expr::Record(_, fs) => fs.iter().any(|(_, x)| contains(x, name)),
        _ => false,
    }
}
pub fn recursive(f: &Function) -> bool {
    contains(&f.body, &f.name)
}
pub fn needed(p: &Program) -> bool {
    fn statements(ss: &[Statement]) -> bool {
        ss.iter().any(|s| match s {
            Statement::If(e, a, b) => new(e) || statements(a) || statements(b),
            Statement::Let(_, _, e)
            | Statement::Return(e)
            | Statement::Expr(e)
            | Statement::Emit(_, e) => new(e),
        })
    }
    fn new(e: &Expr) -> bool {
        match e {
            Expr::Call(n, a) => n == "parallel_map" || a.iter().any(new),
            Expr::Method(x, n, a) => {
                ["map_parallel", "split_at", "append", "drop", "take"].contains(&n.as_str())
                    || new(x)
                    || a.iter().any(new)
            }
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => new(a) || new(b),
            Expr::Lambda(_, b) | Expr::Neg(b) | Expr::Field(b, _) | Expr::Try(b) => new(b),
            Expr::Record(_, fs) => fs.iter().any(|(_, x)| new(x)),
            _ => false,
        }
    }
    p.functions.iter().any(|f| recursive(f) || new(&f.body))
        || crate::analysis::recursive_function_groups(p).map_or(true, |groups| !groups.is_empty())
        || p.states.iter().chain(&p.keeps).any(|d| new(&d.value))
        || p.actions.iter().any(|a| statements(&a.body))
}
// Facts are lower bounds on unsigned words or list lengths in this exact scope.
fn branch(c: &Expr, truth: bool, name: &str, list: bool, facts: &mut BTreeMap<String, u64>) {
    if let Expr::Binary(op, a, b) = c {
        if (op == "&&" && truth) || (op == "||" && !truth) {
            branch(a, truth, name, list, facts);
            branch(b, truth, name, list, facts);
            return;
        }
        if (op == "==" || op == "!=") && matches!(b.as_ref(), Expr::Bool(false)) {
            branch(
                a,
                if op == "==" { !truth } else { truth },
                name,
                list,
                facts,
            );
            return;
        }
    }
    let Expr::Binary(op, a, b) = c else { return };
    let measured = if list {
        matches!(a.as_ref(),Expr::Call(n,args) if n=="length" && matches!(args.as_slice(),[Expr::Var(v)] if v==name))
    } else {
        matches!(a.as_ref(),Expr::Var(v) if v==name)
    };
    if !measured {
        return;
    };
    let Expr::Num(k) = b.as_ref() else { return };
    let bound = match (op.as_str(), truth) {
        (">", true) | ("<=", false) => k.checked_add(1),
        (">=", true) | ("<", false) => Some(*k),
        ("==", false) | ("!=", true) if *k == 0 => Some(1),
        ("==", true) => Some(*k),
        _ => None,
    };
    if let Some(n) = bound {
        let old = facts.get(name).copied().unwrap_or(0);
        facts.insert(name.into(), old.max(n));
    }
}
fn walk(
    e: &Expr,
    f: &Function,
    index: usize,
    name: &str,
    list: bool,
    facts: &BTreeMap<String, u64>,
    active: bool,
) -> LangResult<()> {
    match e {
        Expr::Call(n, args) if n == &f.name => {
            let lower = facts.get(name).copied().unwrap_or(0);
            let desc = if !active {
                false
            } else if list {
                matches!(args.get(index),Some(Expr::Method(x,m,a)) if m=="drop" && matches!(x.as_ref(),Expr::Var(v) if v==name) && matches!(a.as_slice(),[Expr::Num(k)] if *k>0 && lower>0))
            } else {
                matches!(args.get(index),Some(Expr::Binary(op,a,b)) if op=="-" && matches!(a.as_ref(),Expr::Var(v) if v==name) && matches!(b.as_ref(),Expr::Num(k) if *k>0 && lower>=*k))
            };
            if !desc {
                return Err(format!(
                    "{}: recursive argument does not provably decrease",
                    f.name
                ));
            };
            for a in args {
                walk(a, f, index, name, list, facts, active)?;
            }
        }
        Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
            walk(&args[0], f, index, name, list, facts, active)?;
            for (truth, a) in [(true, &args[1]), (false, &args[2])] {
                let mut local = facts.clone();
                if active {
                    branch(&args[0], truth, name, list, &mut local);
                }
                walk(a, f, index, name, list, &local, active)?;
            }
        }
        Expr::Let(n, _, a, b) => {
            walk(a, f, index, name, list, facts, active)?;
            walk(b, f, index, name, list, facts, active && n != name)?;
        }
        Expr::Lambda(n, b) => walk(b, f, index, name, list, facts, active && n != name)?,
        Expr::Call(_, args) => {
            for a in args {
                walk(a, f, index, name, list, facts, active)?;
            }
        }
        Expr::Method(x, _, args) => {
            walk(x, f, index, name, list, facts, active)?;
            for a in args {
                walk(a, f, index, name, list, facts, active)?;
            }
        }
        Expr::Binary(_, a, b) => {
            walk(a, f, index, name, list, facts, active)?;
            walk(b, f, index, name, list, facts, active)?;
        }
        Expr::Neg(x) | Expr::Field(x, _) | Expr::Try(x) => {
            walk(x, f, index, name, list, facts, active)?
        }
        Expr::Record(_, fs) => {
            for (_, x) in fs {
                walk(x, f, index, name, list, facts, active)?;
            }
        }
        _ => (),
    }
    Ok(())
}
pub fn check_function(f: &Function, p: &Program) -> LangResult<()> {
    if crate::structural_descent::check(f,p).is_ok(){return Ok(())}
    for (index, (name, t)) in f.params.iter().enumerate() {
        let list = matches!(t, Type::List(_));
        if (list || matches!(t, Type::U32 | Type::U64))
            && walk(&f.body, f, index, name, list, &BTreeMap::new(), true).is_ok()
        {
            return Ok(());
        }
    }
    let measures: Vec<_> = f
        .params
        .iter()
        .enumerate()
        .filter_map(|(i, (n, t))| {
            if matches!(t, Type::U32 | Type::U64 | Type::List(_)) {
                Some((i, n.clone(), matches!(t, Type::List(_))))
            } else {
                None
            }
        })
        .collect();
    if !measures.is_empty()
        && lexicographic(
            &f.body,
            f,
            &measures,
            &BTreeMap::new(),
            &measures.iter().map(|(_, n, _)| n.clone()).collect(),
        )
        .is_ok()
    {
        return Ok(());
    }
    Err(format!(
        "{}: recursion requires a guarded decreasing unsigned parameter or nonempty list tail",
        f.name
    ))
}

// A lexicographic product of existing well-founded measures. Later components
// may reset only after an earlier one decreases; this is a checking mechanism,
// independent of any optimisation or catalogue name.
fn lexicographic(
    e: &Expr,
    f: &Function,
    measures: &[(usize, String, bool)],
    facts: &BTreeMap<String, u64>,
    active: &std::collections::BTreeSet<String>,
) -> LangResult<()> {
    let walk = |e: &Expr| lexicographic(e, f, measures, facts, active);
    match e {
        Expr::Call(n, args) if n == &f.name => {
            let mut decreased = false;
            for (index, name, list) in measures {
                if !active.contains(name) {
                    break;
                }
                let Some(argument) = args.get(*index) else {
                    break;
                };
                if matches!(argument,Expr::Var(v) if v==name) {
                    continue;
                }
                let lower = facts.get(name).copied().unwrap_or(0);
                decreased = if *list {
                    matches!(argument,Expr::Method(x,m,a) if m=="drop" && matches!(x.as_ref(),Expr::Var(v) if v==name) && matches!(a.as_slice(),[Expr::Num(k)] if *k>0 && lower>0))
                } else {
                    matches!(argument,Expr::Binary(op,a,b) if op=="-" && matches!(a.as_ref(),Expr::Var(v) if v==name) && matches!(b.as_ref(),Expr::Num(k) if *k>0 && lower>=*k))
                };
                break;
            }
            if !decreased {
                return Err("recursive call lacks lexicographic descent".into());
            }
            for a in args {
                walk(a)?;
            }
        }
        Expr::Call(n, args) if n == "choose" && args.len() == 3 => {
            walk(&args[0])?;
            for (truth, e) in [(true, &args[1]), (false, &args[2])] {
                let mut local = facts.clone();
                for (_, name, list) in measures {
                    if active.contains(name) {
                        branch(&args[0], truth, name, *list, &mut local);
                    }
                }
                lexicographic(e, f, measures, &local, active)?;
            }
        }
        Expr::Let(n, _, a, b) => {
            walk(a)?;
            let mut local = active.clone();
            local.remove(n);
            lexicographic(b, f, measures, facts, &local)?;
        }
        Expr::Lambda(n, b) => {
            let mut local = active.clone();
            local.remove(n);
            lexicographic(b, f, measures, facts, &local)?;
        }
        Expr::Call(_, args) => {
            for a in args {
                walk(a)?;
            }
        }
        Expr::Method(x, _, args) => {
            walk(x)?;
            for a in args {
                walk(a)?;
            }
        }
        Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => walk(x)?,
        Expr::Binary(_, a, b) => {
            walk(a)?;
            walk(b)?;
        }
        Expr::Record(_, fields) => {
            for (_, a) in fields {
                walk(a)?;
            }
        }
        _ => (),
    }
    Ok(())
}
