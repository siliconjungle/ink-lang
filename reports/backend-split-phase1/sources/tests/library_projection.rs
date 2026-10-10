use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    library::{self, Bundle, Object},
    logic::{Declaration, Proof, Term},
};

fn fixture() -> (Bundle, BTreeMap<String, String>) {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/inductive");
    (
        library::bundle(&root.join("lock.json")).unwrap(),
        serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap(),
    )
}
fn call(id: &str) -> Term {
    Term::Call {
        function: id.into(),
        arguments: vec![Term::U64(3)],
    }
}

#[test]
fn projection_keeps_internal_dependencies_immutable_and_public_visibility_explicit() {
    let (original, names) = fixture();
    let roots = vec![names["composed"].clone()];
    let selected = library::project(&original, &roots).unwrap();
    assert_eq!(selected.lock.objects, roots);
    assert_eq!(selected.objects.len(), 3);
    for (id, raw) in &selected.objects {
        assert_eq!(Some(raw), original.objects.get(id));
    }
    let checked = library::load_bundle(&selected).unwrap();
    assert_eq!(
        checked
            .context
            .evaluate(&[], &call(&names["composed"]))
            .unwrap(),
        Term::U64(7)
    );
    assert!(checked.context.evaluate(&[], &call(&names["inc"])).is_err());
    let public = library::project(
        &selected,
        &[names["composed"].clone(), names["inc"].clone()],
    )
    .unwrap();
    assert_eq!(public.objects, selected.objects);
    assert_eq!(
        library::load_bundle(&public)
            .unwrap()
            .context
            .evaluate(&[], &call(&names["inc"]))
            .unwrap(),
        Term::U64(4)
    );
    assert!(!selected.objects.contains_key(&names["tree_copy_identity"]));
}

#[test]
fn selecting_valid_roots_cannot_hide_an_invalid_unrelated_theorem() {
    let (mut original, names) = fixture();
    let false_object = Object {
        schema: 1,
        semantics: library::SEMANTICS.into(),
        name: "unrelated_false_equality".into(),
        dependencies: vec![],
        declaration: Declaration::Theorem {
            params: vec![],
            conditions: vec![],
            from: Term::U64(1),
            to: Term::U64(2),
            proof: Proof::Refl(Term::U64(1)),
        },
    };
    let raw = serde_json::to_string(&false_object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    original.lock.objects.push(id.clone());
    original.objects.insert(id, raw);
    let error = library::project(&original, &[names["composed"].clone()]).unwrap_err();
    assert!(error.contains("different statement"), "{error}");
    assert!(!error.contains("hash"));
}

#[test]
fn projection_rejects_missing_duplicate_and_damaged_dependencies() {
    let (original, names) = fixture();
    assert!(
        library::project(&original, &[names["inc"].clone(), names["inc"].clone()])
            .unwrap_err()
            .contains("duplicate")
    );
    assert!(library::project(&original, &["0".repeat(64)])
        .unwrap_err()
        .contains("unknown"));
    assert!(library::project(&original, &["not-an-identity".into()]).is_err());
    let mut damaged = original.clone();
    damaged.objects.remove(&names["double"]);
    assert!(library::project(&damaged, &[names["composed"].clone()]).is_err());
    let empty = library::project(&original, &[]).unwrap();
    assert!(empty.objects.is_empty() && empty.lock.objects.is_empty());
    library::load_bundle(&empty).unwrap();
}
