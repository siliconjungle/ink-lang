// Offline observations only. The planner must separately check eligibility and
// fit comparable lifecycle costs before an observation can affect selection.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import os from 'node:os';
const [artifact,output,compiler,core]=process.argv.slice(2);
if(!artifact||!output)throw new Error('usage: node libraries.mjs ARTIFACT OUTPUT');
const {functions:f}=await import(pathToFileURL(artifact));
const digest=x=>createHash('sha256').update(x).digest('hex');
const observations=[];
function compare(label,a,b,args,features){
 const before=JSON.stringify(args),expected=a(...args);assert.deepEqual(b(...args),expected,label);
 for(let i=0;i<3;i++){a(...args);b(...args);}
 const samples={baseline:[],alternative:[]};let checksum=0;
 for(let i=0;i<7;i++){
  // Alternate order so a single order does not systematically favour one plan.
  for(const [name,fn]of (i%2?[['alternative',b],['baseline',a]]:[['baseline',a],['alternative',b]])){
   const start=process.hrtime.bigint();const value=fn(...args);const ns=Number(process.hrtime.bigint()-start);
   checksum=(checksum+(Array.isArray(value)?value.length:value.first))>>>0;samples[name].push(ns);
  }
 }
 assert.equal(JSON.stringify(args),before,'input mutation');
 const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
 observations.push({label,features,input_sha256:digest(before),result_sha256:digest(JSON.stringify(expected)),samples_ns:samples,median_ns:{baseline:median(samples.baseline),alternative:median(samples.alternative)},checksum});
}
for(const [n,m,keys]of [[32,128,128],[128,1024,1024],[128,1024,16],[8,1024,1]]){
 const a=Array.from({length:n},(_,i)=>({key:i%keys,value:i})),b=Array.from({length:m},(_,i)=>({key:i%keys,value:i%2===0}));
 compare(`join-${n}-${m}-${keys}`,f.baseline_join,f.indexed_join,[a,b],{left_rows:n,right_rows:m,distinct_right_keys:keys,includes_index_build:true});
}
for(const n of [128,1024,8192]){
 const xs=Array.from({length:n},(_,i)=>(Math.imul(i+1,2654435761)>>>0));
 compare(`aggregate-${n}`,f.separate_totals,f.shared_totals,[xs],{rows:n,traversals_baseline:2,traversals_alternative:1});
 for(const k of [1,8,64])compare(`top-k-${n}-${k}`,f.sorted_top_k,f.bounded_top_k,[xs,k],{rows:n,k});
}
const receipt={schema:1,status:'observed',scope:'JavaScript standalone literal artifacts; seven offline elapsed-time samples, index build included; equality tests are not source correspondence proofs or performance guarantees',artifact_sha256:digest(await readFile(artifact)),compiler_sha256:compiler?digest(await readFile(compiler)):null,core_sha256:core?digest(await readFile(core)):null,runner_sha256:digest(await readFile(new URL(import.meta.url))),node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,observations};
await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({status:receipt.status,workloads:observations.length,artifact_sha256:receipt.artifact_sha256}));
