use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    aggregate::Certificate,
    core::CheckedModule,
    library::{self, Bundle},
    logic::{Context, Term},
    ordered_storage::OrderedStorage,
    row_model::{self, Model},
    source_values::{Limits, SourceValues},
    stateful::Value,
    syntax::{parse, Program, Type},
};

struct Layout {
    names: BTreeMap<String, String>,
    model: Model,
    context: Context,
    program: Program,
    values: SourceValues,
}
impl Layout {
    fn load(ledger: bool) -> Self {
        Self::load_version(ledger, false)
    }
    fn load_sorted(ledger: bool) -> Self {
        Self::load_version(ledger, true)
    }
    fn load_search(ledger: bool) -> Self {
        Self::load_folder(
            ledger,
            if ledger {
                "source-search-ledger"
            } else {
                "source-search-layout"
            },
            if ledger { 121 } else { 122 },
        )
    }
    fn load_version(ledger: bool, sorted: bool) -> Self {
        let name = match (sorted, ledger) {
            (false, false) => "source-column-layout",
            (false, true) => "source-column-ledger",
            (true, false) => "source-sorted-layout",
            (true, true) => "source-sorted-ledger",
        };
        Self::load_folder(
            ledger,
            name,
            if sorted {
                if ledger {
                    125
                } else {
                    128
                }
            } else {
                if ledger {
                    108
                } else {
                    111
                }
            },
        )
    }
    fn load_folder(ledger: bool, name: &str, count: usize) -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        let source = if ledger {
            "source-row-ledger"
        } else {
            "source-row-undo"
        };
        let folder = root.join("knowledge/research").join(name);
        let model: Model =
            serde_json::from_slice(&fs::read(folder.join("binding.json")).unwrap()).unwrap();
        let names = serde_json::from_slice(&fs::read(folder.join("names.json")).unwrap()).unwrap();
        let cert: Certificate = serde_json::from_slice(
            &fs::read(root.join("knowledge/research/table-maintenance/table.json")).unwrap(),
        )
        .unwrap();
        let program = parse(
            &fs::read_to_string(root.join("examples").join(format!("{source}.ink"))).unwrap(),
        )
        .unwrap();
        row_model::verify(&program, &cert, &model).unwrap();
        let context = library::load_bundle(&model.library).unwrap().context;
        assert_eq!(model.library.objects.len(), count);
        let module = CheckedModule::from_source(program.clone()).unwrap();
        let values = SourceValues::bind(&module, &cert, &model).unwrap();
        Self {
            values,
            names,
            model,
            context,
            program,
        }
    }
    fn ctor(&self, name: &str, constructor: usize, arguments: Vec<Term>) -> Term {
        self.raw(&self.names[name], constructor, arguments)
    }
    fn raw(&self, id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
        Term::Construct {
            datatype: id.into(),
            constructor,
            arguments,
        }
    }
    fn eval(&self, name: &str, arguments: Vec<Term>) -> Term {
        self.context
            .evaluate(
                &[],
                &Term::Call {
                    function: self.names[name].clone(),
                    arguments,
                },
            )
            .unwrap_or_else(|error| panic!("{name}: {error}"))
    }
    // Runtime inhabitants, encoded by the checked source bridge.
    fn value(&self, ty: &Type, seed: usize) -> Value {
        match ty {
            Type::U32 => Value::U32(if seed % 2 == 0 { 0 } else { u32::MAX }),
            Type::U64 => Value::U64(if seed % 2 == 0 { seed as u64 } else { u64::MAX }),
            Type::Bool => Value::Bool(seed % 3 != 0),
            Type::Int => Value::Int((seed as i64 % 5 - 2).into()),
            Type::String => Value::String(if seed % 2 == 0 { "λ" } else { "🖋" }.into()),
            Type::Named(name) if self.program.ids.contains(name) => {
                Value::Id(name.clone(), ((seed as u128) << 64) | u64::MAX as u128)
            }
            Type::Named(name) if self.program.records.contains_key(name) => Value::Record(
                name.clone(),
                self.program.records[name]
                    .iter()
                    .enumerate()
                    .map(|(i, (field, ty))| (field.clone(), self.value(ty, seed + i)))
                    .collect(),
            ),
            Type::Named(name) => Value::Enum(
                name.clone(),
                self.program.enums[name][seed % self.program.enums[name].len()].clone(),
            ),
            Type::List(inner) => {
                Value::List((0..seed % 3).map(|i| self.value(inner, seed + i)).collect())
            }
            Type::Option(inner) => Value::Option(if seed % 2 == 0 {
                None
            } else {
                Some(Box::new(self.value(inner, seed)))
            }),
            Type::Result(ok, error) => Value::Result(
                seed % 2 == 0,
                Box::new(self.value(if seed % 2 == 0 { ok } else { error }, seed)),
            ),
            _ => panic!("unexpected fixture type"),
        }
    }
    fn row(&self, seed: usize) -> Term {
        let value = self.value(&self.model.description.row_type, seed);
        let term = self.values.encode_row(&value, Limits::default()).unwrap();
        assert_eq!(
            self.values.decode_row(&term, Limits::default()).unwrap(),
            value
        );
        term
    }
    fn source_key(&self, key: u128) -> Value {
        match &self.model.description.key_type {
            Type::U64 => Value::U64(key.try_into().unwrap()),
            Type::U32 => Value::U32(key.try_into().unwrap()),
            Type::Named(name) => Value::Id(name.clone(), key),
            _ => unreachable!(),
        }
    }
    fn key(&self, key: u128) -> Term {
        let input = self
            .values
            .encode_key(&self.source_key(key), Limits::default())
            .unwrap();
        self.context
            .evaluate(
                &[],
                &Term::Call {
                    function: self.model.description.key_projection.clone(),
                    arguments: vec![input],
                },
            )
            .unwrap()
    }
    fn optional(&self, value: Option<Term>) -> Term {
        self.ctor(
            "LayoutOptionalRow",
            if value.is_some() { 1 } else { 0 },
            value.into_iter().collect(),
        )
    }
    fn rows(&self, rows: &BTreeMap<u128, Term>) -> Term {
        let rows: Vec<_> = rows
            .iter()
            .map(|(&key, term)| {
                (
                    self.source_key(key),
                    self.values.decode_row(term, Limits::default()).unwrap(),
                )
            })
            .collect();
        let table = self.values.table(&self.names["LayoutRows"]).unwrap();
        let term = table.encode(&rows, Limits::default()).unwrap();
        assert_eq!(table.decode(&term, Limits::default()).unwrap(), rows);
        term
    }
    fn lanes(columns: &Term) -> Vec<Term> {
        let Term::Construct { arguments, .. } = columns else {
            panic!("not columns")
        };
        arguments.clone()
    }
}

fn natural_position(m: &Layout, mut term: Term) -> usize {
    let mut position = 0;
    loop {
        let Term::Construct {
            datatype,
            constructor,
            mut arguments,
        } = term
        else {
            panic!("not a natural")
        };
        assert_eq!(datatype, m.names["Natural"]);
        if constructor == 0 {
            assert!(arguments.is_empty());
            return position;
        }
        assert_eq!(constructor, 1);
        assert_eq!(arguments.len(), 1);
        position += 1;
        assert!(position < 128);
        term = arguments.remove(0);
    }
}

#[test]
fn complete_search_cuts_match_binary_search_and_native_mutations_at_every_prefix() {
    let mut prefixes = 0;
    let mut queries = 0;
    for ledger in [false, true] {
        let m = Layout::load_search(ledger);
        let mut domain = vec![0, 1, 2, 3, u64::MAX as u128 - 1, u64::MAX as u128];
        if ledger {
            domain.extend([1u128 << 64, (1u128 << 64) + 1, u128::MAX - 1, u128::MAX]);
        }
        let writes = [domain[0], domain[2], domain[4], *domain.last().unwrap()];
        for seed in 0..2 {
            let mut expected = BTreeMap::new();
            for &key in writes.iter().take(seed + 1) {
                expected.insert(key, m.row(seed));
            }
            let mut native = vec![
                OrderedStorage::rows(None),
                OrderedStorage::columns(None),
                OrderedStorage::rows(Some(2)),
                OrderedStorage::columns(Some(2)),
            ];
            for store in &mut native {
                for (&key, row) in &expected {
                    store.insert(key, row.clone());
                }
            }
            let mut rows = m.rows(&expected);
            for i in 0..32 {
                let key = writes[(i * 3 + seed) % writes.len()];
                let new = if i % 7 == 6 {
                    None
                } else {
                    Some(m.row(seed * 32 + i + 1))
                };
                let cut = m.eval("search_locate", vec![rows.clone(), m.key(key)]);
                let next = m.eval(
                    "search_apply",
                    vec![cut, m.key(key), m.optional(new.clone())],
                );
                assert_eq!(
                    next,
                    m.eval(
                        "layout_row_write",
                        vec![rows.clone(), m.key(key), m.optional(new.clone())]
                    )
                );
                let old = match &new {
                    Some(value) => expected.insert(key, value.clone()),
                    None => expected.remove(&key),
                };
                for store in &mut native {
                    store.get(&domain[(i + 1) % domain.len()]);
                    let actual = match &new {
                        Some(value) => store.insert(key, value.clone()),
                        None => store.remove(&key),
                    };
                    assert_eq!(actual, old);
                    assert_eq!(
                        store
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>(),
                        expected
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>()
                    );
                }
                rows = next;
                assert_eq!(rows, m.rows(&expected));
                assert_eq!(m.eval("sorted_rows", vec![rows.clone()]), Term::Bool(true));
                prefixes += 1;
                let keys = expected.keys().copied().collect::<Vec<_>>();
                let entries = expected
                    .iter()
                    .map(|(&k, v)| (k, v.clone()))
                    .collect::<Vec<_>>();
                for &query in &domain {
                    let cut = m.eval("search_locate", vec![rows.clone(), m.key(query)]);
                    assert_eq!(m.eval("search_rebuild", vec![cut.clone()]), rows);
                    assert_eq!(
                        m.eval("search_cut_valid", vec![cut.clone(), m.key(query)]),
                        Term::Bool(true)
                    );
                    assert_eq!(
                        m.eval("search_value", vec![cut.clone()]),
                        m.optional(expected.get(&query).cloned())
                    );
                    let index = m.eval("search_position", vec![cut.clone()]);
                    let rank = natural_position(&m, index.clone());
                    let hit = m.eval("search_has_entry", vec![cut.clone()]) == Term::Bool(true);
                    let result = if hit { Ok(rank) } else { Err(rank) };
                    assert_eq!(keys.binary_search(&query), result);
                    assert_eq!(entries.binary_search_by(|(k, _)| k.cmp(&query)), result);
                    if let Some(value) = expected.get(&query) {
                        let entry = m.ctor("SearchEntry", 1, vec![m.key(query), value.clone()]);
                        assert_eq!(m.eval("search_entry_at", vec![rows.clone(), index]), entry);
                        assert_eq!(m.eval("search_cut_entry", vec![cut.clone()]), entry);
                    }
                    let proposal = if (i + query.count_ones() as usize) % 3 == 0 {
                        None
                    } else {
                        Some(m.row(i + 91))
                    };
                    let mut changed = expected.clone();
                    if let Some(value) = &proposal {
                        changed.insert(query, value.clone());
                    } else {
                        changed.remove(&query);
                    }
                    assert_eq!(
                        m.eval(
                            "search_apply",
                            vec![cut, m.key(query), m.optional(proposal)]
                        ),
                        m.rows(&changed)
                    );
                    for store in &native {
                        assert_eq!(store.get(&query), expected.get(&query));
                    }
                    queries += 1;
                }
            }
            assert!(native[2].is_tree() && native[3].is_tree());
        }
    }
    assert_eq!(prefixes, 128);
    assert_eq!(queries, 1024);
}

#[test]
fn search_reconstruction_alone_does_not_admit_unsorted_or_duplicate_maps() {
    for ledger in [false, true] {
        let m = Layout::load_search(ledger);
        for keys in [[2, 1], [1, 1]] {
            let rows = keys
                .iter()
                .rev()
                .fold(m.ctor("LayoutRows", 0, vec![]), |tail, &key| {
                    m.ctor("LayoutRows", 1, vec![m.key(key), m.row(key as usize), tail])
                });
            let cut = m.eval("search_locate", vec![rows.clone(), m.key(1)]);
            assert_eq!(m.eval("search_rebuild", vec![cut.clone()]), rows);
            assert_eq!(
                m.eval("search_cut_valid", vec![cut.clone(), m.key(1)]),
                Term::Bool(false)
            );
            assert_eq!(m.eval("sorted_rows", vec![rows.clone()]), Term::Bool(false));
            if keys == [2, 1] {
                assert_ne!(
                    m.eval("search_value", vec![cut]),
                    m.eval("layout_row_lookup", vec![rows, m.key(1)])
                );
            }
        }
    }
}

#[test]
fn rehashed_false_search_gap_payload_position_and_validity_models_fail() {
    for ledger in [false, true] {
        let m = Layout::load_search(ledger);
        for target in [
            "search_locate",
            "search_apply",
            "search_value",
            "search_position",
            "search_cut_entry",
            "search_rows_below",
            "search_suffix_above",
            "search_found_key",
            "search_cut_valid",
        ] {
            let error = library::load_bundle(&changed_bundle(&m, target))
                .err()
                .expect("false search model accepted");
            assert!(
                !error.contains("hash mismatch")
                    && !error.contains("missing")
                    && !error.contains("undeclared"),
                "{target}: {error}"
            );
        }
    }
}

#[test]
fn source_bound_layouts_match_native_ordered_storage_and_tree_after_every_write() {
    for ledger in [false, true] {
        let m = Layout::load(ledger);
        let mut domain = vec![0, 1, 2, 3, 7, 8, 16, 17, 31, 255, 65535, u64::MAX as u128];
        if ledger {
            domain.extend([
                1u128 << 64,
                (1u128 << 64) + 1,
                (1u128 << 127) + 1,
                u128::MAX,
            ]);
        }
        for seed in 0..4 {
            let mut expected = BTreeMap::new();
            for i in 0..seed {
                expected.insert(domain[i], m.row(seed + i));
            }
            let initial = m.rows(&expected);
            let mut replay_start = initial.clone();
            let mut replay_length = expected.len();
            let mut rows = initial.clone();
            let mut columns = m.eval("layout_encode", vec![initial.clone()]);
            let mut native = vec![
                OrderedStorage::rows(None),
                OrderedStorage::columns(None),
                OrderedStorage::rows(Some(4)),
                OrderedStorage::columns(Some(4)),
            ];
            for store in &mut native {
                for (&key, value) in &expected {
                    store.insert(key, value.clone());
                }
            }
            let mut history = Vec::new();
            for i in 0..64 {
                let key = domain[(i * 5 + seed) % domain.len()];
                let value = if i >= domain.len() && i % 3 == 0 {
                    None
                } else {
                    Some(m.row(i + seed))
                };
                let old = expected.get(&key).cloned();
                let write = m.ctor(
                    "LayoutWrite",
                    0,
                    vec![m.key(key), m.optional(value.clone())],
                );
                rows = m.eval("layout_row_step", vec![rows, write.clone()]);
                columns = m.eval("layout_column_step", vec![columns, write.clone()]);
                history.push(write);
                match &value {
                    Some(v) => {
                        expected.insert(key, v.clone());
                    }
                    None => {
                        expected.remove(&key);
                    }
                }
                for store in &mut native {
                    // The previous hint is deliberately unrelated to the edit.
                    store.get(&domain[(i * 5 + seed + 1) % domain.len()]);
                    let returned = match &value {
                        Some(v) => store.insert(key, v.clone()),
                        None => store.remove(&key),
                    };
                    assert_eq!(returned, old);
                    assert_eq!(
                        store
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>(),
                        expected
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>()
                    );
                    assert_eq!(
                        store.values().cloned().collect::<Vec<_>>(),
                        expected.values().cloned().collect::<Vec<_>>()
                    );
                    assert_eq!(store.len(), expected.len());
                }
                let ordered = m.rows(&expected);
                assert_eq!(rows, ordered);
                assert_eq!(m.eval("layout_decode", vec![columns.clone()]), ordered);
                assert_eq!(
                    m.eval("layout_column_aligned", vec![columns.clone()]),
                    Term::Bool(true)
                );
                let lanes = Layout::lanes(&columns);
                for query in [
                    key,
                    domain[(i + 3) % domain.len()],
                    domain[(i + 7) % domain.len()],
                ] {
                    let expected_value = m.optional(expected.get(&query).cloned());
                    assert_eq!(
                        m.eval("layout_row_lookup", vec![rows.clone(), m.key(query)]),
                        expected_value
                    );
                    assert_eq!(
                        m.eval(
                            "layout_column_lookup",
                            vec![lanes[0].clone(), lanes[1].clone(), m.key(query)]
                        ),
                        expected_value
                    );
                    for store in &native {
                        assert_eq!(store.get(&query), expected.get(&query));
                    }
                }
                // The universal history theorem is checked symbolically. Its
                // deliberately bounded proof evaluator also replays 2-write
                // blocks on small stores. Every larger prefix is still checked
                // above through the actual one-step definitions and all four
                // native stores, without expanding an entire symbolic history.
                if i % 2 == 1 {
                    let commands = history
                        .iter()
                        .rev()
                        .fold(m.ctor("LayoutWrites", 0, vec![]), |tail, w| {
                            m.ctor("LayoutWrites", 1, vec![w.clone(), tail])
                        });
                    if replay_length <= 4 && expected.len() <= 4 {
                        assert_eq!(
                            m.eval(
                                "layout_row_execute",
                                vec![commands.clone(), replay_start.clone()]
                            ),
                            rows
                        );
                        assert_eq!(
                            m.eval(
                                "layout_column_execute",
                                vec![commands, m.eval("layout_encode", vec![replay_start])]
                            ),
                            columns
                        );
                    }
                    history.clear();
                    replay_start = rows.clone();
                    replay_length = expected.len();
                }
            }
            assert!(native[2].is_tree() && native[3].is_tree());
        }
    }
}

#[test]
fn alignment_checker_exposes_truncated_zip_in_malformed_external_columns() {
    for ledger in [false, true] {
        let m = Layout::load(ledger);
        let keys = m.ctor(
            "LayoutKeys",
            1,
            vec![m.key(1), m.ctor("LayoutKeys", 0, vec![])],
        );
        let values = m.ctor(
            "LayoutValues",
            1,
            vec![m.row(0), m.ctor("LayoutValues", 0, vec![])],
        );
        for lanes in [
            [keys.clone(), m.ctor("LayoutValues", 0, vec![])],
            [m.ctor("LayoutKeys", 0, vec![]), values.clone()],
            [keys, values],
        ] {
            let columns = m.ctor("LayoutColumns", 0, lanes.to_vec());
            let aligned = m.eval("layout_column_aligned", vec![columns.clone()]);
            let roundtrip = m.eval(
                "layout_encode",
                vec![m.eval("layout_decode", vec![columns.clone()])],
            );
            assert_eq!(aligned == Term::Bool(true), columns == roundtrip);
        }
    }
}

fn rewrite(value: &mut serde_json::Value, ids: &BTreeMap<String, String>) {
    match value {
        serde_json::Value::String(s) => {
            if let Some(id) = ids.get(s) {
                *s = id.clone();
            }
        }
        serde_json::Value::Array(xs) => {
            for x in xs {
                rewrite(x, ids);
            }
        }
        serde_json::Value::Object(xs) => {
            for x in xs.values_mut() {
                rewrite(x, ids);
            }
        }
        _ => (),
    }
}
fn changed_bundle(m: &Layout, target: &str) -> Bundle {
    let mut bundle = m.model.library.clone();
    bundle.objects.clear();
    let mut ids = BTreeMap::new();
    for old in &m.model.library.lock.objects {
        let mut object: serde_json::Value =
            serde_json::from_str(&m.model.library.objects[old]).unwrap();
        rewrite(&mut object, &ids);
        if object["name"] == target {
            let body = &mut object["declaration"]["Function"]["body"];
            match target {
                "layout_zip" => {
                    body["Match"]["branches"][1]["body"]["Match"]["branches"][1]["body"] =
                        serde_json::json!({"SelfCall":[{"Var":"key_tail"},{"Var":"value_tail"}]})
                }
                "layout_column_prepend" => {
                    body["Match"]["branches"][0]["body"]["Construct"]["arguments"][1] =
                        serde_json::json!({"Var":"values"})
                }
                "layout_column_overlay" => {
                    body["Match"]["branches"][1]["body"]["Construct"]["arguments"][1] =
                        serde_json::json!({"Var":"values"})
                }
                "layout_column_lookup" => {
                    body["Match"]["branches"][1]["body"]["Match"]["branches"][1]["body"]["If"]
                        ["on_false"] = body["Match"]["branches"][1]["body"]["Match"]["branches"][1]
                        ["body"]["If"]["on_true"]
                        .clone()
                }
                "layout_aligned" => *body = serde_json::json!({"Bool":true}),
                "layout_key_less" | "sorted_rows" | "sorted_rows_above" | "sorted_unique"
                | "sorted_excludes" => {
                    *body = serde_json::json!({"Bool": target != "layout_key_less"})
                }
                "layout_row_write" => *body = serde_json::json!({"Var":"rows"}),
                "search_locate" => {
                    *body = serde_json::json!({"Construct":{"datatype":ids.get(&m.names["SearchCut"]).unwrap_or(&m.names["SearchCut"]),"constructor":0,
                        "arguments":[{"Construct":{"datatype":ids.get(&m.names["LayoutRows"]).unwrap_or(&m.names["LayoutRows"]),"constructor":0,"arguments":[]}}, {"Var":"rows"}]}});
                }
                "search_apply" => {
                    for branch in body["Match"]["branches"].as_array_mut().unwrap() {
                        branch["body"] = serde_json::json!({"Var":"prefix"});
                    }
                }
                "search_value" | "search_cut_entry" => {
                    let name = if target == "search_value" {
                        "LayoutOptionalRow"
                    } else {
                        "SearchEntry"
                    };
                    *body = serde_json::json!({"Construct":{"datatype":ids.get(&m.names[name]).unwrap_or(&m.names[name]),"constructor":0,"arguments":[]}});
                }
                "search_position" => {
                    *body = serde_json::json!({"Construct":{"datatype":ids.get(&m.names["Natural"]).unwrap_or(&m.names["Natural"]),"constructor":0,"arguments":[]}});
                }
                "search_rows_below"
                | "search_suffix_above"
                | "search_found_key"
                | "search_cut_valid" => {
                    *body = serde_json::json!({"Bool":true});
                }
                _ => unreachable!(),
            }
        }
        let raw = serde_json::to_string(&object).unwrap();
        let new = format!("{:x}", Sha256::digest(raw.as_bytes()));
        ids.insert(old.clone(), new.clone());
        bundle.objects.insert(new, raw);
    }
    bundle.lock.objects = bundle
        .lock
        .objects
        .iter()
        .map(|old| ids[old].clone())
        .collect();
    bundle
}

#[test]
fn rehashed_dropped_payload_wrong_lookup_and_false_alignment_proofs_are_rejected() {
    for ledger in [false, true] {
        let m = Layout::load(ledger);
        for target in [
            "layout_zip",
            "layout_column_prepend",
            "layout_column_overlay",
            "layout_column_lookup",
            "layout_aligned",
        ] {
            let error = library::load_bundle(&changed_bundle(&m, target))
                .err()
                .expect("false layout accepted");
            assert!(
                !error.contains("hash mismatch")
                    && !error.contains("missing")
                    && !error.contains("undeclared"),
                "{target}: {error}"
            );
        }
    }
}

#[test]
fn sorted_unique_invariants_hold_through_source_row_and_column_writes() {
    for ledger in [false, true] {
        let m = Layout::load_sorted(ledger);
        let keys = if ledger {
            [0, 1, 1u128 << 64, u128::MAX]
        } else {
            [0, 1, 2, u64::MAX as u128]
        };
        for seed in 0..2 {
            let mut expected = BTreeMap::new();
            for &key in &keys[..seed] {
                expected.insert(key, m.row(seed));
            }
            let mut rows = m.rows(&expected);
            let mut columns = m.eval("layout_encode", vec![rows.clone()]);
            let mut native = [OrderedStorage::rows(None), OrderedStorage::columns(None)];
            for store in &mut native {
                for (&key, value) in &expected {
                    store.insert(key, value.clone());
                }
            }
            for i in 0..32 {
                let key = keys[(i * 3 + seed) % keys.len()];
                let value = if i > 4 && i % 3 == 0 {
                    None
                } else {
                    Some(m.row(i + seed))
                };
                let write = m.ctor(
                    "LayoutWrite",
                    0,
                    vec![m.key(key), m.optional(value.clone())],
                );
                rows = m.eval("layout_row_step", vec![rows, write.clone()]);
                columns = m.eval("layout_column_step", vec![columns, write]);
                match &value {
                    Some(v) => {
                        expected.insert(key, v.clone());
                    }
                    None => {
                        expected.remove(&key);
                    }
                }
                assert_eq!(m.eval("sorted_rows", vec![rows.clone()]), Term::Bool(true));
                assert_eq!(
                    m.eval("sorted_unique", vec![rows.clone()]),
                    Term::Bool(true)
                );
                assert_eq!(
                    m.eval("sorted_columns", vec![columns.clone()]),
                    Term::Bool(true)
                );
                assert_eq!(
                    m.eval("layout_decode", vec![columns.clone()]),
                    m.rows(&expected)
                );
                for store in &mut native {
                    store.get(&keys[(i + 1) % keys.len()]);
                    match &value {
                        Some(v) => {
                            store.insert(key, v.clone());
                        }
                        None => {
                            store.remove(&key);
                        }
                    }
                    assert_eq!(
                        store
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>(),
                        expected
                            .iter()
                            .map(|(&k, v)| (k, v.clone()))
                            .collect::<Vec<_>>()
                    );
                }
            }
        }
    }
}

#[test]
fn order_guards_reject_reversal_duplicates_and_high_word_aliases() {
    for ledger in [false, true] {
        let m = Layout::load_sorted(ledger);
        let domain = [
            0,
            1,
            u64::MAX as u128,
            1u128 << 64,
            (1u128 << 64) + 1,
            1u128 << 127,
            u128::MAX - 1,
            u128::MAX,
        ];
        let raw_key = |k: u128| {
            m.ctor(
                "TableKey128",
                0,
                vec![Term::U64((k >> 64) as u64), Term::U64(k as u64)],
            )
        };
        let mut less = BTreeMap::new();
        for &a in &domain {
            for &b in &domain {
                let actual = m.eval("layout_key_less", vec![raw_key(a), raw_key(b)]);
                assert_eq!(actual, Term::Bool(a < b));
                assert_eq!(
                    m.eval("table_key_equal", vec![raw_key(a), raw_key(b)]),
                    Term::Bool(a == b)
                );
                less.insert((a, b), actual == Term::Bool(true));
            }
        }
        for &a in &domain {
            for &b in &domain {
                for &c in &domain {
                    assert!(!(less[&(a, b)] && less[&(b, c)]) || less[&(a, c)]);
                }
            }
        }
        for (keys, sorted, unique) in [
            (vec![0, 1, 1u128 << 64], true, true),
            (vec![1, 0], false, true),
            (vec![0, 0], false, false),
            (vec![1u128 << 64, 0], false, true),
            (vec![u128::MAX, u128::MAX], false, false),
        ] {
            let rows = keys
                .iter()
                .rev()
                .fold(m.ctor("LayoutRows", 0, vec![]), |tail, &key| {
                    m.ctor("LayoutRows", 1, vec![raw_key(key), m.row(0), tail])
                });
            assert_eq!(
                m.eval("sorted_rows", vec![rows.clone()]),
                Term::Bool(sorted)
            );
            assert_eq!(m.eval("sorted_unique", vec![rows]), Term::Bool(unique));
        }
        let short_values = m.ctor(
            "LayoutColumns",
            0,
            vec![
                m.ctor(
                    "LayoutKeys",
                    1,
                    vec![raw_key(1), m.ctor("LayoutKeys", 0, vec![])],
                ),
                m.ctor("LayoutValues", 0, vec![]),
            ],
        );
        assert_eq!(
            m.eval("sorted_columns", vec![short_values]),
            Term::Bool(false)
        );
        let short_keys = m.ctor(
            "LayoutColumns",
            0,
            vec![
                m.ctor("LayoutKeys", 0, vec![]),
                m.ctor(
                    "LayoutValues",
                    1,
                    vec![m.row(0), m.ctor("LayoutValues", 0, vec![])],
                ),
            ],
        );
        assert_eq!(
            m.eval("sorted_columns", vec![short_keys]),
            Term::Bool(false)
        );
    }
}

#[test]
fn rehashed_false_order_predicates_and_unimplemented_writes_are_rejected() {
    for ledger in [false, true] {
        let m = Layout::load_sorted(ledger);
        for target in [
            "layout_key_less",
            "layout_row_write",
            "sorted_rows_above",
            "sorted_rows",
            "sorted_unique",
            "sorted_excludes",
        ] {
            let error = library::load_bundle(&changed_bundle(&m, target))
                .err()
                .expect("false sorted model accepted");
            assert!(
                !error.contains("hash mismatch")
                    && !error.contains("missing")
                    && !error.contains("undeclared"),
                "{target}: {error}"
            );
        }
    }
}
