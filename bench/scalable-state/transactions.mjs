import fs from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const snapshots=new Map();
const file=new URL('../../build/transaction-benchmark.mjs',import.meta.url),source=fs.readFileSync(file,'utf8');
// Diagnostic control: same checked module, ingress, outputs and actions, but
// whole-table save/restore replaces the touched-row journal. No timed tracing.
let control=source.replace('const version=rt.version,outbox=rt.outbox;rt.undo.length=0;', 'const version=rt.version,outbox=rt.outbox;rt.undo.length=0;rt.saved=a.change?rt.tables.map(t=>new Map(t)):null;');
assert.notEqual(control,source);
control=control.replace(/rt\.undo\.push\(\[index,key,true,value\]\);/g,'').replace(/rt\.undo\.push\(\[index,key,table\.has\(key\),table\.get\(key\)\]\);/g,'');
assert(!control.includes('rt.undo.push'));
const start=control.indexOf('function __rollback(rt){'),end=control.indexOf('\nfunction __createState',start);
control=control.slice(0,start)+'function __rollback(rt){if(rt.saved)rt.tables=rt.saved;rt.undo.length=0;}'+control.slice(end);
control=control.replace('rt.version=next;rt.outbox=outbox.concat(pending);rt.undo.length=0;','rt.version=next;rt.outbox=outbox.concat(pending);rt.undo.length=0;rt.saved=null;');
fs.writeFileSync(new URL('../../build/transaction-fullcopy-control.mjs',import.meta.url),control);
const modules=await Promise.all([import(file.href),import(new URL('../../build/transaction-fullcopy-control.mjs',import.meta.url).href)]);
for(let repeat=0;repeat<5;repeat++)for(const rows of [1024,100000])for(const index of repeat%2?[1,0]:[0,1]){
 global.gc?.();const before=process.memoryUsage().heapUsed,state=modules[index].createState();
 const keys=Array.from({length:rows},(_,i)=>BigInt(i)),values=keys.map(k=>k+1n);
 let t=performance.now();state.invoke('batch',[keys,values]);const construct=performance.now()-t;
 const calls=200;let checksum;
 t=performance.now();for(let k=0;k<calls;k++)checksum=state.invoke('put',[BigInt(k%rows),BigInt(k)]);const mutation=performance.now()-t;
 t=performance.now();for(let k=0;k<calls;k++)assert.equal(state.invoke('fail',[0n,999n]).committed,false);const rollback=performance.now()-t;
 t=performance.now();for(let k=0;k<20;k++)checksum=state.invoke('scan',[]).result;const scan=performance.now()-t;
 assert.equal(checksum,BigInt(rows)*(BigInt(rows)+1n)/2n-BigInt(calls));
 t=performance.now();for(let k=0;k<20;k++)assert.equal(state.invoke('materialised',[]).result,checksum);const materialised=performance.now()-t;
 t=performance.now();const snapshot=await state.checkpoint();const checkpoint=performance.now()-t;
 const digest=createHash('sha256').update(snapshot).digest('hex'),cohort=repeat+':'+rows;if(snapshots.has(cohort))assert.equal(digest,snapshots.get(cohort));else snapshots.set(cohort,digest);
 t=performance.now();const restored=modules[index].createState();await restored.restore(snapshot);const restore=performance.now()-t;assert.equal(restored.invoke('scan',[]).result,checksum);
 global.gc?.();console.log(JSON.stringify({repeat,rows,candidate:index?'fullcopy-control':'journal',calls,scans:20,construct_ms:construct,mutation_ms:mutation,rollback_ms:rollback,scan_ms:scan,materialised_ms:materialised,checkpoint_ms:checkpoint,restore_ms:restore,heap_delta_bytes:process.memoryUsage().heapUsed-before,snapshot_bytes:snapshot.length,checksum:String(checksum)}));
}
