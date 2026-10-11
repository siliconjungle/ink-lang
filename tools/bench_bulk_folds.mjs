import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
const modules=await Promise.all(process.argv.slice(2).map(f=>import(pathToFileURL(path.resolve(f)))));let checksum=0;
for(const n of [8,128,1024,10000])for(const name of ['collect','append']){
 const args=[Array.from({length:n},(_,i)=>i>>>0),[8,9]];assert.deepEqual(modules[0].call(name,args),modules[1].call(name,args));
 for(let i=0;i<10;i++)for(const m of modules)m.call(name,args);
 const times=[[],[]],iterations=n>=10000?8:64;
 for(let sample=0;sample<7;sample++)for(const index of sample%2?[1,0]:[0,1]){let start=performance.now();for(let i=0;i<iterations;i++)checksum^=modules[index].call(name,args)[0];times[index].push(Math.round((performance.now()-start)*1e6/iterations));}
 console.log(JSON.stringify({function:name,length:n,baseline_ns:times[0],selected_ns:times[1],iterations,scope:'generated JavaScript trusted-values call; complete return list, no JSON conversion'}));
}assert(Number.isInteger(checksum));
