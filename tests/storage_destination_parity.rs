//! Run the package storage/ABI oracles against the distribution-patched core.
mod c { include!("../lowerings/c/tests/collection_memory.rs"); }
mod javascript { include!("../lowerings/js/tests/collection_memory.rs"); }

#[test]
fn compaction_destination_needs_only_final_output_capacity() {
    use std::{fs, process::Command};
    let p=ink_core::syntax::parse("module Capacity;fn compact(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x==0).map(fn(x)=>x*3);}").unwrap();
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/storage40-capacity");
    fs::create_dir_all(&dir).unwrap();
    let mut c=ink_lowering_c::compute::emit_c(&p).unwrap();
    c.push_str("\n#include <assert.h>\nint main(void){uint32_t xs[]={0,1,2,UINT32_MAX},out[1]={99};size_t n=lang_fn_compact_into((ink_l_uint32){xs,4},out);assert(n==1&&out[0]==0);assert(xs[3]==UINT32_MAX);ink_compute_reset();return 0;}\n");
    fs::write(dir.join("test.c"),c).unwrap();
    let result=Command::new("clang").args(["-O2","-std=c11","-fsanitize=address,undefined"]).arg(dir.join("test.c")).arg("-o").arg(dir.join("test")).output().unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    assert!(Command::new(dir.join("test")).status().unwrap().success());
    let m=ink_core::core::CheckedModule::from_source(p).unwrap();
    fs::write(dir.join("program.mjs"),ink_lowering_js::lower(&m).unwrap().javascript).unwrap();
    fs::write(dir.join("test.mjs"),"import assert from 'node:assert/strict';import{functionsInto}from'./program.mjs';const xs=[0,1,2,4294967295],out=[99];assert.equal(functionsInto.compact(xs,out),1);assert.deepEqual(out,[0]);const words=new Uint32Array([77,99,88]),view=words.subarray(1,2);assert.equal(functionsInto.compact(xs,view),1);assert.deepEqual(Array.from(words),[77,0,88]);assert.deepEqual(xs,[0,1,2,4294967295]);console.log('exact final-capacity compaction passed');").unwrap();
    let result=Command::new("node").arg(dir.join("test.mjs")).output().unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
}
