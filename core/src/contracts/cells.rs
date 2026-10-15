//! Private value state elaborates to a single-key ordinary transactional table.
//! Reads use the declared initial value until the first write. No new runtime.
use super::*;
fn method(receiver: Expr, name: &str, args: Vec<Expr>) -> Expr {
    Expr::Method(Box::new(receiver), name.into(), args)
}

/// Initial values may depend on explicitly authored, state-independent keeps.
/// This is a capability check, not an inferred algebraic equality. Ordinary
/// checking still validates every keep and pure function afterwards.
fn initial_keeps(p: &Program, initial: &Expr, budget: &mut usize) -> LangResult<BTreeSet<String>> {
    let states = p
        .states
        .iter()
        .map(|s| s.name.as_str())
        .collect::<BTreeSet<_>>();
    let actions = p
        .actions
        .iter()
        .map(|a| a.name.as_str())
        .collect::<BTreeSet<_>>();
    let keeps = p
        .keeps
        .iter()
        .map(|k| (k.name.as_str(), &k.value))
        .collect::<BTreeMap<_, _>>();
    let free = crate::analysis::free_variables(initial);
    if free.iter().any(|n| states.contains(n.as_str())) {
        return Err("value-state initializers and their keeps must be independent of state".into());
    }
    // Preserve existing initializers and their ordinary call/capability checks.
    // The stricter closed-preparation domain applies only to newly supported
    // references to explicit keeps; it grants no purity fact to a query call.
    if !free.iter().any(|n| keeps.contains_key(n.as_str())) {
        return Ok(BTreeSet::new());
    }
    let mut pending = vec![initial];
    let mut dependencies = BTreeSet::new();
    while let Some(e) = pending.pop() {
        let size =
            crate::analysis::node_count(e, *budget).ok_or("state initializer dependency limit")?;
        *budget -= size;
        let mut action = false;
        crate::analysis::walk(e, |e| {
            action |= matches!(e, Expr::Call(n, _) if actions.contains(n.as_str()));
        });
        if action {
            return Err("value-state initializers and their keeps require pure computation".into());
        }
        for name in crate::analysis::free_variables(e) {
            if states.contains(name.as_str()) {
                return Err(
                    "value-state initializers and their keeps must be independent of state".into(),
                );
            }
            if let Some(value) = keeps.get(name.as_str()) {
                if dependencies.insert(name) {
                    pending.push(*value);
                }
            }
        }
    }
    // A keep cycle is rejected by the ordinary dependency checker, even if its
    // apparent transitive state read set is empty.
    Ok(dependencies)
}

pub(crate) fn lower(p: &mut Program) -> LangResult<()> {
    let mut cells = p
        .states
        .iter()
        .filter(|d| !matches!(d.ty, Type::Table(..)))
        .map(|d| (d.name.clone(), (d.ty.clone(), d.value.clone())))
        .collect::<BTreeMap<_, _>>();
    if cells.is_empty() {
        return Ok(());
    }
    let mut names = crate::analysis::program_names(p);
    let mut serial = 0usize;
    let mut budget = 262144;
    let mut prepared = BTreeMap::new();
    let mut generated = vec![];
    for (n, (ty, e)) in &mut cells {
        if !initial_keeps(p, e, &mut budget)?.is_empty() {
            // Put the complete initializer in its own lexical scope. Inserting
            // the author's free keep names into a callback could capture them.
            let name = loop {
                let name = format!("__ink_prepared_initializer_{serial}");
                serial += 1;
                if names.insert(name.clone()) {
                    break name;
                }
            };
            generated.push(BindingDecl {
                name: name.clone(),
                ty: ty.clone(),
                value: e.clone(),
            });
            prepared.insert(n.clone(), name.clone());
            *e = Expr::Var(name);
        }
    }
    p.keeps.extend(generated);
    fn expression(
        e: &mut Expr,
        cells: &BTreeMap<String, (Type, Expr)>,
        prepared: &BTreeMap<String, String>,
        reads: &mut BTreeSet<String>,
        depth: usize,
    ) -> LangResult<()> {
        if depth > 128 {
            return Err("state value elaboration depth".into());
        }
        if let Expr::Call(n, args) = e {
            if n == "__ink_state_assign" {
                if args.len() != 2 {
                    return Err("invalid state assignment".into());
                }
                let Expr::Var(root) = &args[0] else {
                    return Err("state assignment root".into());
                };
                if !cells.contains_key(root) {
                    return Err("table roots use table operations, not assignment".into());
                }
                let root = root.clone();
                let mut value = args[1].clone();
                expression(&mut value, cells, prepared, reads, depth + 1)?;
                *e = method(Expr::Var(root), "put", vec![Expr::Num(0), value]);
                return Ok(());
            }
        }
        if let Expr::Var(n) = e {
            if let Some((_, initial)) = cells.get(n) {
                if let Some(keep) = prepared.get(n) {
                    reads.insert(keep.clone());
                }
                *e = method(
                    method(Expr::Var(n.clone()), "get", vec![Expr::Num(0)]),
                    "unwrap_or",
                    vec![initial.clone()],
                );
                return Ok(());
            }
        }
        match e {
            Expr::Lambda(n, _) | Expr::Let(n, _, _, _) if cells.contains_key(n) => {
                return Err("local binding shadows value state".into())
            }
            _ => (),
        }
        match e {
            Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) | Expr::Lambda(_, x) => {
                expression(x, cells, prepared, reads, depth + 1)?
            }
            Expr::Binary(_, a, b) | Expr::Let(_, _, a, b) => {
                expression(a, cells, prepared, reads, depth + 1)?;
                expression(b, cells, prepared, reads, depth + 1)?;
            }
            Expr::Method(x, _, args) => {
                expression(x, cells, prepared, reads, depth + 1)?;
                for a in args {
                    expression(a, cells, prepared, reads, depth + 1)?;
                }
            }
            Expr::Call(_, args) => {
                for a in args {
                    expression(a, cells, prepared, reads, depth + 1)?;
                }
            }
            Expr::Record(_, fields) => {
                for (_, a) in fields {
                    expression(a, cells, prepared, reads, depth + 1)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn block(
        body: &mut [Statement],
        cells: &BTreeMap<String, (Type, Expr)>,
        prepared: &BTreeMap<String, String>,
        reads: &mut BTreeSet<String>,
        depth: usize,
    ) -> LangResult<()> {
        if depth > 128 {
            return Err("state block elaboration depth".into());
        }
        for s in body {
            match s {
                Statement::Let(n, _, _) if cells.contains_key(n) => {
                    return Err("local binding shadows value state".into())
                }
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Emit(_, e)
                | Statement::Expr(e) => expression(e, cells, prepared, reads, 0)?,
                Statement::If(e, a, b) => {
                    expression(e, cells, prepared, reads, 0)?;
                    block(a, cells, prepared, reads, depth + 1)?;
                    block(b, cells, prepared, reads, depth + 1)?;
                }
            }
        }
        Ok(())
    }
    for a in &mut p.actions {
        if a.params.iter().any(|(n, _)| cells.contains_key(n)) {
            return Err("parameter shadows value state".into());
        }
        let mut reads = BTreeSet::new();
        for root in a.reads.iter().chain(&a.writes) {
            if let Some(keep) = prepared.get(root) {
                reads.insert(keep.clone());
            }
        }
        block(&mut a.body, &cells, &prepared, &mut reads, 0)?;
        for name in reads {
            if !a.reads.contains(&name) {
                a.reads.push(name);
            }
        }
    }
    for k in &mut p.keeps {
        expression(&mut k.value, &cells, &prepared, &mut BTreeSet::new(), 0)?;
    }
    for spec in &mut p.contracts.specifications {
        let mut reads = BTreeSet::new();
        for root in spec.reads.iter().chain(&spec.writes) {
            if let Some(keep) = prepared.get(root) {
                reads.insert(keep.clone());
            }
        }
        for e in spec.requires.iter_mut().chain(&mut spec.ensures) {
            expression(e, &cells, &prepared, &mut reads, 0)?;
        }
        for name in reads {
            if !spec.reads.contains(&name) {
                spec.reads.push(name);
            }
        }
    }
    for invariant in &mut p.contracts.invariants {
        expression(invariant, &cells, &prepared, &mut BTreeSet::new(), 0)?;
    }
    for d in &mut p.states {
        if let Some((ty, _)) = cells.get(&d.name) {
            d.ty = Type::Table(Box::new(Type::U32), Box::new(ty.clone()));
            d.value = method(Expr::Var("Table".into()), "empty", vec![]);
        }
    }
    Ok(())
}
