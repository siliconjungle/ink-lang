//! Learned parameters as rows, and gated edits to them.
//!
//! Rows give every learned parameter a stable, typed, human-readable address:
//! a `choice` entry is keyed by its argument values and holds a result value
//! (`recover(State.Quoted, Class.End) = Move.Close`); an `mlp` weight is keyed by
//! its index. Hosts can store rows as ordinary database rows, diff them and
//! version them like any other data.
//!
//! An edit is a set of rows proposed by anyone: a person, a training run or a
//! language-model agent. `gate` admits it only if the shapes and values are
//! valid and the exact objective on the gate's data does not get worse (or,
//! by default, strictly improves). Admission applies the edit through the
//! ordinary `__learn_set` learn change, so the result is a snapshot plus a
//! one-step trace, like `ink train`. Gating grants no equality, approximation
//! or profitability authority; it compares measured objective values only.
use ink_core::{core::CheckedModule, holes, holes::Hole, stateful::Runtime, LangResult};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub const ROWS_FORMAT: &str = "ink-learn-rows-v1";
pub const EDIT_FORMAT: &str = "ink-learn-edit-v1";
const MAX_EDIT_ROWS: usize = 16_384;

/// One learned parameter.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Row {
    pub hole: String,
    /// `choice`: the argument values. Absent for `mlp`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<Vec<String>>,
    /// `mlp`: the weight index. Absent for `choice`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index: Option<u32>,
    /// `choice`: a result value such as `"Move.Close"`; `mlp`: a number.
    pub value: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Edit {
    pub format: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    pub rows: Vec<Row>,
}

fn holes(p: &ink_core::core::Program) -> LangResult<&[Hole]> {
    let h = &p.contracts.learning.holes;
    if h.is_empty() {
        return Err("this module has no learn holes".into());
    }
    if !p.actions.iter().any(|a| a.name == holes::SET) {
        return Err("learned parameters are frozen in this module; gated edits need the live learn change".into());
    }
    Ok(h)
}

fn key_of(h: &Hole, mut i: usize) -> Vec<String> {
    h.domains
        .iter()
        .map(|d| {
            let v = d[i % d.len()].clone();
            i /= d.len();
            v
        })
        .collect()
}

fn index_of(h: &Hole, key: &[String]) -> LangResult<usize> {
    if key.len() != h.domains.len() {
        return Err(format!("{}: key needs {} values", h.name, h.domains.len()));
    }
    let (mut index, mut stride) = (0, 1);
    for (v, d) in key.iter().zip(&h.domains) {
        let k = d.iter().position(|x| x == v).ok_or_else(|| format!("{}: {v} is not one of {}", h.name, d.join(", ")))?;
        index += k * stride;
        stride *= d.len();
    }
    Ok(index)
}

/// Rows for the parameter record returned by `__learn_get`.
pub fn rows(hs: &[Hole], params: &Value) -> LangResult<Vec<Row>> {
    let mut out = vec![];
    for h in hs {
        let xs = params[&h.field].as_array().ok_or_else(|| format!("missing parameters for {}", h.name))?;
        for (i, x) in xs.iter().enumerate() {
            out.push(if h.family == "choice" {
                let k = x.as_u64().ok_or("choice parameters are ordinals")? as usize;
                Row { hole: h.name.clone(), key: Some(key_of(h, i)), index: None, value: json!(h.values.get(k).ok_or("ordinal out of range")?) }
            } else {
                Row { hole: h.name.clone(), key: None, index: Some(i as u32), value: x.clone() }
            });
        }
    }
    Ok(out)
}

/// Apply rows to a parameter record; returns the new record and the number
/// of parameters that changed.
pub fn apply(hs: &[Hole], params: &Value, edit: &[Row]) -> LangResult<(Value, usize)> {
    if edit.len() > MAX_EDIT_ROWS {
        return Err(format!("an edit holds at most {MAX_EDIT_ROWS} rows"));
    }
    let mut next = params.clone();
    let mut changed = std::collections::BTreeSet::new();
    for r in edit {
        let h = hs.iter().find(|h| h.name == r.hole).ok_or_else(|| format!("unknown hole {}", r.hole))?;
        let (i, v) = if h.family == "choice" {
            if r.index.is_some() {
                return Err(format!("{}: choice rows are addressed by key", h.name));
            }
            let i = index_of(h, r.key.as_deref().ok_or_else(|| format!("{}: row needs a key", h.name))?)?;
            let name = r.value.as_str().ok_or_else(|| format!("{}: value must be one of {}", h.name, h.values.join(", ")))?;
            let k = h.values.iter().position(|x| x == name).ok_or_else(|| format!("{}: {name} is not one of {}", h.name, h.values.join(", ")))?;
            (i, json!(k))
        } else {
            if r.key.is_some() {
                return Err(format!("{}: mlp rows are addressed by index", h.name));
            }
            let i = r.index.ok_or_else(|| format!("{}: row needs an index", h.name))? as usize;
            if i >= h.parameters as usize || !r.value.as_f64().is_some_and(f64::is_finite) {
                return Err(format!("{}: index {i} or value {} is out of range", h.name, r.value));
            }
            (i, r.value.clone())
        };
        if !changed.insert((h.name.clone(), i)) {
            return Err(format!("{}: an edit addresses parameter {i} twice", h.name));
        }
        let slot = &mut next[&h.field][i];
        if *slot == v {
            changed.remove(&(h.name.clone(), i));
        }
        *slot = v;
    }
    Ok((next, changed.len()))
}

pub struct Gated {
    pub admitted: bool,
    pub receipt: Value,
    /// Present when admitted: the new snapshot and its one-step trace.
    pub snapshot: Option<Vec<u8>>,
    pub trace: Option<Value>,
}

fn sha(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

/// Evaluate an edit on `data` with the exact objective and admit it only if
/// the objective strictly improves (or, with `allow_equal`, does not worsen).
pub fn gate(
    module: &CheckedModule,
    initial: Option<&[u8]>,
    edit: &Edit,
    objective: &str,
    data: &Value,
    allow_equal: bool,
) -> LangResult<Gated> {
    if edit.format != EDIT_FORMAT {
        return Err(format!("expected edit format {EDIT_FORMAT}"));
    }
    let p = module.program();
    let hs = holes(p)?;
    if !p.contracts.learning.objectives.iter().any(|o| o == objective) {
        return Err(format!("unknown objective {objective}"));
    }
    let query = format!("{}{objective}", holes::OBJECTIVE_PREFIX);
    let start = || match initial {
        Some(bytes) => Runtime::restore_portable(p.clone(), bytes),
        None => Runtime::from_checked(module),
    };
    let mut rt = start()?;
    let before_snapshot = rt.checkpoint_portable()?;
    let score = |rt: &mut Runtime| -> LangResult<f64> {
        rt.invoke_json(&query, data)?.result.json().as_f64().ok_or_else(|| "objective must return a number".to_string())
    };
    let params = rt.invoke_json(holes::GET, &json!([]))?.result.json();
    let (next, changed) = apply(hs, &params, &edit.rows)?;
    let before = score(&mut rt)?;
    let mut receipt = json!({
        "semantics": "ink-learn-gate-v1",
        "source_core_sha256": module.identity()?,
        "objective": objective,
        "data_sha256": sha(serde_json::to_string(data).map_err(|e| e.to_string())?.as_bytes()),
        "edit_sha256": sha(serde_json::to_string(edit).map_err(|e| e.to_string())?.as_bytes()),
        "author": edit.author,
        "reason": edit.reason,
        "rows": edit.rows.len(),
        "changed_parameters": changed,
        "rule": if allow_equal { "no-regression" } else { "strict-improvement" },
        "before": before,
        "before_snapshot_sha256": sha(&before_snapshot),
    });
    let set = rt.invoke_json(holes::SET, &json!([next]))?;
    let applied = set.result.json() == json!({"Ok": null}) && set.committed;
    let after = if applied { Some(score(&mut rt)?) } else { None };
    let admitted = changed > 0 && after.is_some_and(|a| a < before || (allow_equal && a <= before));
    receipt["after"] = json!(after);
    receipt["admitted"] = json!(admitted);
    if !applied {
        receipt["rejection"] = json!("the parameter record failed its shape check");
    } else if changed == 0 {
        receipt["rejection"] = json!("the edit changes no parameter");
    } else if !admitted {
        receipt["rejection"] = json!("the objective did not improve on the gate data");
    }
    if !admitted {
        return Ok(Gated { admitted, receipt, snapshot: None, trace: None });
    }
    // Publish one learning commit over the starting state, so the snapshot
    // equals a replay of the trace (`ink build-model` accepts it).
    let mut publish = start()?;
    if !publish.invoke_json(holes::SET, &json!([next]))?.committed {
        return Err("admitted parameters were rejected on publication".into());
    }
    let snapshot = publish.checkpoint_portable()?;
    receipt["after_snapshot_sha256"] = json!(sha(&snapshot));
    let trace = json!({"schema": 1, "epochs": 1, "observations": [{"call": holes::SET, "args": [next]}]});
    Ok(Gated { admitted, receipt, snapshot: Some(snapshot), trace: Some(trace) })
}
