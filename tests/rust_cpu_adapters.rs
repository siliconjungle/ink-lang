use ink_core::{core::CheckedModule, syntax::parse};
use std::{fs, path::Path, process::Command};
fn run(command: &mut Command) {
    let r = command.output().unwrap();
    assert!(
        r.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&r.stdout),
        String::from_utf8_lossy(&r.stderr)
    );
}
fn project(name: &str, source: &str, checks: &str, packed: bool) -> std::path::PathBuf {
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("build/remove-c")
        .join(name);
    fs::create_dir_all(root.join("src")).unwrap();
    let mut code = ink_lowering_rust::packed::lower(&module, packed).unwrap();
    code.push_str(checks);
    fs::write(root.join("src/lib.rs"), code).unwrap();
    fs::write(root.join("Cargo.toml"),"[package]\nname=\"adapter-check\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n[workspace]\n").unwrap();
    run(Command::new("cargo")
        .args(["test", "--offline", "--quiet", "--lib", "--manifest-path"])
        .arg(root.join("Cargo.toml")));
    root
}
#[test]
fn rust_packed_fallback_preserves_bits_records_lifetimes_and_destination_capacity() {
    let root = project(
        "packed-adapter",
        r#"module Packed;
 record R{x:u64,y:f32,v:Vec2<i32>,}
 fn floats(xs:List<f32>)->List<f32>{return xs;}
 fn wide(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>x+1);}
 fn records(xs:List<R>)->List<R>{return xs;}
 fn compact(xs:List<u32>)->List<u32>{return xs.filter(fn(x)=>x==0);}
 "#,
        r#"
 #[test]fn packed_oracle(){unsafe{
 let samples=[0x80000000u32,0x7fc12345,0x7f812345,0xff812345,0x3f800001];
 let data=[samples.as_ptr().cast()];let lengths=[samples.len()];
 let mark=ink_compute_mark();let mut out=std::ptr::null_mut();let mut count=0;
 ink_compute_call(0,data.as_ptr(),lengths.as_ptr(),&mut out,&mut count);
 assert_eq!(std::slice::from_raw_parts(out.cast::<u32>(),count),samples);
 let saved=out;let _=ink_alloc(1024,8);assert_eq!(std::slice::from_raw_parts(saved.cast::<u32>(),count),samples);
 ink_compute_rewind(mark);assert_eq!(ink_compute_mark(),mark);
 let wide=[u64::MAX,0,1u64<<63];let data=[wide.as_ptr().cast()];let lengths=[3];
 ink_compute_call(1,data.as_ptr(),lengths.as_ptr(),&mut out,&mut count);assert_eq!(count,6);
 assert_eq!(std::slice::from_raw_parts(out.cast::<u32>(),count),[0,0,1,0,1,0x80000000]);ink_compute_reset();
 let record=[0xffffffffu32,0xffffffff,0x7f812345,0x80000000,0x7fffffff];let data=[record.as_ptr().cast()];let lengths=[1];
 ink_compute_call(2,data.as_ptr(),lengths.as_ptr(),&mut out,&mut count);assert_eq!(count,5);assert_eq!(std::slice::from_raw_parts(out.cast::<u32>(),count),record);ink_compute_reset();
 let input=[1u32,0,2,3];let data=[input.as_ptr().cast()];let lengths=[4];let mut destination=[77u32,99,88];
 assert_eq!(ink_compute_into(3,data.as_ptr(),lengths.as_ptr(),destination.as_mut_ptr().add(1).cast()),1);assert_eq!(destination,[77,0,88]);assert_eq!(input,[1,0,2,3]);
 let data=[std::ptr::null()];let lengths=[0];assert_eq!(ink_compute_into(3,data.as_ptr(),lengths.as_ptr(),destination.as_mut_ptr().cast()),0);
 for _ in 0..100{let _=ink_alloc(10,4);ink_compute_reset();assert_eq!(ink_compute_mark(),0);}
 }}
 "#,
        true,
    );
    if std::env::var_os("INK_TEST_WASM").is_some()
        || std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some()
    {
        run(Command::new("cargo")
            .args([
                "build",
                "--offline",
                "--quiet",
                "--lib",
                "--target",
                "wasm32-unknown-unknown",
                "--manifest-path",
            ])
            .arg(root.join("Cargo.toml")));
        fs::write(root.join("check.mjs"),r#"import fs from'node:fs';import assert from'node:assert/strict';const{instance}=await WebAssembly.instantiate(fs.readFileSync(new URL('target/wasm32-unknown-unknown/debug/adapter_check.wasm',import.meta.url)),{});const c=instance.exports;for(let i=0;i<100;i++){c.ink_compute_reset();const p=c.ink_alloc(5,4),d=c.ink_alloc(1,4),n=c.ink_alloc(1,4),o=c.ink_alloc(1,4),k=c.ink_alloc(1,4);const bits=[0x80000000,0x7fc12345,0x7f812345,0xff812345,0x3f800001];new Uint32Array(c.memory.buffer,p,5).set(bits);new Uint32Array(c.memory.buffer,d,1)[0]=p;new Uint32Array(c.memory.buffer,n,1)[0]=5;c.ink_compute_call(0,d,n,o,k);const ptr=new Uint32Array(c.memory.buffer,o,1)[0],count=new Uint32Array(c.memory.buffer,k,1)[0];assert.equal(count,5);assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,ptr,count)),bits);c.ink_compute_reset();}assert.equal(c.ink_compute_mark(),0);"#).unwrap();
        run(Command::new("node").arg(root.join("check.mjs")));
    }
}
#[test]
fn rust_scalar_gpu_fallback_handles_empty_and_full_width_inputs() {
    let root=project("scalar-adapter","module Scalar;fn total(xs:List<u32>)->u32{return sum(xs);}fn wide(x:u64)->u64{return x+1;}",r#"
 #[test]fn scalar_oracle(){unsafe{
 let xs=[u32::MAX,2];let lists=[xs.as_ptr().cast()];let lengths=[2];let scalars=[0];assert_eq!(ink_cpu_call(0,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),1);
 let lengths=[0];let lists=[std::ptr::null()];assert_eq!(ink_cpu_call(0,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),0);
 let scalars=[u64::MAX];assert_eq!(ink_cpu_call(1,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),0);
 }}
 "#,false);
    if std::env::var_os("INK_TEST_WASM").is_some(){
      run(Command::new("cargo").args(["build","--offline","--quiet","--lib","--target","wasm32-unknown-unknown","--manifest-path"]).arg(root.join("Cargo.toml")));
      fs::write(root.join("scalar.mjs"),"import fs from'node:fs';import assert from'node:assert/strict';const{instance}=await WebAssembly.instantiate(fs.readFileSync(new URL('target/wasm32-unknown-unknown/debug/adapter_check.wasm',import.meta.url)),{});const c=instance.exports;for(let i=0;i<100;i++){c.ink_compute_reset();const p=c.ink_alloc(2,4);new Uint32Array(c.memory.buffer,p,2).set([4294967295,2]);assert.equal(c.lang_fn_total(p,2),1);assert.equal(c.lang_fn_total(0,0),0);assert.equal(c.lang_fn_wide(-1n),0n);assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,p,2)),[4294967295,2]);c.ink_compute_reset();assert.equal(c.ink_compute_mark(),0);}").unwrap();run(Command::new("node").arg(root.join("scalar.mjs")));
    }

}

#[test]
fn packed_wasm_parallel_fallback_preserves_partitions_captures_and_nested_calls() {
    let source = r#"module PackedParallel;
fn partition(x:u32,at:u32)->u32 {
 let b:Buffer<u32>=buffer_fill(8,0);
 let b=repeat(8,b,fn(i,b)=>b.set(i,x+i));
 let b=b.split_at(at,fn(left,right)=>left.map_parallel(1,fn(i,v)=>v*3+i)
  .append(right.map_parallel(1,fn(i,v)=>v*5+i)));
 return b.at_or(0,11)+b.at_or(7,13)+b.len();
}
fn nested(xs:List<u32>,at:u32,bias:u32)->List<u32>{
 return parallel_map(xs,1,fn(i,x)=>partition(x,at)+bias+i);
}
"#;
    let root=project("packed-parallel",source,r#"
#[test] fn native_parallel(){
 let xs=vec![0,1,u32::MAX,17];
 for at in [0,1,4,8,u32::MAX]{
  let expected=xs.iter().enumerate().map(|(i,x)|{
   let split=at.min(8);let first=x.wrapping_mul(if split==0{5}else{3});
   let last=x.wrapping_add(7).wrapping_mul(if split==8{3}else{5}).wrapping_add(if split==8{7}else{7-split});
   first.wrapping_add(last).wrapping_add(8).wrapping_add(19).wrapping_add(i as u32)
  }).collect::<Vec<_>>();
  assert_eq!(State::new().function_l_nested(xs.clone().into(),at,19).into_iter().collect::<Vec<_>>(),expected);
 }
}
"#,true);
    if std::env::var_os("INK_TEST_WASM").is_some() || std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some(){
        run(Command::new("cargo").args(["build","--offline","--quiet","--lib","--target","wasm32-unknown-unknown","--manifest-path"]).arg(root.join("Cargo.toml")));
        fs::write(root.join("parallel.mjs"),r#"import fs from'node:fs';import assert from'node:assert/strict';
const bytes=fs.readFileSync(new URL('target/wasm32-unknown-unknown/debug/adapter_check.wasm',import.meta.url));
const module=await WebAssembly.compile(bytes);assert.deepEqual(WebAssembly.Module.imports(module),[]);
const c=(await WebAssembly.instantiate(module,{})).exports;
for(const xs of [[],[0],[0,1,0xffffffff,17]])for(const at of [0,1,4,8,0xffffffff]){
 c.ink_compute_reset();
 const words=(values)=>{const p=c.ink_alloc(values.length,4);new Uint32Array(c.memory.buffer,p,values.length).set(values);return p;};
 const p=words(xs),a=words([at]),b=words([19]),data=words([p,a,b]),lens=words([xs.length,1,1]),out=words([0]),count=words([0]);
 c.ink_compute_call(1,data,lens,out,count);
 const ptr=new Uint32Array(c.memory.buffer,out,1)[0],n=new Uint32Array(c.memory.buffer,count,1)[0];
 const split=Math.min(at,8),expected=xs.map((x,i)=>{
  const first=Math.imul(x,split===0?5:3);
  const last=Math.imul((x+7)>>>0,split===8?3:5)+(split===8?7:7-split);
  return(first+last+8+19+i)>>>0;
 });
 assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,ptr,n)),expected);
 assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,p,xs.length)),xs);
 c.ink_compute_reset();assert.equal(c.ink_compute_mark(),0);
}
"#).unwrap();
        run(Command::new("node").arg(root.join("parallel.mjs")));
    }
}
