use ink_core::{core::CheckedModule, physical, planning, syntax::parse};
use std::{fs, process::Command};
#[path="support/record_codec.rs"] mod record_codec;
use record_codec::layout;
#[test]
fn selected_private_records_preserve_public_values_capture_transactions_and_checkpoints() {
    let source = r#"module private_records;
record Child { words:List<u32>, flag:Bool, }
record arguments { value:u32, }
fn collision(value:arguments,other:u32)->u32{return value.value+other;}
record Wrap { value:Child, }
record Outer { value:Wrap, }
record Pair { first:Outer, second:Wrap, }
record Float { value:f32, }
record Exact { value:Int, }
record Proto { __proto__:String, }
enum Tree { Leaf(u32), Node(List<Tree>), }
record Packet { pair:Pair, float:Float, exact:Exact, proto:Proto, tree:Tree, }
enum Error { Failed, }
state Items:Table<u32,Packet> = Table.empty();
event changed:Tree;
change put(key:u32,packet:Packet,fail:Bool)->Result<Unit,Error> writes(Items) emits(changed) {Items.put(key,packet);emit changed(packet.tree);if fail{return Err(Error.Failed);}return Ok(());}
query get(key:u32)->Option<Packet> reads(Items) {return Items.get(key);}
query echo(packet:Packet)->Packet {return packet;}
fn identity(packet:Packet)->Packet{return packet;}
fn identity_tree(tree:Tree)->Tree{return tree;}
fn leaf(value:u32)->Tree{return Tree.Leaf(value);}
fn branch(tree:Tree)->Tree{return Tree.Node(list(tree));}
fn floats(values:List<Float>)->List<Float>{return values.map(fn(v)=>Float{value:v.value});}
fn read(value:Outer)->u32{return value.value.value.words.at_or(0,0);}
fn ignored(value:Outer)->u32{return 42;}
fn eq(a:Packet,b:Packet)->Bool{return a==b;}
"#;
    let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let records = checked
        .program()
        .records
        .iter()
        .filter(|(_, fs)| fs.len() == 1)
        .map(|(n, _)| layout(&checked, n))
        .collect::<Vec<_>>();
    let mut physical:physical::Plan=serde_json::from_value(serde_json::json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":checked.identity().unwrap(),"record_elisions":records})).unwrap();
    physical
        .record_elisions
        .sort_by(|a, b| a.record.cmp(&b.record));
    let plan = planning::check(
        &checked,
        &planning::Package {
            schema: 1,
            semantics: planning::SEMANTICS.into(),
            input_core_sha256: checked.identity().unwrap(),
            steps: vec![planning::Step::Physical(physical)],
        },
    )
    .unwrap();
    plan.require_record_elision_capability(false).unwrap_err();
    let selected = ink_lowering_js::lower_planned(&plan).unwrap();
    let ordinary = ink_lowering_js::lower(&checked).unwrap();
    assert!(!selected.manifest["private_record_elisions"]
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(selected.manifest["wire"], ordinary.manifest["wire"]);
    let dir = std::env::temp_dir().join(format!("ink-record-elision-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let extra="\nexport {__stateMetadata,__stateInputCaptures};export function wireCaptureProbe(value,limits,literal){const codec=compiledValues.identity.params[0];let budget;try {budget=createValueCaptureBudget(limits);const owned=literal?__compiledBindings.get(codec).capture(value,budget,0):wireCapturePlan(wireValuePlan(valueCodecs.identity.result)).capture(value,budget,0);const result=literal?codec.materialize(__compiledHandle(codec.identity,owned)):owned;return {value:result,remaining:budget.remaining,bytes:budget.bytes};}catch(e){return {error:e.message,remaining:budget?.remaining,bytes:budget?.bytes};}}export function captureProbe(value,cells,depth){const a=__stateMetadata.actions.find(a=>a.name==='echo'),budget={cells};try {const owned=__stateInputCaptures[a.index][0](value,budget,depth);return {value:__stateOutput(owned,a.params[0].type),cells:budget.cells};}catch(e){return {error:e.message,cells:budget.cells};}}";
    fs::write(dir.join("private.mjs"), selected.javascript + extra).unwrap();
    fs::write(dir.join("ordinary.mjs"), ordinary.javascript + extra).unwrap();
    fs::write(dir.join("test.mjs"),r#"
import assert from 'node:assert/strict';import * as ink from './private.mjs';import * as plain from './ordinary.mjs';
const tree=plain.call('branch',[plain.call('branch',[plain.call('leaf',[7])])]);
const child={words:[1,2,3],flag:true},wrapped={value:child};
const packet={pair:{first:{value:wrapped},second:wrapped},float:{value:{F32Bits:0x7fc12345}},exact:{value:{Int:'-12345678901234567890'}},proto:{['__proto__']:'own'},tree};
const p=plain.valueCodecs.identity.arguments.capture({packet}).packet;
const identity=ink.call('identity',[packet]);assert.deepEqual(identity,plain.call('identity',[packet]));assert.equal(Object.hasOwn(identity.proto,'__proto__'),true);assert.equal(Object.getPrototypeOf(identity.proto),Object.prototype);
assert.equal(ink.call('read',[packet.pair.first]),1);assert.equal(ink.call('ignored',[packet.pair.first]),42);
for(const t of [tree,plain.call('leaf',[0]),plain.call('branch',[tree])]){assert.deepEqual(ink.call('identity_tree',[t]),t);assert.deepEqual(ink.call('branch',[t]),plain.call('branch',[t]));}
for(const bits of [0x80000000,0x7fc12345,0xffc12345,0x7f800000,0x3f800000]){
 const values=[{value:{F32Bits:bits}}],a=ink.call('floats',[values]),b=plain.call('floats',[values]);assert.deepEqual(a,b);
 const destination=new Array(3);assert.equal(ink.callInto('floats',[values],destination),1);assert.deepEqual(destination[0],b[0]);assert.equal(1 in destination,false);
}
assert.equal(ink.call('eq',[packet,packet]),true);assert.equal(ink.call('eq',[packet,{...packet,proto:{['__proto__']:'other'}}]),false);
const objects=v=>{const found=new Set(),visit=x=>{if(x&&typeof x==='object'&&!found.has(x)){found.add(x);Object.values(x).forEach(visit);}};visit(v);return found;};
const owned=ink.callOwned('identity',[packet]);assert.deepEqual(owned,p);for(const x of objects(owned))assert.equal(objects(packet).has(x),false);
for(const limits of [{nodes:0},{nodes:2},{nodes:20},{depth:0},{depth:3},{depth:128},{bytes:1},{bytes:1000000}]){const outcome=fn=>{try{return fn();}catch(e){return e.message;}};assert.deepEqual(outcome(()=>ink.callOwned('identity',[packet],limits)),outcome(()=>plain.callOwned('identity',[packet],limits)));}
for(const compact of [false,true]){const args=ink.valueCodecs.identity.arguments,result=ink.valueCodecs.identity.result,request=(compact?args.compact():args).encode({packet}),reply=(compact?ink.callCompact:ink.callBinary)('identity',request);assert.deepEqual(reply,(compact?plain.callCompact:plain.callBinary)('identity',request));assert.deepEqual((compact?result.compact():result).decode(reply),p);}
const invalid=[packet,null,{...packet,proto:{}},{...packet,pair:{first:{value:wrapped}}},{...packet,float:{value:'x'}},{...packet,tree:{payload:{Ok:4}}}];
for(const value of invalid)for(const cells of [0,1,2,10,50,1000000])for(const depth of [0,63,64,65])assert.deepEqual(ink.captureProbe(value,cells,depth),plain.captureProbe(value,cells,depth));
for(const cells of [1,2,10,50,1000000]){const trace=mod=>{let reads=[];const host={};for(const key of Object.keys(packet))Object.defineProperty(host,key,{enumerable:true,get(){reads.push(key);return packet[key];}});return {reads,result:mod.captureProbe(host,cells,0)};};assert.deepEqual(trace(ink),trace(plain));}
const state=ink.createState(),control=plain.createState();
for(const [key,value,fail]of [[0,packet,false],[1,packet,true],[0,{...packet,proto:{['__proto__']:'new'}},true],[2,packet,false]]){
 assert.deepEqual(state.invoke_json('put',[key,value,fail]),control.invoke_json('put',[key,value,fail]));
 assert.deepEqual(state.invoke_json('get',[key]),control.invoke_json('get',[key]));
 assert.deepEqual(await state.checkpoint(),await control.checkpoint());
}
const first=state.invoke_json('get',[0]).result.Some;first.pair.first.value.value.words[0]=999;assert.equal(state.invoke_json('get',[0]).result.Some.pair.second.value.words[0],1);
const prepared=state.prepare('echo',[packet]);assert.deepEqual(state.invokePrepared(prepared),control.invokePrepared(control.prepare('echo',[packet])));
const ordinaryBytes=await control.checkpoint(),privateBytes=await state.checkpoint();assert.deepEqual(ordinaryBytes,privateBytes);
const restored=ink.createState(),restoredPlain=plain.createState();await restored.restore(ordinaryBytes);await restoredPlain.restore(privateBytes);assert.deepEqual(restored.invoke_json('get',[0]),restoredPlain.invoke_json('get',[0]));assert.deepEqual(await restored.checkpoint(),ordinaryBytes);
for(const limits of [{values:0},{values:2},{depth:0},{depth:2},{bytes:200}]){const outcome=async fn=>{try{return await fn();}catch(e){return e.message;}};assert.deepEqual(await outcome(()=>state.checkpoint(limits)),await outcome(()=>control.checkpoint(limits)));assert.deepEqual(await outcome(()=>restored.restore(ordinaryBytes,limits)),await outcome(()=>restoredPlain.restore(ordinaryBytes,limits)));}

const c=ink.compiledValues.collision,collisionResult=ink.callCompiled('collision',[c.params[0].capture({value:3}),c.params[1].capture(4)]);assert.equal(c.result.materialize(collisionResult),7);const collisionBytes=ink.valueCodecs.collision.arguments.encode({value:{value:3},other:4});assert.deepEqual(ink.callBinary('collision',collisionBytes),plain.callBinary('collision',collisionBytes));
const inputCodec=ink.compiledValues.identity.params[0],resultCodec=ink.compiledValues.identity.result;
const inputHandle=inputCodec.capture(packet),resultHandle=ink.callCompiled('identity',[inputHandle]);
const reduce=resultCodec.reducer(node=>{
 if(node.kind==='record')return (...values)=>Object.fromEntries(node.fields.map((name,index)=>[name,values[index]]));
 if(node.kind==='list'||node.kind==='vector')return {start:()=>[],step:(out,value)=>{out.push(value);return out;},finish:out=>out};
 if(node.kind==='result')return (tag,value)=>tag?{Err:value}:{Ok:value};
 if(node.kind==='option')return (tag,value)=>tag?{Some:value}:{None:null};
 return value=>value;
});
assert.deepEqual(reduce(resultHandle),resultCodec.materialize(resultHandle));
const reduced=reduce(resultHandle);reduced.pair.first.value.value.words[0]=99;reduced.float.value.F32Bits=0;
assert.deepEqual(reduce(resultHandle),resultCodec.materialize(resultHandle));
for(const value of [...invalid,{...packet,extra:1},{...packet,exact:{value:{Int:'-0'}}},{...packet,proto:{['__proto__']:'\ud800'}},{...packet,float:{value:Infinity}}])for(const limits of [{nodes:0},{nodes:1},{nodes:2},{nodes:5},{nodes:20},{nodes:1000000},{depth:0},{depth:1},{depth:3},{depth:128},{bytes:0},{bytes:40},{bytes:41},{bytes:50},{bytes:200},{bytes:16777216}])assert.deepEqual(ink.wireCaptureProbe(value,limits,true),ink.wireCaptureProbe(value,limits,false));
for(const limits of [{nodes:1},{nodes:2},{nodes:10},{nodes:1000000},{bytes:40},{bytes:100},{depth:2}]){const trace=literal=>{const reads=[],host={};for(const key of Object.keys(packet))Object.defineProperty(host,key,{enumerable:true,get(){reads.push(key);return packet[key];}});return {result:ink.wireCaptureProbe(host,limits,literal),reads};};assert.deepEqual(trace(true),trace(false));}

assert.equal(Object.isFrozen(inputHandle),true);assert.equal(Object.getPrototypeOf(inputHandle),null);assert.deepEqual(Object.keys(inputHandle),[]);
assert.deepEqual(resultCodec.materialize(resultHandle),p);
const publicReply=resultCodec.materialize(resultHandle);publicReply.pair.first.value.value.words[0]=88;assert.equal(resultCodec.materialize(resultHandle).pair.first.value.value.words[0],1);
assert.deepEqual(inputCodec.materialize(inputHandle),p);
assert.throws(()=>ink.callCompiled('identity',[{}]),/owner mismatch/);
assert.throws(()=>ink.callCompiled('identity',[plain.compiledValues.identity.params[0].capture(packet)]),/owner mismatch/);
assert.throws(()=>ink.callCompiled('identity',[ink.compiledValues.read.params[0].capture(packet.pair.first)]),/type/);
assert.throws(()=>ink.callCompiled('identity',[]),/unsupported/);
assert.throws(()=>ink.callCompiled('missing',[inputHandle]),/unsupported/);
for(const compact of [false,true]){
 const portable=compact?inputCodec.encodeCompact(inputHandle):inputCodec.encode(inputHandle);
 const expected=(compact?ink.valueCodecs.identity.result.compact():ink.valueCodecs.identity.result).encode(p);
 assert.deepEqual(portable,expected);
 const decoded=compact?inputCodec.decodeCompact(portable):inputCodec.decode(portable);
 assert.deepEqual(resultCodec.materialize(ink.callCompiled('identity',[decoded])),p);
 for(let i=0;i<portable.length;i++){
  const bad=portable.slice();bad[i]^=255;
  const accepts=fn=>{try{fn();return true;}catch{return false;}};
  assert.equal(accepts(()=>compact?inputCodec.decodeCompact(bad):inputCodec.decode(bad)),accepts(()=>(compact?ink.valueCodecs.identity.result.compact():ink.valueCodecs.identity.result).decode(bad)));
 }
}
for(const limits of [{nodes:0},{nodes:2},{nodes:20},{depth:0},{depth:3},{depth:128},{bytes:1},{bytes:1000000}]){
 const outcome=fn=>{try{return fn();}catch(e){return {error:e.message};}};
 assert.deepEqual(outcome(()=>inputCodec.materialize(inputHandle,limits)),outcome(()=>ink.callOwned('identity',[packet],limits)));
 for(const compact of [false,true])assert.deepEqual(outcome(()=>compact?inputCodec.encodeCompact(inputHandle,limits):inputCodec.encode(inputHandle,limits)),outcome(()=>(compact?ink.valueCodecs.identity.result.compact():ink.valueCodecs.identity.result).encode(p,limits)));
}
const detachedHost=structuredClone(packet),captured=inputCodec.capture(detachedHost);detachedHost.pair.first.value.value.words[0]=999;assert.equal(inputCodec.materialize(captured).pair.first.value.value.words[0],1);
const leafHandle=ink.compiledValues.leaf.params[0].capture(9),compiledLeaf=ink.callCompiled('leaf',[leafHandle]);
const compiledBranch=ink.callCompiled('branch',[compiledLeaf]);assert.deepEqual(ink.compiledValues.branch.result.materialize(compiledBranch),plain.callOwned('branch',[plain.call('leaf',[9])]));

console.log('private record conformance passed');
"#).unwrap();
    let result = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
#[test]
fn private_records_work_in_native_float_pure_modules() {
    let checked=CheckedModule::from_source(parse("module private_float;record Float{value:f32,} fn copy(x:Float)->Float{return Float{value:x.value};} fn add(x:Float)->Float{return Float{value:x.value+x.value};} fn many(xs:List<Float>)->List<Float>{return xs.map(fn(x)=>Float{value:x.value});}").unwrap()).unwrap();
    let physical:physical::Plan=serde_json::from_value(serde_json::json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":checked.identity().unwrap(),"record_elisions":[layout(&checked,"Float")]})).unwrap();
    let plan = planning::check(
        &checked,
        &planning::Package {
            schema: 1,
            semantics: planning::SEMANTICS.into(),
            input_core_sha256: checked.identity().unwrap(),
            steps: vec![planning::Step::Physical(physical)],
        },
    )
    .unwrap();
    let dir = std::env::temp_dir().join(format!("ink-record-elision-float-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    fs::write(
        dir.join("private.mjs"),
        ink_lowering_js::lower_planned(&plan).unwrap().javascript,
    )
    .unwrap();
    fs::write(
        dir.join("ordinary.mjs"),
        ink_lowering_js::lower(&checked).unwrap().javascript,
    )
    .unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from 'node:assert/strict';import * as ink from './private.mjs';import * as plain from './ordinary.mjs';
 for(const bits of [0,0x80000000,0x7f800000,0xff800000,0x7fc12345,0xffc12345,0x3fc00000]){const value={value:{F32Bits:bits}},codec=ink.compiledValues.copy.params[0],h=codec.capture(value),reply=ink.callCompiled('copy',[h]);assert.deepEqual(ink.compiledValues.copy.result.materialize(reply),plain.callOwned('copy',[value]));for(const compact of [false,true]){const bytes=compact?codec.encodeCompact(reply):codec.encode(reply),decoded=compact?codec.decodeCompact(bytes):codec.decode(bytes);assert.deepEqual(codec.materialize(decoded),codec.materialize(reply));}}
 for(const bits of [0,0x80000000,0x7f800000,0xff800000,0x7fc12345,0xffc12345,0x3fc00000]){const value={value:{F32Bits:bits}};for(const name of ['copy','add']){assert.deepEqual(ink.call(name,[value]),plain.call(name,[value]));assert.deepEqual(ink.callOwned(name,[value]),plain.callOwned(name,[value]));}const destination=new Array(2);assert.equal(ink.callInto('many',[[value]],destination),1);assert.deepEqual(destination[0],plain.call('copy',[value]));for(const compact of [false,true]){const request=(compact?ink.valueCodecs.copy.arguments.compact():ink.valueCodecs.copy.arguments).encode({x:value});assert.deepEqual((compact?ink.callCompact:ink.callBinary)('copy',request),(compact?plain.callCompact:plain.callBinary)('copy',request));}}
 "#).unwrap();
    let result = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
