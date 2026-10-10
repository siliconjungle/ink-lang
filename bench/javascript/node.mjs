// Execute browser bundle CPU/JS paths in Node with a file-backed fetch host.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const [directory,fixturePath,output]=process.argv.slice(2);
const root=pathToFileURL(path.resolve(directory)+'/');
globalThis.fetch=async url=>new Response(await fs.readFile(new URL(url)));
const {loadInk}=await import(new URL('ink-gpu.mjs',root));
const engine=await loadInk(root,{gpu:false});
const fixtures=JSON.parse(await fs.readFile(fixturePath,'utf8'));
const packed=engine.manifest.schema===2;
const json=v=>JSON.stringify(v,(_,v)=>typeof v==='bigint'?v.toString():v);
let comparisons=0;
for(const f of fixtures)for(const backend of ['cpu','javascript']) {
  const result=packed?(f.pipeline?await engine.pipeline(f.pipeline,{backend}):await engine.call(f.call,f.args,{backend})):await engine.run(f.call,f.args,backend);
  const actual=f.pipeline?result.values:result.value;
  if(packed)assert.deepEqual(JSON.parse(json(actual)),JSON.parse(json(f.expected)),`${backend}/${f.call??'pipeline'}`);
  else assert.equal(String(actual),String(f.expected),`${backend}/${f.call}`);
  assert.equal(result.backend,backend);comparisons++;
}
const small=packed?await engine.call('indexed',[[1,2,3]],{backend:'auto'}):await engine.run('total',[[1,2,3],3],'auto');
assert.ok(['cpu','javascript'].includes(small.backend));assert.ok(small.profile.times_ms.javascript>=0);
if(packed) {
  const xs=[1];const pending=engine.call('indexed',[xs],{backend:'javascript'});xs[0]=99;
  assert.equal((await pending).value[0],-2);
  const results=await Promise.all(Array.from({length:8},(_,i)=>engine.call('locals',[i],{backend:'javascript'})));
  results.forEach((r,i)=>assert.equal(r.value,1-i*2));
}
const receipt={status:'passed',comparisons,host:process.version,manifest:engine.manifest.javascript,small_selection:small};
await (engine.dispose??engine.close)();
await fs.writeFile(output,json(receipt)+'\n');console.log(JSON.stringify({status:receipt.status,comparisons,selected:small.backend}));
