//! Source-bound, conservative point-access descriptions. These are discovery
//! facts, never rewrite, cache-retention, aliasing or scheduling authority.
use crate::{
    action_ir::{Body, CheckedActions, ExprType, Instruction, Kind, NodeId},
    effects::CheckedEffects,
    syntax::{ActionKind, Expr, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-action-access-v1";
const WORK: usize = 2_000_000;
const ENTRIES: usize = 4096;

/// Parameters use the outer action's positional identity, not lexical names.
/// Symbols contain input-only expressions: no state reads or mutable identities.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Symbol {
    Parameter(usize),
    Number(u64),
    NumberAs(Type, u64),
    String(String),
    Bool(bool),
    Neg(Type, Box<Symbol>),
    Binary(Type, String, Box<Symbol>, Box<Symbol>),
    Field(Box<Symbol>, String),
    Record(String, Vec<(String, Symbol)>),
}
impl Symbol {
    fn size(&self, depth: usize) -> usize {
        if depth > 32 {
            return 129;
        }
        1 + match self {
            Self::Neg(_, x) | Self::Field(x, _) => x.size(depth + 1),
            Self::Binary(_, _, a, b) => a.size(depth + 1) + b.size(depth + 1),
            Self::Record(_, xs) => xs.iter().map(|(_, x)| x.size(depth + 1)).sum(),
            _ => 0,
        }
    }
}
fn bounded(x: Symbol) -> Option<Symbol> {
    (x.size(0) <= 128).then_some(x)
}
fn number(n: u64, ty: &Type) -> Symbol {
    if *ty == Type::U64 {
        Symbol::Number(n)
    } else {
        Symbol::NumberAs(ty.clone(), n)
    }
}
fn node_type(body: &Body, id: NodeId) -> LangResult<Type> {
    match &body.nodes.get(id).ok_or("access node type")?.ty {
        ExprType::Value(ty) => Ok(ty.clone()),
        _ => Err("access expected a value type".into()),
    }
}
fn field(x: Symbol, name: &str) -> Option<Symbol> {
    if let Symbol::Record(_, fields) = &x {
        return fields
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, x)| x.clone());
    }
    bounded(Symbol::Field(Box::new(x), name.into()))
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Condition {
    pub expression: Symbol,
    pub value: bool,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Scope {
    Point { key_type: Type, key: Symbol },
    Whole { reason: String },
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Mode {
    Read,
    Write,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Access {
    pub root: String,
    pub mode: Mode,
    pub scope: Scope,
    pub conditions: Vec<Condition>,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Summary {
    pub kind: ActionKind,
    pub parameters: Vec<(String, Type)>,
    pub accesses: Vec<Access>,
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
pub struct CheckedAccess {
    wire: Wire,
}
impl CheckedAccess {
    pub fn derive(actions: &CheckedActions) -> LangResult<Self> {
        CheckedEffects::derive(actions)?;
        let mut checker = Checker {
            actions,
            remaining: WORK,
            active: BTreeSet::new(),
        };
        let p = actions.module().program();
        let mut summaries = BTreeMap::new();
        for (index, action) in p.actions.iter().enumerate() {
            let arguments = (0..action.params.len())
                .map(|i| Some(Symbol::Parameter(i)))
                .collect();
            let mut accesses = vec![];
            checker.entry(true, index, arguments, &[], &mut accesses, 0)?;
            summaries.insert(
                action.name.clone(),
                Summary {
                    kind: action.kind.clone(),
                    parameters: action.params.clone(),
                    accesses,
                },
            );
        }
        let mut keeps = BTreeMap::new();
        for (index, keep) in p.keeps.iter().enumerate() {
            let mut accesses = vec![];
            checker.entry(false, index, vec![], &[], &mut accesses, 0)?;
            keeps.insert(
                keep.name.clone(),
                Summary {
                    kind: ActionKind::Query,
                    parameters: vec![],
                    accesses,
                },
            );
        }
        let result = Self {
            wire: Wire {
                schema: 1,
                semantics: SEMANTICS.into(),
                source: actions.source_identity().into(),
                actions_identity: actions.identity()?,
                actions: summaries,
                keeps,
            },
        };
        result.bytes()?;
        Ok(result)
    }
    pub fn from_bytes(actions: &CheckedActions, bytes: &[u8]) -> LangResult<Self> {
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("access artifact byte limit".into());
        }
        let supplied: Wire = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        let expected = Self::derive(actions)?;
        if serde_json::to_vec(&supplied).map_err(|e| e.to_string())? != expected.bytes()? {
            return Err("access artifact does not describe checked actions".into());
        }
        Ok(expected)
    }
    pub fn bytes(&self) -> LangResult<Vec<u8>> {
        let bytes = serde_json::to_vec(&self.wire).map_err(|e| e.to_string())?;
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("access artifact byte limit".into());
        }
        Ok(bytes)
    }
    pub fn action(&self, name: &str) -> Option<&Summary> {
        self.wire.actions.get(name)
    }
    pub fn source_identity(&self) -> &str {
        &self.wire.source
    }
    pub fn actions_identity(&self) -> &str {
        &self.wire.actions_identity
    }
}
#[derive(Clone)]
struct State {
    values: Vec<Option<Symbol>>,
    conditions: Vec<Condition>,
}
struct Checker<'a> {
    actions: &'a CheckedActions,
    remaining: usize,
    active: BTreeSet<(bool, usize)>,
}
impl Checker<'_> {
    fn tick(&mut self, depth: usize) -> LangResult<()> {
        if depth > 128 {
            return Err("access analysis depth limit".into());
        }
        self.remaining = self
            .remaining
            .checked_sub(1)
            .ok_or("access analysis work limit")?;
        Ok(())
    }
    fn entry(
        &mut self,
        action: bool,
        index: usize,
        arguments: Vec<Option<Symbol>>,
        conditions: &[Condition],
        out: &mut Vec<Access>,
        depth: usize,
    ) -> LangResult<()> {
        self.tick(depth)?;
        if !self.active.insert((action, index)) {
            return Err("cyclic access dependency".into());
        }
        let body = if action {
            self.actions.action(index)
        } else {
            self.actions.keep(index)
        }
        .ok_or("access body reference")?;
        let mut state = State {
            values: vec![None; body.slots.len()],
            conditions: conditions.to_vec(),
        };
        for (i, value) in arguments.into_iter().enumerate() {
            *state.values.get_mut(i).ok_or("access parameter slot")? = value;
        }
        if action {
            self.block(body, &body.instructions, &mut state, out, depth + 1)?;
        } else {
            self.expr(
                body,
                body.value.ok_or("access keep value")?,
                &mut state,
                out,
                depth + 1,
            )?;
        }
        self.active.remove(&(action, index));
        Ok(())
    }
    fn record(
        &mut self,
        root: usize,
        mode: Mode,
        scope: Scope,
        state: &State,
        out: &mut Vec<Access>,
    ) -> LangResult<()> {
        let root = self
            .actions
            .module()
            .program()
            .states
            .get(root)
            .ok_or("access state root")?;
        let access = Access {
            root: root.name.clone(),
            mode,
            scope,
            conditions: state.conditions.clone(),
        };
        if !out.contains(&access) {
            if out.len() >= ENTRIES {
                return Err("access entry limit".into());
            }
            out.push(access);
        }
        Ok(())
    }
    fn block(
        &mut self,
        body: &Body,
        instructions: &[Instruction],
        state: &mut State,
        out: &mut Vec<Access>,
        depth: usize,
    ) -> LangResult<bool> {
        self.tick(depth)?;
        for instruction in instructions {
            self.tick(depth)?;
            match instruction {
                Instruction::Let { slot, value, .. } => {
                    let value = self.expr(body, *value, state, out, depth + 1)?;
                    state.values[*slot] = value;
                }
                Instruction::Return(value) => {
                    self.expr(body, *value, state, out, depth + 1)?;
                    return Ok(true);
                }
                Instruction::Eval(value) | Instruction::Emit { value, .. } => {
                    self.expr(body, *value, state, out, depth + 1)?;
                }
                Instruction::If {
                    condition,
                    on_true,
                    on_false,
                } => {
                    let condition = self.expr(body, *condition, state, out, depth + 1)?;
                    if let Some(Symbol::Bool(value)) = condition {
                        if self.block(
                            body,
                            if value { on_true } else { on_false },
                            state,
                            out,
                            depth + 1,
                        )? {
                            return Ok(true);
                        }
                        continue;
                    }
                    let mut yes = state.clone();
                    let mut no = state.clone();
                    if let Some(expression) = condition {
                        yes.conditions.push(Condition {
                            expression: expression.clone(),
                            value: true,
                        });
                        no.conditions.push(Condition {
                            expression,
                            value: false,
                        });
                    }
                    let y = self.block(body, on_true, &mut yes, out, depth + 1)?;
                    let n = self.block(body, on_false, &mut no, out, depth + 1)?;
                    if y && n {
                        return Ok(true);
                    }
                    if y {
                        state.conditions = no.conditions;
                    } else if n {
                        state.conditions = yes.conditions;
                    }
                    // Branch locals have distinct resolved slots and do not escape.
                }
            }
        }
        Ok(false)
    }
    fn expr(
        &mut self,
        body: &Body,
        id: NodeId,
        state: &mut State,
        out: &mut Vec<Access>,
        depth: usize,
    ) -> LangResult<Option<Symbol>> {
        self.tick(depth)?;
        let node = body.nodes.get(id).ok_or("access node reference")?;
        let value = match &node.kind {
            Kind::Number(n) => Some(number(*n, &node_type(body, id)?)),
            Kind::String(s) => Some(Symbol::String(s.clone())),
            Kind::Bool(b) => Some(Symbol::Bool(*b)),
            Kind::Local(slot) => state.values[*slot].clone(),
            Kind::Bind {
                slot,
                value,
                body: next,
                ..
            } => {
                let value = self.expr(body, *value, state, out, depth + 1)?;
                let previous = std::mem::replace(&mut state.values[*slot], value);
                let value = self.expr(body, *next, state, out, depth + 1)?;
                state.values[*slot] = previous;
                value
            }
            Kind::Neg { value } => {
                let ty = node_type(body, id)?;
                self.expr(body, *value, state, out, depth + 1)?
                    .and_then(|x| bounded(Symbol::Neg(ty, Box::new(x))))
            }
            Kind::Field {
                receiver,
                record,
                field: index,
            } => {
                let name = &self.actions.module().program().records[record][*index].0;
                self.expr(body, *receiver, state, out, depth + 1)?
                    .and_then(|x| field(x, name))
            }
            Kind::Binary { op, left, right } => {
                let a = self.expr(body, *left, state, out, depth + 1)?;
                let b = self.expr(body, *right, state, out, depth + 1)?;
                let ty = node_type(body, *left)?;
                a.zip(b).and_then(|(a, b)| {
                    bounded(Symbol::Binary(ty, op.clone(), Box::new(a), Box::new(b)))
                })
            }
            Kind::And { left, right } | Kind::Or { left, right } => {
                let a = self.expr(body, *left, state, out, depth + 1)?;
                let is_and = matches!(&node.kind, Kind::And { .. });
                if a == Some(Symbol::Bool(!is_and)) {
                    return Ok(a);
                }
                let mut branch = state.clone();
                if let Some(expression) = a.clone() {
                    branch.conditions.push(Condition {
                        expression,
                        value: is_and,
                    });
                }
                let b = self.expr(body, *right, &mut branch, out, depth + 1)?;
                a.zip(b).and_then(|(a, b)| {
                    bounded(Symbol::Binary(
                        Type::Bool,
                        if is_and { "&&" } else { "||" }.into(),
                        Box::new(a),
                        Box::new(b),
                    ))
                })
            }
            Kind::Record { name, fields } => {
                let mut values = vec![];
                let mut known = true;
                for (index, id) in fields {
                    match self.expr(body, *id, state, out, depth + 1)? {
                        Some(value) => values.push((
                            self.actions.module().program().records[name][*index]
                                .0
                                .clone(),
                            value,
                        )),
                        None => known = false,
                    }
                }
                if known {
                    bounded(Symbol::Record(name.clone(), values))
                } else {
                    None
                }
            }
            Kind::Table {
                root,
                method,
                arguments,
            } => {
                let mut args = vec![];
                for id in arguments {
                    args.push(self.expr(body, *id, state, out, depth + 1)?);
                }
                let point = ["get", "contains", "insert", "replace", "remove", "put"]
                    .contains(&method.as_str());
                let scope = if point {
                    match args.first().and_then(Clone::clone) {
                        Some(key) => {
                            let Type::Table(ty, _) = &self.actions.module().program().states[*root].ty else {
                                return Err("access table type".into());
                            };
                            Scope::Point { key_type: *ty.clone(), key }
                        }
                        None => Scope::Whole { reason: "key depends on state, callback data, or unsupported pure expression".into() },
                    }
                } else {
                    Scope::Whole {
                        reason: format!("{method} accesses a collection"),
                    }
                };
                self.record(*root, Mode::Read, scope.clone(), state, out)?;
                if [
                    "insert",
                    "replace",
                    "remove",
                    "put",
                    "put_many",
                    "remove_many",
                ]
                .contains(&method.as_str())
                {
                    self.record(*root, Mode::Write, scope, state, out)?;
                }
                None
            }
            Kind::State(root) => {
                self.record(
                    *root,
                    Mode::Read,
                    Scope::Whole {
                        reason: "whole state-root value".into(),
                    },
                    state,
                    out,
                )?;
                None
            }
            Kind::Keep(index) => {
                self.entry(false, *index, vec![], &state.conditions, out, depth + 1)?;
                None
            }
            Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => {
                let mut args = vec![];
                for id in arguments {
                    args.push(self.expr(body, *id, state, out, depth + 1)?);
                }
                self.entry(true, *action, args, &state.conditions, out, depth + 1)?;
                None
            }
            Kind::PureCall {
                function,
                arguments,
            } => {
                let mut args = vec![];
                for id in arguments {
                    args.push(self.expr(body, *id, state, out, depth + 1)?);
                }
                let f = &self.actions.module().program().functions[*function];
                let env = f
                    .params
                    .iter()
                    .zip(args)
                    .map(|((n, t), v)| (n.clone(), (t.clone(), v)))
                    .collect();
                self.pure(&f.body, &env, &f.result, depth + 1)?
            }
            Kind::Method {
                receiver,
                arguments,
                ..
            } => {
                self.expr(body, *receiver, state, out, depth + 1)?;
                for id in arguments {
                    self.expr(body, *id, state, out, depth + 1)?;
                }
                None
            }
            Kind::Builtin { name, arguments } if name == "choose" => {
                let condition = self.expr(body, arguments[0], state, out, depth + 1)?;
                for (i, value) in [(1, true), (2, false)] {
                    if condition == Some(Symbol::Bool(!value)) {
                        continue;
                    }
                    let mut branch = state.clone();
                    if let Some(expression) = condition.clone() {
                        branch.conditions.push(Condition { expression, value });
                    }
                    self.expr(body, arguments[i], &mut branch, out, depth + 1)?;
                }
                None
            }
            Kind::Builtin { arguments, .. } => {
                for id in arguments {
                    self.expr(body, *id, state, out, depth + 1)?;
                }
                None
            }
            Kind::Lambda {
                parameter,
                body: next,
            } => {
                let mut branch = state.clone();
                branch.values[*parameter] = None;
                self.expr(body, *next, &mut branch, out, depth + 1)?;
                None
            }
            Kind::VectorField { receiver, .. } | Kind::Try { value: receiver } => {
                self.expr(body, *receiver, state, out, depth + 1)?;
                None
            }
            Kind::Float(_) | Kind::Unit | Kind::None | Kind::Enum { .. } => None,
        };
        Ok(value)
    }
    fn pure(
        &mut self,
        expr: &Expr,
        env: &BTreeMap<String, (Type, Option<Symbol>)>,
        want: &Type,
        depth: usize,
    ) -> LangResult<Option<Symbol>> {
        self.tick(depth)?;
        if depth > 32 {
            return Ok(None);
        }
        let Some(nodes) = crate::analysis::node_count(expr, 128) else {
            return Ok(None);
        };
        self.remaining = self
            .remaining
            .checked_sub(nodes)
            .ok_or("access analysis work limit")?;
        let types = env
            .iter()
            .map(|(n, (t, _))| (n.clone(), t.clone()))
            .collect();
        let p = self.actions.module().program();
        let Some(ty) = crate::check::infer_context(expr, &types, p, Some(want)).ok() else {
            return Ok(None);
        };
        Ok(match expr {
            Expr::Num(n) => Some(number(*n, &ty)),
            Expr::String(s) => Some(Symbol::String(s.clone())),
            Expr::Bool(b) => Some(Symbol::Bool(*b)),
            Expr::Var(n) => env.get(n).and_then(|(_, v)| v.clone()),
            Expr::Let(n, annotation, value, body) => {
                let value_type =
                    crate::check::infer_context(value, &types, p, annotation.as_deref())?;
                let value = self.pure(value, env, &value_type, depth + 1)?;
                let mut local = env.clone();
                local.insert(n.clone(), (value_type, value));
                self.pure(body, &local, &ty, depth + 1)?
            }
            Expr::Neg(x) => self
                .pure(x, env, &ty, depth + 1)?
                .and_then(|x| bounded(Symbol::Neg(ty, Box::new(x)))),
            Expr::Field(x, n) => {
                let Ok(receiver_type) = crate::check::infer(x, &types, p) else {
                    return Ok(None);
                };
                self.pure(x, env, &receiver_type, depth + 1)?
                    .and_then(|x| field(x, n))
            }
            Expr::Binary(op, a, b) => {
                let numeric = if ["+", "-", "*"].contains(&op.as_str()) {
                    Some(ty)
                } else {
                    None
                }
                .or_else(|| crate::check::hint(a, &types, p))
                .or_else(|| crate::check::hint(b, &types, p));
                let operand_type = crate::check::infer_context(a, &types, p, numeric.as_ref())?;
                self.pure(a, env, &operand_type, depth + 1)?
                    .zip(self.pure(b, env, &operand_type, depth + 1)?)
                    .and_then(|(a, b)| {
                        bounded(Symbol::Binary(
                            operand_type,
                            op.clone(),
                            Box::new(a),
                            Box::new(b),
                        ))
                    })
            }
            Expr::Record(name, fields) => {
                let mut xs = vec![];
                let mut known = true;
                for (n, x) in fields {
                    let field_type = &p.records[name]
                        .iter()
                        .find(|(field, _)| field == n)
                        .ok_or("access record field")?
                        .1;
                    match self.pure(x, env, field_type, depth + 1)? {
                        Some(x) => xs.push((n.clone(), x)),
                        None => known = false,
                    }
                }
                if known {
                    bounded(Symbol::Record(name.clone(), xs))
                } else {
                    None
                }
            }
            Expr::Call(name, args) => {
                if let Some(f) = self
                    .actions
                    .module()
                    .program()
                    .functions
                    .iter()
                    .find(|f| &f.name == name)
                {
                    let mut local = BTreeMap::new();
                    for ((n, t), arg) in f.params.iter().zip(args) {
                        local.insert(n.clone(), (t.clone(), self.pure(arg, env, t, depth + 1)?));
                    }
                    self.pure(&f.body, &local, &f.result, depth + 1)?
                } else {
                    None
                }
            }
            _ => None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exhausted_work_cannot_return_a_partial_access_description() {
        let module=crate::core::CheckedModule::from_source(crate::syntax::parse(
            "module limit;state Rows:Table<u64,u64>=Table.empty();query point()->Option<u64> reads(Rows){return Rows.get(0);}").unwrap()).unwrap();
        let actions = CheckedActions::elaborate(&module).unwrap();
        let mut checker = Checker {
            actions: &actions,
            remaining: 1,
            active: BTreeSet::new(),
        };
        let mut accesses = vec![];
        assert!(checker
            .entry(true, 0, vec![], &[], &mut accesses, 0)
            .unwrap_err()
            .contains("work limit"));
        assert!(accesses.is_empty());
    }
}
