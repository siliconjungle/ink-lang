use serde_json::{json, Value};
use std::{fs, path::PathBuf, process::Command};
use verified_language::{core::CheckedModule, stateful::Runtime, syntax::parse};

const SOURCE: &str = r#"
module memo;
enum Error { Failed, }
record Row { value:u64, active:Bool, }
record Pair { left:List<Row>, right:List<Row>, }
state Rows:Table<u64,Row> = Table.empty();
state Other:Table<u64,u64> = Table.empty();
keep total:u64 = sum(Rows.values().map(fn(row)=>row.value));
keep doubled:u64 = total+total;
keep values:List<Row> = Rows.values();
event seen:u64;
change put(key:u64,row:Row)->Result<Unit,Error> writes(Rows) emits(seen){Rows.put(key,row);emit seen(row.value);return Ok(());}
change other(key:u64,value:u64)->Result<Unit,Error> writes(Other){Other.put(key,value);return Ok(());}
change observed_abort(key:u64,row:Row)->Result<Unit,Error> writes(Rows) reads(doubled) emits(seen){Rows.put(key,row);emit seen(doubled);return Err(Error.Failed);}
query total_query()->u64 reads(total){return total;}
query twice()->u64 reads(doubled){return doubled;}
query rows()->List<Row> reads(values){return values;}
query pair()->Pair reads(Rows){let rows:List<Row> = Rows.values();return Pair{left:rows,right:rows};}
"#;

fn dir(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("build/signals-state-tests")
        .join(name)
}
fn run_node(path: &std::path::Path) {
    let out = Command::new("node").arg(path).output().unwrap();
    assert!(
        out.status.success(),
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
}
#[test]
fn scalar_keeps_retain_exact_values_across_actions_abort_restore_and_host_rollback() {
    let p = parse(SOURCE).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let mut code = verified_language::javascript::lower(&module)
        .unwrap()
        .javascript;
    assert!(code.contains("function __computeKeep0"));
    assert!(code.contains("function __computeKeep1"));
    assert!(
        !code.contains("function __computeKeep2"),
        "mutable composite keeps must retain their ownership path"
    );
    code.insert_str(0, "const keepRuns=[0,0];\n");
    for i in 0..2 {
        code = code.replace(
            &format!("function __computeKeep{i}(ctx,rt){{"),
            &format!("function __computeKeep{i}(ctx,rt){{keepRuns[{i}]++;"),
        );
    }
    let mut oracle = Runtime::new(p).unwrap();
    let calls = vec![
        ("put", json!([0,{"value":11,"active":true}])),
        ("twice", json!([])),
        ("total_query", json!([])),
        ("twice", json!([])),
        ("other", json!([0, 7])),
        ("twice", json!([])),
        ("observed_abort", json!([0,{"value":99,"active":false}])),
        ("twice", json!([])),
        ("total_query", json!([])),
    ];
    let history: Vec<Value> = calls.iter().map(|(name,args)| json!({"name":name,"args":args,"expected":oracle.invoke_json(name,args).unwrap().json()})).collect();
    code.push_str(&format!(
        "const history={};\n",
        serde_json::to_string(&history).unwrap()
    ));
    code.push_str(r#"
import assert from 'node:assert/strict';
const state=createState();
const normalized=x=>JSON.parse(JSON.stringify(x,(_k,v)=>typeof v==='bigint'?Number(v):v));
for(const item of history)assert.deepEqual(normalized(state.invoke(item.name,item.args)),item.expected);
assert.deepEqual(keepRuns,[2,2]); // one cold calculation and one inside the aborted action
for(let i=0;i<100;i++)assert.equal(state.invoke('twice',[]).result,22n);
assert.deepEqual(keepRuns,[2,2]);
const before=await state.checkpoint();
state.beginTransaction();state.invoke('put',[0n,{value:17n,active:true}]);
assert.equal(state.invoke('twice',[]).result,34n);
state.rollbackTransaction();assert.equal(state.invoke('twice',[]).result,22n);
assert.deepEqual(await state.checkpoint(),before);
state.invoke('put',[0n,{value:18446744073709551615n,active:true}]);
state.invoke('put',[1n,{value:2n,active:false}]);
assert.equal(state.invoke('total_query',[]).result,1n);assert.equal(state.invoke('twice',[]).result,2n);
await state.restore(before);assert.equal(state.invoke('twice',[]).result,22n);
const runs=keepRuns.slice();await assert.rejects(state.restore(new Uint8Array([0])));
assert.equal(state.invoke('twice',[]).result,22n);assert.deepEqual(keepRuns,runs);
const rows=state.invoke('rows',[]).result;rows.length=0;
assert.equal(state.invoke('rows',[]).result.length,1);
const detached=state.invoke('rows',[]).result;detached[0].value=999n;
assert.equal(state.invoke('rows',[]).result[0].value,11n);
assert.equal(state.invoke('total_query',[]).result,11n);
const shared=state.invoke('pair',[]).result;assert.strictEqual(shared.left,shared.right);shared.left[0].value=555n;assert.equal(state.invoke('rows',[]).result[0].value,11n);
const publicEvents=state.outbox;publicEvents.length=0;assert(state.outbox.length>0);
"#);
    let dir = dir("keeps");
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join("run.mjs");
    fs::write(&path, code).unwrap();
    run_node(&path);
}

#[test]
fn bound_actions_preserve_observations_capture_inputs_and_keep_events_when_result_only() {
    let module = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    let mut code = verified_language::javascript::lower(&module)
        .unwrap()
        .javascript;
    code.push_str(r#"
import assert from 'node:assert/strict';
const normal=createState(),bound=createState();
const put=bound.bind('put'),sum=bound.bind('total_query'),abort=bound.bind('observed_abort');
for(let i=0;i<40;i++){const row={value:BigInt(i*3),active:i%2===0};assert.deepEqual(put(BigInt(i%7),row),normal.invoke('put',[BigInt(i%7),row]));row.value=99999n;assert.deepEqual(sum(),normal.invoke('total_query',[]));}
assert.deepEqual(abort(0n,{value:99n,active:true}),normal.invoke('observed_abort',[0n,{value:99n,active:true}]));
assert.deepEqual(await bound.checkpoint(),await normal.checkpoint());
const scalar=bound.bind('total_query',{resultOnly:true});assert.equal(scalar(),sum().result);
const putValue=bound.bind('put',{resultOnly:true});assert.deepEqual(putValue(8n,{value:29n,active:true}),{Ok:null});
normal.invoke('put',[8n,{value:29n,active:true}]);
assert.deepEqual(bound.outbox,normal.outbox);assert.deepEqual(await bound.checkpoint(),await normal.checkpoint());
assert.throws(()=>bound.bind('missing'),/unknown action/);
bound.beginTransaction();putValue(0n,{value:123n,active:true});bound.rollbackTransaction();
assert.deepEqual(await bound.checkpoint(),await normal.checkpoint());
assert.equal(scalar(),normal.invoke('total_query',[]).result);
"#);
    let dir = dir("bound");
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join("run.mjs");
    fs::write(&path, code).unwrap();
    run_node(&path);
}

#[test]
fn unchanged_scalar_writes_preserve_keeps_but_still_commit_and_publish() {
    let source="module stable;state Rows:Table<u64,u64> = Table.empty();keep total:u64=sum(Rows.values());event changed:u64;change put(key:u64,value:u64)->Result<Unit,String> writes(Rows) emits(changed){Rows.put(key,value);emit changed(value);return Ok(());}query total_query()->u64 reads(total){return total;}";
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut code = verified_language::javascript::lower(&module)
        .unwrap()
        .javascript;
    code.insert_str(0, "let runs=0;\n");
    code = code.replace(
        "function __computeKeep0(ctx,rt){",
        "function __computeKeep0(ctx,rt){runs++;",
    );
    code.push_str(r#"
import assert from 'node:assert/strict';const state=createState();
state.invoke('put',[0n,7n]);assert.equal(state.invoke('total_query',[]).result,7n);
const reply=state.invoke('put',[0n,7n]);assert.equal(reply.version,2n);assert.equal(reply.events.length,1);
assert.equal(state.invoke('total_query',[]).result,7n);assert.equal(runs,1);
state.invoke('put',[0n,9n]);assert.equal(state.invoke('total_query',[]).result,9n);assert.equal(runs,2);
"#);
    let dir = dir("unchanged");
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join("run.mjs");
    fs::write(&path, code).unwrap();
    run_node(&path);
}

#[test]
fn private_representation_calls_have_owned_outputs_and_stack_safe_replay() {
    let module = CheckedModule::from_source(
        parse(include_str!("../examples/filtered-aggregate.ink")).unwrap(),
    )
    .unwrap();
    let request = serde_json::from_slice(
        &fs::read("knowledge/research/indexed-aggregate/request.json").unwrap(),
    )
    .unwrap();
    let checked = verified_language::representation::check(&module, &request).unwrap();
    let mut code = ink_lowering_js::representation_program::lower(&checked).unwrap();
    code.insert_str(0, "let fallbackCalls=0;\n");
    code = code.replace("return __run(d_", "fallbackCalls++;return __run(d_");
    let dir = dir("representation");
    fs::create_dir_all(&dir).unwrap();
    fs::write(
        dir.join("ordinary.mjs"),
        verified_language::javascript::lower(&module)
            .unwrap()
            .javascript,
    )
    .unwrap();
    code.push_str(r#"
import assert from 'node:assert/strict';import {createState as ordinary} from './ordinary.mjs';
const source=ordinary(),state=createState();
for(let i=0;i<512;i++)source.invoke('put',[BigInt(i),BigInt(i),i%2===0,false]);
source.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);
const saved=await source.checkpoint();await state.restore(saved);
assert(fallbackCalls>0,'deep list encoder must replay on the explicit stack');
assert.equal(__directDepth,0);assert.strictEqual(__nullaryNode(0),__nullaryNode(0));
const put=state.bind('put'),erase=state.bind('erase'),total=state.bind('total_query'),count=state.bind('count_query');
for(let i=0;i<48;i++){
 const key=BigInt((i*37)%512),value=i%7===0?18446744073709551615n:BigInt(i*29);
 assert.deepEqual(put(key,value,i%3===0,false),source.invoke('put',[key,value,i%3===0,false]));
 assert.deepEqual(total(),source.invoke('total_query',[]));assert.deepEqual(count(),source.invoke('count_query',[]));
 assert.deepEqual(erase(key,true),source.invoke('erase',[key,true]));
}

assert.equal(__directDepth,0);assert.deepEqual(await state.checkpoint(),await source.checkpoint());
const readValue=state.bind('total_query',{resultOnly:true});assert.equal(readValue(),total().result);
const old=await state.checkpoint();state.beginTransaction();put(0n,999n,true,false);state.rollbackTransaction();assert.deepEqual(await state.checkpoint(),old);
assert.equal(readValue(),source.invoke('total_query',[]).result);
assert.throws(()=>state.bind('missing'),/unknown action/);
assert(state.invoke('total_query',[]) instanceof Promise);
"#);
    let path = dir.join("run.mjs");
    fs::write(&path, code).unwrap();
    run_node(&path);
}

#[test]
fn single_probe_tables_distinguish_absence_from_all_falsy_values() {
    let source = r#"module falsy;
state Flags:Table<u64,Bool> =Table.empty();state Units:Table<u64,Unit> =Table.empty();state Words:Table<u64,u64> =Table.empty();state Text:Table<u64,String> =Table.empty();
change fill()->Result<Unit,String> writes(Flags,Units,Words,Text){Flags.put(0,false);Units.put(0,());Words.put(0,0);Text.put(0,"");return Ok(());}
query get_flag(key:u64)->Option<Bool> reads(Flags){return Flags.get(key);}
query get_unit(key:u64)->Option<Unit> reads(Units){return Units.get(key);}
query get_word(key:u64)->Option<u64> reads(Words){return Words.get(key);}
query get_text(key:u64)->Option<String> reads(Text){return Text.get(key);}
change remove()->Result<Unit,String> writes(Flags,Units,Words,Text){Flags.remove(0);Units.remove(0);Words.remove(0);Text.remove(0);return Ok(());}"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut code = verified_language::javascript::lower(&module)
        .unwrap()
        .javascript;
    code.push_str(r#"
import assert from 'node:assert/strict';const s=createState();s.invoke('fill',[]);
for(const [name,value] of [['get_flag',false],['get_unit',null],['get_word',0n],['get_text','']]){assert.deepEqual(s.invoke(name,[0n]).result,{Some:value});assert.deepEqual(s.bind(name,{resultOnly:true})(0n),{Some:value});assert.deepEqual(s.invoke(name,[1n]).result,{None:null});}
s.invoke('remove',[]);for(const name of ['get_flag','get_unit','get_word','get_text'])assert.deepEqual(s.invoke(name,[0n]).result,{None:null});
"#);
    let dir = dir("falsy");
    fs::create_dir_all(&dir).unwrap();
    let path = dir.join("run.mjs");
    fs::write(&path, code).unwrap();
    run_node(&path);
}

#[test]
fn recursive_public_results_are_detached_and_lazy_schema_copies_terminate() {
    let module = CheckedModule::from_source(
        parse(include_str!("../examples/recursive-indexed.ink")).unwrap(),
    )
    .unwrap();
    let root = dir("recursive-results");
    fs::create_dir_all(&root).unwrap();
    fs::write(
        root.join("state.mjs"),
        verified_language::javascript::lower(&module)
            .unwrap()
            .javascript,
    )
    .unwrap();
    fs::write(root.join("run.mjs"),r#"
import assert from 'node:assert/strict';import {createState} from './state.mjs';
const state=createState(),put=state.bind('put'),get=state.bind('get',{resultOnly:true});
const leaf={value:3n,children:[],next:{None:null}},row={value:11n,children:[leaf],next:{Some:leaf}};
const reply=put(1n,row,false);row.children[0].value=99n;
assert.equal(reply.events[0].value.children[0].value,3n);
const first=get(1n);first.Some.children[0].value=88n;first.Some.next.Some.children.push({value:8n,children:[],next:{None:null}});
const second=get(1n);assert.equal(second.Some.children[0].value,3n);assert.equal(second.Some.next.Some.children.length,0);
const saved=await state.checkpoint();await state.restore(saved);assert.deepEqual(get(1n),second);
"#).unwrap();
    run_node(&root.join("run.mjs"));
}
