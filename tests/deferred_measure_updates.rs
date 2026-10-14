use serde_json::json;
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"] mod parity;

#[test]
fn deferred_weights_preserve_exact_cpu_tree_images() {
    let path = "examples/crdts/deferred_measure_updates.ink";
    let program = modules::load(path).unwrap().program;
    let runtime = Runtime::new(program.clone()).unwrap();
    let function = program.functions.iter().find(|f| f.name == "image").unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for count in [0u32, 1, 33, 80] {
        let changes = (0..40u32).map(|i| json!({
            "slot": if count == 0 { 0 } else { 1 + (i * 17) % count },
            "weight": if i % 4 == 0 { u32::MAX } else { i % 7 }
        })).collect::<Vec<_>>();
        let arguments = json!([count, changes, false]);
        let values = arguments.as_array().unwrap().iter().zip(&function.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &program).unwrap()).collect();
        let want = eval::call(&program, "image", values, &mut 20_000_000).unwrap().json();
        for fast in [false, true] {
            let arguments = json!([count, changes, fast]);
            let values = arguments.as_array().unwrap().iter().zip(&function.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &program).unwrap()).collect();
            assert_eq!(eval::call(&program, "image", values, &mut 20_000_000).unwrap().json(), want);
            steps.push(json!({"pure":"image","args":arguments}));
            expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    parity::conformance("deferred-measure-updates-parity", program,
        &std::fs::read_to_string(path).unwrap(), steps, expected);
}
