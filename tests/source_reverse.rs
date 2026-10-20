use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/source-reverse-learning.ink");
const SOURCE_F64: &str = include_str!("../examples/source-reverse-learning-f64.ink");
#[test]
fn whole_static_tapes_preserve_complete_learning_histories() {
    let slots=(0..8).map(|i|format!("w{i}")).collect::<Vec<_>>();
    let blocks=(0..8).map(|i|format!("b{i}")).collect::<Vec<_>>();
    let initial:Value=blocks.iter().enumerate().map(|(i,b)|(b.clone(),slots.iter().enumerate().map(|(j,n)|(n.clone(),json!((i*8+j)as f32/128.0))).collect::<Value>())).collect();
    let init=format!("fn initial()->Weights{{return Weights{{{}}};}}",blocks.iter().enumerate().map(|(i,b)|format!("{b}:Block{{{}}}",slots.iter().enumerate().map(|(j,n)|format!("{n}:{}",(i*8+j)as f32/128.0)).collect::<Vec<_>>().join(","))).collect::<Vec<_>>().join(","));
    let checks=format!("fn valid_block(w:Block)->Bool{{return {};}}fn valid(w:Weights)->Bool{{return {};}}",slots.iter().map(|n|format!("is_finite(w.{n})")).collect::<Vec<_>>().join("&&"),blocks.iter().map(|n|format!("valid_block(w.{n})")).collect::<Vec<_>>().join("&&"));
    let state=r#"
trainable state Parameters:Weights=initial();
event learned:f32;
query parameters()->Weights reads(Parameters){return Parameters;}
query loss(target:f32)->f32 reads(Parameters){return energy(Parameters,target);}
learn change observe(target:f32,rate:f32,maximum:u32)->Result<f32,String>
 reads(Parameters) writes(Parameters) emits(learned)
 requires(is_finite(target)&&rate>0.0&&rate<=1.0,"training domain")
 ensures(result=>valid(Parameters),"finite weights") {
 let gradient=derivatives(Parameters,target,maximum,true)?;
 Parameters=update(Parameters,gradient,rate);
 let value=energy(Parameters,target);emit learned(value);return Ok(value);
}
"#;
    for wide in [false,true] {
        let mut source=format!("{}\n{init}\n{checks}\n{state}",include_str!("../bench/functionality/static-reverse/source.ink"));
        if wide {
            // Float literals retain their explicit source precision.
            let bytes=source.as_bytes();let mut out=String::new();let mut at=0;
            while at<bytes.len() {
                if bytes[at].is_ascii_digit() && (at==0 || !(bytes[at-1].is_ascii_alphanumeric() || bytes[at-1]==b'_')) {
                    let start=at;while at<bytes.len() && bytes[at].is_ascii_digit(){at+=1;}
                    let decimal=at+1<bytes.len() && bytes[at]==b'.' && bytes[at+1].is_ascii_digit();
                    if decimal {at+=1;while at<bytes.len() && bytes[at].is_ascii_digit(){at+=1;}}
                    out.push_str(&source[start..at]);if decimal {out.push_str("f64");}
                } else {out.push(bytes[at]as char);at+=1;}
            }
            source=out.replace("f32","f64");
        }
        // This separate eligible dispatch checks device execution without
        // claiming that the generated reverse graph executes on the device.
        source.push_str("\nfn device(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*2.0+1.0);}");
        source.push_str(&format!("\nrecord Flat{{{},}}fn flat(value:Flat)->Flat{{return value;}}",(0..64).map(|i|format!("v{i}:{}",if wide{"f64"}else{"f32"})).collect::<Vec<_>>().join(",")));
        println!("static reverse wide={wide}: check source");
        let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
        println!("static reverse wide={wide}: initialise reference state");
        let mut runtime=Runtime::from_checked(&module).unwrap();
        let mut steps=vec![];let mut expected=vec![];
        println!("static reverse wide={wide}: pure reference controls");
        let flat:Value=(0..64).map(|i|(format!("v{i}"),json!(i as f32/32.0))).collect();
        let args=json!([flat]);let value=pure(&module,"flat",args.clone());
        steps.push(json!({"pure":"flat","args":args,"cpu_only":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        for maximum in [0,1,192,193,194,1_000_001] {
            let args=json!([initial,0.25,maximum,false]);
            for name in ["derivatives","linearized"] {
                let value=pure(&module,name,args.clone());
                steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
                expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
        let exceptional=if wide {
            vec![json!({"F64Bits":"9223372036854775808"}),json!({"F64Bits":"1"}),json!({"F64Bits":"9218868437227405312"}),json!({"F64Bits":"9221120237041095220"})]
        } else {
            vec![json!({"F32Bits":0x80000000u32}),json!({"F32Bits":1u32}),json!({"F32Bits":0x7f800000u32}),json!({"F32Bits":0x7fc12345u32})]
        };
        for value in exceptional {
            let mut weights=initial.clone();weights["b0"]["w0"]=value;
            for stop in [false,true] {
                let args=json!([weights,0.25,193,stop]);
                for name in ["derivatives","linearized"] {
                    let value=pure(&module,name,args.clone());
                    steps.push(json!({"pure":name,"args":args,"cpu_only":true}));
                    expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
                }
            }
        }
        println!("static reverse wide={wide}: complete reference updates");
        for epoch in 0..16 {
            let args=json!([(epoch%7)as f32/8.0,1.0/1024.0,193]);
            let result=runtime.invoke_json("observe",&args).unwrap();assert!(result.committed);
            steps.push(json!({"call":"observe","args":args}));
            expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
            if epoch==7 {
                let snapshot=runtime.checkpoint_portable().unwrap();
                steps.push(json!({"restore":snapshot}));runtime=Runtime::restore_portable_checked(&module,&snapshot).unwrap();
            }
        }
        for args in [json!([0.25,1.0/1024.0,192]),json!([0.25,0.0,193]),json!([3e38,1.0,193])] {
            let before=runtime.checkpoint_portable().unwrap();
            let result=runtime.invoke_json("observe",&args).unwrap();
            // The final F64 update is finite; F32 overflows and rolls back.
            if args[0]!=3e38 || !wide {assert!(!result.committed);assert_eq!(before,runtime.checkpoint_portable().unwrap());}
            steps.push(json!({"call":"observe","args":args}));
            expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
        for (name,args) in [("parameters",json!([])),("loss",json!([0.25]))] {
            let result=runtime.invoke_json(name,&args).unwrap();steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":result.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
        let args=json!([[0.0,-0.0,1.0,-2.0]]);let value=pure(&module,"device",args.clone());
        steps.push(json!({"pure":"device","args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        println!("static reverse wide={wide}: compiled target histories");
        parity::conformance_checked(if wide{"static-reverse64-parity"}else{"static-reverse-parity"},&module,&source,steps,expected);
    }
}
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
    let precise=emission.manifest["functions"].as_array().unwrap().iter().find(|f|f["name"]=="precise_gradient").unwrap();
    assert!(precise["fallback_reason"].is_string());
    assert!(precise["shader"].is_null() && precise["graph"].is_null());
    if std::env::var_os("INK_TEST_WGPU").is_none() { return; }
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/resident-source-training");
    let bundle = output.join("bundle");
    let validation = output.join("validation");
    std::fs::create_dir_all(&output).unwrap();
    std::fs::write(output.join("storage-retention.json"),
        r#"{"schema":1,"keep":[{"path":"bundle","reason":"Selected resident-training proof inputs"},{"path":"validation","reason":"Complete histories and independent gradient check"},{"path":"storage-retention.json","reason":"Retention contract"}],"safe_to_remove":[]}"#).unwrap();
    verified_language::runtime::emit_gpu(&p, &bundle).unwrap();
    if std::env::var_os("INK_TEST_WASM").is_some() {
        ink_runtime::toolchain::gpu_cpu_wasm(&bundle.join("cpu"), &bundle.join("cpu.wasm")).unwrap();
    }
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
    {
        let path = output.join("storage-retention.json");
        let mut manifest: Value = serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
        let mut retired = Vec::new();
        if target == output.join("native-target") {
            retired.push(json!({"path":"native-target","reason":"Completed generated validation build; inputs and complete useful execution proof are retained"}));
        }
        if bundle.join("cpu/target").exists() {
            retired.push(json!({"path":"bundle/cpu/target","reason":"Completed browser CPU build; selected cpu.wasm and exact source inputs are retained"}));
        }
        manifest["safe_to_remove"] = json!(retired);
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
record Alias{values:List<f64>,}
record DevicePoint{value:f32,}
fn device_value(Alias:DevicePoint)->f32{return Alias.value*2.0+1.0;}
fn exclusive(x:f32)->f32{return repeat_until(10,x,fn(s)=>s>=8.0,fn(i)=>fn(s)=>s*2.0);}
fn inclusive(x:f32)->f32{return fold_until(list(1,2,3,4),x,fn(i)=>fn(s)=>s>=4.0,fn(i)=>fn(s)=>s*2.0);}
fn exclusive_value(x:f32)->f32{return reverse_linearize_piecewise(exclusive,x,128,true).fold(fn(r)=>r.value,fn(e)=>-1.0);}
fn exclusive_gradient(x:f32)->f32{return reverse_linearize_piecewise(exclusive,x,128,true).fold(fn(r)=>r.gradient,fn(e)=>-1.0);}
fn inclusive_value(x:f32)->f32{return reverse_linearize_piecewise(inclusive,x,128,true).fold(fn(r)=>r.value,fn(e)=>-1.0);}
fn inclusive_gradient(x:f32)->f32{return reverse_linearize_piecewise(inclusive,x,128,true).fold(fn(r)=>r.gradient,fn(e)=>-1.0);}
fn device(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>device_value(DevicePoint{value:x}));}
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

#[test]
fn internal_owned_helpers_preserve_full_host_state_and_literal_gpu_execution() {
    let source=format!("{}\n{}",include_str!("../examples/device-private-helpers.ink"),include_str!("../examples/device-record-tape.ink").lines().skip(1).collect::<Vec<_>>().join("\n"));
    let module=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let mut runtime=Runtime::from_checked(&module).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    let controls=[json!([]),json!([0.0,-0.0,1.0,-1.0]),json!([{ "F32Bits":2143289345u32 },-0.0]),json!([{"F32Bits":1u32},{"F32Bits":0x7f800000u32}])];
    for inputs in controls {
        for split in [0u32,3,8,u32::MAX] {
            for empty in [false,true] {
                for name in ["evaluated","readout"] {
                    let args=json!([inputs,split,empty]);let result=pure(&module,name,args.clone());
                    steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));
                    expected.push(json!({"reply":{"value":result},"snapshot":runtime.checkpoint_portable().unwrap()}));
                }
            }
        }
    }
    for input in [json!(-0.0),json!(1.0),json!({"F32Bits":2143289345u32}),json!({"F32Bits":1u32})] {
        for empty in [false,true] {
            let args=json!([input,8,empty]);let value=pure(&module,"value",args.clone());
            steps.push(json!({"pure":"value","args":args,"expect_gpu":true}));
            expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    for enabled in [false,true] {
        let args=json!([[{"F32Bits":2143289345u32},-0.0],enabled]);let value=pure(&module,"lazy_total",args.clone());
        steps.push(json!({"pure":"lazy_total","args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    for input in [json!(-0.0),json!(1.0),json!(-2.0),json!({"F32Bits":1u32}),json!({"F32Bits":0x7f800000u32}),json!({"F32Bits":2143289345u32})] {
        for negative in [false,true] {
            for (name,args) in [("tape_observation",json!([input,negative])),("mapped",json!([[input],negative]))] {
                let value=pure(&module,name,args.clone());
                steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
        }
        let args=json!([input]);let value=pure(&module,"scanned",args.clone());
        steps.push(json!({"pure":"scanned","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    for at in [0u32,1,32,63,64,u32::MAX] {
        for remove in [false,true] {
            let args=json!([{"F32Bits":2143289345u32},at,remove]);let value=pure(&module,"partitioned",args.clone());
            steps.push(json!({"pure":"partitioned","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    for input in [0u64,1,u64::MAX,(1u64<<32)+1] {
        let args=json!([input]);let value=pure(&module,"scanned_wide",args.clone());
        steps.push(json!({"pure":"scanned_wide","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    for inputs in [json!([]),json!([u64::MAX,1u64]),json!([0,1,2,3,4,5])] {
        for left in [false,true] {
            let args=json!([inputs,u64::MAX,left]);let value=pure(&module,"selected_wide",args.clone());
            steps.push(json!({"pure":"selected_wide","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
        }
    }
    for empty in [false,true] {
        let args=json!([u64::MAX,empty]);let value=pure(&module,"empty_owned",args.clone());
        steps.push(json!({"pure":"empty_owned","args":args,"expect_gpu":true}));expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    for (input,maximum) in [(2.0,32),(-0.0,32),(-4.0,32),(2.0,1),(2.0,1000001)] {
        let args=json!([input,maximum]);let value=pure(&module,"reverse_value",args.clone());
        steps.push(json!({"pure":"reverse_value","args":args,"cpu_only":true}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    let initial=runtime.checkpoint_portable().unwrap();
    for args in [json!([[1.0,2.0],3,false]),json!([[],0,false]),json!([[10000.0],8,false]),json!([[3.0,4.0],u32::MAX,true])] {
        let before=runtime.checkpoint_portable().unwrap();let outcome=runtime.invoke_json("observe",&args).unwrap();
        if args[0].as_array().unwrap().is_empty()||args[0][0]==10000.0 {assert!(!outcome.committed);assert_eq!(runtime.checkpoint_portable().unwrap(),before);}else{assert!(outcome.committed);}
        steps.push(json!({"call":"observe","args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"restore":initial}));runtime=Runtime::restore_portable_checked(&module,&initial).unwrap();
    let outcome=runtime.invoke_json("current",&json!([])).unwrap();
    steps.push(json!({"call":"current","args":[]}));expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    let proof_root=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/device-private-helpers");
    std::fs::create_dir_all(&proof_root).unwrap();
    std::fs::write(proof_root.join("storage-retention.json"),r#"{"schema":1,"keep":[{"path":".","reason":"Active required complete entry/record/helper CPU and device validation"}],"safe_to_remove":[]}"#).unwrap();
    parity::conformance_checked("device-private-helpers",&module,&source,steps,expected);
    if std::env::var_os("INK_TEST_WGPU").is_some() && std::env::var_os("INK_TEST_WASM").is_some() {
        let root=std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        let fixture=root.join("build/device-private-helpers");
        std::fs::write(fixture.join("storage-retention.json"),r#"{"schema":1,"keep":[{"path":".","reason":"Required complete entry/helper CPU and device proof and reproduction inputs"}],"safe_to_remove":[]}"#).unwrap();
        let output=std::process::Command::new("python3").arg(root.join("tools/build_gpu_wasm.py"))
            .arg(fixture.join("gpu-module")).arg("--target-dir").arg(fixture.join("browser-target"))
            .env("CARGO_PROFILE_DEV_DEBUG","0").env("CARGO_INCREMENTAL","0").output().unwrap();
        std::fs::write(fixture.join("browser-preparation.stdout"),&output.stdout).unwrap();
        std::fs::write(fixture.join("browser-preparation.stderr"),&output.stderr).unwrap();
        assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
        let mut manifest:Value=serde_json::from_slice(&std::fs::read(fixture.join("storage-retention.json")).unwrap()).unwrap();
        manifest["safe_to_remove"]=json!([{"path":"browser-target","reason":"Completed generated browser ABI validation build; exact source, Wasm images and complete proof retained"}]);
        std::fs::write(fixture.join("storage-retention.json"),serde_json::to_vec_pretty(&manifest).unwrap()).unwrap();
    }
}
