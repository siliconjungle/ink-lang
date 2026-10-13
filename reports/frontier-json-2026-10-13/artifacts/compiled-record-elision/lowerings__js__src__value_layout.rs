//! Private checkpoint carrier annotations. Logical schema identities and byte
//! formats remain those of the original source, independent of storage choices.
use ink_core::{
    syntax::{Program, Type},
    LangResult,
};
use serde_json::Value;
use std::collections::BTreeSet;
fn annotate(
    p: &Program,
    t: &Type,
    node: &mut Value,
    elisions: &BTreeSet<String>,
    depth: usize,
) -> LangResult<()> {
    if depth > 128 {
        return Err("private snapshot descriptor depth limit".into());
    }
    if node["kind"] == "ref" {
        return Ok(());
    }
    if node["kind"] == "bind" {
        return annotate(p, t, &mut node["body"], elisions, depth + 1);
    }
    match t {
        Type::Named(n) if p.records.contains_key(n) => {
            if elisions.contains(n) {
                node["elided"] = true.into();
            }
            for (field, ty) in &p.records[n] {
                let f = node["fields"]
                    .as_array_mut()
                    .and_then(|fs| fs.iter_mut().find(|f| f["name"] == field.as_str()))
                    .ok_or("private snapshot record correspondence")?;
                annotate(p, ty, &mut f["type"], elisions, depth + 1)?;
            }
        }
        Type::List(t) | Type::Vector(t, _) | Type::Option(t) => {
            annotate(p, t, &mut node["element"], elisions, depth + 1)?
        }
        Type::Result(a, b) => {
            annotate(p, a, &mut node["ok"], elisions, depth + 1)?;
            annotate(p, b, &mut node["error"], elisions, depth + 1)?;
        }
        _ => (),
    }
    Ok(())
}
pub(super) fn snapshots(
    p: &Program,
    meta: &mut Value,
    elisions: &BTreeSet<String>,
) -> LangResult<()> {
    if elisions.is_empty() {
        return Ok(());
    }
    for (root, state) in meta["roots"]
        .as_array_mut()
        .ok_or("state roots")?
        .iter_mut()
        .zip(&p.states)
    {
        let Type::Table(k, v) = &state.ty else {
            return Err("state root type".into());
        };
        annotate(p, k, &mut root["snapshotKey"], elisions, 0)?;
        annotate(p, v, &mut root["snapshotValue"], elisions, 0)?;
    }
    for event in meta["events"].as_array_mut().ok_or("state events")? {
        let ty = &p.events[event["name"].as_str().ok_or("event name")?];
        annotate(p, ty, &mut event["snapshotType"], elisions, 0)?;
    }
    Ok(())
}
