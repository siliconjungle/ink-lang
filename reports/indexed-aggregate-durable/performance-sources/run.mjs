import {createState} from './program.mjs';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const seed=createState(),key=i=>BigInt(i).toString(16).padStart(32,'0');
for(let i=0;i<4000;i++)await seed.invoke('create',[key(i),'row',10]);
const initial=await seed.checkpoint(),out=[];
for(let round=0;round<5;round++)for(const label of round%2?['after','before']:['before','after'])for(const mode of ['query','write']){
 const {DurableState}=await import(`./${label}/durable-state.mjs`),{openFileStore}=await import(`./${label}/durable-file.mjs`);
 const dir=await mkdtemp(join(tmpdir(),'ink-durable-perf-')),path=join(dir,'state');let snapshots=0,restores=0;
 const wrap=s=>new Proxy({},{get(t,k){if(k==='checkpoint')return (...args)=>{snapshots++;return s.checkpoint(...args);};return Reflect.get(s,k,s);}});
 const factory={create:async()=>{const s=createState();await s.restore(initial);return wrap(s);},restore:async bytes=>{restores++;const s=createState();await s.restore(bytes);return wrap(s);}};
 const store=await openFileStore(path);let written=0;
 for(const name of ['commit','append'])if(store[name]){const f=store[name];store[name]=async(...args)=>{written+=args[1].length;return f(...args);};}
 let host=await DurableState.open({factory,store});snapshots=0;restores=0;written=0;const calls=96,start=process.hrtime.bigint();
 let reply;
 for(let i=0;i<calls;i++)reply=await host.invoke('id-'+i,mode==='query'?'stock_of':'restock',mode==='query'?[key(2000)]:[key(2000),1]);
 const elapsed=process.hrtime.bigint()-start,counters={snapshots,restores,written};
 const snapshot=await host.checkpoint(),digest=createHash('sha256').update(snapshot).digest('hex'),version=await host.version(),events=(await host.events()).length;
 await host.close();host=await DurableState.open({factory,store:await openFileStore(path)});assert.deepEqual(await host.checkpoint(),snapshot);assert.equal(await host.version(),version);await host.close();
 out.push({label,mode,round,rows:4000,calls,ns:String(elapsed),...counters,version:String(version),events,snapshot_sha256:digest,file_bytes:(await stat(path)).size});await rm(dir,{recursive:true,force:true});
}
for(const mode of ['query','write'])assert.equal(new Set(out.filter(x=>x.mode===mode).map(x=>x.snapshot_sha256)).size,1);
console.log(JSON.stringify({measurements:out},null,2));
