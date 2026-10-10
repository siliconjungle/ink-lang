//! Concrete evaluations are an independent oracle, not the universal proof.
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    library,
    logic::{Declaration, Term},
};
fn ctor(id: &str, i: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: i,
        arguments,
    }
}
fn integer(names: &BTreeMap<String, String>, n: i64) -> Term {
    let natural = (1..n.unsigned_abs()).fold(ctor(&names["Natural"], 0, vec![]), |tail, _| {
        ctor(&names["Natural"], 1, vec![tail])
    });
    ctor(
        &names["Integer"],
        if n == 0 {
            0
        } else if n > 0 {
            1
        } else {
            2
        },
        if n == 0 { vec![] } else { vec![natural] },
    )
}
fn rows(names: &BTreeMap<String, String>, rows: &[(u64, i64)]) -> Term {
    rows.iter().rev().fold(
        ctor(&names["KeyedRows"], 0, vec![]),
        |tail, &(key, value)| {
            ctor(
                &names["KeyedRows"],
                1,
                vec![Term::U64(key), integer(names, value), tail],
            )
        },
    )
}
fn join(a: &[(u64, i64)], b: &[(u64, i64)]) -> i64 {
    a.iter()
        .flat_map(|&(ka, va)| {
            b.iter()
                .filter(move |&&(kb, _)| kb == ka)
                .map(move |&(_, vb)| va + vb)
        })
        .sum()
}
#[test]
fn checked_append_join_agrees_with_pair_enumeration_but_payload_negation_is_not_deletion() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/incremental-views");
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
    let lib = library::load(&root.join("lock.json")).unwrap();
    assert_eq!(lib.closure.len(), 55);
    let evaluate = |a: &[(u64, i64)], b: &[(u64, i64)]| {
        lib.context
            .evaluate(
                &[],
                &Term::Call {
                    function: names["join_sum"].clone(),
                    arguments: vec![rows(&names, a), rows(&names, b)],
                },
            )
            .unwrap()
    };
    let cases = [
        vec![],
        vec![(0, -1)],
        vec![(u64::MAX, 2), (0, -2)],
        vec![(1, 1), (1, -1), (2, 0)],
    ];
    for a in &cases {
        for b in &cases {
            for da in &cases {
                for db in &cases {
                    let combined_a: Vec<_> = a.iter().chain(da).copied().collect();
                    let combined_b: Vec<_> = b.iter().chain(db).copied().collect();
                    let expected = join(a, b) + join(da, b) + join(a, db) + join(da, db);
                    assert_eq!(join(&combined_a, &combined_b), expected);
                    assert_eq!(
                        evaluate(&combined_a, &combined_b),
                        integer(&names, expected)
                    );
                }
            }
        }
    }
    assert_eq!(evaluate(&[(0, 3)], &[(0, 4)]), integer(&names, 7));
    assert_eq!(evaluate(&[(0, -3)], &[(0, 4)]), integer(&names, 1));
    assert_ne!(join(&[(0, 3)], &[(0, 4)]) + join(&[(0, -3)], &[(0, 4)]), 0);
}
#[test]
fn correctly_rehashed_false_join_law_is_rejected_by_the_kernel() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/incremental-views");
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
    let bundle = library::bundle(&root.join("lock.json")).unwrap();
    let old = &names["join_right_append"];
    let mut bundle = library::project(&bundle, &[old.clone()]).unwrap();
    let mut object: library::Object = serde_json::from_str(&bundle.objects[old]).unwrap();
    let Declaration::Theorem { to, .. } = &mut object.declaration else {
        unreachable!()
    };
    *to = Term::Call {
        function: names["join_sum"].clone(),
        arguments: vec![Term::Var("as".into()), Term::Var("bs".into())],
    };
    let raw = serde_json::to_string(&object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    bundle.objects.remove(old);
    bundle.objects.insert(id.clone(), raw);
    for entry in &mut bundle.lock.objects {
        if entry == old {
            *entry = id.clone();
        }
    }
    let error = library::load_bundle(&bundle).unwrap_err();
    assert!(error.contains("different statement"), "{error}");
}

#[test]
fn canonical_store_readdresses_the_same_proofs_and_cannot_authenticate_a_false_law() {
    use verified_language::{core::CheckedModule, registry::CheckedBundle, syntax::parse};
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let script = r#"
import json,copy,tempfile
from pathlib import Path
from ink_knowledge import Store,identity
s=Store('.'); names=json.loads(Path('store/names.json').read_text())
roots=[i for n,i in names.items() if n.startswith('incremental-views/')]
accepted=s.bundle(roots)
old=names['incremental-views/join_right_append']; small=s.bundle([old])
false=copy.deepcopy(small['objects'][old])
false['payload']['declaration']['Theorem']['to']={'Call':{'function':names['incremental-views/join_sum'],'arguments':[{'Var':'as'},{'Var':'bs'}]}}
with tempfile.TemporaryDirectory() as directory:
    objects=[false if i==old else o for i,o in small['objects'].items()]
    store=Store.publish(directory,objects)
    rejected=store.bundle([identity(false)])
    print(json.dumps({'accepted':accepted,'rejected':rejected}))
"#;
    let output = std::process::Command::new("python3")
        .args(["-c", script])
        .current_dir(root.join("knowledge"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let value: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    let accepted = serde_json::from_value(value["accepted"].clone()).unwrap();
    let module = CheckedModule::from_source(
        parse("module review; fn identity(x:u64)->u64 { return x; }").unwrap(),
    )
    .unwrap();
    let checked = CheckedBundle::check(&accepted).unwrap();
    assert_eq!(checked.verify(module.program()).unwrap().len(), 55);
    let rejected = serde_json::from_value(value["rejected"].clone()).unwrap();
    // The false entry has a valid, newly published content identity and snapshot.
    // Mathematical admission must still fail independently of membership.
    let checked = CheckedBundle::check(&rejected).unwrap();
    let error = checked.verify(module.program()).unwrap_err();
    assert!(error.contains("different statement"), "{error}");
}
