use serde_json::json;
use std::collections::BTreeMap;
use verified_language::{
    core::CheckedModule,
    laws::{Catalogue, Law},
    optimisation::{self, Site},
    registry,
    semantic::{self as s, Node},
    stateful::Runtime,
    syntax,
};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn proved_bound_erases_runtime_work_on_all_targets() {
    let source="module bounds;fn bounded(xs:List<u32>)->Bool{let selected:Int=count(xs.filter(fn(x)=>x>3));let original:Int=count(xs);return selected<=original;}";
    let input = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let f = &input.program().functions[0];
    let actual = s::elaborate(
        &f.body,
        &verified_language::check::params_env(&f.params).unwrap(),
        input.program(),
        &f.result,
    )
    .unwrap();
    let mut pending = vec![&actual];
    let mut filter = None;
    while let Some(t) = pending.pop() {
        if let Node::Op(n, args) = &t.node {
            if n == "method:filter" {
                filter = Some(args.clone());
                break;
            }
        }
        pending.extend(s::children(t));
    }
    let filter = filter.unwrap();
    let laws: Vec<Law> =
        serde_json::from_str(include_str!("../core/tests/fixtures/refinement-laws.json")).unwrap();
    let law = laws
        .into_iter()
        .find(|l| {
            l.params.get("xs") == Some(&s::value(syntax::Type::List(Box::new(syntax::Type::U32))))
                && l.params.contains_key("p")
        })
        .unwrap();
    let bound_id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    let arguments = BTreeMap::from([
        ("xs".into(), filter[0].clone()),
        ("p".into(), filter[1].clone()),
    ]);
    let middle = s::substitute(&law.from, &arguments, &mut s::Budget::new()).unwrap();
    // General beta/conversion followed by the database inequality; no compiler
    // guard recogniser or erased runtime requires/ensures assumption.
    let wrapper = Law {
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        params: BTreeMap::from([("xs".into(), filter[0].sort.clone())]),
        conditions: vec![],
        from: actual.clone(),
        to: law.to.clone(),
        proof: verified_language::laws::Proof::Trans {
            middle,
            left: Box::new(verified_language::laws::Proof::Normalize),
            right: Box::new(verified_language::laws::Proof::Use {
                law: bound_id.clone(),
                arguments,
                premises: vec![],
            }),
        },
        dependencies: vec![bound_id.clone()],
        definition_context: None,
    };
    let id = registry::identity(&registry::Entry::from_law(&wrapper).unwrap()).unwrap();
    let catalogue = Catalogue {
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(bound_id, law), (id.clone(), wrapper)]),
    };
    let packet = optimisation::Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: input.identity().unwrap(),
        knowledge: registry::from_catalogue(&catalogue).unwrap(),
        applications: vec![Site {
            function: "bounded".into(),
            path: vec![],
            law: id,
            arguments: BTreeMap::from([("xs".into(), filter[0].clone())]),
            premises: vec![],
        }],
        action_replacement: None,
        contract_refinement: None,
    };
    let selected = optimisation::check(&input, &packet).unwrap();
    assert_eq!(
        selected.module().program().functions[0].body,
        syntax::Expr::Bool(true)
    );
    let reference = Runtime::new_selected(&selected).unwrap();
    let snapshot = reference.checkpoint_portable().unwrap();
    let inputs = [
        json!([]),
        json!([0, 1, 3]),
        json!([4, 5, u32::MAX]),
        json!([4, 0, 4, 0]),
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for xs in inputs {
        steps.push(json!({"pure":"bounded","args":[xs],"cpu_only":true}));
        expected.push(json!({"reply":{"value":true},"snapshot":snapshot}));
    }
    parity::conformance_selected(
        "proved-refinement-parity",
        &selected,
        source,
        steps,
        expected,
    );
}
