use ink_core::{core::CheckedModule, syntax::parse};
use std::{fs, process::Command};

#[test]
fn cached_observations_restore_first_before_images_across_interleaved_reads_and_writes() {
    let source = r#"module keep_journal;
enum Error { Failed, }
state Rows:Table<u64,u32> = Table.empty();
keep cached:u32 = sum(Rows.values());
query total()->u32 reads(cached) { return cached; }
change put(key:u64,value:u32)->Unit writes(Rows) { Rows.put(key,value);return (); }
change staged(key:u64,a:u32,b:u32,fail:Bool)->Result<u32,Error> reads(Rows,cached) writes(Rows) {
 Rows.put(key,a);let observed=total();Rows.put(key,b);
 if fail { return Err(Error.Failed); }return Ok(observed);
}
"#;
    let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let code = ink_lowering_js::lower(&checked).unwrap().javascript;
    assert!(code.contains("__cachedKeep"));
    let dir = std::env::temp_dir().join(format!("ink-keep-journal-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), format!("{code}\nexport const diagnosticKeepCount=__stateMetadata.keeps.length;\n")).unwrap();
    fs::write(dir.join("run.mjs"), r#"
import assert from 'node:assert/strict';import{createState,diagnosticKeepCount}from'./program.mjs';assert(diagnosticKeepCount>0);
const state=createState(),total=()=>state.invoke('total',[]).result;
// No cache exists before the first write. A query between two writes must not
// become the cache restored after the entire action fails.
const empty=await state.checkpoint();assert.equal(state.invoke('staged',[1n,7,9,true]).committed,false);assert.equal(total(),0);assert.deepEqual(await state.checkpoint(),empty);
state.invoke('put',[1n,3]);assert.equal(total(),3);let version=state.version;
for(let i=0;i<40;i++){
 const before=await state.checkpoint(),reply=state.invoke('staged',[1n,100+i,200+i,true]);
 assert.equal(reply.committed,false);assert.equal(reply.version,version);assert.equal(total(),3);assert.deepEqual(await state.checkpoint(),before);
}
const committed=state.invoke('staged',[1n,10,11,false]);assert.deepEqual(committed.result,{Ok:10});assert.equal(total(),11);
const before=await state.checkpoint();state.beginTransaction();state.invoke('put',[1n,13]);assert.equal(total(),13);
assert.equal(state.invoke('staged',[1n,14,15,true]).committed,false);assert.equal(total(),13);state.rollbackTransaction();assert.equal(total(),11);assert.deepEqual(await state.checkpoint(),before);
state.beginTransaction();state.invoke('staged',[1n,20,21,false]);state.commitTransaction();assert.equal(total(),21);
await state.restore(before);assert.equal(total(),11);assert.equal(state.invoke('staged',[1n,30,31,true]).committed,false);assert.equal(total(),11);
"#).unwrap();
    let output = Command::new("node").arg(dir.join("run.mjs")).output().unwrap();
    fs::remove_dir_all(dir).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
