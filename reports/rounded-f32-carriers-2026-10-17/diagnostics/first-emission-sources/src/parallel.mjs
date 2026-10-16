// A module worker can receive messages while top-level await is pending.
const __parallelPending=[];
const __parallelBrowser=typeof WorkerGlobalScope==='function'&&globalThis instanceof WorkerGlobalScope&&new URL(globalThis.location.href).searchParams.get('inkParallelWorker')==='1';
if(__parallelBrowser)globalThis.onmessage=e=>__parallelPending.push(e.data);
// Literal callback dispatch; no source text, eval or Function constructor.
const __nodeThreads=typeof process==='object'&&process.versions?.node?await import('node:worker_threads'):null;
let __parallelLeaf=__nodeThreads?.workerData?.inkParallel?.mode==='callback';
let __parallelRequested=Number(__nodeThreads?process.env.INK_THREADS??4:Math.min(4,globalThis.navigator?.hardwareConcurrency??4));
__parallelRequested=Math.min(32,Math.max(1,Number.isInteger(__parallelRequested)?__parallelRequested:4));
const __parallelStats={dispatches:0,workers:0,workerIds:new Set(),lastWorkerIds:new Set()};
export function parallelStatistics(){return {dispatches:__parallelStats.dispatches,workers:__parallelStats.workers,workerIds:[...__parallelStats.workerIds],lastWorkerIds:[...__parallelStats.lastWorkerIds]};}
export function setParallelism(n){if(!Number.isInteger(n)||n<1||n>32)throw RangeError('worker count must be 1..32');__parallelRequested=n;}
function __parallelPack(v){if(typeof v==='number'&&(!Number.isFinite(v)||Object.is(v,-0)))return ['n',Object.is(v,-0)?'-0':String(v)];if(typeof v==='bigint')return ['b',String(v)];if(v===null||typeof v!=='object')return ['s',v];if(Array.isArray(v)||ArrayBuffer.isView(v))return ['a',Array.from(v,__parallelPack)];return ['o',Object.entries(v).map(([k,v])=>[k,__parallelPack(v)])];}
function __parallelUnpack(v){if(v[0]==='n')return Number(v[1]);if(v[0]==='b')return BigInt(v[1]);if(v[0]==='s')return v[1];if(v[0]==='a')return v[1].map(__parallelUnpack);if(v[0]==='o')return Object.fromEntries(v[1].map(([k,v])=>[k,__parallelUnpack(v)]));throw Error('invalid worker value');}
function __parallelReply(task){
 const header=new Int32Array(task.header),data=new Uint8Array(task.data);
 try{
  const f=__parallelCallbacks[task.callback];if(!f)throw Error('unknown sealed parallel callback');
  __parallelLeaf=true;
  const values=task.items.map((item,i)=>f(task.captures,(task.start+i)>>>0,item));
  const bytes=new TextEncoder().encode(JSON.stringify(__parallelPack({values,id:__nodeThreads?.threadId??__parallelInstanceId})));
  if(bytes.length>data.length)throw Error('parallel worker result limit');
  data.set(bytes);Atomics.store(header,1,bytes.length);Atomics.store(header,0,1);
 }catch(e){const bytes=new TextEncoder().encode(String(e?.message??e));data.set(bytes.subarray(0,data.length));Atomics.store(header,1,Math.min(bytes.length,data.length));Atomics.store(header,0,-1);}
 finally{Atomics.notify(header,0);}
}
let __parallelPool=[],__parallelInstanceId=null,__parallelCoordinator=0,__parallelCoordinatorSequence=0,__parallelPoolSequence=0;
async function __parallelWarmPool(count){if(__nodeThreads)return;await Promise.all(Array.from({length:count},()=>new Promise((resolve,reject)=>{const w=__parallelWorker({mode:"warm",workerId:`${__parallelCoordinator}:${++__parallelPoolSequence}`});w.onmessage=e=>{if(e.data.ready){w.__inkPooled=true;__parallelPool.push(w);resolve();}};w.onerror=e=>reject(Error(e.message));})));}
function __parallelRelease(w){if(w.__inkPooled)__parallelPool.push(w);else w.terminate();}
function __parallelWorker(task){
 if(!__nodeThreads&&task.mode==="callback"){const w=__parallelPool.pop();if(!w)throw Error("browser callback pool not ready");w.postMessage(task);return w;}
 if(__nodeThreads)return new __nodeThreads.Worker(new URL(import.meta.url),{workerData:{inkParallel:task},execArgv:process.execArgv.filter(x=>!x.startsWith('--input-type'))});
 const url=new URL(import.meta.url);url.searchParams.set('inkParallelWorker','1');const w=new Worker(url,{type:'module'});w.postMessage(task);return w;
}
function __parallel(callback,input,grain,captures){
 const count=__parallelLeaf?1:Math.max(1,Math.min(__parallelRequested,Math.floor(input.length/Math.max(1,grain))));
 const f=__parallelCallbacks[callback];
 if(count===1)return Array.from(input,(x,i)=>f(captures,i>>>0,x));
 if(typeof SharedArrayBuffer!=='function')throw Error('parallel workers require shared memory; browser hosts need cross-origin isolation');
 if(!__nodeThreads&&!(typeof WorkerGlobalScope==='function'&&globalThis instanceof WorkerGlobalScope))throw Error('browser parallel work must use callAsync from the main thread');
 const chunk=Math.ceil(input.length/count),tasks=[];
 try{
  for(let start=0;start<input.length;start+=chunk){
   const task={mode:'callback',callback,captures,start,items:Array.from(input.slice(start,start+chunk)),header:new SharedArrayBuffer(8),data:new SharedArrayBuffer(16*1024*1024),id:start/chunk+1};
   tasks.push({task,worker:__parallelWorker(task)});
  }
  __parallelStats.lastWorkerIds.clear();__parallelStats.dispatches++;__parallelStats.workers+=tasks.length;
  const output=[];
  for(const {task} of tasks){
   const header=new Int32Array(task.header);const waited=Atomics.wait(header,0,0,60000);
   if(waited==='timed-out')throw Error('parallel worker timeout');
   const text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(task.data,0,Atomics.load(header,1)).slice());
   if(Atomics.load(header,0)!==1)throw Error(text);
   const reply=__parallelUnpack(JSON.parse(text));__parallelStats.workerIds.add(reply.id);__parallelStats.lastWorkerIds.add(reply.id);
   for(const value of reply.values)output.push(value);
  }
  return output;
 }finally{for(const {worker} of tasks)__parallelRelease(worker);}
}
async function __parallelRequest(task){
 if(!__nodeThreads&&typeof SharedArrayBuffer!=='function')throw Error('parallel workers require cross-origin isolation');
 const worker=__parallelWorker({...task,workers:__parallelRequested,coordinator:++__parallelCoordinatorSequence});
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error('parallel invocation timeout')),300000);
  const finish=(error,value)=>{clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);};
  const receive=message=>{if(message.error)finish(Error(message.error));else{__parallelStats.dispatches+=message.statistics.dispatches;__parallelStats.workers+=message.statistics.workers;__parallelStats.lastWorkerIds=new Set(message.statistics.lastWorkerIds);message.statistics.workerIds.forEach(id=>__parallelStats.workerIds.add(id));finish(null,message);}};
  if(__nodeThreads){worker.once('message',receive);worker.once('error',e=>finish(e));}
  else{worker.onmessage=e=>receive(e.data);worker.onerror=e=>finish(Error(e.message));}
 });
}
export async function callAsync(name,args){return (await __parallelRequest({mode:'call',name,args})).value;}
async function __parallelInvokeAsync(name,args,snapshot){return __parallelRequest({mode:'invoke',name,args,snapshot});}
async function __parallelTask(task){
 if(task.mode==="warm"){__parallelInstanceId=task.workerId;globalThis.postMessage({ready:true});return;}
 if(task.mode==='callback'){__parallelReply(task);return;}
 if(!['call','invoke'].includes(task.mode))throw Error('invalid parallel worker request');
 let reply;
 try{__parallelLeaf=false;__parallelCoordinator=task.coordinator;setParallelism(task.workers);await __parallelWarmPool(__parallelRequested);if(task.mode==='invoke'){const state=createState();await state.restore(task.snapshot);const value=state.invoke(task.name,task.args);reply={value,snapshot:await state.checkpoint(),statistics:parallelStatistics()};}else reply={value:call(task.name,task.args),statistics:parallelStatistics()};}catch(e){reply={error:String(e?.message??e)};}
 if(__nodeThreads)__nodeThreads.parentPort.postMessage(reply);else globalThis.postMessage(reply);
}
if(__nodeThreads?.workerData?.inkParallel)__parallelTask(__nodeThreads.workerData.inkParallel);
else if(__parallelBrowser){globalThis.onmessage=e=>__parallelTask(e.data);for(const task of __parallelPending)__parallelTask(task);}
