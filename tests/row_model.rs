use serde_json::{json, Value as Json};
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    aggregate::Certificate,
    core::CheckedModule,
    library::{self, Object},
    logic::{Declaration, Sort, Term},
    row_model::{self, Model},
    source_values::{Limits, SourceValues},
    stateful::{Runtime, Value},
    syntax::{parse, Program, Type},
};

const SOURCE: &str = include_str!("../examples/source-row-undo.ink");
fn cert(snapshot: bool) -> Certificate {
    serde_json::from_str(if snapshot {
        include_str!("../knowledge/research/table-maintenance/table-snapshot.json")
    } else {
        include_str!("../knowledge/research/table-maintenance/table.json")
    })
    .unwrap()
}
fn ctor(id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor,
        arguments,
    }
}
fn call(id: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments,
    }
}
fn integer(c: &Certificate, n: i64) -> Term {
    let exact = &c.evidence.as_ref().unwrap().model;
    let natural = (1..n.unsigned_abs()).fold(ctor(&exact["Natural"], 0, vec![]), |tail, _| {
        ctor(&exact["Natural"], 1, vec![tail])
    });
    ctor(
        &exact["Integer"],
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
fn encode(model: &Model, p: &Program, c: &Certificate, ty: &Type, value: &Value) -> Term {
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let values = SourceValues::bind(&module, c, model).unwrap();
    if ty == &model.description.key_type {
        values.encode_key(value, Limits::default()).unwrap()
    } else {
        assert_eq!(ty, &model.description.row_type);
        let term = values.encode_row(value, Limits::default()).unwrap();
        assert_eq!(values.decode_row(&term, Limits::default()).unwrap(), *value);
        term
    }
}
fn row(seed: usize) -> Json {
    json!({
        "name":if seed%2==0{"λ"}else{"hi"},"value":{"Int":(seed as i64%5-2).to_string()},
        "detail":{"bias":{"Int":(seed as i64%3-1).to_string()},"active":seed%3!=0},
        "note":if seed%2==0{json!({"None":null})}else{json!({"Some":"é"})},
        "words":if seed%2==0{json!([])}else{json!([0,u64::MAX])},
        "status":if seed%2==0{"Status.Ready"}else{"Status.Paused"},
        "marker":"ffffffffffffffff0000000000000001",
        "response":if seed%2==0{json!({"Ok":{"Int":"-1"}})}else{json!({"Err":"Status.Paused"})},
        "count":if seed%2==0{0}else{u32::MAX}
    })
}

#[test]
fn actual_source_shapes_and_filtered_projection_agree_with_reference_and_undo() {
    let p = parse(SOURCE).unwrap();
    let ty = Type::Named("Row".into());
    for (snapshot, folder) in [(false, "reversible"), (true, "snapshot")] {
        let c = cert(snapshot);
        let generated = row_model::export(&p, "total", &c).unwrap();
        row_model::verify(&p, &c, &generated).unwrap();
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("knowledge/research/source-row-undo")
            .join(folder);
        let disk: Model =
            serde_json::from_slice(&fs::read(root.join("source-model.json")).unwrap()).unwrap();
        assert_eq!(generated.description, disk.description);
        assert_eq!(generated.library.objects, disk.library.objects);
        let ids: BTreeMap<String, String> =
            serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
        let bundle = serde_json::from_slice(&fs::read(root.join("bundle.json")).unwrap()).unwrap();
        let mut extended = disk.clone();
        extended.library = bundle;
        extended.row_binding = Some(row_model::RowBinding {
            wrapper: ids["StoredRow"].clone(),
            projection: ids["stored_row_part"].clone(),
        });
        row_model::verify(&p, &c, &extended).unwrap();
        let context = library::load_bundle(&extended.library).unwrap().context;
        let nil = ctor(&ids["OverrideRows"], 0, vec![]);
        let empty = ctor(
            &ids["RowJournalMachine"],
            0,
            vec![nil, integer(&c, 0), ctor(&ids["StoredRowUndos"], 0, vec![])],
        );
        let key = ctor(&ids["TableKey128"], 0, vec![Term::U64(0), Term::U64(1)]);
        let mut machine = empty.clone();
        for key in [0, 1, u64::MAX] {
            assert_eq!(
                context
                    .evaluate(
                        &[],
                        &call(&generated.description.key_projection, vec![Term::U64(key)])
                    )
                    .unwrap(),
                ctor(&ids["TableKey128"], 0, vec![Term::U64(0), Term::U64(key)])
            );
        }
        let mut reference = Runtime::new(p.clone()).unwrap();
        for seed in 0..12 {
            let row = row(seed);
            let value = Value::from_json(&row, &ty, &p).unwrap();
            let payload = encode(&generated, &p, &c, &ty, &value);
            let want = if seed % 3 == 0 {
                0
            } else {
                seed as i64 % 5 - 2 + seed as i64 % 3 - 1
            };
            assert_eq!(
                context
                    .evaluate(
                        &[],
                        &call(&generated.description.projection, vec![payload.clone()])
                    )
                    .unwrap(),
                integer(&c, want)
            );
            let stored = ctor(
                &ids["OptionalStoredRow"],
                1,
                vec![ctor(&ids["StoredRow"], 0, vec![payload.clone()])],
            );
            let command = ctor(&ids["StoredRowWrite"], 0, vec![key.clone(), stored.clone()]);
            machine = context
                .evaluate(&[], &call(&ids["step_row_journal"], vec![machine, command]))
                .unwrap();
            let Term::Construct { arguments, .. } = &machine else {
                panic!("machine")
            };
            assert_eq!(arguments[1], integer(&c, want));
            let view = ctor(&ids["RowCacheView"], 0, arguments[..2].to_vec());
            assert_eq!(
                context
                    .evaluate(
                        &[],
                        &call(&ids["observe_stored_view"], vec![view, key.clone()])
                    )
                    .unwrap(),
                ctor(
                    &ids["RowCacheObservation"],
                    0,
                    vec![stored, integer(&c, want)]
                )
            );
            let rollback = call(&ids["rollback_row_journal"], vec![machine.clone()]);
            let initial = call(&ids["rollback_row_journal"], vec![empty.clone()]);
            assert_eq!(
                context
                    .evaluate(
                        &[],
                        &call(&ids["observe_stored_view"], vec![rollback, key.clone()])
                    )
                    .unwrap(),
                context
                    .evaluate(
                        &[],
                        &call(&ids["observe_stored_view"], vec![initial, key.clone()])
                    )
                    .unwrap()
            );
            reference.invoke_json("put", &json!([1, row])).unwrap();
            assert_eq!(
                reference
                    .invoke_json("value", &json!([]))
                    .unwrap()
                    .result
                    .json(),
                json!({"Int":want.to_string()})
            );
        }
    }
}

#[test]
fn a_different_nested_row_and_nominal_key_use_the_same_generic_source_bridge() {
    let p = parse(include_str!("../examples/source-row-ledger.ink")).unwrap();
    for (snapshot, folder) in [(false, "reversible"), (true, "snapshot")] {
        let c = cert(snapshot);
        let model = row_model::export(&p, "balance", &c).unwrap();
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("knowledge/research/source-row-ledger")
            .join(folder);
        let disk: Model =
            serde_json::from_slice(&fs::read(root.join("source-model.json")).unwrap()).unwrap();
        assert_eq!(model.description, disk.description);
        assert_eq!(model.library.objects, disk.library.objects);
        let ids: BTreeMap<String, String> =
            serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
        let mut extended = disk;
        extended.library =
            serde_json::from_slice(&fs::read(root.join("bundle.json")).unwrap()).unwrap();
        extended.row_binding = Some(row_model::RowBinding {
            wrapper: ids["StoredRow"].clone(),
            projection: ids["stored_row_part"].clone(),
        });
        row_model::verify(&p, &c, &extended).unwrap();
        let context = library::load_bundle(&extended.library).unwrap().context;
        let initial = ctor(
            &ids["RowJournalMachine"],
            0,
            vec![
                ctor(&ids["OverrideRows"], 0, vec![]),
                integer(&c, 0),
                ctor(&ids["StoredRowUndos"], 0, vec![]),
            ],
        );
        for seed in 0..8 {
            let key = [0u128, 1, 1u128 << 64, u128::MAX][seed % 4];
            let native_key = Value::from_json(
                &json!(format!("{key:032x}")),
                &Type::Named("AccountId".into()),
                &p,
            )
            .unwrap();
            let key_term = context
                .evaluate(
                    &[],
                    &call(
                        &model.description.key_projection,
                        vec![encode(
                            &model,
                            &p,
                            &c,
                            &Type::Named("AccountId".into()),
                            &native_key,
                        )],
                    ),
                )
                .unwrap();
            assert_eq!(
                key_term,
                ctor(
                    &ids["TableKey128"],
                    0,
                    vec![Term::U64((key >> 64) as u64), Term::U64(key as u64)]
                )
            );
            let row = json!({"current":{"amount":{"Int":(seed as i64-4).to_string()},"label":"current"},
                "prior":{"amount":{"Int":(seed as i64%3-1).to_string()},"label":"prior"},
                "memo":if seed%2==0{json!({"None":null})}else{json!({"Some":"λ"})},"enabled":seed%2==1});
            let value = Value::from_json(&row, &Type::Named("Ledger".into()), &p).unwrap();
            let payload = encode(&model, &p, &c, &Type::Named("Ledger".into()), &value);
            let want = if seed % 2 == 0 {
                0
            } else {
                seed as i64 - 4 - (seed as i64 % 3 - 1)
            };
            assert_eq!(
                context
                    .evaluate(
                        &[],
                        &call(&model.description.projection, vec![payload.clone()])
                    )
                    .unwrap(),
                integer(&c, want)
            );
            let command = ctor(
                &ids["StoredRowWrite"],
                0,
                vec![
                    key_term.clone(),
                    ctor(
                        &ids["OptionalStoredRow"],
                        1,
                        vec![ctor(&ids["StoredRow"], 0, vec![payload])],
                    ),
                ],
            );
            let machine = context
                .evaluate(
                    &[],
                    &call(&ids["step_row_journal"], vec![initial.clone(), command]),
                )
                .unwrap();
            let Term::Construct { arguments, .. } = &machine else {
                panic!("machine")
            };
            assert_eq!(arguments[1], integer(&c, want));
            let undo = context
                .evaluate(
                    &[],
                    &call(
                        &ids["observe_stored_view"],
                        vec![
                            call(&ids["rollback_row_journal"], vec![machine]),
                            key_term.clone(),
                        ],
                    ),
                )
                .unwrap();
            assert_eq!(
                undo,
                context
                    .evaluate(
                        &[],
                        &call(
                            &ids["observe_stored_view"],
                            vec![
                                call(&ids["rollback_row_journal"], vec![initial.clone()]),
                                key_term
                            ]
                        )
                    )
                    .unwrap()
            );
            let mut reference = Runtime::new(p.clone()).unwrap();
            reference
                .invoke_json("put", &json!([format!("{key:032x}"), row]))
                .unwrap();
            assert_eq!(
                reference
                    .invoke_json("value", &json!([]))
                    .unwrap()
                    .result
                    .json(),
                json!({"Int":want.to_string()})
            );
        }
    }
}

#[test]
fn valid_but_wrong_source_projection_or_payload_shapes_do_not_bind() {
    let p = parse(SOURCE).unwrap();
    let c = cert(false);
    let model = row_model::export(&p, "total", &c).unwrap();
    let mut bad = model.clone();
    let old = bad.description.projection.clone();
    let mut object: Object = serde_json::from_str(&bad.library.objects[&old]).unwrap();
    if let Declaration::Function { body, .. } = &mut object.declaration {
        *body = integer(&c, 1);
    }
    object
        .dependencies
        .push(c.evidence.as_ref().unwrap().model["Natural"].clone());
    object.dependencies.sort();
    object.dependencies.dedup();
    let raw = serde_json::to_string(&object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    bad.library.lock.objects.push(id.clone());
    bad.library.objects.insert(id.clone(), raw);
    library::load_bundle(&bad.library).unwrap(); // legitimate unrelated math
    bad.description.projection = id;
    assert!(row_model::verify(&p, &c, &bad)
        .unwrap_err()
        .contains("description"));
    for changed in [
        SOURCE.replace("row.value+row.detail.bias", "row.value-row.detail.bias"),
        SOURCE.replace("name:String,", "name:Option<String>,"),
        SOURCE.replace("detail:Detail,", "detail:Detail, extra:Int,"),
    ] {
        assert!(row_model::verify(&parse(&changed).unwrap(), &c, &model).is_err());
    }
    assert!(row_model::verify(&p, &cert(true), &model).is_err());
    let mut bad = model;
    bad.library.objects.remove(&bad.description.projection);
    assert!(row_model::verify(&p, &c, &bad).is_err());
    let root =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/source-row-undo/reversible");
    let mut bad: Model =
        serde_json::from_slice(&fs::read(root.join("binding.json")).unwrap()).unwrap();
    let binding = bad.row_binding.as_mut().unwrap();
    let mut object: Object =
        serde_json::from_str(&bad.library.objects[&binding.projection]).unwrap();
    if let Declaration::Function { body, .. } = &mut object.declaration {
        *body = integer(&c, 0);
    }
    let raw = serde_json::to_string(&object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    bad.library.lock.objects.push(id.clone());
    bad.library.objects.insert(id.clone(), raw);
    binding.projection = id;
    library::load_bundle(&bad.library).unwrap();
    assert!(row_model::verify(&p, &c, &bad)
        .unwrap_err()
        .contains("projection adapter"));
}

#[test]
fn source_binding_requires_actual_semantic_closure_and_direct_definitions() {
    for (source, keep, folder) in [
        (SOURCE, "total", "source-row-undo"),
        (
            include_str!("../examples/source-row-ledger.ink"),
            "balance",
            "source-row-ledger",
        ),
    ] {
        let program = parse(source).unwrap();
        for (snapshot, variant) in [(false, "reversible"), (true, "snapshot")] {
            let certificate = cert(snapshot);
            let original = row_model::export(&program, keep, &certificate).unwrap();
            let mut minimal = original.clone();
            minimal.library =
                library::project(&original.library, &original.description.definitions).unwrap();
            assert!(minimal.library.objects.len() < original.library.objects.len());
            assert_eq!(minimal.description, original.description);
            row_model::verify(&program, &certificate, &minimal).unwrap();
            for (id, raw) in &minimal.library.objects {
                assert_eq!(Some(raw), original.library.objects.get(id));
            }
            let mut empty = original.clone();
            empty.library = library::project(&original.library, &[]).unwrap();
            assert!(row_model::verify(&program, &certificate, &empty).is_err());

            // This row datatype remains an internal function dependency, so
            // the library still checks. Source binding demands a direct root.
            let Sort::Data(row_id) = &minimal.description.row_sort else {
                panic!("row sort")
            };
            let mut hidden = minimal.clone();
            hidden.library.lock.objects.retain(|id| id != row_id);
            library::load_bundle(&hidden.library).unwrap();
            assert!(row_model::verify(&program, &certificate, &hidden)
                .unwrap_err()
                .contains("source row definition"));
            let mut damaged = minimal.clone();
            let ancestor = minimal
                .library
                .objects
                .keys()
                .find(|id| !minimal.description.definitions.contains(id))
                .unwrap();
            damaged.library.objects.remove(ancestor);
            assert!(row_model::verify(&program, &certificate, &damaged).is_err());
            assert!(row_model::verify(&program, &cert(!snapshot), &minimal).is_err());

            // Complete source payload wrappers remain valid after pruning all
            // unrelated journal theorems; wrapper shapes are still checked.
            let root = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("knowledge/research")
                .join(folder)
                .join(variant);
            let mut extended: Model =
                serde_json::from_slice(&fs::read(root.join("binding.json")).unwrap()).unwrap();
            let binding = extended.row_binding.as_ref().unwrap();
            let mut roots = extended.description.definitions.clone();
            roots.extend([binding.wrapper.clone(), binding.projection.clone()]);
            extended.library = library::project(&extended.library, &roots).unwrap();
            row_model::verify(&program, &certificate, &extended).unwrap();
            assert!(extended.library.objects.len() < original.library.objects.len());
        }
    }
}

#[test]
fn width_cast_and_recursive_types_fail_closed_while_count_works() {
    let c = cert(false);
    // u32 arithmetic before the cast needs its exact modular width: fail closed.
    let p = parse(&SOURCE.replace("row.value+row.detail.bias", "Int(row.count+1)")).unwrap();
    assert!(row_model::export(&p, "total", &c).is_err());
    // A direct unsigned field cast is a faithful exact embedding.
    let p = parse(&SOURCE.replace("row.value+row.detail.bias", "Int(row.count)")).unwrap();
    let model = row_model::export(&p, "total", &c).unwrap();
    row_model::verify(&p, &c, &model).unwrap();
    let context = library::load_bundle(&model.library).unwrap().context;
    for seed in 0..6 {
        let json = row(seed);
        let value = Value::from_json(&json, &Type::Named("Row".into()), &p).unwrap();
        let input = encode(&model, &p, &c, &Type::Named("Row".into()), &value);
        let count = json["count"].as_u64().unwrap() as i64;
        let want = if json["detail"]["active"].as_bool().unwrap() { count } else { 0 };
        if want > 40 {
            // Concrete unary exact integers this large exceed kernel depth;
            // tests/view_decomposition.rs checks small values exactly.
            continue;
        }
        assert_eq!(
            context
                .evaluate(&[], &call(&model.description.projection, vec![input]))
                .unwrap(),
            integer(&c, want)
        );
    }
    let recursive = SOURCE.replace("note:Option<String>", "note:Option<Row>");
    assert!(row_model::export(&parse(&recursive).unwrap(), "total", &c).is_err());
    let count=SOURCE.replace("sum(Rows.values().filter(fn(row)=>row.detail.active).map(fn(row)=>row.value+row.detail.bias))","count(Rows.values().filter(fn(row)=>row.count>0))");
    let p = parse(&count).unwrap();
    let model = row_model::export(&p, "total", &c).unwrap();
    let context = library::load_bundle(&model.library).unwrap().context;
    for seed in 0..4 {
        let value = Value::from_json(&row(seed), &Type::Named("Row".into()), &p).unwrap();
        let input = encode(&model, &p, &c, &Type::Named("Row".into()), &value);
        assert_eq!(
            context
                .evaluate(&[], &call(&model.description.projection, vec![input]))
                .unwrap(),
            integer(&c, (seed % 2) as i64)
        );
    }
}
