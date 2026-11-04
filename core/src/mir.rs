//! Mid-level IR: a typed dataflow graph with explicit effect order and
//! placement, between checked programs and their emitters.
//!
//! Every function, query, change and task becomes a graph of nodes in
//! regions. A node lists its data inputs and, separately, the earlier nodes it
//! must follow because of effects (`after`). Lazy constructs keep their
//! laziness as nested regions: `choose`, `&&` and `||` become `gamma` nodes
//! whose branch regions run only when selected, and callbacks become `lambda`
//! regions. Effect order is derived from what each node touches: state reads
//! and writes are ordered per state, emits are ordered among themselves, and
//! `?` (which may leave the action) is a barrier. Task steps keep exactly the
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
use crate::{core::*, LangResult};
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

/// Methods on state that only read it. Anything else on a written state is a write.
const READS: &[&str] = &["get", "contains", "contains_key", "at_or", "len", "length", "is_empty", "keys", "values", "entries", "first", "last", "range", "min", "max", "count", "sum", "fold", "find", "lookup", "slice", "to_list", "iter"];

fn is_variant(p: &Program, e: &Expr) -> bool {
    matches!(e, Expr::Field(x, _) if matches!(x.as_ref(), Expr::Var(n) if p.enums.contains_key(n)))
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
}

impl Order {
    fn place(&mut self, id: u32, f: &Footprint) -> Vec<u32> {
        let mut after = BTreeSet::new();
        if f.is_empty() {
            return vec![];
        }
        if f.barrier {
            after.extend(self.since_barrier.iter().copied());
            after.extend(self.barrier);
        } else {
            after.extend(self.barrier);
        }
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
    next: u32,
    depth: usize,
    /// Effect footprints of nodes, for summarising regions.
    footprints: BTreeMap<u32, Footprint>,
    types: BTreeMap<u32, Type>,
}

struct Frame {
    region: Region,
    order: Order,
}

type Scope = BTreeMap<String, u32>;

impl Lower<'_> {
    /// States a keep (derived value) depends on, transitively, plus the keep.
    fn keep_reads(&self, name: &str) -> BTreeSet<String> {
        let p = self.p;
        let mut out = BTreeSet::new();
        let mut pending = vec![name.to_string()];
        while let Some(n) = pending.pop() {
            if !out.insert(n.clone()) {
                continue;
            }
            if let Some(k) = p.keeps.iter().find(|k| k.name == n) {
                for v in crate::analysis::free_variables(&k.value) {
                    if p.states.iter().any(|s| s.name == v) || p.keeps.iter().any(|k| k.name == v) {
                        pending.push(v);
                    }
                }
            }
        }
        out
    }
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
        f.region.nodes.push(Node { id, op, inputs, after, regions, ty });
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
            inner.insert(n.clone(), id);
        }
        let out = body(self, &mut frame, &inner)?;
        self.depth -= 1;
        Ok((frame.region, out))
    }

    fn expr(&mut self, f: &mut Frame, e: &Expr, scope: &Scope) -> LangResult<u32> {
        let p = self.p;
        match e {
            Expr::Var(n) if scope.contains_key(n) => Ok(scope[n]),
            Expr::Num(_) | Expr::Float(_) | Expr::Double(_) | Expr::Bool(_) | Expr::String(_) | Expr::Unit => {
                let ty = match e {
                    Expr::Float(_) => Some(Type::F32),
                    Expr::Double(_) => Some(Type::F64),
                    Expr::Bool(_) => Some(Type::Bool),
                    Expr::String(_) => Some(Type::String),
                    Expr::Unit => Some(Type::Unit),
                    _ => None,
                };
                self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], Footprint::default(), ty)
            }
            Expr::Var(n) if n == "None" => self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], Footprint::default(), None),
            _ if is_variant(p, e) => {
                let Expr::Field(x, _) = e else { unreachable!() };
                let Expr::Var(n) = x.as_ref() else { unreachable!() };
                self.emit(f, Op::Const { value: e.clone() }, vec![], vec![], Footprint::default(), Some(Type::Named(n.clone())))
            }
            Expr::Var(n) if p.states.iter().any(|s| &s.name == n) => {
                // A whole value-state read.
                let ty = p.states.iter().find(|s| &s.name == n).map(|s| s.ty.clone());
                let effect = Footprint { reads: [n.clone()].into(), ..Default::default() };
                self.emit(f, Op::Read { state: n.clone(), method: String::new() }, vec![], vec![], effect, ty)
            }
            Expr::Var(n) if p.keeps.iter().any(|k| &k.name == n) => {
                // A derived value: ordered after writes to everything it depends on.
                let ty = p.keeps.iter().find(|k| &k.name == n).map(|k| k.ty.clone());
                let effect = Footprint { reads: self.keep_reads(n), ..Default::default() };
                self.emit(f, Op::Read { state: n.clone(), method: String::new() }, vec![], vec![], effect, ty)
            }
            Expr::Var(n) => Err(format!("mir: unbound name {n}")),
            Expr::Neg(x) => {
                let a = self.expr(f, x, scope)?;
                let ty = self.ty(a);
                self.emit(f, Op::Neg, vec![a], vec![], Footprint::default(), ty)
            }
            Expr::Let(n, t, value, body) => {
                let v = self.expr(f, value, scope)?;
                if let Some(t) = t {
                    self.types.entry(v).or_insert(t.as_ref().clone());
                }
                let mut inner = scope.clone();
                inner.insert(n.clone(), v);
                self.expr(f, body, &inner)
            }
            Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
                // Lazy: the right operand runs only when needed.
                let c = self.expr(f, a, scope)?;
                let (rhs, r) = self.sub(scope, &[], |l, fr, s| l.expr(fr, b, s))?;
                let rhs = Region { result: Some(r), ..rhs };
                let (lit, k) = self.sub(scope, &[], |l, fr, _| l.emit(fr, Op::Const { value: Expr::Bool(op == "||") }, vec![], vec![], Footprint::default(), Some(Type::Bool)))?;
                let lit = Region { result: Some(k), ..lit };
                let regions = if op == "&&" { vec![rhs, lit] } else { vec![lit, rhs] };
                self.emit(f, Op::Gamma, vec![c], regions, Footprint::default(), Some(Type::Bool))
            }
            Expr::Binary(op, a, b) => {
                let x = self.expr(f, a, scope)?;
                let y = self.expr(f, b, scope)?;
                let operand = self.ty(x).or_else(|| self.ty(y));
                for id in [x, y] {
                    if let Some(t) = &operand {
                        self.types.entry(id).or_insert(t.clone());
                    }
                }
                let ty = if ["==", "!=", "<", "<=", ">", ">="].contains(&op.as_str()) { Some(Type::Bool) } else { operand };
                self.emit(f, Op::Binary { operator: op.clone() }, vec![x, y], vec![], Footprint::default(), ty)
            }
            Expr::Call(c, args) if c == "choose" && args.len() == 3 => {
                let cond = self.expr(f, &args[0], scope)?;
                let (yes, a) = self.sub(scope, &[], |l, fr, s| l.expr(fr, &args[1], s))?;
                let (no, b) = self.sub(scope, &[], |l, fr, s| l.expr(fr, &args[2], s))?;
                let ty = self.ty(a).or_else(|| self.ty(b));
                self.emit(f, Op::Gamma, vec![cond], vec![Region { result: Some(a), ..yes }, Region { result: Some(b), ..no }], Footprint::default(), ty)
            }
            Expr::Call(c, args) if c == "foldl" && args.len() == 3 && matches!(args[2], Expr::Lambda(..)) => {
                let list = self.expr(f, &args[0], scope)?;
                let init = self.expr(f, &args[1], scope)?;
                let element = match self.ty(list) {
                    Some(Type::List(t)) => Some(*t),
                    _ => None,
                };
                let step = self.lambda(f, &args[2], scope, &[element, self.ty(init)])?;
                let ty = self.ty(init).or_else(|| self.ty(step));
                self.emit(f, Op::Builtin { name: c.clone() }, vec![list, init, step], vec![], Footprint::default(), ty)
            }
            Expr::Call(c, args) => {
                let mut xs = vec![];
                for a in args {
                    xs.push(self.expr(f, a, scope)?);
                }
                if let Some(func) = p.functions.iter().find(|x| &x.name == c) {
                    for (x, (_, t)) in xs.iter().zip(&func.params) {
                        self.types.entry(*x).or_insert(t.clone());
                    }
                    return self.emit(f, Op::Call { function: c.clone() }, xs, vec![], Footprint::default(), Some(func.result.clone()));
                }
                if let Some(a) = p.actions.iter().find(|x| &x.name == c) {
                    let effect = Footprint {
                        reads: a.reads.iter().chain(&a.writes).cloned().collect(),
                        writes: a.writes.iter().cloned().chain(a.emits.iter().map(|e| format!("event:{e}"))).collect(),
                        barrier: false,
                    };
                    return self.emit(f, Op::Action { name: c.clone(), change: a.kind == ActionKind::Change }, xs, vec![], effect, Some(a.result.clone()));
                }
                let ty = match (c.as_str(), xs.first().and_then(|x| self.ty(*x))) {
                    ("Some", Some(t)) => Some(Type::Option(Box::new(t))),
                    ("string_byte_len", _) => Some(Type::U32),
                    ("string_concat", _) => Some(Type::String),
                    _ => None,
                };
                self.emit(f, Op::Builtin { name: c.clone() }, xs, vec![], Footprint::default(), ty)
            }
            Expr::Lambda(..) => self.lambda(f, e, scope, &[]),
            Expr::Method(recv, m, args) => {
                if let Expr::Var(s) = recv.as_ref() {
                    if !scope.contains_key(s) && (p.states.iter().any(|x| &x.name == s) || p.keeps.iter().any(|x| &x.name == s)) {
                        let mut xs = vec![];
                        for a in args {
                            xs.push(self.expr(f, a, scope)?);
                        }
                        let keep = p.keeps.iter().any(|x| &x.name == s);
                        let write = !keep && !READS.contains(&m.as_str());
                        let effect = if write {
                            Footprint { writes: [s.clone()].into(), ..Default::default() }
                        } else if keep {
                            Footprint { reads: self.keep_reads(s), ..Default::default() }
                        } else {
                            Footprint { reads: [s.clone()].into(), ..Default::default() }
                        };
                        let op = if write { Op::Write { state: s.clone(), method: m.clone() } } else { Op::Read { state: s.clone(), method: m.clone() } };
                        return self.emit(f, op, xs, vec![], effect, None);
                    }
                }
                if let Expr::Var(t) = recv.as_ref() {
                    if !scope.contains_key(t) && t.chars().next().is_some_and(|c| c.is_ascii_uppercase()) {
                        // A type namespace, such as `Buffer.empty()` or `Table.empty()`.
                        let mut xs = vec![];
                        for a in args {
                            xs.push(self.expr(f, a, scope)?);
                        }
                        return self.emit(f, Op::Builtin { name: format!("{t}.{m}") }, xs, vec![], Footprint::default(), None);
                    }
                }
                let r = self.expr(f, recv, scope)?;
                let mut xs = vec![r];
                // Option/Result fold callbacks receive the payload or the error.
                let arms = match (m.as_str(), self.ty(r)) {
                    ("fold", Some(Type::Option(t))) => vec![Some(*t), Some(Type::Unit)],
                    ("fold", Some(Type::Result(t, e))) => vec![Some(*t), Some(*e)],
                    _ => vec![],
                };
                for (i, a) in args.iter().enumerate() {
                    xs.push(match (a, arms.get(i)) {
                        (Expr::Lambda(..), Some(t)) => self.lambda(f, a, scope, &[t.clone()])?,
                        _ => self.expr(f, a, scope)?,
                    });
                }
                let ty = match (m.as_str(), self.ty(r)) {
                    ("unwrap_or", Some(Type::Option(t))) => Some(*t),
                    ("at_or", Some(Type::List(t))) => Some(*t),
                    ("fold", _) => xs.iter().skip(1).find_map(|l| self.ty(*l)),
                    _ => None,
                };
                self.emit(f, Op::Method { name: m.clone() }, xs, vec![], Footprint::default(), ty)
            }
            Expr::Field(x, n) => {
                let a = self.expr(f, x, scope)?;
                let ty = match self.ty(a) {
                    Some(Type::Named(r)) => p.records.get(&r).and_then(|fs| fs.iter().find(|(k, _)| k == n)).map(|(_, t)| t.clone()),
                    _ => None,
                };
                self.emit(f, Op::Field { name: n.clone() }, vec![a], vec![], Footprint::default(), ty)
            }
            Expr::Record(name, fields) => {
                let mut xs = vec![];
                for (k, v) in fields {
                    let id = self.expr(f, v, scope)?;
                    if let Some(t) = p.records.get(name).and_then(|fs| fs.iter().find(|(n, _)| n == k)).map(|(_, t)| t.clone()) {
                        self.types.entry(id).or_insert(t);
                    }
                    xs.push(id);
                }
                let op = Op::Record { name: name.clone(), fields: fields.iter().map(|(k, _)| k.clone()).collect() };
                self.emit(f, op, xs, vec![], Footprint::default(), Some(Type::Named(name.clone())))
            }
            Expr::Try(x) => {
                let a = self.expr(f, x, scope)?;
                let ty = match self.ty(a) {
                    Some(Type::Result(t, _)) | Some(Type::Option(t)) => Some(*t),
                    _ => None,
                };
                self.emit(f, Op::Try, vec![a], vec![], Footprint { barrier: true, ..Default::default() }, ty)
            }
        }
    }

    /// A callback whose parameters have the given types where known.
    fn lambda(&mut self, f: &mut Frame, e: &Expr, scope: &Scope, types: &[Option<Type>]) -> LangResult<u32> {
        let mut params = vec![];
        let mut body = e;
        while let Expr::Lambda(n, b) = body {
            params.push(n.clone());
            body = b;
        }
        let names: Vec<(String, Option<Type>)> = params.iter().enumerate().map(|(i, n)| (n.clone(), types.get(i).cloned().flatten())).collect();
        let (region, r) = self.sub(scope, &names, |l, fr, s| l.expr(fr, body, s))?;
        let ty = self.ty(r);
        self.emit(f, Op::Lambda { params }, vec![], vec![Region { result: Some(r), ..region }], Footprint::default(), ty)
    }

    fn returns(s: &Statement) -> bool {
        match s {
            Statement::Return(_) => true,
            Statement::If(_, a, b) => a.iter().chain(b).any(Self::returns),
            _ => false,
        }
    }

    /// Lower statements; branches that may return take the rest of the block
    /// with them, so every region ends in its result.
    fn statements(&mut self, f: &mut Frame, ss: &[Statement], scope: &Scope) -> LangResult<Option<u32>> {
        let mut scope = scope.clone();
        for (i, s) in ss.iter().enumerate() {
            match s {
                Statement::Let(n, t, e) => {
                    let v = self.expr(f, e, &scope)?;
                    if let Some(t) = t {
                        self.types.entry(v).or_insert(t.clone());
                    }
                    scope.insert(n.clone(), v);
                }
                Statement::Expr(e) => {
                    self.expr(f, e, &scope)?;
                }
                Statement::Emit(event, e) => {
                    let v = self.expr(f, e, &scope)?;
                    let effect = Footprint { writes: [format!("event:{event}")].into(), ..Default::default() };
                    self.emit(f, Op::Emit { event: event.clone() }, vec![v], vec![], effect, None)?;
                }
                Statement::Return(e) => return Ok(Some(self.expr(f, e, &scope)?)),
                Statement::If(c, a, b) => {
                    let cond = self.expr(f, c, &scope)?;
                    let rest = &ss[i + 1..];
                    let carry = Self::returns(s);
                    let branch = |l: &mut Self, body: &[Statement]| -> LangResult<Region> {
                        let full: Vec<Statement> = if carry { body.iter().chain(rest).cloned().collect() } else { body.to_vec() };
                        let (region, r) = l.sub(&scope, &[], |l, fr, sc| l.statements(fr, &full, sc))?;
                        Ok(Region { result: r, ..region })
                    };
                    let (yes, no) = (branch(self, a)?, branch(self, b)?);
                    let id = self.emit(f, Op::Gamma, vec![cond], vec![yes, no], Footprint::default(), None)?;
                    if carry {
                        return Ok(Some(id));
                    }
                }
            }
        }
        Ok(None)
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
    g.reads = reads.into_iter().collect();
    g.writes = writes.into_iter().collect();
    g.emits = emits.into_iter().collect();
    g.placement = match g.kind {
        Kind::Function => vec![Place::Client, Place::Worker, Place::Server],
        Kind::Query => vec![Place::Replica, Place::Server],
        Kind::Change => vec![Place::Server],
        Kind::Task => vec![Place::Host],
    };
    g.schedule = schedule(&g.body);
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

fn task_graph(l: &mut Lower, t: &crate::tasks::Task) -> LangResult<Graph> {
    let p = l.p;
    let mut f = Frame { region: Region::default(), order: Order::default() };
    let mut scope = Scope::new();
    for (n, ty) in &t.params {
        let id = l.emit(&mut f, Op::Param { name: n.clone() }, vec![], vec![], Footprint::default(), Some(ty.clone()))?;
        scope.insert(n.clone(), id);
    }
    // Generated queries hold each task expression as `return EXPR`.
    let body_of = |name: &str| -> LangResult<(Vec<String>, Expr)> {
        let a = p.actions.iter().find(|a| a.name == name).ok_or_else(|| format!("mir: missing {name}"))?;
        match a.body.as_slice() {
            [Statement::Return(e)] => Ok((a.params.iter().map(|(n, _)| n.clone()).collect(), e.clone())),
            _ => Err(format!("mir: unexpected generated query {name}")),
        }
    };
    let inline = |l: &mut Lower, f: &mut Frame, scope: &Scope, name: &str| -> LangResult<u32> {
        let (params, e) = body_of(name)?;
        let mut inner = Scope::new();
        for n in params {
            if let Some(id) = scope.get(&n) {
                inner.insert(n, *id);
            }
        }
        l.expr(f, &e, &inner)
    };
    let mut steps: Vec<u32> = vec![];
    for s in &t.steps {
        let mut args = vec![];
        for q in &s.args {
            args.push(inline(l, &mut f, &scope, q)?);
        }
        let id = match s.kind {
            crate::tasks::Kind::Value => inline(l, &mut f, &scope, &s.callee)?,
            crate::tasks::Kind::Query | crate::tasks::Kind::Change => {
                let a = p.actions.iter().find(|a| a.name == s.callee).ok_or("mir: missing action")?;
                let id = l.fresh()?;
                f.region.nodes.push(Node { id, op: Op::Action { name: s.callee.clone(), change: a.kind == ActionKind::Change }, inputs: args, after: steps.clone(), regions: vec![], ty: Some(a.result.clone()) });
                l.types.insert(id, a.result.clone());
                id
            }
            crate::tasks::Kind::Effect => {
                let e = p.contracts.tasks.effects.iter().find(|e| e.name == s.callee).ok_or("mir: missing effect")?;
                let reply = s.bind.clone().unwrap_or_else(|| "__task_value".into());
                let (accept_params, accept) = body_of(s.accept.as_deref().ok_or("mir: effect without accept")?)?;
                let mut regions = vec![];
                let (region, r) = l.sub(&scope, &[(reply.clone(), Some(e.result.clone()))], |l, fr, sc| {
                    let mut inner = Scope::new();
                    for n in &accept_params {
                        if let Some(id) = sc.get(n) {
                            inner.insert(n.clone(), *id);
                        }
                    }
                    l.expr(fr, &accept, &inner)
                })?;
                regions.push(Region { result: Some(r), ..region });
                if let Some(fb) = &s.fallback {
                    let (region, r) = l.sub(&scope, &[], |l, fr, sc| inline(l, fr, sc, fb))?;
                    regions.push(Region { result: Some(r), ..region });
                }
                let id = l.fresh()?;
                let after = if e.ordered { steps.clone() } else { vec![] };
                f.region.nodes.push(Node { id, op: Op::Effect { name: e.name.clone(), ordered: e.ordered }, inputs: args, after, regions, ty: Some(e.result.clone()) });
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
            f.region.nodes.push(Node { id: tid, op: Op::Try, inputs: vec![id], after: vec![], regions: vec![], ty: ty.clone() });
            if let Some(t) = ty {
                l.types.insert(tid, t);
            }
            tid
        } else {
            id
        };
        steps.push(value);
        if value != id {
            steps.push(id);
        }
        if let Some(b) = &s.bind {
            scope.insert(b.clone(), value);
        }
    }
    let r = inline(l, &mut f, &scope, &t.ret)?;
    f.region.result = Some(r);
    let mut g = Graph {
        name: t.name.clone(),
        kind: Kind::Task,
        params: t.params.clone(),
        result: t.result.clone(),
        body: f.region,
        placement: vec![],
        reads: vec![],
        writes: vec![],
        emits: vec![],
        effects: t.steps.iter().filter(|s| s.kind == crate::tasks::Kind::Effect).map(|s| s.callee.clone()).collect::<BTreeSet<_>>().into_iter().collect(),
        schedule: Schedule::default(),
    };
    summarise(&mut g, &l.footprints);
    for s in &t.steps {
        if let Some(a) = p.actions.iter().find(|a| a.name == s.callee) {
            g.reads.extend(a.reads.iter().cloned());
            g.writes.extend(a.writes.iter().cloned());
        }
    }
    g.reads.sort();
    g.reads.dedup();
    g.writes.sort();
    g.writes.dedup();
    Ok(g)
}

/// Lower a checked program. Declarations the IR cannot express are listed in
/// `unsupported` rather than failing the whole module.
pub fn lower(p: &Program) -> Mir {
    let mut l = Lower { p, next: 0, depth: 0, footprints: BTreeMap::new(), types: BTreeMap::new() };
    let mut mir = Mir { format: FORMAT.into(), module: p.module.clone(), graphs: vec![], unsupported: BTreeMap::new() };
    let generated = |n: &str| n.starts_with(crate::tasks::PREFIX);
    for func in &p.functions {
        l.depth = 0;
        let r = l.sub(&Scope::new(), &func.params.iter().map(|(n, t)| (n.clone(), Some(t.clone()))).collect::<Vec<_>>(), |l, fr, sc| l.expr(fr, &func.body, sc));
        match r {
            Ok((region, out)) => {
                let mut g = Graph {
                    name: func.name.clone(),
                    kind: Kind::Function,
                    params: func.params.clone(),
                    result: func.result.clone(),
                    body: Region { result: Some(out), ..region },
                    placement: vec![],
                    reads: vec![],
                    writes: vec![],
                    emits: vec![],
                    effects: vec![],
                    schedule: Schedule::default(),
                };
                summarise(&mut g, &l.footprints);
                mir.graphs.push(g);
            }
            Err(e) => {
                mir.unsupported.insert(func.name.clone(), e);
            }
        }
    }
    for a in p.actions.iter().filter(|a| !generated(&a.name)) {
        l.depth = 0;
        let params: Vec<(String, Option<Type>)> = a.params.iter().map(|(n, t)| (n.clone(), Some(t.clone()))).collect();
        match l.sub(&Scope::new(), &params, |l, fr, sc| l.statements(fr, &a.body, sc)) {
            Ok((region, out)) => {
                let mut g = Graph {
                    name: a.name.clone(),
                    kind: if a.kind == ActionKind::Query { Kind::Query } else { Kind::Change },
                    params: a.params.clone(),
                    result: a.result.clone(),
                    body: Region { result: out, ..region },
                    placement: vec![],
                    reads: vec![],
                    writes: vec![],
                    emits: vec![],
                    effects: vec![],
                    schedule: Schedule::default(),
                };
                summarise(&mut g, &l.footprints);
                mir.graphs.push(g);
            }
            Err(e) => {
                mir.unsupported.insert(a.name.clone(), e);
            }
        }
    }
    for t in &p.contracts.tasks.tasks {
        match task_graph(&mut l, t) {
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
