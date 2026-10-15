const __wasmPending=[];
const __wasmBrowserWorker=typeof WorkerGlobalScope==='function'&&globalThis instanceof WorkerGlobalScope&&new URL(globalThis.location.href).searchParams.get('inkWasmParallelWorker')==='1';
if(__wasmBrowserWorker)globalThis.onmessage=e=>__wasmPending.push(e.data);
// Browser/Node host adapter. No Node-specific imports; integers stay exact.
export function stringifyExactJSON(value) {
  const seen=new Set();
  function encode(value,depth) {
    if(depth>128) throw new RangeError('JSON nesting limit');
    if(value===null) return 'null';
    if(typeof value==='bigint') return value.toString();
    if(typeof value==='number') {
      if(!Number.isFinite(value))throw new RangeError('JSON numbers must be finite');
      if(Number.isInteger(value)&&!Number.isSafeInteger(value)){const s=String(value);return /[.eE]/.test(s)?s:s+'.0';} // float token: integer Wire readers reject it
      return Object.is(value,-0)?'-0.0':String(value);
    }
    if(typeof value==='string'||typeof value==='boolean') return JSON.stringify(value);
    if(typeof value!=='object') throw new TypeError('Unsupported JSON value');
    if(seen.has(value)) throw new TypeError('Cyclic JSON value');
    seen.add(value);
    try {
      if(Array.isArray(value)) {
        for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw new TypeError('Sparse JSON array');
        return '['+value.map(v=>encode(v,depth+1)).join(',')+']';
      }
      if(Object.getPrototypeOf(value)!==Object.prototype && Object.getPrototypeOf(value)!==null) throw new TypeError('Expected a plain JSON object');
      return '{'+Object.entries(value).map(([key,v])=>JSON.stringify(key)+':'+encode(v,depth+1)).join(',')+'}';
    } finally {seen.delete(value);}
  }
  return encode(value,0);
}
export function parseExactJSON(text) {
  let position=0;
  const numberPattern=/-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
  const fail=()=>{throw new SyntaxError('Invalid JSON at '+position);};
  const space=()=>{while(' \n\r\t'.includes(text[position]) && position<text.length)position++;};
  function string() {
    const start=position++;let escaped=false;
    while(position<text.length) {
      const c=text[position++];
      if(c==='"') return escaped?JSON.parse(text.slice(start,position)):text.slice(start+1,position-1);
      if(c<' ')fail();
      if(c==='\\'){escaped=true;position++;}
    }
    fail();
  }
  function value(depth) {
    if(depth>128)throw new RangeError('JSON nesting limit');
    space();const c=text[position];
    if(c==='"')return string();
    if(c==='[') {
      position++;const result=[];space();
      if(text[position]===']'){position++;return result;}
      while(true){result.push(value(depth+1));space();const next=text[position++];if(next===']')return result;if(next!==',')fail();}
    }
    if(c==='{') {
      position++;const result={};space();
      if(text[position]==='}'){position++;return result;}
      while(true) {
        space();if(text[position]!=='"')fail();const key=string();space();if(text[position++]!==':')fail();
        Object.defineProperty(result,key,{value:value(depth+1),enumerable:true,writable:true,configurable:true});
        space();const next=text[position++];if(next==='}')return result;if(next!==',')fail();
      }
    }
    if(text.startsWith('true',position)){position+=4;return true;}
    if(text.startsWith('false',position)){position+=5;return false;}
    if(text.startsWith('null',position)){position+=4;return null;}
    numberPattern.lastIndex=position;const match=numberPattern.exec(text);
    if(!match)fail();position+=match[0].length;
    if(/^-?[0-9]+$/.test(match[0]))return BigInt(match[0]);
    const number=Number(match[0]);if(!Number.isFinite(number))fail();return number;
  }
  const result=value(0);space();if(position!==text.length)fail();return result;
}
export class AbiError extends Error {
  constructor(message,committed=false){super(message);this.name='AbiError';this.committed=committed;}
}
export class StatefulModule {
  #initial;
  constructor(instance) {
    this.instance=instance;this.exports=instance.exports;this.trapped=false;
    if(this.exports.lang_abi_version?.()!==1)throw new AbiError('Unsupported stateful Wasm ABI');
    if(!(this.exports.memory instanceof WebAssembly.Memory))throw new AbiError('Missing Wasm memory');
    this.encoder=new TextEncoder();this.decoder=new TextDecoder('utf-8',{fatal:true});
  }
  static async instantiate(source,options={}) {
    const requested=options.workers??__wasmWorkers;
    if(!Number.isInteger(requested)||requested<1||requested>32)throw new AbiError('worker count must be 1..32');
    const module=source instanceof WebAssembly.Module?source:await WebAssembly.compile(source);
    const imports=WebAssembly.Module.imports(module);
    if(imports.some(i=>i.module!=='ink_parallel'||i.name!=='run'||i.kind!=='function'))throw new AbiError('Unsupported Wasm host import');
    const holder={host:null};
    const instance=await WebAssembly.instantiate(module,{ink_parallel:{run:(ptr,len)=>holder.host.runParallel(ptr,len)}});
    const host=new StatefulModule(instance);host.compiled=module;host.parallelLeaf=options.leaf??false;host.workerCount=requested;host.parallelStats={dispatches:0,workers:0,workerIds:new Set(),lastWorkerIds:new Set()};holder.host=host;
    if(options.initialSnapshot!==undefined){
      if(!(options.initialSnapshot instanceof Uint8Array)||options.initialSnapshot.length>64*1024*1024)throw new AbiError('Initial snapshot byte limit');
      host.#initial=options.initialSnapshot.slice();
      host.restore(host.#initial).dispose();
    }
    return host;
  }
  parallelStatistics(){return {...this.parallelStats,workerIds:[...this.parallelStats.workerIds],lastWorkerIds:[...this.parallelStats.lastWorkerIds]};}
  recordParallelStatistics(stats){this.parallelStats.lastWorkerIds=new Set(stats.lastWorkerIds);this.parallelStats.dispatches+=stats.dispatches;this.parallelStats.workers+=stats.workers;stats.workerIds.forEach(id=>this.parallelStats.workerIds.add(id));}
  runParallel(ptr,len){
    try{return this.runParallelInner(ptr,len);}catch(error){
      const bytes=this.encoder.encode(stringifyExactJSON({error:String(error?.message??error)}));
      const out=this.call('lang_parallel_alloc',bytes.length)>>>0;
      if(!out)return 0;new Uint8Array(this.exports.memory.buffer,out,bytes.length).set(bytes);return bytes.length;
    }
  }
  runParallelInner(ptr,len){
    const task=parseExactJSON(this.decoder.decode(new Uint8Array(this.exports.memory.buffer,ptr,len)));
    const count=this.parallelLeaf?1:Math.max(1,Math.min(this.workerCount,Math.floor(task.items.length/Math.max(1,Number(task.grain)))));
    let values=[];
    if(count===1){task.start=0;values=this.executeParallel(task);}
    else{
      if(typeof SharedArrayBuffer!=='function')throw new AbiError('Wasm parallel workers require shared memory and browser cross-origin isolation');
      if(!__wasmThreads&&!(typeof WorkerGlobalScope==='function'&&globalThis instanceof WorkerGlobalScope))throw new AbiError('Browser parallel work must use pureAsync or invokeAsync');
      const chunk=Math.ceil(task.items.length/count),jobs=[];
      try{
        for(let start=0;start<task.items.length;start+=chunk){const job={mode:'callback',module:this.compiled,task:{...task,start,items:task.items.slice(start,start+chunk)},header:new SharedArrayBuffer(12),data:new SharedArrayBuffer(16*1024*1024),id:start/chunk+1};jobs.push({job,worker:__wasmWorker(job)});}
        this.parallelStats.lastWorkerIds.clear();this.parallelStats.dispatches++;this.parallelStats.workers+=jobs.length;
        for(const {job} of jobs){const h=new Int32Array(job.header);if(Atomics.wait(h,0,0,60000)==='timed-out')throw new AbiError('Wasm parallel worker timeout');const message=parseExactJSON(this.decoder.decode(new Uint8Array(job.data,0,Atomics.load(h,1)).slice()));if(message.error)throw new AbiError(message.error);if(Atomics.load(h,0)!==1)throw new AbiError('Wasm worker failed');this.parallelStats.workerIds.add(Atomics.load(h,2));this.parallelStats.lastWorkerIds.add(Atomics.load(h,2));for(const value of message.ok)values.push(value);}
      }finally{for(const {worker} of jobs)__wasmRelease(worker);}
    }
    const bytes=this.encoder.encode(stringifyExactJSON({ok:values}));const out=this.call('lang_parallel_alloc',bytes.length)>>>0;if(!out)throw new AbiError('Wasm parallel output allocation');new Uint8Array(this.exports.memory.buffer,out,bytes.length).set(bytes);return bytes.length;
  }
  executeParallel(task){
    const bytes=this.encoder.encode(stringifyExactJSON(task));const ptr=this.call('lang_parallel_alloc',bytes.length)>>>0;if(!ptr)throw new AbiError('Wasm parallel task allocation');new Uint8Array(this.exports.memory.buffer,ptr,bytes.length).set(bytes);
    const length=this.call('lang_parallel_worker',ptr,bytes.length)>>>0;if(!length)throw new AbiError('Wasm parallel task failed');const output=this.call('lang_parallel_ptr')>>>0;const reply=parseExactJSON(this.decoder.decode(new Uint8Array(this.exports.memory.buffer,output,length)));if(reply.error)throw new AbiError(reply.error);return reply.ok;
  }
  call(name,...args) {
    if(this.trapped)throw new AbiError('Wasm instance trapped; restore a checkpoint in a fresh instance');
    try{return this.exports[name](...args);}catch(error){if(error instanceof WebAssembly.RuntimeError)this.trapped=true;throw error;}
  }
  release(handle) {if(!this.trapped && this.call('lang_buffer_free',handle)!==1)throw this.error();}
  error() {
    const handle=this.call('lang_error')>>>0;
    if(!handle)return new AbiError('Wasm ABI resource limit');
    return new AbiError(this.decoder.decode(this.take(handle)));
  }
  take(handle) {
    if(!handle)throw this.error();
    try {
      const ptr=this.call('lang_buffer_ptr',handle)>>>0;
      const len=this.call('lang_buffer_len',handle)>>>0;
      // Every export may grow memory. Always create a new view and copy before free.
      return new Uint8Array(this.exports.memory.buffer,ptr,len).slice();
    } finally {this.release(handle);}
  }
  input(bytes) {
    if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw new RangeError('Expected at most 64 MiB of bytes');
    const handle=this.call('lang_buffer_alloc',bytes.length)>>>0;
    if(!handle)throw this.error();
    const ptr=this.call('lang_buffer_ptr',handle)>>>0;
    new Uint8Array(this.exports.memory.buffer,ptr,bytes.length).set(bytes);
    return handle;
  }
  text(handle) {
    if(!handle)throw this.error();
    try {
      const ptr=this.call('lang_buffer_ptr',handle)>>>0;
      const len=this.call('lang_buffer_len',handle)>>>0;
      // Decode synchronously before freeing. Only the resulting owned string
      // escapes; snapshots still use take() to return independent byte storage.
      return this.decoder.decode(new Uint8Array(this.exports.memory.buffer,ptr,len));
    } finally {this.release(handle);}
  }
  response(handle) {
    const message=parseExactJSON(this.text(handle));
    if(message.error)throw new AbiError(message.error.message,message.error.committed);
    if(!Object.hasOwn(message,'ok'))throw new AbiError('Malformed Wasm response');
    return message.ok;
  }
  create() {return this.#initial?this.restore(this.#initial):this.createSourceState();}
  createSourceState() {const handle=this.call('lang_init')>>>0;if(!handle)throw this.error();return new StateInstance(this,handle);}
  restore(bytes) {
    const buffer=this.input(bytes);
    try {const handle=this.call('lang_restore',buffer)>>>0;if(!handle)throw this.error();return new StateInstance(this,handle);}
    finally {this.release(buffer);}
  }
}
export class StateInstance {
  constructor(module,handle){this.module=module;this.handle=handle;this.disposed=false;this.busy=false;this.transaction=false;}
  live(){if(this.disposed)throw new AbiError('State handle was disposed');if(this.busy)throw new AbiError('State operation already in progress');}
  async pureAsync(pure,args){this.live();const reply=await __wasmAsync({mode:'pure',module:this.module.compiled,pure,args,workers:this.module.workerCount});this.module.recordParallelStatistics(reply.statistics);return reply.value;}
  async invokeAsync(call,args){
    this.live();if(this.transaction)throw new AbiError('Async handle replacement during state transaction');const snapshot=this.snapshot();this.busy=true;
    try{const reply=await __wasmAsync({mode:'invoke',module:this.module.compiled,call,args,snapshot,workers:this.module.workerCount});this.module.recordParallelStatistics(reply.statistics);const replacement=this.module.restore(reply.snapshot);const old=this.handle;if(this.module.call('lang_state_drop',old)!==1){replacement.dispose();throw this.module.error();}this.handle=replacement.handle;replacement.disposed=true;return reply.value;}
    finally{this.busy=false;}
  }
  invoke(call,args) {
    this.live();const m=this.module;
    const bytes=m.encoder.encode(stringifyExactJSON({call,args}));
    if(bytes.length>4*1024*1024)throw new RangeError('Request exceeds 4 MiB');
    const input=m.input(bytes);
    try{return m.response(m.call('lang_invoke',this.handle,input)>>>0);}
    finally{m.release(input);}
  }
  pure(pure,args) {
    this.live();const m=this.module;const bytes=m.encoder.encode(stringifyExactJSON({pure,args}));
    if(bytes.length>4*1024*1024)throw new RangeError('Request exceeds 4 MiB');
    const input=m.input(bytes);
    try{return m.response(m.call('lang_invoke',this.handle,input)>>>0);}finally{m.release(input);}
  }
  pureBinary(functionIndex,bytes){
    this.live();const m=this.module;
    if(typeof m.exports.lang_call_binary!=='function')throw new AbiError('Binary value extension unavailable');
    if(!Number.isInteger(functionIndex)||functionIndex<0||functionIndex>4294967295)throw new RangeError('Invalid binary function index');
    const input=m.input(bytes);
    try{return m.take(m.call('lang_call_binary',this.handle,functionIndex,input)>>>0);}finally{m.release(input);}
  }
  beginTransaction(){this.live();if(this.transaction)throw new AbiError('State transaction already in progress');if(typeof this.module.exports.lang_transaction_begin!=='function')return false;const code=this.module.call('lang_transaction_begin',this.handle);if(code===2)return false;if(code!==1)throw this.module.error();this.transaction=true;return true;}
  commitTransaction(){this.live();if(!this.transaction)throw new AbiError('No state transaction');if(this.module.call('lang_transaction_commit',this.handle)!==1)throw this.module.error();this.transaction=false;}
  rollbackTransaction(){this.live();if(!this.transaction)throw new AbiError('No state transaction');if(this.module.call('lang_transaction_rollback',this.handle)!==1)throw this.module.error();this.transaction=false;}
  snapshot(){this.live();return this.module.take(this.module.call('lang_checkpoint',this.handle)>>>0);}
  events(){this.live();return this.module.response(this.module.call('lang_events',this.handle)>>>0);}
  version(){this.live();return BigInt.asUintN(64,this.module.call('lang_version',this.handle));}
  acknowledge(commit,position) {
    this.live();for(const n of [commit,position])if(typeof n!=='bigint'||n<0n||n>0xffffffffffffffffn)throw new RangeError('Acknowledgement requires unsigned 64-bit BigInt values');
    if(this.module.call('lang_acknowledge',this.handle,commit,position)!==1)throw this.module.error();
  }
  dispose(){this.live();if(this.module.call('lang_state_drop',this.handle)!==1)throw this.module.error();this.disposed=true;}
}

// Host workers instantiate the same compiled module. Callback code is selected by
// a compiler-generated index, never supplied source or a replacement AST.
const __wasmThreads=typeof process==='object'&&process.versions?.node?await import('node:worker_threads'):null;
const __wasmRequested=Number(__wasmThreads?process.env.INK_THREADS??4:Math.min(4,globalThis.navigator?.hardwareConcurrency??4));
const __wasmWorkers=Math.min(32,Math.max(1,Number.isInteger(__wasmRequested)?__wasmRequested:4));
let __wasmPool=[],__wasmInstanceId=0,__wasmCoordinatorSequence=0;
async function __wasmWarmPool(count,coordinator){if(__wasmThreads)return;await Promise.all(Array.from({length:count},(_,index)=>new Promise((resolve,reject)=>{const w=__wasmWorker({mode:"warm",workerId:coordinator*32+index+1});w.onmessage=e=>{if(e.data.ready){w.__inkPooled=true;__wasmPool.push(w);resolve();}};w.onerror=e=>reject(new AbiError(e.message));})));}
function __wasmRelease(w){if(w.__inkPooled)__wasmPool.push(w);else w.terminate();}
function __wasmWorker(job){if(!__wasmThreads&&job.mode==="callback"){const w=__wasmPool.pop();if(!w)throw new AbiError("browser callback pool not ready");w.postMessage(job);return w;}if(__wasmThreads)return new __wasmThreads.Worker(new URL(import.meta.url),{workerData:{inkWasmParallel:job},execArgv:process.execArgv.filter(x=>!x.startsWith('--input-type'))});const url=new URL(import.meta.url);url.searchParams.set('inkWasmParallelWorker','1');const w=new Worker(url,{type:'module'});w.postMessage(job);return w;}
function __wasmAsync(job){const worker=__wasmWorker({...job,coordinator:++__wasmCoordinatorSequence});return new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(new AbiError('Wasm worker invocation timeout')),300000);const finish=(error,reply)=>{clearTimeout(timer);worker.terminate();error?reject(error):resolve(reply);};const receive=reply=>reply.error?finish(new AbiError(reply.error)):finish(null,reply);if(__wasmThreads){worker.once('message',receive);worker.once('error',e=>finish(e));}else{worker.onmessage=e=>receive(e.data);worker.onerror=e=>finish(new AbiError(e.message));}});}
async function __wasmTask(job){
 if(job.mode==="warm"){__wasmInstanceId=job.workerId;globalThis.postMessage({ready:true});return;}
 if(job.mode==='callback'){
  const h=new Int32Array(job.header),data=new Uint8Array(job.data);let reply;
  try{const host=await StatefulModule.instantiate(job.module,{leaf:true,workers:1});reply={ok:host.executeParallel(job.task)};}catch(e){reply={error:String(e?.message??e)};}
  let bytes=new TextEncoder().encode(stringifyExactJSON(reply));if(bytes.length>data.length){reply={error:'Wasm worker result limit'};bytes=new TextEncoder().encode(stringifyExactJSON(reply));}data.set(bytes);Atomics.store(h,1,bytes.length);Atomics.store(h,2,__wasmThreads?.threadId??__wasmInstanceId);Atomics.store(h,0,reply.error?-1:1);Atomics.notify(h,0);return;
 }
 let reply;
 try{await __wasmWarmPool(job.workers,job.coordinator);const host=await StatefulModule.instantiate(job.module,{workers:job.workers});const state=job.mode==='invoke'?host.restore(job.snapshot):host.create();try{const value=job.mode==='invoke'?state.invoke(job.call,job.args):state.pure(job.pure,job.args);reply={value,statistics:host.parallelStatistics(),...(job.mode==='invoke'?{snapshot:state.snapshot()}:{})};}finally{if(!host.trapped)state.dispose();}}catch(e){reply={error:String(e?.message??e)};}
 if(__wasmThreads)__wasmThreads.parentPort.postMessage(reply);else globalThis.postMessage(reply);
}
if(__wasmThreads?.workerData?.inkWasmParallel)await __wasmTask(__wasmThreads.workerData.inkWasmParallel);
else if(__wasmBrowserWorker){globalThis.onmessage=e=>__wasmTask(e.data);for(const job of __wasmPending)__wasmTask(job);}
