const __recordElisions=new Set([]);
const __nativeF32=false;
// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
// Native binary32 lane for pure modules. Explicit NaN payloads remain tagged;
// arithmetic canonicalizes NaNs just as __bits does in the exact-bit lane.
const __nfValue = value => typeof value === 'number' ? Math.fround(value) : value;
// Number operands have already been normalised at their typed read or producer.
const __nfNumber = value => typeof value === 'number' ? value : __float(value.F32Bits);
const __nfBits = value => typeof value === 'number' ? __bits(value) : value.F32Bits;
const __nfFromBits = bits => (bits & 0x7fffffff)>0x7f800000 ? {F32Bits:bits} : __float(bits);
const __nfNeg = value => typeof value === 'number' && !Number.isNaN(value) ? -value : {F32Bits:(__nfBits(value) ^ 0x80000000) >>> 0};
const __nfOutput = value => {const n=typeof value==='number'?Math.fround(value):__float(value.F32Bits);return Number.isFinite(n)?n:{F32Bits:__nfBits(value)};};
const __identity = value => value;
// Intern declared conversion schemas once. An invocation owns one WeakMap per
// schema instead of allocating a Map for every converted record/list node.
const __conversionKeys = new Map();
function __representation(type, output, capture=false) {
  const convert=__representationRaw(type,output,capture);
  if(convert===__identity)return convert;
  // Conversion identity is invocation-local: callers may reuse a mutable host
  // object in a later call. Distinct declared schemas have distinct memo keys.
  const schema=(output?'out:':capture?'capture:':'in:')+JSON.stringify(type);
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
function __representationRaw(type, output, capture) {
  switch (type.kind) {
    case 'ref': {
      let resolved;
      return (value,context)=>(resolved??=__representation(__namedTypes[type.name],output,capture))(value,context);
    }
    case 'id': return value=>value.toLowerCase();
    case 'int': return output ? value=>({Int:value.toString()}) : value=>BigInt(value && typeof value==='object' ? value.Int : value);
    case 'option': {
      const item=__representation(type.element,output,capture);
      return item===__identity?__identity:(value,context)=>Object.hasOwn(value,'Some')?{Some:item(value.Some,context)}:{None:null};
    }
    case 'result': {
      const ok=__representation(type.ok,output,capture),err=__representation(type.error,output,capture);
      const key=typeof __sumSpecs==='undefined'?null:__sumKey(type),flat=key!==null&&__sumSpecs.has(key);
      if(flat)return output?(value,context)=>{const v=__sumView(key,value);return Object.hasOwn(v,'Ok')?{Ok:ok(v.Ok,context)}:{Err:err(v.Err,context)};}:(v,context)=>Object.hasOwn(v,'Ok')?__sumMake(key,true,ok(v.Ok,context)):__sumMake(key,false,err(v.Err,context));
      return ok===__identity&&err===__identity?__identity:(value,context)=>Object.hasOwn(value,'Ok')?{Ok:ok(value.Ok,context)}:{Err:err(value.Err,context)};
    }
    case 'f32': if(typeof __nativeF32!=='undefined'&&__nativeF32)return output?__nfOutput:capture?__nfValue:__identity;
      return output ? value => {
      const number = __float(value);
      return Number.isFinite(number) ? number : {F32Bits:value};
    } : value => typeof value === 'number' ? __bits(value) : value.F32Bits;
    case 'list': case 'vector': {
      const element = __representation(type.element, output,capture);
      return element === __identity ? __identity : (value,context) => Array.from(value, item=>element(item,context));
    }
    case 'record': {
      if((typeof __recordElisions!=='undefined'&&__recordElisions.has(type.name))){
        if(!type.fields.length)return ()=>undefined; // lexically unconsumed projected input
        const field=type.fields[0],child=__representation(field.type,output,capture);
        return output?(value,context)=>({[field.name]:child(value,context)}):(value,context)=>child(value[field.name],context);
      }
      const fields = type.fields.map(field => [field.name, __representation(field.type, output,capture)]);
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
function __stateWord(value){
 if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('u64 requires an exact integer');
 if(!['bigint','number','string'].includes(typeof value)||typeof value==='string'&&!/^(0|[1-9][0-9]*)$/.test(value))throw Error('invalid u64');
 const n=BigInt(value);if(n<0n||n>18446744073709551615n)throw Error('invalid u64');return n;
}
// Compile the capture traversal once. Each invocation still validates and owns
// every public container; no host value is retained between calls.
const __stateCaptures=new WeakMap();
function __stateCapture(type){
 const prior=__stateCaptures.get(type);if(prior)return prior;
 const capture=__compileStateCapture(type);__stateCaptures.set(type,capture);return capture;
}
function __compileStateCapture(type){
 const limited=copy=>(value,budget={cells:1000000},depth=0)=>{
  if(depth>64||--budget.cells<0)throw Error('state input resource limit');
  return copy(value,budget,depth);
 };
 const tagged=(value,tag)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&Object.hasOwn(value,tag);
 switch(type.kind){
  case 'ref':{
   // Resolve lazily so recursive schemas compile to recursive validators rather
   // than reverting to descriptor interpretation at every referenced node.
   let resolved;
   return limited((value,budget,depth)=>(resolved??=__stateCapture(__namedTypes[type.name]))(value,budget,depth+1));
  }
  case 'u32':case 'i32':{
   const min=type.kind==='u32'?0:-2147483648,max=type.kind==='u32'?4294967295:2147483647;
   return limited(value=>{if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw Error('invalid '+type.kind);return value===0?0:value;});
  }
  case 'u64':return limited(__stateWord);
  case 'bool':return limited(value=>{if(typeof value!=='boolean')throw Error('invalid Bool');return value;});
  case 'unit':return limited(value=>{if(value!==null)throw Error('invalid Unit');return null;});
  case 'string':return limited(value=>{if(typeof value!=='string'||!value.isWellFormed())throw Error('invalid String');return value;});
  case 'enum':return limited(value=>{if(!type.variants.includes(value))throw Error('invalid enum');return value;});
  case 'id':return limited(value=>{if(typeof value!=='string'||! /^[0-9a-fA-F]{32}$/.test(value))throw Error('invalid ID');return value.toLowerCase();});
  case 'list':case 'vector':{
   const item=__stateCapture(type.element),size=type.kind==='vector'?type.size:null;
   return limited((value,budget,depth)=>{
    if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');
    if(size!==null&&value.length!==size)throw Error('invalid vector length');
    const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=item(value[i],budget,depth+1);return out;
   });
  }
  case 'record':{
   const fields=type.fields.map(f=>[f.name,__stateCapture(f.type)]);
   if((typeof __recordElisions!=='undefined'&&__recordElisions.has(type.name)))return limited((value,budget,depth)=>{const [name,copy]=fields[0];if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,name))throw Error('invalid record');return copy(value[name],budget,depth+1);});
   return limited((value,budget,depth)=>{
    if(!value||typeof value!=='object'||Array.isArray(value)||!fields.every(([name])=>Object.hasOwn(value,name)))throw Error('invalid record');
    const out={};for(const [name,copy]of fields){const field=copy(value[name],budget,depth+1);if(name==='__proto__')Object.defineProperty(out,name,{value:field,writable:true,enumerable:true,configurable:true});else out[name]=field;}return out;
   });
  }
  case 'option':{
   const item=__stateCapture(type.element);
   return limited((value,budget,depth)=>{if(tagged(value,'Some'))return {Some:item(value.Some,budget,depth+1)};if(tagged(value,'None')&&value.None===null)return {None:null};throw Error('invalid Option');});
  }
  case 'result':{
   const ok=__stateCapture(type.ok),err=__stateCapture(type.error);
   return limited((value,budget,depth)=>{if(tagged(value,'Ok'))return {Ok:ok(value.Ok,budget,depth+1)};if(tagged(value,'Err'))return {Err:err(value.Err,budget,depth+1)};throw Error('invalid Result');});
  }
  default:return (value,budget,depth)=>__stateInput(value,type,budget,depth);
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
    case 'u64':return __stateWord(value);
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
    case 'record':if(!value||typeof value!=='object'||Array.isArray(value)||!type.fields.every(f=>Object.hasOwn(value,f.name)))throw Error('invalid record');if((typeof __recordElisions!=='undefined'&&__recordElisions.has(type.name))){const f=type.fields[0];return input(value[f.name],f.type);}return Object.fromEntries(type.fields.map(f=>[f.name,input(value[f.name],f.type)]));
    case 'option':if(tagged('Some'))return {Some:input(value.Some,type.element)};if(tagged('None')&&value.None===null)return {None:null};throw Error('invalid Option');
    case 'result':{const key=typeof __sumSpecs==='undefined'?null:__sumKey(type),flat=key!==null&&__sumSpecs.has(key);if(tagged('Ok')){const child=input(value.Ok,type.ok);return flat?__sumMake(key,true,child):{Ok:child};}if(tagged('Err')){const child=input(value.Err,type.error);return flat?__sumMake(key,false,child):{Err:child};}throw Error('invalid Result');}
    default:throw Error('unsupported public value type');
  }
}
// Mutable host replies must not retain references into compiled state or its outbox.
// State results must own mutable containers. Compile the declared schema once:
// scalars need no structured clone, while nested records/lists remain detached.
function __ownershipSchema(type){
 // Nominal references and expanded declarations name the same checked sort.
 // Distinct source records retain distinct keys even if a layout erases them.
 if(type.kind==='ref'||type.kind==='record'&&type.name)return ['named',type.name];
 switch(type.kind){
  case 'list':case 'vector':return [type.kind,type.size??null,__ownershipSchema(type.element)];
  case 'option':return ['option',__ownershipSchema(type.element)];
  case 'result':return ['result',__ownershipSchema(type.ok),__ownershipSchema(type.error)];
  case 'record':return ['record',type.fields.map(f=>[f.name,__ownershipSchema(f.type)])];
  default:return type;
 }
}
function __ownedResult(copy,nested,type){
 const key='owned-state:'+JSON.stringify(__ownershipSchema(type));
 let schema=__conversionKeys.get(key);
 if(!schema){schema={};__conversionKeys.set(key,schema);}
 const owned=(value,context)=>{
  if(!context&&!nested)return copy(value,null);
  const memo=context||new WeakMap();
  if(value===null||typeof value!=='object')return copy(value,memo);
  let entries=memo.get(schema);if(!entries){entries=new WeakMap();memo.set(schema,entries);}
  if(entries.has(value))return entries.get(value);
  const result=copy(value,memo);entries.set(value,result);return result;
 };
 owned.container=true;return owned;
}
function __stateResult(type){
 switch(type.kind){
  case 'ref':{let resolved;const copy=(value,context)=>(resolved??=__stateResult(__namedTypes[type.name]))(value,context);copy.container=true;return copy;}
  case 'record':{if((typeof __recordElisions!=='undefined'&&__recordElisions.has(type.name))){const f=type.fields[0],copy=__stateResult(f.type);return __ownedResult((value,context)=>({[f.name]:copy(value,context)}),copy.container,type);}const fields=type.fields.map(f=>[f.name,__stateResult(f.type)]);return __ownedResult((value,context)=>Object.fromEntries(fields.map(([name,copy])=>[name,copy(value[name],context)])),fields.some(([,copy])=>copy.container),type);}
  case 'list':case 'vector':{const copy=__stateResult(type.element);return __ownedResult((value,context)=>Array.from(value,item=>copy(item,context)),copy.container,type);}
  case 'option':{const copy=__stateResult(type.element);return __ownedResult((value,context)=>Object.hasOwn(value,'Some')?{Some:copy(value.Some,context)}:{None:null},copy.container,type);}
  case 'result':{const ok=__stateResult(type.ok),err=__stateResult(type.error),key=typeof __sumSpecs==='undefined'?null:__sumKey(type),flat=key!==null&&__sumSpecs.has(key);return __ownedResult((value,context)=>{const v=flat?__sumView(key,value):value;return Object.hasOwn(v,'Ok')?{Ok:ok(v.Ok,context)}:{Err:err(v.Err,context)};},ok.container||err.container,type);}
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

function __wordSort(xs,Storage){
 const sorted=Storage.from(xs).sort(),out=new Array(sorted.length);
 for(let i=0;i<sorted.length;i++)out[i]=sorted[i];
 return out;
}
// Fixed primitives; no cross-invocation host caches.
function __ink_round_even(x){if(!Number.isFinite(x)||Math.abs(x)>=8388608)return x;const a=Math.abs(x),i=Math.floor(a),r=a-i;const y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;}
// Direct BigInt -> binary32 avoids double rounding through binary64.
function __ink_big_float(x){if(x===0n)return 0;const neg=x<0n;if(neg)x=-x;let e=x.toString(2).length-1;if(e<=23)return Number(neg?-x:x);const shift=BigInt(e-23),mask=(1n<<shift)-1n;let q=x>>shift;const rem=x&mask,half=1n<<(shift-1n);if(rem>half||(rem===half&&(q&1n)!==0n))q++;if(q===16777216n){q>>=1n;e++;}if(e>127)return neg?-Infinity:Infinity;return (neg?-1:1)*Number(q)*2**(e-23);}
function __ink_from_float(x,t){x=Math.trunc(x);if(!Number.isFinite(x))return {None:null};const valid=t==='i32'?x>=-2147483648&&x<2147483648:x>=0&&x<(t==='u32'?4294967296:18446744073709551616);return valid?{Some:t==='u64'?BigInt(x):x===0?0:x}:{None:null};}
function __ink_count(x,n,width){if(width===64){x=BigInt.asUintN(64,x);if(n==='popcount'){let count=0;while(x){x&=x-1n;count++;}return count;}if(x===0n)return 64;if(n==='leading_zeros')return 64-x.toString(2).length;let count=0;while((x&1n)===0n){x>>=1n;count++;}return count;}x>>>=0;if(n==='leading_zeros')return Math.clz32(x);if(n==='trailing_zeros')return x===0?32:31-Math.clz32((x&-x)>>>0);x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24;}
const __ink_encoder=new TextEncoder(),__ink_decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const __ink_bytes=s=>__ink_encoder.encode(s);
// Count UTF-8 bytes directly; valid Ink strings contain Unicode scalar values.
// Preserve TextEncoder's replacement width for a lone surrogate at trusted hosts.
function __ink_byte_len(s,start=0,end=s.length){let n=0;for(let i=start;i<end;i++){const c=s.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<end&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){n+=4;i++;}else n+=3;}return n;}
const __ink_boundary=(b,i)=>i<=b.length&&(i===b.length||(b[i]&0xc0)!==0x80);
function __ink_byte_at(s,i){const b=__ink_bytes(s);return i<b.length?{Some:b[i]}:{None:null};}
function __ink_slice(s,a,z){const b=__ink_bytes(s);return a<=z&&__ink_boundary(b,a)&&__ink_boundary(b,z)?{Some:__ink_decoder.decode(b.subarray(a,z))}:{None:null};}
function __ink_concat(a,b){const s=a+b;if(__ink_byte_len(s)>4294967295)throw Error('String exceeds U32 byte length');return s;}
function __ink_find(s,needle,from){let unit=0,bytes=0;while(bytes<from&&unit<s.length){const c=s.charCodeAt(unit++);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff&&unit<s.length&&s.charCodeAt(unit)>=0xdc00&&s.charCodeAt(unit)<=0xdfff){bytes+=4;unit++;}else bytes+=3;}if(bytes!==from)return {None:null};const at=s.indexOf(needle,unit);return at<0?{None:null}:{Some:bytes+__ink_byte_len(s,unit,at)};}

function __ink_int_from_float(x){return Number.isFinite(x)?{Some:BigInt(Math.trunc(x))}:{None:null};}
// Affine buffers expose bounded disjoint ranges over one allocation. Source
// ownership prevents retaining a parent; growth detaches shared ranges.
// Elements cannot own temporary storage: they are immutable logical values.
// Copy the slot array when acquiring ownership, never the reachable records.
class __InkBuffer {
 constructor(data,start=0,end=data.length,shared=false){this.data=data;this.start=start;this.end=end;this.shared=shared;}
 get length(){return this.end-this.start;}
 set length(n){this.end=this.start+Math.min(this.length,n);if(!this.shared&&this.start===0)this.data.length=this.end;}
 item(i){return this.data[this.start+i];}
 range(start,count){const begin=this.start+Math.min(start,this.length);return new __InkBuffer(this.data,begin,begin+Math.min(count,this.end-begin),true);}
 set(i,v){if(i<this.length)this.data[this.start+i]=v;return this;}
 swap(a,b){if(a<this.length&&b<this.length){const x=this.item(a);this.set(a,this.item(b));this.set(b,x);}return this;}
 fill_range(start,count,value){start=Math.min(start,this.length);count=Math.min(count,this.length-start);this.data.fill(value,this.start+start,this.start+start+count);return this;}
 copy_within(source,destination,count){source=Math.min(source,this.length);destination=Math.min(destination,this.length);count=Math.min(count,this.length-source,this.length-destination);this.data.copyWithin(this.start+destination,this.start+source,this.start+source+count);return this;}
 detach(){if(this.shared||this.start!==0||this.end!==this.data.length){this.data=this.data.slice(this.start,this.end);this.start=0;this.end=this.data.length;this.shared=false;}}
 push(v){if(this.length>=4294967295)throw Error('buffer length exhausted');this.detach();this.data.push(v);this.end++;return this;}
 pop(){this.length=Math.max(0,this.length-1);return this;}
 truncate(n){this.length=Math.min(this.length,n);return this;}
 slice(start=0,end=this.length){return this.data.slice(this.start+start,this.start+Math.min(end,this.length));}
 freeze(){return this.start===0&&this.end===this.data.length?this.data:this.data.slice(this.start,this.end);}
 *[Symbol.iterator](){for(let i=this.start;i<this.end;i++)yield this.data[i];}
}
function __bufferSplit(x,at){const cut=x.start+Math.min(at,x.length);x.shared=true;return [new __InkBuffer(x.data,x.start,cut,true),new __InkBuffer(x.data,cut,x.end,true)];}
function __bufferAppend(a,b){
 if(a.length+b.length>4294967295)throw Error('buffer length exhausted');
 if(a.data===b.data&&a.end===b.start)return new __InkBuffer(a.data,a.start,b.end,a.start!==0||b.end!==a.data.length);
 a.detach();for(const item of b)a.push(item);return a;
}

function __repeat_until(limit,acc,stop,step){for(let i=0;i<limit;i++){if(stop(acc))break;acc=step(i,acc);}return acc;}
function __bufferFill(n,v){return new __InkBuffer(new Array(n).fill(v));}
function __mapGet(m,k,f){return m.has(k)?m.get(k):f();}
function __mapEntries(m,keys){return [...m.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>keys?k:v);}
function __tempSet(x,k,v,map){x.set(k,v);return x;}
function __bufferSwap(x,a,b){return x.swap(a,b);}
function __tempEdit(x,op,...args){if(op==='push'){x.push(args[0]);}else if(op==='pop')x.pop();else if(op==='truncate')x.truncate(args[0]);else if(op==='remove')x.delete(args[0]);return x;}
// Fixed word semantics, including arithmetic signed right shift. Shift and
// rotation counts wrap modulo width; no source-pattern optimisation lives here.
function __word(op,a,b,bits) {
  const width=BigInt(Math.abs(bits)), k=BigInt(b??0)%width;
  const x=BigInt(a), y=BigInt(b??0), unsigned=BigInt.asUintN(Number(width),x);
  let r;
  switch(op) {
    case 'word_widen_u32_to_u64':case 'word_narrow_u64_to_u32':r=x;break;
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
// Rotations evaluate each operand once. Counts wrap modulo the width.
function __rotl32(a,k){k&=31;return (a<<k)|(a>>>((32-k)&31));}
function __rotr32(a,k){k&=31;return (a>>>k)|(a<<((32-k)&31));}
function __rotl64(a,k){const n=BigInt(k&63);return BigInt.asUintN(64,(a<<n)|(a>>((64n-n)&63n)));}
function __rotr64(a,k){const n=BigInt(k&63);return BigInt.asUintN(64,(a>>n)|(a<<((64n-n)&63n)));}
function __fn0(){
const v0=1065353216;
const v1=0;
const v2=1065353216;
const v3=0;
const v4=[v0,v1,v2,v3];
const v5=__fn28(v4);
let v6;if(Object.hasOwn(v5,"Ok")){
const v7=v5["Ok"];
const v8=v7;
const v9=v8;
const v10=0;
const v11=0;
const v12=({None:null});
v6=({Ok:({["optimizer"]:v9,["version"]:v10,["ticket"]:v11,["pending"]:v12})});}else{
const v13=v5["Err"];
v6=({Err:v13});}
return v6;}
function __fn1(v14){
const v15=v14;
const v16=0;
let v17;if(v16<v15.length){v17=v15[v16];}else{
v17=0;}
const v18=v17;
const v19=v14;
const v20=1;
let v21;if(v20<v19.length){v21=v19[v20];}else{
v21=0;}
const v22=v21;
const v23=v14;
const v24=2;
let v25;if(v24<v23.length){v25=v23[v24];}else{
v25=0;}
const v26=v25;
const v27=v14;
const v28=3;
let v29;if(v28<v27.length){v29=v27[v28];}else{
v29=0;}
const v30=v29;
return ({["left_bias"]:v18,["left_slope"]:v22,["right_bias"]:v26,["right_slope"]:v30});}
function __fn2(v31){
const v32=v31;
const v33=v32["left_bias"];
const v34=v31;
const v35=v34["left_slope"];
const v36=v31;
const v37=v36["right_bias"];
const v38=v31;
const v39=v38["right_slope"];
return [v33,v35,v37,v39];}
function __fn3(v40,v41){
const v42=v41;
const v43=v42["context"];
const v44=v43["signal"];
const v45=1065353216;
const v46=v41;
const v47=v46["context"];
const v48=v47["urgency"];
const v49=__bits(__float(v45) + __float(v48));
const v50=__bits(__float(v44) * __float(v49));
const v51=v41;
const v52=v51["action"];
const v53=0;
let v54;if((v52===v53)){
const v55=v40;
const v56=v55["left_bias"];
const v57=v40;
const v58=v57["left_slope"];
const v59=v50;
const v60=__bits(__float(v58) * __float(v59));
v54=__bits(__float(v56) + __float(v60));}else{
const v61=v40;
const v62=v61["right_bias"];
const v63=v40;
const v64=v63["right_slope"];
const v65=v50;
const v66=__bits(__float(v64) * __float(v65));
v54=__bits(__float(v62) + __float(v66));}
const v67=v54;
const v68=v67;
const v69=v67;
const v70=__bits(__float(v68) * __float(v69));
const v71=1036831949;
return __bits(__float(v70) + __float(v71));}
function __fn4(v72){
const v73=v72;
const v74=Number.isFinite(__float(v73["signal"]));
let v75=v74;if(v75){
const v76=v72;
const v77=v76["signal"];
const v78=1065353216;
const v79=((v78 ^ 2147483648) >>> 0);
v75=((__float(v77)) >= (__float(v79)));}
const v80=v75;
let v81=v80;if(v81){
const v82=v72;
const v83=v82["signal"];
const v84=1065353216;
v81=((__float(v83)) <= (__float(v84)));}
const v85=v81;
let v86=v85;if(v86){
const v87=v72;
v86=Number.isFinite(__float(v87["urgency"]));}
const v88=v86;
let v89=v88;if(v89){
const v90=v72;
const v91=v90["urgency"];
const v92=0;
v89=((__float(v91)) >= (__float(v92)));}
const v93=v89;
let v94=v93;if(v94){
const v95=v72;
const v96=v95["urgency"];
const v97=1065353216;
v94=((__float(v96)) <= (__float(v97)));}
return v94;}
function __fn5(v98,v99,v100){
const v101=(v98).length;
const v102=4;
const v103=!(v101===v102);
let v104=v103;if(!v104){
const v105=v99;
const v106=__fn4(v105);
const v107=false;
v104=(v106===v107);}
let v108;if(v104){
v108=({Err:"policy context"});}else{
const v109=v98;
const v110=__fn1(v109);
const v111=v99;
const v112=0;
const v113=({["context"]:v111,["action"]:v112});
const v114=v99;
const v115=1;
const v116=({["context"]:v114,["action"]:v115});
const v117=v110;
const v118=v113;
const v119=__fn3(v117,v118);
const v120=v110;
const v121=v116;
const v122=__fn3(v120,v121);
const v123=[v119,v122];
const v124=v110;
const v125=v113;
const v126=__fn35(v124,v125);
const v127=__fn2(v126);
const v128=v110;
const v129=v116;
const v130=__fn35(v128,v129);
const v131=__fn2(v130);
const v132=[v127,v131];
const v133=true;
const v134=true;
const v135=[v133,v134];
const v136=v100;
v108=__fn20(v123,v132,v135,v136);}
return v108;}
function __fn6(v137){
const v138=v137;
const v139=v138["optimizer"];
const v140=__fn27(v139);
let v141=v140;if(v141){
const v142=v137;
const v143=v142["optimizer"];
const v144=(v143["weights"]).length;
const v145=4;
v141=(v144===v145);}
const v146=v141;
let v147=v146;if(v147){
const v148=v137;
const v149=v148["optimizer"];
const v150=v149["weights"];
let v151=true;
for(let v152=0;v152<v150.length;v152++){
const v153=v150[v152];
const v154=v151;
let v155=v154;if(v155){
const v156=v153;
const v157=1090519040;
const v158=((v157 ^ 2147483648) >>> 0);
v155=((__float(v156)) >= (__float(v158)));}
const v159=v155;
let v160=v159;if(v160){
const v161=v153;
const v162=1090519040;
v160=((__float(v161)) <= (__float(v162)));}
v151=v160;
}
v147=v151;}
return v147;}
function __fn7(v163,v164){
const v165=v164;
const v166=v163;
const v167=v166["signal"];
const v168=0;
let v169;if(((__float(v167)) >= (__float(v168)))){
v169=0;}else{
v169=1;}
const v170=v169;
let v171;if((v165===v170)){
v171=1065353216;}else{
const v172=1065353216;
v171=((v172 ^ 2147483648) >>> 0);}
return v171;}
function __fn8(v173,v174,v175,v176){
const v177=v173;
const v178=v174;
const v179=v175;
const v180=v176;
return __fn20(v177,v178,v179,v180);}
function __fn9(v181,v182,v183){
const v184=v181;
const v185=v182;
const v186=v183;
return __fn24(v184,v185,v186);}
function __fn10(v187,v188,v189,v190,v191){
const v192=v188;
const v193=v190;
const v194=v191;
const v195=__fn24(v192,v193,v194);
let v196;if(Object.hasOwn(v195,"Ok")){
const v197=v195["Ok"];
const v198=v197;
const v199=v187;
const v200=v198;
const v201=v189;
v196=__fn23(v199,v200,v201);}else{
const v202=v195["Err"];
v196=({Err:v202});}
return v196;}
function __fn11(v203){
const v204=v203;
const v205=0;
let v206;if((v204===v205)){
v206=2143289344;}else{
const v207=v203;
const v208=1;
let v209;if((v207===v208)){
v209=2139095040;}else{
v209=1;}
v206=v209;}
const v210=v206;
const v211=v210;
const v212=1065353216;
const v213=[v211,v212];
const v214=1065353216;
const v215=[v214];
const v216=1065353216;
const v217=[v216];
const v218=[v215,v217];
const v219=true;
const v220=true;
const v221=[v219,v220];
const v222=0;
return __fn20(v213,v218,v221,v222);}
function __fn12(v223){
const v224=v223;
const v225=v224.length;
const v226=new Array(v225);
for(let v227=0;v227<v225;v227++){
const v228=v224[v227];
const v229=v228;
const v230=v228;
const v231=__bits(__float(v229) * __float(v230));
const v232=1056964608;
v226[v227]=__bits(__float(v231) + __float(v232));
}
return v226;}
function __fn13(v233){
const v234=v233;
let v235=true;
for(let v236=0;v236<v234.length;v236++){
const v237=v234[v236];
const v238=v235;
let v239=v238;if(v239){
v239=Number.isFinite(__float(v237));}
v235=v239;
}
return v235;}
function __fn14(v240,v241){
const v242=0;
const v243=0;
const v244=v240;
const v245=v243;
const v246=v242;
let v247=({["i"]:v245,["maximum"]:v246});
for(let v248=0;v248<v244.length;v248++){
const v249=v244[v248];
const v250=v247;
const v251=v250["i"];
const v252=v247;
const v253=v252["maximum"];
const v254=v241;
const v255=v251;
let v256;if(v255<v254.length){v256=v254[v255];}else{
v256=false;}
const v257=v256;
let v258=v257;if(v258){
const v259=v249;
const v260=v253;
v258=((__float(v259)) > (__float(v260)));}
let v261;if(v258){
const v262=v249;
const v263=v251;
const v264=1;
const v265=(((v263) + (v264)) >>> 0);
const v266=v265;
const v267=v262;
v261=({["i"]:v266,["maximum"]:v267});}else{
const v268=v251;
const v269=1;
const v270=(((v268) + (v269)) >>> 0);
const v271=v270;
const v272=v253;
v261=({["i"]:v271,["maximum"]:v272});}
v247=v261;
}
const v273=v247;
const v274=v273;
const v275=v274["i"];
const v276=v273;
const v277=v276["maximum"];
return v277;}
function __fn15(v278,v279){
const v280=(v278).length;
const v281=0;
const v282=(v280===v281);
let v283=v282;if(!v283){
const v284=(v278).length;
const v285=256;
v283=((v284) > (v285));}
const v286=v283;
let v287=v286;if(!v287){
const v288=(v279).length;
const v289=(v278).length;
v287=!(v288===v289);}
const v290=v287;
let v291=v290;if(!v291){
const v292=v278;
const v293=__fn13(v292);
const v294=false;
v291=(v293===v294);}
const v295=v291;
let v296=v295;if(!v296){
const v297=v278;
let v298=true;
for(let v299=0;v299<v297.length;v299++){
const v300=v297[v299];
const v301=v298;
let v302=v301;if(v302){
const v303=v300;
const v304=0;
v302=((__float(v303)) >= (__float(v304)));}
v298=v302;
}
const v305=v298;
const v306=false;
v296=(v305===v306);}
let v307;if(v296){
v307=({Err:"policy shape or mass domain"});}else{
const v308=v278;
const v309=v279;
const v310=__fn14(v308,v309);
const v311=v310;
const v312=0;
let v313;if(((__float(v311)) === (__float(v312)))){
v313=({Err:"no positive allowed policy mass"});}else{
const v314=new __InkBuffer([]);
const v315=0;
const v316=v278;
const v317=v315;
const v318=v314;
let v319=({["i"]:v317,["out"]:v318});
for(let v320=0;v320<v316.length;v320++){
const v321=v316[v320];
const v322=v319;
const v323=v322["i"];
const v324=v319;
const v325=v324["out"];
const v326=v325;
const v327=v279;
const v328=v323;
let v329;if(v328<v327.length){v329=v327[v328];}else{
v329=false;}
let v330;if(v329){
v330=__bits((__float(v321))/(__float(v310)));}else{
v330=0;}
const v331=v330;
const v332=__tempEdit(v326,"push",v331);
const v333=v323;
const v334=1;
const v335=(((v333) + (v334)) >>> 0);
const v336=v335;
const v337=v332;
v319=({["i"]:v336,["out"]:v337});
}
const v338=v319;
const v339=v338;
const v340=v339["i"];
const v341=v338;
const v342=v341["out"];
const v343=v342;
v313=({Ok:v343.freeze()});}
v307=v313;}
return v307;}
function __fn16(v344,v345){
const v346=v344;
const v347=v345;
const v348=__fn15(v346,v347);
let v349;if(Object.hasOwn(v348,"Ok")){
const v350=v348["Ok"];
const v351=v350;
const v352=v351;
let v353=0;
for(let v354=0;v354<v352.length;v354++){
const v355=v352[v354];
const v356=v353;
const v357=v355;
v353=__bits(__float(v356) + __float(v357));
}
const v358=v353;
const v359=v351;
const v360=v359.length;
const v361=new Array(v360);
for(let v362=0;v362<v360;v362++){
const v363=v359[v362];
v361[v362]=__bits((__float(v363))/(__float(v358)));
}
v349=({Ok:v361});}else{
const v364=v348["Err"];
v349=({Err:v364});}
return v349;}
function __fn17(v365,v366,v367){
const v368=v366;
const v369=v367;
const v370=__bits(__float(v368) * __float(v369));
const v371=0;
const v372=0;
const v373=false;
const v374=0;
const v375=v365;
const v376=v371;
const v377=v373;
const v378=v374;
const v379=v372;
let v380=({["accumulated"]:v376,["found"]:v377,["i"]:v378,["selected"]:v379});
for(let v381=0;v381<v375.length;v381++){
const v382=v375[v381];
const v383=v380;
const v384=v383["accumulated"];
const v385=v380;
const v386=v385["found"];
const v387=v380;
const v388=v387["i"];
const v389=v380;
const v390=v389["selected"];
const v391=v382;
const v392=0;
const v393=((__float(v391)) > (__float(v392)));
let v394=v393;if(v394){
const v395=v386;
const v396=false;
v394=(v395===v396);}
let v397;if(v394){
const v398=v388;
const v399=v384;
const v400=v382;
const v401=__bits(__float(v399) + __float(v400));
const v402=v382;
const v403=0;
const v404=((__float(v402)) > (__float(v403)));
let v405=v404;if(v405){
const v406=v386;
const v407=false;
v405=(v406===v407);}
const v408=v405;
let v409=v408;if(v409){
const v410=v370;
const v411=v401;
v409=((__float(v410)) < (__float(v411)));}
let v412;if(v409){
const v413=v388;
const v414=true;
const v415=v388;
const v416=1;
const v417=(((v415) + (v416)) >>> 0);
const v418=v401;
const v419=v414;
const v420=v417;
const v421=v413;
v412=({["accumulated"]:v418,["found"]:v419,["i"]:v420,["selected"]:v421});}else{
const v422=v388;
const v423=1;
const v424=(((v422) + (v423)) >>> 0);
const v425=v401;
const v426=v386;
const v427=v424;
const v428=v398;
v412=({["accumulated"]:v425,["found"]:v426,["i"]:v427,["selected"]:v428});}
v397=v412;}else{
const v429=v384;
const v430=v382;
const v431=__bits(__float(v429) + __float(v430));
const v432=v382;
const v433=0;
const v434=((__float(v432)) > (__float(v433)));
let v435=v434;if(v435){
const v436=v386;
const v437=false;
v435=(v436===v437);}
const v438=v435;
let v439=v438;if(v439){
const v440=v370;
const v441=v431;
v439=((__float(v440)) < (__float(v441)));}
let v442;if(v439){
const v443=v388;
const v444=true;
const v445=v388;
const v446=1;
const v447=(((v445) + (v446)) >>> 0);
const v448=v431;
const v449=v444;
const v450=v447;
const v451=v443;
v442=({["accumulated"]:v448,["found"]:v449,["i"]:v450,["selected"]:v451});}else{
const v452=v388;
const v453=1;
const v454=(((v452) + (v453)) >>> 0);
const v455=v431;
const v456=v386;
const v457=v454;
const v458=v390;
v442=({["accumulated"]:v455,["found"]:v456,["i"]:v457,["selected"]:v458});}
v397=v442;}
v380=v397;
}
const v459=v380;
const v460=v459;
const v461=v460["accumulated"];
const v462=v459;
const v463=v462["found"];
const v464=v459;
const v465=v464["i"];
const v466=v459;
const v467=v466["selected"];
return v467;}
function __fn18(v468,v469,v470,v471){
const v472=v468;
const v473=0;
let v474;if(v473<v472.length){v474=v472[v473];}else{
v474=[];}
const v475=v474;
const v476=v475.length;
const v477=new Array(v476);
for(let v478=0;v478<v476;v478++){
const v479=v475[v478];
v477[v478]=0;
}
const v480=v477;
const v481=0;
const v482=v468;
const v483=v480;
const v484=v481;
let v485=({["correction"]:v483,["i"]:v484});
for(let v486=0;v486<v482.length;v486++){
const v487=v482[v486];
const v488=v485;
const v489=v488["correction"];
const v490=v485;
const v491=v490["i"];
const v492=v469;
const v493=v491;
let v494;if(v493<v492.length){v494=v492[v493];}else{
v494=false;}
let v495;if(v494){
const v496=v489;
const v497=v487;
const v498=Math.min(v496.length,v497.length);
const v499=new Array(v498);
for(let v500=0;v500<v498;v500++){
const v501=v496[v500];
const v502=v497[v500];
const v503=v501;
const v504=__bits((__float(__bits((__float(v502))/(__float(v470)))))/(__float(v471)));
v499[v500]=__bits(__float(v503) + __float(v504));
}
const v505=v499;
const v506=v491;
const v507=1;
const v508=(((v506) + (v507)) >>> 0);
const v509=v505;
const v510=v508;
v495=({["correction"]:v509,["i"]:v510});}else{
const v511=v491;
const v512=1;
const v513=(((v511) + (v512)) >>> 0);
const v514=v489;
const v515=v513;
v495=({["correction"]:v514,["i"]:v515});}
v485=v495;
}
const v516=v485;
const v517=v516;
const v518=v517["correction"];
const v519=v516;
const v520=v519["i"];
return v518;}
function __fn19(v521,v522,v523,v524,v525){
const v526=v521;
const v527=v525;
let v528;if(v527<v526.length){v528=v526[v527];}else{
v528=0;}
const v529=v528;
const v530=v521;
const v531=v523;
const v532=__fn14(v530,v531);
const v533=v522;
const v534=v523;
const v535=v532;
const v536=v524;
const v537=__fn18(v533,v534,v535,v536);
const v538=v522;
const v539=v525;
let v540;if(v539<v538.length){v540=v538[v539];}else{
v540=[];}
const v541=v540;
const v542=v537;
const v543=Math.min(v541.length,v542.length);
const v544=new Array(v543);
for(let v545=0;v545<v543;v545++){
const v546=v541[v545];
const v547=v542[v545];
const v548=__bits((__float(v546))/(__float(v529)));
const v549=v547;
v544[v545]=__bits(__float(v548) - __float(v549));
}
return v544;}
function __fn20(v550,v551,v552,v553){
const v554=v550;
const v555=v552;
const v556=__fn15(v554,v555);
let v557;if(Object.hasOwn(v556,"Ok")){
const v558=v556["Ok"];
const v559=v558;
const v560=v551;
const v561=0;
let v562;if(v561<v560.length){v562=v560[v561];}else{
v562=[];}
const v563=(v562).length;
const v564=Number.isFinite(__float(v553));
const v565=false;
const v566=(v564===v565);
let v567=v566;if(!v567){
const v568=v553;
const v569=0;
v567=((__float(v568)) < (__float(v569)));}
const v570=v567;
let v571=v570;if(!v571){
const v572=v553;
const v573=1065353216;
v571=((__float(v572)) >= (__float(v573)));}
const v574=v571;
let v575=v574;if(!v575){
const v576=(v551).length;
const v577=(v550).length;
v575=!(v576===v577);}
const v578=v575;
let v579=v578;if(!v579){
const v580=v563;
const v581=0;
v579=(v580===v581);}
const v582=v579;
let v583=v582;if(!v583){
const v584=v563;
const v585=4096;
v583=((v584) > (v585));}
const v586=v583;
let v587=v586;if(!v587){
const v588=(v550).length;
const v589=65536;
const v590=v563;
let v591;if(v590===0 ){
v591=0;}else{
v591=(Math.trunc(v589/v590)+0);}
const v592=v591;
v587=((v588) > (v592));}
let v593;if(v587){
v593=({Err:"policy sampling or derivative shape"});}else{
const v594=v551;
let v595=true;
for(let v596=0;v596<v594.length;v596++){
const v597=v594[v596];
const v598=v595;
let v599=v598;if(v599){
const v600=(v597).length;
const v601=v563;
v599=(v600===v601);}
const v602=v599;
let v603=v602;if(v603){
const v604=v597;
v603=__fn13(v604);}
v595=v603;
}
const v605=v595;
const v606=false;
let v607;if((v605===v606)){
v607=({Err:"policy derivative domain"});}else{
const v608=v559;
let v609=0;
for(let v610=0;v610<v608.length;v610++){
const v611=v608[v610];
const v612=v609;
const v613=v611;
v609=__bits(__float(v612) + __float(v613));
}
const v614=v609;
const v615=v559;
const v616=v553;
const v617=v614;
const v618=__fn17(v615,v616,v617);
const v619=v550;
const v620=v551;
const v621=v552;
const v622=v614;
const v623=v618;
const v624=__fn19(v619,v620,v621,v622,v623);
const v625=v559;
const v626=v618;
let v627;if(v626<v625.length){v627=v625[v626];}else{
v627=0;}
const v628=__bits((__float(v627))/(__float(v614)));
const v629=v624;
const v630=__fn13(v629);
const v631=false;
const v632=(v630===v631);
let v633=v632;if(!v633){
const v634=v628;
const v635=0;
v633=((__float(v634)) <= (__float(v635)));}
let v636;if(v633){
v636=({Err:"nonfinite policy score or probability underflow"});}else{
const v637=v618;
const v638=v628;
const v639=v624;
v636=({Ok:({["action"]:v637,["probability"]:v638,["score"]:v639})});}
v607=v636;}
v593=v607;}
v557=v593;}else{
const v640=v556["Err"];
v557=({Err:v640});}
return v557;}
function __fn21(v641,v642,v643){
const v644=Number.isFinite(__float(v642));
const v645=false;
const v646=(v644===v645);
let v647=v646;if(!v647){
const v648=Number.isFinite(__float(v643));
const v649=false;
v647=(v648===v649);}
const v650=v647;
let v651=v650;if(!v651){
const v652=v641;
const v653=Number.isFinite(__float(v652["probability"]));
const v654=false;
v651=(v653===v654);}
const v655=v651;
let v656=v655;if(!v656){
const v657=v641;
const v658=v657["probability"];
const v659=0;
v656=((__float(v658)) <= (__float(v659)));}
const v660=v656;
let v661=v660;if(!v661){
const v662=v641;
const v663=v662["probability"];
const v664=1065353216;
v661=((__float(v663)) > (__float(v664)));}
const v665=v661;
let v666=v665;if(!v666){
const v667=v641;
const v668=(v667["score"]).length;
const v669=0;
v666=(v668===v669);}
const v670=v666;
let v671=v670;if(!v671){
const v672=v641;
const v673=(v672["score"]).length;
const v674=4096;
v671=((v673) > (v674));}
const v675=v671;
let v676=v675;if(!v676){
const v677=v641;
const v678=v677["score"];
const v679=__fn13(v678);
const v680=false;
v676=(v679===v680);}
let v681;if(v676){
v681=({Err:"policy feedback domain"});}else{
const v682=v642;
const v683=v643;
const v684=__bits(__float(v682) - __float(v683));
const v685=v641;
const v686=v685["score"];
const v687=v686.length;
const v688=new Array(v687);
for(let v689=0;v689<v687;v689++){
const v690=v686[v689];
const v691=v684;
const v692=((v691 ^ 2147483648) >>> 0);
const v693=v690;
v688[v689]=__bits(__float(v692) * __float(v693));
}
const v694=v688;
const v695=Number.isFinite(__float(v684));
const v696=false;
const v697=(v695===v696);
let v698=v697;if(!v698){
const v699=v694;
const v700=__fn13(v699);
const v701=false;
v698=(v700===v701);}
let v702;if(v698){
v702=({Err:"nonfinite policy gradient"});}else{
v702=({Ok:v694});}
v681=v702;}
return v681;}
function __fn22(v703,v704,v705,v706){
const v707=v703;
let v708;if(Object.hasOwn(v707,"Ok")){
const v709=v707["Ok"];
const v710=v709;
const v711=v704;
const v712=v705;
const v713=v706;
const v714=__fn21(v711,v712,v713);
let v715;if(Object.hasOwn(v714,"Ok")){
const v716=v714["Ok"];
const v717=v716;
const v718=(v710).length;
const v719=(v717).length;
let v720;if(!(v718===v719)){
v720=({Err:"trajectory parameter shape"});}else{
const v721=v710;
const v722=v717;
const v723=Math.min(v721.length,v722.length);
const v724=new Array(v723);
for(let v725=0;v725<v723;v725++){
const v726=v721[v725];
const v727=v722[v725];
const v728=v726;
const v729=v727;
v724[v725]=__bits(__float(v728) + __float(v729));
}
const v730=v724;
const v731=v730;
const v732=__fn13(v731);
const v733=false;
let v734;if((v732===v733)){
v734=({Err:"nonfinite trajectory gradient"});}else{
v734=({Ok:v730});}
v720=v734;}
v715=v720;}else{
const v735=v714["Err"];
v715=({Err:v735});}
v708=v715;}else{
const v736=v707["Err"];
v708=({Err:v736});}
return v708;}
function __fn23(v737,v738,v739){
const v740=v737;
const v741=0;
let v742;if(v741<v740.length){v742=v740[v741];}else{
const v743=0;
const v744=0;
const v745=[];
v742=({["action"]:v743,["probability"]:v744,["score"]:v745});}
const v746=v742;
const v747=v746;
const v748=(v747["score"]).length;
const v749=(v737).length;
const v750=0;
const v751=(v749===v750);
let v752=v751;if(!v752){
const v753=(v737).length;
const v754=4096;
v752=((v753) > (v754));}
const v755=v752;
let v756=v755;if(!v756){
const v757=(v738).length;
const v758=(v737).length;
v756=!(v757===v758);}
const v759=v756;
let v760=v759;if(!v760){
const v761=(v739).length;
const v762=(v737).length;
v760=!(v761===v762);}
const v763=v760;
let v764=v763;if(!v764){
const v765=v748;
const v766=0;
v764=(v765===v766);}
const v767=v764;
let v768=v767;if(!v768){
const v769=v748;
const v770=4096;
v768=((v769) > (v770));}
const v771=v768;
let v772=v771;if(!v772){
const v773=(v737).length;
const v774=65536;
const v775=v748;
let v776;if(v775===0 ){
v776=0;}else{
v776=(Math.trunc(v774/v775)+0);}
const v777=v776;
v772=((v773) > (v777));}
let v778;if(v772){
v778=({Err:"trajectory shape"});}else{
const v779=v746;
const v780=v779["score"];
const v781=v780.length;
const v782=new Array(v781);
for(let v783=0;v783<v781;v783++){
const v784=v780[v783];
v782[v783]=0;
}
const v785=({Ok:v782});
const v786=0;
const v787=v737;
const v788=v785;
const v789=v786;
let v790=({["accumulator"]:v788,["i"]:v789});
for(let v791=0;v791<v787.length;v791++){
const v792=v787[v791];
const v793=v790;
const v794=v793["accumulator"];
const v795=v790;
const v796=v795["i"];
const v797=v794;
const v798=v792;
const v799=v738;
const v800=v796;
let v801;if(v800<v799.length){v801=v799[v800];}else{
v801=0;}
const v802=v801;
const v803=v739;
const v804=v796;
let v805;if(v804<v803.length){v805=v803[v804];}else{
v805=0;}
const v806=v805;
const v807=__fn22(v797,v798,v802,v806);
const v808=v796;
const v809=1;
const v810=(((v808) + (v809)) >>> 0);
const v811=v807;
const v812=v810;
v790=({["accumulator"]:v811,["i"]:v812});
}
const v813=v790;
const v814=v813;
const v815=v814["accumulator"];
const v816=v813;
const v817=v816["i"];
const v818=v815;
let v819;if(Object.hasOwn(v818,"Ok")){
const v820=v818["Ok"];
const v821=v820;
const v822=v821;
const v823=v822.length;
const v824=new Array(v823);
for(let v825=0;v825<v823;v825++){
const v826=v822[v825];
v824[v825]=__bits((__float(v826))/(__float(__bits((v737).length))));
}
v819=({Ok:v824});}else{
const v827=v818["Err"];
v819=({Err:v827});}
v778=v819;}
return v778;}
function __fn24(v828,v829,v830){
const v831=(v828).length;
const v832=4096;
const v833=((v831) > (v832));
let v834=v833;if(!v834){
const v835=v828;
const v836=__fn13(v835);
const v837=false;
v834=(v836===v837);}
const v838=v834;
let v839=v838;if(!v839){
const v840=Number.isFinite(__float(v829));
const v841=false;
v839=(v840===v841);}
const v842=v839;
let v843=v842;if(!v843){
const v844=v829;
const v845=0;
v843=((__float(v844)) < (__float(v845)));}
const v846=v843;
let v847=v846;if(!v847){
const v848=v829;
const v849=1065353216;
v847=((__float(v848)) > (__float(v849)));}
const v850=v847;
let v851=v850;if(!v851){
const v852=Number.isFinite(__float(v830));
const v853=false;
v851=(v852===v853);}
let v854;if(v851){
v854=({Err:"return domain"});}else{
const v855=new __InkBuffer([]);
const v856=v830;
const v857=0;
const v858=v828;
const v859=v857;
const v860=v856;
const v861=v855;
let v862=({["i"]:v859,["next"]:v860,["reversed"]:v861});
for(let v863=0;v863<v858.length;v863++){
const v864=v858[v863];
const v865=v862;
const v866=v865["i"];
const v867=v862;
const v868=v867["next"];
const v869=v862;
const v870=v869["reversed"];
const v871=v828;
const v872=(v828).length;
const v873=1;
const v874=(((v872) - (v873)) >>> 0);
const v875=v866;
const v876=(((v874) - (v875)) >>> 0);
let v877;if(v876<v871.length){v877=v871[v876];}else{
v877=0;}
const v878=v877;
const v879=v829;
const v880=v868;
const v881=__bits(__float(v879) * __float(v880));
const v882=__bits(__float(v878) + __float(v881));
const v883=v870;
const v884=v882;
const v885=__tempEdit(v883,"push",v884);
const v886=v866;
const v887=1;
const v888=(((v886) + (v887)) >>> 0);
const v889=v888;
const v890=v882;
const v891=v885;
v862=({["i"]:v889,["next"]:v890,["reversed"]:v891});
}
const v892=v862;
const v893=v892;
const v894=v893["i"];
const v895=v892;
const v896=v895["next"];
const v897=v892;
const v898=v897["reversed"];
const v899=v898;
const v900=v899.freeze();
const v901=v900;
const v902=__fn13(v901);
const v903=false;
let v904;if((v902===v903)){
v904=({Err:"nonfinite return"});}else{
const v905=new __InkBuffer([]);
const v906=0;
const v907=v900;
const v908=v906;
const v909=v905;
let v910=({["i"]:v908,["out"]:v909});
for(let v911=0;v911<v907.length;v911++){
const v912=v907[v911];
const v913=v910;
const v914=v913["i"];
const v915=v910;
const v916=v915["out"];
const v917=v916;
const v918=v900;
const v919=(v900).length;
const v920=1;
const v921=(((v919) - (v920)) >>> 0);
const v922=v914;
const v923=(((v921) - (v922)) >>> 0);
let v924;if(v923<v918.length){v924=v918[v923];}else{
v924=0;}
const v925=v924;
const v926=__tempEdit(v917,"push",v925);
const v927=v914;
const v928=1;
const v929=(((v927) + (v928)) >>> 0);
const v930=v929;
const v931=v926;
v910=({["i"]:v930,["out"]:v931});
}
const v932=v910;
const v933=v932;
const v934=v933["i"];
const v935=v932;
const v936=v935["out"];
const v937=v936;
v904=({Ok:v937.freeze()});}
v854=v904;}
return v854;}
function __fn25(v938){
const v939=v938;
const v940=1063675494;
const v941=1065336439;
const v942=841731191;
const v943=0;
const v944=1065353216;
return ({["rate"]:v939,["first_decay"]:v940,["second_decay"]:v941,["epsilon"]:v942,["weight_decay"]:v943,["norm_limit"]:v944});}
function __fn26(v945){
const v946=v945;
let v947=true;
for(let v948=0;v948<v946.length;v948++){
const v949=v946[v948];
const v950=v947;
let v951=v950;if(v951){
v951=Number.isFinite(__float(v949));}
v947=v951;
}
return v947;}
function __fn27(v952){
const v953=v952;
const v954=(v953["weights"]).length;
const v955=v952;
const v956=(v955["first"]).length;
const v957=(v954===v956);
let v958=v957;if(v958){
const v959=v952;
const v960=(v959["weights"]).length;
const v961=v952;
const v962=(v961["second"]).length;
v958=(v960===v962);}
const v963=v958;
let v964=v963;if(v964){
const v965=v952;
const v966=v965["weights"];
v964=__fn26(v966);}
const v967=v964;
let v968=v967;if(v968){
const v969=v952;
const v970=v969["first"];
v968=__fn26(v970);}
const v971=v968;
let v972=v971;if(v972){
const v973=v952;
const v974=v973["second"];
v972=__fn26(v974);}
const v975=v972;
let v976=v975;if(v976){
const v977=v952;
const v978=v977["second"];
let v979=true;
for(let v980=0;v980<v978.length;v980++){
const v981=v978[v980];
const v982=v979;
let v983=v982;if(v983){
const v984=v981;
const v985=0;
v983=((__float(v984)) >= (__float(v985)));}
v979=v983;
}
v976=v979;}
const v986=v976;
let v987=v986;if(v987){
const v988=v952;
const v989=v988["first_power"];
const v990=0;
v987=((__float(v989)) >= (__float(v990)));}
const v991=v987;
let v992=v991;if(v992){
const v993=v952;
const v994=v993["first_power"];
const v995=1065353216;
v992=((__float(v994)) <= (__float(v995)));}
const v996=v992;
let v997=v996;if(v997){
const v998=v952;
const v999=v998["second_power"];
const v1000=0;
v997=((__float(v999)) >= (__float(v1000)));}
const v1001=v997;
let v1002=v1001;if(v1002){
const v1003=v952;
const v1004=v1003["second_power"];
const v1005=1065353216;
v1002=((__float(v1004)) <= (__float(v1005)));}
return v1002;}
function __fn28(v1006){
const v1007=v1006;
const v1008=__fn26(v1007);
const v1009=false;
let v1010;if((v1008===v1009)){
v1010=({Err:"nonfinite weights"});}else{
const v1011=v1006;
const v1012=v1011.length;
const v1013=new Array(v1012);
for(let v1014=0;v1014<v1012;v1014++){
const v1015=v1011[v1014];
v1013[v1014]=0;
}
const v1016=v1013;
const v1017=v1006;
const v1018=v1016;
const v1019=v1016;
const v1020=0;
const v1021=1065353216;
const v1022=1065353216;
v1010=({Ok:({["weights"]:v1017,["first"]:v1018,["second"]:v1019,["steps"]:v1020,["first_power"]:v1021,["second_power"]:v1022})});}
return v1010;}
function __fn29(v1023){
const v1024=v1023;
const v1025=Number.isFinite(__float(v1024["rate"]));
let v1026=v1025;if(v1026){
const v1027=v1023;
const v1028=v1027["rate"];
const v1029=0;
v1026=((__float(v1028)) > (__float(v1029)));}
const v1030=v1026;
let v1031=v1030;if(v1031){
const v1032=v1023;
const v1033=v1032["first_decay"];
const v1034=0;
v1031=((__float(v1033)) >= (__float(v1034)));}
const v1035=v1031;
let v1036=v1035;if(v1036){
const v1037=v1023;
const v1038=v1037["first_decay"];
const v1039=1065353216;
v1036=((__float(v1038)) < (__float(v1039)));}
const v1040=v1036;
let v1041=v1040;if(v1041){
const v1042=v1023;
const v1043=v1042["second_decay"];
const v1044=0;
v1041=((__float(v1043)) >= (__float(v1044)));}
const v1045=v1041;
let v1046=v1045;if(v1046){
const v1047=v1023;
const v1048=v1047["second_decay"];
const v1049=1065353216;
v1046=((__float(v1048)) < (__float(v1049)));}
const v1050=v1046;
let v1051=v1050;if(v1051){
const v1052=v1023;
v1051=Number.isFinite(__float(v1052["epsilon"]));}
const v1053=v1051;
let v1054=v1053;if(v1054){
const v1055=v1023;
const v1056=v1055["epsilon"];
const v1057=0;
v1054=((__float(v1056)) > (__float(v1057)));}
const v1058=v1054;
let v1059=v1058;if(v1059){
const v1060=v1023;
v1059=Number.isFinite(__float(v1060["weight_decay"]));}
const v1061=v1059;
let v1062=v1061;if(v1062){
const v1063=v1023;
const v1064=v1063["weight_decay"];
const v1065=0;
v1062=((__float(v1064)) >= (__float(v1065)));}
const v1066=v1062;
let v1067=v1066;if(v1067){
const v1068=v1023;
v1067=Number.isFinite(__float(v1068["norm_limit"]));}
const v1069=v1067;
let v1070=v1069;if(v1070){
const v1071=v1023;
const v1072=v1071["norm_limit"];
const v1073=0;
v1070=((__float(v1072)) >= (__float(v1073)));}
return v1070;}
function __fn30(v1074){
const v1075=v1074;
const v1076=0;
let v1077;if(((__float(v1075)) < (__float(v1076)))){
const v1078=v1074;
v1077=((v1078 ^ 2147483648) >>> 0);}else{
v1077=v1074;}
return v1077;}
function __fn31(v1079,v1080){
const v1081=v1080;
const v1082=0;
let v1083;if(((__float(v1081)) === (__float(v1082)))){
v1083=1065353216;}else{
const v1084=v1079;
let v1085=0;
for(let v1086=0;v1086<v1084.length;v1086++){
const v1087=v1084[v1086];
const v1088=v1087;
const v1089=__fn30(v1088);
const v1090=v1085;
let v1091;if(((__float(v1089)) > (__float(v1090)))){
const v1092=v1087;
v1091=__fn30(v1092);}else{
v1091=v1085;}
v1085=v1091;
}
const v1093=v1085;
const v1094=v1093;
const v1095=0;
let v1096;if(((__float(v1094)) === (__float(v1095)))){
v1096=1065353216;}else{
const v1097=v1079;
let v1098=0;
for(let v1099=0;v1099<v1097.length;v1099++){
const v1100=v1097[v1099];
const v1101=v1098;
const v1102=__bits((__float(v1100))/(__float(v1093)));
const v1103=__bits((__float(v1100))/(__float(v1093)));
const v1104=__bits(__float(v1102) * __float(v1103));
v1098=__bits(__float(v1101) + __float(v1104));
}
const v1105=v1098;
const v1106=__bits((__float(__bits((__float(v1080))/(__float(v1093)))))/(__float(__bits(Math.sqrt(__float(v1105))))));
const v1107=v1106;
const v1108=1065353216;
let v1109;if(((__float(v1107)) < (__float(v1108)))){
v1109=v1106;}else{
v1109=1065353216;}
v1096=v1109;}
v1083=v1096;}
return v1083;}
function __fn32(v1110,v1111,v1112,v1113,v1114,v1115){
const v1116=v1110;
const v1117=v1115;
const v1118=v1117["rate"];
const v1119=1065353216;
const v1120=v1113;
const v1121=__bits((__float(v1111))/(__float(__bits(__float(v1119) - __float(v1120)))));
const v1122=1065353216;
const v1123=v1114;
const v1124=__bits(Math.sqrt(__float(__bits((__float(v1112))/(__float(__bits(__float(v1122) - __float(v1123))))))));
const v1125=v1115;
const v1126=v1125["epsilon"];
const v1127=__bits((__float(__bits(__float(v1118) * __float(v1121))))/(__float(__bits(__float(v1124) + __float(v1126)))));
return __bits(__float(v1116) - __float(v1127));}
function __fn33(v1128,v1129,v1130){
const v1131=v1128;
const v1132=__fn27(v1131);
const v1133=false;
const v1134=(v1132===v1133);
let v1135=v1134;if(!v1135){
const v1136=v1130;
const v1137=__fn29(v1136);
const v1138=false;
v1135=(v1137===v1138);}
const v1139=v1135;
let v1140=v1139;if(!v1140){
const v1141=(v1129).length;
const v1142=v1128;
const v1143=(v1142["weights"]).length;
v1140=!(v1141===v1143);}
const v1144=v1140;
let v1145=v1144;if(!v1145){
const v1146=v1129;
const v1147=__fn26(v1146);
const v1148=false;
v1145=(v1147===v1148);}
const v1149=v1145;
let v1150=v1149;if(!v1150){
const v1151=v1128;
const v1152=v1151["steps"];
const v1153=4294967295;
v1150=(v1152===v1153);}
let v1154;if(v1150){
v1154=({Err:"optimizer domain"});}else{
const v1155=new __InkBuffer([]);
const v1156=0;
const v1157=v1129;
const v1158=v1155;
const v1159=v1156;
let v1160=({["adjusted"]:v1158,["i"]:v1159});
for(let v1161=0;v1161<v1157.length;v1161++){
const v1162=v1157[v1161];
const v1163=v1160;
const v1164=v1163["adjusted"];
const v1165=v1160;
const v1166=v1165["i"];
const v1167=v1164;
const v1168=v1162;
const v1169=v1130;
const v1170=v1169["weight_decay"];
const v1171=v1128;
const v1172=v1171["weights"];
const v1173=v1166;
let v1174;if(v1173<v1172.length){v1174=v1172[v1173];}else{
v1174=0;}
const v1175=v1174;
const v1176=__bits(__float(v1170) * __float(v1175));
const v1177=__bits(__float(v1168) + __float(v1176));
const v1178=__tempEdit(v1167,"push",v1177);
const v1179=v1166;
const v1180=1;
const v1181=(((v1179) + (v1180)) >>> 0);
const v1182=v1178;
const v1183=v1181;
v1160=({["adjusted"]:v1182,["i"]:v1183});
}
const v1184=v1160;
const v1185=v1184;
const v1186=v1185["adjusted"];
const v1187=v1184;
const v1188=v1187["i"];
const v1189=v1186;
const v1190=v1189.freeze();
const v1191=v1190;
const v1192=__fn26(v1191);
const v1193=false;
let v1194;if((v1192===v1193)){
v1194=({Err:"nonfinite gradient"});}else{
const v1195=v1190;
const v1196=v1130;
const v1197=v1196["norm_limit"];
const v1198=__fn31(v1195,v1197);
const v1199=v1128;
const v1200=v1199["first_power"];
const v1201=v1130;
const v1202=v1201["first_decay"];
const v1203=__bits(__float(v1200) * __float(v1202));
const v1204=v1128;
const v1205=v1204["second_power"];
const v1206=v1130;
const v1207=v1206["second_decay"];
const v1208=__bits(__float(v1205) * __float(v1207));
const v1209=new __InkBuffer([]);
const v1210=new __InkBuffer([]);
const v1211=new __InkBuffer([]);
const v1212=0;
const v1213=v1190;
const v1214=v1210;
const v1215=v1212;
const v1216=v1211;
const v1217=v1209;
let v1218=({["first"]:v1214,["i"]:v1215,["second"]:v1216,["weights"]:v1217});
for(let v1219=0;v1219<v1213.length;v1219++){
const v1220=v1213[v1219];
const v1221=v1218;
const v1222=v1221["first"];
const v1223=v1218;
const v1224=v1223["i"];
const v1225=v1218;
const v1226=v1225["second"];
const v1227=v1218;
const v1228=v1227["weights"];
const v1229=v1220;
const v1230=v1198;
const v1231=__bits(__float(v1229) * __float(v1230));
const v1232=v1130;
const v1233=v1232["first_decay"];
const v1234=v1128;
const v1235=v1234["first"];
const v1236=v1224;
let v1237;if(v1236<v1235.length){v1237=v1235[v1236];}else{
v1237=0;}
const v1238=v1237;
const v1239=__bits(__float(v1233) * __float(v1238));
const v1240=1065353216;
const v1241=v1130;
const v1242=v1241["first_decay"];
const v1243=__bits(__float(v1240) - __float(v1242));
const v1244=v1231;
const v1245=__bits(__float(v1243) * __float(v1244));
const v1246=__bits(__float(v1239) + __float(v1245));
const v1247=v1130;
const v1248=v1247["second_decay"];
const v1249=v1128;
const v1250=v1249["second"];
const v1251=v1224;
let v1252;if(v1251<v1250.length){v1252=v1250[v1251];}else{
v1252=0;}
const v1253=v1252;
const v1254=__bits(__float(v1248) * __float(v1253));
const v1255=1065353216;
const v1256=v1130;
const v1257=v1256["second_decay"];
const v1258=__bits(__float(v1255) - __float(v1257));
const v1259=v1231;
const v1260=__bits(__float(v1258) * __float(v1259));
const v1261=v1231;
const v1262=__bits(__float(v1260) * __float(v1261));
const v1263=__bits(__float(v1254) + __float(v1262));
const v1264=v1128;
const v1265=v1264["weights"];
const v1266=v1224;
let v1267;if(v1266<v1265.length){v1267=v1265[v1266];}else{
v1267=0;}
const v1268=v1267;
const v1269=v1246;
const v1270=v1263;
const v1271=v1203;
const v1272=v1208;
const v1273=v1130;
const v1274=__fn32(v1268,v1269,v1270,v1271,v1272,v1273);
const v1275=v1228;
const v1276=v1274;
const v1277=__tempEdit(v1275,"push",v1276);
const v1278=v1222;
const v1279=v1246;
const v1280=__tempEdit(v1278,"push",v1279);
const v1281=v1226;
const v1282=v1263;
const v1283=__tempEdit(v1281,"push",v1282);
const v1284=v1224;
const v1285=1;
const v1286=(((v1284) + (v1285)) >>> 0);
const v1287=v1280;
const v1288=v1286;
const v1289=v1283;
const v1290=v1277;
v1218=({["first"]:v1287,["i"]:v1288,["second"]:v1289,["weights"]:v1290});
}
const v1291=v1218;
const v1292=v1291;
const v1293=v1292["first"];
const v1294=v1291;
const v1295=v1294["i"];
const v1296=v1291;
const v1297=v1296["second"];
const v1298=v1291;
const v1299=v1298["weights"];
const v1300=v1299;
const v1301=v1300.freeze();
const v1302=v1293;
const v1303=v1302.freeze();
const v1304=v1297;
const v1305=v1304.freeze();
const v1306=v1128;
const v1307=v1306["steps"];
const v1308=1;
const v1309=(((v1307) + (v1308)) >>> 0);
const v1310=v1203;
const v1311=v1208;
const v1312=({["weights"]:v1301,["first"]:v1303,["second"]:v1305,["steps"]:v1309,["first_power"]:v1310,["second_power"]:v1311});
const v1313=v1312;
const v1314=__fn27(v1313);
const v1315=false;
let v1316;if((v1314===v1315)){
v1316=({Err:"nonfinite optimizer update"});}else{
v1316=({Ok:v1312});}
v1194=v1316;}
v1154=v1194;}
return v1154;}
function __fn34(v1317,v1318){
const v1319=v1318;
const v1320=v1319["context"];
const v1321=v1320["signal"];
const v1322=1065353216;
const v1323=0;
const v1324=0;
const v1325=0;
const v1326=0;
const v1328=v1318;
const v1329=v1328["context"];
const v1330=v1329["urgency"];
const v1331=v1322;
const v1332=v1330;
const v1333=v1332["value"];
const v1334=__bits(__float(v1331) + __float(v1333));
const v1335=v1334;
const v1336=v1323;
const v1337=v1330;
const v1338=v1337["tangent_0"];
const v1339=__bits(__float(v1336) + __float(v1338));
const v1340=v1324;
const v1341=v1330;
const v1342=v1341["tangent_1"];
const v1343=__bits(__float(v1340) + __float(v1342));
const v1344=v1325;
const v1345=v1330;
const v1346=v1345["tangent_2"];
const v1347=__bits(__float(v1344) + __float(v1346));
const v1348=v1326;
const v1349=v1330;
const v1350=v1349["tangent_3"];
const v1351=__bits(__float(v1348) + __float(v1350));
const v1353=v1321;
const v1354=v1353["value"];
const v1355=v1335;
const v1356=__bits(__float(v1354) * __float(v1355));
const v1357=v1356;
const v1358=v1321;
const v1359=v1358["tangent_0"];
const v1360=v1335;
const v1361=__bits(__float(v1359) * __float(v1360));
const v1362=v1321;
const v1363=v1362["value"];
const v1364=v1339;
const v1365=__bits(__float(v1363) * __float(v1364));
const v1366=__bits(__float(v1361) + __float(v1365));
const v1367=v1321;
const v1368=v1367["tangent_1"];
const v1369=v1335;
const v1370=__bits(__float(v1368) * __float(v1369));
const v1371=v1321;
const v1372=v1371["value"];
const v1373=v1343;
const v1374=__bits(__float(v1372) * __float(v1373));
const v1375=__bits(__float(v1370) + __float(v1374));
const v1376=v1321;
const v1377=v1376["tangent_2"];
const v1378=v1335;
const v1379=__bits(__float(v1377) * __float(v1378));
const v1380=v1321;
const v1381=v1380["value"];
const v1382=v1347;
const v1383=__bits(__float(v1381) * __float(v1382));
const v1384=__bits(__float(v1379) + __float(v1383));
const v1385=v1321;
const v1386=v1385["tangent_3"];
const v1387=v1335;
const v1388=__bits(__float(v1386) * __float(v1387));
const v1389=v1321;
const v1390=v1389["value"];
const v1391=v1351;
const v1392=__bits(__float(v1390) * __float(v1391));
const v1393=__bits(__float(v1388) + __float(v1392));
const v1395=v1318;
const v1396=v1395["action"];
const v1397=0;
let v1398;if((v1396===v1397)){
const v1399=v1317;
const v1400=v1399["left_bias"];
const v1401=v1317;
const v1402=v1401["left_slope"];
const v1403=v1402;
const v1404=v1403["value"];
const v1405=v1357;
const v1406=__bits(__float(v1404) * __float(v1405));
const v1407=v1406;
const v1408=v1402;
const v1409=v1408["tangent_0"];
const v1410=v1357;
const v1411=__bits(__float(v1409) * __float(v1410));
const v1412=v1402;
const v1413=v1412["value"];
const v1414=v1366;
const v1415=__bits(__float(v1413) * __float(v1414));
const v1416=__bits(__float(v1411) + __float(v1415));
const v1417=v1402;
const v1418=v1417["tangent_1"];
const v1419=v1357;
const v1420=__bits(__float(v1418) * __float(v1419));
const v1421=v1402;
const v1422=v1421["value"];
const v1423=v1375;
const v1424=__bits(__float(v1422) * __float(v1423));
const v1425=__bits(__float(v1420) + __float(v1424));
const v1426=v1402;
const v1427=v1426["tangent_2"];
const v1428=v1357;
const v1429=__bits(__float(v1427) * __float(v1428));
const v1430=v1402;
const v1431=v1430["value"];
const v1432=v1384;
const v1433=__bits(__float(v1431) * __float(v1432));
const v1434=__bits(__float(v1429) + __float(v1433));
const v1435=v1402;
const v1436=v1435["tangent_3"];
const v1437=v1357;
const v1438=__bits(__float(v1436) * __float(v1437));
const v1439=v1402;
const v1440=v1439["value"];
const v1441=v1393;
const v1442=__bits(__float(v1440) * __float(v1441));
const v1443=__bits(__float(v1438) + __float(v1442));
const v1445=v1400;
const v1446=v1445["value"];
const v1447=v1407;
const v1448=__bits(__float(v1446) + __float(v1447));
const v1449=v1448;
const v1450=v1400;
const v1451=v1450["tangent_0"];
const v1452=v1416;
const v1453=__bits(__float(v1451) + __float(v1452));
const v1454=v1400;
const v1455=v1454["tangent_1"];
const v1456=v1425;
const v1457=__bits(__float(v1455) + __float(v1456));
const v1458=v1400;
const v1459=v1458["tangent_2"];
const v1460=v1434;
const v1461=__bits(__float(v1459) + __float(v1460));
const v1462=v1400;
const v1463=v1462["tangent_3"];
const v1464=v1443;
const v1465=__bits(__float(v1463) + __float(v1464));
v1398=({["value"]:v1449,["tangent_0"]:v1453,["tangent_1"]:v1457,["tangent_2"]:v1461,["tangent_3"]:v1465});}else{
const v1466=v1317;
const v1467=v1466["right_bias"];
const v1468=v1317;
const v1469=v1468["right_slope"];
const v1470=v1469;
const v1471=v1470["value"];
const v1472=v1357;
const v1473=__bits(__float(v1471) * __float(v1472));
const v1474=v1473;
const v1475=v1469;
const v1476=v1475["tangent_0"];
const v1477=v1357;
const v1478=__bits(__float(v1476) * __float(v1477));
const v1479=v1469;
const v1480=v1479["value"];
const v1481=v1366;
const v1482=__bits(__float(v1480) * __float(v1481));
const v1483=__bits(__float(v1478) + __float(v1482));
const v1484=v1469;
const v1485=v1484["tangent_1"];
const v1486=v1357;
const v1487=__bits(__float(v1485) * __float(v1486));
const v1488=v1469;
const v1489=v1488["value"];
const v1490=v1375;
const v1491=__bits(__float(v1489) * __float(v1490));
const v1492=__bits(__float(v1487) + __float(v1491));
const v1493=v1469;
const v1494=v1493["tangent_2"];
const v1495=v1357;
const v1496=__bits(__float(v1494) * __float(v1495));
const v1497=v1469;
const v1498=v1497["value"];
const v1499=v1384;
const v1500=__bits(__float(v1498) * __float(v1499));
const v1501=__bits(__float(v1496) + __float(v1500));
const v1502=v1469;
const v1503=v1502["tangent_3"];
const v1504=v1357;
const v1505=__bits(__float(v1503) * __float(v1504));
const v1506=v1469;
const v1507=v1506["value"];
const v1508=v1393;
const v1509=__bits(__float(v1507) * __float(v1508));
const v1510=__bits(__float(v1505) + __float(v1509));
const v1512=v1467;
const v1513=v1512["value"];
const v1514=v1474;
const v1515=__bits(__float(v1513) + __float(v1514));
const v1516=v1515;
const v1517=v1467;
const v1518=v1517["tangent_0"];
const v1519=v1483;
const v1520=__bits(__float(v1518) + __float(v1519));
const v1521=v1467;
const v1522=v1521["tangent_1"];
const v1523=v1492;
const v1524=__bits(__float(v1522) + __float(v1523));
const v1525=v1467;
const v1526=v1525["tangent_2"];
const v1527=v1501;
const v1528=__bits(__float(v1526) + __float(v1527));
const v1529=v1467;
const v1530=v1529["tangent_3"];
const v1531=v1510;
const v1532=__bits(__float(v1530) + __float(v1531));
v1398=({["value"]:v1516,["tangent_0"]:v1520,["tangent_1"]:v1524,["tangent_2"]:v1528,["tangent_3"]:v1532});}
const v1533=v1398;
const v1534=v1533;
const v1535=v1533;
const v1536=v1534;
const v1537=v1536["value"];
const v1538=v1535;
const v1539=v1538["value"];
const v1540=__bits(__float(v1537) * __float(v1539));
const v1541=v1540;
const v1542=v1534;
const v1543=v1542["tangent_0"];
const v1544=v1535;
const v1545=v1544["value"];
const v1546=__bits(__float(v1543) * __float(v1545));
const v1547=v1534;
const v1548=v1547["value"];
const v1549=v1535;
const v1550=v1549["tangent_0"];
const v1551=__bits(__float(v1548) * __float(v1550));
const v1552=__bits(__float(v1546) + __float(v1551));
const v1553=v1534;
const v1554=v1553["tangent_1"];
const v1555=v1535;
const v1556=v1555["value"];
const v1557=__bits(__float(v1554) * __float(v1556));
const v1558=v1534;
const v1559=v1558["value"];
const v1560=v1535;
const v1561=v1560["tangent_1"];
const v1562=__bits(__float(v1559) * __float(v1561));
const v1563=__bits(__float(v1557) + __float(v1562));
const v1564=v1534;
const v1565=v1564["tangent_2"];
const v1566=v1535;
const v1567=v1566["value"];
const v1568=__bits(__float(v1565) * __float(v1567));
const v1569=v1534;
const v1570=v1569["value"];
const v1571=v1535;
const v1572=v1571["tangent_2"];
const v1573=__bits(__float(v1570) * __float(v1572));
const v1574=__bits(__float(v1568) + __float(v1573));
const v1575=v1534;
const v1576=v1575["tangent_3"];
const v1577=v1535;
const v1578=v1577["value"];
const v1579=__bits(__float(v1576) * __float(v1578));
const v1580=v1534;
const v1581=v1580["value"];
const v1582=v1535;
const v1583=v1582["tangent_3"];
const v1584=__bits(__float(v1581) * __float(v1583));
const v1585=__bits(__float(v1579) + __float(v1584));
const v1587=1036831949;
const v1588=0;
const v1589=0;
const v1590=0;
const v1591=0;
const v1593=v1541;
const v1594=v1587;
const v1595=__bits(__float(v1593) + __float(v1594));
const v1596=v1595;
const v1597=v1552;
const v1598=v1588;
const v1599=__bits(__float(v1597) + __float(v1598));
const v1600=v1563;
const v1601=v1589;
const v1602=__bits(__float(v1600) + __float(v1601));
const v1603=v1574;
const v1604=v1590;
const v1605=__bits(__float(v1603) + __float(v1604));
const v1606=v1585;
const v1607=v1591;
const v1608=__bits(__float(v1606) + __float(v1607));
return ({["value"]:v1596,["tangent_0"]:v1599,["tangent_1"]:v1602,["tangent_2"]:v1605,["tangent_3"]:v1608});}
function __fn35(v1609,v1610){
const v1611=v1609;
const v1612=v1611["left_bias"];
const v1613=1065353216;
const v1614=0;
const v1615=0;
const v1616=0;
const v1617=({["value"]:v1612,["tangent_0"]:v1613,["tangent_1"]:v1614,["tangent_2"]:v1615,["tangent_3"]:v1616});
const v1618=v1609;
const v1619=v1618["left_slope"];
const v1620=0;
const v1621=1065353216;
const v1622=0;
const v1623=0;
const v1624=({["value"]:v1619,["tangent_0"]:v1620,["tangent_1"]:v1621,["tangent_2"]:v1622,["tangent_3"]:v1623});
const v1625=v1609;
const v1626=v1625["right_bias"];
const v1627=0;
const v1628=0;
const v1629=1065353216;
const v1630=0;
const v1631=({["value"]:v1626,["tangent_0"]:v1627,["tangent_1"]:v1628,["tangent_2"]:v1629,["tangent_3"]:v1630});
const v1632=v1609;
const v1633=v1632["right_slope"];
const v1634=0;
const v1635=0;
const v1636=0;
const v1637=1065353216;
const v1638=({["value"]:v1633,["tangent_0"]:v1634,["tangent_1"]:v1635,["tangent_2"]:v1636,["tangent_3"]:v1637});
const v1639=({["left_bias"]:v1617,["left_slope"]:v1624,["right_bias"]:v1631,["right_slope"]:v1638});
const v1640=v1610;
const v1641=v1640["context"];
const v1642=v1641["signal"];
const v1643=0;
const v1644=0;
const v1645=0;
const v1646=0;
const v1647=({["value"]:v1642,["tangent_0"]:v1643,["tangent_1"]:v1644,["tangent_2"]:v1645,["tangent_3"]:v1646});
const v1648=v1610;
const v1649=v1648["context"];
const v1650=v1649["urgency"];
const v1651=0;
const v1652=0;
const v1653=0;
const v1654=0;
const v1655=({["value"]:v1650,["tangent_0"]:v1651,["tangent_1"]:v1652,["tangent_2"]:v1653,["tangent_3"]:v1654});
const v1656=({["signal"]:v1647,["urgency"]:v1655});
const v1657=v1610;
const v1658=v1657["action"];
const v1659=({["context"]:v1656,["action"]:v1658});
const v1660=__fn34(v1639,v1659);
const v1661=v1660;
const v1662=v1661["tangent_0"];
const v1663=v1660;
const v1664=v1663["tangent_1"];
const v1665=v1660;
const v1666=v1665["tangent_2"];
const v1667=v1660;
const v1668=v1667["tangent_3"];
return ({["left_bias"]:v1662,["left_slope"]:v1664,["right_bias"]:v1666,["right_slope"]:v1668});}
function __into2(v1669,v1670){
const v1671=v1669;
const v1672=v1671["left_bias"];
const v1673=v1669;
const v1674=v1673["left_slope"];
const v1675=v1669;
const v1676=v1675["right_bias"];
const v1677=v1669;
const v1678=v1677["right_slope"];
const v1679=[v1672,v1674,v1676,v1678];
const v1680=v1679.length;
for(let v1681=0;v1681<v1680;v1681++){
v1670[v1681]=__intoOutput2(v1679[v1681]);
}
return v1680;}
function __into12(v1682,v1683){
const v1684=v1682;
const v1685=v1684.length;
for(let v1687=0;v1687<v1685;v1687++){
const v1688=v1684[v1687];
const v1689=v1688;
const v1690=v1688;
const v1691=__bits(__float(v1689) * __float(v1690));
const v1692=1056964608;
v1683[v1687]=__intoOutput12(__bits(__float(v1691) + __float(v1692)));
}
return v1685;}
function __into18(v1693,v1694,v1695,v1696,v1697){
const v1698=v1693;
const v1699=0;
let v1700;if(v1699<v1698.length){v1700=v1698[v1699];}else{
v1700=[];}
const v1701=v1700;
const v1702=v1701.length;
const v1703=new Array(v1702);
for(let v1704=0;v1704<v1702;v1704++){
const v1705=v1701[v1704];
v1703[v1704]=0;
}
const v1706=v1703;
const v1707=0;
const v1708=v1693;
const v1709=v1706;
const v1710=v1707;
let v1711=({["correction"]:v1709,["i"]:v1710});
for(let v1712=0;v1712<v1708.length;v1712++){
const v1713=v1708[v1712];
const v1714=v1711;
const v1715=v1714["correction"];
const v1716=v1711;
const v1717=v1716["i"];
const v1718=v1694;
const v1719=v1717;
let v1720;if(v1719<v1718.length){v1720=v1718[v1719];}else{
v1720=false;}
let v1721;if(v1720){
const v1722=v1715;
const v1723=v1713;
const v1724=Math.min(v1722.length,v1723.length);
const v1725=new Array(v1724);
for(let v1726=0;v1726<v1724;v1726++){
const v1727=v1722[v1726];
const v1728=v1723[v1726];
const v1729=v1727;
const v1730=__bits((__float(__bits((__float(v1728))/(__float(v1695)))))/(__float(v1696)));
v1725[v1726]=__bits(__float(v1729) + __float(v1730));
}
const v1731=v1725;
const v1732=v1717;
const v1733=1;
const v1734=(((v1732) + (v1733)) >>> 0);
const v1735=v1731;
const v1736=v1734;
v1721=({["correction"]:v1735,["i"]:v1736});}else{
const v1737=v1717;
const v1738=1;
const v1739=(((v1737) + (v1738)) >>> 0);
const v1740=v1715;
const v1741=v1739;
v1721=({["correction"]:v1740,["i"]:v1741});}
v1711=v1721;
}
const v1742=v1711;
const v1743=v1742;
const v1744=v1743["correction"];
const v1745=v1742;
const v1746=v1745["i"];
const v1747=v1744;
const v1748=v1747.length;
for(let v1749=0;v1749<v1748;v1749++){
v1697[v1749]=__intoOutput18(v1747[v1749]);
}
return v1748;}
function __into19(v1750,v1751,v1752,v1753,v1754,v1755){
const v1756=v1750;
const v1757=v1754;
let v1758;if(v1757<v1756.length){v1758=v1756[v1757];}else{
v1758=0;}
const v1759=v1758;
const v1760=v1750;
const v1761=v1752;
const v1762=__fn14(v1760,v1761);
const v1763=v1751;
const v1764=v1752;
const v1765=v1762;
const v1766=v1753;
const v1767=__fn18(v1763,v1764,v1765,v1766);
const v1768=v1751;
const v1769=v1754;
let v1770;if(v1769<v1768.length){v1770=v1768[v1769];}else{
v1770=[];}
const v1771=v1770;
const v1772=v1767;
const v1773=Math.min(v1771.length,v1772.length);
for(let v1775=0;v1775<v1773;v1775++){
const v1776=v1771[v1775];
const v1777=v1772[v1775];
const v1778=__bits((__float(v1776))/(__float(v1759)));
const v1779=v1777;
v1755[v1775]=__intoOutput19(__bits(__float(v1778) - __float(v1779)));
}
return v1773;}
function __prepareFn3(fixed){const v1825=fixed[1];let v1824=false,v1823;
const v1837=fixed[0]&&fixed[1];let v1836=false,v1835;
return function(v1820,v1821){let v1822;if(v1825&&v1824){v1822=v1823;}else{
const v1826=v1821;
const v1827=v1826["context"];
const v1828=v1827["signal"];
const v1829=1065353216;
const v1830=v1821;
const v1831=v1830["context"];
const v1832=v1831["urgency"];
const v1833=__bits(__float(v1829) + __float(v1832));
v1822=__bits(__float(v1828) * __float(v1833));if(v1825){v1823=v1822;v1824=true;}}
let v1834;if(v1837&&v1836){v1834=v1835;}else{
const v1838=v1821;
const v1839=v1838["action"];
const v1840=0;
let v1841;if((v1839===v1840)){
const v1842=v1820;
const v1843=v1842["left_bias"];
const v1844=v1820;
const v1845=v1844["left_slope"];
const v1846=v1822;
const v1847=__bits(__float(v1845) * __float(v1846));
v1841=__bits(__float(v1843) + __float(v1847));}else{
const v1848=v1820;
const v1849=v1848["right_bias"];
const v1850=v1820;
const v1851=v1850["right_slope"];
const v1852=v1822;
const v1853=__bits(__float(v1851) * __float(v1852));
v1841=__bits(__float(v1849) + __float(v1853));}
v1834=v1841;if(v1837){v1835=v1834;v1836=true;}}
const v1854=v1834;
const v1855=v1834;
const v1856=__bits(__float(v1854) * __float(v1855));
const v1857=1036831949;
return __bits(__float(v1856) + __float(v1857));};}
function __prepareFn5(fixed){const v1899=fixed[0];let v1898=false,v1897;
const v1904=fixed[1];let v1903=false,v1902;
const v1910=fixed[1];let v1909=false,v1908;
return function(v1884,v1885,v1886){const v1887=(v1884).length;
const v1888=4;
const v1889=!(v1887===v1888);
let v1890=v1889;if(!v1890){
const v1891=v1885;
const v1892=__fn4(v1891);
const v1893=false;
v1890=(v1892===v1893);}
const v1894=v1890;
let v1895;if(v1894){
v1895=({Err:"policy context"});}else{
let v1896;if(v1899&&v1898){v1896=v1897;}else{
const v1900=v1884;
v1896=__fn1(v1900);if(v1899){v1897=v1896;v1898=true;}}
let v1901;if(v1904&&v1903){v1901=v1902;}else{
const v1905=v1885;
const v1906=0;
v1901=({["context"]:v1905,["action"]:v1906});if(v1904){v1902=v1901;v1903=true;}}
let v1907;if(v1910&&v1909){v1907=v1908;}else{
const v1911=v1885;
const v1912=1;
v1907=({["context"]:v1911,["action"]:v1912});if(v1910){v1908=v1907;v1909=true;}}
const v1913=v1896;
const v1914=v1901;
const v1915=__fn3(v1913,v1914);
const v1916=v1896;
const v1917=v1907;
const v1918=__fn3(v1916,v1917);
const v1919=[v1915,v1918];
const v1920=v1896;
const v1921=v1901;
const v1922=__fn35(v1920,v1921);
const v1923=__fn2(v1922);
const v1924=v1896;
const v1925=v1907;
const v1926=__fn35(v1924,v1925);
const v1927=__fn2(v1926);
const v1928=[v1923,v1927];
const v1929=true;
const v1930=true;
const v1931=[v1929,v1930];
const v1932=v1886;
v1895=__fn20(v1919,v1928,v1931,v1932);}
return v1895;};}
function __prepareFn11(fixed){const v2004=fixed[0];let v2003=false,v2002;
return function(v2000){let v2001;if(v2004&&v2003){v2001=v2002;}else{
const v2005=v2000;
const v2006=0;
let v2007;if((v2005===v2006)){
v2007=2143289344;}else{
const v2008=v2000;
const v2009=1;
let v2010;if((v2008===v2009)){
v2010=2139095040;}else{
v2010=1;}
v2007=v2010;}
v2001=v2007;if(v2004){v2002=v2001;v2003=true;}}
const v2011=v2001;
const v2012=1065353216;
const v2013=[v2011,v2012];
const v2014=1065353216;
const v2015=[v2014];
const v2016=1065353216;
const v2017=[v2016];
const v2018=[v2015,v2017];
const v2019=true;
const v2020=true;
const v2021=[v2019,v2020];
const v2022=0;
return __fn20(v2013,v2018,v2021,v2022);};}
function __prepareFn14(fixed){const v2045=true;let v2044=false,v2043;
const v2049=true;let v2048=false,v2047;
const v2053=fixed[0]&&fixed[1];let v2052=false,v2051;
const v2086=fixed[0]&&fixed[1];let v2085=false,v2084;
const v2091=fixed[0]&&fixed[1];let v2090=false,v2089;
return function(v2040,v2041){let v2042;if(v2045&&v2044){v2042=v2043;}else{
v2042=0;if(v2045){v2043=v2042;v2044=true;}}
let v2046;if(v2049&&v2048){v2046=v2047;}else{
v2046=0;if(v2049){v2047=v2046;v2048=true;}}
let v2050;if(v2053&&v2052){v2050=v2051;}else{
const v2054=v2040;
const v2055=v2046;
const v2056=v2042;
let v2057=({["i"]:v2055,["maximum"]:v2056});
for(let v2058=0;v2058<v2054.length;v2058++){
const v2059=v2054[v2058];
const v2060=v2057;
const v2061=v2060["i"];
const v2062=v2057;
const v2063=v2062["maximum"];
const v2064=v2041;
const v2065=v2061;
let v2066;if(v2065<v2064.length){v2066=v2064[v2065];}else{
v2066=false;}
const v2067=v2066;
let v2068=v2067;if(v2068){
const v2069=v2059;
const v2070=v2063;
v2068=((__float(v2069)) > (__float(v2070)));}
let v2071;if(v2068){
const v2072=v2059;
const v2073=v2061;
const v2074=1;
const v2075=(((v2073) + (v2074)) >>> 0);
const v2076=v2075;
const v2077=v2072;
v2071=({["i"]:v2076,["maximum"]:v2077});}else{
const v2078=v2061;
const v2079=1;
const v2080=(((v2078) + (v2079)) >>> 0);
const v2081=v2080;
const v2082=v2063;
v2071=({["i"]:v2081,["maximum"]:v2082});}
v2057=v2071;
}
v2050=v2057;if(v2053){v2051=v2050;v2052=true;}}
let v2083;if(v2086&&v2085){v2083=v2084;}else{
const v2087=v2050;
v2083=v2087["i"];if(v2086){v2084=v2083;v2085=true;}}
let v2088;if(v2091&&v2090){v2088=v2089;}else{
const v2092=v2050;
v2088=v2092["maximum"];if(v2091){v2089=v2088;v2090=true;}}
return v2088;};}
function __prepareFn15(fixed){const v2127=fixed[0]&&fixed[1];let v2126=false,v2125;
const v2138=true;let v2137=false,v2136;
const v2165=fixed[0]&&fixed[1];let v2164=false,v2163;
return function(v2093,v2094){const v2095=(v2093).length;
const v2096=0;
const v2097=(v2095===v2096);
let v2098=v2097;if(!v2098){
const v2099=(v2093).length;
const v2100=256;
v2098=((v2099) > (v2100));}
const v2101=v2098;
let v2102=v2101;if(!v2102){
const v2103=(v2094).length;
const v2104=(v2093).length;
v2102=!(v2103===v2104);}
const v2105=v2102;
let v2106=v2105;if(!v2106){
const v2107=v2093;
const v2108=__fn13(v2107);
const v2109=false;
v2106=(v2108===v2109);}
const v2110=v2106;
let v2111=v2110;if(!v2111){
const v2112=v2093;
let v2113=true;
for(let v2114=0;v2114<v2112.length;v2114++){
const v2115=v2112[v2114];
const v2116=v2113;
let v2117=v2116;if(v2117){
const v2118=v2115;
const v2119=0;
v2117=((__float(v2118)) >= (__float(v2119)));}
v2113=v2117;
}
const v2120=v2113;
const v2121=false;
v2111=(v2120===v2121);}
const v2122=v2111;
let v2123;if(v2122){
v2123=({Err:"policy shape or mass domain"});}else{
let v2124;if(v2127&&v2126){v2124=v2125;}else{
const v2128=v2093;
const v2129=v2094;
v2124=__fn14(v2128,v2129);if(v2127){v2125=v2124;v2126=true;}}
const v2130=v2124;
const v2131=0;
const v2132=((__float(v2130)) === (__float(v2131)));
let v2133;if(v2132){
v2133=({Err:"no positive allowed policy mass"});}else{
const v2134=new __InkBuffer([]);
let v2135;if(v2138&&v2137){v2135=v2136;}else{
v2135=0;if(v2138){v2136=v2135;v2137=true;}}
const v2140=v2093;
const v2141=v2135;
const v2142=v2134;
let v2143=({["i"]:v2141,["out"]:v2142});
for(let v2144=0;v2144<v2140.length;v2144++){
const v2145=v2140[v2144];
const v2146=v2143;
const v2147=v2146["i"];
const v2148=v2143;
const v2149=v2148["out"];
const v2150=v2149;
const v2151=v2094;
const v2152=v2147;
let v2153;if(v2152<v2151.length){v2153=v2151[v2152];}else{
v2153=false;}
let v2154;if(v2153){
v2154=__bits((__float(v2145))/(__float(v2124)));}else{
v2154=0;}
const v2155=v2154;
const v2156=__tempEdit(v2150,"push",v2155);
const v2157=v2147;
const v2158=1;
const v2159=(((v2157) + (v2158)) >>> 0);
const v2160=v2159;
const v2161=v2156;
v2143=({["i"]:v2160,["out"]:v2161});
}
const v2139=v2143;
let v2162;if(v2165&&v2164){v2162=v2163;}else{
const v2166=v2139;
v2162=v2166["i"];if(v2165){v2163=v2162;v2164=true;}}
const v2168=v2139;
const v2167=v2168["out"];
const v2169=v2167;
v2133=({Ok:v2169.freeze()});}
v2123=v2133;}
return v2123;};}
function __prepareFn17(fixed){const v2197=fixed[1]&&fixed[2];let v2196=false,v2195;
const v2203=true;let v2202=false,v2201;
const v2207=true;let v2206=false,v2205;
const v2211=true;let v2210=false,v2209;
const v2215=true;let v2214=false,v2213;
const v2219=fixed[0]&&fixed[1]&&fixed[2];let v2218=false,v2217;
const v2307=fixed[0]&&fixed[1]&&fixed[2];let v2306=false,v2305;
const v2312=fixed[0]&&fixed[1]&&fixed[2];let v2311=false,v2310;
const v2317=fixed[0]&&fixed[1]&&fixed[2];let v2316=false,v2315;
const v2322=fixed[0]&&fixed[1]&&fixed[2];let v2321=false,v2320;
return function(v2191,v2192,v2193){let v2194;if(v2197&&v2196){v2194=v2195;}else{
const v2198=v2192;
const v2199=v2193;
v2194=__bits(__float(v2198) * __float(v2199));if(v2197){v2195=v2194;v2196=true;}}
let v2200;if(v2203&&v2202){v2200=v2201;}else{
v2200=0;if(v2203){v2201=v2200;v2202=true;}}
let v2204;if(v2207&&v2206){v2204=v2205;}else{
v2204=0;if(v2207){v2205=v2204;v2206=true;}}
let v2208;if(v2211&&v2210){v2208=v2209;}else{
v2208=false;if(v2211){v2209=v2208;v2210=true;}}
let v2212;if(v2215&&v2214){v2212=v2213;}else{
v2212=0;if(v2215){v2213=v2212;v2214=true;}}
let v2216;if(v2219&&v2218){v2216=v2217;}else{
const v2220=v2191;
const v2221=v2200;
const v2222=v2208;
const v2223=v2212;
const v2224=v2204;
let v2225=({["accumulated"]:v2221,["found"]:v2222,["i"]:v2223,["selected"]:v2224});
for(let v2226=0;v2226<v2220.length;v2226++){
const v2227=v2220[v2226];
const v2228=v2225;
const v2229=v2228["accumulated"];
const v2230=v2225;
const v2231=v2230["found"];
const v2232=v2225;
const v2233=v2232["i"];
const v2234=v2225;
const v2235=v2234["selected"];
const v2236=v2227;
const v2237=0;
const v2238=((__float(v2236)) > (__float(v2237)));
let v2239=v2238;if(v2239){
const v2240=v2231;
const v2241=false;
v2239=(v2240===v2241);}
let v2242;if(v2239){
const v2243=v2233;
const v2244=v2229;
const v2245=v2227;
const v2246=__bits(__float(v2244) + __float(v2245));
const v2247=v2227;
const v2248=0;
const v2249=((__float(v2247)) > (__float(v2248)));
let v2250=v2249;if(v2250){
const v2251=v2231;
const v2252=false;
v2250=(v2251===v2252);}
const v2253=v2250;
let v2254=v2253;if(v2254){
const v2255=v2194;
const v2256=v2246;
v2254=((__float(v2255)) < (__float(v2256)));}
let v2257;if(v2254){
const v2258=v2233;
const v2259=true;
const v2260=v2233;
const v2261=1;
const v2262=(((v2260) + (v2261)) >>> 0);
const v2263=v2246;
const v2264=v2259;
const v2265=v2262;
const v2266=v2258;
v2257=({["accumulated"]:v2263,["found"]:v2264,["i"]:v2265,["selected"]:v2266});}else{
const v2267=v2233;
const v2268=1;
const v2269=(((v2267) + (v2268)) >>> 0);
const v2270=v2246;
const v2271=v2231;
const v2272=v2269;
const v2273=v2243;
v2257=({["accumulated"]:v2270,["found"]:v2271,["i"]:v2272,["selected"]:v2273});}
v2242=v2257;}else{
const v2274=v2229;
const v2275=v2227;
const v2276=__bits(__float(v2274) + __float(v2275));
const v2277=v2227;
const v2278=0;
const v2279=((__float(v2277)) > (__float(v2278)));
let v2280=v2279;if(v2280){
const v2281=v2231;
const v2282=false;
v2280=(v2281===v2282);}
const v2283=v2280;
let v2284=v2283;if(v2284){
const v2285=v2194;
const v2286=v2276;
v2284=((__float(v2285)) < (__float(v2286)));}
let v2287;if(v2284){
const v2288=v2233;
const v2289=true;
const v2290=v2233;
const v2291=1;
const v2292=(((v2290) + (v2291)) >>> 0);
const v2293=v2276;
const v2294=v2289;
const v2295=v2292;
const v2296=v2288;
v2287=({["accumulated"]:v2293,["found"]:v2294,["i"]:v2295,["selected"]:v2296});}else{
const v2297=v2233;
const v2298=1;
const v2299=(((v2297) + (v2298)) >>> 0);
const v2300=v2276;
const v2301=v2231;
const v2302=v2299;
const v2303=v2235;
v2287=({["accumulated"]:v2300,["found"]:v2301,["i"]:v2302,["selected"]:v2303});}
v2242=v2287;}
v2225=v2242;
}
v2216=v2225;if(v2219){v2217=v2216;v2218=true;}}
let v2304;if(v2307&&v2306){v2304=v2305;}else{
const v2308=v2216;
v2304=v2308["accumulated"];if(v2307){v2305=v2304;v2306=true;}}
let v2309;if(v2312&&v2311){v2309=v2310;}else{
const v2313=v2216;
v2309=v2313["found"];if(v2312){v2310=v2309;v2311=true;}}
let v2314;if(v2317&&v2316){v2314=v2315;}else{
const v2318=v2216;
v2314=v2318["i"];if(v2317){v2315=v2314;v2316=true;}}
let v2319;if(v2322&&v2321){v2319=v2320;}else{
const v2323=v2216;
v2319=v2323["selected"];if(v2322){v2320=v2319;v2321=true;}}
return v2319;};}
function __prepareFn18(fixed){const v2331=fixed[0];let v2330=false,v2329;
const v2343=true;let v2342=false,v2341;
const v2347=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2346=false,v2345;
const v2385=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2384=false,v2383;
const v2390=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2389=false,v2388;
return function(v2324,v2325,v2326,v2327){let v2328;if(v2331&&v2330){v2328=v2329;}else{
const v2332=v2324;
const v2333=0;
let v2334;if(v2333<v2332.length){v2334=v2332[v2333];}else{
v2334=[];}
const v2335=v2334;
const v2336=v2335.length;
const v2337=new Array(v2336);
for(let v2338=0;v2338<v2336;v2338++){
const v2339=v2335[v2338];
v2337[v2338]=0;
}
v2328=v2337;if(v2331){v2329=v2328;v2330=true;}}
let v2340;if(v2343&&v2342){v2340=v2341;}else{
v2340=0;if(v2343){v2341=v2340;v2342=true;}}
let v2344;if(v2347&&v2346){v2344=v2345;}else{
const v2348=v2324;
const v2349=v2328;
const v2350=v2340;
let v2351=({["correction"]:v2349,["i"]:v2350});
for(let v2352=0;v2352<v2348.length;v2352++){
const v2353=v2348[v2352];
const v2354=v2351;
const v2355=v2354["correction"];
const v2356=v2351;
const v2357=v2356["i"];
const v2358=v2325;
const v2359=v2357;
let v2360;if(v2359<v2358.length){v2360=v2358[v2359];}else{
v2360=false;}
let v2361;if(v2360){
const v2362=v2355;
const v2363=v2353;
const v2364=Math.min(v2362.length,v2363.length);
const v2365=new Array(v2364);
for(let v2366=0;v2366<v2364;v2366++){
const v2367=v2362[v2366];
const v2368=v2363[v2366];
const v2369=v2367;
const v2370=__bits((__float(__bits((__float(v2368))/(__float(v2326)))))/(__float(v2327)));
v2365[v2366]=__bits(__float(v2369) + __float(v2370));
}
const v2371=v2365;
const v2372=v2357;
const v2373=1;
const v2374=(((v2372) + (v2373)) >>> 0);
const v2375=v2371;
const v2376=v2374;
v2361=({["correction"]:v2375,["i"]:v2376});}else{
const v2377=v2357;
const v2378=1;
const v2379=(((v2377) + (v2378)) >>> 0);
const v2380=v2355;
const v2381=v2379;
v2361=({["correction"]:v2380,["i"]:v2381});}
v2351=v2361;
}
v2344=v2351;if(v2347){v2345=v2344;v2346=true;}}
let v2382;if(v2385&&v2384){v2382=v2383;}else{
const v2386=v2344;
v2382=v2386["correction"];if(v2385){v2383=v2382;v2384=true;}}
let v2387;if(v2390&&v2389){v2387=v2388;}else{
const v2391=v2344;
v2387=v2391["i"];if(v2390){v2388=v2387;v2389=true;}}
return v2382;};}
function __prepareFn19(fixed){const v2400=fixed[0]&&fixed[4];let v2399=false,v2398;
const v2407=fixed[0]&&fixed[2];let v2406=false,v2405;
const v2413=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2412=false,v2411;
return function(v2392,v2393,v2394,v2395,v2396){let v2397;if(v2400&&v2399){v2397=v2398;}else{
const v2401=v2392;
const v2402=v2396;
let v2403;if(v2402<v2401.length){v2403=v2401[v2402];}else{
v2403=0;}
v2397=v2403;if(v2400){v2398=v2397;v2399=true;}}
let v2404;if(v2407&&v2406){v2404=v2405;}else{
const v2408=v2392;
const v2409=v2394;
v2404=__fn14(v2408,v2409);if(v2407){v2405=v2404;v2406=true;}}
let v2410;if(v2413&&v2412){v2410=v2411;}else{
const v2414=v2393;
const v2415=v2394;
const v2416=v2404;
const v2417=v2395;
v2410=__fn18(v2414,v2415,v2416,v2417);if(v2413){v2411=v2410;v2412=true;}}
const v2418=v2393;
const v2419=v2396;
let v2420;if(v2419<v2418.length){v2420=v2418[v2419];}else{
v2420=[];}
const v2421=v2420;
const v2422=v2410;
const v2423=Math.min(v2421.length,v2422.length);
const v2424=new Array(v2423);
for(let v2425=0;v2425<v2423;v2425++){
const v2426=v2421[v2425];
const v2427=v2422[v2425];
const v2428=__bits((__float(v2426))/(__float(v2397)));
const v2429=v2427;
v2424[v2425]=__bits(__float(v2428) - __float(v2429));
}
return v2424;};}
function __prepareFn21(fixed){const v2566=fixed[1]&&fixed[2];let v2565=false,v2564;
const v2572=fixed[0]&&fixed[1]&&fixed[2];let v2571=false,v2570;
return function(v2521,v2522,v2523){const v2524=Number.isFinite(__float(v2522));
const v2525=false;
const v2526=(v2524===v2525);
let v2527=v2526;if(!v2527){
const v2528=Number.isFinite(__float(v2523));
const v2529=false;
v2527=(v2528===v2529);}
const v2530=v2527;
let v2531=v2530;if(!v2531){
const v2532=v2521;
const v2533=Number.isFinite(__float(v2532["probability"]));
const v2534=false;
v2531=(v2533===v2534);}
const v2535=v2531;
let v2536=v2535;if(!v2536){
const v2537=v2521;
const v2538=v2537["probability"];
const v2539=0;
v2536=((__float(v2538)) <= (__float(v2539)));}
const v2540=v2536;
let v2541=v2540;if(!v2541){
const v2542=v2521;
const v2543=v2542["probability"];
const v2544=1065353216;
v2541=((__float(v2543)) > (__float(v2544)));}
const v2545=v2541;
let v2546=v2545;if(!v2546){
const v2547=v2521;
const v2548=(v2547["score"]).length;
const v2549=0;
v2546=(v2548===v2549);}
const v2550=v2546;
let v2551=v2550;if(!v2551){
const v2552=v2521;
const v2553=(v2552["score"]).length;
const v2554=4096;
v2551=((v2553) > (v2554));}
const v2555=v2551;
let v2556=v2555;if(!v2556){
const v2557=v2521;
const v2558=v2557["score"];
const v2559=__fn13(v2558);
const v2560=false;
v2556=(v2559===v2560);}
const v2561=v2556;
let v2562;if(v2561){
v2562=({Err:"policy feedback domain"});}else{
let v2563;if(v2566&&v2565){v2563=v2564;}else{
const v2567=v2522;
const v2568=v2523;
v2563=__bits(__float(v2567) - __float(v2568));if(v2566){v2564=v2563;v2565=true;}}
let v2569;if(v2572&&v2571){v2569=v2570;}else{
const v2573=v2521;
const v2574=v2573["score"];
const v2575=v2574.length;
const v2576=new Array(v2575);
for(let v2577=0;v2577<v2575;v2577++){
const v2578=v2574[v2577];
const v2579=v2563;
const v2580=((v2579 ^ 2147483648) >>> 0);
const v2581=v2578;
v2576[v2577]=__bits(__float(v2580) * __float(v2581));
}
v2569=v2576;if(v2572){v2570=v2569;v2571=true;}}
const v2582=Number.isFinite(__float(v2563));
const v2583=false;
const v2584=(v2582===v2583);
let v2585=v2584;if(!v2585){
const v2586=v2569;
const v2587=__fn13(v2586);
const v2588=false;
v2585=(v2587===v2588);}
const v2589=v2585;
let v2590;if(v2589){
v2590=({Err:"nonfinite policy gradient"});}else{
v2590=({Ok:v2569});}
v2562=v2590;}
return v2562;};}
function __prepareFn23(fixed){const v2631=fixed[0];let v2630=false,v2629;
const v2641=fixed[0];let v2640=false,v2639;
const v2677=fixed[0];let v2676=false,v2675;
const v2687=true;let v2686=false,v2685;
const v2691=fixed[0]&&fixed[1]&&fixed[2];let v2690=false,v2689;
const v2721=fixed[0]&&fixed[1]&&fixed[2];let v2720=false,v2719;
const v2726=fixed[0]&&fixed[1]&&fixed[2];let v2725=false,v2724;
return function(v2625,v2626,v2627){let v2628;if(v2631&&v2630){v2628=v2629;}else{
const v2632=v2625;
const v2633=0;
let v2634;if(v2633<v2632.length){v2634=v2632[v2633];}else{
const v2635=0;
const v2636=0;
const v2637=[];
v2634=({["action"]:v2635,["probability"]:v2636,["score"]:v2637});}
v2628=v2634;if(v2631){v2629=v2628;v2630=true;}}
let v2638;if(v2641&&v2640){v2638=v2639;}else{
const v2642=v2628;
v2638=(v2642["score"]).length;if(v2641){v2639=v2638;v2640=true;}}
const v2643=(v2625).length;
const v2644=0;
const v2645=(v2643===v2644);
let v2646=v2645;if(!v2646){
const v2647=(v2625).length;
const v2648=4096;
v2646=((v2647) > (v2648));}
const v2649=v2646;
let v2650=v2649;if(!v2650){
const v2651=(v2626).length;
const v2652=(v2625).length;
v2650=!(v2651===v2652);}
const v2653=v2650;
let v2654=v2653;if(!v2654){
const v2655=(v2627).length;
const v2656=(v2625).length;
v2654=!(v2655===v2656);}
const v2657=v2654;
let v2658=v2657;if(!v2658){
const v2659=v2638;
const v2660=0;
v2658=(v2659===v2660);}
const v2661=v2658;
let v2662=v2661;if(!v2662){
const v2663=v2638;
const v2664=4096;
v2662=((v2663) > (v2664));}
const v2665=v2662;
let v2666=v2665;if(!v2666){
const v2667=(v2625).length;
const v2668=65536;
const v2669=v2638;
let v2670;if(v2669===0 ){
v2670=0;}else{
v2670=(Math.trunc(v2668/v2669)+0);}
const v2671=v2670;
v2666=((v2667) > (v2671));}
const v2672=v2666;
let v2673;if(v2672){
v2673=({Err:"trajectory shape"});}else{
let v2674;if(v2677&&v2676){v2674=v2675;}else{
const v2678=v2628;
const v2679=v2678["score"];
const v2680=v2679.length;
const v2681=new Array(v2680);
for(let v2682=0;v2682<v2680;v2682++){
const v2683=v2679[v2682];
v2681[v2682]=0;
}
v2674=({Ok:v2681});if(v2677){v2675=v2674;v2676=true;}}
let v2684;if(v2687&&v2686){v2684=v2685;}else{
v2684=0;if(v2687){v2685=v2684;v2686=true;}}
let v2688;if(v2691&&v2690){v2688=v2689;}else{
const v2692=v2625;
const v2693=v2674;
const v2694=v2684;
let v2695=({["accumulator"]:v2693,["i"]:v2694});
for(let v2696=0;v2696<v2692.length;v2696++){
const v2697=v2692[v2696];
const v2698=v2695;
const v2699=v2698["accumulator"];
const v2700=v2695;
const v2701=v2700["i"];
const v2702=v2699;
const v2703=v2697;
const v2704=v2626;
const v2705=v2701;
let v2706;if(v2705<v2704.length){v2706=v2704[v2705];}else{
v2706=0;}
const v2707=v2706;
const v2708=v2627;
const v2709=v2701;
let v2710;if(v2709<v2708.length){v2710=v2708[v2709];}else{
v2710=0;}
const v2711=v2710;
const v2712=__fn22(v2702,v2703,v2707,v2711);
const v2713=v2701;
const v2714=1;
const v2715=(((v2713) + (v2714)) >>> 0);
const v2716=v2712;
const v2717=v2715;
v2695=({["accumulator"]:v2716,["i"]:v2717});
}
v2688=v2695;if(v2691){v2689=v2688;v2690=true;}}
let v2718;if(v2721&&v2720){v2718=v2719;}else{
const v2722=v2688;
v2718=v2722["accumulator"];if(v2721){v2719=v2718;v2720=true;}}
let v2723;if(v2726&&v2725){v2723=v2724;}else{
const v2727=v2688;
v2723=v2727["i"];if(v2726){v2724=v2723;v2725=true;}}
const v2728=v2718;
let v2729;if(Object.hasOwn(v2728,"Ok")){
const v2730=v2728["Ok"];
const v2731=v2730;
const v2732=v2731;
const v2733=v2732.length;
const v2734=new Array(v2733);
for(let v2735=0;v2735<v2733;v2735++){
const v2736=v2732[v2735];
v2734[v2735]=__bits((__float(v2736))/(__float(__bits((v2625).length))));
}
v2729=({Ok:v2734});}else{
const v2737=v2728["Err"];
v2729=({Err:v2737});}
v2673=v2729;}
return v2673;};}
function __prepareFn24(fixed){const v2770=fixed[2];let v2769=false,v2768;
const v2774=true;let v2773=false,v2772;
const v2813=fixed[0]&&fixed[1]&&fixed[2];let v2812=false,v2811;
const v2818=fixed[0]&&fixed[1]&&fixed[2];let v2817=false,v2816;
const v2825=fixed[0]&&fixed[1]&&fixed[2];let v2824=false,v2823;
const v2836=true;let v2835=false,v2834;
const v2866=fixed[0]&&fixed[1]&&fixed[2];let v2865=false,v2864;
return function(v2738,v2739,v2740){const v2741=(v2738).length;
const v2742=4096;
const v2743=((v2741) > (v2742));
let v2744=v2743;if(!v2744){
const v2745=v2738;
const v2746=__fn13(v2745);
const v2747=false;
v2744=(v2746===v2747);}
const v2748=v2744;
let v2749=v2748;if(!v2749){
const v2750=Number.isFinite(__float(v2739));
const v2751=false;
v2749=(v2750===v2751);}
const v2752=v2749;
let v2753=v2752;if(!v2753){
const v2754=v2739;
const v2755=0;
v2753=((__float(v2754)) < (__float(v2755)));}
const v2756=v2753;
let v2757=v2756;if(!v2757){
const v2758=v2739;
const v2759=1065353216;
v2757=((__float(v2758)) > (__float(v2759)));}
const v2760=v2757;
let v2761=v2760;if(!v2761){
const v2762=Number.isFinite(__float(v2740));
const v2763=false;
v2761=(v2762===v2763);}
const v2764=v2761;
let v2765;if(v2764){
v2765=({Err:"return domain"});}else{
const v2766=new __InkBuffer([]);
let v2767;if(v2770&&v2769){v2767=v2768;}else{
v2767=v2740;if(v2770){v2768=v2767;v2769=true;}}
let v2771;if(v2774&&v2773){v2771=v2772;}else{
v2771=0;if(v2774){v2772=v2771;v2773=true;}}
const v2776=v2738;
const v2777=v2771;
const v2778=v2767;
const v2779=v2766;
let v2780=({["i"]:v2777,["next"]:v2778,["reversed"]:v2779});
for(let v2781=0;v2781<v2776.length;v2781++){
const v2782=v2776[v2781];
const v2783=v2780;
const v2784=v2783["i"];
const v2785=v2780;
const v2786=v2785["next"];
const v2787=v2780;
const v2788=v2787["reversed"];
const v2789=v2738;
const v2790=(v2738).length;
const v2791=1;
const v2792=(((v2790) - (v2791)) >>> 0);
const v2793=v2784;
const v2794=(((v2792) - (v2793)) >>> 0);
let v2795;if(v2794<v2789.length){v2795=v2789[v2794];}else{
v2795=0;}
const v2796=v2795;
const v2797=v2739;
const v2798=v2786;
const v2799=__bits(__float(v2797) * __float(v2798));
const v2800=__bits(__float(v2796) + __float(v2799));
const v2801=v2788;
const v2802=v2800;
const v2803=__tempEdit(v2801,"push",v2802);
const v2804=v2784;
const v2805=1;
const v2806=(((v2804) + (v2805)) >>> 0);
const v2807=v2806;
const v2808=v2800;
const v2809=v2803;
v2780=({["i"]:v2807,["next"]:v2808,["reversed"]:v2809});
}
const v2775=v2780;
let v2810;if(v2813&&v2812){v2810=v2811;}else{
const v2814=v2775;
v2810=v2814["i"];if(v2813){v2811=v2810;v2812=true;}}
let v2815;if(v2818&&v2817){v2815=v2816;}else{
const v2819=v2775;
v2815=v2819["next"];if(v2818){v2816=v2815;v2817=true;}}
const v2821=v2775;
const v2820=v2821["reversed"];
let v2822;if(v2825&&v2824){v2822=v2823;}else{
const v2826=v2820;
v2822=v2826.freeze();if(v2825){v2823=v2822;v2824=true;}}
const v2827=v2822;
const v2828=__fn13(v2827);
const v2829=false;
const v2830=(v2828===v2829);
let v2831;if(v2830){
v2831=({Err:"nonfinite return"});}else{
const v2832=new __InkBuffer([]);
let v2833;if(v2836&&v2835){v2833=v2834;}else{
v2833=0;if(v2836){v2834=v2833;v2835=true;}}
const v2838=v2822;
const v2839=v2833;
const v2840=v2832;
let v2841=({["i"]:v2839,["out"]:v2840});
for(let v2842=0;v2842<v2838.length;v2842++){
const v2843=v2838[v2842];
const v2844=v2841;
const v2845=v2844["i"];
const v2846=v2841;
const v2847=v2846["out"];
const v2848=v2847;
const v2849=v2822;
const v2850=(v2822).length;
const v2851=1;
const v2852=(((v2850) - (v2851)) >>> 0);
const v2853=v2845;
const v2854=(((v2852) - (v2853)) >>> 0);
let v2855;if(v2854<v2849.length){v2855=v2849[v2854];}else{
v2855=0;}
const v2856=v2855;
const v2857=__tempEdit(v2848,"push",v2856);
const v2858=v2845;
const v2859=1;
const v2860=(((v2858) + (v2859)) >>> 0);
const v2861=v2860;
const v2862=v2857;
v2841=({["i"]:v2861,["out"]:v2862});
}
const v2837=v2841;
let v2863;if(v2866&&v2865){v2863=v2864;}else{
const v2867=v2837;
v2863=v2867["i"];if(v2866){v2864=v2863;v2865=true;}}
const v2869=v2837;
const v2868=v2869["out"];
const v2870=v2868;
v2831=({Ok:v2870.freeze()});}
v2765=v2831;}
return v2765;};}
function __prepareFn28(fixed){const v2948=fixed[0];let v2947=false,v2946;
return function(v2939){const v2940=v2939;
const v2941=__fn26(v2940);
const v2942=false;
const v2943=(v2941===v2942);
let v2944;if(v2943){
v2944=({Err:"nonfinite weights"});}else{
let v2945;if(v2948&&v2947){v2945=v2946;}else{
const v2949=v2939;
const v2950=v2949.length;
const v2951=new Array(v2950);
for(let v2952=0;v2952<v2950;v2952++){
const v2953=v2949[v2952];
v2951[v2952]=0;
}
v2945=v2951;if(v2948){v2946=v2945;v2947=true;}}
const v2954=v2939;
const v2955=v2945;
const v2956=v2945;
const v2957=0;
const v2958=1065353216;
const v2959=1065353216;
v2944=({Ok:({["weights"]:v2954,["first"]:v2955,["second"]:v2956,["steps"]:v2957,["first_power"]:v2958,["second_power"]:v2959})});}
return v2944;};}
function __prepareFn31(fixed){const v3026=fixed[0];let v3025=false,v3024;
const v3043=fixed[0];let v3042=false,v3041;
const v3055=fixed[0]&&fixed[1];let v3054=false,v3053;
return function(v3017,v3018){const v3019=v3018;
const v3020=0;
const v3021=((__float(v3019)) === (__float(v3020)));
let v3022;if(v3021){
v3022=1065353216;}else{
let v3023;if(v3026&&v3025){v3023=v3024;}else{
const v3027=v3017;
let v3028=0;
for(let v3029=0;v3029<v3027.length;v3029++){
const v3030=v3027[v3029];
const v3031=v3030;
const v3032=__fn30(v3031);
const v3033=v3028;
let v3034;if(((__float(v3032)) > (__float(v3033)))){
const v3035=v3030;
v3034=__fn30(v3035);}else{
v3034=v3028;}
v3028=v3034;
}
v3023=v3028;if(v3026){v3024=v3023;v3025=true;}}
const v3036=v3023;
const v3037=0;
const v3038=((__float(v3036)) === (__float(v3037)));
let v3039;if(v3038){
v3039=1065353216;}else{
let v3040;if(v3043&&v3042){v3040=v3041;}else{
const v3044=v3017;
let v3045=0;
for(let v3046=0;v3046<v3044.length;v3046++){
const v3047=v3044[v3046];
const v3048=v3045;
const v3049=__bits((__float(v3047))/(__float(v3023)));
const v3050=__bits((__float(v3047))/(__float(v3023)));
const v3051=__bits(__float(v3049) * __float(v3050));
v3045=__bits(__float(v3048) + __float(v3051));
}
v3040=v3045;if(v3043){v3041=v3040;v3042=true;}}
let v3052;if(v3055&&v3054){v3052=v3053;}else{
v3052=__bits((__float(__bits((__float(v3018))/(__float(v3023)))))/(__float(__bits(Math.sqrt(__float(v3040))))));if(v3055){v3053=v3052;v3054=true;}}
const v3056=v3052;
const v3057=1065353216;
const v3058=((__float(v3056)) < (__float(v3057)));
let v3059;if(v3058){
v3059=v3052;}else{
v3059=1065353216;}
v3039=v3059;}
v3022=v3039;}
return v3022;};}
function __prepareFn33(fixed){const v3110=true;let v3109=false,v3108;
const v3144=fixed[0]&&fixed[1]&&fixed[2];let v3143=false,v3142;
const v3149=fixed[0]&&fixed[1]&&fixed[2];let v3148=false,v3147;
const v3159=fixed[0]&&fixed[1]&&fixed[2];let v3158=false,v3157;
const v3166=fixed[0]&&fixed[2];let v3165=false,v3164;
const v3174=fixed[0]&&fixed[2];let v3173=false,v3172;
const v3185=true;let v3184=false,v3183;
const v3270=fixed[0]&&fixed[1]&&fixed[2];let v3269=false,v3268;
const v3279=fixed[0]&&fixed[1]&&fixed[2];let v3278=false,v3277;
return function(v3078,v3079,v3080){const v3081=v3078;
const v3082=__fn27(v3081);
const v3083=false;
const v3084=(v3082===v3083);
let v3085=v3084;if(!v3085){
const v3086=v3080;
const v3087=__fn29(v3086);
const v3088=false;
v3085=(v3087===v3088);}
const v3089=v3085;
let v3090=v3089;if(!v3090){
const v3091=(v3079).length;
const v3092=v3078;
const v3093=(v3092["weights"]).length;
v3090=!(v3091===v3093);}
const v3094=v3090;
let v3095=v3094;if(!v3095){
const v3096=v3079;
const v3097=__fn26(v3096);
const v3098=false;
v3095=(v3097===v3098);}
const v3099=v3095;
let v3100=v3099;if(!v3100){
const v3101=v3078;
const v3102=v3101["steps"];
const v3103=4294967295;
v3100=(v3102===v3103);}
const v3104=v3100;
let v3105;if(v3104){
v3105=({Err:"optimizer domain"});}else{
const v3106=new __InkBuffer([]);
let v3107;if(v3110&&v3109){v3107=v3108;}else{
v3107=0;if(v3110){v3108=v3107;v3109=true;}}
const v3112=v3079;
const v3113=v3106;
const v3114=v3107;
let v3115=({["adjusted"]:v3113,["i"]:v3114});
for(let v3116=0;v3116<v3112.length;v3116++){
const v3117=v3112[v3116];
const v3118=v3115;
const v3119=v3118["adjusted"];
const v3120=v3115;
const v3121=v3120["i"];
const v3122=v3119;
const v3123=v3117;
const v3124=v3080;
const v3125=v3124["weight_decay"];
const v3126=v3078;
const v3127=v3126["weights"];
const v3128=v3121;
let v3129;if(v3128<v3127.length){v3129=v3127[v3128];}else{
v3129=0;}
const v3130=v3129;
const v3131=__bits(__float(v3125) * __float(v3130));
const v3132=__bits(__float(v3123) + __float(v3131));
const v3133=__tempEdit(v3122,"push",v3132);
const v3134=v3121;
const v3135=1;
const v3136=(((v3134) + (v3135)) >>> 0);
const v3137=v3133;
const v3138=v3136;
v3115=({["adjusted"]:v3137,["i"]:v3138});
}
const v3111=v3115;
const v3140=v3111;
const v3139=v3140["adjusted"];
let v3141;if(v3144&&v3143){v3141=v3142;}else{
const v3145=v3111;
v3141=v3145["i"];if(v3144){v3142=v3141;v3143=true;}}
let v3146;if(v3149&&v3148){v3146=v3147;}else{
const v3150=v3139;
v3146=v3150.freeze();if(v3149){v3147=v3146;v3148=true;}}
const v3151=v3146;
const v3152=__fn26(v3151);
const v3153=false;
const v3154=(v3152===v3153);
let v3155;if(v3154){
v3155=({Err:"nonfinite gradient"});}else{
let v3156;if(v3159&&v3158){v3156=v3157;}else{
const v3160=v3146;
const v3161=v3080;
const v3162=v3161["norm_limit"];
v3156=__fn31(v3160,v3162);if(v3159){v3157=v3156;v3158=true;}}
let v3163;if(v3166&&v3165){v3163=v3164;}else{
const v3167=v3078;
const v3168=v3167["first_power"];
const v3169=v3080;
const v3170=v3169["first_decay"];
v3163=__bits(__float(v3168) * __float(v3170));if(v3166){v3164=v3163;v3165=true;}}
let v3171;if(v3174&&v3173){v3171=v3172;}else{
const v3175=v3078;
const v3176=v3175["second_power"];
const v3177=v3080;
const v3178=v3177["second_decay"];
v3171=__bits(__float(v3176) * __float(v3178));if(v3174){v3172=v3171;v3173=true;}}
const v3179=new __InkBuffer([]);
const v3180=new __InkBuffer([]);
const v3181=new __InkBuffer([]);
let v3182;if(v3185&&v3184){v3182=v3183;}else{
v3182=0;if(v3185){v3183=v3182;v3184=true;}}
const v3187=v3146;
const v3188=v3180;
const v3189=v3182;
const v3190=v3181;
const v3191=v3179;
let v3192=({["first"]:v3188,["i"]:v3189,["second"]:v3190,["weights"]:v3191});
for(let v3193=0;v3193<v3187.length;v3193++){
const v3194=v3187[v3193];
const v3195=v3192;
const v3196=v3195["first"];
const v3197=v3192;
const v3198=v3197["i"];
const v3199=v3192;
const v3200=v3199["second"];
const v3201=v3192;
const v3202=v3201["weights"];
const v3203=v3194;
const v3204=v3156;
const v3205=__bits(__float(v3203) * __float(v3204));
const v3206=v3080;
const v3207=v3206["first_decay"];
const v3208=v3078;
const v3209=v3208["first"];
const v3210=v3198;
let v3211;if(v3210<v3209.length){v3211=v3209[v3210];}else{
v3211=0;}
const v3212=v3211;
const v3213=__bits(__float(v3207) * __float(v3212));
const v3214=1065353216;
const v3215=v3080;
const v3216=v3215["first_decay"];
const v3217=__bits(__float(v3214) - __float(v3216));
const v3218=v3205;
const v3219=__bits(__float(v3217) * __float(v3218));
const v3220=__bits(__float(v3213) + __float(v3219));
const v3221=v3080;
const v3222=v3221["second_decay"];
const v3223=v3078;
const v3224=v3223["second"];
const v3225=v3198;
let v3226;if(v3225<v3224.length){v3226=v3224[v3225];}else{
v3226=0;}
const v3227=v3226;
const v3228=__bits(__float(v3222) * __float(v3227));
const v3229=1065353216;
const v3230=v3080;
const v3231=v3230["second_decay"];
const v3232=__bits(__float(v3229) - __float(v3231));
const v3233=v3205;
const v3234=__bits(__float(v3232) * __float(v3233));
const v3235=v3205;
const v3236=__bits(__float(v3234) * __float(v3235));
const v3237=__bits(__float(v3228) + __float(v3236));
const v3238=v3078;
const v3239=v3238["weights"];
const v3240=v3198;
let v3241;if(v3240<v3239.length){v3241=v3239[v3240];}else{
v3241=0;}
const v3242=v3241;
const v3243=v3220;
const v3244=v3237;
const v3245=v3163;
const v3246=v3171;
const v3247=v3080;
const v3248=__fn32(v3242,v3243,v3244,v3245,v3246,v3247);
const v3249=v3202;
const v3250=v3248;
const v3251=__tempEdit(v3249,"push",v3250);
const v3252=v3196;
const v3253=v3220;
const v3254=__tempEdit(v3252,"push",v3253);
const v3255=v3200;
const v3256=v3237;
const v3257=__tempEdit(v3255,"push",v3256);
const v3258=v3198;
const v3259=1;
const v3260=(((v3258) + (v3259)) >>> 0);
const v3261=v3254;
const v3262=v3260;
const v3263=v3257;
const v3264=v3251;
v3192=({["first"]:v3261,["i"]:v3262,["second"]:v3263,["weights"]:v3264});
}
const v3186=v3192;
const v3266=v3186;
const v3265=v3266["first"];
let v3267;if(v3270&&v3269){v3267=v3268;}else{
const v3271=v3186;
v3267=v3271["i"];if(v3270){v3268=v3267;v3269=true;}}
const v3273=v3186;
const v3272=v3273["second"];
const v3275=v3186;
const v3274=v3275["weights"];
let v3276;if(v3279&&v3278){v3276=v3277;}else{
const v3280=v3274;
const v3281=v3280.freeze();
const v3282=v3265;
const v3283=v3282.freeze();
const v3284=v3272;
const v3285=v3284.freeze();
const v3286=v3078;
const v3287=v3286["steps"];
const v3288=1;
const v3289=(((v3287) + (v3288)) >>> 0);
const v3290=v3163;
const v3291=v3171;
v3276=({["weights"]:v3281,["first"]:v3283,["second"]:v3285,["steps"]:v3289,["first_power"]:v3290,["second_power"]:v3291});if(v3279){v3277=v3276;v3278=true;}}
const v3292=v3276;
const v3293=__fn27(v3292);
const v3294=false;
const v3295=(v3293===v3294);
let v3296;if(v3295){
v3296=({Err:"nonfinite optimizer update"});}else{
v3296=({Ok:v3276});}
v3155=v3296;}
v3105=v3155;}
return v3105;};}
function __prepareFn34(fixed){const v3302=fixed[1];let v3301=false,v3300;
const v3381=fixed[0]&&fixed[1];let v3380=false,v3379;
const v3543=fixed[0]&&fixed[1];let v3542=false,v3541;
const v3599=true;let v3598=false,v3597;
const v3608=fixed[0]&&fixed[1];let v3607=false,v3606;
return function(v3297,v3298){let v3299;if(v3302&&v3301){v3299=v3300;}else{
const v3303=v3298;
const v3304=v3303["context"];
const v3305=v3304["signal"];
const v3306=1065353216;
const v3307=0;
const v3308=0;
const v3309=0;
const v3310=0;
const v3312=v3298;
const v3313=v3312["context"];
const v3314=v3313["urgency"];
const v3315=v3306;
const v3316=v3314;
const v3317=v3316["value"];
const v3318=__bits(__float(v3315) + __float(v3317));
const v3319=v3318;
const v3320=v3307;
const v3321=v3314;
const v3322=v3321["tangent_0"];
const v3323=__bits(__float(v3320) + __float(v3322));
const v3324=v3308;
const v3325=v3314;
const v3326=v3325["tangent_1"];
const v3327=__bits(__float(v3324) + __float(v3326));
const v3328=v3309;
const v3329=v3314;
const v3330=v3329["tangent_2"];
const v3331=__bits(__float(v3328) + __float(v3330));
const v3332=v3310;
const v3333=v3314;
const v3334=v3333["tangent_3"];
const v3335=__bits(__float(v3332) + __float(v3334));
const v3337=v3305;
const v3338=v3337["value"];
const v3339=v3319;
const v3340=__bits(__float(v3338) * __float(v3339));
const v3341=v3340;
const v3342=v3305;
const v3343=v3342["tangent_0"];
const v3344=v3319;
const v3345=__bits(__float(v3343) * __float(v3344));
const v3346=v3305;
const v3347=v3346["value"];
const v3348=v3323;
const v3349=__bits(__float(v3347) * __float(v3348));
const v3350=__bits(__float(v3345) + __float(v3349));
const v3351=v3305;
const v3352=v3351["tangent_1"];
const v3353=v3319;
const v3354=__bits(__float(v3352) * __float(v3353));
const v3355=v3305;
const v3356=v3355["value"];
const v3357=v3327;
const v3358=__bits(__float(v3356) * __float(v3357));
const v3359=__bits(__float(v3354) + __float(v3358));
const v3360=v3305;
const v3361=v3360["tangent_2"];
const v3362=v3319;
const v3363=__bits(__float(v3361) * __float(v3362));
const v3364=v3305;
const v3365=v3364["value"];
const v3366=v3331;
const v3367=__bits(__float(v3365) * __float(v3366));
const v3368=__bits(__float(v3363) + __float(v3367));
const v3369=v3305;
const v3370=v3369["tangent_3"];
const v3371=v3319;
const v3372=__bits(__float(v3370) * __float(v3371));
const v3373=v3305;
const v3374=v3373["value"];
const v3375=v3335;
const v3376=__bits(__float(v3374) * __float(v3375));
const v3377=__bits(__float(v3372) + __float(v3376));
v3299=({["value"]:v3341,["tangent_0"]:v3350,["tangent_1"]:v3359,["tangent_2"]:v3368,["tangent_3"]:v3377});if(v3302){v3300=v3299;v3301=true;}}
let v3378;if(v3381&&v3380){v3378=v3379;}else{
const v3382=v3298;
const v3383=v3382["action"];
const v3384=0;
let v3385;if((v3383===v3384)){
const v3386=v3297;
const v3387=v3386["left_bias"];
const v3388=v3297;
const v3389=v3388["left_slope"];
const v3390=v3299;
const v3391=v3389;
const v3392=v3391["value"];
const v3393=v3390;
const v3394=v3393["value"];
const v3395=__bits(__float(v3392) * __float(v3394));
const v3396=v3395;
const v3397=v3389;
const v3398=v3397["tangent_0"];
const v3399=v3390;
const v3400=v3399["value"];
const v3401=__bits(__float(v3398) * __float(v3400));
const v3402=v3389;
const v3403=v3402["value"];
const v3404=v3390;
const v3405=v3404["tangent_0"];
const v3406=__bits(__float(v3403) * __float(v3405));
const v3407=__bits(__float(v3401) + __float(v3406));
const v3408=v3389;
const v3409=v3408["tangent_1"];
const v3410=v3390;
const v3411=v3410["value"];
const v3412=__bits(__float(v3409) * __float(v3411));
const v3413=v3389;
const v3414=v3413["value"];
const v3415=v3390;
const v3416=v3415["tangent_1"];
const v3417=__bits(__float(v3414) * __float(v3416));
const v3418=__bits(__float(v3412) + __float(v3417));
const v3419=v3389;
const v3420=v3419["tangent_2"];
const v3421=v3390;
const v3422=v3421["value"];
const v3423=__bits(__float(v3420) * __float(v3422));
const v3424=v3389;
const v3425=v3424["value"];
const v3426=v3390;
const v3427=v3426["tangent_2"];
const v3428=__bits(__float(v3425) * __float(v3427));
const v3429=__bits(__float(v3423) + __float(v3428));
const v3430=v3389;
const v3431=v3430["tangent_3"];
const v3432=v3390;
const v3433=v3432["value"];
const v3434=__bits(__float(v3431) * __float(v3433));
const v3435=v3389;
const v3436=v3435["value"];
const v3437=v3390;
const v3438=v3437["tangent_3"];
const v3439=__bits(__float(v3436) * __float(v3438));
const v3440=__bits(__float(v3434) + __float(v3439));
const v3442=v3387;
const v3443=v3442["value"];
const v3444=v3396;
const v3445=__bits(__float(v3443) + __float(v3444));
const v3446=v3445;
const v3447=v3387;
const v3448=v3447["tangent_0"];
const v3449=v3407;
const v3450=__bits(__float(v3448) + __float(v3449));
const v3451=v3387;
const v3452=v3451["tangent_1"];
const v3453=v3418;
const v3454=__bits(__float(v3452) + __float(v3453));
const v3455=v3387;
const v3456=v3455["tangent_2"];
const v3457=v3429;
const v3458=__bits(__float(v3456) + __float(v3457));
const v3459=v3387;
const v3460=v3459["tangent_3"];
const v3461=v3440;
const v3462=__bits(__float(v3460) + __float(v3461));
v3385=({["value"]:v3446,["tangent_0"]:v3450,["tangent_1"]:v3454,["tangent_2"]:v3458,["tangent_3"]:v3462});}else{
const v3463=v3297;
const v3464=v3463["right_bias"];
const v3465=v3297;
const v3466=v3465["right_slope"];
const v3467=v3299;
const v3468=v3466;
const v3469=v3468["value"];
const v3470=v3467;
const v3471=v3470["value"];
const v3472=__bits(__float(v3469) * __float(v3471));
const v3473=v3472;
const v3474=v3466;
const v3475=v3474["tangent_0"];
const v3476=v3467;
const v3477=v3476["value"];
const v3478=__bits(__float(v3475) * __float(v3477));
const v3479=v3466;
const v3480=v3479["value"];
const v3481=v3467;
const v3482=v3481["tangent_0"];
const v3483=__bits(__float(v3480) * __float(v3482));
const v3484=__bits(__float(v3478) + __float(v3483));
const v3485=v3466;
const v3486=v3485["tangent_1"];
const v3487=v3467;
const v3488=v3487["value"];
const v3489=__bits(__float(v3486) * __float(v3488));
const v3490=v3466;
const v3491=v3490["value"];
const v3492=v3467;
const v3493=v3492["tangent_1"];
const v3494=__bits(__float(v3491) * __float(v3493));
const v3495=__bits(__float(v3489) + __float(v3494));
const v3496=v3466;
const v3497=v3496["tangent_2"];
const v3498=v3467;
const v3499=v3498["value"];
const v3500=__bits(__float(v3497) * __float(v3499));
const v3501=v3466;
const v3502=v3501["value"];
const v3503=v3467;
const v3504=v3503["tangent_2"];
const v3505=__bits(__float(v3502) * __float(v3504));
const v3506=__bits(__float(v3500) + __float(v3505));
const v3507=v3466;
const v3508=v3507["tangent_3"];
const v3509=v3467;
const v3510=v3509["value"];
const v3511=__bits(__float(v3508) * __float(v3510));
const v3512=v3466;
const v3513=v3512["value"];
const v3514=v3467;
const v3515=v3514["tangent_3"];
const v3516=__bits(__float(v3513) * __float(v3515));
const v3517=__bits(__float(v3511) + __float(v3516));
const v3519=v3464;
const v3520=v3519["value"];
const v3521=v3473;
const v3522=__bits(__float(v3520) + __float(v3521));
const v3523=v3522;
const v3524=v3464;
const v3525=v3524["tangent_0"];
const v3526=v3484;
const v3527=__bits(__float(v3525) + __float(v3526));
const v3528=v3464;
const v3529=v3528["tangent_1"];
const v3530=v3495;
const v3531=__bits(__float(v3529) + __float(v3530));
const v3532=v3464;
const v3533=v3532["tangent_2"];
const v3534=v3506;
const v3535=__bits(__float(v3533) + __float(v3534));
const v3536=v3464;
const v3537=v3536["tangent_3"];
const v3538=v3517;
const v3539=__bits(__float(v3537) + __float(v3538));
v3385=({["value"]:v3523,["tangent_0"]:v3527,["tangent_1"]:v3531,["tangent_2"]:v3535,["tangent_3"]:v3539});}
v3378=v3385;if(v3381){v3379=v3378;v3380=true;}}
let v3540;if(v3543&&v3542){v3540=v3541;}else{
const v3544=v3378;
const v3545=v3378;
const v3546=v3544;
const v3547=v3546["value"];
const v3548=v3545;
const v3549=v3548["value"];
const v3550=__bits(__float(v3547) * __float(v3549));
const v3551=v3550;
const v3552=v3544;
const v3553=v3552["tangent_0"];
const v3554=v3545;
const v3555=v3554["value"];
const v3556=__bits(__float(v3553) * __float(v3555));
const v3557=v3544;
const v3558=v3557["value"];
const v3559=v3545;
const v3560=v3559["tangent_0"];
const v3561=__bits(__float(v3558) * __float(v3560));
const v3562=__bits(__float(v3556) + __float(v3561));
const v3563=v3544;
const v3564=v3563["tangent_1"];
const v3565=v3545;
const v3566=v3565["value"];
const v3567=__bits(__float(v3564) * __float(v3566));
const v3568=v3544;
const v3569=v3568["value"];
const v3570=v3545;
const v3571=v3570["tangent_1"];
const v3572=__bits(__float(v3569) * __float(v3571));
const v3573=__bits(__float(v3567) + __float(v3572));
const v3574=v3544;
const v3575=v3574["tangent_2"];
const v3576=v3545;
const v3577=v3576["value"];
const v3578=__bits(__float(v3575) * __float(v3577));
const v3579=v3544;
const v3580=v3579["value"];
const v3581=v3545;
const v3582=v3581["tangent_2"];
const v3583=__bits(__float(v3580) * __float(v3582));
const v3584=__bits(__float(v3578) + __float(v3583));
const v3585=v3544;
const v3586=v3585["tangent_3"];
const v3587=v3545;
const v3588=v3587["value"];
const v3589=__bits(__float(v3586) * __float(v3588));
const v3590=v3544;
const v3591=v3590["value"];
const v3592=v3545;
const v3593=v3592["tangent_3"];
const v3594=__bits(__float(v3591) * __float(v3593));
const v3595=__bits(__float(v3589) + __float(v3594));
v3540=({["value"]:v3551,["tangent_0"]:v3562,["tangent_1"]:v3573,["tangent_2"]:v3584,["tangent_3"]:v3595});if(v3543){v3541=v3540;v3542=true;}}
let v3596;if(v3599&&v3598){v3596=v3597;}else{
const v3600=1036831949;
const v3601=0;
const v3602=0;
const v3603=0;
const v3604=0;
v3596=({["value"]:v3600,["tangent_0"]:v3601,["tangent_1"]:v3602,["tangent_2"]:v3603,["tangent_3"]:v3604});if(v3599){v3597=v3596;v3598=true;}}
let v3605;if(v3608&&v3607){v3605=v3606;}else{
const v3609=v3540;
const v3610=v3609["value"];
const v3611=v3596;
const v3612=v3611["value"];
v3605=__bits(__float(v3610) + __float(v3612));if(v3608){v3606=v3605;v3607=true;}}
const v3613=v3605;
const v3614=v3540;
const v3615=v3614["tangent_0"];
const v3616=v3596;
const v3617=v3616["tangent_0"];
const v3618=__bits(__float(v3615) + __float(v3617));
const v3619=v3540;
const v3620=v3619["tangent_1"];
const v3621=v3596;
const v3622=v3621["tangent_1"];
const v3623=__bits(__float(v3620) + __float(v3622));
const v3624=v3540;
const v3625=v3624["tangent_2"];
const v3626=v3596;
const v3627=v3626["tangent_2"];
const v3628=__bits(__float(v3625) + __float(v3627));
const v3629=v3540;
const v3630=v3629["tangent_3"];
const v3631=v3596;
const v3632=v3631["tangent_3"];
const v3633=__bits(__float(v3630) + __float(v3632));
return ({["value"]:v3613,["tangent_0"]:v3618,["tangent_1"]:v3623,["tangent_2"]:v3628,["tangent_3"]:v3633});};}
function __prepareFn35(fixed){const v3639=fixed[0]&&fixed[1];let v3638=false,v3637;
return function(v3634,v3635){let v3636;if(v3639&&v3638){v3636=v3637;}else{
const v3640=v3634;
const v3641=v3640["left_bias"];
const v3642=1065353216;
const v3643=0;
const v3644=0;
const v3645=0;
const v3646=({["value"]:v3641,["tangent_0"]:v3642,["tangent_1"]:v3643,["tangent_2"]:v3644,["tangent_3"]:v3645});
const v3647=v3634;
const v3648=v3647["left_slope"];
const v3649=0;
const v3650=1065353216;
const v3651=0;
const v3652=0;
const v3653=({["value"]:v3648,["tangent_0"]:v3649,["tangent_1"]:v3650,["tangent_2"]:v3651,["tangent_3"]:v3652});
const v3654=v3634;
const v3655=v3654["right_bias"];
const v3656=0;
const v3657=0;
const v3658=1065353216;
const v3659=0;
const v3660=({["value"]:v3655,["tangent_0"]:v3656,["tangent_1"]:v3657,["tangent_2"]:v3658,["tangent_3"]:v3659});
const v3661=v3634;
const v3662=v3661["right_slope"];
const v3663=0;
const v3664=0;
const v3665=0;
const v3666=1065353216;
const v3667=({["value"]:v3662,["tangent_0"]:v3663,["tangent_1"]:v3664,["tangent_2"]:v3665,["tangent_3"]:v3666});
const v3668=({["left_bias"]:v3646,["left_slope"]:v3653,["right_bias"]:v3660,["right_slope"]:v3667});
const v3669=v3635;
const v3670=v3669["context"];
const v3671=v3670["signal"];
const v3672=0;
const v3673=0;
const v3674=0;
const v3675=0;
const v3676=({["value"]:v3671,["tangent_0"]:v3672,["tangent_1"]:v3673,["tangent_2"]:v3674,["tangent_3"]:v3675});
const v3677=v3635;
const v3678=v3677["context"];
const v3679=v3678["urgency"];
const v3680=0;
const v3681=0;
const v3682=0;
const v3683=0;
const v3684=({["value"]:v3679,["tangent_0"]:v3680,["tangent_1"]:v3681,["tangent_2"]:v3682,["tangent_3"]:v3683});
const v3685=({["signal"]:v3676,["urgency"]:v3684});
const v3686=v3635;
const v3687=v3686["action"];
const v3688=({["context"]:v3685,["action"]:v3687});
v3636=__fn34(v3668,v3688);if(v3639){v3637=v3636;v3638=true;}}
const v3689=v3636;
const v3690=v3689["tangent_0"];
const v3691=v3636;
const v3692=v3691["tangent_1"];
const v3693=v3636;
const v3694=v3693["tangent_2"];
const v3695=v3636;
const v3696=v3695["tangent_3"];
return ({["left_bias"]:v3690,["left_slope"]:v3692,["right_bias"]:v3694,["right_slope"]:v3696});};}
const __preparedFactories=new Map([[3,__prepareFn3],[5,__prepareFn5],[11,__prepareFn11],[14,__prepareFn14],[15,__prepareFn15],[17,__prepareFn17],[18,__prepareFn18],[19,__prepareFn19],[21,__prepareFn21],[23,__prepareFn23],[24,__prepareFn24],[28,__prepareFn28],[31,__prepareFn31],[33,__prepareFn33],[34,__prepareFn34],[35,__prepareFn35]]);
const __namedTypes={"Acted":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}}],"kind":"record","name":"Acted"},"AgentState":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"},"Context":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"},"Input":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"},"Pending":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"Weights":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"},"__ink_differential_0":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_0"},"__ink_differential_2":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"},"__ink_differential_4":{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"},"__ink_differential_5":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"},"__ink_differential_6":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_17":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"out","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_17"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_36":{"fields":[{"name":"accumulated","type":{"kind":"f32"}},{"name":"found","type":{"kind":"bool"}},{"name":"i","type":{"kind":"u32"}},{"name":"selected","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_36"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_5":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"f32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_5"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_52":{"fields":[{"name":"correction","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_52"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_70":{"fields":[{"name":"accumulator","type":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_70"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_85":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"next","type":{"kind":"f32"}},{"name":"reversed","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_85"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_97":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"out","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_97"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}};
// Portable snapshot ABI shared with native/Wasm. Hashing uses Web Crypto.
function __snapshotLimits(limits={}){
 const result={bytes:64*1024*1024,values:1000000,depth:128,...limits};
 for(const k of ['bytes','values','depth'])if(!Number.isSafeInteger(result[k])||result[k]<0||result[k]>(k==='depth'?128:k==='values'?1000000:64*1024*1024))throw Error('invalid snapshot limits');
 return result;
}
const __hash=async bytes=>new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
function __snapshotWriter(limits){
 const out=[];let left=limits.values,maxDepth=0;
 function bytes(xs){if(xs.length>limits.bytes-out.length)throw Error('snapshot byte limit exceeded');for(const x of xs)out.push(x);}
 function integer(n,size){n=BigInt(n);for(let i=0;i<size;i++){bytes([Number(n&255n)]);n>>=8n;}}
 function raw(xs){integer(xs.length,8);bytes(xs);}
 function value(v,t,depth=0,bindings=[]){maxDepth=Math.max(maxDepth,depth);if(--left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');switch(t.kind){
  case 'bind':bindings.push([t.name,t.body]);try{value(v,t.body,depth+1,bindings);}finally{bindings.pop();}break;
  case 'ref':{const bound=bindings.findLast(([name])=>name===t.name);if(!bound)throw Error('unbound recursive snapshot schema');value(v,bound[1],depth+1,bindings);break;}
  case 'unit':break;case 'bool':bytes([v?1:0]);break;
  case 'u32':case 'i32':case 'f32':integer(v,4);break;case 'u64':integer(v,8);break;
  case 'vector':if(v.length!==t.size)throw Error('vector dimension mismatch');for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'int':{let n=v<0n?-v:v;const xs=[];while(n){if(xs.length>=4096)throw Error('snapshot Int exceeds size limit');xs.push(Number(n&255n));n>>=8n;}bytes([v===0n?0:v>0n?1:2]);raw(xs);break;}
  case 'string':raw(__encoder.encode(v));break;
  case 'id':integer(BigInt('0x'+v),16);break;
  case 'enum':integer(t.variants.indexOf(v),4);break;
  case 'record':for(const f of t.fields)value(t.elided?v:v[f.name],f.type,depth+1,bindings);break;
  case 'list':if(v.length>left)throw Error('snapshot value limit exceeded');integer(v.length,8);for(const x of v)value(x,t.element,depth+1,bindings);break;
  case 'option':if(Object.hasOwn(v,'Some')){bytes([1]);value(v.Some,t.element,depth+1,bindings);}else bytes([0]);break;
  case 'result':{const branch=t.sum_key?__sumView(t.sum_key,v):v;if(Object.hasOwn(branch,'Ok')){bytes([0]);value(branch.Ok,t.ok,depth+1,bindings);}else{bytes([1]);value(branch.Err,t.error,depth+1,bindings);}break;}
  default:throw Error('unsupported snapshot type');
 }}
 return {bytes,integer,raw,value,charge(cells,depth){left-=cells;if(left<0||depth>limits.depth)throw Error('snapshot value/depth limit exceeded');},get maxDepth(){return maxDepth;},get left(){return left;},finish:()=>new Uint8Array(out)};
}
async function __snapshotEncode(meta,state,options){
 const limits=__snapshotLimits(options),w=__snapshotWriter(limits);
 w.integer(state.version,8);
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const rows=[...state.tables[r.index].entries()].sort((a,b)=>__keyCompare(a[0],b[0],r.key));if(rows.length>Math.floor(w.left/2))throw Error('snapshot row limit exceeded');w.integer(rows.length,8);for(const [k,v]of rows){
  if(!meta.snapshotRows){w.value(k,r.snapshotKey??r.key);w.value(v,r.snapshotValue??r.value);continue;}
  const cache=state.snapshotRows[r.index];let packed=cache.get(k);
  if(!packed){const row=__snapshotWriter(limits);row.value(k,r.snapshotKey??r.key);row.value(v,r.snapshotValue??r.value);packed={bytes:row.finish(),cells:limits.values-row.left,depth:row.maxDepth};cache.set(k,packed);}
  w.charge(packed.cells,packed.depth);w.bytes(packed.bytes);
 }}
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
  case 'record':if(t.elided)return value(t.fields[0].type,depth+1,bindings);return Object.fromEntries(t.fields.map(f=>[f.name,value(f.type,depth+1,bindings)]));
  case 'list':{const n=sequence(),xs=[];for(let i=0;i<n;i++)xs.push(value(t.element,depth+1,bindings));return xs;}
  case 'option':{const tag=take(1)[0];if(tag===0)return {None:null};if(tag===1)return {Some:value(t.element,depth+1,bindings)};throw Error('invalid Option tag');}
  case 'result':{const tag=take(1)[0];if(tag===0){const child=value(t.ok,depth+1,bindings);return t.sum_key?__sumMake(t.sum_key,true,child):{Ok:child};}if(tag===1){const child=value(t.error,depth+1,bindings);return t.sum_key?__sumMake(t.sum_key,false,child):{Err:child};}throw Error('invalid Result tag');}
  default:throw Error('unsupported snapshot type');
 }}
 const version=integer(8),tables=meta.roots.map(()=>new Map());
 const roots=meta.roots.map((r,i)=>({...r,index:i})).sort((a,b)=>a.name<b.name?-1:1);
 for(const r of roots){const n=sequence();if(n>Math.floor(left/2))throw Error('snapshot row limit exceeded');let prior;for(let i=0;i<n;i++){const k=value(r.snapshotKey??r.key),v=value(r.snapshotValue??r.value);if(i&&__keyCompare(prior,k,r.key)>=0)throw Error('duplicate or unordered snapshot key');tables[r.index].set(k,v);prior=k;}}
 const count=sequence(),outbox=[];let prior;
 for(let i=0;i<count;i++){const commit=integer(8),position=integer(8),channel=Number(integer(4));if(!meta.events[channel])throw Error('unknown snapshot event channel');const v=value(meta.events[channel].snapshotType??meta.events[channel].type);if(commit===0n||commit>version||(prior&&(commit<prior.commit||(commit===prior.commit&&position<=prior.position))))throw Error('invalid snapshot event sequence');const e={commit,position,channel:meta.events[channel].name,value:v};outbox.push(e);prior=e;}
 if(at!==end)throw Error('trailing snapshot payload');return {version,tables,outbox};
}
// Fixed subscription lifecycle. Root/output edges derive from checked source;
// values and ownership codecs are compiled from each query's declared type.
function __createObservers(prepare){
 const subscriptions=new Map(),byRoot=new Map(),errors=[],directRoots=[],rootSchedules=[];
 let pending=[],spare=[];
 let next=0,held=0,flushing=false;
 function report(s,error,phase){errors.push({query:s?.query??null,error,phase});if(s?.onError)try{s.onError(error);}catch(e){errors.push({query:s.query,error:e,phase:'error-handler'});}}
 function flush(initialPasses=0){
  if(held||flushing||!pending.length)return;
  flushing=true;let passes=initialPasses;
  try{
   while(pending.length&&!held){
    if(++passes>1024){report(null,Error('subscription publication budget exhausted'),'publication');break;}
    const affected=pending;pending=spare;spare=affected;
    for(const s of affected)s.queued=false;
    // Snapshot every affected value before consumers run. Deliveries reside in
    // the stable subscription slots; no per-delivery tuple is allocated.
    for(const s of affected){if(!s.active)continue;s.deliver=false;
     try{if(s.pair){const a=s.pairState?s.pairState.keeps[s.keep0]:s.read0(),b=s.pairState?s.pairState.keeps[s.keep1]:s.read1();if(s.value0!==a||s.value1!==b){s.value0=a;s.value1=b;s.delivery0=a;s.delivery1=b;s.deliver=true;}}else{const value=s.capture(s.read());if(!s.equal(s.value,value)){s.value=value;s.delivery=value;s.deliver=true;}}}
     catch(e){report(s,e,'query');}
    }
    for(const s of affected){if(!s.active||!s.deliver)continue;const value=s.delivery;s.deliver=false;s.delivery=undefined;
     try{if(s.pair)s.callback(s.delivery0,s.delivery1);else s.callback(s.output(value));}catch(e){report(s,e,'listener');}
    }
    affected.length=0;
   }
  }finally{flushing=false;}
 }
 function install(query,q,callback,{immediate=true,onError}={}){
  if(typeof callback!=='function'||onError!==undefined&&typeof onError!=='function')throw TypeError('subscription callback');
  const s={...q,id:next++,query,callback,onError,active:true,queued:false,deliver:false,delivery:undefined};
  if(s.pair){s.value0=s.pairState?s.pairState.keeps[s.keep0]:s.read0();s.value1=s.pairState?s.pairState.keeps[s.keep1]:s.read1();}else{s.value=s.capture(s.read());}subscriptions.set(s.id,s);
  for(const root of s.roots){let ids=byRoot.get(root);if(!ids)byRoot.set(root,ids=[]);ids.push(s);schedule(root,ids);}
  const dispose=()=>{if(!subscriptions.delete(s.id))return;s.active=false;for(const root of s.roots){const ids=byRoot.get(root);ids.splice(ids.indexOf(s),1);schedule(root,ids);if(!ids.length)byRoot.delete(root);}};
  if(immediate)try{if(s.pair)callback(s.value0,s.value1);else callback(s.output(s.value));}catch(e){dispose();throw e;}
  return dispose;
 }
 // Bind the publication implementation when consumers change, instead of
 // rediscovering the one-consumer schedule on each source mutation.
 function schedule(root,ids){
  const s=directRoots[root]=ids.length===1&&ids[0].pairState?ids[0]:null;
  rootSchedules[root]=!ids.length?null:s?()=>publishPair(s):(outputs,epoch)=>{enqueueRoot(root,outputs,epoch);flush();};
 }
 function publishPair(s){
  const a=s.pairState.keeps[s.keep0],b=s.pairState.keeps[s.keep1];
  if(s.value0===a&&s.value1===b)return;
  if(!held&&!flushing&&!pending.length){
   s.value0=a;s.value1=b;flushing=true;
   try{s.callback(a,b);}catch(e){report(s,e,'listener');}finally{flushing=false;}
   flush(1);return;
  }
  if(!s.queued){s.queued=true;pending.push(s);}flush();
 }
 function enqueueRoot(root,outputs,epoch){
  const slots=byRoot.get(root);if(!slots)return;
  for(let i=0;i<slots.length;i++){
   const s=slots[i];if(s.queued)continue;
   if(outputs!==null&&s.outputs?.length){
    let changed=false;for(let j=0;j<s.outputs.length;j++)if(epoch?outputs[s.outputs[j]]===epoch:outputs.has(s.outputs[j])){changed=true;break;}
    if(!changed)continue;
   }
   s.queued=true;pending.push(s);
  }
 }
 return {
  directRoots,rootSchedules,
  get active(){return subscriptions.size!==0;},
  subscribe(query,args,callback,options){return install(query,prepare(query,args),callback,options);},
  subscribeGroup(queries,callback,options){
   if(!Array.isArray(queries)||!queries.length)throw TypeError('subscription group requires queries');
   const qs=queries.map(q=>typeof q==='string'?prepare(q,[]):prepare(q.query,q.args??[]));
   const roots=[...new Set(qs.flatMap(q=>q.roots))];
   // An unknown dependency forces ordinary root invalidation for the group.
   const outputs=qs.every(q=>q.outputs?.length)?[...new Set(qs.flatMap(q=>q.outputs))]:[];
   const scalar=qs.every(q=>q.scalar),direct=qs.every(q=>q.direct);
   return install(queries,{roots,outputs,read:direct?()=>qs.map(q=>q.direct()):()=>qs.map(q=>q.read()),capture:scalar?values=>values:values=>values.map((v,i)=>qs[i].capture(v)),output:scalar?values=>values.slice():values=>values.map((v,i)=>qs[i].output(v)),equal:scalar?(a,b)=>a.every((v,i)=>v===b[i]):(a,b)=>a.every((v,i)=>qs[i].equal(v,b[i]))},callback,options);
  },
  subscribeValues(queries,callback,options){
   if(!Array.isArray(queries)||!queries.length)throw TypeError('subscription group requires queries');
   if(typeof callback!=='function')throw TypeError('subscription callback');
   const qs=queries.map(q=>typeof q==='string'?prepare(q,[]):prepare(q.query,q.args??[]));
   if(qs.length===2&&qs.every(q=>q.scalar)){
    const roots=[...new Set(qs.flatMap(q=>q.roots))],outputs=qs.every(q=>q.outputs?.length)?[...new Set(qs.flatMap(q=>q.outputs))]:[];
    const pairState=qs[0].committed&&qs[1].committed&&qs[0].committed.state===qs[1].committed.state?qs[0].committed.state:null;
    return install(queries,{roots,outputs,pair:true,pairState,keep0:qs[0].committed?.keep,keep1:qs[1].committed?.keep,read0:qs[0].direct||qs[0].read,read1:qs[1].direct||qs[1].read},callback,options);
   }
   return this.subscribeGroup(queries,values=>callback(...values),options);
  },
  commit(roots,outputs=null){
   if(!subscriptions.size)return;
   for(const root of roots)enqueueRoot(root,outputs,false);
   flush();
  },
  // A checked single-root action supplies a reusable array of changed outputs.
  // No root carrier, Set, affected-ID array or Map lookup per delivery is needed.
  commitRoot(root,outputs=null,epoch=0){
   rootSchedules[root]?.(outputs,epoch);
  },
  hold(){held++;return pending.slice();},
  release(){if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  rollback(mark){for(const s of pending)s.queued=false;pending.length=0;for(const s of mark)if(s.active&&!s.queued){s.queued=true;pending.push(s);}if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  batch(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('batch callback must be synchronous');held++;
   try{const value=callback();if(value&&typeof value.then==='function')throw TypeError('state batch callback must be synchronous');return value;}
   finally{held--;flush();}
  },
  flush,takeErrors(){return errors.splice(0);}
 };
}
function __versionWord(v){return typeof v==='number'?BigInt(v):v;}
function __storedCommit(meta,v){return meta.compactCommits&&v<=9007199254740991n?Number(v):v;}
function __nextCommit(v){return typeof v==='number'&&v<9007199254740991?v+1:BigInt(v)+1n;}
// Private column event log. Public records and portable event ordering are unchanged.
// Private event storage. Public events and portable snapshots keep their ordinary
// ordered records. A selected contiguous run omits repeated commit metadata;
// gaps and duplicate commits materialise an exact literal column.
class __EventColumns {
 constructor(channels,compact=false,runs=false){this.channels=channels;this.compact=compact;this.runs=runs;this.commits=runs?null:[];this.base=undefined;this.values=[];this.positions=null;this.channelValues=channels.length===1?null:[];}
 get length(){return this.values.length;}
 set length(n){if(!Number.isSafeInteger(n)||n<0||n>this.length)throw Error('event log truncate');if(this.commits)this.commits.length=n;this.values.length=n;if(this.positions)this.positions.length=n;if(this.channelValues)this.channelValues.length=n;if(n===0){this.base=undefined;if(this.runs)this.commits=null;}}
 append(commit,position,channel,value){
  const i=this.values.length;
  if(this.commits)this.commits.push(commit);
  else if(!i)this.base=commit;
  else{
   const small=typeof this.base==='number'&&typeof commit==='number';
   const expected=small?this.base+i:__versionWord(this.base)+BigInt(i);
   if(expected!==commit){
    this.commits=[];
    for(let j=0;j<i;j++){const word=__versionWord(this.base)+BigInt(j);this.commits.push(this.compact&&word<=9007199254740991n?Number(word):word);}
    this.commits.push(commit);
   }
  }
  this.values.push(value);if(this.channelValues)this.channelValues.push(channel);if(position!==0n&&!this.positions)this.positions=new Array(i).fill(0n);if(this.positions)this.positions.push(position);
 }
 push(e){this.append(this.compact&&e.commit<=9007199254740991n?Number(e.commit):e.commit,e.position,e.channel,e.value);return this.length;}
 at(i){if(i<0)i+=this.length;if(i<0||i>=this.length)return undefined;return {commit:this.commits?__versionWord(this.commits[i]):__versionWord(this.base)+BigInt(i),position:this.positions?this.positions[i]:0n,channel:this.channelValues?this.channelValues[i]:this.channels[0],value:this.values[i]};}
 *[Symbol.iterator](){for(let i=0;i<this.length;i++)yield this.at(i);}
 map(f){const out=new Array(this.length);for(let i=0;i<this.length;i++)out[i]=f(this.at(i),i);return out;}
 filter(f){const out=new __EventColumns(this.channels,this.compact,this.runs);for(let i=0;i<this.length;i++){const e=this.at(i);if(f(e,i))out.push(e);}return out;}
}
function __eventLog(meta,events=[]){
 if(!meta.eventColumns)return meta.compactCommits?events.map(e=>({...e,commit:__storedCommit(meta,e.commit)})):events;
 const log=new __EventColumns(meta.events.map(e=>e.name),meta.compactCommits,meta.eventRuns);for(const e of events)log.append(__storedCommit(meta,e.commit),e.position,e.channel,e.value);return log;
}
// CALLER CONTRACT: arguments must match declared types; malformed data may throw or corrupt state.
// Fixed state primitives used by emitted action bodies, without an AST evaluator.
class __Abort {constructor(value){this.value=value;}}
function __preflightError(message){throw Error(message);}
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
 if(type.kind==='string'){let i=0,j=0;while(i<a.length&&j<b.length){const x=a.codePointAt(i),y=b.codePointAt(j);if(x!==y)return x-y;i+=x>65535?2:1;j+=y>65535?2:1;}return (i<a.length?1:0)-(j<b.length?1:0);}
 return a<b?-1:a>b?1:0;
}
// A table's ordered key view is reused until membership changes. Values are
// fetched at traversal time, so replacement never leaves stale row payloads.
const __tableOrder=new WeakMap();
function __keyPosition(keys,key,type){let low=0,high=keys.length;while(low<high){const middle=(low+high)>>>1;if(__keyCompare(keys[middle],key,type)<0)low=middle+1;else high=middle;}return low;}
function __tableMembership(rt,index,key,present){
 const view=__tableOrder.get(rt.tables[index]);if(!view)return;
 const at=__keyPosition(view.keys,key,rt.meta.roots[index].key);
 if((at<view.keys.length&&view.keys[at]===key)===present)view.pending.delete(key);
 else view.pending.set(key,present);
}
function __orderedKeys(rt,index){
 const table=rt.tables[index],type=rt.meta.roots[index].key;let view=__tableOrder.get(table);
 if(!view){view={keys:[...table.keys()].sort((a,b)=>__keyCompare(a,b,type)),pending:new Map()};__tableOrder.set(table,view);}
 if(view.pending.size){
  const changes=[...view.pending.keys()].sort((a,b)=>__keyCompare(a,b,type)),merged=[];let i=0,j=0;
  while(i<view.keys.length||j<changes.length){
   if(j===changes.length||(i<view.keys.length&&__keyCompare(view.keys[i],changes[j],type)<0))merged.push(view.keys[i++]);
   else{const key=changes[j++];if(i<view.keys.length&&view.keys[i]===key)i++;if(view.pending.get(key))merged.push(key);}
  }
  view.keys=merged;view.pending.clear();
 }
 const keys=view.keys;
 const cell=rt.cell;
 if(cell&&cell.index===index&&table.has(cell.key)!==(cell.next!==undefined)){
  if(cell.next===undefined)return keys.filter(k=>k!==cell.key);
  const at=__keyPosition(keys,cell.key,type);return [...keys.slice(0,at),cell.key,...keys.slice(at)];
 }
 return keys;
}
function __cellGet(rt,index,key){const cell=rt.cell;return cell&&cell.index===index&&cell.key===key?cell.next:rt.tables[index].get(key);}
function __readTable(rt,index){const cell=rt.cell;if(!cell||cell.index!==index)return rt.tables[index];const table=new Map(rt.tables[index]);if(cell.next===undefined)table.delete(cell.key);else table.set(cell.key,cell.next);return table;}
// The first before-image of each cell suffices for whole-transaction rollback.
function __remember(rt,index,key,present,value){if(rt.cellMode)return;if(!rt.seen[index].has(key)){rt.seen[index].add(key);rt.undo.push([index,key,present,value]);}}
// Only scalar keeps are retained. Reverse edges come from checked source effects.
// Before-images preserve cached values across failed actions; host rollback and
// restore discard caches rather than serializing them into logical snapshots.
function __invalidateKeeps(rt,index){
 if(rt.observers?.active)rt.changedRoots.add(index);
 if(!rt.keeps||rt.cellMode)return;
 for(const keep of rt.meta.keepInvalidations[index]){
  if(!rt.keepDirty[keep]){rt.keepDirty[keep]=1;rt.keepUndoIndices[rt.keepUndoCount++]=keep;rt.keepBefore[keep]=rt.keeps[keep];}
  rt.keeps[keep]=undefined;
 }
}
function __restoreKeeps(rt){for(let i=rt.keepUndoCount-1;i>=0;i--){const keep=rt.keepUndoIndices[i];rt.keeps[keep]=rt.keepBefore[keep];}__refreshActiveViews(rt);}
function __clearKeepJournal(rt){for(let i=0;i<rt.keepUndoCount;i++){const keep=rt.keepUndoIndices[i];rt.keepDirty[keep]=0;rt.keepBefore[keep]=undefined;}rt.keepUndoCount=0;}
function __rebuildViews(rt){
 rt.activeViewRoots=new Uint8Array(rt.meta.roots.length);
 for(const view of rt.views){rt.keeps[view.keep]=undefined;if(!rt.meta.lazyMaintenance)__viewBase(rt,view);}
}
function __refreshActiveViews(rt){rt.activeViewRoots.fill(0);for(const view of rt.views)if(rt.keeps[view.keep]!==undefined)rt.activeViewRoots[view.root]=1;}
function __viewBase(rt,view){
 if(rt.keeps[view.keep]===undefined){let value=view.zero;for(const [key,row]of rt.tables[view.root])value=view.combine(value,view.contribution(key,row));rt.keeps[view.keep]=value;rt.activeViewRoots[view.root]=1;}
 return rt.keeps[view.keep];
}
function __viewValue(view,value,key,oldValue,newValue){
 if(oldValue===undefined)return view.insert?view.insert(value,key,newValue):view.combine(value,view.contribution(key,newValue));
 if(newValue===undefined)return view.remove?view.remove(value,key,oldValue):view.combine(value,view.inverse(view.contribution(key,oldValue)));
 return view.replace?view.replace(value,key,oldValue,newValue):view.combine(view.combine(value,view.inverse(view.contribution(key,oldValue))),view.contribution(key,newValue));
}
function __updateViews(rt,index,key,oldValue,newValue){
 if(!rt.activeViewRoots[index])return null;
 const updates=rt.viewNext;
 for(const view of rt.viewsByRoot[index])updates[view.keep]=rt.keeps[view.keep]===undefined?undefined:__viewValue(view,rt.keeps[view.keep],key,oldValue,newValue);
 return updates;
}
function __installViews(rt,updates,index){if(updates)for(const view of rt.viewsByRoot[index])rt.keeps[view.keep]=updates[view.keep];}
function __pendingView(rt,view){
 const keep=view.keep;
 if(rt.pendingValues[keep]===undefined){
  const cell=rt.cell;
  rt.pendingValues[keep]=__viewValue(view,__viewBase(rt,view),cell.key,cell.prior,cell.next);
  rt.pendingIndices.push(keep);
 }
 return rt.pendingValues[keep];
}
function __prepareCell(rt){if(rt.cell&&rt.activeViewRoots[rt.cell.index]){const prepare=rt.views.prepareRoots?.[rt.cell.index];if(prepare)prepare(rt,rt.cell);else for(const view of rt.viewsByRoot[rt.cell.index])if(rt.keeps[view.keep]!==undefined)__pendingView(rt,view);}}
function __invalidateSnapshotRow(rt,index,key){rt.snapshotRows?.[index].delete(key);}
function __writeCell(rt,index,key,next,prior){
 if(rt.cellMode){if(rt.cell)throw Error('checked single-cell bound exceeded');rt.cell={index,key,next,prior};}
 else{const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);if(rt.changeTracking)__recordChange(rt,index,key,prior,next);if((prior!==undefined)!==(next!==undefined))__tableMembership(rt,index,key,next!==undefined);if(next===undefined)table.delete(key);else table.set(key,next);}
}
function __commitCell(rt){
 const cell=rt.cell;if(!cell)return;
 const table=rt.tables[cell.index];__invalidateSnapshotRow(rt,cell.index,cell.key);
 if(rt.changeTracking)__recordChange(rt,cell.index,cell.key,cell.prior,cell.next);
 if((cell.prior!==undefined)!==(cell.next!==undefined))__tableMembership(rt,cell.index,cell.key,cell.next!==undefined);
 if(cell.next===undefined)table.delete(cell.key);else table.set(cell.key,cell.next);
 for(const keep of rt.meta.keepInvalidations[cell.index])rt.keeps[keep]=rt.pendingValues[keep];
 rt.cell=null;
}
// Preflight scratch has no logical state or rollback obligations. Definitions
// are the same admitted group operations used by ordinary cell maintenance.
function __prepareDirect(rt,index,key,prior,next){
 const prepare=rt.views.directRoots?.[index];
 if(prepare)prepare(rt,key,prior,next);
 else for(const view of rt.viewsByRoot[index])rt.viewNext[view.keep]=__viewValue(view,rt.keeps[view.keep],key,prior,next);
}
function __storeDirect(rt,index,key,prior,next,slot){
 const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);
 if((prior!==undefined)!==(next!==undefined))__tableMembership(rt,index,key,next!==undefined);
 if(rt.changeTracking)__recordChange(rt,index,key,prior,next);
 if(slot===undefined){if(next===undefined)table.delete(key);else table.set(key,next);}
 else{
  // The checked preflight lookup retains the dense slot until this commit.
  // No callback or source write can intervene; sparse keys retain exact identity.
  if(slot<0){if(next===undefined)table.sparse.delete(key);else table.sparse.set(key,next);}else table.dense[slot]=next;
  if(prior===undefined&&next!==undefined)table.members.add(key);else if(prior!==undefined&&next===undefined)table.members.delete(key);
 }
}
function __commitDirect(rt,index,key,prior,next,slot){
 __storeDirect(rt,index,key,prior,next,slot);
 const publishOutputs=rt.meta.outputPublication&&!rt.observers.directRoots[index]&&rt.observers.active;
 if(publishOutputs&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}

 for(const keep of rt.meta.keepInvalidations[index]){
  const value=rt.viewByKeep[keep]?rt.viewNext[keep]:undefined;
  if(publishOutputs)rt.changedOutputs[keep]=rt.keeps[keep]!==value?rt.changedOutputEpoch:0;
  rt.keeps[keep]=value;
 }
}
function __emit(rt,channel,value){
 if(rt.eventCount++===0){rt.eventChannel=channel;rt.eventValue=value;}
 else rt.staged.push([channel,value]);
}
// Checked prefix capacities are at most 2^20. Number conversion is exact
// inside that prefix; rounding a wide word cannot move it into the prefix.
// Wide keys retain their original full-width value in the sparse fallback.
class __DenseTable{
 constructor(capacity){this.limit=capacity;this.dense=[];for(let i=0;i<capacity;i++)this.dense.push(undefined);this.sparse=new Map();this.members=new Set();}
 clear(){this.dense.fill(undefined);this.sparse.clear();this.members.clear();__tableOrder.delete(this);return this;}
 slot(key){const i=Number(key);return Number.isInteger(i)&&i>=0&&i<this.limit?i:-1;}
 get size(){return this.members.size;}
 get(key){const i=this.slot(key);return i<0?this.sparse.get(key):this.dense[i];}
 has(key){return this.get(key)!==undefined;}
 set(key,value){const i=this.slot(key),present=i<0?this.sparse.has(key):this.dense[i]!==undefined;if(i<0)this.sparse.set(key,value);else this.dense[i]=value;if(!present)this.members.add(key);return this;}
 delete(key){const i=this.slot(key);if(i<0)this.sparse.delete(key);else this.dense[i]=undefined;return this.members.delete(key);}
 keys(){return this.members.keys();}
 *values(){for(const key of this.members)yield this.get(key);}
 *entries(){for(const key of this.members)yield [key,this.get(key)];}
 [Symbol.iterator](){return this.entries();}
}
class __ColumnTable {
 constructor(root){
  this.limit=root.columnPrefix.capacity;this.keyBig=root.key.kind==='u64';
  this.fields=root.value.fields;this.exactNumbers=root.columnPrefix.exactNumbers;
  this.present=new Uint8Array(this.limit);this.count=0;this.sparse=new Map();
  this.lanes=this.fields.map(f=>f.type.kind==='u64'?(this.exactNumbers?new Float64Array(this.limit):new BigUint64Array(this.limit)):f.type.kind==='i32'?new Int32Array(this.limit):f.type.kind==='bool'?new Uint8Array(this.limit):new Uint32Array(this.limit));
  this.wide=this.fields.map(f=>f.type.kind==='u64'&&this.exactNumbers?new Map():null);
 }
 slot(key){const i=Number(key);return Number.isInteger(i)&&i>=0&&i<this.limit?i:-1;}
 get size(){return this.count+this.sparse.size;}
 has(key){const i=this.slot(key);return i<0?this.sparse.has(key):this.present[i]!==0;}
 get(key){const i=this.slot(key);if(i<0)return this.sparse.get(key);if(!this.present[i])return undefined;const row=Object.create(null);for(let j=0;j<this.fields.length;j++){const f=this.fields[j],v=this.lanes[j][i];row[f.name]=f.type.kind==='bool'?v!==0:f.type.kind==='u64'&&this.exactNumbers?(this.wide[j].get(i)??BigInt(v)):v;}return row;}
 set(key,row){const i=this.slot(key);if(i<0){this.sparse.set(key,row);return this;}for(let j=0;j<this.fields.length;j++){const f=this.fields[j],v=row[f.name];if(f.type.kind==='u64'&&this.exactNumbers){if(v<=9007199254740991n){this.lanes[j][i]=Number(v);this.wide[j].delete(i);}else{this.lanes[j][i]=0;this.wide[j].set(i,v);}}else this.lanes[j][i]=f.type.kind==='bool'?Number(v):v;}if(!this.present[i]){this.present[i]=1;this.count++;}return this;}
 delete(key){const i=this.slot(key);if(i<0)return this.sparse.delete(key);if(!this.present[i])return false;this.present[i]=0;this.count--;for(const wide of this.wide)wide?.delete(i);return true;}
 *keys(){for(let i=0;i<this.limit;i++)if(this.present[i])yield this.keyBig?BigInt(i):i;yield* this.sparse.keys();}
 *values(){for(const key of this.keys())yield this.get(key);}
 *entries(){for(const key of this.keys())yield [key,this.get(key)];}
 [Symbol.iterator](){return this.entries();}
}
function __newTables(meta,prefixes,old,spares){return meta.roots.map((root,i)=>{const prior=spares?.[i];const t=root.columnPrefix?new __ColumnTable(root):prefixes[i]?(prior instanceof __DenseTable&&prior.limit===prefixes[i]?prior.clear():new __DenseTable(prefixes[i])):new Map();if(old)for(const [k,v]of old[i])t.set(k,v);return t;});}
// Only inactive containers are reused. Consume the spare before preparation so
// a failed invariant/rebuild cannot expose its partially reconstructed contents.
// Rows remain immutable; the current logical state changes only at installation.
function __restoreTables(rt,prefixes,old){const spares=rt.restoreSpares;rt.restoreSpares=null;return __newTables(rt.meta,prefixes,old,spares);}
function __cachedKeep(ctx,rt,index,compute){
 if(rt.cell&&rt.meta.keepInvalidations[rt.cell.index].includes(index)){
  const view=rt.viewByKeep[index];
  if(view)return __pendingView(rt,view);
  if(rt.pendingValues[index]===undefined){rt.pendingValues[index]=compute(ctx,rt);rt.pendingIndices.push(index);}
  return rt.pendingValues[index];
 }
 const prior=rt.keeps[index];if(prior!==undefined)return prior;
 const view=rt.viewByKeep[index];if(view)return __viewBase(rt,view);
 const value=compute(ctx,rt);rt.keeps[index]=value;return value;
}
function __tableContains(rt,index,key){return __cellGet(rt,index,key)!==undefined;}
function __tableGet(rt,index,key){const value=__cellGet(rt,index,key);return value===undefined?{None:null}:{Some:value};}
function __tablePut(rt,index,key,next,mode=0){
 const prior=rt.tables[index].get(key),present=prior!==undefined;
 if(mode===1&&present)throw Error('insert key already present');
 if(mode===2&&!present)throw Error('replace key absent');
 if(present&&__stateRootEquals[index](prior,next))return null;
 const updates=rt.cellMode?null:__updateViews(rt,index,key,prior,next);
 __invalidateKeeps(rt,index);__remember(rt,index,key,present,prior);
 __writeCell(rt,index,key,next,prior);__installViews(rt,updates,index);return null;
}
function __tableRemove(rt,index,key){
 const value=rt.tables[index].get(key);
 if(value===undefined)return {None:null};
 const updates=rt.cellMode?null:__updateViews(rt,index,key,value,undefined);
 __invalidateKeeps(rt,index);__remember(rt,index,key,true,value);
 __writeCell(rt,index,key,undefined,value);__installViews(rt,updates,index);return {Some:value};
}
function __table(rt,index,method,args){
 const key=args[0];
 if(method==='get')return __tableGet(rt,index,key);
 if(method==='contains')return __tableContains(rt,index,key);
 const table=rt.tables[index];
 if(method==='values'||method==='keys'){const keys=__orderedKeys(rt,index);return method==='keys'?keys.slice():keys.map(k=>__cellGet(rt,index,k));}
 if(method==='intersect_table'){const current=__readTable(rt,index),other=__readTable(rt,args[0]),small=current.size<=other.size?current:other,large=small===current?other:current;const result=[];for(const k of small.keys())if(large.has(k))result.push(k);return result.sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));}
 if(method==='intersect_keys'){const requested=args[0],size=rt.tables[index].size;
  // Fewer requested keys than rows: look each one up instead of scanning.
  if(requested.length<size){const type=rt.meta.roots[index].key;return [...new Set(requested)].filter(k=>__cellGet(rt,index,k)!==undefined).sort((a,b)=>__keyCompare(a,b,type));}
  const selected=new Set(requested);return __orderedKeys(rt,index).filter(k=>selected.has(k));}
 if(method==='put_many'){const keys=args[0],values=args[1];if(keys.length!==values.length)return {Err:'table bulk length mismatch'};for(let i=0;i<keys.length;i++)__table(rt,index,'put',[keys[i],values[i]]);return {Ok:null};}
 if(method==='remove_many'){for(const k of args[0])__table(rt,index,'remove',[k]);return null;}
 if(method==='remove')return __tableRemove(rt,index,key);
 return __tablePut(rt,index,key,args[1],method==='insert'?1:method==='replace'?2:0);
}

function __rollback(rt,mark){for(let i=rt.undo.length-1;i>=mark;i--){const [index,key,present,value]=rt.undo[i];const table=rt.tables[index];__invalidateSnapshotRow(rt,index,key);if(table.has(key)!==present)__tableMembership(rt,index,key,present);if(present)table.set(key,value);else table.delete(key);}rt.undo.length=mark;}
function __recordChange(rt,index,key,prior,next){rt.changeLog.push([index,key,prior,next]);}
function __createState(meta,implementations,captures=null,views=[],prefixes=[]){
 const rt={meta,tables:__newTables(meta,prefixes),version:meta.compactCommits?0:0n,outbox:__eventLog(meta),staged:[],busy:false,undo:[],seen:meta.roots.map(()=>new Set()),host:null,keeps:new Array(meta.keeps.length),keepDirty:meta.keeps.length?new Uint8Array(meta.keeps.length):null,keepUndoIndices:meta.keeps.length?new Uint32Array(meta.keeps.length):null,keepUndoCount:0};
 rt.views=views;rt.viewsByRoot=meta.roots.map((_,root)=>views.filter(v=>v.root===root));__rebuildViews(rt);
 rt.viewByKeep=new Array(meta.keeps.length);for(const view of views)rt.viewByKeep[view.keep]=view;
 rt.pendingIndices=[];rt.pendingValues=new Array(meta.keeps.length);
 rt.eventCount=0;rt.eventChannel=null;rt.eventValue=null;
 rt.viewNext=new Array(meta.keeps.length);rt.cell=null;rt.cellMode=false;rt.ctx={fuel:100000000};
 rt.keepBefore=meta.keeps.length?new Array(meta.keeps.length):null;
 rt.changedRoots=new Set();rt.changedOutputs=new Array(meta.keeps.length).fill(0);rt.changedOutputEpoch=0;
 rt.snapshotRows=meta.snapshotRows?meta.roots.map(()=>new Map()):null;
 rt.restoreSpares=null;rt.changeTracking=false;rt.changeLog=[];rt.changeEpoch=0;rt.changeTokens=new Map();
 const actionMap=new Map(meta.actions.map(a=>[a.name,{...a,inputs:captures?captures[a.index]:a.params.map(p=>__stateCapture(p.type)),output:__stateResult(a.result)}]));
 const eventOutput=new Map(meta.events.map(e=>[e.name,__stateResult(e.type)]));
 rt.eventOutput=eventOutput;
 const prepared=new WeakMap();
 const observers=rt.observers=__createObservers((name,args)=>{
  const a=actionMap.get(name);if(!a||a.change)throw Error('subscription requires a readonly query');
  const captured=a.inputs.map((convert,i)=>convert(args[i]));
  const publicArgs=captured.map((v,i)=>__stateResult(a.params[i].type)(v));
  const scalar=['u64','u32','i32','bool','string','unit','enum','id'].includes(a.result.kind);
  return {scalar,committed:scalar&&a.directKeep!==null&&a.directKeep!==undefined?{state:rt,keep:a.directKeep}:null,direct:scalar&&a.directKeep!==null&&a.directKeep!==undefined?()=>rt.keeps[a.directKeep]:null,roots:a.roots,outputs:rt.meta.outputPublication&&a.directKeep!==null&&a.directKeep!==undefined?[a.directKeep]:[],read:!a.precondition&&a.params.length===0?readZero(a,true):()=>run(a,publicArgs,null,null,true),capture:scalar?v=>v:__stateCapture(a.result),output:scalar?v=>v:a.output,equal:__stateQueryEquals[a.index]};
 });
 function invoke(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);return run(a,args);}
 function readZero(a,resultOnly){
  const implementation=implementations[a.index],output=a.output,fresh=a.freshResult;
  if(resultOnly&&fresh&&__stateDirectReadFactories[a.index])return __stateDirectReadFactories[a.index](rt);
  if(a.directKeep!==null&&a.directKeep!==undefined)return ()=>{
   if(rt.busy)throw Error('state operation already in progress');
   const value=rt.keeps[a.directKeep],result=fresh?value:output(value);
   return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};
  };
  return ()=>{
   if(rt.busy)throw Error('state operation already in progress');rt.busy=true;rt.ctx.fuel=100000000;
   try{const value=implementation(rt.ctx,rt),result=fresh?value:output(value);return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};}
   finally{rt.busy=false;}
  };
 }
 function read(a,args,inputs,output,resultOnly,owned=false){
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  rt.busy=true;
  try{const value=implementations[a.index](ctx,rt,...captured),result=a.freshResult?value:(output||a.output)(value);return resultOnly?result:{result,committed:false,version:__versionWord(rt.version),events:[]};}
  finally{rt.busy=false;}
 }
 function begin(a){
  if(rt.busy)throw Error('state operation already in progress');
  rt.ctx.fuel=100000000;
  rt.actionMark=rt.undo.length;rt.actionVersion=rt.version;rt.actionOutbox=rt.outbox;rt.actionOutboxLength=rt.outbox.length;rt.actionChangeMark=rt.changeLog.length;
  rt.busy=true;rt.cellMode=a.singleCell&&!rt.host;rt.staged.length=0;rt.eventCount=0;rt.changedRoots.clear();rt.actionSuccessful=false;
 }
 function complete(a,value,output,resultOnly){
  const result=a.freshResult?value:(output||a.output)(value);
  const version=rt.actionVersion;
  if(a.fallible && (a.flatFailure?value.tag!==0:Object.hasOwn(value,'Err'))){rt.changeLog.length=rt.actionChangeMark;__rollback(rt,rt.actionMark);__restoreKeeps(rt);if(rt.host?.strict)rt.host.failure=Object.assign(Error('transaction action failed'),{action:a.name,result});return resultOnly?result:{result,committed:false,version:__versionWord(version),events:[]};}
  if(version===18446744073709551615n)throw Error('commit sequence exhausted');
  const next=rt.meta.compactCommits?__nextCommit(version):version+1n;
  const publicNext=resultOnly?null:__versionWord(next);
  __prepareCell(rt);
  const events=resultOnly?null:new Array(rt.eventCount);
  if(rt.eventCount){
   const channel=rt.eventChannel,value=rt.eventValue;
   rt.outbox.push({commit:next,position:0n,channel,value});
   if(events)events[0]={commit:publicNext,position:0n,channel,value:eventOutput.get(channel)(value)};
   for(let i=0;i<rt.staged.length;i++){
    const [channel,value]=rt.staged[i],position=BigInt(i+1);
    rt.outbox.push({commit:next,position,channel,value});
    if(events)events[i+1]={commit:publicNext,position,channel,value:eventOutput.get(channel)(value)};
   }
  }
  __commitCell(rt);rt.version=next;rt.actionSuccessful=true;
  return resultOnly?result:{result,committed:true,version:publicNext,events};
 }
 function abort(e){
  rt.changeLog.length=rt.actionChangeMark;__rollback(rt,rt.actionMark);__restoreKeeps(rt);rt.version=rt.actionVersion;rt.outbox=rt.actionOutbox;rt.outbox.length=rt.actionOutboxLength;if(rt.host?.strict)rt.host.failure=e;throw e;
 }
 function end(){
  const successful=rt.actionSuccessful,single=rt.cellMode;
  rt.cell=null;rt.cellMode=false;rt.staged.length=0;rt.eventCount=0;rt.eventChannel=null;rt.eventValue=null;
  for(const keep of rt.pendingIndices)rt.pendingValues[keep]=undefined;rt.pendingIndices.length=0;
  if(!single){__clearKeepJournal(rt);for(const seen of rt.seen)seen.clear();if(!rt.host)rt.undo.length=0;}
  rt.actionOutbox=null;rt.busy=false;
  if(successful)observers.commit(rt.changedRoots);
 }
 function run(a,args,inputs=null,output=null,resultOnly=false,owned=false){
  if(a.kernels&&!rt.host){
   if(rt.busy)throw Error('state operation already in progress');
   const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
   return a.kernels[resultOnly?1:0](...captured);
  }
  if(!a.change)return read(a,args,inputs,output,resultOnly,owned);
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  begin(a);
  try{return complete(a,implementations[a.index](ctx,rt,...captured),output,resultOnly);}
  catch(e){return abort(e);}
  finally{end();}
 }

 for(const a of actionMap.values())if(__statePreflightFactories[a.index]){
  // run() supplies module-owned captured values; bound native entries still capture composites.
  a.kernels=[false,true].map(only=>__statePreflightFactories[a.index](run,a,a.inputs,a.output,only,rt,begin,complete,abort,end,true));
 }
 return Object.freeze({
  subscribeValues(queries,callback,options){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribeValues(queries,callback,options);},
  subscribeGroup(queries,callback,options){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribeGroup(queries,callback,options);},
  subscribe(...args){if(rt.busy||rt.host)throw Error('subscription requires transaction boundary');return observers.subscribe(...args);},
  batch:observers.batch,flushSubscriptions:observers.flush,takeSubscriptionErrors:observers.takeErrors,
  transaction(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('transaction callback must be synchronous');this.beginTransaction();rt.host.strict=true;
   try{const value=callback(this);if(value&&typeof value.then==='function')throw TypeError('state transaction callback must be synchronous');this.commitTransaction();return value;}catch(e){this.rollbackTransaction();throw e;}
  },
  invoke,invoke_json:invoke,
  prepare(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);const captured=a.inputs.map((convert,i)=>convert(args[i])),token=Object.freeze({});prepared.set(token,{action:a,args:captured});return token;},
  invokePrepared(token){const packet=prepared.get(token);if(!packet)throw Error('invalid prepared state call');return run(packet.action,packet.args,null,null,false,true);},
  // A prebound typed entrypoint: scalar arguments obey the native caller contract.
  // Composite arguments still capture owned input; events remain in the outbox.
  bind(name,{resultOnly=false}={}){
   const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);
   const inputs=a.params.map((p,i)=>['u32','i32','u64','bool','unit','string','f32','id','enum','int'].includes(p.type.kind)?__representation(p.type,false):a.inputs[i]);
   if(!a.change&&!a.precondition&&inputs.length===0)return readZero(a,resultOnly);
   return (__statePreflightFactories[a.index]||__stateBoundFactories[a.index])(run,a,inputs,a.output,resultOnly,rt,begin,complete,abort,end);
  },
  beginTransaction(){if(rt.busy||rt.host||rt.undo.length)throw Error('transaction already in progress');rt.host={version:rt.version,outbox:rt.outbox,length:rt.outbox.length,keeps:rt.keeps.slice(),changeMark:rt.changeLog.length,notificationMark:observers.hold()};return true;},
  commitTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');if(rt.host.failure)throw rt.host.failure;rt.host=null;rt.undo.length=0;observers.release();},
  rollbackTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');__rollback(rt,0);rt.version=rt.host.version;rt.outbox=rt.host.outbox;rt.outbox.length=rt.host.length;rt.keeps=rt.host.keeps;__refreshActiveViews(rt);rt.changeLog.length=rt.host.changeMark;rt.changeEpoch++;const mark=rt.host.notificationMark;rt.host=null;observers.rollback(mark);},
  changeToken(){
   if(rt.busy||rt.host)throw Error('change token requires transaction boundary');
   const token=Object.freeze({});rt.changeTracking=true;rt.changeTokens.set(token,{epoch:rt.changeEpoch,index:rt.changeLog.length,version:__versionWord(rt.version)});return token;
  },
  releaseChangeToken(token){rt.changeTokens.delete(token);if(!rt.changeTokens.size){rt.changeTracking=false;rt.changeLog.length=0;}},
  changesSince(token){
   if(rt.busy||rt.host)throw Error('changes require transaction boundary');
   const mark=rt.changeTokens.get(token);if(!mark||mark.epoch!==rt.changeEpoch)throw Error('invalid change token lineage');
   const roots=new Map();
   for(let i=mark.index;i<rt.changeLog.length;i++){
    const [root,key,before,after]=rt.changeLog[i];let cells=roots.get(root);if(!cells)roots.set(root,cells=new Map());
    const prior=cells.get(key);if(prior)prior.after=after;else cells.set(key,{before,after});
   }
   const changes=[];
   const codecs=rt.changeOutputs??=meta.roots.map(schema=>({key:__stateResult(schema.key),row:__stateResult(schema.value)}));
   for(const [root,cells]of roots){const schema=meta.roots[root],keyOut=codecs[root].key,rowOut=codecs[root].row;
    for(const [key,{before,after}]of cells){if(before===undefined&&after===undefined||before!==undefined&&after!==undefined&&__stateRootEquals[root](before,after))continue;
     changes.push({table:schema.name,key:keyOut(key),before:before===undefined?{None:null}:{Some:rowOut(before)},after:after===undefined?{None:null}:{Some:rowOut(after)}});
    }
   }
   return {from:mark.version,to:__versionWord(rt.version),changes};
  },
  get version(){return __versionWord(rt.version);},
  get outbox(){return rt.outbox.map(e=>({...e,commit:__versionWord(e.commit),value:eventOutput.get(e.channel)(e.value)}));},
  acknowledgeThrough(commit,position){if(rt.busy)throw Error('state operation already in progress');commit=__stateWord(commit);position=__stateWord(position);const last=rt.outbox.at(-1);if(!last)return;const lastCommit=__versionWord(last.commit);if(lastCommit<commit||(lastCommit===commit&&last.position<=position)){if(rt.host)rt.outbox=__eventLog(meta);else rt.outbox.length=0;return;}rt.outbox=rt.outbox.filter(e=>{const c=__versionWord(e.commit);return c>commit||(c===commit&&e.position>position);});},
  async invokeAsync(name,args){
   if(typeof __parallelInvokeAsync!=='function')return invoke(name,args);
   if(rt.busy||rt.host)throw Error('parallel state call requires transaction boundary');const captured=structuredClone(args);rt.busy=true;observers.hold();let completed=false;
   try{const snapshot=await __snapshotEncode(meta,rt);const reply=await __parallelInvokeAsync(name,captured,snapshot);const s=await __snapshotDecode(meta,reply.snapshot);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;completed=true;return reply.value;}finally{rt.busy=false;if(completed)observers.commit(meta.roots.map((_,i)=>i));observers.release();}
  },
  checkpoint(limits){if(rt.busy)throw Error('checkpoint requires transaction boundary');return __snapshotEncode(meta,rt,limits);},
  async restore(bytes,limits){if(rt.host)throw Error('restore during transaction');if(rt.busy)throw Error('restore requires transaction boundary');rt.busy=true;rt.ctx.fuel=100000000;observers.hold();let restored=false;try{const s=await __snapshotDecode(meta,bytes,limits);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),version:__storedCommit(meta,s.version),outbox:s.outbox,keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);for(const name of meta.invariantChecks||[]){const a=actionMap.get(name);if(implementations[a.index](rt.ctx,candidate)!==true)throw Error('snapshot violates state invariant');}const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;restored=true;}finally{rt.busy=false;if(restored)observers.commit(meta.roots.map((_,i)=>i));observers.release();}},
 });
}
function __action0(ctx,rt,s0){__tick(ctx);try{__tick(ctx);const s1=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0()));__tick(ctx);if(((((__fn6(s1)===false))) || (((__fn4(s0)===false))))){__tick(ctx);return ({Err:"agent domain"});}else{}__tick(ctx);const s2=__fn1(((s1)["optimizer"])["weights"]);__tick(ctx);return __fn16([__fn3(s2,({["context"]:s0,["action"]:0})),__fn3(s2,({["context"]:s0,["action"]:1}))],[true,true]);}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action1(ctx,rt){__tick(ctx);try{__tick(ctx);return ((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0());}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action2(ctx,rt,s3,s4){__tick(ctx);try{__tick(ctx);const s5=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0()));__tick(ctx);if(((((((__fn6(s5)===false))) || (((s6)=>Object.hasOwn(s6,"Some")?((s7)=>(true))(s6["Some"]):((s8)=>(false))(null))((s5)["pending"])))) || ((((s5)["ticket"]===4294967295))))){__tick(ctx);return ({Err:"pending decision or agent domain"});}else{}__tick(ctx);const s9=__try(__fn5(((s5)["optimizer"])["weights"],s3,s4));__tick(ctx);const s10=((((s5)["ticket"]) + (1)) >>> 0);__tick(ctx);__tablePut(rt,0,0,({Ok:((s11)=>(((s12)=>(({["optimizer"]:(s5)["optimizer"],["version"]:(s5)["version"],["ticket"]:s11,["pending"]:s12})))(({Some:({["ticket"]:s10,["base"]:(s5)["version"],["context"]:s3,["decision"]:s9})}))))(s10)}),0);__tick(ctx);return ({Ok:({["ticket"]:s10,["action"]:(s9)["action"],["probability"]:(s9)["probability"]})});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action3(ctx,rt,s13,s14,s15,s16){__tick(ctx);try{__tick(ctx);const s17=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0()));__tick(ctx);const s18=__try(__okOr((s17)["pending"],"no pending decision"));__tick(ctx);if(((((((((__fn6(s17)===false))) || (!((s13===(s18)["ticket"]))))) || (!(((s18)["base"]===(s17)["version"]))))) || ((((s17)["version"]===4294967295))))){__tick(ctx);return ({Err:"stale policy feedback"});}else{}__tick(ctx);const s19=__try(__fn21((s18)["decision"],s14,s15));__tick(ctx);const s20=__try(__fn33((s17)["optimizer"],s19,__fn25(s16)));__tick(ctx);const s24=((s21)=>(((s22)=>(((s23)=>(({["optimizer"]:s21,["version"]:s22,["ticket"]:(s17)["ticket"],["pending"]:s23})))(({None:null}))))(((((s17)["version"]) + (1)) >>> 0))))(s20);__tick(ctx);if(((__fn6(s24)===false))){__tick(ctx);return ({Err:"candidate domain"});}else{}__tick(ctx);__tablePut(rt,0,0,({Ok:s24}),0);__tick(ctx);__emit(rt,"updated",(s24)["version"]);__tick(ctx);return ({Ok:(s24)["version"]});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action4(ctx,rt){__tick(ctx);try{__tick(ctx);const s25=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0()));__tick(ctx);__tablePut(rt,0,0,({Ok:((s26)=>(({["optimizer"]:(s25)["optimizer"],["version"]:(s25)["version"],["ticket"]:(s25)["ticket"],["pending"]:s26})))(({None:null}))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action5(ctx,rt){__tick(ctx);try{__tick(ctx);const s27=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn0()));__tick(ctx);if((((s27)["version"]===4294967295))){__tick(ctx);return ({Err:"version exhausted"});}else{}__tick(ctx);__tablePut(rt,0,0,({Ok:((s28)=>(({["optimizer"]:(s27)["optimizer"],["version"]:s28,["ticket"]:(s27)["ticket"],["pending"]:(s27)["pending"]})))(((((s27)["version"]) + (1)) >>> 0))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action6(ctx,rt,s29,s30,s31){__tick(ctx);try{__tick(ctx);const s32=__try(__nested(__action2(ctx,rt,s29,s30),true));__tick(ctx);return __nested(__action3(ctx,rt,(s32)["ticket"],__fn7(s29,(s32)["action"]),0,s31),true);}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action7(ctx,rt,s33){__tick(ctx);try{__tick(ctx);const s34=__try(__nested(__action6(ctx,rt,s33,1048576000,1017370378),true));__tick(ctx);return ({Err:"cancel outer training"});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __stateCommitRoot0(rt,key,prior,next,slot){__storeDirect(rt,0,key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[0]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}
const __stateDirectReadFactories=[null,null,null,null,null,null,null,null];
function __stateValueEqual3(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!((a[i]===b[i])))return false;return true;}
function __stateValueEqual10(a,b){if(a===b)return true;return (a["ticket"]===b["ticket"])&&(a["action"]===b["action"])&&(a["probability"]===b["probability"]);}
function __stateValueEqual1(a,b){if(a===b)return true;return __stateValueEqual2(a["optimizer"],b["optimizer"])&&(a["version"]===b["version"])&&(a["ticket"]===b["ticket"])&&__stateValueEqual4(a["pending"],b["pending"]);}
function __stateValueEqual6(a,b){if(a===b)return true;return (a["signal"]===b["signal"])&&(a["urgency"]===b["urgency"]);}
function __stateValueEqual5(a,b){if(a===b)return true;return (a["ticket"]===b["ticket"])&&(a["base"]===b["base"])&&__stateValueEqual6(a["context"],b["context"])&&__stateValueEqual7(a["decision"],b["decision"]);}
function __stateValueEqual7(a,b){if(a===b)return true;return (a["action"]===b["action"])&&(a["probability"]===b["probability"])&&__stateValueEqual3(a["score"],b["score"]);}
function __stateValueEqual2(a,b){if(a===b)return true;return __stateValueEqual3(a["weights"],b["weights"])&&__stateValueEqual3(a["first"],b["first"])&&__stateValueEqual3(a["second"],b["second"])&&(a["steps"]===b["steps"])&&(a["first_power"]===b["first_power"])&&(a["second_power"]===b["second_power"]);}
function __stateValueEqual4(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||__stateValueEqual5(a.Some,b.Some));}
function __stateValueEqual11(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual12(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual8(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual3(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual9(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual10(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual0(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual1(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __ownedInput0(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"signal")||!Object.hasOwn(value,"urgency"))throw Error('invalid record');const field0=__ownedInput1(value["signal"],budget,depth+1);const field1=__ownedInput1(value["urgency"],budget,depth+1);return {["signal"]:field0,["urgency"]:field1};}
const __ownedType1={"kind":"f32"};
function __ownedInput1(value,budget={cells:1000000},depth=0){return __stateInput(value,__ownedType1,budget,depth);}
function __ownedInput2(value,budget={cells:1000000},depth=0){let scalar=value;if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='number'||!Number.isInteger(scalar)||scalar<0||scalar>4294967295)throw Error('invalid u32');if(scalar===0)scalar=0;return scalar;}
const __stateQueryEquals=[(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual0(a,b),(a,b)=>__stateValueEqual9(a,b),(a,b)=>__stateValueEqual11(a,b),(a,b)=>__stateValueEqual12(a,b),(a,b)=>__stateValueEqual12(a,b),(a,b)=>__stateValueEqual11(a,b),(a,b)=>__stateValueEqual12(a,b)];
const __stateRootEquals=[(a,b)=>__stateValueEqual0(a,b)];
const __stateBoundFactories=[(run,a,inputs,output,only)=>(p0)=>run(a,[inputs[0](p0)],null,output,only,true),(run,a,inputs,output,only)=>()=>run(a,[],null,output,only,true),(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1)=>run(a,[inputs[0](p0),inputs[1](p1)],null,output,only,true):(p0,p1)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);begin(a);try{return complete(a,__action2(rt.ctx,rt,b0,b1),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1,p2,p3)=>run(a,[inputs[0](p0),inputs[1](p1),inputs[2](p2),inputs[3](p3)],null,output,only,true):(p0,p1,p2,p3)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);const b2=inputs[2](p2);const b3=inputs[3](p3);begin(a);try{return complete(a,__action3(rt.ctx,rt,b0,b1,b2,b3),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action4(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action5(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1,p2)=>run(a,[inputs[0](p0),inputs[1](p1),inputs[2](p2)],null,output,only,true):(p0,p1,p2)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);const b2=inputs[2](p2);begin(a);try{return complete(a,__action6(rt.ctx,rt,b0,b1,b2),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0)=>run(a,[inputs[0](p0)],null,output,only,true):(p0)=>{const b0=inputs[0](p0);begin(a);try{return complete(a,__action7(rt.ctx,rt,b0),output,only);}catch(e){return abort(e);}finally{end();}}];const __statePreflightFactories=[null,null,null,null,null,null,null,null];
const __stateMetadata={"actions":[{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"predict","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"model","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"act","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}}],"kind":"record","name":"Acted"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":3,"name":"feedback","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":4,"name":"cancel","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":5,"name":"invalidate","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":6,"name":"episode","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":false},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":7,"name":"aborted","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":false}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"updated","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Agent","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record"}}],"kind":"record"},"kind":"option"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}}],"snapshot":{"program":[66,86,144,231,110,75,2,150,94,139,120,28,95,230,206,13,97,118,136,215,136,34,198,61,2,21,28,95,131,79,169,213],"schema":[135,81,189,91,60,212,69,164,173,159,146,162,142,227,128,220,163,96,86,1,57,94,30,197,66,138,248,141,148,18,37,250]},"snapshotRows":false};const __actions=[__action0,__action1,__action2,__action3,__action4,__action5,__action6,__action7];const __stateInputCaptures=[[__ownedInput0],[],[__ownedInput0,__ownedInput1],[__ownedInput2,__ownedInput1,__ownedInput1,__ownedInput1],[],[],[__ownedInput0,__ownedInput1,__ownedInput1],[__ownedInput0]];
export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"7ccdf6d722b1e4e662f4da2cf5372e61fb1bb30ef20aa8e8f54ce1990cf097f9","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"initialize","parallel":false,"params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}},{"destination":null,"index":1,"internal":false,"name":"unpack","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":2,"internal":false,"name":"pack","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":3,"internal":false,"name":"mass","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":4,"internal":false,"name":"valid_context","parallel":false,"params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":5,"internal":false,"name":"policy","parallel":false,"params":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}},{"destination":null,"index":6,"internal":false,"name":"valid_agent","parallel":false,"params":[{"name":"agent","type":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":7,"internal":false,"name":"reward","parallel":false,"params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":8,"internal":false,"name":"decision","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}},{"destination":null,"index":9,"internal":false,"name":"returns","parallel":false,"params":[{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":10,"internal":false,"name":"trajectory","parallel":false,"params":[{"name":"decisions","type":{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"}},{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"baselines","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":11,"internal":false,"name":"edge","parallel":false,"params":[{"name":"kind","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":12,"internal":false,"name":"batch","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":13,"internal":false,"name":"ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":14,"internal":false,"name":"ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":15,"internal":false,"name":"ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":16,"internal":false,"name":"ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":17,"internal":false,"name":"ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910","parallel":false,"params":[{"name":"scaled","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}},{"name":"total","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":18,"internal":false,"name":"ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667","parallel":false,"params":[{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"maximum","type":{"kind":"f32"}},{"name":"total","type":{"kind":"f32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":19,"internal":false,"name":"ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"total","type":{"kind":"f32"}},{"name":"selected","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":20,"internal":false,"name":"ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80","parallel":false,"params":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}},{"destination":null,"index":21,"internal":false,"name":"ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4","parallel":false,"params":[{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":22,"internal":false,"name":"ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431","parallel":false,"params":[{"name":"accumulator","type":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":23,"internal":false,"name":"ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b","parallel":false,"params":[{"name":"decisions","type":{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"}},{"name":"return_values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"baselines","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":24,"internal":false,"name":"ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07","parallel":false,"params":[{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"destination":null,"index":25,"internal":false,"name":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","parallel":false,"params":[{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},{"destination":null,"index":26,"internal":false,"name":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":27,"internal":false,"name":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":28,"internal":false,"name":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","parallel":false,"params":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},{"destination":null,"index":29,"internal":false,"name":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","parallel":false,"params":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":30,"internal":false,"name":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":31,"internal":false,"name":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":32,"internal":false,"name":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","parallel":false,"params":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":33,"internal":false,"name":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},{"destination":null,"index":34,"internal":false,"name":"__ink_differential_3","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"}}],"precondition":null,"result":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"destination":null,"index":35,"internal":false,"name":"__ink_differential_1","parallel":false,"params":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}}],"precondition":null,"result":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}}],"named_types":{"Acted":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}}],"kind":"record","name":"Acted"},"AgentState":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"},"Context":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"},"Input":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"},"Pending":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"Weights":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"},"__ink_differential_0":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_0"},"__ink_differential_2":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"},"__ink_differential_4":{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"},"__ink_differential_5":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"},"__ink_differential_6":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_17":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"out","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_17"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_36":{"fields":[{"name":"accumulated","type":{"kind":"f32"}},{"name":"found","type":{"kind":"bool"}},{"name":"i","type":{"kind":"u32"}},{"name":"selected","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_36"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_5":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"maximum","type":{"kind":"f32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_5"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_52":{"fields":[{"name":"correction","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_52"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_70":{"fields":[{"name":"accumulator","type":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_70"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_85":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"next","type":{"kind":"f32"}},{"name":"reversed","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_85"},"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_97":{"fields":[{"name":"i","type":{"kind":"u32"}},{"name":"out","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_a617f0dd352a15fbff9ef1291263898d34312e27c644aa89b6bad8ebf458426b_97"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":false,"function":"initialize","reason":"no reusable lexical bindings"},{"factory":false,"function":"unpack","reason":"no reusable lexical bindings"},{"factory":false,"function":"pack","reason":"no reusable lexical bindings"},{"factory":true,"function":"mass","retained_bindings":2},{"factory":false,"function":"valid_context","reason":"no reusable lexical bindings"},{"factory":true,"function":"policy","retained_bindings":3},{"factory":false,"function":"valid_agent","reason":"no reusable lexical bindings"},{"factory":false,"function":"reward","reason":"no reusable lexical bindings"},{"factory":false,"function":"decision","reason":"no reusable lexical bindings"},{"factory":false,"function":"returns","reason":"no reusable lexical bindings"},{"factory":false,"function":"trajectory","reason":"no reusable lexical bindings"},{"factory":true,"function":"edge","retained_bindings":1},{"factory":false,"function":"batch","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3","retained_bindings":5},{"factory":true,"function":"ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14","retained_bindings":3},{"factory":false,"function":"ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910","retained_bindings":10},{"factory":true,"function":"ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667","retained_bindings":5},{"factory":true,"function":"ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2","retained_bindings":3},{"factory":false,"function":"ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4","retained_bindings":2},{"factory":false,"function":"ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b","retained_bindings":7},{"factory":true,"function":"ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07","retained_bindings":7},{"factory":false,"function":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","retained_bindings":1},{"factory":false,"function":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","retained_bindings":3},{"factory":false,"function":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","reason":"no reusable lexical bindings"},{"factory":true,"function":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","retained_bindings":9},{"factory":true,"function":"__ink_differential_3","retained_bindings":5},{"factory":true,"function":"__ink_differential_1","retained_bindings":1}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":{"actions":[{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"predict","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"model","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"act","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}}],"kind":"record","name":"Acted"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":3,"name":"feedback","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":4,"name":"cancel","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":5,"name":"invalidate","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":6,"name":"episode","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":false},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":7,"name":"aborted","params":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":false}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"updated","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Agent","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record"}}],"kind":"record"},"kind":"option"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}}],"snapshot":{"program":[66,86,144,231,110,75,2,150,94,139,120,28,95,230,206,13,97,118,136,215,136,34,198,61,2,21,28,95,131,79,169,213],"schema":[135,81,189,91,60,212,69,164,173,159,146,162,142,227,128,220,163,96,86,1,57,94,30,197,66,138,248,141,148,18,37,250]},"snapshotRows":false},"wire":{"format":"ink-value-wire-v1","functions":{"__ink_differential_1":{"arguments":{"format":"ink-value-wire-v1","identity":"69445f3118edc96b9e0aee8d8cc3f9b8b998dd8d9075252ab3fb3ce8b2af4585","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75240e7a40e3df960c38dc04412c9479772294c1ecda90c70f28242d4948b6cf","named":{},"root":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}}},"__ink_differential_3":{"arguments":{"format":"ink-value-wire-v1","identity":"d107fd8b88724c8491486148775f6d58e6b2d7a697dd4270711d0880e099391d","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93e40a391aa823b558ea752b04b9acad0275cd170e9e56df4ecad54f100d0c31","named":{},"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}},"batch":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"decision":{"arguments":{"format":"ink-value-wire-v1","identity":"1c83630f3139ed38673ed470f191df2b950104eaf550096543a7611da7c50d02","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4c26cf6146a67b60bc34cb27a1b07b25ab14048bb6f0044b09b8e87179b513fa","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}}},"edge":{"arguments":{"format":"ink-value-wire-v1","identity":"120e07556764e92e4a3c5b870bda3a9bb2bb29a11a387ebf0c42e3413d2e71ba","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4c26cf6146a67b60bc34cb27a1b07b25ab14048bb6f0044b09b8e87179b513fa","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}}},"initialize":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"485744f6bbe90a893c514510bb1638516a9d2d78ee025202f9c1fb23bddf6c6a","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}}},"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab":{"arguments":{"format":"ink-value-wire-v1","identity":"a9d67b7a474f78841986a2160f6d9330ec73efe55bb06560a35a27a22ad078b5","named":{},"root":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2":{"arguments":{"format":"ink-value-wire-v1","identity":"48baf4f7fc28a2b3b5df8f3367f2d7cd4d4bccc1c64a334e7433f0c6fd503d4b","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"total","type":{"kind":"f32"}},{"name":"selected","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80":{"arguments":{"format":"ink-value-wire-v1","identity":"1c83630f3139ed38673ed470f191df2b950104eaf550096543a7611da7c50d02","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4c26cf6146a67b60bc34cb27a1b07b25ab14048bb6f0044b09b8e87179b513fa","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}}},"ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3":{"arguments":{"format":"ink-value-wire-v1","identity":"d02715cce4688c556e60843790a4e59e61ebaad2c9c1064929c6b794d816a06a","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be":{"arguments":{"format":"ink-value-wire-v1","identity":"e0ef5b019bff93f73efd86b897d6f35ea8eb8b607d972cd47729126beaf5fafa","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b":{"arguments":{"format":"ink-value-wire-v1","identity":"a626656c4896f714c5263b675ceb0f0453e3cae783d93d52d880765e7164cd22","named":{},"root":{"fields":[{"name":"decisions","type":{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"}},{"name":"return_values","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"baselines","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35":{"arguments":{"format":"ink-value-wire-v1","identity":"d7bb8db3ffe558eca9f4f6716e44807734e18db170e874ada1038fb500fa33ad","named":{},"root":{"fields":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431":{"arguments":{"format":"ink-value-wire-v1","identity":"c3638b7b9e1ad05ebcb8c60f864d4a1bbb22d0effd3343b6de51dc1abb657d20","named":{},"root":{"fields":[{"name":"accumulator","type":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910":{"arguments":{"format":"ink-value-wire-v1","identity":"ea3bdda55cda843ccb548330a20f97b77f397a07d72ef90ae77e37672fe45ca4","named":{},"root":{"fields":[{"name":"scaled","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"unit","type":{"kind":"f32"}},{"name":"total","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db":{"arguments":{"format":"ink-value-wire-v1","identity":"95732fc2e08ae05f4d215e9e358781620c82dea66fab6ca4ada670422dd62463","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5":{"arguments":{"format":"ink-value-wire-v1","identity":"a7c17d063bba03b64d18b54cb89be038b3c836fdbf7ee6cc9644e5db742a8d67","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667":{"arguments":{"format":"ink-value-wire-v1","identity":"63dc6e7ffb23fa2f492a776dfe3f26537ee473c9be45219097955b470f66c12e","named":{},"root":{"fields":[{"name":"derivatives","type":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}},{"name":"maximum","type":{"kind":"f32"}},{"name":"total","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4":{"arguments":{"format":"ink-value-wire-v1","identity":"2881c9ed2616bb70e9db4b1ec27ea38b7a87b36752047fc96da9ca8379b19bc6","named":{},"root":{"fields":[{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}},{"name":"return_value","type":{"kind":"f32"}},{"name":"baseline","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a":{"arguments":{"format":"ink-value-wire-v1","identity":"d02715cce4688c556e60843790a4e59e61ebaad2c9c1064929c6b794d816a06a","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07":{"arguments":{"format":"ink-value-wire-v1","identity":"2be6f1cb78767fdb61c1c0484a5a6b843d511c7eee041ed29a5db92ea7552629","named":{},"root":{"fields":[{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7":{"arguments":{"format":"ink-value-wire-v1","identity":"fb0d53fcc5118c446d80e19c4ffd8b95f7979f94f7fb23149d3518375b621a75","named":{},"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d":{"arguments":{"format":"ink-value-wire-v1","identity":"4748bdf2b6e86fd410744d69adce4514614c078ede8a1a3a86a717f27b6f4802","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}},"ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14":{"arguments":{"format":"ink-value-wire-v1","identity":"d02715cce4688c556e60843790a4e59e61ebaad2c9c1064929c6b794d816a06a","named":{},"root":{"fields":[{"name":"masses","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"allowed","type":{"element":{"kind":"bool"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"mass":{"arguments":{"format":"ink-value-wire-v1","identity":"69445f3118edc96b9e0aee8d8cc3f9b8b998dd8d9075252ab3fb3ce8b2af4585","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},{"name":"input","type":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"pack":{"arguments":{"format":"ink-value-wire-v1","identity":"07617e704693c62602d291f92d9d095e9c6a7354c621e740e0263f11cfe26c02","named":{},"root":{"fields":[{"name":"w","type":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"policy":{"arguments":{"format":"ink-value-wire-v1","identity":"b32356db210fb9b903e3733e80172da9acd52ddfb269c71d6e07a6863c41e0e5","named":{},"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"unit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"4c26cf6146a67b60bc34cb27a1b07b25ab14048bb6f0044b09b8e87179b513fa","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}}},"returns":{"arguments":{"format":"ink-value-wire-v1","identity":"2be6f1cb78767fdb61c1c0484a5a6b843d511c7eee041ed29a5db92ea7552629","named":{},"root":{"fields":[{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"reward":{"arguments":{"format":"ink-value-wire-v1","identity":"59c02a003fe68372987290f6fd62c703a9f2a2d058de41662bbad204a46d3130","named":{},"root":{"fields":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"trajectory":{"arguments":{"format":"ink-value-wire-v1","identity":"3169a2a9f78089b9c082cb76255325f58368be2debc2bdf8ef99d4b6420bc92c","named":{},"root":{"fields":[{"name":"decisions","type":{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"}},{"name":"rewards","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"baselines","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"discount","type":{"kind":"f32"}},{"name":"bootstrap","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}}},"unpack":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75240e7a40e3df960c38dc04412c9479772294c1ecda90c70f28242d4948b6cf","named":{},"root":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}}},"valid_agent":{"arguments":{"format":"ink-value-wire-v1","identity":"35fca56d289894d6d254001d3f6c06201923400766d65aa42a63d3f4cd02638e","named":{},"root":{"fields":[{"name":"agent","type":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"valid_context":{"arguments":{"format":"ink-value-wire-v1","identity":"0b102cb00d97a4e4e72dac7da69a8065b503938f89ac8a87d917d9a0b089da87","named":{},"root":{"fields":[{"name":"c","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18,__fn19,__fn20,__fn21,__fn22,__fn23,__fn24,__fn25,__fn26,__fn27,__fn28,__fn29,__fn30,__fn31,__fn32,__fn33,__fn34,__fn35];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[],"types":[]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}]},{"capture":[false,false],"types":[{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"},{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}]},{"capture":[false],"types":[{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"},{"kind":"f32"}]},{"capture":[false],"types":[{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"kind":"record","name":"AgentState"}]},{"capture":[false,true],"types":[{"fields":[{"name":"signal","type":{"kind":"f32"}}],"kind":"record","name":"Context"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true],"types":[{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"u32"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true,true],"types":[{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"},{"kind":"f32"},{"kind":"u32"}]},{"capture":[true,true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"},{"element":{"kind":"bool"},"kind":"list"},{"kind":"f32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,false,true,true],"types":[{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}},{"fields":[{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true,true,true],"types":[{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"},{"kind":"f32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,false],"types":[{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[false,false],"types":[{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"},{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"}]},{"capture":[false,false],"types":[{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"},{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}]}];

// Descriptor work occurs once at module initialisation, never per word-list call.
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=> {
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const output=__representation(f.result,true);
  const body=__implementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
  const needsInput=input.some(c=>c!==__identity);
  const entry=!needsInput && output===__identity ? implementation :
    (...args)=>{const context=new WeakMap();return output(implementation(...(needsInput ? args.map((v,i)=>input[i](v,context)) : args)),context);};
  return [f.name,entry];
})));
export function call(name,args) { return functions[name](...args); }
// Shared bounded binary codec; generated code supplies exact descriptors.
export const valueWireFormat='ink-value-wire-v1';
// A connection agrees on the complete value schema before using this format.
// Version byte + schema-directed fields; schema identity is out of band.
export const compactValueWireFormat='ink-value-session-v1';
const wireMagic=Uint8Array.of(73,78,75,86,65,76,0,1);
const wireEncoder=new TextEncoder(),wireDecoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const wireDefaults=Object.freeze({bytes:16777216,nodes:1000000,depth:128}),wireDefaultOptions=Object.freeze({});
const wireDecimal=s=>typeof s==='string'&&/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(s);
function wireLimits(options){if(options===wireDefaultOptions||options===wireDefaults)return wireDefaults;const l={...wireDefaults,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>wireDefaults[k])throw Error('wire hard resource limit');return l;}
const wireFloat=new DataView(new ArrayBuffer(4));
function wireDecodeText(bytes,start,end){
 if(end-start<=16){let text='';for(let i=start;i<end;i++){const byte=bytes[i];if(byte>=128)return wireDecoder.decode(bytes.subarray(start,end));text+=String.fromCharCode(byte);}return text;}
 return wireDecoder.decode(bytes.subarray(start,end));
}
function wireUtf8Length(text){let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff){bytes+=4;i++;}else bytes+=3;}return bytes;}
const wireOwn=(v,k)=>v!==null&&typeof v==='object'&&Object.hasOwn(v,k);
const wireTagged=(v,k)=>wireOwn(v,k)&&Object.keys(v).length===1;
const wireCanonical=v=>Array.isArray(v)?'['+v.map(wireCanonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort((a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}).map(k=>JSON.stringify(k)+':'+wireCanonical(v[k])).join(',')+'}':JSON.stringify(v);
export async function createValueCodec(root,named={}){
 const used=new Set(),budget={nodes:100000};
 function check(t,d=0){
  if(d>64||--budget.nodes<0)throw Error('wire descriptor limit');
  const keys={u32:['kind'],u64:['kind'],i32:['kind'],f32:['kind'],bool:['kind'],unit:['kind'],string:['kind'],int:['kind'],id:['kind','name'],ref:['kind','name'],enum:['kind','name','variants'],record:['kind','name','fields'],list:['kind','element'],option:['kind','element'],vector:['kind','element','size'],result:['kind','ok','error']}[t?.kind];
  if(!keys||Object.keys(t).length!==keys.length||keys.some(k=>!Object.hasOwn(t,k)))throw Error('invalid wire descriptor');
  if(keys.includes('name')&&(typeof t.name!=='string'||!t.name.isWellFormed()))throw Error('invalid descriptor name');
  if(t.kind==='ref'){if(!used.has(t.name)){used.add(t.name);if(named[t.name]?.kind!=='record'||named[t.name].name!==t.name)throw Error('unresolved wire reference');check(named[t.name],d+1);}}
  if(t.kind==='record'){if(!Array.isArray(t.fields))throw Error('wire fields');const names=new Set();for(const f of t.fields){if(Object.keys(f).length!==2||typeof f.name!=='string'||!f.name.isWellFormed()||names.has(f.name))throw Error('duplicate wire field');names.add(f.name);check(f.type,d+1);}}
  if(t.kind==='enum'&&(!Array.isArray(t.variants)||!t.variants.length||t.variants.length>64||t.variants.some(v=>typeof v!=='string'||!v.isWellFormed())||new Set(t.variants).size!==t.variants.length))throw Error('wire enum');
  if(['list','vector','option'].includes(t.kind)){if(t.kind==='vector'&&(!Number.isInteger(t.size)||t.size<1||t.size>64))throw Error('wire vector');check(t.element,d+1);}
  if(t.kind==='result'){check(t.ok,d+1);check(t.error,d+1);}
 }
 check(root);const names=Object.fromEntries([...used].sort().map(k=>[k,named[k]]));
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',wireEncoder.encode(wireCanonical({format:valueWireFormat,root,named:names}))));
 return new ValueCodec({format:valueWireFormat,root,named:names,identity:Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('')});
}
// Resolve immutable descriptor edges once. Logical validation traverses the
// literal schema; single-child nodes use a loop rather than recursive closures.
function wireValuePlan(codec){
 const seen=new WeakMap();let remaining=100000;
 const build=type=>{
  const t=codec.resolve(type);if(seen.has(t))return seen.get(t);
  if(--remaining<0)throw Error('wire descriptor limit');const p={kind:t.kind,type:t,decode:null,decodeCompact:null};seen.set(t,p);
  if(t.kind==='record')p.fields=t.fields.map(f=>({name:f.name,plan:build(f.type)}));
  if(t.kind==='list'||t.kind==='vector'||t.kind==='option')p.element=build(t.element);
  if(t.kind==='result'){p.ok=build(t.ok);p.error=build(t.error);}
  return p;
 };return build(codec.descriptor.root);
}
function wireBindDecodePlan(root,compact=false){
 const seen=new Set(),pending=[root];let flags=0;
 while(pending.length){
  const p=pending.pop();if(seen.has(p))continue;seen.add(p);if(compact)p.decodeCompact=compactDecodeOperation(p);else p.decode=wireDecodeOperation(p);
  if(p.fields?.length>4)flags|=1;
  if(p.kind==='u32'||p.kind==='i32'||p.kind==='u64'||p.kind==='f32')flags|=2;
  if(p.fields)for(const f of p.fields)pending.push(f.plan);
  if(p.element)pending.push(p.element);
  if(p.ok){pending.push(p.ok);pending.push(p.error);}
 }
 return flags|4;
}
// Select literal descriptor operations once, without runtime source generation
// or eval. Recursive edges call the completed plan. The generic scanner remains
// the visitor/validation path and an independent materialisation implementation.
function wireReadOperation(p){
 const t=p.type;
 let read;
 switch(p.kind){
  case 'unit':read=(r,end)=>{r.size(end,0);return null;};break;
  case 'bool':read=(r,end)=>{r.size(end,1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':read=(r,end)=>{r.size(end,4);const n=r.view.getUint32(r.cursor,true);r.cursor=end;return n;};break;
  case 'i32':read=(r,end)=>{r.size(end,4);const n=r.view.getInt32(r.cursor,true);r.cursor=end;return n;};break;
  case 'f32':read=(r,end)=>{r.size(end,4);const value={F32Bits:r.view.getUint32(r.cursor,true)};r.cursor=end;return value;};break;
  case 'u64':read=(r,end)=>{r.size(end,8);const value=r.view.getBigUint64(r.cursor,true);r.cursor=end;return value;};break;
  case 'string':read=(r,end)=>r.text(end);break;
  case 'int':read=(r,end)=>{const text=r.text(end);if(!wireDecimal(text))throw Error('malformed wire text');return {Int:text};};break;
  case 'id':read=(r,end)=>{const text=r.text(end);if(!/^[0-9a-f]{32}$/.test(text))throw Error('malformed wire text');return text;};break;
  case 'enum':read=(r,end)=>{const text=r.text(end);if(!t.variants.includes(text))throw Error('malformed wire text');return text;};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   read=(r,end,d)=>{
    if(r.cursor+4>end)throw Error('wire list count');const n=r.view.getUint32(r.cursor,true);r.cursor+=4;
    if(n>r.remaining||n>Math.floor((end-r.cursor)/4)||size!==null&&n!==size)throw Error('wire sequence size');
    const values=new Array(n);for(let i=0;i<n;i++)values[i]=element.decode(r,end,d+1);return values;
   };break;
  }
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>({});break;
    case 1:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1)});break;
    case 2:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1)});break;
    case 3:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1),[fs[2].name]:fs[2].plan.decode(r,end,d+1)});break;
    case 4:read=(r,end,d)=>({[fs[0].name]:fs[0].plan.decode(r,end,d+1),[fs[1].name]:fs[1].plan.decode(r,end,d+1),[fs[2].name]:fs[2].plan.decode(r,end,d+1),[fs[3].name]:fs[3].plan.decode(r,end,d+1)});break;
    default:read=(r,end,d)=>{const value={};for(const f of fs){r.property.value=f.plan.decode(r,end,d+1);Object.defineProperty(value,f.name,r.property);}return value;};
   }break;
  }
  case 'option':read=(r,end,d)=>{const tag=r.tag(end);return tag?{Some:p.element.decode(r,end,d+1)}:{None:null};};break;
  case 'result':read=(r,end,d)=>r.tag(end)?{Err:p.error.decode(r,end,d+1)}:{Ok:p.ok.decode(r,end,d+1)};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return read;
}
function wireDecodeOperation(p){
 if(p.kind==='record'&&p.fields.length===1){
  const field=p.fields[0],read=wireReadOperation(field.plan),name=field.name;
  return (r,parentEnd,d)=>{const end=r.enter(parentEnd,d),childEnd=r.enter(end,d+1),item=read(r,childEnd,d+1);if(r.cursor!==childEnd)throw Error('trailing wire frame bytes');const value={[name]:item};if(r.cursor!==end)throw Error('trailing wire frame bytes');return value;};
 }
 const read=wireReadOperation(p);
 return (r,parentEnd,d)=>{const end=r.enter(parentEnd,d),value=read(r,end,d);if(r.cursor!==end)throw Error('trailing wire frame bytes');return value;};
}
class WireDecodeCursor{
 constructor(bytes,view,limits){this.bytes=bytes;this.view=view;this.cursor=40;this.remaining=limits.nodes;this.depth=limits.depth;this.property=null;}
 enter(parentEnd,d){
  if(d>this.depth||--this.remaining<0||this.cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const start=this.cursor+4,end=start+this.view.getUint32(this.cursor,true);if(end>parentEnd)throw Error('truncated wire frame');this.cursor=start;return end;
 }
 size(end,n){if(end-this.cursor!==n)throw Error('malformed wire scalar');}
 tag(end){if(this.cursor===end||this.bytes[this.cursor]>1)throw Error('wire sum tag');return this.bytes[this.cursor++];}
 text(end){const text=wireDecodeText(this.bytes,this.cursor,end);this.cursor=end;return text;}
}
// Bind literal validation and postorder visitation once for every descriptor.
// No logical carriers are allocated; projection still validates every child.
function wireScanPlan(root){
 const seen=new WeakMap();
 const build=source=>{
  if(seen.has(source))return seen.get(source);
  const p={kind:source.kind,type:source.type,scan:null};seen.set(source,p);
  if(source.fields)p.fields=source.fields.map(f=>({plan:build(f.plan)}));
  if(source.element)p.element=build(source.element);
  if(source.ok){p.ok=build(source.ok);p.error=build(source.error);}
  p.scan=wireScanOperation(p);return p;
 };
 return build(root);
}
function wireScanOperation(p){
 const t=p.type;let read;
 switch(p.kind){
  case 'unit':read=(r,end)=>{r.size(end,0);return null;};break;
  case 'bool':read=(r,end)=>{r.size(end,1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':read=(r,end)=>{r.size(end,4);const n=r.view.getUint32(r.cursor,true);r.cursor=end;return n;};break;
  case 'i32':read=(r,end)=>{r.size(end,4);const n=r.view.getInt32(r.cursor,true);r.cursor=end;return n;};break;
  case 'f32':case 'u64':{const size=p.kind==='f32'?4:8;read=(r,end)=>{r.size(end,size);r.cursor=end;};break;}
  case 'string':read=(r,end)=>{let i=r.cursor;while(i<end&&r.bytes[i]<128)i++;if(i<end)wireDecoder.decode(r.bytes.subarray(r.cursor,end));r.cursor=end;};break;
  case 'int':case 'id':case 'enum':read=(r,end)=>{const text=r.text(end);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   read=(r,end,d)=>{if(r.cursor+4>end)throw Error('wire list count');const n=r.view.getUint32(r.cursor,true);r.cursor+=4;if(n>r.remaining||n>Math.floor((end-r.cursor)/4)||size!==null&&n!==size)throw Error('wire sequence size');for(let i=0;i<n;i++)element.scan(r,end,d+1);};break;
  }
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>{};break;
    case 1:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);};break;
    case 2:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);};break;
    case 3:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);fs[2].plan.scan(r,end,d+1);};break;
    case 4:read=(r,end,d)=>{fs[0].plan.scan(r,end,d+1);fs[1].plan.scan(r,end,d+1);fs[2].plan.scan(r,end,d+1);fs[3].plan.scan(r,end,d+1);};break;
    default:read=(r,end,d)=>{for(const f of fs)f.plan.scan(r,end,d+1);};
   }break;
  }
  case 'option':read=(r,end,d)=>{if(r.tag(end))p.element.scan(r,end,d+1);};break;
  case 'result':read=(r,end,d)=>{(r.tag(end)?p.error:p.ok).scan(r,end,d+1);};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return (r,parentEnd,d)=>{
  const end=r.enter(parentEnd,d),start=r.cursor,value=read(r,end,d);if(r.cursor!==end)throw Error('trailing wire frame bytes');
  const visitor=r.visitor;if(visitor&&(!r.selected||r.selected.has(t.name))){if(r.spans)visitor(t,r.bytes,start,end,d);else visitor(t,r.bytes.subarray(start,end),d);}
  return value;
 };
}
// Separate methods keep decoding's cursor callsites monomorphic. Both cursors
// are checked against the independent generic scanner and malformed fixtures.
class WireScanCursor{
 constructor(bytes,view,limits,visitor,selected,spans){this.bytes=bytes;this.view=view;this.cursor=40;this.remaining=limits.nodes;this.depth=limits.depth;this.visitor=visitor;this.selected=selected;this.spans=spans;}
 enter(parentEnd,d){
  if(d>this.depth||--this.remaining<0||this.cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const start=this.cursor+4,end=start+this.view.getUint32(this.cursor,true);if(end>parentEnd)throw Error('truncated wire frame');this.cursor=start;return end;
 }
 size(end,n){if(end-this.cursor!==n)throw Error('malformed wire scalar');}
 tag(end){if(this.cursor===end||this.bytes[this.cursor]>1)throw Error('wire sum tag');return this.bytes[this.cursor++];}
 text(end){const text=wireDecodeText(this.bytes,this.cursor,end);this.cursor=end;return text;}
}
function compactReadOperation(p){
 const t=p.type;let read;
 switch(p.kind){
  case 'unit':read=()=>null;break;
  case 'bool':read=r=>{r.require(1);const b=r.bytes[r.cursor++];if(b>1)throw Error('invalid wire Bool');return !!b;};break;
  case 'u32':case 'i32':read=r=>{r.require(4);const n=p.kind==='u32'?r.view.getUint32(r.cursor,true):r.view.getInt32(r.cursor,true);r.cursor+=4;return n;};break;
  case 'f32':read=r=>{r.require(4);const n=r.view.getUint32(r.cursor,true);r.cursor+=4;return {F32Bits:n};};break;
  case 'u64':read=r=>{r.require(8);const n=r.view.getBigUint64(r.cursor,true);r.cursor+=8;return n;};break;
  case 'string':read=r=>r.text();break;
  case 'int':read=r=>{const text=r.text();if(!wireDecimal(text))throw Error('malformed wire text');return {Int:text};};break;
  case 'id':read=r=>{const text=r.text();if(!/^[0-9a-f]{32}$/.test(text))throw Error('malformed wire text');return text;};break;
  case 'enum':read=r=>{const text=r.text();if(!t.variants.includes(text))throw Error('malformed wire text');return text;};break;
  case 'list':case 'vector':read=(r,d)=>{const n=r.count();if(n>r.remaining||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');const values=new Array(n);for(let i=0;i<n;i++)values[i]=p.element.decodeCompact(r,d+1);return values;};break;
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:read=()=>({});break;
    case 1:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1)});break;
    case 2:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1)});break;
    case 3:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1),[fs[2].name]:fs[2].plan.decodeCompact(r,d+1)});break;
    case 4:read=(r,d)=>({[fs[0].name]:fs[0].plan.decodeCompact(r,d+1),[fs[1].name]:fs[1].plan.decodeCompact(r,d+1),[fs[2].name]:fs[2].plan.decodeCompact(r,d+1),[fs[3].name]:fs[3].plan.decodeCompact(r,d+1)});break;
    default:read=(r,d)=>{const value={};for(const f of fs){r.property.value=f.plan.decodeCompact(r,d+1);Object.defineProperty(value,f.name,r.property);}return value;};
   }break;
  }
  case 'option':read=(r,d)=>r.tag()?{Some:p.element.decodeCompact(r,d+1)}:{None:null};break;
  case 'result':read=(r,d)=>r.tag()?{Err:p.error.decodeCompact(r,d+1)}:{Ok:p.ok.decodeCompact(r,d+1)};break;
  default:read=()=>{throw Error('unsupported wire kind');};
 }
 return read;
}
function compactDecodeOperation(p){
 if(p.kind==='record'&&p.fields.length===1){
  const field=p.fields[0],read=compactReadOperation(field.plan),name=field.name;
  return (r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');if(d+1>r.depth||--r.remaining<0)throw Error('wire node or depth limit');return {[name]:read(r,d+1)};};
 }
 const read=compactReadOperation(p);
 return (r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');return read(r,d);};
}
class CompactDecodeCursor{
 constructor(bytes,limits,flags){this.bytes=bytes;this.view=flags&2?new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength):null;this.cursor=1;this.remaining=limits.nodes;this.depth=limits.depth;this.property=null;}
 require(n){if(n>this.bytes.length-this.cursor)throw Error('truncated compact value');}
 count(){
  if(this.cursor>=this.bytes.length)throw Error('truncated compact value');
  const first=this.bytes[this.cursor++];if(first<128)return first;
  let value=first&127,scale=128;
  for(let i=1;i<5;i++){if(this.cursor>=this.bytes.length)throw Error('truncated compact value');const byte=this.bytes[this.cursor++];if(i===4&&byte>15)throw Error('compact count overflow');value+=(byte&127)*scale;if(byte<128){if(byte===0)throw Error('noncanonical compact count');return value;}scale*=128;}throw Error('compact count overflow');
 }
 tag(){if(this.cursor>=this.bytes.length)throw Error('truncated compact value');const tag=this.bytes[this.cursor++];if(tag>1)throw Error('wire sum tag');return tag;}
 text(){const n=this.count();this.require(n);const start=this.cursor;this.cursor+=n;return wireDecodeText(this.bytes,start,this.cursor);}
}
function wireInvalidValue(){throw Error('invalid value for wire schema');}
// Capture has the canonical logical meaning of decode(encode(value)), without
// allocating wire bytes. A separate plan leaves validation/decoder hot shapes
// unchanged and never retains host input containers between calls.
function wireCapturePlan(root,checked=true){
 const seen=new WeakMap();
 const build=source=>{
  if(seen.has(source))return seen.get(source);
  const p={kind:source.kind,type:source.type,capture:null};seen.set(source,p);
  if(source.fields)p.fields=source.fields.map(f=>({name:f.name,plan:build(f.plan)}));
  if(source.element)p.element=build(source.element);
  if(source.ok){p.ok=build(source.ok);p.error=build(source.error);}
  p.capture=checked?wireCaptureOperation(p):wireCopyOperation(p);return p;
 };return build(root);
}
function wireCaptureOperation(p){
 const t=p.type;let copy;
 switch(p.kind){
  case 'unit':copy=v=>{if(v!==null)wireInvalidValue();return null;};break;
  case 'bool':copy=(v,r)=>{if(typeof v!=='boolean')wireInvalidValue();r.add(1);return v;};break;
  case 'u32':case 'i32':{
   const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
   copy=(v,r)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();r.add(4);return v===0?0:v;};break;
  }
  case 'u64':copy=(v,r)=>{const kind=typeof v;if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();r.add(8);return n;};break;
  case 'f32':copy=(v,r)=>{let bits;if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();bits=wireFloat.getUint32(0,true);}else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}r.add(4);return {F32Bits:bits===0?0:bits};};break;
  case 'string':case 'int':case 'id':case 'enum':copy=(v,r)=>{const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;if(typeof text!=='string'||!text.isWellFormed()||text.length>r.limit)wireInvalidValue();if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();r.add(wireUtf8Length(text));return p.kind==='int'?{Int:text}:text;};break;
  case 'list':case 'vector':{
   const element=p.element,size=p.kind==='vector'?t.size:null;
   copy=(v,r,d)=>{if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();const n=v.length;if(n>r.remaining||size!==null&&n!==size)wireInvalidValue();r.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=element.capture(v[i],r,d+1);return out;};break;
  }
  case 'record':{
   const fs=p.fields;let fields;
   switch(fs.length){
    case 0:fields=()=>({});break;
    case 1:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1)});break;
    case 2:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1)});break;
    case 3:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1)});break;
    case 4:fields=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1),[fs[3].name]:fs[3].plan.capture(v[fs[3].name],r,d+1)});break;
    default:fields=(v,r,d)=>{const out={};for(const f of fs){const value=f.plan.capture(v[f.name],r,d+1);Object.defineProperty(out,f.name,{value,enumerable:true,writable:true,configurable:true});}return out;};
   }
   copy=(v,r,d)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();for(const f of fs)if(!wireOwn(v,f.name))wireInvalidValue();return fields(v,r,d);};break;
  }
  case 'option':copy=(v,r,d)=>{r.add(1);if(wireTagged(v,'None')&&v.None===null)return {None:null};if(wireTagged(v,'Some'))return {Some:p.element.capture(v.Some,r,d+1)};wireInvalidValue();};break;
  case 'result':copy=(v,r,d)=>{r.add(1);if(wireTagged(v,'Ok'))return {Ok:p.ok.capture(v.Ok,r,d+1)};if(wireTagged(v,'Err'))return {Err:p.error.capture(v.Err,r,d+1)};wireInvalidValue();};break;
  default:copy=()=>{throw Error('unsupported wire kind');};
 }
 return (v,r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');r.add(4);return copy(v,r,d);};
}
class WireCaptureCursor{
 constructor(limits){this.remaining=limits.nodes;this.depth=limits.depth;this.limit=limits.bytes;this.bytes=40;this.add(0);}
 add(n){this.bytes+=n;if(this.bytes>this.limit)throw Error('wire byte limit');}
 enter(depth,bytes){if(depth>this.depth||--this.remaining<0)throw Error('wire node or depth limit');this.add(bytes);}
 text(value){if(value.length>this.limit)throw Error('wire byte limit');this.add(wireUtf8Length(value));}
}
// Literal lowerers share this fixed resource policy with logical capture.
export function createValueCaptureBudget(options=wireDefaultOptions){return new WireCaptureCursor(wireLimits(options));}
// The trusted-value API has the same canonical copy and ownership semantics.
// Its caller supplies a stable value accepted by validateValue. Shape/range
// checks remain at external capture boundaries; resource limits still apply.
function wireCopyOperation(p){
 let copy;
 switch(p.kind){
  case 'unit':copy=()=>null;break;
  case 'bool':copy=(v,r)=>{r.add(1);return v;};break;
  case 'u32':copy=(v,r)=>{r.add(4);return v>>>0;};break;
  case 'i32':copy=(v,r)=>{r.add(4);return v|0;};break;
  case 'u64':copy=(v,r)=>{r.add(8);return BigInt(v);};break;
  case 'f32':copy=(v,r)=>{let bits;if(typeof v==='number'){wireFloat.setFloat32(0,v,true);bits=wireFloat.getUint32(0,true);}else bits=v.F32Bits;r.add(4);return {F32Bits:bits===0?0:bits};};break;
  case 'string':case 'id':case 'enum':copy=(v,r)=>{r.add(wireUtf8Length(v));return v;};break;
  case 'int':copy=(v,r)=>{const text=typeof v==='bigint'?v.toString():v.Int;r.add(wireUtf8Length(text));return {Int:text};};break;
  case 'list':case 'vector':copy=(v,r,d)=>{const n=v.length;if(n>r.remaining)throw Error('wire sequence size');r.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=p.element.capture(v[i],r,d+1);return out;};break;
  case 'record':{
   const fs=p.fields;
   switch(fs.length){
    case 0:copy=()=>({});break;
    case 1:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1)});break;
    case 2:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1)});break;
    case 3:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1)});break;
    case 4:copy=(v,r,d)=>({[fs[0].name]:fs[0].plan.capture(v[fs[0].name],r,d+1),[fs[1].name]:fs[1].plan.capture(v[fs[1].name],r,d+1),[fs[2].name]:fs[2].plan.capture(v[fs[2].name],r,d+1),[fs[3].name]:fs[3].plan.capture(v[fs[3].name],r,d+1)});break;
    default:copy=(v,r,d)=>{const out={};for(const f of fs){const value=f.plan.capture(v[f.name],r,d+1);Object.defineProperty(out,f.name,{value,enumerable:true,writable:true,configurable:true});}return out;};
   }break;
  }
  case 'option':copy=(v,r,d)=>{r.add(1);return Object.hasOwn(v,'None')&&v.None===null?{None:null}:{Some:p.element.capture(v.Some,r,d+1)};};break;
  case 'result':copy=(v,r,d)=>{r.add(1);return Object.hasOwn(v,'Ok')?{Ok:p.ok.capture(v.Ok,r,d+1)}:{Err:p.error.capture(v.Err,r,d+1)};};break;
  default:copy=()=>{throw Error('unsupported wire kind');};
 }
 return (v,r,d)=>{if(d>r.depth||--r.remaining<0)throw Error('wire node or depth limit');r.add(4);return copy(v,r,d);};
}
// Emit the cached literal schema with one forward writer. Each value is checked
// where it is consumed; byte bounds belong to the writer, not a second size walk.
function wireEncodeValue(root,value,l,w){
 let remaining=l.nodes;const depthLimit=l.depth;
 const node=(p,v,d)=>{
  if(d>depthLimit||--remaining<0)throw Error('wire node or depth limit');
  const t=p.type,start=w.beginNode();
  switch(p.kind){
   case 'unit':if(v!==null)wireInvalidValue();break;
   case 'bool':if(typeof v!=='boolean')wireInvalidValue();w.byte(+v);break;
   case 'u32':case 'i32':{
    const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
    if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();w.word(v>>>0);break;
   }
   case 'u64':{
    const kind=typeof v;
    if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();
    const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();w.wide(n);break;
   }
   case 'f32':{
    let bits;
    if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();bits=wireFloat.getUint32(0,true);}
    else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}
    w.word(bits);break;
   }
   case 'string':case 'int':case 'id':case 'enum':{
    const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;
    if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&(typeof text!=='string'||!/^[0-9a-f]{32}$/.test(text))||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();
    w.text(text);break;
   }
   case 'list':case 'vector':{
    if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();
    if(v.length>remaining||p.kind==='vector'&&v.length!==t.size)wireInvalidValue();
    w.count(v.length);for(let i=0;i<v.length;i++)node(p.element,v[i],d+1);break;
   }
   case 'record':{
    const fs=p.fields;
    if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();
    for(let i=0;i<fs.length;i++)if(!wireOwn(v,fs[i].name))wireInvalidValue();
    for(let i=0;i<fs.length;i++){const f=fs[i];node(f.plan,v[f.name],d+1);}break;
   }
   case 'option':{
    if(wireTagged(v,'None')&&v.None===null)w.byte(0);
    else if(wireTagged(v,'Some')){w.byte(1);node(p.element,v.Some,d+1);}else wireInvalidValue();break;
   }
   case 'result':{
    if(wireTagged(v,'Ok')){w.byte(0);node(p.ok,v.Ok,d+1);}
    else if(wireTagged(v,'Err')){w.byte(1);node(p.error,v.Err,d+1);}else wireInvalidValue();break;
   }
   default:throw Error('unsupported wire kind');
  }
  w.endNode(start);
 };
 node(root,value,0);
}
function wireCheckValue(root,value,l){
 let remaining=l.nodes,total=40;
 const add=n=>{total+=n;if(total>l.bytes)throw Error('wire byte limit');};
 const node=(p,v,d)=>{
  while(true){
   if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');
   const t=p.type;
   switch(p.kind){
    case 'unit':if(v!==null)wireInvalidValue();add(4);return;
    case 'bool':if(typeof v!=='boolean')wireInvalidValue();add(5);return;
    case 'u32':case 'i32':{
     const min=p.kind==='u32'?0:-2147483648,max=p.kind==='u32'?4294967295:2147483647;
     if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)wireInvalidValue();add(8);return;
    }
    case 'u64':{
     const kind=typeof v;
     if(kind==='number'&&!Number.isSafeInteger(v)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&(!wireDecimal(v)||v.startsWith('-')))wireInvalidValue();
     const n=BigInt(v);if(n<0n||n>18446744073709551615n)wireInvalidValue();add(12);return;
    }
    case 'f32':{
     if(typeof v==='number'&&Number.isFinite(v)){wireFloat.setFloat32(0,v,true);if(!Number.isFinite(wireFloat.getFloat32(0,true)))wireInvalidValue();}
     else{if(!wireTagged(v,'F32Bits'))wireInvalidValue();const bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)wireInvalidValue();}
     add(8);return;
    }
    case 'string':case 'int':case 'id':case 'enum':{
     const text=p.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;
     if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes)wireInvalidValue();
     if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))wireInvalidValue();
     add(4+wireUtf8Length(text));return;
    }
    case 'list':case 'vector':{
     if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))wireInvalidValue();
     if(v.length>remaining||p.kind==='vector'&&v.length!==t.size)wireInvalidValue();
     add(8);for(let i=0;i<v.length;i++)node(p.element,v[i],d+1);return;
    }
    case 'record':{
     const fs=p.fields;
     if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==fs.length)wireInvalidValue();
     for(let i=0;i<fs.length;i++)if(!wireOwn(v,fs[i].name))wireInvalidValue();
     add(4);if(!fs.length)return;
     for(let i=0;i<fs.length-1;i++)node(fs[i].plan,v[fs[i].name],d+1);
     const f=fs[fs.length-1];p=f.plan;v=v[f.name];d++;continue;
    }
    case 'option':{
     if(wireTagged(v,'None')&&v.None===null){add(5);return;}
     if(!wireTagged(v,'Some'))wireInvalidValue();add(5);p=p.element;v=v.Some;d++;continue;
    }
    case 'result':{
     if(wireTagged(v,'Ok')){add(5);p=p.ok;v=v.Ok;}
     else if(wireTagged(v,'Err')){add(5);p=p.error;v=v.Err;}else wireInvalidValue();
     d++;continue;
    }
    default:throw Error('unsupported wire kind');
   }
  }
 };
 node(root,value,0);if(total>l.bytes)throw Error('wire byte limit');
}
// A single cursor replaces per-node child closures and {end,value} temporaries.
// Projection filters limit callback materialisation, never schema validation.
function wireScanValue(root,bytes,view,l,materialize,visitor,selected,spans){
 let cursor=40,remaining=l.nodes;
 const property={value:null,enumerable:true,writable:true,configurable:true};
 const node=(p,parentEnd,d)=>{
  if(d>l.depth||--remaining<0||cursor+4>parentEnd)throw Error('wire node, depth or length limit');
  const t=p.type,start=cursor+4,end=start+view.getUint32(cursor,true);if(end>parentEnd)throw Error('truncated wire frame');cursor=start;let value;
  switch(p.kind){
   case 'unit':if(end-start!==0)throw Error('malformed wire scalar');value=null;break;
   case 'bool':if(end-start!==1)throw Error('malformed wire scalar');if(bytes[start]>1)throw Error('invalid wire Bool');value=!!bytes[start];cursor=end;break;
   case 'u32':case 'i32':if(end-start!==4)throw Error('malformed wire scalar');value=p.kind==='u32'?view.getUint32(start,true):view.getInt32(start,true);cursor=end;break;
   case 'f32':if(end-start!==4)throw Error('malformed wire scalar');if(materialize)value={F32Bits:view.getUint32(start,true)};cursor=end;break;
   case 'u64':if(end-start!==8)throw Error('malformed wire scalar');if(materialize)value=view.getBigUint64(start,true);cursor=end;break;
   case 'string':case 'int':case 'id':case 'enum':{
    if(p.kind==='string'&&!materialize){let i=start;while(i<end&&bytes[i]<128)i++;if(i<end)wireDecoder.decode(bytes.subarray(start,end));}
    else{const text=wireDecodeText(bytes,start,end);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=p.kind==='int'?{Int:text}:text;}
    cursor=end;break;
   }
   case 'list':case 'vector':{
    if(start+4>end)throw Error('wire list count');const n=view.getUint32(start,true);cursor+=4;
    if(n>remaining||n>Math.floor((end-cursor)/4)||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');
    if(materialize)value=[];for(let i=0;i<n;i++){const child=node(p.element,end,d+1);if(materialize)value.push(child);}break;
   }
   case 'record':{
    const fs=p.fields;
    // Computed literal keys create own data properties even for __proto__ or
    // prototype setters. Common small records need no descriptor allocations.
    if(materialize&&fs.length<=4){
     switch(fs.length){case 0:value={};break;case 1:value={[fs[0].name]:node(fs[0].plan,end,d+1)};break;case 2:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1)};break;case 3:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1),[fs[2].name]:node(fs[2].plan,end,d+1)};break;case 4:value={[fs[0].name]:node(fs[0].plan,end,d+1),[fs[1].name]:node(fs[1].plan,end,d+1),[fs[2].name]:node(fs[2].plan,end,d+1),[fs[3].name]:node(fs[3].plan,end,d+1)};break;}
    }else{if(materialize)value={};for(const f of fs){const child=node(f.plan,end,d+1);if(materialize){property.value=child;Object.defineProperty(value,f.name,property);}}}break;
   }
   case 'option':case 'result':{
    if(start===end||bytes[cursor]>1)throw Error('wire sum tag');const tag=bytes[cursor++];
    if(p.kind==='option'&&tag===0){if(materialize)value={None:null};}
    else{const label=p.kind==='option'?'Some':tag===0?'Ok':'Err',child=node(p.kind==='option'?p.element:tag===0?p.ok:p.error,end,d+1);if(materialize)value={[label]:child};}break;
   }
   default:throw Error('unsupported wire kind');
  }
  if(cursor!==end)throw Error('trailing wire frame bytes');
  if(visitor&&(!selected||selected.has(t.name))){if(spans)visitor(t,bytes,start,end,d);else visitor(t,bytes.subarray(start,end),d);}
  return value;
 };
 const result=node(root,bytes.length,0);if(cursor!==bytes.length)throw Error('trailing wire bytes');return result;
}
export class ValueCodec{
 #hash;
 #header;
 #headerWords;
 #descriptor;
 #valuePlan;
 #compactCodec;
 #encoder;
 #decodeBound=0;
 #scanPlan=null;
 #capturePlan=null;
 #copyPlan=null;
 get descriptor(){return this.#descriptor;}
 constructor(descriptor){
  // This synchronous path is for compiler-generated immutable metadata. For
  // untrusted descriptors use createValueCodec and compare the computed identity.
  if(descriptor?.format!==valueWireFormat||!/^[0-9a-f]{64}$/.test(descriptor.identity))throw Error('invalid wire schema');
  this.#descriptor=structuredClone(descriptor);this.#hash=Uint8Array.from(descriptor.identity.match(/../g),s=>parseInt(s,16));
  this.#header=new Uint8Array(40);this.#header.set(wireMagic);this.#header.set(this.#hash,8);
  const headerView=new DataView(this.#header.buffer);this.#headerWords=Array.from({length:10},(_,i)=>headerView.getUint32(i*4,true));
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}};freeze(this.descriptor);this.#valuePlan=wireValuePlan(this);
 }
 resolve(t){for(let i=0;i<64;i++){if(t.kind!=='ref')return t;t=this.descriptor.named[t.name];if(!t)throw Error('wire reference');}throw Error('wire reference cycle');}
 validateValue(value,options=wireDefaultOptions){wireCheckValue(this.#valuePlan,value,wireLimits(options));return true;}
 capture(value,options=wireDefaultOptions){const limits=wireLimits(options);this.#capturePlan??=wireCapturePlan(this.#valuePlan);return this.#capturePlan.capture(value,new WireCaptureCursor(limits),0);}
 copy(value,options=wireDefaultOptions){const limits=wireLimits(options);this.#copyPlan??=wireCapturePlan(this.#valuePlan,false);return this.#copyPlan.capture(value,new WireCaptureCursor(limits),0);}
 compact(){return this.#compactCodec??=new CompactValueCodec(this);}
 encode(value,options=wireDefaultOptions){
  const l=wireLimits(options),w=this.#encoder&&!this.#encoder.active?this.#encoder:new WireEncoder(l);
  this.#encoder??=w;w.reset(l);
  try{w.bytes(this.#header);wireEncodeValue(this.#valuePlan,value,l,w);return w.finish();}
  finally{w.active=false;if(w.capacity>4096&&this.#encoder===w)this.#encoder=undefined;}
 }
 encodeWith(emit,options=wireDefaultOptions){
  const w=new WireEncoder(options);w.bytes(wireMagic);w.bytes(this.#hash);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 scan(bytes,options=wireDefaultOptions,materialize=false,visitor=null,names=null,spans=false){
  const l=wireLimits(options);if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<44||bytes.length>l.bytes)throw Error('wire byte limit or header');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<10;i++)if(view.getUint32(i*4,true)!==this.#headerWords[i])throw Error('wire format or schema mismatch');
  if(names!==null&&(!Array.isArray(names)||names.length>100000||names.some(n=>typeof n!=='string')))throw Error('wire visitor names');
  if(materialize&&!visitor){this.#decodeBound||=wireBindDecodePlan(this.#valuePlan);const cursor=new WireDecodeCursor(bytes,view,l);if(this.#decodeBound&1)cursor.property={value:null,enumerable:true,writable:true,configurable:true};const value=this.#valuePlan.decode(cursor,bytes.length,0);if(cursor.cursor!==bytes.length)throw Error('trailing wire bytes');return value;}
  if(!materialize){this.#scanPlan??=wireScanPlan(this.#valuePlan);const cursor=new WireScanCursor(bytes,view,l,visitor,names===null?null:new Set(names),spans),value=this.#scanPlan.scan(cursor,bytes.length,0);if(cursor.cursor!==bytes.length)throw Error('trailing wire bytes');return value;}
  return wireScanValue(this.#valuePlan,bytes,view,l,materialize,visitor,names===null?null:new Set(names),spans);
 }
 visit(bytes,visitor,options=wireDefaultOptions,names=null){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor,names);}
 visitSpans(bytes,visitor,options=wireDefaultOptions,names=null){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor,names,true);}
 validate(bytes,options=wireDefaultOptions){this.scan(bytes,options,false);return true;}
 decode(bytes,options=wireDefaultOptions){return this.scan(bytes,options,true);}
}

// Bounded forward emission avoids building and repeatedly joining child buffers.
class WireEncoder{
 #data=new Uint8Array(256);#view=new DataView(this.#data.buffer);#at=0;#remaining;#depth=0;#byteLimit;#depthLimit;
 active=false;
 constructor(options){this.reset(options);}
 reset(options){const limits=wireLimits(options);this.#byteLimit=limits.bytes;this.#depthLimit=limits.depth;this.#remaining=limits.nodes;this.#depth=0;this.#at=0;this.active=true;}
 get capacity(){return this.#data.length;}
 get position(){return this.#at;}
 beginNode(){const at=this.#at;this.word(0);return at;}
 endNode(at){this.patchWord(at,this.#at-at-4);}
 count(n){this.word(n);}
 beginCount(){const at=this.position;this.count(0);return at;}
 endCount(at,n){this.patchWord(at,n);}
 #reserve(size){
  const end=this.#at+size;if(end>this.#byteLimit)throw Error('wire byte limit');
  if(end>this.#data.length){const next=new Uint8Array(Math.min(this.#byteLimit,Math.max(end,this.#data.length*2)));next.set(this.#data.subarray(0,this.#at));this.#data=next;this.#view=new DataView(next.buffer);}
  return end;
 }
 bytes(bytes){const end=this.#reserve(bytes.length);this.#data.set(bytes,this.#at);this.#at=end;}
 byte(n){if(!Number.isInteger(n)||n<0||n>255)throw Error('wire byte range');this.#reserve(1);this.#data[this.#at++]=n;}
 word(n){if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire word range');const end=this.#reserve(4);this.#view.setUint32(this.#at,n,true);this.#at=end;}
 wide(n){if(typeof n!=='bigint'||n<0n||n>18446744073709551615n)throw Error('wire wide range');const end=this.#reserve(8);this.#view.setBigUint64(this.#at,n,true);this.#at=end;}
 text(text,count=false){
  if(typeof text!=='string')throw Error('wire Unicode');
  if(text.length<=16){
   let ascii=true;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)>=128){ascii=false;break;}
   if(ascii){if(count)this.count(text.length);const end=this.#reserve(text.length);for(let i=0;i<text.length;i++)this.#data[this.#at+i]=text.charCodeAt(i);this.#at=end;return;}
  }
  if(!text.isWellFormed())throw Error('wire Unicode');const size=wireUtf8Length(text);if(count)this.count(size);
  const end=this.#reserve(size),r=wireEncoder.encodeInto(text,this.#data.subarray(this.#at,end));if(r.read!==text.length||r.written!==size)throw Error('wire UTF-8 size');this.#at=end;
 }
 patchWord(at,n){if(!Number.isInteger(at)||at<0||at+4>this.#at||!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire patch offset');this.#view.setUint32(at,n,true);}
 patchByte(at,n){if(!Number.isInteger(at)||at<0||at>=this.#at||!Number.isInteger(n)||n<0||n>255)throw Error('wire patch offset');this.#data[at]=n;}
 replace(at,removed,bytes){
  if(!Number.isInteger(at)||!Number.isInteger(removed)||at<0||removed<0||at+removed>this.#at||!(bytes instanceof Uint8Array))throw Error('wire replacement range');
  const extra=bytes.length-removed,end=extra>0?this.#reserve(extra):this.#at+extra;
  this.#data.copyWithin(at+bytes.length,at+removed,this.#at);this.#data.set(bytes,at);this.#at=end;
 }
 // Literal generated writers use balanced frames without per-node callbacks.
 // An exception abandons this invocation; encodeWith never reuses its writer.
 openFrame(){if(this.#depth>this.#depthLimit||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.beginNode();this.#depth++;return at;}
 closeFrame(at){if(this.#depth===0)throw Error('wire frame boundary');this.#depth--;this.endNode(at);}
 frame(emit){if(this.#depth>this.#depthLimit||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.beginNode();this.#depth++;try{emit(this);}finally{this.#depth--;}this.endNode(at);}
 reorder(start,spans){
  const sorted=spans.slice().sort((a,b)=>a[0]-b[0]);let at=start;
  for(const [a,b] of sorted){if(!Number.isInteger(a)||!Number.isInteger(b)||a!==at||b<a)throw Error('wire span permutation');at=b;}
  if(start<0||start>this.#at||at!==this.#at)throw Error('wire span permutation');
  if(spans.every((s,i)=>s===sorted[i]))return;
  const copy=this.#data.slice(start,this.#at);at=start;for(const [a,b] of spans){this.#data.set(copy.subarray(a-start,b-start),at);at+=b-a;}
 }
 finish(){if(this.#depth!==0)throw Error('wire frame boundary');return this.#data.slice(0,this.#at);}
}

class CompactWireEncoder extends WireEncoder{
 beginNode(){return 0;}
 endNode(){}
 endCount(at,n){
  if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('compact count range');
  if(n<128){this.patchByte(at,n);return;}
  const bytes=[];while(n>=128){bytes.push(n%128+128);n=Math.floor(n/128);}bytes.push(n);this.replace(at,1,Uint8Array.from(bytes));
 }
 count(n){
  if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('compact count range');
  while(n>=128){this.byte(n%128+128);n=Math.floor(n/128);}this.byte(n);
 }
 text(text){super.text(text,true);}
}

function compactScanValue(root,bytes,l,materialize){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let cursor=1,remaining=l.nodes;
 const require=n=>{if(n>bytes.length-cursor)throw Error('truncated compact value');};
 const count=()=>{
  let value=0,scale=1;
  for(let i=0;i<5;i++){
   require(1);const byte=bytes[cursor++];
   if(i===4&&byte>15)throw Error('compact count overflow');
   value+=(byte&127)*scale;
   if(byte<128){if(i>0&&byte===0)throw Error('noncanonical compact count');return value;}
   scale*=128;
  }throw Error('compact count overflow');
 };
 const property={value:null,enumerable:true,writable:true,configurable:true};
 const node=(p,d)=>{
  if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');
  const t=p.type;let value;
  switch(p.kind){
   case 'unit':return null;
   case 'bool':require(1);if(bytes[cursor]>1)throw Error('invalid wire Bool');return !!bytes[cursor++];
   case 'u32':case 'i32':require(4);value=p.kind==='u32'?view.getUint32(cursor,true):view.getInt32(cursor,true);cursor+=4;return value;
   case 'f32':require(4);if(materialize)value={F32Bits:view.getUint32(cursor,true)};cursor+=4;return value;
   case 'u64':require(8);if(materialize)value=view.getBigUint64(cursor,true);cursor+=8;return value;
   case 'string':case 'int':case 'id':case 'enum':{
    const n=count();require(n);const start=cursor;cursor+=n;
    if(p.kind==='string'&&!materialize){let i=start;while(i<cursor&&bytes[i]<128)i++;if(i<cursor)wireDecoder.decode(bytes.subarray(start,cursor));}
    else{const text=wireDecodeText(bytes,start,cursor);if(p.kind==='int'&&!wireDecimal(text)||p.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||p.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=p.kind==='int'?{Int:text}:text;}
    return value;
   }
   case 'list':case 'vector':{
    const n=count();if(n>remaining||p.kind==='vector'&&n!==t.size)throw Error('wire sequence size');
    if(materialize)value=[];for(let i=0;i<n;i++){const child=node(p.element,d+1);if(materialize)value.push(child);}return value;
   }
   case 'record':{
    const fs=p.fields;
    if(materialize&&fs.length<=4){
     switch(fs.length){case 0:return {};case 1:return {[fs[0].name]:node(fs[0].plan,d+1)};case 2:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1)};case 3:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1),[fs[2].name]:node(fs[2].plan,d+1)};case 4:return {[fs[0].name]:node(fs[0].plan,d+1),[fs[1].name]:node(fs[1].plan,d+1),[fs[2].name]:node(fs[2].plan,d+1),[fs[3].name]:node(fs[3].plan,d+1)};}
    }
    if(materialize)value={};for(const f of fs){const child=node(f.plan,d+1);if(materialize){property.value=child;Object.defineProperty(value,f.name,property);}}return value;
   }
   case 'option':case 'result':{
    require(1);const tag=bytes[cursor++];if(tag>1)throw Error('wire sum tag');
    if(p.kind==='option'&&tag===0)return materialize?{None:null}:undefined;
    const label=p.kind==='option'?'Some':tag===0?'Ok':'Err',child=node(p.kind==='option'?p.element:tag===0?p.ok:p.error,d+1);
    return materialize?{[label]:child}:undefined;
   }
   default:throw Error('unsupported wire kind');
  }
 };
 const value=node(root,0);if(cursor!==bytes.length)throw Error('trailing compact bytes');return value;
}

// General transport codec, independent of source rewrites and checkpoints.
// The sender/receiver must negotiate this exact identity and format. There is
// deliberately no claim that the bytes themselves identify their schema.
export class CompactValueCodec{
 #source;#plan;#encoder;#decodeBound=0;
 get format(){return compactValueWireFormat;}
 get identity(){return this.#source.descriptor.identity;}
 constructor(valueCodec){if(!(valueCodec instanceof ValueCodec))throw Error('compact codec requires a checked value codec');this.#source=valueCodec;this.#plan=wireValuePlan(valueCodec);}
 encode(value,options=wireDefaultOptions){
  const l=wireLimits(options),w=this.#encoder&&!this.#encoder.active?this.#encoder:new CompactWireEncoder(l);
  this.#encoder??=w;w.reset(l);
  try{w.byte(1);wireEncodeValue(this.#plan,value,l,w);return w.finish();}
  finally{w.active=false;if(w.capacity>4096&&this.#encoder===w)this.#encoder=undefined;}
 }
 encodeWith(emit,options=wireDefaultOptions){
  const w=new CompactWireEncoder(options);w.byte(1);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 #scan(bytes,options,materialize){
  const l=wireLimits(options);
  if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<1||bytes.length>l.bytes)throw Error('wire byte limit or header');
  if(bytes[0]!==1)throw Error('compact format mismatch');
  if(materialize){this.#decodeBound||=wireBindDecodePlan(this.#plan,true);const cursor=new CompactDecodeCursor(bytes,l,this.#decodeBound);if(this.#decodeBound&1)cursor.property={value:null,enumerable:true,writable:true,configurable:true};const value=this.#plan.decodeCompact(cursor,0);if(cursor.cursor!==bytes.length)throw Error('trailing compact bytes');return value;}
  return compactScanValue(this.#plan,bytes,l,materialize);
 }
 decode(bytes,options=wireDefaultOptions){return this.#scan(bytes,options,true);}
 validate(bytes,options=wireDefaultOptions){this.#scan(bytes,options,false);return true;}
}

// Compiler materialisers consume already validated bytes synchronously. This
// factory is for trusted emitted code, not untrusted descriptor/callback data.
// The complete generic validator runs before any compiler reader is invoked.
class ValidatedValueReader{
 constructor(bytes,compact){this.bytes=bytes;this.view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);this.cursor=compact?1:40;this.compact=compact;}
 frame(){if(this.compact)return 0;const end=this.cursor+4+this.view.getUint32(this.cursor,true);this.cursor+=4;return end;}
 finish(end){if(!this.compact&&this.cursor!==end)throw Error('compiled reader frame mismatch');}
 byte(){return this.bytes[this.cursor++];}
 word(){const n=this.view.getUint32(this.cursor,true);this.cursor+=4;return n;}
 signed(){const n=this.view.getInt32(this.cursor,true);this.cursor+=4;return n;}
 wide(){const n=this.view.getBigUint64(this.cursor,true);this.cursor+=8;return n;}
 count(){if(!this.compact)return this.word();let n=0,scale=1,byte;do{byte=this.byte();n+=(byte&127)*scale;scale*=128;}while(byte>=128);return n;}
 text(end){const n=this.compact?this.count():end-this.cursor,start=this.cursor;this.cursor+=n;return wireDecodeText(this.bytes,start,this.cursor);}
}
class CompiledCompactValueCodec extends CompactValueCodec{
 #read;
 constructor(source,read){super(source);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){super.validate(bytes,options);const reader=new ValidatedValueReader(bytes,true),value=this.#read(reader);if(reader.cursor!==bytes.length)throw Error('compiled reader trailing bytes');return value;}
}
class CompiledValueCodec extends ValueCodec{
 #read;#compiledCompact=null;
 constructor(descriptor,read){super(descriptor);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){super.validate(bytes,options);const reader=new ValidatedValueReader(bytes,false),value=this.#read(reader);if(reader.cursor!==bytes.length)throw Error('compiled reader trailing bytes');return value;}
 compact(){return this.#compiledCompact??=new CompiledCompactValueCodec(this,this.#read);}
}
export function createCompiledValueCodec(descriptor,read){if(typeof read!=='function')throw Error('compiled value reader required');return new CompiledValueCodec(descriptor,read);}

// Trusted literal materialisers may use this checked reader to validate and
// construct in one traversal. The emitter must use frame/finish at every source
// node, typed text reads and counted sequence reads; arbitrary callbacks do not
// establish a schema correspondence proof. The independent scanner remains the
// validation oracle and the original factory retains its pre-validation path.
function literalValueHeader(identity){
 const bytes=new Uint8Array(40);bytes.set(wireMagic);
 for(let i=0;i<32;i++)bytes[i+8]=parseInt(identity.slice(i*2,i*2+2),16);
 const view=new DataView(bytes.buffer),words=new Uint32Array(10);
 for(let i=0;i<10;i++)words[i]=view.getUint32(i*4,true);
 return words;
}
class CheckedLiteralValueReader {
 constructor(bytes,header,compact,limits){
  if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<(compact?1:44)||bytes.length>limits.bytes)throw Error('wire byte limit or header');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(compact){if(bytes[0]!==1)throw Error('compact format mismatch');}
  else for(let i=0;i<10;i++)if(view.getUint32(i*4,true)!==header[i])throw Error('wire format or schema mismatch');
  this.bytes=bytes;this.view=view;
  this.cursor=compact?1:40;this.compact=compact;this.remaining=limits.nodes;this.depth=limits.depth;this.ends=[];
 }
 require(n){if(this.cursor+n>(this.ends.at(-1)??this.bytes.length))throw Error('truncated wire frame');}
 frame(){
  if(this.ends.length>this.depth||--this.remaining<0)throw Error('wire node or depth limit');
  let end=this.bytes.length;
  if(!this.compact){this.require(4);end=this.cursor+4+this.view.getUint32(this.cursor,true);this.require(end-this.cursor);this.cursor+=4;}
  this.ends.push(end);return this.compact?0:end;
 }
 finish(end){
  if(!this.ends.length||!this.compact&&(this.ends.at(-1)!==end||this.cursor!==end))throw Error('compiled reader frame mismatch');
  this.ends.pop();
 }
 byte(){this.require(1);const value=this.bytes[this.cursor++];if(value>1)throw Error('wire sum tag or Bool');return value;}
 word(){this.require(4);const value=this.view.getUint32(this.cursor,true);this.cursor+=4;return value;}
 signed(){this.require(4);const value=this.view.getInt32(this.cursor,true);this.cursor+=4;return value;}
 wide(){this.require(8);const value=this.view.getBigUint64(this.cursor,true);this.cursor+=8;return value;}
 rawCount(){
  if(!this.compact)return this.word();
  let value=0,scale=1;
  for(let i=0;i<5;i++){
   this.require(1);const byte=this.bytes[this.cursor++];
   if(i===4&&byte>15)throw Error('compact count overflow');
   value+=(byte&127)*scale;
   if(byte<128){if(i>0&&byte===0)throw Error('noncanonical compact count');return value;}
   scale*=128;
  }
  throw Error('compact count overflow');
 }
 count(size){
  const value=this.rawCount();
  if(value>this.remaining||size!==undefined&&value!==size)throw Error('wire sequence size');
  return value;
 }
 text(end,kind='string',variants){
  const size=this.compact?this.rawCount():end-this.cursor;
  this.require(size);const start=this.cursor;this.cursor+=size;
  const value=wireDecodeText(this.bytes,start,this.cursor);
  if(kind==='int'&&!wireDecimal(value)||kind==='id'&&!/^[0-9a-f]{32}$/.test(value)||kind==='enum'&&!variants.includes(value))throw Error('malformed wire text');
  return value;
 }
 complete(){if(this.ends.length||this.cursor!==this.bytes.length)throw Error('compiled reader trailing bytes');}
}
// Compact source nodes have no individual frame ends: retain the same checked
// depth/node order using a counter, with bounds against the complete buffer.
class CheckedCompactLiteralValueReader extends CheckedLiteralValueReader {
 constructor(bytes,limits){super(bytes,null,true,limits);this.level=0;}
 require(n){if(this.cursor+n>this.bytes.length)throw Error('truncated wire frame');}
 frame(){if(this.level>this.depth||--this.remaining<0)throw Error('wire node or depth limit');this.level++;return 0;}
 finish(_end){if(!this.level)throw Error('compiled reader frame mismatch');this.level--;}
 complete(){if(this.level||this.cursor!==this.bytes.length)throw Error('compiled reader trailing bytes');}
}
class FusedCompactValueCodec extends CompactValueCodec {
 #read;
 constructor(source,read){super(source);this.#read=read;}
 decode(bytes,options=wireDefaultOptions){
  const limits=wireLimits(options);
  try{const reader=new CheckedCompactLiteralValueReader(bytes,limits),value=this.#read(reader);reader.complete();return value;}
  catch(error){super.validate(bytes,limits);throw error;}
 }
}
class FusedValueCodec extends ValueCodec {
 #read;#header;#fusedCompact=null;
 constructor(descriptor,read){super(descriptor);this.#read=read;this.#header=literalValueHeader(this.descriptor.identity);}
 decode(bytes,options=wireDefaultOptions){
  const limits=wireLimits(options);
  try{const reader=new CheckedLiteralValueReader(bytes,this.#header,false,limits),value=this.#read(reader);reader.complete();return value;}
  catch(error){super.validate(bytes,limits);throw error;}
 }
 compact(){return this.#fusedCompact??=new FusedCompactValueCodec(this,this.#read);}
}
export function createFusedValueCodec(descriptor,read){if(typeof read!=='function')throw Error('compiled value reader required');return new FusedValueCodec(descriptor,read);}
// JSON text is a boundary adapter to an ordinary recursive Ink datatype.
// No JavaScript Number conversion occurs for JSON numeric tokens.
export function jsonNumberToken(s){return typeof s==='string'&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(s);}
// JSON numeric tokens have an ASCII grammar. Check validated UTF-8 spans
// directly, preserving exact lexemes without allocating a decoded String.
function jsonNumberSpan(bytes,lo,hi){
 let at=lo;if(bytes[at]===45)at++;
 if(at>=hi)return false;
 if(bytes[at]===48)at++;
 else{if(bytes[at]<49||bytes[at]>57)return false;do{at++;}while(at<hi&&bytes[at]>=48&&bytes[at]<=57);}
 if(at<hi&&bytes[at]===46){const start=++at;while(at<hi&&bytes[at]>=48&&bytes[at]<=57)at++;if(at===start)return false;}
 if(at<hi&&(bytes[at]===69||bytes[at]===101)){at++;if(at<hi&&(bytes[at]===43||bytes[at]===45))at++;const start=at;while(at<hi&&bytes[at]>=48&&bytes[at]<=57)at++;if(at===start)return false;}
 return at===hi;
}
const jsonWireEncoder=new TextEncoder();
// Scalar conversion completes before writer callbacks; no per-value byte array.
const jsonFloatScratch=new DataView(new ArrayBuffer(4));
function jsonUtf8Length(text){if(text.length>16&&!/[^\x00-\x7f]/.test(text))return text.length;let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff){bytes+=4;i++;}else bytes+=3;}return bytes;}
const jsonLimits={bytes:16777216,nodes:1000000,depth:128};
const jsonQuoters=new WeakSet();
/** Explicit, bounded reuse of immutable JSON string quotes. Cache payload bytes
 * are UTF-16 storage estimates; entry caps bound separate Map/object overhead.
 * Logical output budgets are charged again on every use, including cache hits.
 */
export function createJsonQuoter({maxEntries=1024,maxBytes=131072}={}){
 if(!Number.isSafeInteger(maxEntries)||maxEntries<0||maxEntries>65536||!Number.isSafeInteger(maxBytes)||maxBytes<0||maxBytes>16777216)throw Error('JSON quote cache budget');
 const entries=new Map();let bytes=0,hits=0,misses=0;
 const token=value=>{
  const prior=entries.get(value);if(prior!==undefined){hits++;return prior;}
  if(typeof value!=='string'||!value.isWellFormed())throw Error('invalid JSON String');
  misses++;const text=JSON.stringify(value),size=2*(value.length+text.length),quoted=Object.freeze({text,utf8Bytes:jsonUtf8Length(text)});
  if(maxEntries&&size<=maxBytes){
   while(entries.size&&(entries.size>=maxEntries||bytes+size>maxBytes)){const key=entries.keys().next().value;bytes-=2*(key.length+entries.get(key).text.length);entries.delete(key);}
   entries.set(value,quoted);bytes+=size;
  }
  return quoted;
 };
 const quoter=Object.freeze({
  token,
  quote(value){return token(value).text;},
  clear(){entries.clear();bytes=0;},
  stats(){return {entries:entries.size,payload_bytes:bytes,hits,misses};},
 });jsonQuoters.add(quoter);return quoter;
}
function checkedJsonLimits(options){const l={...jsonLimits,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>jsonLimits[k])throw Error('JSON hard resource limit');return l;}
function jsonVariant(index,item){let payload=index===0?{}:{item0:item};if(index<5)payload={Ok:payload};for(let i=0;i<index;i++)payload={Err:payload};return {payload};}
export function parseJson(text,options={}){return parseJsonValue(text,options,null);}
function parseJsonValue(text,options,boundary){
 const p=new JsonWireReader(text,options);
 const value=(d,wireDepth=0)=>{
  p.node(d);const c=p.peek();
  if(c==='n'&&text.startsWith('null',p.at)){boundary?.node(0,wireDepth);p.at+=4;return jsonVariant(0,null);}if(c==='t'&&text.startsWith('true',p.at)){boundary?.node(1,wireDepth);p.at+=4;return jsonVariant(1,true);}if(c==='f'&&text.startsWith('false',p.at)){boundary?.node(1,wireDepth);p.at+=5;return jsonVariant(1,false);}
  if(c==='"'){boundary?.node(3,wireDepth);const item=p.string();boundary?.text(item);return jsonVariant(3,item);}
  if(c==='['){boundary?.node(4,wireDepth);p.at++;const xs=[];if(!p.eat(']'))while(true){xs.push(value(d+1,wireDepth+8));if(p.eat(']'))break;if(!p.eat(','))throw Error('JSON array separator');}return jsonVariant(4,xs);}
  if(c==='{'){boundary?.node(5,wireDepth);p.at++;const xs=[],seen=new Set();if(!p.eat('}'))while(true){const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);boundary?.member(key,wireDepth);if(!p.eat(':'))throw Error('JSON object colon');xs.push({key,value:value(d+1,wireDepth+9)});if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON object separator');}return jsonVariant(5,xs);}
  if(c==='-'||c>='0'&&c<='9'){const token=p.number();boundary?.node(2,wireDepth);boundary?.text(token);return jsonVariant(2,token);}
  throw Error('invalid JSON value');
 };
 const out=value(0);p.finish();return out;
}
export function stringifyJson(value,options={}){return stringifyJsonValue(value,options,null);}
function stringifyJsonValue(value,options,boundary){
 const l=checkedJsonLimits(options);let remaining=l.nodes,bytes=0,output='';
 const emit=s=>{bytes+=jsonUtf8Length(s);if(bytes>l.bytes)throw Error('JSON byte limit');output+=s;};
 const write=(v,d,wireDepth=0)=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');if(!v||Object.keys(v).length!==1||!Object.hasOwn(v,'payload'))throw Error('invalid JSON record');let p=v.payload,index=0;
  while(index<5&&p&&Object.hasOwn(p,'Err')){if(Object.keys(p).length!==1||boundary&&Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Err;index++;}
  if(index<5){if(!p||Object.keys(p).length!==1||!Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Ok;}
  if(!p||Object.keys(p).length!==(index===0?0:1)||index>0&&!Object.hasOwn(p,'item0'))throw Error('invalid JSON payload');const item=p.item0;boundary?.node(index,wireDepth);
  switch(index){
   case 0:emit('null');break;
   case 1:if(typeof item!=='boolean')throw Error('invalid JSON Boolean');emit(item?'true':'false');break;
   case 2:if(!jsonNumberToken(item))throw Error('invalid JSON number');boundary?.text(item);emit(item);break;
   case 3:if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');boundary?.text(item);emit(JSON.stringify(item));break;
   case 4:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Array');const count=item.length;let visited=0;emit('[');item.forEach((x,i)=>{visited++;if(i)emit(',');write(x,d+1,wireDepth+8);});if(visited!==count)throw Error('invalid JSON Array');emit(']');break;}
   case 5:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Object');const count=item.length,seen=new Set();let visited=0;emit('{');item.forEach((m,i)=>{visited++;if(!m||Object.keys(m).length!==2||typeof m.key!=='string'||!m.key.isWellFormed()||!Object.hasOwn(m,'value')||boundary&&!Object.hasOwn(m,'key'))throw Error('invalid JSON member');if(seen.has(m.key))throw Error('duplicate JSON object key');seen.add(m.key);boundary?.member(m.key,wireDepth);if(i)emit(',');emit(JSON.stringify(m.key));emit(':');write(m.value,d+1,wireDepth+9);});if(visited!==count)throw Error('invalid JSON Object');emit('}');break;}
  }
 };write(value,0);return output;
}
// The adapter's schema is the fixed recursive JSON library shape checked by
// JsonCodec. Charge its ordinary record/sum/list wire nodes while parsing or
// rendering, rather than interpreting and walking the completed tree again.
function jsonBoundaryBudget(options){
 const l=checkedJsonLimits(options);let remaining=l.nodes,total=40;
 const charge=(nodes,bytes,depth)=>{remaining-=nodes;total+=bytes;if(remaining<0||depth>l.depth)throw Error('wire node or depth limit');if(total>l.bytes)throw Error('wire byte limit');};
 return {
  node(index,depth){charge(index===0?3:index<4?index+4:8,index===0?13:index===1?23:index===2?27:index===3?32:41,depth+(index===0?2:index<4?index+3:7));},
  text(text){charge(0,jsonUtf8Length(text),0);},
  member(key,depth){charge(2,8+jsonUtf8Length(key),depth+9);},
 };
}
function jsonSameSchema(a,b){
 if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&jsonSameSchema(a[k],b[k]));
}
// Host-object conversion is opt-in and JavaScript-only. Inspect data properties
// rather than invoking getters/toJSON; reflection is not a sandbox for proxies.
function jsonJSKeys(value){
 if(!value||typeof value!=='object')throw Error('expected a plain JavaScript object');
 const prototype=Object.getPrototypeOf(value);
 if(prototype!==Object.prototype&&prototype!==null)throw Error('expected a plain JavaScript object');
 const keys=Reflect.ownKeys(value);
 if(keys.some(k=>typeof k!=='string'))throw Error('JavaScript symbol keys are unsupported');
 return keys;
}
function jsonJSData(value,key){
 const property=Object.getOwnPropertyDescriptor(value,key);
 if(!property||!property.enumerable||!Object.hasOwn(property,'value'))throw Error('expected an enumerable own data property');
 return property.value;
}
function jsonJSRecord(value,names){
 const keys=jsonJSKeys(value);
 if(keys.length!==names.length||keys.some(k=>!names.includes(k)))throw Error('invalid JSON record or variant');
}
function jsonJSArray(value,remaining){
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw Error('expected a plain JavaScript array');
 const length=value.length;
 if(length>remaining)throw Error('JSON node limit');
 const keys=Reflect.ownKeys(value);
 if(keys.length!==length+1||keys.some(k=>typeof k!=='string'||k!=='length'&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=length)))throw Error('sparse or decorated JavaScript arrays are unsupported');
 return length;
}
function jsonFromJS(value,options){
 const limits=checkedJsonLimits(options),boundary=jsonBoundaryBudget(limits),active=new WeakSet();let remaining=limits.nodes;
 const text=value=>{if(!value.isWellFormed())throw Error('invalid JSON Unicode');boundary.text(value);return value;};
 const visit=(value,depth,wireDepth)=>{
  if(depth>limits.depth||--remaining<0)throw Error('JSON node or depth limit');
  if(value===null){boundary.node(0,wireDepth);return jsonVariant(0);}
  switch(typeof value){
   case 'boolean':boundary.node(1,wireDepth);return jsonVariant(1,value);
   case 'string':boundary.node(3,wireDepth);return jsonVariant(3,text(value));
   case 'number':
    if(!Number.isFinite(value))throw Error('non-finite JavaScript numbers are unsupported');
    boundary.node(2,wireDepth);return jsonVariant(2,text(Object.is(value,-0)?'-0':String(value)));
   case 'bigint':boundary.node(2,wireDepth);return jsonVariant(2,text(String(value)));
   case 'object':break;
   default:throw Error('unsupported JavaScript value');
  }
  if(active.has(value))throw Error('cyclic JavaScript value');
  active.add(value);
  try{
   if(Array.isArray(value)){
    boundary.node(4,wireDepth);const count=jsonJSArray(value,remaining),items=[];
    for(let i=0;i<count;i++)items.push(visit(jsonJSData(value,String(i)),depth+1,wireDepth+8));
    return jsonVariant(4,items);
   }
   boundary.node(5,wireDepth);const keys=jsonJSKeys(value),members=[];
   if(keys.length>remaining)throw Error('JSON node limit');
   for(const key of keys){
    if(!key.isWellFormed())throw Error('invalid JSON Unicode');
    boundary.member(key,wireDepth);
    members.push({key,value:visit(jsonJSData(value,key),depth+1,wireDepth+9)});
   }
   return jsonVariant(5,members);
  }finally{active.delete(value);}
 };
 return visit(value,0,0);
}
function jsonDecimalKey(token){
 const [,sign,whole,fraction='',exponent='0']=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
 const digits=(whole+fraction).replace(/^0+/,'');
 if(!digits)return '0';
 const trimmed=digits.replace(/0+$/,'');
 return sign+trimmed+'e'+(Number(exponent)-fraction.length+digits.length-trimmed.length);
}
function jsonToJS(value,options){
 const limits=checkedJsonLimits(options),boundary=jsonBoundaryBudget(limits),mode=options?.numbers??'number',active=new WeakSet();let remaining=limits.nodes;
 if(!['number','bigint','string'].includes(mode))throw Error('unknown JavaScript number policy');
 const number=token=>{
  if(!jsonNumberToken(token))throw Error('invalid JSON number');
  boundary.text(token);
  if(mode==='string')return token;
  if(mode==='bigint')return BigInt(jsonInteger(token,4096));
  const result=Number(token);
  if(!Number.isFinite(result)||jsonDecimalKey(token)!==jsonDecimalKey(String(result)))throw Error('JSON number loses precision as JavaScript Number; choose numbers: bigint or string');
  return result;
 };
 const visit=(value,depth,wireDepth)=>{
  if(depth>limits.depth||--remaining<0)throw Error('JSON node or depth limit');
  jsonJSRecord(value,['payload']);
  if(active.has(value))throw Error('cyclic JSON value');
  active.add(value);
  try{
   let payload=jsonJSData(value,'payload'),index=0;
   while(index<5&&Object.hasOwn(payload,'Err')){jsonJSRecord(payload,['Err']);payload=jsonJSData(payload,'Err');index++;}
   if(index<5){jsonJSRecord(payload,['Ok']);payload=jsonJSData(payload,'Ok');}
   jsonJSRecord(payload,index===0?[]:['item0']);boundary.node(index,wireDepth);
   const item=index===0?null:jsonJSData(payload,'item0');
   if(index===0)return null;
   if(index===1){if(typeof item!=='boolean')throw Error('invalid JSON Boolean');return item;}
   if(index===2)return number(item);
   if(index===3){if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');boundary.text(item);return item;}
   const count=jsonJSArray(item,remaining);
   if(index===4){const out=[];for(let i=0;i<count;i++)out.push(visit(jsonJSData(item,String(i)),depth+1,wireDepth+8));return out;}
   const out={},seen=new Set();
   for(let i=0;i<count;i++){
    const member=jsonJSData(item,String(i));jsonJSRecord(member,['key','value']);const key=jsonJSData(member,'key');
    if(typeof key!=='string'||!key.isWellFormed())throw Error('invalid JSON member key');
    if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);boundary.member(key,wireDepth);
    Object.defineProperty(out,key,{value:visit(jsonJSData(member,'value'),depth+1,wireDepth+9),enumerable:true,writable:true,configurable:true});
   }
   return out;
  }finally{active.delete(value);}
 };
 return visit(value,0,0);
}
const jsonConstructionPaths=Object.freeze(Array.from({length:6},(_,index)=>Object.freeze([0,...Array(index).fill(1),...(index<5?[0]:[]),0])));
function parseJsonConstructed(text,options,builder){
 const p=new JsonWireReader(text,options);
 const paths=jsonConstructionPaths;
 const fused=typeof builder.openPath==='function';
 const begin=index=>{if(fused){builder.openPath(paths[index]);return;}for(const choice of paths[index])builder.open(choice);};
 const end=index=>{for(let i=0;i<(fused?1:index<5?index+3:7);i++)builder.close();};
 const leaf=(index,item)=>{if(typeof builder.scalarPath==='function'){builder.scalarPath(paths[index],item);return;}begin(index);builder.scalar(item);end(index);};
 const value=d=>{
  p.node(d);const c=p.peek();
  if(c==='n'&&text.startsWith('null',p.at)){p.at+=4;if(typeof builder.emptyPath==='function')builder.emptyPath(paths[0]);else{begin(0);end(0);}return;}
  if(c==='t'&&text.startsWith('true',p.at)){p.at+=4;leaf(1,true);return;}
  if(c==='f'&&text.startsWith('false',p.at)){p.at+=5;leaf(1,false);return;}
  if(c==='"'){leaf(3,p.string());return;}
  if(c==='['){begin(4);builder.open(0);p.at++;if(!p.eat(']'))while(true){value(d+1);if(p.eat(']'))break;if(!p.eat(','))throw Error('JSON array separator');}builder.close();end(4);return;}
  if(c==='{'){begin(5);builder.open(0);p.at++;const seen=new Set();if(!p.eat('}'))while(true){const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');builder.open(0);builder.scalar(key);value(d+1);builder.close();if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON object separator');}builder.close();end(5);return;}
  if(c==='-'||c>='0'&&c<='9'){const token=p.number();leaf(2,token);return;}
  throw Error('invalid JSON value');
 };
 value(0);p.finish();return builder.finish();
}
const jsonCompiledRenderers=new WeakMap();
function compiledJsonRenderer(json,codec,unwrap){
 if(typeof codec?.reducer!=='function')throw Error('compiled JSON reduction unavailable');
 const source=codec.resolve(codec.descriptor.root),root=json.values.descriptor.root;
 const selected=unwrap&&source.kind==='result'?codec.resolve(source.ok):source;
 if(!jsonSameSchema(root,selected)||unwrap&&source.kind!=='result')throw Error('compiled JSON schema mismatch');
 let variants=root.fields[0].type;const roles=new Map([[root.name,'root']]);
 let member;
 for(let index=0;index<6;index++){
  const branch=index<5?variants.ok:variants;roles.set(branch.name,index);
  if(index===5){member=branch.fields[0].type.element.name;roles.set(member,'member');}
  if(index<5)variants=variants.error;
 }
 const nodeRoles=new Map();
 return codec.reducer((node,index)=>{
  const role=roles.get(node.name);nodeRoles.set(index,role);
  if(node.kind==='record'){
   if(role==='root')return value=>value;
   if(role==='member')return (key,value,context)=>{
    const text=(context.quoter?context.quote(key,true):context.add(JSON.stringify(key)+':'))+value,seen=context.members;
    if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);return text;
   };
   if(role===0)return context=>context.add('null');
   if(role===1)return (value,context)=>context.add(value?'true':'false');
   if(role===2)return (token,context)=>{if(!jsonNumberToken(token))throw Error('invalid JSON number');return context.add(token);};
   if(role===3)return (value,context)=>context.quoter?context.quote(value,false):context.add(JSON.stringify(value));
   if(role===4)return (value,context)=>{context.add('[]');return '['+value+']';};
   if(role===5)return (value,context)=>{context.add('{}');return '{'+value+'}';};
   return ()=>null;
  }
  if(node.kind==='list'||node.kind==='vector'){
   const members=nodeRoles.get(node.children[0])==='member';
   return {
    start:(_length,context)=>{
     const out={text:'',parent:members?context.members:null};
     if(members)context.members=new Set();return out;
    },
    step:(out,value,index,context)=>{out.text+=(index?context.add(','):'')+value;return out;},
    finish:(out,context)=>{if(members)context.members=out.parent;return out.text;},
   };
  }
  if(node.kind==='result'){
   // A Result<Json,E> boundary is explicitly requested by the caller. Ordinary
   // JSON's own sums only propagate an already rendered branch.
   if(unwrap&&nodeRoles.get(node.children[0])==='root')return (tag,value)=>{if(tag)throw Error('JSON result is Err');return value;};
   return (_tag,value)=>value;
  }
  if(node.kind==='string')return value=>{if(!value.isWellFormed())throw Error('invalid JSON String');return value;};
  return value=>value;
 });
}
export class JsonCodec{
 constructor(valueCodec){
  const root=valueCodec.descriptor.root,fields=root.fields;if(root.kind!=='record'||!Array.isArray(fields)||fields.length!==1||fields[0].name!=='payload')throw Error('JSON schema payload');let sum=fields[0].type;
  for(let i=0;i<6;i++){
   if(i<5&&sum.kind!=='result')throw Error('JSON schema sum');const branch=i<5?sum.ok:sum,fs=branch.fields;
   if(branch.kind!=='record'||!Array.isArray(fs)||fs.length!==(i?1:0)||i&&fs[0].name!=='item0')throw Error('JSON schema branch');
   if(i){const t=fs[0].type;if(i===1&&t.kind!=='bool'||(i===2||i===3)&&t.kind!=='string'||i===4&&(t.kind!=='list'||t.element.kind!=='ref'||t.element.name!==root.name))throw Error('JSON schema variant');if(i===5){const mf=t.element?.fields;if(t.kind!=='list'||t.element?.kind!=='record'||!Array.isArray(mf)||mf.length!==2||mf[0].name!=='key'||mf[0].type.kind!=='string'||mf[1].name!=='value'||mf[1].type.kind!=='ref'||mf[1].type.name!==root.name)throw Error('JSON schema member');}}
   if(i===2)this.numberBranch=branch.name;if(i===5)this.objectBranch=branch.name;
   if(i<5)sum=sum.error;
  }if(!jsonSameSchema(root,valueCodec.resolve({kind:'ref',name:root.name})))throw Error('JSON recursive schema mismatch');this.values=valueCodec;
 }
 parse(text,options={}){return parseJsonValue(text,options,jsonBoundaryBudget(options));}
 parseCompiled(codec,text,options={}){
  if(codec?.identity!==this.values.descriptor.identity||typeof codec.builder!=='function')throw Error('compiled JSON schema mismatch');
  const builder=codec.builder(options);try{return parseJsonConstructed(text,options,builder);}catch(error){builder.abort();throw error;}
 }
 stringify(value,options={}){return stringifyJsonValue(value,options,jsonBoundaryBudget(options));}
 stringifyCompiled(codec,handle,options={}){
  const limits=checkedJsonLimits(options),unwrap=options.unwrapResult===true;
  const quoter=options.quoter;if(quoter!==undefined&&!jsonQuoters.has(quoter))throw Error('JSON quote cache owner mismatch');
  let codecs=jsonCompiledRenderers.get(this);if(!codecs)jsonCompiledRenderers.set(this,codecs=new WeakMap());
  let renderers=codecs.get(codec);if(!renderers)codecs.set(codec,renderers=new Map());
  let render=renderers.get(unwrap);if(!render)renderers.set(unwrap,render=compiledJsonRenderer(this,codec,unwrap));
  let bytes=0;const context={
   quoter,
   add(text){bytes+=jsonUtf8Length(text);if(bytes>limits.bytes)throw Error('JSON byte limit');return text;},
   quote(value,colon){
    if(!quoter)return this.add(JSON.stringify(value)+(colon?':':''));
    const token=quoter.token(value);bytes+=token.utf8Bytes+(colon?1:0);if(bytes>limits.bytes)throw Error('JSON byte limit');return token.text+(colon?':':'');
   },
  };
  const text=render(handle,context,limits);
  return text;
 }
 fromJS(value,options={}){return jsonFromJS(value,options);}
 toJS(value,options={}){return jsonToJS(value,options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,false);}
 parseCompact(text,options={}){return streamJsonBinary(this.values,text,options,false,true);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,true);}
 validateBinary(bytes,options={}){
  const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});let view;
  this.values.visitSpans(bytes,(type,data,start,end)=>{
   view??=new DataView(data.buffer,data.byteOffset,data.byteLength);
   if(type.name===this.numberBranch){const length=view.getUint32(start,true);if(!jsonNumberSpan(data,start+4,start+4+length))throw Error('invalid JSON number token');}
   if(type.name===this.objectBranch){const listEnd=start+4+view.getUint32(start,true),count=view.getUint32(start+4,true),seen=new Set();let at=start+8;for(let i=0;i<count;i++){const memberEnd=at+4+view.getUint32(at,true),keyStart=at+8,keyEnd=keyStart+view.getUint32(at+4,true),key=decoder.decode(data.subarray(keyStart,keyEnd));if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);at=memberEnd;}if(at!==listEnd)throw Error('invalid JSON object frame');}
  },options,[this.numberBranch,this.objectBranch]);return true;

 }
}
function jsonUnpack(value){let p=value.payload,i=0;while(i<5&&Object.hasOwn(p,'Err')){p=p.Err;i++;}return [i,(i<5?p.Ok:p).item0];}
function jsonInteger(token,limit){
 if(!jsonNumberToken(token))throw Error('invalid JSON number');const negative=token[0]==='-',raw=negative?token.slice(1):token,[mantissa,exp='0']=raw.split(/[eE]/);let digits=mantissa.replace('.','');if(/^0+$/.test(digits))return '0';const exponent=Number(exp),fraction=mantissa.includes('.')?mantissa.length-mantissa.indexOf('.')-1:0,shift=exponent-fraction;
 if(!Number.isSafeInteger(exponent)||!Number.isSafeInteger(shift))throw Error('JSON integer exponent limit');
 if(shift<0){const cut=-shift;if(cut>=digits.length||!/^[0]+$/.test(digits.slice(-cut)))throw Error('JSON number is not an integer');digits=digits.slice(0,-cut);}else{if(digits.length+shift>limit)throw Error('JSON integer magnitude limit');digits+='0'.repeat(shift);}
 digits=digits.replace(/^0+/,'');if(digits.length>limit)throw Error('JSON integer magnitude limit');return (negative?'-':'')+digits;
}
export class TypedJsonCodec{
 constructor(valueCodec){this.values=valueCodec;}
 decode(document,options={}){
  // Validate JSON-specific invariants before interpreting any tagged/record
  // shape, including duplicated names and malformed numeric tokens.
  stringifyJson(document,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
  const read=(type,value,d)=>{
   if(d>l.depth||--remaining<0)throw Error('typed JSON resource limit');const t=this.values.resolve(type),[kind,item]=jsonUnpack(value);const fail=()=>{throw Error('JSON does not match '+t.kind);};
   switch(t.kind){
    case 'unit':if(kind!==0)fail();return null;
    case 'bool':if(kind!==1)fail();return item;
    case 'u32':case 'u64':case 'i32':case 'int':{if(kind!==2)fail();const text=jsonInteger(item,t.kind==='int'?4096:t.kind==='u64'?20:10);return t.kind==='int'?{Int:text}:t.kind==='u64'?BigInt(text):Number(text);}
    case 'f32':{if(kind!==2)fail();const n=Number(item),b=new DataView(new ArrayBuffer(4));b.setFloat32(0,n,true);if(!Number.isFinite(b.getFloat32(0,true)))throw Error('JSON f32 overflow');return {F32Bits:b.getUint32(0,true)};}
    case 'string':case 'enum':case 'id':if(kind!==3)fail();return item;
    case 'list':case 'vector':if(kind!==4)fail();return item.map(x=>read(t.element,x,d+1));
    case 'record':{if(kind!==5||item.length!==t.fields.length)throw Error('unknown or missing JSON record field');const fields=new Map(item.map(m=>[m.key,m.value])),out={};for(const f of t.fields){if(!fields.has(f.name))throw Error('missing JSON record field');Object.defineProperty(out,f.name,{value:read(f.type,fields.get(f.name),d+1),writable:true,enumerable:true,configurable:true});}return out;}
    case 'option':case 'result':{if(kind!==5||item.length!==1)fail();const m=item[0];if(t.kind==='option'&&m.key==='None'&&jsonUnpack(m.value)[0]===0)return {None:null};const child=t.kind==='option'&&m.key==='Some'?t.element:t.kind==='result'&&m.key==='Ok'?t.ok:t.kind==='result'&&m.key==='Err'?t.error:null;if(!child)fail();return {[m.key]:read(child,m.value,d+1)};}
    default:fail();
   }
  };
  const out=read(this.values.descriptor.root,document,0);this.values.validateValue(out,options);return out;
 }
 encode(value,options={}){
  this.values.validateValue(value,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
  const write=(type,v,d)=>{
   if(d>l.depth||--remaining<0)throw Error('typed JSON resource limit');const t=this.values.resolve(type);
   switch(t.kind){
    case 'unit':return jsonVariant(0);
    case 'bool':return jsonVariant(1,v);
    case 'u32':case 'u64':case 'i32':return jsonVariant(2,String(v));
    case 'int':return jsonVariant(2,typeof v==='bigint'?String(v):v.Int);
    case 'f32':{let n;if(typeof v==='number')n=Math.fround(v);else{const b=new DataView(new ArrayBuffer(4));b.setUint32(0,v.F32Bits,true);n=b.getFloat32(0,true);}if(!Number.isFinite(n))throw Error('non-finite f32 cannot encode as JSON');return jsonVariant(2,Object.is(n,-0)?'-0':String(n));}
    case 'string':case 'id':case 'enum':return jsonVariant(3,v);
    case 'list':case 'vector':return jsonVariant(4,Array.from(v,x=>write(t.element,x,d+1)));
    case 'record':return jsonVariant(5,t.fields.map(f=>({key:f.name,value:write(f.type,v[f.name],d+1)})));
    case 'option':return jsonVariant(5,[Object.hasOwn(v,'Some')?{key:'Some',value:write(t.element,v.Some,d+1)}:{key:'None',value:jsonVariant(0)}]);
    case 'result':return jsonVariant(5,[Object.hasOwn(v,'Ok')?{key:'Ok',value:write(t.ok,v.Ok,d+1)}:{key:'Err',value:write(t.error,v.Err,d+1)}]);
    default:throw Error('unsupported typed JSON descriptor');
   }
  };return write(this.values.descriptor.root,value,0);
 }
 parse(text,options={}){return this.decode(parseJson(text,options),options);}
 stringify(value,options={}){return stringifyJson(this.encode(value,options),options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,true);}
 parseCompact(text,options={}){return streamJsonBinary(this.values,text,options,true,true);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,false);}
}

// Token reader shared by schema-directed and arbitrary-JSON wire emission.
class JsonWireReader{
 constructor(text,options){this.l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>this.l.bytes||jsonUtf8Length(text)>this.l.bytes)throw Error('JSON byte or Unicode limit');this.text=text;this.at=0;this.remaining=this.l.nodes;}
 ws(){while(this.at<this.text.length){const c=this.text.charCodeAt(this.at);if(c!==32&&c!==9&&c!==10&&c!==13)break;this.at++;}}
 peek(){this.ws();return this.text[this.at];}
 eat(c){this.ws();if(this.text[this.at]===c){this.at++;return true;}return false;}
 node(d){if(d>this.l.depth||--this.remaining<0)throw Error('JSON node or depth limit');}
 string(){
  this.ws();const start=this.at;if(this.text[start]!=='"')throw Error('expected JSON string');
  const end=this.text.indexOf('"',start+1);if(end<0)throw Error('unterminated JSON string');
  const raw=this.text.slice(start+1,end);
  if(!raw.includes('\\')&&!/[\x00-\x1f]/.test(raw)){this.at=end+1;return raw;}
  this.at=start+1;while(this.at<this.text.length){if(this.text[this.at]==='"'){this.at++;const v=JSON.parse(this.text.slice(start,this.at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(this.text[this.at]==='\\')this.at+=2;else this.at++;}throw Error('unterminated JSON string');
 }
 number(){const start=this.at;while(this.at<this.text.length){const c=this.text.charCodeAt(this.at);if(!(c>=48&&c<=57||c===45||c===43||c===46||c===101||c===69))break;this.at++;}const token=this.text.slice(start,this.at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return token;}
 leaf(d){this.node(d);const c=this.peek();if(c==='n'&&this.text.startsWith('null',this.at)){this.at+=4;return null;}if(c==='t'&&this.text.startsWith('true',this.at)){this.at+=4;return true;}if(c==='f'&&this.text.startsWith('false',this.at)){this.at+=5;return false;}if(c==='"')return this.string();if(c==='-'||c>='0'&&c<='9')return this.number();throw Error('invalid JSON scalar');}
 finish(){this.ws();if(this.at!==this.text.length)throw Error('trailing JSON text');}
}
function streamJsonBinary(values,text,options,typed,compact=false){
 const p=new JsonWireReader(text,options),utf8=jsonWireEncoder;
 const list=(w,open,close,item)=>{if(!p.eat(open))throw Error('JSON container shape');const at=w.beginCount();let count=0;if(!p.eat(close))while(true){item(w);count++;if(p.eat(close))break;if(!p.eat(','))throw Error('JSON container separator');}w.endCount(at,count);};
 const variant=(w,index,level,emit)=>{if(level<index)w.frame(w=>{w.byte(1);variant(w,index,level+1,emit);});else if(index<5)w.frame(w=>{w.byte(0);w.frame(emit);});else w.frame(emit);};
 const json=(w,d)=>{
  const ch=p.peek(),index=ch==='n'?0:ch==='t'||ch==='f'?1:ch==='-'||ch>='0'&&ch<='9'?2:ch==='"'?3:ch==='['?4:ch==='{'?5:-1;if(index<0)throw Error('invalid JSON value');
  const leaf=index<4?p.leaf(d):null;if(index>=4)p.node(d);
  w.frame(w=>variant(w,index,0,w=>{
   if(index===0)return;if(index===1){w.frame(w=>w.byte(+leaf));return;}
   if(index===2||index===3){w.frame(w=>w.text(leaf));return;}
   w.frame(w=>{if(index===4)list(w,'[',']',w=>json(w,d+1));else{const seen=new Set();list(w,'{','}',w=>{const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');w.frame(w=>{w.frame(w=>w.text(key));json(w,d+1);});});}});
  }));
 };
 const read=(type,w,d)=>{
  const t=values.resolve(type);w.frame(w=>{
   if(t.kind==='list'||t.kind==='vector'){p.node(d);list(w,'[',']',w=>read(t.element,w,d+1));return;}
   if(t.kind==='record'){
    p.node(d);if(!p.eat('{'))throw Error('expected JSON record');const start=w.position,spans=new Array(t.fields.length).fill(null);
    if(!p.eat('}'))while(true){const key=p.string(),i=t.fields.findIndex(f=>f.name===key);if(i<0)throw Error('unknown JSON record field');if(spans[i])throw Error('duplicate JSON record field');if(!p.eat(':'))throw Error('JSON record colon');const at=w.position;read(t.fields[i].type,w,d+1);spans[i]=[at,w.position];if(p.eat('}'))break;if(!p.eat(','))throw Error('JSON record separator');}
    if(spans.some(s=>s===null))throw Error('missing JSON record field');w.reorder(start,spans);return;
   }
   if(t.kind==='option'||t.kind==='result'){
    p.node(d);if(!p.eat('{'))throw Error('expected JSON tagged value');const key=p.string();if(!p.eat(':'))throw Error('JSON tag colon');
    if(t.kind==='option'&&key==='None'){if(p.leaf(d+1)!==null)throw Error('JSON None payload');w.byte(0);}
    else{const child=t.kind==='option'&&key==='Some'?t.element:t.kind==='result'&&key==='Ok'?t.ok:t.kind==='result'&&key==='Err'?t.error:null;if(!child)throw Error('invalid JSON tag');w.byte(key==='Ok'?0:1);read(child,w,d+1);}
    if(!p.eat('}'))throw Error('expected exactly one JSON tag');return;
   }
   const ch=p.peek(),v=p.leaf(d),bad=()=>{throw Error('JSON does not match '+t.kind);};
   if(t.kind==='unit'){if(v!==null)bad();return;}
   if(t.kind==='bool'){if(typeof v!=='boolean')bad();w.byte(+v);return;}
   if(['string','id','enum'].includes(t.kind)){if(ch!=='"')bad();w.text(v);return;}
   if(ch!=='-'&&!(ch>='0'&&ch<='9'))bad();
   if(t.kind==='int'){w.text(jsonInteger(v,4096));return;}
   if(t.kind==='f32'){jsonFloatScratch.setFloat32(0,Number(v),true);if(!Number.isFinite(jsonFloatScratch.getFloat32(0,true)))throw Error('JSON f32 overflow');w.word(jsonFloatScratch.getUint32(0,true));}
   else{const n=BigInt(jsonInteger(v,t.kind==='u64'?20:10));if(t.kind==='u64'){if(n<0n||n>18446744073709551615n)bad();w.wide(n);}else if(t.kind==='u32'){if(n<0n||n>4294967295n)bad();w.word(Number(n));}else if(t.kind==='i32'){if(n< -2147483648n||n>2147483647n)bad();w.word(Number(n)>>>0);}else bad();}
  });
 };
 return (compact?values.compact():values).encodeWith(w=>{if(typed)read(values.descriptor.root,w,0);else json(w,0);p.finish();},options);
}

// Render validated bytes in a single traversal; only the final text is owned.
function streamWireJsonText(values,bytes,options,library){
 values.validate(bytes,options);const l=checkedJsonLimits(options),parts=[];let size=0,remaining=l.nodes;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
 const emit=s=>{size+=jsonUtf8Length(s);if(size>l.bytes)throw Error('JSON byte limit');parts.push(s);};
 const string=s=>emit(JSON.stringify(s));const node=d=>{if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');};
 const frame=(type,at)=>{const t=values.resolve(type),start=at+4,end=start+dv.getUint32(at,true);return{t,start,end};};
 const json=(type,at,d)=>{
  node(d);let root=frame(type,at),sum=frame(root.t.fields[0].type,root.start),index=0;
  while(index<5){const err=bytes[sum.start];sum=frame(err?sum.t.error:sum.t.ok,sum.start+1);if(!err)break;index++;}
  if(index===0){emit('null');return root.end;}
  const item=frame(sum.t.fields[0].type,sum.start);
  if(index===1)emit(bytes[item.start]?'true':'false');
  else if(index===2){const token=decoder.decode(bytes.subarray(item.start,item.end));if(!jsonNumberToken(token))throw Error('invalid JSON number token');emit(token);}
  else if(index===3)string(decoder.decode(bytes.subarray(item.start,item.end)));
  else{const count=dv.getUint32(item.start,true);let p=item.start+4;emit(index===4?'[':'{');const seen=new Set();for(let i=0;i<count;i++){if(i)emit(',');if(index===4)p=json(item.t.element,p,d+1);else{const member=frame(item.t.element,p),key=frame(member.t.fields[0].type,member.start),name=decoder.decode(bytes.subarray(key.start,key.end));if(seen.has(name))throw Error('duplicate JSON object key');seen.add(name);string(name);emit(':');json(member.t.fields[1].type,key.end,d+1);p=member.end;}}emit(index===4?']':'}');}
  return root.end;
 };
 const typed=(type,at,d)=>{
  node(d);const f=frame(type,at),t=f.t;let p=f.start;
  switch(t.kind){
   case 'unit':emit('null');break;
   case 'bool':emit(bytes[p]?'true':'false');break;
   case 'u32':emit(String(dv.getUint32(p,true)));break;
   case 'u64':emit(String(dv.getBigUint64(p,true)));break;
   case 'i32':emit(String(dv.getInt32(p,true)));break;
   case 'f32':{const n=dv.getFloat32(p,true);if(!Number.isFinite(n))throw Error('non-finite f32 cannot encode as JSON');emit(Object.is(n,-0)?'-0':String(n));break;}
   case 'int':emit(decoder.decode(bytes.subarray(p,f.end)));break;
   case 'string':case 'id':case 'enum':string(decoder.decode(bytes.subarray(p,f.end)));break;
   case 'list':case 'vector':{const n=dv.getUint32(p,true);p+=4;emit('[');for(let i=0;i<n;i++){if(i)emit(',');p=typed(t.element,p,d+1);}emit(']');break;}
   case 'record':emit('{');for(let i=0;i<t.fields.length;i++){if(i)emit(',');const field=t.fields[i];string(field.name);emit(':');p=typed(field.type,p,d+1);}emit('}');break;
   case 'option':case 'result':{const tag=bytes[p++],key=t.kind==='option'?(tag?'Some':'None'):tag?'Err':'Ok';emit('{');string(key);emit(':');if(t.kind==='option'&&!tag){node(d+1);emit('null');}else typed(t.kind==='option'?t.element:tag?t.error:t.ok,p,d+1);emit('}');break;}
   default:throw Error('unsupported typed JSON descriptor');
  }return f.end;
 };
 if(library)json(values.descriptor.root,40,0);else typed(values.descriptor.root,40,0);return parts.join('');
}

/** Owned, optional read view of arbitrary JSON. Auxiliary indexes contain member
 * offsets only. Logical order, exact number tokens and missing/null remain intact.
 * This does not transparently replace any compiled Ink action or its state.
 */
export function createJsonLookup(text,{stepEntries=16,minReads=4,maxEntries=4096,maxObjects=64,maxIndexBytes=262144,...limits}={}){
 for(const [v,max]of [[stepEntries,4096],[minReads,1000000],[maxEntries,1000000],[maxObjects,256],[maxIndexBytes,16777216]])if(!Number.isSafeInteger(v)||v<0||v>max)throw Error('JSON index budget');
 let root=parseJson(text,limits),indexes=new Map(),entries=0,indexBytes=0;
 const stats={reads:0,writes:0,scanned_members:0,index_hits:0,built_entries:0,invalidations:0};
 function parts(path){
  if(!Array.isArray(path))throw Error('JSON lookup path');const n=path.length;if(n>128)throw Error('JSON lookup path');
  const owned=[];for(let i=0;i<n;i++){const d=Object.getOwnPropertyDescriptor(path,String(i));if(!d||!Object.hasOwn(d,'value'))throw Error('JSON lookup path');const p=d.value;if(!(typeof p==='string'&&p.isWellFormed()&&p.length<=4096)&&!(Number.isSafeInteger(p)&&p>=0))throw Error('JSON lookup path');owned.push(p);}return owned;
 }
 function variant(value){let p=value.payload,index=0;while(index<5&&Object.hasOwn(p,'Err')){p=p.Err;index++;}return {index,item:(index<5?p.Ok:p).item0};}
 function resolve(document,path,indexed){
  let value=document,budget=stepEntries;
  for(let depth=0;depth<path.length;depth++){
   const part=path[depth],v=variant(value);
   if(typeof part==='number'){
    if(v.index!==4)throw Error('expected JSON array');if(part>=v.item.length)return {found:false};value=v.item[part];continue;
   }
   if(v.index!==5)throw Error('expected JSON object');
   const prefix=path.slice(0,depth),key=JSON.stringify(prefix),overhead=128+prefix.reduce((n,p)=>n+(typeof p==='string'?16+p.length*2:8),0);let idx=indexed?indexes.get(key):null;
   if(indexed&&!idx&&indexes.size<maxObjects&&indexBytes+overhead<=maxIndexBytes){idx={path:prefix,reads:0,cursor:0,keys:new Map(),bytes:overhead};indexes.set(key,idx);indexBytes+=overhead;}
   if(idx){
    idx.reads++;
    if(idx.reads>=minReads)while(budget>0&&idx.cursor<v.item.length&&entries<maxEntries){
     const member=v.item[idx.cursor],bytes=64+member.key.length*2;
     if(indexBytes+bytes>maxIndexBytes)break;
     idx.keys.set(member.key,idx.cursor++);idx.bytes+=bytes;indexBytes+=bytes;entries++;stats.built_entries++;budget--;
    }
    if(idx.keys.has(part)){stats.index_hits++;value=v.item[idx.keys.get(part)].value;continue;}
   }
   let found=false;
   for(let i=idx?.cursor??0;i<v.item.length;i++){if(indexed)stats.scanned_members++;if(v.item[i].key===part){value=v.item[i].value;found=true;break;}}
   if(!found)return {found:false};
  }
  return {found:true,value};
 }
 return {
  lookup(path){stats.reads++;const r=resolve(root,parts(path),true);return r.found?{found:true,value:structuredClone(r.value)}:r;},
  set(path,key,text){
   path=parts(path);if(typeof key!=='string'||!key.isWellFormed())throw Error('JSON object key');
   const replacement=parseJson(text,limits),next=structuredClone(root),r=resolve(next,path,false);
   if(!r.found)throw Error('JSON update path missing');const object=variant(r.value);if(object.index!==5)throw Error('expected JSON object');
   const members=[{key,value:replacement},...object.item.filter(m=>m.key!==key)];
   // Validate the complete resulting document before publishing a write.
   let payload=r.value.payload;for(let i=0;i<5;i++)payload=payload.Err;payload.item0=members;
   stringifyJson(next,limits);root=next;stats.writes++;
   for(const [id,idx]of indexes)if(idx.path.length>=path.length&&path.every((p,i)=>p===idx.path[i])){entries-=idx.keys.size;indexBytes-=idx.bytes;indexes.delete(id);stats.invalidations++;}
  },
  replace(text){const next=parseJson(text,limits);root=next;stats.writes++;stats.invalidations+=indexes.size;indexes.clear();entries=0;indexBytes=0;},
  stringify(){return stringifyJson(root,limits);},
  stats(){return {...stats,index_entries:entries,index_objects:indexes.size,index_bytes:indexBytes};}
 };
}
function __ownedValue6(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue7(value.Some,budget,depth+1)};}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue4(value[i],budget,depth+1);return out;}
function __ownedValue14(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue3(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue9(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue1(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue2(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue9(value,budget,depth){budget.enter(depth,4);return {["action"]:__ownedValue5(value["action"],budget,depth+1),["probability"]:__ownedValue4(value["probability"],budget,depth+1),["score"]:__ownedValue3(value["score"],budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,4);return {["left_bias"]:__ownedValue4(value["left_bias"],budget,depth+1),["left_slope"]:__ownedValue4(value["left_slope"],budget,depth+1),["right_bias"]:__ownedValue4(value["right_bias"],budget,depth+1),["right_slope"]:__ownedValue4(value["right_slope"],budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["optimizer"]:__ownedValue2(value["optimizer"],budget,depth+1),["version"]:__ownedValue5(value["version"],budget,depth+1),["ticket"]:__ownedValue5(value["ticket"],budget,depth+1),["pending"]:__ownedValue6(value["pending"],budget,depth+1)};}
function __ownedValue15(value,budget,depth){budget.enter(depth,4);return {["rate"]:__ownedValue4(value["rate"],budget,depth+1),["first_decay"]:__ownedValue4(value["first_decay"],budget,depth+1),["second_decay"]:__ownedValue4(value["second_decay"],budget,depth+1),["epsilon"]:__ownedValue4(value["epsilon"],budget,depth+1),["weight_decay"]:__ownedValue4(value["weight_decay"],budget,depth+1),["norm_limit"]:__ownedValue4(value["norm_limit"],budget,depth+1)};}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);return {["signal"]:__ownedValue4(value["signal"],budget,depth+1),["urgency"]:__ownedValue4(value["urgency"],budget,depth+1)};}
function __ownedValue7(value,budget,depth){budget.enter(depth,4);return {["ticket"]:__ownedValue5(value["ticket"],budget,depth+1),["base"]:__ownedValue5(value["base"],budget,depth+1),["context"]:__ownedValue8(value["context"],budget,depth+1),["decision"]:__ownedValue9(value["decision"],budget,depth+1)};}
function __ownedValue17(value,budget,depth){budget.enter(depth,4);return {["value"]:__ownedValue4(value["value"],budget,depth+1),["tangent_0"]:__ownedValue4(value["tangent_0"],budget,depth+1),["tangent_1"]:__ownedValue4(value["tangent_1"],budget,depth+1),["tangent_2"]:__ownedValue4(value["tangent_2"],budget,depth+1),["tangent_3"]:__ownedValue4(value["tangent_3"],budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["weights"]:__ownedValue3(value["weights"],budget,depth+1),["first"]:__ownedValue3(value["first"],budget,depth+1),["second"]:__ownedValue3(value["second"],budget,depth+1),["steps"]:__ownedValue5(value["steps"],budget,depth+1),["first_power"]:__ownedValue4(value["first_power"],budget,depth+1),["second_power"]:__ownedValue4(value["second_power"],budget,depth+1)};}
function __ownedValue12(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue4(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __ownedValue10(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue5(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["initialize",__ownedValue0],["unpack",__ownedValue11],["pack",__ownedValue3],["mass",__ownedValue4],["valid_context",__ownedValue12],["policy",__ownedValue13],["valid_agent",__ownedValue12],["reward",__ownedValue4],["decision",__ownedValue13],["returns",__ownedValue14],["trajectory",__ownedValue14],["edge",__ownedValue13],["batch",__ownedValue3],["ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54",__ownedValue12],["ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3",__ownedValue4],["ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14",__ownedValue14],["ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a",__ownedValue14],["ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910",__ownedValue5],["ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667",__ownedValue3],["ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2",__ownedValue3],["ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80",__ownedValue13],["ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4",__ownedValue14],["ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431",__ownedValue14],["ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b",__ownedValue14],["ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07",__ownedValue14],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",__ownedValue15],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",__ownedValue12],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",__ownedValue12],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",__ownedValue16],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",__ownedValue12],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",__ownedValue4],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",__ownedValue4],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",__ownedValue4],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",__ownedValue16],["__ink_differential_3",__ownedValue17],["__ink_differential_1",__ownedValue11]]));
function __wireValue14(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue12(reader);reader.finish(end);return value;}
function __wireValue34(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue18(reader);reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue26(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue16(reader);reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue2(reader);reader.finish(end);return value;}
function __wireValue35(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue19(reader)}:{Ok:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue19(reader)}:{Ok:__wireValue18(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue19(reader)}:{Ok:__wireValue23(reader)};reader.finish(end);return value;}
function __wireValue32(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue19(reader)}:{Ok:__wireValue24(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __wireValue37(reader){const end=reader.frame();const value={["accumulator"]:__wireValue35(reader),["decision"]:__wireValue18(reader),["return_value"]:__wireValue2(reader),["baseline"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["action"]:__wireValue5(reader),["probability"]:__wireValue2(reader),["score"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue51(reader){const end=reader.frame();const value={["agent"]:__wireValue23(reader)};reader.finish(end);return value;}
function __wireValue36(reader){const end=reader.frame();const value={["c"]:__wireValue28(reader)};reader.finish(end);return value;}
function __wireValue49(reader){const end=reader.frame();const value={["c"]:__wireValue4(reader),["action"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue52(reader){const end=reader.frame();const value={["c"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value={["context"]:__wireValue10(reader),["action"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={["context"]:__wireValue4(reader),["action"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue43(reader){const end=reader.frame();const value={["decision"]:__wireValue18(reader),["return_value"]:__wireValue2(reader),["baseline"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const value={["decisions"]:__wireValue34(reader),["return_values"]:__wireValue12(reader),["baselines"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue50(reader){const end=reader.frame();const value={["decisions"]:__wireValue34(reader),["rewards"]:__wireValue12(reader),["baselines"]:__wireValue12(reader),["discount"]:__wireValue2(reader),["bootstrap"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue42(reader){const end=reader.frame();const value={["derivatives"]:__wireValue14(reader),["allowed"]:__wireValue15(reader),["maximum"]:__wireValue2(reader),["total"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value={["kind"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const value={["left_bias"]:__wireValue8(reader),["left_slope"]:__wireValue8(reader),["right_bias"]:__wireValue8(reader),["right_slope"]:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["left_bias"]:__wireValue2(reader),["left_slope"]:__wireValue2(reader),["right_bias"]:__wireValue2(reader),["right_slope"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value={["masses"]:__wireValue12(reader),["allowed"]:__wireValue15(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value={["masses"]:__wireValue12(reader),["derivatives"]:__wireValue14(reader),["allowed"]:__wireValue15(reader),["total"]:__wireValue2(reader),["selected"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value={["masses"]:__wireValue12(reader),["derivatives"]:__wireValue14(reader),["allowed"]:__wireValue15(reader),["unit"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["optimizer"]:__wireValue24(reader),["version"]:__wireValue5(reader),["ticket"]:__wireValue5(reader),["pending"]:__wireValue25(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["rate"]:__wireValue2(reader),["first_decay"]:__wireValue2(reader),["second_decay"]:__wireValue2(reader),["epsilon"]:__wireValue2(reader),["weight_decay"]:__wireValue2(reader),["norm_limit"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue46(reader){const end=reader.frame();const value={["rate"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue44(reader){const end=reader.frame();const value={["rewards"]:__wireValue12(reader),["discount"]:__wireValue2(reader),["bootstrap"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue38(reader){const end=reader.frame();const value={["scaled"]:__wireValue12(reader),["unit"]:__wireValue2(reader),["total"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={["signal"]:__wireValue8(reader),["urgency"]:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value={["signal"]:__wireValue2(reader),["urgency"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue31(reader){const end=reader.frame();const value={["state"]:__wireValue24(reader),["gradient"]:__wireValue12(reader),["c"]:__wireValue28(reader)};reader.finish(end);return value;}
function __wireValue39(reader){const end=reader.frame();const value={["state"]:__wireValue24(reader)};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value={["ticket"]:__wireValue5(reader),["base"]:__wireValue5(reader),["context"]:__wireValue4(reader),["decision"]:__wireValue18(reader)};reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={["value"]:__wireValue2(reader),["tangent_0"]:__wireValue2(reader),["tangent_1"]:__wireValue2(reader),["tangent_2"]:__wireValue2(reader),["tangent_3"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value={["w"]:__wireValue7(reader),["input"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["w"]:__wireValue1(reader),["input"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue47(reader){const end=reader.frame();const value={["w"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value={["weight"]:__wireValue2(reader),["first"]:__wireValue2(reader),["second"]:__wireValue2(reader),["first_power"]:__wireValue2(reader),["second_power"]:__wireValue2(reader),["c"]:__wireValue28(reader)};reader.finish(end);return value;}
function __wireValue48(reader){const end=reader.frame();const value={["weights"]:__wireValue12(reader),["c"]:__wireValue4(reader),["unit"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["weights"]:__wireValue12(reader),["first"]:__wireValue12(reader),["second"]:__wireValue12(reader),["steps"]:__wireValue5(reader),["first_power"]:__wireValue2(reader),["second_power"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue45(reader){const end=reader.frame();const value={["weights"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue41(reader){const end=reader.frame();const value={["x"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue40(reader){const end=reader.frame();const value={["xs"]:__wireValue12(reader),["limit"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["xs"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["__ink_differential_1",[__wireValue0,__wireValue1]],["__ink_differential_3",[__wireValue6,__wireValue8]],["batch",[__wireValue11,__wireValue12]],["decision",[__wireValue13,__wireValue17]],["edge",[__wireValue20,__wireValue17]],["initialize",[__wireValue21,__wireValue22]],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",[__wireValue27,__wireValue2]],["ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2",[__wireValue29,__wireValue12]],["ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80",[__wireValue13,__wireValue17]],["ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3",[__wireValue30,__wireValue2]],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",[__wireValue31,__wireValue32]],["ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b",[__wireValue33,__wireValue35]],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",[__wireValue36,__wireValue16]],["ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431",[__wireValue37,__wireValue35]],["ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910",[__wireValue38,__wireValue5]],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",[__wireValue39,__wireValue16]],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",[__wireValue40,__wireValue2]],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",[__wireValue41,__wireValue2]],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",[__wireValue11,__wireValue16]],["ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667",[__wireValue42,__wireValue12]],["ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4",[__wireValue43,__wireValue35]],["ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a",[__wireValue30,__wireValue35]],["ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07",[__wireValue44,__wireValue35]],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",[__wireValue45,__wireValue32]],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",[__wireValue46,__wireValue28]],["ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54",[__wireValue11,__wireValue16]],["ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14",[__wireValue30,__wireValue35]],["mass",[__wireValue0,__wireValue2]],["pack",[__wireValue47,__wireValue12]],["policy",[__wireValue48,__wireValue17]],["returns",[__wireValue44,__wireValue35]],["reward",[__wireValue49,__wireValue2]],["trajectory",[__wireValue50,__wireValue35]],["unpack",[__wireValue11,__wireValue1]],["valid_agent",[__wireValue51,__wireValue16]],["valid_context",[__wireValue52,__wireValue16]]]));

const __ownedImplementations=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>{
 const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
 const body=__implementations[f.index];
 const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args)!==true)throw Error('contract precondition failed');return body(...args);};
 return [f.name,input.every(c=>c===__identity)?implementation:(...args)=>{const context=new WeakMap();return implementation(...args.map((v,i)=>input[i](v,context)));}];
})));

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze(Object.hasOwn(__wireReaders,name)?{arguments:createCompiledValueCodec(s.arguments,__wireReaders[name][0]),result:createCompiledValueCodec(s.result,__wireReaders[name][1])}:{arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
function __callEncoded(name,bytes,limits,compact){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const input=compact?codecs.arguments.compact():codecs.arguments,output=compact?codecs.result.compact():codecs.result;
 const entry=__compiledEntries.get(name);
 if(entry){
  const slot=compact?1:0;
  entry.argumentCodecs[slot]??=(entry.boundaryReaders[slot]?createFusedValueCodec:createCompiledValueCodec)(metadata.wire.functions[name].arguments,entry.arguments);
  const decoder=entry.argumentCodecs[slot];
  const values=(compact?decoder.compact():decoder).decode(bytes,limits),args=f.params.map(p=>values[p.name]);
  if(entry.precondition!==null&&__implementations[entry.precondition](...args)!==true)throw Error('contract precondition failed');
  return __compiledEncodeResult(entry,__implementations[entry.index](...args),limits,compact);
 }
 const values=input.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return output.encode(result,limits);
}
export function callBinary(name,bytes,limits={}){return __callEncoded(name,bytes,limits,false);}
export function callCompact(name,bytes,limits={}){return __callEncoded(name,bytes,limits,true);}
// Same stable, well-typed caller inputs as call; the result owns every container.
// The checked source return type justifies trusted copying, not arbitrary input.
export function callOwned(name,args,limits={}){
 if(!Object.hasOwn(__ownedFunctions,name)||!Object.hasOwn(functions,name))throw Error('unsupported owned function');
 const result=__ownedImplementations[name](...args);return __ownedFunctions[name](result,createValueCaptureBudget(limits),0);
}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture3(value[i],budget,depth+1);return out;}
function __privateCapture18(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture9(value[i],budget,depth+1);return out;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture7(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture13(value[i],budget,depth+1);return out;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture4(value[i],budget,depth+1);return out;}
function __privateCapture17(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture3(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture9(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture1(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture20(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture2(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"action")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"probability")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"score")){throw Error('invalid value for wire schema');}return {["action"]:__privateCapture5(value["action"],budget,depth+1),["probability"]:__privateCapture4(value["probability"],budget,depth+1),["score"]:__privateCapture3(value["score"],budget,depth+1)};}
function __privateCapture23(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"context")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"action")){throw Error('invalid value for wire schema');}return {["context"]:__privateCapture24(value["context"],budget,depth+1),["action"]:__privateCapture5(value["action"],budget,depth+1)};}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"context")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"action")){throw Error('invalid value for wire schema');}return {["context"]:__privateCapture8(value["context"],budget,depth+1),["action"]:__privateCapture5(value["action"],budget,depth+1)};}
function __privateCapture21(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"left_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"left_slope")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"right_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"right_slope")){throw Error('invalid value for wire schema');}return {["left_bias"]:__privateCapture22(value["left_bias"],budget,depth+1),["left_slope"]:__privateCapture22(value["left_slope"],budget,depth+1),["right_bias"]:__privateCapture22(value["right_bias"],budget,depth+1),["right_slope"]:__privateCapture22(value["right_slope"],budget,depth+1)};}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"left_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"left_slope")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"right_bias")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"right_slope")){throw Error('invalid value for wire schema');}return {["left_bias"]:__privateCapture4(value["left_bias"],budget,depth+1),["left_slope"]:__privateCapture4(value["left_slope"],budget,depth+1),["right_bias"]:__privateCapture4(value["right_bias"],budget,depth+1),["right_slope"]:__privateCapture4(value["right_slope"],budget,depth+1)};}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"optimizer")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"version")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"ticket")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"pending")){throw Error('invalid value for wire schema');}return {["optimizer"]:__privateCapture2(value["optimizer"],budget,depth+1),["version"]:__privateCapture5(value["version"],budget,depth+1),["ticket"]:__privateCapture5(value["ticket"],budget,depth+1),["pending"]:__privateCapture6(value["pending"],budget,depth+1)};}
function __privateCapture19(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"rate")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"epsilon")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weight_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"norm_limit")){throw Error('invalid value for wire schema');}return {["rate"]:__privateCapture4(value["rate"],budget,depth+1),["first_decay"]:__privateCapture4(value["first_decay"],budget,depth+1),["second_decay"]:__privateCapture4(value["second_decay"],budget,depth+1),["epsilon"]:__privateCapture4(value["epsilon"],budget,depth+1),["weight_decay"]:__privateCapture4(value["weight_decay"],budget,depth+1),["norm_limit"]:__privateCapture4(value["norm_limit"],budget,depth+1)};}
function __privateCapture24(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"signal")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"urgency")){throw Error('invalid value for wire schema');}return {["signal"]:__privateCapture22(value["signal"],budget,depth+1),["urgency"]:__privateCapture22(value["urgency"],budget,depth+1)};}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"signal")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"urgency")){throw Error('invalid value for wire schema');}return {["signal"]:__privateCapture4(value["signal"],budget,depth+1),["urgency"]:__privateCapture4(value["urgency"],budget,depth+1)};}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"ticket")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"base")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"context")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"decision")){throw Error('invalid value for wire schema');}return {["ticket"]:__privateCapture5(value["ticket"],budget,depth+1),["base"]:__privateCapture5(value["base"],budget,depth+1),["context"]:__privateCapture8(value["context"],budget,depth+1),["decision"]:__privateCapture9(value["decision"],budget,depth+1)};}
function __privateCapture22(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==5){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_0")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_1")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_2")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"tangent_3")){throw Error('invalid value for wire schema');}return {["value"]:__privateCapture4(value["value"],budget,depth+1),["tangent_0"]:__privateCapture4(value["tangent_0"],budget,depth+1),["tangent_1"]:__privateCapture4(value["tangent_1"],budget,depth+1),["tangent_2"]:__privateCapture4(value["tangent_2"],budget,depth+1),["tangent_3"]:__privateCapture4(value["tangent_3"],budget,depth+1)};}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weights")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"steps")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_power")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_power")){throw Error('invalid value for wire schema');}return {["weights"]:__privateCapture3(value["weights"],budget,depth+1),["first"]:__privateCapture3(value["first"],budget,depth+1),["second"]:__privateCapture3(value["second"],budget,depth+1),["steps"]:__privateCapture5(value["steps"],budget,depth+1),["first_power"]:__privateCapture4(value["first_power"],budget,depth+1),["second_power"]:__privateCapture4(value["second_power"],budget,depth+1)};}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return bits===0?0:bits;}
function __privateCapture10(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue23(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue3(reader);reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue9(reader);reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue7(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue17(reader);reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue4(reader);reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue41(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __privateWireValue36(reader){const end=reader.frame();const value={["accumulator"]:__privateWireValue26(reader),["decision"]:__privateWireValue9(reader),["return_value"]:__privateWireValue4(reader),["baseline"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["action"]:__privateWireValue5(reader),["probability"]:__privateWireValue4(reader),["score"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["agent"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue43(reader){const end=reader.frame();const value={["c"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value={["c"]:__privateWireValue8(reader),["action"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value={["c"]:__privateWireValue8(reader)};reader.finish(end);return value;}
function __privateWireValue50(reader){const end=reader.frame();const value={["context"]:__privateWireValue51(reader),["action"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value={["context"]:__privateWireValue8(reader),["action"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue35(reader){const end=reader.frame();const value={["decision"]:__privateWireValue9(reader),["return_value"]:__privateWireValue4(reader),["baseline"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue37(reader){const end=reader.frame();const value={["decisions"]:__privateWireValue28(reader),["return_values"]:__privateWireValue3(reader),["baselines"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["decisions"]:__privateWireValue28(reader),["rewards"]:__privateWireValue3(reader),["baselines"]:__privateWireValue3(reader),["discount"]:__privateWireValue4(reader),["bootstrap"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue33(reader){const end=reader.frame();const value={["derivatives"]:__privateWireValue23(reader),["allowed"]:__privateWireValue24(reader),["maximum"]:__privateWireValue4(reader),["total"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value={["kind"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue48(reader){const end=reader.frame();const value={["left_bias"]:__privateWireValue49(reader),["left_slope"]:__privateWireValue49(reader),["right_bias"]:__privateWireValue49(reader),["right_slope"]:__privateWireValue49(reader)};reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const value={["left_bias"]:__privateWireValue4(reader),["left_slope"]:__privateWireValue4(reader),["right_bias"]:__privateWireValue4(reader),["right_slope"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue31(reader){const end=reader.frame();const value={["masses"]:__privateWireValue3(reader),["allowed"]:__privateWireValue24(reader)};reader.finish(end);return value;}
function __privateWireValue34(reader){const end=reader.frame();const value={["masses"]:__privateWireValue3(reader),["derivatives"]:__privateWireValue23(reader),["allowed"]:__privateWireValue24(reader),["total"]:__privateWireValue4(reader),["selected"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["masses"]:__privateWireValue3(reader),["derivatives"]:__privateWireValue23(reader),["allowed"]:__privateWireValue24(reader),["unit"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value={["optimizer"]:__privateWireValue2(reader),["version"]:__privateWireValue5(reader),["ticket"]:__privateWireValue5(reader),["pending"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue38(reader){const end=reader.frame();const value={["rate"]:__privateWireValue4(reader),["first_decay"]:__privateWireValue4(reader),["second_decay"]:__privateWireValue4(reader),["epsilon"]:__privateWireValue4(reader),["weight_decay"]:__privateWireValue4(reader),["norm_limit"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue39(reader){const end=reader.frame();const value={["rate"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const value={["rewards"]:__privateWireValue3(reader),["discount"]:__privateWireValue4(reader),["bootstrap"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue32(reader){const end=reader.frame();const value={["scaled"]:__privateWireValue3(reader),["unit"]:__privateWireValue4(reader),["total"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue51(reader){const end=reader.frame();const value={["signal"]:__privateWireValue49(reader),["urgency"]:__privateWireValue49(reader)};reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value={["signal"]:__privateWireValue4(reader),["urgency"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue47(reader){const end=reader.frame();const value={["state"]:__privateWireValue2(reader),["gradient"]:__privateWireValue3(reader),["c"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue40(reader){const end=reader.frame();const value={["state"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const value={["ticket"]:__privateWireValue5(reader),["base"]:__privateWireValue5(reader),["context"]:__privateWireValue8(reader),["decision"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue49(reader){const end=reader.frame();const value={["value"]:__privateWireValue4(reader),["tangent_0"]:__privateWireValue4(reader),["tangent_1"]:__privateWireValue4(reader),["tangent_2"]:__privateWireValue4(reader),["tangent_3"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue52(reader){const end=reader.frame();const value={["w"]:__privateWireValue48(reader),["input"]:__privateWireValue50(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["w"]:__privateWireValue12(reader),["input"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value={["w"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue46(reader){const end=reader.frame();const value={["weight"]:__privateWireValue4(reader),["first"]:__privateWireValue4(reader),["second"]:__privateWireValue4(reader),["first_power"]:__privateWireValue4(reader),["second_power"]:__privateWireValue4(reader),["c"]:__privateWireValue38(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value={["weights"]:__privateWireValue3(reader),["c"]:__privateWireValue8(reader),["unit"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["weights"]:__privateWireValue3(reader),["first"]:__privateWireValue3(reader),["second"]:__privateWireValue3(reader),["steps"]:__privateWireValue5(reader),["first_power"]:__privateWireValue4(reader),["second_power"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue42(reader){const end=reader.frame();const value={["weights"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue44(reader){const end=reader.frame();const value={["x"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue45(reader){const end=reader.frame();const value={["xs"]:__privateWireValue3(reader),["limit"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value={["xs"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue3(value[i],budget,depth+1);return out;}
function __compiledOwnedValue18(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue9(value[i],budget,depth+1);return out;}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue7(value.Some,budget,depth+1)};}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue13(value[i],budget,depth+1);return out;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue4(value[i],budget,depth+1);return out;}
function __compiledOwnedValue17(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue3(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue9(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue1(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue20(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue2(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,4);return {["action"]:__compiledOwnedValue5(value["action"],budget,depth+1),["probability"]:__compiledOwnedValue4(value["probability"],budget,depth+1),["score"]:__compiledOwnedValue3(value["score"],budget,depth+1)};}
function __compiledOwnedValue23(value,budget,depth){budget.enter(depth,4);return {["context"]:__compiledOwnedValue24(value["context"],budget,depth+1),["action"]:__compiledOwnedValue5(value["action"],budget,depth+1)};}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,4);return {["context"]:__compiledOwnedValue8(value["context"],budget,depth+1),["action"]:__compiledOwnedValue5(value["action"],budget,depth+1)};}
function __compiledOwnedValue21(value,budget,depth){budget.enter(depth,4);return {["left_bias"]:__compiledOwnedValue22(value["left_bias"],budget,depth+1),["left_slope"]:__compiledOwnedValue22(value["left_slope"],budget,depth+1),["right_bias"]:__compiledOwnedValue22(value["right_bias"],budget,depth+1),["right_slope"]:__compiledOwnedValue22(value["right_slope"],budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,4);return {["left_bias"]:__compiledOwnedValue4(value["left_bias"],budget,depth+1),["left_slope"]:__compiledOwnedValue4(value["left_slope"],budget,depth+1),["right_bias"]:__compiledOwnedValue4(value["right_bias"],budget,depth+1),["right_slope"]:__compiledOwnedValue4(value["right_slope"],budget,depth+1)};}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,4);return {["optimizer"]:__compiledOwnedValue2(value["optimizer"],budget,depth+1),["version"]:__compiledOwnedValue5(value["version"],budget,depth+1),["ticket"]:__compiledOwnedValue5(value["ticket"],budget,depth+1),["pending"]:__compiledOwnedValue6(value["pending"],budget,depth+1)};}
function __compiledOwnedValue19(value,budget,depth){budget.enter(depth,4);return {["rate"]:__compiledOwnedValue4(value["rate"],budget,depth+1),["first_decay"]:__compiledOwnedValue4(value["first_decay"],budget,depth+1),["second_decay"]:__compiledOwnedValue4(value["second_decay"],budget,depth+1),["epsilon"]:__compiledOwnedValue4(value["epsilon"],budget,depth+1),["weight_decay"]:__compiledOwnedValue4(value["weight_decay"],budget,depth+1),["norm_limit"]:__compiledOwnedValue4(value["norm_limit"],budget,depth+1)};}
function __compiledOwnedValue24(value,budget,depth){budget.enter(depth,4);return {["signal"]:__compiledOwnedValue22(value["signal"],budget,depth+1),["urgency"]:__compiledOwnedValue22(value["urgency"],budget,depth+1)};}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);return {["signal"]:__compiledOwnedValue4(value["signal"],budget,depth+1),["urgency"]:__compiledOwnedValue4(value["urgency"],budget,depth+1)};}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,4);return {["ticket"]:__compiledOwnedValue5(value["ticket"],budget,depth+1),["base"]:__compiledOwnedValue5(value["base"],budget,depth+1),["context"]:__compiledOwnedValue8(value["context"],budget,depth+1),["decision"]:__compiledOwnedValue9(value["decision"],budget,depth+1)};}
function __compiledOwnedValue22(value,budget,depth){budget.enter(depth,4);return {["value"]:__compiledOwnedValue4(value["value"],budget,depth+1),["tangent_0"]:__compiledOwnedValue4(value["tangent_0"],budget,depth+1),["tangent_1"]:__compiledOwnedValue4(value["tangent_1"],budget,depth+1),["tangent_2"]:__compiledOwnedValue4(value["tangent_2"],budget,depth+1),["tangent_3"]:__compiledOwnedValue4(value["tangent_3"],budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,4);return {["weights"]:__compiledOwnedValue3(value["weights"],budget,depth+1),["first"]:__compiledOwnedValue3(value["first"],budget,depth+1),["second"]:__compiledOwnedValue3(value["second"],budget,depth+1),["steps"]:__compiledOwnedValue5(value["steps"],budget,depth+1),["first_power"]:__compiledOwnedValue4(value["first_power"],budget,depth+1),["second_power"]:__compiledOwnedValue4(value["second_power"],budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite3(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite18(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite9(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite7(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite13(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite4(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite17(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite3(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite14(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite9(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite1(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite20(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite2(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();__privateWireWrite5(writer,value["action"],compact);__privateWireWrite4(writer,value["probability"],compact);__privateWireWrite3(writer,value["score"],compact);writer.closeFrame(frame);}
function __privateWireWrite23(writer,value,compact){const frame=writer.openFrame();__privateWireWrite24(writer,value["context"],compact);__privateWireWrite5(writer,value["action"],compact);writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();__privateWireWrite8(writer,value["context"],compact);__privateWireWrite5(writer,value["action"],compact);writer.closeFrame(frame);}
function __privateWireWrite21(writer,value,compact){const frame=writer.openFrame();__privateWireWrite22(writer,value["left_bias"],compact);__privateWireWrite22(writer,value["left_slope"],compact);__privateWireWrite22(writer,value["right_bias"],compact);__privateWireWrite22(writer,value["right_slope"],compact);writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["left_bias"],compact);__privateWireWrite4(writer,value["left_slope"],compact);__privateWireWrite4(writer,value["right_bias"],compact);__privateWireWrite4(writer,value["right_slope"],compact);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["optimizer"],compact);__privateWireWrite5(writer,value["version"],compact);__privateWireWrite5(writer,value["ticket"],compact);__privateWireWrite6(writer,value["pending"],compact);writer.closeFrame(frame);}
function __privateWireWrite19(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["rate"],compact);__privateWireWrite4(writer,value["first_decay"],compact);__privateWireWrite4(writer,value["second_decay"],compact);__privateWireWrite4(writer,value["epsilon"],compact);__privateWireWrite4(writer,value["weight_decay"],compact);__privateWireWrite4(writer,value["norm_limit"],compact);writer.closeFrame(frame);}
function __privateWireWrite24(writer,value,compact){const frame=writer.openFrame();__privateWireWrite22(writer,value["signal"],compact);__privateWireWrite22(writer,value["urgency"],compact);writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["signal"],compact);__privateWireWrite4(writer,value["urgency"],compact);writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();__privateWireWrite5(writer,value["ticket"],compact);__privateWireWrite5(writer,value["base"],compact);__privateWireWrite8(writer,value["context"],compact);__privateWireWrite9(writer,value["decision"],compact);writer.closeFrame(frame);}
function __privateWireWrite22(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["value"],compact);__privateWireWrite4(writer,value["tangent_0"],compact);__privateWireWrite4(writer,value["tangent_1"],compact);__privateWireWrite4(writer,value["tangent_2"],compact);__privateWireWrite4(writer,value["tangent_3"],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["weights"],compact);__privateWireWrite3(writer,value["first"],compact);__privateWireWrite3(writer,value["second"],compact);__privateWireWrite5(writer,value["steps"],compact);__privateWireWrite4(writer,value["first_power"],compact);__privateWireWrite4(writer,value["second_power"],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
// Handles have no mutable private payload surface. Membership and type identity
// are checked by this module's closure; copied/foreign objects cannot forge them.
const __compiledHandles=new WeakMap();
const __compiledBindings=new WeakMap();
function __compiledHandle(identity,value,guaranteed=false){
 const handle=Object.freeze(Object.create(null));
 __compiledHandles.set(handle,{identity,value,guaranteed});return handle;
}
function __compiledEntry(handle,identity){
 const entry=__compiledHandles.get(handle);
 if(!entry||entry.identity!==identity)throw Error('compiled value type or owner mismatch');
 return entry;
}
function __compiledUnwrap(handle,identity){return __compiledEntry(handle,identity).value;}
// Emit the portable schema's framing/scalar events without creating a buffer
// or exposing private composite nodes. Only this wrapper receives callbacks
// from the literal writer; host visitors never receive those closures.
function __compiledValueEvents(sink,limits){
 const methods=['begin','end','byte','word','wide','text','count'];
 for(const name of methods)if(typeof sink?.[name]!=='function')throw Error('compiled value visitor method: '+name);
 const budget=createValueCaptureBudget(limits);let depth=0,closed=false;
 const active=()=>{if(closed)throw Error('compiled value visitor is closed');};
 const writer=Object.freeze({
  openFrame(){active();budget.enter(depth,4);depth++;sink.begin();return 0;}
  ,closeFrame(){active();if(depth===0)throw Error('wire frame boundary');try{sink.end();}finally{depth--;}}
  ,frame(emit){active();budget.enter(depth,4);depth++;sink.begin();try{emit();sink.end();}finally{depth--;}}
  ,byte(value){active();budget.add(1);sink.byte(value);}
  ,word(value){active();budget.add(4);sink.word(value);}
  ,wide(value){active();budget.add(8);sink.wide(value);}
  ,text(value){active();budget.text(value);sink.text(value);}
  ,count(value){active();budget.add(4);if(value>budget.remaining)throw Error('wire sequence size');sink.count(value);}
 });
 return {writer,close(){closed=true;}};
}
function __compiledReduction(factory,root,reduce,identity){
 if(typeof factory!=='function')throw Error('compiled reduction factory');
 const reducers=[],seen=new Set(),nodes=__reductionNodes();
 const prepare=index=>{
  if(seen.has(index))return;seen.add(index);
  const node=nodes[index];
  for(const child of node.children)prepare(child);
  const reducer=factory(node,index);
  if(node.kind==='list'||node.kind==='vector'){
   const start=reducer?.start,step=reducer?.step,finish=reducer?.finish;
   if(typeof start!=='function'||typeof step!=='function'||typeof finish!=='function')throw Error('compiled collection reduction');
   reducers[index]=Object.freeze({start,step,finish});
  }else{
   if(typeof reducer!=='function')throw Error('compiled value reduction');
   reducers[index]=reducer;
  }
 };
 prepare(root);Object.freeze(reducers);
 return Object.freeze(function(handle,context,limits={}){
  const value=__compiledUnwrap(handle,identity),budget=createValueCaptureBudget(limits);
  return reduce(value,reducers,budget,0,context);
 });
}
function __compiledCodec(schema,capture,read,write,copy,constructorRoot,reductionRoot,reduce,portableFused=false,compactFused=false){
 const privateCodec=createCompiledValueCodec(schema,read),publicCodec=privateCodec;
 let fusedCodec;const fused=()=>fusedCodec??=createFusedValueCodec(schema,read);
 const identity=schema.identity;
 const codec=Object.freeze({
  identity,
  descriptor:publicCodec.descriptor,
  resolve(type){return publicCodec.resolve(type);},
  capture(value,limits={}){
   return __compiledHandle(identity,capture(value,createValueCaptureBudget(limits),0));
  },
  decode(bytes,limits={}){return __compiledHandle(identity,(portableFused?fused():privateCodec).decode(bytes,limits));},
  decodeCompact(bytes,limits={}){return __compiledHandle(identity,(compactFused?fused():privateCodec).compact().decode(bytes,limits));},
  decodeFused(bytes,limits={}){return __compiledHandle(identity,fused().decode(bytes,limits));},
  decodeCompactFused(bytes,limits={}){return __compiledHandle(identity,fused().compact().decode(bytes,limits));},
  encode(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.encodeWith(writer=>write(writer,value,false),limits);},
  encodeCompact(handle,limits={}){const value=__compiledUnwrap(handle,identity);return publicCodec.compact().encodeWith(writer=>write(writer,value,true),limits);},
  materialize(handle,limits={}){return copy(__compiledUnwrap(handle,identity),createValueCaptureBudget(limits),0);},
  builder(limits={}){return __valueBuilder(__constructorNodes(),constructorRoot,identity,limits);},
  reducer(factory){return __compiledReduction(factory,reductionRoot,reduce,identity);},
  visit(handle,sink,limits={}){
   const value=__compiledUnwrap(handle,identity),events=__compiledValueEvents(sink,limits);
   try{write(events.writer,value,false);}finally{events.close();}
  },
 });
 __compiledBindings.set(codec,{publicCodec,write,capture});return codec;
}

function __compiledEncodeResult(entry,value,limits,compact){
 const {publicCodec,write}=__compiledBindings.get(entry.result());
 return (compact?publicCodec.compact():publicCodec).encodeWith(writer=>write(writer,value,compact),limits);
}
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[1],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["optimizer","version","ticket","pending"],patterns:[{bytes:4,label:"record",children:[2,5,5,6],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["optimizer"]:values[0],["version"]:values[1],["ticket"]:values[2],["pending"]:values[3]})}]},{kind:'record',fields:["weights","first","second","steps","first_power","second_power"],patterns:[{bytes:4,label:"record",children:[3,3,3,5,4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["weights"]:values[0],["first"]:values[1],["second"]:values[2],["steps"]:values[3],["first_power"]:values[4],["second_power"]:values[5]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[4],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"f32",scalar:__privateCapture4},{kind:"u32",scalar:__privateCapture5},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[7],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'record',fields:["ticket","base","context","decision"],patterns:[{bytes:4,label:"record",children:[5,5,8,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["ticket"]:values[0],["base"]:values[1],["context"]:values[2],["decision"]:values[3]})}]},{kind:'record',fields:["signal","urgency"],patterns:[{bytes:4,label:"record",children:[4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["signal"]:values[0],["urgency"]:values[1]})}]},{kind:'record',fields:["action","probability","score"],patterns:[{bytes:4,label:"record",children:[5,4,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["action"]:values[0],["probability"]:values[1],["score"]:values[2]})}]},{kind:"string",scalar:__privateCapture10},{kind:'record',fields:["left_bias","left_slope","right_bias","right_slope"],patterns:[{bytes:4,label:"record",children:[4,4,4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["left_bias"]:values[0],["left_slope"]:values[1],["right_bias"]:values[2],["right_slope"]:values[3]})}]},{kind:'record',fields:["context","action"],patterns:[{bytes:4,label:"record",children:[8,5],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["context"]:values[0],["action"]:values[1]})}]},{kind:"bool",scalar:__privateCapture13},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[9],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[3],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[13],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[3],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[9],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"],patterns:[{bytes:4,label:"record",children:[4,4,4,4,4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["rate"]:values[0],["first_decay"]:values[1],["second_decay"]:values[2],["epsilon"]:values[3],["weight_decay"]:values[4],["norm_limit"]:values[5]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[2],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["left_bias","left_slope","right_bias","right_slope"],patterns:[{bytes:4,label:"record",children:[22,22,22,22],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["left_bias"]:values[0],["left_slope"]:values[1],["right_bias"]:values[2],["right_slope"]:values[3]})}]},{kind:'record',fields:["value","tangent_0","tangent_1","tangent_2","tangent_3"],patterns:[{bytes:4,label:"record",children:[4,4,4,4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["value"]:values[0],["tangent_0"]:values[1],["tangent_1"]:values[2],["tangent_2"]:values[3],["tangent_3"]:values[4]})}]},{kind:'record',fields:["context","action"],patterns:[{bytes:4,label:"record",children:[24,5],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["context"]:values[0],["action"]:values[1]})}]},{kind:'record',fields:["signal","urgency"],patterns:[{bytes:4,label:"record",children:[22,22],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["signal"]:values[0],["urgency"]:values[1]})}]}];}
// Typed input construction only: plans contain literal constructor/capture
// functions emitted from source schemas. No source expression evaluator.
// All frames and private values remain in this closure; callers receive only
// an owned opaque handle after one complete, well-typed root is constructed.
const __constructorPaths=new WeakMap();
function __valueBuilder(nodes,root,identity,limits){
 const budget=createValueCaptureBudget(limits),frames=[];
 let result,targetNode,targetDepth,complete=false,closed=false,failed=false,busy=false;
 const fail=message=>{failed=true;frames.length=0;result=undefined;throw Error(message);};
 const active=()=>{if(failed||closed)throw Error('value builder is closed');};
 const expected=()=>{
  if(!frames.length){if(complete)fail('value builder root already complete');targetNode=root;targetDepth=0;return;}
  const frame=frames.at(-1),position=frame.values.length;
  if(!frame.pattern.sequence&&position>=frame.pattern.children.length)fail('value builder constructor is full');
  targetNode=frame.pattern.sequence?frame.pattern.children[0]:frame.pattern.children[position];targetDepth=frame.depth+frame.pattern.childDepth;
 };
 const accept=value=>{
  if(frames.length)frames.at(-1).values.push(value);
  else{result=value;complete=true;}
 };
 const execute=(operation,first,second)=>{
  active();if(busy)throw Error('value builder operation already active');busy=true;
  try{return operation(first,second);}catch(error){failed=true;frames.length=0;result=undefined;throw error;}finally{busy=false;}
 };
 // Compile and cache constructor paths independently of the session's values.
 const pathPlan=(choices,startNode,startDepth)=>{
   if(!Array.isArray(choices)||choices.length===0||choices.length>128)fail('invalid value builder path');
   let cache=__constructorPaths.get(nodes);if(!cache){cache=new WeakMap();__constructorPaths.set(nodes,cache);}
   let entries=cache.get(choices),saved=entries?.get(startNode);
   if(saved)return saved;
   const path=[],charges=[];let node=startNode,depth=startDepth;
   for(let i=0;i<choices.length;i++){
    const choice=choices[i],patterns=nodes[node].patterns;
    if(!Number.isSafeInteger(choice)||choice<0||!patterns||choice>=patterns.length)fail('invalid value builder constructor');
    const pattern=patterns[choice];charges.push([pattern,depth-startDepth]);path.push({pattern,node:nodes[node]});
    if(i+1<choices.length){if(pattern.sequence||pattern.children.length!==1)fail('value builder path is not unary');node=pattern.children[0];depth+=pattern.childDepth;}
   }
   const terminal=path.at(-1).pattern;
   // Compose literal constructor functions once per path, instead of
   // allocating and interpreting another recursive closure for every value.
   const compose=at=>{
    const {pattern,node}=path[at];
    if(node.flat){
     let index=0,last=at;
     while(last<path.length&&path[last].node.kind==='result'){
      if(path[last].pattern.sumBranch===0)break;
      index++;last++;
     }
     if(last===path.length){
      let make=args=>args[0];
      for(let i=path.length-1;i>=at;i--){const inner=make,p=path[i].pattern;make=args=>p.make([inner(args)]);}
      return make;
     }
     const payload=path[last].node.kind==='result'?(last+1<path.length?compose(last+1):args=>args[0]):compose(last);
     return args=>node.flat(index,payload(args));
    }
    const inner=at+1<path.length?compose(at+1):null;
    if(pattern.transparent)return inner??(args=>args[0]);
    return inner?args=>pattern.make([inner(args)]):pattern.make;
   };
   const make=compose(0);
   // Scalar paths use the same literal constructors, but pass the leaf
   // directly through erased records and flat sums. No temporary argument
   // array is needed at those edges. Ordinary constructors keep their array
   // calling convention; no private value reaches the public builder API.
   const composeScalar=at=>{
    const {pattern,node}=path[at];
    if(node.flat){
     let index=0,last=at;
     while(last<path.length&&path[last].node.kind==='result'){
      if(path[last].pattern.sumBranch===0)break;
      index++;last++;
     }
     if(last===path.length){
      let make=value=>value;
      for(let i=path.length-1;i>=at;i--){const inner=make,p=path[i].pattern;make=value=>p.make([inner(value)]);}
      return make;
     }
     const payload=path[last].node.kind==='result'?(last+1<path.length?composeScalar(last+1):value=>value):composeScalar(last);
     return value=>node.flat(index,payload(value));
    }
    const inner=at+1<path.length?composeScalar(at+1):null;
    if(pattern.transparent)return inner??(value=>value);
    return inner?value=>pattern.make([inner(value)]):value=>pattern.make([value]);
   };
   const scalar=composeScalar(0);
   const pattern={...terminal,make};
   // Only frozen arrays of ordinary data properties can key reusable plans.
   // Mutable arrays and frozen accessor arrays retain checked per-call paths.
   const fixed=charges.every(([p])=>Number.isSafeInteger(p.bytes)&&p.bytes>=4);
   const plan={pattern,scalar,charges,offset:depth-startDepth,bytes:fixed?charges.reduce((n,[p])=>n+p.bytes,0):null};
   let reusable=Object.isFrozen(choices);
   for(let i=0;reusable&&i<choices.length;i++){const field=Object.getOwnPropertyDescriptor(choices,String(i));reusable=!!field&&Object.hasOwn(field,'value');}
   if(reusable){
    if(!entries){entries=new Map();cache.set(choices,entries);}entries.set(startNode,plan);
   }
   return plan;
 };
 const chargePath=(plan,depth)=>{
  // Each emitted constructor consumes one node and a fixed frame/tag cost.
  // Only take the combined charge when every original check would succeed.
  // Replaying the original order retains the exact first failure otherwise.
  if(plan.bytes!==null&&depth+plan.offset<=budget.depth&&plan.charges.length<=budget.remaining&&budget.bytes+plan.bytes<=budget.limit){
   budget.remaining-=plan.charges.length;budget.bytes+=plan.bytes;return;
  }
  for(const [pattern,offset]of plan.charges)pattern.charge(budget,depth+offset);
 };
 // Operations are allocated once per session, and share expected-node
 // scratch only while the existing reentrancy guard is held.
 const openOperation=(choice)=>{
   expected();const node=nodes[targetNode];
   if(!Number.isSafeInteger(choice)||choice<0||!node.patterns||choice>=node.patterns.length)fail('invalid value builder constructor');
   const pattern=node.patterns[choice];pattern.charge(budget,targetDepth);
   frames.push({pattern,depth:targetDepth,values:[]});
 };
 const openPathOperation=(choices)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth);
   chargePath(plan,targetDepth);
   frames.push({pattern:plan.pattern,depth:targetDepth+plan.offset,values:[]});
 };
 const scalarPathOperation=(choices,value)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth),pattern=plan.pattern;
   if(pattern.sequence||pattern.children.length!==1)fail('value builder path has no scalar leaf');
   const capture=nodes[pattern.children[0]].scalar;
   if(typeof capture!=='function')fail('value builder path has no scalar leaf');
   chargePath(plan,targetDepth);
   const leaf=capture(value,budget,targetDepth+plan.offset+pattern.childDepth);
   accept(plan.scalar(leaf));
 };
 const emptyPathOperation=(choices)=>{
   expected();const plan=pathPlan(choices,targetNode,targetDepth),pattern=plan.pattern;
   if(pattern.sequence||pattern.children.length!==0)fail('value builder path is not empty');
   chargePath(plan,targetDepth);accept(pattern.make([]));
 };
 const scalarOperation=(value)=>{
   expected();const capture=nodes[targetNode].scalar;
   if(typeof capture!=='function')fail('value builder expects a constructor');
   accept(capture(value,budget,targetDepth));
 };
 const closeOperation=()=>{
   if(!frames.length)fail('value builder has no open constructor');
   const frame=frames.at(-1),pattern=frame.pattern,count=frame.values.length;
   if(!pattern.sequence&&count!==pattern.children.length||pattern.size!==undefined&&count!==pattern.size)fail('value builder constructor arity');
   if(pattern.sequence&&count>budget.limit)fail('wire sequence size');
   const value=pattern.make(frame.values);
   frames.pop();accept(value);
 };
 const finishOperation=()=>{
   if(frames.length||!complete)fail('value builder root is incomplete');
   closed=true;const handle=__compiledHandle(identity,result);result=undefined;return handle;
 };
 const api=Object.freeze({
  open(choice){return execute(openOperation,choice);},
  // Charge every source constructor even when unary paths share one frame.
  openPath(choices){return execute(openPathOperation,choices);},
  // Complete the path and leaf without intermediate session frames.
  scalarPath(choices,value){return execute(scalarPathOperation,choices,value);},
  emptyPath(choices){return execute(emptyPathOperation,choices);},
  scalar(value){return execute(scalarOperation,value);},
  close(){return execute(closeOperation);},
  finish(){return execute(finishOperation);},
  abort(){if(busy)throw Error('value builder operation already active');failed=true;frames.length=0;result=undefined;},
 });
 return api;
}
function __reduceValue0(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[0](0,__reduceValue1(value.Ok,r,b,d+1,c),c):r[0](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,4);return r[1](__reduceValue2(value["optimizer"],r,b,d+1,c),__reduceValue5(value["version"],r,b,d+1,c),__reduceValue5(value["ticket"],r,b,d+1,c),__reduceValue6(value["pending"],r,b,d+1,c),c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,4);return r[2](__reduceValue3(value["weights"],r,b,d+1,c),__reduceValue3(value["first"],r,b,d+1,c),__reduceValue3(value["second"],r,b,d+1,c),__reduceValue5(value["steps"],r,b,d+1,c),__reduceValue4(value["first_power"],r,b,d+1,c),__reduceValue4(value["second_power"],r,b,d+1,c),c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[3];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue4(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,8);return r[4]({F32Bits:value},c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,8);return r[5](value,c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[6](0,null,c):r[6](1,__reduceValue7(value.Some,r,b,d+1,c),c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,4);return r[7](__reduceValue5(value["ticket"],r,b,d+1,c),__reduceValue5(value["base"],r,b,d+1,c),__reduceValue8(value["context"],r,b,d+1,c),__reduceValue9(value["decision"],r,b,d+1,c),c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,4);return r[8](__reduceValue4(value["signal"],r,b,d+1,c),__reduceValue4(value["urgency"],r,b,d+1,c),c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,4);return r[9](__reduceValue5(value["action"],r,b,d+1,c),__reduceValue4(value["probability"],r,b,d+1,c),__reduceValue3(value["score"],r,b,d+1,c),c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,4);b.text(value);return r[10](value,c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,4);return r[11](__reduceValue4(value["left_bias"],r,b,d+1,c),__reduceValue4(value["left_slope"],r,b,d+1,c),__reduceValue4(value["right_bias"],r,b,d+1,c),__reduceValue4(value["right_slope"],r,b,d+1,c),c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,4);return r[12](__reduceValue8(value["context"],r,b,d+1,c),__reduceValue5(value["action"],r,b,d+1,c),c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,5);return r[13](value,c);}
function __reduceValue14(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[14](0,__reduceValue9(value.Ok,r,b,d+1,c),c):r[14](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue15(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[15];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue3(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[16];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue13(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue17(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[17](0,__reduceValue3(value.Ok,r,b,d+1,c),c):r[17](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue18(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[18];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue9(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue19(value,r,b,d,c){b.enter(d,4);return r[19](__reduceValue4(value["rate"],r,b,d+1,c),__reduceValue4(value["first_decay"],r,b,d+1,c),__reduceValue4(value["second_decay"],r,b,d+1,c),__reduceValue4(value["epsilon"],r,b,d+1,c),__reduceValue4(value["weight_decay"],r,b,d+1,c),__reduceValue4(value["norm_limit"],r,b,d+1,c),c);}
function __reduceValue20(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[20](0,__reduceValue2(value.Ok,r,b,d+1,c),c):r[20](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue21(value,r,b,d,c){b.enter(d,4);return r[21](__reduceValue22(value["left_bias"],r,b,d+1,c),__reduceValue22(value["left_slope"],r,b,d+1,c),__reduceValue22(value["right_bias"],r,b,d+1,c),__reduceValue22(value["right_slope"],r,b,d+1,c),c);}
function __reduceValue22(value,r,b,d,c){b.enter(d,4);return r[22](__reduceValue4(value["value"],r,b,d+1,c),__reduceValue4(value["tangent_0"],r,b,d+1,c),__reduceValue4(value["tangent_1"],r,b,d+1,c),__reduceValue4(value["tangent_2"],r,b,d+1,c),__reduceValue4(value["tangent_3"],r,b,d+1,c),c);}
function __reduceValue23(value,r,b,d,c){b.enter(d,4);return r[23](__reduceValue24(value["context"],r,b,d+1,c),__reduceValue5(value["action"],r,b,d+1,c),c);}
function __reduceValue24(value,r,b,d,c){b.enter(d,4);return r[24](__reduceValue22(value["signal"],r,b,d+1,c),__reduceValue22(value["urgency"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([2,5,5,6]),"fields":Object.freeze(["optimizer","version","ticket","pending"]),"kind":"record","name":"AgentState"}),Object.freeze({"children":Object.freeze([3,3,3,5,4,4]),"fields":Object.freeze(["weights","first","second","steps","first_power","second_power"]),"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}),Object.freeze({"children":Object.freeze([4]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([7]),"kind":"option"}),Object.freeze({"children":Object.freeze([5,5,8,9]),"fields":Object.freeze(["ticket","base","context","decision"]),"kind":"record","name":"Pending"}),Object.freeze({"children":Object.freeze([4,4]),"fields":Object.freeze(["signal","urgency"]),"kind":"record","name":"Context"}),Object.freeze({"children":Object.freeze([5,4,3]),"fields":Object.freeze(["action","probability","score"]),"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([4,4,4,4]),"fields":Object.freeze(["left_bias","left_slope","right_bias","right_slope"]),"kind":"record","name":"Weights"}),Object.freeze({"children":Object.freeze([8,5]),"fields":Object.freeze(["context","action"]),"kind":"record","name":"Input"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([9,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([3]),"kind":"list"}),Object.freeze({"children":Object.freeze([13]),"kind":"list"}),Object.freeze({"children":Object.freeze([3,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([9]),"kind":"list"}),Object.freeze({"children":Object.freeze([4,4,4,4,4,4]),"fields":Object.freeze(["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"]),"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}),Object.freeze({"children":Object.freeze([2,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([22,22,22,22]),"fields":Object.freeze(["left_bias","left_slope","right_bias","right_slope"]),"kind":"record","name":"__ink_differential_4"}),Object.freeze({"children":Object.freeze([4,4,4,4,4]),"fields":Object.freeze(["value","tangent_0","tangent_1","tangent_2","tangent_3"]),"kind":"record","name":"__ink_differential_2"}),Object.freeze({"children":Object.freeze([24,5]),"fields":Object.freeze(["context","action"]),"kind":"record","name":"__ink_differential_5"}),Object.freeze({"children":Object.freeze([22,22]),"fields":Object.freeze(["signal","urgency"]),"kind":"record","name":"__ink_differential_6"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"485744f6bbe90a893c514510bb1638516a9d2d78ee025202f9c1fb23bddf6c6a","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture3,__privateWireValue3,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"75240e7a40e3df960c38dc04412c9479772294c1ecda90c70f28242d4948b6cf","named":__compiledNamed0(),"root":{"fields":[{"name":"left_bias","type":{"kind":"f32"}},{"name":"left_slope","type":{"kind":"f32"}},{"name":"right_bias","type":{"kind":"f32"}},{"name":"right_slope","type":{"kind":"f32"}}],"kind":"record","name":"Weights"}},__privateCapture11,__privateWireValue12,__privateWireWrite11,__compiledOwnedValue11,11,11,__reduceValue11,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f5d0b9ca0b5eae710604bbcf17237fa9fc56b5aecf316aa7802dd81f3bba8c9f","named":__compiledNamed0(),"root":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"Input"}},__privateCapture12,__privateWireValue15,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture4,__privateWireValue4,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"527551377bd17b92896a15762c229d6460c9ebc9e76cdd1997e8bfdce2b4fdd5","named":__compiledNamed0(),"root":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},__privateCapture8,__privateWireValue8,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture13,__privateWireValue17,__privateWireWrite13,__compiledOwnedValue13,13,13,__reduceValue13,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"4c26cf6146a67b60bc34cb27a1b07b25ab14048bb6f0044b09b8e87179b513fa","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}},__privateCapture14,__privateWireValue19,__privateWireWrite14,__compiledOwnedValue14,14,14,__reduceValue14,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"e6ecbca7ed35be1a0822ccbf80033c49f73f69b2f105f1a8d6f6b2790a5c3c99","named":__compiledNamed0(),"root":{"fields":[{"name":"optimizer","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"pending","type":{"element":{"fields":[{"name":"ticket","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"context","type":{"fields":[{"name":"signal","type":{"kind":"f32"}},{"name":"urgency","type":{"kind":"f32"}}],"kind":"record","name":"Context"}},{"name":"decision","type":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}}],"kind":"record","name":"Pending"},"kind":"option"}}],"kind":"record","name":"AgentState"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture5,__privateWireValue5,__privateWireWrite5,__compiledOwnedValue5,5,5,__reduceValue5,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"10f1dcead19744e0a592fb45cc3a7937377e3d50ca1c195e603898f63e9b4264","named":__compiledNamed0(),"root":{"element":{"element":{"kind":"f32"},"kind":"list"},"kind":"list"}},__privateCapture15,__privateWireValue23,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
let __compiledCodec11Value;function __compiledCodec11(){return __compiledCodec11Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"e068b4428ffb87ff21e134eb8b1d7aa7d64685b0c2940afaabbaf063feec0fe2","named":__compiledNamed0(),"root":{"element":{"kind":"bool"},"kind":"list"}},__privateCapture16,__privateWireValue24,__privateWireWrite16,__compiledOwnedValue16,16,16,__reduceValue16,false,false);}
let __compiledCodec12Value;function __compiledCodec12(){return __compiledCodec12Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"b04d6d649eefb7b6403c8a905c4f10916e9a95616519c1b03136a24a64f35c31","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"kind":"f32"},"kind":"list"}}},__privateCapture17,__privateWireValue26,__privateWireWrite17,__compiledOwnedValue17,17,17,__reduceValue17,false,false);}
let __compiledCodec13Value;function __compiledCodec13(){return __compiledCodec13Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"9ce74016ea42927196508ef07c8a7b394ee849fd215473204268c5c693b53818","named":__compiledNamed0(),"root":{"element":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"},"kind":"list"}},__privateCapture18,__privateWireValue28,__privateWireWrite18,__compiledOwnedValue18,18,18,__reduceValue18,false,false);}
let __compiledCodec14Value;function __compiledCodec14(){return __compiledCodec14Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"6ada1b4efc795e823ba4ca0f4a68bae5507ad7785519e130f769db0e46ede73b","named":__compiledNamed0(),"root":{"fields":[{"name":"action","type":{"kind":"u32"}},{"name":"probability","type":{"kind":"f32"}},{"name":"score","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"ink_m661637c3adbaa0f0830635fd9a160d462e80b490866b2aafcfaa41cf717ac7c0"}},__privateCapture9,__privateWireValue9,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec15Value;function __compiledCodec15(){return __compiledCodec15Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":__compiledNamed0(),"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},__privateCapture19,__privateWireValue38,__privateWireWrite19,__compiledOwnedValue19,19,19,__reduceValue19,false,false);}
let __compiledCodec16Value;function __compiledCodec16(){return __compiledCodec16Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fb51f6ef47ef23bec5fa30a1bf44674eef7e617546994700a49bccfb4c1baba3","named":__compiledNamed0(),"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec17Value;function __compiledCodec17(){return __compiledCodec17Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},__privateCapture20,__privateWireValue41,__privateWireWrite20,__compiledOwnedValue20,20,20,__reduceValue20,false,false);}
let __compiledCodec18Value;function __compiledCodec18(){return __compiledCodec18Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"e155145fad0c5a784b00efcdde4717584e382544a560cbd4388dcaa67a5ba034","named":__compiledNamed0(),"root":{"fields":[{"name":"left_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"left_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_bias","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"right_slope","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_4"}},__privateCapture21,__privateWireValue48,__privateWireWrite21,__compiledOwnedValue21,21,21,__reduceValue21,false,false);}
let __compiledCodec19Value;function __compiledCodec19(){return __compiledCodec19Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"968fcfd0159f333a9d276f40c9167b61e5f18f80c94f697fc68bcbfe6a3c3528","named":__compiledNamed0(),"root":{"fields":[{"name":"context","type":{"fields":[{"name":"signal","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},{"name":"urgency","type":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}}],"kind":"record","name":"__ink_differential_6"}},{"name":"action","type":{"kind":"u32"}}],"kind":"record","name":"__ink_differential_5"}},__privateCapture23,__privateWireValue50,__privateWireWrite23,__compiledOwnedValue23,23,23,__reduceValue23,false,false);}
let __compiledCodec20Value;function __compiledCodec20(){return __compiledCodec20Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"93e40a391aa823b558ea752b04b9acad0275cd170e9e56df4ecad54f100d0c31","named":__compiledNamed0(),"root":{"fields":[{"name":"value","type":{"kind":"f32"}},{"name":"tangent_0","type":{"kind":"f32"}},{"name":"tangent_1","type":{"kind":"f32"}},{"name":"tangent_2","type":{"kind":"f32"}},{"name":"tangent_3","type":{"kind":"f32"}}],"kind":"record","name":"__ink_differential_2"}},__privateCapture22,__privateWireValue49,__privateWireWrite22,__compiledOwnedValue22,22,22,__reduceValue22,false,false);}
const __compiledEntries=new Map([["initialize",{index:0,params:[],result:__compiledCodec0,arguments:__privateWireValue11,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[],precondition:null}],["unpack",{index:1,params:[__compiledCodec1],result:__compiledCodec2,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["pack",{index:2,params:[__compiledCodec2],result:__compiledCodec1,arguments:__privateWireValue14,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["mass",{index:3,params:[__compiledCodec2,__compiledCodec3],result:__compiledCodec4,arguments:__privateWireValue16,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["valid_context",{index:4,params:[__compiledCodec5],result:__compiledCodec6,arguments:__privateWireValue18,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["policy",{index:5,params:[__compiledCodec1,__compiledCodec5,__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["valid_agent",{index:6,params:[__compiledCodec8],result:__compiledCodec6,arguments:__privateWireValue21,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["reward",{index:7,params:[__compiledCodec5,__compiledCodec9],result:__compiledCodec4,arguments:__privateWireValue22,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["decision",{index:8,params:[__compiledCodec1,__compiledCodec10,__compiledCodec11,__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["returns",{index:9,params:[__compiledCodec1,__compiledCodec4,__compiledCodec4],result:__compiledCodec12,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["trajectory",{index:10,params:[__compiledCodec13,__compiledCodec1,__compiledCodec1,__compiledCodec4,__compiledCodec4],result:__compiledCodec12,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false,false],precondition:null}],["edge",{index:11,params:[__compiledCodec9],result:__compiledCodec7,arguments:__privateWireValue30,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["batch",{index:12,params:[__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mf8c8b7bece8d14389eab1038adb3b7830097079aed0acc6403a569b9c382cc54",{index:13,params:[__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m28a5428efa573345218636e9cec104f24b6e8c67d7c4c0f979b255813b2abee3",{index:14,params:[__compiledCodec1,__compiledCodec11],result:__compiledCodec4,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mfd18151b0af45b45f5b48ef5e7a09ac1294681f654e2174ae3b33183f445ef14",{index:15,params:[__compiledCodec1,__compiledCodec11],result:__compiledCodec12,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mc05a2256079ef1f1818d13e69727dc7902cdb7f70856a671af2ba08ef190d23a",{index:16,params:[__compiledCodec1,__compiledCodec11],result:__compiledCodec12,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m6ec6e8f9e757c220bfe2ed28cbb8dab4ec520de5ee8de5ca702cbdb805a5f910",{index:17,params:[__compiledCodec1,__compiledCodec4,__compiledCodec4],result:__compiledCodec9,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_maa2c8802d351b443dda0bc206d70fa9fe87756b57a84d0357e9dfb4c1e7a0667",{index:18,params:[__compiledCodec10,__compiledCodec11,__compiledCodec4,__compiledCodec4],result:__compiledCodec1,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m1774c4db693eebe71b1f79bce053b93633d1e1ec37196dd480b59c0248b4fbc2",{index:19,params:[__compiledCodec1,__compiledCodec10,__compiledCodec11,__compiledCodec4,__compiledCodec9],result:__compiledCodec1,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false,false],precondition:null}],["ink_m1fbf7ee6cef3bcca5d7d258c8606275806894b60d839126202d17f016ea87c80",{index:20,params:[__compiledCodec1,__compiledCodec10,__compiledCodec11,__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_maadd6c30a027af52d851f0828eec45339d218ad3bbe73e4d8d7cdd3892e754f4",{index:21,params:[__compiledCodec14,__compiledCodec4,__compiledCodec4],result:__compiledCodec12,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m696809152e57d8dfa3f01f9a3e12c048434b9f2af91ff53321ea6ceeeeca5431",{index:22,params:[__compiledCodec12,__compiledCodec14,__compiledCodec4,__compiledCodec4],result:__compiledCodec12,arguments:__privateWireValue36,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m43c1e2ac4d6d9a37358654ff5c1abcd42d4b01146c41a7ca617bccb074a8813b",{index:23,params:[__compiledCodec13,__compiledCodec1,__compiledCodec1],result:__compiledCodec12,arguments:__privateWireValue37,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_mda500f665e6078213ee2391fedf06240c651d1725327b086aa70cda14bef9a07",{index:24,params:[__compiledCodec1,__compiledCodec4,__compiledCodec4],result:__compiledCodec12,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",{index:25,params:[__compiledCodec4],result:__compiledCodec15,arguments:__privateWireValue39,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",{index:26,params:[__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",{index:27,params:[__compiledCodec16],result:__compiledCodec6,arguments:__privateWireValue40,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",{index:28,params:[__compiledCodec1],result:__compiledCodec17,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",{index:29,params:[__compiledCodec15],result:__compiledCodec6,arguments:__privateWireValue43,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",{index:30,params:[__compiledCodec4],result:__compiledCodec4,arguments:__privateWireValue44,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",{index:31,params:[__compiledCodec1,__compiledCodec4],result:__compiledCodec4,arguments:__privateWireValue45,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",{index:32,params:[__compiledCodec4,__compiledCodec4,__compiledCodec4,__compiledCodec4,__compiledCodec4,__compiledCodec15],result:__compiledCodec4,arguments:__privateWireValue46,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false,false,false],precondition:null}],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",{index:33,params:[__compiledCodec16,__compiledCodec1,__compiledCodec15],result:__compiledCodec17,arguments:__privateWireValue47,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["__ink_differential_3",{index:34,params:[__compiledCodec18,__compiledCodec19],result:__compiledCodec20,arguments:__privateWireValue52,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["__ink_differential_1",{index:35,params:[__compiledCodec2,__compiledCodec3],result:__compiledCodec2,arguments:__privateWireValue16,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}]]);

export const compiledValues=Object.freeze(Object.fromEntries([...__compiledEntries].map(([name,entry])=>[name,Object.freeze({get params(){return Object.freeze(entry.params.map(codec=>codec()));},get result(){return entry.result();}})])));
function __compiledValidate(entry,owned){
 const values=owned.map(v=>v.value);
 const established=entry.onlyTypeGuards&&entry.needsInvariants.every((needed,i)=>!needed||owned[i].guaranteed);
 if(entry.precondition!==null&&!established){
  if(__implementations[entry.precondition](...values)!==true)throw Error('contract precondition failed');
  for(let i=0;i<owned.length;i++)if(entry.needsInvariants[i])owned[i].guaranteed=true;
 }
 return values;
}
export function callCompiled(name,args){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(args)||args.length!==entry.params.length)throw Error('unsupported compiled call');
 const owned=entry.params.map((codec,i)=>__compiledEntry(args[i],codec().identity)),values=__compiledValidate(entry,owned);
 // Checked source outputs satisfy their declared value interfaces. Private
 // handles expose only detached copies and never retain mutable host inputs.
 return __compiledHandle(entry.result().identity,__implementations[entry.index](...values),true);
}

// Explicit sealed-value partial application. Each token owns a bounded set of
// lexical caches; no mutable host object, global memo table or error is retained.
const __preparedCompiled=new WeakMap();
export function prepareCompiled(name,bindings){
 const entry=__compiledEntries.get(name);
 if(!entry||!Array.isArray(bindings)||bindings.length>entry.params.length)throw Error('unsupported prepared compiled call');
 const captured=new Array(entry.params.length),fixed=new Array(entry.params.length).fill(false);
 for(const binding of bindings){
  if(!Array.isArray(binding)||binding.length!==2)throw Error('prepared compiled binding');
  const [index,handle]=binding;
  if(!Number.isInteger(index)||index<0||index>=fixed.length||fixed[index])throw Error('prepared compiled parameter');
  captured[index]=__compiledEntry(handle,entry.params[index]().identity);fixed[index]=true;
 }
 const remaining=fixed.flatMap((yes,i)=>yes?[]:[i]);
 const factory=__preparedFactories.get(entry.index);
 const run=factory?factory(fixed):__implementations[entry.index];
 const token=Object.freeze(Object.create(null));
 __preparedCompiled.set(token,{entry,captured,remaining,run});return token;
}
export function callPreparedCompiled(token,args){
 const prepared=__preparedCompiled.get(token);
 if(!prepared||!Array.isArray(args)||args.length!==prepared.remaining.length)throw Error('invalid prepared compiled call');
 const {entry,captured,remaining,run}=prepared,owned=captured.slice();
 for(let i=0;i<remaining.length;i++){const at=remaining[i];owned[at]=__compiledEntry(args[i],entry.params[at]().identity);}
 const values=__compiledValidate(entry,owned);
 return __compiledHandle(entry.result().identity,run(...values),true);
}
const __intoOutput2=__representation(metadata.functions[2].result.element,true);
const __intoOutput12=__representation(metadata.functions[12].result.element,true);
const __intoOutput18=__representation(metadata.functions[18].result.element,true);
const __intoOutput19=__representation(metadata.functions[19].result.element,true);
const __intoImplementations=[null,null,__into2,null,null,null,null,null,null,null,null,null,__into12,null,null,null,null,null,__into18,__into19,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
