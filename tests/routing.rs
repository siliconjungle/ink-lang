use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use verified_language::{
    knowledge::Lock,
    library::{Bundle, Object, SEMANTICS},
    logic::{Declaration, Proof, Sort, Term},
    routing::{self, Package, Stage, ValueRef},
};
fn add(
    bundle: &mut Bundle,
    name: &str,
    params: Vec<(String, Sort)>,
    result: Sort,
    body: Term,
) -> String {
    let object = Object {
        schema: 1,
        semantics: SEMANTICS.into(),
        name: name.into(),
        dependencies: vec![],
        declaration: Declaration::Function {
            params,
            result,
            body,
            recursive: None,
        },
    };
    let raw = serde_json::to_string(&object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    bundle.objects.insert(id.clone(), raw);
    bundle.lock.objects.push(id.clone());
    id
}
fn fixture() -> (Bundle, Package) {
    let mut b = Bundle {
        lock: Lock {
            schema: 1,
            semantics: SEMANTICS.into(),
            objects: vec![],
        },
        objects: BTreeMap::new(),
    };
    let f = add(
        &mut b,
        "identity",
        vec![("value".into(), Sort::U64)],
        Sort::U64,
        Term::Var("value".into()),
    );
    let first = Term::Call {
        function: f.clone(),
        arguments: vec![Term::Var("value".into())],
    };
    let composition = Term::Call {
        function: f.clone(),
        arguments: vec![first.clone()],
    };
    let p = Package {
        schema: 1,
        semantics: routing::SEMANTICS.into(),
        bundle_sha256: format!("{:x}", Sha256::digest(serde_json::to_vec(&b).unwrap())),
        entry: f.clone(),
        stages: vec![
            Stage {
                id: "control".into(),
                function: f.clone(),
                backend: "rust".into(),
                domain: "wasm32".into(),
                arguments: vec![ValueRef::Input(0)],
            },
            Stage {
                id: "bulk".into(),
                function: f,
                backend: "gpu".into(),
                domain: "webgpu".into(),
                arguments: vec![ValueRef::Stage("control".into())],
            },
        ],
        output: ValueRef::Stage("bulk".into()),
        preservation: Proof::Convert {
            from: first,
            to: composition,
        },
    };
    (b, p)
}
#[test]
fn core_checks_composition_without_interpreting_placement_labels() {
    let (b, mut p) = fixture();
    let checked = routing::check(&b, &p).unwrap();
    assert_eq!(checked.result(), &Sort::U64);
    assert_eq!(checked.stage_sorts().len(), 2);
    p.stages[0].domain = "native".into();
    p.stages[1].domain = "wgpu".into();
    routing::check(&b, &p).unwrap(); // Mathematical proof is independent of placement.
                                     // This does not establish that GPU backends exist or physical bridges work.
    let mut bad = p.clone();
    bad.stages[0].arguments[0] = ValueRef::Stage("bulk".into());
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[1].id = "control".into();
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.output = ValueRef::Input(0);
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[0].arguments[0] = ValueRef::Input(1);
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[0].domain = "".into();
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.stages[1].arguments.clear();
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.schema = 2;
    assert!(routing::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.preservation = Proof::Refl(Term::Bool(true));
    assert!(routing::check(&b, &bad).is_err());
    p.stages = vec![p.stages[0].clone(); 33];
    assert!(routing::check(&b, &p).is_err());
}
#[test]
fn repinning_a_false_stage_does_not_establish_composition_equality() {
    let (mut b, mut p) = fixture();
    let wrong = add(
        &mut b,
        "constant",
        vec![("value".into(), Sort::U64)],
        Sort::U64,
        Term::U64(1),
    );
    p.stages[1].function = wrong;
    p.bundle_sha256 = format!("{:x}", Sha256::digest(serde_json::to_vec(&b).unwrap()));
    // Properly typed and repinned, but the whole-function proof names other code.
    assert!(routing::check(&b, &p).is_err());
    let boolean = add(
        &mut b,
        "boolean",
        vec![("value".into(), Sort::Bool)],
        Sort::Bool,
        Term::Var("value".into()),
    );
    p.stages[1].function = boolean;
    p.bundle_sha256 = format!("{:x}", Sha256::digest(serde_json::to_vec(&b).unwrap()));
    assert!(routing::check(&b, &p)
        .unwrap_err()
        .contains("type mismatch"));
}
