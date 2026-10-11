import {readFile,writeFile} from 'node:fs/promises';
const originalFetch=globalThis.fetch;
globalThis.fetch=async value=>{
  const url=new URL(value);if(url.protocol!=='file:')return originalFetch(value);
  const bytes=await readFile(url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const {run}=await import('./runner.mjs');
const result=await run(new URL('../../build/frontier-diff/',import.meta.url),{validateOnly:process.argv.includes('--validate-only'),prepared:process.argv.includes('--prepared'),progress:console.log});
const output=process.argv.includes('--prepared')?'node-prepared.json':process.argv.includes('--validate-only')?'node-validation.json':'node-results.json';
await writeFile(new URL('../../reports/frontier-diff-2026-10-12/'+output,import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(result.status,result.samples.length,'samples');
