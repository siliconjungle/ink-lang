use ink_core::{core::CheckedModule, syntax::parse};
use std::{fs, process::Command};

#[test]
fn prepared_calls_keep_inputs_owned_and_replies_detached_across_reuse() {
    let source = r#"module owned_calls;
record Row { values:List<u32>, }
enum Error { Failed, }
state Rows:Table<String,Row> = Table.empty();
event changed:Row;
change put(key:String,row:Row,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed) {
 Rows.put(key,row);emit changed(row);if fail{return Err(Error.Failed);}return Ok(());
}
change multiple(key:String,row:Row,fail:Bool)->Result<Unit,Error> writes(Rows) emits(changed) {
 Rows.put(key,row);emit changed(row);emit changed(Row{values:list(8,9)});
 Rows.put(key,Row{values:list(4)});emit changed(Row{values:list(4)});
 if fail{return Err(Error.Failed);}return Ok(());
}
query get(key:String)->Option<Row> reads(Rows) { return Rows.get(key); }
spec query guarded(allowed:Bool)->u32 requires allowed;ensures result==0;
implementation zero for guarded { return 0; }
"#;
    let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let code = ink_lowering_js::lower(&checked).unwrap().javascript;
    let root = std::env::temp_dir().join(format!("ink-prepared-calls-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"), code).unwrap();
    fs::write(root.join("test.mjs"), r#"
import assert from 'node:assert/strict';import {createState}from './program.mjs';
const state=createState(),other=createState(),host={values:[1,2]},args=['k',host,false];
const put=state.prepare('put',args),get=state.prepare('get',['k']);
assert(Object.isFrozen(put));assert.deepEqual(Object.keys(put),[]);
host.values[0]=99;args[0]='changed';args[2]=true;
assert.throws(()=>other.invokePrepared(put),/invalid prepared/);
assert.throws(()=>state.invokePrepared({}),/invalid prepared/);
assert.throws(()=>state.prepare('put',['bad',{values:[-1]},false]),/invalid u32/);
const guarded=state.prepare('guarded',[false]);assert.throws(()=>state.invokePrepared(guarded),/precondition/);
for(let i=0;i<3;i++){
 const reply=state.invokePrepared(put);assert.equal(reply.version,BigInt(i+1));assert.equal(reply.committed,true);
 assert.deepEqual(reply.events[0].value,{values:[1,2]});reply.events[0].value.values[0]=999;
 const row=state.invokePrepared(get).result;assert.deepEqual(row,{Some:{values:[1,2]}});row.Some.values.push(3);
 const events=state.outbox;assert(events.every(e=>e.value.values[0]===1));events[0].value.values[0]=999;
}
const fail=state.prepare('put',['k',{values:[7]},true]);
for(let i=0;i<2;i++){const reply=state.invokePrepared(fail);assert.equal(reply.committed,false);assert.equal(reply.version,3n);assert.deepEqual(reply.events,[]);assert.deepEqual(state.invokePrepared(get).result,{Some:{values:[1,2]}});}
const checkpoint=await state.checkpoint();await state.restore(checkpoint);
assert.deepEqual(state.invokePrepared(get).result,{Some:{values:[1,2]}});
state.beginTransaction();state.invokePrepared(state.prepare('put',['k',{values:[5]},false]));state.rollbackTransaction();
assert.deepEqual(state.invokePrepared(get).result,{Some:{values:[1,2]}});assert.equal(state.version,3n);
state.invokePrepared(put);assert.equal(state.version,4n);
state.acknowledgeThrough(2n,0n);assert.deepEqual(state.outbox.map(e=>e.commit),[3n,4n]);
const retained=state.outbox;state.beginTransaction();state.acknowledgeThrough(18446744073709551615n,18446744073709551615n);assert.deepEqual(state.outbox,[]);state.rollbackTransaction();assert.deepEqual(state.outbox,retained);
assert.throws(()=>state.acknowledgeThrough(-1n,0n),/invalid u64/);assert.deepEqual(state.outbox,retained);
state.acknowledgeThrough(4n,0n);assert.deepEqual(state.outbox,[]);
state.invokePrepared(put);assert.equal(state.outbox[0].commit,5n);
assert.deepEqual(state.invoke_json('get',['changed']).result,{None:null});
const many=createState(),multi=(fail)=>many.prepare('multiple',['k',{values:[1,2]},fail]);
const failed=multi(true),successful=multi(false),before=await many.checkpoint();
for(let i=0;i<3;i++){assert.equal(many.invokePrepared(failed).committed,false);assert.deepEqual(await many.checkpoint(),before);}
const saved=many.invokePrepared(successful);
assert.deepEqual(saved.events.map(e=>[e.position,e.value.values]),[[0n,[1,2]],[1n,[8,9]],[2n,[4]]]);
saved.events[0].value.values[0]=999;assert.deepEqual(many.outbox[0].value.values,[1,2]);
const committed=await many.checkpoint();many.beginTransaction();
assert.equal(many.invokePrepared(failed).committed,false);assert.deepEqual(await many.checkpoint(),committed);
many.invokePrepared(successful);many.rollbackTransaction();assert.deepEqual(await many.checkpoint(),committed);
const next=many.invokePrepared(successful);assert.equal(next.version,2n);assert.equal(saved.version,1n);assert.deepEqual(saved.events[1].value.values,[8,9]);
many.acknowledgeThrough(1n,1n);assert.deepEqual(many.outbox.map(e=>[e.commit,e.position]),[[1n,2n],[2n,0n],[2n,1n],[2n,2n]]);

"#).unwrap();
    let output = Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    fs::remove_dir_all(root).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
