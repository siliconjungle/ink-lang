use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{aggregate, state_native, stateful::Runtime, syntax::parse};

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
    compile_and_run_with_runner(dir, code, script, state_native::RUNNER)
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
    let source = format!("{}\n{EXTRA}", include_str!("../examples/inventory.lang"));
    let p = parse(&source).unwrap();
    let c = aggregate::prove(&parse(include_str!("../knowledge/sum-maintenance.lang")).unwrap())
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
    let alternate = include_str!("../knowledge/sum-maintenance.lang").replace(
        "total + new",
        "total + new + (18446744073709551615 * 2) - 18446744073709551615 - 18446744073709551615",
    );
    let alternate = aggregate::prove(&parse(&alternate).unwrap()).unwrap();
    // Consume the final use only: copies on both sides and multiplication
    // retain their exact source order before the owned allocation is moved.
    let repeated = include_str!("../knowledge/sum-maintenance.lang")
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
                .join("knowledge/reversible-maintenance/reversible.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let mut carry = None;
    let table: aggregate::Certificate =
        serde_json::from_str(include_str!("../knowledge/table-maintenance/table.json")).unwrap();
    for (mode, cert) in [
        ("scan", None),
        ("maintained", Some(&c)),
        ("exact-constants", Some(&alternate)),
        ("repeated-owned-input", Some(&repeated)),
        ("reversible", Some(&reversible)),
        ("keyed-table", Some(&table)),
    ] {
        let code = state_native::emit(&p, cert).unwrap();
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
    let modular_source=include_str!("../knowledge/sum-maintenance.lang").replace("total + new", "new - total + total + total + (18446744073709551615 * 18446744073709551615 * 18446744073709551615) - (18446744073709551615 * 18446744073709551615 * 18446744073709551615)");
    let modular = aggregate::prove(&parse(&modular_source).unwrap()).unwrap();
    let mut carry = None;
    for (mode, certificate, bounded) in [
        ("narrow-scan", None, false),
        ("bounded", Some(&c), true),
        ("bounded-modular", Some(&modular), true),
        ("bounded-reversible", Some(&reversible), true),
    ] {
        let code = state_native::emit_with_bounds(&narrow_program, certificate, bounded).unwrap();
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
    let runner = state_native::RUNNER.replacen(
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
fn tampered_native_maintenance_is_rejected_before_emission() {
    let p = parse(include_str!("../examples/inventory.lang")).unwrap();
    let mut c =
        aggregate::prove(&parse(include_str!("../knowledge/sum-maintenance.lang")).unwrap())
            .unwrap();
    c.replace = c.insert.clone();
    assert!(state_native::emit(&p, Some(&c)).is_err());
}
