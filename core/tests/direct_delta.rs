use ink_core::{
    logic::{Context, Declaration, Proof, Sort, Term},
    registry,
};
use std::collections::BTreeMap;

fn fixture() -> (Context, Declaration) {
    fixture_from(include_bytes!("fixtures/owned-helper-unfold.json"))
}

fn fixture_from(bytes: &[u8]) -> (Context, Declaration) {
    let bundle: registry::Bundle = serde_json::from_slice(bytes).unwrap();
    let checked = registry::CheckedBundle::check(&bundle).unwrap();
    let context = checked.first_order_context().unwrap();
    let declaration =
        serde_json::from_value(bundle.objects[&bundle.roots[0]].payload["declaration"].clone())
            .unwrap();
    (context, declaration)
}

#[test]
fn speculative_unfolding_keeps_the_existing_eight_operation_action_in_budget() {
    // Exact compact action equation from the frozen-program integration test.
    // Speculating on incompatible outer symbols exhausted the old work budget.
    fixture_from(include_bytes!("fixtures/frozen-eight-action.json"));
}

#[test]
fn the_eight_operation_action_still_requires_its_frozen_state_premise() {
    let (context, declaration) = fixture_from(include_bytes!("fixtures/frozen-eight-action.json"));
    let Declaration::Theorem {
        params,
        conditions,
        from,
        to,
        proof,
    } = declaration
    else {
        panic!()
    };
    assert!(!conditions.is_empty());
    assert!(context.check(&params, &[], &from, &to, &proof).is_err());
}

#[test]
fn projecting_a_wrapper_does_not_force_its_retained_continuation() {
    fixture_from(include_bytes!("fixtures/owned-continuation-match.json"));
}

#[test]
fn wrapper_projection_cannot_replace_an_unrelated_free_input() {
    let (context, declaration) =
        fixture_from(include_bytes!("fixtures/owned-continuation-match.json"));
    let Declaration::Theorem {
        mut params,
        conditions,
        from,
        to,
        ..
    } = declaration
    else {
        panic!()
    };
    let input = params[0].0.clone();
    params.push(("other_input".into(), params[0].1.clone()));
    let to = ink_core::logic::substitute_term(
        &to,
        &BTreeMap::from([(input, Term::Var("other_input".into()))]),
    )
    .unwrap();
    assert!(context
        .check(
            &params,
            &conditions,
            &from,
            &to,
            &Proof::Convert {
                from: from.clone(),
                to: to.clone()
            }
        )
        .is_err());
}

#[test]
fn a_complete_owned_continuation_can_unfold_without_computing_its_descendants() {
    // This exact ordinary case lemma exhausted the old conversion work budget.
    // Its source helper has a structural gate and a 32-step owned continuation.
    let (context, declaration) = fixture();
    let Declaration::Theorem {
        params,
        conditions,
        from,
        to,
        proof,
    } = declaration
    else {
        panic!()
    };
    context
        .check(&params, &conditions, &from, &to, &proof)
        .unwrap();
    // Knowing a proved theorem never grants an implicit conversion verdict.
    assert!(context
        .check(
            &params,
            &conditions,
            &from,
            &to,
            &Proof::Convert {
                from: from.clone(),
                to: to.clone()
            }
        )
        .is_err());
}

#[test]
fn a_structural_gate_can_be_exposed_through_a_checked_alias() {
    let (mut context, declaration) = fixture();
    let Declaration::Theorem {
        params,
        conditions,
        from,
        to,
        mut proof,
    } = declaration
    else {
        panic!()
    };
    let sort = params[0].1.clone();
    context
        .declare(
            "gate_identity".into(),
            &Declaration::Function {
                params: vec![("value".into(), sort.clone())],
                result: sort,
                body: Term::Var("value".into()),
                recursive: None,
            },
        )
        .unwrap();
    let Proof::Cases { cases, .. } = &mut proof else {
        panic!()
    };
    for case in cases {
        let Proof::Convert { from, .. } = &mut case.proof else {
            panic!()
        };
        let Term::Call { arguments, .. } = from else {
            panic!()
        };
        arguments[0] = Term::Call {
            function: "gate_identity".into(),
            arguments: vec![arguments[0].clone()],
        };
    }
    context
        .check(&params, &conditions, &from, &to, &proof)
        .unwrap();
}

#[test]
fn opening_a_definition_keeps_distinct_free_inputs_distinct() {
    let (context, declaration) = fixture();
    let Declaration::Theorem {
        mut params,
        conditions,
        from,
        to,
        proof,
    } = declaration
    else {
        panic!()
    };
    let input = params[1].0.clone();
    params.push(("other_input".into(), params[1].1.clone()));
    let replacements = BTreeMap::from([(input, Term::Var("other_input".into()))]);
    let to = ink_core::logic::substitute_term(&to, &replacements).unwrap();
    let Proof::Cases {
        scrutinee,
        variable,
        mut cases,
        ..
    } = proof
    else {
        panic!()
    };
    for case in &mut cases {
        let Proof::Convert { to, .. } = &mut case.proof else {
            panic!()
        };
        *to = ink_core::logic::substitute_term(to, &replacements).unwrap();
    }
    let proof = Proof::Cases {
        scrutinee,
        variable,
        from: from.clone(),
        to: to.clone(),
        cases,
    };
    assert!(context
        .check(&params, &conditions, &from, &to, &proof)
        .is_err());
}

#[test]
fn direct_delta_does_not_turn_an_abstract_interface_into_a_definition() {
    let mut context = Context::default();
    context
        .declare(
            "opaque".into(),
            &Declaration::AbstractFunction {
                name: "Opaque".into(),
                params: vec![("x".into(), Sort::U64)],
                result: Sort::U64,
            },
        )
        .unwrap();
    let params = vec![("x".into(), Sort::U64)];
    let from = Term::Call {
        function: "opaque".into(),
        arguments: vec![Term::Var("x".into())],
    };
    let to = Term::Var("x".into());
    assert!(context
        .check(
            &params,
            &[],
            &from,
            &to,
            &Proof::Convert {
                from: from.clone(),
                to: to.clone()
            }
        )
        .is_err());
}
