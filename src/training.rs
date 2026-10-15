//! Offline replay of explicitly authored learning actions. Optimizer and objective
//! are Ink code; this driver does not infer gradients or change program structure.
use ink_core::{core::CheckedModule, stateful::Runtime, LangResult};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Observation {
    pub call: String,
    pub args: Value,
}
#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Trace {
    pub schema: u32,
    pub epochs: u32,
    pub observations: Vec<Observation>,
}
#[derive(Debug)]
pub struct Trained {
    pub snapshot: Vec<u8>,
    pub receipt: Value,
}
pub fn replay(module: &CheckedModule, trace: &Trace) -> LangResult<Trained> {
    let d = &module.program().contracts.learning;
    let updates = (trace.epochs as usize).checked_mul(trace.observations.len())
        .ok_or("training update limit")?;
    if trace.schema != 1 || trace.epochs == 0 || updates == 0 || updates > 100_000 {
        return Err("training requires schema 1 and 1..100000 explicit updates".into());
    }
    // Validate every entry before executing any observation.
    for o in &trace.observations {
        if !d.learn.contains(&o.call) {
            return Err(format!("offline training permits only learn changes: {}", o.call));
        }
        if !o.args.is_array() { return Err("training arguments must be an array".into()); }
    }
    let mut runtime = Runtime::from_checked(module)?;
    let mut first = None;
    let mut last = Value::Null;
    for _ in 0..trace.epochs {
        for o in &trace.observations {
            let outcome = runtime.invoke_json(&o.call, &o.args)?;
            if !outcome.committed {
                return Err(format!("training observation rejected: {}: {}", o.call, outcome.result.json()));
            }
            last = outcome.result.json();
            if first.is_none() { first = Some(last.clone()); }
        }
    }
    let snapshot = runtime.checkpoint_portable()?;
    let receipt = serde_json::json!({"schema":1,"semantics":"ink-explicit-learning-v1",
        "source_core_sha256":module.identity()?,"trace_sha256":format!("{:x}", Sha256::digest(serde_json::to_vec(trace).map_err(|e| e.to_string())?)),
        "snapshot_sha256":format!("{:x}", Sha256::digest(&snapshot)),
        "updates":updates,"epochs":trace.epochs,"observations":trace.observations.len(),
        "trainable_states":d.trainable,"first_result":first,"last_result":last,
        "scope":"Deterministic reference replay of authored learning actions. No inferred objective, automatic differentiation, convergence proof, approximation authority or automatic optimization selection."});
    Ok(Trained { snapshot, receipt })
}
