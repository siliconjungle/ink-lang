use num_bigint::BigInt;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{fs, path::Path};
use verified_language::{
    aggregate::{self, Certificate},
    library::{self, Object},
    logic::{Declaration, Proof, Term},
    stateful::Runtime,
    syntax::{parse, Expr},
};

fn certificate(name: &str) -> Certificate {
    serde_json::from_slice(
        &fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join(if ["table", "table-snapshot"].contains(&name) {
                    "knowledge/table-maintenance"
                } else if ["reversible", "snapshot"].contains(&name) {
                    "knowledge/reversible-maintenance"
                } else if name == "delta" {
                    "knowledge/delta-maintenance"
                } else {
                    "knowledge/exact-maintenance"
                })
                .join(format!("{name}.json")),
        )
        .unwrap(),
    )
    .unwrap()
}
fn rehash(c: &mut Certificate) {
    let bytes = serde_json::to_vec(&(
        c.version,
        &c.semantics,
        &c.insert,
        &c.replace,
        &c.remove,
        &c.evidence,
    ))
    .unwrap();
    c.id = format!("{:x}", Sha256::digest(bytes));
}
fn install_object(c: &mut Certificate, object: &Object) -> String {
    let data = serde_json::to_string(object).unwrap();
    let id = format!("{:x}", Sha256::digest(data.as_bytes()));
    let bundle = &mut c.evidence.as_mut().unwrap().library;
    bundle.lock.objects.push(id.clone());
    bundle.objects.insert(id.clone(), data);
    id
}
#[test]
fn exact_source_updates_use_database_proofs_for_unbounded_signed_values() {
    let huge = BigInt::from(1u32) << 512usize;
    let values = [
        -huge.clone(),
        -BigInt::from(1),
        BigInt::from(0),
        BigInt::from(1),
        huge,
    ];
    for name in [
        "canonical",
        "commuted",
        "delta",
        "reversible",
        "snapshot",
        "table",
        "table-snapshot",
    ] {
        let c = certificate(name);
        aggregate::verify(&c).unwrap();
        assert!(c.obligations.is_empty());
        let source = fs::read_to_string(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join(if ["table", "table-snapshot"].contains(&name) {
                    "knowledge/table-maintenance"
                } else if ["reversible", "snapshot"].contains(&name) {
                    "knowledge/reversible-maintenance"
                } else if name == "delta" {
                    "knowledge/delta-maintenance"
                } else {
                    "knowledge/exact-maintenance"
                })
                .join(format!("{name}.ink")),
        )
        .unwrap();
        let replay =
            aggregate::prove_database(&parse(&source).unwrap(), c.evidence.clone().unwrap())
                .unwrap();
        assert_eq!(replay.id, c.id);
        for total in &values {
            for old in &values {
                for new in &values {
                    assert_eq!(aggregate::update(&c, total, None, Some(new)), total + new);
                    assert_eq!(
                        aggregate::update(&c, total, Some(old), Some(new)),
                        total - old + new
                    );
                    assert_eq!(aggregate::update(&c, total, Some(old), None), total - old);
                    assert_eq!(aggregate::update(&c, total, None, None), *total);
                }
            }
        }
    }
    // Archived v1 identities/semantics still verify and retain broad constants.
    let legacy =
        aggregate::prove(&parse(include_str!("../knowledge/sum-maintenance.lang")).unwrap())
            .unwrap();
    aggregate::verify(&legacy).unwrap();
    assert_eq!(legacy.version, 1);
    assert!(legacy.evidence.is_none());
}
#[test]
fn delta_candidate_requires_its_new_proofs_and_exact_operation_order() {
    let c = certificate("delta");
    aggregate::verify(&c).unwrap();
    assert_eq!(c.evidence.as_ref().unwrap().library.objects.len(), 37);
    let mut bad = c.clone();
    bad.evidence.as_mut().unwrap().replace = certificate("canonical").evidence.unwrap().replace;
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("replace source update proof"));
    let mut bad = c.clone();
    let Expr::Binary(_, _, delta) = &mut bad.replace else {
        panic!()
    };
    let Expr::Binary(_, old, new) = delta.as_mut() else {
        panic!()
    };
    std::mem::swap(old, new);
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("replace source update proof"));
    let mut bad = c.clone();
    let evidence = bad.evidence.as_mut().unwrap();
    let Proof::Trans(first, _) = &evidence.replace else {
        panic!()
    };
    let Proof::Use { theorem, .. } = first.as_ref() else {
        panic!()
    };
    let id = theorem.clone();
    evidence.library.lock.objects.retain(|root| root != &id);
    // Leave no unreferenced object; the theorem is completely absent.
    evidence.library.objects.remove(&id);
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
}
#[test]
fn valid_database_math_cannot_change_source_meaning_or_hide_imports() {
    let c = certificate("canonical");
    let mut bad = c.clone();
    bad.replace = Expr::Binary(
        "+".into(),
        Box::new(Expr::Var("total".into())),
        Box::new(Expr::Var("new".into())),
    );
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("replace source update proof"));
    let mut bad = c.clone();
    bad.evidence.as_mut().unwrap().model.insert(
        "addition".into(),
        c.evidence.as_ref().unwrap().model["subtraction"].clone(),
    );
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("addition: database definition differs"));
    let mut bad = c.clone();
    let natural = bad.evidence.as_ref().unwrap().model["Natural"].clone();
    bad.evidence
        .as_mut()
        .unwrap()
        .library
        .lock
        .objects
        .retain(|id| id != &natural);
    library::load_bundle(&bad.evidence.as_ref().unwrap().library).unwrap();
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("Natural: unknown or undeclared"));

    // A newly checked, true theorem proving only expression=expression is
    // insufficient even with its new content hash and a freshly bound package.
    let mut bad = c.clone();
    let Proof::Use { theorem, .. } = &bad.evidence.as_ref().unwrap().insert else {
        panic!()
    };
    let old_id = theorem.clone();
    let mut object: Object =
        serde_json::from_str(&bad.evidence.as_ref().unwrap().library.objects[&old_id]).unwrap();
    let Declaration::Theorem {
        from, to, proof, ..
    } = &mut object.declaration
    else {
        panic!()
    };
    *to = from.clone();
    *proof = Proof::Refl(from.clone());
    object.name = "true but irrelevant".into();
    let new_id = install_object(&mut bad, &object);
    let evidence = bad.evidence.as_mut().unwrap();
    evidence.library.lock.objects.retain(|id| id != &old_id);
    evidence.library.objects.remove(&old_id);
    let Proof::Use { theorem, .. } = &mut evidence.insert else {
        panic!()
    };
    *theorem = new_id;
    library::load_bundle(&evidence.library).unwrap();
    rehash(&mut bad);
    assert!(aggregate::verify(&bad)
        .unwrap_err()
        .contains("insert source update proof"));

    // Unbound names, unsupported operators, large unary encodings and absent
    // proof evidence fail closed; they cannot fall through to v1 normalisation.
    for expr in [
        Expr::Var("old".into()),
        Expr::Num(u64::MAX),
        Expr::Binary(
            "*".into(),
            Box::new(Expr::Var("total".into())),
            Box::new(Expr::Num(1)),
        ),
    ] {
        let mut bad = c.clone();
        bad.insert = expr;
        rehash(&mut bad);
        assert!(aggregate::verify(&bad).is_err());
    }
    let mut bad = c.clone();
    bad.evidence = None;
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
    let mut bad = c.clone();
    bad.obligations.push(vec![]);
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
}
#[test]
fn portable_bundles_keep_hash_dependency_and_resource_checks() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/exact-integers/lock.json");
    let bundle = library::bundle(&path).unwrap();
    let disk = library::load(&path).unwrap();
    assert_eq!(library::load_bundle(&bundle).unwrap().closure, disk.closure);
    let id = bundle.lock.objects[0].clone();
    let mut bad = bundle.clone();
    bad.objects.get_mut(&id).unwrap().push(' ');
    assert!(library::load_bundle(&bad)
        .unwrap_err()
        .contains("hash mismatch"));
    let mut bad = bundle.clone();
    bad.objects.remove(&id);
    assert!(library::load_bundle(&bad)
        .unwrap_err()
        .contains("missing bundled"));
    let mut bad = bundle.clone();
    bad.lock.objects.push(id.clone());
    assert!(library::load_bundle(&bad)
        .unwrap_err()
        .contains("duplicate proof library root"));
    let mut bad = bundle.clone();
    bad.objects.insert("0".repeat(64), "{}".into());
    assert!(library::load_bundle(&bad)
        .unwrap_err()
        .contains("unreferenced"));
    let mut bad = bundle.clone();
    bad.objects
        .get_mut(&id)
        .unwrap()
        .push_str(&" ".repeat(4_000_001));
    assert!(library::load_bundle(&bad)
        .unwrap_err()
        .contains("byte budget"));
    let mut bad = certificate("canonical");
    let model = &bad.evidence.as_ref().unwrap().model;
    let object = Object {
        schema: 1,
        semantics: library::SEMANTICS.into(),
        name: "false scalar theorem".into(),
        dependencies: vec![model["Integer"].clone()],
        declaration: Declaration::Theorem {
            params: vec![],
            conditions: vec![],
            from: Term::Construct {
                datatype: model["Integer"].clone(),
                constructor: 0,
                arguments: vec![],
            },
            to: Term::Construct {
                datatype: model["Integer"].clone(),
                constructor: 0,
                arguments: vec![],
            },
            proof: Proof::Hypothesis(0),
        },
    };
    install_object(&mut bad, &object);
    rehash(&mut bad);
    assert!(aggregate::verify(&bad).is_err());
}

const APP: &str = r#"
module signed_cache;
record Row {value:Int, }
enum Error {Exists, Missing, Abort, }
record Changed {key:u64, value:Int, }
state Rows:Table<u64,Row> = Table.empty();
state Other:Table<u64,Row> = Table.empty();
keep other_total:Int=sum(Other.values().map(fn(row)=>row.value));
event changed:Changed;
keep total_value:Int=sum(Rows.values().map(fn(row)=>row.value));
keep selected:Int=sum(Rows.values().filter(fn(row)=>row.value > Int(0)).map(fn(row)=>row.value));
keep count_rows:Int=count(Rows.values());
query totals()->Int reads(total_value, selected, count_rows, other_total){return total_value + selected + count_rows + other_total;}
change put(key:u64,value:Int)->Result<Unit,Error> writes(Rows) emits(changed){
 if Rows.contains(key){return Err(Error.Exists);}Rows.insert(key,Row {value:value});
 emit changed(Changed {key:key,value:value});return Ok(());
}
change set(key:u64,value:Int)->Result<Int,Error> writes(Rows) reads(total_value) emits(changed){
 let row=Rows.get(key).ok_or(Error.Missing)?;Rows.replace(key,Row {value:value});
 emit changed(Changed {key:key,value:value});return Ok(total_value);
}
change remove(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Ok(());}
change fail(key:u64,value:Int)->Result<Unit,Error> writes(Rows) reads(total_value) emits(changed){
 set(key,value)?;set(key,value + Int(1))?;Rows.remove(key);Rows.remove(key);return Err(Error.Abort);
}
change cross(key:u64,value:Int)->Result<Unit,Error> writes(Rows,Other) reads(total_value) emits(changed){
 set(key,value)?;
 if Other.contains(key){Other.replace(key,Row {value:value});}else{Other.insert(key,Row {value:value});}
 return Err(Error.Abort);
}
change batch(a:u64,b:u64,value:Int)->Result<Int,Error> writes(Rows) reads(total_value) emits(changed){
 set(a,value)?;set(b,Int(0)-value)?;return Ok(total_value);
}
"#;
#[test]
fn database_cache_matches_scan_after_abort_batches_and_future_snapshot_changes() {
    let p = parse(APP).unwrap();
    let mut scan = Runtime::new(p.clone()).unwrap();
    let mut caches = [
        Runtime::new(p.clone()).unwrap(),
        Runtime::new(p.clone()).unwrap(),
        Runtime::new(p.clone()).unwrap(),
        Runtime::new(p.clone()).unwrap(),
        Runtime::new(p.clone()).unwrap(),
    ];
    let certs = [
        certificate("canonical"),
        certificate("commuted"),
        certificate("delta"),
        certificate("reversible"),
        certificate("snapshot"),
        certificate("table"),
        certificate("table-snapshot"),
    ];
    for (cache, c) in caches.iter_mut().zip(&certs) {
        assert_eq!(
            cache.enable_maintenance(c.clone()).unwrap(),
            vec!["count_rows", "other_total", "selected", "total_value"]
        );
    }
    let huge = (BigInt::from(1u32) << 512usize).to_string();
    let values = ["-3", "0", "7", "-1", huge.as_str()];
    let mut rng = 982137651u64;
    for step in 0..512 {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        let key = rng % 16;
        let value = values[step % values.len()];
        let (name, args) = match rng % 6 {
            0 => ("put", json!([key,{"Int":value}])),
            1 => ("set", json!([key,{"Int":value}])),
            2 => ("remove", json!([key])),
            3 => ("fail", json!([key,{"Int":value}])),
            4 => ("cross", json!([key,{"Int":value}])),
            _ => ("batch", json!([key,(key+1)%16,{"Int":value}])),
        };
        let before = scan.checkpoint_portable().unwrap();
        let expected = scan.invoke_json(name, &args).unwrap();
        if !expected.committed {
            assert_eq!(scan.checkpoint_portable().unwrap(), before);
        }
        let total = scan.invoke_json("totals", &json!([])).unwrap().json();
        let snapshot = scan.checkpoint_portable().unwrap();
        for (i, cache) in caches.iter_mut().enumerate() {
            assert_eq!(
                cache.invoke_json(name, &args).unwrap().json(),
                expected.json(),
                "{i} {step} {name}"
            );
            assert_eq!(
                cache.invoke_json("totals", &json!([])).unwrap().json(),
                total
            );
            assert_eq!(cache.checkpoint_portable().unwrap(), snapshot);
            if step % 73 == 0 {
                *cache = Runtime::restore_portable(p.clone(), &snapshot).unwrap();
                cache.enable_maintenance(certs[i].clone()).unwrap();
            }
        }
        if step % 101 == 0 {
            scan.acknowledge_through(scan.version(), u64::MAX);
            for cache in &mut caches {
                cache.acknowledge_through(cache.version(), u64::MAX);
            }
        }
    }
    // Failed selection preserves the active cache/state rather than partially
    // installing candidate totals or accepting an altered proof bundle.
    let before = caches[0].checkpoint_portable().unwrap();
    let mut bad = certs[0].clone();
    bad.replace = bad.insert.clone();
    rehash(&mut bad);
    assert!(caches[0].enable_maintenance(bad).is_err());
    assert_eq!(caches[0].checkpoint_portable().unwrap(), before);
    assert_eq!(
        caches[0].maintained_values(),
        vec!["count_rows", "other_total", "selected", "total_value"]
    );
    assert_eq!(
        caches[0].invoke_json("totals", &json!([])).unwrap().json(),
        scan.invoke_json("totals", &json!([])).unwrap().json()
    );
}

#[test]
fn compiled_database_updates_preserve_signed_state_events_and_checkpoints() {
    use std::process::Command;
    use verified_language::state_native;
    let program = parse(APP).unwrap();
    let huge = (BigInt::from(1u32) << 512usize).to_string();
    let negative = format!("-{huge}");
    let mut script = vec![];
    for i in 0..64u64 {
        let value = if i % 2 == 0 {
            huge.as_str()
        } else {
            negative.as_str()
        };
        script.push(json!({"call":"put","args":[i,{"Int":value}]}));
        script.push(json!({"call":"totals","args":[]}));
    }
    for i in 0..96u64 {
        let value = if i % 2 == 0 {
            negative.as_str()
        } else {
            huge.as_str()
        };
        let (name, args) = match i % 5 {
            0 => ("set", json!([i%64,{"Int":value}])),
            1 => ("fail", json!([i%64,{"Int":value}])),
            2 => ("batch", json!([i%64,(i+1)%64,{"Int":value}])),
            3 => ("cross", json!([i%64,{"Int":value}])),
            _ => ("remove", json!([i % 64])),
        };
        script.push(json!({"call":name,"args":args}));
        script.push(json!({"call":"totals","args":[]}));
    }
    let mut reference = Runtime::new(program.clone()).unwrap();
    let expected: Vec<_> = script
        .iter()
        .map(|step| {
            reference
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json()
        })
        .collect();
    let snapshot = reference.checkpoint_portable().unwrap();
    let root =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("build/database-maintenance-native-tests");
    let target = root.join("target");
    fs::create_dir_all(&root).unwrap();
    for name in [
        "canonical",
        "commuted",
        "delta",
        "reversible",
        "snapshot",
        "table",
        "table-snapshot",
    ] {
        let cert = certificate(name);
        let code = state_native::emit(&program, Some(&cert)).unwrap();
        assert!(!code.contains("verified_language"));
        assert!(!code.contains("Expr::"));
        let project = root.join(name);
        fs::create_dir_all(project.join("src")).unwrap();
        fs::write(project.join("src/lib.rs"), code).unwrap();
        fs::write(project.join("src/main.rs"), state_native::RUNNER).unwrap();
        fs::write(project.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
        let compile = Command::new(env!("CARGO"))
            .args(["build", "--offline", "--manifest-path"])
            .arg(project.join("Cargo.toml"))
            .env("CARGO_TARGET_DIR", &target)
            .output()
            .unwrap();
        assert!(
            compile.status.success(),
            "{}",
            String::from_utf8_lossy(&compile.stderr)
        );
        let path = project.join("script.json");
        fs::write(&path, serde_json::to_vec(&script).unwrap()).unwrap();
        let checkpoint = project.join("native.bin");
        let run = Command::new(target.join("debug/compiled-state"))
            .arg(&path)
            .arg("--snapshot-out")
            .arg(&checkpoint)
            .output()
            .unwrap();
        assert!(
            run.status.success(),
            "{}",
            String::from_utf8_lossy(&run.stderr)
        );
        let got: serde_json::Value = serde_json::from_slice(&run.stdout).unwrap();
        assert_eq!(got, json!(expected), "{name}");
        assert_eq!(fs::read(&checkpoint).unwrap(), snapshot, "{name}");
        let restored =
            Runtime::restore_portable(program.clone(), &fs::read(checkpoint).unwrap()).unwrap();
        assert_eq!(restored.checkpoint_portable().unwrap(), snapshot);
        // Restore in machine code too, then check future changes/observations.
        let mut continued = Runtime::restore_portable(program.clone(), &snapshot).unwrap();
        let tail = &script[128..];
        let expected: Vec<_> = tail
            .iter()
            .map(|step| {
                continued
                    .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                    .unwrap()
                    .json()
            })
            .collect();
        fs::write(&path, serde_json::to_vec(tail).unwrap()).unwrap();
        fs::write(project.join("restore.bin"), &snapshot).unwrap();
        let run = Command::new(target.join("debug/compiled-state"))
            .arg(&path)
            .arg("--restore")
            .arg(project.join("restore.bin"))
            .arg("--snapshot-out")
            .arg(project.join("continued.bin"))
            .output()
            .unwrap();
        assert!(
            run.status.success(),
            "{}",
            String::from_utf8_lossy(&run.stderr)
        );
        let got: serde_json::Value = serde_json::from_slice(&run.stdout).unwrap();
        assert_eq!(got, json!(expected));
        assert_eq!(
            fs::read(project.join("continued.bin")).unwrap(),
            continued.checkpoint_portable().unwrap()
        );
    }
}

#[test]
fn reversible_journal_checks_both_directions_and_exact_expression_scopes() {
    use aggregate::{restore_journal, update_journal, CacheUndo};
    let c = certificate("reversible");
    aggregate::verify(&c).unwrap();
    assert_eq!(c.version, 3);
    let huge = BigInt::from(1u8) << 8192usize;
    for total in [-huge.clone(), BigInt::from(0), huge] {
        let old = BigInt::from(-17);
        let new = BigInt::from(21);
        for (o, n) in [
            (None, Some(&new)),
            (Some(&old), Some(&new)),
            (Some(&old), None),
            (None, None),
        ] {
            let (next, undo) = update_journal(&c, &total, o, n);
            assert_eq!(next, aggregate::update(&c, &total, o, n));
            if let CacheUndo::Saved { value, .. } = &undo {
                assert!(value.bits() < 8);
            }
            assert_eq!(restore_journal(&c, &next, undo), total);
        }
    }
    // Hashing a forged candidate again grants no proof authority.
    for which in 0..7 {
        let mut bad = c.clone();
        let j = bad.evidence.as_mut().unwrap().journal.as_mut().unwrap();
        match which {
            0 => j.replace.restore = j.replace.apply.clone(),
            1 => j.replace.save = Expr::Var("new".into()),
            2 => j.insert.save = Expr::Var("old".into()),
            3 => j.remove.apply = Expr::Var("old".into()),
            4 => j.remove.inverse = j.insert.inverse.clone(),
            5 => bad.version = 2,
            _ => bad.evidence.as_mut().unwrap().journal = None,
        }
        rehash(&mut bad);
        assert!(aggregate::verify(&bad).is_err(), "forgery {which}");
    }
}

#[test]
fn reversible_journal_restores_all_writes_when_commit_sequence_is_exhausted() {
    use std::process::Command;
    use verified_language::{snapshot, snapshot_wire, state_native};
    let p = parse(APP).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    rt.invoke_json("put", &json!([0,{"Int":"-9"}])).unwrap();
    let layout = snapshot::layout(&p).unwrap();
    let limits = snapshot_wire::Limits::default();
    let mut logical =
        snapshot_wire::decode(&layout, &rt.checkpoint_portable().unwrap(), limits).unwrap();
    logical.version = u64::MAX;
    let bytes = snapshot_wire::encode(&layout, &logical, limits).unwrap();
    let c = certificate("reversible");
    let mut rt = Runtime::restore_portable(p.clone(), &bytes).unwrap();
    rt.enable_maintenance(c.clone()).unwrap();
    assert!(rt.invoke_json("set", &json!([0,{"Int":"21"}])).is_err());
    assert_eq!(rt.checkpoint_portable().unwrap(), bytes);
    assert!(
        !rt.invoke_json("fail", &json!([0,{"Int":"21"}]))
            .unwrap()
            .committed
    );
    assert_eq!(rt.checkpoint_portable().unwrap(), bytes);
    assert!(
        !rt.invoke_json("cross", &json!([0,{"Int":"21"}]))
            .unwrap()
            .committed
    );
    assert_eq!(rt.checkpoint_portable().unwrap(), bytes);
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/reversible-exhaustion-test");
    fs::create_dir_all(root.join("src")).unwrap();
    fs::write(
        root.join("src/lib.rs"),
        state_native::emit(&p, Some(&c)).unwrap(),
    )
    .unwrap();
    fs::write(root.join("snapshot.bin"), &bytes).unwrap();
    fs::write(
        root.join("src/main.rs"),
        r#"
use compiled_state::State;
use num_bigint::BigInt;
fn main(){
 let bytes=std::fs::read(std::env::args().nth(1).unwrap()).unwrap();
 let mut state=State::restore(&bytes).unwrap();
 assert_eq!(state.invoke_l_set(0,BigInt::from(21)).err().unwrap(),"commit sequence exhausted");
 assert_eq!(state.checkpoint().unwrap(),bytes);
 assert!(!state.invoke_l_fail(0,BigInt::from(21)).unwrap().committed);
 assert_eq!(state.checkpoint().unwrap(),bytes);
 assert!(!state.invoke_l_cross(0,BigInt::from(21)).unwrap().committed);
 assert_eq!(state.checkpoint().unwrap(),bytes);
}
"#,
    )
    .unwrap();
    fs::write(root.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
    let output = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let output = Command::new(root.join("target/debug/compiled-state"))
        .arg(root.join("snapshot.bin"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
