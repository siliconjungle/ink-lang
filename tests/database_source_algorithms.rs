use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, eval, planning, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn database_only_helpers_compose_and_preserve_values_transactions_and_snapshots() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/database-source-algorithms");
    fs::create_dir_all(&dir).unwrap();
    let output = Command::new("python3")
        .arg(root.join("tools/database_source_algorithms.py"))
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&dir)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let source = include_str!("fixtures/database-source-algorithms.ink");
    let original = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let mut package: planning::Package =
        serde_json::from_slice(&fs::read(dir.join("plan.json")).unwrap()).unwrap();
    let with_capacity = planning::check(&original, &package).unwrap();
    let mut bad = package.clone();
    let planning::Step::Physical(p) = bad.steps.last_mut().unwrap() else {
        panic!()
    };
    p.reservations[0].capacity = Some(syntax::Expr::Num(0));
    assert!(planning::check(&original, &bad).is_err());
    assert!(verified_language::compiled_plans::emit(
        &with_capacity,
        "javascript",
        &dir.join("unsupported.mjs")
    )
    .is_err());
    package.steps.pop();
    let plan = planning::check(&original, &package).unwrap();
    assert!(plan.module().program().records.len() > original.program().records.len());
    let mut runtime = Runtime::new(original.program().clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in [
        ("rows", json!([])),
        ("put", json!([0, 9, false])),
        ("put", json!([0, 17, true])),
        ("rows", json!([])),
        ("put", json!([u32::MAX, u32::MAX, false])),
    ] {
        let outcome = runtime.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let mut cases = vec![];
    for xs in [json!([]), json!([0, u32::MAX, 1, 17, 0x80000000u32])] {
        for name in ["map_words", "map_words_again"] {
            cases.push((name, json!([xs]), false));
        }
        for cut in [0, 17, u32::MAX] {
            cases.push(("qualifying", json!([xs, cut]), false));
            cases.push(("numeric", json!([xs, cut]), true));
        }
        for ys in [json!([]), json!([1, 2, u32::MAX])] {
            cases.push(("concatenate", json!([xs, ys]), false));
        }
    }
    cases.extend([
        ("map_strings", json!([["", "雪\u{0}😀", "x"]]), false),
        ("map_strings", json!([[]]), false),
    ]);
    for n in [0, 1, 3, 5, u32::MAX] {
        cases.push(("partition", json!([[true, false, true], n]), false));
    }
    for x in [i32::MIN, -1, 0, i32::MAX] {
        for scale in [-17, 0, 1, i32::MAX] {
            cases.push(("signed", json!([x, scale]), false));
        }
    }
    for (name, args, gpu) in cases {
        let f = original
            .program()
            .functions
            .iter()
            .find(|f| f.name == name)
            .unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, original.program()).unwrap())
            .collect::<Vec<_>>();
        let value = eval::call(original.program(), name, values.clone(), &mut 1000000)
            .unwrap()
            .json();
        assert_eq!(
            eval::call(plan.module().program(), name, values, &mut 1000000)
                .unwrap()
                .json(),
            value
        );
        steps.push(json!({"pure":name,"args":args,"expect_gpu":gpu}));
        expected.push(
            json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance_planned(
        "generated-parity-database-algorithms",
        &plan,
        source,
        steps.clone(),
        expected.clone(),
    );
    // The same executable transformations with the DB capacity policy execute on
    // Rust and Rust-Wasm. Other targets retain their compatible policy above.
    let physical_dir = dir.join("reserved");
    verified_language::runtime::emit_rust_program(
        &verified_language::state_native::emit_planned(&with_capacity).unwrap(),
        &physical_dir,
    )
    .unwrap();
    fs::write(
        physical_dir.join("src/main.rs"),
        include_str!("lowering-parity-runner.rs.txt"),
    )
    .unwrap();
    fs::write(
        physical_dir.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    let built = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(physical_dir.join("Cargo.toml"))
        .output()
        .unwrap();
    assert!(
        built.status.success(),
        "{}",
        String::from_utf8_lossy(&built.stderr)
    );
    let run = Command::new(physical_dir.join("target/debug/compiled-state"))
        .arg(physical_dir.join("script.json"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let actual: Vec<Value> = serde_json::from_slice(&run.stdout).unwrap();
    assert_eq!(actual, expected);
    if std::env::var_os("INK_TEST_WASM").is_some() {
        let built = Command::new(env!("CARGO"))
            .args([
                "build",
                "--offline",
                "--quiet",
                "--lib",
                "--target",
                "wasm32-unknown-unknown",
                "--manifest-path",
            ])
            .arg(physical_dir.join("Cargo.toml"))
            .output()
            .unwrap();
        assert!(
            built.status.success(),
            "{}",
            String::from_utf8_lossy(&built.stderr)
        );
        fs::write(
            physical_dir.join("expected.json"),
            serde_json::to_vec(&expected).unwrap(),
        )
        .unwrap();
        fs::write(
            physical_dir.join("program.mjs"),
            verified_language::javascript::lower_planned(&plan)
                .unwrap()
                .javascript,
        )
        .unwrap();
        let wasm_check = include_str!("lowering-parity-wasm.mjs")
            .replace("['c','rust']", "['reserved']")
            .replace(
                "`${backend}/target/wasm32-unknown-unknown/debug/compiled_state.wasm`",
                "'target/wasm32-unknown-unknown/debug/compiled_state.wasm'",
            );
        fs::write(physical_dir.join("check-wasm.mjs"), wasm_check).unwrap();
        let checked = Command::new("node")
            .arg(physical_dir.join("check-wasm.mjs"))
            .output()
            .unwrap();
        assert!(
            checked.status.success(),
            "{}",
            String::from_utf8_lossy(&checked.stderr)
        );
        println!("{}", String::from_utf8_lossy(&checked.stdout));
    }
}
