import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join}from'node:path';
import{pathToFileURL}from'node:url';
const dir=resolve(process.argv[2]),m=await import(pathToFileURL(join(dir,'program.mjs'))),cases=JSON.parse(await readFile(join(dir,'cases.json')));
let calls=0;
for(const c of cases){
 const entry=m.compiledValues[c.name],handles=c.args.map((v,i)=>entry.params[i].capture(v));
 for(const fixed of [[0],[0,1],[0,1,2],[],handles.map((_,i)=>i)]){
  const token=m.prepareCompiled(c.name,fixed.map(i=>[i,handles[i]])),varying=handles.filter((_,i)=>!fixed.includes(i));
  for(let i=0;i<3;i++){
   assert.deepEqual(entry.result.encode(m.callPreparedCompiled(token,varying)),m.valueCodecs[c.name].result.encode(c.expected));calls++;
  }
 }
}
// Count the existing source topology validator only in this diagnostic copy;
// performance measurements use untouched emitted modules. No name grants trust.
let code=await readFile(join(dir,'program.mjs'),'utf8');
const topology=m.metadata.functions.find(f=>f.params.map(x=>x.name).join(',')==='inputs,nodes,roots'&&f.result.kind==='bool');assert(topology);
const signature=`function __fn${topology.index}(`,begin=code.indexOf('{',code.indexOf(signature));assert(begin>0);
code=code.slice(0,begin+1)+'globalThis.__topologyChecks++;'+code.slice(begin+1);
await writeFile(join(dir,'counted.mjs'),code);globalThis.__topologyChecks=0;
const counted=await import(pathToFileURL(join(dir,'counted.mjs'))),valid=cases.filter(c=>c.name==='predict'&&c.expected.Ok).slice(0,4);
const c=counted.compiledValues.predict,host=structuredClone(valid[0].args[0]),graph=c.params[0].capture(host);
const token=counted.prepareCompiled('predict',[[0,graph]]);host.graph.roots[0]=0xffffffff;
assert.equal(globalThis.__topologyChecks,0);
for(const item of valid){
 const args=item.args.slice(1).map((v,i)=>c.params[i+1].capture(v)),h=counted.callPreparedCompiled(token,args);
 assert.deepEqual(c.result.encode(h),counted.valueCodecs.predict.result.encode(item.expected));
 const output=c.result.materialize(h);output.Ok[0]={F32Bits:0};
 assert.deepEqual(c.result.encode(counted.callPreparedCompiled(token,args)),counted.valueCodecs.predict.result.encode(item.expected));
 assert.equal(globalThis.__topologyChecks,1); // changing weights still recompute fresh primals
}
const badShape=c.params[1].capture([]),context=c.params[2].capture(valid[0].args[2]);
assert.deepEqual(c.result.materialize(counted.callPreparedCompiled(token,[badShape,context])),{Err:'network input shape'});assert.equal(globalThis.__topologyChecks,1);
const d=counted.compiledValues.derivatives,dt=counted.prepareCompiled('derivatives',[[0,d.params[0].capture(valid[0].args[0])]]);
for(const item of cases.filter(c=>c.name==='derivatives'&&c.expected.Ok).slice(0,4)){
 const args=item.args.slice(1).map((v,i)=>d.params[i+1].capture(v));
 assert.deepEqual(d.result.encode(counted.callPreparedCompiled(dt,args)),counted.valueCodecs.derivatives.result.encode(item.expected));
 assert.equal(globalThis.__topologyChecks,2);
}
console.log(JSON.stringify({referenceCases:cases.length,preparedCalls:calls,topologyChecksPerToken:1,weightsAndContextsVary:true,forgedInputsAndSpecialF32:true,privateInputsAndDetachedOutputs:true}));
