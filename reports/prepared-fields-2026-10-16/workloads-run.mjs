import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
const [beforePath,currentPath,out,seedText]=process.argv.slice(2);
const warmupRounds=Number(process.env.INK_LOOP_WARMUP_ROUNDS??12);
if(!Number.isInteger(warmupRounds)||warmupRounds<1||warmupRounds>1024)throw Error('warmup rounds must be 1..1024');
let seed=Number(seedText)>>>0;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;}
const digest=x=>createHash('sha256').update(x).digest('hex');
const modules={before:await import(pathToFileURL(resolve(beforePath)).href),current:await import(pathToFileURL(resolve(currentPath)).href)};
const dataView=new DataView(new ArrayBuffer(4));
const boxed=x=>{dataView.setFloat32(0,x,true);return {F32Bits:dataView.getUint32(0,true)};};
const records=[],setup=[],cold=[],corpora=[];let sink=0;
for(const size of [16,128,512]){
 const keys=Array.from({length:size},()=>random()%2048),rows=keys.map(key=>({key:key%64,value:random()})),weights=keys.map(x=>Math.fround(x/4096));
 const cases=Array.from({length:12},(_,i)=>({queries:Array.from({length:i===0?0:i===1?1:32},()=>random()%2048),xs:Array.from({length:i===0?0:i===1?1:32},()=>Math.fround((random()%1000-500)/1000))}));
 corpora.push({size,sha256:digest(JSON.stringify({keys,rows,weights,cases}))});
 let started=performance.now();const nativeIndex=new Map(keys.map(x=>[x,true]));
 setup.push({name:'direct_prepared',size,task:'membership',preparation_ms:performance.now()-started});
 started=performance.now();const groups=new Map();for(const r of rows)groups.set(r.key,((groups.get(r.key)??0)+r.value)>>>0);
 setup.push({name:'direct_prepared',size,task:'aggregates',preparation_ms:performance.now()-started});
 started=performance.now();
 const coefficients=weights.map(w=>Math.fround(Math.fround(w*w)+Math.fround(.25)));
 setup.push({name:'direct_prepared',size,task:'numeric',preparation_ms:performance.now()-started});
 for(const task of ['membership','aggregates','numeric']){
  const input=task==='membership'?keys:task==='aggregates'?rows:weights;
  const control=i=>task==='membership'?cases[i].queries.map(x=>nativeIndex.has(x)):task==='aggregates'?cases[i].queries.map(x=>groups.get(x)??0):cases[i].xs.map((x,j)=>boxed(Math.fround((coefficients[j]??0)*x)));
  const expected=cases.map((_,i)=>control(i));const lanes={direct_prepared:control};
  for(const[name,m]of Object.entries(modules)){
   const e=m.compiledValues[task],begin=performance.now(),fixed=e.params[0].capture(input),varying=cases.map(c=>e.params[1].capture(task==='numeric'?c.xs:c.queries));const capture=performance.now()-begin;
   const start=performance.now(),token=m.prepareCompiled(task,[[0,fixed]]);setup.push({name,size,task,capture_ms:capture,token_ms:performance.now()-start,source_core:m.metadata.core_sha256});
   lanes[name+'_ordinary']=i=>e.result.materialize(m.callCompiled(task,[fixed,varying[i]]));
   lanes[name+'_prepared']=i=>e.result.materialize(m.callPreparedCompiled(token,[varying[i]]));
  }
  const names=Object.keys(lanes);
  for(const name of names){
   for(const i of [0,1,2]){const start=process.hrtime.bigint(),value=lanes[name](i);cold.push({name,size,task,observations:i===0?0:i===1?1:32,sequence:i,ns:Number(process.hrtime.bigint()-start)});assert.deepEqual(value,expected[i]);}
   for(let i=0;i<12;i++)assert.deepEqual(lanes[name](i),expected[i],name+'/'+task);
  }
  for(let warmup=0;warmup<warmupRounds;warmup++)for(const name of names)for(let i=0;i<12;i++)lanes[name](i);
  for(let sample=0;sample<11;sample++){
   const order=names.slice();for(let i=order.length-1;i>0;i--){const j=random()%(i+1);[order[i],order[j]]=[order[j],order[i]];}
   for(const name of order){
    const calls=96,start=process.hrtime.bigint();let last;
    for(let i=0;i<calls;i++){last=lanes[name](i%12);for(const value of last)sink+=typeof value==='object'?value.F32Bits:Number(value);}
    records.push({name,size,task,sample,calls,ns_per_call:Number(process.hrtime.bigint()-start)/calls,last_sha256:digest(JSON.stringify(last))});
    for(let i=0;i<12;i++)assert.deepEqual(lanes[name](i),expected[i]);
   }
  }
 }
}
const source=async p=>({sha256:digest(await readFile(p)),bytes:(await readFile(p)).length});
await writeFile(out,JSON.stringify({schema:1,seed:Number(seedText),warmup_rounds:warmupRounds,node:process.version,cpu:os.cpus()[0].model,sources:{before:await source(beforePath),current:await source(currentPath)},setup,cold,corpora,records,sink,
 scope:'Complete detached result arrays, varying empty/singleton/32-item observations, stable captured inputs. Ingress and token setup separated; output materialization included. Strong direct prepared Map/group/numeric controls. No automatic selection, state/optimizer/GPU or universal performance claim.'},null,2)+'\n');
