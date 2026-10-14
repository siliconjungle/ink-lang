// Capture the exact browser bundle once, before acquisition. Serving these
// bytes keeps later filesystem changes out of the measured implementation.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function captureBundle(directory){
 const assets=new Map(),hashes={};
 for(const file of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(!file.isFile()||!(/\.(mjs|wasm|wgsl)$/.test(file.name)||['manifest.json','plan.json'].includes(file.name)))continue;
  const bytes=await fs.readFile(path.join(directory,file.name));
  assets.set(file.name,bytes);hashes['bundle/'+file.name]=crypto.createHash('sha256').update(bytes).digest('hex');
 }
 for(const name of ['manifest.json','ink-gpu.mjs','complete-session.mjs','ink-device.mjs','cpu.wasm','program.mjs','backend-selection.mjs','pipeline-contract.mjs','prepared-wasm.mjs','ink-abi.mjs','ink-selection.mjs','ink-selection.wasm']){
  if(!assets.has(name))throw Error('missing engine bundle asset: '+name);
 }
 return {assets,hashes};
}
