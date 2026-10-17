use ink_core::{core::CheckedModule,eval,syntax::parse};
use serde_json::{json,Value};
use std::{fs,process::Command};

#[test]
fn numeric_buffers_preserve_raw_copies_partitions_bulk_ops_callbacks_and_workers(){
 let source=r#"module BufferNumbers;
fn bulk(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).fill_range(s,n,z).copy_within(s,1,n).swap(0,s).freeze();}
fn partition(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).split_at(s,fn(a)=>fn(b)=>a.fill_range(1,n,z).append(b.copy_within(0,1,n))).freeze();}
fn detach(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).split_at(s,fn(a)=>fn(b)=>a.truncate(n).push(z).append(b.push(-z))).freeze();}
fn copies(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).map_indexed(fn(i)=>fn(x)=>choose(i==s,z,x)).filter(fn(x)=>f32_bits(x)!=0).freeze();}
fn arithmetic(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).map(fn(x)=>(x*z)+x).scan().freeze();}
fn reads(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{let b=buffer(xs);let a=b.at_or(s,z);let c=b.at_or(n,-z);return [a,c,a+c,a*z];}
fn readonly(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{let b=buffer(xs);let x=b.borrow_range(s,n,fn(v)=>v.at_or(0,z));return b.push(x).freeze();}
fn new_buffer(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{let b:Buffer<f32>=Buffer.empty();return b.push(z).append(buffer_fill(n,z)).pop().freeze();}
fn parallel(xs:List<f32>,z:f32,s:u32,n:u32)->List<f32>{return buffer(xs).split_at(s,fn(a)=>fn(b)=>a.map_parallel(1,fn(i)=>fn(x)=>x*z).append(b.map_parallel(1,fn(i)=>fn(x)=>x+z))).freeze();}
"#;
 let dir=std::env::temp_dir().join(format!("ink-number-buffers-{}",std::process::id()));fs::create_dir_all(&dir).unwrap();
 let bits=[0u32,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x3f800001,0xbf800002,0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7f800001,0x7fc12345,0xffc12345,0x4b800000];
 for mode in ["native","bits"]{
  let source=if mode=="bits"{format!("{source}\nstate Rows:Table<u32,List<f32>>=Table.empty();")}else{source.into()};
  let checked=CheckedModule::from_source(parse(&source).unwrap()).unwrap();let mut cases=vec![];
  let mut add=|name:&str,args:Value|{
   let f=checked.program().functions.iter().find(|f|f.name==name).unwrap();
   let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,checked.program()).unwrap()).collect();
   let expected=eval::call_checked(&checked,name,values,&mut 1_000_000).unwrap().json();cases.push(json!({"name":name,"args":args,"expected":expected}));
  };
  for(i,b)in bits.iter().enumerate(){let x=json!({"F32Bits":b});let y=json!({"F32Bits":bits[(i+3)%bits.len()]});
   for(s,n)in[(0u32,0u32),(1,3),(3,1),(4294967295,4)]{for xs in [json!([]),json!([x,y]),json!([y,x,0.5,-0.0,3.0])]{
    for name in ["bulk","partition","detach","copies","arithmetic","reads","readonly","new_buffer"]{add(name,json!([xs,x,s,n]));}
   }}
   if i<4{add("parallel",json!([[x,y,0.5,-0.0,3.0,1.5],x,3,0]));}
  }
  let image=ink_lowering_js::lower(&checked).unwrap();fs::write(dir.join("program.mjs"),image.javascript).unwrap();fs::write(dir.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
  fs::write(dir.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
for(const c of cases){const before=structuredClone(c.args);assert.deepEqual(m.call(c.name,c.args),c.expected,c.name);assert.deepEqual(c.args,before);
 const entry=m.compiledValues[c.name],args=c.args.map((v,i)=>entry.params[i].capture(v));
 assert.deepEqual(entry.result.encode(m.callCompiled(c.name,args)),m.valueCodecs[c.name].result.encode(c.expected));
 if(c.name!=='parallel'){const token=m.prepareCompiled(c.name,[[0,args[0]],[1,args[1]]]);for(let i=0;i<2;i++){
  const actual=m.callPreparedCompiled(token,args.slice(2));assert.deepEqual(entry.result.encode(actual),m.valueCodecs[c.name].result.encode(c.expected));entry.result.materialize(actual).splice(0);
 }}
}
assert.ok(m.parallelStatistics().workers>=8);assert.ok(m.parallelStatistics().lastWorkerIds.length>=2);
console.log(JSON.stringify({status:'passed',cases:cases.length,workers:m.parallelStatistics()}));
"#).unwrap();
  let output=Command::new("node").arg(dir.join("test.mjs")).output().unwrap();
  fs::write(dir.join(format!("{mode}.log")),[output.stdout.as_slice(),output.stderr.as_slice()].concat()).unwrap();
  assert!(output.status.success(),"{mode}: {}",String::from_utf8_lossy(&output.stderr));
  println!("{mode}: {}",String::from_utf8_lossy(&output.stdout));
 }
 println!("retained at {}",dir.display());
}
