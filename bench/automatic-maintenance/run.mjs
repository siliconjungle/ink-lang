// Paired complete histories. Preparation/restore prices are recorded separately.
import fs from 'node:fs/promises';import path from 'node:path';import{pathToFileURL}from 'node:url';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const [roundText,output,baselinePath,maintainedPath]=process.argv.slice(2),round=Number(roundText);
const files={baseline:path.resolve(baselinePath),maintained:path.resolve(maintainedPath)},modules={};
for(const[k,p]of Object.entries(files))modules[k]=await import(pathToFileURL(p));
const measure=async f=>{const begin=process.hrtime.bigint();const result=await f();return{ns:Number(process.hrtime.bigint()-begin),result};};
const rows=[];
for(const n of [64,4096])for(const reads of [0,1,16]){
 const prefix=Array.from({length:n},(_,i)=>({key:BigInt(i),entry:{active:i%3===0,weight:BigInt(i*17)}}));
 const commands=Array.from({length:128},(_,i)=>({key:BigInt((i*31)%n),entry:{active:i%5!==0,weight:BigInt(i*101+3)}}));
 const expectedMap=new Map(prefix.map(r=>[r.key,r.entry]));const wanted=[];
 for(const c of commands){expectedMap.set(c.key,c.entry);const odd=[...expectedMap.values()].filter(r=>r.active).length%2===1;for(let i=0;i<reads;i++)wanted.push(odd);}
 let snapshot=null;const results={};
 for(const name of (round%2?['maintained','baseline']:['baseline','maintained'])){
  const created=await measure(()=>{const state=modules[name].createState(),write=state.bind('write',{resultOnly:true});for(const r of prefix)write(r.key,r.entry,false);return state;});
  const state=created.result,initial=await state.checkpoint();if(snapshot===null)snapshot=initial;else assert.deepEqual(initial,snapshot);
  const write=state.bind('write',{resultOnly:true}),read=state.bind('odd_count',{resultOnly:true}),even=state.bind('even_count',{resultOnly:true});
  const samples=[],restore=[];let final;
  for(let repeat=-2;repeat<9;repeat++){
   const reset=await measure(()=>state.restore(initial));
   const observations=[];const measured=await measure(()=>{for(const c of commands){write(c.key,c.entry,false);for(let i=0;i<reads;i++)observations.push(read());}});
   assert.deepEqual(observations,wanted);assert.equal(read(),[...expectedMap.values()].filter(r=>r.active).length%2===1);assert.equal(even(),!read());
   final=await state.checkpoint();if(repeat>=0){samples.push(measured.ns);restore.push(reset.ns);}
  }
  results[name]={initialise_ns:created.ns,history_ns:samples,restore_ns:restore,snapshot_sha256:crypto.createHash('sha256').update(final).digest('hex')};
 }
 assert.equal(results.baseline.snapshot_sha256,results.maintained.snapshot_sha256);
 rows.push({n,updates:commands.length,reads_per_update:reads,variants:results,validated:true});
}
const hashes={};for(const[k,p]of Object.entries(files))hashes[k]=crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
await fs.writeFile(output,JSON.stringify({schema:1,round,hashes,rows,scope:'Fresh Node process with alternating variant order; nine measured histories per variant; exact outputs and portable snapshots checked outside timing. Initialisation and restore priced separately; shared-machine results.'},null,2)+'\n');
console.log(JSON.stringify({round,rows:rows.length,output}));
