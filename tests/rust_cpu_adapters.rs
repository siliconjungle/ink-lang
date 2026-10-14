use std::{fs,path::Path,process::Command};
use ink_core::{core::CheckedModule,syntax::parse};
fn run(command:&mut Command){let r=command.output().unwrap();assert!(r.status.success(),"{}\n{}",String::from_utf8_lossy(&r.stdout),String::from_utf8_lossy(&r.stderr));}
fn project(name:&str,source:&str,checks:&str,packed:bool)->std::path::PathBuf{
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/remove-c").join(name);
 fs::create_dir_all(root.join("src")).unwrap();
 let mut code=ink_lowering_rust::packed::lower(&module,packed).unwrap();code.push_str(checks);
 fs::write(root.join("src/lib.rs"),code).unwrap();
 fs::write(root.join("Cargo.toml"),"[package]\nname=\"adapter-check\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n[workspace]\n").unwrap();
 run(Command::new("cargo").args(["test","--offline","--quiet","--lib","--manifest-path"]).arg(root.join("Cargo.toml")));
 root
}
#[test]
fn rust_packed_fallback_preserves_bits_records_lifetimes_and_destination_capacity(){
 let root=project("packed-adapter",r#"module Packed;
 record R{x:u64,y:f32,v:Vec2<i32>,}
 fn floats(xs:List<f32>)->List<f32>{return xs;}
 fn wide(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>x+1);}
 fn records(xs:List<R>)->List<R>{return xs;}
 fn compact(xs:List<u32>)->List<u32>{return xs.filter(fn(x)=>x==0);}
 "#,r#"
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
 "#,true);
 if std::env::var_os("INK_TEST_WASM").is_some()||std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some(){
  run(Command::new("cargo").args(["build","--offline","--quiet","--lib","--target","wasm32-unknown-unknown","--manifest-path"]).arg(root.join("Cargo.toml")));
  fs::write(root.join("check.mjs"),r#"import fs from'node:fs';import assert from'node:assert/strict';const{instance}=await WebAssembly.instantiate(fs.readFileSync(new URL('target/wasm32-unknown-unknown/debug/adapter_check.wasm',import.meta.url)),{});const c=instance.exports;for(let i=0;i<100;i++){c.ink_compute_reset();const p=c.ink_alloc(5,4),d=c.ink_alloc(1,4),n=c.ink_alloc(1,4),o=c.ink_alloc(1,4),k=c.ink_alloc(1,4);const bits=[0x80000000,0x7fc12345,0x7f812345,0xff812345,0x3f800001];new Uint32Array(c.memory.buffer,p,5).set(bits);new Uint32Array(c.memory.buffer,d,1)[0]=p;new Uint32Array(c.memory.buffer,n,1)[0]=5;c.ink_compute_call(0,d,n,o,k);const ptr=new Uint32Array(c.memory.buffer,o,1)[0],count=new Uint32Array(c.memory.buffer,k,1)[0];assert.equal(count,5);assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,ptr,count)),bits);c.ink_compute_reset();}assert.equal(c.ink_compute_mark(),0);"#).unwrap();
  run(Command::new("node").arg(root.join("check.mjs")));
 }
}
#[test]
fn rust_scalar_gpu_fallback_handles_empty_and_full_width_inputs(){
 project("scalar-adapter","module Scalar;fn total(xs:List<u32>)->u32{return xs.fold(0,fn(a)=>fn(x)=>a+x);}fn wide(x:u64)->u64{return x+1;}",r#"
 #[test]fn scalar_oracle(){unsafe{
 let xs=[u32::MAX,2];let lists=[xs.as_ptr().cast()];let lengths=[2];let scalars=[0];assert_eq!(ink_cpu_call(0,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),1);
 let lengths=[0];let lists=[std::ptr::null()];assert_eq!(ink_cpu_call(0,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),0);
 let scalars=[u64::MAX];assert_eq!(ink_cpu_call(1,lists.as_ptr(),lengths.as_ptr(),scalars.as_ptr()),0);
 }}
 "#,false);
}
