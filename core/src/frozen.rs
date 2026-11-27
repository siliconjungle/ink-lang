//! Fixed immutable state bindings. These are source meaning, not rewrite proofs.
use crate::{core::Program, stateful::Value, LangResult};
use serde_json::Value as Json;
use std::collections::BTreeMap;

pub type Bindings = BTreeMap<String, Vec<(Json, Json)>>;
pub type Tables = BTreeMap<String, BTreeMap<Value, Value>>;

/// Decode fixed data using the same nominal/bit-preserving value boundary as
/// ordinary state. No source evaluation or snapshot restoration occurs here.
pub fn tables(p: &Program) -> LangResult<Tables> {
    let mut out = BTreeMap::new();
    for (name, rows) in &p.frozen {
        let root = p
            .states
            .iter()
            .find(|s| &s.name == name)
            .ok_or_else(|| format!("unknown frozen state: {name}"))?;
        let crate::core::Type::Table(key, value) = &root.ty else {
            return Err("frozen state requires a table root".into());
        };
        let mut table = BTreeMap::new();
        let mut previous = None;
        for (k, v) in rows {
            let k = Value::from_json(k, key, p)?;
            let v = Value::from_json(v, value, p)?;
            if previous.as_ref().is_some_and(|before| before >= &k) {
                return Err("frozen state keys must be strictly ordered".into());
            }
            previous = Some(k.clone());
            table.insert(k, v);
        }
        out.insert(name.clone(), table);
    }
    Ok(out)
}

pub fn check(p: &Program) -> LangResult<()> {
    if p.frozen.is_empty() {
        return Ok(());
    }
    if p.frozen.len() > 256 {
        return Err("frozen root limit".into());
    }
    let mut nodes = 0usize;
    let mut rows = 0usize;
    for (name, values) in &p.frozen {
        rows = rows.checked_add(values.len()).ok_or("frozen row limit")?;
        if rows > 100_000 {
            return Err("frozen row limit".into());
        }
        if p.contracts.learning.trainable.contains(name) {
            return Err(format!("frozen state is not trainable: {name}"));
        }
        if p.actions.iter().any(|a| a.writes.contains(name)) {
            return Err(format!("write capability for frozen state: {name}"));
        }
        let mut pending = values
            .iter()
            .flat_map(|(k, v)| [(k, 0usize), (v, 0usize)])
            .collect::<Vec<_>>();
        while let Some((value, depth)) = pending.pop() {
            nodes += 1;
            if nodes > 100_000 || depth > 64 {
                return Err("frozen value structural limit".into());
            }
            match value {
                Json::Array(xs) => pending.extend(xs.iter().map(|v| (v, depth + 1))),
                Json::Object(xs) => pending.extend(xs.values().map(|v| (v, depth + 1))),
                _ => (),
            }
        }
    }
    tables(p)?;
    let layout = crate::snapshot::layout(p)?;
    for (name, rows) in &p.frozen {
        let (_, key, value) = layout
            .roots
            .iter()
            .find(|(n, _, _)| n == name)
            .ok_or("frozen snapshot root")?;
        crate::snapshot_wire::table_bytes(key, value, rows, Default::default())?;
    }
    Ok(())
}
