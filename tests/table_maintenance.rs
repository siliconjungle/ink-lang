use sha2::{Digest, Sha256};
use std::{fs, path::Path};
use verified_language::{
    aggregate::{self, Certificate},
    library::{self, Object},
    logic::{Declaration, Proof, Term},
    state_native,
    stateful::Runtime,
    syntax::{parse, Expr},
};
fn certificate() -> Certificate {
    serde_json::from_slice(
        &fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/table-maintenance/table.json"),
        )
        .unwrap(),
    )
    .unwrap()
}
fn rehash(c: &mut Certificate) {
    c.id = format!(
        "{:x}",
        Sha256::digest(
            serde_json::to_vec(&(
                c.version,
                &c.semantics,
                &c.insert,
                &c.replace,
                &c.remove,
                &c.evidence
            ))
            .unwrap()
        )
    );
}
fn call(id: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments: args,
    }
}
fn ctor(id: &str, index: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: index,
        arguments: args,
    }
}

#[test]
fn universal_keyed_history_proof_agrees_with_independent_first_match_table_execution() {
    let c = certificate();
    aggregate::verify(&c).unwrap();
    assert_eq!(c.version, 4);
    let evidence = c.evidence.as_ref().unwrap();
    let model = &evidence.table.as_ref().unwrap().model;
    let context = library::load_bundle(&evidence.library).unwrap().context;
    let integer = |n: i64| {
        let magnitude = n.unsigned_abs();
        let mut natural = ctor(&evidence.model["Natural"], 0, vec![]);
        for _ in 1..magnitude {
            natural = ctor(&evidence.model["Natural"], 1, vec![natural]);
        }
        ctor(
            &evidence.model["Integer"],
            if n == 0 {
                0
            } else if n > 0 {
                1
            } else {
                2
            },
            if n == 0 { vec![] } else { vec![natural] },
        )
    };
    let key = |k: u128| {
        ctor(
            &model["TableKey128"],
            0,
            vec![Term::U64((k >> 64) as u64), Term::U64(k as u64)],
        )
    };
    let rows = |rs: &Vec<(u128, i64)>| {
        rs.iter().rev().fold(
            ctor(&model["ContributionRows"], 0, vec![]),
            |tail, &(k, n)| {
                ctor(
                    &model["ContributionRows"],
                    1,
                    vec![key(k), integer(n), tail],
                )
            },
        )
    };
    let state = |rs: &Vec<(u128, i64)>| {
        ctor(
            &model["CachedContributionState"],
            0,
            vec![rows(rs), integer(rs.iter().map(|r| r.1).sum())],
        )
    };
    let keys = [0, 1, 1u128 << 64, u128::MAX];
    for seed in 0..24usize {
        // Duplicates are deliberate: the model changes the first match and
        // still maintains the sum of every row, including shadowed entries.
        let initial = if seed % 3 == 0 {
            vec![]
        } else {
            vec![(0, 1), (1, -2), (0, 2), (u128::MAX, -1)]
        };
        let mut expected_rows = initial.clone();
        let mut commands = Vec::new();
        let mut states = Vec::new();
        for i in 0..8 {
            let k = keys[(seed + i * 3) % 4];
            let n = if (seed + i) % 3 == 0 {
                None
            } else {
                Some(((seed + i) % 5) as i64 - 2)
            };
            let value = n
                .map(|n| ctor(&model["OptionalInteger"], 1, vec![integer(n)]))
                .unwrap_or_else(|| ctor(&model["OptionalInteger"], 0, vec![]));
            commands.push(ctor(&model["TableCommand"], 0, vec![key(k), value]));
            if let Some(position) = expected_rows.iter().position(|r| r.0 == k) {
                if let Some(n) = n {
                    expected_rows[position].1 = n;
                } else {
                    expected_rows.remove(position);
                }
            } else if let Some(n) = n {
                expected_rows.push((k, n));
            }
            states.push(state(&expected_rows));
        }
        let commands = commands
            .into_iter()
            .rev()
            .fold(ctor(&model["TableCommands"], 0, vec![]), |tail, c| {
                ctor(&model["TableCommands"], 1, vec![c, tail])
            });
        let expected = states
            .into_iter()
            .rev()
            .fold(ctor(&model["ContributionTrace"], 0, vec![]), |tail, s| {
                ctor(&model["ContributionTrace"], 1, vec![s, tail])
            });
        for name in ["reference_table_trace", "cached_table_trace"] {
            let input = if name == "reference_table_trace" {
                rows(&initial)
            } else {
                state(&initial)
            };
            assert_eq!(
                context
                    .evaluate(&[], &call(&model[name], vec![commands.clone(), input]))
                    .unwrap(),
                expected,
                "{seed} {name}"
            );
        }
    }
}

#[test]
fn rehashed_valid_math_cannot_change_table_meaning_or_source_arithmetic() {
    let c = certificate();
    let mut bad = c.clone();
    bad.evidence
        .as_mut()
        .unwrap()
        .table
        .as_mut()
        .unwrap()
        .history = Proof::Refl(Term::Var("commands".into()));
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("history proof"));
    let mut bad = c.clone();
    bad.evidence
        .as_mut()
        .unwrap()
        .table
        .as_mut()
        .unwrap()
        .model
        .remove("lookup_contribution");
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
    for name in ["table_key_equal", "cached_table_step", "write_contribution"] {
        let mut bad = c.clone();
        let evidence = bad.evidence.as_mut().unwrap();
        let table = evidence.table.as_mut().unwrap();
        let old = table.model[name].clone();
        let mut object: Object = serde_json::from_str(&evidence.library.objects[&old]).unwrap();
        if let Declaration::Function { body, .. } = &mut object.declaration {
            *body = match name {
                "table_key_equal" => Term::Bool(false),
                "cached_table_step" => Term::Var("state".into()),
                _ => Term::Var("rows".into()),
            };
        }
        let raw = serde_json::to_string(&object).unwrap();
        let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
        evidence.library.lock.objects.push(id.clone());
        evidence.library.objects.insert(id.clone(), raw);
        table.model.insert(name.into(), id);
        library::load_bundle(&evidence.library).unwrap(); // the new definition itself is legitimate
        rehash(&mut bad);
        assert!(aggregate::verify(&bad).unwrap_err().contains(name));
    }
    let mut bad = c.clone();
    let canonical: Certificate = serde_json::from_str(include_str!(
        "../knowledge/exact-maintenance/canonical.json"
    ))
    .unwrap();
    bad.replace = canonical.replace;
    let e = bad.evidence.as_mut().unwrap();
    e.replace = canonical.evidence.unwrap().replace;
    e.journal = None;
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("update_contribution_total"));
    let mut bad = c.clone();
    bad.version = 3;
    bad.semantics = verified_language::exact_maintenance::JOURNAL_SEMANTICS.into();
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
    let mut bad = c;
    bad.evidence.as_mut().unwrap().table = None;
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
}

#[test]
fn unsupported_key_domains_keep_scanning_and_have_no_bounded_cache_plan() {
    let p = parse(
        r#"module string_keys;
      state Rows:Table<String,u32> =Table.empty();
      keep exact_total:Int=sum(Rows.values().map(fn(row)=>Int(row)));
      enum Error {Missing,}
      change put(key:String,value:u32)->Result<Unit,Error> writes(Rows){
        if Rows.contains(key){Rows.replace(key,value);return Ok(());}
        Rows.insert(key,value);return Ok(());
      }
      query total()->Int reads(exact_total){return exact_total;}
    "#,
    )
    .unwrap();
    let c = certificate();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    assert!(runtime.enable_maintenance(c.clone()).unwrap().is_empty());
    for n in [7, 0, 12] {
        runtime
            .invoke_json("put", &serde_json::json!(["a", n]))
            .unwrap();
        assert_eq!(
            runtime
                .invoke_json("total", &serde_json::json!([]))
                .unwrap()
                .result
                .json(),
            serde_json::json!({"Int":n.to_string()})
        );
    }
    assert!(state_native::bounded_caches_with_certificate(&p, &c).is_empty());
    state_native::emit_with_bounds(&p, Some(&c), true).unwrap();
    // Older proof fragments retain their original supported selection scope.
    let old: Certificate = serde_json::from_str(include_str!(
        "../knowledge/reversible-maintenance/reversible.json"
    ))
    .unwrap();
    assert!(aggregate::plan_with_certificate(&p, &p.keeps[0], &old).is_some());
    assert!(matches!(&c.replace, Expr::Binary(_, _, _)));
}
