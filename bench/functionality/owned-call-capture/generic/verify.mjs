import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>url.protocol==='file:'?new Response(await readFile(url)):oldFetch(url,options);
const {loadInk}=await import('./candidate/ink-gpu.mjs');const engine=await loadInk(new URL('./candidate/',import.meta.url),{gpu:false});
let comparisons=0;
try{for(const n of [0,1,100,1024]){const args=JSON.parse(await readFile(new URL(`input-${n}.json`,import.meta.url))),expected=JSON.parse(await readFile(new URL(`reference-${n}.json`,import.meta.url)));
 for(const backend of ['javascript','cpu','auto']){const r=await engine.call('predict',args,{backend});assert.deepEqual(r.value,expected);comparisons++;}
 const call=engine.prepareCall('predict',args);args[0].a=9;args[1].forEach(s=>s.x=9);
 for(const backend of ['javascript','cpu','auto']){const r=await call.run({backend});assert.deepEqual(r.value,expected);r.value.fill(99);assert.deepEqual((await call.run({backend})).value,expected);comparisons+=2;}await call.close();
}
const floats=[-0,{F32Bits:0xff812345},Infinity];assert.throws(()=>engine.prepareCall('identity',[floats]),/overflow/);floats.pop();
const id=engine.prepareCall('identity',[floats]);for(const backend of ['javascript','cpu','auto']){const r=await id.run({backend});assert.deepEqual(r.value,floats);r.value[1].F32Bits=0;assert.deepEqual((await id.run({backend})).value,floats);comparisons+=2;}await id.close();
}finally{await engine.close();}
const result={comparisons,reference:true,wasm:true,negativeZero:true,exactNanPayload:true,ownedRepeatedResults:true};await writeFile(new URL('conformance.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
