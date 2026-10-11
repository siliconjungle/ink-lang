// Untimed allocation/copy attribution on a deliberately adversarial ABI fixture.
// No elapsed times are read; this is not evidence of generated-target speed.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {transportFixture} from '../../../runtime/tests/transport40-fixture.mjs';
const root=new URL('../../../',import.meta.url),rows=[];
for(const variant of ['original','candidate']) {
 const host=new URL(variant==='original'?'reports/web-stack-engine-40-2026-10-11/transport/original/runtime/hosts/ink-compute.mjs':'runtime/hosts/ink-compute.mjs',root);
 for(const n of [0,1,32,2048])for(const backend of ['cpu','auto'])await transportFixture(async(runtime,counts)=>{
  const input=Uint32Array.from({length:n},(_,i)=>Math.imul(i+1,2654435761)),expected=Array.from(input),before=input.slice();
  const result=await runtime.call('words',[input],{backend});assert.deepEqual(result.value,expected);assert.deepEqual(input,before);
  const sum=result.value.reduce((acc,x,i)=>(acc+Math.imul(i+1,x))>>>0,n>>>0);
  rows.push({variant,n,backend,complete_output:true,nonmutation:true,checksum:sum,counters:{...counts},host_sha256:createHash('sha256').update(await readFile(host)).digest('hex')});
 },{host});
}
const result={status:'passed',timers_read:false,fixture_not_generated_code:true,rows,limits:'Mock ABI deliberately grows memory and poisons reset. Exact copy counts establish removal of an operation, not execution-time improvement or compiled target correctness.'};
await writeFile(new URL(process.argv[2]??'copy-counts.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'passed',rows:rows.length,original_arena_slices:rows.filter(x=>x.variant==='original').reduce((n,x)=>n+x.counters.arena_result_slices,0),candidate_arena_slices:rows.filter(x=>x.variant==='candidate').reduce((n,x)=>n+x.counters.arena_result_slices,0)}));
