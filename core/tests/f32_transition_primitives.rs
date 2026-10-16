use ink_core::{
    action_ir::{CheckedActions, Kind},
    action_model::{Projection, SiteObservation, ValueObservation},
    core::CheckedModule,
    logic::Term,
    stateful::Runtime,
    syntax,
};
use serde_json::json;

fn construct(datatype: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: datatype.into(),
        constructor,
        arguments,
    }
}
fn call(function: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: function.into(),
        arguments,
    }
}
fn list(datatype: &str, values: impl DoubleEndedIterator<Item = Term>) -> Term {
    values
        .rev()
        .fold(construct(datatype, 0, vec![]), |tail, x| {
            construct(datatype, 1, vec![x, tail])
        })
}

const SOURCE: &str = r#"module scalar_flow;
state Counts:Table<u32,u32>=Table.empty();
event Seen:u32;
query operations(x:f32,y:f32)->List<u32> {
 return [f32_bits(x),f32_bits(sqrt(x)),f32_bits(f32_div(x,y)),
  f32_bits(floor(x)),f32_bits(ceil(x)),f32_bits(trunc(x)),f32_bits(round_ties_even(x)),
  choose(is_nan(x),1,0),choose(is_finite(x),1,0)];
}
query inspect(bits:u32)->u32 {return f32_bits(f32_from_bits(bits));}
query nan(x:f32)->Bool {return is_nan(x);}
change tick(bits:u32,fail:Bool)->Result<u32,u32> reads(Counts) writes(Counts) emits(Seen) {
 Counts.put(0,Counts.get(0).unwrap_or(0)+1);emit Seen(bits);
 if fail {return Err(99);}return Ok(bits);
}
change ordered(a:u32,b:u32,fail:Bool)->Result<u32,u32> reads(Counts) writes(Counts) emits(Seen) {
 return Ok(f32_bits(f32_div(f32_from_bits(tick(a,false)?),f32_from_bits(tick(b,fail)?))));
}
"#;

#[test]
fn scalar_projection_matches_reference_bits_and_orders_effectful_arguments() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let model = Projection::derive(&module).unwrap();
    let context = model.context().unwrap();
    let empty = construct(&model.tables[0].datatype, 0, vec![]);
    let initial = construct(&model.state, 0, vec![empty]);
    let words = match &model.types["{\"List\":\"U32\"}"] {
        ink_core::logic::Sort::Data(n) => n,
        _ => panic!(),
    };
    let event = model.objects[&model.events].payload["declaration"]["Datatype"]["constructors"][1]
        ["fields"][0]["Data"]
        .as_str()
        .unwrap();
    let bits = [
        0u32, 0x80000000, 1, 0x80000001, 0x007fffff, 0x00800000, 0x3f800001, 0x7f7fffff,
        0xff7fffff, 0x7f800000, 0xff800000, 0x7fc01234, 0x7fa01234, 0xffc05678,
    ];
    for (i, &x) in bits.iter().enumerate() {
        let y = bits[(i + 3) % bits.len()];
        for (name, args, input) in [
            ("inspect", vec![Term::U64(x.into())], json!([x])),
            (
                "operations",
                vec![Term::U64(x.into()), Term::U64(y.into())],
                json!([{"F32Bits":x},{"F32Bits":y}]),
            ),
        ] {
            let mut runtime = Runtime::from_checked(&module).unwrap();
            let outcome = runtime.invoke_json(name, &input).unwrap();
            let value = outcome.result.json();
            let expected = if let Some(xs) = value.as_array() {
                list(words, xs.iter().map(|x| Term::U64(x.as_u64().unwrap())))
            } else {
                Term::U64(value.as_u64().unwrap())
            };
            let mut inputs = vec![initial.clone(), Term::U64(0)];
            inputs.extend(args);
            let actual = context
                .evaluate(&[], &call(&model.actions[name].function, inputs))
                .unwrap();
            let Term::Construct { arguments, .. } = actual else {
                panic!()
            };
            assert_eq!(arguments[0], expected, "{name}: {x:x}");
            assert_eq!(arguments[3], initial);
            assert_eq!(arguments[4], construct(&model.events, 0, vec![]));
        }
        for fail in [false, true] {
            let mut runtime = Runtime::from_checked(&module).unwrap();
            let outcome = runtime
                .invoke_json("ordered", &json!([x, y, fail]))
                .unwrap();
            let actual = context
                .evaluate(
                    &[],
                    &call(
                        &model.actions["ordered"].function,
                        vec![
                            initial.clone(),
                            Term::U64(0),
                            Term::U64(x.into()),
                            Term::U64(y.into()),
                            Term::Bool(fail),
                        ],
                    ),
                )
                .unwrap();
            let Term::Construct { arguments, .. } = actual else {
                panic!()
            };
            let Term::Construct {
                constructor,
                arguments: payload,
                ..
            } = &arguments[0]
            else {
                panic!()
            };
            assert_eq!(*constructor, usize::from(fail));
            assert_eq!(
                payload[0],
                Term::U64(
                    outcome.result.json()[if fail { "Err" } else { "Ok" }]
                        .as_u64()
                        .unwrap()
                )
            );
            assert_eq!(arguments[1], Term::Bool(outcome.committed));
            let state = if fail {
                initial.clone()
            } else {
                construct(
                    &model.state,
                    0,
                    vec![construct(
                        &model.tables[0].datatype,
                        1,
                        vec![
                            Term::U64(0),
                            Term::U64(2),
                            construct(&model.tables[0].datatype, 0, vec![]),
                        ],
                    )],
                )
            };
            assert_eq!(arguments[3], state);
            let events = if fail {
                construct(&model.events, 0, vec![])
            } else {
                list(
                    &model.events,
                    [x, y]
                        .into_iter()
                        .map(|x| construct(event, 0, vec![Term::U64(x.into())])),
                )
            };
            assert_eq!(arguments[4], events);
        }
    }
}

#[test]
fn builtin_value_observations_remain_at_the_original_site() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let actions = CheckedActions::elaborate(&module).unwrap();
    let index = module
        .program()
        .actions
        .iter()
        .position(|a| a.name == "inspect")
        .unwrap();
    let node = actions
        .action(index)
        .unwrap()
        .nodes
        .iter()
        .position(|n| matches!(&n.kind,Kind::Builtin{name,..} if name=="f32_from_bits"))
        .unwrap();
    let (model, functions) = Projection::derive_site_observations(
        &module,
        &[SiteObservation::Value(ValueObservation {
            action: "inspect".into(),
            node,
            predicate: "nan".into(),
            slots: vec![],
        })],
    )
    .unwrap();
    let context = model.context().unwrap();
    let initial = construct(
        &model.state,
        0,
        vec![construct(&model.tables[0].datatype, 0, vec![])],
    );
    for (bits, want) in [
        (0u32, false),
        (0x80000000, false),
        (0x7f800000, false),
        (0x7fa01234, true),
        (0xffc05678, true),
    ] {
        assert_eq!(
            context
                .evaluate(
                    &[],
                    &call(
                        &functions[0].function,
                        vec![initial.clone(), Term::U64(0), Term::U64(bits.into())]
                    )
                )
                .unwrap(),
            Term::Bool(want)
        );
    }
}

#[test]
fn primitive_registration_does_not_admit_unsupported_meanings() {
    for expression in ["is_finite(0.0f64)", "f32_from_u32(1)==1.0", "string_byte_len(\"x\")==1"] {
        let source=format!("module unsupported;query test()->Bool{{return {expression};}}");
        let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
        assert!(Projection::derive(&module).is_err(),"{expression}");
    }
}
