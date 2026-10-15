import assert from 'node:assert/strict';
import{readFile,writeFile}from'node:fs/promises';
import{resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{spawnSync}from'node:child_process';
const[mode,baseline,candidate,out,seedText]=process.argv.slice(2);
const median=xs=>{const v=[...xs].sort((a,b)=>a-b),i=v.length>>1;return v.length%2?v[i]:(v[i-1]+v[i])/2;};
if(mode==='sample'){
 let random=Number(seedText)>>>0;const next=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>0;};
 const modules={direct:await import(pathToFileURL(resolve(baseline)).href),prepared:await import(pathToFileURL(resolve(candidate)).href)};
 const rows=[],cold=[],histories=[],identity='ffffffffffffffffffffffffffffffff';
 const node=(i,suffix)=>({name:`${i}-${suffix}-😀`,values:[{F32Bits:0x7fa12345},-0,0.5],next:{Some:{name:'child',values:[1],next:{None:null}}}});
 const create=(module,data)=>{const state=module.createState();state.invoke('owner',[identity]);for(let i=0;i<data.length;i++)state.invoke('put',[i,data[i]]);return state;};
 const textValue=value=>{let total=0;for(let i=0;i<value.length;i++)total+=value.charCodeAt(i);return total;};
 const consume=(name,value)=>{
  if(name==='names')return value.reduce((a,b)=>a+textValue(b),0);
  if(Object.hasOwn(value,'Err'))return textValue(value.Err);
  let total=textValue(value.Ok.owner);for(const word of value.Ok.words)total+=Number(word&65535n);
  for(let row of value.Ok.rows)while(row){total+=textValue(row.name);for(const number of row.values)total+=typeof number==='object'?(number.F32Bits&65535):Object.is(number,-0)?1:number;row=row.next.Some;}
  return total;
 };
 for(const size of [0,1,128,4096]){
  const data=Array.from({length:size},(_,i)=>node(i,next())),expectedNames=data.map(r=>r.name+' prepared'),expectedValue=size?{Ok:{rows:data.map(r=>({...r,name:r.name+' prepared'})),words:[0n,18446744073709551615n],owner:identity}}:{Err:'no rows'};
  const states={direct:create(modules.direct,data),prepared:create(modules.prepared,data)},names=['direct','prepared'];if(next()&1)names.reverse();
  for(const name of names){
   const state=states[name];global.gc?.();const heap=process.memoryUsage().heapUsed,start=performance.now();let first=state.invoke('names',[]).result;const first_ns=(performance.now()-start)*1e6;assert.deepEqual(first,expectedNames);first=null;global.gc?.();cold.push({size,name,first_ns,heap_delta_bytes:process.memoryUsage().heapUsed-heap});
   assert.deepEqual(state.invoke('value',[]).result,expectedValue);const detached=state.invoke('names',[]).result;detached.push('external mutation');assert.deepEqual(state.invoke('names',[]).result,expectedNames);
  }
  for(let sample=0;sample<11;sample++)for(const observation of ['names','value']){
   const order=next()&1?names:[...names].reverse();
   for(const name of order){const fn=states[name].bind(observation,{resultOnly:true}),count=observation==='names'?Math.max(4,Math.min(512,Math.ceil(65536/Math.max(1,size)))):Math.max(1,Math.min(128,Math.ceil(4096/Math.max(1,size))));let sink=0;const start=performance.now();for(let i=0;i<count;i++)sink+=consume(observation,fn());rows.push({size,sample,observation,name,count,ns:(performance.now()-start)*1e6/count,sink});}
  }
  assert.deepEqual(Buffer.from(await states.direct.checkpoint()),Buffer.from(await states.prepared.checkpoint()));
  for(const state of Object.values(states))state.dispose?.();
 }
 for(const reads of [0,1,16]){
  const data=Array.from({length:128},(_,i)=>node(i,next())),states={direct:create(modules.direct,data),prepared:create(modules.prepared,data)};
  for(const name of ['direct','prepared'])states[name].invoke('names',[]);
  for(let turn=0;turn<8;turn++){
   const row=node(turn,next()),key=turn%128,order=next()&1?['direct','prepared']:['prepared','direct'];data[key]=row;
   for(const name of order){const state=states[name],fn=state.bind('names',{resultOnly:true});let sink=0;const start=performance.now();state.invoke('put',[key,row]);for(let i=0;i<reads;i++)sink+=consume('names',fn());histories.push({name,reads,turn,ns:(performance.now()-start)*1e6,sink});}
   const expected=data.map(r=>r.name+' prepared');for(const state of Object.values(states))assert.deepEqual(state.invoke('names',[]).result,expected);
   assert.deepEqual(Buffer.from(await states.direct.checkpoint()),Buffer.from(await states.prepared.checkpoint()));
  }
  for(const state of Object.values(states))state.dispose?.();
 }
 console.log(JSON.stringify({schema:1,node:process.version,platform:process.platform,arch:process.arch,seed:Number(seedText),rows,cold,histories}));
}else if(mode==='run'){
 const records=[];for(const[cohort,baseSeed]of[['development',83117],['holdout',129127]])for(let processIndex=0;processIndex<3;processIndex++){
  const child=spawnSync(process.execPath,['--expose-gc',resolve(process.argv[1]),'sample',baseline,candidate,out,String(baseSeed+processIndex*104729)],{encoding:'utf8'});if(child.status!==0)throw Error(child.stderr||child.stdout);records.push({cohort,process:processIndex,...JSON.parse(child.stdout)});
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'Same structured source and exact snapshots under old/current keep emission. Cold private caches, owned full/selected outputs and complete update/read histories; per-first-call heap deltas are noisy GC observations, not allocation or peak-memory proofs.',records},null,2)+'\n');
 for(const size of [0,1,128,4096])for(const observation of ['names','value']){const select=name=>median(records.filter(r=>r.cohort==='holdout').map(r=>median(r.rows.filter(x=>x.size===size&&x.observation===observation&&x.name===name).map(x=>x.ns))));const direct=select('direct'),prepared=select('prepared');console.log(JSON.stringify({size,observation,direct_ns:direct,prepared_ns:prepared,ratio:direct/prepared}));}
}else throw Error('Usage: table.mjs run BASELINE.mjs CANDIDATE.mjs OUTPUT.json');
