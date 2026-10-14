//! Run the package storage/ABI oracles against the distribution-patched core.

mod javascript {
    include!("../lowerings/js/tests/collection_memory.rs");
}

#[test]
fn compaction_destination_needs_only_final_output_capacity() {
    use std::{fs, process::Command};
    let p=ink_core::syntax::parse("module Capacity;fn compact(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x==0).map(fn(x)=>x*3);}").unwrap();
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/storage40-capacity");
    fs::create_dir_all(&dir).unwrap();
    let m = ink_core::core::CheckedModule::from_source(p).unwrap();
    fs::write(
        dir.join("program.mjs"),
        ink_lowering_js::lower(&m).unwrap().javascript,
    )
    .unwrap();
    fs::write(dir.join("test.mjs"),"import assert from 'node:assert/strict';import{functionsInto}from'./program.mjs';const xs=[0,1,2,4294967295],out=[99];assert.equal(functionsInto.compact(xs,out),1);assert.deepEqual(out,[0]);const words=new Uint32Array([77,99,88]),view=words.subarray(1,2);assert.equal(functionsInto.compact(xs,view),1);assert.deepEqual(Array.from(words),[77,0,88]);assert.deepEqual(xs,[0,1,2,4294967295]);console.log('exact final-capacity compaction passed');").unwrap();
    let result = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
