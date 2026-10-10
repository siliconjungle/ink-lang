use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    aggregate::Certificate,
    core::CheckedModule,
    logic::Term,
    row_model::Model,
    source_values::{Limits, SourceValues},
    stateful::{Runtime, Value},
    syntax::{parse, Type},
};
fn fixture(ledger: bool) -> (CheckedModule, Certificate, Model, BTreeMap<String, String>) {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let name = if ledger { "ledger" } else { "layout" };
    let source = if ledger { "ledger" } else { "undo" };
    let module = CheckedModule::from_source(
        parse(&fs::read_to_string(root.join(format!("examples/source-row-{source}.ink"))).unwrap())
            .unwrap(),
    )
    .unwrap();
    let cert =
        serde_json::from_str(include_str!("../knowledge/table-maintenance/table.json")).unwrap();
    let folder = root.join(format!("knowledge/source-column-{name}"));
    let model = serde_json::from_slice(&fs::read(folder.join("binding.json")).unwrap()).unwrap();
    let names = serde_json::from_slice(&fs::read(folder.join("names.json")).unwrap()).unwrap();
    (module, cert, model, names)
}
fn row(module: &CheckedModule, n: i64) -> Value {
    Value::from_json(
        &serde_json::json!({
            "name":"λ🖋", "value":{"Int":n.to_string()},
            "detail":{"bias":{"Int":"-1"}, "active":true},
            "note":{"Some":"é"}, "words":[0,u64::MAX],
            "status":"Status.Paused", "marker":"ffffffffffffffff0000000000000001",
            "response":{"Err":"Status.Ready"}, "count":u32::MAX,
        }),
        &Type::Named("Row".into()),
        module.program(),
    )
    .unwrap()
}
fn field_mut(term: &mut Term, i: usize) -> &mut Term {
    let Term::Construct { arguments, .. } = term else {
        panic!("not a constructor")
    };
    &mut arguments[i]
}
#[test]
fn reference_transactions_and_column_roundtrips_use_actual_runtime_rows() {
    let (module, cert, model, names) = fixture(false);
    let values = SourceValues::bind(&module, &cert, &model).unwrap();
    let table = values.table(&names["LayoutRows"]).unwrap();
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut expected = BTreeMap::new();
    for step in 0..24 {
        let key = step % 4;
        let value = row(&module, step as i64 % 5 - 2);
        let change = if step % 3 == 0 { "fail" } else { "put" };
        runtime
            .invoke(change, vec![Value::U64(key), value.clone()])
            .unwrap();
        if change == "put" {
            expected.insert(key, value);
        }
        let mut actual = Vec::new();
        for key in 0..4 {
            let found = runtime.invoke("row", vec![Value::U64(key)]).unwrap().result;
            assert_eq!(
                found,
                Value::Option(expected.get(&key).cloned().map(Box::new))
            );
            if let Value::Option(Some(row)) = found {
                actual.push((Value::U64(key), *row));
            }
        }
        let rows = table.encode(&actual, Limits::default()).unwrap();
        let columns = values
            .context()
            .evaluate(
                &[],
                &Term::Call {
                    function: names["layout_encode"].clone(),
                    arguments: vec![rows],
                },
            )
            .unwrap();
        let restored = values
            .context()
            .evaluate(
                &[],
                &Term::Call {
                    function: names["layout_decode"].clone(),
                    arguments: vec![columns],
                },
            )
            .unwrap();
        assert_eq!(table.decode(&restored, Limits::default()).unwrap(), actual);
    }
}
#[test]
fn nominal_tags_member_types_and_field_sets_cannot_be_erased() {
    let (module, cert, model, _) = fixture(false);
    let values = SourceValues::bind(&module, &cert, &model).unwrap();
    let valid = row(&module, 0);
    let mut bad = Vec::new();
    let Value::Record(_, original) = &valid else {
        unreachable!()
    };
    bad.push(Value::Record("OtherRow".into(), original.clone()));
    for (field, replacement) in [
        ("count", Value::U64(1)),
        ("marker", Value::Id("OtherMarker".into(), 1)),
        ("status", Value::Enum("OtherStatus".into(), "Ready".into())),
        ("words", Value::List(vec![Value::Bool(true)])),
        ("note", Value::Option(Some(Box::new(Value::U64(0))))),
        (
            "response",
            Value::Result(false, Box::new(Value::Int(0.into()))),
        ),
    ] {
        let mut fields = original.clone();
        fields.insert(field.into(), replacement);
        bad.push(Value::Record("Row".into(), fields));
    }
    let mut extra = original.clone();
    extra.insert("extra".into(), Value::Unit);
    bad.push(Value::Record("Row".into(), extra));
    let mut missing = original.clone();
    missing.remove("name");
    bad.push(Value::Record("Row".into(), missing));
    for value in bad {
        assert!(values.encode_row(&value, Limits::default()).is_err());
    }
    assert!(values
        .encode_key(&Value::U32(1), Limits::default())
        .is_err());
}
#[test]
fn decoder_rejects_noncanonical_width_utf8_arity_sort_and_open_terms() {
    let (module, cert, model, _) = fixture(false);
    let values = SourceValues::bind(&module, &cert, &model).unwrap();
    let valid = values
        .encode_row(&row(&module, -3), Limits::default())
        .unwrap();
    let mut bad = Vec::new();
    let mut width = valid.clone();
    *field_mut(&mut width, 8) = Term::U64(u32::MAX as u64 + 1);
    bad.push(width);
    let mut byte = valid.clone();
    *field_mut(field_mut(&mut byte, 0), 0) = Term::U64(256);
    bad.push(byte);
    let mut utf8 = valid.clone();
    *field_mut(field_mut(&mut utf8, 0), 0) = Term::U64(255);
    bad.push(utf8);
    let mut foreign = valid.clone();
    if let Term::Construct { datatype, .. } = field_mut(&mut foreign, 6) {
        *datatype = "unrelated".into();
    }
    bad.push(foreign);
    let mut arity = valid.clone();
    if let Term::Construct { arguments, .. } = &mut arity {
        arguments.pop();
    }
    bad.push(arity);
    let mut constructor = valid.clone();
    if let Term::Construct { constructor, .. } = field_mut(&mut constructor, 5) {
        *constructor = 99;
    }
    bad.push(constructor);
    let mut open = valid.clone();
    *field_mut(&mut open, 1) = Term::Var("x".into());
    bad.push(open);
    let mut computed = valid.clone();
    *field_mut(&mut computed, 8) = Term::Binary {
        op: "+".into(),
        left: Box::new(Term::U64(0)),
        right: Box::new(Term::U64(1)),
    };
    bad.push(computed);
    for term in bad {
        assert!(values.decode_row(&term, Limits::default()).is_err());
    }
    assert_eq!(
        values.decode_row(&valid, Limits::default()).unwrap(),
        row(&module, -3)
    );
}
#[test]
fn ordered_tables_preserve_full_id_words_and_reject_duplicate_or_foreign_keys() {
    for ledger in [false, true] {
        let (module, cert, model, names) = fixture(ledger);
        let values = SourceValues::bind(&module, &cert, &model).unwrap();
        assert!(values.table(&names["Natural"]).is_err());
        let table = values.table(&names["LayoutRows"]).unwrap();
        let (keys, value) = if ledger {
            (vec![Value::Id("AccountId".into(), 0), Value::Id("AccountId".into(), 1 << 64), Value::Id("AccountId".into(), u128::MAX)],
            Value::from_json(&serde_json::json!({"current":{"amount":{"Int":"2"},"label":"now"},"prior":{"amount":{"Int":"-2"},"label":"then"},"memo":{"None":null},"enabled":true}), &Type::Named("Ledger".into()), module.program()).unwrap())
        } else {
            (
                vec![Value::U64(0), Value::U64(1), Value::U64(u64::MAX)],
                row(&module, 1),
            )
        };
        let rows: Vec<_> = keys.into_iter().map(|key| (key, value.clone())).collect();
        let encoded = table.encode(&rows, Limits::default()).unwrap();
        assert_eq!(table.decode(&encoded, Limits::default()).unwrap(), rows);
        let mut reversed = rows.clone();
        reversed.reverse();
        assert!(table.encode(&reversed, Limits::default()).is_err());
        assert!(table
            .encode(&[rows[0].clone(), rows[0].clone()], Limits::default())
            .is_err());
        let mut duplicate = encoded.clone();
        let first = field_mut(&mut duplicate, 0).clone();
        *field_mut(field_mut(&mut duplicate, 2), 0) = first;
        assert!(table.decode(&duplicate, Limits::default()).is_err());
        if !ledger {
            let mut high = encoded.clone();
            *field_mut(field_mut(&mut high, 0), 0) = Term::U64(1);
            assert!(table.decode(&high, Limits::default()).is_err());
        } else {
            assert!(table
                .encode(
                    &[(Value::Id("OtherId".into(), 0), value)],
                    Limits::default()
                )
                .is_err());
        }
    }
}
#[test]
fn limits_are_checked_before_unary_expansion_and_do_not_limit_runtime_integers() {
    let (module, cert, model, _) = fixture(false);
    let values = SourceValues::bind(&module, &cert, &model).unwrap();
    let mut huge = row(&module, 0);
    let Value::Record(_, fields) = &mut huge else {
        unreachable!()
    };
    fields.insert(
        "value".into(),
        Value::Int(num_bigint::BigInt::from(1u8) << 10_000usize),
    );
    assert!(values
        .encode_row(&huge, Limits::default())
        .unwrap_err()
        .contains("bounded unary"));
    let valid = row(&module, 2);
    let term = values.encode_row(&valid, Limits::default()).unwrap();
    for limits in [
        Limits {
            nodes: 2,
            ..Limits::default()
        },
        Limits {
            depth: 2,
            ..Limits::default()
        },
        Limits {
            bytes: 1,
            ..Limits::default()
        },
        Limits {
            nodes: 100_001,
            ..Limits::default()
        },
    ] {
        assert!(values.encode_row(&valid, limits).is_err());
        assert!(values.decode_row(&term, limits).is_err());
    }
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    runtime
        .invoke("put", vec![Value::U64(0), huge.clone()])
        .unwrap();
    assert_eq!(
        runtime.invoke("row", vec![Value::U64(0)]).unwrap().result,
        Value::Option(Some(Box::new(huge)))
    );
}
#[test]
fn model_from_another_source_cannot_construct_a_bound_witness() {
    let (module, cert, mut model, _) = fixture(false);
    model.description.row_type = Type::Named("OtherRow".into());
    assert!(SourceValues::bind(&module, &cert, &model).is_err());
}

#[test]
fn u32_table_keys_are_checked_even_though_logic_uses_u64_words() {
    let (_, cert, old, names) = fixture(false);
    let source = include_str!("../examples/source-row-undo.ink")
        .replace("Table<u64,Row>", "Table<u32,Row>")
        .replace("key:u64", "key:u32");
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let mut model = verified_language::row_model::export(module.program(), "total", &cert).unwrap();
    // This source shares row and key-word definitions; the description still
    // binds its different source key type and module identity.
    model.library = old.library;
    let values = SourceValues::bind(&module, &cert, &model).unwrap();
    let table = values.table(&names["LayoutRows"]).unwrap();
    let actual = vec![(Value::U32(u32::MAX), row(&module, 0))];
    let term = table.encode(&actual, Limits::default()).unwrap();
    assert_eq!(table.decode(&term, Limits::default()).unwrap(), actual);
    let mut too_wide = term.clone();
    *field_mut(field_mut(&mut too_wide, 0), 1) = Term::U64(u32::MAX as u64 + 1);
    assert!(table.decode(&too_wide, Limits::default()).is_err());
    assert!(table
        .encode(&[(Value::U64(1), row(&module, 0))], Limits::default())
        .is_err());
}
