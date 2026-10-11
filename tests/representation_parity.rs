//! One exact source oracle for standalone representations on every lowering.
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use verified_language::{
    core::CheckedModule,
    representation::{self, Request},
    stateful::Runtime,
    syntax::parse,
};
fn root() -> PathBuf {
    let base=Path::new(env!("CARGO_MANIFEST_DIR"));
    std::env::var_os("INK_REP_PARITY_ROOT").map(|p|base.join(p)).unwrap_or_else(||base.join("build/representation-parity"))
}
fn run(command: &mut Command, log: &Path) {
    let output = command.output().unwrap();
    fs::write(log, &output.stderr).unwrap();
    assert!(
        output.status.success(),
        "{}\n{}",
        log.display(),
        String::from_utf8_lossy(&output.stderr)
    );
}
fn propose(module: &CheckedModule, dir: &Path) -> Request {
    fs::create_dir_all(dir).unwrap();
    fs::write(
        dir.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(module).unwrap())
            .unwrap(),
    )
    .unwrap();
    run(
        Command::new("python3")
            .arg(
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("knowledge/producers/representations.py"),
            )
            .arg(dir.join("model.json"))
            .arg("-o")
            .arg(dir.join("proposal.json")),
        &dir.join("producer.log"),
    );
    let value: Value =
        serde_json::from_slice(&fs::read(dir.join("proposal.json")).unwrap()).unwrap();
    serde_json::from_value(value["requests"][0].clone()).unwrap()
}
// Authenticated but unreachable mathematics must not become generated runtime
// data. In particular, C must not emit an arena for a type Rust never emitted.
fn add_unused_mathematics(request: &mut Request) -> Vec<String> {
    use verified_language::{
        logic::{Constructor, Declaration, Sort, Term},
        registry::{self, Entry, Membership, Sibling},
    };
    let datatype = Entry::from_declaration(
        &Declaration::Datatype {
            constructors: vec![
                Constructor {
                    name: "Empty".into(),
                    fields: vec![],
                },
                Constructor {
                    name: "Fork".into(),
                    fields: vec![Sort::SelfType, Sort::SelfType],
                },
            ],
        },
        vec![],
    )
    .unwrap();
    let id = registry::identity(&datatype).unwrap();
    let function = Entry::from_declaration(
        &Declaration::Function {
            params: vec![],
            result: Sort::Data(id.clone()),
            recursive: None,
            body: Term::Construct {
                datatype: id.clone(),
                constructor: 0,
                arguments: vec![],
            },
        },
        vec![id.clone()],
    )
    .unwrap();
    let fid = registry::identity(&function).unwrap();
    let b = &mut request.knowledge;
    b.objects.insert(id.clone(), datatype);
    b.objects.insert(fid.clone(), function);
    b.roots.extend([id.clone(), fid.clone()]);
    b.roots.sort();
    b.roots.dedup();
    b.membership.clear();
    let ids = b.objects.keys().cloned().collect::<Vec<_>>();
    let mut level = ids
        .chunks(64)
        .map(|xs| {
            let entries = xs.to_vec();
            for x in xs {
                b.membership.insert(
                    x.clone(),
                    Membership {
                        entries: entries.clone(),
                        path: vec![],
                    },
                );
            }
            (
                registry::identity(&json!({"schema":1,"entries":entries})).unwrap(),
                entries,
            )
        })
        .collect::<Vec<_>>();
    while level.len() > 1 {
        level = level
            .chunks(2)
            .map(|pair| {
                if pair.len() == 1 {
                    return pair[0].clone();
                }
                let (left, a) = &pair[0];
                let (right, z) = &pair[1];
                for x in a {
                    b.membership.get_mut(x).unwrap().path.push(Sibling {
                        sibling: right.clone(),
                        left: false,
                    });
                }
                for x in z {
                    b.membership.get_mut(x).unwrap().path.push(Sibling {
                        sibling: left.clone(),
                        left: true,
                    });
                }
                (
                    registry::identity(&json!({"schema":1,"left":left,"right":right})).unwrap(),
                    a.iter().chain(z).cloned().collect(),
                )
            })
            .collect();
    }
    b.snapshot.root = level[0].0.clone();
    vec![id, fid]
}
fn fixtures(module: &CheckedModule, calls: &[(&str, Value)]) -> Value {
    let mut source = Runtime::new(module.program().clone()).unwrap();
    let mut entries = vec![];
    let mut invoke = |name: &str, args: &Value| {
        let before = source.checkpoint_portable().unwrap();
        let reply = match source.invoke_json(name, args) {
            Ok(v) => json!({"ok":v.json()}),
            Err(e) => {
                assert_eq!(source.checkpoint_portable().unwrap(), before);
                json!({"error":e})
            }
        };
        entries.push(json!({"call":name,"args":args,"wire":serde_json::to_string(&json!({"call":name,"args":args})).unwrap(),"reply":reply,"snapshot":source.checkpoint_portable().unwrap(),"outbox":source.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()}));
    };
    for (name, args) in calls {
        invoke(name, args);
    }
    invoke("__unknown", &json!([]));
    drop(invoke);
    for (commit, position) in [(1, 0), (u64::MAX, u64::MAX)] {
        source.acknowledge_through(commit, position);
        entries.push(json!({"ack":[commit,position],"snapshot":source.checkpoint_portable().unwrap(),"outbox":source.outbox().iter().map(|e|json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()}));
    }
    let layout = verified_language::snapshot::layout(module.program()).unwrap();
    let saved = verified_language::snapshot_wire::decode(
        &layout,
        &source.checkpoint_portable().unwrap(),
        Default::default(),
    )
    .unwrap();
    let full = verified_language::snapshot_wire::encode(
        &layout,
        &verified_language::snapshot_wire::Logical {
            version: u64::MAX,
            ..saved
        },
        Default::default(),
    )
    .unwrap();
    source = Runtime::restore_portable(module.program().clone(), &full).unwrap();
    entries
        .push(json!({"restore":full,"snapshot":source.checkpoint_portable().unwrap(),"outbox":[]}));
    for (name, args) in calls {
        let reply = match source.invoke_json(name, args) {
            Ok(v) => json!({"ok":v.json()}),
            Err(e) => json!({"error":e}),
        };
        entries.push(json!({"call":name,"args":args,"reply":reply,"snapshot":source.checkpoint_portable().unwrap(),"outbox":[]}));
    }
    json!(entries)
}
fn check(name: &str, source: &str, request: Option<Request>, calls: Vec<(&str, Value)>) {
    // These emitted projects share package/binary names and a dependency cache.
    // Cargo releases its lock before we run/copy the result; another fixture
    // could replace it, or reuse a different C build-script fingerprint.
    static ARTIFACTS: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _artifacts = ARTIFACTS.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let dir = root().join(name);
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("source.ink"), source).unwrap();
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut request = request.unwrap_or_else(|| propose(&module, &dir));
    let unused = if name=="indexed-aggregate" { vec![] } else { add_unused_mathematics(&mut request) };
    fs::write(
        dir.join("request.json"),
        serde_json::to_vec(&request).unwrap(),
    )
    .unwrap();
    let checked = representation::check(&module, &request).unwrap();
    let reachable = checked
        .definition()
        .reachable_executable_declarations()
        .unwrap();
    assert!(unused.iter().all(|id| !reachable.contains_key(id)));
    let oracle = fixtures(&module, &calls);
    let encoded = serde_json::to_string(&oracle).unwrap();
    fs::write(dir.join("oracle.json"), &encoded).unwrap();
    let c = ink_lowering_c::representation_program::lower(&checked).unwrap();
    let wasm = ink_lowering_wasm::lower_representation(&checked).unwrap();
    let gpu = ink_lowering_gpu::lower_representation(&checked).unwrap();
    assert_eq!((&c.c, &c.rust), (&wasm.c, &wasm.rust));
    assert_eq!((&c.c, &c.rust), (&gpu.c, &gpu.rust));
    let js = verified_language::javascript::representation_program::lower(&checked).unwrap();
    for text in [&c.c, &c.rust, &js] {
        assert!(
            unused.iter().all(|id| !text.contains(id)),
            "unused mathematics was emitted"
        );
    }
    assert_eq!(
        js,
        ink_lowering_gpu::lower_representation_web(&checked).unwrap()
    );
    for text in [
        &c.c,
        &c.rust,
        &js,
        &verified_language::representation_program::lower(&checked).unwrap(),
    ] {
        for forbidden in [
            "ink_runtime",
            "ink_core",
            "CheckedRepresentation",
            "CheckedDefinition",
            "logic::Term",
            "registry::identity",
            "const image=",
            "image.definitions",
        ] {
            assert!(!text.contains(forbidden), "{name} retains {forbidden}");
        }
    }
    let target = root().join("target");
    for backend in ["rust-wasm", "c", "wgpu"] {
        let project = dir.join(backend);
        verified_language::representations::emit(&checked, backend, &project).unwrap();
        let mut library = fs::read_to_string(project.join("src/lib.rs")).unwrap();
        assert!(!library.contains("validate_inputs"));
        assert!(library.contains("CALLER CONTRACT"));
        // Make checkpoint encoding fail without affecting valid action calls.
        library.push_str("\npub fn check_calls_do_not_encode_snapshot(){let mut state=State::new().unwrap();state.layout.roots.clear();let oracle:Vec<Json>=serde_json::from_str(ORACLE_FOR_CALL_CHECK).unwrap();for step in oracle {if step.get(\"ack\").is_some()||step.get(\"restore\").is_some(){break;}if let(Some(name),Some(args),Some(expected))=(step[\"call\"].as_str(),step.get(\"args\"),step[\"reply\"].get(\"ok\")){assert_eq!(state.invoke_json(name,args).unwrap(),*expected);}}}\n");
        library.push_str(&format!("const ORACLE_FOR_CALL_CHECK:&str={encoded:?};\n"));
        fs::write(project.join("src/lib.rs"), library).unwrap();
        fs::create_dir_all(project.join("src/bin")).unwrap();
        fs::write(project.join("src/bin/check.rs"),format!("use ink_compiled_representation::State;use serde_json::{{Value as Json,json}};const ORACLE:&str={encoded:?};\n{}",include_str!("representation-parity-runner.rs.txt"))).unwrap();
        run(
            Command::new(env!("CARGO"))
                .args(["build", "--offline", "--quiet", "--manifest-path"])
                .arg(project.join("Cargo.toml"))
                .arg("--target-dir")
                .arg(&target)
                .env("CARGO_INCREMENTAL", "0"),
            &project.join("native-build.log"),
        );
        let empty = dir.join("empty");
        fs::create_dir_all(&empty).unwrap();
        run(
            Command::new(target.join("debug/check"))
                .current_dir(empty)
                .env("PATH", ""),
            &project.join("native-run.log"),
        );
    }
    for backend in ["javascript", "webgpu"] {
        let project = dir.join(backend);
        fs::create_dir_all(&project).unwrap();
        verified_language::representations::emit(&checked, backend, &project.join("program.mjs"))
            .unwrap();
        fs::write(project.join("oracle.json"), &encoded).unwrap();
        fs::write(
            project.join("state-wasm.mjs"),
            include_str!("../runtime/hosts/state-wasm.mjs"),
        )
        .unwrap();
        fs::write(
            project.join("check.mjs"),
            include_str!("representation-parity-runner.mjs"),
        )
        .unwrap();
        run(
            Command::new("node").arg(project.join("check.mjs")),
            &project.join("run.log"),
        );
    }
    if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        assert!(std::env::var_os("INK_TEST_ZIG").is_some(), "required standalone parity forbids skipping Wasm");
    }
    if let Ok(zig) = std::env::var("INK_TEST_ZIG") {
        for backend in ["rust-wasm", "wasm32"] {
            let project = dir.join(backend);
            verified_language::representations::emit(&checked, backend, &project).unwrap();
            let cc = project.join("zig-cc");
            let ar = project.join("zig-ar");
            for (path, op) in [(&cc, "cc -target wasm32-freestanding"), (&ar, "ar")] {
                fs::write(
                    path,
                    format!(
                        "#!/bin/sh\nexec '{}' {op} \"$@\"\n",
                        zig.replace('\'', "'\"'\"'")
                    ),
                )
                .unwrap();
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    fs::set_permissions(path, fs::Permissions::from_mode(0o755)).unwrap();
                }
            }
            run(
                Command::new(env!("CARGO"))
                    .args([
                        "build",
                        "--offline",
                        "--quiet",
                        "--lib",
                        "--target",
                        "wasm32-unknown-unknown",
                        "--manifest-path",
                    ])
                    .arg(project.join("Cargo.toml"))
                    .arg("--target-dir")
                    .arg(&target)
                    .env("INK_CC", &cc)
                    .env("INK_AR", &ar)
                    .env("CARGO_INCREMENTAL", "0"),
                &project.join("wasm-build.log"),
            );
            fs::copy(
                target.join("wasm32-unknown-unknown/debug/ink_compiled_representation.wasm"),
                project.join("program.wasm"),
            )
            .unwrap();
            fs::write(project.join("oracle.json"), &encoded).unwrap();
            fs::write(
                project.join("check.mjs"),
                include_str!("representation-parity-runner.mjs"),
            )
            .unwrap();
            run(
                Command::new("node")
                    .arg(project.join("check.mjs"))
                    .env("INK_REP_WASM", "1"),
                &project.join("wasm-run.log"),
            );
        }
    }
    if name=="indexed-aggregate" {
        for backend in ["javascript","rust-wasm","wasm32"] {
            if backend!="javascript" && std::env::var_os("INK_TEST_ZIG").is_none(){continue;}
            run(Command::new("node").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/indexed-durable.mjs")).arg(dir.join(backend)).arg(backend),&dir.join(format!("{backend}-durable.log")));
        }
    }
    fs::write(dir.join("checks.json"),serde_json::to_vec_pretty(&json!({"requests":oracle.as_array().unwrap().len(),"native":["rust","c","wgpu-host"],"javascript":["javascript","webgpu-host"],"wasm":if std::env::var_os("INK_TEST_ZIG").is_some(){json!(["rust-wasm","c-wasm"])}else{json!("not enabled")},"checks":"exact replies/errors, snapshots and outboxes; restore after every request; acknowledgement; exhausted counter; malformed snapshots; standalone dependency audit"})).unwrap()).unwrap();
}
#[test]
fn every_representation_backend_has_the_same_execution_contract() {
    let calls = vec![
        ("zero", json!([])),
        ("put", json!([u64::MAX, 42])),
        ("get", json!([u64::MAX])),
        ("replace_zero", json!([9, false])),
        ("erase_zero", json!([true])),
        ("put", json!([0, 7])),
        ("replace_zero", json!([99, true])),
        ("erase_zero", json!([false])),
        ("zero", json!([])),
    ];
    for (label, request) in [
        (
            "direct",
            include_str!("../knowledge/research/point-delta/direct.json"),
        ),
        (
            "refresh",
            include_str!("../knowledge/research/point-delta/refresh.json"),
        ),
        (
            "delta",
            include_str!("../knowledge/research/point-delta/delta.json"),
        ),
    ] {
        check(
            label,
            include_str!("../examples/point-query-delta.ink"),
            Some(serde_json::from_str(request).unwrap()),
            calls.clone(),
        );
    }
    check(
        "lists",
        include_str!("../examples/list-representations.ink"),
        None,
        vec![
            ("get", json!([0])),
            ("put", json!([0, [1, u64::MAX, 3], false])),
            ("put", json!([0, [9], true])),
            ("total", json!([[u64::MAX, 1]])),
            ("total", json!([vec![1u64; 4096]])),
            ("size", json!([[1, 2, 3]])),
            ("get", json!([0])),
        ],
    );
    let source = r#"module nominal_parity;
enum Error{Failed,} enum Colour{Red,Blue,} record Item{colour:Colour,values:List<u64>,maybe:Option<u64>,result:Result<u64,Error>,__proto__:u64,}
state Z:Table<u64,Item> =Table.empty();state A:Table<u64,u64> =Table.empty();event item:Item;event number:u64;
change put(key:u64,value:Item,fail:Bool)->Result<Unit,Error> writes(Z) emits(item){Z.remove(key);Z.insert(key,value);emit item(value);if fail{return Err(Error.Failed);}return Ok(());}
change set_a(key:u64,value:u64)->Result<Unit,Error> writes(A) emits(number){A.remove(key);A.insert(key,value);emit number(value);return Ok(());}
query get(key:u64)->Option<Item> reads(Z){return Z.get(key);}"#;
    let value = json!({"colour":"Colour.Red","values":[1,u64::MAX],"maybe":{"Some":3},"result":{"Err":"Error.Failed"},"__proto__":7});
    check(
        "nominal",
        source,
        None,
        vec![
            ("get", json!([9])),
            ("set_a", json!([2, 43])),
            ("put", json!([9, value.clone(), false])),
            ("put", json!([9, value, true])),
            ("get", json!([9])),
        ],
    );
    let n = json!({"Int":"123456789012345678901234567890"});
    let neg = json!({"Int":"-123456789012345678901234567890"});
    check(
        "integers",
        include_str!("../examples/exact-representation.ink"),
        None,
        vec![
            ("addition", json!([n.clone(), neg.clone()])),
            ("subtraction", json!([neg.clone(), n.clone()])),
            ("multiplication", json!([n.clone(), neg.clone()])),
            ("negative", json!([n.clone()])),
            ("less", json!([neg.clone(), n.clone()])),
            ("put", json!([0, n, true, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("put", json!([0, neg, true, true])),
            ("get", json!([0])),
        ],
    );
}

#[test]
fn word32_representations_have_equal_backend_coverage() {
    check(
        "word32",
        include_str!("../examples/word32-representation.ink"),
        None,
        vec![
            ("unsigned_add", json!([4294967295u64, 1])),
            ("signed_sub", json!([-2147483648i64, 1])),
            ("signed_less", json!([-2147483648i64, 2147483647i64])),
            ("signed_neg", json!([-2147483648i64])),
            ("quotient", json!([-2147483648i64, -1, 71])),
            ("quotient", json!([-11, 3, 71])),
            ("quotient", json!([11, -3, 71])),
            ("quotient", json!([1, 0, 71])),
            ("remainder", json!([-11, 3, 71])),
            ("remainder", json!([-2147483648i64, -1, 71])),
            ("unsigned_quotient", json!([u64::MAX, 3, 7])),
            (
                "put",
                json!([0, 4294967295u64, 1, -2147483648i64, -1, false]),
            ),
            ("get", json!([0])),
            ("put", json!([0, 1, 2, -11, 12, true])),
            ("get", json!([0])),
        ],
    );
}

#[test]
fn binary32_representations_have_equal_backend_coverage() {
    check(
        "binary32",
        include_str!("../examples/f32-representation.ink"),
        None,
        vec![
            ("add", json!([16777216.0, 1.0])),
            ("add", json!([{ "F32Bits":0x7fa12345u32 },0.0])),
            ("mul", json!([{ "F32Bits":0xffc54321u32 },-0.0])),
            ("sub", json!([1.0, 1.0])),
            ("mul", json!([-0.0, 3.0])),
            // Multiplication must round before addition; a fused result differs.
            ("multiply_add", json!([1.0000001192092896, 0.9999998807907104, -1.0])),
            ("add", json!([1.0e-40, 1.0e-40])),
            ("mul", json!([3.4028234663852886e38, 2.0])),
            ("neg", json!([{"F32Bits":0x7fa12345u64}])),
            (
                "equal",
                json!([{"F32Bits":0x7fc12345u64},{"F32Bits":0x7fc12345u64}]),
            ),
            ("equal", json!([-0.0, 0.0])),
            ("less", json!([-3.5, 2.25])),
            ("put", json!([0, 16777216.0, true, false])),
            ("put", json!([1, 1.0, true, false])),
            ("total_query", json!([])),
            ("put", json!([2, -16777216.0, true, false])),
            ("total_query", json!([])),
            ("put", json!([3,{"F32Bits":0x7fa12345u64},false,false])),
            ("get", json!([3])),
            ("put", json!([3, -0.0, true, true])),
            ("get", json!([3])),
        ],
    );
}

#[test]
fn vector_and_stored_equality_have_equal_backend_coverage() {
    let row = json!({"u":[4294967295u64,1],"i":[-2147483648i64,-1,7],"f":[-0.0,1.0,{"F32Bits":0x7fa12345u64},3.0]});
    let mut other = row.clone();
    other["f"][0] = json!(0.0);
    check(
        "vectors",
        include_str!("../examples/vector-representation.ink"),
        None,
        vec![
            ("add", json!([[4294967295u64, 7], [1, 4294967295u64]])),
            ("mul", json!([[-2147483648i64, -1, 7], [-1, -1, 3]])),
            (
                "sub",
                json!([[16777216.0, -0.0, 3.5, 1.0], [1.0, 0.0, 2.5, 1.0]]),
            ),
            ("component", json!([[1.0, 2.0, 3.0, 4.0]])),
            ("make", json!([1, 2])),
            ("equal", json!([row.clone(), row.clone()])),
            ("equal", json!([row.clone(), other.clone()])),
            (
                "list_equal",
                json!([[row.clone(), other.clone()], [row.clone(), other.clone()]]),
            ),
            ("list_equal", json!([[row.clone()], [other]])),
            ("put", json!([0, row.clone(), false])),
            ("get", json!([0])),
            ("put", json!([0, row, true])),
            ("get", json!([0])),
        ],
    );
}

#[test]
fn filtered_sum_and_count_deltas_have_equal_backend_coverage() {
    let mut calls = vec![];
    for i in 0..8u64 {
        calls.extend([
            (
                "put",
                json!([
                    i % 3,
                    if i % 3 == 0 { u64::MAX } else { i },
                    i % 2 == 0,
                    i % 5 == 0
                ]),
            ),
            ("erase", json!([(i + 1) % 3, i % 3 == 0])),
            ("total_query", json!([])),
            ("count_query", json!([])),
        ]);
    }
    for (label, request) in [
        (
            "sum-delta",
            include_str!("../knowledge/research/filtered-aggregate/sum-delta.json"),
        ),
        (
            "count-delta",
            include_str!("../knowledge/research/filtered-aggregate/count-delta.json"),
        ),
    ] {
        check(
            label,
            include_str!("../examples/filtered-aggregate.ink"),
            Some(serde_json::from_str(request).unwrap()),
            calls.clone(),
        );
    }
}

#[test]
fn numerical_pure_closures_have_equal_backend_coverage() {
    check(
        "pure-numerical",
        include_str!("../examples/pure-numerical-representation.ink"),
        None,
        vec![
            ("put", json!([0, 1])),
            ("filtered_query", json!([[0, 1, 4294967295u64], 1, 3])),
            ("folded_query", json!([[1, 2, 3], 7, u64::MAX])),
            ("folded_query", json!([[], 7, 3])),
            (
                "negative_query",
                json!([[-2147483648i64, -1, 7], 2147483647i64]),
            ),
        ],
    );
}

#[test]
fn scalar_physical_storage_has_equal_backend_coverage() {
    let source = "module scalar_fixture; query echo(value:u64)->u64{return value;}";
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    for sort in ["Bool", "U64"] {
        let dir = root().join(format!("scalar-{sort}"));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("model.json"), serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
        run(Command::new("python3").arg("knowledge/producers/scalar_representation.py").arg(dir.join("model.json")).args(["--sort",sort,"-o"]).arg(dir.join("request.json")), &dir.join("producer.log"));
        let request = serde_json::from_slice(&fs::read(dir.join("request.json")).unwrap()).unwrap();
        check(&format!("scalar-{sort}"),source,Some(request),vec![("echo",json!([0])),("echo",json!([u64::MAX]))]);
    }
}

#[test]
fn unused_source_carriers_do_not_break_any_standalone_backend(){
    let source=include_str!("../knowledge/research/source-representations/app.ink");
    let calls=vec![("put",json!([0,19])),("get",json!([0])),("zero",json!([])),
        ("erase",json!([0,true])),("zero",json!([])),("erase",json!([0,false])),("zero",json!([]))];
    for (name,request) in [("retained-direct",include_str!("../knowledge/research/source-representations/retained-direct.json")),
        ("retained-query-cache",include_str!("../knowledge/research/source-representations/retained-query-cache.json"))]{
        check(name,source,Some(serde_json::from_str(request).unwrap()),calls.clone());
    }
}

#[test]
fn fixed_key_keep_deltas_execute_as_standalone_programs_on_every_cpu_target() {
    let source=include_str!("../knowledge/research/keep-parity/app.ink");
    let calls=(0..32u64).map(|i|match i%8 {
        0=>("put",json!([0,i*19])), 1=>("zero",json!([])),
        2=>("overwrite",json!([u64::MAX-i])), 3=>("get",json!([0])),
        4=>("clear",json!([])), 5=>("zero",json!([])),
        6=>("erase",json!([0,true])), _=>("put",json!([1,i*23])),
    }).collect::<Vec<_>>();
    for (name,bytes) in [
        ("fixed-key-baseline",include_str!("../knowledge/research/keep-parity/representation-0.json")),
        ("fixed-key-cache",include_str!("../knowledge/research/keep-parity/representation-1.json")),
    ] {
        check(name,source,Some(serde_json::from_str(bytes).unwrap()),calls.clone());
    }
}

#[test]
fn indexed_cached_sum_count_have_equal_backend_coverage() {
    let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/indexed-aggregate/request.json");
    let request:Request=serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
    let mut calls=vec![];
    // Opposing insertion orders exercise single and double rotations.
    for key in [8u64,4,12,2,6,10,14,1,3,5,7,9,11,13,15,0,u64::MAX] {
        calls.push(("put",json!([key,key,key%2==0,false])));
        calls.push(("total_query",json!([])));calls.push(("count_query",json!([])));
    }
    for key in [0u64,7,12,u64::MAX,99,4,8] {
        calls.extend([("put",json!([key,u64::MAX,true,true])),("erase",json!([key,true])),("total_query",json!([])),("count_query",json!([])),("put",json!([key,u64::MAX,true,false])),("total_query",json!([])),("count_query",json!([])),("erase",json!([key,false])),("total_query",json!([])),("count_query",json!([]))]);
    }
    check("indexed-aggregate",include_str!("../examples/filtered-aggregate.ink"),Some(request),calls);
}

#[test]
fn packed_and_indexed_chunks_preserve_every_standalone_target() {
    let source = include_str!("../knowledge/research/storage-bulk/app.ink");
    let mut calls = vec![("put", json!([1023, 991])), ("get", json!([1023]))];
    for i in 0..12u64 {
        calls.extend([
            ("put", json!([11 - i, u64::MAX - i])),
            ("get", json!([0])),
            ("get", json!([11 - i])),
        ]);
    }
    for i in 0..24u64 {
        calls.extend([
            ("put", json!([i % 13, i * 31])),
            ("erase", json!([(i + 3) % 13, i % 3 == 0])),
            ("get", json!([0])),
            ("get", json!([i % 13])),
            ("get", json!([u64::MAX])),
        ]);
    }
    for (name, bytes) in [
        (
            "packed-2",
            include_str!("../knowledge/research/storage-bulk/packed-2.json"),
        ),
        (
            "packed-4",
            include_str!("../knowledge/research/storage-bulk/packed-4.json"),
        ),
        (
            "indexed-2",
            include_str!("../knowledge/research/storage-bulk/indexed-2-hot-0.json"),
        ),
        (
            "indexed-4",
            include_str!("../knowledge/research/storage-bulk/indexed-4-hot-0.json"),
        ),
        (
            "indexed-4-1023",
            include_str!("../knowledge/research/storage-bulk/indexed-4-hot-1023.json"),
        ),
    ] {
        check(
            name,
            source,
            Some(serde_json::from_str(bytes).unwrap()),
            calls.clone(),
        );
    }
}

#[test]
fn boolean_delta_and_refresh_fallbacks_preserve_every_standalone_target() {
    let source = include_str!("../knowledge/research/storage-bulk/booleans.ink");
    let mut calls = vec![("any_query", json!([])), ("all_query", json!([]))];
    for i in 0..28u64 {
        calls.extend([
            ("insert", json!([i % 7, i % 2 == 0, i % 6 == 0])),
            ("any_query", json!([])),
            ("all_query", json!([])),
            ("replace", json!([(i + 3) % 7, i % 3 == 0, i % 5 == 0])),
            ("any_query", json!([])),
            ("all_query", json!([])),
            ("erase", json!([(i + 1) % 7, i % 4 == 0])),
            ("any_query", json!([])),
            ("all_query", json!([])),
            ("get", json!([i % 7])),
        ]);
    }
    for i in 0..7 {
        calls.extend([
            ("erase", json!([i, false])),
            ("any_query", json!([])),
            ("all_query", json!([])),
        ]);
    }
    for (name, bytes) in [
        (
            "any-delta",
            include_str!("../knowledge/research/storage-bulk/any-delta.json"),
        ),
        (
            "all-delta",
            include_str!("../knowledge/research/storage-bulk/all-delta.json"),
        ),
    ] {
        check(
            name,
            source,
            Some(serde_json::from_str(bytes).unwrap()),
            calls.clone(),
        );
    }
}
