use ink_core::{core::CheckedModule, eval, stateful::Runtime, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn bit_state_arithmetic_preserves_rounding_bits_laziness_and_capture_protocols() {
    let mut source = include_str!("fixtures/float-islands.ink").to_owned();
    source.push_str("fn bounded(x:f32,y:f32)->f32{");
    for i in 0..24 {
        source.push_str(&format!("let a{i}={}*y+x;", if i==0 {"x".into()} else {format!("a{}",i-1)}));
    }
    source.push_str("return a23;}");
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    assert_eq!(emitted.manifest["f32_storage"], "exact-u32-bits");
    let mut bits = vec![0,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x7f7fffff,
        0xff7fffff,0x7f800000,0xff800000,0x7f800001,0x7fc12345,0xffc12345,
        0x3f800001,0xbf800002,0x4b800000];
    let mut seed = 73u32;
    for _ in 0..256 { seed=seed.wrapping_mul(1664525).wrapping_add(1013904223);bits.push(seed); }
    let mut cases = vec![];
    let mut add = |name:&str, args:Value| {
        let f = module.program().functions.iter().find(|f|f.name==name).unwrap();
        let values = args.as_array().unwrap().iter().zip(&f.params)
            .map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
        cases.push(json!({"name":name,"args":args,
            "expected":eval::call(module.program(),name,values,&mut 1_000_000).unwrap().json()}));
    };
    for (i,b) in bits.iter().enumerate() {
        let a=json!({"F32Bits":b});let c=json!({"F32Bits":bits[(i+1)%bits.len()]});
        let d=json!({"F32Bits":bits[(i+5)%bits.len()]});
        for name in ["tree","chain","observe"] { add(name,json!([a,c,d])); }
        for name in ["stop","bounded"] { add(name,json!([a,c])); }
        add("order",json!([a,c]));
        for pick in [false,true] { add("branch",json!([a,c,pick])); }
        for name in ["sums","shadow"] { add(name,json!([a,c,[a,c,d]])); }
        add("identity",json!([a]));
        add("dot",json!([[a,c,d],[d,a,c]]));
        add("rows",json!([[{"x":a,"y":c,"z":d},{"x":d,"y":a,"z":c}]]));
    }
    // Explicit non-FMA/cancellation and host double rounding controls.
    add("chain",json!([{"F32Bits":0x3f800001u32},{"F32Bits":0x3f800001u32},{"F32Bits":0xbf800002u32}]));
    for x in [1.0000000596046448,16777217.0,-1e-44] {add("chain",json!([x,1.0000001,0.5]));}
    for b in [0x80000000u32,0x7f800001,0xffc12345] {
        add("parallel",json!([{"F32Bits":b},1.5,[0.0,{"F32Bits":b},2.0]]));
    }
    let mut runtime = Runtime::new(module.program().clone()).unwrap();
    let mut history = vec![json!({"restore":runtime.checkpoint_portable().unwrap()})];
    for b in &bits[..16] {
        for (name,args) in [("tune",json!([{"F32Bits":b}])),
            ("read",json!([{"F32Bits":0x3f800001u32},0.5])),
            ("frame",json!([1.5,{"F32Bits":0x7f800001u32},false])),
            ("frame",json!([1.5,{"F32Bits":0x7f800001u32},true])),
            ("fit",json!([{"F32Bits":b},1.5,0.5,false])),
            ("read",json!([0.5,1.5])),
            ("fit",json!([{"F32Bits":b},1.5,0.5,true])),
            ("read",json!([0.5,1.5])),
            ("direct",json!([{"F32Bits":b},1.5,0.5])),
            ("fit_inline",json!([{"F32Bits":b},1.5,0.5,false])),
            ("read",json!([0.5,1.5])),
            ("fit_inline",json!([{"F32Bits":b},1.5,0.5,true])),
            ("read",json!([0.5,1.5]))] {
            let before=runtime.checkpoint_portable().unwrap();
            let outcome=runtime.invoke_json(name,&args).unwrap().json();
            let snapshot=runtime.checkpoint_portable().unwrap();
            if name=="frame"&&args[2]==true || matches!(name,"fit"|"fit_inline")&&args[3]==true {assert_eq!(before,snapshot);}
            history.push(json!({"call":name,"args":args,"expected":outcome,"snapshot":snapshot}));
        }
        let snapshot=runtime.checkpoint_portable().unwrap();
        history.push(json!({"restore":snapshot}));
        runtime=Runtime::restore_portable_checked(&module,&snapshot).unwrap();
    }
    let folder=std::env::temp_dir().join(format!("ink-float-islands-{}",std::process::id()));
    fs::create_dir_all(&folder).unwrap();
    let probe=module.program().functions.iter().position(|f|f.name=="probe").unwrap();
    let header=emitted.javascript.lines().find(|line|line.starts_with(&format!("function __fn{probe}("))).unwrap();
    let instrumented=emitted.javascript.replacen(header,&format!("{header}globalThis.__floatProbe?.(...arguments);"),1);
    fs::write(folder.join("program.mjs"),&emitted.javascript).unwrap();
    fs::write(folder.join("instrumented.mjs"),instrumented).unwrap();
    fs::write(folder.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(folder.join("history.json"),serde_json::to_vec(&history).unwrap()).unwrap();
    fs::write(folder.join("test.mjs"),r#"import assert from 'node:assert/strict';
import fs from 'node:fs';import * as p from './program.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
for(const c of read('cases.json')){
 assert.deepEqual(p.call(c.name,c.args),c.expected,JSON.stringify(c));
 const codec=p.valueCodecs[c.name],params=p.metadata.functions.find(f=>f.name===c.name).params;
 const value=Object.fromEntries(params.map((param,i)=>[param.name,c.args[i]]));
 assert.deepEqual(p.callBinary(c.name,codec.arguments.encode(value)),codec.result.encode(c.expected));
 assert.deepEqual(p.callCompact(c.name,codec.arguments.compact().encode(value)),codec.result.compact().encode(c.expected));
}
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const state=p.createState();let observations=0;
assert.ok(p.parallelStatistics().workers>=6);assert.ok(p.parallelStatistics().lastWorkerIds.length>=2);
for(const step of read('history.json')){
 if(step.restore){await state.restore(step.restore);continue;}
 assert.deepEqual(normalize(state.invoke(step.call,step.args)),normalize(step.expected));
 assert.deepEqual(Array.from(await state.checkpoint()),step.snapshot);observations++;
}
// This module's existing bit-carrier public boundary captures composite
// arguments eagerly. Keep that ingress order as well as the lazy source branch.
const trace=[];let failures=0;
const r=Object.fromEntries(['x','y','z'].map((name,i)=>[name,{get F32Bits(){trace.push(name+':bits');return [1069547520,1073741824,1056964608][i];}}]));
const host={};for(const name of ['x','y','z'])Object.defineProperty(host,name,{get(){trace.push(name);if(name==='y'&&failures>0){failures--;throw Error('retry');}return r[name];}});
assert.equal(p.functions.fields(host,false),0);assert.deepEqual(trace,['x','x:bits','y','y:bits','z','z:bits']);trace.length=0;failures=1;
assert.throws(()=>p.functions.fields(host,true),/retry/);
assert.deepEqual(trace,['x','x:bits','y']);trace.length=0;
assert.equal(p.functions.fields(host,true),3.5);
assert.deepEqual(trace,['x','x:bits','y','y:bits','z','z:bits']);
// Test-only instrumentation observes evaluation positions and thrown failures;
// this patched image is never a selected implementation or a proof premise.
const q=await import('./instrumented.mjs');let calls=[];let fail=true;
globalThis.__floatProbe=(value)=>{calls.push(value);if(fail)throw Error('source position');};
assert.equal(q.functions.lazy(1.5,false),0);assert.deepEqual(calls,[]);
assert.throws(()=>q.functions.lazy(1.5,true),/source position/);assert.equal(calls.length,1);
fail=false;assert.equal(q.functions.lazy(1.5,true),3.75);assert.equal(calls.length,2);
calls=[];q.functions.order(1.5,2.0);assert.deepEqual(calls,[1069547520,1073741824,1069547520]);
delete globalThis.__floatProbe;
console.log(JSON.stringify({status:'passed',values:read('cases.json').length,stateOutcomes:observations,restores:17,captureOrder:true,lazyBranches:true,retry:true}));
"#).unwrap();
    if let Some(output)=std::env::var_os("INK_FLOAT_ARTIFACTS") {
        let output=std::path::PathBuf::from(output);fs::create_dir_all(&output).unwrap();
        for name in ["program.mjs","instrumented.mjs","cases.json","history.json","test.mjs"] {
            fs::copy(folder.join(name),output.join(name)).unwrap();
        }
        fs::write(output.join("source.ink"),&source).unwrap();
        fs::write(output.join("core.json"),module.bytes().unwrap()).unwrap();
    }
    let result=Command::new("node").env("INK_THREADS","2").arg(folder.join("test.mjs")).output().unwrap();
    fs::remove_dir_all(folder).unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    eprintln!("{}",String::from_utf8_lossy(&result.stdout));
}
