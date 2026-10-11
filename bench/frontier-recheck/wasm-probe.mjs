// One complete logical call, outside the timing matrix, with an external deadline.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {digest} from './runner.mjs';
const originalFetch=globalThis.fetch;
globalThis.fetch=async value=>{
  const url=new URL(value);if(url.protocol!=='file:')return originalFetch(value);
  const bytes=await readFile(url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const root=new URL('../../build/frontier-recheck/',import.meta.url);
const fixture=JSON.parse(await readFile(new URL('fixtures.json',root))).find(f=>f.id==='rows-16384-sparse');
const bundle=process.argv[2]??'ink';
const {loadInk}=await import(new URL(bundle+'/ink-gpu.mjs',root));
const engine=await loadInk(new URL(bundle+'/',root),{gpu:false});
function numberValue(v){
  if(typeof v==='bigint'){assert(v>=0n&&v<=0xffffffffn);return Number(v);}
  if(Array.isArray(v))return v.map(numberValue);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,numberValue(x)]));
  return v;
}
console.log(JSON.stringify({status:'ready',case:fixture.id,bundle}));
const start=performance.now();
const result=numberValue((await engine.call('rows_final',[fixture.before,fixture.after],{backend:'cpu'})).value);
const elapsed_ms=performance.now()-start;
assert.deepEqual(result,fixture.after);
console.log(JSON.stringify({status:'passed',case:fixture.id,bundle,elapsed_ms,digest:digest(result),scope:'first logical call after module instantiation, including host integer conversion'}));
await engine.dispose();
