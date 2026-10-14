import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {captureBundle} from './engine-profile-assets.mjs';

test('acquisition binds served shader and host bytes before disk can change',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ink-engine-assets-'));
 const names=['manifest.json','ink-gpu.mjs','complete-session.mjs','ink-device.mjs','cpu.wasm','program.mjs','backend-selection.mjs','pipeline-contract.mjs','prepared-wasm.mjs','ink-abi.mjs','ink-selection.mjs','ink-selection.wasm','compute-0.wgsl','graph-1-0.wgsl'];
 try{
  for(const name of names)await fs.writeFile(path.join(dir,name),name+' original bytes');
  await fs.writeFile(path.join(dir,'checks.json'),'old measurement is not an execution asset');
  const captured=await captureBundle(dir);
  assert.deepEqual([...captured.assets.keys()].sort(),[...names].sort());
  for(const name of ['compute-0.wgsl','graph-1-0.wgsl','program.mjs','cpu.wasm']){
   await fs.writeFile(path.join(dir,name),'changed');
   assert.equal(captured.assets.get(name).toString(),name+' original bytes');
   assert.equal(captured.hashes['bundle/'+name],crypto.createHash('sha256').update(captured.assets.get(name)).digest('hex'));
  }
  const changed=await captureBundle(dir);assert.notEqual(changed.hashes['bundle/compute-0.wgsl'],captured.hashes['bundle/compute-0.wgsl']);
  await fs.unlink(path.join(dir,'complete-session.mjs'));
  await assert.rejects(captureBundle(dir),/missing engine bundle asset/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
