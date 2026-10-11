// Complete public JS calls on identical restored states. Setup, restore and
// checkpoint comparisons stay outside timing. Reconstruct the previous emitter
// only as a benchmark control; no alternate algorithm is installed in production.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [beforePath,afterPath,snapshotPath]=process.argv.slice(2);
const RealMap=globalThis.Map;let copiedEntries=0;
globalThis.Map=class extends RealMap{constructor(entries){super(entries);if(entries instanceof RealMap)copiedEntries+=entries.size;}};
const before=await import(pathToFileURL(beforePath)),after=await import(pathToFileURL(afterPath));
const normalize=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v);
const measurements=[];
for(const rows of [256,4000]){
 const initial=after.createState();for(let i=0;i<rows;i++)initial.invoke('put',[String(i),String(i*13+7)]);
 const bytes=await initial.checkpoint();if(rows===4000&&snapshotPath)await fs.writeFile(snapshotPath,bytes);
 for(const mode of ['query','write']){
  for(let round=0;round<9;round++){
   const results={};const order=round%2?[['after',after],['before',before]]:[['before',before],['after',after]];
   for(const [label,module] of order){
    const state=module.createState();await state.restore(bytes);copiedEntries=0;const replies=[];
    const start=process.hrtime.bigint();
    for(let i=0;i<1000;i++)replies.push(mode==='query'?state.invoke('get',[String((i*17)%rows)]):state.invoke('put',[String((i*17)%rows),String(i)]));
    const ns=process.hrtime.bigint()-start;const copies=copiedEntries;
    results[label]={ns:String(ns),copied_table_entries:copies,replies,snapshot:await state.checkpoint()};
   }
   assert.equal(normalize(results.before.replies),normalize(results.after.replies));assert.deepEqual(results.before.snapshot,results.after.snapshot);
   assert.equal(results.after.copied_table_entries,0);
   measurements.push({rows,mode,round,calls:1000,before_ns:results.before.ns,after_ns:results.after.ns,before_copied_table_entries:results.before.copied_table_entries,after_copied_table_entries:0});
  }
 }
}
console.log(JSON.stringify({schema:1,boundary:'caller-trusted public JS invoke; replies retained; input representation conversion included; setup/restore/checkpoints excluded',node:process.version,measurements}));
