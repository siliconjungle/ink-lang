import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join,dirname}from'node:path';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
import{digest,logicalSnapshot,denseForward,generator,shuffled}from'./common.mjs';
const[mode,previousPath,stagedPath,name,out]=process.argv.slice(2);
if(mode==='sample'){
 const previous=resolve(previousPath),staged=resolve(stagedPath);
 const path=name==='scalar'?join(dirname(previous),'neural-baseline.mjs'):join(name==='keeps'?previous:staged,'program.mjs.source.mjs');
 const seed=await readFile(join(name==='defaults'?staged:previous,'model.snapshot'));
 const imported=performance.now(),{createState,metadata}=await import(pathToFileURL(path).href),importMs=performance.now()-imported;
 global.gc();global.gc();const moduleMemory=process.memoryUsage(),start=performance.now(),state=createState();await state.restore(seed);const createRestoreMs=performance.now()-start;
 assert.deepEqual(Buffer.from(await state.checkpoint()),seed);global.gc();global.gc();const before=process.memoryUsage();
 // Keep oracle and public outputs in a completed synchronous scope before GC.
 // The model observation is part of the lifecycle; JIT work remains included.
 const sink=(()=>{const weights=state.invoke('model',[]).result.Ok.weights,features=Array(10).fill(0.2),oracle=denseForward(weights,features);let sink=0;for(let i=0;i<10;i++){const values=state.invoke('predict',[features]).result.Ok;assert.deepEqual(values,oracle);for(const v of values)sink+=v;}return sink;})();
 global.gc();global.gc();const after=process.memoryUsage();
 assert.deepEqual(Buffer.from(await state.checkpoint()),seed);
 console.log(JSON.stringify({name,node:process.version,source:metadata.core_sha256,logical_sha256:digest(JSON.stringify(logicalSnapshot(seed))),import_ms:importMs,create_restore_ms:createRestoreMs,module_memory:moduleMemory,before,after,heap_delta:after.heapUsed-before.heapUsed,rss_delta:after.rss-before.rss,sink}));
}else if(mode==='run'){
 const records=[],next=generator(53819);for(let processIndex=0;processIndex<3;processIndex++)for(const n of shuffled(['scalar','keeps','defaults'],next)){
  const child=spawnSync(process.execPath,['--expose-gc',resolve(process.argv[1]),'sample',previousPath,stagedPath,n,name],{encoding:'utf8'});if(child.status!==0)throw Error(child.stderr||child.stdout);records.push({process:processIndex,...JSON.parse(child.stdout)});
 }
 assert.equal(new Set(records.map(r=>r.logical_sha256)).size,1);
 await writeFile(name,JSON.stringify({schema:1,scope:'Separate process per source implementation; imported module, created/restored state and ten complete predictions. Two explicit collections before/after. Oracle and public arrays leave a completed synchronous scope before final collection; engine/JIT allocations remain included. No allocation or peak-memory bound.',records},null,2)+'\n');
 console.log('Isolated memory lifecycle and exact state checks passed');
}else throw Error('Usage: memory.mjs run PREVIOUS_ARTIFACT STAGED_ARTIFACT OUTPUT.json');
