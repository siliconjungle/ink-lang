import {performance} from 'node:perf_hooks';import {pathToFileURL} from 'node:url';import {statSync} from 'node:fs';
const [path,seedArg]=process.argv.slice(2),seed=Number(seedArg??1),started=performance.now(),m=await import(pathToFileURL(path)),imported=performance.now();const records=[];
for(const size of [1,32,512]){
 const inputs=Array.from({length:16},(_,k)=>Array.from({length:size},(_,i)=>Math.fround((i-size/2+k+seed/16)/257)));
 const run=n=>{let sum=0;for(let i=0;i<n;i++){const result=m.functions.affine(inputs[i&15]);for(const v of result)sum+=v;}return sum;};
 run(1000);const count=size===512?10000:30000,start=performance.now(),checksum=run(count);records.push({workload:'affine-'+size,count,checksum,seconds:(performance.now()-start)/1000});
}
{
 const size=244;const weights=Array.from({length:size},(_,i)=>Math.fround((i-122)/1024)),gradient=Array.from({length:size},(_,i)=>Math.fround(((i+seed)%17-8)/4096));
 const run=n=>{let state=m.functions.initial(weights).Ok;if(!state)throw Error('initial');let checksum=0;for(let i=0;i<n;i++){const next=m.functions.train(state,gradient);if(!next.Ok)throw Error('train '+JSON.stringify(next));state=next.Ok;for(const v of state.weights)checksum+=v;for(const v of state.first)checksum+=v;for(const v of state.second)checksum+=v;}return {checksum,state};};
 run(200);const start=performance.now(),result=run(1500);records.push({workload:'adam-244',count:1500,...result,seconds:(performance.now()-start)/1000});
}
{
 const values=Array.from({length:256},(_,i)=>(i-128+seed/16)/257);const run=n=>{let sum=0;for(let i=0;i<n;i++)sum+=m.functions.binary64_control(values);return sum;};run(1000);const start=performance.now(),checksum=run(20000);records.push({workload:'f64-control',count:20000,checksum,seconds:(performance.now()-start)/1000});
}
console.log(JSON.stringify({schema:1,node:process.version,path,seed,bytes:statSync(path).size,import_ms:imported-started,records}));
