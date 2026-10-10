import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [folder,backend,crashFile]=process.argv.slice(2),root=pathToFileURL(resolve(folder)+'/');
const {DurableState}=await import(new URL('durable-state.mjs',root));
const {openFileStore}=await import(new URL('durable-file.mjs',root));
let factory;
if(backend==='javascript'){
 const {createState}=await import(new URL('program.mjs',root));
 factory={create:createState,restore:async bytes=>{const s=createState();await s.restore(bytes);return s;}};
}else{
 const {StatefulModule}=await import(new URL('state-wasm.mjs',root));
 const module=await StatefulModule.instantiate(new Uint8Array(await readFile(new URL(`${backend}/target/wasm32-unknown-unknown/release/compiled_state.wasm`,root))));
 factory={create:()=>module.create(),restore:bytes=>module.restore(bytes)};
}
const id='00000000000000000000000000000001';
if(crashFile){
 const store=await openFileStore(crashFile),commit=store.commit;
 store.commit=async(...args)=>{await commit(...args);process.exit(73);};
 const host=await DurableState.open({factory,store});await host.invoke('lost-reply','restock',[id,5]);throw Error('Crash injection failed');
}
const dir=await mkdtemp(join(tmpdir(),'ink-compiled-durable-')),file=join(dir,'state');
try{
 let host=await DurableState.open({factory,store:await openFileStore(file)});
 await host.invoke('create','create',[id,'雪\u0000😀',10]);await host.invoke('update','restock',[id,2]);
 const before=await host.checkpoint();await host.close();host=await DurableState.open({factory,store:await openFileStore(file)});
 assert.deepEqual(await host.checkpoint(),before);const prior=await host.version();await host.invoke('update','restock',[id,2]);assert.equal(await host.version(),prior);
 // A real process dies after file and directory sync, before returning the action reply.
 await host.close();const child=spawnSync(process.execPath,[process.argv[1],folder,backend,file],{encoding:'utf8'});
 assert.equal(child.status,73,child.stderr);host=await DurableState.open({factory,store:await openFileStore(file)});
 const recovered=await host.version();await host.invoke('lost-reply','restock',[id,5]);assert.equal(await host.version(),recovered);
 const query=await host.invoke('read','stock_of',[id]);assert.equal(BigInt(query.result.Some),17n);
 assert.equal((await host.events()).length,2);let deliveries=0;await host.deliver(async()=>{deliveries++;});assert.equal(deliveries,2);
 await host.close();host=await DurableState.open({factory,store:await openFileStore(file)});assert.deepEqual(await host.events(),[]);
 const aborted=await host.invoke('overflow','restock',[id,4294967295]);assert.equal(aborted.committed,false);assert.equal(await host.version(),recovered);await host.close();
 console.log(`${backend}: compiled recovery, lost-reply deduplication, abort and durable outbox passed`);
}finally{await rm(dir,{recursive:true,force:true});}
