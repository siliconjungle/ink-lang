use ink_core::{core::CheckedModule, physical, planning, protocol, syntax};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn checked_readers_compose_with_preflight_state_and_preserve_boundaries() {
    let source = "module packets; record Packet { text:String, values:List<u32>, } fn copy(value:Packet)->Packet{return value;} state Rows:Table<u32,u32> = Table.empty(); change put(key:u32,value:u32,fail:Bool)->Result<Unit,String> writes(Rows){Rows.put(key,value);if fail{return Err(\"rejected\");}return Ok(());}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let identity = module.identity().unwrap();
    let physical: physical::Plan = serde_json::from_value(json!({
        "schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":identity,
        "boundary_readers":[{"function":"copy","format":"compact"},{"function":"copy","format":"portable"}]
    })).unwrap();
    let protocol: protocol::Plan = serde_json::from_value(json!({
        "schema":1,"semantics":protocol::SEMANTICS,"input_core_sha256":identity,
        "actions":[{"action":"put","execution":"preflight"}]
    })).unwrap();
    let directory = std::env::temp_dir().join(format!("ink-combined-capabilities-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    fs::write(directory.join("baseline.mjs"), ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
    for (index, steps) in [
        vec![planning::Step::Physical(physical.clone()), planning::Step::Protocol(protocol.clone())],
        vec![planning::Step::Protocol(protocol), planning::Step::Physical(physical)],
    ].into_iter().enumerate() {
        let package = planning::Package { schema:1, semantics:planning::SEMANTICS.into(), input_core_sha256:identity.clone(), steps };
        let checked = planning::check(&module, &package).unwrap();
        fs::write(directory.join(format!("selected-{index}.mjs")), ink_lowering_js::lower_planned(&checked).unwrap().javascript).unwrap();
    }
    fs::write(directory.join("run.mjs"), r#"
import assert from 'node:assert/strict';
const baseline=await import('./baseline.mjs');
const outcome=fn=>{try{return {value:fn()};}catch(error){return {error:error.message};}};
for(const index of [0,1]){
 const selected=await import('./selected-'+index+'.mjs');
 for(const value of [{text:'',values:[]},{text:'λ雪😀',values:[0,1,4294967295]}]){
  for(const compact of [false,true]){
   const argumentsCodec=baseline.valueCodecs.copy.arguments;
   const bytes=(compact?argumentsCodec.compact():argumentsCodec).encode({value}),before=bytes.slice();
   const invoke=module=>(compact?module.callCompact:module.callBinary)('copy',bytes);
   assert.deepEqual(invoke(selected),invoke(baseline));assert.deepEqual(bytes,before);
   for(const limit of [0,1,bytes.length-1]){
    const truncated=bytes.slice(0,limit);
    assert.deepEqual(outcome(()=>(compact?selected.callCompact:selected.callBinary)('copy',truncated)),outcome(()=>(compact?baseline.callCompact:baseline.callBinary)('copy',truncated)));
   }
  }
  const entry=selected.compiledValues.copy,handle=entry.params[0].capture(value);
  const reply=entry.result.materialize(selected.callCompiled('copy',[handle]));
  reply.values.push(7);assert.deepEqual(entry.params[0].materialize(handle),value);
 }
 const ordinary=baseline.createState(),fast=selected.createState();
 for(const args of [[0,7,false],[0,9,true],[1,4294967295,false],[0,11,false]]){
  assert.deepEqual(fast.invoke('put',args),ordinary.invoke('put',args));
  assert.deepEqual(await fast.checkpoint(),await ordinary.checkpoint());
 }
}
console.log('Both checked capability orders preserve bytes, diagnostics, ownership, rollback and snapshots');
"#).unwrap();
    let output = Command::new("node").arg(directory.join("run.mjs")).output().unwrap();
    fs::remove_dir_all(directory).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
