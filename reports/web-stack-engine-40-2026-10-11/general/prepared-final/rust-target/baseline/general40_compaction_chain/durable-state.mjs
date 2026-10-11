// Persistence wraps compiled state instances; it never interprets Ink or changes admission.
import {parseExactJSON, stringifyExactJSON} from './state-wasm.mjs';
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal:true});
const MAX_SNAPSHOT = 64*1024*1024, MAX_HEADER = 4*1024*1024;
// Receipt encoding preserves the host's Number/BigInt distinction and signed zero.
function pack(value) {
  stringifyExactJSON(value); // Checks cycles, prototypes, unsupported values and depth.
  const encode=v=>typeof v==='bigint'?{b:v.toString()}:typeof v==='number'?{n:Object.is(v,-0)?'-0':String(v)}:Array.isArray(v)?{a:v.map(encode)}:v&&typeof v==='object'?{o:Object.entries(v).map(([k,x])=>[k,encode(x)])}:v;
  return JSON.stringify(encode(value));
}
function unpack(text) {
  const decode=(v,depth)=>{
    if(depth>128)throw Error('Receipt nesting limit');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==1)throw Error('Invalid receipt value');
    if(typeof v.b==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v.b))return BigInt(v.b);
    if(typeof v.n==='string'&&Number.isFinite(Number(v.n))&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(v.n))return Number(v.n);
    if(Array.isArray(v.a))return v.a.map(x=>decode(x,depth+1));
    if(Array.isArray(v.o)){
      const result={};
      for(const entry of v.o){if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||Object.hasOwn(result,entry[0]))throw Error('Invalid receipt field');Object.defineProperty(result,entry[0],{value:decode(entry[1],depth+1),enumerable:true,writable:true,configurable:true});}
      return result;
    }
    throw Error('Invalid receipt value');
  };
  return decode(JSON.parse(text),0);
}
export class RecoveryRequired extends Error {
  constructor(cause) { super('Persistence outcome is uncertain; close and reopen the durable host', {cause}); this.name='RecoveryRequired'; }
}
export async function recordToken(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_SNAPSHOT+MAX_HEADER+40) throw new RangeError('Durable record limit');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function encode(snapshot, receipts, receiptLimit) {
  if (!(snapshot instanceof Uint8Array) || snapshot.length>MAX_SNAPSHOT) throw new RangeError('Snapshot limit');
  const header=encoder.encode(stringifyExactJSON({format:'ink-durable-state-v1',receiptLimit,receipts}));
  if(header.length>MAX_HEADER)throw new RangeError('Durable receipt limit');
  const body=new Uint8Array(8+header.length+snapshot.length);
  body.set([73,78,75,68]);new DataView(body.buffer).setUint32(4,header.length,true);
  body.set(header,8);body.set(snapshot,8+header.length);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',body));
  const result=new Uint8Array(body.length+32);result.set(body);result.set(digest,body.length);return result;
}
async function decode(bytes) {
  await recordToken(bytes); // Also bounds untrusted storage input.
  if(bytes.length<40 || bytes[0]!==73 || bytes[1]!==78 || bytes[2]!==75 || bytes[3]!==68)throw Error('Invalid durable record');
  const n=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true),end=bytes.length-32;
  if(n>MAX_HEADER||8+n>end||end-8-n>MAX_SNAPSHOT)throw Error('Invalid durable record length');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.subarray(0,end)));
  if(digest.some((x,i)=>x!==bytes[end+i]))throw Error('Durable record checksum mismatch');
  const h=parseExactJSON(decoder.decode(bytes.subarray(8,8+n)));
  if(h.format!=='ink-durable-state-v1'||typeof h.receiptLimit!=='bigint'||h.receiptLimit<1n||h.receiptLimit>4096n||!Array.isArray(h.receipts)||h.receipts.length>Number(h.receiptLimit))throw Error('Invalid durable receipt metadata');
  const ids=new Set();
  for(const r of h.receipts){
    if(!r || typeof r.id!=='string'||!r.id.length||r.id.length>256||ids.has(r.id)||typeof r.request!=='string'||typeof r.reply!=='string')throw Error('Invalid durable receipt');
    ids.add(r.id);unpack(r.request);unpack(r.reply);
  }
  return {snapshot:bytes.slice(8+n,end),receipts:h.receipts,receiptLimit:Number(h.receiptLimit)};
}
const dispose = state => state.dispose?.();
const snapshot = state => state.checkpoint ? state.checkpoint() : state.snapshot();
const events = state => state.events ? state.events() : state.outbox;
const acknowledge = (state,c,p) => state.acknowledge ? state.acknowledge(c,p) : state.acknowledgeThrough(c,p);

/** Factory: {create(), restore(bytes)}. Store: {load(), commit(token,bytes), close()}.
 * Storage returns {token,bytes}; commit atomically compares token and replaces bytes.
 * A failed commit is always ambiguous to this host, which must be reopened.
 */
export class DurableState {
  #state; #factory; #store; #token; #receipts; #receiptLimit; #tail=Promise.resolve(); #closed=false; #poison;
  constructor(factory,store,state,token,receipts,receiptLimit){
    this.#factory=factory;this.#store=store;this.#state=state;this.#token=token;this.#receipts=receipts;this.#receiptLimit=receiptLimit;
  }
  static async open({factory,store,receiptLimit=256}) {
    if(!Number.isInteger(receiptLimit)||receiptLimit<1||receiptLimit>4096)throw new RangeError('Receipt retention must be 1..4096');
    let state;
    try {
      const saved=await store.load();let token,receipts=[];
      if(saved){const record=await decode(saved.bytes);receiptLimit=record.receiptLimit;receipts=record.receipts;state=await factory.restore(record.snapshot);token=saved.token;}
      else{state=await factory.create();token=await store.commit(null,await encode(await snapshot(state),[],receiptLimit));}
      return new DurableState(factory,store,state,token,receipts,receiptLimit);
    }catch(error){if(state)dispose(state);await store.close?.();throw error;}
  }
  #enqueue(fn){
    if(this.#closed)return Promise.reject(Error('Durable host is closed'));
    const task=this.#tail.then(()=>{if(this.#poison)throw this.#poison;return fn();});
    this.#tail=task.catch(()=>{});return task;
  }
  async #publish(candidate,receipts){
    const bytes=await encode(await snapshot(candidate),receipts,this.#receiptLimit);
    let token;
    try{token=await this.#store.commit(this.#token,bytes);}catch(error){this.#poison=new RecoveryRequired(error);throw this.#poison;}
    const prior=this.#state;this.#state=candidate;this.#token=token;this.#receipts=receipts;dispose(prior);
  }
  invoke(id,call,args){
    if(typeof id!=='string'||!id.length||id.length>256)return Promise.reject(new TypeError('A request id of 1..256 characters is required'));
    let request;
    try{request=pack({call,args});if(encoder.encode(request).length>4*1024*1024)throw new RangeError('Request limit');}catch(e){return Promise.reject(e);}
    return this.#enqueue(async()=>{
      const old=this.#receipts.find(r=>r.id===id);
      if(old){if(old.request!==request)throw Error('Request id reused with different arguments');return unpack(old.reply);}
      const candidate=await this.#factory.restore(await snapshot(this.#state));
      try{
        const captured=unpack(request),reply=pack(await candidate.invoke(captured.call,captured.args));
        const receipts=this.#receipts.concat({id,request,reply}).slice(-this.#receiptLimit);
        await this.#publish(candidate,receipts);return unpack(reply);
      }finally{if(this.#state!==candidate)dispose(candidate);}
    });
  }
  events(){return this.#enqueue(()=>unpack(pack(events(this.#state))));}
  checkpoint(){return this.#enqueue(async()=>(await snapshot(this.#state)).slice());}
  version(){return this.#enqueue(()=>typeof this.#state.version==='function'?this.#state.version():this.#state.version);}
  acknowledge(commit,position){return this.#enqueue(async()=>{
    const candidate=await this.#factory.restore(await snapshot(this.#state));
    try{await acknowledge(candidate,commit,position);await this.#publish(candidate,this.#receipts);}
    finally{if(this.#state!==candidate)dispose(candidate);}
  });}
  /** Ordered at-least-once delivery. The receiver deduplicates key, then returns;
   * an acknowledgement is persisted only after that return. */
  deliver(receiver){return this.#enqueue(async()=>{
    let count=0;
    for(const event of events(this.#state)){
      await receiver(event,`${event.commit}:${event.position}`);
      const candidate=await this.#factory.restore(await snapshot(this.#state));
      try{await acknowledge(candidate,event.commit,event.position);await this.#publish(candidate,this.#receipts);count++;}
      finally{if(this.#state!==candidate)dispose(candidate);}
    }
    return count;
  });}
  close(){
    if(this.#closed)return this.#tail;
    this.#closed=true;
    const task=this.#tail.then(async()=>{try{dispose(this.#state);}finally{await this.#store.close?.();}});
    this.#tail=task.catch(()=>{});return task;
  }
}

/** The browser requests strict transaction durability. Storage may still be
 * evicted by browser policy; request persistent storage in the application. */
export async function openIndexedDBStore(name,key='state',indexedDB=globalThis.indexedDB){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('states');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('IndexedDB open blocked'));
  });
  const transaction=(mode,action)=>new Promise((resolve,reject)=>{
    const tx=db.transaction('states',mode,mode==='readwrite'?{durability:'strict'}:undefined);
    let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage conflict'));
    const request=tx.objectStore('states').get(key);request.onerror=()=>tx.abort();
    request.onsuccess=()=>{try{result=action(tx.objectStore('states'),request.result,tx);}catch(e){tx.abort();reject(e);}};
  });
  db.onversionchange=()=>db.close();
  return {
    load:()=>transaction('readonly',(_,saved)=>saved?{token:saved.token,bytes:new Uint8Array(saved.bytes)}:null),
    async commit(expected,bytes){const captured=bytes.slice(),token=await recordToken(captured);return transaction('readwrite',(store,saved)=>{
      if((saved?.token??null)!==expected)throw Error('Storage conflict');store.put({token,bytes:captured},key);return token;
    });},
    close:()=>db.close(),
  };
}
