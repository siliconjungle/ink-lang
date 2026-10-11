import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [beforePath,afterPath,hostPath,snapshotPath]=process.argv.slice(2);
const {StatefulModule}=await import(pathToFileURL(hostPath));
const before=await StatefulModule.instantiate(await fs.readFile(beforePath),{workers:1});
const after=await StatefulModule.instantiate(await fs.readFile(afterPath),{workers:1});
const bytes=await fs.readFile(snapshotPath),measurements=[];
const normalize=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v);
for(const mode of ['query','write'])for(let round=0;round<9;round++){
 const results={};const order=round%2?[['after',after],['before',before]]:[['before',before],['after',after]];
 for(const [label,host] of order){
  const state=host.restore(bytes),replies=[];const start=process.hrtime.bigint();
  for(let i=0;i<1000;i++)replies.push(state.invoke(mode==='query'?'get':'put',[i*17%4000,...(mode==='query'?[]:[i])]));
  results[label]={ns:String(process.hrtime.bigint()-start),replies,snapshot:state.snapshot()};state.dispose();
 }
 assert.equal(normalize(results.before.replies),normalize(results.after.replies));assert.deepEqual(results.before.snapshot,results.after.snapshot);
 measurements.push({rows:4000,mode,round,calls:1000,before_ns:results.before.ns,after_ns:results.after.ns});
}
console.log(JSON.stringify({schema:1,boundary:'complete Wasm state host invoke with JSON buffers and parsed replies; restored states; setup/restore/checkpoints excluded',node:process.version,measurements}));
