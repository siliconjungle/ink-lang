use ink_core::{
    core::{Program, Type},
    laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof},
    registry, semantic as s,
};
use std::collections::BTreeMap;

fn tree(depth: usize) -> s::Term {
    if depth == 0 {
        return s::word(Type::U32, 1);
    }
    s::op(
        s::value(Type::U32),
        "binary:+",
        vec![tree(depth - 1), tree(depth - 1)],
    )
}
fn law(index: usize, cases: usize) -> Law {
    let flag = format!("flag_{index}");
    let boolean = s::value(Type::Bool);
    let yes = s::term(boolean.clone(), s::Node::Bool(true));
    let expression = tree(9);
    let condition = s::free(boolean.clone(), &flag);
    let mut proof = Proof::Normalize;
    for _ in 0..cases {
        proof = Proof::Cases {
            condition: condition.clone(),
            on_false: Box::new(Proof::Normalize),
            on_true: Box::new(proof),
        };
    }
    Law {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        types: vec![],
        assumptions: vec![],
        params: BTreeMap::from([(flag, boolean)]),
        conditions: vec![
            Equation {
                from: expression.clone(),
                to: expression
            };
            16
        ],
        from: yes.clone(),
        to: yes,
        proof,
        dependencies: vec![],
        definition_context: None,
    }
}
fn catalogue(entries: Vec<Law>) -> Catalogue {
    let objects = entries
        .into_iter()
        .map(|law| {
            (
                registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap(),
                law,
            )
        })
        .collect::<BTreeMap<_, _>>();
    Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: objects.keys().cloned().collect(),
        objects,
    }
}
#[test]
fn independently_bounded_proof_entries_compose_in_one_catalogue() {
    let entries = (0..3).map(|i| law(i, 3)).collect::<Vec<_>>();
    for entry in &entries {
        CheckedCatalogue::check(&catalogue(vec![entry.clone()]), &Program::default()).unwrap();
    }
    CheckedCatalogue::check(&catalogue(entries), &Program::default()).unwrap();
}
#[test]
fn a_single_proof_cannot_borrow_another_entries_work_allowance() {
    let error =
        CheckedCatalogue::check(&catalogue(vec![law(0, 10)]), &Program::default()).unwrap_err();
    assert!(error.contains("semantic proof work/depth limit"), "{error}");
}
