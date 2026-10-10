use ink_core::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Sort, Term},
    syntax::parse,
};
fn module(s: &str) -> CheckedModule {
    CheckedModule::from_source(parse(s).unwrap()).unwrap()
}
fn c(d: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: d.into(),
        constructor,
        arguments,
    }
}
fn call(f: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: f.into(),
        arguments,
    }
}
fn data(s: &Sort) -> &str {
    if let Sort::Data(n) = s {
        n
    } else {
        panic!()
    }
}
const APP:&str="module bound; enum Error{Failed,} state Rows:Table<u64,u64> = Table.empty(); event seen:u64; change erase(k:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){Rows.remove(k); emit seen(10); emit seen(20); if fail{return Err(Error.Failed);}return Ok(());} query get(k:u64)->Option<u64> reads(Rows){return Rows.get(k);}";
#[test]
fn fixed_whole_action_model_checks_and_runs_without_catalogue_or_backend() {
    let model = Projection::derive(&module(APP)).unwrap();
    let context = model.context().unwrap();
    let table = &model.tables[0];
    let rows = c(
        &table.datatype,
        1,
        vec![Term::U64(7), Term::U64(9), c(&table.datatype, 0, vec![])],
    );
    let state = c(&model.state, 0, vec![rows]);
    let option = data(&model.types["{\"Option\":\"U64\"}"]);
    let observed = context
        .evaluate(
            &[],
            &call(
                &model.actions["get"].function,
                vec![state.clone(), Term::U64(3), Term::U64(7)],
            ),
        )
        .unwrap();
    assert_eq!(
        observed,
        c(
            data(&model.actions["get"].result),
            0,
            vec![
                c(option, 1, vec![Term::U64(9)]),
                Term::Bool(false),
                Term::U64(3),
                state.clone(),
                c(&model.events, 0, vec![])
            ]
        )
    );
    let abort = context
        .evaluate(
            &[],
            &call(
                &model.actions["erase"].function,
                vec![state.clone(), Term::U64(3), Term::U64(7), Term::Bool(true)],
            ),
        )
        .unwrap();
    let Term::Construct {
        constructor,
        arguments,
        ..
    } = abort
    else {
        panic!()
    };
    assert_eq!(constructor, 0);
    assert_eq!(arguments[1], Term::Bool(false));
    assert_eq!(arguments[2], Term::U64(3));
    assert_eq!(arguments[3], state.clone());
    assert_eq!(arguments[4], c(&model.events, 0, vec![]));
    let exhausted = context
        .evaluate(
            &[],
            &call(
                &model.actions["erase"].function,
                vec![
                    state.clone(),
                    Term::U64(u64::MAX),
                    Term::U64(7),
                    Term::Bool(false),
                ],
            ),
        )
        .unwrap();
    assert_eq!(
        exhausted,
        c(
            data(&model.actions["erase"].result),
            1,
            vec![Term::U64(1), Term::U64(u64::MAX), state]
        )
    );
}
#[test]
fn source_transition_roots_cannot_ignore_ordered_event_changes() {
    let a = Projection::derive(&module(APP)).unwrap();
    let z = Projection::derive(&module(&APP.replace(
        "emit seen(10); emit seen(20);",
        "emit seen(20); emit seen(10);",
    )))
    .unwrap();
    assert_ne!(a.source, z.source);
    assert_ne!(a.actions["erase"].function, z.actions["erase"].function);
    assert_ne!(
        a.actions["erase"].case.normal,
        z.actions["erase"].case.normal
    );
}
#[test]
fn unsupported_domains_and_long_continuations_are_rejected_with_bounded_work() {
    assert!(Projection::derive(&module(
        "module unsupported; query pass(x:u32)->u32{return x;}"
    ))
    .unwrap_err()
    .contains("unsupported action model type"));
    let body = (0..40)
        .map(|i| format!("let x{i}:u64={i};"))
        .collect::<String>();
    let source = format!("module limit; query q()->u64{{{body}return 1;}}");
    assert!(Projection::derive(&module(&source))
        .unwrap_err()
        .contains("depth limit"));
    let body = (0..2050)
        .map(|i| format!("let x{i}:u64={i};"))
        .collect::<String>();
    let source = format!("module limit; query q()->u64{{{body}return 1;}}");
    assert!(Projection::derive(&module(&source))
        .unwrap_err()
        .contains("node limit"));
}
#[test]
fn source_parameter_names_cannot_capture_transaction_model_binders() {
    let a = Projection::derive(&module(APP)).unwrap();
    let renamed = APP
        .replace("k:u64", "initial:u64")
        .replace("Rows.remove(k)", "Rows.remove(initial)")
        .replace("Rows.get(k)", "Rows.get(initial)")
        .replace("fail:Bool", "version:Bool")
        .replace("if fail", "if version");
    let z = Projection::derive(&module(&renamed)).unwrap();
    assert_ne!(a.source, z.source);
    assert_eq!(a.actions["erase"].function, z.actions["erase"].function);
    assert_eq!(a.actions["get"].function, z.actions["get"].function);
}

#[test]
fn total_helper_projection_is_bound_and_bounded_without_external_tools() {
    let source = "module helper;
      record Row { word:u64, take:Bool, }
      fn bump(word:u64)->u64 {let word:u64=word+1;return word-1;}
      fn pick(row:Row)->u64 {let row:u64=choose(row.take,bump(row.word),row.word);return row;}
      query get(initial:u64,version:Bool)->u64 {
        return pick(Row{word:initial,take:version});
      }";
    let model = Projection::derive(&module(source)).unwrap();
    let context = model.context().unwrap();
    for word in [0, 1, u64::MAX] {
        for take in [false, true] {
            let result = context
                .evaluate(
                    &[],
                    &call(
                        &model.actions["get"].function,
                        vec![
                            c(&model.state, 0, vec![]),
                            Term::U64(8),
                            Term::U64(word),
                            Term::Bool(take),
                        ],
                    ),
                )
                .unwrap();
            let Term::Construct { arguments, .. } = result else {
                panic!()
            };
            assert_eq!(arguments[0], Term::U64(word));
            assert_eq!(arguments[1], Term::Bool(false));
            assert_eq!(arguments[2], Term::U64(8));
        }
    }
    for body in [
        "let n:u32=1;return choose(n==1,x,0);",
        "return quot_or(x,1,0);",
    ] {
        let app=format!("module unsupported;fn helper(x:u64)->u64{{{body}}}query q(x:u64)->u64{{return helper(x);}}");
        assert!(Projection::derive(&module(&app)).is_err());
    }
    let mut chain = String::from("module depth;");
    for i in 0..33 {
        chain.push_str(&format!(
            "fn helper_{i}(x:u64)->u64{{return {};}}",
            if i == 32 {
                "x".into()
            } else {
                format!("helper_{}(x)", i + 1)
            }
        ));
    }
    chain.push_str("query q(x:u64)->u64{return helper_0(x);}");
    assert!(Projection::derive(&module(&chain))
        .unwrap_err()
        .contains("call depth/cycle limit"));
    let base = "module unrelated;query q(x:u64)->u64{return x;}";
    let old = Projection::derive(&module(base)).unwrap();
    let new = Projection::derive(&module(&format!(
        "{base}fn unused(x:u32)->u32{{return x;}}"
    )))
    .unwrap();
    assert_eq!(old.actions["q"].function, new.actions["q"].function);
}

#[test]
fn nested_unknown_results_are_sticky_and_domain_errors_precede_exhaustion() {
    let source = "module exits;enum Error{Failed,} event seen:u64;
      change child(value:Result<Unit,Error>)->Result<Unit,Error>{return value;}
      change outer(value:Result<Unit,Error>)->Result<Unit,Error> emits(seen){
        emit seen(11);child(value);emit seen(22);return Ok(());
      }
      query unwrap(value:Result<u64,Error>)->Result<u64,Error>{return Ok(value?);}";
    let p = module(source);
    let model = Projection::derive(&p).unwrap();
    let context = model.context().unwrap();
    let initial = c(&model.state, 0, vec![]);
    let unit = c(data(&model.types["\"Unit\""]), 0, vec![]);
    let error = c(data(&model.types["{\"Named\":\"Error\"}"]), 0, vec![]);
    let result = data(&model.types["{\"Result\":[\"Unit\",{\"Named\":\"Error\"}]}"]);
    let event = model.objects[&model.events].payload["declaration"]["Datatype"]["constructors"][1]
        ["fields"][0]["Data"]
        .as_str()
        .unwrap();
    for version in [0, u64::MAX] {
        for success in [false, true] {
            let argument = c(
                result,
                usize::from(!success),
                vec![if success { unit.clone() } else { error.clone() }],
            );
            let observed = context
                .evaluate(
                    &[],
                    &call(
                        &model.actions["outer"].function,
                        vec![initial.clone(), Term::U64(version), argument.clone()],
                    ),
                )
                .unwrap();
            let expected = if success && version == u64::MAX {
                c(
                    data(&model.actions["outer"].result),
                    1,
                    vec![Term::U64(1), Term::U64(version), initial.clone()],
                )
            } else {
                let events = if success {
                    c(
                        &model.events,
                        1,
                        vec![
                            c(event, 0, vec![Term::U64(11)]),
                            c(
                                &model.events,
                                1,
                                vec![
                                    c(event, 0, vec![Term::U64(22)]),
                                    c(&model.events, 0, vec![]),
                                ],
                            ),
                        ],
                    )
                } else {
                    c(&model.events, 0, vec![])
                };
                c(
                    data(&model.actions["outer"].result),
                    0,
                    vec![
                        argument,
                        Term::Bool(success),
                        Term::U64(if success { version + 1 } else { version }),
                        initial.clone(),
                        events,
                    ],
                )
            };
            assert_eq!(observed, expected);
        }
    }
    let word_result = data(&model.types["{\"Result\":[\"U64\",{\"Named\":\"Error\"}]}"]);
    for value in [
        c(word_result, 0, vec![Term::U64(u64::MAX)]),
        c(word_result, 1, vec![error]),
    ] {
        let observed = context
            .evaluate(
                &[],
                &call(
                    &model.actions["unwrap"].function,
                    vec![initial.clone(), Term::U64(u64::MAX), value.clone()],
                ),
            )
            .unwrap();
        assert_eq!(
            observed,
            c(
                data(&model.actions["unwrap"].result),
                0,
                vec![
                    value,
                    Term::Bool(false),
                    Term::U64(u64::MAX),
                    initial.clone(),
                    c(&model.events, 0, vec![])
                ]
            )
        );
    }
}

#[test]
fn nested_action_expansion_has_a_call_budget_independent_of_source_typing() {
    let mut source = String::from("module depth;enum Error{Failed,}");
    for i in 0..34 {
        source.push_str(&format!(
            "change nested_{i}()->Result<Unit,Error>{{{}return Ok(());}}",
            if i == 33 {
                String::new()
            } else {
                format!("nested_{}();", i + 1)
            }
        ));
    }
    assert!(Projection::derive(&module(&source))
        .unwrap_err()
        .contains("nested call depth limit"));
}
