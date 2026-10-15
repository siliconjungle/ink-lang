//! Predicates at exact checked expression sites. No supplied transition, effect
//! summary, theorem name, or catalogue entry determines their meaning.
use super::*;

/// Check a readonly Bool query after this expression produces a value. Its
/// parameters are the selected lexical slots followed by the expression value.
/// An exit before the site is vacuous; a false observation remains false even
/// when a later transaction aborts. Nodes are from CheckedActions elaboration.
#[derive(Clone, Debug)]
pub struct ValueObservation {
    pub action: String,
    pub node: NodeId,
    pub predicate: String,
    pub slots: Vec<usize>,
}
/// Check after all arguments have evaluated, immediately before invocation.
/// Predicate parameters are selected lexical slots followed by actual arguments.
#[derive(Clone, Debug)]
pub struct CallObservation {
    pub action: String,
    pub node: NodeId,
    pub predicate: String,
    pub slots: Vec<usize>,
}
/// Check immediately before evaluating an expression. Predicate parameters are
/// selected lexical slots; state is observed at the entry to the expression.
#[derive(Clone, Debug)]
pub struct EntryObservation {
    pub action: String,
    pub node: NodeId,
    pub predicate: String,
    pub slots: Vec<usize>,
}
#[derive(Clone, Debug)]
pub enum SiteObservation {
    Value(ValueObservation),
    Call(CallObservation),
    Entry(EntryObservation),
}
impl SiteObservation {
    pub(super) fn action(&self) -> &str {
        match self {
            Self::Value(v) => &v.action,
            Self::Call(v) => &v.action,
            Self::Entry(v) => &v.action,
        }
    }
    pub(super) fn node(&self) -> NodeId {
        match self {
            Self::Value(v) => v.node,
            Self::Call(v) => v.node,
            Self::Entry(v) => v.node,
        }
    }
    pub(super) fn predicate(&self) -> &str {
        match self {
            Self::Value(v) => &v.predicate,
            Self::Call(v) => &v.predicate,
            Self::Entry(v) => &v.predicate,
        }
    }
    pub(super) fn slots(&self) -> &[usize] {
        match self {
            Self::Value(v) => &v.slots,
            Self::Call(v) => &v.slots,
            Self::Entry(v) => &v.slots,
        }
    }
}
#[derive(Clone, Debug)]
pub struct ObservationFunction {
    pub function: String,
    pub params: Vec<(String, Sort)>,
}

pub(super) fn children(kind: &Kind) -> Vec<NodeId> {
    match kind {
        Kind::Bind { value, body, .. } => vec![*value, *body],
        Kind::Record { fields, .. } => fields.iter().map(|(_, n)| *n).collect(),
        Kind::Field { receiver, .. }
        | Kind::VectorField { receiver, .. }
        | Kind::Neg { value: receiver } => vec![*receiver],
        Kind::Binary { left, right, .. } | Kind::And { left, right } | Kind::Or { left, right } => {
            vec![*left, *right]
        }
        Kind::Try { value } => vec![*value],
        Kind::Builtin { arguments, .. }
        | Kind::PureCall { arguments, .. }
        | Kind::QueryCall { arguments, .. }
        | Kind::ChangeCall { arguments, .. }
        | Kind::Table { arguments, .. } => arguments.clone(),
        Kind::Method {
            receiver,
            arguments,
            ..
        } => std::iter::once(*receiver)
            .chain(arguments.iter().copied())
            .collect(),
        Kind::Lambda { body, .. } => vec![*body],
        Kind::Number(_)
        | Kind::Float(_) | Kind::Double(_)
        | Kind::Bool(_)
        | Kind::String(_)
        | Kind::Unit
        | Kind::None
        | Kind::Local(_)
        | Kind::State(_)
        | Kind::Keep(_)
        | Kind::Enum { .. } => vec![],
    }
}

impl Lower<'_> {
    pub(super) fn site_observation(
        &mut self,
        actions: &CheckedActions,
        request: &SiteObservation,
    ) -> LangResult<ObservationFunction> {
        let index = self
            .program
            .actions
            .iter()
            .position(|a| a.name == request.action())
            .ok_or("unknown source observation action")?;
        let body = actions
            .action(index)
            .ok_or("missing source observation body")?;
        let node = body
            .nodes
            .get(request.node())
            .ok_or("unknown source observation node")?;
        let ExprType::Value(value_type) = &node.ty else {
            return Err("source observation requires a value expression".into());
        };
        // Callback bodies currently execute through pure correspondence. Do not
        // silently declare an unvisited callback site safe.
        let mut inside_callback = vec![false; body.nodes.len()];
        for node in &body.nodes {
            if let Kind::Lambda { body: root, .. } = &node.kind {
                let mut pending = vec![*root];
                while let Some(n) = pending.pop() {
                    if !inside_callback[n] {
                        inside_callback[n] = true;
                        pending.extend(children(&body.nodes[n].kind));
                    }
                }
            }
        }
        if inside_callback[request.node()] {
            return Err("source observations inside callbacks are unsupported".into());
        }
        let predicate = self
            .program
            .actions
            .iter()
            .find(|a| a.name == request.predicate())
            .ok_or("unknown source observation predicate")?;
        if predicate.kind != ActionKind::Query
            || !predicate.writes.is_empty()
            || !predicate.emits.is_empty()
            || predicate.result != Type::Bool
        {
            return Err("source observation predicate must be a readonly Bool query".into());
        }
        let mut argument_types = request
            .slots()
            .iter()
            .map(|s| {
                body.slots
                    .get(*s)
                    .map(|s| s.ty.clone())
                    .ok_or("unknown source observation slot")
            })
            .collect::<Result<Vec<_>, _>>()?;
        match request {
            SiteObservation::Entry(_) => (),
            SiteObservation::Value(_) => argument_types.push(value_type.clone()),
            SiteObservation::Call(_) => {
                let arguments = match &node.kind {
                    Kind::PureCall { arguments, .. }
                    | Kind::QueryCall { arguments, .. }
                    | Kind::ChangeCall { arguments, .. } => arguments,
                    _ => return Err("call observation requires an invocation node".into()),
                };
                for argument in arguments {
                    let ExprType::Value(ty) = &body.nodes[*argument].ty else {
                        return Err("call observation arguments must be values".into());
                    };
                    argument_types.push(ty.clone());
                }
            }
        }
        if argument_types
            != predicate
                .params
                .iter()
                .map(|(_, t)| t.clone())
                .collect::<Vec<_>>()
        {
            return Err("source observation predicate signature mismatch".into());
        }
        let mut params = vec![
            ("initial".into(), Sort::Data(self.state.clone())),
            ("version".into(), Sort::U64),
        ];
        let mut env = BTreeMap::new();
        for (slot, (_, ty)) in self.program.actions[index]
            .params
            .clone()
            .iter()
            .enumerate()
        {
            let name = format!("arg_{slot}");
            params.push((name.clone(), self.sort(ty)?));
            env.insert(slot, v(&name));
        }
        let term = self.observation_flow(actions, index, env, request)?;
        let function = self.store(Declaration::Function {
            params: params.clone(),
            result: Sort::Bool,
            body: term,
            recursive: None,
        })?;
        Ok(ObservationFunction { function, params })
    }
}
