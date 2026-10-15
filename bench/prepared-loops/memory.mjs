import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [file,out]=process.argv.slice(2);if(!global.gc)throw Error('requires --expose-gc');
const measure=()=>{global.gc();global.gc();return process.memoryUsage();};
const before=measure(),start=performance.now(),m=await import(pathToFileURL(resolve(file)).href),importMs=performance.now()-start,afterImport=measure();
const held=[];const keys=Array.from({length:512},(_,i)=>i),rows=keys.map(key=>({key:key%64,value:key+1})),weights=keys.map(x=>Math.fround(x/4096));
const begin=performance.now();
for(const task of ['membership','aggregates','numeric']){
 const e=m.compiledValues[task],fixed=e.params[0].capture(task==='membership'?keys:task==='aggregates'?rows:weights);
 const inputs=[[],[1],Array.from({length:32},(_,i)=>task==='numeric'?Math.fround(i/100):i)].map(x=>e.params[1].capture(x));
 held.push({task,e,fixed,inputs});
}
const captureMs=performance.now()-begin,afterCapture=measure(),tokenAt=performance.now();
for(const h of held)h.token=m.prepareCompiled(h.task,[[0,h.fixed]]);
const tokenMs=performance.now()-tokenAt,afterToken=measure();
const run=i=>held.map(h=>h.e.result.materialize(m.callPreparedCompiled(h.token,[h.inputs[i]])));
assert.deepEqual(run(0),[[],[],[]]);const afterEmpty=measure();
const first=performance.now(),one=run(1),firstOneMs=performance.now()-first;const afterOne=measure();
const value=run(2);for(let i=0;i<100;i++)assert.deepEqual(run(2),value);const afterCalls=measure();assert.deepEqual(run(1),one);
await writeFile(out,JSON.stringify({schema:1,node:process.version,module_sha256:createHash('sha256').update(await readFile(file)).digest('hex'),source_core:m.metadata.core_sha256,import_ms:importMs,capture_ms:captureMs,token_ms:tokenMs,first_one_ms:firstOneMs,
 phases:{before,after_import:afterImport,after_capture:afterCapture,after_token:afterToken,after_empty:afterEmpty,after_one:afterOne,after_100:afterCalls},max_rss_kib:process.resourceUsage().maxRSS,
 scope:'Three retained immutable inputs and prepared tokens across forced GC; first zero/one/many observations separate. Heap/RSS include Node, generated source, metadata, JIT and caches; descriptive observations, not allocation counts or memory bounds.'},null,2)+'\n');
