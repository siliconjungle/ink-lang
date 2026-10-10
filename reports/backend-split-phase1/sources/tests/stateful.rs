use num_bigint::BigInt;
use serde_json::json;
use verified_language::{
    check,
    stateful::{Runtime, Value},
    syntax::parse,
};
const APP: &str = include_str!("../examples/inventory.lang");
fn runtime(extra: &str) -> Runtime {
    Runtime::new(parse(&format!("{APP}\n{extra}")).unwrap()).unwrap()
}
fn id(n: u32) -> String {
    format!("{n:032x}")
}
fn total(rt: &mut Runtime) -> BigInt {
    match rt.invoke_json("total", &json!([])).unwrap().result {
        Value::Int(n) => n,
        _ => panic!("not an exact total"),
    }
}

#[test]
fn complete_inventory_example_and_exact_totals() {
    let mut rt = runtime("");
    assert_eq!(total(&mut rt), BigInt::from(0));
    for n in 1..=3 {
        assert!(
            rt.invoke_json("create", &json!([id(n), "Part", u32::MAX]))
                .unwrap()
                .committed
        );
    }
    assert_eq!(total(&mut rt), BigInt::from(u32::MAX) * 3);
    let before = rt.checkpoint().unwrap();
    let failed = rt.invoke_json("restock", &json!([id(1), 1])).unwrap();
    assert!(!failed.committed);
    assert_eq!(failed.result.json(), json!({"Err":"Error.Overflow"}));
    assert_eq!(rt.checkpoint().unwrap(), before);
    let duplicate = rt
        .invoke_json("create", &json!([id(1), "Other", 1]))
        .unwrap();
    assert!(!duplicate.committed);
    assert_eq!(total(&mut rt), BigInt::from(u32::MAX) * 3);
}

#[test]
fn abort_rolls_back_multiple_writes_and_staged_events() {
    let mut rt=runtime("change fail(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 7)?; restock(id, 9)?; return Err(Error.Overflow); }");
    rt.invoke_json("create", &json!([id(1), "Part", 12]))
        .unwrap();
    let before = rt.checkpoint().unwrap();
    let out = rt.invoke_json("fail", &json!([id(1)])).unwrap();
    assert!(!out.committed);
    assert!(out.events.is_empty());
    assert_eq!(rt.checkpoint().unwrap(), before);
    assert_eq!(total(&mut rt), BigInt::from(12));
}

#[test]
fn ignored_nested_error_still_aborts_outer_transaction() {
    let mut rt=runtime("change inner(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { restock(id, 7)?; return Err(Error.Overflow); } change outer(id: ItemId) -> Result<Unit, Error> writes(Items) emits(stock_changed) { inner(id); return Ok(()); }");
    rt.invoke_json("create", &json!([id(1), "Part", 12]))
        .unwrap();
    let before = rt.checkpoint().unwrap();
    assert!(!rt.invoke_json("outer", &json!([id(1)])).unwrap().committed);
    assert_eq!(rt.checkpoint().unwrap(), before);
}

#[test]
fn tentative_derived_reads_and_snapshot_roundtrip() {
    let mut rt=runtime("change add_and_read(id: ItemId) -> Result<Int, Error> writes(Items) reads(total_units) emits(stock_changed) { restock(id, 7)?; return Ok(total_units); }");
    rt.invoke_json("create", &json!([id(1), "Part", 12]))
        .unwrap();
    let out = rt.invoke_json("add_and_read", &json!([id(1)])).unwrap();
    assert_eq!(out.result.json(), json!({"Ok":{"Int":"19"}}));
    assert_eq!(out.events.len(), 1);
    assert_eq!(out.events[0].commit, 2);
    let bytes = rt.checkpoint().unwrap();
    let mut restored = Runtime::restore(rt.program().clone(), &bytes).unwrap();
    assert_eq!(restored.checkpoint().unwrap(), bytes);
    assert_eq!(total(&mut restored), BigInt::from(19));
    let a = rt.invoke_json("restock", &json!([id(1), 11])).unwrap();
    let b = restored
        .invoke_json("restock", &json!([id(1), 11]))
        .unwrap();
    assert_eq!(a.json(), b.json());
    assert_eq!(rt.checkpoint().unwrap(), restored.checkpoint().unwrap());
}

#[test]
fn reject_undeclared_effects_unproved_keys_and_cycles() {
    for extra in [
        "query bad(id: ItemId) -> Option<Item> { return Items.get(id); }",
        "change bad(id: ItemId) -> Result<Unit, Error> reads(Items) { Items.remove(id); return Ok(()); }",
        "change bad(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.insert(id, Item { name: \"X\", stock: 1 }); return Ok(()); }",
        "change bad(id: ItemId) -> Result<Unit, Error> writes(Items) { Items.replace(id, Item { name: \"X\", stock: 1 }); return Ok(()); }",
        "query bad() -> Int writes(Items) { return total_units; }",
        "keep cycle: Int = cycle;",
        "query bad() -> Int { return bad(); }",
    ]{let p=parse(&format!("{APP}\n{extra}")).unwrap();assert!(check::check(&p).is_err(),"accepted {extra}");}
}

#[test]
fn reject_malformed_snapshots_and_ingress() {
    let mut rt = runtime("");
    assert!(rt
        .invoke_json("create", &json!(["bad-id", "Part", 2]))
        .is_err());
    assert!(rt
        .invoke_json("create", &json!([id(1), "Part", 4294967296u64]))
        .is_err());
    rt.invoke_json("create", &json!([id(1), "Part", 12]))
        .unwrap();
    let bytes = rt.checkpoint().unwrap();
    let mut s: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    s["program"] = json!("unrelated");
    assert!(Runtime::restore(rt.program().clone(), &serde_json::to_vec(&s).unwrap()).is_err());
    let mut s: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    let duplicate = s["tables"][0].clone();
    s["tables"].as_array_mut().unwrap().push(duplicate);
    assert!(Runtime::restore(rt.program().clone(), &serde_json::to_vec(&s).unwrap()).is_err());
}

#[test]
fn contextual_constructors_and_negative_exact_arithmetic() {
    let mut rt=runtime("query small() -> Result<u32, Error> { return Ok(7); } query negative() -> Int { return Int(0) - Int(18446744073709551615); }");
    assert_eq!(
        rt.invoke_json("small", &json!([])).unwrap().result.json(),
        json!({"Ok":7})
    );
    assert_eq!(
        rt.invoke_json("negative", &json!([]))
            .unwrap()
            .result
            .json(),
        json!({"Int":"-18446744073709551615"})
    );
}

#[test]
fn key_presence_facts_are_not_assumed_for_state_dependent_expressions() {
    let source="module unstable; enum Error { Missing, } state Rows: Table<u64,u64> = Table.empty(); query key() -> u64 { return 0; } change add() -> Result<Unit,Error> writes(Rows) { if Rows.contains(key()) { return Err(Error.Missing); } Rows.insert(key(), 1); return Ok(()); }";
    assert!(check::check(&parse(source).unwrap()).is_err());
    let source = source
        .replace(
            "if Rows.contains(key())",
            "let id = key(); if Rows.contains(id)",
        )
        .replace("Rows.insert(key(), 1)", "Rows.insert(id, 1)");
    assert!(check::check(&parse(&source).unwrap()).is_ok());
}
