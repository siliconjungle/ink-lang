use ink_core::{core::CheckedModule, physical, planning, syntax::parse};
use std::{fs, process::Command};

#[test]
fn dictionary_tables_preserve_order_falsy_values_failures_and_restore() {
    let module=CheckedModule::from_source(parse(r#"module strings;
enum Error{Failed,}
state Rows:Table<String,u32>=Table.empty();
state Flags:Table<String,Bool>=Table.empty();
state Units:Table<String,Unit>=Table.empty();
state Other:Table<u32,u32>=Table.empty();
event changed:String;
change put(key:String,value:u32,fail:Bool)->Result<Unit,Error> writes(Rows,Flags,Units) emits(changed){Rows.put(key,value);Flags.put(key,false);Units.put(key,());emit changed(key);if fail{return Err(Error.Failed);}return Ok(());}
change erase(key:String,fail:Bool)->Result<Unit,Error> writes(Rows,Flags,Units) emits(changed){Rows.remove(key);Flags.remove(key);Units.remove(key);emit changed(key);if fail{return Err(Error.Failed);}return Ok(());}
query keys()->List<String> reads(Rows){return Rows.keys();}
query values()->List<u32> reads(Rows){return Rows.values();}
query row(key:String)->Option<u32> reads(Rows){return Rows.get(key);}
query flag(key:String)->Option<Bool> reads(Flags){return Flags.get(key);}
query unit(key:String)->Option<Unit> reads(Units){return Units.get(key);}
"#).unwrap()).unwrap();
    let directory = std::env::temp_dir().join(format!("ink-string-tables-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    let ordinary=ink_lowering_js::lower(&module).unwrap();
    assert!(!ordinary.javascript.contains("class __StringTable"));
    fs::write(directory.join("ordinary.mjs"),ordinary.javascript).unwrap();
    let physical:physical::Plan=serde_json::from_value(serde_json::json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"dictionary_tables":["Flags","Rows","Units"]})).unwrap();
    let package = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        steps: vec![planning::Step::Physical(physical.clone())],
    };
    let plan = planning::check(&module, &package).unwrap();
    assert!(plan.require_source_storage_capability(true, true).is_err());
    let mut wrong = physical;
    wrong.dictionary_tables = vec!["Other".into()];
    assert!(physical::check(&module, None, &wrong)
        .unwrap_err()
        .contains("String keys"));
    fs::write(
        directory.join("selected.mjs"),
        ink_lowering_js::lower_planned(&plan).unwrap().javascript,
    )
    .unwrap();
    fs::write(directory.join("run.mjs"),r#"
import assert from 'node:assert/strict';import * as a from './ordinary.mjs';import * as b from './selected.mjs';
const x=a.createState(),y=b.createState(),keys=['','__proto__','constructor','toString','0','01','2','9999999999','雪','a\0','e\u0301','é','𐀀','\ue000','😀'];
const check=async()=>{for(const k of keys)for(const q of ['row','flag','unit'])assert.deepEqual(y.invoke(q,[k]),x.invoke(q,[k]));for(const q of ['keys','values'])assert.deepEqual(y.invoke(q,[]),x.invoke(q,[]));assert.deepEqual(y.outbox,x.outbox);assert.deepEqual(await y.checkpoint(),await x.checkpoint());};
let seed=314159;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let i=0;i<250;i++){const key=keys[random(keys.length)],fail=random(5)===0,name=random(3)?'put':'erase',args=name==='put'?[key,i%7,fail]:[key,fail];assert.deepEqual(y.invoke(name,args),x.invoke(name,args));if(i%10===0)await check();}
await check();for(const name of ['put','erase']){const args=name==='put'?['__proto__',0,false]:['__proto__',false],p=x.prepare(name,args),q=y.prepare(name,args);assert.deepEqual(y.invokePrepared(q),x.invokePrepared(p));}
await check();const saved=await x.checkpoint();await y.restore(saved);assert.deepEqual(await y.checkpoint(),saved);await x.restore(await y.checkpoint());
x.beginTransaction();y.beginTransaction();assert.deepEqual(y.invoke('put',['rollback',1,false]),x.invoke('put',['rollback',1,false]));assert.deepEqual(y.invoke('erase',['__proto__',false]),x.invoke('erase',['__proto__',false]));x.rollbackTransaction();y.rollbackTransaction();await check();
for(const state of [x,y])assert.throws(()=>state.transaction(s=>{s.invoke('put',['strict',1,false]);s.invoke('put',['strict-fail',2,true]);}),/transaction action failed/);await check();
const left=[],right=[],sx=x.subscribe('keys',[],v=>left.push(v)),sy=y.subscribe('keys',[],v=>right.push(v));assert.deepEqual(y.invoke('put',['observer',7,false]),x.invoke('put',['observer',7,false]));await Promise.resolve();await Promise.resolve();assert.deepEqual(right,left);sx();sy();await check();
assert.deepEqual(y.invoke('put',['__proto__',0,false]),x.invoke('put',['__proto__',0,false]));await check();assert.equal(y.invoke('unit',['__proto__']).result.Some,null);assert.equal(y.invoke('flag',['__proto__']).result.Some,false);
"#).unwrap();
    let result = Command::new("node")
        .arg(directory.join("run.mjs"))
        .output()
        .unwrap();
    fs::remove_dir_all(directory).unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
}
