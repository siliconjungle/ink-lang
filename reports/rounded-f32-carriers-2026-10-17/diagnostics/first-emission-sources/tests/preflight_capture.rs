use ink_core::{core::CheckedModule, planning, protocol, syntax};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn preflight_uses_captured_arguments_once_and_preserves_raw_float_bits() {
    let source = r#"module capture;
record Row { scalar:f32, values:List<f32>, }
state Rows:Table<u32,Row> = Table.empty();
state Scalars:Table<u32,f32> = Table.empty();
change put(key:u32,row:Row,fail:Bool)->Result<Unit,String> writes(Rows){Rows.put(key,row);if fail{return Err("rejected");}return Ok(());}
change single(value:f32)->Unit writes(Scalars){Scalars.put(0,value);return ();}
query row(key:u32)->Option<Row> reads(Rows){return Rows.get(key);}
"#;
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let choices: protocol::Plan = serde_json::from_value(json!({
        "schema":1,"semantics":protocol::SEMANTICS,"input_core_sha256":module.identity().unwrap(),
        "actions":[{"action":"put","execution":"preflight"},{"action":"single","execution":"preflight"}]
    })).unwrap();
    let plan = planning::check(&module, &planning::Package {
        schema:1, semantics:planning::SEMANTICS.into(), input_core_sha256:module.identity().unwrap(),
        steps:vec![planning::Step::Protocol(choices)],
    }).unwrap();
    let directory = std::env::temp_dir().join(format!("ink-preflight-capture-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    fs::write(directory.join("baseline.mjs"), ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
    fs::write(directory.join("fast.mjs"), ink_lowering_js::lower_planned(&plan).unwrap().javascript).unwrap();
    fs::write(directory.join("run.mjs"), r#"
import assert from 'node:assert/strict';
import * as baseline from './baseline.mjs';import * as optimized from './fast.mjs';
for(const mode of ['invoke','prepared','bound']){
 const ordinary=baseline.createState(),fast=optimized.createState();
 const call=(state,name,args)=>mode==='prepared'?state.invokePrepared(state.prepare(name,args)):mode==='bound'?state.bind(name)(...args):state.invoke(name,args);
 for(const bits of [0,0x80000000,0x7fc12345,0x7f800000,0xff800000,1,0x3f800000]){
  const scalar={F32Bits:bits},row={scalar,values:[scalar,scalar]},before=structuredClone(row);
  for(const [name,args]of [['single',[scalar]],['put',[0,row,false]],['put',[0,row,true]]]){
   assert.deepEqual(call(fast,name,args),call(ordinary,name,args),mode+' complete reply');
   assert.deepEqual(await fast.checkpoint(),await ordinary.checkpoint(),mode+' exact float checkpoint');
  }
  assert.deepEqual(row,before,'caller input remains owned by caller');
  const a=fast.prepare('put',[1,row,false]),b=ordinary.prepare('put',[1,row,false]);
  row.scalar={F32Bits:0x40000000};row.values.push({F32Bits:0x40000000});
  for(let repeat=0;repeat<2;repeat++){
   assert.deepEqual(fast.invokePrepared(a),ordinary.invokePrepared(b));
   assert.deepEqual(await fast.checkpoint(),await ordinary.checkpoint(),'prepared values remain stable across reuse');
  }
  const reply=fast.invoke('row',[1]).result.Some;reply.values.length=0;
  assert.deepEqual(await fast.checkpoint(),await ordinary.checkpoint(),'replies detach from stored and prepared values');
 }
 const a=fast.prepare('put',[7,{scalar:{F32Bits:0x80000000},values:[]},false]);
 const b=ordinary.prepare('put',[7,{scalar:{F32Bits:0x80000000},values:[]},false]);
 assert.throws(()=>fast.transaction(s=>{s.invokePrepared(a);throw Error('rollback');}),/rollback/);
 assert.throws(()=>ordinary.transaction(s=>{s.invokePrepared(b);throw Error('rollback');}),/rollback/);
 assert.deepEqual(await fast.checkpoint(),await ordinary.checkpoint(),'host transaction fallback preserves captured arguments');
}
"#).unwrap();
    let output = Command::new("node").arg(directory.join("run.mjs")).output().unwrap();
    fs::remove_dir_all(directory).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
