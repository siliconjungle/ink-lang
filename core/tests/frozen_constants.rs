use ink_core::{
    action_model::Projection, core::CheckedModule,
    logic::{Declaration, Proof, Sort, Term}, registry,
    stateful::{Runtime, Value}, syntax,
};
use serde_json::json;

fn bits(index: usize) -> u32 {
    [0, 0x80000000, 1, 0x7fa01234, 0x7f800000, 0x3e800001][index % 6]
}

// An independent literal reader follows only checked zero-argument definitions
// and constructors. It neither calls the normalizer nor trusts a producer.
fn spine(model: &Projection, context: &ink_core::logic::Context, mut value: Term, datatype: &str, fields: usize) -> Vec<Vec<Term>> {
    let mut rows = vec![];
    for _ in 0..10_000 {
        match value {
            Term::Call { function, arguments } => {
                assert!(arguments.is_empty());
                let definition: Declaration = serde_json::from_value(
                    model.objects[&function].payload["declaration"].clone()).unwrap();
                let Declaration::Function { params, result, body, recursive } = definition else { panic!("literal definition") };
                assert!(params.is_empty() && recursive.is_none());
                assert_eq!(result, Sort::Data(datatype.into()));
                let from = Term::Call { function, arguments: vec![] };
                context.check(&[], &[], &from, &body,
                    &Proof::Convert { from: from.clone(), to: body.clone() }).unwrap();
                value = body;
            }
            Term::Construct { datatype: actual, constructor, mut arguments } => {
                assert_eq!(actual, datatype);
                if constructor == 0 {
                    assert!(arguments.is_empty());
                    return rows;
                }
                assert_eq!(constructor, 1);
                assert_eq!(arguments.len(), fields + 1);
                value = arguments.pop().unwrap();
                rows.push(arguments);
            }
            _ => panic!("not a closed literal spine"),
        }
    }
    panic!("cyclic or unbounded constant spine")
}

#[test]
fn large_frozen_lists_transport_exact_bits_and_replay_ordinary_lookup_proofs() {
    for count in [33, 64, 128, 232, 512] {
        let mut program = syntax::parse("module constants; state Model:Table<u64,List<f32>>=Table.empty(); query all()->List<f32> reads(Model){return Model.get(0).unwrap_or([]);}").unwrap();
        let expected = (0..count).map(|i| Value::F32(bits(i)).json()).collect::<Vec<_>>();
        program.frozen.insert("Model".into(), vec![(json!(0), json!(expected))]);
        let module = CheckedModule::from_source(program).unwrap();
        let model = Projection::derive(&module).unwrap();
        let bytes = registry::canonical(&model).unwrap();
        let transported: Projection = serde_json::from_slice(&bytes).unwrap();
        let context = transported.context().unwrap();
        let rows = spine(&transported, &context, transported.frozen_domain[0].to.clone(), &model.tables[0].datatype, 2);
        assert_eq!(rows.len(), 1);
        let value = rows[0][1].clone();
        let list_type = model.types[&serde_json::to_string(&syntax::Type::List(Box::new(syntax::Type::F32))).unwrap()].clone();
        let Sort::Data(list_id) = list_type.clone() else { panic!("list sort") };
        assert_eq!(spine(&transported, &context, value.clone(), &list_id, 1),
                   (0..count).map(|i| vec![Term::U64(bits(i) as u64)]).collect::<Vec<_>>());
        let Sort::Data(option) = &model.types[&serde_json::to_string(&syntax::Type::Option(Box::new(syntax::Type::List(Box::new(syntax::Type::F32))))).unwrap()] else { panic!("option sort") };
        let from = Term::Call { function: model.tables[0].get.clone(), arguments: vec![model.frozen_domain[0].to.clone(), Term::U64(0)] };
        let to = Term::Construct { datatype: option.clone(), constructor: 1, arguments: vec![value] };
        context.check(&[], &[], &from, &to, &Proof::Convert { from: from.clone(), to: to.clone() }).unwrap();
        let mut runtime = Runtime::from_checked(&module).unwrap();
        assert_eq!(runtime.invoke_json("all", &json!([])).unwrap().result.json(), json!(expected));
        let snapshot = runtime.checkpoint_portable().unwrap();
        assert_eq!(Runtime::restore_portable_checked(&module, &snapshot).unwrap().checkpoint_portable().unwrap(), snapshot);
    }
}

#[test]
fn many_frozen_rows_share_tails_without_losing_keys_or_values() {
    let mut program = syntax::parse("module rows; state Model:Table<u64,f32>=Table.empty(); query all()->Bool reads(Model){return Model.contains(0);}").unwrap();
    program.frozen.insert("Model".into(), (0..232).map(|i| (json!(i), Value::F32(bits(i)).json())).collect());
    let model = Projection::derive(&CheckedModule::from_source(program).unwrap()).unwrap();
    registry::canonical(&model).unwrap();
    assert_eq!(spine(&model, &model.context().unwrap(), model.frozen_domain[0].to.clone(), &model.tables[0].datatype, 2),
               (0..232).map(|i| vec![Term::U64(i as u64), Term::U64(bits(i) as u64)]).collect::<Vec<_>>());
}

#[test]
fn fixed_chunk_identity_does_not_depend_on_unrelated_helper_sorts() {
    let mut program = syntax::parse("module scope; record Extra { flag:Bool, } state Model:Table<u64,List<f32>>=Table.empty(); fn helper(flag:Bool)->Bool {let extra=Extra{flag:flag};return extra.flag;} query present()->Bool reads(Model){return helper(Model.contains(0));}").unwrap();
    program.frozen.insert("Model".into(), vec![(json!(0), json!((0..232).map(|i| Value::F32(bits(i)).json()).collect::<Vec<_>>()))]);
    let before = Projection::derive(&CheckedModule::from_source(program.clone()).unwrap()).unwrap();
    program.actions[0].body = syntax::parse("module selected; query present()->Bool {return true;}").unwrap().actions.remove(0).body;
    let after = Projection::derive(&CheckedModule::from_source(program).unwrap()).unwrap();
    assert_ne!(before.types, after.types);
    assert_eq!(before.frozen_domain, after.frozen_domain);
    assert_eq!(before.initial_state, after.initial_state);
}

#[test]
fn exhaustive_cases_keep_shared_conclusions_and_reject_a_different_value() {
    let source = format!("module shared; query all()->List<f32> {{return [{}];}}", vec!["0.25"; 512].join(","));
    let model = Projection::derive(&CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap()).unwrap();
    let mut context = model.context().unwrap();
    let action = &model.actions["all"];
    let call = |function: &str, initial: Term| Term::Call {
        function: function.into(), arguments: vec![initial, Term::Var("version".into())],
    };
    let original = call(&action.function, Term::Var("initial".into()));
    let branch = call(&action.function, Term::Construct { datatype: model.state.clone(), constructor: 0, arguments: vec![] });
    let proof = |to: Term| Proof::Cases {
        variable: Some("initial".into()), scrutinee: None,
        from: original.clone(), to,
        cases: vec![ink_core::logic::Case { bindings: vec![], proof: Proof::Refl(branch.clone()) }],
    };
    context.check(&action.params, &[], &original, &original, &proof(original.clone())).unwrap();
    let mut definition: Declaration = serde_json::from_value(model.objects[&action.function].payload["declaration"].clone()).unwrap();
    let Declaration::Function { body, .. } = &mut definition else { panic!("action definition") };
    fn corrupt(term: &mut Term) -> bool {
        match term {
            Term::U64(bits) => { *bits ^= 1; true }
            Term::Construct { arguments, .. } => arguments.iter_mut().any(corrupt),
            _ => false,
        }
    }
    assert!(corrupt(body));
    context.declare("wrong_value".into(), &definition).unwrap();
    let wrong = call("wrong_value", Term::Var("initial".into()));
    assert!(context.check(&action.params, &[], &original, &wrong, &proof(wrong.clone())).is_err());
}
