use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn finite_count_comparisons_preserve_exact_integers_and_public_values() {
    let mut source = String::from("module CountCarrier;\nrecord Row{value:u32,}\n");
    let ops = ["==", "!=", "<", "<=", ">", ">="];
    for (i, op) in ops.iter().enumerate() {
        for (form, body) in [
            ("pair", format!("count(xs){op}count(ys)")),
            ("right", format!("count(xs){op}3")),
            ("left", format!("3{op}count(xs)")),
            ("safe", format!("count(xs){op}9007199254740991")),
            ("wide", format!("count(xs){op}9007199254740993")),
            ("negative", format!("count(xs){op}-1")),
            ("variable", format!("count(xs){op}limit")),
            ("arithmetic", format!("(count(xs)+1){op}count(ys)")),
        ] {
            for prefix in ["fn", "query"] {
                let name = format!("{}{form}{i}", if prefix == "query" { "q_" } else { "" });
                source.push_str(&format!("{prefix} {name}(xs:List<u32>,ys:List<u32>,limit:Int)->Bool{{return {body};}}\n"));
            }
        }
    }
    source.push_str("fn no_count(limit:Int)->Bool{return limit==limit;}\nfn value(xs:List<u32>)->Int{return count(xs);}\nfn word(xs:List<u32>)->u64{return count(xs);}\nfn ordered(xs:List<Row>,ys:List<Row>)->Bool{return count(xs.map(fn(x)=>x.value))==count(ys.map(fn(x)=>x.value));}\nfn lazy(xs:List<Row>,ys:List<Row>)->Bool{return count(xs)>=0 || count(ys.map(fn(x)=>x.value))==0;}\n");
    let module = CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    let mut cases = Vec::<Value>::new();
    for n in [0, 1, 3, 4, 257] {
        for m in [0, 1, 3, 11] {
            for limit in [json!({"Int":"-1"}), json!({"Int":"3"}), json!({"Int":"9007199254740993"})] {
                let args = json!([vec![7; n], vec![11; m], limit]);
                for f in module.program().functions.iter().filter(|f| f.params.len() == 3) {
                    let values = args.as_array().unwrap().iter().zip(&f.params)
                        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, module.program()).unwrap()).collect();
                    let expected = eval::call(module.program(), &f.name, values, &mut 1_000_000).unwrap().json();
                    cases.push(json!({"name":f.name,"args":args,"expected":expected}));
                }
            }
        }
    }
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let root = std::env::temp_dir().join(format!("ink-count-carrier-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"), emitted.javascript).unwrap();
    fs::write(root.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(root.join("test.mjs"), r#"
import assert from 'node:assert/strict';import fs from 'node:fs';
import {call,callBinary,callCompact,valueCodecs,metadata,createState,functions} from './program.mjs';
const state=createState();const initial=await state.checkpoint();
let checked=0;
for(const c of JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)))){
 const before=structuredClone(c.args),typed=[c.args[0],c.args[1],BigInt(c.args[2].Int)];assert.equal(call(c.name,typed),c.expected);
 const codec=valueCodecs[c.name],params=metadata.functions.find(f=>f.name===c.name).params;
 const input=Object.fromEntries(params.map((p,i)=>[p.name,typed[i]]));
 assert.deepEqual(callBinary(c.name,codec.arguments.encode(input)),codec.result.encode(c.expected));
 assert.deepEqual(callCompact(c.name,codec.arguments.compact().encode(input)),codec.result.compact().encode(c.expected));
 assert.equal((await state.invoke_json('q_'+c.name,c.args)).result,c.expected);
 assert.deepEqual(c.args,before);checked++;
}
assert.deepEqual(await state.checkpoint(),initial);
// Count conversion is absent only in the exact comparison-use carrier. Keep
// public counts, arbitrary Int arguments, arithmetic and word counts unchanged.
const original=globalThis.BigInt;let calls=0;globalThis.BigInt=new Proxy(original,{apply(t,self,args){calls++;return Reflect.apply(t,self,args);}});
try{
 calls=0;functions.no_count(0n);const inputConversions=calls;assert.equal(inputConversions,1);
 for(const form of ['pair','right','left','safe'])for(let i=0;i<6;i++){
  calls=0;functions[form+i]([1,2,3],[9],0n);assert.equal(calls,inputConversions,form+i);
 }
 for(const form of ['wide','negative','variable','arithmetic']){
  calls=0;functions[form+'0']([1,2,3],[9],0n);assert.ok(calls>inputConversions,form);
 }
 calls=0;assert.deepEqual(functions.value([1,2,3]),{Int:'3'});assert.equal(calls,1);
 calls=0;assert.equal(functions.word([1,2,3]),3n);assert.equal(calls,1);
}finally{globalThis.BigInt=original;}
const huge=[];huge.length=0xffffffff;
assert.equal(functions.pair0(huge,huge,0n),true);assert.equal(functions.safe2(huge,[],0n),true);
assert.deepEqual(functions.value(huge),{Int:'4294967295'});assert.equal(functions.word(huge),4294967295n);
let reads=[];const row=(label)=>({get value(){reads.push(label);return 7;}});
assert.equal(call('ordered',[[row('a'),row('b')],[row('c')]]),false);assert.deepEqual(reads,['a','b','c']);
reads=[];assert.equal(call('lazy',[[row('a')],[row('never')]]),true);assert.deepEqual(reads,[]);
const sentinel=new Error('operand failed');reads=[];
const bad={get value(){reads.push('bad');throw sentinel;}};
assert.throws(()=>call('ordered',[[bad],[row('never')]]),e=>e===sentinel);assert.deepEqual(reads,['bad']);
console.log(JSON.stringify({cases:checked,transportPaths:3,stateQueries:checked,exactComparisonConversions:0}));
"#).unwrap();
    let output = Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    println!("{}", String::from_utf8_lossy(&output.stdout));
    fs::remove_dir_all(root).unwrap();
}
