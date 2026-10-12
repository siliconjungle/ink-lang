// Exact repeated histories, with warm-up kept outside measured state.
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [ordinary,before,after,output]=process.argv.slice(2);
const modules={ordinary:await import(pathToFileURL(resolve(ordinary))),before:await import(pathToFileURL(resolve(before))),after:await import(pathToFileURL(resolve(after)))};
const rows=Number(process.env.INK_BENCH_ROWS??1024),calls=96,rounds=5;
const row=key=>({value:BigInt(key*17),active:key%2===0,trail:[0n,BigInt(key),0xffffffffffffffffn],maybe:{Some:BigInt(key)},point:[1.25,{F32Bits:2147483648}],signed:-2147483648,exact:{Int:'-123456789012345678901234567890'},label:key%2===0?'🧵 café':'other',owner:'0123456789abcdef0123456789abcdef',unsigned:4294967295,result:{Err:'Error.Failed'},unit:null,nested:{Some:{label:'e\u0301',shade:'Shade.Dark'}}});
const seed=modules.ordinary.createState();for(let i=0;i<rows;i++)await seed.invoke('put',[BigInt(i),row(i),BigInt(i),false]);
(seed.acknowledge_through??seed.acknowledgeThrough).call(seed,0xffffffffffffffffn,0xffffffffffffffffn);
const initial=await seed.checkpoint(),measurements=[];
const elapsed=async f=>{const start=process.hrtime.bigint(),value=await f();return {ns:String(process.hrtime.bigint()-start),value};};
const args=(action,i)=>{
 const first=BigInt(i*37%rows),second=BigInt((i*37+1)%rows);
 if(action==='edits')return [first,second,BigInt(rows+i),false];
 if(action==='replace_remove'||action==='remove_replace')return [first,second,BigInt(rows+i)];
 if(action==='erase')return [first,second,false];
 if(action==='dynamic')return [7n];
 if(action==='for_owner')return ['0123456789abcdef0123456789abcdef'];
 return [];
};
const actions=['edits','replace_remove','remove_replace','erase','weighted_query'];
for(let round=0;round<rounds;round++)for(const label of round%2?['after','before','ordinary']:['ordinary','before','after']){
 const m=modules[label];let state;
 const init=await elapsed(async()=>{state=m.createState();await state.restore(initial);});measurements.push({label,round,phase:'initialise',calls:1,ns:init.ns});
 for(const action of actions){
  state=m.createState();await state.restore(initial);const warm=m.createState();await warm.restore(initial);for(let i=0;i<16;i++)await warm.invoke(action,args(action,i));
  const timed=await elapsed(async()=>{let reply;for(let i=0;i<calls;i++)reply=await state.invoke(action,args(action,i));return reply;});
  measurements.push({label,round,phase:'action:'+action,calls,ns:timed.ns,reply:JSON.parse(JSON.stringify(timed.value,(_k,v)=>typeof v==='bigint'?String(v):v)),snapshot_sha256:createHash('sha256').update(await state.checkpoint()).digest('hex')});
 }
 const end=await elapsed(async()=>{await state.checkpoint();state=null;globalThis.gc();});measurements.push({label,round,phase:'teardown',calls:1,ns:end.ns});
}
for(const action of actions){const xs=measurements.filter(m=>m.phase==='action:'+action);assert.equal(new Set(xs.map(m=>m.snapshot_sha256)).size,1,action+' snapshots');assert.equal(new Set(xs.map(m=>JSON.stringify(m.reply))).size,1,action+' replies');}
await writeFile(output,JSON.stringify({schema:1,rows,calls,rounds,measurements},null,2)+'\n');console.log('All repeated replies and portable snapshots agree.');
