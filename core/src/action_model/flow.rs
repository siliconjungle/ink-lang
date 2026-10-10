//! Fixed expression sequencing and nested transaction semantics. Continuations
//! construct logical terms; candidates and equivalence rules remain DB data.
use super::*;
type Env = BTreeMap<usize, Term>;
type Next<'f, 'p> = dyn Fn(&mut Lower<'p>, Term, Term, Term) -> LangResult<Term> + 'f;
type Exit<'f, 'p> = dyn Fn(&mut Lower<'p>, Term) -> LangResult<Term> + 'f;
struct Scope<'a> {
    actions: &'a CheckedActions,
    observation: &'a str,
}
struct Frame<'a> {
    body: &'a Body,
    total: Vec<bool>,
}
impl std::ops::Deref for Frame<'_> {
    type Target = Body;
    fn deref(&self) -> &Body {
        self.body
    }
}
// Execute a constructor case already produced by the fixed source semantics.
// This is not an equivalence rule or a rewrite of the user's program: unknown
// values still require a logical Match. Keeping known control flow here avoids
// repeatedly constructing impossible continuations during semantic projection.
fn result_field(value: &Term, sort: &Sort) -> LangResult<Option<(bool, Term)>> {
    if let Term::Construct {
        datatype,
        constructor,
        arguments,
    } = value
    {
        if datatype != id(sort)? || *constructor > 1 || arguments.len() != 1 {
            return Err("invalid source result constructor in action model".into());
        }
        Ok(Some((*constructor == 0, arguments[0].clone())))
    } else {
        Ok(None)
    }
}

impl<'p> Lower<'p> {
    // Sealed trees are emitted in child-first order. A conservative structural
    // summary distinguishes total expression evaluation from control/effects;
    // it selects no alternate algorithm and carries no proof authority.
    fn flow_frame<'b>(&mut self, body: &'b Body) -> LangResult<Frame<'b>> {
        let mut total = Vec::with_capacity(body.nodes.len());
        for node in &body.nodes {
            self.tick()?;
            let child = |n: NodeId| total.get(n).copied().unwrap_or(false);
            let safe = match &node.kind {
                Kind::Number(_)
                | Kind::Bool(_)
                | Kind::Unit
                | Kind::None
                | Kind::Local(_)
                | Kind::Enum { .. } => true,
                Kind::Record { fields, .. } => fields.iter().all(|(_, n)| child(*n)),
                Kind::Field { receiver, .. } => child(*receiver),
                Kind::Binary { left, right, .. }
                | Kind::And { left, right }
                | Kind::Or { left, right } => child(*left) && child(*right),
                Kind::PureCall { arguments, .. } => arguments.iter().all(|n| child(*n)),
                Kind::Builtin { name, arguments } => {
                    ["Ok", "Err", "Some"].contains(&name.as_str())
                        && arguments.iter().all(|n| child(*n))
                }
                Kind::Table {
                    method, arguments, ..
                } => {
                    ["get", "contains"].contains(&method.as_str())
                        && arguments.iter().all(|n| child(*n))
                }
                _ => false,
            };
            total.push(safe);
        }
        Ok(Frame { body, total })
    }
    pub(super) fn action_flow(
        &mut self,
        actions: &CheckedActions,
        index: usize,
        env: Env,
        observation: &str,
    ) -> LangResult<Term> {
        let action = &self.program.actions[index];
        let scope = Scope {
            actions,
            observation,
        };
        let finish = |this: &mut Self, value, state, events| {
            this.finish(
                value,
                state,
                events,
                &action.kind,
                &action.result,
                observation,
            )
        };
        let abort = |this: &mut Self, error| {
            let Type::Result(..) = &action.result else {
                return Err("action model abrupt exit requires Result".into());
            };
            let sort = this.sort(&action.result)?;
            this.finish(
                c(id(&sort)?, 1, vec![error]),
                v("initial"),
                c(&this.events, 0, vec![]),
                &action.kind,
                &action.result,
                observation,
            )
        };
        let frame = self.flow_frame(actions.action(index).unwrap())?;
        self.flow_block(
            &scope,
            &frame,
            &frame.instructions,
            env,
            v("initial"),
            c(&self.events, 0, vec![]),
            &finish,
            &abort,
            0,
            0,
        )
    }
    fn flow_block(
        &mut self,
        scope: &Scope,
        body: &Frame<'_>,
        instructions: &[Instruction],
        env: Env,
        state: Term,
        events: Term,
        ret: &Next<'_, 'p>,
        abort: &Exit<'_, 'p>,
        depth: usize,
        calls: usize,
    ) -> LangResult<Term> {
        self.tick()?;
        if depth > 32 {
            return Err("action transition continuation depth limit".into());
        }
        let Some((first, tail)) = instructions.split_first() else {
            return Ok(self.host(scope.observation, 3));
        };
        match first {
            Instruction::Return(n) => {
                self.flow_expr(scope, body, *n, &env, state, events, ret, abort, 0, calls)
            }
            Instruction::Let { slot, value, .. } => {
                let sort = self.sort(&body.slots[*slot].ty)?;
                self.flow_expr(
                    scope,
                    body,
                    *value,
                    &env,
                    state,
                    events,
                    &|this, value, state, events| {
                        this.bind(sort.clone(), value, |this, value| {
                            let mut local = env.clone();
                            local.insert(*slot, value);
                            this.flow_block(
                                scope,
                                body,
                                tail,
                                local,
                                state,
                                events,
                                ret,
                                abort,
                                depth + 1,
                                calls,
                            )
                        })
                    },
                    abort,
                    0,
                    calls,
                )
            }
            Instruction::Eval(n) => self.flow_expr(
                scope,
                body,
                *n,
                &env,
                state,
                events,
                &|this, _, state, events| {
                    this.flow_block(
                        scope,
                        body,
                        tail,
                        env.clone(),
                        state,
                        events,
                        ret,
                        abort,
                        depth + 1,
                        calls,
                    )
                },
                abort,
                0,
                calls,
            ),
            Instruction::Emit { channel, value } => {
                let index = self
                    .program
                    .events
                    .keys()
                    .position(|n| n == channel)
                    .expect("checked channel");
                self.flow_expr(
                    scope,
                    body,
                    *value,
                    &env,
                    state,
                    events,
                    &|this, value, state, events| {
                        let staged =
                            call(&this.snoc, vec![events, c(&this.event, index, vec![value])]);
                        this.bind(Sort::Data(this.events.clone()), staged, |this, events| {
                            this.flow_block(
                                scope,
                                body,
                                tail,
                                env.clone(),
                                state,
                                events,
                                ret,
                                abort,
                                depth + 1,
                                calls,
                            )
                        })
                    },
                    abort,
                    0,
                    calls,
                )
            }
            Instruction::If {
                condition,
                on_true,
                on_false,
            } => self.flow_expr(
                scope,
                body,
                *condition,
                &env,
                state,
                events,
                &|this, test, state, events| {
                    let mut yes = on_true.clone();
                    yes.extend_from_slice(tail);
                    let mut no = on_false.clone();
                    no.extend_from_slice(tail);
                    let yes = this.flow_block(
                        scope,
                        body,
                        &yes,
                        env.clone(),
                        state.clone(),
                        events.clone(),
                        ret,
                        abort,
                        depth + 1,
                        calls,
                    )?;
                    let no = this.flow_block(
                        scope,
                        body,
                        &no,
                        env.clone(),
                        state,
                        events,
                        ret,
                        abort,
                        depth + 1,
                        calls,
                    )?;
                    Ok(choice(test, yes, no))
                },
                abort,
                0,
                calls,
            ),
        }
    }
    fn flow_args(
        &mut self,
        scope: &Scope,
        body: &Frame<'_>,
        nodes: &[NodeId],
        env: &Env,
        state: Term,
        events: Term,
        values: Vec<Term>,
        next: &dyn Fn(&mut Self, Vec<Term>, Term, Term) -> LangResult<Term>,
        abort: &Exit<'_, 'p>,
        depth: usize,
        calls: usize,
    ) -> LangResult<Term> {
        self.tick()?;
        if depth > 128 {
            return Err("action model expression depth limit".into());
        }
        let Some((first, tail)) = nodes.split_first() else {
            return next(self, values, state, events);
        };
        self.flow_expr(
            scope,
            body,
            *first,
            env,
            state,
            events,
            &|this, value, state, events| {
                let mut values = values.clone();
                values.push(value);
                this.flow_args(
                    scope,
                    body,
                    tail,
                    env,
                    state,
                    events,
                    values,
                    next,
                    abort,
                    depth + 1,
                    calls,
                )
            },
            abort,
            depth + 1,
            calls,
        )
    }
    fn flow_expr(
        &mut self,
        scope: &Scope,
        body: &Frame<'_>,
        node: NodeId,
        env: &Env,
        state: Term,
        events: Term,
        next: &Next<'_, 'p>,
        abort: &Exit<'_, 'p>,
        depth: usize,
        calls: usize,
    ) -> LangResult<Term> {
        self.tick()?;
        if depth > 128 {
            return Err("action model expression depth limit".into());
        }
        let n = &body.nodes[node];
        let ExprType::Value(ty) = &n.ty else {
            return Err("standalone action model lambda is unsupported".into());
        };
        let sort = self.sort(ty)?;
        if body.total[node] {
            let value = self.expr(body, node, env, &state)?;
            return next(self, value, state, events);
        }
        match &n.kind {
            Kind::Number(_)
            | Kind::Bool(_)
            | Kind::Unit
            | Kind::None
            | Kind::Local(_)
            | Kind::Enum { .. } => {
                let value = self.expr(body, node, env, &state)?;
                next(self, value, state, events)
            }
            Kind::Try { value } => {
                let ExprType::Value(result_type) = &body.nodes[*value].ty else {
                    return Err("Try result type".into());
                };
                let result_sort = self.sort(result_type)?;
                self.flow_expr(
                    scope,
                    body,
                    *value,
                    env,
                    state,
                    events,
                    &|this, value, state, events| {
                        if let Some((success, value)) = result_field(&value, &result_sort)? {
                            return if success {
                                next(this, value, state, events)
                            } else {
                                abort(this, value)
                            };
                        }
                        let success = this.fresh();
                        let error = this.fresh();
                        let yes = next(this, v(&success), state, events)?;
                        let no = abort(this, v(&error))?;
                        Ok(m(value, vec![(vec![success], yes), (vec![error], no)]))
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::And { left, right } | Kind::Or { left, right } => {
                let and = matches!(n.kind, Kind::And { .. });
                self.flow_expr(
                    scope,
                    body,
                    *left,
                    env,
                    state,
                    events,
                    &|this, test, state, events| {
                        let resume = this.flow_expr(
                            scope,
                            body,
                            *right,
                            env,
                            state.clone(),
                            events.clone(),
                            next,
                            abort,
                            depth + 1,
                            calls,
                        )?;
                        let stop = next(this, Term::Bool(!and), state, events)?;
                        Ok(if and {
                            choice(test, resume, stop)
                        } else {
                            choice(test, stop, resume)
                        })
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::Binary { op, left, right } => {
                if !matches!(
                    &body.nodes[*left].ty,
                    ExprType::Value(Type::U64 | Type::Bool)
                ) {
                    return Err("non-word action model operator is unsupported".into());
                }
                self.flow_args(
                    scope,
                    body,
                    &[*left, *right],
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| {
                        next(this, b(op, xs[0].clone(), xs[1].clone()), state, events)
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::Record { name, fields } => {
                let nodes = fields.iter().map(|(_, n)| *n).collect::<Vec<_>>();
                let count = self.program.records[name].len();
                self.flow_args(
                    scope,
                    body,
                    &nodes,
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| {
                        let mut ordered = vec![Term::Bool(false); count];
                        for ((index, _), value) in fields.iter().zip(xs) {
                            ordered[*index] = value;
                        }
                        next(this, c(id(&sort)?, 0, ordered), state, events)
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::Field {
                record,
                receiver,
                field,
            } => {
                let count = self.program.records[record].len();
                self.flow_expr(
                    scope,
                    body,
                    *receiver,
                    env,
                    state,
                    events,
                    &|this, value, state, events| {
                        let names = (0..count).map(|_| this.fresh()).collect::<Vec<_>>();
                        let result = next(this, v(&names[*field]), state, events)?;
                        Ok(m(value, vec![(names, result)]))
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::Builtin { name, arguments } if ["Ok", "Err", "Some"].contains(&name.as_str()) => {
                self.flow_args(
                    scope,
                    body,
                    arguments,
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| {
                        next(
                            this,
                            c(id(&sort)?, usize::from(name == "Err" || name == "Some"), xs),
                            state,
                            events,
                        )
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::PureCall {
                function,
                arguments,
            } => {
                let f = self.pure_function(*function)?;
                self.flow_args(
                    scope,
                    body,
                    arguments,
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| next(this, call(&f, xs), state, events),
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::QueryCall { action, arguments } | Kind::ChangeCall { action, arguments } => self
                .flow_args(
                    scope,
                    body,
                    arguments,
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| {
                        this.flow_call(scope, *action, xs, state, events, next, abort, calls + 1)
                    },
                    abort,
                    depth + 1,
                    calls,
                ),
            Kind::Table {
                root,
                method,
                arguments,
            } if ["get", "contains", "insert", "replace", "remove"].contains(&method.as_str()) => {
                self.flow_args(
                    scope,
                    body,
                    arguments,
                    env,
                    state,
                    events,
                    vec![],
                    &|this, xs, state, events| {
                        let table = this.tables[*root].clone();
                        let rows = this.root(state.clone(), *root)?;
                        let present = call(&table.contains, vec![rows.clone(), xs[0].clone()]);
                        match method.as_str() {
                            "get" => next(
                                this,
                                call(&table.get, vec![rows, xs[0].clone()]),
                                state,
                                events,
                            ),
                            "contains" => next(this, present, state, events),
                            _ => {
                                let value = if method == "remove" {
                                    call(&table.get, vec![rows.clone(), xs[0].clone()])
                                } else {
                                    c(id(&sort)?, 0, vec![])
                                };
                                let f = match method.as_str() {
                                    "insert" => table.insert,
                                    "replace" => table.replace,
                                    _ => table.remove,
                                };
                                let mut args = vec![rows];
                                args.extend(xs);
                                let updated = this.update(state, *root, call(&f, args))?;
                                let resumed = this.bind(
                                    Sort::Data(this.state.clone()),
                                    updated,
                                    |this, state| next(this, value, state, events),
                                )?;
                                Ok(match method.as_str() {
                                    "insert" => {
                                        choice(present, this.host(scope.observation, 2), resumed)
                                    }
                                    "replace" => {
                                        choice(present, resumed, this.host(scope.observation, 2))
                                    }
                                    _ => resumed,
                                })
                            }
                        }
                    },
                    abort,
                    depth + 1,
                    calls,
                )
            }
            Kind::Method {
                receiver,
                method,
                arguments,
            } => self.flow_method(
                scope,
                body,
                *receiver,
                method,
                arguments,
                ty,
                env,
                state,
                events,
                next,
                abort,
                depth + 1,
                calls,
            ),
            _ => Err(format!(
                "unsupported action transition expression: {:?}",
                n.kind
            )),
        }
    }
    fn flow_call(
        &mut self,
        scope: &Scope,
        index: usize,
        arguments: Vec<Term>,
        state: Term,
        events: Term,
        next: &Next<'_, 'p>,
        abort: &Exit<'_, 'p>,
        calls: usize,
    ) -> LangResult<Term> {
        self.tick()?;
        if calls > 32 {
            return Err("action model nested call depth limit".into());
        }
        let action = self.program.actions[index].clone();
        let frame = self.flow_frame(scope.actions.action(index).unwrap())?;
        let body = &frame;
        let env = arguments.into_iter().enumerate().collect();
        let sort = self.sort(&action.result)?;
        let ret = |this: &mut Self, value: Term, state: Term, events: Term| {
            if action.kind == ActionKind::Query {
                return next(this, value, state, events);
            }
            if let Some((success, field)) = result_field(&value, &sort)? {
                return if success {
                    next(this, value, state, events)
                } else {
                    abort(this, field)
                };
            }
            let success = this.fresh();
            let error = this.fresh();
            let yes = next(this, c(id(&sort)?, 0, vec![v(&success)]), state, events)?;
            let no = abort(this, v(&error))?;
            Ok(m(value, vec![(vec![success], yes), (vec![error], no)]))
        };
        let local_exit = |this: &mut Self, error| {
            if action.kind == ActionKind::Query {
                if !matches!(action.result, Type::Result(..)) {
                    return Err("query abrupt exit requires Result".into());
                }
                next(
                    this,
                    c(id(&sort)?, 1, vec![error]),
                    state.clone(),
                    events.clone(),
                )
            } else {
                abort(this, error)
            }
        };
        self.flow_block(
            scope,
            body,
            &body.instructions,
            env,
            state.clone(),
            events.clone(),
            &ret,
            &local_exit,
            0,
            calls,
        )
    }
    fn flow_method(
        &mut self,
        scope: &Scope,
        body: &Frame<'_>,
        receiver: NodeId,
        method: &str,
        arguments: &[NodeId],
        ty: &Type,
        env: &Env,
        state: Term,
        events: Term,
        next: &Next<'_, 'p>,
        abort: &Exit<'_, 'p>,
        depth: usize,
        calls: usize,
    ) -> LangResult<Term> {
        let sort = self.sort(ty)?;
        let ExprType::Value(receiver_type) = &body.nodes[receiver].ty else {
            return Err("action model method receiver".into());
        };
        if method == "ok_or" {
            return self.flow_args(
                scope,
                body,
                &[receiver, arguments[0]],
                env,
                state,
                events,
                vec![],
                &|this, xs, state, events| {
                    let name = this.fresh();
                    let none = next(
                        this,
                        c(id(&sort)?, 1, vec![xs[1].clone()]),
                        state.clone(),
                        events.clone(),
                    )?;
                    let some = next(this, c(id(&sort)?, 0, vec![v(&name)]), state, events)?;
                    Ok(m(xs[0].clone(), vec![(vec![], none), (vec![name], some)]))
                },
                abort,
                depth + 1,
                calls,
            );
        }
        if !["map", "map_err"].contains(&method) {
            return Err("unsupported action model method".into());
        }
        let Kind::Lambda {
            parameter,
            body: lambda,
        } = body.nodes[arguments[0]].kind
        else {
            return Err("action model method requires lambda".into());
        };
        self.flow_expr(
            scope,
            body,
            receiver,
            env,
            state,
            events,
            &|this, value, state, events| {
                let first = this.fresh();
                let second = this.fresh();
                let mapped = |this: &mut Self, name: &str, constructor: usize| {
                    let mut local = env.clone();
                    local.insert(parameter, v(name));
                    this.flow_expr(
                        scope,
                        body,
                        lambda,
                        &local,
                        state.clone(),
                        events.clone(),
                        &|this, value, state, events| {
                            next(this, c(id(&sort)?, constructor, vec![value]), state, events)
                        },
                        abort,
                        depth + 1,
                        calls,
                    )
                };
                let branches = match receiver_type {
                    Type::Option(_) if method == "map" => vec![
                        (
                            vec![],
                            next(
                                this,
                                c(id(&sort)?, 0, vec![]),
                                state.clone(),
                                events.clone(),
                            )?,
                        ),
                        (vec![second.clone()], mapped(this, &second, 1)?),
                    ],
                    Type::Result(..) => {
                        let yes = if method == "map" {
                            mapped(this, &first, 0)?
                        } else {
                            next(
                                this,
                                c(id(&sort)?, 0, vec![v(&first)]),
                                state.clone(),
                                events.clone(),
                            )?
                        };
                        let no = if method == "map_err" {
                            mapped(this, &second, 1)?
                        } else {
                            next(
                                this,
                                c(id(&sort)?, 1, vec![v(&second)]),
                                state.clone(),
                                events.clone(),
                            )?
                        };
                        vec![(vec![first], yes), (vec![second], no)]
                    }
                    _ => return Err("unsupported action model method receiver".into()),
                };
                Ok(m(value, branches))
            },
            abort,
            depth + 1,
            calls,
        )
    }
}
