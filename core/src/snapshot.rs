//! Build the portable logical schema independently of physical storage.
use crate::{
    snapshot_wire::{Layout, Schema},
    syntax::*,
    LangResult,
};
use sha2::{Digest, Sha256};
/// Schema nodes per layout. Records are expanded at each use, so a chain of
/// records that each use the next twice would otherwise grow exponentially.
const MAX_SCHEMA_NODES: usize = 100_000;
struct Expansion<'a> {
    p: &'a Program,
    stack: Vec<String>,
    remaining: usize,
}
fn schema(t: &Type, x: &mut Expansion, depth: usize) -> LangResult<Schema> {
    if depth > 128 {
        return Err("snapshot schema depth exceeded".into());
    }
    if x.remaining == 0 {
        return Err("snapshot schema size limit exceeded".into());
    }
    x.remaining -= 1;
    let p = x.p;
    Ok(match t {
        Type::Unit => Schema::Unit,
        Type::Bool => Schema::Bool,
        Type::U32 => Schema::U32,
        Type::U64 => Schema::U64,
        Type::Int => Schema::Int,
        Type::String => Schema::String,
        Type::List(a) => Schema::List(Box::new(schema(a, x, depth + 1)?)),
        Type::Option(a) => Schema::Option(Box::new(schema(a, x, depth + 1)?)),
        Type::Result(a, b) => Schema::Result(
            Box::new(schema(a, x, depth + 1)?),
            Box::new(schema(b, x, depth + 1)?),
        ),
        Type::Named(n) if p.ids.contains(n) => Schema::Id,
        Type::Named(n) if p.enums.contains_key(n) => {
            let variants = &p.enums[n];
            x.remaining = x
                .remaining
                .checked_sub(variants.len())
                .ok_or("snapshot schema size limit exceeded")?;
            Schema::Enum(variants.iter().map(|v| format!("{n}.{v}")).collect())
        }
        Type::Named(n) if p.records.contains_key(n) => {
            if x.stack.contains(n) {
                return Err("recursive portable snapshot schemas are not implemented".into());
            }
            x.stack.push(n.clone());
            let fs = p.records[n]
                .iter()
                .map(|(n, t)| Ok((n.clone(), schema(t, x, depth + 1)?)))
                .collect::<LangResult<Vec<_>>>()?;
            x.stack.pop();
            Schema::Record(fs)
        }
        _ => return Err(format!("unsupported snapshot schema {t:?}")),
    })
}
pub fn layout(p: &Program) -> LangResult<Layout> {
    let x = &mut Expansion {
        p,
        stack: vec![],
        remaining: MAX_SCHEMA_NODES,
    };
    let mut states: Vec<_> = p.states.iter().collect();
    states.sort_by_key(|s| &s.name);
    let roots = states
        .iter()
        .map(|s| {
            let Type::Table(k, v) = &s.ty else {
                return Err("snapshot root must be table".into());
            };
            Ok((s.name.clone(), schema(k, x, 0)?, schema(v, x, 0)?))
        })
        .collect::<LangResult<Vec<_>>>()?;
    let events = p
        .events
        .iter()
        .map(|(n, t)| Ok((n.clone(), schema(t, x, 0)?)))
        .collect::<LangResult<Vec<_>>>()?;
    let program = Sha256::digest(serde_json::to_vec(p).map_err(|e| e.to_string())?).into();
    let types: Vec<_> = states.iter().map(|s| (&s.name, &s.ty)).collect();
    let schema = Sha256::digest(
        serde_json::to_vec(&(1u32, &p.ids, &p.records, &p.enums, types, &p.events))
            .map_err(|e| e.to_string())?,
    )
    .into();
    Ok(Layout {
        program,
        schema,
        roots,
        events,
    })
}

/// A checked optimisation executes different code for the same source program.
/// Only the checker witness can supply the source snapshot identity; a raw hash
/// or another module cannot grant cross-program restoration authority.
pub fn selected_layout(selected: &crate::optimisation::CheckedSelection) -> LangResult<Layout> {
    let original = layout(selected.input_module().program())?;
    let mut actual = layout(selected.module().program())?;
    if actual.schema != original.schema
        || actual.roots != original.roots
        || actual.events != original.events
    {
        return Err("selection changes the portable state schema".into());
    }
    actual.program = original.program;
    Ok(actual)
}
