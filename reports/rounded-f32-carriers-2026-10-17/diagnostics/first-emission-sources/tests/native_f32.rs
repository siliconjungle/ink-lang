use ink_core::{core::CheckedModule,eval,syntax::parse};
use serde_json::{json,Value};
use std::{fs,process::Command};

#[test]
fn native_float_tags_are_captured_once_and_borrowed_fields_stay_lazy() {
 let source=r#"module CapturedFloat;
record R {x:f32,}
fn bits(x:f32)->u32{return f32_bits(x);}
fn twice(x:f32)->u32{return f32_bits(x)+f32_bits(x);}
fn guarded(x:f32)->u32{return choose([x]==[f32_from_bits(2139095041)],2139095041,f32_bits(x));}
fn ignored(x:f32)->u32{return 7;}
fn fields(r:R,pick:Bool)->u32{return choose(pick,f32_bits(r.x)+f32_bits(r.x),7);}
fn identity(x:f32)->f32{return x;}
fn negative(x:f32)->f32{return -x;}
spec fn checked(x:f32)->u32 requires x==0.0; ensures true;
implementation checked_body for checked {return f32_bits(x);}
"#;
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let root=std::env::temp_dir().join(format!("ink-captured-float-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
 fs::write(root.join("test.mjs"),r#"import assert from 'node:assert/strict';import {functions as f} from './program.mjs';
function raw(bits){let reads=0;return {value:{get F32Bits(){return reads++?2147483648:bits;}},reads:()=>reads};}
for(const bits of [0,2147483648,1,2139095040,4286578688,2139095041,2143289345,4290777652]){
 let input=raw(bits);assert.equal(f.bits(input.value),bits);assert.equal(input.reads(),1);
 input=raw(bits);assert.equal(f.twice(input.value),(bits+bits)>>>0);assert.equal(input.reads(),1);
 input=raw(bits);assert.equal(f.guarded(input.value),bits);assert.equal(input.reads(),1);
}
let input=raw(2139095041);assert.equal(f.ignored(input.value),7);assert.equal(input.reads(),0);
const failure=Error('retry');let reads=0;const throwing={get F32Bits(){if(!reads++)throw failure;return 2139095041;}};
assert.throws(()=>f.bits(throwing),e=>e===failure);assert.equal(f.bits(throwing),2139095041);assert.equal(reads,2);
let fields=0,tags=0;const r={get x(){fields++;return {get F32Bits(){tags++;return fields===1?2139095041:2147483648;}};}};
assert.equal(f.fields(r,false),7);assert.equal(fields,0);assert.equal(tags,0);
assert.equal(f.fields(r,true),(2139095041+2147483648)>>>0);assert.equal(fields,2);assert.equal(tags,2);
input=raw(0);assert.equal(f.checked(input.value),0);assert.equal(input.reads(),1);
const host={F32Bits:2139095041};const result=f.identity(host);host.F32Bits=0;assert.deepEqual(result,{F32Bits:2139095041});
result.F32Bits=1;assert.deepEqual(f.negative({F32Bits:2139095041}),{F32Bits:4286578689});
console.log(JSON.stringify({status:'passed',exactTags:8,lazyFields:true,retry:true,contract:true,detached:true}));"#).unwrap();
 let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
 fs::remove_dir_all(root).unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
}
#[test]
fn native_float_lane_preserves_binary32_bits_and_public_observations() {
 let source=r#"module NativeFloat;
record R { x:f32,y:f32, }
fn identity(x:f32)->f32{return x;}
fn negative(x:f32)->f32{return -x;}
fn arithmetic(x:f32,y:f32)->f32{return (x+y)*x-y;}
fn equal(x:f32,y:f32)->Bool{return x==y;}
fn structural(x:List<f32>,y:List<f32>)->Bool{return x==y;}
fn rows(xs:List<R>)->List<f32>{return xs.map(fn(p)=>p.x*p.y+p.x);}
fn doubled(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x+x);}
fn total(xs:List<f32>)->f32{return sum(xs);}
fn parallel(xs:List<f32>)->List<f32>{return parallel_map(xs,1,fn(i)=>fn(x)=>-x);}
"#;
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let mut bits=vec![0,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7fc00000,0x7fc12345,0xffc12345,0x7f812345];
 let mut seed=12345u32;for _ in 0..256 {seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);bits.push(seed);}
 let mut cases=vec![];
 let mut add=|name:&str,args:Value| {
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
  cases.push(json!({"name":name,"args":args,"expected":eval::call(module.program(),name,values,&mut 1000000).unwrap().json()}));
 };
 for (i,b) in bits.iter().enumerate(){let a=json!({"F32Bits":b});let c=json!({"F32Bits":bits[(i+1)%bits.len()]});
  for name in ["identity","negative"] {add(name,json!([a]));}
  for name in ["arithmetic","equal"] {add(name,json!([a,c]));}
  add("structural",json!([[a],[c]]));add("structural",json!([[a],[a]]));
  add("rows",json!([[{"x":a,"y":c},{"x":c,"y":a}]]));
 }
 for n in [0,1,8,64] {let xs:Vec<_>=bits[..n].iter().map(|b|json!({"F32Bits":b})).collect();for name in ["doubled","total"]{add(name,json!([xs]));}}
 // Actual numeric doubles must round on ingress, not just after arithmetic.
 for a in [1.0000000596046448,16777217.0,1e-44,-1e-44] {add("arithmetic",json!([a,1.0000001]));}
 add("parallel",json!([[{"F32Bits":0x80000000u32},{"F32Bits":0x7f800000u32},{"F32Bits":0x7fc12345u32},1.5]]));
 let emitted=ink_lowering_js::lower(&module).unwrap();assert!(emitted.javascript.contains("const __nativeF32=true"));
 let root=std::env::temp_dir().join(format!("ink-native-float-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),emitted.javascript).unwrap();fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
 fs::write(root.join("test.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {call,callInto,callBinary,callCompact,valueCodecs,metadata} from './program.mjs';let n=0;for(const c of JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)))){const before=structuredClone(c.args);assert.deepStrictEqual(call(c.name,c.args),c.expected,JSON.stringify(c));assert.deepStrictEqual(c.args,before);const codec=valueCodecs[c.name],params=metadata.functions.find(f=>f.name===c.name).params,argumentsValue=Object.fromEntries(params.map((p,i)=>[p.name,c.args[i]]));assert.deepStrictEqual(callBinary(c.name,codec.arguments.encode(argumentsValue)),codec.result.encode(c.expected));assert.deepStrictEqual(callCompact(c.name,codec.arguments.compact().encode(argumentsValue)),codec.result.compact().encode(c.expected));if(c.name==='rows'||c.name==='doubled'){const dst=new Array(c.expected.length+2).fill('sentinel');assert.equal(callInto(c.name,c.args,dst),c.expected.length);assert.deepStrictEqual(dst.slice(0,c.expected.length),c.expected);assert.equal(dst[c.expected.length],'sentinel');}n++;}console.log(n);"#).unwrap();
 let result=Command::new("node").env("INK_THREADS","2").arg(root.join("test.mjs")).output().unwrap();fs::remove_dir_all(root).unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
}
