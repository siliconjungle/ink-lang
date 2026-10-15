import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{resolve,join}from'node:path';import{pathToFileURL}from'node:url';import{spawnSync}from'node:child_process';import{createHash}from'node:crypto';
const[mode,folder,baseline,out,seedText]=process.argv.slice(2);
const median=xs=>{const v=[...xs].sort((a,b)=>a-b),i=v.length>>1;return v.length%2?v[i]:(v[i-1]+v[i])/2;};
if(mode==='sample'){
 const root=resolve(folder),seed=await readFile(join(root,'model.snapshot')),modules={direct:await import(pathToFileURL(resolve(baseline)).href),prepared:await import(pathToFileURL(join(root,'program.mjs.source.mjs')).href)},states={},rows=[];
 let random=Number(seedText)>>>0;const next=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>0;};
 const contexts=Array.from({length:16},()=>({features:Array.from({length:10},()=>Math.fround((next()%2049-1024)/1024)),target:Array.from({length:4},()=>Math.fround((next()%257)/256))}));
 for(const name of ['direct','prepared']){states[name]=modules[name].createState();await states[name].restore(seed);for(let i=0;i<128;i++)states[name].invoke('observe',[contexts[i%16].features,contexts[i%16].target,2]);}
 const checkpoints=new Map();
 for(let sample=0;sample<11;sample++)for(const reads of (next()&1?[0,4,16]:[16,4,0])){
  for(const state of Object.values(states))await state.restore(seed);
  const order=next()&1?['direct','prepared']:['prepared','direct'],replies={};
  for(const name of order){
   const state=states[name],feedback=[];let sink=0,aborted=0;const start=performance.now();
   for(let turn=0;turn<8;turn++){
    const c=contexts[(sample+turn)%16],reply=state.invoke('observe',[c.features,c.target,2]);assert(reply.committed);const f=reply.result.Ok;sink+=f.before+f.after+f.rate+f.steps+Number(f.accepted)+f.reason.length;feedback.push(reply);
    if(turn%4===3){const rejected=state.invoke('cancel',[c.features,c.target]);assert.equal(rejected.committed,false);feedback.push(rejected);aborted++;}
    for(let read=0;read<reads;read++)for(const value of state.invoke('predict',[contexts[(turn+read)%16].features]).result.Ok)sink+=value;
   }
   rows.push({name,reads,sample,turns:8,aborted,ns_per_turn:(performance.now()-start)*1e6/8,sink});replies[name]=feedback;
  }
  assert.deepEqual(replies.direct,replies.prepared);
  const checkpoint=Buffer.from(await states.direct.checkpoint());assert.deepEqual(checkpoint,Buffer.from(await states.prepared.checkpoint()));
  if(checkpoints.has(sample))assert.deepEqual(checkpoint,checkpoints.get(sample));else checkpoints.set(sample,checkpoint);
  for(const row of rows.slice(-2))row.checkpoint_sha256=createHash('sha256').update(checkpoint).digest('hex');
 }
 for(const state of Object.values(states))state.dispose?.();console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,seed:Number(seedText),inputs_sha256:createHash('sha256').update(JSON.stringify(contexts)).digest('hex'),rows}));
}else if(mode==='run'){
 const records=[];for(const[cohort,baseSeed]of[['development',19121],['holdout',51749]])for(let processIndex=0;processIndex<3;processIndex++){
  const child=spawnSync(process.execPath,[resolve(process.argv[1]),'sample',folder,baseline,out,String(baseSeed+processIndex*104729)],{encoding:'utf8'});if(child.status!==0)throw Error(child.stderr||child.stdout);records.push({cohort,process:processIndex,...JSON.parse(child.stdout)});
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'Whole compiled training/serving turns on identical trained source and checkpoint: two Adam updates per frame, 0/4/16 predictions and one rolled-back frame per four turns. Restore/checkpoint comparison is outside timing; persistence/device training are excluded.',records},null,2)+'\n');
 for(const reads of [0,4,16]){const select=name=>median(records.filter(r=>r.cohort==='holdout').map(r=>median(r.rows.filter(x=>x.name===name&&x.reads===reads).map(x=>x.ns_per_turn))));const direct=select('direct'),prepared=select('prepared');console.log(JSON.stringify({reads,direct_ns_per_turn:direct,prepared_ns_per_turn:prepared,ratio:direct/prepared}));}
}else throw Error('Usage: training.mjs run ARTIFACT BASELINE.mjs OUTPUT.json');
