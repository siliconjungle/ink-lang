use serde_json::json;
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};

#[test]
fn local_record_storage_preserves_every_target_value_and_snapshot() {
    let source = format!(
        "{}\nfn numeric(xs:List<f32>)->List<f32>{{return xs.map(fn(x)=>x*x+0.5);}}",
        include_str!("../../lowerings/js/tests/fixtures/helper_records.ink")
    );
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let snapshot = Runtime::from_checked(&module)
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let bits = [
        0u64,
        1 << 63,
        1,
        0x8000000000000001,
        0x0010000000000000,
        0x3ff0000000000001,
        0x7fefffffffffffff,
        0xffefffffffffffff,
        0x7ff0000000000000,
        0xfff0000000000000,
        0x7ff0000000001234,
        0xfff8000000005678,
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for (i, &x) in bits.iter().enumerate() {
        for n in [0, 3, 10] {
            let args =
                json!([{"F64Bits":x.to_string()},{"F64Bits":bits[(i+3)%bits.len()].to_string()},n]);
            for name in [
                "drive",
                "projected",
                "selected",
                "nested",
                "aliases",
                "owned",
                "fallible",
            ] {
                let p = module.program();
                let f = p.functions.iter().find(|f| f.name == name).unwrap();
                let inputs = args
                    .as_array()
                    .unwrap()
                    .iter()
                    .zip(&f.params)
                    .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
                    .collect();
                let value = eval::call_checked(&module, name, inputs, &mut 1_000_000).unwrap();
                steps.push(json!({"pure":name,"args":args}));
                expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
            }
        }
    }
    assert_eq!(steps.len(), 252);
    steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":snapshot}));
    super::parity::conformance_checked("helper-record-parity", &module, &source, steps, expected);
}
