import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';import{resolve}from'node:path';import{pathToFileURL}from'node:url';import{spawnSync}from'node:child_process';
const[mode,baseline,candidate,out,sizeText,label]=process.argv.slice(2);
if(mode==='sample'){
 const module=await import(pathToFileURL(resolve(baseline)).href),size=Number(sizeText),state=module.createState();state.invoke('owner',['ffffffffffffffffffffffffffffffff']);
 for(let i=0;i<size;i++)state.invoke('put',[i,{name:`row-${i}-😀`,values:[-0,0.5,{F32Bits:0x7fa12345}],next:{Some:{name:'child',values:[1],next:{None:null}}}}]);
 global.gc();global.gc();const before=process.memoryUsage();
 for(let turn=0;turn<10;turn++){const result=state.invoke('names',[]).result;assert.equal(result.length,size);assert.equal(result[0],'row-0-😀 prepared');assert.equal(result[size-1],`row-${size-1}-😀 prepared`);}
 global.gc();global.gc();const after=process.memoryUsage();
 const snapshot=await state.checkpoint();console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,name:label,size,before,after,heap_delta_bytes:after.heapUsed-before.heapUsed,snapshot_bytes:snapshot.length}));state.dispose?.();
}else if(mode==='run'){
 const records=[];for(const size of[1024,16384])for(let processIndex=0;processIndex<3;processIndex++)for(const[name,file]of processIndex%2?[['prepared',candidate],['direct',baseline]]:[['direct',baseline],['prepared',candidate]]){
  const result=spawnSync(process.execPath,['--expose-gc',resolve(process.argv[1]),'sample',file,'unused','unused',String(size),name],{encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||result.stdout);records.push({process:processIndex,...JSON.parse(result.stdout)});
 }
 await writeFile(out,JSON.stringify({schema:1,scope:'One implementation per fresh process. Retain source rows/outbox, read all names ten times, release public replies and collect twice; JavaScript heap/RSS observations include runtime/JIT overhead, not a universal allocation bound.',records},null,2)+'\n');
 const median=xs=>[...xs].sort((a,b)=>a-b)[1];for(const size of[1024,16384])console.log(JSON.stringify({size,heap_delta_bytes:Object.fromEntries(['direct','prepared'].map(name=>[name,median(records.filter(r=>r.size===size&&r.name===name).map(r=>r.heap_delta_bytes))]))}));
}else throw Error('Usage: memory.mjs run BASELINE.mjs CANDIDATE.mjs OUTPUT.json');
