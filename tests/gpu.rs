use std::fs;
use verified_language::{check, syntax::parse};
#[test]
fn packed_wasm_parallel_fallback_preserves_captures_indices_and_nesting() {
    if std::env::var_os("INK_TEST_WASM").is_none() { return; }
    let source = r#"module packed_parallel;
fn mapped(xs:List<u32>,bias:u32,grain:u32)->List<u32>{
    return parallel_map(xs,grain,fn(i)=>fn(x)=>
        sum(parallel_map([x,bias],1,fn(j)=>fn(y)=>y+i+j)));
}
fn updated(xs:List<u32>,bias:u32,grain:u32)->List<u32>{
    return buffer(xs).map_parallel(grain,fn(i)=>fn(x)=>x+bias+i).freeze();
}
"#;
    let p = parse(source).unwrap();
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/packed-parallel-fallback");
    verified_language::runtime::emit_gpu(&p, &root).unwrap();
    ink_runtime::toolchain::gpu_cpu_wasm(&root.join("cpu"), &root.join("cpu.wasm")).unwrap();
    let script = root.join("check.mjs");
    fs::write(&script, include_str!("fixtures/packed-parallel-fallback.mjs")).unwrap();
    let out = std::process::Command::new("node").arg(&script).output().unwrap();
    assert!(out.status.success(), "{}\n{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr));
}
#[test]
fn capability_rejection_preserves_compiled_cpu_and_staged_lowering() {
    let p = parse(include_str!("../examples/gpu.ink")).unwrap();
    check::check(&p).unwrap();
    let dir = std::path::Path::new("build/gpu-emission-test");
    verified_language::runtime::emit_gpu(&p, dir).unwrap();
    let manifest: serde_json::Value =
        serde_json::from_slice(&fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    let function = |name: &str| {
        manifest["functions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|f| f["name"] == name)
            .unwrap()
    };
    assert_eq!(manifest["schema"], 2);
    let operations = |name: &str| {
        function(name)["graph"]["nodes"]
            .as_array()
            .unwrap()
            .iter()
            .map(|n| n["op"].as_str().unwrap().to_owned())
            .collect::<Vec<_>>()
    };
    // Every original stage is retained, now including the ordered consumer.
    assert_eq!(
        operations("double_filter"),
        ["filter", "filter", "map", "sum"]
    );
    assert_eq!(operations("shadow"), ["map", "map", "sum"]);
    assert_eq!(operations("ordered"), ["scalar", "foldr"]);
    let ordered = &function("ordered")["graph"]["nodes"][1];
    assert_eq!(ordered["ordered"], true);
    assert!(
        fs::read_to_string(dir.join(ordered["shader"].as_str().unwrap()))
            .unwrap()
            .contains("cursor--")
    );
    for name in ["lazy"] {
        assert!(function(name)["graph"].is_null(), "{name}");
        assert!(function(name)["shader"].is_null(), "{name}");
        assert!(function(name)["fallback_reason"].is_string(), "{name}");
    }
    for name in ["wide", "intermediate_wide", "count_constants"] {
        assert!(!function(name)["graph"].is_null(), "{name}");
        assert!(function(name)["fallback_reason"].is_null(), "{name}");
    }
    assert!(!function("constant")["graph"].is_null());
    assert!(!function("heavy")["graph"].is_null());
    let c = fs::read_to_string(dir.join("native/src/cpu.rs")).unwrap();
    assert!(c.contains("u32"));
    assert!(c.contains("function_l_wide"));
    assert!(dir.join("native/Cargo.lock").exists());
}
#[test]
fn complete_gpu_bundle_keeps_state_on_the_host() {
    let p = parse(include_str!("../examples/inventory.lang")).unwrap();
    assert!(verified_language::runtime::emit_gpu(
        &p,
        std::path::Path::new("build/gpu-state-rejected")
    )
    .is_ok());
}
