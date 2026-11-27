//! Mid-level IR: a typed dataflow graph with explicit effect order and
//! placement, between checked programs and their emitters.
//!
//! Every function, query, change, keep and task becomes a graph of nodes in
//! regions. Types come from the checker: pure functions use its source
//! inference and actions, keeps and task steps are lowered from the typed
//! action IR. Effects come from core's derived action effects: a call carries
//! its callee's transitive reads, writes and emits, a keep read carries what
//! the keep derives from, and table methods write exactly when the effect
//! analysis says they do. A node lists its data inputs and, separately, the earlier nodes it
//! must follow because of effects (`after`). Lazy constructs keep their
//! laziness as nested regions: `choose`, `&&` and `||` become `gamma` nodes
//! whose branch regions run only when selected, and callbacks become `lambda`
//! regions. Effect order is derived from what each node touches: state reads
//! and writes are ordered per state, emits are ordered per event, and `?`,
//! `return` and change calls (which may leave the action) are barriers. Task steps keep exactly the
//! order the task manifest fixes. Two nodes with no path between them through
//! inputs or `after` may run concurrently.
//!
//! Each graph records where it may run (client, server, worker, replica or
//! host) from its effects. Passes over the IR (common subexpressions, unused
//! total operations) preserve evaluation order, laziness and effects.
//!
//! The IR is an analysis and emission structure. It grants no equality,
//! rewrite or profitability authority; algebraic changes still need knowledge
//! proofs. See docs/mid-level-ir.md.
use crate::{
    action_ir::{Body, CheckedActions, ExprType, Instruction, Kind as IrKind, NodeId},
    check::{infer_context, Env},
    core::*,
    effects::{CheckedEffects, TABLE_WRITES},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const FORMAT: &str = "ink-mir-v1";
const MAX_NODES: u32 = 1_000_000;
const MAX_DEPTH: usize = 256;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case", deny_unknown_fields)]
pub enum Op {
    Param { name: String },
    /// A literal: number, float bits, Bool, string, Unit, enum variant or None.
    Const { value: Expr },
    Binary { operator: String },
    Neg,
    /// A pure user function.
    Call { function: String },
    /// A fixed primitive or constructor (`Some`, `Ok`, `foldl`, `string_concat`, ..).
    Builtin { name: String },
    /// A method; input 0 is the receiver.
    Method { name: String },
    Field { name: String },
    Record { name: String, fields: Vec<String> },
    /// A callback; region 0 is its body, whose leading `param` nodes bind its arguments.
    Lambda { params: Vec<String> },
    /// Lazy choice: input 0 is the Bool condition, region 0 runs when true, region 1 when false.
    Gamma,
    /// `?`: yields the Ok/Some payload or leaves the enclosing action with the failure.
    Try,
    Read { state: String, method: String },
    Write { state: String, method: String },
    Emit { event: String },
    /// A query or change called from an action or task.
    Action { name: String, change: bool },
    /// A task's external effect. Region 0 checks the reply (its `param` is the
    /// reply); region 1, when present, is the authored fallback.
    Effect { name: String, ordered: bool },
    /// Leave the enclosing action with input 0 as its result.
    Return,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Node {
    pub id: u32,
    #[serde(flatten)]
    pub op: Op,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub inputs: Vec<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub after: Vec<u32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub regions: Vec<Region>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ty: Option<Type>,
    /// Where this node's work can run (top-level nodes; see `place`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub place: Option<Place>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Region {
    pub nodes: Vec<Node>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<u32>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Place {
    /// The browser or app process, next to the user.
    Client,
    /// A background worker in either process.
    Worker,
    /// A read-only copy of state kept current from the commit log.
    Replica,
    /// The authoritative state owner.
    Server,
    /// The host that performs external effects.
    Host,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Function,
    Query,
    Change,
    Keep,
    Task,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Schedule {
    /// Length of the longest dependency chain in the top region.
    pub depth: u32,
    /// Most nodes of one region that may run at the same time.
    pub width: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Graph {
    pub name: String,
    pub kind: Kind,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub body: Region,
    /// Where this graph may run, most preferred first.
    pub placement: Vec<Place>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub reads: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub writes: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub emits: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub effects: Vec<String>,
    pub schedule: Schedule,
    /// Tasks only: for each manifest step, its main node and the node holding
    /// its bound value (the `try` after it when the step uses `?`).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<TaskStep>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TaskStep {
    pub node: u32,
    pub value: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Mir {
    pub format: String,
    pub module: String,
    pub graphs: Vec<Graph>,
    /// Declarations the IR does not yet express, with the reason. Emitters
    /// keep their existing path for these.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub unsupported: BTreeMap<String, String>,
}


/// Per-region effect order: last writer per resource and readers since.
#[derive(Default, Clone)]
struct Order {
    last_write: BTreeMap<String, u32>,
    readers: BTreeMap<String, Vec<u32>>,
    barrier: Option<u32>,
    since_barrier: Vec<u32>,
}

#[derive(Default, Clone)]
struct Footprint {
    reads: BTreeSet<String>,
    writes: BTreeSet<String>,
    barrier: bool,
}
impl Footprint {
    fn is_empty(&self) -> bool {
        self.reads.is_empty() && self.writes.is_empty() && !self.barrier
    }
    fn extend(&mut self, o: &Footprint) {
        self.reads.extend(o.reads.iter().cloned());
        self.writes.extend(o.writes.iter().cloned());
        self.barrier |= o.barrier;
    }
    fn access(a: &crate::effects::Access) -> Self {
        Footprint {
            reads: a.reads.iter().chain(&a.keeps).cloned().collect(),
            writes: a.writes.iter().cloned().chain(a.emits.iter().map(|e| format!("event:{e}"))).collect(),
            barrier: false,
        }
    }
}

impl Order {
    fn place(&mut self, id: u32, f: &Footprint) -> Vec<u32> {
        let mut after = BTreeSet::new();
        if f.is_empty() {
            return vec![];
        }
        if f.barrier {
            after.extend(self.since_barrier.iter().copied());
        }
        after.extend(self.barrier);
        for s in &f.reads {
            after.extend(self.last_write.get(s));
            self.readers.entry(s.clone()).or_default().push(id);
        }
        for s in &f.writes {
            after.extend(self.last_write.get(s));
            after.extend(self.readers.remove(s).unwrap_or_default());
            self.last_write.insert(s.clone(), id);
        }
        after.remove(&id);
        if f.barrier {
            self.barrier = Some(id);
            self.since_barrier.clear();
            self.last_write.clear();
            self.readers.clear();
        } else {
            self.since_barrier.push(id);
        }
        after.into_iter().collect()
    }
}

struct Lower<'a> {
    p: &'a Program,
    effects: Option<&'a CheckedEffects>,
    next: u32,
    depth: usize,
    footprints: BTreeMap<u32, Footprint>,
    types: BTreeMap<u32, Type>,
}

struct Frame {
    region: Region,
    order: Order,
}

/// Names in scope: their node and, where known, their type.
#[derive(Clone, Default)]
struct Scope {
    ids: BTreeMap<String, u32>,
    env: Env,
}
impl Scope {
    fn bind(&mut self, name: &str, id: u32, ty: Option<Type>) {
        self.ids.insert(name.to_string(), id);
        match ty {
            Some(t) => {
                self.env.insert(name.to_string(), t);
            }
            None => {
                self.env.remove(name);
            }
        }
    }
}

/// Parameter types of callback arguments, as the checker assigns them.
fn callback_types(p: &Program, scope: &Scope, e: &Expr, call: Option<&Type>) -> Vec<Vec<Option<Type>>> {
    let ty = |x: &Expr| infer_context(x, &scope.env, p, None).ok();
    // Accumulators take the call's type, as unsuffixed literal seeds do in the checker.
    let seed = |x: &Expr| call.cloned().or_else(|| ty(x));
    match e {
        Expr::Method(r, m, args) => {
            let receiver = ty(r);
            let one = |t: Option<Type>| vec![vec![t]; args.len()];
            match (m.as_str(), receiver) {
                ("fold", Some(Type::Option(t))) => vec![vec![Some(*t)], vec![Some(Type::Unit)]],
                ("fold", Some(Type::Result(t, x))) => vec![vec![Some(*t)], vec![Some(*x)]],
                ("map" | "and_then", Some(Type::Option(t))) | ("map" | "and_then", Some(Type::Result(t, _))) => one(Some(*t)),
                ("map_err", Some(Type::Result(_, x))) => one(Some(*x)),
                (_, Some(Type::List(t))) => one(Some(*t)),
                _ => vec![],
            }
        }
        Expr::Call(n, args) if (n == "foldl" || n == "foldr") && args.len() == 3 => {
            let element = match ty(&args[0]) {
                Some(Type::List(t)) => Some(*t),
                _ => None,
            };
            vec![vec![], vec![], vec![element, seed(&args[1])]]
        }
        Expr::Call(n, args) if n == "repeat" && args.len() == 3 => vec![vec![], vec![], vec![Some(Type::U32), seed(&args[1])]],
        Expr::Call(n, args) if n == "repeat_until" && args.len() == 4 => {
            let acc = seed(&args[1]);
            vec![vec![], vec![], vec![acc.clone()], vec![Some(Type::U32), acc]]
        }
        _ => vec![],
    }
}

impl Lower<'_> {
    fn fresh(&mut self) -> LangResult<u32> {
        if self.next >= MAX_NODES {
            return Err("mir: node limit".into());
        }
        self.next += 1;
        Ok(self.next - 1)
    }
    fn emit(&mut self, f: &mut Frame, op: Op, inputs: Vec<u32>, regions: Vec<Region>, effect: Footprint, ty: Option<Type>) -> LangResult<u32> {
        let id = self.fresh()?;
        let mut footprint = effect;
        for r in &regions {
            for n in &r.nodes {
                if let Some(x) = self.footprints.get(&n.id) {
                    footprint.extend(&x.clone());
                }
            }
        }
        let after = f.order.place(id, &footprint);
        if !footprint.is_empty() {
            self.footprints.insert(id, footprint);
        }
        if let Some(t) = &ty {
            self.types.insert(id, t.clone());
        }
        f.region.nodes.push(Node { id, op, inputs, after, regions, ty, place: None });
        Ok(id)
    }
    fn ty(&self, id: u32) -> Option<Type> {
        self.types.get(&id).cloned()
    }
    fn sub<T>(&mut self, scope: &Scope, params: &[(String, Option<Type>)], body: impl FnOnce(&mut Self, &mut Frame, &Scope) -> LangResult<T>) -> LangResult<(Region, T)> {
        self.depth += 1;
        if self.depth > MAX_DEPTH {
            return Err("mir: nesting limit".into());
        }
        let mut frame = Frame { region: Region::default(), order: Order::default() };
        let mut inner = scope.clone();
        for (n, t) in params {
            let id = self.emit(&mut frame, Op::Param { name: n.clone() }, vec![], vec![], Footprint::default(), t.clone())?;
            inner.bind(n, id, t.clone());
        }
        let out = body(self, &mut frame, &inner)?;
        self.depth -= 1;
        Ok((frame.region, out))
    }

    // ---- Pure source expressions, typed by the checker ----

    fn expr(&mut self, f: &mut Frame, e: &Expr, scope: &Scope, want: Option<&Type>) -> LangResult<u32> {
        let p = self.p;
        let ty = infer_context(e, &scope.env, p, want).ok();
        let pure = Footprint::default();
        match e {
            Expr::Var(n) if scope.ids.contains_key(n) => Ok(scope.ids[n]),
            Expr::Num(_) | Expr::Float(_) | Expr::Double(_) | Expr::Bool(_) | Expr::String(_) | Expr::Unit => self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], pure, ty),
            Expr::Var(n) if n == "None" => self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], pure, ty),
            Expr::Field(x, _) if matches!(x.as_ref(), Expr::Var(n) if p.enums.contains_key(n) && !scope.ids.contains_key(n)) => {
                self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], pure, ty)
            }
            Expr::Var(n) => Err(format!("mir: unbound name {n}")),
            Expr::Neg(x) => {
                let a = self.expr(f, x, scope, want)?;
                self.emit(f, Op::Neg, vec![a], vec![], pure, ty)
            }
            Expr::Let(n, t, value, body) => {
                let vt = t.as_deref().cloned().or_else(|| infer_context(value, &scope.env, p, None).ok());
                let v = self.expr(f, value, scope, vt.as_ref())?;
                let mut inner = scope.clone();
                inner.bind(n, v, vt);
                self.expr(f, body, &inner, want)
            }
            Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
                let c = self.expr(f, a, scope, Some(&Type::Bool))?;
                let (rhs, r) = self.sub(scope, &[], |l, fr, s| l.expr(fr, b, s, Some(&Type::Bool)))?;
                let rhs = Region { result: Some(r), ..rhs };
                let (lit, k) = self.sub(scope, &[], |l, fr, _| l.emit(fr, Op::Const { value: Expr::Bool(op == "||") }, vec![], vec![], Footprint::default(), Some(Type::Bool)))?;
                let lit = Region { result: Some(k), ..lit };
                let regions = if op == "&&" { vec![rhs, lit] } else { vec![lit, rhs] };
                self.emit(f, Op::Gamma, vec![c], regions, pure, Some(Type::Bool))
            }
            Expr::Binary(op, a, b) => {
                // Operands share a type; unsuffixed literals take it from the other side.
                let operand = crate::check::hint(a, &scope.env, p).or_else(|| crate::check::hint(b, &scope.env, p)).or_else(|| infer_context(a, &scope.env, p, None).ok()).or_else(|| infer_context(b, &scope.env, p, None).ok());
                let operand = if ["+", "-", "*", "/"].contains(&op.as_str()) { ty.clone().or(operand) } else { operand };
                let x = self.expr(f, a, scope, operand.as_ref())?;
                let y = self.expr(f, b, scope, operand.as_ref())?;
                self.emit(f, Op::Binary { operator: op.clone() }, vec![x, y], vec![], pure, ty)
            }
            Expr::Call(c, args) if c == "choose" && args.len() == 3 => {
                let cond = self.expr(f, &args[0], scope, Some(&Type::Bool))?;
                let (yes, a) = self.sub(scope, &[], |l, fr, s| l.expr(fr, &args[1], s, ty.as_ref()))?;
                let (no, b) = self.sub(scope, &[], |l, fr, s| l.expr(fr, &args[2], s, ty.as_ref()))?;
                self.emit(f, Op::Gamma, vec![cond], vec![Region { result: Some(a), ..yes }, Region { result: Some(b), ..no }], pure, ty)
            }
            Expr::Call(c, args) => {
                let callbacks = callback_types(p, scope, e, ty.as_ref());
                let params: Option<Vec<Type>> = p.functions.iter().find(|x| &x.name == c).map(|func| func.params.iter().map(|(_, t)| t.clone()).collect());
                let seeded = ["foldl", "foldr", "repeat", "repeat_until"].contains(&c.as_str());
                let mut xs = vec![];
                for (i, a) in args.iter().enumerate() {
                    let expected = params.as_ref().and_then(|ps| ps.get(i).cloned()).or_else(|| if seeded && i == 1 { ty.clone() } else { None });
                    xs.push(match (a, callbacks.get(i)) {
                        (Expr::Lambda(..), Some(types)) => self.lambda(f, a, scope, types)?,
                        _ => self.expr(f, a, scope, expected.as_ref())?,
                    });
                }
                let op = if p.functions.iter().any(|x| &x.name == c) { Op::Call { function: c.clone() } } else { Op::Builtin { name: c.clone() } };
                self.emit(f, op, xs, vec![], pure, ty)
            }
            Expr::Lambda(..) => self.lambda(f, e, scope, &[]),
            Expr::Method(recv, m, args) => {
                if let Expr::Var(t) = recv.as_ref() {
                    if !scope.ids.contains_key(t) && t.chars().next().is_some_and(|c| c.is_ascii_uppercase()) && !p.enums.contains_key(t) {
                        // A type namespace, such as `Buffer.empty()`.
                        let mut xs = vec![];
                        for a in args {
                            xs.push(self.expr(f, a, scope, None)?);
                        }
                        return self.emit(f, Op::Builtin { name: format!("{t}.{m}") }, xs, vec![], pure, ty);
                    }
                }
                let callbacks = callback_types(p, scope, e, ty.as_ref());
                let r = self.expr(f, recv, scope, None)?;
                let mut xs = vec![r];
                // Value arguments that take the result type, as in the checker.
                let expected = |i: usize| match (m.as_str(), i) {
                    ("unwrap_or", 0) | ("at_or", 1) => ty.clone(),
                    ("at_or", 0) => Some(Type::U32),
                    _ => None,
                };
                for (i, a) in args.iter().enumerate() {
                    xs.push(match (a, callbacks.get(i)) {
                        (Expr::Lambda(..), Some(types)) => self.lambda(f, a, scope, types)?,
                        _ => self.expr(f, a, scope, expected(i).as_ref())?,
                    });
                }
                self.emit(f, Op::Method { name: m.clone() }, xs, vec![], pure, ty)
            }
            Expr::Field(x, n) => {
                let a = self.expr(f, x, scope, None)?;
                self.emit(f, Op::Field { name: n.clone() }, vec![a], vec![], pure, ty)
            }
            Expr::Record(name, fields) => {
                let mut xs = vec![];
                for (k, v) in fields {
                    let t = p.records.get(name).and_then(|fs| fs.iter().find(|(n, _)| n == k)).map(|(_, t)| t.clone());
                    xs.push(self.expr(f, v, scope, t.as_ref())?);
                }
                let op = Op::Record { name: name.clone(), fields: fields.iter().map(|(k, _)| k.clone()).collect() };
                self.emit(f, op, xs, vec![], pure, ty)
            }
            Expr::Try(x) => {
                let a = self.expr(f, x, scope, None)?;
                self.emit(f, Op::Try, vec![a], vec![], Footprint { barrier: true, ..Default::default() }, ty)
            }
        }
    }

    fn lambda(&mut self, f: &mut Frame, e: &Expr, scope: &Scope, types: &[Option<Type>]) -> LangResult<u32> {
        let mut params = vec![];
        let mut body = e;
        while let Expr::Lambda(n, b) = body {
            params.push(n.clone());
            body = b;
        }
        let names: Vec<(String, Option<Type>)> = params.iter().enumerate().map(|(i, n)| (n.clone(), types.get(i).cloned().flatten())).collect();
        let (region, r) = self.sub(scope, &names, |l, fr, s| l.expr(fr, body, s, None))?;
        let ty = self.ty(r);
        self.emit(f, Op::Lambda { params }, vec![], vec![Region { result: Some(r), ..region }], Footprint::default(), ty)
    }

    // ---- Actions, keeps and task steps from the typed action IR ----

    fn ir(&mut self, f: &mut Frame, b: &Body, id: NodeId, slots: &BTreeMap<usize, u32>) -> LangResult<u32> {
        let p = self.p;
        let node = b.nodes.get(id).ok_or("mir: action node out of range")?;
        let ty = match &node.ty {
            ExprType::Value(t) => Some(t.clone()),
            ExprType::Lambda { result, .. } => Some(result.clone()),
        };
        let pure = Footprint::default();
        let constant = |l: &mut Self, f: &mut Frame, value: Expr| l.emit(f, Op::Const { value }, vec![], vec![], Footprint::default(), ty.clone());
        let args = |l: &mut Self, f: &mut Frame, xs: &[NodeId]| -> LangResult<Vec<u32>> { xs.iter().map(|x| l.ir(f, b, *x, slots)).collect() };
        match &node.kind {
            IrKind::Number(x) => constant(self, f, Expr::Num(*x)),
            IrKind::Float(x) => constant(self, f, Expr::Float(*x)),
            IrKind::Double(x) => constant(self, f, Expr::Double(*x)),
            IrKind::Bool(x) => constant(self, f, Expr::Bool(*x)),
            IrKind::String(x) => constant(self, f, Expr::String(x.clone())),
            IrKind::Unit => constant(self, f, Expr::Unit),
            IrKind::None => constant(self, f, Expr::Var("None".into())),
            IrKind::Enum { name, variant } => {
                let v = p.enums.get(name).and_then(|vs| vs.get(*variant)).ok_or("mir: enum variant")?;
                constant(self, f, Expr::Field(Box::new(Expr::Var(name.clone())), v.clone()))
            }
            IrKind::Local(slot) => slots.get(slot).copied().ok_or_else(|| "mir: unbound slot".to_string()),
            IrKind::Neg { value } => {
                let a = self.ir(f, b, *value, slots)?;
                self.emit(f, Op::Neg, vec![a], vec![], pure, ty)
            }
            IrKind::VectorField { receiver, component } => {
                let a = self.ir(f, b, *receiver, slots)?;
                self.emit(f, Op::Field { name: component.to_string() }, vec![a], vec![], pure, ty)
            }
            IrKind::State(i) => {
                let name = p.states.get(*i).ok_or("mir: state")?.name.clone();
                let effect = Footprint { reads: [name.clone()].into(), ..Default::default() };
                self.emit(f, Op::Read { state: name, method: String::new() }, vec![], vec![], effect, ty)
            }
            IrKind::Keep(i) => {
                let name = p.keeps.get(*i).ok_or("mir: keep")?.name.clone();
                let mut effect = self.effects.and_then(|e| e.keep(&name)).map(|s| Footprint::access(&s.access)).unwrap_or_default();
                effect.reads.insert(name.clone());
                effect.writes.clear();
                self.emit(f, Op::Read { state: name, method: String::new() }, vec![], vec![], effect, ty)
            }
            IrKind::Record { name, fields } => {
                let names = p.records.get(name).ok_or("mir: record")?;
                let xs = args(self, f, &fields.iter().map(|(_, n)| *n).collect::<Vec<_>>())?;
                let op = Op::Record { name: name.clone(), fields: fields.iter().map(|(i, _)| names[*i].0.clone()).collect() };
                self.emit(f, op, xs, vec![], pure, ty)
            }
            IrKind::Field { record, receiver, field } => {
                let a = self.ir(f, b, *receiver, slots)?;
                let n = p.records.get(record).and_then(|fs| fs.get(*field)).ok_or("mir: field")?.0.clone();
                self.emit(f, Op::Field { name: n }, vec![a], vec![], pure, ty)
            }
            IrKind::Binary { op, left, right } => {
                let xs = args(self, f, &[*left, *right])?;
                self.emit(f, Op::Binary { operator: op.clone() }, xs, vec![], pure, ty)
            }
            IrKind::And { left, right } | IrKind::Or { left, right } => {
                let or = matches!(node.kind, IrKind::Or { .. });
                let c = self.ir(f, b, *left, slots)?;
                let scope = Scope::default();
                let (rhs, r) = self.sub(&scope, &[], |l, fr, _| l.ir(fr, b, *right, slots))?;
                let (lit, k) = self.sub(&scope, &[], |l, fr, _| l.emit(fr, Op::Const { value: Expr::Bool(or) }, vec![], vec![], Footprint::default(), Some(Type::Bool)))?;
                let (rhs, lit) = (Region { result: Some(r), ..rhs }, Region { result: Some(k), ..lit });
                let regions = if or { vec![lit, rhs] } else { vec![rhs, lit] };
                self.emit(f, Op::Gamma, vec![c], regions, pure, Some(Type::Bool))
            }
            IrKind::Try { value } => {
                let a = self.ir(f, b, *value, slots)?;
                self.emit(f, Op::Try, vec![a], vec![], Footprint { barrier: true, ..Default::default() }, ty)
            }
            IrKind::Builtin { name, arguments } if name == "choose" && arguments.len() == 3 => {
                let c = self.ir(f, b, arguments[0], slots)?;
                let scope = Scope::default();
                let (yes, x) = self.sub(&scope, &[], |l, fr, _| l.ir(fr, b, arguments[1], slots))?;
                let (no, y) = self.sub(&scope, &[], |l, fr, _| l.ir(fr, b, arguments[2], slots))?;
                self.emit(f, Op::Gamma, vec![c], vec![Region { result: Some(x), ..yes }, Region { result: Some(y), ..no }], pure, ty)
            }
            IrKind::Builtin { name, arguments } => {
                let xs = args(self, f, arguments)?;
                self.emit(f, Op::Builtin { name: name.clone() }, xs, vec![], pure, ty)
            }
            IrKind::PureCall { function, arguments } => {
                let name = p.functions.get(*function).ok_or("mir: function")?.name.clone();
                let xs = args(self, f, arguments)?;
                self.emit(f, Op::Call { function: name }, xs, vec![], pure, ty)
            }
            IrKind::QueryCall { action, arguments } | IrKind::ChangeCall { action, arguments } => {
                let change = matches!(node.kind, IrKind::ChangeCall { .. });
                let name = p.actions.get(*action).ok_or("mir: action")?.name.clone();
                let xs = args(self, f, arguments)?;
                let mut effect = self.effects.and_then(|e| e.action(&name)).map(|s| Footprint::access(&s.access)).unwrap_or_default();
                // A change call leaves the caller on Err.
                effect.barrier = change;
                self.emit(f, Op::Action { name, change }, xs, vec![], effect, ty)
            }
            IrKind::Table { root, method, arguments } => {
                let state = p.states.get(*root).ok_or("mir: table state")?.name.clone();
                let mut xs = vec![];
                let mut callbacks = vec![];
                for a in arguments {
                    if matches!(b.nodes[*a].kind, IrKind::Lambda { .. }) {
                        callbacks.push(self.ir(f, b, *a, slots)?);
                    } else {
                        xs.push(self.ir(f, b, *a, slots)?);
                    }
                }
                xs.extend(callbacks);
                let write = TABLE_WRITES.contains(&method.as_str());
                let effect = if write {
                    Footprint { writes: [state.clone()].into(), reads: [state.clone()].into(), ..Default::default() }
                } else {
                    Footprint { reads: [state.clone()].into(), ..Default::default() }
                };
                let op = if write { Op::Write { state, method: method.clone() } } else { Op::Read { state, method: method.clone() } };
                self.emit(f, op, xs, vec![], effect, ty)
            }
            IrKind::Method { receiver, method, arguments } => {
                let r = self.ir(f, b, *receiver, slots)?;
                let mut xs = vec![r];
                xs.extend(args(self, f, arguments)?);
                self.emit(f, Op::Method { name: method.clone() }, xs, vec![], pure, ty)
            }
            IrKind::Lambda { parameter, body } => {
                let slot = b.slots.get(*parameter).ok_or("mir: lambda slot")?;
                let name = slot.name.clone();
                let (region, (r, param)) = self.sub(&Scope::default(), &[(name.clone(), Some(slot.ty.clone()))], |l, fr, _| {
                    let param = fr.region.nodes.last().map(|n| n.id).ok_or("mir: lambda parameter")?;
                    let mut inner = slots.clone();
                    inner.insert(*parameter, param);
                    Ok((l.ir(fr, b, *body, &inner)?, param))
                })?;
                let _ = param;
                let ty = match &node.ty {
                    ExprType::Lambda { result, .. } => Some(result.clone()),
                    ExprType::Value(t) => Some(t.clone()),
                };
                self.emit(f, Op::Lambda { params: vec![name] }, vec![], vec![Region { result: Some(r), ..region }], pure, ty)
            }
            IrKind::Bind { slot, value, body: inner, .. } => {
                let v = self.ir(f, b, *value, slots)?;
                let mut bound = slots.clone();
                bound.insert(*slot, v);
                self.ir(f, b, *inner, &bound)
            }
        }
    }

    fn instructions(&mut self, f: &mut Frame, b: &Body, ins: &[Instruction], slots: &mut BTreeMap<usize, u32>) -> LangResult<()> {
        for i in ins {
            match i {
                Instruction::Let { slot, value, .. } => {
                    let v = self.ir(f, b, *value, slots)?;
                    slots.insert(*slot, v);
                }
                Instruction::Eval(x) => {
                    self.ir(f, b, *x, slots)?;
                }
                Instruction::Emit { channel, value } => {
                    let v = self.ir(f, b, *value, slots)?;
                    let effect = Footprint { writes: [format!("event:{channel}")].into(), ..Default::default() };
                    self.emit(f, Op::Emit { event: channel.clone() }, vec![v], vec![], effect, None)?;
                }
                Instruction::Return(x) => {
                    let v = self.ir(f, b, *x, slots)?;
                    let ty = self.ty(v);
                    self.emit(f, Op::Return, vec![v], vec![], Footprint { barrier: true, ..Default::default() }, ty)?;
                }
                Instruction::If { condition, on_true, on_false } => {
                    let c = self.ir(f, b, *condition, slots)?;
                    // Each branch lowers once; a `return` inside is a barrier
                    // node, so the rest of the block follows the branch.
                    let branch = |l: &mut Self, list: &[Instruction]| -> LangResult<Region> {
                        let mut inner = slots.clone();
                        let (region, ()) = l.sub(&Scope::default(), &[], |l, fr, _| l.instructions(fr, b, list, &mut inner))?;
                        Ok(region)
                    };
                    let yes = branch(self, on_true)?;
                    let no = branch(self, on_false)?;
                    self.emit(f, Op::Gamma, vec![c], vec![yes, no], Footprint::default(), None)?;
                }
            }
        }
        Ok(())
    }
}

fn summarise(g: &mut Graph, footprints: &BTreeMap<u32, Footprint>) {
    fn walk(r: &Region, out: &mut Vec<u32>) {
        for n in &r.nodes {
            out.push(n.id);
            n.regions.iter().for_each(|r| walk(r, out));
        }
    }
    let mut ids = vec![];
    walk(&g.body, &mut ids);
    let (mut reads, mut writes, mut emits) = (BTreeSet::new(), BTreeSet::new(), BTreeSet::new());
    for id in ids {
        if let Some(fp) = footprints.get(&id) {
            reads.extend(fp.reads.iter().filter(|s| !s.starts_with("event:")).cloned());
            for w in &fp.writes {
                match w.strip_prefix("event:") {
                    Some(e) => {
                        emits.insert(e.to_string());
                    }
                    None => {
                        writes.insert(w.clone());
                    }
                }
            }
        }
    }
    reads.retain(|s| !writes.contains(s));
    g.reads.extend(reads);
    g.writes.extend(writes);
    g.emits.extend(emits);
    for v in [&mut g.reads, &mut g.writes, &mut g.emits] {
        v.sort();
        v.dedup();
    }
    let writes = g.writes.clone();
    g.reads.retain(|s| !writes.contains(s));
    g.placement = match g.kind {
        Kind::Function => vec![Place::Client, Place::Worker, Place::Server],
        Kind::Query | Kind::Keep => vec![Place::Replica, Place::Server],
        Kind::Change => vec![Place::Server],
        Kind::Task => vec![Place::Host],
    };
    g.schedule = schedule(&g.body);
    place(g, footprints);
}

/// Split a graph across places by where its values become available. Work
/// that depends only on parameters and constants can run at the caller
/// (client); state reads and everything after them run where state is
/// (replica for readonly graphs, server for changes); external effects run on
/// the host. Values crossing from client nodes to the others are what a
/// request carries. This is a dependency judgment, not a cost model: it says
/// where work may run, never that moving it is profitable.
fn place(g: &mut Graph, footprints: &BTreeMap<u32, Footprint>) {
    fn effectful(n: &Node, footprints: &BTreeMap<u32, Footprint>) -> bool {
        footprints.contains_key(&n.id) || matches!(n.op, Op::Read { .. } | Op::Write { .. } | Op::Emit { .. } | Op::Action { .. } | Op::Effect { .. } | Op::Return | Op::Try)
    }
    let state = match g.kind {
        Kind::Function => Place::Client,
        Kind::Query | Kind::Keep => Place::Replica,
        Kind::Change => Place::Server,
        Kind::Task => Place::Host,
    };
    let mut at: BTreeMap<u32, Place> = BTreeMap::new();
    for n in &mut g.body.nodes {
        let deps_client = n.inputs.iter().chain(&n.after).all(|d| at.get(d).is_none_or(|p| *p == Place::Client));
        let p = match &n.op {
            Op::Effect { .. } => Place::Host,
            Op::Action { change: true, .. } => Place::Server,
            Op::Action { change: false, .. } => Place::Replica,
            _ if g.kind == Kind::Function => Place::Client,
            _ if !effectful(n, footprints) && deps_client => Place::Client,
            _ => state,
        };
        at.insert(n.id, p);
        n.place = Some(p);
    }
}

/// Dependency depth of the top region and the widest set of nodes in any
/// region that may run together.
pub fn schedule(r: &Region) -> Schedule {
    let mut level: BTreeMap<u32, u32> = BTreeMap::new();
    let mut width = 0;
    let mut depth = 0;
    let mut per: BTreeMap<u32, u32> = BTreeMap::new();
    for n in &r.nodes {
        // Parameters and constants are available immediately and do no work.
        if matches!(n.op, Op::Param { .. } | Op::Const { .. }) {
            level.insert(n.id, 0);
            continue;
        }
        let l = 1 + n.inputs.iter().chain(&n.after).filter_map(|d| level.get(d)).max().copied().unwrap_or(0);
        level.insert(n.id, l);
        *per.entry(l).or_default() += 1;
        depth = depth.max(l);
        for inner in &n.regions {
            width = width.max(schedule(inner).width);
        }
    }
    Schedule { depth, width: width.max(per.values().copied().max().unwrap_or(0)) }
}

fn graph(name: &str, kind: Kind, params: Vec<(String, Type)>, result: Type, body: Region) -> Graph {
    Graph { name: name.into(), kind, params, result, body, placement: vec![], reads: vec![], writes: vec![], emits: vec![], effects: vec![], schedule: Schedule::default(), steps: vec![] }
}

fn action_body(l: &mut Lower, b: &Body, params: &[(String, Type)]) -> LangResult<Region> {
    let named: Vec<(String, Option<Type>)> = params.iter().map(|(n, t)| (n.clone(), Some(t.clone()))).collect();
    let (region, result) = l.sub(&Scope::default(), &named, |l, fr, _| {
        // Action parameters occupy the first slots, in order.
        let mut slots: BTreeMap<usize, u32> = fr.region.nodes.iter().enumerate().map(|(i, n)| (i, n.id)).collect();
        l.instructions(fr, b, &b.instructions, &mut slots)?;
        b.value.map(|v| l.ir(fr, b, v, &slots)).transpose()
    })?;
    Ok(Region { result, ..region })
}

fn task_graph(l: &mut Lower, ir: &CheckedActions, t: &crate::tasks::Task) -> LangResult<Graph> {
    let p = l.p;
    let mut f = Frame { region: Region::default(), order: Order::default() };
    let mut scope: BTreeMap<String, u32> = BTreeMap::new();
    for (n, ty) in &t.params {
        let id = l.emit(&mut f, Op::Param { name: n.clone() }, vec![], vec![], Footprint::default(), Some(ty.clone()))?;
        scope.insert(n.clone(), id);
    }
    // Generated queries hold each task expression as `return EXPR`; lower its
    // typed body with its parameters bound to the task's names.
    let generated = |name: &str| -> LangResult<(usize, Vec<String>)> {
        let i = p.actions.iter().position(|a| a.name == name).ok_or_else(|| format!("mir: missing {name}"))?;
        Ok((i, p.actions[i].params.iter().map(|(n, _)| n.clone()).collect()))
    };
    let inline = |l: &mut Lower, f: &mut Frame, scope: &BTreeMap<String, u32>, name: &str, extra: Option<u32>| -> LangResult<u32> {
        let (i, params) = generated(name)?;
        let b = ir.action(i).ok_or("mir: generated query body")?;
        let mut slots = BTreeMap::new();
        for (k, n) in params.iter().enumerate() {
            let id = scope.get(n).copied().or(extra.filter(|_| k + 1 == params.len())).ok_or_else(|| format!("mir: {name} uses unbound {n}"))?;
            slots.insert(k, id);
        }
        match b.instructions.as_slice() {
            [Instruction::Return(x)] => l.ir(f, b, *x, &slots),
            _ => Err(format!("mir: unexpected generated query {name}")),
        }
    };
    let mut steps: Vec<u32> = vec![];
    let mut task_steps = vec![];
    for s in &t.steps {
        let mut args = vec![];
        for q in &s.args {
            args.push(inline(l, &mut f, &scope, q, None)?);
        }
        let id = match s.kind {
            crate::tasks::Kind::Value => inline(l, &mut f, &scope, &s.callee, None)?,
            crate::tasks::Kind::Query | crate::tasks::Kind::Change => {
                let a = p.actions.iter().find(|a| a.name == s.callee).ok_or("mir: missing action")?;
                let id = l.fresh()?;
                f.region.nodes.push(Node { id, op: Op::Action { name: s.callee.clone(), change: a.kind == ActionKind::Change }, inputs: args, after: steps.clone(), regions: vec![], ty: Some(a.result.clone()), place: None });
                l.types.insert(id, a.result.clone());
                id
            }
            crate::tasks::Kind::Effect => {
                let e = p.contracts.tasks.effects.iter().find(|e| e.name == s.callee).ok_or("mir: missing effect")?;
                let reply = s.bind.clone().unwrap_or_else(|| "__task_value".into());
                let accept = s.accept.clone().ok_or("mir: effect without accept")?;
                let mut regions = vec![];
                let (region, r) = l.sub(&Scope::default(), &[(reply, Some(e.result.clone()))], |l, fr, _| {
                    let reply = fr.region.nodes.last().map(|n| n.id);
                    inline(l, fr, &scope, &accept, reply)
                })?;
                regions.push(Region { result: Some(r), ..region });
                if let Some(fb) = &s.fallback {
                    let (region, r) = l.sub(&Scope::default(), &[], |l, fr, _| inline(l, fr, &scope, fb, None))?;
                    regions.push(Region { result: Some(r), ..region });
                }
                let id = l.fresh()?;
                let after = if e.ordered { steps.clone() } else { vec![] };
                f.region.nodes.push(Node { id, op: Op::Effect { name: e.name.clone(), ordered: e.ordered }, inputs: args, after, regions, ty: Some(e.result.clone()), place: None });
                l.types.insert(id, e.result.clone());
                id
            }
        };
        let value = if s.propagate {
            let tid = l.fresh()?;
            let ty = match l.ty(id) {
                Some(Type::Result(x, _)) => Some(*x),
                _ => None,
            };
            f.region.nodes.push(Node { id: tid, op: Op::Try, inputs: vec![id], after: vec![], regions: vec![], ty: ty.clone(), place: None });
            if let Some(t) = ty {
                l.types.insert(tid, t);
            }
            tid
        } else {
            id
        };
        steps.push(id);
        if value != id {
            steps.push(value);
        }
        task_steps.push(TaskStep { node: id, value });
        if let Some(b) = &s.bind {
            scope.insert(b.clone(), value);
        }
    }
    let r = inline(l, &mut f, &scope, &t.ret, None)?;
    f.region.result = Some(r);
    let mut g = graph(&t.name, Kind::Task, t.params.clone(), t.result.clone(), f.region);
    g.steps = task_steps;
    g.effects = t.steps.iter().filter(|s| s.kind == crate::tasks::Kind::Effect).map(|s| s.callee.clone()).collect::<BTreeSet<_>>().into_iter().collect();
    for s in &t.steps {
        if let Some(sum) = l.effects.and_then(|e| e.action(&s.callee)) {
            g.reads.extend(sum.access.reads.iter().cloned());
            g.writes.extend(sum.access.writes.iter().cloned());
            g.emits.extend(sum.access.emits.iter().cloned());
        }
    }
    summarise(&mut g, &l.footprints);
    Ok(g)
}

/// Lower a checked module. Declarations the IR cannot express are listed in
/// `unsupported` rather than failing the whole module.
pub fn lower(module: &CheckedModule) -> Mir {
    let p = module.program();
    let ir = CheckedActions::elaborate_with_frozen_roots(module);
    let effects = ir.as_ref().ok().map(CheckedEffects::derive);
    let effects_ref = effects.as_ref().and_then(|e| e.as_ref().ok());
    let mut l = Lower { p, effects: effects_ref, next: 0, depth: 0, footprints: BTreeMap::new(), types: BTreeMap::new() };
    let mut mir = Mir { format: FORMAT.into(), module: p.module.clone(), graphs: vec![], unsupported: BTreeMap::new() };
    for func in &p.functions {
        l.depth = 0;
        let params: Vec<(String, Option<Type>)> = func.params.iter().map(|(n, t)| (n.clone(), Some(t.clone()))).collect();
        match l.sub(&Scope::default(), &params, |l, fr, sc| l.expr(fr, &func.body, sc, Some(&func.result))) {
            Ok((region, out)) => {
                let mut g = graph(&func.name, Kind::Function, func.params.clone(), func.result.clone(), Region { result: Some(out), ..region });
                summarise(&mut g, &l.footprints);
                mir.graphs.push(g);
            }
            Err(e) => {
                mir.unsupported.insert(func.name.clone(), e);
            }
        }
    }
    let ir = match ir {
        Ok(ir) => ir,
        Err(e) => {
            for a in &p.actions {
                mir.unsupported.insert(a.name.clone(), format!("mir: action IR: {e}"));
            }
            return mir;
        }
    };
    if let Some(Err(e)) = &effects {
        mir.unsupported.insert("<effects>".into(), format!("mir: effects: {e}"));
    }
    for (i, a) in p.actions.iter().enumerate() {
        if a.name.starts_with(crate::tasks::PREFIX) {
            continue;
        }
        l.depth = 0;
        let kind = if a.kind == ActionKind::Query { Kind::Query } else { Kind::Change };
        match ir.action(i).ok_or_else(|| "mir: missing action body".to_string()).and_then(|b| action_body(&mut l, b, &a.params)) {
            Ok(body) => {
                let mut g = graph(&a.name, kind, a.params.clone(), a.result.clone(), body);
                summarise(&mut g, &l.footprints);
                mir.graphs.push(g);
            }
            Err(e) => {
                mir.unsupported.insert(a.name.clone(), e);
            }
        }
    }
    for (i, k) in p.keeps.iter().enumerate() {
        l.depth = 0;
        match ir.keep(i).ok_or_else(|| "mir: missing keep body".to_string()).and_then(|b| action_body(&mut l, b, &[])) {
            Ok(body) => {
                let mut g = graph(&k.name, Kind::Keep, vec![], k.ty.clone(), body);
                summarise(&mut g, &l.footprints);
                mir.graphs.push(g);
            }
            Err(e) => {
                mir.unsupported.insert(k.name.clone(), e);
            }
        }
    }
    for t in &p.contracts.tasks.tasks {
        match task_graph(&mut l, &ir, t) {
            Ok(g) => mir.graphs.push(g),
            Err(e) => {
                mir.unsupported.insert(t.name.clone(), e);
            }
        }
    }
    mir
}

/// Check that every input and `after` edge refers to a node defined earlier
/// in the same region or an enclosing one, ids are unique, and results exist.
pub fn verify(m: &Mir) -> LangResult<()> {
    fn region(r: &Region, visible: &mut Vec<BTreeSet<u32>>, seen: &mut BTreeSet<u32>) -> LangResult<()> {
        visible.push(BTreeSet::new());
        for n in &r.nodes {
            if !seen.insert(n.id) {
                return Err(format!("mir: node {} defined twice", n.id));
            }
            for d in n.inputs.iter().chain(&n.after) {
                if !visible.iter().any(|v| v.contains(d)) {
                    return Err(format!("mir: node {} uses {d} outside its scope", n.id));
                }
            }
            match (&n.op, n.regions.len()) {
                (Op::Gamma, 2) | (Op::Lambda { .. }, 1) | (Op::Effect { .. }, 1 | 2) => {}
                (Op::Gamma | Op::Lambda { .. } | Op::Effect { .. }, _) => return Err(format!("mir: node {} has the wrong regions", n.id)),
                (_, 0) => {}
                _ => return Err(format!("mir: node {} cannot own regions", n.id)),
            }
            for inner in &n.regions {
                region(inner, visible, seen)?;
            }
            visible.last_mut().unwrap().insert(n.id);
        }
        if let Some(res) = r.result {
            if !visible.iter().any(|v| v.contains(&res)) {
                return Err(format!("mir: region result {res} is not in scope"));
            }
        }
        visible.pop();
        Ok(())
    }
    if m.format != FORMAT {
        return Err("mir: wrong format".into());
    }
    let mut seen = BTreeSet::new();
    for g in &m.graphs {
        region(&g.body, &mut vec![], &mut seen)?;
    }
    Ok(())
}

fn total(op: &Op) -> bool {
    // Never Return, Try, calls, effects or regions.
    matches!(op, Op::Const { .. } | Op::Field { .. } | Op::Record { .. } | Op::Neg)
        || matches!(op, Op::Binary { operator } if operator != "/")
}

/// Merge identical total or pure-call nodes within a region and drop unused
/// total nodes. Evaluation order of everything else, laziness and effect
/// order are unchanged. Returns the number of nodes removed.
pub fn simplify(m: &mut Mir) -> usize {
    fn rename(r: &mut Region, map: &BTreeMap<u32, u32>) {
        for n in &mut r.nodes {
            for x in n.inputs.iter_mut().chain(n.after.iter_mut()) {
                if let Some(y) = map.get(x) {
                    *x = *y;
                }
            }
            n.regions.iter_mut().for_each(|r| rename(r, map));
        }
        if let Some(x) = r.result.as_mut() {
            if let Some(y) = map.get(x) {
                *x = *y;
            }
        }
    }
    fn uses(r: &Region, out: &mut BTreeSet<u32>) {
        for n in &r.nodes {
            out.extend(n.inputs.iter().chain(&n.after));
            n.regions.iter().for_each(|r| uses(r, out));
        }
        out.extend(r.result);
    }
    fn region(r: &mut Region) -> usize {
        let mut removed = 0;
        for n in &mut r.nodes {
            for inner in &mut n.regions {
                removed += region(inner);
            }
        }
        // Common subexpressions: same operation on the same inputs.
        let mut seen: BTreeMap<String, u32> = BTreeMap::new();
        let mut map = BTreeMap::new();
        let mut keep = vec![];
        for mut n in std::mem::take(&mut r.nodes) {
            for x in n.inputs.iter_mut() {
                if let Some(y) = map.get(x) {
                    *x = *y;
                }
            }
            n.regions.iter_mut().for_each(|r| rename(r, &map));
            let pure = n.regions.is_empty() && n.after.is_empty() && (total(&n.op) || matches!(n.op, Op::Call { .. }));
            if pure {
                let key = format!("{}|{:?}", serde_json::to_string(&n.op).unwrap_or_default(), n.inputs);
                if let Some(&same) = seen.get(&key) {
                    map.insert(n.id, same);
                    removed += 1;
                    continue;
                }
                seen.insert(key, n.id);
            }
            keep.push(n);
        }
        r.nodes = keep;
        if let Some(x) = r.result.as_mut() {
            if let Some(y) = map.get(x) {
                *x = *y;
            }
        }
        // Unused total nodes, repeatedly.
        loop {
            let mut used = BTreeSet::new();
            uses(r, &mut used);
            let before = r.nodes.len();
            r.nodes.retain(|n| used.contains(&n.id) || !total(&n.op) || !n.after.is_empty());
            if r.nodes.len() == before {
                break;
            }
            removed += before - r.nodes.len();
        }
        removed
    }
    let mut removed = 0;
    for g in &mut m.graphs {
        removed += region(&mut g.body);
        g.schedule = schedule(&g.body);
    }
    removed
}
