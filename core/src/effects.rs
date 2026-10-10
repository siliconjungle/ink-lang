//! Bounded, conservative effects of ordered checked actions. This is a source
//! typing judgment, never evidence for a replacement or journal shortcut.
use crate::{
    action_ir::{Body, CheckedActions, ExprType, Instruction, Kind, NodeId},
    syntax::{ActionKind, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-action-effects-v1";
const WORK: usize = 2_000_000;

/// Only outer constructors are tracked. Unknown values include every inhabitant
/// of their checked outer type; this deliberately forgets correlations and keys.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum ValueShape {
    Other,
    False,
    True,
    None,
    Some,
    Ok,
    Err,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Exit {
    Next,
    Return,
    Abort,
    Host,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Path {
    pub written: bool,
    pub emitted: bool,
    pub exit: Exit,
    pub value: ValueShape,
}
impl Path {
    /// Fixed prefix sequencing. Abrupt exits cannot resume a suffix.
    pub fn follow(self, suffix: Self) -> Self {
        if self.exit != Exit::Next {
            return self;
        }
        Self {
            written: self.written || suffix.written,
            emitted: self.emitted || suffix.emitted,
            ..suffix
        }
    }
}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Access {
    pub reads: BTreeSet<String>,
    pub writes: BTreeSet<String>,
    pub emits: BTreeSet<String>,
    pub keeps: BTreeSet<String>,
    /// Transitively reachable source actions and direct pure-function entries.
    /// Builtins and internal calls of a pure function are not enumerated.
    pub calls: BTreeSet<String>,
}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Summary {
    pub access: Access,
    /// Prefix effects before each possible body exit, not committed state.
    pub paths: BTreeSet<Path>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Wire {
    schema: u32,
    semantics: String,
    source: String,
    actions_identity: String,
    actions: BTreeMap<String, Summary>,
    keeps: BTreeMap<String, Summary>,
}
/// Immutable source/IR-bound judgment. Producer-supplied facts are regenerated.
pub struct CheckedEffects {
    wire: Wire,
}
impl CheckedEffects {
    pub fn derive(actions: &CheckedActions) -> LangResult<Self> {
        let mut checker = Checker {
            actions,
            remaining: WORK,
            active: BTreeSet::new(),
            done: BTreeMap::new(),
        };
        let p = actions.module().program();
        let mut action_summaries = BTreeMap::new();
        let mut keep_summaries = BTreeMap::new();
        for (i, a) in p.actions.iter().enumerate() {
            let s = checker.entry(true, i)?;
            if s.paths.iter().any(|p| p.exit == Exit::Next) {
                return Err("action effect judgment can fall through".into());
            }
            // Reading a keep grants its transitive read-only dependencies,
            // rather than requiring callers to repeat the keep's root reads.
            let mut allowed_reads: BTreeSet<String> =
                a.reads.iter().chain(&a.writes).cloned().collect();
            let mut allowed_keeps: BTreeSet<String> = a.reads.iter().cloned().collect();
            for name in &a.reads {
                if let Some(index) = p.keeps.iter().position(|k| &k.name == name) {
                    let keep = checker.entry(false, index)?;
                    allowed_reads.extend(keep.access.reads);
                    allowed_keeps.extend(keep.access.keeps);
                }
            }
            for name in &s.access.reads {
                if !allowed_reads.contains(name) {
                    return Err(format!("effect judgment exceeds read permission: {name}"));
                }
            }
            for name in &s.access.keeps {
                if !allowed_keeps.contains(name) {
                    return Err(format!("effect judgment exceeds keep permission: {name}"));
                }
            }
            for name in &s.access.writes {
                if !a.writes.contains(name) {
                    return Err("effect judgment exceeds write permission".into());
                }
            }
            for name in &s.access.emits {
                if !a.emits.contains(name) {
                    return Err("effect judgment exceeds event permission".into());
                }
            }
            action_summaries.insert(a.name.clone(), s);
        }
        for (i, k) in p.keeps.iter().enumerate() {
            let s = checker.entry(false, i)?;
            if !s.access.writes.is_empty() || !s.access.emits.is_empty() {
                return Err("keep effect judgment is not read-only".into());
            }
            keep_summaries.insert(k.name.clone(), s);
        }
        let out = Self {
            wire: Wire {
                schema: 1,
                semantics: SEMANTICS.into(),
                source: actions.source_identity().into(),
                actions_identity: actions.identity()?,
                actions: action_summaries,
                keeps: keep_summaries,
            },
        };
        out.bytes()?;
        Ok(out)
    }
    pub fn from_bytes(actions: &CheckedActions, bytes: &[u8]) -> LangResult<Self> {
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("effect artifact byte limit".into());
        }
        let supplied: Wire = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        let expected = Self::derive(actions)?;
        if serde_json::to_vec(&supplied).map_err(|e| e.to_string())? != expected.bytes()? {
            return Err("effect artifact does not describe checked actions".into());
        }
        Ok(expected)
    }
    pub fn bytes(&self) -> LangResult<Vec<u8>> {
        let bytes = serde_json::to_vec(&self.wire).map_err(|e| e.to_string())?;
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("effect artifact byte limit".into());
        }
        Ok(bytes)
    }
    pub fn identity(&self) -> LangResult<String> {
        use sha2::{Digest, Sha256};
        Ok(format!("{:x}", Sha256::digest(self.bytes()?)))
    }
    pub fn source_identity(&self) -> &str {
        &self.wire.source
    }
    pub fn actions_identity(&self) -> &str {
        &self.wire.actions_identity
    }
    pub fn action(&self, name: &str) -> Option<&Summary> {
        self.wire.actions.get(name)
    }
    pub fn keep(&self, name: &str) -> Option<&Summary> {
        self.wire.keeps.get(name)
    }
}
fn shapes(t: &Type) -> &'static [ValueShape] {
    use ValueShape::*;
    match t {
        Type::Bool => &[False, True],
        Type::Result(..) => &[Ok, Err],
        Type::Option(_) => &[None, Some],
        _ => &[Other],
    }
}
fn normal(values: &[ValueShape]) -> Summary {
    Summary {
        access: Access::default(),
        paths: values
            .iter()
            .map(|&value| Path {
                written: false,
                emitted: false,
                exit: Exit::Next,
                value,
            })
            .collect(),
    }
}
fn host() -> Summary {
    Summary {
        access: Access::default(),
        paths: [Path {
            written: false,
            emitted: false,
            exit: Exit::Host,
            value: ValueShape::Other,
        }]
        .into_iter()
        .collect(),
    }
}
struct Checker<'a> {
    actions: &'a CheckedActions,
    remaining: usize,
    active: BTreeSet<(bool, usize)>,
    done: BTreeMap<(bool, usize), Summary>,
}
impl Checker<'_> {
    fn tick(&mut self, count: usize) -> LangResult<()> {
        self.remaining = self
            .remaining
            .checked_sub(count)
            .ok_or("effect judgment work limit")?;
        Ok(())
    }
    fn access(&mut self, to: &mut Access, from: &Access) -> LangResult<()> {
        self.tick(
            from.reads.len()
                + from.writes.len()
                + from.emits.len()
                + from.keeps.len()
                + from.calls.len()
                + 1,
        )?;
        to.reads.extend(from.reads.iter().cloned());
        to.writes.extend(from.writes.iter().cloned());
        to.emits.extend(from.emits.iter().cloned());
        to.keeps.extend(from.keeps.iter().cloned());
        to.calls.extend(from.calls.iter().cloned());
        Ok(())
    }
    fn join(&mut self, mut a: Summary, b: Summary) -> LangResult<Summary> {
        self.tick(b.paths.len() + 1)?;
        self.access(&mut a.access, &b.access)?;
        a.paths.extend(b.paths);
        Ok(a)
    }
    /// Abrupt exits suppress the suffix. Prefix mutation/event bits survive.
    fn then(&mut self, a: Summary, b: Summary) -> LangResult<Summary> {
        let reachable = a.paths.iter().any(|p| p.exit == Exit::Next);
        let mut out = Summary {
            access: a.access,
            paths: BTreeSet::new(),
        };
        if reachable {
            self.access(&mut out.access, &b.access)?;
        }
        for left in a.paths {
            self.tick(1)?;
            if left.exit != Exit::Next {
                out.paths.insert(left);
                continue;
            }
            for right in &b.paths {
                self.tick(1)?;
                out.paths.insert(left.follow(*right));
            }
        }
        Ok(out)
    }
    fn tags(&mut self, a: Summary, values: &[ValueShape]) -> LangResult<Summary> {
        self.then(a, normal(values))
    }
    fn entry(&mut self, action: bool, index: usize) -> LangResult<Summary> {
        let key = (action, index);
        if let Some(done) = self.done.get(&key) {
            let done = done.clone();
            self.tick(1)?;
            return Ok(done);
        }
        if self.active.len() >= 128 || !self.active.insert(key) {
            return Err("effect dependency cycle/depth limit".into());
        }
        let body = if action {
            self.actions.action(index)
        } else {
            self.actions.keep(index)
        }
        .ok_or("missing checked effect body")?
        .clone();
        let mut out = if action {
            self.block(&body, &body.instructions)?
        } else {
            self.expr(&body, body.value.ok_or("missing keep root")?, 0)?
        };
        // Domain propagation exits a read-only declaration locally as Err.
        // Its caller sees that Result value, and chooses whether to propagate.
        let p = self.actions.module().program();
        let local = !action || p.actions[index].kind == ActionKind::Query;
        if local {
            let result = if action {
                &p.actions[index].result
            } else {
                &p.keeps[index].ty
            };
            if out.paths.iter().any(|p| p.exit == Exit::Abort)
                && !matches!(result, Type::Result(..))
            {
                return Err("non-Result read-only declaration can abort".into());
            }
            out.paths = out
                .paths
                .into_iter()
                .map(|mut p| {
                    if p.exit == Exit::Abort {
                        p.exit = if action { Exit::Return } else { Exit::Next };
                        p.value = ValueShape::Err;
                    }
                    p
                })
                .collect();
        }
        self.active.remove(&key);
        self.done.insert(key, out.clone());
        Ok(out)
    }
    fn call(&mut self, action: bool, index: usize) -> LangResult<Summary> {
        let mut s = self.entry(action, index)?;
        let p = self.actions.module().program();
        if action {
            let a = &p.actions[index];
            s.access.calls.insert(a.name.clone());
            s.paths = s
                .paths
                .into_iter()
                .map(|mut path| {
                    if path.exit == Exit::Return {
                        if a.kind == ActionKind::Change && path.value == ValueShape::Err {
                            path.exit = Exit::Abort;
                            path.value = ValueShape::Other;
                        } else {
                            path.exit = Exit::Next;
                        }
                    }
                    path
                })
                .collect();
        } else {
            s.access.keeps.insert(p.keeps[index].name.clone());
        }
        Ok(s)
    }
    fn block(&mut self, body: &Body, instructions: &[Instruction]) -> LangResult<Summary> {
        let mut prefix = normal(&[ValueShape::Other]);
        for i in instructions {
            self.tick(1)?;
            if !prefix.paths.iter().any(|p| p.exit == Exit::Next) {
                break;
            }
            let operation = match i {
                Instruction::Let { value, .. } | Instruction::Eval(value) => {
                    self.expr(body, *value, 0)?
                }
                Instruction::Return(value) => {
                    let mut s = self.expr(body, *value, 0)?;
                    s.paths = s
                        .paths
                        .into_iter()
                        .map(|mut p| {
                            if p.exit == Exit::Next {
                                p.exit = Exit::Return;
                            }
                            p
                        })
                        .collect();
                    s
                }
                Instruction::Emit { channel, value } => {
                    let a = self.expr(body, *value, 0)?;
                    let mut e = normal(&[ValueShape::Other]);
                    e.access.emits.insert(channel.clone());
                    e.paths = e
                        .paths
                        .into_iter()
                        .map(|mut p| {
                            p.emitted = true;
                            p
                        })
                        .collect();
                    self.then(a, e)?
                }
                Instruction::If {
                    condition,
                    on_true,
                    on_false,
                } => {
                    let condition = self.expr(body, *condition, 0)?;
                    let mut s = Summary::default();
                    for path in &condition.paths {
                        self.tick(1)?;
                        let single = Summary {
                            access: condition.access.clone(),
                            paths: [*path].into_iter().collect(),
                        };
                        let suffix = if path.exit != Exit::Next {
                            normal(&[ValueShape::Other])
                        } else if path.value == ValueShape::True {
                            self.block(body, on_true)?
                        } else if path.value == ValueShape::False {
                            self.block(body, on_false)?
                        } else {
                            return Err("non-Boolean effect condition".into());
                        };
                        let branch = self.then(single, suffix)?;
                        s = self.join(s, branch)?;
                    }
                    s
                }
            };
            // Any evaluated statement can exhaust reference execution fuel.
            let operation = self.join(operation, host())?;
            prefix = self.then(prefix, operation)?;
        }
        Ok(prefix)
    }
    fn arguments(&mut self, body: &Body, ids: &[NodeId], depth: usize) -> LangResult<Summary> {
        let mut out = normal(&[ValueShape::Other]);
        for id in ids {
            if !out.paths.iter().any(|p| p.exit == Exit::Next) {
                break;
            }
            let s = self.expr(body, *id, depth + 1)?;
            out = self.then(out, s)?;
        }
        Ok(out)
    }
    fn expr(&mut self, body: &Body, id: NodeId, depth: usize) -> LangResult<Summary> {
        self.tick(1)?;
        if depth > 128 {
            return Err("effect expression depth limit".into());
        }
        let node = body.nodes.get(id).ok_or("effect node reference")?;
        let output = match &node.ty {
            ExprType::Value(t) => shapes(t),
            ExprType::Lambda { .. } => &[ValueShape::Other],
        };
        let s = match &node.kind {
            Kind::Bool(b) => normal(&[if *b {
                ValueShape::True
            } else {
                ValueShape::False
            }]),
            Kind::None => normal(&[ValueShape::None]),
            Kind::Number(_)
            | Kind::String(_)
            | Kind::Unit
            | Kind::Enum { .. }
            | Kind::Local(_)
            | Kind::Lambda { .. } => normal(output),
            Kind::State(root) => {
                let mut s = normal(output);
                s.access
                    .reads
                    .insert(self.actions.module().program().states[*root].name.clone());
                s
            }
            Kind::Keep(index) => self.call(false, *index)?,
            Kind::Record { fields, .. } => {
                let ids = fields.iter().map(|(_, n)| *n).collect::<Vec<_>>();
                let s = self.arguments(body, &ids, depth)?;
                self.tags(s, output)?
            }
            Kind::Field { receiver, .. } => {
                let s = self.expr(body, *receiver, depth + 1)?;
                self.tags(s, output)?
            }
            Kind::Binary { left, right, .. } => {
                let s = self.arguments(body, &[*left, *right], depth)?;
                self.tags(s, output)?
            }
            Kind::And { left, right } | Kind::Or { left, right } => {
                let lhs = self.expr(body, *left, depth + 1)?;
                let mut out = Summary::default();
                for path in &lhs.paths {
                    let single = Summary {
                        access: lhs.access.clone(),
                        paths: [*path].into_iter().collect(),
                    };
                    let skipped = matches!(&node.kind, Kind::And { .. })
                        && path.value == ValueShape::False
                        || matches!(&node.kind, Kind::Or { .. }) && path.value == ValueShape::True;
                    let rhs = if path.exit != Exit::Next || skipped {
                        normal(&[path.value])
                    } else {
                        self.expr(body, *right, depth + 1)?
                    };
                    let branch = self.then(single, rhs)?;
                    out = self.join(out, branch)?;
                }
                out
            }
            Kind::Try { value } => {
                let a = self.expr(body, *value, depth + 1)?;
                let mut out = Summary {
                    access: a.access,
                    paths: BTreeSet::new(),
                };
                for path in a.paths {
                    if path.exit != Exit::Next {
                        out.paths.insert(path);
                    } else if path.value == ValueShape::Err {
                        out.paths.insert(Path {
                            exit: Exit::Abort,
                            value: ValueShape::Other,
                            ..path
                        });
                    } else if path.value == ValueShape::Ok {
                        for &value in output {
                            out.paths.insert(Path { value, ..path });
                        }
                    } else {
                        return Err("non-Result effect propagation".into());
                    }
                }
                out
            }
            Kind::PureCall {
                function,
                arguments,
            } => {
                let a = self.arguments(body, arguments, depth)?;
                let mut b = normal(output);
                b.access.calls.insert(
                    self.actions.module().program().functions[*function]
                        .name
                        .clone(),
                );
                self.then(a, b)?
            }
            Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => {
                let a = self.arguments(body, arguments, depth)?;
                let b = self.call(true, *action)?;
                self.then(a, b)?
            }
            Kind::Builtin { name, arguments } => {
                let a = self.arguments(body, arguments, depth)?;
                let tags = match name.as_str() {
                    "Ok" => &[ValueShape::Ok][..],
                    "Err" => &[ValueShape::Err][..],
                    "Some" => &[ValueShape::Some][..],
                    _ => output,
                };
                self.tags(a, tags)?
            }
            Kind::Table {
                root,
                method,
                arguments,
            } => {
                let a = self.arguments(body, arguments, depth)?;
                let mut b = normal(output);
                let name = self.actions.module().program().states[*root].name.clone();
                b.access.reads.insert(name.clone());
                if ["insert", "replace", "remove"].contains(&method.as_str()) {
                    b.access.writes.insert(name);
                    b.paths = b
                        .paths
                        .into_iter()
                        .map(|mut p| {
                            p.written = true;
                            p
                        })
                        .collect();
                }
                self.then(a, b)?
            }
            Kind::Method {
                receiver,
                method,
                arguments,
            } => {
                let a = self.expr(body, *receiver, depth + 1)?;
                if method == "ok_or" {
                    // Fallback evaluation is eager, including for Some receivers.
                    let b = self.arguments(body, arguments, depth)?;
                    let s = self.then(a, b)?;
                    self.tags(s, output)?
                } else {
                    let callback = arguments.first().ok_or("missing effect callback")?;
                    let Kind::Lambda { body: callback, .. } = &body.nodes[*callback].kind else {
                        return Err("effect callback is not a lambda".into());
                    };
                    let mut out = Summary::default();
                    for path in &a.paths {
                        let single = Summary {
                            access: a.access.clone(),
                            paths: [*path].into_iter().collect(),
                        };
                        let run = match path.value {
                            ValueShape::Some => true,
                            ValueShape::Ok => method == "map",
                            ValueShape::Err => method == "map_err",
                            ValueShape::None => false,
                            _ => true,
                        };
                        let suffix = if path.exit != Exit::Next || !run {
                            normal(output)
                        } else {
                            let b = self.expr(body, *callback, depth + 1)?;
                            if !b.access.writes.is_empty() || !b.access.emits.is_empty() {
                                return Err("effectful collection callback".into());
                            }
                            let b = self.tags(b, output)?;
                            // Lists can be empty or invoke a read-only callback many
                            // times. One invocation covers all prefix mutation bits;
                            // value/key correlations are deliberately forgotten.
                            let ExprType::Value(receiver_type) = &body.nodes[*receiver].ty else {
                                return Err("callback receiver type".into());
                            };
                            if matches!(receiver_type, Type::List(_)) {
                                self.join(normal(output), b)?
                            } else {
                                b
                            }
                        };
                        let branch = self.then(single, suffix)?;
                        out = self.join(out, branch)?;
                    }
                    out
                }
            }
        };
        // Conservative recoverable host failure before or after a primitive;
        // this does not claim that allocation/process/driver failures recover.
        let s = self.join(s, host())?;
        let after = self.then(s.clone(), host())?;
        self.join(s, after)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exhausted_effect_work_budget_cannot_create_a_partial_judgment() {
        let module = crate::core::CheckedModule::from_source(
            crate::syntax::parse("module test; query plain()->u32{return 3;}").unwrap(),
        )
        .unwrap();
        let actions = CheckedActions::elaborate(&module).unwrap();
        let mut checker = Checker {
            actions: &actions,
            remaining: 0,
            active: BTreeSet::new(),
            done: BTreeMap::new(),
        };
        assert!(checker.entry(true, 0).is_err());
        assert!(checker.done.is_empty());
    }
}
