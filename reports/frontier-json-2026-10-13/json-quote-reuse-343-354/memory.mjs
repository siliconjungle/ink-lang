import * as m from './candidate.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.argv[2],json=new m.JsonCodec(m.valueCodecs.identity.result),codec=m.compiledValues.identity.params[0];
const text=JSON.stringify(Object.fromEntries(Array.from({length:512},(_,i)=>['k'+String(i).padStart(5,'0'),`雪😀${i}\n"\\`]))),handle=json.parseCompiled(codec,text);
for(let i=0;i<100;i++)json.stringifyCompiled(codec,handle);
const caches=[];global.gc();const before=process.memoryUsage().heapUsed;
for(let i=0;i<128;i++){
 const q=m.createJsonQuoter();assert.equal(json.stringifyCompiled(codec,handle,{quoter:q}),text);caches.push(q);
}
global.gc();const retained=process.memoryUsage().heapUsed-before,stats=caches[0].stats();
for(const q of caches)q.clear();global.gc();const afterClear=process.memoryUsage().heapUsed-before;
fs.writeFileSync(out,JSON.stringify({node:process.version,caches:128,retained_bytes:retained,per_cache_bytes:retained/128,stats,after_clear_bytes:afterClear,scope:'Forced-GC retained heap delta in one isolated process after warm codec preparation; shared strings/input handle retained before baseline. Not peak memory, confidence bounds or a universal budget.'},null,2)+'\n',{flag:'wx'});
