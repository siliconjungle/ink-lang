include!("fixtures/destination.rs");
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
fn destination_outputs_match_interpreter_and_preserve_stage_allocations_without_mutating_inputs() {
    let p = fixture();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&m).unwrap();
    let rows = rows(&p);
    let jsonrows:Vec<_>=rows.iter().map(|(n,args,result)|json!({"name":n,"args":args.iter().map(wire).collect::<Vec<_>>(),"expected":expected(result)})).collect();
    let mut source = emitted.javascript;
    let huge = p.functions.iter().position(|f| f.name == "huge").unwrap();
    let marker = format!("function __fn{huge}(");
    let start = source.find(&marker).unwrap();
    let open = start + source[start..].find('{').unwrap();
    source.insert_str(open + 1, "__hugeCalls++;__sequence=__sequence*10+1;");
    for (name, digit) in [("probe_idx", 2), ("fallback", 3)] {
        let i = p.functions.iter().position(|f| f.name == name).unwrap();
        let marker = format!("function __fn{i}(");
        let start = source.find(&marker).unwrap();
        let open = start + source[start..].find('{').unwrap();
        source.insert_str(open + 1, &format!("__sequence=__sequence*10+{digit};"));
    }
    source = source.replace("=[];", "=new Array(0);");
    source=format!("let __hugeCalls=0,__sequence=0;export const counters={{reset(){{__hugeCalls=0;__sequence=0;}},get huge(){{return __hugeCalls;}},get sequence(){{return __sequence;}}}};\n{source}");
    let dir = directory("js");
    fs::write(dir.join("output.mjs"), source).unwrap();
    fs::write(
        dir.join("cases.json"),
        serde_json::to_vec(&jsonrows).unwrap(),
    )
    .unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {functions,functionsInto,callInto,metadata,counters} from './output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
function convert(v,t){switch(t.kind){case'u64':return BigInt(v);case'list':case'vector':return v.map(v=>convert(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,convert(v[f.name],f.type)]));default:return v;}}
function result(v,t){switch(t.kind){case'u64':return v.toString();case'f32':return bits(v);case'list':case'vector':return Array.from(v,v=>result(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,result(v[f.name],f.type)]));default:return v;}}
const rows=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)));let comparisons=0;
for(const row of rows){const f=metadata.functions.find(f=>f.name===row.name);const args=row.args.map((v,i)=>convert(v,f.params[i].type));const before=structuredClone(args);const ordinary=functions[row.name](...args);assert.deepEqual(result(ordinary,f.result),row.expected,row.name);comparisons++;
 if(f.result.kind==='list'){
  const et=f.result.element.kind;const sentinel=et==='u64'?77n:77;const length=row.expected.length;const out=et==='u32'?new Uint32Array(length+4):et==='i32'?new Int32Array(length+4):et==='u64'?new BigUint64Array(length+4):new Array(length+4);out.fill(sentinel);
  for(const invoke of [()=>functionsInto[row.name](...args,out),()=>callInto(row.name,args,out)]){
   const n=invoke();assert.equal(n,length,row.name);assert.deepEqual(result(Array.from(out).slice(0,n),f.result),row.expected,row.name);comparisons++;for(let i=n;i<out.length;i++)assert.equal(out[i],sentinel);assert.deepEqual(result(ordinary,f.result),row.expected,'ordinary result retained');
  }
  const retained=result(ordinary,f.result);out.fill(sentinel);assert.deepEqual(result(ordinary,f.result),retained,'explicit output reuse cannot rewrite ordinary outputs');
 }
 assert.deepEqual(args,before,'input mutation');}
assert.equal(Object.keys(functionsInto).length,metadata.functions.filter(f=>f.result.kind==='list').length);assert.equal(metadata.destination_abi.count_unit,'elements');
const NativeArray=globalThis.Array;let allocs=0,reads=[];globalThis.Array=new Proxy(NativeArray,{construct(t,args){allocs++;return Reflect.construct(t,args);}});
function tracked(v,name){const a=v.slice();v.forEach((x,i)=>Object.defineProperty(a,i,{get(){reads.push(name+i);return x;}}));return a;}
const xs=tracked([1,2],'x'),ys=tracked([4,5,6],'y'),out=new Uint32Array(32);
reads=[];allocs=0;assert.equal(functionsInto.map_u32(xs,ys,3,7,out),2);assert.deepEqual(reads,['x0','x1']);assert.equal(allocs,0);
reads=[];allocs=0;assert.equal(functionsInto.chain_u32(xs,ys,3,7,out),2);assert.equal(allocs,2);
reads=[];allocs=0;assert.equal(functionsInto.local_u32(xs,ys,3,7,out),2);assert.equal(allocs,0);
reads=[];allocs=0;counters.reset();assert.equal(functionsInto.lazy(xs,ys,0,7,out),2);assert.deepEqual(reads,['x0','x1']);assert.equal(allocs,0);assert.equal(counters.huge,0);
for(const name of ['receiver_map','receiver_filter','receiver_indexed','receiver_scan','receiver_sum','receiver_count','receiver_fold']){counters.reset();functions[name](xs,ys,0,7);assert.equal(counters.huge,1,name);}
counters.reset();reads=[];functions.receiver_zip(xs,ys,0,7);assert.equal(counters.huge,2);assert.deepEqual(reads,['x0','x1','y0','y1','y2']);
counters.reset();assert.equal(functions.receiver_lookup(xs,ys,9,0),1025);assert.equal(counters.huge,1);assert.equal(counters.sequence,12);
counters.reset();assert.equal(functions.receiver_lookup(xs,ys,9,99),9);assert.equal(counters.huge,1);assert.equal(counters.sequence,123);
globalThis.Array=NativeArray;console.log(`${rows.length} typed interpreter frames / ${comparisons} normal and destination comparisons; receiver-once/order/lazy branches/stage allocations/reuse/nonmutation passed`);
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
#[test]
fn nested_list_destinations_and_list_lookup_fallback_preserve_f32_bits() {
    let p=parse("module nested;fn outer(xs:List<List<f32>>)->List<List<f32>>{return xs.map(fn(x)=>x);}fn lookup(xs:List<List<f32>>,ys:List<f32>,index:u32)->List<f32>{return xs.at_or(index,ys.map(fn(x)=>x));}").unwrap();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    let emission = ink_lowering_js::lower(&m).unwrap();
    let inner = eval::Value::List(
        [0x80000000, 0x7fc12345, 0xffc54321, 0x7f800000, 1]
            .into_iter()
            .map(eval::Value::F32)
            .collect(),
    );
    let lists = eval::Value::List(vec![inner.clone(), eval::Value::List(vec![])]);
    let mut cases = Vec::new();
    for (name, args) in [
        ("outer", vec![lists.clone()]),
        ("outer", vec![eval::Value::List(vec![])]),
        (
            "lookup",
            vec![lists.clone(), inner.clone(), eval::Value::U32(0)],
        ),
        (
            "lookup",
            vec![lists.clone(), inner.clone(), eval::Value::U32(1)],
        ),
        (
            "lookup",
            vec![lists.clone(), inner.clone(), eval::Value::U32(7)],
        ),
    ] {
        let value = interpreted(&p, name, args.clone()).unwrap();
        cases.push(json!({"name":name,"args":args.iter().map(wire).collect::<Vec<_>>(),"expected":expected(&value)}));
    }
    let dir = directory("nested-js");
    fs::write(dir.join("output.mjs"), emission.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from'node:assert/strict';import fs from'node:fs';import{functions,functionsInto,metadata}from'./output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
function result(v,t){return t.kind==='f32'?bits(v):t.kind==='list'?Array.from(v,x=>result(x,t.element)):v;}
for(const row of JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)))){const f=metadata.functions.find(f=>f.name===row.name);const before=structuredClone(row.args);const regular=functions[row.name](...row.args);const out=new Array(row.expected.length+3).fill('tail');const n=functionsInto[row.name](...row.args,out);assert.equal(n,row.expected.length);assert.deepEqual(result(out.slice(0,n),f.result),row.expected);assert.deepEqual(result(regular,f.result),row.expected);assert.deepEqual(row.args,before);assert.deepEqual(out.slice(n),['tail','tail','tail']);out.fill(null);assert.deepEqual(result(regular,f.result),row.expected);}
console.log('5 nested-list/lookup interpreter frames; 10 default/Into comparisons preserve NaN payloads, signed zero and independent result lifetimes');"#).unwrap();
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
