use serde_json::json;
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};

#[test]
fn normalized_f32_values_preserve_cross_target_results_and_snapshots() {
    let source = format!(
        "{}\nfn numeric(xs:List<f32>)->List<f32>{{return xs.map(fn(x)=>x*x+0.5);}}",
        include_str!("../../lowerings/js/tests/fixtures/f32_carriers.ink")
    );
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let snapshot = Runtime::from_checked(&module)
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let bits = [
        0u32, 0x80000000, 1, 0x80000001, 0x007fffff, 0x00800000, 0x3f800001, 0x7f7fffff,
        0xff7fffff, 0x7f800000, 0xff800000, 0x7fc01234, 0x7fa01234, 0xffc05678,
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for (i, &x) in bits.iter().enumerate() {
        for n in [0, 1, 9] {
            let x = json!({"F32Bits":x});
            let y = json!({"F32Bits":bits[(i+3)%bits.len()]});
            for name in [
                "aliases",
                "loops",
                "records",
                "recursive",
                "bits",
                "arrays",
                "owned",
            ] {
                let args = if matches!(name, "arrays" | "owned") {
                    json!([[x,y,{"F32Bits":0x80000000u32}],y])
                } else {
                    json!([x, y, n])
                };
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
    assert_eq!(steps.len(), 294);
    steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":snapshot}));
    super::parity::conformance_checked("f32-carrier-parity", &module, &source, steps, expected);
}
