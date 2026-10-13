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
fn long_source_constructor_labels_are_bounded_without_colliding_with_source_names() {
    use sha2::{Digest,Sha256};
    let long=format!("LongRecord{}","x".repeat(80));
    let mut hash=Sha256::new();hash.update(long.as_bytes());hash.update(0u32.to_le_bytes());
    let digest=format!("{:x}",hash.finalize());let collision=format!("ink_{}",&digest[..60]);
    let enum_name=format!("LongEnum{}","x".repeat(80));
    let event=format!("LongEvent{}","x".repeat(80));
    let src=format!("module labels;record {long}{{value:u64,}}record {collision}{{value:u64,}}
      enum {enum_name}{{First,Second,}} event {event}:{long};
      query read(v:{long})->u64{{return v.value;}}
      query other(v:{collision})->u64{{return v.value;}}
      query variant(v:{enum_name})->{enum_name}{{return v;}}");
    let model=Projection::derive(&module(&src)).unwrap();model.context().unwrap();
    let long_key=serde_json::to_string(&ink_core::core::Type::Named(long)).unwrap();
    let collision_key=serde_json::to_string(&ink_core::core::Type::Named(collision)).unwrap();
    assert_ne!(model.types[&long_key],model.types[&collision_key]);
}

#[test]
fn generated_payload_constructor_labels_fit_the_logic_language() {
    let source = r#"module payload_projection;
enum Tree { Leaf(u32), Node(List<Tree>), }
state Rows:Table<String,Tree> = Table.empty();
change put(key:String,value:Tree)->Unit writes(Rows) { Rows.put(key,value);return (); }
query get(key:String)->Option<Tree> reads(Rows) { return Rows.get(key); }
"#;
    let checked = module(source);
    assert!(checked.program().records.keys().any(|name| name.len() > 64));
    let first = Projection::derive(&checked).unwrap();
    let second = Projection::derive(&checked).unwrap();
    assert_eq!(serde_json::to_value(&first.objects).unwrap(), serde_json::to_value(&second.objects).unwrap());
    first.context().unwrap();
    assert!(first.recursive_records.len() > 0);
}
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
fn expanded_domains_preserve_bounded_continuation_work() {
    assert!(Projection::derive(&module(
        "module unsupported; query pass(x:String)->String{return x;}"
    ))
    .is_ok());
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
        let app=format!("module supported;fn helper(x:u64)->u64{{{body}}}query q(x:u64)->u64{{return helper(x);}}");
        let projected = Projection::derive(&module(&app)).unwrap();
        let context = projected.context().unwrap();
        let value = context
            .evaluate(
                &[],
                &call(
                    &projected.actions["q"].function,
                    vec![c(&projected.state, 0, vec![]), Term::U64(0), Term::U64(7)],
                ),
            )
            .unwrap();
        let Term::Construct { arguments, .. } = value else {
            panic!()
        };
        assert_eq!(arguments[0], Term::U64(7));
    }
    for body in ["let text:String=\"unsupported\";return x;"] {
        let app=format!("module unsupported;fn helper(x:u64)->u64{{{body}}}query q(x:u64)->u64{{return helper(x);}}");
        assert!(Projection::derive(&module(&app)).is_ok());
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

#[test]
fn pure_left_folds_project_current_accumulators_and_owned_record_carriers() {
    let source="module folds;
      fn left(xs:List<u32>,base:u32)->u32{return foldl(xs,0,fn(x)=>fn(acc)=>acc*base+x);}
      fn right(xs:List<u32>,base:u32)->u32{return foldr(xs,0,fn(x)=>fn(acc)=>acc*base+x);}
      fn copied(xs:List<u32>)->List<u32>{var output:Buffer<u32>=Buffer.empty();for x in xs{output=output.push(x);}return output.freeze();}
      query left_value(xs:List<u32>,base:u32)->u32{return left(xs,base);}
      query right_value(xs:List<u32>,base:u32)->u32{return right(xs,base);}
      query copied_value(xs:List<u32>)->List<u32>{return copied(xs);}";
    let checked=module(source);let model=Projection::derive(&checked).unwrap();let context=model.context().unwrap();
    let list=data(&model.types["{\"List\":\"U32\"}"]);
    let rows=[1,2,3].into_iter().rev().fold(c(list,0,vec![]),|tail,x|c(list,1,vec![Term::U64(x),tail]));
    let state=c(&model.state,0,vec![]);
    for (query,expected) in [("left_value",Term::U64(123)),("right_value",Term::U64(321)),("copied_value",rows.clone())] {
        let mut args=vec![state.clone(),Term::U64(0),rows.clone()];if query!="copied_value"{args.push(Term::U64(10));}
        let actual=context.evaluate(&[],&call(&model.actions[query].function,args)).unwrap();
        let Term::Construct{arguments,..}=actual else {panic!()};
        assert_eq!(arguments[0],expected,"{query}");assert_eq!(arguments[3],state);assert_eq!(arguments[4],c(&model.events,0,vec![]));
    }
    let empty=context.evaluate(&[],&call(&model.actions["left_value"].function,vec![state,Term::U64(0),c(list,0,vec![]),Term::U64(10)])).unwrap();
    let Term::Construct{arguments,..}=empty else {panic!()};assert_eq!(arguments[0],Term::U64(0));
}
