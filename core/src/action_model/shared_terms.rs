//! Transparent sharing for otherwise untransportable source correspondence.
//! No primitive, evaluation shortcut, proof rule or source rewrite is added.
use super::*;

// A match contributes several JSON containers. Small mathematical bodies leave
// room for the ordinary declaration, entry and complete projection wrappers.
const CHUNK_HEIGHT: usize = 12;

impl Lower<'_> {
    /// Exact declaration structure, modulo lexical binder spelling only.
    /// This is used only on a bounded retry after the old projection failed its
    /// definition cap. Previously admitted projection identities stay intact.
    pub(super) fn declaration_key(&mut self, definition: &Declaration) -> LangResult<Vec<u8>> {
        let Declaration::Function {
            params,
            result,
            body,
            recursive,
        } = definition
        else {
            return registry::canonical(definition);
        };
        fn closed(term: &Term, bound: &BTreeSet<String>, work: &mut usize) -> LangResult<()> {
            *work = work
                .checked_sub(1)
                .ok_or("action model declaration sharing work limit")?;
            match term {
                Term::Var(name) if !bound.contains(name) => {
                    return Err("unbound projected sharing variable".into())
                }
                Term::Match {
                    scrutinee,
                    branches,
                } => {
                    closed(scrutinee, bound, work)?;
                    for branch in branches {
                        let unique = branch.bindings.iter().collect::<BTreeSet<_>>();
                        if unique.len() != branch.bindings.len() {
                            return Err("duplicate projected sharing binder".into());
                        }
                        for name in &branch.bindings {
                            crate::logic::name(name)?;
                        }
                        let mut local = bound.clone();
                        local.extend(branch.bindings.iter().cloned());
                        closed(&branch.body, &local, work)?;
                    }
                }
                _ => {
                    for child in crate::logic::term_children(term) {
                        closed(child, bound, work)?;
                    }
                }
            }
            Ok(())
        }
        let names = params
            .iter()
            .map(|(n, _)| n.clone())
            .collect::<BTreeSet<_>>();
        if names.len() != params.len() {
            return Err("duplicate projected sharing parameter".into());
        }
        for name in &names {
            crate::logic::name(name)?;
        }
        closed(body, &names, &mut self.shared_declaration_work)?;
        let environment = params
            .iter()
            .enumerate()
            .map(|(i, (n, _))| (n.clone(), format!("shared_parameter_{i}")))
            .collect();
        let body = public_normal(body, &environment, &mut 0);
        let params = params
            .iter()
            .enumerate()
            .map(|(i, (_, sort))| (format!("shared_parameter_{i}"), sort.clone()))
            .collect();
        registry::canonical(&Declaration::Function {
            params,
            result: result.clone(),
            body,
            recursive: *recursive,
        })
    }

    pub(super) fn share_large_definition(
        &mut self,
        definition: Declaration,
        implicit: bool,
    ) -> LangResult<String> {
        let Declaration::Function {
            params,
            result,
            body,
            recursive,
        } = &definition
        else {
            return Err("only function bodies admit projected sharing".into());
        };
        let mut context = definition_context(&self.objects)?;
        let mut installed = self.objects.keys().cloned().collect();
        let environment = params.iter().cloned().collect();
        let (body, _, _) = self.share_term(
            body.clone(),
            &environment,
            &definition,
            &mut context,
            &mut installed,
        )?;
        let shared = Declaration::Function {
            params: params.clone(),
            result: result.clone(),
            body,
            recursive: *recursive,
        };
        // SelfCall retains its original function/structural-descent scope. If
        // that scope cannot fit, retain the existing failure rather than recur
        // through this recovery path or relax a checker budget.
        let candidate = Entry::from_declaration(&shared, vec![])?;
        registry::canonical(&candidate)?;
        self.store_with_implicit_sorts(shared, implicit)
    }

    fn share_term(
        &mut self,
        term: Term,
        environment: &BTreeMap<String, Sort>,
        signature: &Declaration,
        context: &mut Context,
        installed: &mut BTreeSet<String>,
    ) -> LangResult<(Term, usize, bool)> {
        self.tick()?;
        let mut height = 1;
        let mut self_call = matches!(&term, Term::SelfCall(_));
        let mut child = |this: &mut Self,
                         term,
                         environment: &BTreeMap<String, Sort>,
                         context: &mut Context,
                         installed: &mut BTreeSet<String>|
         -> LangResult<Term> {
            let (term, child_height, child_self) =
                this.share_term(term, environment, signature, context, installed)?;
            height = height.max(child_height + 1);
            self_call |= child_self;
            Ok(term)
        };
        let term = match term {
            Term::Construct {
                datatype,
                constructor,
                arguments,
            } => Term::Construct {
                datatype,
                constructor,
                arguments: arguments
                    .into_iter()
                    .map(|t| child(self, t, environment, context, installed))
                    .collect::<LangResult<_>>()?,
            },
            Term::Call {
                function,
                arguments,
            } => Term::Call {
                function,
                arguments: arguments
                    .into_iter()
                    .map(|t| child(self, t, environment, context, installed))
                    .collect::<LangResult<_>>()?,
            },
            Term::SelfCall(arguments) => Term::SelfCall(
                arguments
                    .into_iter()
                    .map(|t| child(self, t, environment, context, installed))
                    .collect::<LangResult<_>>()?,
            ),
            Term::Binary { op, left, right } => Term::Binary {
                op,
                left: Box::new(child(self, *left, environment, context, installed)?),
                right: Box::new(child(self, *right, environment, context, installed)?),
            },
            Term::If {
                condition,
                on_true,
                on_false,
            } => Term::If {
                condition: Box::new(child(self, *condition, environment, context, installed)?),
                on_true: Box::new(child(self, *on_true, environment, context, installed)?),
                on_false: Box::new(child(self, *on_false, environment, context, installed)?),
            },
            Term::Match {
                scrutinee,
                branches,
            } => {
                let scrutinee = child(self, *scrutinee, environment, context, installed)?;
                let bindings = environment
                    .iter()
                    .map(|(n, s)| (n.clone(), s.clone()))
                    .collect::<Vec<_>>();
                let Sort::Data(datatype) =
                    context.projection_term_sort(signature, &bindings, &scrutinee)?
                else {
                    return Err("projected shared match requires data".into());
                };
                let mut shared = vec![];
                for (constructor, branch) in branches.into_iter().enumerate() {
                    let fields = context.projection_constructor_fields(&datatype, constructor)?;
                    if fields.len() != branch.bindings.len() {
                        return Err("projected shared match arity".into());
                    }
                    let mut local = environment.clone();
                    local.extend(branch.bindings.iter().cloned().zip(fields));
                    shared.push(Branch {
                        bindings: branch.bindings,
                        body: child(self, branch.body, &local, context, installed)?,
                    });
                }
                Term::Match {
                    scrutinee: Box::new(scrutinee),
                    branches: shared,
                }
            }
            other => other,
        };
        if height < CHUNK_HEIGHT || self_call {
            return Ok((term, height, self_call));
        }
        let bindings = environment
            .iter()
            .map(|(n, s)| (n.clone(), s.clone()))
            .collect::<Vec<_>>();
        let result = context.projection_term_sort(signature, &bindings, &term)?;
        let mut free = BTreeSet::new();
        fn capture(term: &Term, bound: &BTreeSet<String>, free: &mut BTreeSet<String>) {
            match term {
                Term::Var(name) if !bound.contains(name) => {
                    free.insert(name.clone());
                }
                Term::Match {
                    scrutinee,
                    branches,
                } => {
                    capture(scrutinee, bound, free);
                    for branch in branches {
                        let mut local = bound.clone();
                        local.extend(branch.bindings.iter().cloned());
                        capture(&branch.body, &local, free);
                    }
                }
                _ => {
                    for child in crate::logic::term_children(term) {
                        capture(child, bound, free);
                    }
                }
            }
        }
        capture(&term, &BTreeSet::new(), &mut free);
        let params = free
            .iter()
            .map(|n| {
                Ok((
                    n.clone(),
                    environment
                        .get(n)
                        .cloned()
                        .ok_or("projected shared capture has no sort")?,
                ))
            })
            .collect::<LangResult<Vec<_>>>()?;
        let helper = Declaration::Function {
            params,
            result,
            body: term,
            recursive: None,
        };
        let function = self.store(helper.clone())?;
        // All definitions still pass ordinary typing/termination checking.
        // A content identity or this structural walk never grants an equation.
        if installed.insert(function.clone()) {
            context.declare(function.clone(), &helper)?;
        }
        Ok((
            call(&function, free.iter().map(|n| v(n)).collect()),
            2,
            false,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sharing_is_lexical_only_and_cache_exhaustion_keeps_checked_definitions() {
        let checked = CheckedModule::from_source(
            crate::syntax::parse("module sharing_checks;fn id(x:u32)->u32{return x;}").unwrap(),
        )
        .unwrap();
        let actions = CheckedActions::elaborate_with_frozen_roots(&checked).unwrap();
        let mut lower = Lower::new(checked.program(), &actions);
        lower.intern_declarations = true;
        let function = |a: &str, z: &str, swap: bool| Declaration::Function {
            params: vec![(a.into(), Sort::U64), (z.into(), Sort::U64)],
            result: Sort::U64,
            body: if swap {
                b("-", v(z), v(a))
            } else {
                b("-", v(a), v(z))
            },
            recursive: None,
        };
        let key = lower
            .declaration_key(&function("left", "right", false))
            .unwrap();
        assert_eq!(
            key,
            lower.declaration_key(&function("x", "y", false)).unwrap()
        );
        assert_ne!(
            key,
            lower.declaration_key(&function("x", "y", true)).unwrap()
        );
        let open = Declaration::Function {
            params: vec![("x".into(), Sort::U64)],
            result: Sort::U64,
            body: v("case_binding_0"),
            recursive: None,
        };
        assert!(lower.declaration_key(&open).is_err());
        let duplicate = Declaration::Function {
            params: vec![("x".into(), Sort::U64), ("x".into(), Sort::U64)],
            result: Sort::U64,
            body: v("x"),
            recursive: None,
        };
        assert!(lower.declaration_key(&duplicate).is_err());
        lower.shared_declaration_bytes = crate::core::MAX_BYTES;
        let constant = lower
            .store(Declaration::Function {
                params: vec![],
                result: Sort::U64,
                body: Term::U64(1),
                recursive: None,
            })
            .unwrap();
        assert!(lower.shared_declarations.is_empty());
        let context = definition_context(&lower.objects).unwrap();
        let from = call(&constant, vec![]);
        let to = Term::U64(0);
        assert!(context
            .check(
                &[],
                &[],
                &from,
                &to,
                &Proof::Convert {
                    from: from.clone(),
                    to: to.clone()
                }
            )
            .is_err());
        let bad = lower
            .store(Declaration::Function {
                params: vec![],
                result: Sort::U64,
                body: Term::Bool(true),
                recursive: None,
            })
            .unwrap();
        assert!(lower.objects.contains_key(&bad));
        assert!(definition_context(&lower.objects).is_err());
    }
    #[test]
    fn modular_keeps_take_the_current_state_after_each_write() {
        let source="module kept_projection;state Rows:Table<u64,u32>=Table.empty();
          keep Current:u32=Rows.get(0).unwrap_or(0);
          change seed(x:u32)->Unit writes(Rows){Rows.put(0,x);return ();}
          change step(x:u32)->u32 reads(Current) writes(Rows){let before=Current;Rows.put(0,x);return before*3+Current;}";
        let checked = CheckedModule::from_source(crate::syntax::parse(source).unwrap()).unwrap();
        let (model, _) = Projection::derive_bounded(&checked, &[], true).unwrap();
        let context = model.context().unwrap();
        let rows = &model.tables[0].datatype;
        let empty = c(rows, 0, vec![]);
        for old in [0, 7, u32::MAX] {
            for value in [0, 13, u32::MAX] {
                let mut runtime = crate::stateful::Runtime::from_checked(&checked).unwrap();
                runtime
                    .invoke("seed", vec![crate::stateful::Value::U32(old)])
                    .unwrap();
                let reference = runtime
                    .invoke("step", vec![crate::stateful::Value::U32(value)])
                    .unwrap();
                let crate::stateful::Value::U32(answer) = reference.result else {
                    panic!()
                };
                let state = c(
                    &model.state,
                    0,
                    vec![c(
                        rows,
                        1,
                        vec![Term::U64(0), Term::U64(old as u64), empty.clone()],
                    )],
                );
                let actual = context
                    .evaluate(
                        &[],
                        &call(
                            &model.actions["step"].function,
                            vec![state, Term::U64(1), Term::U64(value as u64)],
                        ),
                    )
                    .unwrap();
                let after = c(
                    &model.state,
                    0,
                    vec![c(
                        rows,
                        1,
                        vec![Term::U64(0), Term::U64(value as u64), empty.clone()],
                    )],
                );
                assert_eq!(
                    actual,
                    c(
                        id(&model.actions["step"].result).unwrap(),
                        0,
                        vec![
                            Term::U64(answer as u64),
                            Term::Bool(true),
                            Term::U64(2),
                            after,
                            c(&model.events, 0, vec![])
                        ]
                    )
                );
            }
        }
    }

    #[test]
    fn suffix_joins_preserve_nested_errors_events_and_caller_captures() {
        use crate::stateful::{Runtime, Value};
        let source =
            "module joined_transactions;state Rows:Table<u64,u32>=Table.empty();event seen:u32;
          keep Current:u32=Rows.get(0).unwrap_or(0);
          change seed(x:u32)->Unit writes(Rows){Rows.put(0,x);return ();}
          change inner(x:u32,fail:Bool)->Result<u32,String> reads(Current) writes(Rows) emits(seen){
            let before=Current;
            if x==0 {Rows.put(0,before+9);emit seen(9);return Err(\"zero\");}
            if x<5 {Rows.put(0,x+1);}else{Rows.put(0,x+2);}
            emit seen(Current);
            if fail {Rows.put(0,77);emit seen(77);return Err(\"cancel\");}
            return Ok(before+Current);
          }
          change outer(x:u32,fail:Bool)->Result<u32,String> reads(Current) writes(Rows) emits(seen){
            let kept=Current;emit seen(kept);let result=inner(x,fail)?;
            if x==7 {Rows.put(0,99);emit seen(99);return Err(\"outer\");}
            emit seen(Current);return Ok(kept*3+Current*5+result*7);
          }
          query get()->u32 reads(Current){return Current;}";
        let checked = CheckedModule::from_source(crate::syntax::parse(source).unwrap()).unwrap();
        let (model, _) = Projection::derive_bounded(&checked, &[], true).unwrap();
        let context = model.context().unwrap();
        let rows = &model.tables[0].datatype;
        let empty = c(rows, 0, vec![]);
        let result = id(&model.types["{\"Result\":[\"U32\",\"String\"]}"]).unwrap();
        let text = id(&model.types["\"String\""]).unwrap();
        let Declaration::Datatype { constructors } =
            serde_json::from_value(model.objects[&model.events].payload["declaration"].clone())
                .unwrap()
        else {
            panic!()
        };
        let event = id(&constructors[1].fields[0]).unwrap();
        for old in [0, 7, u32::MAX] {
            for x in [0, 1, 4, 7, u32::MAX] {
                for fail in [false, true] {
                    let mut runtime = Runtime::from_checked(&checked).unwrap();
                    runtime.invoke("seed", vec![Value::U32(old)]).unwrap();
                    let snapshot = runtime.checkpoint_portable().unwrap();
                    let reference = runtime
                        .invoke("outer", vec![Value::U32(x), Value::Bool(fail)])
                        .unwrap();
                    if !reference.committed {
                        assert_eq!(snapshot, runtime.checkpoint_portable().unwrap());
                    }
                    let Value::U32(current) = runtime.invoke("get", vec![]).unwrap().result else {
                        panic!()
                    };
                    let state = c(
                        &model.state,
                        0,
                        vec![c(
                            rows,
                            1,
                            vec![Term::U64(0), Term::U64(old as u64), empty.clone()],
                        )],
                    );
                    let actual = context
                        .evaluate(
                            &[],
                            &call(
                                &model.actions["outer"].function,
                                vec![state, Term::U64(1), Term::U64(x as u64), Term::Bool(fail)],
                            ),
                        )
                        .unwrap();
                    let Value::Result(ok, value) = reference.result else {
                        panic!()
                    };
                    let value = if ok {
                        let Value::U32(n) = *value else { panic!() };
                        c(result, 0, vec![Term::U64(n as u64)])
                    } else {
                        let Value::String(message) = *value else {
                            panic!()
                        };
                        let bytes = message.bytes().rev().fold(c(text, 0, vec![]), |tail, b| {
                            c(text, 1, vec![Term::U64(b as u64), tail])
                        });
                        c(result, 1, vec![bytes])
                    };
                    let mut events = c(&model.events, 0, vec![]);
                    for emitted in reference.events.iter().rev() {
                        let Value::U32(n) = emitted.value else {
                            panic!()
                        };
                        events = c(
                            &model.events,
                            1,
                            vec![c(event, 0, vec![Term::U64(n as u64)]), events],
                        );
                    }
                    let after = c(
                        &model.state,
                        0,
                        vec![c(
                            rows,
                            1,
                            vec![Term::U64(0), Term::U64(current as u64), empty.clone()],
                        )],
                    );
                    assert_eq!(
                        actual,
                        c(
                            id(&model.actions["outer"].result).unwrap(),
                            0,
                            vec![
                                value,
                                Term::Bool(reference.committed),
                                Term::U64(reference.version),
                                after,
                                events
                            ]
                        ),
                        "{old} {x} {fail}"
                    );
                }
            }
        }
    }

    #[test]
    fn modular_observations_stay_vacuous_before_entry_and_false_after_abort() {
        let source = "module joined_observations;state Rows:Table<u64,u32>=Table.empty();
          query read()->u32 reads(Rows){return Rows.get(0).unwrap_or(0);}
          query nonzero(value:u32)->Bool{return value>0;}
          query zero()->Bool reads(Rows){return Rows.get(0).unwrap_or(0)==0;}
          change run(skip:Bool,fail:Bool,x:u32)->Result<Unit,String> writes(Rows){
            if skip{return Err(\"skip\");}Rows.put(0,x);
            if x==99{Rows.put(0,0);}else{Rows.put(0,x);}
            let value=read();Rows.put(0,1);if fail{return Err(\"later\");}return Ok(());
          }";
        let checked = CheckedModule::from_source(crate::syntax::parse(source).unwrap()).unwrap();
        let actions = CheckedActions::elaborate_with_frozen_roots(&checked).unwrap();
        let run = checked
            .program()
            .actions
            .iter()
            .position(|a| a.name == "run")
            .unwrap();
        let read = checked
            .program()
            .actions
            .iter()
            .position(|a| a.name == "read")
            .unwrap();
        let node = actions
            .action(run)
            .unwrap()
            .nodes
            .iter()
            .position(|n| matches!(n.kind,Kind::QueryCall {action,..}if action==read))
            .unwrap();
        let requests = [
            SiteObservation::Value(ValueObservation {
                action: "run".into(),
                node,
                predicate: "nonzero".into(),
                slots: vec![],
            }),
            SiteObservation::Entry(EntryObservation {
                action: "run".into(),
                node,
                predicate: "zero".into(),
                slots: vec![],
            }),
        ];
        let (model, functions) = Projection::derive_bounded(&checked, &requests, true).unwrap();
        let context = model.context().unwrap();
        let state = c(
            &model.state,
            0,
            vec![c(&model.tables[0].datatype, 0, vec![])],
        );
        for skip in [false, true] {
            for fail in [false, true] {
                for x in [0, 7, 99] {
                    for (function, expected) in functions
                        .iter()
                        .zip([skip || (x != 0 && x != 99), skip || x == 0 || x == 99])
                    {
                        let actual = context
                            .evaluate(
                                &[],
                                &call(
                                    &function.function,
                                    vec![
                                        state.clone(),
                                        Term::U64(0),
                                        Term::Bool(skip),
                                        Term::Bool(fail),
                                        Term::U64(x),
                                    ],
                                ),
                            )
                            .unwrap();
                        assert_eq!(actual, Term::Bool(expected), "{skip} {fail} {x}");
                    }
                }
            }
        }
    }
}
