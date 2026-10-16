use ink_core::{core::CheckedModule, eval, syntax::{parse, Type}};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn integer_sort_and_ordered_loads_preserve_values_and_ownership() {
    let source = r#"module WordCollections;
fn rank(xs:List<u32>,k:u32,z:u32)->List<u32>{return xs.sort().map(fn(x)=>x*k+z);}
fn sort_u(xs:List<u32>)->List<u32>{return xs.sort();}
fn sort_i(xs:List<i32>)->List<i32>{return xs.sort();}
fn sort_w(xs:List<u64>)->List<u64>{return xs.sort();}
fn grow(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.sort().concat(ys);}
fn right(xs:List<u32>,k:u32,z:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>x+a*k);}
fn left(xs:List<u32>,k:u32,z:u32)->u32{return foldl(xs,z,fn(x)=>fn(a)=>x+a*k);}
fn signed(xs:List<i32>,k:i32,z:i32)->i32{return foldr(xs,z,fn(x)=>fn(a)=>x+a*k);}
fn stop(xs:List<u32>,k:u32,z:u32)->u32{return fold_until(xs,z,fn(x)=>fn(a)=>x==0,fn(x)=>fn(a)=>x+a*k);}
fn prefix(xs:List<u32>)->List<u32>{return xs.scan();}
fn total(xs:List<u32>)->u32{return sum(xs);}
fn indexes(xs:List<u32>)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>x+i);}
fn pairs(xs:List<i32>,ys:List<i32>)->List<i32>{return xs.zip(ys,fn(x)=>fn(y)=>x+y);}
"#;
    let p=parse(source).unwrap();
    let m=CheckedModule::from_source(p.clone()).unwrap();
    let emitted=ink_lowering_js::lower(&m).unwrap();
    let mut cases=vec![];
    let mut add=|name:&str,args:Value|{
        let f=p.functions.iter().find(|f|f.name==name).unwrap();
        let values=args.as_array().unwrap().iter().zip(&f.params)
            .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
        let expected=eval::call(&p,name,values,&mut 10_000_000).unwrap().json();
        // Preserve all 64 bits across JSON's Number boundary.
        let wide=matches!(&f.params[0].1,Type::List(t) if **t==Type::U64);
        let args=if wide {json!([args[0].as_array().unwrap().iter().map(|v|v.as_u64().unwrap().to_string()).collect::<Vec<_>>()])}else{args};
        let expected=if wide {json!(expected.as_array().unwrap().iter().map(|v|v.as_u64().unwrap().to_string()).collect::<Vec<_>>())}else{expected};
        cases.push(json!({"name":name,"args":args,"expected":expected,"wide":wide}));
    };
    let mut seed=23u32;
    for n in [0,1,2,3,17,255,256,257,1025] {
        let xs=(0..n).map(|i|{seed=seed.wrapping_mul(1664525).wrapping_add(1013904223); match i%7 {0=>0,1=>u32::MAX,2=>1<<31,_=>seed}}).collect::<Vec<_>>();
        let signed=xs.iter().map(|x|*x as i32).collect::<Vec<_>>();
        for name in ["sort_u","prefix","total","indexes"] {add(name,json!([xs]));}
        add("sort_i",json!([signed]));
        add("pairs",json!([signed,signed]));
        add("grow",json!([xs,[7,3]]));
        for k in [0,1,31,2147483648u32,u32::MAX] {
            for name in ["rank","right","left","stop"] {add(name,json!([xs,k,u32::MAX]));}
            add("signed",json!([signed,k as i32,-1]));
        }
    }
    for xs in [vec![],vec![u64::MAX,0,1,9007199254740993,1u64<<63,u64::MAX]] {add("sort_w",json!([xs]));}
    let dir=std::env::temp_dir().join(format!("ink-js-word-collections-{}",std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("program.mjs"),emitted.javascript).unwrap();
    fs::write(dir.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(dir.join("test.mjs"),r#"
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {functions,call,functionsInto} from './program.mjs';
const json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?String(x):x);
for(const c of JSON.parse(readFileSync(new URL('./cases.json',import.meta.url)))){
 const args=c.wide?[c.args[0].map(BigInt)]:c.args;
 const before=json(args);
 const result=functions[c.name](...args);
 assert.equal(json(result),json(c.expected),c.name);
 assert.equal(json(args),before,'input mutation '+c.name);
 if(Array.isArray(result)){result[0]=c.wide?11n:11;assert.equal(json(args),before);}
 assert.equal(json(call(c.name,args)),json(c.expected),'call '+c.name);
 if(Array.isArray(c.expected)){
  const out=new Array(c.expected.length+3).fill('tail');
  const count=functionsInto[c.name](...args,out);
  assert.equal(count,c.expected.length);
  assert.equal(json(out.slice(0,count)),json(c.expected));
  assert.deepEqual(out.slice(count),['tail','tail','tail']);
 }
 const Typed=c.wide?BigUint64Array:c.name==='signed'||c.name==='sort_i'||c.name==='pairs'?Int32Array:Uint32Array;
 const typed=args.map(x=>Array.isArray(x)?Typed.from(x):x);
 assert.equal(json(functions[c.name](...typed)),json(c.expected),'typed '+c.name);
}
// Capture exactly one read per element; fold direction and early-stop remain literal.
for(const [name,expected]of [['right',[2,1,0]],['left',[0,1,2]],['stop',[0,1]]]){
 const reads=[],values=[7,0,9],xs=values.map((_,i)=>0);
 values.forEach((x,i)=>Object.defineProperty(xs,i,{get(){reads.push(i);return x;}}));
 functions[name](xs,31,5);assert.deepEqual(reads,expected,name);
}
const xs=Object.freeze([4294967295,0,2147483648,1]);
assert.deepEqual(functions.sort_u(xs),[0,1,2147483648,4294967295]);
"#).unwrap();
    let result=Command::new("node").arg(dir.join("test.mjs")).output().unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    fs::remove_dir_all(dir).unwrap();
}
