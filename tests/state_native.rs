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
    fs::create_dir_all(dir.join("src")).unwrap();
    fs::write(dir.join("src/lib.rs"), code).unwrap();
    fs::write(dir.join("src/main.rs"), state_native::RUNNER).unwrap();
    fs::write(dir.join("Cargo.toml"), "[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nserde_json=\"=1.0.151\"\n").unwrap();
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
    for (mode, cert) in [
        ("scan", None),
        ("maintained", Some(&c)),
        ("exact-constants", Some(&alternate)),
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
