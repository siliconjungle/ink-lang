import fs from 'node:fs';
import path from 'node:path';
import {checkCodec,verifyMode} from './state-wasm-checks.mjs';
const [manifestPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw new Error('usage: state-wasm.mjs MANIFEST.json OUTPUT.json');
const root=path.dirname(manifestPath),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const read=file=>new Uint8Array(fs.readFileSync(path.join(root,file)));
const results=[];
for(const mode of manifest.modes) {
  const fixture=Object.fromEntries(manifest.fixture_files.map(file=>[file,read(mode.fixture+'/'+file)]));
  const wasm=read(mode.wasm),module=await WebAssembly.compile(wasm);
  const result=await verifyMode({name:mode.name,wasm:module,fixture,nativeMiddle:read(mode.native_middle),wrongSnapshot:read(mode.wrong_snapshot)});
  fs.writeFileSync(path.join(root,mode.return_snapshot),result.returnSnapshot);
  const {returnSnapshot,finalSnapshot,...stats}=result;
  results.push({...stats,native_source:mode.native_source,native_receiver:mode.native_receiver,wasm_bytes:wasm.length,imports:WebAssembly.Module.imports(module),exports:WebAssembly.Module.exports(module)});
}
const result={status:'passed',node:process.version,v8:process.versions.v8,codec:checkCodec(),modes:results,scope:'Functional stateful Wasm/native/reference interoperability and ABI checks; no performance ranking or crash durability claim.'};
fs.writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
