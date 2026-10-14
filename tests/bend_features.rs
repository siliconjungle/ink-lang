use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn parallel_buffers_recursion_and_scratch_agree_on_all_backends() {
    let src = include_str!("../examples/parallel-execution.ink");
    let p = parse(src).unwrap();
    let r = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args, want, gpu) in [
        ("countdown", json!([10000, 5]), json!(10005), false),
        ("factorial", json!([7]), json!(5040), false),
        ("swap_countdown", json!([3, 3, 9]), json!(11), false),
        (
            "list_total",
            json!([[1, 2, 3, 4294967295u32]]),
            json!(5),
            false,
        ),
        ("list_total", json!([[]]), json!(0), false),
        ("scratch", json!([3]), json!(44), false),
        (
            "scratch_many",
            json!([[0, 3, 4294967295u32]]),
            json!([35, 44, 32]),
            true,
        ),
        ("scratch_many", json!([[]]), json!([]), true),
    ] {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let a = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, a, &mut 100_000_000).unwrap().json(),
            want
        );
        steps.push(json!({"pure":name,"args":args,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    for at in [0u32, 1, 4, 8, u32::MAX] {
        let xs = vec![0u32, 3, u32::MAX];
        let split = at.min(8);
        let want = xs
            .iter()
            .map(|&x| {
                let first = x.wrapping_mul(if split == 0 { 5 } else { 3 });
                let last = (x.wrapping_add(7))
                    .wrapping_mul(if split == 8 { 3 } else { 5 })
                    .wrapping_add(if split == 8 { 7 } else { 7 - split });
                first.wrapping_add(last).wrapping_add(8)
            })
            .collect::<Vec<_>>();
        steps.push(json!({"pure":"partition_scratch_many","args":[xs,at],"expect_gpu":true}));
        expected.push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    for (name, xs, want) in [
        ("partition_scratch_many", json!([]), json!([])),
        (
            "push_scratch_many",
            json!([0, 3, 4294967295u32]),
            json!([0, 3, 4294967295u32]),
        ),
        ("push_scratch_many", json!([]), json!([])),
        (
            "stopping_scratch_many",
            json!([0, 3, 4294967295u32]),
            json!([3, 3, 3]),
        ),
        ("stopping_scratch_many", json!([]), json!([])),
    ] {
        let args = if name == "partition_scratch_many" {
            json!([xs, 0])
        } else {
            json!([xs])
        };
        steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
    }
    for at in [0u32, 1, u32::MAX] {
        let signed = [i32::MIN, -3, 0, i32::MAX];
        let floats = [-3.5f32, 0.0, 2.5];
        for (name, xs, want) in [
            (
                "signed_partition_scratch",
                json!(signed),
                json!(signed.map(|x| if at == 0 { x } else { x.wrapping_mul(3) })),
            ),
            (
                "float_partition_scratch",
                json!(floats),
                json!(floats.map(|x| if at == 0 { x } else { x + 1.5 })),
            ),
            (
                "bool_partition_scratch",
                json!([true, false]),
                if at == 0 {
                    json!([true, false])
                } else {
                    json!([false, true])
                },
            ),
        ] {
            steps.push(json!({"pure":name,"args":[xs,at],"expect_gpu":true}));
            expected
                .push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
        }
    }
    for n in [0, 1, 17, 1024] {
        let xs = (0..n)
            .map(|i| (i as u32).wrapping_mul(2654435761))
            .collect::<Vec<_>>();
        let want: Vec<u32> = xs
            .iter()
            .map(|&x| {
                let mut a = x;
                for i in 0..1024 {
                    a = a
                        .wrapping_mul(1664525)
                        .wrapping_add(1013904223)
                        .wrapping_add(i);
                }
                a
            })
            .collect();
        for (name, args) in [
            ("sequential", json!([xs])),
            ("parallel", json!([xs])),
            ("partitioned", json!([xs, n / 2])),
            ("partitioned", json!([xs, 0])),
            ("partitioned", json!([xs, u32::MAX])),
        ] {
            steps.push(json!({"pure":name,"args":args,"expect_workers":name=="parallel"&&n==1024}));
            expected
                .push(json!({"reply":{"value":want},"snapshot":r.checkpoint_portable().unwrap()}));
        }
    }
    parity::conformance("generated-parity-bend", p, src, steps, expected);
}
#[test]
fn independent_boolean_verdict_checks_exact_theorems() {
    let Ok(lean) = std::env::var("INK_TEST_LEAN") else {
        return;
    };
    let rules: Value =
        serde_json::from_str(include_str!("../knowledge/research/boolean-rules.json")).unwrap();
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/boolean-verdict-test");
    std::fs::create_dir_all(&root).unwrap();
    let generated = std::process::Command::new("python3")
        .args([
            "knowledge/producers/boolean_proofs.py",
            "knowledge/research/boolean-rules.json",
        ])
        .arg(&root)
        .output()
        .unwrap();
    assert!(generated.status.success());
    let lock: Value =
        serde_json::from_slice(&std::fs::read(root.join("lock.json")).unwrap()).unwrap();
    for (i, id) in lock["objects"].as_array().unwrap().iter().enumerate() {
        let input = root
            .join("objects")
            .join(format!("{}.json", id.as_str().unwrap()));
        let output = root.join(format!("{i}.lean"));
        let run = std::process::Command::new(env!("CARGO_BIN_EXE_ink"))
            .arg("check-boolean-verdict")
            .arg(&input)
            .args(["--lean", &lean, "-o"])
            .arg(output)
            .output()
            .unwrap();
        assert!(
            run.status.success(),
            "{}",
            String::from_utf8_lossy(&run.stderr)
        );
        assert!(!String::from_utf8_lossy(&run.stdout).contains("sorryAx"));
        let mut bad: Value = serde_json::from_slice(&std::fs::read(input).unwrap()).unwrap();
        bad["to"] = json!({"Bool":false});
        let forged = root.join("forged.json");
        std::fs::write(&forged, serde_json::to_vec(&bad).unwrap()).unwrap();
        let run = std::process::Command::new(env!("CARGO_BIN_EXE_ink"))
            .arg("check-boolean-verdict")
            .arg(forged)
            .args(["--lean", &lean, "-o"])
            .arg(root.join("bad.lean"))
            .output()
            .unwrap();
        assert!(!run.status.success());
        let emitted = root.join("forged.lean");
        let generated = std::process::Command::new("python3")
            .arg("knowledge/producers/boolean_verdict.py")
            .arg(root.join("forged.json"))
            .arg("-o")
            .arg(&emitted)
            .output()
            .unwrap();
        assert!(generated.status.success());
        let rejected = std::process::Command::new(&lean)
            .arg(emitted)
            .output()
            .unwrap();
        assert!(
            !rejected.status.success(),
            "Lean accepted altered endpoints"
        );
    }
    assert_eq!(rules.as_array().unwrap().len(), 2);
}

#[path = "fixtures/universal_control.rs"]
mod universal_control;

#[test]
fn packed_parallel_wasm_preserves_order_captures_and_nested_callbacks() {
    if std::env::var_os("INK_TEST_WASM").is_none() { return; }
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/packed-parallel-wasm");
    let p = parse("module packed;fn run(xs:List<u32>,offset:u32)->List<u32>{return parallel_map(xs,2,fn(i)=>fn(x)=>x+i+offset);} fn nested(xs:List<u32>)->List<u32>{return parallel_map(xs,1,fn(i)=>fn(x)=>sum(parallel_map(list(x,x+1),1,fn(j)=>fn(v)=>v+j)));}").unwrap();
    verified_language::runtime::emit_gpu(&p, &root).unwrap();
    let built=std::process::Command::new("python3").args(["tools/build_gpu_wasm.py"]).arg(&root).output().unwrap();
    assert!(built.status.success(),"{}",String::from_utf8_lossy(&built.stderr));
    std::fs::write(root.join("check.mjs"),r#"import fs from 'node:fs/promises';import assert from 'node:assert/strict';globalThis.fetch=async url=>new Response(await fs.readFile(url));const {loadInk}=await import('./ink-gpu.mjs');const engine=await loadInk(new URL('./',import.meta.url),{gpu:false});for(const xs of [[],[1],[1,2,3,4,5]]){for(const backend of ['cpu','javascript']){const r=await engine.run('run',[xs,7],backend);assert.deepEqual(r.value,xs.map((x,i)=>(x+i+7)>>>0));const n=await engine.run('nested',[xs],backend);assert.deepEqual(n.value,xs.map(x=>(2*x+2)>>>0));}}await engine.close();"#).unwrap();
    let run=std::process::Command::new("node").arg(root.join("check.mjs")).output().unwrap();
    assert!(run.status.success(),"{}",String::from_utf8_lossy(&run.stderr));
}
