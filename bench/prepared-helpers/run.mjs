import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve,join}from'node:path';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
import os from'node:os';
import{generator,median,shuffled,digest,denseForward}from'../staged-initializers/common.mjs';
import{numeric,boxed,direct,handwired}from'./oracle.mjs';
const[mode,basePath,nextPath,upstreamPath,out,seedText]=process.argv.slice(2);
if(mode==='previous'||mode==='current'){
 const artifact=mode;
 const next=generator(Number(seedText)),modules={},startup={},sources={};
 for(const[name,path]of [[artifact,artifact==='previous'?basePath:nextPath]]){
  const begin=performance.now();modules[name]=await import(pathToFileURL(resolve(path)));startup[name]={import_ms:performance.now()-begin};sources[name]={bytes:(await readFile(path)).length,sha256:digest(await readFile(path))};
 }
 
 const graphStart=performance.now(),raw=modules[artifact].functions.network().Ok,graph=numeric(raw).graph;
 startup.graph_construction_ms=performance.now()-graphStart;assert.equal(graph.nodes.length,232);
 const cases=Array.from({length:16},()=>({weights:Array.from({length:244},()=>Math.fround(.01+(next()%100)/1000)),features:Array.from({length:10},()=>Math.fround(.02+(next()%800)/1000)),target:Array.from({length:4},()=>Math.fround((next()%1000-500)/1000))}));
 // All source weights/features satisfy Handwired's declared [0,1] ranges.
 const lanes={},preparation={},cold={};
 for(const name of [artifact]){
  const m=modules[name],captureStart=performance.now(),graph=m.compiledValues.predict.params[0].capture(raw),entries={};
  preparation[name+'/graph']={capture_ms:performance.now()-captureStart};
  for(const task of ['predict','derivatives']){
   const captureStart=performance.now(),e=m.compiledValues[task],inputs=cases.map(c=>[graph,e.params[1].capture(c.weights),e.params[2].capture(c.features),...(task==='derivatives'?[e.params[3].capture(c.target)]:[])]);
   const inputCaptureMs=performance.now()-captureStart;
   const start=performance.now(),token=m.prepareCompiled(task,[[0,graph]]);preparation[name+'/'+task]={token_ms:performance.now()-start,input_capture_ms:inputCaptureMs};
   entries[task]={e,inputs,token};
  }
  lanes[name+'_ordinary']=(task,i)=>{const{e,inputs}=entries[task];return e.result.materialize(m.callCompiled(task,inputs[i]));};
  lanes[name+'_prepared']=(task,i)=>{const{e,inputs,token}=entries[task];return e.result.materialize(m.callPreparedCompiled(token,inputs[i].slice(1)));};
 }
 // Cold calls precede full-output correctness oracles or warmup.
 for(const name of shuffled(Object.keys(lanes),next))for(const task of ['predict','derivatives']){
  const start=performance.now(),result=lanes[name](task,0);cold[name+'/'+task]={call_ms:performance.now()-start,result_sha256:digest(JSON.stringify(result))};
 }
 const{Circuit}=await import(pathToFileURL(resolve(upstreamPath)));const hw=handwired(Circuit,graph,false),ranged=handwired(Circuit,graph,true);
 lanes.handwired=(task,i)=>{const c=cases[i];return boxed(hw.run(c.weights,c.features,c.target,task==='derivatives'),task==='derivatives');};
 lanes.handwired_ranges=(task,i)=>{const c=cases[i];return boxed(ranged.run(c.weights,c.features,c.target,task==='derivatives'),task==='derivatives');};
 lanes.direct_graph=(task,i)=>{const c=cases[i];return boxed(direct(graph,c.weights,c.features,c.target,task==='derivatives'),task==='derivatives');};
 lanes.dense_predict=(task,i)=>{assert.equal(task,'predict');const c=cases[i];return boxed(denseForward(c.weights,c.features),false);};
 const namesFor=task=>Object.keys(lanes).filter(name=>task==='predict'||name!=='dense_predict');
 const oracle=Object.fromEntries(['predict','derivatives'].map(task=>[task,cases.map((_,i)=>lanes.direct_graph(task,i))]));
 for(let i=0;i<cases.length;i++)assert.deepEqual(boxed(denseForward(cases[i].weights,cases[i].features),false),oracle.predict[i]);
 for(const task of ['predict','derivatives'])for(const name of namesFor(task))for(let i=0;i<cases.length;i++)assert.deepEqual(lanes[name](task,i),oracle[task][i]);
 const records=[],warmup={};let sink=0;
 for(const task of ['predict','derivatives']){
  const count=task==='predict'?1024:128;
  for(const name of shuffled(namesFor(task),next)){const start=performance.now();for(let i=0;i<4096;i++)lanes[name](task,i%16);warmup[name+'/'+task]={calls:4096,ms:performance.now()-start};}
  for(let sample=0;sample<11;sample++)for(const name of shuffled(namesFor(task),next)){
   const start=process.hrtime.bigint();let last;
   for(let i=0;i<count;i++){last=lanes[name](task,i%16);if(task==='predict'){for(const value of last.Ok)sink+=value.F32Bits;}else{sink+=last.Ok.loss.F32Bits;for(const value of last.Ok.outputs)sink+=value.F32Bits;for(const value of last.Ok.gradient)sink+=value.F32Bits;}}
   const ns=Number(process.hrtime.bigint()-start)/count;
   // Complete results are checked again after each timed batch.
   for(let i=0;i<cases.length;i++)assert.deepEqual(lanes[name](task,i),oracle[task][i]);
   records.push({task,name,sample,count,ns_per_call:ns,last_sha256:digest(JSON.stringify(last))});
  }
 }
 const result={schema:1,seed:Number(seedText),node:process.version,cpu:os.cpus()[0].model,artifact,source_core:modules[artifact].metadata.core_sha256,sources,corpus_sha256:digest(JSON.stringify(cases)),oracle_sha256:digest(JSON.stringify(oracle)),upstream_sha256:digest(await readFile(upstreamPath)),operations:{ink:232,handwired:hw.operations,handwired_ranges:ranged.operations},startup,preparation,cold,warmup,records,sink,scope:'Complete detached binary32 result trees: four outputs, or loss/four outputs/244 parameter gradients. Stable captured graph; weights, context and targets vary. Inputs captured outside timed calls; materialization included. No state actions, optimizer, GPU or automatic selection claim.'};
 await writeFile(out,JSON.stringify(result,null,2)+'\n');
}else if(mode==='run'){
 for(const[cohort,seed]of [['development',72131],['holdout',99173]])for(let rep=0;rep<3;rep++)for(const artifact of (rep%2?['current','previous']:['previous','current'])){
  const file=join(out,`${cohort}-${rep}-${artifact}.json`),r=spawnSync(process.execPath,[...process.execArgv,import.meta.filename,artifact,basePath,nextPath,upstreamPath,file,String(seed)],{encoding:'utf8'});
  if(r.status!==0)throw Error(r.stderr);console.log(`${cohort}-${rep}-${artifact}: complete outputs matched`);
 }
}else throw Error('usage: run.mjs run|previous|current BASELINE.mjs CURRENT.mjs HANDWIRED.ts OUTPUT_DIRECTORY|FILE [SEED]');
