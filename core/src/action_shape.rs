//! Conservative maximum number of individual cell writes in a checked action.
//! No algorithm choice or failure assumption follows from this structural bound.
use crate::action_ir::{Body, CheckedActions, Instruction, Kind, NodeId};
use std::collections::BTreeSet;
pub fn maximum_cell_writes(actions: &CheckedActions, index: usize) -> Option<usize> {
    struct Walk<'a> {
        actions: &'a CheckedActions,
        active: BTreeSet<usize>,
        work: usize,
    }
    impl Walk<'_> {
        fn entry(&mut self, index: usize) -> Option<usize> {
            if !self.active.insert(index) {
                return None;
            }
            let b = self.actions.action(index)?;
            let result = self.block(b, &b.instructions);
            self.active.remove(&index);
            result
        }
        fn block(&mut self, b: &Body, code: &[Instruction]) -> Option<usize> {
            let mut count = 0usize;
            for i in code {
                let n = match i {
                    Instruction::Let { value, .. }
                    | Instruction::Return(value)
                    | Instruction::Eval(value) => self.expr(b, *value, 0)?,
                    Instruction::Emit { value, .. } => self.expr(b, *value, 0)?,
                    Instruction::If {
                        condition,
                        on_true,
                        on_false,
                    } => self
                        .expr(b, *condition, 0)?
                        .checked_add(self.block(b, on_true)?.max(self.block(b, on_false)?))?,
                };
                count = count.checked_add(n)?;
                if count > 1 {
                    return Some(2);
                }
            }
            Some(count)
        }
        fn arguments(&mut self, b: &Body, ids: &[NodeId], depth: usize) -> Option<usize> {
            let mut n = 0usize;
            for i in ids {
                n = n.checked_add(self.expr(b, *i, depth + 1)?)?;
            }
            Some(n.min(2))
        }
        fn expr(&mut self, b: &Body, id: NodeId, depth: usize) -> Option<usize> {
            self.work += 1;
            if self.work > 100_000 || depth > 128 {
                return None;
            }
            let k = &b.nodes.get(id)?.kind;
            Some(match k {
                Kind::ChangeCall { action, arguments } | Kind::QueryCall { action, arguments } => {
                    let n = self.arguments(b, arguments, depth)?;
                    n.checked_add(self.entry(*action)?)?.min(2)
                }
                Kind::Table {
                    method, arguments, ..
                } => {
                    if method == "put_many" || method == "remove_many" {
                        return None;
                    }
                    self.arguments(b, arguments, depth)?
                        .checked_add(usize::from(
                            ["put", "insert", "replace", "remove"].contains(&method.as_str()),
                        ))?
                        .min(2)
                }
                Kind::Record { fields, .. } => {
                    self.arguments(b, &fields.iter().map(|x| x.1).collect::<Vec<_>>(), depth)?
                }
                Kind::Binary { left, right, .. }
                | Kind::And { left, right }
                | Kind::Or { left, right } => self.arguments(b, &[*left, *right], depth)?,
                Kind::Neg { value }
                | Kind::Try { value }
                | Kind::Field {
                    receiver: value, ..
                }
                | Kind::VectorField {
                    receiver: value, ..
                } => self.expr(b, *value, depth + 1)?,
                Kind::PureCall { arguments, .. } | Kind::Builtin { arguments, .. } => {
                    self.arguments(b, arguments, depth)?
                }
                Kind::Method {
                    receiver,
                    arguments,
                    ..
                } => {
                    let n = self.expr(b, *receiver, depth + 1)?;
                    n.checked_add(self.arguments(b, arguments, depth)?)?.min(2)
                }
                Kind::Bind { value, body, .. } => self.arguments(b, &[*value, *body], depth)?,
                Kind::Keep(_) => 0,
                Kind::Lambda { body, .. } => {
                    if self.expr(b, *body, depth + 1)? != 0 {
                        return None;
                    }
                    0
                }
                _ => 0,
            })
        }
    }
    Walk {
        actions,
        active: BTreeSet::new(),
        work: 0,
    }
    .entry(index)
}

/// Fresh flat native result containers can cross the host boundary directly.
/// No mutable child or value needing an ABI conversion may be shared.
pub fn fresh_native_result(actions: &CheckedActions, index: usize) -> bool {
    use crate::{action_ir::ExprType, syntax::Type};
    let program = actions.module().program();
    let scalar = |t: &Type| {
        matches!(
            t,
            Type::U64 | Type::U32 | Type::I32 | Type::Bool | Type::String | Type::Unit
        ) || matches!(t,Type::Named(n)if program.ids.contains(n)||program.enums.contains_key(n))
    };
    fn result_error<'a>(t: &'a Type) -> Option<&'a Type> {
        if let Type::Result(_, e) = t {
            Some(e)
        } else {
            None
        }
    }
    let Some(body) = actions.action(index) else {
        return false;
    };
    if result_error(&program.actions[index].result).is_some_and(|e| !scalar(e)) {
        return false;
    }
    fn fresh(b: &Body, id: NodeId, scalar: &impl Fn(&Type) -> bool, depth: usize) -> bool {
        if depth > 128 {
            return false;
        }
        let Some(node) = b.nodes.get(id) else {
            return false;
        };
        if matches!(&node.ty,ExprType::Value(t)if scalar(t)) {
            return true;
        }
        match &node.kind {
            Kind::Record { fields, .. } => fields
                .iter()
                .all(|(_, i)| matches!(&b.nodes[*i].ty,ExprType::Value(t)if scalar(t))),
            Kind::None => true,
            Kind::Builtin { name, arguments } if ["Ok", "Err", "Some"].contains(&name.as_str()) => {
                arguments
                    .iter()
                    .all(|i| matches!(&b.nodes[*i].ty,ExprType::Value(t)if scalar(t)))
            }
            Kind::Builtin { name, arguments } if name == "choose" => {
                fresh(b, arguments[1], scalar, depth + 1)
                    && fresh(b, arguments[2], scalar, depth + 1)
            }
            Kind::Bind { body, .. } => fresh(b, *body, scalar, depth + 1),
            _ => false,
        }
    }
    fn block(b: &Body, code: &[Instruction], scalar: &impl Fn(&Type) -> bool) -> bool {
        code.iter().all(|i| match i {
            Instruction::Return(value) => fresh(b, *value, scalar, 0),
            Instruction::If {
                on_true, on_false, ..
            } => block(b, on_true, scalar) && block(b, on_false, scalar),
            _ => true,
        })
    }
    block(body, &body.instructions, &scalar)
}
