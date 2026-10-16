include!("fixtures/collection_memory.rs");
use serde_json::{json, Value};
use std::{fs, process::Command};
fn wire(v: &eval::Value) -> Value {
    match v {
        eval::Value::U64(n) => json!(n.to_string()),
        eval::Value::F32(n) => json!({"F32Bits":n}),
        eval::Value::List(xs) | eval::Value::Vector(xs) => xs.iter().map(wire).collect(),
        eval::Value::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), wire(v))).collect(),
        _ => v.json(),
    }
}
fn expected(v: &eval::Value) -> Value {
    match v {
        eval::Value::F32(n) => json!(n),
        eval::Value::List(xs) | eval::Value::Vector(xs) => xs.iter().map(expected).collect(),
        eval::Value::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), expected(v))).collect(),
        _ => wire(v),
    }
}
#[test]
fn literal_collection_stages_preserve_full_outputs_lifetimes_and_eager_stages() {
    let p = fixture();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&m).unwrap();
    let cases = rows(&p);
    let cases:Vec<_>=cases.iter().map(|(n,a,v)|json!({"name":n,"args":a.iter().map(wire).collect::<Vec<_>>(),"expected":expected(v)})).collect();
    let dir = directory("js");
    // The allocation probe must also observe fresh filter arrays spelled as [].
    // Instrument only the test artifact; array literals bypass the Array proxy.
    fs::write(
        dir.join("output.mjs"),
        emitted.javascript.replace("=[];", "=new Array(0);"),
    )
    .unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from'node:assert/strict';import fs from'node:fs';import{functions,functionsInto,metadata}from'./output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
function convert(v,t){return t.kind==='u64'?BigInt(v):t.kind==='list'?v.map(x=>convert(x,t.element)):v;}
function result(v,t){return t.kind==='u64'?v.toString():t.kind==='f32'?bits(v):t.kind==='list'?Array.from(v,x=>result(x,t.element)):v;}
const rows=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)));let comparisons=0;
for(const row of rows){const f=metadata.functions.find(f=>f.name===row.name);const args=row.args.map((v,i)=>convert(v,f.params[i].type));const before=structuredClone(args);const regular=functions[row.name](...args);assert.deepEqual(result(regular,f.result),row.expected,row.name);comparisons++;
const out=new Array(row.expected.length+5).fill('tail');for(let trial=0;trial<2;trial++){const n=functionsInto[row.name](...args,out);assert.equal(n,row.expected.length,row.name);assert.deepEqual(result(out.slice(0,n),f.result),row.expected,row.name);assert.deepEqual(out.slice(n),['tail','tail','tail','tail','tail']);assert.deepEqual(result(regular,f.result),row.expected,'retained ordinary output');assert.deepEqual(args,before,'borrowed inputs immutable');comparisons++;}out.fill(null);assert.deepEqual(result(regular,f.result),row.expected);}
const NativeArray=globalThis.Array;let allocs=0;globalThis.Array=new Proxy(NativeArray,{construct(t,args){allocs++;return Reflect.construct(t,args);}});const xs=[1,2,3],ys=[5,7],out=new Uint32Array(32);
for(const [name,count]of[['compact_u32',2],['compact_chain_u32',3],['chain_u32',2],['scan_u32',3],['branch_u32',2],['shadow_u32',2],['borrowed_u32',1],['capture_u32',2],['shared_u32',3],['observed_u32',2],['alias_u32',1]]){allocs=0;functions[name](xs,ys,1,3);assert.equal(allocs,count,name);assert.deepEqual(xs,[1,2,3]);}
for(const [name,count]of[['compact_u32',1],['compact_chain_u32',2],['chain_u32',1],['scan_u32',2],['branch_u32',1],['shadow_u32',1],['borrowed_u32',0],['capture_u32',1],['shared_u32',2],['observed_u32',1],['alias_u32',0]]){allocs=0;functionsInto[name](xs,ys,1,3,out);assert.equal(allocs,count,'Into '+name);assert.deepEqual(xs,[1,2,3]);}globalThis.Array=NativeArray;
console.log(`${rows.length} typed frames / ${comparisons} complete ordinary+Into comparisons; explicit destination allocation counts, helper capture, shared lifetimes, logical extent and tails passed`);
"#).unwrap();
    let out = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    println!("{}", String::from_utf8_lossy(&out.stdout));
    fs::remove_dir_all(dir).unwrap();
}
