// Distinct contracts: known action changes versus comparison of fresh snapshots.
import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
const path=process.argv[2],{createState}=await import(pathToFileURL(path));const sizes=[256,4096,16384],samples=[];
let sink=0n;
for(const rows of sizes){
 const state=createState(),put=state.bind('put',{resultOnly:true}),get=state.bind('total_query',{resultOnly:true});
 for(let i=0;i<rows;i++)put(BigInt(i),BigInt(i),true,false);
 state.acknowledgeThrough((1n<<64n)-1n,(1n<<64n)-1n);
 const before=Array.from({length:rows},(_,i)=>({value:BigInt(i),active:true}));
 for(let round=-3;round<7;round++){
  const units=256,start=performance.now();
  for(let i=0;i<units;i++){
   const token=state.changeToken(),key=BigInt(i%rows);put(key,BigInt((round+4)*10000+i),true,false);
   const delta=state.changesSince(token);assert.equal(delta.changes.length,1);sink^=delta.changes[0].after.Some.value;state.releaseChangeToken(token);
  }
  const known=(performance.now()-start)*1e6/units;
  const after=before.map((r,i)=>i===17?{...r,value:98765n}:({...r}));let changes;
  const freshStart=performance.now();
  for(let i=0;i<units;i++){changes=[];for(let k=0;k<rows;k++)if(before[k].value!==after[k].value||before[k].active!==after[k].active)changes.push({key:BigInt(k),before:before[k],after:after[k]});sink^=changes[0].after.value;}
  const fresh=(performance.now()-freshStart)*1e6/units;
  if(round>=0)samples.push({rows,round,knownActionPlusOwnedDeltaNs:known,freshSnapshotScanNs:fresh});
  state.acknowledgeThrough((1n<<64n)-1n,(1n<<64n)-1n);
 }
 const token=state.changeToken();put(7n,11n,true,false);put(7n,13n,true,false);put(8n,17n,true,true);assert.equal(state.changesSince(token).changes.length,1);state.releaseChangeToken(token);sink^=get();
}
console.log(JSON.stringify({schema:1,node:process.version,artifact:path,samples,sink:String(sink),scope:'Scaling experiment with different input contracts. Known action includes mutation/version/event and owned typed delta. Fresh snapshot scan receives two full arrays and compares them; snapshot creation is excluded. No claim of a comparable Frontier patch-format win.'}));
