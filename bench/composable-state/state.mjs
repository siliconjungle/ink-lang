// Offline lifecycle observations. No runtime profitability probe or automatic
// selection is installed by this script. Call checking/compilation is separate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
const [ordinaryPath,directPath,cachedPath,output,compilerPath,sourcePath]=process.argv.slice(2);
if(!output)throw Error('usage: state.mjs ORDINARY DIRECT CACHED OUTPUT [COMPILER SOURCE]');
const hash=x=>createHash('sha256').update(x).digest('hex');
const normal=x=>typeof x==='bigint'?x.toString():Array.isArray(x)?x.map(normal):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,normal(v)])):x;
const paths={ordinary:ordinaryPath,direct:directPath,cached:cachedPath},modules={};
for(const [name,path]of Object.entries(paths))modules[name]=await import(pathToFileURL(path));
const call=async(s,name,args)=>normal(await s.invoke_json(name,args));
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const observations=[];
for(const rows of [16,128,512]){
 const states=Object.fromEntries(Object.entries(modules).map(([name,m])=>[name,m.createState()]));
 for(let i=0;i<rows;i++)for(const state of Object.values(states))await call(state,'put',[BigInt(i),BigInt(i+1),i%2===0,false]);
 let expected=0n;for(let i=0;i<rows;i+=2)expected+=BigInt(i+1);
 const replies=await Promise.all(Object.values(states).map(s=>call(s,'total_query',[])));
 for(const reply of replies){assert.deepEqual(reply,replies[0]);assert.equal(reply.result,expected.toString());}
 const snapshots=await Promise.all(Object.values(states).map(s=>s.checkpoint()));
 for(const snapshot of snapshots)assert.deepEqual(snapshot,snapshots[0]);
 for(const [name,state]of Object.entries(states)){
  const start=process.hrtime.bigint();await state.restore(snapshots[0]);
  observations.push({phase:'portable-restore',rows,plan:name,elapsed_ns:Number(process.hrtime.bigint()-start),snapshot_bytes:snapshots[0].length});
 }
 for(const [label,queries,writes]of [['query-heavy',100,1],['write-heavy',1,20]]){
  for(let sample=0;sample<7;sample++){
   const order=Object.entries(states);if(sample%2)order.reverse();
   for(const [name,state]of order){
    await state.restore(snapshots[0]);const start=process.hrtime.bigint();let checksum=0n;
    for(let i=0;i<writes;i++)await call(state,'put',[BigInt(i%rows),BigInt(i+101),i%2===0,false]);
    for(let i=0;i<queries;i++){const reply=await call(state,'total_query',[]);checksum+=BigInt(reply.result);}
    await call(state,'erase',[0n,true]);
    const elapsed_ns=Number(process.hrtime.bigint()-start);
    observations.push({phase:'steady-state',label,rows,queries,writes,aborted_writes:1,plan:name,sample,elapsed_ns,checksum:checksum.toString()});
   }
   const observed=await Promise.all(Object.values(states).map(s=>call(s,'total_query',[])));
   for(const reply of observed)assert.deepEqual(reply,observed[0]);
   const saved=await Promise.all(Object.values(states).map(s=>s.checkpoint()));for(const bytes of saved)assert.deepEqual(bytes,saved[0]);
  }
 }
}
const summaries=[];
for(const rows of [16,128,512])for(const label of ['query-heavy','write-heavy'])for(const plan of Object.keys(paths)){
 const samples=observations.filter(x=>x.phase==='steady-state'&&x.rows===rows&&x.label===label&&x.plan===plan);summaries.push({rows,label,plan,median_ns:median(samples.map(s=>s.elapsed_ns))});
}
const receipt={schema:1,status:'observed',scope:'Offline Node lifecycle observations with complete invocation envelopes; identical replies and portable bytes checked before and after timing. Neither timing nor parity grants proof authority.',node:process.version,cpu:os.cpus()[0]?.model,platform:process.platform,arch:process.arch,compiler_sha256:compilerPath?hash(await readFile(compilerPath)):null,source_sha256:sourcePath?hash(await readFile(sourcePath)):null,artifact_sha256:Object.fromEntries(await Promise.all(Object.entries(paths).map(async([n,p])=>[n,hash(await readFile(p))]))),runner_sha256:hash(await readFile(new URL(import.meta.url))),summaries,observations};
await writeFile(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:'observed',workloads:summaries.length}));
