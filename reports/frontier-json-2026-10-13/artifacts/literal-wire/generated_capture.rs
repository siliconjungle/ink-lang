use ink_core::{core::CheckedModule, syntax::parse};
use std::{fs, process::Command};

#[test]
fn emitted_schema_capture_matches_reference_validation_and_resource_counts() {
    let source = r#"module generated_capture;
enum Tree { Leaf(u32), Node(List<Tree>), }
enum Mode { On, Off, }
id Tag;
record Packet { tree:Tree, words:List<u32>, pair:Vec2<f32>, option:Option<u32>, result:Result<Unit,String>, wide:u64, exact:Int, tag:Tag, mode:Mode, __proto__:String, }
fn leaf()->Tree { return Tree.Leaf(7); }
fn node(tree:Tree)->Tree { return Tree.Node(list(tree)); }
fn owned_packet(packet:Packet)->Packet { return packet; }
fn owned_tree(tree:Tree)->Tree { return tree; }
fn owned_words(words:List<u32>)->List<u32> { return words; }
query echo(packet:Packet)->Packet { return packet; }
"#;
    let checked = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let emitted = ink_lowering_js::lower(&checked).unwrap();
    assert!(emitted.javascript.contains("function __ownedInput"));
    let root = std::env::temp_dir().join(format!("ink-generated-capture-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"), format!("{}\nexport{{__stateMetadata,__stateInputCaptures}};export function reference(v,t,b,d){{return __stateInput(v,t,b,d);}}", emitted.javascript)).unwrap();
    fs::write(root.join("test.mjs"), r#"
import assert from 'node:assert/strict';import {call,callOwned,valueCodecs,ValueCodec,createState,__stateMetadata,__stateInputCaptures,reference}from './program.mjs';
const a=__stateMetadata.actions.find(a=>a.name==='echo'),capture=__stateInputCaptures[a.index][0],type=a.params[0].type;
const tree=call('node',[call('node',[call('leaf',[])])]);
const packet={tree,words:[0,4294967295],pair:[-0,{F32Bits:0x7fc12345}],option:{Some:4},result:{Err:'雪'},wide:18446744073709551615n,exact:{Int:'-12345678901234567890'},tag:'0123456789ABCDEF0123456789ABCDEF',mode:'Mode.Off',['__proto__']:'own'};
const objects=v=>{const found=new Set(),visit=x=>{if(x&&typeof x==='object'&&!found.has(x)){found.add(x);for(const y of Object.values(x))visit(y);}};visit(v);return found;};
for(const [name,input]of [['owned_packet',packet],['owned_tree',tree],['owned_words',new Uint32Array([1,2,3])]]){
 const codec=valueCodecs[name].result,plain=call(name,[input]),bytes=codec.encode(plain),owned=callOwned(name,[input]);
 assert.deepEqual(owned,codec.decode(bytes));const original=objects(input);for(const node of objects(owned))assert.equal(original.has(node),false);
 const generic=new ValueCodec(codec.descriptor);assert.deepEqual(codec.decode(bytes),generic.decode(bytes));
 for(let i=0;i<bytes.length;i++){const bad=bytes.slice();bad[i]^=255;const accepts=fn=>{try{fn();return true;}catch{return false;}};assert.equal(accepts(()=>codec.decode(bad)),accepts(()=>generic.decode(bad)));}
 const compact=codec.compact(),plainCompact=generic.compact(),short=compact.encode(plain);assert.deepEqual(compact.decode(short),plainCompact.decode(short));
 for(let i=0;i<short.length;i++){const bad=short.slice();bad[i]^=255;const accepts=fn=>{try{fn();return true;}catch{return false;}};assert.equal(accepts(()=>compact.decode(bad)),accepts(()=>plainCompact.decode(bad)));}
 for(const limits of [{bytes:bytes.length},{bytes:bytes.length-1},{nodes:0},{nodes:1},{nodes:10},{depth:0},{depth:1},{depth:128}]){
  const accepts=fn=>{try{fn();return true;}catch{return false;}};assert.equal(accepts(()=>callOwned(name,[input],limits)),accepts(()=>codec.encode(plain,limits)));
 }
}
const ownedPacket=callOwned('owned_packet',[packet]);assert.equal(Object.getPrototypeOf(ownedPacket),Object.prototype);assert.equal(Object.hasOwn(ownedPacket,'__proto__'),true);ownedPacket.words[0]=55;assert.equal(packet.words[0],0);
assert.throws(()=>callOwned('toString',[]),/unsupported/);
const inherited=Object.assign(Object.create({noise:1}),{Some:4});
const hidden={Some:4};Object.defineProperty(hidden,'noise',{value:1});
const values=[{...packet,option:inherited},{...packet,option:hidden},{...packet,option:Object.assign(Object.create(null),{Some:4})},packet,{...packet,extra:1},null,{...packet,words:[-1]},{...packet,pair:[1]},{...packet,option:{Some:4,extra:1}},{...packet,result:{Ok:null,Err:'bad'}},{...packet,tag:'bad'},{...packet,tree:{payload:{Some:4}}},{...packet,wide:9007199254740992},{...packet,exact:{Int:'bad'}}];
const outcome=(fn,v,cells,depth)=>{const budget={cells};try{return{value:fn(v,budget,depth),remaining:budget.cells};}catch(e){return{error:e.message,remaining:budget.cells};}};
for(const value of values)for(const cells of [1,2,5,30,1000000])for(const depth of [0,63,64,65])assert.deepEqual(outcome(capture,value,cells,depth),outcome((v,b,d)=>reference(v,type,b,d),value,cells,depth));
const owned=capture(packet);assert.equal(Object.getPrototypeOf(owned),Object.prototype);assert.equal(owned.__proto__,'own');packet.words[0]=7;assert.equal(owned.words[0],0);
const state=createState(),prepared=state.prepare('echo',[packet]);packet.words[0]=99;
const first=state.invokePrepared(prepared).result;assert.equal(first.words[0],7);first.words[0]=33;
assert.equal(state.invokePrepared(prepared).result.words[0],7);
// Capture reads each host field exactly once and in declaration order, including
// when the next child exhausts its budget or is invalid. Inlining may not move
// reads ahead of earlier validation failures.
for(const cells of [1,2,5,20,40,1000000]){
 const traced=fn=>{const reads=[];const host={};for(const key of Object.keys(packet))Object.defineProperty(host,key,{enumerable:true,get(){reads.push(key);return packet[key];}});return {outcome:outcome(fn,host,cells,0),reads};};
 assert.deepEqual(traced(capture),traced((v,b,d)=>reference(v,type,b,d)));
}
"#).unwrap();
    let output = Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    fs::remove_dir_all(root).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
