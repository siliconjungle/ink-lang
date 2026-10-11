use std::{fs, process::Command};
use verified_language::syntax::parse;
#[test]
fn packed_c_owned_buffers_preserve_input_and_disjoint_views() {
    let p = parse(r#"module Packed;
fn partition(xs:List<u32>,at:u32)->List<u32>{
 let b=buffer(xs);
 return b.split_at(at,fn(a)=>fn(b)=>a.map_parallel(1,fn(i)=>fn(v)=>v+i).append(b.map_parallel(1,fn(i)=>fn(v)=>v*3+i))).freeze();
}
fn grow(limit:u32)->List<u32>{
 let b:Buffer<u32> =Buffer.empty();
 return repeat_until(limit,b,fn(b)=>b.len()>=3,fn(i)=>fn(b)=>b.push(i)).freeze();
}"#).unwrap();
    let mut c = ink_lowering_c::compute::emit_c(&p).unwrap();
    c.push_str(r#"
#include <assert.h>
int main(void){
 uint32_t input[]={1,2,3,4};
 ink_l_uint32 result=lang_fn_partition((ink_l_uint32){input,4},2);
 assert(result.len==4&&result.data[0]==1&&result.data[1]==3&&result.data[2]==9&&result.data[3]==13);
 assert(input[0]==1&&input[1]==2&&input[2]==3&&input[3]==4);ink_compute_reset();
 result=lang_fn_partition((ink_l_uint32){input,4},UINT32_MAX);
 assert(result.len==4&&result.data[0]==1&&result.data[1]==3&&result.data[2]==5&&result.data[3]==7);ink_compute_reset();
 result=lang_fn_partition((ink_l_uint32){input,4},0);
 assert(result.len==4&&result.data[0]==3&&result.data[1]==7&&result.data[2]==11&&result.data[3]==15);ink_compute_reset();
 result=lang_fn_partition((ink_l_uint32){NULL,0},0);assert(result.len==0);ink_compute_reset();
 result=lang_fn_grow(8);assert(result.len==3&&result.data[0]==0&&result.data[1]==1&&result.data[2]==2);ink_compute_reset();
 result=lang_fn_grow(0);assert(result.len==0);ink_compute_reset();return 0;
}
"#);
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/temporary-c-test");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("test.c"), c).unwrap();
    let out = Command::new("clang")
        .args([
            "-O2",
            "-std=c11",
            "-fsanitize=address,undefined",
            "-fno-omit-frame-pointer",
        ])
        .arg(dir.join("test.c"))
        .arg("-o")
        .arg(dir.join("test"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new(dir.join("test")).output().unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
