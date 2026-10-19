import {readFile,writeFile} from 'node:fs/promises';
import {benchmark} from '../measure.mjs';
import {fixture} from './fixtures.mjs';
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>url.protocol==='file:'?new Response(await readFile(url)):nativeFetch(url,options);
const result=await benchmark({base:new URL('./',import.meta.url),name:'predict',fixture});
await writeFile(new URL(process.argv[2]??'node.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.rows.map(r=>({n:r.n,modes:Object.fromEntries(r.modes.map(m=>[m.mode,m.medianUs]))}))));
