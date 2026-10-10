use std::{fs, process::Command};
use verified_language::{core::CheckedModule, syntax::parse};
#[test]
fn cli_emits_importable_module_and_selection_plan_without_native_toolchain() {
    let dir = std::env::temp_dir().join(format!("ink-cli-js-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let source = dir.join("test.ink");
    let output = dir.join("test.mjs");
    fs::write(
        &source,
        "module Test;fn total(xs:List<u64>)->u64{return sum(xs.map(fn(x)=>x+1));}fn advance(x:u32,step:u32)->u32{return repeat(10,x,fn(i)=>fn(acc)=>acc+step);}",
    )
    .unwrap();
    let result = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args([
            "build",
            source.to_str().unwrap(),
            "--target",
            "javascript",
            "--optimise",
            "knowledge/store/snapshot.json",
            "-o",
            output.to_str().unwrap(),
            "--cc",
            "/no/native/compiler",
        ])
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let plan: serde_json::Value =
        serde_json::from_slice(&fs::read(dir.join("test.mjs.plan.json")).unwrap()).unwrap();
    assert_eq!(plan["backend"]["backend"], "javascript");
    assert!(!plan["applied_rule_ids"].as_array().unwrap().is_empty());
    assert_ne!(plan["input_core_sha256"], plan["selected_core_sha256"]);
    assert_eq!(plan["backend"]["core_sha256"], plan["selected_core_sha256"]);
    fs::write(dir.join("run.mjs"),"import assert from 'node:assert/strict';import {functions} from './test.mjs';assert.equal(functions.total(['18446744073709551615',1n]),2n);assert.equal(functions.advance(4294967295,1),9);").unwrap();
    let result = Command::new("node")
        .arg(dir.join("run.mjs"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
#[test]
fn checked_module_identity_is_not_changed_by_lowering_and_bundle_contains_js() {
    let p = parse("module Test;fn total(xs:List<u32>)->u32{return sum(xs);}").unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let identity = module.identity().unwrap();
    let emission = verified_language::javascript::lower(&module).unwrap();
    assert_eq!(module.identity().unwrap(), identity);
    assert_eq!(emission.manifest["core_sha256"], identity);
    let dir = std::env::temp_dir().join(format!("ink-bundle-js-{}", std::process::id()));
    verified_language::runtime::emit_gpu(&p, &dir).unwrap();
    assert!(dir.join("program.mjs").exists());
    assert!(dir.join("backend-selection.mjs").exists());
    let manifest: serde_json::Value =
        serde_json::from_slice(&fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(manifest["javascript"]["core_sha256"], identity);
    fs::remove_dir_all(dir).unwrap();
}
