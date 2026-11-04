//! Objective-driven training of `learn` holes (see docs/learnable-holes.md).
//!
//! The driver only uses the program's ordinary generated entry points:
//! `__learn_get`, `__learn_set` (a learn change) and the objective's reading
//! query. Every candidate is evaluated with exact reference execution; the
//! relaxed program is never served. `choice` holes use coordinate search over
//! table entries; `mlp` holes use simultaneous-perturbation (SPSA) gradient
//! estimates with Adam steps, which work for any objective the program can
//! compute. Lower is better; a candidate is kept only if it strictly improves
//! the objective. The result is a snapshot plus a one-step replay trace that
//! `ink build-model --freeze-roots __learned` turns into a frozen artifact.
//!
//! `Method::Relaxed` first trains choice holes under their relaxed meaning
//! (docs/relaxed-meanings.md): every table entry becomes a categorical
//! distribution, the objective becomes its expectation over tables drawn from
//! those distributions, and score-function gradients move the distributions.
//! Every drawn table is an exact program evaluated exactly; the relaxation
//! exists only in the training driver. Hardening takes each entry's most
//! likely value, and coordinate search then polishes the hardened table.
use ink_core::{core::CheckedModule, holes, stateful::Runtime, LangResult};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub struct Options {
    pub objective: String,
    pub data: Value,
    pub budget: u64,
    pub seed: u64,
    /// Train only these holes; `None` trains every hole.
    pub holes: Option<Vec<String>>,
    pub method: Method,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum Method {
    /// Coordinate search over table entries (choice), SPSA with Adam (mlp).
    #[default]
    Coordinate,
    /// Relaxed (distributional) training of choice holes first, then the above.
    Relaxed,
}

pub struct Trained {
    pub snapshot: Vec<u8>,
    pub receipt: Value,
    pub trace: Value,
}

struct Session<'a> {
    runtime: Runtime,
    query: String,
    data: &'a Value,
    evaluations: u64,
    budget: u64,
}

impl Session<'_> {
    fn set(&mut self, parameters: &Value) -> LangResult<()> {
        let outcome = self.runtime.invoke_json(holes::SET, &json!([parameters]))?;
        if !outcome.committed {
            return Err(format!("learn hole parameters rejected: {}", outcome.result.json()));
        }
        Ok(())
    }
    fn score(&mut self, parameters: &Value) -> LangResult<f64> {
        self.set(parameters)?;
        self.evaluations += 1;
        let outcome = self.runtime.invoke_json(&self.query, self.data)?;
        Ok(match outcome.result.json() {
            Value::Number(n) => n.as_f64().filter(|x| x.is_finite()).unwrap_or(f64::INFINITY),
            _ => f64::INFINITY,
        })
    }
    fn exhausted(&self) -> bool {
        self.evaluations >= self.budget
    }
}

/// Deterministic SplitMix64; training is reproducible from the seed.
struct Random(u64);
impl Random {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9e3779b97f4a7c15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
        z ^ (z >> 31)
    }
    fn sign(&mut self) -> f64 {
        if self.next() & 1 == 0 { 1.0 } else { -1.0 }
    }
    fn unit(&mut self) -> f64 {
        (self.next() >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn softmax(logits: &[f64], temperature: f64) -> Vec<f64> {
    let top = logits.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let e: Vec<f64> = logits.iter().map(|x| ((x - top) / temperature).exp()).collect();
    let total: f64 = e.iter().sum();
    e.into_iter().map(|x| x / total).collect()
}

/// Relaxed training of choice holes. Each entry `e` holds logits `θ_e`; a
/// table is drawn entry-wise from softmax(θ_e / τ). The gradient of the
/// expected objective is estimated from exact evaluations of drawn tables
/// with a leave-one-out baseline, and Adam lowers it while τ anneals. Any drawn
/// or hardened table that strictly improves on the best exact loss is kept.
/// Returns the number of gradient steps taken.
fn relaxed(
    session: &mut Session,
    choice: &[&holes::Hole],
    best: &mut Value,
    best_loss: &mut f64,
    random: &mut Random,
    budget: u64,
) -> LangResult<u64> {
    const SAMPLES: usize = 8;
    let entries: Vec<(usize, usize, usize)> = choice
        .iter()
        .enumerate()
        .flat_map(|(h, hole)| (0..hole.parameters as usize).map(move |e| (h, e, hole.choices as usize)))
        .collect();
    if entries.is_empty() {
        return Ok(0);
    }
    let mut logits: Vec<Vec<f64>> = entries.iter().map(|&(_, _, k)| vec![0.0; k]).collect();
    let (mut first, mut second) = (logits.clone(), logits.clone());
    let stop = session.evaluations.saturating_add(budget).min(session.budget);
    let steps = (budget / (SAMPLES as u64 + 1)).max(1);
    let table = |draw: &[usize], best: &Value| -> LangResult<Value> {
        let mut v = best.clone();
        for (&(h, e, _), &k) in entries.iter().zip(draw) {
            field(&mut v, &choice[h].field)?[e] = json!(k);
        }
        Ok(v)
    };
    let mut t = 0;
    while t < steps && session.evaluations + SAMPLES as u64 + 1 <= stop {
        t += 1;
        let temperature = 1.0 * (0.1f64).powf(t as f64 / steps as f64);
        let probabilities: Vec<Vec<f64>> = logits.iter().map(|l| softmax(l, temperature)).collect();
        let mut draws = vec![];
        let mut losses = vec![];
        for _ in 0..SAMPLES {
            let draw: Vec<usize> = probabilities
                .iter()
                .map(|p| {
                    let (mut u, mut k) = (random.unit(), 0);
                    while k + 1 < p.len() && u >= p[k] {
                        u -= p[k];
                        k += 1;
                    }
                    k
                })
                .collect();
            let candidate = table(&draw, best)?;
            let loss = session.score(&candidate)?;
            if loss < *best_loss {
                *best = candidate;
                *best_loss = loss;
            }
            draws.push(draw);
            losses.push(loss);
        }
        // Rejected tables (infinite loss) count as slightly worse than the worst finite draw.
        let worst = losses.iter().cloned().filter(|x| x.is_finite()).fold(f64::NEG_INFINITY, f64::max);
        if !worst.is_finite() {
            continue;
        }
        let losses: Vec<f64> = losses.iter().map(|&x| if x.is_finite() { x } else { worst + 1.0 }).collect();
        let total: f64 = losses.iter().sum();
        for (i, p) in probabilities.iter().enumerate() {
            for k in 0..p.len() {
                let mut g = 0.0;
                for (s, draw) in draws.iter().enumerate() {
                    let advantage = losses[s] - (total - losses[s]) / (SAMPLES as f64 - 1.0);
                    g += advantage * ((draw[i] == k) as u8 as f64 - p[k]) / temperature;
                }
                g /= SAMPLES as f64;
                first[i][k] = 0.9 * first[i][k] + 0.1 * g;
                second[i][k] = 0.999 * second[i][k] + 0.001 * g * g;
                let m = first[i][k] / (1.0 - 0.9f64.powi(t as i32));
                let v = second[i][k] / (1.0 - 0.999f64.powi(t as i32));
                logits[i][k] -= 0.1 * m / (v.sqrt() + 1e-8);
            }
        }
        // Harden: each entry's most likely value.
        let mode: Vec<usize> = logits
            .iter()
            .map(|l| l.iter().enumerate().fold(0, |b, (k, x)| if *x > l[b] { k } else { b }))
            .collect();
        let candidate = table(&mode, best)?;
        let loss = session.score(&candidate)?;
        if loss < *best_loss {
            *best = candidate;
            *best_loss = loss;
        }
    }
    Ok(t)
}

fn field<'v>(parameters: &'v mut Value, name: &str) -> LangResult<&'v mut Vec<Value>> {
    parameters
        .get_mut(name)
        .and_then(Value::as_array_mut)
        .ok_or_else(|| format!("learn hole parameters lack field {name}"))
}

fn f32_value(x: f64) -> Value {
    json!(x as f32 as f64)
}

pub fn train(module: &CheckedModule, initial: Option<&[u8]>, options: &Options) -> LangResult<Trained> {
    let program = module.program();
    let learning = &program.contracts.learning;
    if learning.holes.is_empty() {
        return Err("this program declares no learn holes".into());
    }
    if !learning.objectives.contains(&options.objective) {
        return Err(format!(
            "unknown objective {}; declared: {}",
            options.objective,
            learning.objectives.join(", ")
        ));
    }
    if !options.data.is_array() {
        return Err("training data must be a JSON array of the objective's arguments".into());
    }
    if options.budget == 0 || options.budget > 10_000_000 {
        return Err("training budget must be 1..10000000 evaluations".into());
    }
    let runtime = match initial {
        Some(bytes) => Runtime::restore_portable(program.clone(), bytes)?,
        None => Runtime::from_checked(module)?,
    };
    let mut session = Session {
        runtime,
        query: format!("{}{}", holes::OBJECTIVE_PREFIX, options.objective),
        data: &options.data,
        evaluations: 0,
        budget: options.budget,
    };
    let start = session.runtime.invoke_json(holes::GET, &json!([]))?.result.json();
    let mut best = start.clone();
    let initial_loss = session.score(&best)?;
    let mut best_loss = initial_loss;
    let mut random = Random(options.seed);
    let mut rounds = 0;
    if let Some(selected) = &options.holes {
        if let Some(unknown) = selected.iter().find(|n| !learning.holes.iter().any(|h| &&h.name == n)) {
            return Err(format!("unknown learn hole {unknown}"));
        }
    }
    let chosen = |name: &str| options.holes.as_ref().map_or(true, |s| s.iter().any(|n| n == name));
    let choice: Vec<_> = learning.holes.iter().filter(|h| h.family == "choice" && chosen(&h.name)).collect();
    let mlp: Vec<_> = learning.holes.iter().filter(|h| h.family == "mlp" && chosen(&h.name)).collect();
    let relaxed_steps = if options.method == Method::Relaxed {
        relaxed(&mut session, &choice, &mut best, &mut best_loss, &mut random, options.budget / 2)?
    } else {
        0
    };
    // Alternate families until a full round improves nothing.
    loop {
        rounds += 1;
        let round_start = best_loss;
        for h in &choice {
            let mut improved = true;
            while improved && !session.exhausted() {
                improved = false;
                for entry in 0..h.parameters as usize {
                    let current = field(&mut best, &h.field)?[entry].as_u64().unwrap_or(0);
                    for value in 0..h.choices as u64 {
                        if value == current || session.exhausted() {
                            continue;
                        }
                        let mut candidate = best.clone();
                        field(&mut candidate, &h.field)?[entry] = json!(value);
                        let loss = session.score(&candidate)?;
                        if loss < best_loss {
                            best = candidate;
                            best_loss = loss;
                            improved = true;
                            break;
                        }
                    }
                }
            }
        }
        for h in &mlp {
            let n = h.parameters as usize;
            let mut weights: Vec<f64> = field(&mut best, &h.field)?
                .iter()
                .map(|v| v.as_f64().unwrap_or(0.0))
                .collect();
            let (mut first, mut second) = (vec![0.0; n], vec![0.0; n]);
            let steps = ((session.budget - session.evaluations.min(session.budget)) / (3 * (mlp.len() as u64).max(1)))
                .min(2000);
            let mut flat = 0;
            for t in 1..=steps {
                if session.exhausted() {
                    break;
                }
                let c = 0.05 / (t as f64).powf(0.101);
                let delta: Vec<f64> = (0..n).map(|_| random.sign()).collect();
                let probe = |sign: f64, best: &Value| -> LangResult<Value> {
                    let mut v = best.clone();
                    let slot = field(&mut v, &h.field)?;
                    for i in 0..n {
                        slot[i] = f32_value(weights[i] + sign * c * delta[i]);
                    }
                    Ok(v)
                };
                let plus = probe(1.0, &best)?;
                let minus = probe(-1.0, &best)?;
                let (lp, lm) = (session.score(&plus)?, session.score(&minus)?);
                if !lp.is_finite() || !lm.is_finite() {
                    continue;
                }
                // A hole the objective never observes is left unchanged.
                flat = if lp == lm { flat + 1 } else { 0 };
                if flat >= 20 && t == flat {
                    break;
                }
                let rate = 0.02;
                for i in 0..n {
                    let g = (lp - lm) / (2.0 * c * delta[i]);
                    first[i] = 0.9 * first[i] + 0.1 * g;
                    second[i] = 0.999 * second[i] + 0.001 * g * g;
                    let m = first[i] / (1.0 - 0.9f64.powi(t as i32));
                    let v = second[i] / (1.0 - 0.999f64.powi(t as i32));
                    weights[i] -= rate * m / (v.sqrt() + 1e-8);
                }
                let mut candidate = best.clone();
                let slot = field(&mut candidate, &h.field)?;
                for i in 0..n {
                    slot[i] = f32_value(weights[i]);
                }
                let loss = session.score(&candidate)?;
                if loss < best_loss {
                    best = candidate;
                    best_loss = loss;
                }
            }
        }
        if best_loss >= round_start || session.exhausted() || rounds >= 8 {
            break;
        }
    }
    // Publish exactly one learning commit over the starting state, so the
    // snapshot equals a replay of the emitted trace.
    let mut publish = match initial {
        Some(bytes) => Runtime::restore_portable(program.clone(), bytes)?,
        None => Runtime::from_checked(module)?,
    };
    if !publish.invoke_json(holes::SET, &json!([best]))?.committed {
        return Err("trained learn hole parameters were rejected".into());
    }
    let snapshot = publish.checkpoint_portable()?;
    let trace = json!({"schema": 1, "epochs": 1, "observations": [{"call": holes::SET, "args": [best]}]});
    let receipt = json!({
        "schema": 1,
        "semantics": "ink-learn-holes-v1",
        "source_core_sha256": module.identity()?,
        "data_sha256": format!("{:x}", Sha256::digest(serde_json::to_vec(&options.data).map_err(|e| e.to_string())?)),
        "snapshot_sha256": format!("{:x}", Sha256::digest(&snapshot)),
        "initial_snapshot_sha256": initial.map(|bytes| format!("{:x}", Sha256::digest(bytes))),
        "objective": options.objective,
        "initial_loss": initial_loss,
        "final_loss": best_loss,
        "evaluations": session.evaluations,
        "budget": options.budget,
        "seed": options.seed,
        "rounds": rounds,
        "holes": learning.holes,
        "methods": {
            "choice": if options.method == Method::Relaxed {
                "relaxed: per-entry categorical distributions trained by score-function gradients over exactly evaluated drawn tables, hardened by argmax, then coordinate search"
            } else {
                "coordinate search over table entries"
            },
            "mlp": "SPSA gradient estimates with Adam steps",
        },
        "relaxed_steps": relaxed_steps,
        "scope": "Exact reference execution of every candidate on the supplied data. Lower objective is kept only on strict improvement. Admission (error path or guarded) is structural and checked at compile time. No generalisation, convergence or profitability claim.",
    });
    Ok(Trained { snapshot, receipt, trace })
}
