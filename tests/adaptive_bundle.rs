use std::{fs, process::Command};
use verified_language::syntax::parse;

#[test]
fn distribution_installs_planner_and_executes_saved_js_placement_without_wasm() {
    let source = include_str!("../examples/adaptive-pipeline.ink");
    let program = parse(source).unwrap();
    let dir = std::env::temp_dir().join(format!("ink-adaptive-bundle-{}", std::process::id()));
    verified_language::runtime::emit_gpu(&program, &dir).unwrap();
    let manifest: serde_json::Value = serde_json::from_slice(&fs::read(dir.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(manifest["runtime_abi"], "ink-packed-pipeline-v2");
    for field in ["runtime_host_sha256", "pipeline_planner_sha256"] {
        assert_eq!(manifest[field].as_str().unwrap().len(), 64);
    }
    for file in ["pipeline-contract.mjs", "pipeline-selection.mjs", "pipeline-profile.mjs", "pipeline-workers.mjs", "pipeline-worker.mjs"] {
        assert!(dir.join(file).exists(), "{file}");
    }
    let assets = fs::read_to_string(dir.join("native/src/assets.rs")).unwrap();
    assert!(assets.contains(manifest["pipeline_planner_sha256"].as_str().unwrap()));
    fs::write(dir.join("test.mjs"), r#"
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadInk} from './ink-gpu.mjs';
let wasm=0;
globalThis.fetch=async url=>{
 if(String(url).endsWith('manifest.json'))return {json:async()=>JSON.parse(await readFile(url,'utf8'))};
 wasm++;throw Error('unexpected Wasm fetch');
};
const base=new URL('./',import.meta.url),plan={inputs:{xs:Uint32Array.of(0,1,4294967295)},steps:[{id:'a',call:'inc',args:[{input:'xs'}]},{id:'b',call:'double',args:[{step:'a'}]}],outputs:['b']};
const initial=await loadInk(base,{gpu:false});const context=(await initial.describePipeline(plan)).find(c=>c.start===0&&c.end===2);await initial.close();
const profile={schema:1,target_key:'test',models:{[context.scope]:{boundary:'captured-segment',domains:Object.fromEntries(Object.entries(context.features).map(([k,n])=>[k,[n,n]])),backends:{cpu:{intercept_ns:10000,terms:{}},javascript:{intercept_ns:1,terms:{}}}}}};
const engine=await loadInk(base,{gpu:false,placementProfile:profile,targetKey:'test'});
assert.ok(Object.isFrozen(engine.manifest.functions[0].params));
const pending=engine.pipeline(plan);plan.inputs.xs.fill(99);const r=await pending;
assert.equal(r.backend,'javascript');assert.deepEqual(r.values,{b:[2,4,0]});assert.equal(wasm,0);await engine.close();
assert.deepEqual(r.values,{b:[2,4,0]});
await assert.rejects(loadInk(base,{placementProfile:profile,targetKey:'wrong'}),/target/);
"#).unwrap();
    let output = Command::new("node").arg(dir.join("test.mjs")).output().unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    fs::remove_dir_all(dir).unwrap();
}
