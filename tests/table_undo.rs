use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};
use verified_language::{
    library::{self, Bundle},
    logic::{Context, Term},
};

struct Model {
    ids: BTreeMap<String, String>,
    context: Context,
    bundle: Bundle,
}
impl Model {
    fn load(folder: &str) -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("knowledge/research")
            .join(folder);
        let ids = serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
        let bundle: Bundle =
            serde_json::from_slice(&fs::read(root.join("bundle.json")).unwrap()).unwrap();
        let context = library::load_bundle(&bundle).unwrap().context;
        assert_eq!(
            library::load(&root.join("lock.json"))
                .unwrap()
                .closure
                .len(),
            96
        );
        Self {
            ids,
            context,
            bundle,
        }
    }
    fn ctor(&self, name: &str, constructor: usize, arguments: Vec<Term>) -> Term {
        Term::Construct {
            datatype: self.ids[name].clone(),
            constructor,
            arguments,
        }
    }
    fn call(&self, name: &str, arguments: Vec<Term>) -> Term {
        Term::Call {
            function: self.ids[name].clone(),
            arguments,
        }
    }
    fn eval(&self, name: &str, arguments: Vec<Term>) -> Term {
        self.context
            .evaluate(&[], &self.call(name, arguments))
            .unwrap()
    }
    fn integer(&self, n: i64) -> Term {
        let mut natural = self.ctor("Natural", 0, vec![]);
        for _ in 1..n.unsigned_abs() {
            natural = self.ctor("Natural", 1, vec![natural]);
        }
        self.ctor(
            "Integer",
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
    fn key(&self, k: u128) -> Term {
        self.ctor(
            "TableKey128",
            0,
            vec![Term::U64((k >> 64) as u64), Term::U64(k as u64)],
        )
    }
    fn row(&self, value: &Option<(Vec<u64>, i64)>) -> Term {
        match value {
            None => self.ctor("OptionalStoredRow", 0, vec![]),
            Some((payload, n)) => {
                let words = payload
                    .iter()
                    .rev()
                    .fold(self.ctor("RowPayloadWords", 0, vec![]), |tail, &word| {
                        self.ctor("RowPayloadWords", 1, vec![Term::U64(word), tail])
                    });
                self.ctor(
                    "OptionalStoredRow",
                    1,
                    vec![self.ctor("StoredRow", 0, vec![words, self.integer(*n)])],
                )
            }
        }
    }
    fn observe(&self, machine: Term, key: u128, rollback: bool) -> Term {
        let view = if rollback {
            self.eval("rollback_row_journal", vec![machine])
        } else if let Term::Construct { arguments, .. } = machine {
            self.ctor("RowCacheView", 0, arguments[..2].to_vec())
        } else {
            panic!("non-machine")
        };
        self.eval("observe_stored_view", vec![view, self.key(key)])
    }
}

#[test]
fn complete_payload_and_cache_undo_matches_independent_map_for_every_prefix() {
    let keys = [0, 1, 1u128 << 64, (1u128 << 64) | 1, u128::MAX];
    for folder in ["table-undo", "table-undo-snapshot"] {
        let m = Model::load(folder);
        for seed in 0..12usize {
            let mut rows = m.ctor("OverrideRows", 0, vec![]);
            let mut expected = BTreeMap::new();
            for (i, &key) in keys[..3].iter().enumerate() {
                let row = Some((vec![i as u64, u64::MAX], i as i64 - 1));
                rows = m.ctor("OverrideRows", 1, vec![m.key(key), m.row(&row), rows]);
                expected.insert(key, row.unwrap());
            }
            // The theorem is independent of the cache invariant. An offset
            // catches accidental recomputation instead of exact restoration.
            let mut total = 3;
            let initial = m.ctor(
                "RowJournalMachine",
                0,
                vec![rows, m.integer(total), m.ctor("StoredRowUndos", 0, vec![])],
            );
            let mut machine = initial.clone();
            let mut writes = Vec::new();
            for i in 0..7usize {
                let key = keys[(seed + i / 2) % keys.len()]; // repeated keys
                let new = if i % 3 == 2 {
                    None
                } else {
                    Some((
                        vec![seed as u64, i as u64, u64::MAX],
                        (i / 2) as i64 % 3 - 1,
                    ))
                };
                let old = expected.remove(&key);
                total += new.as_ref().map_or(0, |x| x.1) - old.as_ref().map_or(0, |x| x.1);
                if let Some(ref row) = new {
                    expected.insert(key, row.clone());
                }
                let command = m.ctor("StoredRowWrite", 0, vec![m.key(key), m.row(&new)]);
                machine = m.eval("step_row_journal", vec![machine, command.clone()]);
                writes.push(command);
                for &query in &keys {
                    assert_eq!(
                        m.observe(machine.clone(), query, false),
                        m.ctor(
                            "RowCacheObservation",
                            0,
                            vec![m.row(&expected.get(&query).cloned()), m.integer(total)]
                        ),
                        "forward {folder} {seed}/{i}/{query}"
                    );
                    assert_eq!(
                        m.observe(machine.clone(), query, true),
                        m.observe(initial.clone(), query, false),
                        "undo {folder} {seed}/{i}/{query}"
                    );
                }
                let commands = writes
                    .iter()
                    .rev()
                    .fold(m.ctor("StoredRowWrites", 0, vec![]), |tail, command| {
                        m.ctor("StoredRowWrites", 1, vec![command.clone(), tail])
                    });
                assert_eq!(
                    m.eval("execute_row_writes", vec![commands, initial.clone()]),
                    machine
                );
                // Start with an already nonempty undo stack and continue it.
                let again = m.eval(
                    "execute_row_writes",
                    vec![
                        m.ctor(
                            "StoredRowWrites",
                            1,
                            vec![writes[0].clone(), m.ctor("StoredRowWrites", 0, vec![])],
                        ),
                        machine.clone(),
                    ],
                );
                for &query in &keys {
                    assert_eq!(
                        m.observe(again.clone(), query, true),
                        m.observe(initial.clone(), query, false)
                    );
                }
            }
        }
    }
}

fn rewrite_ids(value: &mut serde_json::Value, replacements: &BTreeMap<String, String>) {
    match value {
        serde_json::Value::String(s) => {
            if let Some(new) = replacements.get(s) {
                *s = new.clone();
            }
        }
        serde_json::Value::Array(a) => {
            for v in a {
                rewrite_ids(v, replacements);
            }
        }
        serde_json::Value::Object(o) => {
            for v in o.values_mut() {
                rewrite_ids(v, replacements);
            }
        }
        _ => (),
    }
}

// Rebuild the entire content-addressed closure, including proof references.
// Rejection must result from false semantics/proofs, not a stale content hash.
fn hostile_bundle(model: &Model, target: &str) -> Bundle {
    let mut bundle = model.bundle.clone();
    bundle.objects.clear();
    let mut ids = BTreeMap::new();
    for old in &model.bundle.lock.objects {
        let mut value: serde_json::Value =
            serde_json::from_str(&model.bundle.objects[old]).unwrap();
        rewrite_ids(&mut value, &ids);
        if value["name"] == target {
            let body = &mut value["declaration"]["Function"]["body"];
            match target {
                "table_key_equal" => {
                    let scalar = &body["Match"]["branches"][0]["body"]["Match"]["branches"][0]
                        ["body"]["Binary"]["right"];
                    *body = serde_json::json!({"Match":{"scrutinee":{"Var":"a"},"branches":[{"bindings":["ahi","alo"],"body":{"Match":{"scrutinee":{"Var":"b"},"branches":[{"bindings":["bhi","blo"],"body":scalar}]}}}]}});
                }
                "step_row_journal" => {
                    let frame = &mut body["Match"]["branches"][0]["body"]["Match"]["branches"][0]
                        ["body"]["Construct"]["arguments"][2]["Construct"]["arguments"][0]
                        ["Construct"]["arguments"];
                    frame[1] = serde_json::json!({"Var":"new"}); // equal totals can hide wrong payload
                }
                "rollback_stored_frames" => (),
                "restore_exact_cache" => *body = serde_json::json!({"Var":"total"}),
                _ => unreachable!(),
            }
            if target == "rollback_stored_frames" {
                // Drop the newest frame: well-typed, terminating, but false.
                *body = serde_json::json!({"Match":{"scrutinee":{"Var":"frames"},"branches":[
                    {"bindings":[],"body":model.ctor("RowCacheView",0,vec![Term::Var("rows".into()),Term::Var("total".into())])},
                    {"bindings":["frame","tail"],"body":{"SelfCall":[{"Var":"tail"},{"Var":"rows"},{"Var":"total"}]}}]}});
                rewrite_ids(body, &ids);
            }
        }
        let raw = serde_json::to_string(&value).unwrap();
        let new = format!("{:x}", Sha256::digest(raw.as_bytes()));
        ids.insert(old.clone(), new.clone());
        bundle.objects.insert(new, raw);
    }
    bundle.lock.objects = model
        .bundle
        .lock
        .objects
        .iter()
        .map(|old| ids[old].clone())
        .collect();
    bundle
}

#[test]
fn rehashed_false_key_payload_restore_and_dropped_frames_are_rejected() {
    for folder in ["table-undo", "table-undo-snapshot"] {
        let model = Model::load(folder);
        for name in [
            "table_key_equal",
            "step_row_journal",
            "restore_exact_cache",
            "rollback_stored_frames",
        ] {
            let bad = hostile_bundle(&model, name);
            let error = library::load_bundle(&bad)
                .err()
                .expect("false changed model was accepted");
            assert!(!error.contains("hash mismatch"), "{name}: {error}");
            assert!(!error.contains("undeclared"), "{name}: {error}");
            assert!(!error.contains("missing"), "{name}: {error}");
        }
    }
}
