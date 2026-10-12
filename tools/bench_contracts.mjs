// Complete public calls; proof checking, compilation, input construction and
// output comparisons are outside timing. Retain every output until compared.
import fs from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const configuration=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const baseline=await import(pathToFileURL(configuration.baseline));
const measurements=[];
for(const candidate of configuration.candidates){
 const selected=await import(pathToFileURL(candidate.path));
 for(const rows of candidate.function==='ids_are_unique'?[16,64,256]:[64,4096,65536]){
  const xs=Array.from({length:rows},(_,i)=>candidate.function==='ids_are_unique'?{id:i,value:i}:candidate.function==='copy'?i:BigInt(i));
  const args=[xs],calls=candidate.function==='ids_are_unique'?4:rows>4096?16:rows>64?64:256;
  const expected=baseline.call(candidate.function,args);
  assert.deepEqual(selected.call(candidate.function,args),expected);
  // Warm both implementations on the same captured immutable values.
  for(let i=0;i<16;i++){baseline.call(candidate.function,args);selected.call(candidate.function,args);}
  for(let round=0;round<9;round++){
   const samples={};
   for(const [label,module] of round%2?[['selected',selected],['baseline',baseline]]:[['baseline',baseline],['selected',selected]]){
    const results=[];const start=process.hrtime.bigint();
    for(let i=0;i<calls;i++)results.push(module.call(candidate.function,args));
    samples[label]=String((process.hrtime.bigint()-start)/BigInt(calls));
    for(const value of results)assert.deepEqual(value,expected);
   }
   measurements.push({candidate:candidate.id,function:candidate.function,rows,calls,round,...samples});
  }
 }
}
console.log(JSON.stringify({schema:1,boundary:'complete public JavaScript call; precondition checks and representation conversion included; immutable resident inputs; all outputs retained and compared outside timing; proof checking, compilation and setup excluded',target:{hardware:os.cpus()[0].model,driver:`${os.platform()} ${os.release()}`,toolchain:process.version,backend:'javascript',bridge:'public-call-resident-v1'},measurements}));
