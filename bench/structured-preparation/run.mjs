import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join}from'node:path';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
import{createHash}from'node:crypto';
const [mode,folder,baseline,out,seedText]=process.argv.slice(2);
if(mode==='sample'){
 const root=resolve(folder),seed=await readFile(join(root,'model.snapshot')),manifest=JSON.parse(await readFile(join(root,'artifact.json'),'utf8'));
 const files={direct:resolve(baseline),prepared:join(root,'program.mjs.source.mjs')},modules={},states={},startup={};
 const seedNumber=Number(seedText);let random=seedNumber>>>0;const next=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>0;};
 const contexts=Array.from({length:16},()=>Array.from({length:10},()=>Math.fround((next()%2049-1024)/1024)));
 for(const name of ['direct','prepared']){
  const before=performance.now();modules[name]=await import(pathToFileURL(files[name]).href);const imported=performance.now();states[name]=modules[name].createState();await states[name].restore(seed);startup[name]={import_ms:imported-before,create_restore_ms:performance.now()-imported};
 }
 const weights=states.prepared.invoke('model',[]).result.Ok.weights;
 const dense=features=>{
  let cursor=0,values=features;
  const dot=inputs=>{const base=cursor;cursor+=inputs.length+1;let value=Math.fround(0+Math.fround(1*weights[base+inputs.length]));for(let i=0;i<inputs.length;i++)value=Math.fround(value+Math.fround(1*Math.fround(weights[base+i]*inputs[i])));return value;};
  for(const width of [6,6]){const output=[];for(let i=0;i<width;i++){const value=dot(values),gate=dot(values);output.push(gate>0?Math.fround(value*gate):0);}values=output;}
  const output=[];for(let i=0;i<4;i++)output.push(dot(values));assert.equal(cursor,244);return output;
 };
 const functions={direct:xs=>states.direct.invoke('predict',[xs]).result.Ok,prepared:xs=>states.prepared.invoke('predict',[xs]).result.Ok,dense};
 const oracle=contexts.map(dense),cold={};
 for(const name of ['direct','prepared']){global.gc?.();const heap=process.memoryUsage().heapUsed,start=performance.now();assert.deepEqual(functions[name](contexts[0]),oracle[0]);cold[name]={first_call_ms:performance.now()-start};global.gc?.();cold[name].heap_delta_bytes=process.memoryUsage().heapUsed-heap;}
 for(const fn of Object.values(functions))for(let i=0;i<contexts.length;i++)assert.deepEqual(fn(contexts[i]),oracle[i]);
 for(const fn of Object.values(functions))for(let i=0;i<200;i++)fn(contexts[i%16]);
 const rows=[];for(let sample=0;sample<11;sample++){
  const order=['direct','prepared','dense'];for(let i=2;i>0;i--){const j=next()%(i+1);[order[i],order[j]]=[order[j],order[i]];}
  for(const name of order){const count=2000,fn=functions[name];let sink=0;const start=performance.now();for(let i=0;i<count;i++){const values=fn(contexts[i%16]);for(const value of values)sink+=value;}rows.push({sample,name,count,ns:(performance.now()-start)*1e6/count,sink});}
 }
 for(const state of Object.values(states)){assert.deepEqual(Buffer.from(await state.checkpoint()),seed);state.dispose?.();}
 console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,seed:seedNumber,source:manifest.source_core_sha256,inputs_sha256:createHash('sha256').update(JSON.stringify(contexts)).digest('hex'),cold,outputs_sha256:createHash('sha256').update(JSON.stringify(oracle)).digest('hex'),startup,rows}));
}else if(mode==='run'){
 const records=[];for(const [cohort,baseSeed]of [['development',72131],['holdout',99173]])for(let processIndex=0;processIndex<3;processIndex++){
  const seed=baseSeed+processIndex*104729;const child=spawnSync(globalThis.process.execPath,['--expose-gc',resolve(globalThis.process.argv[1]),'sample',folder,baseline,out,String(seed)],{encoding:'utf8'});if(child.status!==0)throw Error(child.stderr||child.stdout);records.push({cohort,process:processIndex,...JSON.parse(child.stdout)});
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'Exact same checked neural source and trained checkpoint; old versus current JavaScript keep emission. Complete state prediction calls consume four outputs; independent dense F32 kernel is a separate lower-bound control without state/ABI overhead.',records},null,2)+'\n');
 const median=xs=>{const v=[...xs].sort((a,b)=>a-b),i=v.length>>1;return v.length%2?v[i]:(v[i-1]+v[i])/2;};
 for(const cohort of ['development','holdout']){const group=records.filter(r=>r.cohort===cohort),summary=Object.fromEntries(['direct','prepared','dense'].map(name=>[name,median(group.map(r=>median(r.rows.filter(x=>x.name===name).map(x=>x.ns))))]));console.log(JSON.stringify({cohort,ns:summary,direct_over_prepared:summary.direct/summary.prepared,prepared_over_dense:summary.prepared/summary.dense}));}
}else throw Error('Usage: run.mjs run ARTIFACT BASELINE.mjs OUTPUT.json');
