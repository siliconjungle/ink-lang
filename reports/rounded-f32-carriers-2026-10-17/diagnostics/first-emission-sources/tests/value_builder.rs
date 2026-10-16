use std::{fs, process::Command};

#[test]
fn construction_sessions_reject_incomplete_wrong_and_exhausted_inputs() {
    let directory = std::env::temp_dir().join(format!("ink-value-builder-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    let support = include_str!("../src/value_builder.mjs");
    // Runtime mechanism test. Literal source-schema plans and cross-layout
    // conformance are tested separately once the emitter supplies these plans.
    let script = r#"
import assert from 'node:assert/strict';
const handles=new WeakMap();function __compiledHandle(identity,value){const h=Object.freeze(Object.create(null));handles.set(h,{identity,value});return h;}
function createValueCaptureBudget({nodes=100,depth=20}={}){return {limit:100,enter(d){if(d>depth||--nodes<0)throw Error('budget');}};}
const scalar=(value,budget,depth)=>{budget.enter(depth);if(typeof value!=='string')throw Error('String');return value;};
const charge=(b,d)=>b.enter(d);
const plans=[{patterns:[{children:[1,2],childDepth:1,charge,make:v=>({name:v[0],items:v[1]})}]},{scalar},{patterns:[{children:[1],sequence:true,childDepth:1,charge,make:v=>v}]}];
const b=__valueBuilder(plans,0,'record',{});b.open(0);b.scalar('name');b.open(0);b.scalar('a');b.scalar('b');b.close();b.close();const h=b.finish();assert.deepEqual(handles.get(h),{identity:'record',value:{name:'name',items:['a','b']}});assert.ok(Object.isFrozen(h));assert.equal(Object.keys(h).length,0);assert.throws(()=>b.scalar('late'),/closed/);
const incomplete=__valueBuilder(plans,0,'record',{});incomplete.open(0);assert.throws(()=>incomplete.finish(),/incomplete/);assert.throws(()=>incomplete.close(),/closed/);
const wrong=__valueBuilder(plans,0,'record',{});assert.throws(()=>wrong.scalar('x'),/constructor/);assert.throws(()=>wrong.open(0),/closed/);
const bad=__valueBuilder(plans,0,'record',{});bad.open(0);assert.throws(()=>bad.scalar(7),/String/);assert.throws(()=>bad.finish(),/closed/);
const exhausted=__valueBuilder(plans,0,'record',{nodes:1});exhausted.open(0);assert.throws(()=>exhausted.scalar('x'),/budget/);assert.throws(()=>exhausted.finish(),/closed/);
const aborted=__valueBuilder(plans,0,'record',{});aborted.open(0);aborted.abort();assert.throws(()=>aborted.close(),/closed/);
const full=__valueBuilder(plans,0,'record',{});full.open(0);full.scalar('x');full.open(0);full.close();assert.throws(()=>full.scalar('overflow'),/full/);
const alias=__valueBuilder(plans,1,'String',{});alias.scalar('word');assert.equal(handles.get(alias.finish()).value,'word');
const pattern=(children,make,extra={})=>({children,childDepth:1,charge(){},make,...extra});
const specs=[{kind:'record',patterns:[pattern([1],v=>v[0],{transparent:true})]},{kind:'result',flat:(tag,payload)=>({tag,payload}),patterns:[pattern([3],v=>({tag:0,payload:v[0]}),{sumBranch:0}),pattern([2],v=>({tag:1+v[0].tag,payload:v[0].payload}),{sumBranch:1})]},{kind:'result',flat:(tag,payload)=>({tag,payload}),patterns:[pattern([3],v=>({tag:0,payload:v[0]}),{sumBranch:0}),pattern([4],v=>({tag:1,payload:v[0]}),{sumBranch:1})]},{kind:'record',patterns:[pattern([4],v=>v[0],{transparent:true})]},{scalar:v=>v}];
for(const [path,expected]of [[[0,0,0],{tag:0,payload:'x'}],[[0,1,0,0],{tag:1,payload:'x'}],[[0,1,1],{tag:2,payload:'x'}]]){const b=__valueBuilder(specs,0,'test',{});b.openPath(path);b.scalar('x');b.close();assert.deepEqual(handles.get(b.finish()).value,expected);}


for(const path of [Object.freeze([0,0,0]),Object.freeze([0,1,0,0]),Object.freeze([0,1,1])]){
 const ordinary=__valueBuilder(specs,0,'test',{});ordinary.openPath(path);ordinary.scalar('leaf');ordinary.close();const expected=handles.get(ordinary.finish()).value;
 for(let repeat=0;repeat<2;repeat++){const atomic=__valueBuilder(specs,0,'test',{});atomic.scalarPath(path,'leaf');assert.deepEqual(handles.get(atomic.finish()).value,expected);}
}
const nonLeaf=__valueBuilder(plans,0,'test',{});assert.throws(()=>nonLeaf.scalarPath([0],'leaf'),/no scalar leaf/);assert.throws(()=>nonLeaf.finish(),/closed/);
const bounded=__valueBuilder([{patterns:[pattern([1],v=>v[0],{charge})]},{scalar}],0,'test',{nodes:0});assert.throws(()=>bounded.scalarPath([0],'leaf'),/budget/);assert.throws(()=>bounded.finish(),/closed/);

const emptyPlans=[{patterns:[pattern([1],v=>({Some:v[0]}))]},{patterns:[pattern([],()=>({}))]}];
const empty=__valueBuilder(emptyPlans,0,'empty',{});empty.emptyPath(Object.freeze([0,0]));assert.deepEqual(handles.get(empty.finish()).value,{Some:{}});
const notEmpty=__valueBuilder(plans,0,'record',{});assert.throws(()=>notEmpty.emptyPath([0]),/not empty/);assert.throws(()=>notEmpty.finish(),/closed/);

// Public path arrays may replace array methods and contain frozen accessors.
// Such paths must be read again; they cannot reuse a previously checked branch.
let phase=0;const changing=[0,0,0];Object.defineProperty(changing,'1',{get:()=>phase?1:0});Object.defineProperty(changing,'2',{get:()=>phase?1:0});changing.every=()=>true;Object.freeze(changing);
for(phase=0;phase<2;phase++){const b=__valueBuilder(specs,0,'test',{});b.scalarPath(changing,'x');assert.deepEqual(handles.get(b.finish()).value,{tag:phase?2:0,payload:'x'});}

let reentrant;const guarded=[{scalar:(value,budget,depth)=>{assert.throws(()=>reentrant.scalar('bad'),/already active/);assert.throws(()=>reentrant.abort(),/already active/);return scalar(value,budget,depth);}}];reentrant=__valueBuilder(guarded,0,'String',{});reentrant.scalar('good');assert.equal(handles.get(reentrant.finish()).value,'good');
"#;
    fs::write(directory.join("run.mjs"), format!("{support}\n{script}")).unwrap();
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
