//! Lexical ownership in the stateful Rust lowering: final reads move, lookups
//! borrow keys, `let row = T.get(k).ok_or(e)?` borrows the stored row until the
//! first statement that may mutate state, and stored-row pipelines read rows by
//! reference. Generated programs must still match the reference runtime on
//! results, events, versions and aborts.
use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{state_native, stateful::Runtime, syntax::parse};

static NATIVE_EXECUTION: std::sync::Mutex<()> = std::sync::Mutex::new(());

const SOURCE: &str = r#"module owned;
record Item { name: String, stock: u32, }
record Changed { name: String, before: u32, after: u32, }
enum Error { Missing, Exists, Overflow, Failed, }
state Items: Table<String, Item> = Table.empty();
event changed: Changed;
keep units: Int = sum(Items.values().map(fn(item) => Int(item.stock)));
keep big: Int = count(Items.values().filter(fn(item) => item.stock > 10));
change create(key: String, name: String, stock: u32) -> Result<Unit, Error> writes(Items) {
    if Items.contains(key) { return Err(Error.Exists); }
    Items.insert(key, Item { name: name, stock: stock });
    return Ok(());
}
change restock(key: String, amount: u32) -> Result<Unit, Error> writes(Items) emits(changed) {
    let item = Items.get(key).ok_or(Error.Missing)?;
    let next = checked_add(item.stock, amount).map_err(fn(_) => Error.Overflow)?;
    Items.replace(key, Item { name: item.name, stock: next });
    emit changed(Changed { name: item.name, before: item.stock, after: next });
    return Ok(());
}
change rename(key: String, name: String) -> Result<Item, Error> writes(Items) {
    let item = Items.get(key).ok_or(Error.Missing)?;
    Items.replace(key, Item { name: name, stock: item.stock });
    return Ok(item);
}
query peek(key: String) -> Result<Item, Error> reads(Items) {
    let item = Items.get(key).ok_or(Error.Missing)?;
    return Ok(item);
}
query stock_of(key: String) -> Option<u32> reads(Items) { return Items.get(key).map(fn(item) => item.stock); }
change twice(key: String) -> Result<Unit, Error> writes(Items) emits(changed) {
    restock(key, 1)?;
    restock(key, 2)?;
    return Err(Error.Failed);
}
change pick(key: String, other: String, flag: Bool) -> Result<Unit, Error> writes(Items) {
    if flag { Items.remove(key); } else { Items.remove(other); }
    return Ok(());
}
query total() -> Int reads(units) { return units; }
query bigs() -> Int reads(big) { return big; }
"#;

fn script(steps: usize) -> Vec<Value> {
    let mut x = 0x9e37_79b9_7f4a_7c15u64;
    let mut next = move || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        x
    };
    let mut out = vec![];
    for _ in 0..steps {
        let r = next();
        let key = format!("k{}", r % 6);
        let other = format!("k{}", (r >> 8) % 6);
        let amount = if (r >> 16) % 9 == 0 {
            u32::MAX as u64
        } else {
            (r >> 20) % 20
        };
        out.push(match (r >> 32) % 9 {
            0 => json!({"call":"create","args":[key, format!("name{}", r % 97), (r >> 40) % 30]}),
            1 | 2 => json!({"call":"restock","args":[key, amount]}),
            3 => json!({"call":"rename","args":[key, format!("renamed{}", r % 89)]}),
            4 => json!({"call":"peek","args":[key]}),
            5 => json!({"call":"stock_of","args":[key]}),
            6 => json!({"call":"twice","args":[key]}),
            7 => json!({"call":"pick","args":[key, other, (r >> 50) % 2 == 0]}),
            _ => json!({"call": if r % 2 == 0 {"total"} else {"bigs"},"args":[]}),
        });
    }
    out
}

fn compile_and_run(dir: &Path, code: &str, runner: &str, script: &[Value]) -> Value {
    fs::create_dir_all(dir.join("src")).unwrap();
    fs::write(dir.join("src/lib.rs"), code).unwrap();
    fs::write(dir.join("src/main.rs"), runner).unwrap();
    fs::write(dir.join("Cargo.toml"), "[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n").unwrap();
    let target = dir.parent().unwrap().join("ownership-test-target");
    let output = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--manifest-path"])
        .arg(dir.join("Cargo.toml"))
        .env("CARGO_TARGET_DIR", &target)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    fs::write(dir.join("script.json"), serde_json::to_vec(script).unwrap()).unwrap();
    let run = Command::new(target.join("debug/compiled-state"))
        .arg(dir.join("script.json"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    if !run.stderr.is_empty() {
        eprint!("{}", String::from_utf8_lossy(&run.stderr));
    }
    serde_json::from_slice(&run.stdout).unwrap()
}

#[test]
fn ownership_lowering_matches_reference_and_borrows_rows() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let p = parse(SOURCE).unwrap();
    let code = state_native::emit(&p, None).unwrap();
    // The read-modify-write change borrows the stored row and keeps only the
    // two fields it still needs; nothing clones the whole row.
    let restock = code
        .split("fn action_l_restock(")
        .nth(1)
        .unwrap()
        .split("pub fn invoke_view_l_restock")
        .next()
        .unwrap();
    assert!(
        restock.contains("let l_item:&l_Item=self.l_Items.get(&(l_key))"),
        "{restock}"
    );
    assert!(
        restock.contains("let l_item__name:String=l_item.l_name.clone();"),
        "{restock}"
    );
    assert!(!restock.contains("cloned()"), "{restock}");
    // Lookups borrow String keys; writes move them at their final read.
    assert!(code.contains("self.l_Items.contains_key(&(l_key))"));
    assert!(code.contains("let value=l_Item{l_name:l_name,l_stock:l_stock}"));
    // Stored-row stages read by reference.
    assert!(code.contains("self.l_Items.values().map(|l_item|"));
    assert!(code.contains("(self.l_Items.get(&(l_key))).map(|l_item|"));

    let script = script(3000);
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
    // Copy instrumentation: count whole-row clones in the generated program.
    let counted = code.replace(
        "#[derive(Clone,Debug,PartialEq,Eq)] pub struct l_Item",
        "#[derive(Debug,PartialEq,Eq)] pub struct l_Item",
    ) + "\npub static ROW_CLONES:std::sync::atomic::AtomicUsize=std::sync::atomic::AtomicUsize::new(0);\nimpl Clone for l_Item{fn clone(&self)->Self{ROW_CLONES.fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{l_name:self.l_name.clone(),l_stock:self.l_stock}}}\n";
    assert_ne!(counted, code, "instrumentation must replace the derive");
    let runner = verified_language::runtime::STATE_RUNNER.replacen(
        "println!",
        "eprintln!(\"row clones {}\",compiled_state::ROW_CLONES.load(std::sync::atomic::Ordering::Relaxed));println!",
        1,
    );
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/native-ownership");
    let got = compile_and_run(&root.join("counted"), &counted, &runner, &script);
    assert_eq!(got, json!(expected));
    let plain = compile_and_run(
        &root.join("plain"),
        &code,
        verified_language::runtime::STATE_RUNNER,
        &script,
    );
    assert_eq!(plain, json!(expected));
}

#[test]
fn rows_still_read_whole_after_a_write_are_cloned_before_it() {
    let p = parse(SOURCE).unwrap();
    let code = state_native::emit(&p, None).unwrap();
    let rename = code
        .split("fn action_l_rename(")
        .nth(1)
        .unwrap()
        .split("pub fn invoke_view_l_rename")
        .next()
        .unwrap();
    let clone = rename
        .find("let l_item:l_Item=<l_Item as Clone>::clone(l_item);")
        .unwrap();
    let write = rename.find("self.set_l_Items(").unwrap();
    assert!(clone < write, "{rename}");
    // A row returned while no write intervenes is cloned from the borrow.
    let peek = code.split("fn action_l_peek(").nth(1).unwrap();
    assert!(peek.starts_with("&mut self,l_key:String)->Result<l_Item,l_Error>{let l_item:&l_Item="));
}

#[test]
fn stored_row_closures_can_call_helpers_queries_and_derived_reads() {
    let _native = NATIVE_EXECUTION.lock().unwrap();
    let source = format!(
        r#"{SOURCE}
fn bump(x: u32) -> u32 {{ return x + 1; }}
fn positive(x: u32) -> Bool {{ return x > 0; }}
query helper_map() -> List<u32> reads(Items) {{
    return Items.values().map(fn(row) => bump(row.stock));
}}
query helper_filter() -> List<Item> reads(Items) {{
    return Items.values().filter(fn(row) => positive(row.stock));
}}
query helper_get(key: String) -> Option<u32> reads(Items) {{
    return Items.get(key).map(fn(row) => bump(row.stock));
}}
query query_map() -> List<Int> reads(Items, units) {{
    return Items.values().map(fn(row) => total() + Int(row.stock));
}}
query query_filter() -> List<Item> reads(Items, units) {{
    return Items.values().filter(fn(row) => total() > Int(row.stock));
}}
query query_get(key: String) -> Option<Int> reads(Items, units) {{
    return Items.get(key).map(fn(row) => total() + Int(row.stock));
}}
query derived_map() -> List<Int> reads(Items, units) {{
    return Items.values().map(fn(row) => units + Int(row.stock));
}}
"#
    );
    let p = parse(&source).unwrap();
    let code = state_native::emit(&p, None).unwrap();
    let mut calls = vec![
        json!({"call":"helper_map","args":[]}),
        json!({"call":"create","args":["a", "alpha", 0]}),
        json!({"call":"create","args":["b", "beta", u32::MAX]}),
    ];
    for name in [
        "helper_map",
        "helper_filter",
        "query_map",
        "query_filter",
        "derived_map",
    ] {
        calls.push(json!({"call":name,"args":[]}));
    }
    for name in ["helper_get", "query_get"] {
        for key in ["a", "b", "missing"] {
            calls.push(json!({"call":name,"args":[key]}));
        }
    }
    let mut reference = Runtime::new(p).unwrap();
    let expected: Vec<_> = calls
        .iter()
        .map(|s| {
            reference
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap()
                .json()
        })
        .collect();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/native-ownership");
    let got = compile_and_run(
        &root.join("closure-calls"),
        &code,
        verified_language::runtime::STATE_RUNNER,
        &calls,
    );
    assert_eq!(got, json!(expected));
}
