use serde_json::json;
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn compiled_objectives_match_independent_reference_across_targets() {
    let mut program = modules::load("examples/programmable-objective.ink")
        .unwrap()
        .program;
    // Separate F32 device control: the F64 objective itself uses CPU fallback.
    let control = syntax::parse(
        "module control;fn device_control(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.5);}",
    )
    .unwrap();
    program.functions.extend(control.functions);
    let module = CheckedModule::from_source(program).unwrap();
    let p = module.program();
    let reference = Runtime::from_checked(&module).unwrap();
    let snapshot = reference.checkpoint_portable().unwrap();
    let candidate = json!({"variant":"direct","artifact":"a".repeat(64),"current":true,
        "workload":[{"name":"action:read@s","calls":2}],"window_calls":2,"total_calls":10,
        "state_elements":100,"horizon_calls":100,"execution_low_ns":100.0,"execution_high_ns":110.0,
        "migration_high_ns":0.0,"migration_margin":2.0,"total_low_ns":100.0,"total_high_ns":110.0,
        "peak_bytes":400,"migration_peak_bytes":0,"migration_pause_ns":0.0});
    let mut other = candidate.clone();
    other["variant"] = json!("compact");
    other["current"] = json!(false);
    other["peak_bytes"] = json!(80);
    other["total_low_ns"] = json!(200.0);
    other["total_high_ns"] = json!(220.0);
    let mut steps = vec![];
    let mut expected = vec![];
    for context in [
        json!({"latency_weight":1.0,"memory_weight":0.0,"switch_penalty":0.0,"preferences":[]}),
        json!({"latency_weight":0.0,"memory_weight":1.0,"switch_penalty":0.0,"preferences":[]}),
        json!({"latency_weight":0.25,"memory_weight":2.0,"switch_penalty":17.0,"preferences":[{"variant":"compact","penalty":-500.0}]}),
        json!({"latency_weight":-1.0,"memory_weight":1.0,"switch_penalty":0.0,"preferences":[]}),
        json!({"latency_weight":{"F64Bits":"9218868437227405312"},"memory_weight":1.0,"switch_penalty":0.0,"preferences":[]}),
        json!({"latency_weight":1e308,"memory_weight":1.0,"switch_penalty":0.0,"preferences":[]}),
    ] {
        let args = json!([[candidate, other], context]);
        let function = p.functions.iter().find(|f| f.name == "rank").unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&function.params)
            .map(|(value, (_, t))| eval::Value::from_program_json(value, t, p).unwrap())
            .collect();
        let result = eval::call(p, "rank", values, &mut 1_000_000)
            .unwrap()
            .json();
        steps.push(json!({"pure":"rank","args":args}));
        expected.push(json!({"reply":{"value":result},"snapshot":snapshot}));
    }
    steps.push(json!({"pure":"device_control","args":[[0.0,0.5,1.0,-1.0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5,1.5]},"snapshot":snapshot}));
    parity::conformance_checked(
        "programmable-objective-parity",
        &module,
        include_str!("../examples/programmable-objective.ink"),
        steps,
        expected,
    );
}
