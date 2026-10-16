use ink_core::{core::CheckedModule,syntax::parse};
use std::{fs,process::Command};

#[test]
fn immutable_handles_reuse_checked_type_facts_without_erasing_other_requires(){
 let source=r#"module Guarantees;
refined record Positive{value:u32,} invariant value.value>0;
fn get(value:Positive)->u32{return value.value;}
fn copy(value:Positive)->Positive{return value;}
spec fn guarded(value:Positive,allowed:Bool)->u32 requires allowed;ensures result==value.value;
implementation selected for guarded{return value.value;}
"#;
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let mut code=ink_lowering_js::lower(&module).unwrap().javascript;
 // Instrument actual guard invocations without changing their return values.
 code.push_str(r#"
const guardCalls=new Map();for(const index of new Set([...__compiledEntries.values()].map(e=>e.precondition).filter(i=>i!==null))){const original=__implementations[index];__implementations[index]=(...values)=>{guardCalls.set(index,(guardCalls.get(index)||0)+1);return original(...values);};}
export const countGuards=name=>guardCalls.get(__compiledEntries.get(name).precondition)||0;
"#);
 let root=std::env::temp_dir().join(format!("ink-compiled-guarantees-{}",std::process::id()));fs::create_dir_all(&root).unwrap();fs::write(root.join("program.mjs"),code).unwrap();
 fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import * as m from './program.mjs';
const codec=m.compiledValues.get.params[0],host={value:7},captured=codec.capture(host);host.value=0;
const get=h=>m.compiledValues.get.result.materialize(m.callCompiled('get',[h]));
assert.equal(get(captured),7);assert.equal(m.countGuards('get'),1);
for(let i=0;i<10;i++)assert.equal(get(captured),7);assert.equal(m.countGuards('get'),1);
const copied=m.callCompiled('copy',[captured]);assert.equal(m.countGuards('copy'),0);
const materialized=codec.materialize(copied);materialized.value=0;
assert.equal(get(copied),7);assert.equal(m.countGuards('get'),1);
const decoded=codec.decode(codec.encode(captured));assert.equal(get(decoded),7);assert.equal(m.countGuards('get'),2);
const invalid=codec.capture({value:0});for(let i=0;i<2;i++)assert.throws(()=>get(invalid),/precondition/);assert.equal(m.countGuards('get'),4);
const g=m.compiledValues.guarded,yes=g.params[1].capture(true),no=g.params[1].capture(false);
for(let i=0;i<2;i++){assert.throws(()=>m.callCompiled('guarded',[copied,no]),/precondition/);assert.equal(g.result.materialize(m.callCompiled('guarded',[copied,yes])),7);}assert.equal(m.countGuards('guarded'),4);
assert.throws(()=>get({}),/owner mismatch/);assert.throws(()=>get(g.params[1].capture(true)),/type or owner mismatch/);
"#).unwrap();
 let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();fs::remove_dir_all(root).unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
}
