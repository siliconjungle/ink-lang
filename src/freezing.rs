//! An explicitly requested restriction of mutable state, producing a new source.
//! This is not an equality-preserving replacement of the original mutable API.
use crate::{core::CheckedModule, snapshot, snapshot_wire, stateful::Runtime, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
pub struct Restricted {
    pub module: CheckedModule,
    pub snapshot: Vec<u8>,
    pub receipt: Value,
}
pub fn restrict(module: &CheckedModule, bytes: &[u8], roots: &[String]) -> LangResult<Restricted> {
    let roots = roots.iter().cloned().collect::<BTreeSet<_>>();
    if roots.is_empty() || roots.len() > 256 {
        return Err("freeze requires 1..256 state roots".into());
    }
    for name in &roots {
        if !module.program().states.iter().any(|s| &s.name == name) {
            return Err(format!("unknown freeze root: {name}"));
        }
    }
    // Validate the complete original state and its existing ingress invariants.
    Runtime::restore_portable_checked(module, bytes)?;
    let layout = snapshot::layout(module.program())?;
    let logical = snapshot_wire::decode(&layout, bytes, Default::default())?;
    let mut p = module.program().clone();
    for name in &roots {
        let index = layout
            .roots
            .iter()
            .position(|(n, _, _)| n == name)
            .ok_or("freeze root layout")?;
        p.frozen
            .entry(name.clone())
            .or_insert_with(|| logical.tables[index].clone());
    }
    let actions = crate::action_ir::CheckedActions::elaborate_with_frozen_roots(module)?;
    let mut removed = p
        .actions
        .iter()
        .filter(|a| a.writes.iter().any(|n| roots.contains(n)))
        .map(|a| a.name.clone())
        .collect::<BTreeSet<_>>();
    loop {
        let mut extra = BTreeSet::new();
        for (index, action) in p.actions.iter().enumerate() {
            if removed.contains(&action.name) {
                continue;
            }
            for node in &actions.action(index).ok_or("freeze action body")?.nodes {
                use crate::action_ir::Kind;
                if let Kind::QueryCall { action: callee, .. }
                | Kind::ChangeCall { action: callee, .. } = &node.kind
                {
                    if removed.contains(&p.actions[*callee].name) {
                        extra.insert(action.name.clone());
                    }
                }
            }
        }
        if extra.is_empty() {
            break;
        }
        removed.extend(extra);
    }
    p.actions.retain(|a| !removed.contains(&a.name));
    let c = &mut p.contracts;
    c.learning.trainable.retain(|n| !roots.contains(n));
    c.learning.learn.retain(|n| !removed.contains(n));
    c.learning.adaptive.retain(|n| !removed.contains(n));
    c.action_protocols.retain(|n, _| !removed.contains(n));
    c.specifications.retain(|s| !removed.contains(&s.name));
    c.implementations
        .retain(|s| !removed.contains(&s.name) && !removed.contains(&s.specification));
    c.inferred.retain(|n, _| !removed.contains(n));
    c.precondition_checks.retain(|n, _| !removed.contains(n));
    let belongs_to_removed = |key: &str| {
        removed.iter().any(|name| {
            key == name
                || key
                    .strip_prefix(name)
                    .is_some_and(|tail| tail.starts_with(':'))
        })
    };
    c.proofs.retain(|n, _| !belongs_to_removed(n));
    c.state_proofs.retain(|n, _| !belongs_to_removed(n));
    // Retained constraints and evidence are checked against the new source.
    // Invalid evidence never silently removes an invariant or grants a rewrite.
    let restricted = CheckedModule::from_source(p)?;
    let target_layout = snapshot::layout(restricted.program())?;
    let projected = snapshot_wire::encode(&target_layout, &logical, Default::default())?;
    Runtime::restore_portable_checked(&restricted, &projected)?;
    let receipt = json!({"schema":1,"semantics":"ink-frozen-source-v1",
        "parent_source_core_sha256":module.identity()?,"source_core_sha256":restricted.identity()?,
        "parent_snapshot_sha256":format!("{:x}",Sha256::digest(bytes)),
        "snapshot_sha256":format!("{:x}",Sha256::digest(&projected)),
        "frozen_roots":roots,"removed_actions":removed,
        "remaining_trainable":restricted.program().contracts.learning.trainable,
        "scope":"Explicit immutable source bindings and withdrawal of their writers/callers; complete state rebind with unchanged logical payload. Not an equality-preserving change of the original mutable API or a compiler-correctness proof."});
    Ok(Restricted {
        module: restricted,
        snapshot: projected,
        receipt,
    })
}
