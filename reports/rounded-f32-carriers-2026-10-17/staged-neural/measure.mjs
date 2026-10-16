import assert from 'node:assert/strict';import{readFileSync,statSync}from'node:fs';import{pathToFileURL}from'node:url';import{performance}from'node:perf_hooks';
const[image,folder,variant,pairArg]=process.argv.slice(2),started=performance.now();
const p=await import(pathToFileURL(image)),imported=performance.now(),seed=readFileSync(folder+'/model.snapshot');
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
const contexts=JSON.parse(readFileSync(folder+'/contexts.json','utf8'));
const history=JSON.parse(readFileSync(folder+'/reference-history.json','utf8')),control=p.createState();let verified=0;
for(const step of history){if(step.restore){await control.restore(step.restore);continue;}assert.deepEqual(normalize(control.invoke(step.call,step.args)),normalize(step.expected));assert.deepEqual(Array.from(await control.checkpoint()),step.snapshot);verified++;}
const state=p.createState();await state.restore(seed);const weights=state.invoke('model',[]).result.Ok.weights;assert.equal(weights.length,244);
// Independent dense control, preserving each source F32 operation/rounding.
function dense(features){let cursor=0,values=features;
 const dot=inputs=>{const base=cursor;cursor+=inputs.length+1;let sum=Math.fround(0+Math.fround(1*weights[base+inputs.length]));for(let i=0;i<inputs.length;i++)sum=Math.fround(sum+Math.fround(1*Math.fround(weights[base+i]*inputs[i])));return sum;};
 for(const width of [6,6]){const next=[];for(let i=0;i<width;i++){const value=dot(values),gate=dot(values);next.push(gate>0?Math.fround(value*gate):0);}values=next;}
 const output=[];for(let i=0;i<4;i++)output.push(dot(values));assert.equal(cursor,244);return output;
}
for(const c of contexts)assert.deepEqual(state.invoke('predict',[c.features]).result.Ok,dense(c.features));
function consume(v){if(typeof v==='number')return v;if(typeof v==='bigint')return Number(v);if(typeof v==='boolean')return Number(v);if(typeof v==='string'){let n=0;for(let i=0;i<v.length;i++)n+=v.charCodeAt(i);return n;}if(v===null)return 0;let n=0;for(const x of Object.values(v))n+=consume(x);return n;}
const rows=[];
for(let i=0;i<1000;i++)state.invoke('predict',[contexts[i&15].features]);
for(const bound of [false,true]){
 const predict=bound?state.bind('predict',{resultOnly:true}):x=>state.invoke('predict',[x]).result;
 const samples=[],sinks=[];
 for(let sample=0;sample<7;sample++){let sink=0;const before=performance.now();for(let i=0;i<4000;i++)sink+=consume(predict(contexts[i&15].features));samples.push(performance.now()-before);sinks.push(sink);}
 assert.deepEqual(Buffer.from(await state.checkpoint()),seed);
 rows.push({name:'predict/'+bound,count:4000,samples_ms:samples,sinks,snapshot:Buffer.from(seed).toString('hex')});
}
// Warm the complete learning path, then restore the exact trained seed.
for(let i=0;i<32;i++){const c=contexts[i&15];state.invoke('observe',[c.features,c.target,2]);}
for(const reads of [0,4,16]){
 const samples=[],sinks=[],feedback=[],snapshots=[];
 for(let sample=0;sample<7;sample++){
  await state.restore(seed);const replies=[];let sink=0;const before=performance.now();
  for(let turn=0;turn<8;turn++){
   const c=contexts[(sample+turn)&15],reply=state.invoke('observe',[c.features,c.target,2]);assert.ok(reply.committed);replies.push(normalize(reply));sink+=consume(reply);
   if(turn%4==3){const aborted=state.invoke('cancel',[c.features,c.target]);assert.equal(aborted.committed,false);replies.push(normalize(aborted));sink+=consume(aborted);}
   for(let j=0;j<reads;j++)sink+=consume(state.invoke('predict',[contexts[(turn+j)&15].features]));
  }
  samples.push(performance.now()-before);sinks.push(sink);feedback.push(replies);snapshots.push(Buffer.from(await state.checkpoint()).toString('hex'));
 }
 rows.push({name:'training/'+reads,count:8,samples_ms:samples,sinks,feedback,snapshots});
}
console.log(JSON.stringify({schema:1,node:process.version,v8:process.versions.v8,variant,pair:Number(pairArg),core_sha256:p.metadata.core_sha256,image_bytes:statSync(image).size,import_ms:imported-started,verified_reference_outcomes:verified,dense_predictions:16,rows,max_rss_kib:process.resourceUsage().maxRSS}));
