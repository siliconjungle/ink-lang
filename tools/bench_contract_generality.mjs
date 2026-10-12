// Run after the documented baseline/optimized representation emission.
// This measures complete calls and lifecycle boundaries, never proof authority.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const directory=path.resolve(process.argv[2]);
const modules=await Promise.all(['baseline','optimized'].map(name=>import(pathToFileURL(path.join(directory,name+'.mjs')))));
const clock=()=>process.hrtime.bigint();
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const results=[];
for(const n of [16,64,128]){
 const values=Array.from({length:n},(_,i)=>i),snapshots=[];
 for(let lane=0;lane<modules.length;lane++){
  const start=clock(),state=modules[lane].createState();
  const creation_ns=Number(clock()-start),replaceStart=clock();
  await state.invoke_json('replace_all',[values]);
  const replacement_ns=Number(clock()-replaceStart),query=state.bind('known_unique',{resultOnly:true});
  for(let i=0;i<20;i++)assert.equal(query(),true);
  const batches=[];
  for(let i=0;i<9;i++){const started=clock();for(let j=0;j<100;j++)assert.equal(query(),true);batches.push(Number(clock()-started)/100);}
  const savedStart=clock(),snapshot=await state.checkpoint();const checkpoint_ns=Number(clock()-savedStart);
  const restoreStart=clock();await state.restore(snapshot);const restore_ns=Number(clock()-restoreStart);
  assert.deepEqual(await state.checkpoint(),snapshot);snapshots.push(snapshot);
  const nested=await state.invoke_json('transient',[]);assert.equal(nested.result,false);assert.equal(query(),true);
  results.push({n,lane:['baseline','optimized'][lane],creation_ns,replacement_ns,complete_query_ns:batches,median_query_ns:median(batches),checkpoint_ns,restore_ns});
 }
 assert.deepEqual(snapshots[0],snapshots[1]);
}
console.log(JSON.stringify({schema:1,semantics:'ink-contract-generality-measurements-v1',node:process.version,platform:process.platform,architecture:process.arch,phases:JSON.parse(fs.readFileSync(path.join(directory,'phases.json'))),results},null,2));
