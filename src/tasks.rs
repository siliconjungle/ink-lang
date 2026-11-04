//! Reference execution of task manifests (see core/src/tasks.rs and
//! docs/effect-tasks.md).
//!
//! This runner is sequential: steps run in source order, which defines the
//! meaning every concurrent host must reproduce. Effect replies come from a
//! caller-supplied function; `replay` supplies them from a recorded trace, so a
//! trace produced by a concurrent JavaScript host can be checked against the
//! reference evaluator step by step.
use ink_core::{
    stateful::Runtime,
    tasks::{Kind, Task, Tasks},
    LangResult,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;

pub const TRACE_FORMAT: &str = "ink-task-trace-v1";

/// One effect request and the reply the host received.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct EffectRecord {
    pub step: u32,
    pub effect: String,
    pub args: Vec<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reply: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    /// `accepted`, `fallback`, `failed` (unguarded failure) or `discarded`
    /// (started speculatively after an earlier step ended the task).
    pub outcome: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Trace {
    pub format: String,
    pub task: String,
    pub args: Vec<Value>,
    pub effects: Vec<EffectRecord>,
    /// The task's Ink result, absent when an unguarded effect failed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn task<'a>(m: &'a Tasks, name: &str) -> LangResult<&'a Task> {
    m.tasks.iter().find(|t| t.name == name).ok_or_else(|| format!("unknown task {name}"))
}

fn call(rt: &mut Runtime, name: &str, args: Vec<Value>) -> LangResult<Value> {
    Ok(rt.invoke_json(name, &Value::Array(args))?.result.json())
}

/// Run `name` sequentially. `effect(step, effect, args)` performs one request.
pub fn run(
    rt: &mut Runtime,
    m: &Tasks,
    name: &str,
    args: &[Value],
    effect: &mut dyn FnMut(u32, &str, &[Value]) -> Result<Value, String>,
) -> LangResult<Trace> {
    let t = task(m, name)?;
    if args.len() != t.params.len() {
        return Err(format!("task {name} takes {} arguments", t.params.len()));
    }
    let mut ctx: BTreeMap<String, Value> = t.params.iter().map(|(n, _)| n.clone()).zip(args.iter().cloned()).collect();
    let mut trace = Trace { format: TRACE_FORMAT.into(), task: name.into(), args: args.to_vec(), effects: vec![], result: None, error: None };
    for (i, s) in t.steps.iter().enumerate() {
        let uses: Vec<Value> = s.uses.iter().map(|n| ctx[n].clone()).collect();
        let mut computed = vec![];
        for q in &s.args {
            computed.push(call(rt, q, uses.clone())?);
        }
        let value = match s.kind {
            Kind::Value => call(rt, &s.callee, uses.clone())?,
            Kind::Query | Kind::Change => call(rt, &s.callee, computed)?,
            Kind::Effect => {
                let reply = effect(i as u32, &s.callee, &computed);
                let accepted = reply.as_ref().ok().and_then(|v| {
                    let mut with = uses.clone();
                    with.push(v.clone());
                    // A reply that does not decode to the declared type is rejected.
                    call(rt, s.accept.as_ref()?, with).ok().filter(|ok| ok == &json!(true)).map(|_| v.clone())
                });
                let mut record = EffectRecord {
                    step: i as u32,
                    effect: s.callee.clone(),
                    args: computed,
                    reply: reply.as_ref().ok().cloned(),
                    error: reply.as_ref().err().cloned(),
                    outcome: "accepted".into(),
                };
                match (accepted, &s.fallback) {
                    (Some(v), _) => {
                        trace.effects.push(record);
                        v
                    }
                    (None, Some(f)) => {
                        record.outcome = "fallback".into();
                        trace.effects.push(record);
                        call(rt, f, uses.clone())?
                    }
                    (None, None) => {
                        record.outcome = "failed".into();
                        trace.error = Some(match &record.error {
                            Some(e) => format!("effect {} failed: {e}", s.callee),
                            None => format!("effect {} returned a value its declared type or contract rejects", s.callee),
                        });
                        trace.effects.push(record);
                        return Ok(trace);
                    }
                }
            }
        };
        let value = if s.propagate {
            match value {
                Value::Object(o) if o.contains_key("Err") => {
                    trace.result = Some(Value::Object(o));
                    return Ok(trace);
                }
                Value::Object(mut o) if o.contains_key("Ok") => o.remove("Ok").unwrap(),
                other => return Err(format!("step {}: expected a Result, got {other}", i + 1)),
            }
        } else {
            value
        };
        if let Some(b) = &s.bind {
            ctx.insert(b.clone(), value);
        }
    }
    let uses = t.ret_uses.iter().map(|n| ctx[n].clone()).collect();
    trace.result = Some(call(rt, &t.ret, uses)?);
    Ok(trace)
}

/// Re-run a recorded trace against the reference evaluator. Effect replies are
/// taken from the trace by step; requests must match exactly. Returns the
/// reference trace, whose result, error and non-discarded outcomes must equal
/// the recording's.
pub fn replay(rt: &mut Runtime, m: &Tasks, recorded: &Trace) -> LangResult<Trace> {
    if recorded.format != TRACE_FORMAT {
        return Err(format!("expected trace format {TRACE_FORMAT}"));
    }
    let by_step: BTreeMap<u32, &EffectRecord> = recorded.effects.iter().map(|r| (r.step, r)).collect();
    if by_step.len() != recorded.effects.len() {
        return Err("trace records a step twice".into());
    }
    let mut mismatch = None;
    let trace = run(rt, m, &recorded.task, &recorded.args, &mut |step, effect, args| {
        let Some(r) = by_step.get(&step) else {
            mismatch.get_or_insert(format!("trace has no reply for step {}", step + 1));
            return Err("missing".into());
        };
        if r.effect != effect || r.args != args {
            mismatch.get_or_insert(format!("step {}: request differs from the recorded {}({:?})", step + 1, r.effect, r.args));
        }
        match (&r.reply, &r.error) {
            (Some(v), None) => Ok(v.clone()),
            (None, Some(e)) => Err(e.clone()),
            _ => {
                mismatch.get_or_insert(format!("step {}: record needs exactly one of reply or error", step + 1));
                Err("malformed".into())
            }
        }
    })?;
    if let Some(m) = mismatch {
        return Err(m);
    }
    let kept: Vec<&EffectRecord> = recorded.effects.iter().filter(|r| r.outcome != "discarded").collect();
    let mut sorted = kept.clone();
    sorted.sort_by_key(|r| r.step);
    if sorted.len() != trace.effects.len()
        || sorted.iter().zip(&trace.effects).any(|(a, b)| a.step != b.step || a.outcome != b.outcome)
        || recorded.effects.iter().any(|r| r.outcome == "discarded" && trace.effects.iter().any(|b| b.step == r.step))
    {
        return Err("recorded effect outcomes differ from sequential execution".into());
    }
    if trace.result != recorded.result || trace.error.is_some() != recorded.error.is_some() {
        return Err(format!(
            "recorded result {:?} differs from sequential execution {:?}",
            recorded.result.as_ref().map(Value::to_string).or(recorded.error.clone()),
            trace.result.as_ref().map(Value::to_string).or(trace.error.clone())
        ));
    }
    Ok(trace)
}
