use std::fs;
use verified_language::{check, gpu, syntax::parse};
#[test]
fn capability_rejection_preserves_compiled_cpu_and_staged_lowering() {
    let p = parse(include_str!("../examples/gpu.ink")).unwrap();
    check::check(&p).unwrap();
    let dir = std::path::Path::new("build/gpu-emission-test");
    gpu::emit(&p, dir).unwrap();
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
    assert_eq!(
        function("double_filter")["gpu"]["stages"]
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert!(function("ordered")["gpu"].is_null());
    assert!(function("wide")["gpu"].is_null());
    assert!(function("lazy")["gpu"].is_null());
    assert!(function("intermediate_wide")["gpu"].is_null());
    assert!(function("count_constants")["gpu"].is_null());
    assert!(!function("constant")["gpu"].is_null());
    assert!(!function("heavy")["gpu"].is_null());
    let c = fs::read_to_string(dir.join("cpu.c")).unwrap();
    assert!(c.contains("uint32_t"));
    assert!(c.contains("lang_fn_wide"));
    assert!(dir.join("native/Cargo.lock").exists());
}
#[test]
fn state_is_rejected_by_the_pure_gpu_backend() {
    let p = parse(include_str!("../examples/inventory.lang")).unwrap();
    assert!(gpu::emit(&p, std::path::Path::new("build/gpu-state-rejected")).is_err());
}
