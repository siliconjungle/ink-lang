//! Deterministic typed action trees. Fixed semantics, not optimisation policy.
//! Node/slot indices resolve source references; tree edges retain evaluation
//! order and lazy branches. Execution adapters reconstruct only checked trees.
use crate::{
    core::CheckedModule,
    statecheck::{self, Typing},
    syntax::*,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, sync::Arc};

pub const SEMANTICS: &str = "ink-typed-actions-v1";
pub const NUMERICAL_SEMANTICS: &str = "ink-typed-actions-v2";
const MAX_NODES: usize = 100_000;
pub type NodeId = usize;
pub type SlotId = usize;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum ExprType {
    Value(Type),
    Lambda { parameter: Type, result: Type },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Node {
    pub ty: ExprType,
    pub kind: Kind,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Kind {
    Number(u64),
    Float(u32),
    Neg {
        value: NodeId,
    },
    VectorField {
        receiver: NodeId,
        component: usize,
    },
    Bool(bool),
    String(String),
    Unit,
    None,
    Local(SlotId),
    State(usize),
    Keep(usize),
    Enum {
        name: String,
        variant: usize,
    },
    Record {
        name: String,
        fields: Vec<(usize, NodeId)>,
    },
    Field {
        record: String,
        receiver: NodeId,
        field: usize,
    },
    Binary {
        op: String,
        left: NodeId,
        right: NodeId,
    },
    And {
        left: NodeId,
        right: NodeId,
    },
    Or {
        left: NodeId,
        right: NodeId,
    },
    Try {
        value: NodeId,
    },
    Builtin {
        name: String,
        arguments: Vec<NodeId>,
    },
    PureCall {
        function: usize,
        arguments: Vec<NodeId>,
    },
    QueryCall {
        action: usize,
        arguments: Vec<NodeId>,
    },
    /// The caller exits on Err, even if it discards the returned value.
    ChangeCall {
        action: usize,
        arguments: Vec<NodeId>,
    },
    Table {
        root: usize,
        method: String,
        arguments: Vec<NodeId>,
    },
    Method {
        receiver: NodeId,
        method: String,
        arguments: Vec<NodeId>,
    },
    Lambda {
        parameter: SlotId,
        body: NodeId,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Slot {
    pub name: String,
    pub ty: Type,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Instruction {
    Let {
        slot: SlotId,
        value: NodeId,
        annotated: bool,
    },
    Return(NodeId),
    Eval(NodeId),
    Emit {
        channel: String,
        value: NodeId,
    },
    If {
        condition: NodeId,
        on_true: Vec<Instruction>,
        on_false: Vec<Instruction>,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Body {
    pub slots: Vec<Slot>,
    pub nodes: Vec<Node>,
    pub instructions: Vec<Instruction>,
    pub value: Option<NodeId>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Wire {
    schema: u32,
    semantics: String,
    source: String,
    actions: Vec<Body>,
    keeps: Vec<Body>,
}

/// This witness can only be elaborated from the complete checked source or
/// re-admitted by comparing an untrusted artifact with that elaboration.
pub struct CheckedActions {
    module: CheckedModule,
    wire: Wire,
}

/// Frozen execution trees and their resolved judgments. Addresses are private
/// transient lookup keys, never serialised, hashed or accepted as evidence.
pub struct Execution {
    actions: Vec<Arc<Action>>,
    keeps: Vec<Arc<BindingDecl>>,
    types: BTreeMap<usize, Type>,
}
impl Execution {
    pub fn actions(&self) -> &[Arc<Action>] {
        &self.actions
    }
    pub fn keeps(&self) -> &[Arc<BindingDecl>] {
        &self.keeps
    }
    pub fn type_of(&self, expression: &Expr) -> Option<&Type> {
        self.types.get(&(expression as *const Expr as usize))
    }
}
impl CheckedActions {
    pub fn elaborate(module: &CheckedModule) -> LangResult<Self> {
        let p = module.program();
        let mut remaining = MAX_NODES;
        let mut actions = vec![];
        for action in &p.actions {
            let typing = statecheck::action_typing(p, action)?;
            let mut lower = Lower::new(p, &typing, &mut remaining);
            let mut env = BTreeMap::new();
            for (name, ty) in &action.params {
                let slot = lower.slot(name, ty.clone());
                env.insert(name.clone(), slot);
            }
            lower.body.instructions = lower.block(&action.body, &mut env)?;
            lower.body.resolve_types(p, Some(&action.result))?;
            actions.push(lower.body);
        }
        let mut keeps = vec![];
        for keep in &p.keeps {
            let typing = statecheck::keep_typing(p, keep)?;
            let mut lower = Lower::new(p, &typing, &mut remaining);
            lower.body.value = Some(lower.expr(&keep.value, Some(&keep.ty), &BTreeMap::new())?);
            lower.body.resolve_types(p, Some(&keep.ty))?;
            keeps.push(lower.body);
        }
        let numerical = numerical_domain(p, &actions, &keeps);
        let out = Self {
            module: module.clone(),
            wire: Wire {
                schema: 1,
                semantics: if numerical {
                    NUMERICAL_SEMANTICS
                } else {
                    SEMANTICS
                }
                .into(),
                source: module.identity()?,
                actions,
                keeps,
            },
        };
        // Exact source reconstruction is an admission invariant, including
        // scopes, record field order, original annotations and unreachable code.
        let mut rebuilt = p.clone();
        rebuilt.actions = out.actions(false)?;
        rebuilt.keeps = out.keeps()?;
        if serde_json::to_vec(&rebuilt).map_err(|e| e.to_string())?
            != serde_json::to_vec(p).map_err(|e| e.to_string())?
        {
            return Err("action IR source reconstruction mismatch".into());
        }
        out.bytes()?;
        Ok(out)
    }
    pub fn from_bytes(module: &CheckedModule, bytes: &[u8]) -> LangResult<Self> {
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("action IR byte limit".into());
        }
        let supplied: Wire =
            serde_json::from_slice(bytes).map_err(|e| format!("invalid action IR: {e}"))?;
        let checked = Self::elaborate(module)?;
        if serde_json::to_vec(&supplied).map_err(|e| e.to_string())? != checked.bytes()? {
            return Err("action IR does not describe the checked source".into());
        }
        Ok(checked)
    }
    pub fn bytes(&self) -> LangResult<Vec<u8>> {
        let bytes = serde_json::to_vec(&self.wire).map_err(|e| e.to_string())?;
        if bytes.len() > crate::core::MAX_BYTES {
            return Err("action IR byte limit".into());
        }
        Ok(bytes)
    }
    pub fn module(&self) -> &CheckedModule {
        &self.module
    }
    pub fn source_identity(&self) -> &str {
        &self.wire.source
    }
    pub fn identity(&self) -> LangResult<String> {
        use sha2::{Digest, Sha256};
        Ok(format!("{:x}", Sha256::digest(self.bytes()?)))
    }
    pub fn action(&self, index: usize) -> Option<&Body> {
        self.wire.actions.get(index)
    }
    pub fn keep(&self, index: usize) -> Option<&Body> {
        self.wire.keeps.get(index)
    }
    pub fn execution_actions(&self) -> LangResult<Vec<Action>> {
        self.actions(true)
    }
    pub fn execution_keeps(&self) -> LangResult<Vec<BindingDecl>> {
        self.keeps()
    }
    pub fn execution(&self) -> LangResult<Execution> {
        let actions = self
            .execution_actions()?
            .into_iter()
            .map(Arc::new)
            .collect::<Vec<_>>();
        let keeps = self
            .execution_keeps()?
            .into_iter()
            .map(Arc::new)
            .collect::<Vec<_>>();
        let mut types = BTreeMap::new();
        for (action, body) in actions.iter().zip(&self.wire.actions) {
            body.bind_block(&body.instructions, &action.body, &mut types)?;
        }
        for (keep, body) in keeps.iter().zip(&self.wire.keeps) {
            body.bind_expr(body.value.ok_or("keep root")?, &keep.value, &mut types)?;
        }
        Ok(Execution {
            actions,
            keeps,
            types,
        })
    }
    fn actions(&self, typed: bool) -> LangResult<Vec<Action>> {
        self.module
            .program()
            .actions
            .iter()
            .zip(&self.wire.actions)
            .map(|(source, body)| {
                let mut action = source.clone();
                action.body =
                    body.block_source(self.module.program(), &body.instructions, typed)?;
                Ok(action)
            })
            .collect()
    }
    fn keeps(&self) -> LangResult<Vec<BindingDecl>> {
        self.module
            .program()
            .keeps
            .iter()
            .zip(&self.wire.keeps)
            .map(|(source, body)| {
                let mut keep = source.clone();
                keep.value = body.expr_source(
                    self.module.program(),
                    body.value.ok_or("missing keep root")?,
                )?;
                Ok(keep)
            })
            .collect()
    }
}

fn numerical_domain(p: &Program, actions: &[Body], keeps: &[Body]) -> bool {
    fn numerical(t: &Type, p: &Program, seen: &mut std::collections::BTreeSet<String>) -> bool {
        match t {
            Type::I32 | Type::F32 | Type::Vector(..) => true,
            Type::List(t) | Type::Option(t) => numerical(t, p, seen),
            Type::Table(a, b) | Type::Result(a, b) => {
                numerical(a, p, seen) || numerical(b, p, seen)
            }
            Type::Named(n) if seen.insert(n.clone()) => p
                .records
                .get(n)
                .is_some_and(|fs| fs.iter().any(|(_, t)| numerical(t, p, seen))),
            _ => false,
        }
    }
    let has = |t: &Type| numerical(t, p, &mut std::collections::BTreeSet::new());
    p.states.iter().chain(&p.keeps).any(|x| has(&x.ty))
        || p.events.values().any(has)
        || p.actions
            .iter()
            .any(|a| has(&a.result) || a.params.iter().any(|(_, t)| has(t)))
        || actions.iter().chain(keeps).any(|b| {
            b.nodes.iter().any(|n| {
                matches!(
                    n.kind,
                    Kind::Float(_) | Kind::Neg { .. } | Kind::VectorField { .. }
                ) || match &n.ty {
                    ExprType::Value(t) => has(t),
                    ExprType::Lambda { parameter, result } => has(parameter) || has(result),
                }
            })
        })
}

// Unknowns arise only in absent constructor branches. Instantiate those
// phantom sorts from the surrounding context. The subsequent general
// unifier connects slots, payloads and callback signatures before defaulting
// genuinely unconstrained phantom sorts. No inhabited numeric value is Unit.
fn complete(ty: &Type, want: Option<&Type>) -> Type {
    match (ty, want) {
        (Type::Unknown, Some(t)) => complete(t, None),
        (Type::Unknown, None) => Type::Unknown,
        (Type::List(t), Some(Type::List(w))) => Type::List(Box::new(complete(t, Some(w)))),
        (Type::Option(t), Some(Type::Option(w))) => Type::Option(Box::new(complete(t, Some(w)))),
        (Type::Result(a, b), Some(Type::Result(x, y))) => Type::Result(
            Box::new(complete(a, Some(x))),
            Box::new(complete(b, Some(y))),
        ),
        (Type::List(t), _) => Type::List(Box::new(complete(t, None))),
        (Type::Option(t), _) => Type::Option(Box::new(complete(t, None))),
        (Type::Result(a, b), _) => {
            Type::Result(Box::new(complete(a, None)), Box::new(complete(b, None)))
        }
        _ => ty.clone(),
    }
}
struct Lower<'a> {
    p: &'a Program,
    typing: &'a Typing,
    remaining: &'a mut usize,
    body: Body,
}
impl<'a> Lower<'a> {
    fn new(p: &'a Program, typing: &'a Typing, remaining: &'a mut usize) -> Self {
        Self {
            p,
            typing,
            remaining,
            body: Body {
                slots: vec![],
                nodes: vec![],
                instructions: vec![],
                value: None,
            },
        }
    }
    fn slot(&mut self, name: &str, ty: Type) -> SlotId {
        let i = self.body.slots.len();
        self.body.slots.push(Slot {
            name: name.into(),
            ty,
        });
        i
    }
    fn value_type(&self, e: &Expr, want: Option<&Type>) -> LangResult<Type> {
        let ty = self
            .typing
            .values
            .get(&(e as *const Expr as usize))
            .ok_or("missing expression typing")?;
        Ok(complete(ty, want))
    }
    fn expr(
        &mut self,
        e: &Expr,
        want: Option<&Type>,
        env: &BTreeMap<String, SlotId>,
    ) -> LangResult<NodeId> {
        if *self.remaining == 0 {
            return Err("action IR node budget".into());
        }
        *self.remaining -= 1;
        let (ty, kind) = if let Expr::Lambda(name, body) = e {
            let (parameter, result) = self
                .typing
                .lambdas
                .get(&(e as *const Expr as usize))
                .ok_or("missing lambda typing")?;
            let parameter = complete(parameter, None);
            let result = complete(result, want);
            let slot = self.slot(name, parameter.clone());
            let mut local = env.clone();
            local.insert(name.clone(), slot);
            let body = self.expr(body, Some(&result), &local)?;
            (
                ExprType::Lambda { parameter, result },
                Kind::Lambda {
                    parameter: slot,
                    body,
                },
            )
        } else {
            let ty = self.value_type(e, want)?;
            let kind = match e {
                Expr::Num(n) => Kind::Number(*n),
                Expr::Float(bits) => Kind::Float(*bits),
                Expr::Neg(value) => Kind::Neg {
                    value: self.expr(value, Some(&ty), env)?,
                },
                Expr::Bool(b) => Kind::Bool(*b),
                Expr::String(s) => Kind::String(s.clone()),
                Expr::Unit => Kind::Unit,
                Expr::Var(n) => {
                    if let Some(slot) = env.get(n) {
                        Kind::Local(*slot)
                    } else if n == "None" {
                        Kind::None
                    } else if let Some(i) = self.p.keeps.iter().position(|k| &k.name == n) {
                        Kind::Keep(i)
                    } else if let Some(i) = self.p.states.iter().position(|s| &s.name == n) {
                        Kind::State(i)
                    } else {
                        return Err("unresolved action name".into());
                    }
                }
                Expr::Record(name, fields) => {
                    let decl = &self.p.records[name];
                    let mut out = vec![];
                    for (name, e) in fields {
                        let index = decl
                            .iter()
                            .position(|(n, _)| n == name)
                            .ok_or("unknown field")?;
                        out.push((index, self.expr(e, Some(&decl[index].1), env)?));
                    }
                    Kind::Record {
                        name: name.clone(),
                        fields: out,
                    }
                }
                Expr::Field(receiver, name) => {
                    if let Expr::Var(en) = receiver.as_ref() {
                        if let Some(variants) = self.p.enums.get(en) {
                            let variant = variants
                                .iter()
                                .position(|v| v == name)
                                .ok_or("unknown enum variant")?;
                            let id = self.body.nodes.len();
                            self.body.nodes.push(Node {
                                ty: ExprType::Value(ty),
                                kind: Kind::Enum {
                                    name: en.clone(),
                                    variant,
                                },
                            });
                            return Ok(id);
                        }
                    }
                    let receiver_type = self.value_type(receiver, None)?;
                    if let Type::Vector(_, _) = receiver_type {
                        let component = ["x", "y", "z", "w"]
                            .iter()
                            .position(|x| *x == name)
                            .ok_or("vector component")?;
                        let receiver = self.expr(receiver, None, env)?;
                        let id = self.body.nodes.len();
                        self.body.nodes.push(Node {
                            ty: ExprType::Value(ty),
                            kind: Kind::VectorField {
                                receiver,
                                component,
                            },
                        });
                        return Ok(id);
                    }
                    let Type::Named(record) = receiver_type else {
                        return Err("field receiver type".into());
                    };
                    let field = self.p.records[&record]
                        .iter()
                        .position(|(f, _)| f == name)
                        .ok_or("field index")?;
                    Kind::Field {
                        record,
                        receiver: self.expr(receiver, None, env)?,
                        field,
                    }
                }
                Expr::Try(value) => Kind::Try {
                    value: self.expr(value, None, env)?,
                },
                Expr::Binary(op, a, b) => {
                    let left = self.expr(a, None, env)?;
                    let right = self.expr(b, None, env)?;
                    match op.as_str() {
                        "&&" => Kind::And { left, right },
                        "||" => Kind::Or { left, right },
                        _ => Kind::Binary {
                            op: op.clone(),
                            left,
                            right,
                        },
                    }
                }
                Expr::Call(name, args) => {
                    let target =
                        if let Some(i) = self.p.actions.iter().position(|a| &a.name == name) {
                            Some((true, i))
                        } else {
                            self.p
                                .functions
                                .iter()
                                .position(|f| &f.name == name)
                                .map(|i| (false, i))
                        };
                    let mut arguments = vec![];
                    for (index, arg) in args.iter().enumerate() {
                        let expected = match target {
                            Some((true, i)) => Some(&self.p.actions[i].params[index].1),
                            Some((false, i)) => Some(&self.p.functions[i].params[index].1),
                            None => match (name.as_str(), &ty) {
                                ("Ok", Type::Result(a, _))
                                | ("Err", Type::Result(_, a))
                                | ("Some", Type::Option(a)) => Some(a.as_ref()),
                                _ => None,
                            },
                        };
                        arguments.push(self.expr(arg, expected, env)?);
                    }
                    match target {
                        Some((true, i)) if self.p.actions[i].kind == ActionKind::Change => {
                            Kind::ChangeCall {
                                action: i,
                                arguments,
                            }
                        }
                        Some((true, i)) => Kind::QueryCall {
                            action: i,
                            arguments,
                        },
                        Some((false, i)) => Kind::PureCall {
                            function: i,
                            arguments,
                        },
                        None => Kind::Builtin {
                            name: name.clone(),
                            arguments,
                        },
                    }
                }
                Expr::Method(receiver, method, args) => {
                    let receiver_ty = self.value_type(receiver, None)?;
                    let table = if let Expr::Var(name) = receiver.as_ref() {
                        (!env.contains_key(name))
                            .then(|| self.p.states.iter().position(|s| &s.name == name))
                            .flatten()
                    } else {
                        None
                    };
                    let receiver_node = if table.is_none() {
                        Some(self.expr(receiver, None, env)?)
                    } else {
                        None
                    };
                    let mut arguments = vec![];
                    for (i, arg) in args.iter().enumerate() {
                        let expected = if table.is_some() {
                            match &receiver_ty {
                                Type::Table(k, v) => {
                                    Some(if i == 0 { k.as_ref() } else { v.as_ref() })
                                }
                                _ => None,
                            }
                        } else if matches!(arg, Expr::Lambda(..)) {
                            match (&ty, method.as_str()) {
                                (Type::List(t), "map")
                                | (Type::Option(t), "map")
                                | (Type::Result(t, _), "map") => Some(t.as_ref()),
                                (Type::Result(_, t), "map_err") => Some(t.as_ref()),
                                (_, "filter") => Some(&Type::Bool),
                                _ => None,
                            }
                        } else {
                            None
                        };
                        arguments.push(self.expr(arg, expected, env)?);
                    }
                    if let Some(root) = table {
                        Kind::Table {
                            root,
                            method: method.clone(),
                            arguments,
                        }
                    } else {
                        Kind::Method {
                            receiver: receiver_node.unwrap(),
                            method: method.clone(),
                            arguments,
                        }
                    }
                }
                _ => return Err("compute expression in action IR".into()),
            };
            (ExprType::Value(ty), kind)
        };
        let id = self.body.nodes.len();
        self.body.nodes.push(Node { ty, kind });
        Ok(id)
    }
    fn block(
        &mut self,
        statements: &[Statement],
        env: &mut BTreeMap<String, SlotId>,
    ) -> LangResult<Vec<Instruction>> {
        let mut out = vec![];
        for stmt in statements {
            if *self.remaining == 0 {
                return Err("action IR instruction budget".into());
            }
            *self.remaining -= 1;
            out.push(match stmt {
                Statement::Let(name, annotation, e) => {
                    let value = self.expr(e, annotation.as_ref(), env)?;
                    let ExprType::Value(ty) = &self.body.nodes[value].ty else {
                        return Err("lambda binding type".into());
                    };
                    let slot = self.slot(name, ty.clone());
                    env.insert(name.clone(), slot);
                    Instruction::Let {
                        slot,
                        value,
                        annotated: annotation.is_some(),
                    }
                }
                Statement::Return(e) => Instruction::Return(self.expr(e, None, env)?),
                Statement::Expr(e) => Instruction::Eval(self.expr(e, None, env)?),
                Statement::Emit(channel, e) => Instruction::Emit {
                    channel: channel.clone(),
                    value: self.expr(e, Some(&self.p.events[channel]), env)?,
                },
                Statement::If(e, yes, no) => Instruction::If {
                    condition: self.expr(e, Some(&Type::Bool), env)?,
                    on_true: self.block(yes, &mut env.clone())?,
                    on_false: self.block(no, &mut env.clone())?,
                },
            });
        }
        Ok(out)
    }
}

impl Body {
    fn bind_expr(&self, id: NodeId, e: &Expr, types: &mut BTreeMap<usize, Type>) -> LangResult<()> {
        let node = &self.nodes[id];
        if let ExprType::Value(ty) = &node.ty {
            types.insert(e as *const Expr as usize, ty.clone());
        }
        let mut children = vec![];
        match (&node.kind, e) {
            (Kind::Record { fields, .. }, Expr::Record(_, source)) => {
                children.extend(fields.iter().zip(source).map(|((_, id), (_, e))| (*id, e)))
            }
            (
                Kind::Field { receiver, .. } | Kind::VectorField { receiver, .. },
                Expr::Field(e, _),
            ) => children.push((*receiver, e.as_ref())),
            (
                Kind::Binary { left, right, .. }
                | Kind::And { left, right }
                | Kind::Or { left, right },
                Expr::Binary(_, a, b),
            ) => children.extend([(*left, a.as_ref()), (*right, b.as_ref())]),
            (Kind::Try { value }, Expr::Try(e)) => children.push((*value, e.as_ref())),
            (Kind::Neg { value }, Expr::Neg(e)) => children.push((*value, e.as_ref())),
            (
                Kind::Builtin { arguments, .. }
                | Kind::PureCall { arguments, .. }
                | Kind::QueryCall { arguments, .. }
                | Kind::ChangeCall { arguments, .. },
                Expr::Call(_, args),
            ) => children.extend(arguments.iter().copied().zip(args)),
            (Kind::Table { arguments, .. }, Expr::Method(_, _, args)) => {
                children.extend(arguments.iter().copied().zip(args))
            }
            (
                Kind::Method {
                    receiver,
                    arguments,
                    ..
                },
                Expr::Method(e, _, args),
            ) => {
                children.push((*receiver, e.as_ref()));
                children.extend(arguments.iter().copied().zip(args));
            }
            (Kind::Lambda { body, .. }, Expr::Lambda(_, e)) => children.push((*body, e.as_ref())),
            _ => (),
        }
        for (id, e) in children {
            self.bind_expr(id, e, types)?;
        }
        Ok(())
    }
    fn bind_block(
        &self,
        instructions: &[Instruction],
        statements: &[Statement],
        types: &mut BTreeMap<usize, Type>,
    ) -> LangResult<()> {
        for (step, stmt) in instructions.iter().zip(statements) {
            match (step, stmt) {
                (Instruction::Let { value, .. }, Statement::Let(_, _, e))
                | (Instruction::Return(value), Statement::Return(e))
                | (Instruction::Eval(value), Statement::Expr(e))
                | (Instruction::Emit { value, .. }, Statement::Emit(_, e)) => {
                    self.bind_expr(*value, e, types)?
                }
                (
                    Instruction::If {
                        condition,
                        on_true,
                        on_false,
                    },
                    Statement::If(e, yes, no),
                ) => {
                    self.bind_expr(*condition, e, types)?;
                    self.bind_block(on_true, yes, types)?;
                    self.bind_block(on_false, no, types)?;
                }
                _ => return Err("action execution tree mismatch".into()),
            }
        }
        Ok(())
    }
    fn resolve_types(&mut self, p: &Program, result: Option<&Type>) -> LangResult<()> {
        use crate::action_types::{Solver, Ty};
        let mut solver = Solver::new();
        let slots = self
            .slots
            .iter()
            .map(|s| solver.ty(&s.ty))
            .collect::<Vec<_>>();
        let mut values = vec![];
        let mut lambdas = vec![];
        for node in &self.nodes {
            match &node.ty {
                ExprType::Value(t) => {
                    values.push(Some(solver.ty(t)));
                    lambdas.push(None)
                }
                ExprType::Lambda { parameter, result } => {
                    values.push(None);
                    lambdas.push(Some((solver.ty(parameter), solver.ty(result))))
                }
            }
        }
        let val = |id: usize| {
            values
                .get(id)
                .and_then(Clone::clone)
                .ok_or_else(|| "expected value node".to_string())
        };
        let error = match result {
            Some(Type::Result(_, e)) => Some(solver.ty(e)),
            _ => None,
        };
        for (id, node) in self.nodes.iter().enumerate() {
            let out = || val(id);
            match &node.kind {
                Kind::Local(slot) => solver.unify(out()?, slots[*slot].clone())?,
                Kind::Bool(_) => solver.unify(out()?, Ty::Atom(Type::Bool))?,
                Kind::Float(_) => solver.unify(out()?, Ty::Atom(Type::F32))?,
                Kind::Neg { value } => solver.unify(out()?, val(*value)?)?,
                Kind::String(_) => solver.unify(out()?, Ty::Atom(Type::String))?,
                Kind::Unit => solver.unify(out()?, Ty::Atom(Type::Unit))?,
                Kind::None => {
                    let phantom = solver.fresh();
                    solver.unify(out()?, Ty::App(1, vec![phantom]))?;
                }
                Kind::Lambda { parameter, body } => {
                    let (a, b) = lambdas[id].clone().ok_or("lambda node type")?;
                    solver.unify(a, slots[*parameter].clone())?;
                    solver.unify(b, val(*body)?)?;
                }
                Kind::Binary { op, left, right } => {
                    solver.unify(val(*left)?, val(*right)?)?;
                    if ["+", "-", "*"].contains(&op.as_str()) {
                        solver.unify(out()?, val(*left)?)?;
                    } else {
                        solver.unify(out()?, Ty::Atom(Type::Bool))?;
                    }
                }
                Kind::And { left, right } | Kind::Or { left, right } => {
                    for t in [out()?, val(*left)?, val(*right)?] {
                        solver.unify(t, Ty::Atom(Type::Bool))?;
                    }
                }
                Kind::Try { value } => {
                    solver.unify(
                        val(*value)?,
                        Ty::App(
                            2,
                            vec![out()?, error.clone().ok_or("Try without error type")?],
                        ),
                    )?;
                }
                Kind::Record { name, fields } => {
                    for (field, value) in fields {
                        let ty = solver.ty(&p.records[name][*field].1);
                        solver.unify(val(*value)?, ty)?;
                    }
                }
                Kind::Field { record, field, .. } => {
                    let ty = solver.ty(&p.records[record][*field].1);
                    solver.unify(out()?, ty)?;
                }
                Kind::PureCall {
                    function,
                    arguments,
                } => {
                    for (value, (_, t)) in arguments.iter().zip(&p.functions[*function].params) {
                        let t = solver.ty(t);
                        solver.unify(val(*value)?, t)?;
                    }
                }
                Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => {
                    for (value, (_, t)) in arguments.iter().zip(&p.actions[*action].params) {
                        let t = solver.ty(t);
                        solver.unify(val(*value)?, t)?;
                    }
                }
                Kind::Table {
                    root, arguments, ..
                } => {
                    let Type::Table(k, v) = &p.states[*root].ty else {
                        return Err("table type".into());
                    };
                    for (i, value) in arguments.iter().enumerate() {
                        let t = solver.ty(if i == 0 { k } else { v });
                        solver.unify(val(*value)?, t)?;
                    }
                }
                Kind::Builtin { name, arguments } => match name.as_str() {
                    "Some" => solver.unify(out()?, Ty::App(1, vec![val(arguments[0])?]))?,
                    "Ok" | "Err" => {
                        let phantom = solver.fresh();
                        let payload = val(arguments[0])?;
                        solver.unify(
                            out()?,
                            Ty::App(
                                2,
                                if name == "Ok" {
                                    vec![payload, phantom]
                                } else {
                                    vec![phantom, payload]
                                },
                            ),
                        )?;
                    }
                    "sum" => solver.unify(val(arguments[0])?, Ty::App(0, vec![out()?]))?,
                    "checked_add" | "checked_sub" | "checked_mul" => {
                        let member = solver.fresh();
                        solver.unify(
                            out()?,
                            Ty::App(
                                2,
                                vec![
                                    member.clone(),
                                    Ty::Atom(Type::Named("ArithmeticError".into())),
                                ],
                            ),
                        )?;
                        for value in arguments {
                            solver.unify(val(*value)?, member.clone())?;
                        }
                    }
                    _ => (),
                },
                Kind::Method {
                    receiver,
                    method,
                    arguments,
                } => {
                    if method == "ok_or" {
                        let member = solver.fresh();
                        solver.unify(val(*receiver)?, Ty::App(1, vec![member.clone()]))?;
                        solver.unify(out()?, Ty::App(2, vec![member, val(arguments[0])?]))?;
                    } else {
                        let (parameter, body) = lambdas[arguments[0]]
                            .clone()
                            .ok_or("method requires callback")?;
                        let ExprType::Value(receiver_type) = &self.nodes[*receiver].ty else {
                            return Err("receiver type".into());
                        };
                        match (receiver_type, method.as_str()) {
                            (Type::List(_), "map" | "filter") => {
                                solver
                                    .unify(val(*receiver)?, Ty::App(0, vec![parameter.clone()]))?;
                                if method == "filter" {
                                    solver.unify(body, Ty::Atom(Type::Bool))?;
                                    solver.unify(out()?, val(*receiver)?)?;
                                } else {
                                    solver.unify(out()?, Ty::App(0, vec![body]))?;
                                }
                            }
                            (Type::Option(_), "map") => {
                                solver.unify(val(*receiver)?, Ty::App(1, vec![parameter]))?;
                                solver.unify(out()?, Ty::App(1, vec![body]))?;
                            }
                            (Type::Result(..), "map" | "map_err") => {
                                let untouched = solver.fresh();
                                let (before, after) = if method == "map" {
                                    (vec![parameter, untouched.clone()], vec![body, untouched])
                                } else {
                                    (vec![untouched.clone(), parameter], vec![untouched, body])
                                };
                                solver.unify(val(*receiver)?, Ty::App(2, before))?;
                                solver.unify(out()?, Ty::App(2, after))?;
                            }
                            _ => return Err("callback method type".into()),
                        }
                    }
                }
                _ => (),
            }
        }
        // Number defaults follow all contextual constraints, not precede them.
        for (id, node) in self.nodes.iter().enumerate() {
            if matches!(node.kind, Kind::Number(_)) {
                solver.default_numeric(val(id)?)?;
            }
        }
        for (slot, ty) in self.slots.iter_mut().zip(slots) {
            slot.ty = solver.finish(ty, 0)?;
        }
        for (id, node) in self.nodes.iter_mut().enumerate() {
            node.ty = if let Some(value) = &values[id] {
                ExprType::Value(solver.finish(value.clone(), 0)?)
            } else {
                let (parameter, result) = lambdas[id].clone().ok_or("lambda signature")?;
                ExprType::Lambda {
                    parameter: solver.finish(parameter, 0)?,
                    result: solver.finish(result, 0)?,
                }
            };
            if let Kind::Number(n) = node.kind {
                match &node.ty {
                    ExprType::Value(Type::U32) if n <= u32::MAX as u64 => (),
                    ExprType::Value(Type::U64 | Type::Int) => (),
                    ExprType::Value(Type::I32) if n <= 2147483648 => (),
                    ExprType::Value(Type::F32) if (n as f32) as u128 == n as u128 => (),
                    _ => return Err("invalid numeric action type".into()),
                }
            }
        }
        Ok(())
    }
    fn expr_source(&self, p: &Program, id: NodeId) -> LangResult<Expr> {
        self.expression(p, id, &BTreeMap::new())
    }
    pub(crate) fn expression(
        &self,
        p: &Program,
        id: NodeId,
        replacements: &BTreeMap<NodeId, Expr>,
    ) -> LangResult<Expr> {
        if let Some(e) = replacements.get(&id) {
            return Ok(e.clone());
        }
        let node = self.nodes.get(id).ok_or("action IR node reference")?;
        let args = |xs: &[NodeId]| {
            xs.iter()
                .map(|&i| self.expression(p, i, replacements))
                .collect::<LangResult<Vec<_>>>()
        };
        Ok(match &node.kind {
            Kind::Number(n) => Expr::Num(*n),
            Kind::Float(bits) => Expr::Float(*bits),
            Kind::Neg { value } => Expr::Neg(Box::new(self.expression(p, *value, replacements)?)),
            Kind::VectorField {
                receiver,
                component,
            } => Expr::Field(
                Box::new(self.expression(p, *receiver, replacements)?),
                ["x", "y", "z", "w"][*component].into(),
            ),
            Kind::Bool(b) => Expr::Bool(*b),
            Kind::String(s) => Expr::String(s.clone()),
            Kind::Unit => Expr::Unit,
            Kind::None => Expr::Var("None".into()),
            Kind::Local(i) => Expr::Var(self.slots[*i].name.clone()),
            Kind::State(i) => Expr::Var(p.states[*i].name.clone()),
            Kind::Keep(i) => Expr::Var(p.keeps[*i].name.clone()),
            Kind::Enum { name, variant } => Expr::Field(
                Box::new(Expr::Var(name.clone())),
                p.enums[name][*variant].clone(),
            ),
            Kind::Record { name, fields } => Expr::Record(
                name.clone(),
                fields
                    .iter()
                    .map(|(i, n)| {
                        Ok((
                            p.records[name][*i].0.clone(),
                            self.expression(p, *n, replacements)?,
                        ))
                    })
                    .collect::<LangResult<_>>()?,
            ),
            Kind::Field {
                record,
                receiver,
                field,
            } => Expr::Field(
                Box::new(self.expression(p, *receiver, replacements)?),
                p.records[record][*field].0.clone(),
            ),
            Kind::Binary { op, left, right } => Expr::Binary(
                op.clone(),
                Box::new(self.expression(p, *left, replacements)?),
                Box::new(self.expression(p, *right, replacements)?),
            ),
            Kind::And { left, right } => Expr::Binary(
                "&&".into(),
                Box::new(self.expression(p, *left, replacements)?),
                Box::new(self.expression(p, *right, replacements)?),
            ),
            Kind::Or { left, right } => Expr::Binary(
                "||".into(),
                Box::new(self.expression(p, *left, replacements)?),
                Box::new(self.expression(p, *right, replacements)?),
            ),
            Kind::Try { value } => Expr::Try(Box::new(self.expression(p, *value, replacements)?)),
            Kind::Builtin { name, arguments } => Expr::Call(name.clone(), args(arguments)?),
            Kind::PureCall {
                function,
                arguments,
            } => Expr::Call(p.functions[*function].name.clone(), args(arguments)?),
            Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => {
                Expr::Call(p.actions[*action].name.clone(), args(arguments)?)
            }
            Kind::Table {
                root,
                method,
                arguments,
            } => Expr::Method(
                Box::new(Expr::Var(p.states[*root].name.clone())),
                method.clone(),
                args(arguments)?,
            ),
            Kind::Method {
                receiver,
                method,
                arguments,
            } => Expr::Method(
                Box::new(self.expression(p, *receiver, replacements)?),
                method.clone(),
                args(arguments)?,
            ),
            Kind::Lambda { parameter, body } => Expr::Lambda(
                self.slots[*parameter].name.clone(),
                Box::new(self.expression(p, *body, replacements)?),
            ),
        })
    }
    fn block_source(
        &self,
        p: &Program,
        instructions: &[Instruction],
        typed: bool,
    ) -> LangResult<Vec<Statement>> {
        self.rebuild(p, instructions, typed, &BTreeMap::new())
    }
    pub(crate) fn rebuild(
        &self,
        p: &Program,
        instructions: &[Instruction],
        typed: bool,
        replacements: &BTreeMap<NodeId, Expr>,
    ) -> LangResult<Vec<Statement>> {
        instructions
            .iter()
            .map(|s| {
                Ok(match s {
                    Instruction::Let {
                        slot,
                        value,
                        annotated,
                    } => Statement::Let(
                        self.slots[*slot].name.clone(),
                        (typed || *annotated).then(|| self.slots[*slot].ty.clone()),
                        self.expression(p, *value, replacements)?,
                    ),
                    Instruction::Return(value) => {
                        Statement::Return(self.expression(p, *value, replacements)?)
                    }
                    Instruction::Eval(value) => {
                        Statement::Expr(self.expression(p, *value, replacements)?)
                    }
                    Instruction::Emit { channel, value } => {
                        Statement::Emit(channel.clone(), self.expression(p, *value, replacements)?)
                    }
                    Instruction::If {
                        condition,
                        on_true,
                        on_false,
                    } => Statement::If(
                        self.expression(p, *condition, replacements)?,
                        self.rebuild(p, on_true, typed, replacements)?,
                        self.rebuild(p, on_false, typed, replacements)?,
                    ),
                })
            })
            .collect()
    }
}
