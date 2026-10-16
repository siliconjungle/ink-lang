use ink_core::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Sort, Term},
    syntax::parse,
};

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(parse(source).unwrap()).unwrap()
}
fn construct(id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor,
        arguments,
    }
}
fn data(sort: &Sort) -> &str {
    if let Sort::Data(id) = sort {
        id
    } else {
        panic!("expected data")
    }
}
#[test]
fn long_numeric_bindings_preserve_distinct_captures_branches_and_float_bits() {
    let mut source =
        String::from("module shared_numeric; fn deep(x:f32,y:f32,flag:Bool)->f32 {let v0=x;");
    for i in 0..24 {
        source += &format!("let v{}=choose(flag,v{i}+y,v{i}*y);", i + 1);
    }
    source += "return v24;} query read(x:f32,y:f32,flag:Bool)->f32{return deep(x,y,flag);}";
    let checked = module(&source);
    let model = Projection::derive(&checked).unwrap();
    let wire = ink_core::registry::canonical(&model).unwrap();
    let roundtrip: Projection = serde_json::from_slice(&wire).unwrap();
    roundtrip.context().unwrap();
    assert_eq!(
        wire,
        ink_core::registry::canonical(&Projection::derive(&checked).unwrap()).unwrap()
    );
    let context = model.context().unwrap();
    let state = construct(&model.state, 0, vec![]);
    for x in [
        0, 0x80000000, 1, 0x3dcccccd, 0x3f800001, 0x7f800000, 0xff800000, 0x7fa01234, 0xffc01234,
    ] {
        for y in [0, 0x80000000, 0x3f000000, 0x3f800001, 0xbf800000] {
            for flag in [false, true] {
                let expected = ink_core::eval::call(
                    checked.program(),
                    "deep",
                    vec![
                        ink_core::eval::Value::F32(x),
                        ink_core::eval::Value::F32(y),
                        ink_core::eval::Value::Bool(flag),
                    ],
                    &mut 1_000_000,
                )
                .unwrap();
                let ink_core::eval::Value::F32(bits) = expected else {
                    panic!()
                };
                let reply = context
                    .evaluate(
                        &[],
                        &Term::Call {
                            function: model.actions["read"].function.clone(),
                            arguments: vec![
                                state.clone(),
                                Term::U64(0),
                                Term::U64(x as u64),
                                Term::U64(y as u64),
                                Term::Bool(flag),
                            ],
                        },
                    )
                    .unwrap();
                assert_eq!(
                    reply,
                    construct(
                        data(&model.actions["read"].result),
                        0,
                        vec![
                            Term::U64(bits as u64),
                            Term::Bool(false),
                            Term::U64(0),
                            state.clone(),
                            construct(&model.events, 0, vec![])
                        ]
                    )
                );
            }
        }
    }
}

#[test]
fn fallible_float_word_projection_matches_source_at_boundaries_and_seeded_bits() {
    use ink_core::stateful::Value;
    let checked = module(
        "module casts;
      query unsigned(x:f32)->Option<u32>{return u32_from_f32(x);}
      query wide(x:f32)->Option<u64>{return u64_from_f32(x);}
      query signed(x:f32)->Option<i32>{return i32_from_f32(x);}",
    );
    let model = Projection::derive(&checked).unwrap();
    let mut bits = vec![
        0, 0x80000000, 1, 0x80000001, 0x7f800000, 0xff800000, 0x7fa01234, 0xffc01234,
    ];
    for boundary in [0x3f800000u32, 0x4f000000, 0x4f800000, 0x5f800000] {
        for delta in -4i32..=4 {
            let value = boundary.wrapping_add(delta as u32);
            bits.extend([value, value | 0x80000000]);
        }
    }
    for exponent in 0..256 {
        for mantissa in [0, 1, 0x3fffff, 0x7fffff] {
            bits.extend([
                (exponent << 23) | mantissa,
                0x80000000 | (exponent << 23) | mantissa,
            ]);
        }
    }
    let mut seed = 0x12345678u32;
    for _ in 0..512 {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        bits.push(seed);
    }
    let context = model.context().unwrap();
    let state = construct(&model.state, 0, vec![]);
    for (query, cast, ty) in [
        ("unsigned", "u32_from_f32", "U32"),
        ("wide", "u64_from_f32", "U64"),
        ("signed", "i32_from_f32", "I32"),
    ] {
        let option = data(&model.types[&format!("{{\"Option\":\"{ty}\"}}")]);
        for &raw in &bits {
            let expected = ink_core::primitives::evaluate(cast, &[Value::F32(raw)]).unwrap();
            let Value::Option(expected) = expected else {
                panic!()
            };
            let expected = if let Some(value) = expected {
                let n = match *value {
                    Value::U32(n) => n as u64,
                    Value::U64(n) => n,
                    Value::I32(n) => n as u32 as u64,
                    _ => panic!(),
                };
                construct(option, 1, vec![Term::U64(n)])
            } else {
                construct(option, 0, vec![])
            };
            let Term::Construct { arguments, .. } = context
                .evaluate(
                    &[],
                    &Term::Call {
                        function: model.actions[query].function.clone(),
                        arguments: vec![state.clone(), Term::U64(0), Term::U64(raw as u64)],
                    },
                )
                .unwrap()
            else {
                panic!()
            };
            assert_eq!(arguments[0], expected, "{cast} {raw:08x}");
            assert_eq!(arguments[3], state);
            assert_eq!(arguments[4], construct(&model.events, 0, vec![]));
        }
    }
}

#[test]
fn shared_action_continuations_preserve_commit_abort_and_ordered_events() {
    use ink_core::stateful::{Runtime, Value};
    let mut source=String::from("module shared_actions;state Rows:Table<u64,u32>=Table.empty();event seen:u32;
      change run(x:u32,y:u32,fail:Bool)->Result<u32,String> reads(Rows) writes(Rows) emits(seen){let v0=Rows.get(0).unwrap_or(x);");
    for i in 0..24 {
        source += &format!("let v{}=v{i}*3+y;", i + 1);
    }
    source+="Rows.put(0,v24);emit seen(v24);emit seen(v24+1);if fail{return Err(\"no\");}return Ok(v24);}";
    let checked = module(&source);
    let model = Projection::derive(&checked).unwrap();
    let context = model.context().unwrap();
    let empty = construct(&model.tables[0].datatype, 0, vec![]);
    let state = construct(&model.state, 0, vec![empty.clone()]);
    let result = data(&model.types["{\"Result\":[\"U32\",\"String\"]}"]);
    let text = data(&model.types["\"String\""]);
    let ink_core::logic::Declaration::Datatype { constructors } =
        serde_json::from_value(model.objects[&model.events].payload["declaration"].clone())
            .unwrap()
    else {
        panic!()
    };
    let event_type = data(&constructors[1].fields[0]);
    for x in [0, u32::MAX, 123] {
        for y in [0, 7, u32::MAX] {
            for fail in [false, true] {
                let mut runtime = Runtime::from_checked(&checked).unwrap();
                let initial = runtime.checkpoint_portable().unwrap();
                let reference = runtime
                    .invoke("run", vec![Value::U32(x), Value::U32(y), Value::Bool(fail)])
                    .unwrap();
                let observed = context
                    .evaluate(
                        &[],
                        &Term::Call {
                            function: model.actions["run"].function.clone(),
                            arguments: vec![
                                state.clone(),
                                Term::U64(0),
                                Term::U64(x as u64),
                                Term::U64(y as u64),
                                Term::Bool(fail),
                            ],
                        },
                    )
                    .unwrap();
                let mut events = construct(&model.events, 0, vec![]);
                for event in reference.events.iter().rev() {
                    let Value::U32(value) = event.value else {
                        panic!()
                    };
                    events = construct(
                        &model.events,
                        1,
                        vec![
                            construct(event_type, 0, vec![Term::U64(value as u64)]),
                            events,
                        ],
                    );
                }
                let (value, after) = if fail {
                    assert_eq!(runtime.checkpoint_portable().unwrap(), initial);
                    let message = b"no"
                        .iter()
                        .rev()
                        .fold(construct(text, 0, vec![]), |tail, byte| {
                            construct(text, 1, vec![Term::U64(*byte as u64), tail])
                        });
                    (construct(result, 1, vec![message]), state.clone())
                } else {
                    let Value::Result(true, value) = reference.result else {
                        panic!()
                    };
                    let Value::U32(value) = *value else { panic!() };
                    (
                        construct(result, 0, vec![Term::U64(value as u64)]),
                        construct(
                            &model.state,
                            0,
                            vec![construct(
                                &model.tables[0].datatype,
                                1,
                                vec![Term::U64(0), Term::U64(value as u64), empty.clone()],
                            )],
                        ),
                    )
                };
                assert_eq!(
                    observed,
                    construct(
                        data(&model.actions["run"].result),
                        0,
                        vec![
                            value,
                            Term::Bool(reference.committed),
                            Term::U64(reference.version),
                            after,
                            events
                        ]
                    )
                );
            }
        }
    }
}

#[test]
fn paired_and_sum_callbacks_preserve_lengths_nested_captures_and_selected_arms() {
    use ink_core::syntax::Type;
    use serde_json::{json, Value};
    fn typed(model: &Projection, ty: &Type, value: &Value) -> Term {
        if *ty == Type::U32 {
            return Term::U64(value.as_u64().unwrap());
        }
        let sort = data(&model.types[&serde_json::to_string(ty).unwrap()]);
        match ty {
            Type::String => value
                .as_str()
                .unwrap()
                .bytes()
                .rev()
                .fold(construct(sort, 0, vec![]), |tail, byte| {
                    construct(sort, 1, vec![Term::U64(byte as u64), tail])
                }),
            Type::List(element) => value
                .as_array()
                .unwrap()
                .iter()
                .rev()
                .fold(construct(sort, 0, vec![]), |tail, head| {
                    construct(sort, 1, vec![typed(model, element, head), tail])
                }),
            Type::Option(element) => {
                if let Some(v) = value.get("Some") {
                    construct(sort, 1, vec![typed(model, element, v)])
                } else {
                    construct(sort, 0, vec![])
                }
            }
            Type::Result(ok, error) => {
                if let Some(v) = value.get("Ok") {
                    construct(sort, 0, vec![typed(model, ok, v)])
                } else {
                    construct(sort, 1, vec![typed(model, error, &value["Err"])])
                }
            }
            _ => panic!("unexpected test type"),
        }
    }
    let checked=module("module pairs;
      fn paired(xs:List<u32>,ys:List<u32>,a:u32,b:u32)->List<u32>{return xs.zip(ys,fn(x)=>fn(y)=>x*a+y*b);}
      fn nested(bases:List<u32>,xs:List<u32>,ys:List<u32>)->List<List<u32>>{return bases.map(fn(base)=>xs.zip(ys,fn(x)=>fn(y)=>x+base*y));}
      fn optional(x:Option<u32>,factor:u32)->Option<u32>{return x.map(fn(v)=>v*factor);}
      fn fallible(x:Result<u32,String>,factor:u32)->Result<u32,String>{return x.map(fn(v)=>v*factor);}
      query zip(xs:List<u32>,ys:List<u32>,a:u32,b:u32)->List<u32>{return paired(xs,ys,a,b);}
      query cross(bases:List<u32>,xs:List<u32>,ys:List<u32>)->List<List<u32>>{return nested(bases,xs,ys);}
      query maybe(x:Option<u32>,factor:u32)->Option<u32>{return optional(x,factor);}
      query result(x:Result<u32,String>,factor:u32)->Result<u32,String>{return fallible(x,factor);}");
    let model = Projection::derive(&checked).unwrap();
    let context = model.context().unwrap();
    let mut cases = vec![];
    for left in [json!([]), json!([1]), json!([1, 2, u32::MAX])] {
        for right in [json!([]), json!([5]), json!([6, 7, 8, 9])] {
            cases.push(("zip", vec![left.clone(), right.clone(), json!(3), json!(7)]));
            cases.push(("zip", vec![left.clone(), right.clone(), json!(7), json!(3)]));
            cases.push(("cross", vec![json!([1, u32::MAX]), left.clone(), right]));
        }
    }
    cases.extend([
        ("maybe", vec![json!({"None":null}), json!(7)]),
        ("maybe", vec![json!({"Some":u32::MAX}), json!(7)]),
        ("result", vec![json!({"Ok":u32::MAX}), json!(7)]),
        ("result", vec![json!({"Err":"unchanged 🦀"}), json!(7)]),
    ]);
    for (name, args) in cases {
        let mut runtime = ink_core::stateful::Runtime::from_checked(&checked).unwrap();
        let expected = runtime
            .invoke_json(name, &Value::Array(args.clone()))
            .unwrap();
        let action = checked
            .program()
            .actions
            .iter()
            .find(|a| a.name == name)
            .unwrap();
        let state = construct(&model.state, 0, vec![]);
        let mut input = vec![state.clone(), Term::U64(0)];
        input.extend(
            action
                .params
                .iter()
                .zip(&args)
                .map(|((_, ty), v)| typed(&model, ty, v)),
        );
        let actual = context
            .evaluate(
                &[],
                &Term::Call {
                    function: model.actions[name].function.clone(),
                    arguments: input,
                },
            )
            .unwrap();
        assert_eq!(
            actual,
            construct(
                data(&model.actions[name].result),
                0,
                vec![
                    typed(&model, &action.result, &expected.result.json()),
                    Term::Bool(false),
                    Term::U64(0),
                    state,
                    construct(&model.events, 0, vec![])
                ]
            ),
            "{name} {args:?}"
        );
    }
}

#[test]
fn repeated_captured_traversals_fit_by_sharing_definitions_with_distinct_arguments() {
    use ink_core::stateful::{Runtime, Value};
    let mut source = String::from("module many_traversals;");
    for i in 0..128 {
        source += &format!(
            "fn step{i}(xs:List<u32>,k:u32)->u32{{return foldl(xs,0,fn(x)=>fn(acc)=>acc*k+x);}}"
        );
    }
    fn dispatch(start: usize, end: usize) -> String {
        if end - start == 1 {
            return format!("step{start}(xs,k+{start})");
        }
        let middle = (start + end) / 2;
        format!(
            "choose(mode<{middle},{},{})",
            dispatch(start, middle),
            dispatch(middle, end)
        )
    }
    source += &format!(
        "fn selected(mode:u32,xs:List<u32>,k:u32)->u32{{return {};}}",
        dispatch(0, 128)
    );
    source += "query total(mode:u32,xs:List<u32>,k:u32)->u32{return selected(mode,xs,k);}";
    let checked = module(&source);
    let model = Projection::derive(&checked).unwrap();
    let wire = ink_core::registry::canonical(&model).unwrap();
    let restored: Projection = serde_json::from_slice(&wire).unwrap();
    let context = restored.context().unwrap();
    let list = data(&model.types["{\"List\":\"U32\"}"]);
    let state = construct(&model.state, 0, vec![]);
    for xs in [vec![], vec![1], vec![1, 2, 3], vec![u32::MAX, 7, 19]] {
        for k in [0, 3, u32::MAX] {
            for mode in [0, 1, 63, 127, u32::MAX] {
                let mut runtime = Runtime::from_checked(&checked).unwrap();
                let reference = runtime
                    .invoke(
                        "total",
                        vec![
                            Value::U32(mode),
                            Value::List(xs.iter().map(|v| Value::U32(*v)).collect()),
                            Value::U32(k),
                        ],
                    )
                    .unwrap();
                let Value::U32(expected) = reference.result else {
                    panic!()
                };
                let rows = xs.iter().rev().fold(construct(list, 0, vec![]), |tail, v| {
                    construct(list, 1, vec![Term::U64(*v as u64), tail])
                });
                let observed = context
                    .evaluate(
                        &[],
                        &Term::Call {
                            function: model.actions["total"].function.clone(),
                            arguments: vec![
                                state.clone(),
                                Term::U64(0),
                                Term::U64(mode as u64),
                                rows,
                                Term::U64(k as u64),
                            ],
                        },
                    )
                    .unwrap();
                assert_eq!(
                    observed,
                    construct(
                        data(&model.actions["total"].result),
                        0,
                        vec![
                            Term::U64(expected as u64),
                            Term::Bool(false),
                            Term::U64(0),
                            state.clone(),
                            construct(&model.events, 0, vec![])
                        ]
                    )
                );
            }
        }
    }
}

#[test]
fn staged_neural_graph_has_a_bounded_standalone_projection() {
    let checked =
        CheckedModule::from_bytes(include_bytes!("fixtures/staged-neural-frozen.core.json"))
            .unwrap();
    let model = Projection::derive(&checked).unwrap();
    assert_eq!(model.actions.len(), 6);
    assert!(!model.frozen_domain.is_empty());
    let wire = ink_core::registry::canonical(&model).unwrap();
    let restored: Projection = serde_json::from_slice(&wire).unwrap();
    restored.context().unwrap();
    eprintln!(
        "neural projection: {} definitions, {} canonical bytes",
        model.objects.len(),
        wire.len()
    );
}
