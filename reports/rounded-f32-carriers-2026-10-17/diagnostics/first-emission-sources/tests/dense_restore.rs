use ink_core::{core::CheckedModule,planning,syntax};
use serde_json::json;
use std::{fs,process::Command};
#[test]
fn dense_spares_preserve_order_owned_rows_failed_restore_and_bound_calls(){
 let source="module reusable;state T:Table<u64,u64> = Table.empty();change put(k:u64,v:u64)->Unit writes(T){T.put(k,v);return ();}query keys()->List<u64> reads(T){return T.keys();}query rows()->List<u64> reads(T){return T.values();}";
 let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
 let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"steps":[{"kind":"physical","package":{"schema":1,"semantics":"ink-physical-plan-v1","input_core_sha256":module.identity().unwrap(),"dense_prefixes":[{"table":"T","capacity":32}]}}]})).unwrap();
 let plan=planning::check(&module,&packet).unwrap();
 let dir=std::env::temp_dir().join(format!("ink-dense-restore-{}",std::process::id()));fs::create_dir_all(&dir).unwrap();
 let code=ink_lowering_js::lower_planned(&plan).unwrap().javascript;
 fs::write(dir.join("run.mjs"),format!("{code}\n{}",r#"
import assert from 'node:assert/strict';
const state=createState(),put=state.bind('put',{resultOnly:true}),keys=state.bind('keys',{resultOnly:true}),rows=state.bind('rows',{resultOnly:true});
put(0n,7n);put(18446744073709551615n,9n);const first=await state.checkpoint();assert.deepEqual(keys(),[0n,18446744073709551615n]);const owned=rows();
const other=createState();other.bind('put',{resultOnly:true})(3n,11n);const second=await other.checkpoint();
for(let i=0;i<20;i++){await state.restore(second);assert.deepEqual(keys(),[3n]);assert.deepEqual(rows(),[11n]);assert.deepEqual(await state.checkpoint(),second);await state.restore(first);assert.deepEqual(keys(),[0n,18446744073709551615n]);assert.deepEqual(rows(),[7n,9n]);assert.deepEqual(await state.checkpoint(),first);}
assert.deepEqual(owned,[7n,9n]);owned[0]=999n;assert.deepEqual(rows(),[7n,9n]);await assert.rejects(state.restore(new Uint8Array([0])));assert.deepEqual(await state.checkpoint(),first);
put(2n,13n);assert.deepEqual(keys(),[0n,2n,18446744073709551615n]);state.beginTransaction();put(1n,17n);state.rollbackTransaction();assert.deepEqual(keys(),[0n,2n,18446744073709551615n]);
"#)).unwrap();
 let output=Command::new("node").arg(dir.join("run.mjs")).output().unwrap();fs::remove_dir_all(dir).unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
}
