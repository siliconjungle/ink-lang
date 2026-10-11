import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const [sourcePath,directPath,indexedPath,output]=process.argv.slice(2);
const candidates={source:await import(pathToFileURL(resolve(sourcePath))),direct:await import(pathToFileURL(resolve(directPath))),indexed:await import(pathToFileURL(resolve(indexedPath)))};
const rows=4000,calls=96,seed=candidates.source.createState();for(let i=0;i<rows;i++)await seed.invoke('put',[BigInt(i),BigInt(i),i%2===0,false]);(seed.acknowledge_through??seed.acknowledgeThrough).call(seed,0xffffffffffffffffn,0xffffffffffffffffn);const initial=await seed.checkpoint();
const result={rows,calls,measurements:[]};const elapsed=async fn=>{const start=process.hrtime.bigint(),value=await fn();return {ns:String(process.hrtime.bigint()-start),value};};
for(let round=0;round<5;round++)for(const label of round%2?['indexed','direct','source']:['source','direct','indexed']){
 const m=candidates[label];let state;const init=await elapsed(async()=>{state=m.createState();await state.restore(initial);});result.measurements.push({label,round,phase:'initialise',calls:1,ns:init.ns});
 for(const action of ['put','total_query','count_query','erase']){
  state=m.createState();await state.restore(initial);const args=i=>action==='put'?[BigInt((i*37)%rows),BigInt(rows+i),i%3===0,false]:action==='erase'?[BigInt((i*37)%rows),false]:[];
  // Separate warm-up state keeps the measured history identical for every candidate.
  const warm=m.createState();await warm.restore(initial);for(let i=0;i<16;i++)await warm.invoke(action,args(i));
  const timed=await elapsed(async()=>{let reply;for(let i=0;i<calls;i++)reply=await state.invoke(action,args(i));return reply;});
  const checkpoint=await state.checkpoint();result.measurements.push({label,round,phase:'action:'+action,calls,ns:timed.ns,reply:JSON.parse(JSON.stringify(timed.value,(_k,v)=>typeof v==='bigint'?String(v):v)),snapshot_sha256:createHash('sha256').update(checkpoint).digest('hex')});
 }
 const teardown=await elapsed(async()=>{await state.checkpoint();state=null;if(typeof globalThis.gc!=='function')throw Error('benchmark requires --expose-gc');globalThis.gc();});result.measurements.push({label,round,phase:'teardown',calls:1,ns:teardown.ns});
}
for(const action of ['put','total_query','count_query','erase'])assert.equal(new Set(result.measurements.filter(m=>m.phase==='action:'+action).map(m=>m.snapshot_sha256)).size,1,action+' exact snapshots');
await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log('identical 4000-row histories and exact snapshots passed');
