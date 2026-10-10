use serde_json::json;
use sha2::{Digest, Sha256};
use verified_language::{aggregate, snapshot_wire::*, stateful::Runtime, syntax::parse};

fn layout(value: Schema) -> Layout {
    Layout {
        program: [1; 32],
        schema: [2; 32],
        roots: vec![("Rows".into(), Schema::U64, value)],
        events: vec![("changed".into(), Schema::U32)],
    }
}
fn reseal(bytes: &mut Vec<u8>) {
    bytes.truncate(bytes.len() - 32);
    let digest = Sha256::digest(&*bytes);
    bytes.extend_from_slice(&digest);
}
#[test]
fn golden_payload_order_and_little_endian_integers() {
    let l = layout(Schema::U32);
    let s = Logical {
        version: 3,
        tables: vec![vec![(json!(1), json!(2)), (json!(257), json!(99))]],
        outbox: vec![],
    };
    let bytes = encode(&l, &s, Limits::default()).unwrap();
    let mut payload = vec![];
    payload.extend_from_slice(&3u64.to_le_bytes());
    payload.extend_from_slice(&2u64.to_le_bytes());
    payload.extend_from_slice(&1u64.to_le_bytes());
    payload.extend_from_slice(&2u32.to_le_bytes());
    payload.extend_from_slice(&257u64.to_le_bytes());
    payload.extend_from_slice(&99u32.to_le_bytes());
    payload.extend_from_slice(&0u64.to_le_bytes());
    assert_eq!(&bytes[..12], b"VLSTATE\0\x01\x00\x01\x00");
    assert_eq!(&bytes[84..bytes.len() - 32], payload);
    assert_eq!(decode(&l, &bytes, Limits::default()).unwrap(), s);
    // Every single-byte corruption is rejected, including header and digest.
    for i in 0..bytes.len() {
        let mut bad = bytes.clone();
        bad[i] ^= 1;
        assert!(decode(&l, &bad, Limits::default()).is_err(), "byte {i}");
    }
    for end in 0..bytes.len() {
        assert!(decode(&l, &bytes[..end], Limits::default()).is_err());
    }
    let mut duplicate = bytes.clone();
    duplicate[112..120].copy_from_slice(&1u64.to_le_bytes());
    reseal(&mut duplicate);
    assert!(decode(&l, &duplicate, Limits::default()).is_err());
    let mut length = bytes.clone();
    length[92..100].copy_from_slice(&u64::MAX.to_le_bytes());
    reseal(&mut length);
    assert!(decode(&l, &length, Limits::default()).is_err());
}

#[test]
fn all_value_forms_roundtrip_and_noncanonical_values_are_rejected() {
    let fields = vec![
        ("unit".into(), Schema::Unit),
        ("bool".into(), Schema::Bool),
        ("small".into(), Schema::U32),
        ("wide".into(), Schema::U64),
        ("integer".into(), Schema::Int),
        ("text".into(), Schema::String),
        ("id".into(), Schema::Id),
        (
            "choice".into(),
            Schema::Enum(vec!["Choice.A".into(), "Choice.B".into()]),
        ),
        ("list".into(), Schema::List(Box::new(Schema::U64))),
        ("option".into(), Schema::Option(Box::new(Schema::String))),
        (
            "result".into(),
            Schema::Result(Box::new(Schema::U32), Box::new(Schema::String)),
        ),
    ];
    let l = layout(Schema::Record(fields));
    let value = json!({"unit":null,"bool":true,"small":u32::MAX,"wide":u64::MAX,"integer":{"Int":"-184467440737095516170"},"text":"héllo 🌍\u{0000}","id":"ffffffffffffffffffffffffffffffff","choice":"Choice.B","list":[0,u64::MAX],"option":{"None":null},"result":{"Err":"failure"}});
    let s = Logical {
        version: 9,
        tables: vec![vec![(json!(0), value)]],
        outbox: vec![
            Event {
                commit: 3,
                position: 1,
                channel: 0,
                value: json!(7),
            },
            Event {
                commit: 9,
                position: 0,
                channel: 0,
                value: json!(8),
            },
        ],
    };
    let bytes = encode(&l, &s, Limits::default()).unwrap();
    let decoded = decode(&l, &bytes, Limits::default()).unwrap();
    assert_eq!(decoded, s);
    assert_eq!(encode(&l, &decoded, Limits::default()).unwrap(), bytes);
    let mut wrong = s.clone();
    wrong.tables[0][0].1["integer"] = json!({"Int":"-0"});
    assert!(encode(&l, &wrong, Limits::default()).is_err());
    let mut wrong = s.clone();
    wrong.tables[0][0].1["id"] = json!("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
    assert!(encode(&l, &wrong, Limits::default()).is_err());
    let mut wrong = s.clone();
    wrong.outbox[1].commit = 2;
    assert!(encode(&l, &wrong, Limits::default()).is_err());
    assert!(decode(
        &l,
        &bytes,
        Limits {
            values: 1,
            ..Limits::default()
        }
    )
    .is_err());
    assert!(decode(
        &l,
        &bytes,
        Limits {
            depth: 0,
            ..Limits::default()
        }
    )
    .is_err());
    assert!(encode(
        &l,
        &s,
        Limits {
            bytes: 100,
            ..Limits::default()
        }
    )
    .is_err());
    let ints = layout(Schema::Int);
    let zero = Logical {
        version: 0,
        tables: vec![vec![(json!(1), json!({"Int":"0"}))]],
        outbox: vec![],
    };
    let mut bytes = encode(&ints, &zero, Limits::default()).unwrap();
    bytes[108] = 1;
    reseal(&mut bytes);
    assert!(decode(&ints, &bytes, Limits::default()).is_err()); // positive sign with empty magnitude
}

#[test]
fn portable_reference_snapshots_preserve_future_changes_and_pending_events() {
    let p = parse(include_str!("../examples/inventory.lang")).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let id = "ffffffffffffffffffffffffffffffff";
    rt.invoke_json("create", &json!([id, "Part", 12])).unwrap();
    rt.invoke_json("restock", &json!([id, 7])).unwrap();
    rt.acknowledge_through(rt.version(), 0);
    rt.invoke_json("restock", &json!([id, 9])).unwrap();
    let bytes = rt.checkpoint_portable().unwrap();
    let mut restored = Runtime::restore_portable(p.clone(), &bytes).unwrap();
    restored
        .enable_maintenance(
            aggregate::prove(
                &parse(include_str!("../knowledge/research/sum-maintenance.lang")).unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
    assert_eq!(restored.checkpoint_portable().unwrap(), bytes);
    for amount in [1, 0, u32::MAX, 3] {
        assert_eq!(
            rt.invoke_json("restock", &json!([id, amount]))
                .unwrap()
                .json(),
            restored
                .invoke_json("restock", &json!([id, amount]))
                .unwrap()
                .json()
        );
        assert_eq!(
            rt.checkpoint_portable().unwrap(),
            restored.checkpoint_portable().unwrap()
        );
    }
    let changed = parse(
        &include_str!("../examples/inventory.lang").replace("module inventory;", "module other;"),
    )
    .unwrap();
    assert!(Runtime::restore_portable(changed, &bytes).is_err());
}
