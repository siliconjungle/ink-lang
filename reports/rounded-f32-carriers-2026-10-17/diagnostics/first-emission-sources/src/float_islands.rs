//! Literal F32 arithmetic without intermediate bit round trips.
//! No reassociation, FMA, range promise or algebraic replacement is involved.
use super::{Emitter, Env, EXPRESSION_DEPTH};
use ink_core::{analysis, core::{Expr, Type}, LangResult};

pub(super) fn arithmetic(op: &str) -> bool {
    matches!(op, "+" | "-" | "*")
}

impl Emitter<'_> {
    pub(super) fn float_operand(&self, e: &Expr, env: &Env) -> bool {
        match e {
            Expr::Binary(op, _, _) => arithmetic(op),
            Expr::Var(name) => env.get(name).is_some_and(|(v, _)| self.bit_f32_numbers.contains(v)),
            _ => false,
        }
    }

    /// Optional opportunity search only. The actual carrier fact comes from
    /// emitting a typed arithmetic producer into a fresh immutable const.
    pub(super) fn float_consumer(&mut self, body: &Expr, name: &str) -> bool {
        let mut pending = vec![body];
        while let Some(e) = pending.pop() {
            if self.float_scan_work == 0 { return false; }
            self.float_scan_work -= 1;
            match e {
                Expr::Let(bound, _, initial, _) if bound == name => {
                    pending.push(initial);
                    continue;
                }
                Expr::Lambda(bound, _) if bound == name => continue,
                Expr::Binary(op, a, b) if arithmetic(op)
                    && [a.as_ref(), b.as_ref()].iter().any(|e| matches!(e,Expr::Var(n) if n==name)) => return true,
                _ => {}
            }
            pending.extend(analysis::children(e));
        }
        false
    }

    /// Return a rounded Number for arithmetic consumption only. Opaque leaves
    /// retain ordinary source evaluation, exact-bit ingress and failure order.
    /// Negation/bit observation/calls/containers stop the island; their ordinary
    /// emitter encodes canonical arithmetic NaNs and preserves copied payloads.
    pub(super) fn float_number(&mut self, e: &Expr, env: &Env) -> LangResult<String> {
        if let Expr::Binary(op, a, b) = e {
            if arithmetic(op) {
                // Same per-node source/depth accounting as the ordinary entry.
                if self.depth >= EXPRESSION_DEPTH {
                    return Err("JavaScript expression emission depth budget exceeded".into());
                }
                if self.budget == 0 { return Err("JavaScript emission budget exceeded".into()); }
                self.budget -= 1;
                self.depth += 1;
                let result = (|| {
                    let av = self.float_number(a, env)?;
                    let av = self.bind(&av);
                    let bv = self.float_number(b, env)?;
                    let bv = self.bind(&bv);
                    Ok(format!("Math.fround({av} {op} {bv})"))
                })();
                self.depth -= 1;
                return result;
            }
        }
        // Use the ordinary entry even for a known const: it owns type/resource
        // checking. Such a variable emits no source work that could be skipped.
        let value = self.expr(e, env, Some(&Type::F32))?;
        if let Expr::Var(name) = e {
            let local = &env[name].0;
            if self.bit_f32_numbers.contains(local) { return Ok(local.clone()); }
        }
        Ok(format!("__float({value})"))
    }
}
