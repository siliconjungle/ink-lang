use serde_json::json;
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"] mod parity;

#[test]
fn bucketed_intervals_preserve_cpu_membership_refinement_and_snapshots() {
    let path = "examples/crdts/bucket_interval_index.ink";
    let program = modules::load(path).unwrap().program;
    let runtime = Runtime::new(program.clone()).unwrap();
    let entries = json!([
        {"start":4294967300u64,"end":4294967310u64,"value":1,"hint":0},
        {"start":8589934593u64,"end":8589934600u64,"value":2,"hint":1},
        {"start":4294967310u64,"end":4294967320u64,"value":3,"hint":1},
        {"start":u64::MAX,"end":0,"value":4,"hint":3}
    ]);
    let cases = vec![
        ("values", json!([entries, [0,4294967300u64,4294967309u64,4294967310u64,8589934593u64,u64::MAX]])),
        ("valid", json!([entries])),
        ("valid", json!([[{"start":4294967295u64,"end":4294967297u64,"value":1,"hint":0}]])),
        ("refined_values", json!([u64::MAX-10,0,[u64::MAX-5,u64::MAX],[u64::MAX-11,u64::MAX-10,u64::MAX-5,u64::MAX]])),
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in cases {
        let f = program.functions.iter().find(|f| f.name == name).unwrap();
        let values = args.as_array().unwrap().iter().zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &program).unwrap()).collect();
        let value = eval::call(&program, name, values, &mut 5_000_000).unwrap().json();
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance("bucket-interval-index-parity", program,
        &std::fs::read_to_string(path).unwrap(), steps, expected);
}
