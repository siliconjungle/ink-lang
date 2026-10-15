import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join,dirname}from'node:path';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
import{digest,logicalSnapshot,generator,median,shuffled,denseForward}from'./common.mjs';
const[mode,previousPath,stagedPath,out,seedText]=process.argv.slice(2);
const names=['scalar','keeps','defaults'];
const serialize=v=>JSON.stringify(v,(_key,value)=>typeof value==='bigint'?{$bigint:value.toString()}:value);
if(mode==='sample'){
 const previous=resolve(previousPath),staged=resolve(stagedPath),seed=Number(seedText),next=generator(seed);
 const paths={scalar:join(dirname(previous),'neural-baseline.mjs'),keeps:join(previous,'program.mjs.source.mjs'),defaults:join(staged,'program.mjs.source.mjs')};
 const snapshots={scalar:await readFile(join(previous,'model.snapshot')),keeps:await readFile(join(previous,'model.snapshot')),defaults:await readFile(join(staged,'model.snapshot'))};
 const states={},startup={},sources={};
 for(const name of shuffled(names,next)){
  const before=performance.now(),m=await import(pathToFileURL(paths[name]).href),loaded=performance.now();
  states[name]=m.createState();await states[name].restore(snapshots[name]);sources[name]=m.metadata.core_sha256;
  startup[name]={import_ms:loaded-before,create_restore_ms:performance.now()-loaded};
  assert.deepEqual(Buffer.from(await states[name].checkpoint()),snapshots[name]);
 }
 const base=logicalSnapshot(snapshots.keeps);for(const name of names)assert.deepEqual(logicalSnapshot(snapshots[name]),base);
 const contexts=Array.from({length:16},()=>Array.from({length:10},()=>Math.fround((next()%2049-1024)/1024)));
 const functions=Object.fromEntries(names.map(n=>[n,x=>states[n].invoke('predict',[x]).result.Ok]));
 const cold={},first={};
 for(const name of shuffled(names,next)){
  global.gc?.();const start=performance.now();first[name]=functions[name](contexts[0]);cold[name]={first_call_ms:performance.now()-start};
 }
 // Observe model weights only after first predictions, so this control cannot
 // pre-prepare one implementation's default before its cold measurement.
 const weights=states.keeps.invoke('model',[]).result.Ok.weights;
 functions.dense=x=>denseForward(weights,x);const oracle=contexts.map(functions.dense);
 for(const name of names){assert.deepEqual(first[name],oracle[0]);cold[name].output_sha256=digest(JSON.stringify(first[name]));}
 for(const fn of Object.values(functions)){for(let i=0;i<16;i++)assert.deepEqual(fn(contexts[i]),oracle[i]);for(let i=0;i<200;i++)fn(contexts[i%16]);}
 const rows=[];for(let sample=0;sample<11;sample++)for(const name of shuffled([...names,'dense'],next)){
  const count=2000,fn=functions[name];let sink=0;const start=performance.now();for(let i=0;i<count;i++)for(const x of fn(contexts[i%16]))sink+=x;
  rows.push({sample,name,count,ns:(performance.now()-start)*1e6/count,sink});
 }
 for(const name of names)assert.deepEqual(Buffer.from(await states[name].checkpoint()),snapshots[name]);
 const target=Array(4).fill(0.1),training=[];
 const frame=(name,reads)=>{const s=states[name],feedback=[];let sink=0;for(let turn=0;turn<8;turn++){
  const xs=contexts[turn%16];const reply=s.invoke('observe',[xs,target,2]);assert(reply.committed);feedback.push(reply);
  for(let i=0;i<reads;i++)for(const x of functions[name](contexts[(turn+i)%16]))sink+=x;
  if(turn%4===3){const cancelled=s.invoke('cancel',[xs,target]);assert(!cancelled.committed);feedback.push(cancelled);}
 }return{feedback,sink};};
 // Warm complete histories and mix cadence order before collecting samples.
 for(const name of names)for(let i=0;i<128;i++){await states[name].restore(snapshots[name]);frame(name,[0,4,16][i%3]);}
 for(let sample=0;sample<11;sample++){
  const results={};for(const[reads,name]of shuffled([0,4,16].flatMap(r=>names.map(n=>[r,n])),next)){
   await states[name].restore(snapshots[name]);const start=performance.now(),result=frame(name,reads),ns=(performance.now()-start)*1e6/8;
   const checkpoint=Buffer.from(await states[name].checkpoint()),logical=logicalSnapshot(checkpoint);results[reads+'/'+name]={...result,logical};
   training.push({sample,name,reads,ns_per_turn:ns,sink:result.sink,feedback_sha256:digest(serialize(result.feedback)),logical_sha256:digest(JSON.stringify(logical)),checkpoint_sha256:digest(checkpoint)});
  }
  for(const reads of[0,4,16])for(const name of names)assert.deepEqual(results[reads+'/'+name],results[reads+'/keeps']);
  for(const result of Object.values(results))assert.deepEqual(result.logical,results['0/keeps'].logical);
 }
 console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,seed,sources,inputs_sha256:digest(JSON.stringify(contexts)),outputs_sha256:digest(JSON.stringify(oracle)),initial_logical_sha256:digest(JSON.stringify(base)),startup,cold,rows,training}));
}else if(mode==='run'){
 const records=[];for(const[cohort,base]of[['development',72131],['holdout',99173]])for(let processIndex=0;processIndex<3;processIndex++){
  const seed=base+processIndex*104729,child=spawnSync(process.execPath,['--expose-gc',resolve(process.argv[1]),'sample',previousPath,stagedPath,out,String(seed)],{encoding:'utf8'});
  if(child.status!==0)throw Error(child.stderr||child.stdout);records.push({cohort,process:processIndex,...JSON.parse(child.stdout)});
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'Authored source staging with the same trained logical state. Scalar/structured keep controls share their source; prepared defaults have a distinct source identity. Every module restores only its own checkpoint. CPU JavaScript complete prediction and eight-turn learning histories; no automatic selection or upstream parity claim.',records},null,2)+'\n');
 const held=records.filter(r=>r.cohort==='holdout');console.log(JSON.stringify({prediction_ns:Object.fromEntries([...names,'dense'].map(n=>[n,median(held.map(r=>median(r.rows.filter(x=>x.name===n).map(x=>x.ns))))])),training_ns:Object.fromEntries([0,4,16].map(reads=>[reads,Object.fromEntries(names.map(n=>[n,median(held.map(r=>median(r.training.filter(x=>x.name===n&&x.reads===reads).map(x=>x.ns_per_turn))))]))]))}));
}else throw Error('Usage: run.mjs run PREVIOUS_ARTIFACT STAGED_ARTIFACT OUTPUT.json');
