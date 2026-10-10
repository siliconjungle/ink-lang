use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    optimisation::{self, Package, Site},
    semantic::{self as s, Node},
    stateful::Runtime,
    syntax::parse,
};
#[path = "support/parity.rs"]
mod parity;
fn fixture() -> (String, CheckedModule, optimisation::CheckedSelection) {
    let source=include_str!("../examples/inventory.lang").replace("checked_add(item.stock, amount)","checked_add(item.stock, identity(amount))")+"\nfn identity(x:u32)->u32{return x+0;}\nfn mapped(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+0);}\n";
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let bundle =
        serde_json::from_slice(&fs::read("knowledge/store/rewrite-view.json").unwrap()).unwrap();
    let catalogue = verified_language::registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    let law=catalogue.roots.iter().find(|id|{
        let l=&catalogue.objects[*id];
        l.from.sort==s::value(Type::U32) && l.params.len()==1 && matches!(&l.from.node,Node::Op(op,args) if op=="binary:+" && matches!(args[1].node,Node::Word(0)))
    }).unwrap().clone();
    let package = Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        knowledge: bundle,
        applications: vec![
            Site {
                function: "identity".into(),
                path: vec![],
                law: law.clone(),
                arguments: BTreeMap::from([("x".into(), s::free(s::value(Type::U32), "x"))]),
                premises: vec![],
            },
            Site {
                function: "mapped".into(),
                path: vec![1, 0],
                law,
                arguments: BTreeMap::from([(
                    "x".into(),
                    s::term(s::value(Type::U32), Node::Bound(0)),
                )]),
                premises: vec![],
            },
        ],
    };
    let selected = optimisation::check(&module, &package).unwrap();
    assert_ne!(
        selected.module().identity().unwrap(),
        module.identity().unwrap()
    );
    (source, module, selected)
}
#[test]
fn selected_cpu_wasm_and_mixed_gpu_hosts_use_original_checkpoints() {
    let (source, module, selected) = fixture();
    let id = "00000000000000000000000000000001";
    let history = vec![
        json!({"call":"create","args":[id,"雪\u{0}😀",10]}),
        json!({"call":"restock","args":[id,5]}),
        json!({"call":"restock","args":[id,4294967295u32]}),
        json!({"call":"stock_of","args":[id]}),
        json!({"pure":"mapped","args":[[0,1,4294967295u32]],"expect_gpu":true}),
        json!({"call":"restock","args":[id,0]}),
        json!({"call":"total","args":[]}),
    ];
    let mut reference = Runtime::new(module.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for step in history {
        let reply = if let Some(name) = step["pure"].as_str() {
            let input = step["args"][0]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| verified_language::eval::Value::U32(v.as_u64().unwrap() as u32))
                .collect();
            json!({"value":verified_language::eval::call(module.program(),name,vec![verified_language::eval::Value::List(input)],&mut 100_000).unwrap().json()})
        } else {
            json!({"outcome":reference.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap().json()})
        };
        let snapshot = reference.checkpoint_portable().unwrap();
        expected.push(json!({"reply":reply,"snapshot":snapshot}));
        steps.push(step);
        steps.push(json!({"restore":snapshot}));
    }
    parity::conformance_selected(
        "selected-checkpoint-parity",
        &selected,
        &source,
        steps,
        expected,
    );
    let original = verified_language::snapshot::layout(module.program()).unwrap();
    let selected_c = ink_lowering_c::complete::lower_selected(&selected).unwrap();
    assert_eq!(
        selected_c.metadata["snapshot_program"],
        json!(original.program)
    );
    assert_eq!(
        selected_c.metadata["core_sha256"],
        selected.module().identity().unwrap()
    );
    let raw = ink_lowering_c::complete::lower(selected.module()).unwrap();
    assert_ne!(
        raw.metadata["snapshot_program"],
        selected_c.metadata["snapshot_program"]
    );
    assert_eq!(
        ink_lowering_wasm::lower_complete_selected(&selected)
            .unwrap()
            .metadata["snapshot_program"],
        json!(original.program)
    );
}
#[test]
fn build_and_emit_commands_keep_selected_provenance_and_native_host_assembly() {
    let (source, module, selected) = fixture();
    let root = Path::new("build/selected-checkpoint-cli");
    fs::create_dir_all(root).unwrap();
    let file = root.join("program.ink");
    fs::write(&file, source).unwrap();
    let plan = root.join("selection.json");
    fs::write(&plan, serde_json::to_vec(selected.package()).unwrap()).unwrap();
    for (command, target, destination) in [
        ("build", Some("c"), root.join("c")),
        ("build", Some("rust"), root.join("rust")),
        ("build", Some("javascript"), root.join("program.mjs")),
        ("emit-state", None, root.join("state")),
    ] {
        let mut cmd = Command::new(env!("CARGO_BIN_EXE_ink"));
        cmd.arg(command)
            .arg(&file)
            .arg("--selection")
            .arg(&plan)
            .arg("-o")
            .arg(&destination);
        if let Some(target) = target {
            cmd.arg("--target").arg(target);
        }
        let out = cmd.output().unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        if target == Some("javascript") {
            continue;
        }
        let out = Command::new(env!("CARGO"))
            .args(["build", "--offline", "--quiet", "--manifest-path"])
            .arg(destination.join("Cargo.toml"))
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let snapshot = Runtime::new(module.program().clone())
            .unwrap()
            .checkpoint_portable()
            .unwrap();
        let script = root.join("script.json");
        fs::write(
            &script,
            serde_json::to_vec(&json!([{"restore":snapshot},{"call":"total","args":[]}])).unwrap(),
        )
        .unwrap();
        let out = Command::new(destination.join("target/debug/compiled-state"))
            .arg(&script)
            .output()
            .unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        assert_eq!(
            serde_json::from_slice::<Value>(&out.stdout).unwrap()[0]["version"],
            0
        );
    }
}

#[test]
fn compiled_native_durable_files_continue_across_checked_selection() {
    let (_, module, selected) = fixture();
    let root = Path::new("build/selected-durable");
    fs::create_dir_all(root).unwrap();
    let file = root.join("state.inkd");
    let _ = fs::remove_file(&file);
    let id = "00000000000000000000000000000001";
    let history = json!([
        {"id":"create","call":"create","args":[id,"item",10]},
        {"id":"add","call":"restock","args":[id,5]}
    ]);
    let script = root.join("script.json");
    fs::write(&script, serde_json::to_vec(&history).unwrap()).unwrap();
    let mut original = Runtime::new(module.program().clone()).unwrap();
    for step in history.as_array().unwrap() {
        original
            .invoke_json(step["call"].as_str().unwrap(), &step["args"])
            .unwrap();
    }
    let expected = original.checkpoint_portable().unwrap();
    for backend in [
        "baseline-c",
        "selected-c",
        "selected-rust",
        "raw-selected-c",
    ] {
        let project = root.join(backend);
        match backend {
            "baseline-c" => ink_runtime::emit_c_program(&module, &project).unwrap(),
            "selected-c" => ink_runtime::emit_c_program_selected(&selected, &project).unwrap(),
            "selected-rust" => ink_runtime::emit_rust_program(
                &verified_language::state_native::emit_selected(&selected, None).unwrap(),
                &project,
            )
            .unwrap(),
            _ => ink_runtime::emit_c_program(selected.module(), &project).unwrap(),
        }
        let binary = project.join("program");
        ink_runtime::toolchain::complete_program(&project, false, &binary, "cargo", None).unwrap();
        let snapshot = project.join("snapshot");
        let out = Command::new(binary)
            .arg(&script)
            .arg("--durable")
            .arg(&file)
            .arg("--snapshot-out")
            .arg(&snapshot)
            .output()
            .unwrap();
        if backend == "raw-selected-c" {
            assert!(
                !out.status.success(),
                "bare selected Program must retain its own namespace"
            );
            continue;
        }
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        let replies: Value = serde_json::from_slice(&out.stdout).unwrap();
        assert_eq!(replies[1]["version"], 2);
        // Reopening a checked selection on another backend replays the saved receipts.
        assert_eq!(fs::read(snapshot).unwrap(), expected, "{backend}");
    }
}
