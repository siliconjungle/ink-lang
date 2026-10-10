use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{aggregate, state_native, stateful::Runtime, syntax::parse};

// Cargo serializes compilation, but another test can replace this shared
// executable between build and run. Hold the lock across each native suite.
static NATIVE_EXECUTION: std::sync::Mutex<()> = std::sync::Mutex::new(());

const EXTRA: &str = r#"
keep expensive: Int = sum(Items.values().filter(fn(item) => item.stock > 100).map(fn(item) => Int(item.stock) * Int(item.stock)).map(fn(x) => x));
keep large_count: Int = count(Items.values().filter(fn(item) => item.stock > 100));
query derived() -> Int reads(expensive, large_count) { return expensive + large_count; }
change delete(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Ok(()); }
change fail(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 7)?; restock(id, 9)?; return Err(Error.Overflow); }
change add_and_read(id: ItemId) -> Result<Int, Error> writes(Items) reads(total_units) emits(stock_changed) { restock(id, 3)?; return Ok(total_units); }
change delete_and_fail(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Err(Error.Overflow); }
change ignore_failure(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 1); return Ok(()); }
query arithmetic(x:u32) -> u32 {return (x * 7) + 3;}
query negative() -> Int {return Int(2) - Int(5);}
query literal() -> Result<u32, Error> {return Ok(3);}
query empty() -> Option<u32> {return None;}
"#;

fn compile_and_run(dir: &Path, code: &str, script: &[Value]) -> Value {
    compile_and_run_with_runner(dir, code, script, verified_language::runtime::STATE_RUNNER)
}
fn compile_and_run_with_runner(dir: &Path, code: &str, script: &[Value], runner: &str) -> Value {
    fs::create_dir_all(dir.join("src")).unwrap();
    fs::write(dir.join("src/lib.rs"), code).unwrap();
    fs::write(dir.join("src/main.rs"), runner).unwrap();
    fs::write(dir.join("Cargo.toml"), "[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
    let output = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--manifest-path"])
        .arg(dir.join("Cargo.toml"))
        .env(
            "CARGO_TARGET_DIR",
            dir.parent().unwrap().join("native-test-target"),
        )
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    fs::write(dir.join("script.json"), serde_json::to_vec(script).unwrap()).unwrap();
    let run = Command::new(
        dir.parent()
            .unwrap()
            .join("native-test-target/debug/compiled-state"),
    )
    .arg(dir.join("script.json"))
    .output()
    .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    serde_json::from_slice(&run.stdout).unwrap()
}

fn migrate_and_continue(
    dir: &Path,
    p: &verified_language::syntax::Program,
    script: &[Value],
    carry: &mut Option<Vec<u8>>,
) {
    let mut rt = if let Some(bytes) = carry.as_ref() {
        Runtime::restore_portable(p.clone(), bytes).unwrap()
    } else {
        let mut rt = Runtime::new(p.clone()).unwrap();
        for step in &script[..500] {
            rt.invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap();
        }
        rt.acknowledge_through(rt.version().saturating_sub(1), u64::MAX);
        rt
    };
    let before = rt.checkpoint_portable().unwrap();
    fs::write(dir.join("restore.bin"), &before).unwrap();
    let steps = &script[500..1000];
    let expected: Vec<_> = steps
        .iter()
        .map(|s| {
            rt.invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    fs::write(
        dir.join("continue.json"),
        serde_json::to_vec(steps).unwrap(),
    )
    .unwrap();
    let run = Command::new(
        dir.parent()
            .unwrap()
            .join("native-test-target/debug/compiled-state"),
    )
    .arg(dir.join("continue.json"))
    .arg("--restore")
    .arg(dir.join("restore.bin"))
    .arg("--snapshot-out")
    .arg(dir.join("native.bin"))
    .output()
    .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let got: Value = serde_json::from_slice(&run.stdout).unwrap();
    assert_eq!(got, json!(expected));
    let bytes = fs::read(dir.join("native.bin")).unwrap();
    assert_eq!(bytes, rt.checkpoint_portable().unwrap());
    let restored = Runtime::restore_portable(p.clone(), &bytes).unwrap();
    assert_eq!(restored.checkpoint_portable().unwrap(), bytes);
    *carry = Some(bytes);
}

#[test]
fn native_state_matches_reference_with_and_without_checked_maintenance() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let source = format!("{}\n{EXTRA}", include_str!("../examples/inventory.lang"));
    let p = parse(&source).unwrap();
    let c = aggregate::prove(
        &parse(include_str!("../knowledge/research/sum-maintenance.lang")).unwrap(),
    )
    .unwrap();
    let mut script = vec![
        json!({"call":"total","args":[]}),
        json!({"call":"derived","args":[]}),
    ];
    let mut rng = 0x123456789abcdefu64;
    for step in 0..2000 {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        let key = format!("{:032x}", rng % 50);
        let count = if step % 17 == 0 {
            u32::MAX as u64
        } else {
            rng % 400
        };
        let (name, args) = match rng % 8 {
            0 => ("create", json!([key, "part", count])),
            1 => ("restock", json!([key, count])),
            2 => ("delete", json!([key])),
            3 => ("fail", json!([key])),
            4 => ("add_and_read", json!([key])),
            5 => ("delete_and_fail", json!([key])),
            6 => ("ignore_failure", json!([key])),
            _ => ("stock_of", json!([key])),
        };
        script.push(json!({"call":name,"args":args}));
        script.push(json!({"call":"total","args":[]}));
        script.push(json!({"call":"derived","args":[]}));
    }
    for (name, args) in [
        ("arithmetic", json!([u32::MAX])),
        ("negative", json!([])),
        ("literal", json!([])),
        ("empty", json!([])),
        (
            "create",
            json!(["ffffffffffffffffffffffffffffffff", "max", 123]),
        ),
        ("total", json!([])),
    ] {
        script.push(json!({"call":name,"args":args}));
    }
    let mut reference = Runtime::new(p.clone()).unwrap();
    let expected: Vec<_> = script
        .iter()
        .map(|s| {
            reference
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build");
    let alternate = include_str!("../knowledge/research/sum-maintenance.lang").replace(
        "total + new",
        "total + new + (18446744073709551615 * 2) - 18446744073709551615 - 18446744073709551615",
    );
    let alternate = aggregate::prove(&parse(&alternate).unwrap()).unwrap();
    // Consume the final use only: copies on both sides and multiplication
    // retain their exact source order before the owned allocation is moved.
    let repeated = include_str!("../knowledge/research/sum-maintenance.lang")
        .replace(
            "total + new",
            "total + new + (total * total) - (total * total)",
        )
        .replace("total - old + new", "(new + total) - old + (total - total)")
        .replace("total - old", "total - old + (total - total)");
    let repeated = aggregate::prove(&parse(&repeated).unwrap()).unwrap();
    let reversible: aggregate::Certificate = serde_json::from_slice(
        &fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("knowledge/research/reversible-maintenance/reversible.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let mut carry = None;
    let table: aggregate::Certificate = serde_json::from_str(include_str!(
        "../knowledge/research/table-maintenance/table.json"
    ))
    .unwrap();
    for (mode, cert) in [
        ("scan", None),
        ("maintained", Some(&c)),
        ("exact-constants", Some(&alternate)),
        ("repeated-owned-input", Some(&repeated)),
        ("reversible", Some(&reversible)),
        ("keyed-table", Some(&table)),
        ("inline-rows", Some(&table)),
        ("columns", Some(&table)),
        ("inline-promote", Some(&table)),
        ("columns-promote", Some(&table)),
    ] {
        let policy = match mode {
            "inline-rows" | "columns" | "inline-promote" | "columns-promote" => {
                Some(verified_language::storage::Policy {
                    schema: 1,
                    semantics: verified_language::storage::SEMANTICS.into(),
                    maintenance_id: Some(table.id.clone()),
                    roots: std::collections::BTreeMap::from([(
                        "Items".into(),
                        verified_language::storage::TableStorage {
                            layout: if mode.starts_with("columns") {
                                verified_language::storage::Layout::Columns
                            } else {
                                verified_language::storage::Layout::InlineRows
                            },
                            promote_at: if mode.ends_with("promote") {
                                Some(8)
                            } else {
                                None
                            },
                        },
                    )]),
                })
            }
            _ => None,
        };
        let code = state_native::emit_with_storage(&p, cert, false, policy.as_ref()).unwrap();
        assert!(!code.contains("verified_language"));
        assert!(!code.contains("Expr::"));
        let got = compile_and_run(&root.join(format!("native-test-{mode}")), &code, &script);
        let values = got.as_array().unwrap();
        assert_eq!(values.len(), expected.len());
        for (i, (a, b)) in values.iter().zip(&expected).enumerate() {
            assert_eq!(a, b, "{mode} call {i}: {}", script[i]);
        }
        migrate_and_continue(
            &root.join(format!("native-test-{mode}")),
            &p,
            &script,
            &mut carry,
        );
    }
    // The same state machine with u64 keys admits a proved u128 total cache.
    let narrow_source = source.replace("id ItemId;", "").replace("ItemId", "u64");
    let narrow_program = parse(&narrow_source).unwrap();
    let mut narrow_script = script.clone();
    for call in &mut narrow_script {
        if let Some(args) = call["args"].as_array_mut() {
            if let Some(Value::String(key)) = args.first() {
                let id = u128::from_str_radix(key, 16).unwrap() as u64;
                args[0] = json!(id);
            }
        }
    }
    let mut reference = Runtime::new(narrow_program.clone()).unwrap();
    let expected: Vec<_> = narrow_script
        .iter()
        .map(|s| {
            reference
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    // This equivalent formula has negative and >128-bit intermediate values.
    let modular_source=include_str!("../knowledge/research/sum-maintenance.lang").replace("total + new", "new - total + total + total + (18446744073709551615 * 18446744073709551615 * 18446744073709551615) - (18446744073709551615 * 18446744073709551615 * 18446744073709551615)");
    let modular = aggregate::prove(&parse(&modular_source).unwrap()).unwrap();
    let mut carry = None;
    for (mode, certificate, bounded) in [
        ("narrow-scan", None, false),
        ("bounded", Some(&c), true),
        ("bounded-modular", Some(&modular), true),
        ("bounded-reversible", Some(&reversible), true),
        ("bounded-inline", Some(&table), true),
        ("bounded-columns", Some(&table), true),
    ] {
        let policy = match mode {
            "bounded-inline" | "bounded-columns" => Some(verified_language::storage::Policy {
                schema: 1,
                semantics: verified_language::storage::SEMANTICS.into(),
                maintenance_id: Some(table.id.clone()),
                roots: std::collections::BTreeMap::from([(
                    "Items".into(),
                    verified_language::storage::TableStorage {
                        layout: if mode.ends_with("columns") {
                            verified_language::storage::Layout::Columns
                        } else {
                            verified_language::storage::Layout::InlineRows
                        },
                        promote_at: Some(8),
                    },
                )]),
            }),
            _ => None,
        };
        let code =
            state_native::emit_with_storage(&narrow_program, certificate, bounded, policy.as_ref())
                .unwrap();
        if bounded {
            assert!(code.contains("cache_l_total_units:u128"));
        }
        let got = compile_and_run(
            &root.join(format!("native-test-{mode}")),
            &code,
            &narrow_script,
        );
        assert_eq!(got.as_array().unwrap(), &expected);
        migrate_and_continue(
            &root.join(format!("native-test-{mode}")),
            &narrow_program,
            &narrow_script,
            &mut carry,
        );
    }
    // Exercise the high half of the exact native ABI without billions of rows.
    let wide = parse(
        r#"module wide;
      record Row { value:u64, }
      enum Error { Exists, }
      state Rows:Table<u64,Row> = Table.empty();
      keep sum_value:Int=sum(Rows.values().map(fn(row)=>Int(row.value)));
      change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){
        if Rows.contains(key){return Err(Error.Exists);}
        Rows.insert(key,Row {value:value});return Ok(());
      }
      query total()->Int reads(sum_value){return sum_value;}
    "#,
    )
    .unwrap();
    let wide_script = vec![
        json!({"call":"put","args":[0,u64::MAX]}),
        json!({"call":"put","args":[1,u64::MAX]}),
        json!({"call":"put","args":[2,u64::MAX]}),
        json!({"call":"total","args":[]}),
    ];
    let code = state_native::emit_with_bounds(&wide, Some(&modular), true).unwrap();
    let runner = verified_language::runtime::STATE_RUNNER.replacen(
        "println!",
        "assert_eq!(state.query_words_l_total(),(u64::MAX-2,2)); println!",
        1,
    );
    let got = compile_and_run_with_runner(
        &root.join("native-test-wide-abi"),
        &code,
        &wide_script,
        &runner,
    );
    assert_eq!(
        got[3]["result"],
        json!({"Int":(num_bigint::BigInt::from(u64::MAX)*3u8).to_string()})
    );
}

#[test]
fn range_analysis_uses_full_domains_and_rejects_unbounded_contributions() {
    let source = include_str!("../examples/state-benchmark.lang");
    let p = parse(source).unwrap();
    let b = state_native::bounded_caches(&p);
    assert_eq!(b["total_units"].key_bits, 64);
    assert_eq!(b["total_units"].value_bits, 32);
    let max = (num_bigint::BigInt::from(1u8) << 64u32) * num_bigint::BigInt::from(u32::MAX);
    assert_eq!(b["total_units"].maximum_total, max.to_string());
    let wide = parse(&source.replace("stock: u32", "stock: u64")).unwrap();
    assert_eq!(
        state_native::bounded_caches(&wide)["total_units"].value_bits,
        64
    );
    // A nominal ID has a 128-bit domain, even if observed data only use small IDs.
    let inventory = parse(include_str!("../examples/inventory.lang")).unwrap();
    assert!(state_native::bounded_caches(&inventory).is_empty());
    for expression in ["Int(row.stock) - Int(1)", "Int(row.stock) * Int(row.stock)"] {
        let changed = parse(&source.replace("Int(row.stock)", expression)).unwrap();
        assert!(state_native::bounded_caches(&changed).is_empty());
    }
}

#[test]
fn owned_rows_copy_only_used_remove_results_and_preserve_abort() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let p=parse(r#"module owned_rows;
      record Row { name:String, value:Int, }
      enum Error { Failed, }
      state Rows:Table<u64,Row> = Table.empty();
      keep total:Int=sum(Rows.values().map(fn(row)=>row.value));
      change put(key:u64,name:String,value:Int)->Result<Unit,Error> writes(Rows){
        if Rows.contains(key){Rows.replace(key,Row {name:name,value:value});return Ok(());}
        Rows.insert(key,Row {name:name,value:value});return Ok(());
      }
      change discard(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Err(Error.Failed);}
      change take(key:u64)->Result<Option<Row>,Error> writes(Rows){return Ok(Rows.remove(key));}
      query value()->Int reads(total){return total;}
    "#).unwrap();
    let cert: aggregate::Certificate = serde_json::from_str(include_str!(
        "../knowledge/research/table-maintenance/table.json"
    ))
    .unwrap();
    let huge = (num_bigint::BigInt::from(1u32) << 512usize).to_string();
    let script = vec![
        json!({"call":"put","args":[0,"original",{"Int":huge}]}),
        json!({"call":"put","args":[0,"replacement",{"Int":"-3"}]}),
        json!({"call":"discard","args":[0]}),
        json!({"call":"value","args":[]}),
        json!({"call":"take","args":[0]}),
        json!({"call":"value","args":[]}),
        json!({"call":"take","args":[0]}),
    ];
    let mut reference = Runtime::new(p.clone()).unwrap();
    let expected: Vec<_> = script
        .iter()
        .map(|s| {
            reference
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    for (name, config) in [
        ("tree", None),
        (
            "rows",
            Some((verified_language::storage::Layout::InlineRows, None)),
        ),
        (
            "columns",
            Some((verified_language::storage::Layout::Columns, Some(1))),
        ),
    ] {
        let policy = config.map(|(layout, promote_at)| verified_language::storage::Policy {
            schema: 1,
            semantics: verified_language::storage::SEMANTICS.into(),
            maintenance_id: Some(cert.id.clone()),
            roots: std::collections::BTreeMap::from([(
                "Rows".into(),
                verified_language::storage::TableStorage { layout, promote_at },
            )]),
        });
        let mut code =
            state_native::emit_with_storage(&p, Some(&cert), false, policy.as_ref()).unwrap();
        // Separate copy instrumentation, never used in benchmark binaries.
        code = code.replace(
            "#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Row",
            "#[derive(Debug,PartialEq,Eq)] pub struct l_Row",
        );
        code.push_str("\npub static ROW_CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);\nimpl Clone for l_Row{fn clone(&self)->Self{ROW_CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{l_name:self.l_name.clone(),l_value:self.l_value.clone()}}}\n");
        let runner=verified_language::runtime::STATE_RUNNER.replacen("println!","assert_eq!(compiled_state::ROW_CLONES.load(std::sync::atomic::Ordering::Relaxed),1);println!",1);
        let got = compile_and_run_with_runner(
            &Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/native-owned-row-{name}")),
            &code,
            &script,
            &runner,
        );
        assert_eq!(got, json!(expected));
    }
}

#[test]
fn complete_rows_survive_repeated_abort_and_failed_promotion_with_both_journals() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let p = parse(
        r#"module full_row_undo;
      record Row { name:String, value:Int, }
      enum Error { Failed, }
      event changed:Row;
      state Rows:Table<u64,Row> = Table.empty();
      keep total:Int=sum(Rows.values().map(fn(row)=>row.value));
      change put(key:u64,name:String,value:Int)->Result<Unit,Error> writes(Rows) emits(changed){
        if Rows.contains(key){Rows.replace(key,Row{name:name,value:value});}
        else {Rows.insert(key,Row{name:name,value:value});}
        emit changed(Row{name:name,value:value});return Ok(());
      }
      change fail(value:Int)->Result<Unit,Error> writes(Rows) emits(changed){
        put(0,"same contribution, different payload",value)?;
        Rows.remove(0);Rows.remove(99);
        put(0,"reinserted",Int(0)-value)?;
        put(1,"promotion",Int(3))?;put(2,"second insertion",Int(0)-Int(7))?;
        put(0,"last replacement",value)?;Rows.remove(1);return Err(Error.Failed);
      }
      change take(key:u64)->Result<Option<Row>,Error> writes(Rows){return Ok(Rows.remove(key));}
      query row(key:u64)->Option<Row> reads(Rows){return Rows.get(key);}
      query value()->Int reads(total){return total;}
    "#,
    )
    .unwrap();
    let huge = (num_bigint::BigInt::from(1u32) << 512usize).to_string();
    let script = vec![
        json!({"call":"put","args":[0,"original payload λ",{"Int":huge}]}),
        json!({"call":"fail","args":[{"Int":huge}]}),
        json!({"call":"row","args":[0]}),
        json!({"call":"row","args":[1]}),
        json!({"call":"value","args":[]}),
        json!({"call":"put","args":[0,"future continuation",{"Int":"-9"}]}),
        json!({"call":"fail","args":[{"Int":"-9"}]}),
        json!({"call":"take","args":[0]}),
        json!({"call":"value","args":[]}),
    ];
    let mut reference = Runtime::new(p.clone()).unwrap();
    let expected: Vec<_> = script
        .iter()
        .map(|s| {
            reference
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    let expected_snapshot = reference.checkpoint_portable().unwrap();
    for (journal, raw) in [
        (
            "reversible",
            include_str!("../knowledge/research/table-maintenance/table.json"),
        ),
        (
            "snapshot",
            include_str!("../knowledge/research/table-maintenance/table-snapshot.json"),
        ),
    ] {
        let cert: aggregate::Certificate = serde_json::from_str(raw).unwrap();
        for (name, layout) in [
            ("tree", None),
            ("rows", Some(verified_language::storage::Layout::InlineRows)),
            ("columns", Some(verified_language::storage::Layout::Columns)),
        ] {
            let policy = layout.map(|layout| verified_language::storage::Policy {
                schema: 1,
                semantics: verified_language::storage::SEMANTICS.into(),
                maintenance_id: Some(cert.id.clone()),
                roots: std::collections::BTreeMap::from([(
                    "Rows".into(),
                    verified_language::storage::TableStorage {
                        layout,
                        promote_at: Some(1),
                    },
                )]),
            });
            let code =
                state_native::emit_with_storage(&p, Some(&cert), false, policy.as_ref()).unwrap();
            let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join(format!("build/native-complete-undo-{journal}-{name}"));
            fs::create_dir_all(&dir).unwrap();
            let snapshot_file = dir.join("expected.bin");
            fs::write(&snapshot_file, &expected_snapshot).unwrap();
            let runner = verified_language::runtime::STATE_RUNNER
                .replace("  output.push", "  let before=state.checkpoint()?;\n  output.push")
                .replace("?);\n }", "?);\n  if step[\"call\"]==\"fail\"{assert_eq!(state.checkpoint()?,before);}\n  state=State::restore(&state.checkpoint()?)?;\n }")
                .replace(" println!", &format!(" assert_eq!(state.checkpoint()?,std::fs::read({:?}).unwrap());\n println!",snapshot_file));
            assert!(runner.contains("assert_eq!(state.checkpoint()?,before)"));
            let got = compile_and_run_with_runner(&dir, &code, &script, &runner);
            assert_eq!(got, json!(expected), "{journal}/{name}");
        }
    }
}

#[test]
fn source_row_projection_preserves_composite_payloads_across_native_abort_and_restore() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let p = parse(include_str!("../examples/source-row-undo.ink")).unwrap();
    let mut script = vec![];
    let row = |seed: usize| {
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
    };
    for seed in 0..12 {
        script.extend([
            json!({"call":"put","args":[seed%3,row(seed)]}),
            json!({"call":"fail","args":[seed%3,row(seed+1)]}),
            json!({"call":"row","args":[seed%3]}),
            json!({"call":"value","args":[]}),
        ]);
    }
    let mut reference = Runtime::new(p.clone()).unwrap();
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
    for (journal, raw) in [
        (
            "reversible",
            include_str!("../knowledge/research/table-maintenance/table.json"),
        ),
        (
            "snapshot",
            include_str!("../knowledge/research/table-maintenance/table-snapshot.json"),
        ),
    ] {
        let cert: aggregate::Certificate = serde_json::from_str(raw).unwrap();
        let model: verified_language::row_model::Model = serde_json::from_slice(
            &fs::read(Path::new(env!("CARGO_MANIFEST_DIR")).join(format!(
                "knowledge/research/source-row-undo/{journal}/source-model.json"
            )))
            .unwrap(),
        )
        .unwrap();
        verified_language::row_model::verify(&p, &cert, &model).unwrap();
        for (name, layout) in [
            ("tree", None),
            ("rows", Some(verified_language::storage::Layout::InlineRows)),
            ("columns", Some(verified_language::storage::Layout::Columns)),
        ] {
            let policy = layout.map(|layout| verified_language::storage::Policy {
                schema: 1,
                semantics: verified_language::storage::SEMANTICS.into(),
                maintenance_id: Some(cert.id.clone()),
                roots: std::collections::BTreeMap::from([(
                    "Rows".into(),
                    verified_language::storage::TableStorage {
                        layout,
                        promote_at: Some(1),
                    },
                )]),
            });
            let code =
                state_native::emit_with_storage(&p, Some(&cert), false, policy.as_ref()).unwrap();
            let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
                .join(format!("build/native-source-row-{journal}-{name}"));
            fs::create_dir_all(&dir).unwrap();
            let snapshot_file = dir.join("expected.bin");
            fs::write(&snapshot_file, &snapshot).unwrap();
            let runner=verified_language::runtime::STATE_RUNNER.replace("  output.push","  let before=state.checkpoint()?;\n  output.push")
                .replace("?);\n }","?);\n  if step[\"call\"]==\"fail\"{assert_eq!(state.checkpoint()?,before);}\n  state=State::restore(&state.checkpoint()?)?;\n }")
                .replace(" println!",&format!(" assert_eq!(state.checkpoint()?,std::fs::read({:?}).unwrap());\n println!",snapshot_file));
            assert!(runner.contains("assert_eq!(state.checkpoint()?,before)"));
            assert_eq!(
                compile_and_run_with_runner(&dir, &code, &script, &runner),
                json!(expected),
                "{journal}/{name}"
            );
        }
    }
}

#[test]
fn borrowed_commit_outcomes_reuse_events_and_enforce_the_state_borrow() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    use std::process::Command;
    let p = parse(include_str!("../examples/state-benchmark.lang")).unwrap();
    let cert: aggregate::Certificate = serde_json::from_str(include_str!(
        "../knowledge/research/table-maintenance/table.json"
    ))
    .unwrap();
    let code = state_native::emit_with_bounds(&p, Some(&cert), true).unwrap();
    let runner = r#"
      use compiled_state::*;
      use std::{alloc::{GlobalAlloc,Layout,System},sync::atomic::{AtomicUsize,Ordering}};
      static ALLOCATIONS:AtomicUsize=AtomicUsize::new(0);
      struct Count;
      unsafe impl GlobalAlloc for Count {
        unsafe fn alloc(&self,l:Layout)->*mut u8{ALLOCATIONS.fetch_add(1,Ordering::Relaxed);System.alloc(l)}
        unsafe fn alloc_zeroed(&self,l:Layout)->*mut u8{ALLOCATIONS.fetch_add(1,Ordering::Relaxed);System.alloc_zeroed(l)}
        unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8{ALLOCATIONS.fetch_add(1,Ordering::Relaxed);System.realloc(p,l,n)}
        unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l)}
      }
      #[global_allocator] static COUNT:Count=Count;
      fn main(){
        let mut state=State::new();
        state.invoke_l_create(0,1).unwrap();
        state.invoke_view_l_restock(0,1).unwrap();
        state.invoke_view_l_restock(0,1).unwrap();
        let start=state.outbox().len();let before=ALLOCATIONS.load(Ordering::Relaxed);
        let view=state.invoke_view_l_restock(0,1).unwrap();
        assert!(view.result.is_ok());assert_eq!(view.events.len(),1);
        let pointer=view.events.as_ptr();
        assert_eq!(ALLOCATIONS.load(Ordering::Relaxed)-before,0);
        let borrowed_json=view.to_json();drop(view);
        assert_eq!(pointer,state.outbox()[start..].as_ptr());
        let before=ALLOCATIONS.load(Ordering::Relaxed);
        let detached=state.invoke_l_restock(0,1).unwrap();
        assert_eq!(ALLOCATIONS.load(Ordering::Relaxed)-before,1);
        let owned_json=detached.to_json();
        state.invoke_view_l_restock(0,9).unwrap();
        assert_eq!(owned_json,detached.to_json());
        assert_eq!(borrowed_json["events"][0]["value"]["after"],4);
        assert_eq!(owned_json["events"][0]["value"]["after"],5);
        let failed=state.invoke_view_l_fail(0).unwrap();
        assert!(!failed.committed);assert!(failed.events.is_empty());drop(failed);
        assert_eq!(state.invoke_view_l_stock_of(0).unwrap().result,Some(14));
        println!("null");
      }
    "#;
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/native-borrowed-events");
    assert_eq!(
        compile_and_run_with_runner(&root, &code, &[], runner),
        Value::Null
    );
    fs::write(root.join("src/main.rs"),r#"use compiled_state::*;fn main(){let mut state=State::new();state.invoke_l_create(0,1).unwrap();let view=state.invoke_view_l_restock(0,1).unwrap();state.invoke_l_remove(0).unwrap();println!("{}",view.events.len());}"#).unwrap();
    let failed = Command::new(env!("CARGO"))
        .args(["check", "--offline", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .env(
            "CARGO_TARGET_DIR",
            root.parent().unwrap().join("native-test-target"),
        )
        .output()
        .unwrap();
    assert!(!failed.status.success());
    assert!(
        String::from_utf8_lossy(&failed.stderr).contains("E0499"),
        "{}",
        String::from_utf8_lossy(&failed.stderr)
    );
}

#[test]
fn tampered_native_maintenance_is_rejected_before_emission() {
    let p = parse(include_str!("../examples/inventory.lang")).unwrap();
    let mut c = aggregate::prove(
        &parse(include_str!("../knowledge/research/sum-maintenance.lang")).unwrap(),
    )
    .unwrap();
    c.replace = c.insert.clone();
    assert!(state_native::emit(&p, Some(&c)).is_err());
}
