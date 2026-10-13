import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const directory=path.dirname(new URL(import.meta.url).pathname);
const run=Number(process.argv[3]??0);
const output=path.resolve(process.argv[2]??path.join(directory,'replayed'));fs.mkdirSync(output,{recursive:true});
const names=['baseline','optimized'];
const modules=await Promise.all(names.map(name=>import(pathToFileURL(path.join(directory,{baseline:'invariant-before.mjs',optimized:'invariant-after.mjs'}[name])))));
const clock=()=>process.hrtime.bigint();
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const results=[];
for(const n of [8,16,32,64,128,256,512,1024]){
 const values=Array.from({length:n},(_,i)=>i),snapshots=[];
 for(const lane of (run%2?[1,0]:[0,1])){
  const creation=[],replacement=[],checkpoint=[],restore=[];
  let state,snapshot;
  for(let repetition=0;repetition<3;repetition++){
   let start=clock();state=modules[lane].createState();creation.push(Number(clock()-start));
   start=clock();const reply=await state.invoke_json('replace_all',[values]);replacement.push(Number(clock()-start));assert.equal(reply.error,undefined);
   start=clock();snapshot=await state.checkpoint();checkpoint.push(Number(clock()-start));
   start=clock();await state.restore(snapshot);restore.push(Number(clock()-start));
   assert.deepEqual(await state.checkpoint(),snapshot);
  }
  snapshots[lane]=snapshot;
  const query=state.bind('known_unique',{resultOnly:true});
  for(let i=0;i<4;i++)assert.equal(query(),true);
  let start=clock();assert.equal(query(),true);const pilot=Number(clock()-start);
  const iterations=Math.max(1,Math.min(32768,Math.ceil(10_000_000/Math.max(pilot,1))));
  const batches=[];
  for(let i=0;i<9;i++){
   start=clock();for(let j=0;j<iterations;j++)assert.equal(query(),true);
   batches.push(Number(clock()-start)/iterations);
  }
  const nested=await state.invoke_json('transient',[]);assert.equal(nested.result,false);assert.equal(query(),true);
  results.push({run,n,lane:names[lane],iterations,query_samples_ns:batches,median_query_ns:median(batches),creation_samples_ns:creation,replacement_samples_ns:replacement,checkpoint_samples_ns:checkpoint,restore_samples_ns:restore});
 }
 assert.deepEqual(snapshots[0],snapshots[1]);
}
fs.writeFileSync(path.join(output,`run-${run}.json`),JSON.stringify({schema:1,node:process.version,platform:process.platform,architecture:process.arch,results},null,2)+'\n');
console.log(`Run ${run}: ${results.length} size/lane cases passed`);
