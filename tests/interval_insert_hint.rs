use serde_json::json;
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"] mod parity;

#[test]
fn insertion_fingers_preserve_exact_cpu_tree_images() {
    let path = "examples/crdts/interval_insert_hint.ink";
    let program = modules::load(path).unwrap().program;
    let runtime = Runtime::new(program.clone()).unwrap();
    let function = program.functions.iter().find(|f| f.name == "image").unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let mut histories = vec![json!([])];
    for hint in [0, 1, 2, 3, 999] {
        let mut rows = vec![];
        for (i, start) in [40u64, 0, 20, 10, 30, 60, 50, 70].into_iter().enumerate() {
            rows.push(json!({"start":start,"end":start+10,"value":i+1,"hint":hint}));
        }
        histories.push(json!(rows.clone()));
        for (start, end, value) in [(49, 61, 9), (80, 80, 9), (80, 90, 0)] {
            let mut bad = rows.clone();
            bad.push(json!({"start":start,"end":end,"value":value,"hint":hint}));
            histories.push(json!(bad));
        }
    }
    histories.push(json!([
        {"start":u64::MAX-1,"end":u64::MAX,"value":1,"hint":0},
        {"start":u64::MAX,"end":0,"value":2,"hint":1}
    ]));
    for entries in histories {
        let arguments = json!([entries, false]);
        let values = arguments.as_array().unwrap().iter().zip(&function.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &program).unwrap()).collect();
        let want = eval::call(&program, "image", values, &mut 5_000_000).unwrap().json();
        for fast in [false, true] {
            let arguments = json!([entries, fast]);
            let values = arguments.as_array().unwrap().iter().zip(&function.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &program).unwrap()).collect();
            assert_eq!(eval::call(&program, "image", values, &mut 5_000_000).unwrap().json(), want);
            steps.push(json!({"pure":"image","args":arguments}));
            expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    parity::conformance("interval-insert-hint-parity", program,
        &std::fs::read_to_string(path).unwrap(), steps, expected);
}
