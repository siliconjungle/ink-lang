//! Literal execution of sealed, source-bound typed actions. No rewrite search or
//! representation policy. Evaluation order and local bindings are tree edges
//! and resolved slot indices; the source AST is not reconstructed for execution.
use super::*;
use crate::action_ir::{Body, ExprType, Instruction, Kind, NodeId, SlotId};
type Frame = Vec<Option<Value>>;

impl Runtime {
    pub(super) fn typed_action(
        &mut self,
        index: usize,
        args: Vec<Value>,
        nested: bool,
    ) -> Exec<Value> {
        self.tick()?;
        let body = self.action_bodies[index].clone();
        let a = &self.program.actions[index];
        let kind = a.kind.clone();
        let result_type = a.result.clone();
        if args.len() != a.params.len() {
            return Err("argument count mismatch".into());
        }
        let mut slots = vec![None; body.slots.len()];
        for (i, (v, (_, t))) in args.into_iter().zip(&a.params).enumerate() {
            slots[i] = Some(self.coerce(v, t)?);
        }
        let result = match self.typed_block(&body, &body.instructions, &mut slots) {
            Err(Failure::Abort(error))
                if kind == ActionKind::Query && matches!(result_type, Type::Result(..)) =>
            {
                Value::Result(false, Box::new(error))
            }
            result => result?.ok_or("missing return")?,
        };
        let result = self.coerce(result, &result_type)?;
        if nested && kind == ActionKind::Change {
            let result = match result {
                Value::Result(true, value) => Ok(value),
                Value::Result(false, error) => Err(error),
                _ => return Err("change did not return Result".into()),
            };
            return match crate::transaction::nested_change(result) {
                Ok(Ok(value)) => Ok(Value::Result(true, value)),
                Err(error) => Err(Failure::Abort(*error)),
                Ok(Err(_)) => unreachable!("nested errors cannot resume"),
            };
        }
        Ok(result)
    }
    pub(super) fn typed_keep(&mut self, index: usize) -> Exec<Value> {
        let name = &self.program.keeps[index].name;
        if let Some(cache) = self.cached.get(name) {
            return Ok(Value::Int(cache.total.clone()));
        }
        let ty = self.program.keeps[index].ty.clone();
        let body = self.keep_bodies[index].clone();
        let mut slots = vec![None; body.slots.len()];
        let result = match self.typed_expr(&body, body.value.expect("sealed keep root"), &mut slots)
        {
            Err(Failure::Abort(error)) if matches!(ty, Type::Result(..)) => {
                Value::Result(false, Box::new(error))
            }
            result => result?,
        };
        Ok(self.coerce(result, &ty)?)
    }
    fn typed_block(
        &mut self,
        body: &Body,
        instructions: &[Instruction],
        slots: &mut Frame,
    ) -> Exec<Option<Value>> {
        for instruction in instructions {
            self.tick()?;
            match instruction {
                Instruction::Let { slot, value, .. } => {
                    let value = self.typed_expr(body, *value, slots)?;
                    slots[*slot] = Some(self.coerce(value, &body.slots[*slot].ty)?);
                }
                Instruction::Return(value) => {
                    return Ok(Some(self.typed_expr(body, *value, slots)?))
                }
                Instruction::Eval(value) => {
                    self.typed_expr(body, *value, slots)?;
                }
                Instruction::Emit { channel, value } => {
                    let value = self.typed_expr(body, *value, slots)?;
                    let value = self.coerce(value, &self.program.events[channel])?;
                    self.staged.push((channel.clone(), value));
                }
                Instruction::If {
                    condition,
                    on_true,
                    on_false,
                } => {
                    let value = self.typed_expr(body, *condition, slots)?;
                    let Value::Bool(value) = value else {
                        return Err("if requires Bool".into());
                    };
                    if let Some(value) =
                        self.typed_block(body, if value { on_true } else { on_false }, slots)?
                    {
                        return Ok(Some(value));
                    }
                }
            }
        }
        Ok(None)
    }
    fn typed_args(
        &mut self,
        body: &Body,
        arguments: &[NodeId],
        slots: &mut Frame,
    ) -> Exec<Vec<Value>> {
        arguments
            .iter()
            .map(|&id| self.typed_expr(body, id, slots))
            .collect()
    }
    fn typed_apply(
        &mut self,
        body: &Body,
        parameter: SlotId,
        value: NodeId,
        slots: &mut Frame,
        argument: Value,
    ) -> Exec<Value> {
        let previous = slots[parameter].replace(argument);
        let result = self.typed_expr(body, value, slots);
        // A callback frame must be restored even on a local or host exit.
        slots[parameter] = previous;
        result
    }
    fn typed_expr(&mut self, body: &Body, id: NodeId, slots: &mut Frame) -> Exec<Value> {
        self.tick()?;
        let node = &body.nodes[id];
        let ty = match &node.ty {
            ExprType::Value(t) => t,
            ExprType::Lambda { .. } => return Err("lambda cannot execute alone".into()),
        };
        match &node.kind {
            Kind::Number(n) => Ok(match ty {
                Type::U32 => Value::U32((*n).try_into().map_err(|_| "u32 literal out of range")?),
                Type::Int => Value::Int(BigInt::from(*n)),
                _ => Value::U64(*n),
            }),
            Kind::Bool(v) => Ok(Value::Bool(*v)),
            Kind::String(v) => Ok(Value::String(v.clone())),
            Kind::Unit => Ok(Value::Unit),
            Kind::None => Ok(Value::Option(None)),
            Kind::Local(slot) => slots[*slot]
                .clone()
                .ok_or_else(|| Failure::Host("uninitialised checked slot".into())),
            Kind::State(_) => Err("table roots are accessed through table operations".into()),
            Kind::Keep(index) => self.typed_keep(*index),
            Kind::Enum { name, variant } => Ok(Value::Enum(
                name.clone(),
                self.program.enums[name][*variant].clone(),
            )),
            Kind::Record { name, fields } => {
                let schema = self.program.records[name].clone();
                let mut out = BTreeMap::new();
                for (field, value) in fields {
                    let value = self.typed_expr(body, *value, slots)?;
                    let (name, ty) = &schema[*field];
                    out.insert(name.clone(), self.coerce(value, ty)?);
                }
                Ok(Value::Record(name.clone(), out))
            }
            Kind::Field {
                record,
                receiver,
                field,
            } => {
                let value = self.typed_expr(body, *receiver, slots)?;
                let Value::Record(_, mut fields) = value else {
                    return Err("field requires record".into());
                };
                fields
                    .remove(&self.program.records[record][*field].0)
                    .ok_or_else(|| Failure::Host("unknown field".into()))
            }
            Kind::Binary { op, left, right } => {
                let left = self.typed_expr(body, *left, slots)?;
                let right = self.typed_expr(body, *right, slots)?;
                Self::binary(op, left, right)
            }
            Kind::And { left, right } | Kind::Or { left, right } => {
                let left = self.typed_expr(body, *left, slots)?;
                let lazy = matches!(node.kind, Kind::And { .. });
                match left {
                    Value::Bool(v) if v != lazy => Ok(Value::Bool(v)),
                    Value::Bool(_) => self.typed_expr(body, *right, slots),
                    _ => Err("Bool operand required".into()),
                }
            }
            Kind::Try { value } => match self.typed_expr(body, *value, slots)? {
                Value::Result(true, value) => Ok(*value),
                Value::Result(false, error) => Err(Failure::Abort(*error)),
                _ => Err("? requires Result".into()),
            },
            Kind::Builtin { name, arguments } => {
                let args = self.typed_args(body, arguments, slots)?;
                self.builtin(name, args, ty)
            }
            Kind::PureCall {
                function,
                arguments,
            } => {
                let args = self.typed_args(body, arguments, slots)?;
                self.pure_call(*function, args)
            }
            Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => {
                let args = self.typed_args(body, arguments, slots)?;
                self.typed_action(*action, args, true)
            }
            Kind::Table {
                root,
                method,
                arguments,
            } => {
                let args = self.typed_args(body, arguments, slots)?;
                let name = self.program.states[*root].name.clone();
                self.table(&name, method, args)
            }
            Kind::Method {
                receiver,
                method,
                arguments,
            } => {
                let receiver = self.typed_expr(body, *receiver, slots)?;
                if method == "ok_or" {
                    // Deliberately eager: fallback evaluation is observable.
                    let fallback = self.typed_expr(body, arguments[0], slots)?;
                    return match receiver {
                        Value::Option(Some(v)) => Ok(Value::Result(true, v)),
                        Value::Option(None) => Ok(Value::Result(false, Box::new(fallback))),
                        _ => Err("ok_or requires Option".into()),
                    };
                }
                let Kind::Lambda {
                    parameter,
                    body: value,
                } = body.nodes[arguments[0]].kind
                else {
                    return Err("method requires lambda".into());
                };
                match receiver {
                    Value::List(xs) => {
                        let mut out = Vec::with_capacity(xs.len());
                        for x in xs {
                            let mapped =
                                self.typed_apply(body, parameter, value, slots, x.clone())?;
                            if method == "map" {
                                out.push(mapped);
                            } else if mapped == Value::Bool(true) {
                                out.push(x);
                            } else if mapped != Value::Bool(false) {
                                return Err("filter requires Bool".into());
                            }
                        }
                        Ok(Value::List(out))
                    }
                    Value::Option(v) => Ok(Value::Option(match v {
                        Some(v) => Some(Box::new(
                            self.typed_apply(body, parameter, value, slots, *v)?,
                        )),
                        None => None,
                    })),
                    Value::Result(ok, v) => {
                        let map = (ok && method == "map") || (!ok && method == "map_err");
                        Ok(Value::Result(
                            ok,
                            if map {
                                Box::new(self.typed_apply(body, parameter, value, slots, *v)?)
                            } else {
                                v
                            },
                        ))
                    }
                    _ => Err("unsupported receiver".into()),
                }
            }
            Kind::Lambda { .. } => Err("lambda cannot execute alone".into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn isolated_core_executes_resolved_callback_scopes_without_knowledge_or_lowerings() {
        let p = crate::syntax::parse(
            r#"module slots;
            query scopes(seed:u32, take:Bool)->Option<u32> {
                let kept=Some(seed);
                if take {let branch:u32=3; branch;} else {let branch:u32=4; branch;}
                return kept.map(fn(seed)=>seed+1).map(fn(x)=>x+seed);
            }"#,
        )
        .unwrap();
        let mut rt = Runtime::new(p).unwrap();
        let ir = rt.action_ir().bytes().unwrap();
        let before = rt.checkpoint_portable().unwrap();
        for take in [false, true] {
            for (seed, want) in [(5, 11), (u32::MAX, u32::MAX)] {
                let out = rt
                    .invoke("scopes", vec![Value::U32(seed), Value::Bool(take)])
                    .unwrap();
                assert_eq!(out.result, Value::Option(Some(Box::new(Value::U32(want)))));
                assert!(!out.committed);
                assert_eq!(rt.checkpoint_portable().unwrap(), before);
                assert_eq!(rt.action_ir().bytes().unwrap(), ir);
            }
        }
    }
    #[test]
    fn table_resources_are_rejected_as_values_by_the_independent_core() {
        let prefix = "module roots; state Rows:Table<u32,u32> = Table.empty(); ";
        for expression in [
            "query bad()->Unit reads(Rows){Rows; return ();}",
            "query bad()->Table<u32,u32> reads(Rows){return Rows;}",
            "keep bad:Option<Table<u32,u32>> = None;",
        ] {
            let p = crate::syntax::parse(&format!("{prefix}{expression}")).unwrap();
            assert!(crate::core::CheckedModule::from_source(p).is_err());
        }
        let p = crate::syntax::parse(&format!(
            "{prefix} query values()->List<u32> reads(Rows){{return Rows.values();}}"
        ))
        .unwrap();
        let mut rt = Runtime::new(p).unwrap();
        assert_eq!(
            rt.invoke("values", vec![]).unwrap().result,
            Value::List(vec![])
        );
    }
}
