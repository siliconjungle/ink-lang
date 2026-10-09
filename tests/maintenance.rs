use serde_json::json;
use verified_language::{aggregate, stateful::Runtime, syntax::parse};

const APP: &str = include_str!("../examples/inventory.lang");
const EXTRA: &str = r#"
keep expensive: Int = sum(Items.values().filter(fn(item) => item.stock > 100).map(fn(item) => Int(item.stock) * Int(item.stock)));
keep large_count: Int = count(Items.values().filter(fn(item) => item.stock > 100));
query derived() -> Int reads(expensive, large_count) { return expensive + large_count; }
change delete(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Ok(()); }
change fail(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 7)?; restock(id, 9)?; return Err(Error.Overflow); }
change add_and_read(id: ItemId) -> Result<Int, Error> writes(Items) reads(total_units) emits(stock_changed) { restock(id, 3)?; return Ok(total_units); }
change delete_and_fail(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.remove(id); return Err(Error.Overflow); }
"#;
fn certificate() -> aggregate::Certificate {
    aggregate::prove(&parse(include_str!("../knowledge/sum-maintenance.lang")).unwrap()).unwrap()
}
fn id(n: u64) -> String {
    format!("{n:032x}")
}

#[test]
fn certificate_checks_actual_update_algorithms() {
    let c = certificate();
    aggregate::verify(&c).unwrap();
    let source = include_str!("../knowledge/sum-maintenance.lang")
        .replace("total - old + new", "total + old + new");
    assert!(aggregate::prove(&parse(&source).unwrap()).is_err());
    let mut bad = c.clone();
    bad.replace = bad.insert.clone();
    assert!(aggregate::verify(&bad).is_err());
    let mut bad = c.clone();
    bad.obligations.clear();
    assert!(aggregate::verify(&bad).is_err());
    let mut bad = c.clone();
    bad.semantics = "floating-sum".into();
    assert!(aggregate::verify(&bad).is_err());
}

#[test]
fn maintained_and_scanned_observations_match_across_future_changes() {
    let program = parse(&format!("{APP}\n{EXTRA}")).unwrap();
    let mut scan = Runtime::new(program.clone()).unwrap();
    let mut maintained = Runtime::new(program.clone()).unwrap();
    assert_eq!(
        maintained.enable_maintenance(certificate()).unwrap(),
        vec!["expensive", "large_count", "total_units"]
    );
    let mut rng = 0x123456789abcdefu64;
    for step in 0..2000 {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        let key = id(rng % 50);
        let count = if step % 17 == 0 {
            u32::MAX as u64
        } else {
            rng % 400
        };
        let (name, args) = match rng % 7 {
            0 => ("create", json!([key, "Part", count])),
            1 => ("restock", json!([key, count])),
            2 => ("delete", json!([key])),
            3 => ("fail", json!([key])),
            4 => ("add_and_read", json!([key])),
            5 => ("delete_and_fail", json!([key])),
            _ => ("stock_of", json!([key])),
        };
        let a = scan.invoke_json(name, &args).unwrap();
        let b = maintained.invoke_json(name, &args).unwrap();
        assert_eq!(a.json(), b.json(), "step {step}: {name}");
        for query in ["total", "derived"] {
            assert_eq!(
                scan.invoke_json(query, &json!([])).unwrap().json(),
                maintained.invoke_json(query, &json!([])).unwrap().json(),
                "step {step}: {query}"
            );
        }
        if step % 100 == 0 {
            let snapshot = maintained.checkpoint().unwrap();
            assert_eq!(snapshot, scan.checkpoint().unwrap());
            maintained = Runtime::restore(program.clone(), &snapshot).unwrap();
            maintained.enable_maintenance(certificate()).unwrap();
        }
        if step % 71 == 0 {
            let before = maintained.checkpoint().unwrap();
            maintained.disable_maintenance().unwrap();
            assert!(maintained.maintained_values().is_empty());
            maintained.enable_maintenance(certificate()).unwrap();
            assert_eq!(before, maintained.checkpoint().unwrap());
        }
        if step % 250 == 0 {
            scan.acknowledge_through(scan.version(), u64::MAX);
            maintained.acknowledge_through(maintained.version(), u64::MAX);
        }
    }
    assert_eq!(scan.checkpoint().unwrap(), maintained.checkpoint().unwrap());
}

#[test]
fn state_dependent_projection_is_not_incrementalised() {
    let source=format!("{APP}\nkeep another: Int = sum(Items.values().map(fn(item) => Int(item.stock) + total_units));");
    let mut rt = Runtime::new(parse(&source).unwrap()).unwrap();
    assert_eq!(
        rt.enable_maintenance(certificate()).unwrap(),
        vec!["total_units"]
    );
    rt.invoke_json("create", &json!([id(1), "X", 100])).unwrap();
}

#[test]
fn full_width_ids_and_empty_filtered_aggregates_survive_snapshot() {
    let program = parse(&format!("{APP}\n{EXTRA}")).unwrap();
    let mut rt = Runtime::new(program.clone()).unwrap();
    rt.enable_maintenance(certificate()).unwrap();
    rt.invoke_json(
        "create",
        &json!(["ffffffffffffffffffffffffffffffff", "X", 0]),
    )
    .unwrap();
    assert_eq!(
        rt.invoke_json("derived", &json!([])).unwrap().result.json(),
        json!({"Int":"0"})
    );
    let snapshot = rt.checkpoint().unwrap();
    let restored = Runtime::restore(program, &snapshot).unwrap();
    assert_eq!(snapshot, restored.checkpoint().unwrap());
}
