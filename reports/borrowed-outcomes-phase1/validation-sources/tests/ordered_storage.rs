use std::collections::BTreeMap;
use verified_language::{
    ordered_storage::OrderedStorage,
    storage::{Layout, Policy, TableStorage},
    syntax::parse,
};

#[test]
fn ordered_buffers_match_tree_through_shifts_replacements_and_promotion() {
    for columns in [false, true] {
        for limit in [None, Some(1), Some(17), Some(256)] {
            let mut actual = if columns {
                OrderedStorage::columns(limit)
            } else {
                OrderedStorage::rows(limit)
            };
            let mut expected = BTreeMap::new();
            for k in 0..257u128 {
                actual.insert(k, format!("initial:{k}"));
                expected.insert(k, format!("initial:{k}"));
            }
            let mut random = 9127183u128;
            for i in 0..2048 {
                random ^= random << 13;
                random ^= random >> 7;
                random ^= random << 17;
                let k = match i % 17 {
                    0 => u128::MAX,
                    1 => 0,
                    2 => 1 << 64,
                    _ => random % 257,
                };
                // Populate the hint with another key before mutations, and
                // exercise a same-key hit. Neither is proof of a future index.
                assert_eq!(
                    actual.get(&(k.wrapping_add(1).wrapping_add(7))),
                    expected.get(&(k.wrapping_add(1).wrapping_add(7)))
                );
                assert_eq!(actual.get(&k), expected.get(&k));
                if i % 4 == 0 {
                    assert_eq!(actual.remove(&k), expected.remove(&k));
                } else {
                    let value = format!("{i}:{random}");
                    assert_eq!(actual.insert(k, value.clone()), expected.insert(k, value));
                }
                if i % 8 == 0 {
                    if let Some(value) = actual.get_mut(&k) {
                        value.push_str("mutated");
                    }
                    if let Some(value) = expected.get_mut(&k) {
                        value.push_str("mutated");
                    }
                }
                assert_eq!(
                    actual.iter().collect::<Vec<_>>(),
                    expected.iter().collect::<Vec<_>>()
                );
                assert_eq!(
                    actual.values().collect::<Vec<_>>(),
                    expected.values().collect::<Vec<_>>()
                );
                assert_eq!(actual.len(), expected.len());
                assert_eq!(actual.is_empty(), expected.is_empty());
            }
            assert_eq!(actual.is_tree(), limit.is_some());
            if actual.is_tree() {
                assert!(actual.buffer_bytes().is_none());
            }
        }
    }
    // Key domains and owned values are not restricted to numeric/Copy rows.
    let mut words = OrderedStorage::columns(Some(2));
    words.insert("z".to_owned(), vec![1]);
    words.insert("a".to_owned(), vec![2]);
    assert_eq!(words.insert("z".to_owned(), vec![3]), Some(vec![1]));
    assert!(!words.is_tree());
    words.insert("m".to_owned(), vec![4]);
    assert!(words.is_tree());
    assert_eq!(
        words.iter().map(|(k, _)| k.as_str()).collect::<Vec<_>>(),
        vec!["a", "m", "z"]
    );
}

#[test]
fn columns_remove_row_padding_and_storage_moves_nonclone_values() {
    struct Owned(u32); // no Clone implementation: ownership moves through storage
    let mut rows = OrderedStorage::rows(None);
    let mut columns = OrderedStorage::columns(None);
    for i in 0..4096u64 {
        rows.insert(i, Owned(i as u32));
        columns.insert(i, Owned(i as u32));
    }
    assert_eq!(rows.buffer_bytes(), Some(65536));
    assert_eq!(columns.buffer_bytes(), Some(49152));
    assert_eq!(columns.remove(&4095).unwrap().0, 4095);
    assert_eq!(rows.insert(4095, Owned(1)).unwrap().0, 4095);
    assert_eq!(rows.get(&4095).unwrap().0, 1);
}

#[test]
fn external_storage_policies_reject_unbound_roots_limits_and_maintenance() {
    let p = parse("module s; state Rows:Table<u64,u32> = Table.empty();").unwrap();
    let mut policy = Policy {
        schema: 1,
        semantics: verified_language::storage::SEMANTICS.into(),
        maintenance_id: None,
        roots: BTreeMap::from([(
            "Rows".into(),
            TableStorage {
                layout: Layout::Columns,
                promote_at: Some(256),
            },
        )]),
    };
    policy.check(&p, None).unwrap();
    policy.maintenance_id = Some("not-an-authority".into());
    assert!(policy.check(&p, None).is_err());
    policy.maintenance_id = None;
    policy.roots.get_mut("Rows").unwrap().promote_at = Some(0);
    assert!(policy.check(&p, None).is_err());
    policy.roots.get_mut("Rows").unwrap().promote_at = Some(1_000_001);
    assert!(policy.check(&p, None).is_err());
    policy.roots.get_mut("Rows").unwrap().promote_at = None;
    let config = policy.roots.remove("Rows").unwrap();
    policy.roots.insert("missing".into(), config);
    assert!(policy.check(&p, None).is_err());
    assert!(serde_json::from_str::<Policy>(r#"{"schema":1,"semantics":"ordered-table-storage-policy-v1","maintenance_id":null,"roots":{},"code":"arbitrary code"}"#).is_err());
}
