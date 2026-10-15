import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [file,directory]=process.argv.slice(2);
const asset=name=>import(pathToFileURL(resolve(directory,'hosts',name)).href);
const {DurableState,RecoveryRequired}=await asset('durable-state.mjs');
const {openFileStore}=await asset('durable-file.mjs');
const {ScheduledActions}=await asset('scheduled-actions.mjs');
const {createState}=await import(pathToFileURL(resolve(file)).href);
const factory={create:createState,async restore(bytes){const state=createState();await state.restore(bytes);return state;}};
const golden=await Promise.all(['queued','first','complete'].map(name=>readFile(join(directory,name+'.snapshot'))));
const offline=await readFile(join(directory,'offline.snapshot'));
const equal=(a,b)=>assert.deepEqual(Buffer.from(a),Buffer.from(b));
const observation={input:1,target:1,rate:0.1};
for(const fault of ['none','before','after','offline']) {
 const directory=await mkdtemp(join(tmpdir(),'ink-learning-')),path=join(directory,'session');
 let host;
 try {
  host=await DurableState.open({factory:fault==='offline'?{...factory,create:()=>factory.restore(offline)}:factory,store:await openFileStore(path)});
  if(fault!=='offline') {
  for(let i=1;i<=4;i++)assert.equal((await host.invoke('observe:'+i,'enqueue',[i,observation])).result.Ok,true);
  await host.invoke('begin','begin',[]);await host.invoke('work','work',[1,1]);
  }
  assert.equal((await host.invoke('prediction','predict',[1])).result.Ok,0);
  equal(await host.checkpoint(),golden[0]);
  await host.close();
  const store=await openFileStore(path),append=store.append;let armed=fault==='before'||fault==='after';
  store.append=async(...args)=>{if(!armed||JSON.parse(new TextDecoder().decode(args[1])).kind!=='invoke')return append(...args);armed=false;if(fault==='after')await append(...args);throw Error('power loss');};
  host=await DurableState.open({factory,store});equal(await host.checkpoint(),golden[0]);
  const startingVersion=await host.version();let first=true,reads=0;
  const plan=async host=>{
   const version=await host.version();
   if(reads>20)throw Error("Service failed to finish its bounded history");
   const state=(await host.invoke('status:'+version,'status',[])).result.Ok;
   // Serving predictions remain available between bounded training turns.
   await host.invoke('read:'+version,'predict',[1]);reads++;
   if(!state.pending||state.paused)return null;
   return {id:'turn:'+version,call:'pump',args:[],delayMs:1};
  };
  let service=new ScheduledActions({host,plan,onResult(reply){assert.equal(reply.committed,true);if(first){first=false;equalSnapshotLater=true;}if(reply.result.Ok.version===2)service.requestStop();}});
  let equalSnapshotLater=false;
  if(fault==='none'||fault==='offline') {
   await service.run();assert(reads>=2);assert(equalSnapshotLater);equal(await host.checkpoint(),golden[2]);
  } else {
   await assert.rejects(service.run(),RecoveryRequired);await assert.rejects(host.checkpoint(),RecoveryRequired);await host.close();
   host=await DurableState.open({factory,store:await openFileStore(path)});
   equal(await host.checkpoint(),golden[fault==='after'?1:0]);
   const reply=await host.invoke('turn:'+startingVersion,'pump',[]);assert.equal(reply.result.Ok.version,1);
   equal(await host.checkpoint(),golden[1]);
   service=new ScheduledActions({host,plan,onResult(reply){assert.equal(reply.committed,true);if(reply.result.Ok.version===2)service.requestStop();}});
   await service.run();equal(await host.checkpoint(),golden[2]);
  }
  const saved=await host.checkpoint();await host.close();
  host=await DurableState.open({factory,store:await openFileStore(path)});equal(await host.checkpoint(),saved);
  const final=(await host.invoke('final-status','status',[])).result.Ok;
  assert.equal(final.pending,0);assert.equal(final.published_through,4);assert.equal(final.version,2);
  await host.close();host=null;
 } finally {await host?.close();await rm(directory,{recursive:true,force:true});}
}
console.log('Compiled continuous learning: serving, queued work, exact recovery and ambiguous publication passed (4 histories, including offline CLI bootstrap).');
