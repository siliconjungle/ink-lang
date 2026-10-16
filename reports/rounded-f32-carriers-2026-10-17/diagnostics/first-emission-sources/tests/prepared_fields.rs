use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::{json, Value};
use std::{fs, process::Command};

#[test]
fn mixed_record_preparation_keeps_changing_fields_guards_and_primals_live() {
    let module=CheckedModule::from_source(parse(include_str!("fixtures/prepared_fields.ink")).unwrap()).unwrap();
    let mut cases=Vec::<Value>::new();
    for name in ["mixed","direct","looped","swapped","strict","checked_record","projected","shadowed","doubles","checked"] {
        for q in [0,1,2,7,8] {
            let args=if name=="doubles" {
                json!([[{"F64Bits":0x7ff8000000001234u64.to_string()},{"F64Bits":0x8000000000000000u64.to_string()},{"F64Bits":1u64.to_string()}],q])
            } else if name=="checked" { json!([[1,2,3],q,true]) } else if name=="looped" { json!([[1,2,3],[q,q+1,7]]) } else { json!([[1,2,3],q]) };
            let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
            let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|
                eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
            let expected=eval::call_checked(&module,name,input,&mut 1_000_000).unwrap().json();
            cases.push(json!({"name":name,"args":args,"expected":expected}));
        }
    }
    let code=ink_lowering_js::lower(&module).unwrap().javascript;
    let root=std::env::temp_dir().join(format!("ink-prepared-fields-{}",std::process::id()));
    fs::create_dir_all(&root).unwrap();fs::write(root.join("program.mjs"),code).unwrap();
    fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url))),c=m.compiledValues;
const sessions=new Map();let calls=0;
for(const x of cases){
 const entry=c[x.name],full=x.args.map((v,i)=>entry.params[i].capture(v));
 const expected=m.valueCodecs[x.name].result.encode(x.expected);
 assert.deepEqual(entry.result.encode(m.callCompiled(x.name,full)),expected);
 for(const fixed of [[],[0],[1],[0,1],[1,0]]){
  const key=x.name+':'+fixed,shared=fixed.length===1&&fixed[0]===0;
  let token=shared?sessions.get(key):undefined;
  if(!token){token=m.prepareCompiled(x.name,fixed.map(i=>[i,full[i]]));if(shared)sessions.set(key,token);}
  for(let i=0;i<3;i++){
   assert.deepEqual(entry.result.encode(m.callPreparedCompiled(token,full.filter((_,i)=>!fixed.includes(i)))),expected,x.name);calls++;
  }
 }
}
// Instrument actual retained allocations, not factory construction. Changing
// query fields cross nested helper-returned records without rebuilding the index.
const NativeMap=globalThis.Map,run=(name,t,q)=>c[name].result.materialize(m.callPreparedCompiled(t,[c[name].params[1].capture(q)]));
const tokens=Object.fromEntries(['mixed','direct','looped','swapped','strict','checked_record','projected','shadowed'].map(name=>
 [name,m.prepareCompiled(name,[[0,c[name].params[0].capture([1,2,3])]])]));
let builds=0;globalThis.Map=new Proxy(NativeMap,{construct(target,args){builds++;return Reflect.construct(target,args,target);}});
try{
 for(const name of ['mixed','direct']){const before=builds;
  for(const q of [1,7,2,8,1])assert.equal(run(name,tokens[name],q),q>=1&&q<=3);
  assert.equal(builds,before+1,name+' retains the fixed-field index');
 }
 const before=builds;
 assert.deepEqual(run('looped',tokens.looped,[1,7,2]),[true,false,true]);
 assert.deepEqual(run('looped',tokens.looped,[7,3]),[false,true]);assert.equal(builds,before+1);
 for(const name of ['strict','checked_record']){const before=builds;
  assert.equal(run(name,tokens[name],1),true);assert.equal(builds,before+2);
  for(let i=0;i<2;i++)assert.equal(run(name,tokens[name],9),false);
  assert.equal(run(name,tokens[name],7),false);assert.equal(builds,before+5);
 }
 // Discarded dynamic work still executes before projecting a stable field.
 const projectionBuilds=builds;
 for(const q of [1,9,2])assert.deepEqual(run('projected',tokens.projected,q),[1,2,3]);
 assert.equal(builds,projectionBuilds+3);
 // Conditional record selection and shadowing cannot inherit an old field mask.
 for(const q of [0,7,0,2])assert.equal(run('swapped',tokens.swapped,q),q===0);
 for(const q of [1,2,7])assert.equal(run('shadowed',tokens.shadowed,q),false);
}finally{globalThis.Map=NativeMap;}
// Preconditions still execute on every call before already retained fields.
const checked=m.prepareCompiled('checked',[[0,c.checked.params[0].capture([1,2,3])]]);
const checkedCall=(q,allowed)=>c.checked.result.materialize(m.callPreparedCompiled(checked,[c.checked.params[1].capture(q),c.checked.params[2].capture(allowed)]));
assert.equal(checkedCall(1,true),true);
for(let i=0;i<2;i++)assert.throws(()=>checkedCall(7,false),/precondition/);
assert.equal(checkedCall(7,true),false);
// A failed dynamic expression runs before a previously cached field projection.
const strict=m.prepareCompiled('strict',[[0,c.strict.params[0].capture([1,2,3])]]);
assert.equal(run('strict',strict,1),true);
let discardedAttempts=0;
globalThis.Map=new Proxy(NativeMap,{construct(){discardedAttempts++;throw Error('discarded expression');}});
try{for(let i=0;i<2;i++)assert.throws(()=>run('strict',strict,2),/discarded expression/);assert.equal(discardedAttempts,2);}finally{globalThis.Map=NativeMap;}
assert.equal(run('strict',strict,7),false);
// A failed first retained field computation must retry.
const retry=m.prepareCompiled('direct',[[0,c.direct.params[0].capture([1,2,3])]]),sentinel=new Error('field build');let attempts=0;
globalThis.Map=new Proxy(NativeMap,{construct(target,args){if(++attempts===1)throw sentinel;return Reflect.construct(target,args,target);}});
try{assert.throws(()=>run('direct',retry,1),e=>e===sentinel);assert.equal(run('direct',retry,7),false);assert.equal(run('direct',retry,2),true);assert.equal(attempts,2);}finally{globalThis.Map=NativeMap;}
console.log(JSON.stringify({referenceCases:cases.length,calls,mixedFieldIndexBuilds:1,discardedDynamicWorkPreserved:true,rawDoubleBits:true}));
"#).unwrap();
    let output=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    println!("{}",String::from_utf8_lossy(&output.stdout));fs::remove_dir_all(root).unwrap();
}

#[test]
fn aliased_record_expansion_keeps_bounded_preparation_and_literal_fallback() {
    // A small source can describe an exponentially expanded provenance tree.
    // Ordinary JS shares these immutable record values; preparation must not
    // expand the analysis without a bound or reject the supported program.
    let mut source=String::from("module Expansion; record R0 { keys:List<u32>, }\n");
    for i in 1..=10 {source.push_str(&format!("record R{i} {{ left:R{}, right:R{}, }}\n",i-1,i-1));}
    source.push_str("fn run(keys:List<u32>,q:u32)->Bool {let n0=R0{keys:keys};\n");
    for i in 1..=10 {source.push_str(&format!("let n{i}=R{i}{{left:n{},right:n{}}};\n",i-1,i-1));}
    source.push_str(&format!("let payload=n10{}.keys;\n", ".left".repeat(10)));
    source.push_str("let index:Map<u32,Bool>=foldr(payload,Map.empty(),fn(k)=>fn(m)=>m.set(k,true));return index.contains(q);}");
    let module=CheckedModule::from_source(parse(&source).unwrap()).unwrap();
    for q in [1,7,2] {
        let expected=eval::call_checked(&module,"run",vec![eval::Value::List(vec![eval::Value::U32(1),eval::Value::U32(2)]),eval::Value::U32(q)],&mut 1_000_000).unwrap();
        assert_eq!(expected,eval::Value::Bool(q!=7));
    }
    let code=ink_lowering_js::lower(&module).unwrap().javascript;
    assert!(code.len()<2_000_000,"bounded generated source");
    let root=std::env::temp_dir().join(format!("ink-prepared-field-expansion-{}",std::process::id()));
    fs::create_dir_all(&root).unwrap();fs::write(root.join("program.mjs"),code).unwrap();
    fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import * as m from './program.mjs';
const c=m.compiledValues.run,keys=c.params[0].capture([1,2]),t=m.prepareCompiled('run',[[0,keys]]);
for(const q of [1,7,2,7,1]){const query=c.params[1].capture(q),expected=q!==7;
 assert.equal(c.result.materialize(m.callCompiled('run',[keys,query])),expected);
 assert.equal(c.result.materialize(m.callPreparedCompiled(t,[query])),expected);}
"#).unwrap();
    let output=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));fs::remove_dir_all(root).unwrap();
}
