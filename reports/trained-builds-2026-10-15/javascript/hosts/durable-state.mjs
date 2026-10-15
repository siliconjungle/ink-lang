// Persistence wraps compiled state instances; it never interprets Ink or changes admission.
import {parseExactJSON, stringifyExactJSON} from './state-wasm.mjs';
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal:true});
const MAX_SNAPSHOT = 64*1024*1024, MAX_HEADER = 4*1024*1024;
// Receipt encoding preserves the host's Number/BigInt distinction and signed zero.
function pack(value) {
  stringifyExactJSON(value); // Checks cycles, prototypes, unsupported values and depth.
  const encode=v=>typeof v==='bigint'?{b:v.toString()}:typeof v==='number'?{n:Object.is(v,-0)?'-0':String(v)}:Array.isArray(v)?{a:v.map(encode)}:v&&typeof v==='object'?{o:Object.keys(v).sort().map(k=>[k,encode(v[k])])}:v;
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
export const MAX_LOG = 128*1024*1024, MAX_FRAME = 4*MAX_HEADER+4096;
export function logBase(bytes){const out=new Uint8Array(8+bytes.length);out.set([73,78,75,76]);new DataView(out.buffer).setUint32(4,bytes.length,true);out.set(bytes,8);return out;}
export async function frameOperation(previous,bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>MAX_FRAME)throw Error('Durable frame limit');
  const prefix=encoder.encode(previous),body=new Uint8Array(prefix.length+4+bytes.length);
  body.set(prefix);new DataView(body.buffer).setUint32(prefix.length,bytes.length,true);body.set(bytes,prefix.length+4);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',body)),frame=new Uint8Array(36+bytes.length);
  new DataView(frame.buffer).setUint32(0,bytes.length,true);frame.set(bytes,4);frame.set(digest,4+bytes.length);
  return {frame,token:[...digest].map(x=>x.toString(16).padStart(2,'0')).join('')};
}
export async function splitLog(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length>MAX_LOG)throw Error('Durable log limit');
  if(bytes[0]!==73||bytes[1]!==78||bytes[2]!==75||bytes[3]!==76)return {base:bytes,frames:[],token:await recordToken(bytes),consumed:bytes.length};
  if(bytes.length<8)throw Error('Invalid durable log');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=view.getUint32(4,true);
  if(n>MAX_SNAPSHOT+MAX_HEADER+40||8+n>bytes.length)throw Error('Invalid durable log checkpoint');
  const base=bytes.subarray(8,8+n),frames=[];let token=await recordToken(base),at=8+n;
  while(at<bytes.length){
    if(bytes.length-at<4)break;const n=view.getUint32(at,true);if(n>MAX_FRAME)throw Error('Durable frame limit');if(bytes.length-at<36+n)break;
    const payload=bytes.subarray(at+4,at+4+n),expected=await frameOperation(token,payload);
    if(expected.frame.subarray(4+n).some((x,i)=>x!==bytes[at+4+n+i]))throw Error('Durable frame checksum mismatch');
    if(frames.length>=4096)throw Error('Durable replay operation limit');frames.push(payload);token=expected.token;at+=36+n;
  }
  return {base,frames,token,consumed:at};
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
const acknowledge = (state,c,p) => (state.acknowledge ?? state.acknowledgeThrough ?? state.acknowledge_through).call(state,c,p);

/** Factory: {create(), restore(bytes)}. Store: {load(), commit(token,bytes), close()}.
 * Storage returns {token,bytes}; commit atomically compares token and replaces bytes.
 * A failed commit is always ambiguous to this host, which must be reopened.
 */
const version = state => typeof state.version==='function'?state.version():state.version;
function replayNumber(text){const [mantissa,power='0']=text.toLowerCase().split('e'),negative=mantissa[0]==='-',parts=(negative?mantissa.slice(1):mantissa).split('.');let digits=(parts[0]+(parts[1]??'')).replace(/^0+/,''),exponent=Number(power)-(parts[1]?.length??0);if(!digits)return negative?'-0':'0';while(digits.endsWith('0')){digits=digits.slice(0,-1);exponent++;}return `${negative?'-':''}${digits}e${exponent}`;}
function replayValue(value){const encode=v=>typeof v==='number'?{number:replayNumber(Object.is(v,-0)?'-0':String(v))}:typeof v==='bigint'?{number:replayNumber(String(v))}:Array.isArray(v)?{array:v.map(encode)}:v&&typeof v==='object'?{object:Object.keys(v).sort().map(k=>[k,encode(v[k])])}:v;return JSON.stringify(encode(value));}
function decimal(s){if(typeof s!=='string'||!/^(0|[1-9][0-9]*)$/.test(s)||BigInt(s)>18446744073709551615n)throw Error('Invalid durable version');return BigInt(s);}
async function replay(state,receipts,limit,bytes){
  const frame=JSON.parse(decoder.decode(bytes));
  if(frame.format!=='ink-durable-operation-v1'||decimal(frame.before)!==BigInt(version(state)))throw Error('Durable operation boundary mismatch');
  const after=decimal(frame.after);
  if(frame.kind==='ack')await acknowledge(state,decimal(frame.commit),decimal(frame.position));
  else if(frame.kind==='invoke'||frame.kind==='receipt'){
    const r=frame.receipt;
    if(!r||typeof r.id!=='string'||!r.id.length||r.id.length>256||receipts.some(x=>x.id===r.id)||typeof r.request!=='string'||typeof r.reply!=='string'||encoder.encode(r.request).length>MAX_HEADER||encoder.encode(r.reply).length>MAX_HEADER)throw Error('Invalid durable operation receipt');
    const request=unpack(r.request),expected=unpack(r.reply);
    if(frame.kind==='invoke'){
      if(typeof request.call!=='string')throw Error('Invalid durable call');
      if(replayValue(await state.invoke(request.call,request.args))!==replayValue(expected))throw Error('Durable replay reply mismatch');
    }else if(after!==BigInt(version(state)))throw Error('Receipt changed durable state');
    receipts.push(r);if(receipts.length>limit)receipts.shift();
  }else throw Error('Invalid durable operation');
  if(BigInt(version(state))!==after)throw Error('Durable replay version mismatch');
}
export class DurableState {
  #state; #factory; #store; #token; #receipts; #receiptLimit; #frames=0; #checkpointInterval; #tail=Promise.resolve(); #closed=false; #poison;
  constructor(factory,store,state,token,receipts,receiptLimit,frames,checkpointInterval){
    this.#factory=factory;this.#store=store;this.#state=state;this.#token=token;this.#receipts=receipts;this.#receiptLimit=receiptLimit;this.#frames=frames;this.#checkpointInterval=checkpointInterval;
  }
  static async open({factory,store,receiptLimit=256,checkpointInterval=32}) {
    if(!Number.isInteger(receiptLimit)||receiptLimit<1||receiptLimit>4096)throw new RangeError('Receipt retention must be 1..4096');
    if(!Number.isInteger(checkpointInterval)||checkpointInterval<1||checkpointInterval>4096)throw new RangeError('Checkpoint interval must be 1..4096');
    let state;
    try{
      const saved=await store.load();let token,receipts=[],frames=0;
      if(saved){
        const log=await splitLog(saved.bytes),record=await decode(log.base);receiptLimit=record.receiptLimit;receipts=record.receipts;
        if(log.frames.length&&saved.token!==log.token)throw Error('Durable log token mismatch');
        state=await factory.restore(record.snapshot);token=saved.token;frames=log.frames.length;
        for(const frame of log.frames)await replay(state,receipts,receiptLimit,frame);
      }else{state=await factory.create();token=await store.commit(null,await encode(await snapshot(state),[],receiptLimit));}
      return new DurableState(factory,store,state,token,receipts,receiptLimit,frames,checkpointInterval);
    }catch(error){if(state)dispose(state);await store.close?.();throw error;}
  }
  #enqueue(fn){if(this.#closed)return Promise.reject(Error('Durable host is closed'));const task=this.#tail.then(()=>{if(this.#poison)throw this.#poison;return fn();});this.#tail=task.catch(()=>{});return task;}
  async #transaction(fn){
    const retained=await this.#state.beginTransaction?.();
    const prior=retained?null:this.#state;
    if(!retained)this.#state=await this.#factory.restore(await snapshot(prior));
    try{const result=await fn();if(retained)await this.#state.commitTransaction();else dispose(prior);return result;}
    catch(error){if(retained)await this.#state.rollbackTransaction();else{dispose(this.#state);this.#state=prior;}throw error;}
  }
  async #publish(receipts,frame){
    const payload=encoder.encode(JSON.stringify(frame));if(payload.length>MAX_FRAME)throw Error('Durable frame limit');
    const checkpoint=this.#frames+1>=this.#checkpointInterval?await encode(await snapshot(this.#state),receipts,this.#receiptLimit):null;
    let next;
    // Encode before publication; only storage errors make the outcome ambiguous.
    try{next=checkpoint?null:await this.#store.append?.(this.#token,payload);}catch(error){this.#poison=new RecoveryRequired(error);throw this.#poison;}
    if(next==null){
      const bytes=checkpoint??await encode(await snapshot(this.#state),receipts,this.#receiptLimit);
      try{next=await this.#store.commit(this.#token,bytes);}catch(error){this.#poison=new RecoveryRequired(error);throw this.#poison;}
      this.#frames=0;
    }else this.#frames++;
    this.#token=next;this.#receipts=receipts;
  }
  invoke(id,call,args){
    if(typeof id!=='string'||!id.length||id.length>256)return Promise.reject(new TypeError('A request id of 1..256 characters is required'));
    let request;try{request=pack({call,args});if(encoder.encode(request).length>MAX_HEADER)throw Error('Request limit');}catch(e){return Promise.reject(e);}
    return this.#enqueue(async()=>{
      const old=this.#receipts.find(r=>r.id===id);if(old){if(replayValue(unpack(old.request))!==replayValue(unpack(request)))throw Error('Request id reused with different arguments');return unpack(old.reply);}
      return this.#transaction(async()=>{
        const before=String(version(this.#state)),captured=unpack(request),reply=pack(await this.#state.invoke(captured.call,captured.args));
        if(encoder.encode(reply).length>MAX_HEADER)throw Error('Reply limit');
        const after=String(version(this.#state)),receipt={id,request,reply},receipts=this.#receipts.concat(receipt).slice(-this.#receiptLimit);
        await this.#publish(receipts,{format:'ink-durable-operation-v1',kind:after===before?'receipt':'invoke',before,after,receipt});return unpack(reply);
      });
    });
  }
  events(){return this.#enqueue(()=>unpack(pack(events(this.#state))));}
  checkpoint(){return this.#enqueue(async()=>(await snapshot(this.#state)).slice());}
  version(){return this.#enqueue(()=>version(this.#state));}
  async #ack(commit,position){return this.#transaction(async()=>{
    const before=String(version(this.#state));await acknowledge(this.#state,commit,position);
    await this.#publish(this.#receipts,{format:'ink-durable-operation-v1',kind:'ack',before,after:String(version(this.#state)),commit:String(commit),position:String(position)});
  });}
  acknowledge(commit,position){return this.#enqueue(()=>this.#ack(commit,position));}
  /** At least once; the receiver deduplicates application/commit/position before returning. */
  deliver(receiver){return this.#enqueue(async()=>{let count=0;for(const event of events(this.#state)){await receiver(event,`${event.commit}:${event.position}`);await this.#ack(event.commit,event.position);count++;}return count;});}
  close(){if(this.#closed)return this.#tail;this.#closed=true;const task=this.#tail.then(async()=>{try{dispose(this.#state);}finally{await this.#store.close?.();}});this.#tail=task.catch(()=>{});return task;}
}

/** The browser requests strict transaction durability. Storage may still be
 * evicted by browser policy; request persistent storage in the application. */
export async function openIndexedDBStore(name,key='state',indexedDB=globalThis.indexedDB){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('states');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('IndexedDB open blocked'));
  });
  const metaKey=[key,'meta'],baseKey=[key,'base'],frameKey=i=>[key,'frame',i];
  const transaction=(mode,action)=>new Promise((resolve,reject)=>{
    const tx=db.transaction('states',mode,mode==='readwrite'?{durability:'strict'}:undefined),store=tx.objectStore('states');
    let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage conflict'));
    const run=(meta,legacy)=>{try{result=action(store,meta,legacy,tx);}catch(error){tx.abort();reject(error);}};
    const request=store.get(metaKey);request.onerror=()=>tx.abort();request.onsuccess=()=>{
      if(request.result)run(request.result,null);
      else{const old=store.get(key);old.onerror=()=>tx.abort();old.onsuccess=()=>run(null,old.result);}
    };
  });
  db.onversionchange=()=>db.close();
  return {
    async load(){
      const loaded=await transaction('readonly',(store,meta,legacy)=>{
        if(!meta)return legacy?{legacy:{token:legacy.token,bytes:new Uint8Array(legacy.bytes)}}:null;
        if(!Number.isInteger(meta.frames)||meta.frames<0||meta.frames>4096||meta.bytes>MAX_LOG)throw Error('Invalid durable log metadata');
        const record={token:meta.token,frames:[]};const base=store.get(baseKey);base.onsuccess=()=>record.base=new Uint8Array(base.result);
        for(let i=0;i<meta.frames;i++){const request=store.get(frameKey(i));request.onsuccess=()=>record.frames[i]=new Uint8Array(request.result);}
        return record;
      });
      if(!loaded)return null;if(loaded.legacy)return loaded.legacy;
      const base=logBase(loaded.base),bytes=new Uint8Array(base.length+loaded.frames.reduce((n,f)=>n+f.length,0));if(bytes.length>MAX_LOG)throw Error('Durable log limit');
      bytes.set(base);let at=base.length;for(const frame of loaded.frames){bytes.set(frame,at);at+=frame.length;}
      const log=await splitLog(bytes);if(log.token!==loaded.token||log.consumed!==bytes.length)throw Error('IndexedDB durable log mismatch');return {token:loaded.token,bytes};
    },
    async commit(expected,bytes){
      const captured=bytes.slice(),token=await recordToken(captured);
      return transaction('readwrite',(store,meta,legacy)=>{
        if((meta?.token??legacy?.token??null)!==expected)throw Error('Storage conflict');
        for(let i=0;i<(meta?.frames??0);i++)store.delete(frameKey(i));
        store.delete(key);store.put(captured,baseKey);store.put({token,frames:0,bytes:8+captured.length},metaKey);return token;
      });
    },
    async append(expected,bytes){
      const next=await frameOperation(expected,bytes.slice());
      return transaction('readwrite',(store,meta,legacy)=>{
        if((meta?.token??legacy?.token??null)!==expected)throw Error('Storage conflict');
        if(!meta||meta.frames>=4096||meta.bytes+next.frame.length>MAX_LOG)return null;
        store.put(next.frame,frameKey(meta.frames));store.put({token:next.token,frames:meta.frames+1,bytes:meta.bytes+next.frame.length},metaKey);return next.token;
      });
    },
    close:()=>db.close(),
  };
}
