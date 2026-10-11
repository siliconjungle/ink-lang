import fs from 'node:fs';import assert from 'node:assert/strict';import {parseExactJSON,StatefulModule} from './state-wasm.mjs';
const here=new URL('.',import.meta.url),oracle=parseExactJSON(fs.readFileSync(new URL('oracle.json',here),'utf8'));
const wasm=!!process.env.INK_REP_WASM;const module=wasm?await StatefulModule.instantiate(fs.readFileSync(new URL('program.wasm',here))):await import(new URL('program.mjs',here));let state=wasm?module.create():module.createState();
const normal=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?String(v):Array.isArray(v)?v.map(normal):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normal(x)])):v;
function invokeWire(step){if(!step.wire)return state.invoke(step.call,step.args);const input=module.input(module.encoder.encode(step.wire));try{return module.response(module.call('lang_invoke',state.handle,input));}finally{module.release(input);}}
const checkpoint=async()=>wasm?state.snapshot():state.checkpoint();
async function restore(bytes){if(wasm){const next=module.restore(bytes);state.dispose();state=next;}else await state.restore(bytes);}
for(let i=0;i<oracle.length;i++){
 const step=oracle[i];if(step.restore)await restore(new Uint8Array(step.restore.map(Number)));
 else if(step.ack){if(wasm)state.acknowledge(...step.ack);else state.acknowledge_through(...step.ack);}
 else{let reply;try{reply={ok:await (wasm?invokeWire(step):state.invoke_json(step.call,step.args))};}catch(e){reply={error:e.message};}assert.deepEqual(normal(reply),normal(step.reply),`reply ${i}`);}
 if(!wasm&&typeof state['query_'+step.call]==='function'&&step.reply?.ok){assert.deepEqual(normal(state['query_'+step.call](...step.args)),normal(step.reply.ok.result),`direct query ${i}`);}
 const bytes=await checkpoint();assert.deepEqual(Array.from(bytes),step.snapshot.map(Number),`snapshot ${i}`);assert.deepEqual(normal(wasm?state.events():state.outbox),normal(step.outbox),`outbox ${i}`);await restore(bytes);assert.deepEqual(await checkpoint(),bytes,`restored ${i}`);
}
const before=await checkpoint();for(const position of [12,before.length-1]){const corrupt=before.slice();corrupt[position]^=1;await assert.rejects(restore(corrupt));assert.deepEqual(await checkpoint(),before);}await assert.rejects(restore(before.slice(0,-1)));assert.deepEqual(await checkpoint(),before);
if(!wasm){const captured=before.slice(),pending=state.restore(captured);captured.fill(0);await pending;assert.deepEqual(await checkpoint(),before);}
if(!wasm){
 state=module.createState();const mutation=oracle.find(s=>s.reply?.ok?.committed===true)??oracle.find(s=>s.reply?.ok);
 const digest=globalThis.crypto.subtle.digest;
 try{globalThis.crypto.subtle.digest=async()=>{throw Error('snapshot encoder must not run during invocation');};assert.deepEqual(normal(await state.invoke_json(mutation.call,mutation.args)),normal(mutation.reply.ok));}
 finally{globalThis.crypto.subtle.digest=digest;}
 const saved=await checkpoint();const pending=state.restore(saved);
 const query=oracle.find(s=>s.reply?.ok?.committed===false);
 await assert.rejects(state.invoke_json(query.call,query.args),/state operation already in progress/);await pending;
}
console.log(`${oracle.length} ${wasm?'Wasm':'JavaScript'} caller-trusted standalone requests passed`);
