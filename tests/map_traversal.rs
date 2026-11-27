use serde_json::json;
use verified_language::{stateful::Runtime, syntax};

#[path = "support/parity.rs"]
mod parity;

#[test]
fn computed_map_lists_are_typed_before_traversal() {
    let source = r#"module map_traversal;
record Entry { amount: u32, }
record Index { amounts: Map<u32, Entry>, }
fn inspect(index: Index) -> List<u32> {
    let keys: List<u32> = foldl(index.amounts.keys(), [], fn(key, out) => out.concat([key]));
    let sum: u32 = foldl(index.amounts.values(), 0, fn(entry, out) => out + entry.amount);
    return keys.concat([sum]);
}
fn values(empty: Bool) -> List<u32> {
    let amounts: Map<u32, Entry> = Map.empty();
    if empty { return inspect(Index { amounts: amounts }); }
    let filled = amounts.set(4, Entry { amount: 13 }).set(1, Entry { amount: 7 });
    return inspect(Index { amounts: filled });
}
query read(empty: Bool) -> List<u32> { return values(empty); }
"#;
    let program = syntax::parse(source).unwrap();
    let mut runtime = Runtime::new(program.clone()).unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (empty, result) in [(true, json!([0])), (false, json!([1, 4, 20]))] {
        let args = json!([empty]);
        let outcome = runtime.invoke_json("read", &args).unwrap().json();
        assert_eq!(outcome["result"], result);
        steps.push(json!({"call": "read", "args": args}));
        expected.push(json!({
            "reply": {"outcome": outcome},
            "snapshot": runtime.checkpoint_portable().unwrap()
        }));
    }
    parity::conformance("computed-map-traversal", program, source, steps, expected);
}
