import {signal,computed,batch,effect} from '@preact/signals-core';
import {deepRows,mapRows,deltaRows,observeRows} from './models.mjs';
import {createState as inkBefore} from '../../build/signals-state/before/aggregate.mjs';
import {createState as inkCurrent} from '../../build/signals-state/after/aggregate.mjs';
import {createState as inkIndexed} from '../../build/signals-state/after/indexed.mjs';
import {createState as inkIndexedBefore} from '../../build/signals-state/before/indexed.mjs';
import {createState as pointBefore} from '../../build/signals-state/before/point.mjs';
import {createState as pointCurrent} from '../../build/signals-state/after/point.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cpus,platform,arch} from 'node:os';
import {execFileSync} from 'node:child_process';
const word=x=>BigInt.asUintN(64,x), median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const initial=n=>Array.from({length:n},(_,i)=>({value:BigInt(i),active:i%2===0}));
function preactRows(init,chunked=false){
  const rows=init.map(r=>signal({...r}));let sumRuns=0,countRuns=0;
  const sums=[],counts=[],chunk=chunked?64:rows.length;
  for(let lo=0;lo<rows.length;lo+=chunk){const slice=rows.slice(lo,lo+chunk);
    sums.push(computed(()=>{sumRuns++;let n=0n;for(const s of slice){const r=s.value;if(r.active)n=word(n+r.value);}return n;}));
    counts.push(computed(()=>{countRuns++;let n=0n;for(const s of slice)if(s.value.active)n++;return n;}));
  }
  const total=computed(()=>sums.reduce((s,c)=>word(s+c.value),0n));
  const count=computed(()=>counts.reduce((s,c)=>s+c.value,0n));
  return {put(k,v,a){rows[Number(k)].value={value:v,active:a};},point(k){return rows[Number(k)].value.value;},total(){return total.value;},count(){return count.value;},counters(){return {sumRuns,countRuns,chunk};}};
}
function preactDelta(init){const rows=new Map(init.map((r,i)=>[BigInt(i),{...r}]));const total=signal(init.reduce((s,r)=>r.active?word(s+r.value):s,0n)),count=signal(BigInt(init.filter(r=>r.active).length));return {put(k,v,a){const old=rows.get(k);batch(()=>{total.value=word(total.value-(old.active?old.value:0n)+(a?v:0n));count.value+=BigInt(a)-BigInt(old.active);rows.set(k,{value:v,active:a});});},point(k){return rows.get(k).value;},total(){return total.value;},count(){return count.value;},counters(){return {manualDelta:true};}};}
const factories={
  'Svelte deep derived':deepRows,'SvelteMap derived':mapRows,
  'Preact computed':init=>preactRows(init),'Preact chunk64':init=>preactRows(init,true),
  'Svelte manual delta':deltaRows,'Preact manual delta':preactDelta,
};
function scalar(reply){return reply instanceof Promise?reply.then(r=>BigInt(r.result)):BigInt(reply.result);}
function adapter(state,bound=false){
  if(bound){const put=state.bind('put',{resultOnly:true}),total=state.bind('total_query',{resultOnly:true}),count=state.bind('count_query',{resultOnly:true});return {put(k,v,a){return put(k,v,a,false);},total,count,counters(){return null;},state};}
  return {put(k,v,a){return state.invoke('put',[k,v,a,false]);},total(){return scalar(state.invoke('total_query',[]));},count(){return scalar(state.invoke('count_query',[]));},counters(){return null;},state};
}
async function inkFixture(label,n){const state=(label==='Ink before'?inkBefore:inkCurrent)();for(let i=0;i<n;i++)state.invoke('put',[BigInt(i),BigInt(i),i%2===0,false]);state.acknowledgeThrough(0xffffffffffffffffn,0xffffffffffffffffn);if(!label.includes('tree'))return adapter(state,label.endsWith('bound'));const checkpoint=await state.checkpoint(),indexed=(label==='Ink checked tree before'?inkIndexedBefore:inkIndexed)();await indexed.restore(checkpoint);return adapter(indexed,label.endsWith('bound'));}
async function make(label,n){if(factories[label])return factories[label](initial(n));return inkFixture(label,n);}
const labels=[...Object.keys(factories),'Ink before','Ink current','Ink current bound','Ink checked tree before','Ink checked tree current','Ink checked tree bound'].filter(label=>!process.env.SIGNAL_CURRENT_ONLY||!label.endsWith('before'));
const samples=[],validations=[],setupSamples=[],observedSamples=[];
let blackhole=0n;
const sizes=process.env.SIGNAL_ROWS?process.env.SIGNAL_ROWS.split(',').map(Number):process.env.QUICK?[256]:[256,4096,16384],rounds=Number(process.env.SIGNAL_ROUNDS??(process.env.QUICK?2:7));
assert(sizes.every(n=>Number.isInteger(n)&&n>=32&&n<=16384)&&Number.isInteger(rounds)&&rounds>=1&&rounds<=31,'bounded benchmark sizes/rounds');
// Validate all returned sums/counts, including full-width unsigned wraparound.
for(const label of labels){const rows=initial(32),m=await make(label,32);for(let j=0;j<48;j++){const k=(j*13)%32,v=j%7===0?18446744073709551615n:BigInt(100+j),a=j%3===0;await m.put(BigInt(k),v,a);rows[k]={value:v,active:a};assert.equal(await m.total(),rows.reduce((s,r)=>r.active?word(s+r.value):s,0n),label+' sum');assert.equal(await m.count(),BigInt(rows.filter(r=>r.active).length),label+' count');}const before=m.counters();for(let j=0;j<20;j++){await m.total();await m.count();}validations.push({label,fullWidthHistory:true,beforeRepeatedReads:before,afterRepeatedReads:m.counters()});}
for(const n of sizes){
  const models={};for(const label of labels){const t=process.hrtime.bigint();models[label]=await make(label,n);setupSamples.push({label,rows:n,ns:Number(process.hrtime.bigint()-t),note:label.includes('tree')?'includes ordinary seed and checkpoint/restore':'single cold construction observation'});await models[label].total();await models[label].count();}
  const calls=Math.max(48,Math.min(1024,Math.floor(1000000/n)));
  for(const phase of ['write-only','update-and-aggregate','burst32-and-aggregate','unchanged-read']){
    for(let round=0;round<rounds;round++){
      const order=round%2?[...labels].reverse():labels;
      const units=phase==='unchanged-read'?Math.max(128,Math.min(2000,Math.floor(2000000/n))):phase==='write-only'?2048:phase==='burst32-and-aggregate'?Math.min(calls,128):calls;
      const burst=phase==='burst32-and-aggregate'?32:1;
      // Inputs constructed before timing; every measured value differs from prior rounds.
      const inputs=Array.from({length:units*burst},(_,i)=>[BigInt((i*37+round*19)%n),BigInt(10000000+round*100000+i+(['write-only','update-and-aggregate','burst32-and-aggregate'].indexOf(phase)+1)*100000000),i%3===0]);
      for(const label of order){const m=models[label];if(globalThis.gc)globalThis.gc();
        const start=process.hrtime.bigint();let result=0n;
        if(phase==='unchanged-read'){for(let i=0;i<units;i++){result=await m.total();result=await m.count();}}
        else if(phase==='write-only'){for(const [k,v,a] of inputs)await m.put(k,v,a);}
        else {for(let i=0;i<units;i++){for(let j=0;j<burst;j++){const [k,v,a]=inputs[i*burst+j];await m.put(k,v,a);}result=await m.total();result=await m.count();}}
        const ns=Number(process.hrtime.bigint()-start);blackhole^=result;
        samples.push({label,rows:n,phase,round,units,writesPerUnit:phase==='unchanged-read'?0:burst,ns,nsPerUnit:ns/units});
      }
      const totals=await Promise.all(labels.map(label=>models[label].total())),counts=await Promise.all(labels.map(label=>models[label].count()));assert(totals.every(x=>x===totals[0]),'history total '+phase);assert(counts.every(x=>x===counts[0]),'history count '+phase);
    }
  }
  console.log('aggregate correctness and timings complete at '+n+' rows');
}
// Point accesses use a separately emitted Ink program. No aggregate is observed.
for(const n of sizes){const models={};for(const label of Object.keys(factories))models[label]=factories[label](initial(n));for(const [label,factory,bound] of [['Ink before',pointBefore,false],['Ink current',pointCurrent,false],['Ink current bound',pointCurrent,true]]){const state=factory();for(let i=0;i<n;i++)state.invoke('put',[BigInt(i),BigInt(i)]);if(bound){const put=state.bind('put',{resultOnly:true}),get=state.bind('get',{resultOnly:true});models[label]={put(k,v){put(k,v);},point(k){return get(k).Some;}};}else models[label]={put(k,v){state.invoke('put',[k,v]);},point(k){return BigInt(state.invoke('get',[k]).result.Some);}};}
const pointLabels=Object.keys(models),units=20000;
for(let round=-1;round<rounds;round++){const inputs=Array.from({length:units},(_,i)=>[BigInt((i*37)%n),BigInt(1000000+(round+1)*units+i)]);for(const label of round%2?[...pointLabels].reverse():pointLabels){const m=models[label];if(globalThis.gc)globalThis.gc();let result=0n;const start=process.hrtime.bigint();for(const [k,v]of inputs){m.put(k,v,true);result=m.point(k);}const ns=Number(process.hrtime.bigint()-start);blackhole^=result;assert.equal(result,inputs.at(-1)[1]);if(round>=0)samples.push({label,rows:n,phase:'point-update-and-read',round,units,writesPerUnit:1,ns,nsPerUnit:ns/units});}}console.log('point correctness and timings complete at '+n+' rows');}
// Connected reactive consumers: a separate state-only observer boundary.
for(const n of sizes){
  const observed={
    'Svelte deep observed':observeRows(deepRows,initial(n)),
    'SvelteMap observed':observeRows(mapRows,initial(n)),
  };
  for(const [label,chunked] of [['Preact computed observed',false],['Preact chunk64 observed',true]]){const m=preactRows(initial(n),chunked);m.close=effect(()=>{m.total();m.count();});observed[label]=m;}
  const observedLabels=Object.keys(observed),units=Math.max(24,Math.min(512,Math.floor(500000/n)));
  for(const phase of ['observed-update-and-aggregate','observed-unchanged-read'])for(let round=-1;round<rounds;round++){
    const count=phase==='observed-unchanged-read'?2000:units;
    const inputs=Array.from({length:count},(_,i)=>[BigInt((i*37+Math.max(round,0)*19)%n),BigInt(10000000+(round+1)*100000+i),i%3===0]);
    for(const label of round%2?[...observedLabels].reverse():observedLabels){const m=observed[label];if(globalThis.gc)globalThis.gc();let sum=0n,size=0n;const start=process.hrtime.bigint();for(let i=0;i<count;i++){if(phase==='observed-update-and-aggregate'){const [k,v,a]=inputs[i];await m.put(k,v,a);}sum=await m.total();size=await m.count();}const ns=Number(process.hrtime.bigint()-start);blackhole^=sum^size;if(round>=0){const item={label,rows:n,phase,round,units:count,writesPerUnit:phase==='observed-unchanged-read'?0:1,ns,nsPerUnit:ns/count};samples.push(item);observedSamples.push(item);}}
    const totals=await Promise.all(observedLabels.map(l=>observed[l].total())),counts=await Promise.all(observedLabels.map(l=>observed[l].count()));assert(totals.every(x=>x===totals[0]));assert(counts.every(x=>x===counts[0]));
  }
  for(const m of Object.values(observed))m.close();console.log('connected observer checks complete at '+n+' rows');
}
const summary=[];for(const label of [...labels,'Svelte deep observed','SvelteMap observed','Preact computed observed','Preact chunk64 observed'])for(const rows of sizes)for(const phase of [...new Set(samples.map(s=>s.phase))]){const ss=samples.filter(s=>s.label===label&&s.rows===rows&&s.phase===phase);if(ss.length){const ns=ss.map(s=>s.nsPerUnit);summary.push({label,rows,phase,medianNs:median(ns),minNs:Math.min(...ns),maxNs:Math.max(...ns),repetitions:ss.length});}}
const files=['bench.mjs','models.svelte.js','models.mjs','point.ink','package-lock.json','../../examples/filtered-aggregate.ink','../../knowledge/research/indexed-aggregate/request.json','../../build/signals-state/before/aggregate.mjs','../../build/signals-state/before/point.mjs','../../build/signals-state/before/indexed.mjs','../../build/signals-state/after/aggregate.mjs','../../build/signals-state/after/point.mjs','../../build/signals-state/after/indexed.mjs'];const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(new URL(file,import.meta.url))).digest('hex');
const output={date:'2026-10-12',scope:'Exploratory Node state-only comparison; aggregate calls use a common awaited interface (cached Ink export is async); point calls are synchronous; no DOM, rendering, durability, or total lifecycle claim; observer phases explicitly include connected derived consumers and effect scheduling. Ink calls include versions/events/transaction machinery; signal controls do not. Before and current use the same checked core, source and representation request; the before JavaScript backend is pinned at e9a45c390c3a6a9ffbfe756e2423d280f7a9f430. Current artifacts were freshly emitted after these changes; the checked tree uses the same proof request. Bound lanes use trusted scalar carriers, owned composite capture and result-only replies, with events retained in Ink outboxes.',hardware:cpus()[0].model,node:process.version,platform:platform(),arch:arch(),versions:JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8')).dependencies,inkWorkspaceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),inkLoweringRevision:execFileSync('git',['-C','../../lowerings/js','rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineLoweringRevision:'e9a45c390c3a6a9ffbfe756e2423d280f7a9f430',hashes,validations,setupSamples,observedSamples,samples,summary,blackhole:String(blackhole)};
output.executionDate=new Date().toISOString();output.configuration={sizes,rounds,forcedGC:!!globalThis.gc,currentOnly:!!process.env.SIGNAL_CURRENT_ONLY};
if(process.env.SIGNAL_TREE_REQUEST)output.treeRequestSha256=createHash('sha256').update(await readFile(new URL(process.env.SIGNAL_TREE_REQUEST,import.meta.url))).digest('hex');
await writeFile(new URL(process.env.SIGNAL_OUTPUT??(process.env.QUICK?'quick-results.json':'results.json'),import.meta.url),JSON.stringify(output,null,2)+'\n');
console.table(summary.filter(s=>s.rows===4096||process.env.QUICK).map(s=>({label:s.label,phase:s.phase,us:(s.medianNs/1000).toFixed(3),spread:(s.maxNs/s.minNs).toFixed(2)})));
