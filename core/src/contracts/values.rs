//! Immutable nominal value invariants. Construction, boundary validation and
//! reusable facts share ordinary source contracts; there is no trusted predicate
//! name or special optimisation rule. Raw construction is confined to the exact
//! authenticated constructor body (and its checked validation guard).
use super::*;
use sha2::Digest;

fn var(name: &str) -> Expr {
    Expr::Var(name.into())
}
fn field(value: Expr, name: &str) -> Expr {
    Expr::Field(Box::new(value), name.into())
}
fn method(value: Expr, name: &str, args: Vec<Expr>) -> Expr {
    Expr::Method(Box::new(value), name.into(), args)
}
fn apply(name: &str, ty: &Type, value: Expr, predicate: &Expr) -> Expr {
    Expr::Let(
        name.into(),
        Some(Box::new(ty.clone())),
        Box::new(value),
        Box::new(predicate.clone()),
    )
}
fn same<T: Serialize>(a: &T, b: &T) -> LangResult<bool> {
    Ok(crate::registry::canonical(a)? == crate::registry::canonical(b)?)
}

fn contains(p: &Program, ty: &Type) -> bool {
    let mut pending = vec![ty];
    let mut seen = BTreeSet::new();
    while let Some(ty) = pending.pop() {
        match ty {
            Type::Named(name) => {
                if p.contracts.value_invariants.contains_key(name) {
                    return true;
                }
                if seen.insert(name) {
                    if let Some(fields) = p.records.get(name) {
                        pending.extend(fields.iter().map(|(_, t)| t));
                    }
                }
            }
            Type::List(t) | Type::Option(t) | Type::Buffer(t) | Type::Vector(t, _) => {
                pending.push(t)
            }
            Type::Result(a, b) | Type::Table(a, b) | Type::Map(a, b) => {
                pending.extend([a.as_ref(), b.as_ref()])
            }
            _ => (),
        }
    }
    false
}

fn validator_types(p: &Program) -> LangResult<BTreeMap<String, Type>> {
    let recursive = crate::analysis::cyclic_records(p);
    let mut pending: Vec<_> = p
        .records
        .values()
        .flat_map(|fields| fields.iter().map(|(_, ty)| ty.clone()))
        .chain(p.functions.iter().flat_map(|f| {
            std::iter::once(f.result.clone()).chain(f.params.iter().map(|(_, ty)| ty.clone()))
        }))
        .chain(p.actions.iter().flat_map(|a| {
            std::iter::once(a.result.clone()).chain(a.params.iter().map(|(_, ty)| ty.clone()))
        }))
        .chain(p.states.iter().chain(&p.keeps).map(|d| d.ty.clone()))
        .collect();
    let mut seen = BTreeSet::new();
    let mut out = BTreeMap::new();
    while let Some(ty) = pending.pop() {
        let bytes = crate::registry::canonical(&ty)?;
        if !seen.insert(bytes.clone()) {
            continue;
        }
        if seen.len() > 4096 {
            return Err("value validator type limit".into());
        }
        match &ty {
            Type::List(inner) => {
                if contains(p, inner) {
                    out.insert(
                        format!("__ink_validate_{:x}", sha2::Sha256::digest(bytes)),
                        ty.clone(),
                    );
                }
                pending.push((**inner).clone());
            }
            Type::Table(key, item) | Type::Map(key, item) => {
                pending.extend([Type::List(key.clone()), Type::List(item.clone())]);
            }
            Type::Named(name) => {
                if recursive.contains(name) && contains(p, &ty) {
                    out.insert(
                        format!("__ink_validate_{:x}", sha2::Sha256::digest(bytes)),
                        ty.clone(),
                    );
                }
                if let Some(fields) = p.records.get(name) {
                    pending.extend(fields.iter().map(|(_, t)| t.clone()));
                }
            }
            Type::Option(t) | Type::Buffer(t) | Type::Vector(t, _) => pending.push((**t).clone()),
            Type::Result(a, b) => pending.extend([(**a).clone(), (**b).clone()]),
            _ => (),
        }
    }
    Ok(out)
}

fn expected_validator(p: &Program, name: &str, ty: &Type) -> LangResult<Function> {
    let body = match ty {
        Type::List(item) => {
            let predicate = conjunction(&predicates(p, item, var("__ink_validation_item"))?);
            Expr::Call(
                "foldr".into(),
                vec![
                    var("__ink_validation_input"),
                    Expr::Bool(true),
                    Expr::Lambda(
                        "__ink_validation_item".into(),
                        Box::new(Expr::Lambda(
                            "__ink_validation_acc".into(),
                            Box::new(Expr::Binary(
                                "&&".into(),
                                Box::new(predicate),
                                Box::new(var("__ink_validation_acc")),
                            )),
                        )),
                    ),
                ],
            )
        }
        Type::Named(record) => {
            // Expand this one record, then validate its actual proper subvalues.
            // Never use this function's result as an assumption about its input.
            let input = var("__ink_validation_input");
            let mut checks = vec![];
            if let Some(predicate) = p.contracts.value_invariants.get(record) {
                checks.push(apply("value", ty, input.clone(), predicate));
            }
            for (field_name, field_ty) in p.records.get(record).ok_or("value validator record missing")? {
                checks.extend(predicates(p, field_ty, field(input.clone(), field_name))?);
            }
            conjunction(&checks)
        }
        _ => return Err("value validator requires a list or recursive immutable record".into()),
    };
    Ok(Function {
        name: name.into(),
        params: vec![("__ink_validation_input".into(), ty.clone())],
        result: Type::Bool,
        body,
    })
}

/// Every nested immutable value participates in the invariant. Containers do not
/// grant validity merely because their outer tag or element type is correct.
pub fn predicates(p: &Program, ty: &Type, value: Expr) -> LangResult<Vec<Expr>> {
    fn walk(p: &Program, ty: &Type, value: Expr, depth: usize) -> LangResult<Vec<Expr>> {
        if !contains(p, ty) {
            return Ok(vec![]);
        }
        if depth > 64 {
            return Err("value invariant type depth limit".into());
        }
        let mut out = vec![];
        match ty {
            Type::Named(name) => {
                if depth > 0 {
                    if let Some((validator, _)) = p.contracts.value_validators.iter().find(|(_, t)| *t == ty) {
                        return Ok(vec![Expr::Call(validator.clone(), vec![value])]);
                    }
                }
                if let Some(predicate) = p.contracts.value_invariants.get(name) {
                    out.push(apply("value", ty, value.clone(), predicate));
                }
                if let Some(fields) = p.records.get(name) {
                    for (name, ty) in fields {
                        out.extend(walk(p, ty, field(value.clone(), name), depth + 1)?);
                    }
                }
            }
            Type::List(inner) => {
                if let Some((name, _)) = p.contracts.value_validators.iter().find(|(_, t)| *t == ty)
                {
                    return Ok(vec![Expr::Call(name.clone(), vec![value])]);
                }
                let item = format!("__ink_value_item_{depth}");
                let predicates = walk(p, inner, var(&item), depth + 1)?;
                if !predicates.is_empty() {
                    // Count/filter has the same fixed meaning in pure and
                    // readonly action fragments; action foldr is not admitted.
                    let invalid = method(
                        value,
                        "filter",
                        vec![Expr::Lambda(
                            item,
                            Box::new(Expr::Binary(
                                "==".into(),
                                Box::new(conjunction(&predicates)),
                                Box::new(Expr::Bool(false)),
                            )),
                        )],
                    );
                    out.push(Expr::Binary(
                        "==".into(),
                        Box::new(Expr::Call("count".into(), vec![invalid])),
                        Box::new(Expr::Num(0)),
                    ));
                }
            }
            Type::Option(inner) => {
                let item = format!("__ink_value_option_{depth}");
                let predicates = walk(p, inner, var(&item), depth + 1)?;
                if !predicates.is_empty() {
                    out.push(method(
                        value,
                        "fold",
                        vec![
                            Expr::Lambda(item, Box::new(conjunction(&predicates))),
                            Expr::Lambda(
                                format!("__ink_value_none_{depth}"),
                                Box::new(Expr::Bool(true)),
                            ),
                        ],
                    ));
                }
            }
            Type::Result(ok, err) => {
                let a = format!("__ink_value_ok_{depth}");
                let b = format!("__ink_value_err_{depth}");
                let yes = walk(p, ok, var(&a), depth + 1)?;
                let no = walk(p, err, var(&b), depth + 1)?;
                if !yes.is_empty() || !no.is_empty() {
                    out.push(method(
                        value,
                        "fold",
                        vec![
                            Expr::Lambda(a, Box::new(conjunction(&yes))),
                            Expr::Lambda(b, Box::new(conjunction(&no))),
                        ],
                    ));
                }
            }
            Type::Table(key, item) | Type::Map(key, item) => {
                out.extend(walk(
                    p,
                    &Type::List(key.clone()),
                    method(value.clone(), "keys", vec![]),
                    depth + 1,
                )?);
                out.extend(walk(
                    p,
                    &Type::List(item.clone()),
                    method(value, "values", vec![]),
                    depth + 1,
                )?);
            }
            Type::Buffer(inner) => {
                if !walk(p, inner, var("__ink_value_owner"), depth + 1)?.is_empty() {
                    return Err(
                        "invariant-bearing temporary owners require a checked owner interface"
                            .into(),
                    );
                }
            }
            _ => (),
        }
        Ok(out)
    }
    walk(p, ty, value, 0)
}

fn expected_constructor(p: &Program, ty: &str, name: &str) -> LangResult<Function> {
    let fields = p
        .records
        .get(ty)
        .ok_or("value invariant requires a nominal record")?;
    let params = fields
        .iter()
        .enumerate()
        .map(|(i, (_, ty))| (format!("__ink_field_{i}"), ty.clone()))
        .collect::<Vec<_>>();
    Ok(Function {
        name: name.into(),
        result: Type::Named(ty.into()),
        body: Expr::Record(
            ty.into(),
            fields
                .iter()
                .zip(&params)
                .map(|((field, _), (name, _))| (field.clone(), var(name)))
                .collect(),
        ),
        params,
    })
}

/// Derive only from authenticated type declarations and actual signatures.
fn infer(p: &Program) -> LangResult<BTreeMap<String, Specification>> {
    let guards: BTreeSet<_> = p
        .contracts
        .precondition_checks
        .values()
        .chain(&p.contracts.invariant_checks)
        .chain(p.contracts.value_validators.keys())
        .collect();
    let implementations: BTreeSet<_> = p
        .contracts
        .implementations
        .iter()
        .map(|i| &i.name)
        .collect();
    let mut out = BTreeMap::new();
    let mut add = |name: &str,
                   kind: Option<ActionKind>,
                   params: &[(String, Type)],
                   result: &Type,
                   reads: &[String],
                   writes: &[String],
                   emits: &[String],
                   body: Option<&Expr>|
     -> LangResult<()> {
        if guards.contains(&name.to_string()) || implementations.contains(&name.to_string()) {
            return Ok(());
        }
        let mut requires = vec![];
        for (name, ty) in params {
            requires.extend(predicates(p, ty, var(name))?);
        }
        let ensures = predicates(p, result, var("result"))?;
        if let Some((ty, _)) = p
            .contracts
            .value_constructors
            .iter()
            .find(|(_, ctor)| ctor.as_str() == name)
        {
            let body = body.ok_or("value constructor must be pure")?;
            let predicate = &p.contracts.value_invariants[ty];
            requires.push(apply(
                "value",
                &Type::Named(ty.clone()),
                body.clone(),
                predicate,
            ));
        }
        if !requires.is_empty() || !ensures.is_empty() {
            out.insert(
                name.into(),
                Specification {
                    name: name.into(),
                    kind,
                    params: params.to_vec(),
                    result: result.clone(),
                    reads: reads.to_vec(),
                    writes: writes.to_vec(),
                    emits: emits.to_vec(),
                    requires,
                    ensures: if ensures.is_empty() {
                        vec![Expr::Bool(true)]
                    } else {
                        ensures
                    },
                },
            );
        }
        Ok(())
    };
    for f in &p.functions {
        add(
            &f.name,
            None,
            &f.params,
            &f.result,
            &[],
            &[],
            &[],
            Some(&f.body),
        )?;
    }
    for a in &p.actions {
        add(
            &a.name,
            Some(a.kind.clone()),
            &a.params,
            &a.result,
            &a.reads,
            &a.writes,
            &a.emits,
            None,
        )?;
    }
    Ok(out)
}

pub(crate) fn install(p: &mut Program) -> LangResult<()> {
    if p.contracts.value_invariants.is_empty() {
        return Ok(());
    }
    if !p.contracts.value_constructors.is_empty()
        || !p.contracts.inferred.is_empty()
        || !p.contracts.value_validators.is_empty()
    {
        return Err("source supplies inferred value contract machinery".into());
    }
    for ty in p
        .contracts
        .value_invariants
        .keys()
        .cloned()
        .collect::<Vec<_>>()
    {
        let name = format!("__ink_construct_{:x}", sha2::Sha256::digest(ty.as_bytes()));
        if p.functions.iter().any(|f| f.name == name) || p.actions.iter().any(|a| a.name == name) {
            return Err("value constructor name collision".into());
        }
        let f = expected_constructor(p, &ty, &name)?;
        p.contracts.value_constructors.insert(ty, name);
        p.functions.push(f);
    }
    p.contracts.value_validators = validator_types(p)?;
    for (name, ty) in &p.contracts.value_validators {
        if p.functions.iter().any(|f| &f.name == name) || p.actions.iter().any(|a| &a.name == name)
        {
            return Err("value validator name collision".into());
        }
        p.functions.push(expected_validator(p, name, ty)?);
    }
    // Rewriting literals into checked constructor calls preserves source field
    // evaluation order, including effects in action expressions.
    let declarations = p.records.clone();
    let constructors = p.contracts.value_constructors.clone();
    let mut serial = 0usize;
    fn expression(
        e: &mut Expr,
        records: &BTreeMap<String, Vec<(String, Type)>>,
        constructors: &BTreeMap<String, String>,
        serial: &mut usize,
        depth: usize,
    ) -> LangResult<()> {
        if depth > 128 {
            return Err("value constructor expression depth limit".into());
        }
        match e {
            Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
                expression(a, records, constructors, serial, depth + 1)?;
                expression(b, records, constructors, serial, depth + 1)?;
            }
            Expr::Lambda(_, a) | Expr::Neg(a) | Expr::Field(a, _) | Expr::Try(a) => {
                expression(a, records, constructors, serial, depth + 1)?
            }
            Expr::Call(_, args) => {
                for a in args {
                    expression(a, records, constructors, serial, depth + 1)?;
                }
            }
            Expr::Method(a, _, args) => {
                expression(a, records, constructors, serial, depth + 1)?;
                for a in args {
                    expression(a, records, constructors, serial, depth + 1)?;
                }
            }
            Expr::Record(_, fields) => {
                for (_, a) in fields {
                    expression(a, records, constructors, serial, depth + 1)?;
                }
            }
            _ => (),
        }
        if let Expr::Record(ty, fields) = e {
            if let Some(constructor) = constructors.get(ty) {
                let declared = &records[ty];
                if fields.len() != declared.len()
                    || fields.iter().map(|(n, _)| n).collect::<BTreeSet<_>>().len() != fields.len()
                    || fields
                        .iter()
                        .any(|(n, _)| !declared.iter().any(|(d, _)| d == n))
                {
                    return Err("value constructor fields differ from nominal declaration".into());
                }
                let mut occupied = BTreeSet::new();
                for (_, value) in fields.iter() {
                    crate::analysis::walk(value, |e| match e {
                        Expr::Var(n) | Expr::Lambda(n, _) | Expr::Let(n, _, _, _) => {
                            occupied.insert(n.clone());
                        }
                        _ => (),
                    });
                }
                let mut bindings = vec![];
                let mut names = BTreeMap::new();
                for (field, value) in fields.iter() {
                    let mut name = format!("__ink_construct_value_{}", *serial);
                    *serial += 1;
                    while occupied.contains(&name) {
                        name.push('_');
                    }
                    occupied.insert(name.clone());
                    names.insert(field.clone(), name.clone());
                    let ty = declared.iter().find(|(n, _)| n == field).unwrap().1.clone();
                    bindings.push((name, ty, value.clone()));
                }
                let mut body = Expr::Call(
                    constructor.clone(),
                    declared.iter().map(|(n, _)| var(&names[n])).collect(),
                );
                for (name, ty, value) in bindings.into_iter().rev() {
                    body = Expr::Let(name, Some(Box::new(ty)), Box::new(value), Box::new(body));
                }
                *e = body;
            }
        }
        Ok(())
    }
    fn block(
        body: &mut [Statement],
        records: &BTreeMap<String, Vec<(String, Type)>>,
        constructors: &BTreeMap<String, String>,
        serial: &mut usize,
        depth: usize,
    ) -> LangResult<()> {
        if depth > 128 {
            return Err("value constructor statement depth limit".into());
        }
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Emit(_, e)
                | Statement::Expr(e) => expression(e, records, constructors, serial, depth + 1)?,
                Statement::If(e, a, b) => {
                    expression(e, records, constructors, serial, depth + 1)?;
                    block(a, records, constructors, serial, depth + 1)?;
                    block(b, records, constructors, serial, depth + 1)?;
                }
            }
        }
        Ok(())
    }
    for f in &mut p.functions {
        if !constructors.values().any(|n| n == &f.name) {
            expression(&mut f.body, &declarations, &constructors, &mut serial, 0)?;
        }
    }
    for a in &mut p.actions {
        block(&mut a.body, &declarations, &constructors, &mut serial, 0)?;
    }
    for d in p.states.iter_mut().chain(&mut p.keeps) {
        expression(&mut d.value, &declarations, &constructors, &mut serial, 0)?;
    }
    for spec in &mut p.contracts.specifications {
        for e in spec.requires.iter_mut().chain(&mut spec.ensures) {
            expression(e, &declarations, &constructors, &mut serial, 0)?;
        }
    }
    for d in &p.states {
        p.contracts
            .invariants
            .extend(predicates(p, &d.ty, var(&d.name))?);
    }
    p.contracts.inferred = infer(p)?;
    Ok(())
}

/// Re-derive every assumption on core replay. Modifying inferred metadata, a
/// constructor or a restore predicate cannot create a valid invariant value.
pub(crate) fn check(p: &Program) -> LangResult<()> {
    if p.contracts.value_invariants.is_empty() {
        if !p.contracts.inferred.is_empty()
            || !p.contracts.value_constructors.is_empty()
            || !p.contracts.value_validators.is_empty()
        {
            return Err("value machinery without invariant declarations".into());
        }
        return Ok(());
    }
    if !same(&p.contracts.value_validators, &validator_types(p)?)? {
        return Err("value validator coverage differs from actual types".into());
    }
    for (name, ty) in &p.contracts.value_validators {
        let actual = p
            .functions
            .iter()
            .find(|f| &f.name == name)
            .ok_or("missing raw value validator")?;
        if !same(actual, &expected_validator(p, name, ty)?)? {
            return Err("raw value validator differs from fixed predicate traversal".into());
        }
    }
    if p.contracts.value_invariants.len() > 256 {
        return Err("value invariant declaration limit".into());
    }
    if !p
        .contracts
        .value_invariants
        .keys()
        .eq(p.contracts.value_constructors.keys())
    {
        return Err("value invariant constructor coverage mismatch".into());
    }
    for (ty, predicate) in &p.contracts.value_invariants {
        let nominal = Type::Named(ty.clone());
        crate::check::infer_as(
            predicate,
            &BTreeMap::from([("value".into(), nominal)]),
            p,
            &Type::Bool,
        )?;
        if crate::analysis::free_variables(predicate).iter().any(|n| {
            n != "value"
                && n != "None"
                && !p.enums.contains_key(n)
                && !["Buffer", "Map"].contains(&n.as_str())
        }) {
            return Err("value invariant may reference only its value parameter".into());
        }
        let name = &p.contracts.value_constructors[ty];
        let actual = p
            .functions
            .iter()
            .find(|f| &f.name == name)
            .ok_or("missing value constructor")?;
        if !same(actual, &expected_constructor(p, ty, name)?)? {
            return Err("value constructor differs from nominal fields".into());
        }
    }
    if !same(&p.contracts.inferred, &infer(p)?)? {
        return Err("inferred value contracts differ from actual types".into());
    }
    for d in &p.states {
        for expected in predicates(p, &d.ty, var(&d.name))? {
            if !p
                .contracts
                .invariants
                .iter()
                .any(|actual| same(actual, &expected).unwrap_or(false))
            {
                return Err("missing value invariant snapshot/state guard".into());
            }
        }
    }
    let allowed: BTreeSet<_> = p
        .contracts
        .value_constructors
        .values()
        .chain(p.contracts.precondition_checks.values())
        .chain(p.contracts.value_validators.keys())
        .collect();
    let reject = |e: &Expr| -> LangResult<()> {
        let mut raw = false;
        crate::analysis::walk(e, |e| {
            raw |= matches!(e, Expr::Record(n, _) if p.contracts.value_invariants.contains_key(n));
        });
        if raw {
            Err("invariant-bearing record requires its checked constructor".into())
        } else {
            Ok(())
        }
    };
    for f in &p.functions {
        if !allowed.contains(&f.name) {
            reject(&f.body)?;
        }
    }
    fn statements(body: &[Statement], reject: &impl Fn(&Expr) -> LangResult<()>) -> LangResult<()> {
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Emit(_, e)
                | Statement::Expr(e) => reject(e)?,
                Statement::If(e, a, b) => {
                    reject(e)?;
                    statements(a, reject)?;
                    statements(b, reject)?;
                }
            }
        }
        Ok(())
    }
    for a in &p.actions {
        if !allowed.contains(&a.name) {
            statements(&a.body, &reject)?;
        }
    }
    for d in p.states.iter().chain(&p.keeps) {
        reject(&d.value)?;
    }
    Ok(())
}
