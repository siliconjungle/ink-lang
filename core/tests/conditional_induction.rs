use ink_core::registry::{Bundle, CheckedBundle};

#[test]
fn boolean_validity_projections_are_independently_checked() {
    let bundle: Bundle =
        serde_json::from_str(include_str!("fixtures/boolean-induction-bundle.json")).unwrap();
    CheckedBundle::check(&bundle)
        .unwrap()
        .first_order_context()
        .unwrap();
}
