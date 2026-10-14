import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {balancedOrders} from './order.mjs';
const [directory,label,processIndex,output]=process.argv.slice(2);
const registration=JSON.parse(fs.readFileSync(`${directory}/registration.json`)),protocol=registration.evaluation;
const paths={baseline:`${directory}/baseline.mjs`,selected:`${directory}/${label}.mjs`,indexed:`${directory}/indexed.mjs`};
const modules=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([name,path])=>[name,(await import(pathToFileURL(path))).functions])));
const hashes=Object.fromEntries(Object.entries(paths).map(([name,path])=>[name,createHash('sha256').update(fs.readFileSync(path)).digest('hex')]));
let sink=0;const rows=[];
function consume(x){if(Array.isArray(x)){let v=x.length;for(const c of x)v=(Math.imul(v,31)^consume(c))|0;return v;}if(x&&typeof x==='object'){let v=0;for(const c of Object.values(x))v=(Math.imul(v,31)^consume(c))|0;return v;}return Number(x)|0;}
function time(f,reps){const start=performance.now();for(let i=0;i<reps;i++)sink^=consume(f());return(performance.now()-start)*1e6/reps;}
for(const operation of ['records','predicate','nested'])for(const n of protocol.sizes)for(const count of protocol.queries)for(const shape of protocol.shapes){
 const keys=Array.from({length:n},(_,i)=>(Math.imul(shape==='unique'?i:i%16,2654435761)+protocol.seed)>>>0),denied=keys.filter((_,i)=>i%3===0);
 const requests=Array.from({length:count},(_,i)=>({key:i%2===0?(keys[i%n]??0):i+protocol.seed,other:i%3===0?(keys[(i+1)%n]??0):i+1,enabled:i%4!==0,probes:[0,1,0xffffffff,i]}));
 const offset=protocol.seed,args=operation==='records'?[keys,requests,offset,0]:operation==='predicate'?[keys,denied,requests]:[keys,requests];
 const before=structuredClone(args);
 const expected=operation==='records'?requests.map(q=>({key:(q.key+offset)>>>0,hit:keys.includes(q.key),other:!keys.includes(q.other)})):operation==='predicate'?requests.filter(q=>q.enabled&&keys.includes(q.key)&&!denied.includes(q.other)):requests.map(q=>q.probes.map(k=>keys.includes((k+q.key)>>>0)));
 const control=()=>{const a=new Set(keys);if(operation==='records')return requests.map(q=>({key:(q.key+offset)>>>0,hit:a.has(q.key),other:!a.has(q.other)}));if(operation==='predicate'){const b=new Set(denied);return requests.filter(q=>q.enabled&&a.has(q.key)&&!b.has(q.other));}return requests.map(q=>q.probes.map(k=>a.has((k+q.key)>>>0)));};
 const variants={...Object.fromEntries(Object.entries(modules).map(([name,m])=>[name,()=>m[operation](...args)])),native_set:control};
 const repetitions={},samples_ns={};
 for(const [name,f]of Object.entries(variants)){
  assert.deepEqual(f(),expected);let reps=1;
  while(time(f,reps)*reps<protocol.batch_ns&&reps<65536)reps*=2;
  repetitions[name]=reps;samples_ns[name]=[];for(let warm=0;warm<3;warm++)time(f,reps);
 }
 const seed=(protocol.seed+Number(processIndex)*7919+rows.length*37)>>>0,orders=balancedOrders(Object.keys(variants),protocol.rounds,seed);
 for(const order of orders)for(const name of order)samples_ns[name].push(time(variants[name],repetitions[name]));
 for(const f of Object.values(variants))assert.deepEqual(f(),expected);assert.deepEqual(args,before);
 rows.push({operation,n,queries:count,shape,output_size:expected.length,validated:true,seed,orders,repetitions,samples_ns});
}
fs.writeFileSync(output,JSON.stringify({schema:1,node:process.version,label,process:Number(processIndex),sink,hashes,registration,rows},null,2)+'\n');
