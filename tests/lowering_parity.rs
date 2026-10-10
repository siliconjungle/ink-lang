use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax::parse};
const EXTRA: &str = r#"
record Chain{next:Option<Chain>,value:u32,}
fn chain(x:Chain)->Chain{return x;}
fn chain_next(x:Chain)->Option<Chain>{return x.next;}
fn chain_copy(x:Chain)->Chain{return Chain{next:x.next,value:x.value};}
record Tree{children:List<Tree>,value:u32,}
fn tree(x:Tree)->Tree{return x;}
fn tagged(x:Result<Option<Unit>,Error>)->Result<Option<Unit>,Error>{return x;}
fn float_identity(x:f32)->f32{return x;}
fn unit(x:Unit)->Unit{return x;}
state Words:Table<String,u64> =Table.empty();
event marker:u32;
query checked(x:u64,y:u64)->Result<u64,Error>{return checked_add(x,y).map_err(fn(_)=>Error.Overflow);}
query exact(x:Int,y:Int)->Int{return x*x-y;}
query options(x:Option<Int>)->Option<Int>{return x.map(fn(v)=>v*Int(3));}
query mapped(x:Result<Int,Error>)->Result<Int,Error>{return x.map(fn(v)=>v+Int(2)).map_err(fn(e)=>e);}
query equality(x:List<Item>,y:List<Item>)->Bool{return x==y;}
query word_values()->List<u64> reads(Words){return Words.values();}
change word(k:String,v:u64)->Result<Unit,Error> writes(Words){if Words.contains(k){Words.replace(k,v);}else{Words.insert(k,v);}return Ok(());}
change delete_word(k:String)->Result<Option<u64>,Error> writes(Words){return Ok(Words.remove(k));}
change fail(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed,marker){restock(id,7)?;emit marker(3);return Err(Error.Overflow);}
change ignored(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed,marker){let captured=fail(id);emit marker(4);return Ok(());}
query ordinary_error()->Result<Unit,Error>{return Err(Error.Missing);}
change ignore_query()->Result<Unit,Error>{ordinary_error();return Ok(());}
change try_query(id:ItemId)->Result<Unit,Error> writes(Items) emits(stock_changed){restock(id,2)?;ordinary_error()?;return Ok(());}
change events(id:ItemId)->Result<Int,Error> writes(Items) reads(total_units) emits(stock_changed,marker){emit marker(0);restock(id,1)?;emit marker(1);return Ok(total_units);}
fn repeated_arrays(xs:List<i32>)->List<i32>{return repeat(3,xs,fn(i)=>fn(acc)=>acc.map(fn(x)=>x+1));}
fn choose_arrays(xs:List<i32>,ys:List<i32>,b:Bool)->List<i32>{return choose(b,xs,ys).map(fn(x)=>x*2);}
fn composition(xs:List<i32>)->List<i32>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x<4).scan().sort();}
fn wide_scan(xs:List<u64>)->List<u64>{return xs.scan();}
fn wide_sort(xs:List<u64>)->List<u64>{return xs.sort();}
fn nested(xs:List<List<u32>>)->List<u32>{return xs.map(fn(xs)=>sum(xs));}
fn flags(xs:List<Bool>)->List<Bool>{return xs.filter(fn(x)=>x);}
fn fold(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(rest)=>x-rest);}
fn signed_div(x:i32,y:i32)->i32{return quot_or(x,y,-99);}
fn rem(x:u64,y:u64)->u64{return rem_or(x,y,99);}
fn float_neg(x:f32)->f32{return -x;}
fn binding(x:u32)->u32{let x:u32=x+1;return x*3;}
fn passthrough(x:Result<List<Int>,Error>)->Result<List<Int>,Error>{return x;}
"#;
fn source() -> String {
    format!(
        "{}\n{}\n{}",
        include_str!("../examples/inventory.lang"),
        include_str!("../examples/particles.ink")
            .split_once(';')
            .unwrap()
            .1,
        EXTRA
    )
}
fn fixtures(p: &verified_language::syntax::Program) -> (Vec<Value>, Vec<Value>) {
    let key = format!("{:032x}", 1);
    let mut reference = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let calls = vec![
        ("total", json!([])),
        ("create", json!([key, "a\u{0000}雪", 12])),
        ("create", json!([key, "duplicate", 0])),
        ("events", json!([key])),
        ("ignored", json!([key])),
        ("try_query", json!([key])),
        ("ignore_query", json!([])),
        ("stock_of", json!([key])),
        ("checked", json!([u64::MAX, 1])),
        (
            "exact",
            json!([{"Int":"123456789012345678901234567890"},{"Int":"-7"}]),
        ),
        ("options", json!([{"Some":{"Int":"-5"}}])),
        ("options", json!([{"None":null}])),
        ("mapped", json!([{"Ok":{"Int":"7"}}])),
        ("mapped", json!([{"Err":"Error.Missing"}])),
        (
            "equality",
            json!([[{"name":"x","stock":1}],[{"name":"x","stock":1}]]),
        ),
        ("word", json!(["😀", u64::MAX])),
        ("word", json!(["\u{e000}", 2])),
        ("word_values", json!([])),
        ("delete_word", json!(["😀"])),
        ("word_values", json!([])),
    ];
    for (name, args) in calls {
        let outcome = reference.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    let pure = vec![
        ("prefix", json!([[]])),
        ("ordered", json!([[]])),
        ("composition", json!([[]])),
        ("flags", json!([[false, false]])),
        ("choose_arrays", json!([[], [2, 3], true])),
        ("choose_arrays", json!([[1], [], false])),
        ("drift", json!([[[1, 2, 3]], [], 0.5])),
        (
            "chain",
            json!([{"next":{"Some":{"next":{"None":null},"value":4}},"value":3}]),
        ),
        (
            "chain_next",
            json!([{"next":{"Some":{"next":{"None":null},"value":4}},"value":3}]),
        ),
        (
            "chain_copy",
            json!([{"next":{"Some":{"next":{"None":null},"value":4}},"value":3}]),
        ),
        ("repeated_arrays", json!([[i32::MAX, 1, -5]])),
        ("choose_arrays", json!([[1], [2, 3, 4], true])),
        ("choose_arrays", json!([[1], [2, 3, 4], false])),
        ("float_identity", json!([1e20])),
        ("float_identity", json!([-0.0])),
        ("float_identity", json!([{"F32Bits":2139095040u32}])),
        (
            "tree",
            json!([{"children":[{"children":[],"value":3}],"value":u32::MAX}]),
        ),
        ("tagged", json!([{"Ok":{"Some":null}}])),
        ("tagged", json!([{"Err":"Error.Missing"}])),
        ("unit", json!([null])),
        (
            "matrix4",
            json!([
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
            ]),
        ),
        ("composition", json!([[3, -2, 3, i32::MAX, 0]])),
        ("kick", json!([[[1, 2, 3]], 0.5, [0, -2, 0]])),
        (
            "particles",
            json!([[{"position":[1,2,3],"velocity":[2,-2,1],"mass":5}],0.5]),
        ),
        ("drift", json!([[[1, 2, 3]], [[2, -2, 1]], 0.5])),
        ("gather", json!([[5, -7], [1, 0, 2, u32::MAX]])),
        ("indexed", json!([[i32::MIN, i32::MAX, 3, -9]])),
        ("iterate", json!([[1, -1]])),
        ("prefix", json!([[i32::MAX, 1, -2]])),
        ("ordered", json!([[3, -1, 3, i32::MIN]])),
        ("ordered_sum", json!([[16777216.0, 1.0, -16777216.0]])),
        ("wide_scan", json!([[u64::MAX, 1, 3]])),
        ("wide_sort", json!([[u64::MAX, 1, 0]])),
        ("nested", json!([[[1, 2], [], [u32::MAX, 1]]])),
        ("flags", json!([[true, false, true]])),
        ("fold", json!([[1, 2, 3]])),
        ("signed_div", json!([i32::MIN, -1])),
        ("signed_div", json!([-7, 2])),
        ("rem", json!([u64::MAX, 3])),
        ("float_neg", json!([{"F32Bits":2143289345u32}])),
        ("binding", json!([u32::MAX])),
        (
            "passthrough",
            json!([{"Ok":[{"Int":"123456789012345678901234567890"}]}]),
        ),
    ];
    for (name, args) in pure {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let inputs = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
            .collect();
        let value = eval::call(p, name, inputs, &mut 100000000).unwrap().json();
        steps.push(json!({"pure":name,"args":args}));
        expected.push(
            json!({"reply":{"value":value},"snapshot":reference.checkpoint_portable().unwrap()}),
        );
    }
    // Restore the exact reference snapshot and continue near counter exhaustion.
    let layout = verified_language::snapshot::layout(p).unwrap();
    let mut logical = verified_language::snapshot_wire::decode(
        &layout,
        &reference.checkpoint_portable().unwrap(),
        Default::default(),
    )
    .unwrap();
    for version in [u64::MAX - 1, u64::MAX] {
        logical.version = version;
        let bytes = verified_language::snapshot_wire::encode(&layout, &logical, Default::default())
            .unwrap();
        steps.push(json!({"restore":bytes}));
        let mut r = Runtime::restore_portable(p.clone(), &bytes).unwrap();
        for (name, args) in [
            ("ignored", json!([key])),
            ("events", json!([key])),
            ("total", json!([])),
        ] {
            let reply = match r.invoke_json(name, &args) {
                Ok(v) => json!({"outcome":v.json()}),
                Err(e) => json!({"host_error":e}),
            };
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":reply,"snapshot":r.checkpoint_portable().unwrap()}));
        }
    }
    (steps, expected)
}
fn compile(root: &Path) {
    let out = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
fn conformance(
    name: &str,
    p: verified_language::syntax::Program,
    steps: Vec<Value>,
    expected: Vec<Value>,
) {
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(format!("build/{name}"));
    fs::create_dir_all(&root).unwrap();
    if name == "lowering-parity" {
        fs::write(root.join("source.ink"), source()).unwrap();
    } else {
        fs::write(
            root.join("source.ink"),
            include_str!("../examples/query-errors.ink"),
        )
        .unwrap();
    }
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    if std::env::var_os("INK_TEST_GPU").is_some() || std::env::var_os("INK_TEST_WGPU").is_some() {
        verified_language::runtime::emit_gpu(&p, &root.join("gpu-module")).unwrap();
    }
    if std::env::var_os("INK_TEST_WGPU").is_some() && name == "lowering-parity" {
        let project = root.join("gpu-module/native");
        let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-gpu-target");
        let out = Command::new(env!("CARGO"))
            .args(["build", "--offline", "--quiet", "--manifest-path"])
            .arg(project.join("Cargo.toml"))
            .arg("--target-dir")
            .arg(&target)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let mut gpu_steps = steps.clone();
        for step in &mut gpu_steps {
            if step["pure"].is_string() {
                step["backend"] = json!("gpu");
            }
        }
        fs::write(
            root.join("gpu-script.json"),
            serde_json::to_vec(&gpu_steps).unwrap(),
        )
        .unwrap();
        let out = Command::new(target.join("debug/ink-module-program"))
            .arg(root.join("gpu-script.json"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let actual: Vec<Value> = serde_json::from_slice(&out.stdout).unwrap();
        let calls = gpu_steps
            .iter()
            .filter(|s| s["restore"].is_null())
            .collect::<Vec<_>>();
        assert_eq!(actual.len(), expected.len());
        let mut gpu_calls = 0;
        for (i, ((a, e), s)) in actual.iter().zip(&expected).zip(calls).enumerate() {
            let reply = if s["pure"].is_string() {
                json!({"value":a["value"]})
            } else if a["host_error"].is_string() {
                a.clone()
            } else {
                json!({"outcome":a})
            };
            assert_eq!(reply, e["reply"], "wgpu result {i}");
            if a["backend"] == "gpu" {
                gpu_calls += 1;
            }
            if [
                "repeated_arrays",
                "choose_arrays",
                "composition",
                "prefix",
                "ordered",
                "particles",
                "flags",
            ]
            .contains(&s["pure"].as_str().unwrap_or(""))
            {
                assert_eq!(a["backend"], "gpu", "expected eligible GPU kernel: {s}");
            }
        }
        println!(
            "wgpu: {} results matched; {gpu_calls} GPU calls",
            actual.len()
        );
    }
    let c = root.join("c");
    verified_language::runtime::emit_c_program(&module, &c).unwrap();
    fs::write(
        c.join("src/main.rs"),
        include_str!("lowering-parity-runner.rs.txt"),
    )
    .unwrap();
    let rust = root.join("rust");
    fs::create_dir_all(rust.join("src")).unwrap();
    fs::write(
        rust.join("src/lib.rs"),
        format!(
            "{}{}",
            verified_language::state_native::emit(&p, None).unwrap(),
            verified_language::runtime::STATE_WASM_ABI
        ),
    )
    .unwrap();
    fs::write(
        rust.join("src/main.rs"),
        fs::read(c.join("src/main.rs")).unwrap(),
    )
    .unwrap();
    fs::write(rust.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nnum-bigint=\"=0.4.8\"\nserde_json={version=\"=1.0.151\",features=[\"float_roundtrip\"]}\nsha2=\"=0.10.9\"\n[workspace]\n").unwrap();
    for dir in [&c, &rust] {
        compile(dir);
        let out = Command::new(dir.join("target/debug/compiled-state"))
            .arg(root.join("script.json"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let actual = serde_json::from_slice::<Vec<Value>>(&out.stdout).unwrap();
        assert_eq!(actual.len(), expected.len());
        for (i, (a, b)) in actual.iter().zip(&expected).enumerate() {
            assert_eq!(a["reply"], b["reply"], "{} step {i}", dir.display());
            assert_eq!(
                a["snapshot"],
                b["snapshot"],
                "{} snapshot {i}",
                dir.display()
            );
        }
    }
    if p.functions.iter().any(|f| f.name == "wide_scan") {
        fs::write(root.join("host.c"), include_str!("lowering-parity-host.c")).unwrap();
        let out = Command::new("clang")
            .args(["-std=c11", "-Wall", "-Wextra", "-Werror"])
            .arg(root.join("host.c"))
            .arg("-I")
            .arg(&c)
            .arg(c.join("target/debug/libcompiled_state.a"))
            .arg("-o")
            .arg(root.join("host"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert!(Command::new(root.join("host")).status().unwrap().success());
    }
    fs::write(
        root.join("program.mjs"),
        verified_language::javascript::lower(&module)
            .unwrap()
            .javascript,
    )
    .unwrap();
    fs::write(root.join("check.mjs"), include_str!("lowering-parity.mjs")).unwrap();
    fs::write(
        root.join("state-wasm.mjs"),
        verified_language::runtime::STATE_WASM_HOST,
    )
    .unwrap();
    let out = Command::new("node")
        .arg(root.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    if let Ok(zig) = std::env::var("INK_TEST_ZIG") {
        for dir in [&c, &rust] {
            let mut cmd = Command::new(env!("CARGO"));
            cmd.args([
                "build",
                "--offline",
                "--quiet",
                "--lib",
                "--target",
                "wasm32-unknown-unknown",
                "--manifest-path",
            ])
            .arg(dir.join("Cargo.toml"));
            if dir == &c {
                for (name, operation) in [("zig-cc", "cc"), ("zig-ar", "ar")] {
                    let path = dir.join(name);
                    fs::write(
                        &path,
                        format!(
                            "#!/bin/sh\nexec '{}' {operation} \"$@\"\n",
                            zig.replace('\'', "'\"'\"'")
                        ),
                    )
                    .unwrap();
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
                }
                cmd.env("INK_CC", dir.join("zig-cc"))
                    .env("INK_AR", dir.join("zig-ar"))
                    .env("INK_CC_KIND", "zig");
            }
            let out = cmd.output().unwrap();
            assert!(
                out.status.success(),
                "{}",
                String::from_utf8_lossy(&out.stderr)
            );
        }
        fs::write(
            root.join("check-wasm.mjs"),
            include_str!("lowering-parity-wasm.mjs"),
        )
        .unwrap();
        let out = Command::new("node")
            .arg(root.join("check-wasm.mjs"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        println!("{}", String::from_utf8_lossy(&out.stdout));
    }
}

#[test]
fn all_cpu_lowerings_preserve_values_transactions_and_portable_snapshots() {
    let p = parse(&source()).unwrap();
    let (steps, expected) = fixtures(&p);
    conformance("lowering-parity", p, steps, expected);
}
#[test]
fn query_and_result_keep_boundaries_agree_across_lowerings() {
    let p = parse(include_str!("../examples/query-errors.ink")).unwrap();
    let steps: Vec<Value> = serde_json::from_str(include_str!(
        "../reports/action-effects-phase1/query-errors/script.json"
    ))
    .unwrap();
    let mut r = Runtime::new(p.clone()).unwrap();
    let expected = steps
        .iter()
        .map(|s| {
            let o = r
                .invoke_json(s["call"].as_str().unwrap(), &s["args"])
                .unwrap();
            json!({"reply":{"outcome":o.json()},"snapshot":r.checkpoint_portable().unwrap()})
        })
        .collect();
    conformance("lowering-query-errors", p, steps, expected);
}

#[test]
fn resident_collection_lengths_survive_feedback() {
    if std::env::var_os("INK_TEST_WGPU").is_none() {
        return;
    }
    let p=parse("module Resident; fn shrink(xs:List<i32>)->List<i32>{return xs.filter(fn(x)=>x>0);} fn prefix(xs:List<i32>)->List<i32>{return xs.scan();} fn ordered(xs:List<i32>)->List<i32>{return xs.sort();}").unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/lowering-residency");
    verified_language::runtime::emit_gpu(&p, &root).unwrap();
    let target = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/parity-residency-target");
    let out = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(root.join("native/Cargo.toml"))
        .arg("--target-dir")
        .arg(&target)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    for (xs, want) in [
        (json!([3, -1, 2]), json!([3, 11])),
        (json!([-2, 0]), json!([])),
        (json!([]), json!([])),
    ] {
        let plan = json!({"inputs":{"xs":xs},"steps":[{"id":"filtered","call":"shrink","args":[{"input":"xs"}]},{"id":"prefix","call":"prefix","args":[{"step":"filtered"}]},{"id":"ordered","call":"ordered","args":[{"step":"prefix"}]}],"iterations":3,"feedback":{"xs":"ordered"},"outputs":["ordered"]});
        fs::write(
            root.join("pipeline.json"),
            serde_json::to_vec(&plan).unwrap(),
        )
        .unwrap();
        let out = Command::new(target.join("debug/ink-gpu-program"))
            .arg("--pipeline")
            .arg(root.join("pipeline.json"))
            .args(["--backend", "gpu"])
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let v: Value = serde_json::from_slice(&out.stdout).unwrap();
        assert_eq!(v["backend"], "gpu");
        assert_eq!(v["values"]["ordered"], want);
    }
}
