import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{digest}from'../staged-initializers/common.mjs';
const[path,out]=process.argv.slice(2);if(!global.gc)throw Error('requires --expose-gc');
const measure=()=>{global.gc();global.gc();return process.memoryUsage();};
const before=measure(),start=performance.now(),m=await import(pathToFileURL(resolve(path))),importMs=performance.now()-start,afterImport=measure();
function setup(){
 const e=m.compiledValues.predict,model=m.functions.network().Ok,weights=Array.from({length:244},(_,i)=>Math.fround(.01+(i%20)/250)),context=Array(10).fill(Math.fround(.2));
 const captureStart=performance.now(),inputs=[e.params[0].capture(model),e.params[1].capture(weights),e.params[2].capture(context)],captureMs=performance.now()-captureStart;
 const tokenStart=performance.now(),token=m.prepareCompiled('predict',[[0,inputs[0]]]),tokenMs=performance.now()-tokenStart;
 return{e,inputs,token,captureMs,tokenMs};
}
const build=performance.now(),held=setup(),setupMs=performance.now()-build,afterPrepare=measure();
const run=()=>held.e.result.materialize(m.callPreparedCompiled(held.token,held.inputs.slice(1)));
const first=performance.now(),value=run(),firstCallMs=performance.now()-first;assert(value.Ok);const afterFirst=measure();
for(let i=0;i<100;i++)assert.deepEqual(run(),value);const afterCalls=measure();assert.deepEqual(run(),value);
await writeFile(out,JSON.stringify({schema:1,node:process.version,module_sha256:digest(await readFile(path)),source_core:m.metadata.core_sha256,import_ms:importMs,setup_ms:setupMs,capture_ms:held.captureMs,token_ms:held.tokenMs,first_call_ms:firstCallMs,phases:{before,after_import:afterImport,after_prepare:afterPrepare,after_first:afterFirst,after_100:afterCalls},max_rss_kib:process.resourceUsage().maxRSS,heap_delta_bytes:afterCalls.heapUsed-before.heapUsed,scope:'One module, one captured graph, weights/context and prepared prediction token retained across GC. Heap/RSS include Node, metadata, source, JIT and caches; descriptive process observations, not allocation counts or bounds. Graph construction precedes capture; no prior correctness oracle or warmup before first prediction.'},null,2)+'\n');
