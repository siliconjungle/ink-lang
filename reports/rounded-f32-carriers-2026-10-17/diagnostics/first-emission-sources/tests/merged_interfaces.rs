use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
use std::{fs, process::Command};
#[test]
fn upstream_owned_state_and_tagged_values_compose_with_trusted_direct_functions() {
    let source = r#"module merged;
id Key;
fn key(x:Key)->Key{return x;}
record Packed{data:List<u32>,}
fn copied(xs:List<Packed>,fallback:Packed)->List<u32>{let b=buffer(xs);return b.at_or(0,fallback).data;}
fn edit(b:Buffer<u32>)->Buffer<u32>{let first=b.at_or(0,99);return b.set(0,first+7).swap(0,1).push(42).pop();}
fn run(xs:List<u32>)->List<u32>{let b=buffer(xs);let b=edit(b);return b.freeze();}
fn nested(xs:List<List<u32>>,fallback:List<u32>)->u64{let b=buffer(xs);return count(b.at_or(0,fallback));}
fn keys()->List<i32>{let m:Map<i32,u64> =Map.empty();let m=m.set(-2,7).set(5,100);return m.keys();}
fn values()->List<u64>{let m:Map<i32,u64> =Map.empty();let m=m.set(-2,7).set(5,100);return m.values();}
fn stop(limit:u32,goal:u32)->u32{return repeat_until(limit,0,fn(a)=>a>=goal,fn(i)=>fn(a)=>a+1);}
fn collect(limit:u32)->List<u32>{let b:Buffer<u32> =Buffer.empty();let b=repeat_until(limit,b,fn(b)=>b.len()>=3,fn(i)=>fn(b)=>b.push(i));return b.freeze();}
fn opt(x:Option<f32>)->Option<f32>{return x;}
fn exact(x:Int)->Int{return x;}
fn text(x:String)->String{return x;}
fn addone(x:u32)->u32{return x+1;}
fn wide_id(x:u64)->u64{return x;}
query answer(x:u32)->u32{return addone(x);}
query wide(x:u64)->u64{return wide_id(x);}
"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let p = module.program();
    let expected = eval::call(
        p,
        "run",
        vec![eval::Value::from_program_json(
            &json!([1, 2, 3]),
            &p.functions.iter().find(|f| f.name == "run").unwrap().params[0].1,
            p,
        )
        .unwrap()],
        &mut 10000,
    )
    .unwrap()
    .json();
    assert_eq!(expected, json!([2, 8, 3]));
    let e = ink_lowering_js::lower(&module).unwrap();
    assert!(!e.javascript.contains("function __in("));
    assert!(!e.javascript.contains("function __out("));
    // State invocation is a checked public boundary even when pure functions
    // remain trusted direct entries.
    assert!(e.javascript.contains("budget.cells"));
    let dir = std::env::temp_dir().join(format!("ink-merged-js-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"), e.javascript).unwrap();
    fs::write(dir.join("run.mjs"),r#"import assert from 'node:assert/strict';import {functions,call,callInto,createState} from './program.mjs';
const input=new Uint32Array([1,2,3]);assert.deepEqual(functions.run(input),[2,8,3]);assert.deepEqual(Array.from(input),[1,2,3]);
assert.equal(functions.nested([new Uint32Array([7,9])],new Uint32Array([1])),2n);assert.equal(functions.nested([],new Uint32Array([1])),1n);
assert.deepEqual(functions.keys(),[-2,5]);assert.deepEqual(functions.values(),[7n,100n]);
assert.equal(functions.stop(0,9),0);assert.equal(functions.stop(10,0),0);assert.equal(functions.stop(10,3),3);assert.equal(functions.stop(2,9),2);
assert.deepEqual(functions.collect(10),[0,1,2]);assert.deepEqual(functions.collect(0),[]);
assert.equal(Object.hasOwn(functions,'edit'),false);assert.throws(()=>call('edit',[]),{message:'temporary storage is internal to a pure invocation'});assert.throws(()=>callInto('edit',[],[]),{message:'temporary storage is internal to a pure invocation'});
const destination=new Array(8).fill('tail');assert.equal(callInto('run',[input],destination),3);assert.deepEqual(destination.slice(0,3),[2,8,3]);assert.equal(destination[3],'tail');
assert.deepEqual(functions.opt({Some:{F32Bits:2143363909}}),{Some:{F32Bits:2143363909}});assert.equal(Object.is(functions.opt({Some:-0}).Some,-0),true);assert.deepEqual(functions.opt({None:null}),{None:null});
assert.deepEqual(functions.exact({Int:'123456789012345678901234567890'}),{Int:'123456789012345678901234567890'});assert.equal(functions.text('😀hello'),'😀hello');assert.equal(functions.key('ABCDEF00000000000000000000000000'),'abcdef00000000000000000000000000');const sharedData=new Uint32Array([7,9]);const copied=functions.copied([{data:sharedData}],{data:[]});assert.equal(copied,sharedData);assert.deepEqual(Array.from(copied),[7,9]);
const state=createState();assert.equal(state.invoke('answer',[41]).result,42);assert.equal(state.invoke('wide',['18446744073709551615']).result,18446744073709551615n);assert.throws(()=>state.invoke('answer',[-1]),/invalid u32/);assert.throws(()=>state.invoke('wide',['18446744073709551616']),/invalid u64/);
"#).unwrap();
    let output = Command::new("node")
        .arg(dir.join("run.mjs"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
