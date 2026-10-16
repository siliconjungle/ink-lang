use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn parallel_scopes_slices_and_recursive_helpers_preserve_collection_contracts() {
    let source = r#"module composition;
fn captured(xs:List<u32>,__parallel_input:u32,__parallel_input_:u32)->List<u32>{return parallel_map(xs,0,fn(i)=>fn(x)=>(x+__parallel_input)+(__parallel_input_+i));}
fn sliced(xs:List<u32>,k:u32)->List<u32>{return xs.drop(k).take(2).map(fn(x)=>x+7);}
fn partitioned(xs:List<u32>,at:u32)->List<u32>{let b=buffer(xs);let b=b.split_at(at,fn(left)=>fn(right)=>left.map_parallel(2,fn(i)=>fn(x)=>x+10+i).append(right.map_parallel(2,fn(i)=>fn(x)=>x+20+i)));return b.freeze();}
fn sum_tail(xs:List<u32>)->u32{return choose(length(xs)==0,0,xs.at_or(0,0)+sum_tail(xs.drop(1)));}
"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let p = module.program();
    let mut cases = Vec::new();
    for xs in [json!([]), json!([1]), json!([1, 2, 4294967295u32, 7])] {
        let mut rows = vec![("captured", json!([xs, 4, 9])), ("sum_tail", json!([xs]))];
        for at in [0, 1, 99] {
            rows.push(("sliced", json!([xs, at])));
            rows.push(("partitioned", json!([xs, at])));
        }
        for (name, args) in rows {
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let values = args
                .as_array()
                .unwrap()
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
                .collect();
            let expected = eval::call(p, name, values, &mut 100000).unwrap().json();
            cases.push(json!({"name":name,"args":args,"expected":expected}));
        }
    }
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let dir = std::env::temp_dir().join(format!("ink-parallel-memory-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(dir.join("check.mjs"), r#"import assert from 'node:assert/strict';import fs from 'node:fs';import{functions,functionsInto}from './program.mjs';
for(const {name,args,expected}of JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)))){
const before=structuredClone(args);const regular=functions[name](...args);assert.deepEqual(regular,expected,name);assert.deepEqual(args,before,'input immutable');
if(Array.isArray(expected)){const out=new Array(expected.length+5).fill('tail');const count=functionsInto[name](...args,out);assert.equal(count,expected.length,name);assert.deepEqual(out.slice(0,count),expected,name);assert.deepEqual(out.slice(count),Array(5).fill('tail'));out.fill(null);assert.deepEqual(regular,expected,'retained ordinary output');assert.deepEqual(args,before,'Into input immutable');}}
"#).unwrap();
    let output = Command::new("node")
        .arg(dir.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
