use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/source-reverse-learning.ink");
fn pure(module: &CheckedModule, name: &str, args: Value) -> Value {
    let p = module.program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&f.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
        .collect();
    eval::call(p, name, args, &mut 100_000_000).unwrap().json()
}
#[test]
fn reverse_source_training_preserves_every_result_event_and_checkpoint() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let mut runtime = Runtime::from_checked(&module).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let context = json!({"features":vec![0.125;64],"target":1.0});
    for (name, args) in [
        ("derivatives", json!([vec![0.0; 64], context, 512])),
        ("derivatives", json!([vec![0.0; 64], context, 1])),
        ("derivatives", json!([vec![0.0; 64], context, 1000001])),
        ("linearized_value", json!([vec![0.25; 64], context, 512])),
        ("branch_owned", json!([{"Some":2}])),
        ("branch_owned", json!([{"None":null}])),
    ] {
        let value = pure(&module, name, args.clone());
        if name == "derivatives" && args[2] == 512 {
            assert_eq!(value, json!({"Ok":vec![-0.25;64]}));
        }
        steps.push(json!({"pure":name,"args":args}));
        expected.push(
            json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    let initial = runtime
        .invoke_json("loss", &json!([context]))
        .unwrap()
        .result
        .json()
        .as_f64()
        .unwrap();
    for epoch in 0..24 {
        let args = json!([context, 0.05, 512]);
        let result = runtime.invoke_json("observe", &args).unwrap();
        assert!(result.committed);
        steps.push(json!({"call":"observe","args":args}));
        expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
        if epoch % 8 == 7 {
            let snapshot = runtime.checkpoint_portable().unwrap();
            steps.push(json!({"restore":snapshot}));
            runtime = Runtime::restore_portable_checked(&module, &snapshot).unwrap();
        }
    }
    let final_loss = runtime
        .invoke_json("loss", &json!([context]))
        .unwrap()
        .result
        .json()
        .as_f64()
        .unwrap();
    assert!(final_loss < initial * 0.02, "{initial} -> {final_loss}");
    for args in [
        json!([{"features":vec![0.125;64],"target":1e6},0.25,512]),
        json!([context, 0.05, 1]),
    ] {
        let before = runtime.checkpoint_portable().unwrap();
        let result = runtime.invoke_json("observe", &args).unwrap();
        assert!(!result.committed);
        assert_eq!(before, runtime.checkpoint_portable().unwrap());
        steps.push(json!({"call":"observe","args":args}));
        expected.push(json!({"reply":{"outcome":result.json()},"snapshot":before}));
    }
    for (name, args) in [("loss", json!([context])), ("parameters", json!([]))] {
        let reply = runtime.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let trained=verified_language::training::replay(&module,&verified_language::training::Trace{
        schema:1,epochs:24,observations:vec![verified_language::training::Observation{call:"observe".into(),args:json!([context,0.05,512])}]
    }).unwrap();
    assert_eq!(trained.snapshot,runtime.checkpoint_portable().unwrap(),"offline training matches continued runtime state");
    let inputs = (0..8192).map(|i| (i as f32) / 8.0).collect::<Vec<_>>();
    let args = json!([inputs]);
    let value = pure(&module, "device", args.clone());
    steps.push(json!({"pure":"device","args":args,"expect_gpu":true}));
    expected
        .push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance_checked("source-reverse-parity", &module, SOURCE, steps, expected);
}
