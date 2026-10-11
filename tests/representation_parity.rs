#[path="support/compiled_state.rs"]
mod compiled_state;
use compiled_state::CompiledState;
// One exact source oracle for standalone representations on every lowering.
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
    std::env::var_os("INK_REP_PARITY_ROOT")
        .map(|p| Path::new(env!("CARGO_MANIFEST_DIR")).join(p))
        .unwrap_or_else(|| {
            Path::new(env!("CARGO_MANIFEST_DIR")).join("build/representation-parity")
        })
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
    propose_with(module, dir, &[]).remove(0)
}
fn propose_with(module: &CheckedModule, dir: &Path, options: &[&str]) -> Vec<Request> {
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
            .args(options)
            .arg("-o")
            .arg(dir.join("proposal.json")),
        &dir.join("producer.log"),
    );
    let value: Value =
        serde_json::from_slice(&fs::read(dir.join("proposal.json")).unwrap()).unwrap();
    serde_json::from_value(value["requests"].clone()).unwrap()
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
    let _artifacts = ARTIFACTS
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let dir = root().join(name);
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("source.ink"), source).unwrap();
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let request = request.unwrap_or_else(|| propose(&module, &dir));
    let mut request = if request.knowledge.objects[&request.representation].payload["actions"]
        .as_object()
        .unwrap()
        .values()
        .all(|a| a.get("compact").is_some())
    {
        request
    } else {
        fs::write(
            dir.join("full-request.json"),
            serde_json::to_vec(&request).unwrap(),
        )
        .unwrap();
        run(
            Command::new("python3")
                .arg(
                    Path::new(env!("CARGO_MANIFEST_DIR"))
                        .join("knowledge/producers/compact_observation.py"),
                )
                .arg(dir.join("full-request.json"))
                .arg("--store")
                .arg(dir.join("compact-store"))
                .arg("-o")
                .arg(dir.join("compact-request.json")),
            &dir.join("compact-producer.log"),
        );
        serde_json::from_slice(&fs::read(dir.join("compact-request.json")).unwrap()).unwrap()
    };
    let unused = if name == "indexed-aggregate" {
        vec![]
    } else {
        add_unused_mathematics(&mut request)
    };
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
    let mut native_backends = vec!["rust-wasm", "c", "wgpu"];
    if std::env::var_os("INK_TEST_PACKED").is_some() { native_backends.push("rust-wasm-packed"); }
    if std::env::var_os("INK_TEST_MEMO").is_some() { native_backends.push("rust-wasm-memo"); }
    for backend in native_backends {
        let project = dir.join(backend);
        verified_language::representations::emit(&checked, backend, &project).unwrap();
        let mut library = fs::read_to_string(project.join("src/lib.rs")).unwrap();
        assert!(!library.contains("validate_inputs"));
        assert!(library.contains("CALLER CONTRACT"));
        // Make checkpoint encoding fail without affecting valid action calls.
        library.push_str("\npub fn check_calls_do_not_encode_snapshot(){let mut state=State::new().unwrap();state.layout.roots.clear();let oracle:Vec<Json>=serde_json::from_str(ORACLE_FOR_CALL_CHECK).unwrap();for step in oracle {if step.get(\"ack\").is_some()||step.get(\"restore\").is_some(){break;}if let(Some(name),Some(args),Some(expected))=(step[\"call\"].as_str(),step.get(\"args\"),step[\"reply\"].get(\"ok\")){assert_eq!(state.invoke_json(name,args).unwrap(),*expected);}}}\n");
        library.push_str(&format!("const ORACLE_FOR_CALL_CHECK:&str={encoded:?};\n"));
        let types=checked.projection().types.iter().filter(|(_,sort)|match sort{verified_language::logic::Sort::Data(id)=>reachable.contains_key(id),_=>true}).enumerate().map(|(i,(t,_))|(t.clone(),i)).collect::<std::collections::BTreeMap<_,_>>();
        library.push_str("\nfn typed_invoke(state:&mut State,name:&str,args:&Json)->Result<Json,String>{let xs=args.as_array().unwrap();match name{\n");
        for action in &module.program().actions {
            library.push_str(&format!("{:?}=>{{",action.name));let mut inputs=vec![];
            for(i,(_,t))in action.params.iter().enumerate(){let key=serde_json::to_string(t).unwrap();let index=types[&key];library.push_str(&format!("let a{i}=read_{index}(&xs[{i}],0)?;"));inputs.push(format!("{}a{i}",if matches!(checked.projection().types[&key],verified_language::logic::Sort::Data(_)){"&"}else{""}));}
            let reply=types[&serde_json::to_string(&action.result).unwrap()];
            let channels=module.program().events.keys().collect::<Vec<_>>();
            library.push_str(&format!("let view=state.invoke_view_{}({})?;let channels:&[&str]=&{channels:?};let result=write_{reply}(&view.result,0)?;let events:Vec<Json>=view.events.iter().map(|e|json!({{\"commit\":e.commit,\"position\":e.position,\"channel\":channels[e.channel],\"value\":e.value}})).collect();Ok(json!({{\"result\":result,\"committed\":view.committed,\"version\":view.version,\"events\":events}}))}},\n",action.name,inputs.join(",")));
        }
        library.push_str("_=>Err(format!(\"unknown action {name}\"))}}\npub fn check_typed_entrypoints(){let mut state=State::new().unwrap();let oracle:Vec<Json>=serde_json::from_str(ORACLE_FOR_CALL_CHECK).unwrap();for step in oracle{if let Some(bytes)=step.get(\"restore\"){let bytes:Vec<u8>=serde_json::from_value(bytes.clone()).unwrap();state=State::restore(&bytes).unwrap();}else if let Some(ack)=step.get(\"ack\"){state.acknowledge_through(ack[0].as_u64().unwrap(),ack[1].as_u64().unwrap());}else{let reply=match typed_invoke(&mut state,step[\"call\"].as_str().unwrap(),&step[\"args\"]){Ok(v)=>json!({\"ok\":v}),Err(e)=>json!({\"error\":e})};assert_eq!(reply,step[\"reply\"]);}assert_eq!(json!(state.checkpoint().unwrap()),step[\"snapshot\"]);assert_eq!(state.outbox_json(),step[\"outbox\"]);}}\n");
        fs::write(project.join("src/lib.rs"), library).unwrap();
        fs::create_dir_all(project.join("src/bin")).unwrap();
        let runner=include_str!("representation-parity-runner.rs.txt").replace("fn main(){","fn main(){ink_compiled_representation::check_typed_entrypoints();").replace("fn main() {","fn main() {ink_compiled_representation::check_typed_entrypoints();");
        fs::write(project.join("src/bin/check.rs"),format!("use ink_compiled_representation::State;use serde_json::{{Value as Json,json}};const ORACLE:&str={encoded:?};\n{runner}")).unwrap();
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
        assert!(
            std::env::var_os("INK_TEST_ZIG").is_some(),
            "required standalone parity forbids skipping Wasm"
        );
    }
    if let Ok(zig) = std::env::var("INK_TEST_ZIG") {
        let mut wasm_backends = vec!["rust-wasm", "wasm32"];
        if std::env::var_os("INK_TEST_PACKED").is_some() { wasm_backends.push("rust-wasm-packed"); }
        if std::env::var_os("INK_TEST_MEMO").is_some() { wasm_backends.push("rust-wasm-memo"); }
        for backend in wasm_backends {
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
    if name == "indexed-aggregate" {
        for backend in ["javascript", "rust-wasm", "wasm32"] {
            if backend != "javascript" && std::env::var_os("INK_TEST_ZIG").is_none() {
                continue;
            }
            run(
                Command::new("node")
                    .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/indexed-durable.mjs"))
                    .arg(dir.join(backend))
                    .arg(backend),
                &dir.join(format!("{backend}-durable.log")),
            );
        }
    }
    fs::write(dir.join("checks.json"),serde_json::to_vec_pretty(&json!({"requests":oracle.as_array().unwrap().len(),"native":if std::env::var_os("INK_TEST_PACKED").is_some(){json!(["rust","c","wgpu-host","rust-packed"])}else{json!(["rust","c","wgpu-host"])},"javascript":["javascript","webgpu-host"],"wasm":if std::env::var_os("INK_TEST_ZIG").is_some(){if std::env::var_os("INK_TEST_PACKED").is_some(){json!(["rust-wasm","c-wasm","rust-wasm-packed"])}else{json!(["rust-wasm","c-wasm"])}}else{json!("not enabled")},"checks":"exact replies/errors, snapshots and outboxes; restore after every request; acknowledgement; exhausted counter; malformed snapshots; standalone dependency audit"})).unwrap()).unwrap();
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
            include_str!("../knowledge/research/composable-state/point-delta/direct.json"),
        ),
        (
            "refresh",
            include_str!("../knowledge/research/composable-state/point-delta/refresh.json"),
        ),
        (
            "delta",
            include_str!("../knowledge/research/composable-state/point-delta/delta.json"),
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
            (
                "multiply_add",
                json!([1.0000001192092896, 0.9999998807907104, -1.0]),
            ),
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
            include_str!("../knowledge/research/composable-state/filtered-aggregate/sum-delta.json"),
        ),
        (
            "count-delta",
            include_str!("../knowledge/research/composable-state/filtered-aggregate/count-delta.json"),
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
fn existing_key_domains_and_utf8_values_have_equal_backend_coverage() {
    let low="00000000000000000000000000000001";
    let high="ffffffffffffffff0000000000000001";
    let row=json!({"label":"café 🌍","owner":high,"amount":-2147483648i64});
    let mut calls=vec![("literal",json!([])),("same",json!([row.clone(),row.clone()]))];
    for key in ["\u{10000}","\u{e000}","a\0z","","café"] {
        calls.push(("put_string",json!([key,row.clone(),false])));
    }
    calls.extend([
        ("get_string",json!(["\u{10000}"])),
        ("put_string",json!(["\u{e000}",{"label":"aborted","owner":low,"amount":17},true])),
        ("get_string",json!(["\u{e000}"])),("erase_string",json!(["missing"])),
        ("erase_string",json!(["a\0z"])),
        ("put_id",json!([high,"high"])),("put_id",json!([low,"low"])),
        ("put_id",json!(["00000000000000010000000000000001","middle"])),
        ("get_id",json!([high])),
    ]);
    for key in [2147483647i64,0,-1,-2147483648] {calls.push(("put_signed",json!([key,"signed"])));}
    for key in [4294967295u64,0,17] {calls.push(("put_word",json!([key,"word"])));}

    check("frontier-keys",include_str!("../examples/frontier-key-domains.ink"),None,calls);
}

#[test]
fn invocation_local_owners_and_bounded_loops_have_equal_backend_coverage() {
    check("frontier-local",include_str!("../examples/frontier-local-computation.ink"),None,vec![
        ("edited",json!([[],0,0,0])),("edited",json!([[1,2,3],0,2,3])),
        ("edited",json!([[1,2,3],4294967295u64,1,7])),
        ("edited",json!([[1,2,3],1,4294967295u64,1])),
        ("fill",json!([0,7])),("fill",json!([17,4294967295u64])),
        ("scanned",json!([[1,4294967295u64,3],4294967295u64,1])),
        ("scanned",json!([[1,2,3],0,17])),("scanned",json!([[1,2,3],2,17])),
        ("iterated",json!([0,7])),("iterated",json!([17,7])),
        ("iterated",json!([4294967295u64,1000])),("iterated",json!([100,7])),
        ("repeated",json!([4294967295u64])),
        ("keys",json!([-2147483648i64,2147483647i64,0])),("keys",json!([17,17,17])),
        ("booleans",json!([true,false])),("booleans",json!([false,false])),
        ("put",json!([0,[1,2,3],17,7,false])),("get",json!([0])),
        ("put",json!([0,[9,9],17,1,true])),("get",json!([0])),
    ]);
}

#[test]
fn guarded_dynamic_point_deltas_preserve_future_histories_and_migrations() {
    let source=include_str!("../examples/frontier-point-maintenance.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-point");
    let requests=propose_with(&module,&dir,&["--cache-query","zero","--preserve-cache","--dynamic-delta"]);
    let direct=representation::check(&module,&requests[0]).unwrap();
    let delta=representation::check(&module,&requests[1]).unwrap();
    let proposal:Value=serde_json::from_slice(&fs::read(dir.join("proposal.json")).unwrap()).unwrap();
    let migration=representation::check_migration(&direct,&delta,&serde_json::from_value(proposal["migration"]["knowledge"].clone()).unwrap(),proposal["migration"]["root"].as_str().unwrap()).unwrap();
    let mut session=CompiledState::new(direct).unwrap();
    let mut reference=Runtime::new(module.program().clone()).unwrap();
    let mut calls=vec![("zero",json!([])),("replace",json!([0,7,false]))];
    for i in 0..32u64 {
        let key=if i%3==0{0}else{i%7+1};
        calls.push(("put",json!([key,i])));
        calls.push(("replace",json!([key,i+100,i%5==0])));
        calls.push(("zero",json!([])));
        calls.push(("erase",json!([key,i%4==0])));
        calls.push(("get",json!([key])));
        calls.push(("zero",json!([])));
    }
    for (i,(name,args)) in calls.iter().enumerate() {
        if i==17 {session.migrate_portable(delta.clone(),&migration).unwrap();}
        assert_eq!(session.invoke_json(name,args).unwrap(),reference.invoke_json(name,args).unwrap().json());
        assert_eq!(session.checkpoint().unwrap(),reference.checkpoint_portable().unwrap());
        if i%19==0 {session=CompiledState::restore(if i<17{representation::check(&module,&requests[0]).unwrap()}else{delta.clone()},&session.checkpoint().unwrap()).unwrap();}
    }
    // Re-sign all affected entries and republish the Merkle tree. Authentication
    // must succeed, while turning "unrelated key" into "same key" must fail proof checking.
    fs::write(dir.join("delta.json"),serde_json::to_vec(&requests[1]).unwrap()).unwrap();
    let script=r#"import json,sys,tempfile
sys.path.insert(0,'knowledge')
from ink_knowledge import Store
from ink_knowledge.store import identity
r=json.load(open(sys.argv[1]));objects=r['knowledge']['objects'];changed=False
for e in objects.values():
 t=e.get('payload',{}).get('declaration',{}).get('Theorem',{})
 if t.get('conditions') and any(p[0]=='dynamic_target' for p in t.get('params',[])):
  t['conditions'][0]['to']={'Bool':True};changed=True;break
assert changed
renamed={};pending=dict(objects);rebuilt={}
def rewrite(x):
 if isinstance(x,str):return renamed.get(x,x)
 if isinstance(x,list):return [rewrite(v) for v in x]
 if isinstance(x,dict):return {k:rewrite(v) for k,v in x.items()}
 return x
while pending:
 ready=[k for k,e in pending.items() if not any(d in pending for d in e.get('dependencies',[]))]
 assert ready,'dependency cycle'
 for old in ready:
  e=rewrite(pending.pop(old));e['dependencies']=sorted(set(e['dependencies']));new=identity(e);renamed[old]=new;rebuilt[new]=e
r['representation']=renamed[r['representation']]
with tempfile.TemporaryDirectory() as directory:
 r['knowledge']=Store.publish(directory,rebuilt.values()).bundle(list(rebuilt))
 print(json.dumps(r))
"#;
    let output=Command::new("python3").args(["-c",script]).arg(dir.join("delta.json")).current_dir(env!("CARGO_MANIFEST_DIR")).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    let forged:Request=serde_json::from_slice(&output.stdout).unwrap();
    verified_language::registry::CheckedBundle::check(&forged.knowledge).unwrap();
    assert!(representation::check(&module,&forged).is_err());
    check("frontier-point-delta",source,Some(requests[1].clone()),calls);
}

#[test]
fn ordinary_heap_and_grid_search_participate_in_stateful_admission() {
    let source=format!("{}{}",include_str!("../examples/local-pathfinding.ink"),r#"
state Rows:Table<u64,List<u32>> = Table.empty();
query sorted(xs:List<u32>)->List<u32>{return heap_sorted(xs);}
query route(grid:List<u32>,width:u32,start:u32,goal:u32,limit:u32)->Route{return astar(grid,width,start,goal,limit);}
change put(key:u64,xs:List<u32>,fail:Bool)->Result<Unit,Bool> writes(Rows){Rows.remove(key);Rows.insert(key,heap_sorted(xs));if fail{return Err(true);}return Ok(());}
query get(key:u64)->Option<List<u32>> reads(Rows){return Rows.get(key);}
"#);
    check("frontier-algorithms",&source,None,vec![
        ("sorted",json!([[]])),("sorted",json!([[9,1,9,0,4294967295u64,7]])),
        ("route",json!([[0,0,0,0],2,0,3,16])),
        ("route",json!([[0,0,0,0],2,0,3,0])),
        ("route",json!([[0,0,0,0],0,0,3,16])),
        ("route",json!([[0,0,0,0],2,7,3,16])),
        ("route",json!([[0,1,0,1,1,1,0,1,0],3,0,8,64])),
        ("route",json!([[0,0,0,0,1,0,0,0,0],3,0,8,64])),
        ("put",json!([0,[9,1,9,0],false])),("get",json!([0])),
        ("put",json!([0,[7,7,7],true])),("get",json!([0])),
    ]);
}

#[test]
fn independently_proved_caches_compose_and_migrate_with_exact_histories() {
    let source = include_str!("../examples/frontier-component-caches.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("frontier-product");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("model.json"), serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
    let script = r#"import json,sys
from pathlib import Path
sys.path.insert(0,'knowledge/producers')
from representations import generate
from representation_product import generate as product
from representation_bridge import generate as bridge
from ink_knowledge import Store,identity
p=Path(sys.argv[1]);m=json.loads((p/'model.json').read_text());rs=[]
for q in ['zero','one']:
 r=generate(m,p/q,cache_query=q,preserve_cache=True,dynamic_delta=True)['requests'][1]
 (p/(q+'.json')).write_text(json.dumps(r));rs.append(r)
r=product(m,rs,p/'product',{'one':1});(p/'product.json').write_text(json.dumps(r))
for name,a,b in [('forward',rs[0],r),('backward',r,rs[0])]:
 (p/(name+'.json')).write_text(json.dumps(bridge(a,b,p/name,True)))
# Removing a component relation leaves its future-observation proof without
# the required premise. Reauthenticate the candidate to test mathematics.
objects=dict(r['knowledge']['objects']);e=objects.pop(r['representation'])
plan=e['payload'];plan['relations'].pop();plan['initialisation'].pop()
for action in plan['actions'].values():action['preservation'].pop()
rid=identity(e);objects[rid]=e
r['representation']=rid;r['knowledge']=Store.publish(p/'forged',objects.values()).bundle([rid])
(p/'forged.json').write_text(json.dumps(r))
"#;
    run(Command::new("python3").args(["-c", script]).arg(&dir).current_dir(env!("CARGO_MANIFEST_DIR")), &dir.join("producer.log"));
    let load = |name: &str| -> Request { serde_json::from_slice(&fs::read(dir.join(format!("{name}.json"))).unwrap()).unwrap() };
    let before = representation::check(&module, &load("zero")).unwrap();
    let request = load("product");
    let product = representation::check(&module, &request).unwrap();
    let migration = |a, b, name: &str| {
        let v: Value = serde_json::from_slice(&fs::read(dir.join(format!("{name}.json"))).unwrap()).unwrap();
        representation::check_migration(a, b, &serde_json::from_value(v["knowledge"].clone()).unwrap(), v["root"].as_str().unwrap()).unwrap()
    };
    let forward = migration(&before, &product, "forward");
    let backward = migration(&product, &before, "backward");
    let forged = load("forged");
    verified_language::registry::CheckedBundle::check(&forged.knowledge).unwrap();
    assert!(representation::check(&module, &forged).is_err());
    let mut session = CompiledState::new(before.clone()).unwrap();
    let mut source_runtime = Runtime::new(module.program().clone()).unwrap();
    let mut calls = vec![("zero", json!([])), ("one", json!([]))];
    for i in 0..10u64 {
        calls.extend([
            ("put", json!([i%3, u64::MAX-i])),
            ("zero", json!([])), ("one", json!([])),
            ("replace", json!([i%3, i, i%4==0])),
            ("zero", json!([])), ("one", json!([])),
            ("erase", json!([(i+1)%3, i%3==0])),
            ("get", json!([i%3])), ("zero", json!([])), ("one", json!([])),
        ]);
    }
    for (i, (name, args)) in calls.iter().enumerate() {
        if i == 11 { session.migrate_portable(product.clone(), &forward).unwrap(); }
        if i == 77 { session.migrate_portable(before.clone(), &backward).unwrap(); }
        assert_eq!(session.invoke_json(name,args).unwrap(), source_runtime.invoke_json(name,args).unwrap().json());
        assert_eq!(session.checkpoint().unwrap(), source_runtime.checkpoint_portable().unwrap());
        if i%13 == 0 { session=CompiledState::restore(if (11..77).contains(&i){product.clone()}else{before.clone()}, &session.checkpoint().unwrap()).unwrap(); }
    }
    check("frontier-product", source, Some(request), calls);
}

#[test]
fn database_column_layouts_preserve_complete_record_actions() {
    let source = include_str!("../examples/filtered-aggregate.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("frontier-columns");
    let columns = propose_with(&module, &dir, &["--columnar"]);
    for request in &columns { representation::check(&module, request).unwrap(); }
    let baseline = propose(&module, &dir.join("baseline"));
    fs::write(dir.join("baseline.json"), serde_json::to_vec(&baseline).unwrap()).unwrap();
    fs::write(dir.join("column.json"), serde_json::to_vec(&columns[0]).unwrap()).unwrap();
    run(Command::new("python3").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/producers/representation_bridge.py"))
        .arg(dir.join("baseline.json")).arg(dir.join("column.json")).args(["--via-logical", "-o"]).arg(dir.join("migration.json")), &dir.join("bridge.log"));
    let before = representation::check(&module, &baseline).unwrap();
    let after = representation::check(&module, &columns[0]).unwrap();
    let migration: Value = serde_json::from_slice(&fs::read(dir.join("migration.json")).unwrap()).unwrap();
    let bridge = representation::check_migration(&before, &after, &serde_json::from_value(migration["knowledge"].clone()).unwrap(), migration["root"].as_str().unwrap()).unwrap();
    let mut session = CompiledState::new(before).unwrap();
    let mut reference = Runtime::new(module.program().clone()).unwrap();
    let calls = vec![
        ("total_query",json!([])), ("put",json!([7,u64::MAX,true,false])),
        ("put",json!([0,2,true,false])), ("count_query",json!([])),
        ("total_query",json!([])), ("put",json!([7,4,false,false])),
        ("total_query",json!([])), ("put",json!([0,99,true,true])),
        ("count_query",json!([])), ("total_query",json!([])),
        ("erase",json!([7,true])), ("erase",json!([0,false])),
        ("total_query",json!([])), ("count_query",json!([])),
    ];
    for (i,(name,args)) in calls.iter().enumerate() {
        if i == 3 { session.migrate_portable(after.clone(), &bridge).unwrap(); }
        assert_eq!(session.invoke_json(name,args).unwrap(), reference.invoke_json(name,args).unwrap().json());
        assert_eq!(session.checkpoint().unwrap(), reference.checkpoint_portable().unwrap());
    }
    check("frontier-columns",source,Some(columns[0].clone()),calls);
}

#[test]
fn database_packed_boolean_columns_preserve_signed_keys_and_events() {
    let source = include_str!("../examples/frontier-packed-flags.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("frontier-packed");
    let requests = propose_with(&module, &dir, &["--packed-booleans"]);
    for request in &requests { representation::check(&module, request).unwrap(); }
    let mut calls = vec![("rows",json!([]))];
    for flags in 0..8u64 {
        calls.extend([
            ("put",json!([if flags%2==0{-1}else{flags as i32},u64::MAX-flags,flags&1!=0,flags&2!=0,flags&4!=0,flags==6])),
            ("get",json!([-1])), ("rows",json!([])),
        ]);
    }
    calls.extend([
        ("put",json!([-2147483648i64,0,true,true,true,false])),
        ("put",json!([2147483647i64,17,false,false,false,false])),
        ("erase",json!([-1,true])), ("rows",json!([])),
        ("erase",json!([-1,false])), ("get",json!([-1])),
    ]);
    check("frontier-packed",source,Some(requests[0].clone()),calls);
}

#[test]
fn mapped_point_caches_preserve_record_fields_and_complete_histories() {
    let source=include_str!("../examples/frontier-field-cache.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-fields");
    let requests=propose_with(&module,&dir,&["--cache-query","amount","--preserve-cache","--dynamic-delta"]);
    let plan=representation::check(&module,&requests[1]).unwrap();
    let mut session=CompiledState::new(plan.clone()).unwrap();
    let mut baseline=Runtime::new(module.program().clone()).unwrap();
    let mut calls=vec![("amount",json!([]))];
    for i in 0..16u64 {
        calls.extend([
            ("put",json!([i%3,u64::MAX-i,i,false])),("amount",json!([])),
            // Change the unread field while retaining the amount.
            ("put",json!([i%3,u64::MAX-i,u64::MAX-i,false])),("amount",json!([])),
            ("put",json!([0,i,13,true])),("amount",json!([])),
            ("erase",json!([(i+1)%3,i%4==0])),("amount",json!([])),
            ("row",json!([i%3])),("biased",json!([i])),
        ]);
    }
    for(i,(name,args))in calls.iter().enumerate(){
        assert_eq!(session.invoke_json(name,args).unwrap(),baseline.invoke_json(name,args).unwrap().json());
        let bytes=session.checkpoint().unwrap();assert_eq!(bytes,baseline.checkpoint_portable().unwrap());
        if i%11==0{session=CompiledState::restore(plan.clone(),&bytes).unwrap();}
    }
    check("frontier-fields",source,Some(requests[1].clone()),calls);
}

#[test]
fn scalar_chunk_boundaries_preserve_owned_updates_and_portable_events() {
    let source = include_str!("../examples/frontier-scalar-chunks.ink");
    let mut calls = vec![("words",json!([0])),("flags",json!([0]))];
    for length in [0usize, 1, 63, 64, 65, 255, 256, 257] {
        let words = (0..length).map(|i| match i % 4 {0 => u64::MAX, 1 => u32::MAX as u64, 2 => u32::MAX as u64 + 1, _ => i as u64}).collect::<Vec<_>>();
        let flags = (0..length).map(|i| i % 3 != 0).collect::<Vec<_>>();
        calls.extend([
            ("put",json!([0,words,flags,false])),("words",json!([0])),("flags",json!([0])),
            ("edited",json!([flags,0,length.saturating_sub(1),false])),
            ("put",json!([0,[],[],true])),("words",json!([0])),("flags",json!([0])),
            ("filled",json!([length,true])),
        ]);
    }
    check("frontier-scalar-chunks",source,None,calls);
}

#[test]
fn proved_column_point_reads_avoid_reconstructing_logical_rows() {
    use verified_language::logic::{Declaration, Term};
    let source = include_str!("../examples/frontier-packed-flags.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("frontier-column-points");
    let requests = propose_with(&module, &dir, &["--column-points"]);
    for request in &requests {representation::check(&module, request).unwrap();}
    let checked = representation::check(&module, &requests[0]).unwrap();
    let queries = ink_lowering_rust::representation_query::declarations(&checked).unwrap();
    let query = &queries[&format!("q_{}",checked.plan().actions["get"].execute)];
    let declarations = checked.definition().reachable_executable_declarations().unwrap();
    fn walk(t:&Term, declarations:&std::collections::BTreeMap<String,Declaration>,table:&str,visited:&mut std::collections::BTreeSet<String>) {
        match t {
            Term::Construct{datatype,constructor,arguments}=>{assert!(!(datatype==table&&*constructor==1),"point query reconstructs logical rows");for a in arguments{walk(a,declarations,table,visited);}},
            Term::Call{function,arguments}=>{for a in arguments{walk(a,declarations,table,visited);}if visited.insert(function.clone()){if let Declaration::Function{body,..}=&declarations[function]{walk(body,declarations,table,visited);}}},
            Term::SelfCall(args)=>for a in args{walk(a,declarations,table,visited);},
            Term::Match{scrutinee,branches}=>{walk(scrutinee,declarations,table,visited);for b in branches{walk(&b.body,declarations,table,visited);}},
            Term::If{condition,on_true,on_false}=>{for a in [condition,on_true,on_false]{walk(a,declarations,table,visited);}},
            Term::Binary{left,right,..}=>{walk(left,declarations,table,visited);walk(right,declarations,table,visited);},
            _=>(),
        }
    }
    if let Declaration::Function{body,..}=query{walk(body,&declarations,&checked.projection().tables[0].datatype,&mut Default::default());}else{panic!("not a query");}
    let mut calls=vec![("get",json!([0]))];
    for i in 0..16u64 {calls.extend([
        ("put",json!([i%4,u64::MAX-i,i&1!=0,i&2!=0,i&4!=0,i==7])),
        ("get",json!([i%4])),("get",json!([99])),("rows",json!([])),
        ("erase",json!([i%4,i%3==0])),("get",json!([i%4])),
    ]);}
    let baseline=propose_with(&module,&dir.join("plain-baseline"),&["--columnar"]).remove(0);
    let before=representation::check(&module,&baseline).unwrap();
    let mut bridges=Vec::new();
    for (label,a,z,old,new) in [("forward",&baseline,&requests[0],&before,&checked),("reverse",&requests[0],&baseline,&checked,&before)] {
        let folder=dir.join(label);fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("before.json"),serde_json::to_vec(a).unwrap()).unwrap();
        fs::write(folder.join("after.json"),serde_json::to_vec(z).unwrap()).unwrap();
        run(Command::new("python3").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/producers/representation_bridge.py"))
            .arg(folder.join("before.json")).arg(folder.join("after.json")).args(["--via-logical","-o"]).arg(folder.join("bridge.json")),&folder.join("producer.log"));
        let bridge:Value=serde_json::from_slice(&fs::read(folder.join("bridge.json")).unwrap()).unwrap();
        bridges.push(representation::check_migration(old,new,&serde_json::from_value(bridge["knowledge"].clone()).unwrap(),bridge["root"].as_str().unwrap()).unwrap());
    }
    let mut session=CompiledState::new(before.clone()).unwrap();
    let mut oracle=Runtime::new(module.program().clone()).unwrap();
    for(i,(name,args))in calls.iter().enumerate(){
        if i==25 {session.migrate_portable(checked.clone(),&bridges[0]).unwrap();}
        if i==50 {session.migrate_portable(before.clone(),&bridges[1]).unwrap();}
        assert_eq!(session.invoke_json(name,args).unwrap(),oracle.invoke_json(name,args).unwrap().json());
        assert_eq!(session.checkpoint().unwrap(),oracle.checkpoint_portable().unwrap());
    }
    check("frontier-column-points",source,Some(requests[0].clone()),calls);
}

#[test]
fn proved_column_mutations_preserve_history_without_logical_reconstruction() {
    use verified_language::logic::{Declaration, Term};
    let source = include_str!("../examples/frontier-packed-flags.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("frontier-column-mutations");
    let requests = propose_with(&module, &dir, &["--column-mutations", "--packed-booleans"]);
    for request in &requests { representation::check(&module, request).unwrap(); }
    let checked = representation::check(&module, &requests[0]).unwrap();
    let transitions = ink_lowering_rust::representation_transition::declarations(&checked).unwrap();
    let declarations = checked.definition().reachable_executable_declarations().unwrap();
    fn walk(t: &Term, declarations: &std::collections::BTreeMap<String, Declaration>, table: &str, visited: &mut std::collections::BTreeSet<String>) {
        match t {
            Term::Construct { datatype, constructor, arguments } => { assert!(!(datatype == table && *constructor == 1), "mutation reconstructs logical rows"); for a in arguments { walk(a, declarations, table, visited); } },
            Term::Call { function, arguments } => { for a in arguments { walk(a, declarations, table, visited); } if visited.insert(function.clone()) { if let Declaration::Function { body, .. } = &declarations[function] { walk(body, declarations, table, visited); } } },
            Term::SelfCall(args) => for a in args { walk(a, declarations, table, visited); },
            Term::Match { scrutinee, branches } => { walk(scrutinee, declarations, table, visited); for b in branches { walk(&b.body, declarations, table, visited); } },
            Term::If { condition, on_true, on_false } => for a in [condition, on_true, on_false] { walk(a, declarations, table, visited); },
            Term::Binary { left, right, .. } => { walk(left, declarations, table, visited); walk(right, declarations, table, visited); },
            _ => (),
        }
    }
    for name in ["put", "erase"] {
        let Declaration::Function { body, .. } = &transitions[&format!("t_{}",checked.plan().actions[name].execute)] else { panic!("not a transition") };
        walk(body, &declarations, &checked.projection().tables[0].datatype, &mut Default::default());
    }
    let mut calls=vec![("get",json!([0]))];
    for i in 0..48u64 { let key=(i % 9) as i32 - 4; calls.extend([
        ("put",json!([key,u64::MAX-i,i&1!=0,i&2!=0,i&4!=0,i%7==0])),
        ("get",json!([key])), ("rows",json!([])),
        ("erase",json!([key,i%3==0])), ("get",json!([key])),
    ]); }
    check("frontier-column-mutations",source,Some(requests[0].clone()),calls);
}

#[test]
fn shared_cache_maintenance_preserves_histories_and_checked_migrations() {
    let source=include_str!("../examples/frontier-component-caches.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-shared-caches");fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("model.json"),serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
    let script=r#"import json,sys
from pathlib import Path
sys.path.insert(0,'knowledge/producers')
from representations import generate
from representation_product import generate as product
from representation_bridge import generate as bridge
p=Path(sys.argv[1]);m=json.loads((p/'model.json').read_text());rs=[]
for q in ['zero','one']:rs.append(generate(m,p/q,cache_query=q,preserve_cache=True,dynamic_delta=True)['requests'][1])
plain=product(m,rs,p/'plain',{'one':1});shared=product(m,rs,p/'shared',{'one':1},True)
for name,r in [('plain',plain),('shared',shared)]: (p/(name+'.json')).write_text(json.dumps(r))
for name,a,z in [('forward',plain,shared),('backward',shared,plain)]: (p/(name+'.json')).write_text(json.dumps(bridge(a,z,p/name,True)))
"#;
    run(Command::new("python3").args(["-c",script]).arg(&dir).current_dir(env!("CARGO_MANIFEST_DIR")),&dir.join("producer.log"));
    let load=|n:&str|->Request{serde_json::from_slice(&fs::read(dir.join(format!("{n}.json"))).unwrap()).unwrap()};
    let plain=representation::check(&module,&load("plain")).unwrap();let request=load("shared");let shared=representation::check(&module,&request).unwrap();
    let mut session=CompiledState::new(plain.clone()).unwrap();let mut oracle=Runtime::new(module.program().clone()).unwrap();
    let mut calls=vec![("zero",json!([])),("one",json!([]))];
    for i in 0..20u64{calls.extend([("put",json!([i%4,u64::MAX-i])),("zero",json!([])),("one",json!([])),("replace",json!([i%4,i,i%3==0])),("erase",json!([(i+1)%4,i%7==0])),("zero",json!([])),("one",json!([]))]);}
    for(i,(name,args))in calls.iter().enumerate(){
        if i==19||i==99{let label=if i==19{"forward"}else{"backward"};let(a,z)=if i==19{(&plain,&shared)}else{(&shared,&plain)};let b:Value=serde_json::from_slice(&fs::read(dir.join(format!("{label}.json"))).unwrap()).unwrap();let bridge=representation::check_migration(a,z,&serde_json::from_value(b["knowledge"].clone()).unwrap(),b["root"].as_str().unwrap()).unwrap();session.migrate_portable(z.clone(),&bridge).unwrap();}
        assert_eq!(session.invoke_json(name,args).unwrap(),oracle.invoke_json(name,args).unwrap().json());assert_eq!(session.checkpoint().unwrap(),oracle.checkpoint_portable().unwrap());
    }
    check("frontier-shared-caches",source,Some(request),calls);
}

#[test]
fn field_sensitive_cache_retains_unread_fields_and_repairs_dependencies() {
    use verified_language::logic::{Declaration,Term};
    let source=include_str!("../examples/frontier-field-sensitive.ink");let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-field-sensitive");let requests=propose_with(&module,&dir,&["--cache-query","cached","--preserve-cache","--delta-query"]);
    let checked=representation::check(&module,&requests[1]).unwrap();
    let Declaration::Function{body,..}=&checked.definition().executable_declarations().unwrap()[&checked.plan().actions["label"].execute]else{panic!()};
    // The prediction carries the old cache directly. It does not query the old
    // rows or inspect the label; those reads belong to the source transition.
    let Term::Construct{arguments,..}=body else{panic!("cache carrier")};
    let Term::Match{branches,..}=&arguments[0]else{panic!("retained cache")};
    let Term::Construct{arguments,..}=&branches[0].body else{panic!()};
    assert_eq!(arguments[1],Term::Var("cached_reply".into()));
    let mut calls=vec![("cached",json!([])),("label",json!([17,false])),("cached",json!([]))];
    for i in 0..24u64 {calls.extend([("put",json!([i,u64::MAX-i])),("cached",json!([])),("label",json!([i+99,i%5==0])),("cached",json!([])),("row",json!([])),("amount",json!([i+1000])),("cached",json!([]))]);}
    check("frontier-field-sensitive",source,Some(requests[1].clone()),calls);
}

#[test]
fn ordered_contributions_maintain_exact_filter_map_results() {
    let source=include_str!("../examples/frontier-ordered-results.ink");let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-ordered-results");let requests=propose_with(&module,&dir,&["--ordered-query","active","--ordered-query","all","--packed-booleans"]);
    for request in &requests {representation::check(&module,request).unwrap();}
    let mut calls=vec![("active",json!([])),("all",json!([]))];
    let keys=[u64::MAX,0,17,3,9,1,1024];
    for i in 0..40usize {calls.extend([("put",json!([keys[i%keys.len()],u64::MAX-i as u64,i%3!=0,i%7==0])),("active",json!([])),("all",json!([])),("erase",json!([keys[(i+3)%keys.len()],i%4==0])),("active",json!([])),("all",json!([]))]);}
    check("frontier-ordered-results",source,Some(requests[0].clone()),calls);
}

#[test]
fn bounded_group_aggregate_deltas_preserve_group_changes() {
    let source=include_str!("../examples/frontier-grouped-results.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let requests=propose_with(&module,&root().join("frontier-grouped"),&["--cache-query","groups","--preserve-cache","--aggregate-query"]);
    for request in &requests {representation::check(&module,request).unwrap();}
    let mut calls=vec![("groups",json!([]))];
    for i in 0..39u64 {calls.extend([
        ("put",json!([i%11,u64::MAX-i,i%3,i%7==0])),("groups",json!([])),
        ("put",json!([i%11,i+17,(i+1)%3,false])),("groups",json!([])),
        ("erase",json!([(i+2)%11,i%5==0])),("groups",json!([])),("get",json!([i%11]))]);}
    check("frontier-grouped",source,Some(requests[1].clone()),calls);
}

#[test]
fn bucket_index_preserves_point_results_and_checked_migrations() {
    let source=include_str!("../knowledge/research/product-caches/source.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-indexed");
    let index=propose_with(&module,&dir,&["--column-index"]);
    for request in &index {representation::check(&module,request).unwrap();}
    let plain=propose_with(&module,&dir.join("plain"),&["--column-mutations"])[0].clone();
    let before=representation::check(&module,&plain).unwrap();let after=representation::check(&module,&index[0]).unwrap();
    for (label,request)in[("plain",&plain),("indexed",&index[0])]{fs::write(dir.join(format!("{label}.json")),serde_json::to_vec(request).unwrap()).unwrap();}
    let bridge=|from:&str,to:&str| {
        let output=dir.join(format!("{from}-{to}.json"));
        run(Command::new("python3").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/producers/representation_bridge.py")).arg(dir.join(format!("{from}.json"))).arg(dir.join(format!("{to}.json"))).args(["--via-logical","-o"]).arg(&output),&dir.join("bridge.log"));
        let v:Value=serde_json::from_slice(&fs::read(output).unwrap()).unwrap();
        representation::check_migration(if from=="plain"{&before}else{&after},if to=="plain"{&before}else{&after},&serde_json::from_value(v["knowledge"].clone()).unwrap(),v["root"].as_str().unwrap()).unwrap()
    };
    let forward=bridge("plain","indexed");let reverse=bridge("indexed","plain");
    let mut calls=vec![("get",json!([u64::MAX]))];
    for i in 0..43u64 {let key=if i%4==0{u64::MAX-i}else{i%13};calls.extend([("put",json!([key,u64::MAX-i])),("get",json!([key])),("zero",json!([])),("replace",json!([key,i,i%6==0])),("get",json!([key])),("erase",json!([key,i%5==0])),("get",json!([key]))]);}
    let mut session=CompiledState::new(before.clone()).unwrap();let mut runtime=Runtime::new(module.program().clone()).unwrap();
    for (i,(name,args))in calls.iter().enumerate(){if i==19{session.migrate_portable(after.clone(),&forward).unwrap();}if i==199{session.migrate_portable(before.clone(),&reverse).unwrap();}assert_eq!(session.invoke_json(name,args).unwrap(),runtime.invoke_json(name,args).unwrap().json());assert_eq!(session.checkpoint().unwrap(),runtime.checkpoint_portable().unwrap());}
    check("frontier-indexed",source,Some(index[0].clone()),calls);
}

#[test]
fn universal_aggregate_fusion_preserves_complete_query_histories() {
    let source=include_str!("../examples/frontier-grouped-results.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let requests=propose_with(&module,&root().join("frontier-fused"),&["--fuse-query","groups"]);
    for request in &requests {representation::check(&module,request).unwrap();}
    let mut calls=vec![("groups",json!([]))];
    for i in 0..33u64 {calls.extend([("put",json!([i%9,u64::MAX-i,i%3,i%7==0])),("groups",json!([])),("erase",json!([(i+2)%9,i%5==0])),("groups",json!([]))]);}
    check("frontier-fused",source,Some(requests[0].clone()),calls);
}

#[test]
fn dense_slots_preserve_hot_and_sparse_keys_and_checked_migrations() {
    let source=include_str!("../knowledge/research/product-caches/source.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir=root().join("frontier-dense");
    let index=propose_with(&module,&dir,&["--dense-slots","2"]);
    for request in &index {representation::check(&module,request).unwrap();}
    let plain=propose_with(&module,&dir.join("plain"),&["--column-mutations"])[0].clone();
    let before=representation::check(&module,&plain).unwrap();let after=representation::check(&module,&index[0]).unwrap();
    for (label,request)in[("plain",&plain),("indexed",&index[0])]{fs::write(dir.join(format!("{label}.json")),serde_json::to_vec(request).unwrap()).unwrap();}
    let bridge=|from:&str,to:&str| {
        let output=dir.join(format!("{from}-{to}.json"));
        run(Command::new("python3").arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/producers/representation_bridge.py")).arg(dir.join(format!("{from}.json"))).arg(dir.join(format!("{to}.json"))).args(["--via-logical","-o"]).arg(&output),&dir.join("bridge.log"));
        let v:Value=serde_json::from_slice(&fs::read(output).unwrap()).unwrap();
        representation::check_migration(if from=="plain"{&before}else{&after},if to=="plain"{&before}else{&after},&serde_json::from_value(v["knowledge"].clone()).unwrap(),v["root"].as_str().unwrap()).unwrap()
    };
    let forward=bridge("plain","indexed");let reverse=bridge("indexed","plain");
    let mut calls=vec![("get",json!([u64::MAX]))];
    for i in 0..43u64 {let key=if i%4==0{u64::MAX-i}else{i%13};calls.extend([("put",json!([key,u64::MAX-i])),("get",json!([key])),("zero",json!([])),("replace",json!([key,i,i%6==0])),("get",json!([key])),("erase",json!([key,i%5==0])),("get",json!([key]))]);}
    let mut session=CompiledState::new(before.clone()).unwrap();let mut runtime=Runtime::new(module.program().clone()).unwrap();
    for (i,(name,args))in calls.iter().enumerate(){if i==19{session.migrate_portable(after.clone(),&forward).unwrap();}if i==199{session.migrate_portable(before.clone(),&reverse).unwrap();}assert_eq!(session.invoke_json(name,args).unwrap(),runtime.invoke_json(name,args).unwrap().json());assert_eq!(session.checkpoint().unwrap(),runtime.checkpoint_portable().unwrap());}
    check("frontier-dense",source,Some(index[0].clone()),calls);
}


#[test]
fn eager_option_fallback_preserves_effects_and_rollback_across_targets() {
    let source=r#"module eager_option;
    enum Error{Failed,}
    state Rows:Table<u64,u64> = Table.empty();
    event seen:u64;
    change seed()->Result<Unit,Error> writes(Rows){if Rows.contains(0){Rows.replace(0,7);}else{Rows.insert(0,7);}return Ok(());}
    change fallback(fail:Bool)->Result<u64,Error> writes(Rows) emits(seen){Rows.remove(0);emit seen(99);if fail{return Err(Error.Failed);}return Ok(42);}
    change read(key:u64,fail:Bool)->Result<u64,Error> writes(Rows) emits(seen){return Ok(Rows.get(key).unwrap_or(fallback(fail)?));}
    query get()->Option<u64> reads(Rows){return Rows.get(0);}"#;
    check("frontier-eager-option",source,None,vec![("seed",json!([])),("read",json!([0,false])),("get",json!([])),("read",json!([1,false])),("seed",json!([])),("read",json!([0,true])),("get",json!([]))]);
}

#[test]
fn derived_grid_computation_preserves_paths_limits_and_future_histories() {
    let source=include_str!("../examples/frontier-algorithm-cache.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let request=propose_with(&module,&root().join("frontier-grid-cache"),&["--cache-query","route","--preserve-cache","--delta-query"])[1].clone();
    let row=|grid:Vec<u32>,width:u32,limit:u32|json!({"grid":grid,"width":width,"start":0,"goal":3,"limit":limit});
    check("frontier-grid-cache",source,Some(request),vec![("route",json!([])),("put",json!([0,row(vec![0;4],2,16),false])),("route",json!([])),("put",json!([1,row(vec![0,1,1,0],2,16),false])),("route",json!([])),("put",json!([0,row(vec![0;4],2,0),true])),("route",json!([])),("put",json!([0,row(vec![0;4],2,0),false])),("route",json!([])),("put",json!([0,row(vec![0,1,1,0],2,16),false])),("route",json!([])),("erase",json!([1,false])),("route",json!([])),("erase",json!([0,true])),("route",json!([])),("erase",json!([0,false])),("route",json!([]))]);
}
#[test]
fn derived_heap_computation_preserves_order_duplicates_and_future_histories() {
    let source=include_str!("../examples/frontier-heap-cache.ink");
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let request=propose_with(&module,&root().join("frontier-heap-cache"),&["--cache-query","sorted","--preserve-cache","--delta-query"])[1].clone();
    check("frontier-heap-cache",source,Some(request),vec![("sorted",json!([])),("put",json!([0,[9,1,9,0,4294967295u64,7],false])),("sorted",json!([])),("put",json!([1,[1,2],false])),("sorted",json!([])),("put",json!([0,[],true])),("sorted",json!([])),("put",json!([0,[],false])),("sorted",json!([])),("erase",json!([1,false])),("sorted",json!([])),("erase",json!([0,true])),("sorted",json!([])),("erase",json!([0,false])),("sorted",json!([]))]);
}

#[test]
fn scalar_physical_storage_has_equal_backend_coverage() {
    let source = "module scalar_fixture; query echo(value:u64)->u64{return value;}";
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    for sort in ["Bool", "U64"] {
        let dir = root().join(format!("scalar-{sort}"));
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("model.json"),
            serde_json::to_vec(
                &verified_language::action_model::Projection::derive(&module).unwrap(),
            )
            .unwrap(),
        )
        .unwrap();
        run(
            Command::new("python3")
                .arg("knowledge/producers/scalar_representation.py")
                .arg(dir.join("model.json"))
                .args(["--sort", sort, "-o"])
                .arg(dir.join("request.json")),
            &dir.join("producer.log"),
        );
        let request = serde_json::from_slice(&fs::read(dir.join("request.json")).unwrap()).unwrap();
        check(
            &format!("scalar-{sort}"),
            source,
            Some(request),
            vec![("echo", json!([0])), ("echo", json!([u64::MAX]))],
        );
    }
}

#[test]
fn unused_source_carriers_do_not_break_any_standalone_backend() {
    let source = include_str!("../knowledge/research/source-representations/app.ink");
    let calls = vec![
        ("put", json!([0, 19])),
        ("get", json!([0])),
        ("zero", json!([])),
        ("erase", json!([0, true])),
        ("zero", json!([])),
        ("erase", json!([0, false])),
        ("zero", json!([])),
    ];
    for (name, request) in [
        (
            "retained-direct",
            include_str!("../knowledge/research/composable-state/source-representations/retained-direct.json"),
        ),
        (
            "retained-query-cache",
            include_str!("../knowledge/research/composable-state/source-representations/retained-query-cache.json"),
        ),
    ] {
        check(
            name,
            source,
            Some(serde_json::from_str(request).unwrap()),
            calls.clone(),
        );
    }
}

#[test]
fn fixed_key_keep_deltas_execute_as_standalone_programs_on_every_cpu_target() {
    let source = include_str!("../knowledge/research/keep-parity/app.ink");
    let calls = (0..32u64)
        .map(|i| match i % 8 {
            0 => ("put", json!([0, i * 19])),
            1 => ("zero", json!([])),
            2 => ("overwrite", json!([u64::MAX - i])),
            3 => ("get", json!([0])),
            4 => ("clear", json!([])),
            5 => ("zero", json!([])),
            6 => ("erase", json!([0, true])),
            _ => ("put", json!([1, i * 23])),
        })
        .collect::<Vec<_>>();
    for (name, bytes) in [
        (
            "fixed-key-baseline",
            include_str!("../knowledge/research/composable-state/keep/representation-0.json"),
        ),
        (
            "fixed-key-cache",
            include_str!("../knowledge/research/composable-state/keep/representation-1.json"),
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
fn indexed_filtered_aggregates_have_equal_backend_coverage() {
    let requests = std::env::var_os("INK_INDEXED_REQUEST_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/indexed-sequence")
        });
    let mut calls = vec![];
    for i in 0..24u64 {
        calls.extend([
            (
                "put",
                json!([
                    i % 7,
                    if i % 5 == 0 { u64::MAX } else { i * 19 },
                    i % 3 != 0,
                    i % 6 == 0
                ]),
            ),
            (
                "erase",
                json!([if i % 9 == 0 { u64::MAX } else { (i + 3) % 9 }, i % 8 == 0]),
            ),
            ("total_query", json!([])),
            ("count_query", json!([])),
        ]);
    }
    for label in ["indexed-sum", "indexed-count"] {
        let request =
            serde_json::from_slice(&fs::read(requests.join(format!("{label}.json"))).unwrap())
                .unwrap();
        check(
            label,
            include_str!("../examples/filtered-aggregate.ink"),
            Some(request),
            calls.clone(),
        );
    }
}

#[test]
fn compact_observations_reject_rehashed_false_proofs_and_wrong_interfaces() {
    let source="module compact_guard;state Rows:Table<u64,u64>=Table.empty();query zero()->Option<u64> reads(Rows){return Rows.get(0);}";
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let dir = root().join("compact-adversarial");
    let request = propose(&module, &dir);
    fs::write(dir.join("full.json"), serde_json::to_vec(&request).unwrap()).unwrap();
    run(
        Command::new("python3")
            .arg(
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("knowledge/producers/compact_observation.py"),
            )
            .arg(dir.join("full.json"))
            .arg("--store")
            .arg(dir.join("store"))
            .arg("-o")
            .arg(dir.join("request.json")),
        &dir.join("producer.log"),
    );
    let good: Request =
        serde_json::from_slice(&fs::read(dir.join("request.json")).unwrap()).unwrap();
    representation::check(&module, &good).unwrap();
    for field in ["result", "proof"] {
        let mut bad = good.clone();
        let old = bad.representation.clone();
        let mut entry = bad.knowledge.objects.remove(&old).unwrap();
        entry.payload["actions"]["zero"]["compact"][field] = if field == "result" {
            json!("U64")
        } else {
            json!({"Refl":{"U64":0}})
        };
        let id = verified_language::registry::identity(&entry).unwrap();
        bad.knowledge.objects.insert(id.clone(), entry);
        bad.knowledge
            .roots
            .iter_mut()
            .filter(|r| **r == old)
            .for_each(|r| *r = id.clone());
        bad.representation = id;
        add_unused_mathematics(&mut bad);
        assert!(
            representation::check(&module, &bad).is_err(),
            "accepted rehashed compact {field}"
        );
    }
}

#[test]
fn indexed_cached_sum_count_have_equal_backend_coverage() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("knowledge/research/indexed-aggregate/request.json");
    let request: Request = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
    let mut calls = vec![];
    // Opposing insertion orders exercise single and double rotations.
    for key in [
        8u64,
        4,
        12,
        2,
        6,
        10,
        14,
        1,
        3,
        5,
        7,
        9,
        11,
        13,
        15,
        0,
        u64::MAX,
    ] {
        calls.push(("put", json!([key, key, key % 2 == 0, false])));
        calls.push(("total_query", json!([])));
        calls.push(("count_query", json!([])));
    }
    for key in [0u64, 7, 12, u64::MAX, 99, 4, 8] {
        calls.extend([
            ("put", json!([key, u64::MAX, true, true])),
            ("erase", json!([key, true])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("put", json!([key, u64::MAX, true, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("erase", json!([key, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
        ]);
    }
    check(
        "indexed-aggregate",
        include_str!("../examples/filtered-aggregate.ink"),
        Some(request),
        calls,
    );
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

#[test]
fn generic_indexed_products_and_grouped_actions_preserve_all_targets() {
    let source=include_str!("../examples/general-indexed.ink");
    let dir=root().join("general-indexed-authoring");fs::create_dir_all(&dir).unwrap();
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    fs::write(dir.join("model.json"),serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap()).unwrap()).unwrap();
    let cached=std::env::var("INK_GENERAL_INDEXED_REQUEST").ok();
    let path=if let Some(path)=cached {PathBuf::from(path)} else {
        let python=std::env::var("INK_PROOF_PYTHON").unwrap_or_else(|_|"python3".into());
        run(Command::new(python).args(["-m","producers.generic_indexed"]).arg(dir.join("model.json")).arg("-o").arg(dir.join("request.json")).env("PYTHONPATH",Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge")).env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")),&dir.join("producer.log"));
        dir.join("request.json")
    };
    let request:Request=serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
    let row=|key:u64|json!({"value":key.wrapping_mul(17),"active":key%2==0,"trail":[0,key,u64::MAX],"maybe":{"Some":key},"point":[1.25,{"F32Bits":2147483648u64}],"signed":i32::MIN,"exact":{"Int":"-123456789012345678901234567890"},"label":if key%2==0 {"🧵 café"}else{"other"},"owner":"0123456789ABCDEF0123456789ABCDEF","unsigned":u32::MAX,"result":{"Err":"Error.Failed"},"unit":null,"nested":{"Some":{"label":"e\u{301}","shade":"Shade.Dark"}}});
    let mut calls=vec![];
    for key in [8,4,12,2,6,10,14,1,3,5,7,9,11,13,15,0,u64::MAX] {
        calls.push(("put",json!([key,row(key),key,false])));
        calls.extend([("weighted_query",json!([])),("labelled",json!([])),("any_mark",json!([])),("joined",json!([])),("dynamic",json!([7])),("for_owner",json!(["0123456789abcdef0123456789abcdef"])),("floating",json!([])),("get",json!([key]))]);
    }
    for (first,second) in [(8,4),(3,3),(u64::MAX,0),(99,14),(10,99)] {
        calls.extend([("edits",json!([first,second,42,true])),("edits",json!([first,second,42,false])),("replace_remove",json!([first,second,u64::MAX])),("remove_replace",json!([first,second,0])),("erase",json!([first,second,true])),("erase",json!([first,second,false])),("put",json!([second,row(second),second,true])),("joined",json!([])),("weighted_query",json!([])),("any_mark",json!([]))]);
    }
    check("general-indexed",source,Some(request),calls);
}

#[test]
fn bulk_deltas_preserve_duplicates_mismatch_and_rollback_on_every_cpu_target() {
    let output = Command::new("python3")
        .args([
            "-c",
            "import gzip,sys;sys.stdout.buffer.write(gzip.open(sys.argv[1],'rb').read())",
        ])
        .arg(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("knowledge/research/scalable-state-current/bulk-maintenance/request.json.gz"),
        )
        .output()
        .unwrap();
    assert!(output.status.success());
    let request: Request = serde_json::from_slice(&output.stdout).unwrap();
    let mut calls = vec![
        ("batch", json!([[9, 1, 9, 3], [9, 1, 19, u64::MAX]])),
        ("quantity_total", json!([])),
        ("keys", json!([])),
        ("batch", json!([[7, 8], [70]])),
        ("quantity_total", json!([])),
        ("fail", json!([[9, 1, 9], [20, 30, 40]])),
        ("quantity_total", json!([])),
        ("erase", json!([[9, 9, 999]])),
        ("quantity_total", json!([])),
        ("batch", json!([[], []])),
    ];
    for i in 0..32u64 {
        calls.push(match i % 4 {
            0 => ("put", json!([i % 7, u64::MAX - i])),
            1 => (
                "batch",
                json!([[i % 7, (i + 1) % 7, i % 7], [i, i + 1, i + 2]]),
            ),
            2 => ("erase", json!([[i % 7, i % 7]])),
            _ => ("fail", json!([[i % 7], [i]])),
        });
        calls.push(("quantity_total", json!([])));
    }
    check(
        "bulk-delta",
        include_str!("../examples/bulk-maintenance.ink"),
        Some(request),
        calls,
    );
}

fn frozen_request(folder: &str) -> Request {
    let output = Command::new("python3")
        .args([
            "-c",
            "import gzip,sys;sys.stdout.buffer.write(gzip.open(sys.argv[1],'rb').read())",
        ])
        .arg(
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join(format!("knowledge/research/scalable-state-current/{folder}/request.json.gz")),
        )
        .output()
        .unwrap();
    assert!(output.status.success());
    serde_json::from_slice(&output.stdout).unwrap()
}
#[test]
fn key_only_cache_retains_payload_changes_and_refreshes_membership_on_every_cpu_target() {
    let calls = (0..24u64)
        .flat_map(|i| {
            vec![
                (
                    match i % 5 {
                        0 => "put",
                        1 => "replace",
                        2 => "select",
                        3 => "erase",
                        _ => "unrelated",
                    },
                    if i % 5 == 2 || i % 5 == 3 {
                        json!([i % 4])
                    } else {
                        json!([i % 4, i * 19])
                    },
                ),
                ("intersection", json!([])),
            ]
        })
        .collect();
    check(
        "membership-cache",
        include_str!("../examples/membership-cache.ink"),
        Some(frozen_request("membership-cache")),
        calls,
    );
}
#[test]
fn rehashed_false_bulk_and_membership_laws_cannot_authorise_caches() {
    for (folder, parameter) in [
        ("bulk-maintenance", "bulk_rows"),
        ("membership-cache", "membership_rows"),
    ] {
        let request = frozen_request(folder);
        let dir = root().join(format!("forged-{folder}"));
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join("request.json"),
            serde_json::to_vec(&request).unwrap(),
        )
        .unwrap();
        let output = Command::new("python3")
            .arg("tests/support/forge_math.py")
            .arg(dir.join("request.json"))
            .arg(parameter)
            .current_dir(env!("CARGO_MANIFEST_DIR"))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let forged: Request = serde_json::from_slice(&output.stdout).unwrap();
        verified_language::registry::CheckedBundle::check(&forged.knowledge).unwrap();
        let source = fs::read_to_string(format!("knowledge/research/{folder}/source.ink")).unwrap();
        let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
        assert!(representation::check(&module, &forged).is_err());
    }
}
// Generate these source-bound alternatives afresh; no fixture hash, producer
// classification or reachable-state assumption grants admission authority.
fn composable_proposal(
    source: &str,
    name: &str,
    producer: &str,
    arguments: &[&str],
    selected: Option<usize>,
) -> Request {
    let dir = root().join(name).join("proposal");
    fs::create_dir_all(&dir).unwrap();
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    fs::write(
        dir.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    let mut command = Command::new("python3");
    command
        .arg(format!("knowledge/producers/{producer}.py"))
        .arg(dir.join("model.json"))
        .args(arguments)
        .arg("-o")
        .arg(dir.join("proposal.json"));
    run(&mut command, &dir.join("producer.log"));
    let value: Value =
        serde_json::from_slice(&fs::read(dir.join("proposal.json")).unwrap()).unwrap();
    serde_json::from_value(
        selected
            .map(|i| value["requests"][i].clone())
            .unwrap_or(value),
    )
    .unwrap()
}
#[test]
fn indexed_storage_and_point_cache_compose_with_exact_observations() {
    let source = include_str!("../knowledge/research/keep-parity/app.ink");
    let index = composable_proposal(
        source,
        "partition-index",
        "partition_representation",
        &[],
        None,
    );
    let cache = composable_proposal(
        source,
        "parameter-point",
        "representations",
        &["--cache-query", "zero", "--preserve-cache", "--delta-query"],
        Some(1),
    );
    let dir = root().join("partition-product");
    fs::create_dir_all(&dir).unwrap();
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    fs::write(
        dir.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    fs::write(dir.join("index.json"), serde_json::to_vec(&index).unwrap()).unwrap();
    fs::write(dir.join("cache.json"), serde_json::to_vec(&cache).unwrap()).unwrap();
    run(
        Command::new("python3")
            .arg("knowledge/producers/compose_representations.py")
            .arg(dir.join("model.json"))
            .arg(dir.join("index.json"))
            .arg(dir.join("cache.json"))
            .args([
                "--query-provider",
                "get=left",
                "--query-provider",
                "zero=right",
                "-o",
            ])
            .arg(dir.join("product.json")),
        &dir.join("producer.log"),
    );
    let product = serde_json::from_slice(&fs::read(dir.join("product.json")).unwrap()).unwrap();
    let calls = vec![
        ("put", json!([0, 19])),
        ("put", json!([1, 23])),
        ("get", json!([1])),
        ("zero", json!([])),
        ("erase", json!([0, true])),
        ("zero", json!([])),
        ("overwrite", json!([u64::MAX])),
        ("get", json!([0])),
        ("erase", json!([1, false])),
        ("clear", json!([])),
        ("zero", json!([])),
        ("get", json!([u64::MAX])),
        ("put", json!([u64::MAX, 41])),
        ("get", json!([u64::MAX])),
    ];
    check("partition-index", source, Some(index), calls.clone());
    check("partition-product", source, Some(product), calls);
}
#[test]
fn field_sensitive_cache_repairs_preserve_other_fields_and_abort_publication() {
    let source = include_str!("../examples/field-sensitive-point.ink");
    let request = composable_proposal(
        source,
        "field-point",
        "representations",
        &[
            "--cache-query",
            "zero_field",
            "--preserve-cache",
            "--delta-query",
        ],
        Some(1),
    );
    // Tampering with the actual projection cannot reuse the certificate.
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut wrong = request.clone();
    wrong.input_core_sha256 = "0".repeat(64);
    assert!(representation::check(&module, &wrong).is_err());
    check(
        "field-point",
        source,
        Some(request),
        vec![
            ("put", json!([0, 19, true, 7])),
            ("put", json!([1, 23, false, 9])),
            ("zero_field", json!([])),
            ("active", json!([0, false, false])),
            ("zero_field", json!([])),
            ("get", json!([0])),
            ("active", json!([1, true, false])),
            ("zero_field", json!([])),
            ("active", json!([0, true, true])),
            ("get", json!([0])),
            ("erase", json!([0, true])),
            ("zero_field", json!([])),
            ("put", json!([0, 31, true, 11])),
            ("zero_field", json!([])),
            ("erase", json!([0, false])),
            ("zero_field", json!([])),
        ],
    );
}

#[test]
fn indexed_storage_composes_with_two_filtered_aggregate_caches() {
    let source = include_str!("../examples/composable-filtered-state.ink");
    let index = composable_proposal(
        source,
        "aggregate-partition",
        "partition_representation",
        &[],
        None,
    );
    let total = composable_proposal(
        source,
        "aggregate-total",
        "representations",
        &[
            "--cache-query",
            "total_query",
            "--preserve-cache",
            "--aggregate-query",
        ],
        Some(1),
    );
    let count = composable_proposal(
        source,
        "aggregate-count",
        "representations",
        &[
            "--cache-query",
            "count_query",
            "--preserve-cache",
            "--aggregate-query",
        ],
        Some(1),
    );
    let dir = root().join("aggregate-product");
    fs::create_dir_all(&dir).unwrap();
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    fs::write(
        dir.join("model.json"),
        serde_json::to_vec(&verified_language::action_model::Projection::derive(&module).unwrap())
            .unwrap(),
    )
    .unwrap();
    for (name, request) in [("index", &index), ("total", &total), ("count", &count)] {
        fs::write(
            dir.join(format!("{name}.json")),
            serde_json::to_vec(request).unwrap(),
        )
        .unwrap();
    }
    for (left, right, result, providers) in [
        (
            "index",
            "total",
            "first",
            ["get=left", "total_query=right", "count_query=left"],
        ),
        (
            "first",
            "count",
            "product",
            ["get=left", "total_query=left", "count_query=right"],
        ),
    ] {
        let mut command = Command::new("python3");
        command
            .arg("knowledge/producers/compose_representations.py")
            .arg(dir.join("model.json"))
            .arg(dir.join(format!("{left}.json")))
            .arg(dir.join(format!("{right}.json")));
        for provider in providers {
            command.args(["--query-provider", provider]);
        }
        command.arg("-o").arg(dir.join(format!("{result}.json")));
        run(&mut command, &dir.join(format!("{result}.log")));
    }
    let product = serde_json::from_slice(&fs::read(dir.join("product.json")).unwrap()).unwrap();
    check(
        "aggregate-product",
        source,
        Some(product),
        vec![
            ("put", json!([0, 19, true, false])),
            ("put", json!([1, 23, false, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("get", json!([1])),
            ("put", json!([1, u64::MAX, true, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("put", json!([0, 41, false, true])),
            ("total_query", json!([])),
            ("count_query", json!([])),
            ("erase", json!([1, true])),
            ("get", json!([1])),
            ("erase", json!([0, false])),
            ("total_query", json!([])),
            ("count_query", json!([])),
        ],
    );
}
