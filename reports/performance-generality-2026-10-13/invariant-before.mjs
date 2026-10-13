// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
const __identity = value => value;
// Intern declared conversion schemas once. An invocation owns one WeakMap per
// schema instead of allocating a Map for every converted record/list node.
const __conversionKeys = new Map();
function __representation(type, output) {
  const convert=__representationRaw(type,output);
  if(convert===__identity)return convert;
  // Conversion identity is invocation-local: callers may reuse a mutable host
  // object in a later call. Distinct declared schemas have distinct memo keys.
  const schema=(output?'out:':'in:')+JSON.stringify(type);
  let key=__conversionKeys.get(schema);
  if(!key){key={};__conversionKeys.set(schema,key);}
  return (value,context)=>{
    if(!context||!value||typeof value!=='object')return convert(value,context);
    let entries=context.get(key);
    if(!entries){entries=new WeakMap();context.set(key,entries);}
    if(entries.has(value))return entries.get(value);
    const result=convert(value,context);
    entries.set(value,result);return result;
  };
}
function __representationRaw(type, output) {
  switch (type.kind) {
    case 'ref': return (value,context)=>__representation(__namedTypes[type.name],output)(value,context);
    case 'id': return value=>value.toLowerCase();
    case 'int': return output ? value=>({Int:value.toString()}) : value=>BigInt(value && typeof value==='object' ? value.Int : value);
    case 'option': {
      const item=__representation(type.element,output);
      return item===__identity?__identity:(value,context)=>Object.hasOwn(value,'Some')?{Some:item(value.Some,context)}:{None:null};
    }
    case 'result': {
      const ok=__representation(type.ok,output),err=__representation(type.error,output);
      return ok===__identity&&err===__identity?__identity:(value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)};
    }
    case 'f32': return output ? value => {
      const number = __float(value);
      return Number.isFinite(number) ? number : {F32Bits:value};
    } : value => typeof value === 'number' ? __bits(value) : value.F32Bits;
    case 'list': case 'vector': {
      const element = __representation(type.element, output);
      return element === __identity ? __identity : (value,context) => Array.from(value, item=>element(item,context));
    }
    case 'record': {
      const fields = type.fields.map(field => [field.name, __representation(field.type, output)]);
      return fields.every(([,convert]) => convert === __identity) ? __identity :
        (value,context) => {
          const result={};
          for(const [name,convert] of fields){
            const field=convert(value[name],context);
            // Assignment treats __proto__ specially; records require an own
            // ordinary writable data property, as Object.fromEntries supplied.
            if(name==='__proto__')Object.defineProperty(result,name,{value:field,writable:true,enumerable:true,configurable:true});
            else result[name]=field;
          }
          return result;
        };
    }
    default: return __identity;
  }
}
function __stateInput(value,type,budget={cells:1000000},depth=0){
  if(depth>64||--budget.cells<0)throw Error('state input resource limit');
  const input=(v,t)=>__stateInput(v,t,budget,depth+1);
  const integer=(min,max)=>{if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw Error('invalid '+type.kind);return value===0?0:value;};
  const tagged=tag=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&Object.hasOwn(value,tag);
  switch(type.kind){
    case 'ref':return input(value,__namedTypes[type.name]);
    case 'u32':return integer(0,4294967295);
    case 'i32':return integer(-2147483648,2147483647);
    case 'u64':{
      if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('u64 requires an exact integer');
      if(!['bigint','number','string'].includes(typeof value)||typeof value==='string'&&!/^(0|[1-9][0-9]*)$/.test(value))throw Error('invalid u64');
      const n=BigInt(value);if(n<0n||n>18446744073709551615n)throw Error('invalid u64');return n;
    }
    case 'int':{
      if(typeof value==='bigint')return value;
      if(!tagged('Int')||typeof value.Int!=='string'||!/^(-?[0-9]+)$/.test(value.Int))throw Error('invalid Int');return BigInt(value.Int);
    }
    case 'f32':{
      if(typeof value==='number'&&Number.isFinite(value)){const bits=__bits(value);if((bits&0x7fffffff)===0x7f800000)throw Error('f32 overflow requires F32Bits');return bits;}
      if(!tagged('F32Bits')||!Number.isInteger(value.F32Bits)||value.F32Bits<0||value.F32Bits>4294967295)throw Error('invalid f32');return value.F32Bits;
    }
    case 'bool':if(typeof value!=='boolean')throw Error('invalid Bool');return value;
    case 'unit':if(value!==null)throw Error('invalid Unit');return null;
    case 'string':if(typeof value!=='string'||!value.isWellFormed())throw Error('invalid String');return value;
    case 'id':if(typeof value!=='string'||! /^[0-9a-fA-F]{32}$/.test(value))throw Error('invalid ID');return value.toLowerCase();
    case 'enum':if(!type.variants.includes(value))throw Error('invalid enum');return value;
    case 'list':case 'vector':{
      if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');
      if(type.kind==='vector'&&value.length!==type.size)throw Error('invalid vector length');
      return Array.from(value,v=>input(v,type.element));
    }
    case 'record':if(!value||typeof value!=='object'||Array.isArray(value)||!type.fields.every(f=>Object.hasOwn(value,f.name)))throw Error('invalid record');return Object.fromEntries(type.fields.map(f=>[f.name,input(value[f.name],f.type)]));
    case 'option':if(tagged('Some'))return {Some:input(value.Some,type.element)};if(tagged('None')&&value.None===null)return {None:null};throw Error('invalid Option');
    case 'result':if(tagged('Ok'))return {Ok:input(value.Ok,type.ok)};if(tagged('Err'))return {Err:input(value.Err,type.error)};throw Error('invalid Result');
    default:throw Error('unsupported public value type');
  }
}
// Mutable host replies must not retain references into compiled state or its outbox.
// State results must own mutable containers. Compile the declared schema once:
// scalars need no structured clone, while nested records/lists remain detached.
function __ownedResult(copy,nested){
 const owned=(value,context)=>{
  if(!context&&!nested)return copy(value,null);
  const memo=context||new WeakMap();
  if(memo.has(value))return memo.get(value);
  const result=copy(value,memo);memo.set(value,result);return result;
 };
 owned.container=true;return owned;
}
function __stateResult(type){
 switch(type.kind){
  case 'ref':{let resolved;const copy=(value,context)=>(resolved??=__stateResult(__namedTypes[type.name]))(value,context);copy.container=true;return copy;}
  case 'record':{const fields=type.fields.map(f=>[f.name,__stateResult(f.type)]);return __ownedResult((value,context)=>Object.fromEntries(fields.map(([name,copy])=>[name,copy(value[name],context)])),fields.some(([,copy])=>copy.container));}
  case 'list':case 'vector':{const copy=__stateResult(type.element);return __ownedResult((value,context)=>Array.from(value,item=>copy(item,context)),copy.container);}
  case 'option':{const copy=__stateResult(type.element);return __ownedResult((value,context)=>Object.hasOwn(value,'Some')?{Some:copy(value.Some,context)}:{None:null},copy.container);}
  case 'result':{const ok=__stateResult(type.ok),err=__stateResult(type.error);return __ownedResult((value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)},ok.container||err.container);}
  default:return __representation(type,true);
 }
}
function __stateOutput(value,type){return __stateResult(type)(value);}
const __u64 = n => BigInt.asUintN(64, n);
function __div(a, b, fallback, signed, remainder) {
  if (b === 0 || b === 0n || (signed && a === -2147483648 && b === -1)) return fallback();
  return typeof a === 'bigint' ? (remainder ? a % b : a / b) :
    ((remainder ? a % b : Math.trunc(a / b)) + 0); // integer zero has no sign
}
function __at(xs, index, fallback) { return index < xs.length ? xs[index] : fallback(); }
// Ordinary arrays retain the declared result element type when input is typed.
function __map(xs, fn) {
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) out[i] = fn(xs[i], i);
  return out;
}
function __filter(xs, fn) {
  const out = [];
  for (let i = 0; i < xs.length; i++) if (fn(xs[i])) out.push(xs[i]);
  return out;
}
function __concat(xs, ys) {
  const left = xs.length, right = ys.length, out = new Array(left + right);
  for (let i = 0; i < left; i++) out[i] = xs[i];
  for (let i = 0; i < right; i++) out[left + i] = ys[i];
  return out;
}
function __zip(xs, ys, fn) {
  const n = Math.min(xs.length, ys.length), out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(xs[i], ys[i]);
  return out;
}
function __repeat(n, initial, fn) { let value = initial; for (let i = 0; i < n; i++) value = fn(i, value); return value; }
function __foldr(xs, initial, fn) { let value = initial; for (let i = xs.length - 1; i >= 0; i--) value = fn(xs[i], value); return value; }
function __scan(xs, zero, add) {
  let value = zero; const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) out[i] = value = add(value, xs[i]);
  return out;
}
const __sort = xs => Array.from(xs).sort((a,b) => a < b ? -1 : a > b ? 1 : 0);
// Fixed word semantics, including arithmetic signed right shift. Shift and
// rotation counts wrap modulo width; no source-pattern optimisation lives here.
function __word(op,a,b,bits) {
  const width=BigInt(Math.abs(bits)), k=BigInt(b??0)%width;
  const x=BigInt(a), y=BigInt(b??0), unsigned=BigInt.asUintN(Number(width),x);
  let r;
  switch(op) {
    case 'word_not':r=~x;break;
    case 'word_and':r=x&y;break;
    case 'word_or':r=x|y;break;
    case 'word_xor':r=x^y;break;
    case 'wrapping_shl':r=x<<k;break;
    case 'wrapping_shr':r=x>>k;break;
    case 'rotate_left':r=(unsigned<<k)|(unsigned>>(width-k));break;
    case 'rotate_right':r=(unsigned>>k)|(unsigned<<(width-k));break;
    default:throw new Error('unknown word operation');
  }
  r=bits<0?BigInt.asIntN(Number(width),r):BigInt.asUintN(Number(width),r);
  return bits===64?r:Number(r);
}
const __namedTypes={};
// Portable snapshot ABI shared with native/Wasm. Hashing uses Web Crypto.
function __snapshotLimits(limits={}){
 const result={bytes:64*1024*1024,values:1000000,depth:128,...limits};
 for(const k of ['bytes','values','depth'])if(!Number.isSafeInteger(result[k])||result[k]<0||result[k]>(k==='depth'?128:k==='values'?1000000:64*1024*1024))throw Error('invalid snapshot limits');
 return result;
}
const __hash=async bytes=>new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
function __snapshotWriter(limits){
 const out=[];let left=limits.values;
 function bytes(xs){if(xs.length>limits.bytes-out.length)throw Error('snapshot byte limit exceeded');for(const x of xs)out.push(x);}
 function integer(n,size){n=BigInt(n);for(let i=0;i<size;i++){bytes([Number(n&255n)]);n>>=8n;}}
 function raw(xs){integer(xs.length,8);bytes(xs);}
 function value(v,t,depth=0,bindings=[]){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{value(v,t.body,depth+1,bindings);}finally{bindings.pop();}break;
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');value(v,bound[1],depth+1,bindings);break;}
  case 'unit':break;case 'bool':bytes([v?1:0]);break;
  case 'u32':case 'i32':case 'f32':integer(v,4);break;case 'u64':integer(v,8);break;
  case 'vector':if(v.length!==t.size)throw Error('vector dimension mismatch');for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'int':{let n=v<0n?-v:v;const xs=[];while(n){if(xs.length>=4096)throw Error('snapshot Int exceeds size limit');xs.push(Number(n&255n));n>>=8n;}bytes([v===0n?0:v>0n?1:2]);raw(xs);break;}
  case 'string':raw(__encoder.encode(v));break;
  case 'id':integer(BigInt('0x'+v),16);break;
  case 'enum':integer(t.variants.indexOf(v),4);break;
  case 'record':for(const f of t.fields)value(v[f.name],f.type,depth+1,bindings);break;
  case 'list':if(v.length>left)throw Error('snapshot value limit exceeded');integer(v.length,8);for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'option':if(Object.hasOwn(v,'Some')){bytes([1]);value(v.Some,t.element,depth+1,bindings);}else bytes([0]);break;
  case 'result':if(Object.hasOwn(v,'Ok')){bytes([0]);value(v.Ok,t.ok,depth+1,bindings);}else{bytes([1]);value(v.Err,t.error,depth+1,bindings);}break;
  default:throw Error('unsupported snapshot type');
 }}
 return {bytes,integer,raw,value,get left(){return left;},finish:()=>new Uint8Array(out)};
}
async function __snapshotEncode(meta,state,options){
 const limits=__snapshotLimits(options),w=__snapshotWriter(limits);
 w.integer(state.version,8);
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const rows=[...state.tables[r.index].entries()].sort((a,b)=>__keyCompare(a[0],b[0],r.key));if(rows.length>Math.floor(w.left/2))throw Error('snapshot row limit exceeded');w.integer(rows.length,8);for(const [k,v]of rows){w.value(k,r.snapshotKey??r.key);w.value(v,r.snapshotValue??r.value);}}
 w.integer(state.outbox.length,8);
 for(const e of state.outbox){const channel=meta.events.findIndex(t=>t.name===e.channel);w.integer(e.commit,8);w.integer(e.position,8);w.integer(channel,4);w.value(e.value,meta.events[channel].snapshotType??meta.events[channel].type);}
 const payload=w.finish(),header=__snapshotWriter(limits);header.bytes([86,76,83,84,65,84,69,0,1,0,1,0]);header.bytes(meta.snapshot.program);header.bytes(meta.snapshot.schema);header.integer(payload.length,8);header.bytes(payload);
 const bytes=header.finish();if(bytes.length+32>limits.bytes)throw Error('snapshot byte limit exceeded');const digest=await __hash(bytes);const result=new Uint8Array(bytes.length+32);result.set(bytes);result.set(digest,bytes.length);return result;
}
async function __snapshotDecode(meta,input,options){
 const limits=__snapshotLimits(options);
 if(!(input instanceof Uint8Array)&&!Array.isArray(input))throw Error('expected snapshot bytes');
 if(input.length>limits.bytes||input.length<116)throw Error('snapshot byte length invalid');
 if(Array.isArray(input)&&input.some(b=>!Number.isInteger(b)||b<0||b>255))throw Error('invalid snapshot bytes');
 const bytes=new Uint8Array(input); // capture before asynchronous integrity work
 function same(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
 if(!same(bytes.subarray(0,12),[86,76,83,84,65,84,69,0,1,0,1,0]))throw Error('snapshot format or semantics version mismatch');
 if(!same(bytes.subarray(12,44),meta.snapshot.program)||!same(bytes.subarray(44,76),meta.snapshot.schema))throw Error('snapshot program or schema identity mismatch');
 const end=bytes.length-32,digest=await __hash(bytes.subarray(0,end));if(!same(digest,bytes.subarray(end)))throw Error('snapshot integrity check failed');
 let at=76,left=limits.values;
 function take(n){if(!Number.isSafeInteger(n)||n<0||n>end-at)throw Error('truncated snapshot');const x=bytes.subarray(at,at+n);at+=n;return x;}
 function integer(size){const xs=take(size);let n=0n;for(let i=size-1;i>=0;i--)n=(n<<8n)+BigInt(xs[i]);return n;}
 function length(){const n=integer(8);if(n>BigInt(Number.MAX_SAFE_INTEGER))throw Error('snapshot length not addressable');return Number(n);}
 function sequence(){const n=length();if(n>left)throw Error('snapshot value limit exceeded');return n;}
 function raw(){return take(length());}
 const n=length();if(n!==end-84)throw Error('snapshot payload length mismatch');
 function value(t,depth=0,bindings=[]){if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{return value(t.body,depth+1,bindings);}finally{bindings.pop();}
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');return value(bound[1],depth+1,bindings);}
  case 'unit':return null;case 'bool':{const b=take(1)[0];if(b>1)throw Error('invalid Bool tag');return b===1;}
  case 'u32':case 'f32':return Number(integer(4));case 'i32':return Number(BigInt.asIntN(32,integer(4)));case 'u64':return integer(8);
  case 'vector':{const xs=[];for(let i=0;i<t.size;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'int':{const sign=take(1)[0],xs=raw();if(xs.length>4096)throw Error('snapshot Int exceeds size limit');if(!((sign===0&&xs.length===0)||((sign===1||sign===2)&&xs.length>0&&xs[xs.length-1]!==0)))throw Error('noncanonical signed integer');let n=0n;for(let i=xs.length-1;i>=0;i--)n=(n<<8n)+BigInt(xs[i]);return sign===2?-n:n;}
  case 'string':return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw());
  case 'id':return integer(16).toString(16).padStart(32,'0');
  case 'enum':{const i=Number(integer(4));if(i>=t.variants.length)throw Error('invalid enum tag');return t.variants[i];}
  case 'record':return Object.fromEntries(t.fields.map(f=>[f.name,value(f.type,depth+1,bindings)]));
  case 'list':{const n=sequence(),xs=[];for(let i=0;i<n;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'option':{const tag=take(1)[0];if(tag===0)return {None:null};if(tag===1)return {Some:value(t.element,depth+1,bindings)};throw Error('invalid Option tag');}
  case 'result':{const tag=take(1)[0];if(tag===0)return {Ok:value(t.ok,depth+1,bindings)};if(tag===1)return {Err:value(t.error,depth+1,bindings)};throw Error('invalid Result tag');}
  default:throw Error('unsupported snapshot type');
 }}
 const version=integer(8),tables=meta.roots.map(()=>new Map());
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const n=sequence();if(n>Math.floor(left/2))throw Error('snapshot row limit exceeded');let prior;for(let i=0;i<n;i++){const k=value(r.snapshotKey??r.key),v=value(r.snapshotValue??r.value);if(i&&__keyCompare(prior,k,r.key)>=0)throw Error('duplicate or unordered snapshot key');tables[r.index].set(k,v);prior=k;}}
 const count=sequence(),outbox=[];let prior;
 for(let i=0;i<count;i++){const commit=integer(8),position=integer(8),channel=Number(integer(4));if(!meta.events[channel])throw Error('unknown snapshot event channel');const v=value(meta.events[channel].snapshotType??meta.events[channel].type);if(commit===0n||commit>version||(prior&&(commit<prior.commit||(commit===prior.commit&&position<=prior.position))))throw Error('invalid snapshot event sequence');const e={commit,position,channel:meta.events[channel].name,value:v};outbox.push(e);prior=e;}
 if(at!==end)throw Error('trailing snapshot payload');return {version,tables,outbox};
}
// CALLER CONTRACT: arguments must match declared types; malformed data may throw or corrupt state.
// Fixed state primitives used by emitted action bodies, without an AST evaluator.
class __Abort {constructor(value){this.value=value;}}
function __try(value){if(Object.hasOwn(value,'Err'))throw new __Abort(value.Err);return value.Ok;}
function __nested(value,change){if(change && Object.hasOwn(value,'Err'))throw new __Abort(value.Err);return value;}
function __equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&__equal(a[k],b[k]));}
function __checked(op,a,b,bits){const x=BigInt(a),y=BigInt(b),n=op==='checked_add'?x+y:op==='checked_sub'?x-y:x*y;const min=bits===-32?-2147483648n:0n,max=bits===-32?2147483648n:1n<<BigInt(bits);return n<min||n>=max?{Err:'ArithmeticError.Overflow'}:{Ok:Math.abs(bits)===32?Number(n):n};}
function __okOr(value,error){return Object.hasOwn(value,'Some')?{Ok:value.Some}:{Err:error};}
function __mapValue(value,kind,method,fn){
 if(kind==='list')return value[method](fn);
 if(kind==='option')return Object.hasOwn(value,'Some')?{Some:fn(value.Some)}:{None:null};
 const tag=method==='map_err'?'Err':'Ok';return Object.hasOwn(value,tag)?{[tag]:fn(value[tag])}:value;
}
const __encoder=new TextEncoder();
function __tick(ctx){if(--ctx.fuel<0)throw Error('Ink state execution budget exhausted');}
function __keyCompare(a,b,type){
 if(type.kind==='string'){const x=__encoder.encode(a),y=__encoder.encode(b);for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}
 return a<b?-1:a>b?1:0;
}
// A table's ordered key view is reused until membership changes. Values are
// fetched at traversal time, so replacement never leaves stale row payloads.
const __tableOrder=new WeakMap();
function __orderedKeys(rt,index){const table=rt.tables[index];let keys=__tableOrder.get(table);if(!keys){keys=[...table.keys()].sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));__tableOrder.set(table,keys);}return keys;}
// The first before-image of each cell suffices for whole-transaction rollback.
function __remember(rt,index,key,present,value){if(!rt.seen[index].has(key)){rt.seen[index].add(key);rt.undo.push([index,key,present,value]);}}
// Only scalar keeps are retained. Reverse edges come from checked source effects.
// Before-images preserve cached values across failed actions; host rollback and
// restore discard caches rather than serializing them into logical snapshots.
function __invalidateKeeps(rt,index){
 if(!rt.keeps)return;
 for(const keep of rt.meta.keepInvalidations[index]){
  if(!rt.keepSeen.has(keep)){rt.keepSeen.add(keep);rt.keepUndo.push([keep,rt.keeps[keep]]);}
  rt.keeps[keep]=undefined;
 }
}
function __restoreKeeps(rt){for(let i=rt.keepUndo.length-1;i>=0;i--){const [keep,value]=rt.keepUndo[i];rt.keeps[keep]=value;}}
function __cachedKeep(ctx,rt,index,compute){const prior=rt.keeps[index];if(prior!==undefined)return prior;const value=compute(ctx,rt);rt.keeps[index]=value;return value;}
function __table(rt,index,method,args){
 const table=rt.tables[index],key=args[0];
 if(method==='values'||method==='keys'){const keys=__orderedKeys(rt,index);return method==='keys'?keys.slice():keys.map(k=>table.get(k));}
 if(method==='intersect_table'){const other=rt.tables[args[0]],small=table.size<=other.size?table:other,large=small===table?other:table;const result=[];for(const k of small.keys())if(large.has(k))result.push(k);return result.sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));}
 if(method==='intersect_keys'){const selected=new Set(args[0]);return __orderedKeys(rt,index).filter(k=>selected.has(k));}
 if(method==='put_many'){const keys=args[0],values=args[1];if(keys.length!==values.length)return {Err:'table bulk length mismatch'};for(let i=0;i<keys.length;i++)__table(rt,index,'put',[keys[i],values[i]]);return {Ok:null};}
 if(method==='remove_many'){for(const k of args[0])__table(rt,index,'remove',[k]);return null;}
 // Checked table values never use undefined (Unit uses null), so one lookup
 // distinguishes absence without a second hash probe.
 if(method==='get'){const value=table.get(key);return value===undefined?{None:null}:{Some:value};}
 if(method==='contains')return table.has(key);
 if(method==='remove'){const value=table.get(key),present=value!==undefined;if(present){__invalidateKeeps(rt,index);__tableOrder.delete(table);__remember(rt,index,key,true,value);table.delete(key);}return present?{Some:value}:{None:null};}
 const prior=table.get(key),present=prior!==undefined;
 if(method==='insert'&&present)throw Error('insert key already present');
 if(method==='replace'&&!present)throw Error('replace key absent');
 if(present&&Object.is(prior,args[1]))return null;
 __invalidateKeeps(rt,index);
 if(!present)__tableOrder.delete(table);
 __remember(rt,index,key,present,prior);table.set(key,args[1]);return null;
}
function __rollback(rt,mark){for(let i=rt.undo.length-1;i>=mark;i--){const [index,key,present,value]=rt.undo[i];const table=rt.tables[index];if(table.has(key)!==present)__tableOrder.delete(table);if(present)table.set(key,value);else table.delete(key);}rt.undo.length=mark;}
function __createState(meta,implementations){
 const rt={meta,tables:meta.roots.map(()=>new Map()),version:0n,outbox:[],staged:[],busy:false,undo:[],seen:meta.roots.map(()=>new Set()),host:null,keeps:new Array(meta.keeps.length),keepUndo:[],keepSeen:new Set()};
 const actionMap=new Map(meta.actions.map(a=>[a.name,{...a,output:__stateResult(a.result)}]));
 const eventOutput=new Map(meta.events.map(e=>[e.name,__stateResult(e.type)]));
 function invoke(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);return run(a,args);}
 function read(a,args,inputs,output,resultOnly){
  if(rt.busy)throw Error('state operation already in progress');
  const captured=inputs?inputs.map((convert,i)=>convert(args[i])):a.params.map((p,i)=>__stateInput(args[i],p.type));
  const ctx={fuel:100000000};
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  rt.busy=true;
  try{const result=(output||a.output)(implementations[a.index](ctx,rt,...captured));return resultOnly?result:{result,committed:false,version:rt.version,events:[]};}
  finally{rt.busy=false;}
 }
 function run(a,args,inputs=null,output=null,resultOnly=false){
  if(!a.change)return read(a,args,inputs,output,resultOnly);
  if(rt.busy)throw Error('state operation already in progress');
  const captured=inputs?inputs.map((convert,i)=>convert(args[i])):a.params.map((p,i)=>__stateInput(args[i],p.type));
  if(a.precondition && implementations[actionMap.get(a.precondition).index]({fuel:100000000},rt,...captured)!==true)throw Error('contract precondition failed');
  const mark=rt.undo.length,version=rt.version,outbox=rt.outbox,outboxLength=rt.outbox.length;
  rt.busy=true;rt.staged.length=0;const ctx={fuel:100000000};
  try{
   const value=implementations[a.index](ctx,rt,...captured);
   const result=(output||a.output)(value);
   if(a.fallible && Object.hasOwn(value,'Err')){__rollback(rt,mark);__restoreKeeps(rt);return resultOnly?result:{result,committed:false,version,events:[]};}
   if(version===18446744073709551615n)throw Error('commit sequence exhausted');
   const next=version+1n;
   const events=resultOnly?null:rt.staged.map(([channel,value],i)=>({commit:next,position:BigInt(i),channel,value:eventOutput.get(channel)(value)}));
   const pending=rt.staged.map(([channel,value],i)=>({commit:next,position:BigInt(i),channel,value}));
   rt.version=next;for(const event of pending)rt.outbox.push(event);
   return resultOnly?result:{result,committed:true,version:next,events};
  }catch(e){__rollback(rt,mark);__restoreKeeps(rt);rt.version=version;rt.outbox=outbox;rt.outbox.length=outboxLength;throw e;}
  finally{rt.staged.length=0;rt.busy=false;rt.keepUndo.length=0;rt.keepSeen.clear();for(const seen of rt.seen)seen.clear();if(!rt.host)rt.undo.length=0;}
 }
 return Object.freeze({
  invoke,invoke_json:invoke,
  // A prebound typed entrypoint: scalar arguments obey the native caller contract.
  // Composite arguments still capture owned input; events remain in the outbox.
  bind(name,{resultOnly=false}={}){
   const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);
   const inputs=a.params.map(p=>['u32','i32','u64','bool','unit','string','f32','id','enum','int'].includes(p.type.kind)?__representation(p.type,false):value=>__stateInput(value,p.type));
   if(!a.change&&!a.precondition&&inputs.length===0)return ()=>{
    if(rt.busy)throw Error('state operation already in progress');rt.busy=true;const ctx={fuel:100000000};
    try{const result=a.output(implementations[a.index](ctx,rt));return resultOnly?result:{result,committed:false,version:rt.version,events:[]};}finally{rt.busy=false;}
   };
   return (...args)=>run(a,args,inputs,a.output,resultOnly);
  },
  beginTransaction(){if(rt.busy||rt.host||rt.undo.length)throw Error('transaction already in progress');rt.host={version:rt.version,outbox:rt.outbox,length:rt.outbox.length};return true;},
  commitTransaction(){rt.host=null;rt.undo.length=0;},
  rollbackTransaction(){if(rt.host){__rollback(rt,0);rt.version=rt.host.version;rt.outbox=rt.host.outbox;rt.outbox.length=rt.host.length;rt.host=null;rt.keeps.fill(undefined);}},
  get version(){return rt.version;},
  get outbox(){return rt.outbox.map(e=>({...e,value:eventOutput.get(e.channel)(e.value)}));},
  acknowledgeThrough(commit,position){if(rt.busy)throw Error('state operation already in progress');commit=__stateInput(commit,{kind:'u64'},{cells:1});position=__stateInput(position,{kind:'u64'},{cells:1});rt.outbox=rt.outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},
  async invokeAsync(name,args){
   if(typeof __parallelInvokeAsync!=='function')return invoke(name,args);
   if(rt.busy)throw Error('state operation already in progress');const captured=structuredClone(args);rt.busy=true;
   try{const snapshot=await __snapshotEncode(meta,rt);const reply=await __parallelInvokeAsync(name,captured,snapshot);const s=await __snapshotDecode(meta,reply.snapshot);rt.tables=s.tables;rt.version=s.version;rt.outbox=s.outbox;rt.keeps.fill(undefined);return reply.value;}finally{rt.busy=false;}
  },
  checkpoint(limits){if(rt.busy)throw Error('checkpoint requires transaction boundary');return __snapshotEncode(meta,rt,limits);},
  async restore(bytes,limits){if(rt.host)throw Error('restore during transaction');if(rt.busy)throw Error('restore requires transaction boundary');rt.busy=true;try{const s=await __snapshotDecode(meta,bytes,limits);const candidate={...rt,tables:s.tables,version:s.version,outbox:s.outbox,keeps:rt.keeps.map(()=>undefined)};for(const name of meta.invariantChecks||[]){const a=actionMap.get(name);if(implementations[a.index]({fuel:100000000},candidate)!==true)throw Error('snapshot violates state invariant');}rt.tables=s.tables;rt.version=s.version;rt.outbox=s.outbox;rt.keeps.fill(undefined);}finally{rt.busy=false;}},
 });
}
function __action0(ctx,rt){__tick(ctx);try{__tick(ctx);return ((s0)=>(__equal(BigInt((__mapValue(s0,"list","filter",(s1)=>{__tick(ctx);return __equal(__equal(BigInt((__mapValue(s0,"list","filter",(s2)=>{__tick(ctx);return __equal([s2],[s1]);})).length),1n),false);})).length),0n)))(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__table(rt,0,"get",[0]),[]));}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action1(ctx,rt){__tick(ctx);try{__tick(ctx);return ((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__table(rt,0,"get",[0]),[]);}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action2(ctx,rt){__tick(ctx);try{__tick(ctx);__table(rt,0,"put",[0,[]]);__tick(ctx);return null;}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action3(ctx,rt){__tick(ctx);try{__tick(ctx);__table(rt,0,"put",[0,[1,1]]);__tick(ctx);const s3=__nested(__action0(ctx,rt),false);__tick(ctx);__table(rt,0,"put",[0,[]]);__tick(ctx);return s3;}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action4(ctx,rt,s4){__tick(ctx);try{__tick(ctx);__table(rt,0,"put",[0,s4]);__tick(ctx);return null;}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action5(ctx,rt,s5){__tick(ctx);try{__tick(ctx);__table(rt,0,"put",[0,s5]);__tick(ctx);return null;}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action6(ctx,rt){__tick(ctx);try{__tick(ctx);return ((s6)=>(__equal(BigInt((__mapValue(s6,"list","filter",(s7)=>{__tick(ctx);return __equal(__equal(BigInt((__mapValue(s6,"list","filter",(s8)=>{__tick(ctx);return __equal([s8],[s7]);})).length),1n),false);})).length),0n)))(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__table(rt,0,"get",[0]),[]));}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action7(ctx,rt,s9){__tick(ctx);try{__tick(ctx);return ((((s10)=>(__equal(BigInt((__mapValue(s10,"list","filter",(s11)=>{__tick(ctx);return __equal(__equal(BigInt((__mapValue(s10,"list","filter",(s12)=>{__tick(ctx);return __equal([s12],[s11]);})).length),1n),false);})).length),0n)))(s9)) && (true));}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
const __stateMetadata={"actions":[{"change":false,"fallible":false,"index":0,"name":"known_unique","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":false,"fallible":false,"index":1,"name":"contents","params":[],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"change":true,"fallible":false,"index":2,"name":"clear","params":[],"precondition":null,"result":{"kind":"unit"}},{"change":true,"fallible":false,"index":3,"name":"transient","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":true,"fallible":false,"index":4,"name":"replace_all","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":"__ink_requires_0","result":{"kind":"unit"}},{"change":true,"fallible":false,"index":5,"name":"assign","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":"__ink_requires_0","result":{"kind":"unit"}},{"change":false,"fallible":false,"index":6,"name":"__ink_invariant_0","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":false,"fallible":false,"index":7,"name":"__ink_requires_0","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}}],"events":[],"invariantChecks":["__ink_invariant_0"],"keepInvalidations":[[]],"keeps":[],"roots":[{"key":{"kind":"u32"},"name":"Ready","snapshotKey":{"kind":"u32"},"snapshotValue":{"element":{"kind":"u32"},"kind":"list"},"value":{"element":{"kind":"u32"},"kind":"list"}}],"snapshot":{"program":[11,25,225,77,214,95,168,20,54,142,172,180,120,229,116,105,138,100,175,109,19,3,212,124,131,167,175,18,99,242,153,231],"schema":[63,43,172,225,50,139,241,243,245,146,192,62,34,233,185,67,199,64,150,108,250,216,100,102,132,92,173,18,44,45,94,112]}};const __actions=[__action0,__action1,__action2,__action3,__action4,__action5,__action6,__action7];
export function createState(){return __createState(__stateMetadata,__actions);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v10","core_sha256":"ea49f403ed32c9e41c724d70b3061329a0b3b8cad6d973844e5de6e4355886e3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[],"named_types":{},"schema":1,"state":{"actions":[{"change":false,"fallible":false,"index":0,"name":"known_unique","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":false,"fallible":false,"index":1,"name":"contents","params":[],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"list"}},{"change":true,"fallible":false,"index":2,"name":"clear","params":[],"precondition":null,"result":{"kind":"unit"}},{"change":true,"fallible":false,"index":3,"name":"transient","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":true,"fallible":false,"index":4,"name":"replace_all","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":"__ink_requires_0","result":{"kind":"unit"}},{"change":true,"fallible":false,"index":5,"name":"assign","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":"__ink_requires_0","result":{"kind":"unit"}},{"change":false,"fallible":false,"index":6,"name":"__ink_invariant_0","params":[],"precondition":null,"result":{"kind":"bool"}},{"change":false,"fallible":false,"index":7,"name":"__ink_requires_0","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}}],"events":[],"invariantChecks":["__ink_invariant_0"],"keepInvalidations":[[]],"keeps":[],"roots":[{"key":{"kind":"u32"},"name":"Ready","snapshotKey":{"kind":"u32"},"snapshotValue":{"element":{"kind":"u32"},"kind":"list"},"value":{"element":{"kind":"u32"},"kind":"list"}}],"snapshot":{"program":[11,25,225,77,214,95,168,20,54,142,172,180,120,229,116,105,138,100,175,109,19,3,212,124,131,167,175,18,99,242,153,231],"schema":[63,43,172,225,50,139,241,243,245,146,192,62,34,233,185,67,199,64,150,108,250,216,100,102,132,92,173,18,44,45,94,112]}}};
const __implementations=[];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,f.precondition==null?__implementations[f.index]:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return __implementations[f.index](...args);}])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,f.precondition==null?__intoImplementations[f.index]:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return __intoImplementations[f.index](...args);}])) );
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
