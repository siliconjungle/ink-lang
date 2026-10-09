//! Build the portable logical schema independently of physical storage.
use crate::{
    snapshot_wire::{Layout, Schema},
    syntax::*,
    LangResult,
};
use sha2::{Digest, Sha256};
fn schema(t: &Type, p: &Program, stack: &mut Vec<String>, depth: usize) -> LangResult<Schema> {
    if depth > 128 {
        return Err("snapshot schema depth exceeded".into());
    }
    Ok(match t {
        Type::Unit => Schema::Unit,
        Type::Bool => Schema::Bool,
        Type::U32 => Schema::U32,
        Type::U64 => Schema::U64,
        Type::Int => Schema::Int,
        Type::String => Schema::String,
        Type::List(a) => Schema::List(Box::new(schema(a, p, stack, depth + 1)?)),
        Type::Option(a) => Schema::Option(Box::new(schema(a, p, stack, depth + 1)?)),
        Type::Result(a, b) => Schema::Result(
            Box::new(schema(a, p, stack, depth + 1)?),
            Box::new(schema(b, p, stack, depth + 1)?),
        ),
        Type::Named(n) if p.ids.contains(n) => Schema::Id,
        Type::Named(n) if p.enums.contains_key(n) => {
            Schema::Enum(p.enums[n].iter().map(|v| format!("{n}.{v}")).collect())
        }
        Type::Named(n) if p.records.contains_key(n) => {
            if stack.contains(n) {
                return Err("recursive portable snapshot schemas are not implemented".into());
            }
            stack.push(n.clone());
            let fs = p.records[n]
                .iter()
                .map(|(n, t)| Ok((n.clone(), schema(t, p, stack, depth + 1)?)))
                .collect::<LangResult<Vec<_>>>()?;
            stack.pop();
            Schema::Record(fs)
        }
        _ => return Err(format!("unsupported snapshot schema {t:?}")),
    })
}
pub fn layout(p: &Program) -> LangResult<Layout> {
    let mut states: Vec<_> = p.states.iter().collect();
    states.sort_by_key(|s| &s.name);
    let roots = states
        .iter()
        .map(|s| {
            let Type::Table(k, v) = &s.ty else {
                return Err("snapshot root must be table".into());
            };
            Ok((
                s.name.clone(),
                schema(k, p, &mut vec![], 0)?,
                schema(v, p, &mut vec![], 0)?,
            ))
        })
        .collect::<LangResult<Vec<_>>>()?;
    let events = p
        .events
        .iter()
        .map(|(n, t)| Ok((n.clone(), schema(t, p, &mut vec![], 0)?)))
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
pub fn schema_code(s: &Schema) -> String {
    match s {
        Schema::Unit => "portable::Schema::Unit".into(),
        Schema::Bool => "portable::Schema::Bool".into(),
        Schema::U32 => "portable::Schema::U32".into(),
        Schema::U64 => "portable::Schema::U64".into(),
        Schema::Int => "portable::Schema::Int".into(),
        Schema::String => "portable::Schema::String".into(),
        Schema::Id => "portable::Schema::Id".into(),
        Schema::List(a) => format!("portable::Schema::List(Box::new({}))", schema_code(a)),
        Schema::Option(a) => format!("portable::Schema::Option(Box::new({}))", schema_code(a)),
        Schema::Result(a, b) => format!(
            "portable::Schema::Result(Box::new({}),Box::new({}))",
            schema_code(a),
            schema_code(b)
        ),
        Schema::Record(fs) => format!(
            "portable::Schema::Record(vec![{}])",
            fs.iter()
                .map(|(n, t)| format!("({n:?}.into(),{})", schema_code(t)))
                .collect::<Vec<_>>()
                .join(",")
        ),
        Schema::Enum(v) => format!(
            "portable::Schema::Enum(vec![{}])",
            v.iter()
                .map(|n| format!("{n:?}.into()"))
                .collect::<Vec<_>>()
                .join(",")
        ),
    }
}
