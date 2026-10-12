use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, eval, optimisation, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn parametric_pipelines_reify_curried_callbacks_and_preserve_all_targets() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/pipeline-template-conformance");
    let out = Command::new("python3")
        .arg(root.join("tools/pipeline_templates.py"))
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&dir)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let source = include_str!("fixtures/pipeline-templates.ink");
    let original = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let package: optimisation::Package =
        serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap();
    assert_eq!(package.applications.len(), 14);
    let selected = optimisation::check(&original, &package).unwrap();
    let mut wrong = package.clone();
    wrong.applications[0].arguments.insert(
        "xs".into(),
        verified_language::semantic::term(
            verified_language::semantic::value(syntax::Type::U32),
            verified_language::semantic::Node::Word(0),
        ),
    );
    assert!(optimisation::check(&original, &wrong).is_err());
    let snapshot = Runtime::new(original.program().clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let rows = json!([{"score":0,"visible":true,"name":"雪\u{0}😀","value":1.0e20},{"score":17,"visible":false,"name":"other","value":1.0},{"score":u32::MAX,"visible":true,"name":"雪\u{0}😀","value":-1.0e20},{"score":18,"visible":true,"name":"","value":-0.0}]);
    let mut requests = vec![];
    for xs in [
        json!([]),
        rows.clone(),
        json!([{"score":17,"visible":true,"name":"other","value":-0.0}]),
    ] {
        for cut in [0, 17, u32::MAX] {
            for name in ["filtered_right", "filtered_left", "filtered_mapped"] {
                requests.push((name, json!([xs, cut, u32::MAX]), false));
            }
            for name in ["summary", "mapped_filtered"] {
                requests.push((name, json!([xs, cut, -0.0]), false));
            }
            requests.push(("composed_filter", json!([xs, cut]), false));
        }
        for name in ["label", "composed_map"] {
            for needle in ["", "other", "雪\u{0}😀"] {
                requests.push((name, json!([xs, needle]), false));
            }
        }
        for name in ["mapped_count", "mapped_length", "identity_rows"] {
            requests.push((name, json!([xs]), false));
        }
        for ys in [json!([]), rows.clone()] {
            for name in ["concatenated_left", "concatenated_right"] {
                requests.push((name, json!([xs, ys, u32::MAX]), false));
            }
        }
    }
    for xs in [json!([]), json!([u32::MAX, 1, 0, 17, 0x80000000u32])] {
        for cut in [0, 17, u32::MAX] {
            requests.push(("numeric_filtered", json!([xs, cut, 19]), true));
        }
    }
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, gpu) in requests {
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
        let result = eval::call(original.program(), name, values.clone(), &mut 1000000).unwrap();
        let actual = eval::call(selected.module().program(), name, values, &mut 1000000).unwrap();
        assert_eq!(actual, result, "{name} {args}");
        steps.push(json!({"pure":name,"args":args,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":result.json()},"snapshot":snapshot}));
    }
    parity::conformance_selected(
        "generated-parity-pipeline-templates",
        &selected,
        source,
        steps,
        expected,
    );
}
