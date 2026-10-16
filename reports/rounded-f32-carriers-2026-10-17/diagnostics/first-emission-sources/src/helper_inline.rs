//! Bounded literal helper expansion. This changes local storage and call
//! boundaries, not source arithmetic, contracts, or implementation selection.
use super::{Emitter, Env};
use ink_core::{analysis, local_collections, recursion, syntax::*};

/// A record produced inside an expanded helper can merge its fields directly.
/// This avoids rebuilding a carrier merely to unpack it again in the caller.
pub(super) fn choose_record(
    e: &mut Emitter<'_>,
    args: &[Expr],
    env: &Env,
    ty: &Type,
) -> Option<ink_core::LangResult<String>> {
    let Type::Named(name) = ty else {
        return None;
    };
    if e.inline_depth == 0
        || e.equality.elisions.contains(name)
        || local_collections::owned(ty, e.p)
    {
        return None;
    }
    let fields = e.p.records.get(name)?;
    if fields.len() > 64 {
        return None;
    }
    let fields = fields
        .iter()
        .map(|(name, _)| name.clone())
        .collect::<Vec<_>>();
    Some((|| {
        let condition = e.expr(&args[0], env, Some(&Type::Bool))?;
        let locals = fields.iter().map(|_| e.fresh()).collect::<Vec<_>>();
        for local in &locals {
            e.line(format!("let {local};"));
        }
        e.line(format!("if({condition}){{"));
        for (index, branch) in args[1..].iter().enumerate() {
            let value = e.expr(branch, env, Some(ty))?;
            let values = match super::record_literal_fields(&value, &fields) {
                Some(values) => values,
                None => {
                    let value = e.bind(&value);
                    fields
                        .iter()
                        .map(|field| format!("{value}[{}]", super::quote(field)))
                        .collect()
                }
            };
            for (local, value) in locals.iter().zip(values) {
                e.line(format!("{local}={value};"));
            }
            e.line(if index == 0 { "}else{" } else { "}" });
        }
        Ok(format!(
            "({{{}}})",
            fields
                .iter()
                .zip(locals)
                .map(|(field, value)| format!("[{}]:{value}", super::quote(field)))
                .collect::<Vec<_>>()
                .join(",")
        ))
    })())
}

pub(super) fn eligible(e: &Emitter<'_>, f: &Function) -> bool {
    if e.inline_depth >= 4
        || e.inline_nodes == 0
        || recursion::recursive(f)
        || local_collections::owned(&f.result, e.p)
        || f.params
            .iter()
            .any(|(_, t)| local_collections::owned(t, e.p))
        || !f
            .params
            .iter()
            .any(|(_, t)| matches!(t,Type::Named(n) if e.p.records.contains_key(n)))
    {
        return false;
    }
    // Leave stack headroom for the core's type/loan visitors as well as target
    // emission. The ordinary depth limit alone cannot protect analysis invoked
    // while an expanded caller's emission frames are still live.
    let mut pending = vec![(&f.body, e.depth)];
    let mut work = e.inline_nodes.min(512);
    while let Some((body, depth)) = pending.pop() {
        if depth >= 28 || work == 0 {
            return false;
        }
        work -= 1;
        pending.extend(
            analysis::children(body)
                .into_iter()
                .map(|child| (child, depth + 1)),
        );
    }
    true
}

pub(super) fn call(e: &mut Emitter<'_>, f: &Function, actuals: &[String]) -> Option<String> {
    if !actuals.iter().any(|v| e.split.contains_key(v)) {
        return None;
    }
    let nodes = analysis::node_count(&f.body, e.inline_nodes.min(512))?;
    e.inline_nodes -= nodes;
    let start = e.lines.len();
    let callbacks = e.callbacks.len();
    let equality = e.equality.clone();
    let split = e.split.clone();
    let immutable = e.immutable_locals.clone();
    let floats = e.f32_numbers.clone();
    let normalized = e.normalized_f32.clone();
    let bit_floats = e.bit_f32_numbers.clone();
    let float_scan = e.float_scan_work;
    let next = e.next;
    let budget = e.budget;
    let in_place = std::mem::replace(
        &mut e.in_place,
        ink_core::in_place::analyse_with_result(&f.body, &f.params, Some(&f.result), e.p),
    );
    let local: Env = f
        .params
        .iter()
        .zip(actuals)
        .map(|((n, t), v)| (n.clone(), (v.clone(), t.clone())))
        .collect();
    e.inline_depth += 1;
    let result = e.expr(&f.body, &local, Some(&f.result));
    e.inline_depth -= 1;
    e.in_place = in_place;
    // Optional expansion has its own work budget; it cannot consume the
    // ordinary source's admission budget or reject a supported original call.
    e.budget = budget;
    let bytes = e.lines.len() - start + result.as_ref().map_or(0, |value| value.len());
    if let Ok(value) = result {
        if bytes <= 65_536 && bytes <= e.inline_source {
            e.inline_source -= bytes;
            return Some(value);
        }
    }
    e.lines.truncate(start);
    e.callbacks.truncate(callbacks);
    e.equality = equality;
    e.split = split;
    e.immutable_locals = immutable;
    e.f32_numbers = floats;
    e.normalized_f32 = normalized;
    e.bit_f32_numbers = bit_floats;
    e.float_scan_work = float_scan;
    e.next = next;
    None
}
