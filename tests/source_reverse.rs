use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/source-reverse-learning.ink");
const SOURCE_F64: &str = include_str!("../examples/source-reverse-learning-f64.ink");
#[test]
fn resident_source_gradients_and_adam_keep_complete_training_on_the_device() {
    let source = include_str!("../examples/resident-source-training.ink");
    let p = syntax::parse(source).unwrap();
    let checked = CheckedModule::from_source(p.clone()).unwrap();
    let emission = ink_lowering_gpu::compute::lower(&checked).unwrap();
    for name in ["shape", "gradients", "update", "losses"] {
        let f = emission.manifest["functions"].as_array().unwrap().iter()
            .find(|f| f["name"] == name).unwrap();
        assert!(f["fallback_reason"].is_null(), "{name}: {}", f["fallback_reason"]);
        for node in f["graph"]["nodes"].as_array().expect("composable device graph") {
            let code = &emission.shaders[node["shader"].as_str().unwrap()];
            let module = naga::front::wgsl::parse_str(code)
                .unwrap_or_else(|e| panic!("{name}: {}", e.emit_to_string(code)));
            naga::valid::Validator::new(naga::valid::ValidationFlags::all(), naga::valid::Capabilities::empty())
                .validate(&module).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        }
    }
    if std::env::var_os("INK_TEST_WGPU").is_none() { return; }
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/resident-source-training");
    let bundle = output.join("bundle");
    let validation = output.join("validation");
    verified_language::runtime::emit_gpu(&p, &bundle).unwrap();
    std::fs::write(output.join("storage-retention.json"),
        r#"{"schema":1,"keep":[{"path":"bundle","reason":"Selected resident-training proof inputs"},{"path":"validation","reason":"Complete histories and independent gradient check"},{"path":"storage-retention.json","reason":"Retention contract"}],"safe_to_remove":[]}"#).unwrap();
    let run = |command: &mut std::process::Command| {
        let result = command.output().unwrap();
        assert!(result.status.success(), "{}\n{}", String::from_utf8_lossy(&result.stdout), String::from_utf8_lossy(&result.stderr));
        result.stdout
    };
    run(std::process::Command::new("python3").arg(root.join("bench/gpu/source-training.py")).arg("prepare").arg(&validation));
    let target = std::env::var_os("INK_RESIDENT_TRAINING_TARGET").map(std::path::PathBuf::from)
        .unwrap_or_else(|| output.join("native-target"));
    run(std::process::Command::new("cargo").args(["build", "--offline", "--quiet", "--manifest-path"])
        .arg(bundle.join("native/Cargo.toml")).arg("--target-dir").arg(&target)
        .env("CARGO_PROFILE_DEV_DEBUG", "0").env("CARGO_INCREMENTAL", "0"));
    let program = target.join(if cfg!(windows) { "debug/ink-gpu-program.exe" } else { "debug/ink-gpu-program" });
    for backend in ["cpu", "gpu"] {
        let replies = run(std::process::Command::new(&program).arg("--script")
            .arg(validation.join(format!("native-{backend}-script.json"))));
        std::fs::write(validation.join(format!("native-{backend}-history.jsonl")), replies).unwrap();
    }
    let receipt = run(std::process::Command::new("python3").arg(root.join("bench/gpu/source-training.py")).arg("verify").arg(&validation));
    println!("{}", String::from_utf8_lossy(&receipt));
    if target == output.join("native-target") {
        let path = output.join("storage-retention.json");
        let mut manifest: Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        manifest["safe_to_remove"] = json!([{"path":"native-target","reason":"Completed generated validation build; inputs and complete useful execution proof are retained"}]);
        std::fs::write(path, serde_json::to_vec_pretty(&manifest).unwrap()).unwrap();
    }
}
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
    check_training(SOURCE,"source-reverse-parity",false);
}
#[test]
fn binary64_source_training_preserves_precision_failures_bits_and_complete_histories() {
    check_training(SOURCE_F64,"source-reverse64-parity",true);
}
fn check_training(source:&str,label:&str,binary64:bool) {
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
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
    if binary64 {
        let precise=1.0+2.0f64.powi(-40);
        assert_eq!(pure(&module,"forward64",json!([precise])),json!(2.0*precise));
        assert_ne!(2.0*precise,2.0*((precise as f32) as f64));
        for weights in [json!({"a":precise,"b":0.5}),json!({"a":-0.25,"b":-0.5})] {
            for (name,args) in [("trajectory_gradient64",json!([weights,0.75])),
                               ("trajectory_direction64",json!([weights,{"a":0.25,"b":-0.5},0.75]))] {
                let value=pure(&module,name,args.clone());
                steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
                expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
        for bits in [0u64,1,1<<63,0x7ff0000000000000,0xfff0000000000000,
                     0x7ff0000000001234,0xfff8000000005678,0x0010000000000000,
                     0x7fefffffffffffff,precise.to_bits()] {
            let input=json!({"F64Bits":bits.to_string()});
            for (name,args) in [("forward64",json!([input])),("directional64",json!([input,0.25])),("primal64",json!([input]))] {
                let value=pure(&module,name,args.clone());
                if name=="primal64" {assert_eq!(value,json!({"Ok":verified_language::float64::json_bits(bits)}));}
                steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
                expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
    }
    let inputs = (0..8192).map(|i| (i as f32) / 8.0).collect::<Vec<_>>();
    let args = json!([inputs]);
    let value = pure(&module, "device", args.clone());
    steps.push(json!({"pure":"device","args":args,"expect_gpu":true}));
    expected
        .push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance_checked(label, &module, source, steps, expected);
}

#[test]
fn terminal_values_and_gradients_survive_compilation() {
    let source=r#"module terminal_reverse;
state Marker:u32=0;
fn exclusive(x:f32)->f32{return repeat_until(10,x,fn(s)=>s>=8.0,fn(i)=>fn(s)=>s*2.0);}
fn inclusive(x:f32)->f32{return fold_until(list(1,2,3,4),x,fn(i)=>fn(s)=>s>=4.0,fn(i)=>fn(s)=>s*2.0);}
fn exclusive_value(x:f32)->f32{return reverse_linearize_piecewise(exclusive,x,128,true).fold(fn(r)=>r.value,fn(e)=>-1.0);}
fn exclusive_gradient(x:f32)->f32{return reverse_linearize_piecewise(exclusive,x,128,true).fold(fn(r)=>r.gradient,fn(e)=>-1.0);}
fn inclusive_value(x:f32)->f32{return reverse_linearize_piecewise(inclusive,x,128,true).fold(fn(r)=>r.value,fn(e)=>-1.0);}
fn inclusive_gradient(x:f32)->f32{return reverse_linearize_piecewise(inclusive,x,128,true).fold(fn(r)=>r.gradient,fn(e)=>-1.0);}
fn device(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*2.0+1.0);}
"#;
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let runtime=Runtime::from_checked(&module).unwrap();let mut steps=vec![];let mut expected=vec![];
    for input in [json!(-4.0),json!(-0.0),json!(2.0),json!(8.0),json!({"F32Bits":0x7f800000u32}),json!({"F32Bits":0x7fc00000u32})] {
        for name in ["exclusive","inclusive"] {
            let p=module.program();let argument=eval::Value::from_program_json(&input,&syntax::Type::F32,p).unwrap();
            let original=eval::call(p,name,vec![argument.clone()],&mut 1_000_000).unwrap();
            let forward=eval::call(p,&format!("{name}_value"),vec![argument],&mut 1_000_000).unwrap();
            assert_eq!(forward,original,"{name} primal bits");
            for suffix in ["value","gradient"] {
                let name=format!("{name}_{suffix}");let args=json!([input]);let value=pure(&module,&name,args.clone());
                if input==json!(2.0)&&suffix=="gradient" {assert_eq!(value,json!(4.0));}
                steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
    }
    let args=json!([(0..8192).map(|i|(i as f32)/8.0).collect::<Vec<_>>()]);let value=pure(&module,"device",args.clone());
    steps.push(json!({"pure":"device","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    parity::conformance_checked("source-reverse-until-parity",&module,source,steps,expected);
}
