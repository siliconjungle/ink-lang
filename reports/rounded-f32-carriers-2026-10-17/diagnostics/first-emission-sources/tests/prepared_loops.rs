use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json,Value};
use std::{fs,process::Command};
#[test]
fn prepared_callbacks_preserve_dynamic_iterations_shadowing_laziness_and_stop_order(){
 let source=include_str!("fixtures/prepared_loops.ink");
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();let p=module.program();let mut cases=vec![];
 for keys in [json!([1,2,3]),json!([0,7,4294967295u32])]{
  for qs in [json!([]),json!([0,1,2,7]),json!([7,2,9]),json!([4294967295u32,0,1])]{
   for name in ["mapped","indexed","filtered","left","right","early","shadowed","guarded","conjunction","disjunction","owners","owned_state"]{
    cases.push((name,json!([keys,qs])));
   }
   for name in ["nested","nested_shadowed"]{cases.push((name,json!([keys,[qs,[],[1,7]]])));}
  }
  for n in [0,1,5,12]{for maximum in [0,3,100]{cases.push(("repeated",json!([keys,n,maximum,7])));}
   cases.push(("growing",json!([keys,n])));
  }
  cases.push(("floating",json!([keys,[0.0,-0.0,1.25,{"F32Bits":0x7fc12345u32},{"F32Bits":0x7f800000u32},{"F32Bits":1}]])));
 }
 cases.push(("repeat_stop",json!([[2],5])));
 let mut fixture=Vec::<Value>::new();
 for(name,args)in cases{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,p).unwrap()).collect();
  let expected=eval::call(p,name,values,&mut 1_000_000).unwrap().json();fixture.push(json!({"name":name,"args":args,"expected":expected}));
 }
 let code=ink_lowering_js::lower(&module).unwrap().javascript;
 let root=std::env::temp_dir().join(format!("ink-prepared-loops-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),code).unwrap();fs::write(root.join("cases.json"),serde_json::to_vec(&fixture).unwrap()).unwrap();
 fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url))),c=m.compiledValues;
const encode=(name,value)=>m.valueCodecs[name].result.encode(value);
let calls=0;
for(const x of cases){
 const e=c[x.name],h=x.args.map((v,i)=>e.params[i].capture(v)),expected=encode(x.name,x.expected);
 for(const fixed of [[],[0],h.map((_,i)=>i)]){
  const t=m.prepareCompiled(x.name,fixed.map(i=>[i,h[i]])),rest=h.filter((_,i)=>!fixed.includes(i));
  for(let i=0;i<3;i++){assert.deepEqual(e.result.encode(m.callPreparedCompiled(t,rest)),expected,x.name);calls++;}
  assert.deepEqual(e.result.encode(m.callCompiled(x.name,h)),expected,x.name);
 }
}
// Reuse each token across different element lists, limits and carried states.
const sessions={};
for(const x of cases){
 const key=x.name+JSON.stringify(x.args[0]),e=c[x.name];
 const session=sessions[key]??=(function(){const h=e.params[0].capture(x.args[0]);return m.prepareCompiled(x.name,[[0,h]]);})();
 const rest=x.args.slice(1).map((v,i)=>e.params[i+1].capture(v));
 assert.deepEqual(e.result.encode(m.callPreparedCompiled(session,rest)),encode(x.name,x.expected));calls++;
}
// A fixed query list does not make changing input keys stable.
const me=c.mapped,queries=me.params[1].capture([7,2,9]),varyingKeys=m.prepareCompiled('mapped',[[1,queries]]);
const changing=[me.params[0].capture([1,2,3]),me.params[0].capture([7,9])];
for(let i=0;i<20;i++)for(let j=0;j<2;j++){
 assert.deepEqual(me.result.materialize(m.callPreparedCompiled(varyingKeys,[changing[j]])),j?[true,false,true]:[false,true,false]);calls++;
}
const keys=c.mapped.params[0].capture([1,2,3]);
const tokens=Object.fromEntries(['mapped','indexed','filtered','left','right','early','repeated','nested','shadowed','nested_shadowed','guarded','conjunction','disjunction','growing'].map(name=>[name,m.prepareCompiled(name,[[0,keys]])]));
const input=(name,...values)=>values.map((v,i)=>c[name].params[i+1].capture(v));
const a=input('mapped',[0,1,2,7]),b=input('mapped',[7,2,9]),empty=input('mapped',[]);
const inputs={filtered:input('filtered',[7,2,9]),left:input('left',[0,1,2,7]),right:input('right',[0,1,2,7]),early:input('early',[0,1,2,7]),repeated:input('repeated',8,20,7),nested:input('nested',[[0,1],[],[7,2,9]]),nested_shadowed:input('nested_shadowed',[[0,1],[],[7,2,9]]),shadowed:input('shadowed',[7,2,9]),zeros:input('guarded',[0,0]),guarded:input('guarded',[0,2,9]),growing:input('growing',5)};
const call=(name,args)=>c[name].result.materialize(m.callPreparedCompiled(tokens[name],args));
const NativeMap=globalThis.Map;let builds=0;
globalThis.Map=new Proxy(NativeMap,{construct(target,args){builds++;return Reflect.construct(target,args,target);}});
try{
 assert.deepEqual(call('mapped',empty),[]);assert.equal(builds,0);
 assert.deepEqual(call('mapped',a),[false,true,true,false]);assert.equal(builds,1);
 assert.deepEqual(call('mapped',b),[false,true,false]);assert.equal(builds,1);
 assert.deepEqual(call('indexed',a),[false,true,false,false]);assert.equal(builds,2);
 assert.deepEqual(call('filtered',inputs.filtered),[2]);assert.equal(builds,3);
 assert.equal(call('left',inputs.left),15);assert.equal(builds,4);
 assert.equal(call('right',inputs.right),21);assert.equal(builds,5);
 assert.equal(call('early',inputs.early),1);assert.equal(builds,6);
 assert.equal(call('repeated',inputs.repeated),22);assert.equal(builds,7);
 assert.deepEqual(call('nested',inputs.nested),[[false,true],[],[false,true,false]]);assert.equal(builds,8);
 // A lambda binder that shadows fixed keys remains dynamic per element.
 assert.deepEqual(call('shadowed',inputs.shadowed),[true,true,true]);assert.equal(builds,11);
 assert.deepEqual(call('shadowed',inputs.shadowed),[true,true,true]);assert.equal(builds,14);
 // The outer iteration's keys cannot be cached across different inner loops.
 assert.deepEqual(call('nested_shadowed',inputs.nested_shadowed),[[true,true],[],[true,true,true]]);assert.equal(builds,19);
 assert.deepEqual(call('guarded',inputs.zeros),[false,false]);assert.equal(builds,19);
 assert.deepEqual(call('guarded',inputs.guarded),[false,true,false]);assert.equal(builds,20);
 const output=call('growing',inputs.growing);assert.deepEqual(output,[false,true,true,true,false]);output[0]=true;assert.equal(builds,21);
 assert.deepEqual(call('growing',inputs.growing),[false,true,true,true,false]);assert.equal(builds,21);
 assert.deepEqual(call('conjunction',inputs.zeros),[false,false]);assert.equal(builds,21);
 assert.deepEqual(call('conjunction',inputs.guarded),[false,true,false]);assert.equal(builds,22);
 assert.deepEqual(call('disjunction',inputs.zeros),[true,true]);assert.equal(builds,22);
 assert.deepEqual(call('disjunction',inputs.guarded),[true,true,false]);assert.equal(builds,23);
}finally{globalThis.Map=NativeMap;}
// Early-stop order differs: repeat tests before its step; fold_until tests
// first, runs that iteration's step, and only then stops.
for(const name of ['repeat_stop','fold_stop']){
 const e=c[name],key=e.params[0].capture([2]),t=m.prepareCompiled(name,[[0,key]]),rest=[e.params[1].capture(name==='repeat_stop'?5:[7])];
 if(name==='repeat_stop')assert.deepEqual(e.result.materialize(m.callPreparedCompiled(t,rest)),{Ok:2});
 else for(let i=0;i<2;i++)assert.deepEqual(e.result.materialize(m.callPreparedCompiled(t,rest)),{Err:'limit'});
}
// A helper first reached inside a loop must retry its failed stable work.
const e=c.mapped,t=m.prepareCompiled('mapped',[[0,keys]]),sentinel=new Error('loop build');let attempts=0;
globalThis.Map=new Proxy(NativeMap,{construct(target,args){if(++attempts===1)throw sentinel;return Reflect.construct(target,args,target);}});
try{assert.throws(()=>m.callPreparedCompiled(t,a),x=>x===sentinel);assert.deepEqual(e.result.materialize(m.callPreparedCompiled(t,b)),[false,true,false]);assert.deepEqual(e.result.materialize(m.callPreparedCompiled(t,a)),[false,true,true,false]);assert.equal(attempts,2);}finally{globalThis.Map=NativeMap;}
console.log(JSON.stringify({referenceCases:cases.length,calls,loopHelperBuilds:1,dynamicIterationAndShadowing:true,failedWorkRetried:true}));
"#).unwrap();
 for carrier in ["native","bits"] {
  if carrier=="bits" {
   let mixed=format!("{source}\nstate Unused:u32=0;");
   let m=CheckedModule::from_source(parse(&mixed).unwrap()).unwrap();
   fs::write(root.join("program.mjs"),ink_lowering_js::lower(&m).unwrap().javascript).unwrap();
  }
  let output=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
  assert!(output.status.success(),"{carrier}: {}{}",String::from_utf8_lossy(&output.stdout),String::from_utf8_lossy(&output.stderr));println!("{carrier}: {}",String::from_utf8_lossy(&output.stdout));
 }
 fs::remove_dir_all(root).unwrap();
}
