use super::{optimisation, parity, syntax, CheckedModule, Runtime};
use serde_json::json;
use std::{fs, path::Path, process::Command};

#[test]
fn checked_f32_bit_laws_preserve_exact_cpu_and_device_results() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/f32-bits-input");
    fs::create_dir_all(&output).unwrap();
    let pythonpath = std::env::join_paths([root.join("knowledge"), root.join("planner")]).unwrap();
    let result = Command::new("python3")
        .arg(root.join("knowledge/tests/test_v8_float_laws.py"))
        .arg(&output).env("PYTHONPATH", &pythonpath)
        .env("INK_COMPILER", env!("CARGO_BIN_EXE_ink"))
        .current_dir(root).output().unwrap();
    assert!(result.status.success(), "{}", String::from_utf8_lossy(&result.stderr));
    let source = include_str!("../../knowledge/tests/fixtures/v8-f32/source.ink");
    let input = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let packet = serde_json::from_slice(&fs::read(output.join("selection.json")).unwrap()).unwrap();
    let selected = optimisation::check(&input, &packet).unwrap();
    let snapshot = Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    use verified_language::eval::Value::{U32, F32, List};
    let mut push = |function: &str, args: Vec<verified_language::eval::Value>, gpu: bool| {
        let value = verified_language::eval::call(input.program(), function, args.clone(), &mut 1_000_000).unwrap();
        steps.push(json!({"pure":function,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":!gpu,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    let bits = [0, 0x80000000, 1, 0x80000001, 0x007fffff, 0x00800000,
        0x80800000, 0x3f800001, 0xbf800000, 0x7f7fffff, 0xff7fffff,
        0x7f800000, 0xff800000, 0x7f800001, 0xff800001, 0x7fc00000,
        0x7fc01234, 0xffc04321, 0x7fffffff, 0xffffffff];
    for raw in bits {
        for function in ["roundtrip", "twice", "nan_neg", "finite_neg", "neg_bits",
            "self_eq", "self_ne", "self_lt", "self_gt", "self_le", "self_ge", "observed"] {
            push(function, vec![F32(raw)], false);
        }
        for function in ["raw_roundtrip", "neg_raw", "nan_raw", "finite_raw"] {
            push(function, vec![U32(raw)], false);
        }
    }
    for n in [0, bits.len(), 513] {
        let xs = (0..n).map(|i| F32(bits[i % bits.len()])).collect::<Vec<_>>();
        for function in ["copied", "classes"] { push(function, vec![List(xs.clone())], n != 0); }
    }
    assert_eq!(steps.len(), 326);
    parity::conformance_selected("f32-bits-parity", &selected, source, steps, expected);
}
