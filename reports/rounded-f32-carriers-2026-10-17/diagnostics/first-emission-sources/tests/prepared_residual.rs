use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn sealed_partial_calls_retain_only_stable_readonly_values_in_source_order() {
 let source=include_str!("fixtures/prepared_residual.ink");
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let mut cases=Vec::<Value>::new();
 for (name,args) in [
  ("wrapped",json!([[1,2,3],[0,1,2,7]])),
 ("paired",json!([[1,2,3],[2,7],[0,1,2,7]])),("paired",json!([[1,2,3],[2,7],[]])),
 ("lifted",json!([[1,2,3],[0,1,2,7]])),("lifted",json!([[2,3],[0,1,2,7]])),
 ("delayed",json!([[1,2,3],[0,1,2,7],false])),("delayed",json!([[1,2,3],[0,1,2,7],true])),
 ("varying",json!([[1,2,3],[7]])),("varying",json!([[1,2,3],[7,8]])),
 ("indexed",json!([[1,2,3],[0,1,2,7]])),("guarded",json!([[1,2,3],[]])),
  ("guarded",json!([[1,2,3],[7]])),("guarded",json!([[1,2,3],[0,1,2,7]])),
  ("edited",json!([[1,2,3],[7,2,9]])),("edited",json!([[1,2,3],[9,7,11]])),
  ("transformed",json!([[1,2,4294967295u32],3])),("transformed",json!([[1,2,4294967295u32],7])),
  ("shadowed",json!([[1,2,3],[8,9]])),("shadowed",json!([[1,2,3],[17]])),
  ("floating",json!([[0.0,-0.0,{"F32Bits":0x7fc12345u32},{"F32Bits":1}],true])),
  ("floating",json!([[0.0,-0.0,{"F32Bits":0x7fc12345u32},{"F32Bits":1}],false])),
  ("checked",json!([[1,2,3],[0,1,2,7],true])),("plain",json!([u32::MAX])),
 ]{
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
  let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
  let expected=eval::call(module.program(),name,input,&mut 1000000).unwrap().json();
  cases.push(json!({"name":name,"args":args,"expected":expected}));
 }
 let code=ink_lowering_js::lower(&module).unwrap().javascript;
 let root=std::env::temp_dir().join(format!("ink-prepared-residual-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),code).unwrap();fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
 fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url))),codecs=m.compiledValues;
for(const name of Object.keys(codecs)){void codecs[name].params;void codecs[name].result;}
const materialize=(name,h)=>codecs[name].result.materialize(h);
let calls=0;
for(const c of cases){
 const entry=codecs[c.name],handles=c.args.map((v,i)=>entry.params[i].capture(v));
 for(const indices of [[],[0],handles.map((_,i)=>i),handles.map((_,i)=>i).reverse()]){
  const unique=[...new Set(indices)];const bindings=unique.map(i=>[i,handles[i]]);
  const prepared=m.prepareCompiled(c.name,bindings),remaining=handles.filter((_,i)=>!unique.includes(i));
  bindings.splice(0,bindings.length); // caller-owned configuration is captured
  const expected=m.valueCodecs[c.name].result.encode(c.expected);
  for(let n=0;n<3;n++)assert.deepEqual(entry.result.encode(m.callPreparedCompiled(prepared,remaining)),expected,c.name);
  assert.deepEqual(entry.result.encode(m.callCompiled(c.name,handles)),expected);calls+=3;
 }
}
// Reuse the same captured keys while query inputs change. Host mutation and
// materialized output mutation must not change retained private values.
const host=[1,2,3],key=codecs.indexed.params[0].capture(host);host[0]=99;
const query=v=>codecs.indexed.params[1].capture(v),one=query([0,1,2,7]),two=query([7,2,9]),empty=query([]);
const token=m.prepareCompiled('indexed',[[0,key]]),guarded=m.prepareCompiled('guarded',[[0,key]]);
const checked=m.prepareCompiled('checked',[[0,key]]),yes=codecs.checked.params[2].capture(true),no=codecs.checked.params[2].capture(false);
const edited=m.prepareCompiled('edited',[[0,key]]);
const result=(name,token,args)=>materialize(name,m.callPreparedCompiled(token,args));
const NativeMap=globalThis.Map;
let builds=0;globalThis.Map=new Proxy(NativeMap,{construct(target,args){builds++;return Reflect.construct(target,args,target);}});
try{
 assert.deepEqual(result('indexed',token,[one]),[false,true,true,false]);assert.equal(builds,1);
 const changed=result('indexed',token,[two]);assert.deepEqual(changed,[false,true,false]);changed[0]=true;
 assert.deepEqual(result('indexed',token,[two]),[false,true,false]);assert.equal(builds,1);
 // Branch-local construction remains lazy, then persists across varying calls.
 assert.deepEqual(result('guarded',guarded,[empty]),[]);assert.equal(builds,1);
 assert.deepEqual(result('guarded',guarded,[one]),[false,true,true,false]);assert.equal(builds,2);
 assert.deepEqual(result('guarded',guarded,[empty]),[]);assert.equal(builds,2);
 assert.deepEqual(result('guarded',guarded,[two]),[false,true,false]);assert.equal(builds,2);
 // Declared requires runs before any retained computation, on every invocation.
 assert.throws(()=>result('checked',checked,[one,no]),/precondition/);assert.equal(builds,2);
 assert.deepEqual(result('checked',checked,[one,yes]),[false,true,true,false]);assert.equal(builds,3);
 assert.throws(()=>result('checked',checked,[one,no]),/precondition/);assert.equal(builds,3);
 assert.deepEqual(result('checked',checked,[two,yes]),[false,true,false]);assert.equal(builds,3);
 // A consumed owner cannot be reused as readonly merely because its original
 // initializer has fixed inputs. Dynamic mutation must rebuild that owner.
 assert.deepEqual(result('edited',edited,[two]),[true,true,false]);assert.equal(builds,4);
 assert.deepEqual(result('edited',edited,[one]),[true,true,true,false]);assert.equal(builds,5);
}finally{globalThis.Map=NativeMap;}
// Throwing computations are retried, never retained as successful values.
const retry=m.prepareCompiled('indexed',[[0,key]]),sentinel=new Error('construction failed');let attempts=0;
globalThis.Map=new Proxy(NativeMap,{construct(target,args){if(++attempts===1)throw sentinel;return Reflect.construct(target,args,target);}});
try{assert.throws(()=>result('indexed',retry,[one]),e=>e===sentinel);assert.deepEqual(result('indexed',retry,[one]),[false,true,true,false]);assert.deepEqual(result('indexed',retry,[two]),[false,true,false]);assert.equal(attempts,2);}finally{globalThis.Map=NativeMap;}
// Immutable cached lists stay shared through every residual cut. The ordinary
// final-use concat optimization must never append into a retained list.
for(const [name,argsA,argsB]of [['transformed',[[1,2,0xffffffff],3],[[1,2,0xffffffff],7]],['shadowed',[[1,2,3],[8,9]],[[1,2,3],[17]]]]){
 const c=codecs[name],fixed=c.params[0].capture(argsA[0]),t=m.prepareCompiled(name,[[0,fixed]]);
 for(let i=0;i<20;i++)for(const args of [argsA,argsB]){
  const full=[fixed,c.params[1].capture(args[1])];assert.deepEqual(materialize(name,m.callPreparedCompiled(t,[full[1]])),materialize(name,m.callCompiled(name,full)));
 }
}

// Independently scoped helper calls retain their own readonly intermediates.
const left=codecs.paired.params[0].capture([1,2,3]),right=codecs.paired.params[1].capture([2,7]);
const paired=m.prepareCompiled('paired',[[0,left],[1,right]]),wrapped=m.prepareCompiled('wrapped',[[0,left]]);
const lifted=m.prepareCompiled('lifted',[[0,left]]),delayed=m.prepareCompiled('delayed',[[0,left]]);
const invalid=m.prepareCompiled('lifted',[[0,codecs.lifted.params[0].capture([2,3])]]);
const varying=m.prepareCompiled('varying',[[0,left]]);
builds=0;globalThis.Map=new Proxy(NativeMap,{construct(target,args){builds++;return Reflect.construct(target,args,target);}});
try{
 assert.deepEqual(result('wrapped',wrapped,[one]),[false,true,true,false]);assert.equal(builds,1);
 assert.deepEqual(result('wrapped',wrapped,[two]),[false,true,false]);assert.equal(builds,1);
 assert.deepEqual(result('paired',paired,[one]),[false,true,true,false,false,false,true,true]);assert.equal(builds,3);
 assert.deepEqual(result('paired',paired,[two]),[false,true,false,true,true,false]);assert.equal(builds,3);
 // Stable conditions inside a helper persist through a Result map. Unvisited
 // guards remain lazy; valid/invalid results and variable inputs keep meaning.
 assert.deepEqual(result('delayed',delayed,[one,no]),{Err:'disabled'});assert.equal(builds,3);
 assert.deepEqual(result('delayed',delayed,[one,yes]),{Ok:[false,true,true,true,true]});assert.equal(builds,4);
 assert.deepEqual(result('delayed',delayed,[two,yes]),{Ok:[true,true,true,true]});assert.equal(builds,4);
 assert.deepEqual(result('delayed',delayed,[one,no]),{Err:'disabled'});assert.equal(builds,4);
 assert.deepEqual(result('lifted',lifted,[one]),{Ok:[false,true,true,true,true]});assert.equal(builds,5);
 assert.deepEqual(result('lifted',lifted,[two]),{Ok:[true,true,true,true]});assert.equal(builds,5);
 assert.deepEqual(result('lifted',invalid,[one]),{Err:'invalid keys'});assert.equal(builds,6);
 assert.deepEqual(result('lifted',invalid,[two]),{Err:'invalid keys'});assert.equal(builds,6);
 // A transitive dependency on a varying argument forbids retaining the index.
 const single=query([7]);
 assert.deepEqual(result('varying',varying,[single]),[false]);assert.equal(builds,7);
 assert.deepEqual(result('varying',varying,[two]),[true,true,true]);assert.equal(builds,8);
 assert.deepEqual(result('varying',varying,[single]),[false]);assert.equal(builds,9);
}finally{globalThis.Map=NativeMap;}
// A thrown stable condition has not completed and must be evaluated again.
const failedGuard=m.prepareCompiled('lifted',[[0,left]]);attempts=0;
globalThis.Map=new Proxy(NativeMap,{construct(target,args){if(++attempts===1)throw sentinel;return Reflect.construct(target,args,target);}});
try{
 assert.throws(()=>result('lifted',failedGuard,[one]),e=>e===sentinel);
 assert.deepEqual(result('lifted',failedGuard,[two]),{Ok:[true,true,true,true]});
 assert.deepEqual(result('lifted',failedGuard,[one]),{Ok:[false,true,true,true,true]});assert.equal(attempts,2);
}finally{globalThis.Map=NativeMap;}

assert.throws(()=>m.prepareCompiled('missing',[]),/unsupported/);
for(const bindings of [[[0,key],[0,key]],[[-1,key]],[[2,key]],[[0.5,key]],[[0,{}]],[[0,yes]]])assert.throws(()=>m.prepareCompiled('indexed',bindings));
assert.throws(()=>m.callPreparedCompiled({},[one]),/invalid prepared/);assert.throws(()=>m.callPreparedCompiled(token,[]),/invalid prepared/);assert.throws(()=>m.callPreparedCompiled(token,[{}]),/owner mismatch/);
const foreign=await import('./program.mjs?foreign-owner');assert.throws(()=>foreign.callPreparedCompiled(token,[one]),/invalid prepared/);assert.throws(()=>foreign.prepareCompiled('indexed',[[0,key]]),/owner mismatch/);
console.log(JSON.stringify({calls,referenceCases:cases.length,readonlyIndexBuilds:1,guardedBuilds:1,consumedOwnersRebuilt:true,failedConstructionRetried:true}));
"#).unwrap();
 let output=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
 assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));println!("{}",String::from_utf8_lossy(&output.stdout));fs::remove_dir_all(root).unwrap();
}

#[test]
fn bounded_helper_preparation_falls_back_without_changing_ordinary_calls() {
 let mut source=String::from("module Bounded;\nfn leaf(xs:List<u32>,n:u32)->u32{let base=xs.map(fn(x)=>x+1);return base.at_or(n,99);}\n");
 // A long helper chain reaches the runtime preparation-depth bound, then
 // continues through ordinary calls without growing the preparation graph.
 for i in (0..30).rev(){source+=&format!("fn chain{i}(xs:List<u32>,n:u32)->u32{{return {}(xs,n);}}\n",if i==29{"leaf".into()}else{format!("chain{}",i+1)});}
 fn branch(depth:usize)->String {
  if depth==0{return "let a:u32=n+1;let b:u32=n+2;let c:u32=n+3;let d:u32=n+4;let e:u32=n+5;return prepared.at_or(n,99);".into();}
  format!("if n<{} {{{}}}else{{{}}}",depth,branch(depth-1),branch(depth-1))
 }
 source+=&format!("fn oversized(xs:List<u32>,n:u32)->u32{{let prepared=xs.map(fn(x)=>x+1);{}}}",branch(4));
 let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
 let emission=ink_lowering_js::lower(&module).unwrap();
 let root=std::env::temp_dir().join(format!("ink-prepared-helper-bounded-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),emission.javascript).unwrap();
 fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import * as m from './program.mjs';
const c=m.compiledValues.chain0,x=c.params[0].capture([1,2,3]),t=m.prepareCompiled('chain0',[[0,x]]);
for(const[n,expected]of [[0,2],[2,4],[9,99]])for(let i=0;i<3;i++){
 const arg=c.params[1].capture(n);assert.equal(c.result.materialize(m.callPreparedCompiled(t,[arg])),expected);
 assert.equal(c.result.materialize(m.callCompiled('chain0',[x,arg])),expected);
}
const lane=m.metadata.prepared_compiled.functions.find(f=>f.function==='oversized');assert.equal(lane.factory,false);assert.match(lane.reason,/budget/);
const o=m.compiledValues.oversized,ot=m.prepareCompiled('oversized',[[0,o.params[0].capture([1,2,3])]]);assert.equal(o.result.materialize(m.callPreparedCompiled(ot,[o.params[1].capture(1)])),3);
"#).unwrap();
 let out=Command::new("node").arg(root.join("test.mjs")).output().unwrap();assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));fs::remove_dir_all(root).unwrap();
}
