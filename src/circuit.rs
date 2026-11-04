//! The circuit target: exact lowering of finite Ink functions into affine
//! layers, ReLU and ReGLU-style gates (see docs/circuit-target.md).
//!
//! Every value of a finite type (Bool, payload-free enums, Option of those) is
//! a one-hot vector. Authored operations become small fixed weight patterns:
//! equality is an elementwise gate and a sum (an affine read against a
//! constant), `choose` is two gated products, `&&` is a gated product and `||`
//! its affine complement, and calls are inlined. A `choice`
//! learn hole becomes a lookup layer whose output weights *are* its table: one
//! weight per row of `ink learn-rows`. Every value in the network is 0, 1 or a
//! small integer, so f32 evaluation is exact.
//!
//! Lowering is checked, not trusted: `emit` enumerates the whole input domain
//! and compares the circuit with the reference evaluator, failing closed on
//! any difference or unsupported construct. This target grants no equality,
//! rewrite or profitability authority.
use ink_core::{core::*, eval, holes, LangResult};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;

pub const FORMAT: &str = "ink-circuit-v1";
const MAX_NODES: usize = 100_000;
const MAX_TERMS: usize = 2_000_000;
const MAX_DOMAIN: u64 = 65_536;
const MAX_INLINE: usize = 64;
const NEEDS_TYPE: &str = "needs a type from context";

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "lowercase", deny_unknown_fields)]
pub enum Node {
    /// One-hot encoding of parameter `param`.
    Input { param: usize, width: usize },
    Const { values: Vec<f32> },
    /// `y[o] = bias[o] + Σ w · x[i]` over the concatenated inputs, for each
    /// sparse term `[o, i, w]`.
    Affine { inputs: Vec<usize>, width: usize, terms: Vec<(u32, u32, f32)>, bias: Vec<f32> },
    Relu { input: usize },
    /// ReGLU product: `max(relu, 0) · linear`, elementwise.
    Gate { relu: usize, linear: usize },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Param {
    pub name: String,
    pub values: Vec<String>,
}

/// A learn hole's lookup layer: `node` is the affine node whose weight
/// `[value, entry, 1]` encodes table row `entry`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HoleLayer {
    pub hole: String,
    pub node: usize,
    pub entries: usize,
    /// Argument values in ordinal order, as in the hole manifest.
    pub domains: Vec<Vec<String>>,
    /// Result values; weight `[value, entry, 1]` sets row `entry` to `values[value]`.
    pub values: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Circuit {
    pub format: String,
    pub module: String,
    pub function: String,
    pub params: Vec<Param>,
    pub result: Vec<String>,
    pub nodes: Vec<Node>,
    pub output: usize,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub holes: Vec<HoleLayer>,
}

#[derive(Clone)]
struct V {
    node: usize,
    carrier: Vec<String>,
    ty: Type,
}

fn carrier(t: &Type, p: &Program) -> LangResult<Vec<String>> {
    Ok(match t {
        Type::Bool => vec!["false".into(), "true".into()],
        Type::Named(n) => {
            let vs = p.enums.get(n).filter(|v| !v.is_empty()).ok_or_else(|| format!("circuit: {n} is not a payload-free enum"))?;
            vs.iter().map(|v| format!("{n}.{v}")).collect()
        }
        Type::Option(x) => {
            let mut out = vec!["None".to_string()];
            out.extend(carrier(x, p)?.into_iter().map(|v| format!("Some({v})")));
            out
        }
        _ => return Err(format!("circuit: unsupported type {t:?}; finite types are Bool, payload-free enums and Option of those")),
    })
}

struct Builder<'a> {
    p: &'a Program,
    nodes: Vec<Node>,
    terms: usize,
    holes: Vec<HoleLayer>,
    tables: &'a BTreeMap<String, Vec<usize>>,
    depth: usize,
}

impl Builder<'_> {
    fn push(&mut self, n: Node) -> LangResult<usize> {
        if let Node::Affine { terms, .. } = &n {
            self.terms += terms.len();
        }
        if self.nodes.len() >= MAX_NODES || self.terms > MAX_TERMS {
            return Err("circuit: size limit exceeded".into());
        }
        self.nodes.push(n);
        Ok(self.nodes.len() - 1)
    }
    fn width(&self, n: usize) -> usize {
        match &self.nodes[n] {
            Node::Input { width, .. } | Node::Affine { width, .. } => *width,
            Node::Const { values } => values.len(),
            Node::Relu { input } => self.width(*input),
            Node::Gate { relu, .. } => self.width(*relu),
        }
    }
    fn konst(&mut self, values: Vec<f32>) -> LangResult<usize> {
        self.push(Node::Const { values })
    }
    fn one_hot(&mut self, width: usize, at: usize) -> LangResult<usize> {
        let mut v = vec![0.0; width];
        v[at] = 1.0;
        self.konst(v)
    }
    fn affine(&mut self, inputs: Vec<usize>, width: usize, terms: Vec<(u32, u32, f32)>, bias: Vec<f32>) -> LangResult<usize> {
        self.push(Node::Affine { inputs, width, terms, bias })
    }
    fn constant(&self, n: usize) -> Option<Vec<f32>> {
        match &self.nodes[n] {
            Node::Const { values } => Some(values.clone()),
            _ => None,
        }
    }
    /// `s` (a one-wide 0/1 node) times every element of `v`. A constant `v`
    /// needs no gate: the product is affine in `s`.
    fn scale(&mut self, s: usize, v: usize) -> LangResult<usize> {
        let k = self.width(v);
        if let Some(values) = self.constant(v) {
            let terms = values.iter().enumerate().filter(|(_, x)| **x != 0.0).map(|(o, x)| (o as u32, 0, *x)).collect();
            return self.affine(vec![s], k, terms, vec![0.0; k]);
        }
        let spread = self.affine(vec![s], k, (0..k as u32).map(|o| (o, 0, 1.0)).collect(), vec![0.0; k])?;
        self.push(Node::Gate { relu: spread, linear: v })
    }
    fn pick(&mut self, v: usize, i: usize) -> LangResult<usize> {
        self.affine(vec![v], 1, vec![(0, i as u32, 1.0)], vec![0.0])
    }
    /// Bool one-hot from a 0/1 truth node.
    fn boolean(&mut self, truth: usize) -> LangResult<V> {
        let node = self.affine(vec![truth], 2, vec![(0, 0, -1.0), (1, 0, 1.0)], vec![1.0, 0.0])?;
        Ok(V { node, carrier: carrier(&Type::Bool, self.p)?, ty: Type::Bool })
    }
    fn add(&mut self, a: usize, b: usize) -> LangResult<usize> {
        let k = self.width(a);
        let terms = (0..k as u32).flat_map(|i| [(i, i, 1.0), (i, k as u32 + i, 1.0)]).collect();
        self.affine(vec![a, b], k, terms, vec![0.0; k])
    }

    fn pair(&mut self, a: &Expr, b: &Expr, env: &BTreeMap<String, V>, expect: Option<&Type>) -> LangResult<(V, V)> {
        match self.expr(a, env, expect) {
            Ok(x) => {
                let y = self.expr(b, env, Some(&x.ty))?;
                Ok((x, y))
            }
            Err(e) if e.contains(NEEDS_TYPE) => {
                let y = self.expr(b, env, expect)?;
                let x = self.expr(a, env, Some(&y.ty))?;
                Ok((x, y))
            }
            Err(e) => Err(e),
        }
    }

    fn expr(&mut self, e: &Expr, env: &BTreeMap<String, V>, expect: Option<&Type>) -> LangResult<V> {
        match e {
            Expr::Var(n) if env.contains_key(n) => Ok(env[n].clone()),
            Expr::Var(n) if n == "None" => {
                let t = expect.filter(|t| matches!(t, Type::Option(_))).ok_or_else(|| format!("None {NEEDS_TYPE}"))?.clone();
                let c = carrier(&t, self.p)?;
                Ok(V { node: self.one_hot(c.len(), 0)?, carrier: c, ty: t })
            }
            Expr::Bool(b) => {
                let node = self.one_hot(2, *b as usize)?;
                Ok(V { node, carrier: carrier(&Type::Bool, self.p)?, ty: Type::Bool })
            }
            Expr::Field(x, v) if matches!(x.as_ref(), Expr::Var(n) if self.p.enums.contains_key(n)) => {
                let Expr::Var(n) = x.as_ref() else { unreachable!() };
                let t = Type::Named(n.clone());
                let c = carrier(&t, self.p)?;
                let at = c.iter().position(|x| x == &format!("{n}.{v}")).ok_or_else(|| format!("circuit: unknown variant {n}.{v}"))?;
                Ok(V { node: self.one_hot(c.len(), at)?, carrier: c, ty: t })
            }
            Expr::Let(n, _, value, body) => {
                let v = self.expr(value, env, None)?;
                let mut inner = env.clone();
                inner.insert(n.clone(), v);
                self.expr(body, &inner, expect)
            }
            Expr::Binary(op, a, b) if op == "==" || op == "!=" => {
                let (x, y) = self.pair(a, b, env, None)?;
                if x.carrier != y.carrier {
                    return Err(format!("circuit: comparing {:?} with {:?}", x.ty, y.ty));
                }
                let sign = if op == "==" { 1.0 } else { -1.0 };
                let bias = vec![if op == "==" { 0.0 } else { 1.0 }];
                // Against a constant, equality reads one coordinate: no gate.
                let known = self.constant(y.node).map(|c| (x.node, c)).or_else(|| self.constant(x.node).map(|c| (y.node, c)));
                if let Some((other, c)) = known {
                    let terms = c.iter().enumerate().filter(|(_, v)| **v != 0.0).map(|(i, v)| (0, i as u32, sign * v)).collect();
                    let truth = self.affine(vec![other], 1, terms, bias)?;
                    return self.boolean(truth);
                }
                let product = self.push(Node::Gate { relu: x.node, linear: y.node })?;
                let k = x.carrier.len() as u32;
                let truth = self.affine(vec![product], 1, (0..k).map(|i| (0, i, sign)).collect(), bias)?;
                self.boolean(truth)
            }
            Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
                let x = self.expr(a, env, Some(&Type::Bool))?;
                let y = self.expr(b, env, Some(&Type::Bool))?;
                if x.ty != Type::Bool || y.ty != Type::Bool {
                    return Err(format!("circuit: {op} needs Bool operands"));
                }
                // both = relu(x) · y, a ReGLU product: exact on 0/1 and, on soft
                // values, the multilinear extension (no dead ReLU region).
                // either = x + y - both.
                let (xt, yt) = (self.pick(x.node, 1)?, self.pick(y.node, 1)?);
                let both = self.push(Node::Gate { relu: xt, linear: yt })?;
                let truth = if op == "&&" {
                    both
                } else {
                    self.affine(vec![xt, yt, both], 1, vec![(0, 0, 1.0), (0, 1, 1.0), (0, 2, -1.0)], vec![0.0])?
                };
                self.boolean(truth)
            }
            Expr::Call(f, args) if f == "choose" && args.len() == 3 => {
                let c = self.expr(&args[0], env, Some(&Type::Bool))?;
                if c.ty != Type::Bool {
                    return Err("circuit: choose needs a Bool condition".into());
                }
                let (x, y) = self.pair(&args[1], &args[2], env, expect)?;
                if x.carrier != y.carrier {
                    return Err("circuit: choose branches differ in type".into());
                }
                let (yes, no) = (self.pick(c.node, 1)?, self.pick(c.node, 0)?);
                let (a, b) = (self.scale(yes, x.node)?, self.scale(no, y.node)?);
                Ok(V { node: self.add(a, b)?, ..x })
            }
            Expr::Call(f, args) if f == "Some" && args.len() == 1 => {
                let inner = match expect {
                    Some(Type::Option(t)) => Some(t.as_ref()),
                    _ => None,
                };
                let x = self.expr(&args[0], env, inner)?;
                let t = Type::Option(Box::new(x.ty.clone()));
                let c = carrier(&t, self.p)?;
                let k = x.carrier.len() as u32;
                let node = self.affine(vec![x.node], k as usize + 1, (0..k).map(|i| (i + 1, i, 1.0)).collect(), vec![0.0; k as usize + 1])?;
                Ok(V { node, carrier: c, ty: t })
            }
            Expr::Method(x, m, args) if (m == "fold" && args.len() == 2) || (m == "unwrap_or" && args.len() == 1) => {
                let o = self.expr(x, env, None)?;
                let Type::Option(inner) = &o.ty else {
                    return Err(format!("circuit: .{m} needs an Option"));
                };
                let k = o.carrier.len() - 1;
                // The payload slice is zero when the option is None.
                let payload = self.affine(vec![o.node], k, (0..k as u32).map(|i| (i, i + 1, 1.0)).collect(), vec![0.0; k])?;
                let payload = V { node: payload, carrier: carrier(inner, self.p)?, ty: inner.as_ref().clone() };
                let none = self.pick(o.node, 0)?;
                let some = self.affine(vec![none], 1, vec![(0, 0, -1.0)], vec![1.0])?;
                let (present, absent) = if m == "fold" {
                    let (Expr::Lambda(v, yes), Expr::Lambda(_, no)) = (&args[0], &args[1]) else {
                        return Err("circuit: fold needs two lambdas".into());
                    };
                    let mut inner_env = env.clone();
                    inner_env.insert(v.clone(), payload);
                    let a = self.expr(yes, &inner_env, expect);
                    match a {
                        Ok(a) => {
                            let b = self.expr(no, env, Some(&a.ty))?;
                            (a, b)
                        }
                        Err(e) if e.contains(NEEDS_TYPE) => {
                            let b = self.expr(no, env, expect)?;
                            (self.expr(yes, &inner_env, Some(&b.ty))?, b)
                        }
                        Err(e) => return Err(e),
                    }
                } else {
                    let b = self.expr(&args[0], env, Some(inner))?;
                    (payload, b)
                };
                if present.carrier != absent.carrier {
                    return Err(format!("circuit: .{m} branches differ in type"));
                }
                let (a, b) = (self.scale(some, present.node)?, self.scale(none, absent.node)?);
                Ok(V { node: self.add(a, b)?, ..present })
            }
            Expr::Call(f, args) if f.starts_with("__hole_") => self.hole(&f["__hole_".len()..], args, env),
            Expr::Call(f, args) => {
                let func = self.p.functions.iter().find(|x| &x.name == f).ok_or_else(|| format!("circuit: unsupported call {f}"))?;
                if args.len() != func.params.len() || self.depth >= MAX_INLINE {
                    return Err(format!("circuit: cannot inline {f}"));
                }
                let mut inner = BTreeMap::new();
                for (a, (n, t)) in args.iter().zip(&func.params) {
                    if t == &Type::Named(holes::RECORD.into()) {
                        continue;
                    }
                    let v = self.expr(a, env, Some(t))?;
                    if &v.ty != t {
                        return Err(format!("circuit: argument {n} of {f} has the wrong type"));
                    }
                    inner.insert(n.clone(), v);
                }
                self.depth += 1;
                let out = self.expr(&func.body.clone(), &inner, Some(&func.result.clone()));
                self.depth -= 1;
                out
            }
            other => Err(format!("circuit: unsupported expression {}", serde_json::to_string(other).unwrap_or_default().chars().take(120).collect::<String>())),
        }
    }

    fn hole(&mut self, name: &str, args: &[Expr], env: &BTreeMap<String, V>) -> LangResult<V> {
        let h = self.p.contracts.learning.holes.iter().find(|h| h.name == name).ok_or_else(|| format!("circuit: unknown hole {name}"))?.clone();
        if h.family != "choice" {
            return Err(format!("circuit: hole {name} is an Mlp; only choice holes lower exactly"));
        }
        let table = self.tables.get(&h.field).ok_or("circuit: missing hole parameters")?.clone();
        let f = self.p.functions.iter().find(|f| f.name == holes::hole_function(name)).ok_or("circuit: missing hole function")?.clone();
        let n = h.domains.len();
        let mut inputs = vec![];
        let mut offsets = vec![];
        let mut offset = 0;
        for (i, (a, (_, t))) in args.iter().zip(&f.params).take(n).enumerate() {
            let v = self.expr(a, env, Some(t))?;
            if v.carrier != h.domains[i] {
                return Err(format!("circuit: hole {name} argument {} has an unexpected domain", i + 1));
            }
            inputs.push(v.node);
            offsets.push(offset);
            offset += v.carrier.len() as u32;
        }
        // Entry indicator: relu(Σ_i x_i[t_i] - (n - 1)) is 1 exactly when every argument matches.
        let entries = table.len();
        let mut terms = vec![];
        for t in 0..entries {
            let mut rest = t;
            for (i, d) in h.domains.iter().enumerate() {
                terms.push((t as u32, offsets[i] + (rest % d.len()) as u32, 1.0));
                rest /= d.len();
            }
        }
        let sum = self.affine(inputs, entries, terms, vec![-(n as f32 - 1.0); entries])?;
        let indicator = self.push(Node::Relu { input: sum })?;
        let width = h.values.len();
        let terms = table.iter().enumerate().map(|(t, &v)| (v as u32, t as u32, 1.0)).collect();
        let node = self.affine(vec![indicator], width, terms, vec![0.0; width])?;
        self.holes.push(HoleLayer { hole: name.into(), node, entries, domains: h.domains.clone(), values: h.values.clone() });
        let ty = f.result.clone();
        Ok(V { node, carrier: carrier(&ty, self.p)?, ty })
    }
}

/// Evaluate a circuit on one input (parameter value indices). Exact in f32
/// for circuits produced by `lower`.
pub fn evaluate(c: &Circuit, input: &[usize]) -> LangResult<Vec<f32>> {
    let mut values: Vec<Vec<f32>> = Vec::with_capacity(c.nodes.len());
    for n in &c.nodes {
        let v = match n {
            Node::Input { param, width } => {
                let mut v = vec![0.0; *width];
                *v.get_mut(*input.get(*param).ok_or("missing input")?).ok_or("input out of range")? = 1.0;
                v
            }
            Node::Const { values } => values.clone(),
            Node::Affine { inputs, width, terms, bias } => {
                let x: Vec<f32> = inputs.iter().flat_map(|i| values[*i].iter().copied()).collect();
                let mut y = bias.clone();
                y.resize(*width, 0.0);
                for &(o, i, w) in terms {
                    y[o as usize] += w * x[i as usize];
                }
                y
            }
            Node::Relu { input } => values[*input].iter().map(|x| x.max(0.0)).collect(),
            Node::Gate { relu, linear } => values[*relu].iter().zip(&values[*linear]).map(|(a, b)| a.max(0.0) * b).collect(),
        };
        values.push(v);
    }
    Ok(values[c.output].clone())
}

/// Lower `function` to a circuit and check it against the reference
/// evaluator on every input. `learned` is the `__learn_get` record, if the
/// program has holes.
pub fn lower(module: &CheckedModule, function: &str, learned: Option<&Value>) -> LangResult<Circuit> {
    let p = module.program();
    let f = p.functions.iter().find(|f| f.name == function).ok_or_else(|| format!("unknown function {function}"))?;
    let mut tables = BTreeMap::new();
    for h in &p.contracts.learning.holes {
        let xs = learned.and_then(|l| l[&h.field].as_array());
        if let Some(xs) = xs {
            tables.insert(h.field.clone(), xs.iter().map(|x| x.as_u64().unwrap_or(0) as usize).collect());
        }
    }
    let mut b = Builder { p, nodes: vec![], terms: 0, holes: vec![], tables: &tables, depth: 0 };
    let mut env = BTreeMap::new();
    let mut params = vec![];
    for (n, t) in &f.params {
        if t == &Type::Named(holes::RECORD.into()) {
            continue;
        }
        let c = carrier(t, p)?;
        let node = b.push(Node::Input { param: params.len(), width: c.len() })?;
        params.push(Param { name: n.clone(), values: c.clone() });
        env.insert(n.clone(), V { node, carrier: c, ty: t.clone() });
    }
    let out = b.expr(&f.body, &env, Some(&f.result))?;
    let result = carrier(&f.result, p)?;
    if out.carrier != result {
        return Err("circuit: result type mismatch".into());
    }
    let circuit = Circuit {
        format: FORMAT.into(),
        module: p.module.clone(),
        function: function.into(),
        params,
        result,
        nodes: b.nodes,
        output: out.node,
        holes: b.holes,
    };
    check(module, &circuit, learned)?;
    Ok(circuit)
}

/// Compare the circuit with the reference evaluator on the whole domain.
pub fn check(module: &CheckedModule, c: &Circuit, learned: Option<&Value>) -> LangResult<u64> {
    let p = module.program();
    let f = p.functions.iter().find(|f| f.name == c.function).ok_or("unknown function")?;
    let size = c.params.iter().try_fold(1u64, |n, x| n.checked_mul(x.values.len() as u64)).filter(|n| *n <= MAX_DOMAIN);
    let size = size.ok_or_else(|| format!("circuit: input domain exceeds {MAX_DOMAIN} values for exhaustive checking"))?;
    let decode = |name: &str, t: &Type| -> LangResult<eval::Value> {
        let j = if let Some(inner) = name.strip_prefix("Some(").and_then(|s| s.strip_suffix(')')) {
            json!({"Some": serde_json::from_str::<Value>(inner).unwrap_or(json!(inner))})
        } else if name == "None" {
            json!({"None": null})
        } else {
            serde_json::from_str::<Value>(name).unwrap_or(json!(name))
        };
        eval::Value::from_program_json(&j, t, p)
    };
    for index in 0..size {
        let mut rest = index as usize;
        let input: Vec<usize> = c.params.iter().map(|x| { let v = rest % x.values.len(); rest /= x.values.len(); v }).collect();
        let mut args = vec![];
        let mut k = 0;
        for (_, t) in &f.params {
            if t == &Type::Named(holes::RECORD.into()) {
                args.push(eval::Value::from_program_json(learned.ok_or("circuit: hole parameters needed")?, t, p)?);
            } else {
                args.push(decode(&c.params[k].values[input[k]], t)?);
                k += 1;
            }
        }
        let mut fuel = 10_000_000;
        let want = eval::call_checked(module, &c.function, args, &mut fuel)?.json();
        let got = evaluate(c, &input)?;
        let hot: Vec<usize> = got.iter().enumerate().filter(|(_, x)| **x != 0.0).map(|(i, _)| i).collect();
        let ok = hot.len() == 1 && got[hot[0]] == 1.0 && decode(&c.result[hot[0]], &f.result)?.json() == want;
        if !ok {
            return Err(format!("circuit: disagrees with the reference evaluator on input {:?}", input.iter().zip(&c.params).map(|(i, x)| &x.values[*i]).collect::<Vec<_>>()));
        }
    }
    Ok(size)
}

/// Name of a finite JSON value in a circuit carrier (`"Color.Red"`, `"true"`,
/// `"Some(Bin.A)"`, `"None"`).
pub fn value_name(v: &Value) -> LangResult<String> {
    Ok(match v {
        Value::Bool(b) => b.to_string(),
        Value::String(s) => s.clone(),
        Value::Object(o) if o.contains_key("None") => "None".into(),
        Value::Object(o) if o.contains_key("Some") => format!("Some({})", value_name(&o["Some"])?),
        other => return Err(format!("circuit: {other} is not a finite value")),
    })
}

pub struct FitOptions {
    pub epochs: u32,
    pub seed: u64,
}

pub struct Fitted {
    /// Hardened table per hole name, as result ordinals.
    pub tables: BTreeMap<String, Vec<usize>>,
    pub correct_before: usize,
    pub correct_after: usize,
    pub loss_before: f64,
    pub loss_after: f64,
    pub epochs: u32,
}

fn with_tables(c: &Circuit, tables: &BTreeMap<String, Vec<usize>>) -> Circuit {
    let mut out = c.clone();
    for h in &c.holes {
        if let (Some(t), Node::Affine { terms, .. }) = (tables.get(&h.hole), &mut out.nodes[h.node]) {
            *terms = t.iter().enumerate().map(|(e, v)| (*v as u32, e as u32, 1.0)).collect();
        }
    }
    out
}

fn correct(c: &Circuit, examples: &[(Vec<usize>, usize)]) -> LangResult<usize> {
    let mut n = 0;
    for (input, want) in examples {
        let out = evaluate(c, input)?;
        let best = out.iter().enumerate().fold(0, |b, (i, x)| if *x > out[b] { i } else { b });
        n += (best == *want && out[best] == 1.0) as usize;
    }
    Ok(n)
}

/// Fit the circuit's learn-hole tables by gradient descent through the whole
/// circuit, authored parts included. Each table entry becomes a softmax over
/// result values; every other node keeps its fixed weights, so on soft inputs
/// the circuit computes a continuous extension of the authored code. The loss
/// is the squared distance between outputs and the wanted one-hot results.
/// Entries harden to their most likely value; the best hardened tables by
/// exact correct count are returned. Admission is the caller's: the result is
/// only a proposal for `ink gate-edit`.
pub fn fit(c: &Circuit, examples: &[(Vec<usize>, usize)], options: &FitOptions) -> LangResult<Fitted> {
    if c.holes.is_empty() {
        return Err("circuit: this function reaches no learn hole".into());
    }
    if examples.is_empty() || options.epochs == 0 || options.epochs > 100_000 {
        return Err("circuit: fitting needs examples and 1..100000 epochs".into());
    }
    let output_width = c.result.len();
    for (input, want) in examples {
        if input.len() != c.params.len() || input.iter().zip(&c.params).any(|(i, p)| *i >= p.values.len()) || *want >= output_width {
            return Err("circuit: example outside the function's domain".into());
        }
    }
    // Parameters are shared by every lookup layer of the same hole.
    let mut holes: BTreeMap<String, (usize, usize)> = BTreeMap::new();
    for h in &c.holes {
        holes.entry(h.hole.clone()).or_insert((h.entries, h.values.len()));
    }
    let current: BTreeMap<String, Vec<usize>> = holes
        .keys()
        .map(|name| {
            let h = c.holes.iter().find(|h| &h.hole == name).unwrap();
            let Node::Affine { terms, .. } = &c.nodes[h.node] else { unreachable!() };
            let mut t = vec![0; h.entries];
            for (v, e, _) in terms {
                t[*e as usize] = *v as usize;
            }
            (name.clone(), t)
        })
        .collect();
    let mut seed = options.seed.wrapping_mul(0x9e3779b97f4a7c15) | 1;
    let mut noise = || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        ((seed >> 11) as f64 / (1u64 << 53) as f64 - 0.5) * 0.2
    };
    let mut theta: BTreeMap<String, Vec<Vec<f64>>> = holes
        .iter()
        .map(|(name, (entries, values))| {
            let t = &current[name];
            // Start from (nearly) uniform distributions, as the relaxed meaning
            // does; a strong prior on the current table can trap the descent
            // in its basin. The current table is kept unless an exact
            // hardened table does better.
            let _ = t;
            (name.clone(), (0..*entries).map(|_| (0..*values).map(|_| noise()).collect()).collect())
        })
        .collect();
    let (mut m1, mut m2) = (theta.clone(), theta.clone());
    for x in m1.values_mut().chain(m2.values_mut()).flatten().flatten() {
        *x = 0.0;
    }
    let layer_of: BTreeMap<usize, String> = c.holes.iter().map(|h| (h.node, h.hole.clone())).collect();
    let softmax = |row: &[f64], tau: f64| -> Vec<f64> {
        let top = row.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let e: Vec<f64> = row.iter().map(|x| ((x - top) / tau).exp()).collect();
        let s: f64 = e.iter().sum();
        e.into_iter().map(|x| x / s).collect()
    };
    // Entries no example reaches keep their current value.
    let mut touched: BTreeMap<String, Vec<bool>> = holes.iter().map(|(n, (entries, _))| (n.clone(), vec![false; *entries])).collect();
    let harden = |theta: &BTreeMap<String, Vec<Vec<f64>>>, touched: &BTreeMap<String, Vec<bool>>| -> BTreeMap<String, Vec<usize>> {
        theta
            .iter()
            .map(|(n, rows)| {
                let t = rows.iter().enumerate().map(|(e, r)| if touched[n][e] { r.iter().enumerate().fold(0, |b, (i, x)| if *x > r[b] { i } else { b }) } else { current[n][e] }).collect();
                (n.clone(), t)
            })
            .collect()
    };
    let correct_before = correct(c, examples)?;
    let mut best = (correct_before, current.clone());
    let (mut loss_before, mut loss_after) = (f64::NAN, f64::NAN);
    let mut epochs = 0;
    for epoch in 1..=options.epochs {
        epochs = epoch;
        let tau = 1.0 * (0.1f64).powf(epoch as f64 / options.epochs as f64);
        let soft: BTreeMap<String, Vec<Vec<f64>>> = theta.iter().map(|(n, rows)| (n.clone(), rows.iter().map(|r| softmax(r, tau)).collect())).collect();
        let mut grad: BTreeMap<String, Vec<Vec<f64>>> = theta.iter().map(|(n, rows)| (n.clone(), rows.iter().map(|r| vec![0.0; r.len()]).collect())).collect();
        let mut loss = 0.0;
        for (input, want) in examples {
            // Forward in f64 over the same nodes.
            let mut values: Vec<Vec<f64>> = Vec::with_capacity(c.nodes.len());
            let mut concat: Vec<Vec<f64>> = Vec::with_capacity(c.nodes.len());
            for (k, n) in c.nodes.iter().enumerate() {
                let (v, x) = match n {
                    Node::Input { param, width } => {
                        let mut v = vec![0.0; *width];
                        v[input[*param]] = 1.0;
                        (v, vec![])
                    }
                    Node::Const { values } => (values.iter().map(|x| *x as f64).collect(), vec![]),
                    Node::Affine { inputs, width, terms, bias } => {
                        let x: Vec<f64> = inputs.iter().flat_map(|i| values[*i].iter().copied()).collect();
                        let mut y: Vec<f64> = bias.iter().map(|b| *b as f64).collect();
                        y.resize(*width, 0.0);
                        if let Some(hole) = layer_of.get(&k) {
                            let w = &soft[hole];
                            for (t, row) in w.iter().enumerate() {
                                for (v, p) in row.iter().enumerate() {
                                    y[v] += p * x[t];
                                }
                            }
                        } else {
                            for &(o, i, w) in terms {
                                y[o as usize] += w as f64 * x[i as usize];
                            }
                        }
                        (y, x)
                    }
                    Node::Relu { input } => (values[*input].iter().map(|x| x.max(0.0)).collect(), vec![]),
                    Node::Gate { relu, linear } => (values[*relu].iter().zip(&values[*linear]).map(|(a, b)| a.max(0.0) * b).collect(), vec![]),
                };
                values.push(v);
                concat.push(x);
            }
            let out = &values[c.output];
            let mut grads: Vec<Vec<f64>> = values.iter().map(|v| vec![0.0; v.len()]).collect();
            for (j, y) in out.iter().enumerate() {
                let t = (j == *want) as u8 as f64;
                loss += (y - t) * (y - t);
                grads[c.output][j] += 2.0 * (y - t);
            }
            // Backward.
            for k in (0..c.nodes.len()).rev() {
                let dy = std::mem::take(&mut grads[k]);
                if dy.iter().all(|g| *g == 0.0) {
                    continue;
                }
                match &c.nodes[k] {
                    Node::Input { .. } | Node::Const { .. } => {}
                    Node::Affine { inputs, terms, .. } => {
                        let x = &concat[k];
                        let mut dx = vec![0.0; x.len()];
                        if let Some(hole) = layer_of.get(&k) {
                            let w = &soft[hole];
                            let g = grad.get_mut(hole).unwrap();
                            for (t, row) in w.iter().enumerate() {
                                // dL/dW[v][t] = dy[v] x[t]; through the softmax of entry t.
                                let dw: Vec<f64> = row.iter().enumerate().map(|(v, _)| dy[v] * x[t]).collect();
                                // An entry is reached when the loss depends on it.
                                if dw.iter().any(|d| *d != 0.0) {
                                    touched.get_mut(hole).unwrap()[t] = true;
                                }
                                let dot: f64 = dw.iter().zip(row).map(|(a, p)| a * p).sum();
                                for (u, p) in row.iter().enumerate() {
                                    g[t][u] += p * (dw[u] - dot) / tau;
                                }
                                dx[t] += row.iter().enumerate().map(|(v, p)| p * dy[v]).sum::<f64>();
                            }
                        } else {
                            for &(o, i, w) in terms {
                                dx[i as usize] += w as f64 * dy[o as usize];
                            }
                        }
                        let mut at = 0;
                        for i in inputs {
                            let width = values[*i].len();
                            for (j, d) in dx[at..at + width].iter().enumerate() {
                                grads[*i][j] += d;
                            }
                            at += width;
                        }
                    }
                    Node::Relu { input } => {
                        for (j, d) in dy.iter().enumerate() {
                            if values[*input][j] > 0.0 {
                                grads[*input][j] += d;
                            }
                        }
                    }
                    Node::Gate { relu, linear } => {
                        for (j, d) in dy.iter().enumerate() {
                            let (a, b) = (values[*relu][j], values[*linear][j]);
                            if a > 0.0 {
                                grads[*relu][j] += d * b;
                            }
                            grads[*linear][j] += d * a.max(0.0);
                        }
                    }
                }
            }
        }
        loss /= examples.len() as f64;
        if epoch == 1 {
            loss_before = loss;
        }
        loss_after = loss;
        // Adam.
        for (name, rows) in theta.iter_mut() {
            for (e, row) in rows.iter_mut().enumerate() {
                for (v, x) in row.iter_mut().enumerate() {
                    let g = grad[name][e][v] / examples.len() as f64;
                    let a = &mut m1.get_mut(name).unwrap()[e][v];
                    *a = 0.9 * *a + 0.1 * g;
                    let b = &mut m2.get_mut(name).unwrap()[e][v];
                    *b = 0.999 * *b + 0.001 * g * g;
                    let mhat = m1[name][e][v] / (1.0 - 0.9f64.powi(epoch as i32));
                    let vhat = m2[name][e][v] / (1.0 - 0.999f64.powi(epoch as i32));
                    *x -= 0.1 * mhat / (vhat.sqrt() + 1e-8);
                }
            }
        }
        let hard = harden(&theta, &touched);
        let n = correct(&with_tables(c, &hard), examples)?;
        if n > best.0 {
            best = (n, hard);
        }
        if best.0 == examples.len() {
            break;
        }
    }
    Ok(Fitted { tables: best.1, correct_before, correct_after: best.0, loss_before, loss_after, epochs })
}
