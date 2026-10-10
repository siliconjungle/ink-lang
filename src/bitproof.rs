//! Fixed scalar semantics encoded as Boolean circuits, plus hinted RUP checking.
//! No solver, rewrite catalogue or polynomial normalisation runs here.
use crate::{
    logic::{Equation, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

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
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Certificate {
    pub problem_sha256: String,
    pub steps: Vec<Step>,
}
#[derive(Clone, Debug, Serialize)]
pub struct Problem {
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
    fn gate(&mut self, op: &str, a: i32, b: i32) -> LangResult<i32> {
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
                    (Value::Word(a), Value::Word(b)) => match op.as_str() {
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
    let mut circuit = Circuit {
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
    let semantics = "total-scalar-u64-bit-cnf-v1";
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
/// meanwhile. Observation only: recording never influences acceptance, and
/// nothing is recorded outside this call. Used to replay certificates through
/// independent DRAT/LRAT checkers.
pub fn audit_accepted<T>(f: impl FnOnce() -> T) -> (T, Vec<AcceptedRefutation>) {
    let previous = AUDIT.with(|a| a.replace(Some(Vec::new())));
    let value = f();
    let recorded = AUDIT.with(|a| a.replace(previous)).unwrap_or_default();
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
    if proof.problem_sha256 != problem.sha256 {
        return Err("bit proof circuit identity mismatch".into());
    }
    if proof.steps.is_empty() || proof.steps.len() > MAX_STEPS {
        return Err("bit proof step count limit".into());
    }
    let mut clauses: Vec<&[i32]> = problem.clauses.iter().map(Vec::as_slice).collect();
    let mut done = false;
    for step in &proof.steps {
        if done {
            return Err("bit proof continues after contradiction".into());
        }
        if step.clause.len() > 4096 || step.hints.len() > 100_000 {
            return Err("bit proof step size limit".into());
        }
        *work = work
            .checked_sub(problem.variables + step.clause.len())
            .ok_or("bit proof work limit")?;
        let mut values = vec![0; problem.variables + 1];
        let mut conflict = false;
        for &lit in &step.clause {
            literal(lit, problem.variables)?;
            conflict |= assign(&mut values, -lit);
        }
        for &index in &step.hints {
            if conflict {
                return Err("unused bit proof hint after conflict".into());
            }
            let clause = clauses
                .get(index)
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
                Some(lit) => assign(&mut values, lit),
                None => true,
            };
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
    fn toy(clauses: Vec<Vec<i32>>) -> Problem {
        Problem {
            semantics: "test",
            variables: 3,
            clauses,
            inputs: BTreeMap::new(),
            sha256: "test".into(),
        }
    }
    fn proof(steps: Vec<Step>) -> Certificate {
        Certificate {
            problem_sha256: "test".into(),
            steps,
        }
    }
    fn step(clause: &[i32], hints: &[usize]) -> Step {
        Step {
            clause: clause.to_vec(),
            hints: hints.to_vec(),
        }
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
