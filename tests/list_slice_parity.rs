use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{
    core::{CheckedModule, Type},
    eval,
    laws::{self, Catalogue, Law},
    optimisation::{self, Package, Site},
    semantic as s,
    stateful::Runtime,
    syntax,
};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn proof_selected_slice_map_preserves_empty_bounds_and_wrapping_across_targets() {
    let source="module slices; pub fn run(xs:List<u32>,n:u32)->List<u32>{return xs.map(fn(x)=>(x*13)+7).take(n);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let fixtures: Vec<Law> =
        serde_json::from_str(include_str!("../core/tests/fixtures/list-slice-laws.json")).unwrap();
    let law = fixtures[0].clone();
    let id = verified_language::registry::identity(
        &verified_language::registry::Entry::from_law(&law).unwrap(),
    )
    .unwrap();
    let sort = s::value(Type::U32);
    let xs = s::free(s::value(Type::List(Box::new(Type::U32))), "xs");
    let body = s::elaborate(
        &module.program().functions[0].body,
        &BTreeMap::from([
            ("xs".into(), Type::List(Box::new(Type::U32))),
            ("n".into(), Type::U32),
        ]),
        module.program(),
        &Type::List(Box::new(Type::U32)),
    )
    .unwrap();
    let s::Node::Op(_, outer) = &body.node else {
        panic!("take")
    };
    let s::Node::Op(_, mapped) = &outer[0].node else {
        panic!("map")
    };
    let catalog = Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(id.clone(), law)]),
    };
    let package = Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        knowledge: verified_language::registry::from_catalogue(&catalog).unwrap(),
        applications: vec![Site {
            function: "run".into(),
            path: vec![],
            law: id,
            arguments: BTreeMap::from([
                ("xs".into(), xs),
                ("count".into(), s::free(sort, "n")),
                ("mapper".into(), mapped[1].clone()),
            ]),
            premises: vec![],
        }],
        action_replacement: None,
    };
    let selected = optimisation::check(&module, &package).unwrap();
    let runtime = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for input in [
        vec![],
        vec![0u32, u32::MAX, 3],
        (0..41).map(|x| x * 17).collect(),
    ] {
        for n in [
            0,
            1,
            4,
            input.len() as u32,
            input.len() as u32 + 1,
            u32::MAX,
        ] {
            let args = json!([input, n]);
            let values = vec![
                eval::Value::List(input.iter().copied().map(eval::Value::U32).collect()),
                eval::Value::U32(n),
            ];
            let value = eval::call(module.program(), "run", values.clone(), &mut 100_000)
                .unwrap()
                .json();
            assert_eq!(
                eval::call_selected(&selected, "run", values, &mut 100_000)
                    .unwrap()
                    .json(),
                value
            );
            steps.push(json!({"pure":"run","args":args}));
            expected.push(
                json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}),
            );
        }
    }
    parity::conformance_selected(
        "list-slice-proof-parity",
        &selected,
        source,
        steps,
        expected,
    );
}
