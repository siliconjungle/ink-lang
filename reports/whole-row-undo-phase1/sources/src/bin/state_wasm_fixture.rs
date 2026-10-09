//! Deterministic interoperability fixtures from the independent reference runtime.
use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{stateful::Runtime, syntax::parse};
const EXTRA: &str = r#"
keep expensive:Int=sum(Items.values().filter(fn(row)=>row.stock>100).map(fn(row)=>Int(row.stock)*Int(row.stock)));
query derived()->Int reads(expensive){return expensive;}
change read_after_write(key:u64)->Result<Int,Error> writes(Items) reads(total_units) emits(updated){restock(key,3)?;return Ok(total_units);}
change remove_fail(key:u64)->Result<Unit,Error> writes(Items){Items.remove(key);return Err(Error.Overflow);}
change ignored_fail(key:u64)->Result<Unit,Error> writes(Items) emits(updated){restock(key,4294967295);return Ok(());}
query negative()->Int{return Int(2)-Int(5);}
"#;
fn write(path: &Path, value: &Value) {
    fs::write(path, serde_json::to_vec(value).unwrap()).unwrap();
}
fn run(root: &Path, name: &str, source: &str, nominal: bool) {
    let dir = root.join(name);
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("source.lang"), source).unwrap();
    let program = parse(source).unwrap();
    let mut script = vec![];
    // Prepopulate every key so later reads/updates exercise success as well as failure.
    for raw in 0..50u64 {
        let key = if nominal {
            json!(format!("{raw:032x}"))
        } else {
            json!(raw)
        };
        let args = if nominal {
            json!([key, "part 🌱 世界 \"\\\n", raw * 3 + 1])
        } else {
            json!([key, raw * 3 + 1])
        };
        script.push(json!({"call":"create","args":args}));
    }
    let mut rng = 0x123456789abcdefu64;
    for index in 0..2000 {
        rng ^= rng << 13;
        rng ^= rng >> 7;
        rng ^= rng << 17;
        let raw = rng % 50;
        let key = if nominal {
            json!(format!("{raw:032x}"))
        } else {
            json!(raw)
        };
        let count = if index % 17 == 0 {
            u32::MAX as u64
        } else {
            rng % 400
        };
        let (call, args) = if nominal {
            match (rng >> 32) % 5 {
                0 => ("create", json!([key, "part 🌱 世界 \"\\\n", count])),
                1 => ("restock", json!([key, count])),
                2 => ("restock", json!([key, u32::MAX])),
                _ => ("stock_of", json!([key])),
            }
        } else {
            match (rng >> 32) % 8 {
                0 => ("create", json!([key, count])),
                1 => ("restock", json!([key, count])),
                2 => ("remove", json!([key])),
                3 => ("fail", json!([key])),
                4 => ("read_after_write", json!([key])),
                5 => ("remove_fail", json!([key])),
                6 => ("ignored_fail", json!([key])),
                _ => ("stock_of", json!([key])),
            }
        };
        script.push(json!({"call":call,"args":args}));
        script.push(json!({"call":"total","args":[]}));
        if !nominal {
            script.push(json!({"call":"derived","args":[]}));
        }
    }
    let key = if nominal {
        json!("ffffffffffffffffffffffffffffffff")
    } else {
        json!(u64::MAX)
    };
    let args = if nominal {
        json!([key, "max", 123])
    } else {
        json!([key, 123])
    };
    script.push(json!({"call":"create","args":args}));
    script.push(json!({"call":"restock","args":[key,3]}));
    script.push(json!({"call":"total","args":[]}));
    if !nominal {
        script.push(json!({"call":"negative","args":[]}));
    }
    let mut reference = Runtime::new(program.clone()).unwrap();
    for step in &script[..500] {
        reference
            .invoke_json(step["call"].as_str().unwrap(), &step["args"])
            .unwrap();
    }
    reference.acknowledge_through(reference.version().saturating_sub(1), u64::MAX);
    fs::write(
        dir.join("before.bin"),
        reference.checkpoint_portable().unwrap(),
    )
    .unwrap();
    let mut count = 0;
    for (label, steps) in [("middle", &script[500..1000]), ("tail", &script[1000..])] {
        let expected: Vec<_> = steps
            .iter()
            .map(|step| {
                reference
                    .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                    .unwrap()
                    .json()
            })
            .collect();
        count += steps.len();
        write(&dir.join(format!("{label}-script.json")), &json!(steps));
        write(
            &dir.join(format!("{label}-expected.json")),
            &json!(expected),
        );
        fs::write(
            dir.join(format!("{label}.bin")),
            reference.checkpoint_portable().unwrap(),
        )
        .unwrap();
    }
    let version = reference.version();
    write(&dir.join("outbox-expected.json"),&json!(reference.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()));
    assert!(
        reference.outbox().len() > 1,
        "fixture must retain a nontrivial outbox"
    );
    reference.acknowledge_through(version.saturating_sub(1), u64::MAX);
    assert_eq!(
        reference.outbox().len(),
        1,
        "acknowledgement must preserve the latest event"
    );
    fs::write(
        dir.join("acknowledged.bin"),
        reference.checkpoint_portable().unwrap(),
    )
    .unwrap();
    let mut future = vec![
        json!({"call":"total","args":[]}),
        json!({"call":"stock_of","args":[key]}),
    ];
    future.push(json!({"call":"restock","args":[key,5]}));
    future.push(json!({"call":"total","args":[]}));
    if !nominal {
        future.push(json!({"call":"fail","args":[key]}));
        future.push(json!({"call":"total","args":[]}));
    }
    let expected: Vec<_> = future
        .iter()
        .map(|step| {
            reference
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json()
        })
        .collect();
    write(&dir.join("future-script.json"), &json!(future));
    write(&dir.join("future-expected.json"), &json!(expected));
    fs::write(
        dir.join("future.bin"),
        reference.checkpoint_portable().unwrap(),
    )
    .unwrap();
    let restored =
        Runtime::restore_portable(program, &fs::read(dir.join("future.bin")).unwrap()).unwrap();
    assert_eq!(
        restored.checkpoint_portable().unwrap(),
        fs::read(dir.join("future.bin")).unwrap()
    );
    write(
        &dir.join("metadata.json"),
        &json!({"reference_calls_after_checkpoint":count,"version_before_acknowledgement":version,"future_calls":future.len()}),
    );
}
fn main() {
    let out = std::env::args().nth(1).expect("expected fixture directory");
    let root = Path::new(&out);
    run(
        root,
        "inventory",
        include_str!("../../examples/inventory.lang"),
        true,
    );
    run(
        root,
        "bounded",
        &format!(
            "{}\n{EXTRA}",
            include_str!("../../examples/state-benchmark.lang")
        ),
        false,
    );
}
