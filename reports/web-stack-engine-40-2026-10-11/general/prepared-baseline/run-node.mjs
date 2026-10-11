import {readFile,writeFile,access} from 'node:fs/promises';
const originalFetch=globalThis.fetch;
globalThis.fetch=async value=>{
 const url=new URL(value);if(url.protocol!=='file:')return originalFetch(value);
 const bytes=await readFile(url);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const {run}=await import('./runner.mjs'),validateOnly=process.argv.includes('--validate-only');
const output=new URL(validateOnly?'node-validation.json':'node-results.json',import.meta.url);
try{await access(output);throw Error('output already exists; preserve original before a separate authorized run')}catch(error){if(error.code!=='ENOENT')throw error}
const result=await run(new URL('./',import.meta.url),{validateOnly,progress:console.log});
await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(result.status,result.validation.length,'validation rows',result.complete_output_checks,'complete output checks',result.samples.length,'samples');
