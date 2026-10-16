use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn lexical_records_preserve_bits_shadowing_whole_values_and_worker_captures() {
    let source = r#"module lexical_records;
record R{a:f32,b:f32,n:u32,flag:Bool,}
record Outer{inner:R,extra:f32,}
fn local(x:f32,y:f32,n:u32)->R {
    let r=R{a:x,b:y,n:n,flag:n==0};let alias=r;
    let r=R{a:alias.b,b:alias.a,n:alias.n+1,flag:alias.flag};
    return choose(n==0,alias,r);
}
fn nested(x:f32,y:f32,n:u32)->Outer {
    let r=R{a:x,b:y,n:n,flag:true};
    let outer=Outer{inner:r,extra:r.a};return outer;
}
fn looped(x:f32,y:f32,n:u32)->R {
    let initial=R{a:x,b:y,n:n,flag:true};
    return repeat(3,initial,fn(i)=>fn(r)=>R{a:r.b,b:r.a,n:r.n+i,flag:!r.flag});
}
fn captured(xs:List<f32>,x:f32,n:u32)->List<f32> {
    let r=R{a:x,b:0.25,n:n,flag:n==0};let alias=r;
    return parallel_map(xs,1,fn(i)=>fn(v)=>choose(alias.flag,v+alias.a,v*alias.b));
}
fn reordered(x:f32,y:f32,n:u32)->R {
    let r=R{flag:false,n:n,b:y,a:x};return r;
}
fn choose_field(x:f32,y:f32,n:u32)->f32 {
    let r=R{a:x,b:y,n:n,flag:true};return choose(n==0,r.a,r.b);
}
"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut cases = vec![];
    let mut add = |name: &str, args: Value| {
        let p = module.program();
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
            .collect();
        let expected = eval::call(p, name, values, &mut 1_000_000).unwrap().json();
        cases.push(json!({"name":name,"args":args,"expected":expected}));
    };
    for bits in [
        0_u32, 0x80000000, 0x3e800000, 0x7f800000, 0xff800000, 0x7fc01234, 0x7fa04321,
    ] {
        let x = json!({"F32Bits":bits});
        for n in [0_u32, 1, u32::MAX] {
            for name in ["local", "nested", "looped", "reordered", "choose_field"] {
                add(name, json!([x, {"F32Bits":0x80000000_u32}, n]));
            }
            add("captured", json!([[x, 0.5, -0.25], x, n]));
        }
    }
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let dir = std::env::temp_dir().join(format!("ink-lexical-records-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(dir.join("check.mjs"), r#"import assert from 'node:assert/strict';import fs from 'node:fs';import{call,functions}from './program.mjs';
for(const {name,args,expected} of JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)))){
 const before=structuredClone(args);assert.deepEqual(call(name,args),expected,name);assert.deepEqual(functions[name](...args),expected,name);assert.deepEqual(args,before,'inputs unchanged');}
console.log('126 lexical record cases; checked and trusted APIs; worker captures; exact exceptional values');
"#).unwrap();
    let output = Command::new("node")
        .env("INK_THREADS", "2")
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
