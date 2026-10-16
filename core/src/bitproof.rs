//! Fixed scalar semantics encoded as Boolean circuits, plus hinted RUP checking.
//! No solver, rewrite catalogue or polynomial normalisation runs here.
use crate::{
    logic::{Equation, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
#[path = "bitproof_division.rs"]
mod division;
#[path = "bitproof_counts.rs"]
mod counts;
#[path = "bitproof_hints.rs"]
mod hint_transport;

const MAX_VARIABLES: usize = 100_000;
const MAX_CLAUSES: usize = 300_000;
const MAX_STEPS: usize = 20_000;
const MAX_WORK: usize = 20_000_000;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Step {
    pub clause: Vec<i32>,
    /// Zero-based indices into the original CNF followed by accepted clauses.
    pub hints: Vec<usize>,
    /// Optional bounded lossless hint transport. `hints` must be empty.
    /// This changes storage only; every decoded reference is replayed normally.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hint_deltas_v1: Option<String>,
}
/// Selects a fixed, reconstructed Boolean encoding, never proof authority.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Encoding {
    #[default]
    LiteralV1,
    SharedV2,
}
impl Encoding {
    fn is_literal(&self) -> bool {
        *self == Self::LiteralV1
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Certificate {
    #[serde(default, skip_serializing_if = "Encoding::is_literal")]
    pub encoding: Encoding,
    pub problem_sha256: String,
    pub steps: Vec<Step>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Problem {
    #[serde(skip_serializing_if = "Encoding::is_literal")]
    encoding: Encoding,
    semantics: &'static str,
    variables: usize,
    clauses: Vec<Vec<i32>>,
    inputs: BTreeMap<String, Value>,
    sha256: String,
}
impl Problem {
    pub fn clauses(&self) -> &[Vec<i32>] {
        &self.clauses
    }
    pub fn variables(&self) -> usize {
        self.variables
    }
    pub fn identity(&self) -> &str {
        &self.sha256
    }
}
#[derive(Clone, Debug, Serialize)]
enum Value {
    Bool(i32),
    Word(Vec<i32>),
}
struct Circuit {
    encoding: Encoding,
    gates: BTreeMap<(u8, i32, i32), i32>,
    variables: usize,
    clauses: Vec<Vec<i32>>,
    inputs: BTreeMap<String, Value>,
    remaining: usize,
}
impl Circuit {
    fn fresh(&mut self) -> LangResult<i32> {
        if self.variables >= MAX_VARIABLES {
            return Err("bit circuit variable limit".into());
        }
        self.variables += 1;
        Ok(self.variables as i32)
    }
    fn clause(&mut self, mut clause: Vec<i32>) -> LangResult<()> {
        if self.clauses.len() >= MAX_CLAUSES {
            return Err("bit circuit clause limit".into());
        }
        clause.sort_unstable();
        clause.dedup();
        self.clauses.push(clause);
        Ok(())
    }
    fn gate(&mut self, op: &str, mut a: i32, mut b: i32) -> LangResult<i32> {
        let kind = match op {
            "and" => 0,
            "or" => 1,
            "xor" => 2,
            _ => return Err("unknown Boolean gate".into()),
        };
        if self.encoding == Encoding::SharedV2 {
            let reduced = match op {
                "and" if a == -1 || b == -1 || a == -b => Some(-1),
                "and" if a == 1 || a == b => Some(b),
                "and" if b == 1 => Some(a),
                "or" if a == 1 || b == 1 || a == -b => Some(1),
                "or" if a == -1 || a == b => Some(b),
                "or" if b == -1 => Some(a),
                "xor" if a == b => Some(-1),
                "xor" if a == -b => Some(1),
                "xor" if a == -1 => Some(b),
                "xor" if b == -1 => Some(a),
                "xor" if a == 1 => Some(-b),
                "xor" if b == 1 => Some(-a),
                _ => None,
            };
            if let Some(value) = reduced {
                return Ok(value);
            }
            if a > b {
                std::mem::swap(&mut a, &mut b);
            }
            if let Some(value) = self.gates.get(&(kind, a, b)) {
                return Ok(*value);
            }
        }
        let z = self.fresh()?;
        let clauses = match op {
            "and" => vec![vec![-z, a], vec![-z, b], vec![z, -a, -b]],
            "or" => vec![vec![z, -a], vec![z, -b], vec![-z, a, b]],
            "xor" => vec![
                vec![-a, -b, -z],
                vec![a, b, -z],
                vec![a, -b, z],
                vec![-a, b, z],
            ],
            _ => return Err("unknown Boolean gate".into()),
        };
        for clause in clauses {
            self.clause(clause)?;
        }
        if self.encoding == Encoding::SharedV2 {
            self.gates.insert((kind, a, b), z);
        }
        Ok(z)
    }
    fn select(&mut self, c: i32, a: i32, b: i32) -> LangResult<i32> {
        let z = self.fresh()?;
        for clause in [
            vec![-c, -a, z],
            vec![-c, a, -z],
            vec![c, -b, z],
            vec![c, b, -z],
        ] {
            self.clause(clause)?;
        }
        Ok(z)
    }
    fn add(&mut self, a: &[i32], b: &[i32], mut carry: i32) -> LangResult<Vec<i32>> {
        let mut out = Vec::with_capacity(64);
        for (&a, &b) in a.iter().zip(b) {
            let ab = self.gate("xor", a, b)?;
            out.push(self.gate("xor", ab, carry)?);
            let first = self.gate("and", a, b)?;
            let second = self.gate("and", ab, carry)?;
            carry = self.gate("or", first, second)?;
        }
        Ok(out)
    }
    fn unequal(&mut self, a: Value, b: Value) -> LangResult<i32> {
        match (a, b) {
            (Value::Bool(a), Value::Bool(b)) => self.gate("xor", a, b),
            (Value::Word(a), Value::Word(b)) => {
                let mut out = -1;
                for (a, b) in a.into_iter().zip(b) {
                    let bit = self.gate("xor", a, b)?;
                    out = self.gate("or", out, bit)?;
                }
                Ok(out)
            }
            _ => Err("bit circuit equality type mismatch".into()),
        }
    }
    fn less(&mut self, a: &[i32], b: &[i32]) -> LangResult<i32> {
        let mut less = -1;
        // More significant unequal bits override the comparison of lower bits.
        for (&a, &b) in a.iter().zip(b) {
            let different = self.gate("xor", a, b)?;
            let smaller = self.gate("and", -a, b)?;
            less = self.select(different, smaller, less)?;
        }
        Ok(less)
    }
    // Fixed binary32 meanings over the low 32 raw bits, matching logic's
    // f32 primitives. No arithmetic, rounding, or NaN-payload assumption.
    fn f32_exponent_all_ones(&mut self, a: &[i32]) -> LangResult<i32> {
        let mut all = 1;
        for &bit in &a[23..31] { all = self.gate("and", all, bit)?; }
        Ok(all)
    }
    fn f32_nan(&mut self, a: &[i32]) -> LangResult<i32> {
        let exponent = self.f32_exponent_all_ones(a)?;
        let mut fraction = -1;
        for &bit in &a[..23] { fraction = self.gate("or", fraction, bit)?; }
        self.gate("and", exponent, fraction)
    }
    fn f32_primitive(&mut self, op: &str, a: &[i32], b: &[i32]) -> LangResult<Value> {
        if a.len() != 64 || b.len() != 64 { return Err("binary32 circuit word width".into()); }
        match op {
            "f32:neg" => {
                let mut bits = vec![-1; 64];
                bits[..32].copy_from_slice(&a[..32]);
                bits[31] = -bits[31];
                return Ok(Value::Word(bits));
            }
            "f32:is_nan" => return Ok(Value::Bool(self.f32_nan(a)?)),
            "f32:is_finite" => return Ok(Value::Bool(-self.f32_exponent_all_ones(a)?)),
            "f32:==" | "f32:!=" | "f32:<" | "f32:<=" | "f32:>" | "f32:>=" => (),
            _ => return Err("unsupported binary32 bit circuit primitive".into()),
        }
        let nan_a = self.f32_nan(a)?;
        let nan_b = self.f32_nan(b)?;
        let ordered = -self.gate("or", nan_a, nan_b)?;
        let mut magnitude_a = -1;
        let mut magnitude_b = -1;
        let mut different = -1;
        for i in 0..32 {
            if i < 31 {
                magnitude_a = self.gate("or", magnitude_a, a[i])?;
                magnitude_b = self.gate("or", magnitude_b, b[i])?;
            }
            let bit = self.gate("xor", a[i], b[i])?;
            different = self.gate("or", different, bit)?;
        }
        let both_zero = self.gate("and", -magnitude_a, -magnitude_b)?;
        let equal = self.gate("or", -different, both_zero)?;
        if op == "f32:==" || op == "f32:!=" {
            let equal = self.gate("and", ordered, equal)?;
            return Ok(Value::Bool(if op == "f32:==" { equal } else { -equal }));
        }
        let (a, b) = if op == "f32:>" || op == "f32:>=" { (b, a) } else { (a, b) };
        let magnitude_less = self.less(&a[..31], &b[..31])?;
        let magnitude_greater = self.less(&b[..31], &a[..31])?;
        let same_sign_less = self.select(a[31], magnitude_greater, magnitude_less)?;
        let different_sign = self.gate("xor", a[31], b[31])?;
        let less = self.select(different_sign, a[31], same_sign_less)?;
        let less = self.gate("and", less, -both_zero)?;
        let result = if op.ends_with('=') { self.gate("or", less, equal)? } else { less };
        Ok(Value::Bool(self.gate("and", ordered, result)?))
    }
    fn term(&mut self, t: &Term, env: &BTreeMap<String, Sort>, depth: usize) -> LangResult<Value> {
        if depth > 128 || self.remaining == 0 {
            return Err("bit circuit term limit".into());
        }
        self.remaining -= 1;
        match t {
            Term::Bool(b) => Ok(Value::Bool(if *b { 1 } else { -1 })),
            Term::U64(n) => Ok(Value::Word(
                (0..64)
                    .map(|i| if n & (1 << i) != 0 { 1 } else { -1 })
                    .collect(),
            )),
            Term::Var(n) => {
                if let Some(v) = self.inputs.get(n) {
                    return Ok(v.clone());
                }
                let value = match env.get(n) {
                    Some(Sort::Bool) => Value::Bool(self.fresh()?),
                    Some(Sort::U64) => {
                        Value::Word((0..64).map(|_| self.fresh()).collect::<LangResult<_>>()?)
                    }
                    _ => return Err("bit circuits require scalar variables".into()),
                };
                self.inputs.insert(n.clone(), value.clone());
                Ok(value)
            }
            Term::Binary { op, left, right } => {
                let a = self.term(left, env, depth + 1)?;
                let b = self.term(right, env, depth + 1)?;
                if op == "==" || op == "!=" {
                    let different = self.unequal(a, b)?;
                    return Ok(Value::Bool(if op == "==" { -different } else { different }));
                }
                match (a, b) {
                    (Value::Bool(a), Value::Bool(b)) if op == "&&" || op == "||" => Ok(
                        Value::Bool(self.gate(if op == "&&" { "and" } else { "or" }, a, b)?),
                    ),
                    (Value::Word(a), Value::Word(b)) if op.starts_with("f32:") => self.f32_primitive(op, &a, &b),
                    (Value::Word(a), Value::Word(b)) if matches!(op.as_str(),
                        "word32.udiv" | "word32.urem" | "word64.udiv" | "word64.urem" |
                        "word32.sdiv" | "word32.srem") => self.word_division(op, &a, &b),
                    (Value::Word(a), Value::Word(_)) if matches!(op.as_str(),
                        "word32.popcount" | "word64.popcount" |
                        "word32.leading_zeros" | "word64.leading_zeros" |
                        "word32.trailing_zeros" | "word64.trailing_zeros") => self.word_count(op, &a),
                    (Value::Word(a), Value::Word(b)) => match op.as_str() {
                        "|" | "^" => Ok(Value::Word(a.iter().zip(&b).map(|(&a,&b)|
                            self.gate(if op=="|"{"or"}else{"xor"},a,b)
                        ).collect::<LangResult<_>>()?)),
                        "word32.shl" | "word32.shr" | "word32.sar" | "word64.shl" | "word64.shr" |
                        "word32.rol" | "word32.ror" | "word64.rol" | "word64.ror" => {
                            let width=if op.starts_with("word32."){32}else{64};
                            let left=op.ends_with(".shl") || op.ends_with(".rol");
                            let rotate=op.ends_with(".rol") || op.ends_with(".ror");let mut bits=a;
                            for (stage,&condition) in b.iter().take(if width==32{5}else{6}).enumerate(){
                                let shift=1usize<<stage;let mut next=Vec::with_capacity(64);
                                for index in 0..64usize {
                                    let changed=if index>=width{-1}else if rotate {
                                        bits[if left{(index+width-shift)%width}else{(index+shift)%width}]
                                    }else if left{
                                        if index>=shift{bits[index-shift]}else{-1}
                                    }else if index+shift<width{bits[index+shift]}
                                    else if op.ends_with(".sar"){bits[width-1]}else{-1};
                                    next.push(if index>=width{-1}else{self.select(condition,changed,bits[index])?});
                                }
                                bits=next;
                            }
                            Ok(Value::Word(bits))
                        }
                        "&" => Ok(Value::Word(
                            a.iter()
                                .zip(&b)
                                .map(|(&x, &y)| {
                                    if x == -1 || y == -1 {
                                        Ok(-1)
                                    } else if x == 1 {
                                        Ok(y)
                                    } else if y == 1 {
                                        Ok(x)
                                    } else {
                                        self.gate("and", x, y)
                                    }
                                })
                                .collect::<LangResult<_>>()?,
                        )),
                        "+" => Ok(Value::Word(self.add(&a, &b, -1)?)),
                        "-" => Ok(Value::Word(self.add(
                            &a,
                            &b.iter().map(|x| -x).collect::<Vec<_>>(),
                            1,
                        )?)),
                        "*" => {
                            let mut product = vec![-1; 64];
                            for (shift, &bit) in b.iter().enumerate() {
                                let mut row = vec![-1; shift];
                                for &x in &a[..64 - shift] {
                                    row.push(self.gate("and", x, bit)?);
                                }
                                product = self.add(&product, &row, -1)?;
                            }
                            Ok(Value::Word(product))
                        }
                        "<" => Ok(Value::Bool(self.less(&a, &b)?)),
                        ">" => Ok(Value::Bool(self.less(&b, &a)?)),
                        "<=" => Ok(Value::Bool(-self.less(&b, &a)?)),
                        ">=" => Ok(Value::Bool(-self.less(&a, &b)?)),
                        _ => Err("unsupported bit circuit primitive".into()),
                    },
                    _ => Err("bit circuit primitive type mismatch".into()),
                }
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                let Value::Bool(c) = self.term(condition, env, depth + 1)? else {
                    return Err("bit circuit condition must be Bool".into());
                };
                let a = self.term(on_true, env, depth + 1)?;
                let b = self.term(on_false, env, depth + 1)?;
                match (a, b) {
                    (Value::Bool(a), Value::Bool(b)) => Ok(Value::Bool(self.select(c, a, b)?)),
                    (Value::Word(a), Value::Word(b)) => Ok(Value::Word(
                        a.into_iter()
                            .zip(b)
                            .map(|(a, b)| self.select(c, a, b))
                            .collect::<LangResult<_>>()?,
                    )),
                    _ => Err("bit circuit conditional type mismatch".into()),
                }
            }
            _ => Err("bit circuits require expanded total scalar terms".into()),
        }
    }
}

/// The CNF asserts all premises and inequality of the two endpoints.
/// Unsatisfiability therefore establishes equality under exactly those premises.
pub fn problem(
    env: &BTreeMap<String, Sort>,
    hypotheses: &[Equation],
    goal: &Equation,
) -> LangResult<Problem> {
    let mut work = MAX_WORK;
    problem_with_work(env, hypotheses, goal, &mut work)
}
pub(crate) fn problem_with_work(
    env: &BTreeMap<String, Sort>,
    hypotheses: &[Equation],
    goal: &Equation,
    work: &mut usize,
) -> LangResult<Problem> {
    problem_with_encoding_and_work(env, hypotheses, goal, Encoding::LiteralV1, work)
}
pub fn problem_with_encoding(
    env: &BTreeMap<String, Sort>,
    hypotheses: &[Equation],
    goal: &Equation,
    encoding: Encoding,
) -> LangResult<Problem> {
    let mut work = MAX_WORK;
    problem_with_encoding_and_work(env, hypotheses, goal, encoding, &mut work)
}
pub(crate) fn problem_with_encoding_and_work(
    env: &BTreeMap<String, Sort>,
    hypotheses: &[Equation],
    goal: &Equation,
    encoding: Encoding,
    work: &mut usize,
) -> LangResult<Problem> {
    let mut circuit = Circuit {
        encoding,
        gates: BTreeMap::new(),
        variables: 1,
        clauses: vec![vec![1]],
        inputs: BTreeMap::new(),
        remaining: 100_000,
    };
    for equation in hypotheses {
        let a = circuit.term(&equation.from, env, 0)?;
        let b = circuit.term(&equation.to, env, 0)?;
        let different = circuit.unequal(a, b)?;
        circuit.clause(vec![-different])?;
    }
    let a = circuit.term(&goal.from, env, 0)?;
    let b = circuit.term(&goal.to, env, 0)?;
    let different = circuit.unequal(a, b)?;
    circuit.clause(vec![different])?;
    let semantics = match encoding {
        Encoding::LiteralV1 => "total-scalar-u64-bit-cnf-v1",
        Encoding::SharedV2 => "total-scalar-u64-bit-cnf-shared-v2",
    };
    let cost = circuit.variables
        + circuit.clauses.len()
        + circuit.clauses.iter().map(Vec::len).sum::<usize>()
        + (100_000 - circuit.remaining);
    *work = work.checked_sub(cost).ok_or("bit circuit work limit")?;
    let bytes = serde_json::to_vec(&(
        semantics,
        circuit.variables,
        &circuit.clauses,
        &circuit.inputs,
    ))
    .map_err(|e| e.to_string())?;
    Ok(Problem {
        encoding,
        semantics,
        variables: circuit.variables,
        clauses: circuit.clauses,
        inputs: circuit.inputs,
        sha256: format!("{:x}", Sha256::digest(bytes)),
    })
}
fn literal(lit: i32, variables: usize) -> LangResult<usize> {
    let index = lit.checked_abs().ok_or("invalid proof literal")? as usize;
    if index == 0 || index > variables {
        return Err("proof literal outside circuit".into());
    }
    Ok(index)
}
fn assign(values: &mut [i8], lit: i32) -> bool {
    let value = if lit > 0 { 1 } else { -1 };
    let old = &mut values[lit.unsigned_abs() as usize];
    if *old == 0 {
        *old = value;
        false
    } else {
        *old != value
    }
}
/// A refutation this thread's checker accepted, recorded for independent audit.
#[derive(Clone, Debug)]
pub struct AcceptedRefutation {
    pub problem_sha256: String,
    pub variables: usize,
    pub clauses: Vec<Vec<i32>>,
    pub steps: Vec<Step>,
}
thread_local! {
    static AUDIT: std::cell::RefCell<Option<Vec<AcceptedRefutation>>> =
        const { std::cell::RefCell::new(None) };
}
/// Runs `f`, returning every bit-proof refutation accepted on this thread
/// in this scope. Nested audits collect their own records. Observation only:
/// recording never influences acceptance, and nothing is recorded outside this
/// call, including after an unwinding panic. Used to replay certificates through
/// independent DRAT/LRAT checkers.
pub fn audit_accepted<T>(f: impl FnOnce() -> T) -> (T, Vec<AcceptedRefutation>) {
    struct Scope(Option<Vec<AcceptedRefutation>>);
    impl Drop for Scope {
        fn drop(&mut self) {
            AUDIT.with(|a| a.replace(self.0.take()));
        }
    }
    let scope = Scope(AUDIT.with(|a| a.replace(Some(Vec::new()))));
    let value = f();
    let recorded = AUDIT.with(|a| a.take()).unwrap_or_default();
    drop(scope);
    (value, recorded)
}
pub fn verify(problem: &Problem, proof: &Certificate) -> LangResult<()> {
    let mut work = MAX_WORK;
    verify_with_work(problem, proof, &mut work)
}
pub(crate) fn verify_with_work(
    problem: &Problem,
    proof: &Certificate,
    work: &mut usize,
) -> LangResult<()> {
    if proof.encoding != problem.encoding {
        return Err("bit circuit encoding mismatch".into());
    }
    if proof.problem_sha256 != problem.sha256 {
        return Err("bit proof circuit identity mismatch".into());
    }
    if proof.steps.is_empty() || proof.steps.len() > MAX_STEPS {
        return Err("bit proof step count limit".into());
    }
    let mut clauses: Vec<&[i32]> = problem.clauses.iter().map(Vec::as_slice).collect();
    // Reuse the bounded assignment arena, resetting only variables touched by
    // the preceding RUP goal. Each goal still starts with no assumptions.
    *work = work
        .checked_sub(problem.variables)
        .ok_or("bit proof work limit")?;
    let mut values = vec![0; problem.variables + 1];
    let mut touched = Vec::new();
    fn assign_tracked(values: &mut [i8], touched: &mut Vec<usize>, lit: i32) -> bool {
        let index = lit.unsigned_abs() as usize;
        if values[index] == 0 {
            touched.push(index);
        }
        assign(values, lit)
    }
    let mut done = false;
    for step in &proof.steps {
        if done {
            return Err("bit proof continues after contradiction".into());
        }
        if step.clause.len() > 4096 || step.hints.len() > 100_000 {
            return Err("bit proof step size limit".into());
        }
        *work = work
            .checked_sub(touched.len() + step.clause.len())
            .ok_or("bit proof work limit")?;
        for index in touched.drain(..) {
            values[index] = 0;
        }
        let mut conflict = false;
        for &lit in &step.clause {
            literal(lit, problem.variables)?;
            conflict |= assign_tracked(&mut values, &mut touched, -lit);
        }
        // Preserve the legacy direct slice loop. Only packed steps pay for
        // decoding; both paths expand the exact same strict propagation body.
        macro_rules! replay_hint {
            ($index:ident) => {{
                if conflict {
                    return Err("unused bit proof hint after conflict".into());
                }
                let clause = clauses
                    .get($index)
                    .ok_or("bit proof references missing/future clause")?;
                let mut open = None;
                let mut multiple = false;
                let mut satisfied = false;
                for &lit in clause.iter() {
                    *work = work.checked_sub(1).ok_or("bit proof work limit")?;
                    let value = values[lit.unsigned_abs() as usize];
                    if value == if lit > 0 { 1 } else { -1 } {
                        satisfied = true;
                    }
                    if value == 0 {
                        if open.is_some() {
                            multiple = true;
                        } else {
                            open = Some(lit);
                        }
                    }
                }
                if satisfied || multiple {
                    return Err("bit proof hint is not unit or conflicting".into());
                }
                conflict = match open {
                    Some(lit) => assign_tracked(&mut values, &mut touched, lit),
                    None => true,
                };
            }};
        }
        if step.hint_deltas_v1.is_some() {
            for index in hint_transport::packed_indices(step)? {
                let index = index?;
                replay_hint!(index);
            }
        } else {
            for &index in &step.hints {
                replay_hint!(index);
            }
        }
        if !conflict {
            return Err("bit proof clause lacks a unit-propagation derivation".into());
        }
        // Duplicate literals could obscure propagation. Reject them, rather than
        // accepting solver-specific clause representations in the checked set.
        let mut canonical = step.clause.clone();
        canonical.sort_unstable();
        canonical.dedup();
        if canonical.len() != step.clause.len() {
            return Err("duplicate bit proof literal".into());
        }
        clauses.push(&step.clause);
        done = step.clause.is_empty();
    }
    if !done {
        return Err("bit proof has no final contradiction".into());
    }
    AUDIT.with(|a| {
        if let Some(log) = a.borrow_mut().as_mut() {
            log.push(AcceptedRefutation {
                problem_sha256: problem.sha256.clone(),
                variables: problem.variables,
                clauses: problem.clauses.clone(),
                steps: proof.steps.clone(),
            });
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_circuit() -> Circuit {
        Circuit {
            encoding: Encoding::LiteralV1,
            gates: BTreeMap::new(),
            variables: 1,
            clauses: vec![vec![1]],
            inputs: BTreeMap::new(),
            remaining: 100_000,
        }
    }
    fn var(n: &str) -> Term {
        Term::Var(n.into())
    }
    fn binary(op: &str, a: Term, b: Term) -> Term {
        Term::Binary {
            op: op.into(),
            left: Box::new(a),
            right: Box::new(b),
        }
    }
    // Independently propagate a fully specified input. Every output gate must
    // become determined, and every original clause must be satisfied.
    fn evaluate(term: &Term, input: &[(&str, Term)]) -> Term {
        evaluate_encoding(term, input, Encoding::LiteralV1)
    }
    fn evaluate_encoding(term: &Term, input: &[(&str, Term)], encoding: Encoding) -> Term {
        let env = input
            .iter()
            .map(|(n, t)| {
                (
                    n.to_string(),
                    match t {
                        Term::Bool(_) => Sort::Bool,
                        Term::U64(_) => Sort::U64,
                        _ => panic!(),
                    },
                )
            })
            .collect();
        let mut circuit = empty_circuit();
        circuit.encoding = encoding;
        let output = circuit.term(term, &env, 0).unwrap();
        let mut values = vec![0i8; circuit.variables + 1];
        values[1] = 1;
        for (name, term) in input {
            let Some(bits) = circuit.inputs.get(*name) else {
                continue;
            };
            match (bits, term) {
                (Value::Bool(bit), Term::Bool(value)) => {
                    values[*bit as usize] = if *value { 1 } else { -1 }
                }
                (Value::Word(bits), Term::U64(value)) => {
                    for (i, bit) in bits.iter().enumerate() {
                        values[*bit as usize] = if value & (1 << i) != 0 { 1 } else { -1 };
                    }
                }
                _ => panic!("wrong test input type"),
            }
        }
        loop {
            let mut changed = false;
            for clause in &circuit.clauses {
                if clause
                    .iter()
                    .any(|&lit| values[lit.unsigned_abs() as usize] == if lit > 0 { 1 } else { -1 })
                {
                    continue;
                }
                let open: Vec<_> = clause
                    .iter()
                    .copied()
                    .filter(|lit| values[lit.unsigned_abs() as usize] == 0)
                    .collect();
                assert!(
                    !open.is_empty(),
                    "circuit contradicts a fully specified input"
                );
                if open.len() == 1 {
                    let lit = open[0];
                    values[lit.unsigned_abs() as usize] = if lit > 0 { 1 } else { -1 };
                    changed = true;
                }
            }
            if !changed {
                break;
            }
        }
        assert!(circuit.clauses.iter().all(|clause| clause
            .iter()
            .any(|&lit| values[lit.unsigned_abs() as usize] == if lit > 0 { 1 } else { -1 })));
        let truth = |bit: i32| {
            assert_ne!(values[bit.unsigned_abs() as usize], 0);
            values[bit.unsigned_abs() as usize] == if bit > 0 { 1 } else { -1 }
        };
        match output {
            Value::Bool(bit) => Term::Bool(truth(bit)),
            Value::Word(bits) => Term::U64(
                bits.into_iter()
                    .enumerate()
                    .fold(0, |n, (i, bit)| n | if truth(bit) { 1 << i } else { 0 }),
            ),
        }
    }
    #[test]
    fn word_count_circuits_match_independently_evaluated_full_width_inputs() {
        let mut values = vec![0, u64::MAX, 0xaaaaaaaaaaaaaaaa, 0x5555555555555555,
            0xffffffff00000000, 0x00000000ffffffff];
        for bit in 0..64 {
            values.extend([1u64 << bit, !(1u64 << bit)]);
        }
        let mut seed = 731u64;
        for _ in 0..16 {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            values.push(seed);
        }
        for encoding in [Encoding::LiteralV1, Encoding::SharedV2] {
            for &value in &values {
                for width in [32, 64] {
                    for name in ["popcount", "leading_zeros", "trailing_zeros"] {
                        let expected = if width == 32 {
                            let x = value as u32;
                            match name { "popcount" => x.count_ones(),
                                "leading_zeros" => x.leading_zeros(), _ => x.trailing_zeros() }
                        } else {
                            match name { "popcount" => value.count_ones(),
                                "leading_zeros" => value.leading_zeros(), _ => value.trailing_zeros() }
                        };
                        let op = format!("word{width}.{name}");
                        assert_eq!(evaluate_encoding(&binary(&op, var("x"), Term::U64(0)),
                            &[("x", Term::U64(value))], encoding), Term::U64(expected as u64),
                            "{encoding:?} {op} {value:016x}");
                    }
                }
            }
        }
    }
    #[test]
    fn division_and_arithmetic_shift_circuits_match_independent_machine_values() {
        let mut pairs=vec![(0,0),(1,0),(u64::MAX,0),(0,1),(1,1),(u64::MAX,1),
            (u64::MAX,u64::MAX),(u64::MAX,3),(1u64<<63,2),(1u64<<63,u64::MAX),
            (0x80000000,0xffffffff),(0x80000000,2),(0x80000000,0x80000000),
            (0xffffffff,2),(0x7fffffff,0xffffffff),(0xffffffff,0x80000000),
            (0x12345678abcdef01,7)];
        let mut seed=6151u64;
        for _ in 0..12 {
            seed=seed.wrapping_mul(6364136223846793005).wrapping_add(1);let a=seed;
            seed=seed.wrapping_mul(6364136223846793005).wrapping_add(1);pairs.push((a,seed));
        }
        for encoding in [Encoding::LiteralV1,Encoding::SharedV2] {
            for &(a,b) in &pairs {
                let inputs=[("a",Term::U64(a)),("b",Term::U64(b))];
                let (x,y)=(a as u32,b as u32);let (sx,sy)=(x as i32,y as i32);
                for (op,expected) in [
                    ("word32.udiv",x.checked_div(y).unwrap_or(0) as u64),
                    ("word32.urem",x.checked_rem(y).unwrap_or(0) as u64),
                    ("word64.udiv",a.checked_div(b).unwrap_or(0)),
                    ("word64.urem",a.checked_rem(b).unwrap_or(0)),
                    ("word32.sdiv",if sy==0 {0} else {sx.wrapping_div(sy) as u32 as u64}),
                    ("word32.srem",if sy==0 {0} else {sx.wrapping_rem(sy) as u32 as u64}),
                    ("word32.sar",sx.wrapping_shr(b as u32) as u32 as u64),
                ] {
                    assert_eq!(evaluate_encoding(&binary(op,var("a"),var("b")),&inputs,encoding),
                        Term::U64(expected),"{encoding:?} {a} {op} {b}");
                }
            }
        }
    }
    #[test]
    fn gates_conditionals_and_all_boolean_inputs_agree() {
        for a in [false, true] {
            for b in [false, true] {
                for (op, expected) in [
                    ("&&", a && b),
                    ("||", a || b),
                    ("==", a == b),
                    ("!=", a != b),
                ] {
                    assert_eq!(
                        evaluate(
                            &binary(op, var("a"), var("b")),
                            &[("a", Term::Bool(a)), ("b", Term::Bool(b))]
                        ),
                        Term::Bool(expected)
                    );
                }
                for c in [false, true] {
                    let term = Term::If {
                        condition: Box::new(var("c")),
                        on_true: Box::new(var("a")),
                        on_false: Box::new(var("b")),
                    };
                    assert_eq!(
                        evaluate(
                            &term,
                            &[
                                ("a", Term::Bool(a)),
                                ("b", Term::Bool(b)),
                                ("c", Term::Bool(c))
                            ]
                        ),
                        Term::Bool(if c { a } else { b })
                    );
                }
            }
        }
    }
    #[test]
    fn full_width_wrapping_arithmetic_and_unsigned_order_agree_with_rust() {
        let mut pairs = vec![
            (0, 0),
            (0, u64::MAX),
            (u64::MAX, 0),
            (u64::MAX, u64::MAX),
            (u64::MAX, 1),
            (1, u64::MAX),
            (1 << 63, (1 << 63) - 1),
            ((1 << 63) - 1, 1 << 63),
            (0xaaaaaaaaaaaaaaaa, 0x5555555555555555),
        ];
        let mut seed = 917u64;
        for _ in 0..23 {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            let a = seed;
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            pairs.push((a, seed));
        }
        for (a, b) in pairs {
            let input = [("a", Term::U64(a)), ("b", Term::U64(b))];
            for (op, expected) in [
                ("+", Term::U64(a.wrapping_add(b))),
                ("-", Term::U64(a.wrapping_sub(b))),
                ("*", Term::U64(a.wrapping_mul(b))),
                ("<", Term::Bool(a < b)),
                ("<=", Term::Bool(a <= b)),
                (">", Term::Bool(a > b)),
                (">=", Term::Bool(a >= b)),
                ("==", Term::Bool(a == b)),
                ("!=", Term::Bool(a != b)),
            ] {
                assert_eq!(
                    evaluate(&binary(op, var("a"), var("b")), &input),
                    expected,
                    "{a} {op} {b}"
                );
            }
            for c in [false, true] {
                let term = Term::If {
                    condition: Box::new(var("c")),
                    on_true: Box::new(binary("+", var("a"), var("b"))),
                    on_false: Box::new(binary("-", var("a"), var("b"))),
                };
                assert_eq!(
                    evaluate(
                        &term,
                        &[
                            ("a", Term::U64(a)),
                            ("b", Term::U64(b)),
                            ("c", Term::Bool(c))
                        ]
                    ),
                    Term::U64(if c {
                        a.wrapping_add(b)
                    } else {
                        a.wrapping_sub(b)
                    })
                );
            }
        }
    }
    #[test]
    fn fixed_rotate_circuits_match_both_word_widths_and_modular_counts() {
        for a in [0,1,u32::MAX as u64,u64::MAX,0xa5a5_f0f0_1234_5678] {
            for k in [0,1,31,32,33,63,64,65,u32::MAX as u64,u64::MAX] {
                let input=[("a",Term::U64(a)),("k",Term::U64(k))];
                for (op,expected) in [
                    ("word32.rol",(a as u32).rotate_left(k as u32) as u64),
                    ("word32.ror",(a as u32).rotate_right(k as u32) as u64),
                    ("word64.rol",a.rotate_left(k as u32)),
                    ("word64.ror",a.rotate_right(k as u32)),
                ] {
                    assert_eq!(evaluate(&binary(op,var("a"),var("k")),&input),Term::U64(expected),"{a} {op} {k}");
                }
            }
        }
    }
    #[test]
    fn binary32_bit_circuits_preserve_ieee_order_and_raw_negation() {
        let mut values = vec![0u32, 0x80000000, 1, 0x80000001, 0x007fffff,
            0x00800000, 0x80800000, 0x3f800000, 0xbf800000, 0x7f7fffff,
            0xff7fffff, 0x7f800000, 0xff800000, 0x7f800001, 0xff800001,
            0x7fc00000, 0x7fc01234, 0xffc04321, 0x7fffffff, 0xffffffff];
        let mut seed = 0x783832u32;
        for _ in 0..12 {
            seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
            values.push(seed);
        }
        for encoding in [Encoding::LiteralV1, Encoding::SharedV2] {
            for &a in &values {
                // High first-order word bits are deliberately nonzero: fixed
                // binary32 primitives consume the low 32 bits only.
                let raw_a = (0xa5a5_4321u64 << 32) | a as u64;
                let input = [("a", Term::U64(raw_a))];
                for (op, expected) in [
                    ("f32:neg", Term::U64((a ^ 0x80000000) as u64)),
                    ("f32:is_nan", Term::Bool(f32::from_bits(a).is_nan())),
                    ("f32:is_finite", Term::Bool(f32::from_bits(a).is_finite())),
                ] {
                    assert_eq!(evaluate_encoding(&binary(op,var("a"),Term::U64(0)),&input,encoding),expected,"{a:x} {op}");
                }
                for &b in &values {
                    let (x,y)=(f32::from_bits(a),f32::from_bits(b));
                    let input=[("a",Term::U64(raw_a)),("b",Term::U64((0xffff_0000u64 << 32)|b as u64))];
                    for (op,expected) in [("f32:==",x==y),("f32:!=",x!=y),
                        ("f32:<",x<y),("f32:<=",x<=y),("f32:>",x>y),("f32:>=",x>=y)] {
                        assert_eq!(evaluate_encoding(&binary(op,var("a"),var("b")),&input,encoding),Term::Bool(expected),"{a:x} {op} {b:x}");
                    }
                }
            }
        }
        let env=BTreeMap::from([("a".into(),Sort::U64)]);
        for op in ["f32:+","f32:-","f32:*","f32:div","f32:floor"] {
            assert!(empty_circuit().term(&binary(op,var("a"),Term::U64(0)),&env,0).is_err());
        }
    }
    fn toy(clauses: Vec<Vec<i32>>) -> Problem {
        Problem {
            encoding: Encoding::LiteralV1,
            semantics: "test",
            variables: 3,
            clauses,
            inputs: BTreeMap::new(),
            sha256: "test".into(),
        }
    }
    #[test]
    fn shared_gates_preserve_every_boolean_assignment_and_share_commuted_inputs() {
        for encoding in [Encoding::LiteralV1, Encoding::SharedV2] {
            for op in ["and", "or", "xor"] {
                for ai in 0..6 {
                    for bi in 0..6 {
                        let mut c = empty_circuit();
                        c.encoding = encoding;
                        let x = c.fresh().unwrap();
                        let y = c.fresh().unwrap();
                        let inputs = [-1, 1, x, -x, y, -y];
                        let a = inputs[ai];
                        let b = inputs[bi];
                        let out = c.gate(op, a, b).unwrap();
                        let swapped = c.gate(op, b, a).unwrap();
                        if encoding == Encoding::SharedV2 {
                            assert_eq!(out, swapped);
                        }
                        let mut seen = [false; 4];
                        for mask in 0..1usize << (c.variables - 1) {
                            let truth = |lit: i32| {
                                let bit = lit.unsigned_abs() as usize;
                                let v = bit == 1 || mask & (1 << (bit - 2)) != 0;
                                if lit > 0 {
                                    v
                                } else {
                                    !v
                                }
                            };
                            if !c
                                .clauses
                                .iter()
                                .all(|clause| clause.iter().any(|lit| truth(*lit)))
                            {
                                continue;
                            }
                            seen[(truth(x) as usize) * 2 + truth(y) as usize] = true;
                            let expected = match op {
                                "and" => truth(a) && truth(b),
                                "or" => truth(a) || truth(b),
                                _ => truth(a) ^ truth(b),
                            };
                            assert_eq!(truth(out), expected);
                            assert_eq!(truth(swapped), expected);
                        }
                        assert!(seen.iter().all(|v| *v));
                    }
                }
            }
        }
    }
    #[test]
    fn legacy_certificate_encoding_is_implicit_and_mode_substitution_is_rejected() {
        let cert = proof(vec![step(&[], &[0, 1])]);
        let bytes = serde_json::to_value(&cert).unwrap();
        assert!(bytes.get("encoding").is_none());
        assert_eq!(
            serde_json::from_value::<Certificate>(bytes)
                .unwrap()
                .encoding,
            Encoding::LiteralV1
        );
        let problem = toy(vec![vec![1], vec![-1]]);
        let mut forged = cert;
        forged.encoding = Encoding::SharedV2;
        assert!(verify(&problem, &forged).is_err());
        assert!(serde_json::from_value::<Certificate>(
            serde_json::json!({"encoding":"future","problem_sha256":"test","steps":[]})
        )
        .is_err());
    }
    fn proof(steps: Vec<Step>) -> Certificate {
        Certificate {
            encoding: Encoding::LiteralV1,
            problem_sha256: "test".into(),
            steps,
        }
    }
    fn step(clause: &[i32], hints: &[usize]) -> Step {
        Step {
            clause: clause.to_vec(),
            hints: hints.to_vec(),
            hint_deltas_v1: None,
        }
    }
    #[test]
    fn packed_hints_replay_the_same_clauses_and_consume_the_same_shared_work() {
        let p = toy(vec![vec![1], vec![-1]]);
        let plain = proof(vec![step(&[], &[0, 1])]);
        let mut packed = plain.clone();
        packed.steps[0].hints.clear();
        packed.steps[0].hint_deltas_v1 = Some("AC".into());
        let mut plain_work = MAX_WORK;
        let mut packed_work = MAX_WORK;
        verify_with_work(&p, &plain, &mut plain_work).unwrap();
        verify_with_work(&p, &packed, &mut packed_work).unwrap();
        assert_eq!(plain_work, packed_work);
        assert!(verify_with_work(&p, &packed, &mut 0).unwrap_err().contains("work limit"));
        for forged in ["AA", "AE", "ACA", "g"] {
            packed.steps[0].hint_deltas_v1 = Some(forged.into());
            assert!(verify(&p, &packed).is_err(), "accepted {forged:?}");
        }
        packed.steps[0].hint_deltas_v1 = Some("AC".into());
        packed.problem_sha256 = "different".into();
        assert!(verify(&p, &packed).unwrap_err().contains("identity mismatch"));
    }
    #[test]
    fn maximum_length_hint_chains_keep_the_existing_limit_in_both_transports() {
        let variables = 99_999i32;
        let mut clauses = vec![vec![1]];
        clauses.extend((1..variables).map(|i| vec![-i, i + 1]));
        clauses.push(vec![-variables]);
        let mut p = toy(clauses);
        p.variables = variables as usize;
        let mut plain = proof(vec![step(&[], &(0..100_000).collect::<Vec<_>>())]);
        let mut packed = proof(vec![step(&[], &[])]);
        packed.steps[0].hint_deltas_v1 = Some(format!("A{}", "C".repeat(99_999)));
        let mut ordinary_work = MAX_WORK;
        let mut packed_work = MAX_WORK;
        verify_with_work(&p, &plain, &mut ordinary_work).unwrap();
        verify_with_work(&p, &packed, &mut packed_work).unwrap();
        assert_eq!(ordinary_work, packed_work);
        plain.steps[0].hints.push(0);
        assert!(verify(&p, &plain).unwrap_err().contains("step size limit"));
        packed.steps[0].hint_deltas_v1.as_mut().unwrap().push('A');
        assert!(verify(&p, &packed).unwrap_err().contains("count limit"));
    }
    #[test]
    fn learned_clauses_are_checked_and_corrupt_hints_fail_closed() {
        let p = toy(vec![
            vec![1],
            vec![2, 3],
            vec![-2, 3],
            vec![2, -3],
            vec![-2, -3],
        ]);
        let good = proof(vec![step(&[-2], &[2, 4]), step(&[], &[5, 1, 3])]);
        verify(&p, &good).unwrap();
        for bad in [
            proof(vec![step(&[], &[])]),                           // no derivation
            proof(vec![step(&[-2], &[2]), step(&[], &[5, 1, 3])]), // missing contradiction
            proof(vec![step(&[-2], &[1, 2, 4]), step(&[], &[5, 1, 3])]), // first hint non-unit
            proof(vec![step(&[-2], &[2, 4, 0]), step(&[], &[5, 1, 3])]), // unused hint
            proof(vec![step(&[-2], &[5]), step(&[], &[5, 1, 3])]), // future reference
            proof(vec![step(&[-2, -2], &[2, 4]), step(&[], &[5, 1, 3])]), // duplicate
            proof(vec![step(&[0], &[2, 4]), step(&[], &[5, 1, 3])]),
            proof(vec![step(&[4], &[2, 4]), step(&[], &[5, 1, 3])]),
            proof(vec![step(&[i32::MIN], &[2, 4]), step(&[], &[5, 1, 3])]),
            proof(vec![step(&[-2], &[2, 4])]), // no final empty clause
            proof(vec![
                step(&[-2], &[2, 4]),
                step(&[], &[5, 1, 3]),
                step(&[1, -1], &[]),
            ]),
        ] {
            assert!(verify(&p, &bad).is_err());
        }
        let mut wrong = good.clone();
        wrong.problem_sha256 = "other".into();
        assert!(verify(&p, &wrong).is_err());
        let satisfiable = toy(vec![vec![1], vec![2, 3]]);
        assert!(verify(
            &satisfiable,
            &proof(vec![step(&[2, -2], &[]), step(&[], &[2])])
        )
        .is_err());
    }
    #[test]
    fn auditing_only_records_accepted_proofs_and_restores_after_panics() {
        let p = toy(vec![vec![1], vec![-1]]);
        let good = proof(vec![step(&[], &[0, 1])]);
        let bad = proof(vec![step(&[], &[99])]);
        let (_, records) = audit_accepted(|| {
            verify(&p, &good).unwrap();
            assert!(verify(&p, &bad).is_err());
            let (_, nested) = audit_accepted(|| verify(&p, &good).unwrap());
            assert_eq!(nested.len(), 1);
            assert!(std::panic::catch_unwind(|| {
                audit_accepted(|| {
                    verify(&p, &good).unwrap();
                    panic!("audit callback panic");
                });
            })
            .is_err());
            verify(&p, &good).unwrap();
        });
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].clauses, p.clauses);
        assert_eq!(
            serde_json::to_value(&records[0].steps).unwrap(),
            serde_json::to_value(&good.steps).unwrap()
        );
        assert!(AUDIT.with(|a| a.borrow().is_none()));
        assert!(
            std::panic::catch_unwind(|| audit_accepted(|| panic!("outer audit panic"))).is_err()
        );
        verify(&p, &good).unwrap();
        assert!(AUDIT.with(|a| a.borrow().is_none()));
    }
    #[test]
    fn accepted_short_refutations_have_no_two_variable_model() {
        let candidates: Vec<Vec<i32>> = vec![
            vec![],
            vec![1],
            vec![-1],
            vec![2],
            vec![-2],
            vec![1, 2],
            vec![1, -2],
            vec![-1, 2],
            vec![-1, -2],
        ];
        let mut accepted = 0;
        for mask in 0..(1 << candidates.len()) {
            let clauses: Vec<_> = candidates
                .iter()
                .enumerate()
                .filter(|(i, _)| mask & (1 << i) != 0)
                .map(|(_, c)| c.clone())
                .collect();
            let satisfiable = (0..4).any(|assignment| {
                clauses.iter().all(|c| {
                    c.iter().any(|&lit| {
                        ((assignment >> (lit.unsigned_abs() - 1)) & 1 != 0) == (lit > 0)
                    })
                })
            });
            let p = toy(clauses);
            let base = p.clauses.len();
            for depth in 0..=3 {
                for mut code in 0..base.pow(depth) {
                    let mut hints = vec![];
                    for _ in 0..depth {
                        hints.push(code % base);
                        code /= base;
                    }
                    if verify(&p, &proof(vec![step(&[], &hints)])).is_ok() {
                        assert!(!satisfiable);
                        accepted += 1;
                    }
                }
            }
        }
        assert!(accepted > 100);
    }
    #[test]
    fn resource_budgets_are_shared_and_literals_are_bounded() {
        let p = toy(vec![vec![1], vec![2], vec![-2]]);
        let good = proof(vec![step(&[], &[1, 2])]);
        let mut work = 6;
        verify_with_work(&p, &good, &mut work).unwrap();
        assert!(verify_with_work(&p, &good, &mut work)
            .unwrap_err()
            .contains("work limit"));
        assert!(verify(&p, &proof(vec![step(&[1, -1], &[]); MAX_STEPS + 1]))
            .unwrap_err()
            .contains("step count"));
        assert!(verify(&p, &proof(vec![step(&vec![1; 4097], &[])]))
            .unwrap_err()
            .contains("step size"));
        let mut c = empty_circuit();
        c.variables = MAX_VARIABLES;
        assert!(c.fresh().is_err());
        c.clauses = vec![vec![]; MAX_CLAUSES];
        assert!(c.clause(vec![1]).is_err());
        let env = BTreeMap::from([("x".into(), Sort::U64)]);
        let equation = Equation {
            from: var("x"),
            to: var("x"),
        };
        assert!(problem_with_work(&env, &[], &equation, &mut 0).is_err());
    }
    #[test]
    fn type_operator_and_depth_errors_are_not_encoded_as_assumptions() {
        let env = BTreeMap::from([("x".into(), Sort::U64), ("b".into(), Sort::Bool)]);
        for term in [
            binary("&&", var("x"), var("x")),
            binary("+", var("x"), var("b")),
            binary("/", var("x"), var("x")),
            var("missing"),
        ] {
            assert!(problem(
                &env,
                &[],
                &Equation {
                    from: term,
                    to: Term::U64(0)
                }
            )
            .is_err());
        }
        let mut term = var("x");
        for _ in 0..130 {
            term = binary("+", term, Term::U64(1));
        }
        assert!(problem(
            &env,
            &[],
            &Equation {
                from: term,
                to: var("x")
            }
        )
        .is_err());
        assert!(problem(
            &env,
            &[],
            &Equation {
                from: var("x"),
                to: var("b")
            }
        )
        .is_err());
    }
}
