//! Fixed source codecs for a right-associated sum spine. Knowledge authors
//! proofs and chooses sites; this module neither searches nor ranks layouts.
use crate::{
    action_model,
    core::CheckedModule,
    logic::{self, Declaration, Sort, Term},
    registry,
    syntax::Type,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Schema {
    pub sum_type: Type,
    pub alternatives: Vec<Type>,
    pub source: Sort,
    pub source_chain: Vec<String>,
    pub leaf_sorts: Vec<Sort>,
    pub flat: String,
    pub encode: String,
    pub decode: String,
    pub entries: BTreeMap<String, registry::Entry>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Layout {
    pub sum_type: Type,
    pub knowledge: registry::Bundle,
    pub roundtrip: String,
    pub inverse: String,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn construct(datatype: &str, constructor: usize, value: Term) -> Term {
    Term::Construct {
        datatype: datatype.into(),
        constructor,
        arguments: vec![value],
    }
}
fn call(function: &str, argument: Term) -> Term {
    Term::Call {
        function: function.into(),
        arguments: vec![argument],
    }
}
fn add(
    entries: &mut BTreeMap<String, registry::Entry>,
    declaration: Declaration,
) -> LangResult<String> {
    let entry = registry::Entry::from_declaration(&declaration, entries.keys().cloned().collect())?;
    let id = registry::identity(&entry)?;
    entries.insert(id.clone(), entry);
    Ok(id)
}
/// Declared source sums, including nested component types. Named records are
/// visited through their declarations, without unfolding recursive references.
pub fn source_types(module: &CheckedModule) -> LangResult<Vec<Type>> {
    fn visit(t: &Type, found: &mut BTreeMap<String, Type>) -> LangResult<()> {
        match t {
            Type::Result(a, b) => {
                found.insert(
                    serde_json::to_string(t).map_err(|e| e.to_string())?,
                    t.clone(),
                );
                visit(a, found)?;
                visit(b, found)?;
            }
            Type::List(t) | Type::Buffer(t) | Type::Option(t) | Type::Vector(t, _) => {
                visit(t, found)?
            }
            Type::Map(a, b) | Type::Table(a, b) => {
                visit(a, found)?;
                visit(b, found)?;
            }
            _ => {}
        }
        Ok(())
    }
    let p = module.program();
    let mut found = BTreeMap::new();
    for fields in p.records.values() {
        for (_, t) in fields {
            visit(t, &mut found)?;
        }
    }
    for f in &p.functions {
        for (_, t) in &f.params {
            visit(t, &mut found)?;
        }
        visit(&f.result, &mut found)?;
        let mut failure = None;
        crate::analysis::typed_walk_context(p, f, |e, env, want| {
            if failure.is_some() {
                return;
            }
            if let crate::syntax::Expr::Let(_, Some(t), _, _) = e {
                if let Err(error) = visit(t, &mut found) {
                    failure = Some(error);
                    return;
                }
            }
            if let Ok(t) = crate::check::infer_context(e, env, p, want) {
                if let Err(error) = visit(&t, &mut found) {
                    failure = Some(error);
                }
            }
        })?;
        if let Some(error) = failure {
            return Err(error);
        }
    }
    for a in &p.actions {
        for (_, t) in &a.params {
            visit(t, &mut found)?;
        }
        visit(&a.result, &mut found)?;
        let typing = crate::statecheck::action_typing(p, a)?;
        for t in typing.values.values() {
            visit(t, &mut found)?;
        }
        for (a, b) in typing.lambdas.values() {
            visit(a, &mut found)?;
            visit(b, &mut found)?;
        }
    }
    for b in p.states.iter().chain(&p.keeps) {
        visit(&b.ty, &mut found)?;
    }
    for b in &p.keeps {
        let typing = crate::statecheck::keep_typing(p, b)?;
        for t in typing.values.values() {
            visit(t, &mut found)?;
        }
        for (a, b) in typing.lambdas.values() {
            visit(a, &mut found)?;
            visit(b, &mut found)?;
        }
    }
    for t in p.events.values() {
        visit(t, &mut found)?;
    }
    Ok(found.into_values().collect())
}
pub fn schema(module: &CheckedModule, sum_type: &Type) -> LangResult<Schema> {
    if !source_types(module)?.contains(sum_type) {
        return Err("sum codec type is not declared by source".into());
    }
    if crate::local_collections::owned(sum_type, module.program()) {
        return Err("sum codec requires immutable first-order values".into());
    }
    let mut alternatives = Vec::new();
    let mut tail = sum_type;
    while let Type::Result(left, right) = tail {
        if alternatives.len() >= 64 {
            return Err("sum codec spine limit".into());
        }
        alternatives.push((**left).clone());
        tail = right;
    }
    if alternatives.len() < 2 {
        return Err("sum codec requires a nested right-associated sum".into());
    }
    alternatives.push(tail.clone());
    let carrier = action_model::value_carrier(module, sum_type)?;
    let source = carrier.sort;
    let mut entries = carrier.objects;
    let mut current = source.clone();
    let mut source_chain = Vec::new();
    let mut leaf_sorts = Vec::new();
    for _ in 0..alternatives.len() - 1 {
        let Sort::Data(id) = current else {
            return Err("sum codec carrier mismatch".into());
        };
        let declaration: Declaration = serde_json::from_value(
            entries
                .get(&id)
                .ok_or("sum codec declaration missing")?
                .payload["declaration"]
                .clone(),
        )
        .map_err(|e| e.to_string())?;
        let Declaration::Datatype { constructors } = declaration else {
            return Err("sum codec datatype missing".into());
        };
        if constructors.len() != 2 || constructors.iter().any(|c| c.fields.len() != 1) {
            return Err("sum codec carrier constructors".into());
        }
        leaf_sorts.push(constructors[0].fields[0].clone());
        current = constructors[1].fields[0].clone();
        source_chain.push(id);
    }
    leaf_sorts.push(current);
    let flat = add(
        &mut entries,
        Declaration::Datatype {
            constructors: leaf_sorts
                .iter()
                .enumerate()
                .map(|(i, t)| logic::Constructor {
                    name: format!("Choice{i}"),
                    fields: vec![t.clone()],
                })
                .collect(),
        },
    )?;
    fn encode_at(flat: &str, at: usize, length: usize, value: Term) -> Term {
        let a = format!("left{at}");
        let b = format!("right{at}");
        Term::Match {
            scrutinee: Box::new(value),
            branches: vec![
                logic::Branch {
                    bindings: vec![a.clone()],
                    body: construct(flat, at, var(&a)),
                },
                logic::Branch {
                    bindings: vec![b.clone()],
                    body: if at + 1 == length {
                        construct(flat, length, var(&b))
                    } else {
                        encode_at(flat, at + 1, length, var(&b))
                    },
                },
            ],
        }
    }
    let encode = add(
        &mut entries,
        Declaration::Function {
            params: vec![("source".into(), source.clone())],
            result: Sort::Data(flat.clone()),
            body: encode_at(&flat, 0, source_chain.len(), var("source")),
            recursive: None,
        },
    )?;
    let mut branches = Vec::new();
    for i in 0..alternatives.len() {
        let name = format!("leaf{i}");
        let mut body = var(&name);
        if i < source_chain.len() {
            body = construct(&source_chain[i], 0, body);
        }
        for j in (0..i.min(source_chain.len())).rev() {
            body = construct(&source_chain[j], 1, body);
        }
        branches.push(logic::Branch {
            bindings: vec![name],
            body,
        });
    }
    let decode = add(
        &mut entries,
        Declaration::Function {
            params: vec![("flat".into(), Sort::Data(flat.clone()))],
            result: source.clone(),
            body: Term::Match {
                scrutinee: Box::new(var("flat")),
                branches,
            },
            recursive: None,
        },
    )?;
    Ok(Schema {
        sum_type: sum_type.clone(),
        alternatives,
        source,
        source_chain,
        leaf_sorts,
        flat,
        encode,
        decode,
        entries,
    })
}
pub fn check(module: &CheckedModule, layout: &Layout) -> LangResult<()> {
    let schema = schema(module, &layout.sum_type)?;
    let context = registry::CheckedBundle::check(&layout.knowledge)?.first_order_context()?;
    for (id, entry) in &schema.entries {
        let d = serde_json::from_value(entry.payload["declaration"].clone())
            .map_err(|e| e.to_string())?;
        context.matches_definition(id, &d)?;
    }
    for (name, sort, from, to, theorem) in [
        (
            "source",
            schema.source.clone(),
            call(&schema.decode, call(&schema.encode, var("source"))),
            var("source"),
            &layout.roundtrip,
        ),
        (
            "flat",
            Sort::Data(schema.flat.clone()),
            call(&schema.encode, call(&schema.decode, var("flat"))),
            var("flat"),
            &layout.inverse,
        ),
    ] {
        context.check(
            &[(name.into(), sort)],
            &[],
            &from,
            &to,
            &logic::Proof::Use {
                theorem: theorem.clone(),
                arguments: vec![var(name)],
                premises: vec![],
            },
        )?;
    }
    Ok(())
}
