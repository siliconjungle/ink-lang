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
function __fn0(v0){
const v1=v0;
const v2=Number.isFinite(__float(v1["weight"]));
let v3=v2;if(v3){
const v4=v0;
const v5=v4["weight"];
const v6=1090519040;
const v7=((v6 ^ 2147483648) >>> 0);
v3=((__float(v5)) >= (__float(v7)));}
const v8=v3;
let v9=v8;if(v9){
const v10=v0;
const v11=v10["weight"];
const v12=1090519040;
v9=((__float(v11)) <= (__float(v12)));}
return v9;}
function __fn1(v13,v14){
const v15=v14;
const v16=v15["updates"];
const v17=v13;
const v18=v17["updates"];
return ((v16) > (v18));}
function __fn2(v19,v20){
const v21=v19;
const v22=v21["updates"];
const v23=4294967295;
let v24;if((v22===v23)){
v24=({Err:"model update limit"});}else{
const v25=v19;
const v26=v25["weight"];
const v27=v20;
const v28=v27["input"];
const v29=__bits(__float(v26) * __float(v28));
const v30=v20;
const v31=v30["target"];
const v32=__bits(__float(v29) - __float(v31));
const v33=v19;
const v34=v33["weight"];
const v35=v20;
const v36=v35["rate"];
const v37=v20;
const v38=v37["input"];
const v39=v32;
const v40=__bits(__float(v38) * __float(v39));
const v41=v32;
const v42=v20;
const v43=v42["input"];
const v44=__bits(__float(v41) * __float(v43));
const v45=__bits(__float(v40) + __float(v44));
const v46=__bits(__float(v36) * __float(v45));
const v47=__bits(__float(v34) - __float(v46));
const v48=v19;
const v49=v48["updates"];
const v50=1;
const v51=(((v49) + (v50)) >>> 0);
const v53=({["weight"]:v47,["updates"]:v51});
const v54=__fn0(v53);
const v55=false;
let v56;if((v54===v55)){
v56=({Err:"model domain"});}else{
v56=({Ok:({["weight"]:v47,["updates"]:v51})});}
v24=v56;}
return v24;}
function __fn3(v57,v58,v59){
const v60=v57;
const v61=v58;
const v62=v59;
const v63=v60;
const v64=__fn12(v63);
const v65=false;
const v66=(v64===v65);
let v67=v66;if(!v67){
const v68=v60;
const v69=v68["active"];
const v70=false;
v67=(v69===v70);}
const v71=v67;
let v72=v71;if(!v72){
const v73=v60;
const v74=v73["settings"];
v72=v74["paused"];}
const v75=v72;
let v76=v75;if(!v76){
const v77=v61;
const v78=v60;
const v79=v78["ticket"];
v76=!(v77===v79);}
const v80=v76;
let v81=v80;if(!v81){
const v82=v60;
const v83=v82["base"];
const v84=v60;
const v85=v84["version"];
v81=!(v83===v85);}
const v86=v81;
let v87=v86;if(!v87){
const v88=v62;
const v89=0;
v87=(v88===v89);}
const v90=v87;
let v91=v90;if(!v91){
const v92=v62;
const v93=v60;
const v94=v93["settings"];
const v95=v94["budget"];
v91=((v92) > (v95));}
let v96;if(v91){
v96=({Err:"session work boundary"});}else{
const v97=v62;
const v98=v60;
const v99=(v98["queue"]).length;
const v100=v60;
const v101=v100["processed"];
const v102=(((v99) - (v101)) >>> 0);
let v103;if(((v97) < (v102))){
v103=v62;}else{
const v104=v60;
const v105=(v104["queue"]).length;
const v106=v60;
const v107=v106["processed"];
v103=(((v105) - (v107)) >>> 0);}
const v108=v103;
const v109=({Ok:v60});
const v110=v108;
let v111=v109;
for(let v112=0;v112<v110;v112++){
if(false){break;}
const v113=(v112>>>0);
const v114=v111;
let v115;if(Object.hasOwn(v114,"Ok")){
const v116=v114["Ok"];
const v117=v116;
const v118=v117;
const v119=v118["queue"];
const v120=v117;
const v121=v120["processed"];
let v122;if(v121<v119.length){v122=v119[v121];}else{
const v123=0;
const v124=v117;
const v125=v124["fallback"];
v122=({["id"]:v123,["observation"]:v125});}
const v126=v122;
const v127=v117;
const v128=v127["candidate"];
const v129=v126;
const v130=v129["observation"];
const v131=v128;
const v132=v130;
const v133=v131;
const v134=v132;
const v135=v133;
const v136=v134;
const v137=__fn2(v135,v136);
const v138=v137;
const v139=v138;
let v140;if(Object.hasOwn(v139,"Ok")){
const v141=v139["Ok"];
const v142=v141;
const v143=v142;
const v144=v143;
const v145=v144;
const v146=v145;
const v147=__fn0(v146);
const v148=v147;
const v149=v148;
const v150=false;
let v151;if((v149===v150)){
v151=({Err:"candidate domain"});}else{
const v152=v142;
const v153=v117;
const v154=v153["processed"];
const v155=1;
const v156=(((v154) + (v155)) >>> 0);
const v157=v117;
const v158=v157["serving"];
const v159=v152;
const v160=v117;
const v161=v160["fallback"];
const v162=v117;
const v163=v162["settings"];
const v164=v117;
const v165=v164["version"];
const v166=v117;
const v167=v166["base"];
const v168=v117;
const v169=v168["ticket"];
const v170=v117;
const v171=v170["active"];
const v172=v156;
const v173=v117;
const v174=v173["queue"];
const v175=v117;
const v176=v175["next"];
const v177=v117;
const v178=v177["published_through"];
const v179=v117;
const v180=v179["dropped"];
v151=({Ok:({["serving"]:v158,["candidate"]:v159,["fallback"]:v161,["settings"]:v163,["version"]:v165,["base"]:v167,["ticket"]:v169,["active"]:v171,["processed"]:v172,["queue"]:v174,["next"]:v176,["published_through"]:v178,["dropped"]:v180})});}
v140=v151;}else{
const v181=v139["Err"];
v140=({Err:v181});}
const v182=v140;
v115=v182;}else{
const v183=v114["Err"];
v115=({Err:v183});}
v111=v115;}
v96=v111;}
const v184=v96;
return v184;}
function __fn4(v185,v186,v187){
const v188=v185;
const v189=v186;
const v190=v187;
const v191=v188;
const v192=__fn12(v191);
const v193=false;
const v194=(v192===v193);
let v195=v194;if(!v195){
const v196=v188;
const v197=v196["active"];
const v198=false;
v195=(v197===v198);}
const v199=v195;
let v200=v199;if(!v200){
const v201=v188;
const v202=v201["settings"];
v200=v202["paused"];}
const v203=v200;
let v204=v203;if(!v204){
const v205=v189;
const v206=v188;
const v207=v206["ticket"];
v204=!(v205===v207);}
const v208=v204;
let v209=v208;if(!v209){
const v210=v188;
const v211=v210["base"];
const v212=v188;
const v213=v212["version"];
v209=!(v211===v213);}
const v214=v209;
let v215=v214;if(!v215){
const v216=v188;
const v217=v216["version"];
const v218=4294967295;
v215=(v217===v218);}
const v219=v215;
let v220=v219;if(!v220){
const v221=v188;
const v222=v221["processed"];
const v223=0;
v220=(v222===v223);}
const v224=v220;
let v225=v224;if(!v225){
const v226=v190;
const v227=false;
const v228=(v226===v227);
let v229=v228;if(v229){
const v230=v188;
const v231=v230["processed"];
const v232=v188;
const v233=v232["settings"];
const v234=v233["publish_every"];
v229=((v231) < (v234));}
v225=v229;}
let v235;if(v225){
v235=({Err:"session publication boundary"});}else{
const v236=v188;
const v237=v236["candidate"];
const v238=v237;
const v239=v238;
const v240=__fn0(v239);
const v241=v240;
const v242=false;
const v243=(v241===v242);
let v244=v243;if(!v244){
const v245=v188;
const v246=v245["serving"];
const v247=v188;
const v248=v247["candidate"];
const v249=v246;
const v250=v248;
const v251=v249;
const v252=v250;
const v253=__fn1(v251,v252);
const v254=v253;
const v255=false;
v244=(v254===v255);}
let v256;if(v244){
v256=({Err:"candidate rejected"});}else{
const v257=v188;
const v258=v257["queue"];
const v259=v188;
const v260=v259["processed"];
const v261=1;
const v262=(((v260) - (v261)) >>> 0);
let v263;if(v262<v258.length){v263=v258[v262];}else{
const v264=0;
const v265=v188;
const v266=v265["fallback"];
v263=({["id"]:v264,["observation"]:v266});}
const v267=v263;
const v268=v267["id"];
const v269=v188;
const v270=v269["candidate"];
const v271=v188;
const v272=v271["version"];
const v273=1;
const v274=(((v272) + (v273)) >>> 0);
const v275=v188;
const v276=v275["version"];
const v277=1;
const v278=(((v276) + (v277)) >>> 0);
const v279=false;
const v280=0;
const v281=v188;
const v282=v281["queue"];
const v283=v282.length;
const v284=[];
for(let v285=0;v285<v283;v285++){
const v286=v282[v285];
const v287=v286;
const v288=v287["id"];
const v289=v268;
if(((v288) > (v289))){v284.push(v286);}
}
const v290=v284;
const v291=v268;
const v292=v270;
const v293=v188;
const v294=v293["candidate"];
const v295=v188;
const v296=v295["fallback"];
const v297=v188;
const v298=v297["settings"];
const v299=v274;
const v300=v278;
const v301=v188;
const v302=v301["ticket"];
const v303=v279;
const v304=v280;
const v305=v290;
const v306=v188;
const v307=v306["next"];
const v308=v291;
const v309=v188;
const v310=v309["dropped"];
v256=({Ok:({["serving"]:v292,["candidate"]:v294,["fallback"]:v296,["settings"]:v298,["version"]:v299,["base"]:v300,["ticket"]:v302,["active"]:v303,["processed"]:v304,["queue"]:v305,["next"]:v307,["published_through"]:v308,["dropped"]:v310})});}
v235=v256;}
const v311=v235;
return v311;}
function __fn5(v312,v313){
const v314=v312;
const v315=v313;
const v316=v314;
const v317=__fn12(v316);
const v318=false;
const v319=(v317===v318);
let v320=v319;if(!v320){
const v321=v314;
const v322=v321["version"];
const v323=4294967295;
v320=(v322===v323);}
const v324=v320;
let v325=v324;if(!v325){
const v326=v315;
const v327=v326;
const v328=v327;
const v329=__fn0(v328);
const v330=v329;
const v331=false;
v325=(v330===v331);}
let v332;if(v325){
v332=({Err:"serving replacement domain"});}else{
const v333=v315;
const v334=v314;
const v335=v334["version"];
const v336=1;
const v337=(((v335) + (v336)) >>> 0);
const v338=v333;
const v339=v314;
const v340=v339["candidate"];
const v341=v314;
const v342=v341["fallback"];
const v343=v314;
const v344=v343["settings"];
const v345=v337;
const v346=v314;
const v347=v346["base"];
const v348=v314;
const v349=v348["ticket"];
const v350=v314;
const v351=v350["active"];
const v352=v314;
const v353=v352["processed"];
const v354=v314;
const v355=v354["queue"];
const v356=v314;
const v357=v356["next"];
const v358=v314;
const v359=v358["published_through"];
const v360=v314;
const v361=v360["dropped"];
v332=({Ok:({["serving"]:v338,["candidate"]:v340,["fallback"]:v342,["settings"]:v344,["version"]:v345,["base"]:v347,["ticket"]:v349,["active"]:v351,["processed"]:v353,["queue"]:v355,["next"]:v357,["published_through"]:v359,["dropped"]:v361})});}
const v362=v332;
return v362;}
function __fn6(v363){
const v364=v363;
let v365;if(Object.hasOwn(v364,"Ok")){
const v366=v364["Ok"];
const v367=v366;
const v368=v367;
const v369=__fn12(v368);
const v370=false;
const v371=(v369===v370);
let v372=v371;if(!v372){
const v373=v367;
const v374=v373["serving"];
const v375=__fn0(v374);
const v376=false;
v372=(v375===v376);}
const v377=v372;
let v378=v377;if(!v378){
const v379=v367;
const v380=v379["candidate"];
const v381=__fn0(v380);
const v382=false;
v378=(v381===v382);}
let v383;if(v378){
v383=({Err:"session domain"});}else{
v383=({Ok:v367});}
v365=v383;}else{
const v384=v364["Err"];
v365=({Err:v384});}
return v365;}
function __fn7(v385){
const v386=v385;
return (v386["queue"]).length;}
function __fn8(v387){
const v388=v387;
const v389=v388["version"];
const v390=v387;
const v391=v390["ticket"];
const v392=v387;
const v393=v392["active"];
const v394=v387;
const v395=v394["processed"];
const v396=v387;
const v397=(v396["queue"]).length;
const v398=v387;
const v399=v398["next"];
const v400=v387;
const v401=v400["published_through"];
const v402=v387;
const v403=v402["dropped"];
const v404=v387;
const v405=v404["settings"];
const v406=v405["paused"];
const v407=v387;
const v408=v407["settings"];
const v409=v408["budget"];
return ({["version"]:v389,["ticket"]:v391,["active"]:v393,["processed"]:v395,["pending"]:v397,["next"]:v399,["published_through"]:v401,["dropped"]:v403,["paused"]:v406,["budget"]:v409});}
function __fn9(v410){
const v411=v410;
const v412=v411.length;
const v413=new Array(v412);
for(let v414=0;v414<v412;v414++){
const v415=v411[v414];
const v416=v415;
const v417=v415;
const v418=__bits(__float(v416) * __float(v417));
const v419=1056964608;
v413[v414]=__bits(__float(v418) + __float(v419));
}
return v413;}
function __fn10(v420){
const v421=v420;
const v422=v421["capacity"];
const v423=0;
const v424=((v422) > (v423));
let v425=v424;if(v425){
const v426=v420;
const v427=v426["capacity"];
const v428=4096;
v425=((v427) <= (v428));}
const v429=v425;
let v430=v429;if(v430){
const v431=v420;
const v432=v431["budget"];
const v433=0;
v430=((v432) > (v433));}
const v434=v430;
let v435=v434;if(v435){
const v436=v420;
const v437=v436["budget"];
const v438=1024;
v435=((v437) <= (v438));}
const v439=v435;
let v440=v439;if(v440){
const v441=v420;
const v442=v441["publish_every"];
const v443=0;
v440=((v442) > (v443));}
const v444=v440;
let v445=v444;if(v445){
const v446=v420;
const v447=v446["publish_every"];
const v448=v420;
const v449=v448["capacity"];
v445=((v447) <= (v449));}
return v445;}
function __fn11(v450,v451,v452){
const v453=v452;
const v454=__fn10(v453);
const v455=false;
let v456;if((v454===v455)){
v456=({Err:"session settings"});}else{
const v457=v450;
const v458=v450;
const v459=v451;
const v460=v452;
const v461=0;
const v462=0;
const v463=0;
const v464=false;
const v465=0;
const v466=[];
const v467=1;
const v468=0;
const v469=0;
v456=({Ok:({["serving"]:v457,["candidate"]:v458,["fallback"]:v459,["settings"]:v460,["version"]:v461,["base"]:v462,["ticket"]:v463,["active"]:v464,["processed"]:v465,["queue"]:v466,["next"]:v467,["published_through"]:v468,["dropped"]:v469})});}
return v456;}
function __fn12(v470){
const v471=v470;
const v472=v471["queue"];
const v473=v470;
const v474=v473["published_through"];
const v475=true;
let v476=({["previous"]:v474,["valid"]:v475});
for(let v477=0;v477<v472.length;v477++){
const v478=v472[v477];
const v479=v478;
const v480=v479["id"];
const v481=v476;
const v482=v481["valid"];
let v483=v482;if(v483){
const v484=v478;
const v485=v484["id"];
const v486=v476;
const v487=v486["previous"];
v483=((v485) > (v487));}
const v488=v483;
let v489=v488;if(v489){
const v490=v478;
const v491=v490["id"];
const v492=v470;
const v493=v492["next"];
v489=((v491) < (v493));}
const v494=v489;
v476=({["previous"]:v480,["valid"]:v494});
}
const v495=v476;
const v496=v470;
const v497=v496["settings"];
const v498=__fn10(v497);
let v499=v498;if(v499){
const v500=v470;
const v501=(v500["queue"]).length;
const v502=v470;
const v503=v502["settings"];
const v504=v503["capacity"];
v499=((v501) <= (v504));}
const v505=v499;
let v506=v505;if(v506){
const v507=v470;
const v508=v507["next"];
const v509=0;
v506=((v508) > (v509));}
const v510=v506;
let v511=v510;if(v511){
const v512=v470;
const v513=v512["published_through"];
const v514=v470;
const v515=v514["next"];
v511=((v513) < (v515));}
const v516=v511;
let v517=v516;if(v517){
const v518=v470;
const v519=v518["base"];
const v520=v470;
const v521=v520["version"];
v517=((v519) <= (v521));}
const v522=v517;
let v523=v522;if(v523){
const v524=v470;
const v525=v524["processed"];
const v526=v470;
const v527=(v526["queue"]).length;
v523=((v525) <= (v527));}
const v528=v523;
let v529=v528;if(v529){
const v530=v470;
const v531=v530["active"];
let v532=v531;if(!v532){
const v533=v470;
const v534=v533["processed"];
const v535=0;
v532=(v534===v535);}
v529=v532;}
const v536=v529;
let v537=v536;if(v537){
const v538=v495;
v537=v538["valid"];}
return v537;}
function __fn13(v539,v540,v541){
const v542=v539;
const v543=__fn12(v542);
const v544=false;
const v545=(v543===v544);
let v546=v545;if(!v546){
const v547=v540;
const v548=v539;
const v549=v548["next"];
v546=!(v547===v549);}
const v550=v546;
let v551=v550;if(!v551){
const v552=v539;
const v553=v552["next"];
const v554=4294967295;
v551=(v553===v554);}
let v555;if(v551){
v555=({Err:"observation sequence"});}else{
const v556=v539;
const v557=(v556["queue"]).length;
const v558=v539;
const v559=v558["settings"];
const v560=v559["capacity"];
let v561;if((v557===v560)){
const v562=v539;
const v563=v562["settings"];
const v564=v563["overflow"];
const v565="ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject";
const v566=(v564===v565);
let v567=v566;if(!v567){
const v568=v539;
const v569=v568["dropped"];
const v570=4294967295;
v567=(v569===v570);}
let v571;if(v567){
v571=({Err:"observation queue full"});}else{
const v572=v539;
const v573=v572["next"];
const v574=1;
const v575=(((v573) + (v574)) >>> 0);
const v576=v539;
const v577=v576["dropped"];
const v578=1;
const v579=(((v577) + (v578)) >>> 0);
const v580=v539;
const v581=v580["serving"];
const v582=v539;
const v583=v582["candidate"];
const v584=v539;
const v585=v584["fallback"];
const v586=v539;
const v587=v586["settings"];
const v588=v539;
const v589=v588["version"];
const v590=v539;
const v591=v590["base"];
const v592=v539;
const v593=v592["ticket"];
const v594=v539;
const v595=v594["active"];
const v596=v539;
const v597=v596["processed"];
const v598=v539;
const v599=v598["queue"];
const v600=v575;
const v601=v539;
const v602=v601["published_through"];
const v603=v579;
const v604=({["serving"]:v581,["candidate"]:v583,["fallback"]:v585,["settings"]:v587,["version"]:v589,["base"]:v591,["ticket"]:v593,["active"]:v595,["processed"]:v597,["queue"]:v599,["next"]:v600,["published_through"]:v602,["dropped"]:v603});
const v605=false;
v571=({Ok:({["session"]:v604,["accepted"]:v605})});}
v561=v571;}else{
const v606=v539;
const v607=v606["queue"];
const v608=v540;
const v609=v541;
const v610=({["id"]:v608,["observation"]:v609});
const v611=[v610];
const v612=v607.length;
const v613=v611.length;
const v614=new Array(v612+v613);
for(let v615=0;v615<v612;v615++){v614[v615]=v607[v615];}
for(let v616=0;v616<v613;v616++){v614[v612+v616]=v611[v616];}
const v617=v614;
const v618=v539;
const v619=v618["next"];
const v620=1;
const v621=(((v619) + (v620)) >>> 0);
const v622=v539;
const v623=v622["serving"];
const v624=v539;
const v625=v624["candidate"];
const v626=v539;
const v627=v626["fallback"];
const v628=v539;
const v629=v628["settings"];
const v630=v539;
const v631=v630["version"];
const v632=v539;
const v633=v632["base"];
const v634=v539;
const v635=v634["ticket"];
const v636=v539;
const v637=v636["active"];
const v638=v539;
const v639=v638["processed"];
const v640=v617;
const v641=v621;
const v642=v539;
const v643=v642["published_through"];
const v644=v539;
const v645=v644["dropped"];
const v646=({["serving"]:v623,["candidate"]:v625,["fallback"]:v627,["settings"]:v629,["version"]:v631,["base"]:v633,["ticket"]:v635,["active"]:v637,["processed"]:v639,["queue"]:v640,["next"]:v641,["published_through"]:v643,["dropped"]:v645});
const v647=true;
v561=({Ok:({["session"]:v646,["accepted"]:v647})});}
v555=v561;}
return v555;}
function __fn14(v648,v649){
const v650=v648;
const v651=__fn12(v650);
const v652=false;
const v653=(v651===v652);
let v654=v653;if(!v654){
const v655=v649;
const v656=__fn10(v655);
const v657=false;
v654=(v656===v657);}
const v658=v654;
let v659=v658;if(!v659){
const v660=v648;
const v661=(v660["queue"]).length;
const v662=v649;
const v663=v662["capacity"];
v659=((v661) > (v663));}
let v664;if(v659){
v664=({Err:"session settings"});}else{
const v665=v649;
const v666=v648;
const v667=v666["serving"];
const v668=v648;
const v669=v668["candidate"];
const v670=v648;
const v671=v670["fallback"];
const v672=v665;
const v673=v648;
const v674=v673["version"];
const v675=v648;
const v676=v675["base"];
const v677=v648;
const v678=v677["ticket"];
const v679=v648;
const v680=v679["active"];
const v681=v648;
const v682=v681["processed"];
const v683=v648;
const v684=v683["queue"];
const v685=v648;
const v686=v685["next"];
const v687=v648;
const v688=v687["published_through"];
const v689=v648;
const v690=v689["dropped"];
v664=({Ok:({["serving"]:v667,["candidate"]:v669,["fallback"]:v671,["settings"]:v672,["version"]:v674,["base"]:v676,["ticket"]:v678,["active"]:v680,["processed"]:v682,["queue"]:v684,["next"]:v686,["published_through"]:v688,["dropped"]:v690})});}
return v664;}
function __fn15(v691){
const v692=v691;
const v693=__fn12(v692);
const v694=false;
const v695=(v693===v694);
let v696=v695;if(!v696){
const v697=v691;
v696=v697["active"];}
const v698=v696;
let v699=v698;if(!v699){
const v700=v691;
const v701=v700["settings"];
v699=v701["paused"];}
const v702=v699;
let v703=v702;if(!v703){
const v704=v691;
const v705=(v704["queue"]).length;
const v706=0;
v703=(v705===v706);}
const v707=v703;
let v708=v707;if(!v708){
const v709=v691;
const v710=v709["ticket"];
const v711=4294967295;
v708=(v710===v711);}
let v712;if(v708){
v712=({Err:"session cannot begin"});}else{
const v713=v691;
const v714=v713["serving"];
const v715=v691;
const v716=v715["version"];
const v717=v691;
const v718=v717["ticket"];
const v719=1;
const v720=(((v718) + (v719)) >>> 0);
const v721=true;
const v722=0;
const v723=v691;
const v724=v723["serving"];
const v725=v714;
const v726=v691;
const v727=v726["fallback"];
const v728=v691;
const v729=v728["settings"];
const v730=v691;
const v731=v730["version"];
const v732=v716;
const v733=v720;
const v734=v721;
const v735=v722;
const v736=v691;
const v737=v736["queue"];
const v738=v691;
const v739=v738["next"];
const v740=v691;
const v741=v740["published_through"];
const v742=v691;
const v743=v742["dropped"];
v712=({Ok:({["serving"]:v724,["candidate"]:v725,["fallback"]:v727,["settings"]:v729,["version"]:v731,["base"]:v732,["ticket"]:v733,["active"]:v734,["processed"]:v735,["queue"]:v737,["next"]:v739,["published_through"]:v741,["dropped"]:v743})});}
return v712;}
function __fn16(v744){
const v745=v744;
const v746=__fn12(v745);
const v747=false;
let v748;if((v746===v747)){
v748=({Err:"session shape"});}else{
const v749=v744;
const v750=v749["serving"];
const v751=v744;
const v752=v751["version"];
const v753=false;
const v754=0;
const v755=v744;
const v756=v755["serving"];
const v757=v750;
const v758=v744;
const v759=v758["fallback"];
const v760=v744;
const v761=v760["settings"];
const v762=v744;
const v763=v762["version"];
const v764=v752;
const v765=v744;
const v766=v765["ticket"];
const v767=v753;
const v768=v754;
const v769=v744;
const v770=v769["queue"];
const v771=v744;
const v772=v771["next"];
const v773=v744;
const v774=v773["published_through"];
const v775=v744;
const v776=v775["dropped"];
v748=({Ok:({["serving"]:v756,["candidate"]:v757,["fallback"]:v759,["settings"]:v761,["version"]:v763,["base"]:v764,["ticket"]:v766,["active"]:v767,["processed"]:v768,["queue"]:v770,["next"]:v772,["published_through"]:v774,["dropped"]:v776})});}
return v748;}
function __fn17(v777,v778){
const v779=v777;
const v780=__fn12(v779);
const v781=false;
const v782=(v780===v781);
let v783=v782;if(!v783){
const v784=v777;
v783=v784["active"];}
const v785=v783;
let v786=v785;if(!v786){
const v787=v778;
const v788=v777;
const v789=v788["next"];
v786=((v787) >= (v789));}
let v790;if(v786){
v790=({Err:"session discard boundary"});}else{
const v791=v777;
const v792=v791["queue"];
const v793=v792.length;
const v794=[];
for(let v795=0;v795<v793;v795++){
const v796=v792[v795];
const v797=v796;
const v798=v797["id"];
const v799=v778;
if(((v798) > (v799))){v794.push(v796);}
}
const v800=v794;
const v801=v777;
const v802=(v801["queue"]).length;
const v803=(v800).length;
const v804=(((v802) - (v803)) >>> 0);
const v805=v804;
const v806=4294967295;
const v807=v777;
const v808=v807["dropped"];
const v809=(((v806) - (v808)) >>> 0);
let v810;if(((v805) > (v809))){
v810=({Err:"session discard limit"});}else{
const v811=v800;
const v812=v777;
const v813=v812["dropped"];
const v814=v804;
const v815=(((v813) + (v814)) >>> 0);
const v816=v777;
const v817=v816["serving"];
const v818=v777;
const v819=v818["candidate"];
const v820=v777;
const v821=v820["fallback"];
const v822=v777;
const v823=v822["settings"];
const v824=v777;
const v825=v824["version"];
const v826=v777;
const v827=v826["base"];
const v828=v777;
const v829=v828["ticket"];
const v830=v777;
const v831=v830["active"];
const v832=v777;
const v833=v832["processed"];
const v834=v811;
const v835=v777;
const v836=v835["next"];
const v837=v777;
const v838=v837["published_through"];
const v839=v815;
v810=({Ok:({["serving"]:v817,["candidate"]:v819,["fallback"]:v821,["settings"]:v823,["version"]:v825,["base"]:v827,["ticket"]:v829,["active"]:v831,["processed"]:v833,["queue"]:v834,["next"]:v836,["published_through"]:v838,["dropped"]:v839})});}
v790=v810;}
return v790;}
function __into9(v840,v841){
const v842=v840;
const v843=v842.length;
for(let v845=0;v845<v843;v845++){
const v846=v842[v845];
const v847=v846;
const v848=v846;
const v849=__bits(__float(v847) * __float(v848));
const v850=1056964608;
v841[v845]=__intoOutput9(__bits(__float(v849) + __float(v850)));
}
return v843;}
function __prepareFn2(fixed){const v880=fixed[0]&&fixed[1];let v879=false,v878;
const v891=fixed[0]&&fixed[1];let v890=false,v889;
return function(v870,v871){const v872=v870;
const v873=v872["updates"];
const v874=4294967295;
const v875=(v873===v874);
let v876;if(v875){
v876=({Err:"model update limit"});}else{
let v877;if(v880&&v879){v877=v878;}else{
const v881=v870;
const v882=v881["weight"];
const v883=v871;
const v884=v883["input"];
const v885=__bits(__float(v882) * __float(v884));
const v886=v871;
const v887=v886["target"];
v877=__bits(__float(v885) - __float(v887));if(v880){v878=v877;v879=true;}}
let v888;if(v891&&v890){v888=v889;}else{
const v892=v870;
const v893=v892["weight"];
const v894=v871;
const v895=v894["rate"];
const v896=v871;
const v897=v896["input"];
const v898=v877;
const v899=__bits(__float(v897) * __float(v898));
const v900=v877;
const v901=v871;
const v902=v901["input"];
const v903=__bits(__float(v900) * __float(v902));
const v904=__bits(__float(v899) + __float(v903));
const v905=__bits(__float(v895) * __float(v904));
const v906=__bits(__float(v893) - __float(v905));
const v907=v870;
const v908=v907["updates"];
const v909=1;
const v910=(((v908) + (v909)) >>> 0);
v888=({["weight"]:v906,["updates"]:v910});if(v891){v889=v888;v890=true;}}
const v911=v888;
const v912=__fn0(v911);
const v913=false;
const v914=(v912===v913);
let v915;if(v914){
v915=({Err:"model domain"});}else{
v915=({Ok:v888});}
v876=v915;}
return v876;};}
function __prepareFn3(fixed){const v922=fixed[0];let v921=false,v920;
const v926=fixed[1];let v925=false,v924;
const v930=fixed[2];let v929=false,v928;
const v934=fixed[0]&&fixed[1]&&fixed[2];let v933=false,v932;
return function(v916,v917,v918){let v919;if(v922&&v921){v919=v920;}else{
v919=v916;if(v922){v920=v919;v921=true;}}
let v923;if(v926&&v925){v923=v924;}else{
v923=v917;if(v926){v924=v923;v925=true;}}
let v927;if(v930&&v929){v927=v928;}else{
v927=v918;if(v930){v928=v927;v929=true;}}
let v931;if(v934&&v933){v931=v932;}else{
const v935=v919;
const v936=__fn12(v935);
const v937=false;
const v938=(v936===v937);
let v939=v938;if(!v939){
const v940=v919;
const v941=v940["active"];
const v942=false;
v939=(v941===v942);}
const v943=v939;
let v944=v943;if(!v944){
const v945=v919;
const v946=v945["settings"];
v944=v946["paused"];}
const v947=v944;
let v948=v947;if(!v948){
const v949=v923;
const v950=v919;
const v951=v950["ticket"];
v948=!(v949===v951);}
const v952=v948;
let v953=v952;if(!v953){
const v954=v919;
const v955=v954["base"];
const v956=v919;
const v957=v956["version"];
v953=!(v955===v957);}
const v958=v953;
let v959=v958;if(!v959){
const v960=v927;
const v961=0;
v959=(v960===v961);}
const v962=v959;
let v963=v962;if(!v963){
const v964=v927;
const v965=v919;
const v966=v965["settings"];
const v967=v966["budget"];
v963=((v964) > (v967));}
let v968;if(v963){
v968=({Err:"session work boundary"});}else{
const v969=v927;
const v970=v919;
const v971=(v970["queue"]).length;
const v972=v919;
const v973=v972["processed"];
const v974=(((v971) - (v973)) >>> 0);
let v975;if(((v969) < (v974))){
v975=v927;}else{
const v976=v919;
const v977=(v976["queue"]).length;
const v978=v919;
const v979=v978["processed"];
v975=(((v977) - (v979)) >>> 0);}
const v980=v975;
const v981=({Ok:v919});
const v982=v980;
let v983=v981;
for(let v984=0;v984<v982;v984++){
if(false){break;}
const v985=(v984>>>0);
const v986=v983;
let v987;if(Object.hasOwn(v986,"Ok")){
const v988=v986["Ok"];
const v989=v988;
const v990=v989;
const v991=v990["queue"];
const v992=v989;
const v993=v992["processed"];
let v994;if(v993<v991.length){v994=v991[v993];}else{
const v995=0;
const v996=v989;
const v997=v996["fallback"];
v994=({["id"]:v995,["observation"]:v997});}
const v998=v994;
const v999=v989;
const v1000=v999["candidate"];
const v1001=v998;
const v1002=v1001["observation"];
const v1003=v1000;
const v1004=v1002;
const v1005=v1003;
const v1006=v1004;
const v1007=v1005;
const v1008=v1006;
const v1009=__fn2(v1007,v1008);
const v1010=v1009;
const v1011=v1010;
let v1012;if(Object.hasOwn(v1011,"Ok")){
const v1013=v1011["Ok"];
const v1014=v1013;
const v1015=v1014;
const v1016=v1015;
const v1017=v1016;
const v1018=v1017;
const v1019=__fn0(v1018);
const v1020=v1019;
const v1021=v1020;
const v1022=false;
let v1023;if((v1021===v1022)){
v1023=({Err:"candidate domain"});}else{
const v1024=v1014;
const v1025=v989;
const v1026=v1025["processed"];
const v1027=1;
const v1028=(((v1026) + (v1027)) >>> 0);
const v1029=v989;
const v1030=v1029["serving"];
const v1031=v1024;
const v1032=v989;
const v1033=v1032["fallback"];
const v1034=v989;
const v1035=v1034["settings"];
const v1036=v989;
const v1037=v1036["version"];
const v1038=v989;
const v1039=v1038["base"];
const v1040=v989;
const v1041=v1040["ticket"];
const v1042=v989;
const v1043=v1042["active"];
const v1044=v1028;
const v1045=v989;
const v1046=v1045["queue"];
const v1047=v989;
const v1048=v1047["next"];
const v1049=v989;
const v1050=v1049["published_through"];
const v1051=v989;
const v1052=v1051["dropped"];
v1023=({Ok:({["serving"]:v1030,["candidate"]:v1031,["fallback"]:v1033,["settings"]:v1035,["version"]:v1037,["base"]:v1039,["ticket"]:v1041,["active"]:v1043,["processed"]:v1044,["queue"]:v1046,["next"]:v1048,["published_through"]:v1050,["dropped"]:v1052})});}
v1012=v1023;}else{
const v1053=v1011["Err"];
v1012=({Err:v1053});}
const v1054=v1012;
v987=v1054;}else{
const v1055=v986["Err"];
v987=({Err:v1055});}
v983=v987;}
v968=v983;}
v931=v968;if(v934){v932=v931;v933=true;}}
return v931;};}
function __prepareFn4(fixed){const v1062=fixed[0];let v1061=false,v1060;
const v1066=fixed[1];let v1065=false,v1064;
const v1070=fixed[2];let v1069=false,v1068;
const v1074=fixed[0]&&fixed[1]&&fixed[2];let v1073=false,v1072;
return function(v1056,v1057,v1058){let v1059;if(v1062&&v1061){v1059=v1060;}else{
v1059=v1056;if(v1062){v1060=v1059;v1061=true;}}
let v1063;if(v1066&&v1065){v1063=v1064;}else{
v1063=v1057;if(v1066){v1064=v1063;v1065=true;}}
let v1067;if(v1070&&v1069){v1067=v1068;}else{
v1067=v1058;if(v1070){v1068=v1067;v1069=true;}}
let v1071;if(v1074&&v1073){v1071=v1072;}else{
const v1075=v1059;
const v1076=__fn12(v1075);
const v1077=false;
const v1078=(v1076===v1077);
let v1079=v1078;if(!v1079){
const v1080=v1059;
const v1081=v1080["active"];
const v1082=false;
v1079=(v1081===v1082);}
const v1083=v1079;
let v1084=v1083;if(!v1084){
const v1085=v1059;
const v1086=v1085["settings"];
v1084=v1086["paused"];}
const v1087=v1084;
let v1088=v1087;if(!v1088){
const v1089=v1063;
const v1090=v1059;
const v1091=v1090["ticket"];
v1088=!(v1089===v1091);}
const v1092=v1088;
let v1093=v1092;if(!v1093){
const v1094=v1059;
const v1095=v1094["base"];
const v1096=v1059;
const v1097=v1096["version"];
v1093=!(v1095===v1097);}
const v1098=v1093;
let v1099=v1098;if(!v1099){
const v1100=v1059;
const v1101=v1100["version"];
const v1102=4294967295;
v1099=(v1101===v1102);}
const v1103=v1099;
let v1104=v1103;if(!v1104){
const v1105=v1059;
const v1106=v1105["processed"];
const v1107=0;
v1104=(v1106===v1107);}
const v1108=v1104;
let v1109=v1108;if(!v1109){
const v1110=v1067;
const v1111=false;
const v1112=(v1110===v1111);
let v1113=v1112;if(v1113){
const v1114=v1059;
const v1115=v1114["processed"];
const v1116=v1059;
const v1117=v1116["settings"];
const v1118=v1117["publish_every"];
v1113=((v1115) < (v1118));}
v1109=v1113;}
let v1119;if(v1109){
v1119=({Err:"session publication boundary"});}else{
const v1120=v1059;
const v1121=v1120["candidate"];
const v1122=v1121;
const v1123=v1122;
const v1124=__fn0(v1123);
const v1125=v1124;
const v1126=false;
const v1127=(v1125===v1126);
let v1128=v1127;if(!v1128){
const v1129=v1059;
const v1130=v1129["serving"];
const v1131=v1059;
const v1132=v1131["candidate"];
const v1133=v1130;
const v1134=v1132;
const v1135=v1133;
const v1136=v1134;
const v1137=__fn1(v1135,v1136);
const v1138=v1137;
const v1139=false;
v1128=(v1138===v1139);}
let v1140;if(v1128){
v1140=({Err:"candidate rejected"});}else{
const v1141=v1059;
const v1142=v1141["queue"];
const v1143=v1059;
const v1144=v1143["processed"];
const v1145=1;
const v1146=(((v1144) - (v1145)) >>> 0);
let v1147;if(v1146<v1142.length){v1147=v1142[v1146];}else{
const v1148=0;
const v1149=v1059;
const v1150=v1149["fallback"];
v1147=({["id"]:v1148,["observation"]:v1150});}
const v1151=v1147;
const v1152=v1151["id"];
const v1153=v1059;
const v1154=v1153["candidate"];
const v1155=v1059;
const v1156=v1155["version"];
const v1157=1;
const v1158=(((v1156) + (v1157)) >>> 0);
const v1159=v1059;
const v1160=v1159["version"];
const v1161=1;
const v1162=(((v1160) + (v1161)) >>> 0);
const v1163=false;
const v1164=0;
const v1165=v1059;
const v1166=v1165["queue"];
const v1167=v1166.length;
const v1168=[];
for(let v1169=0;v1169<v1167;v1169++){
const v1170=v1166[v1169];
const v1171=v1170;
const v1172=v1171["id"];
const v1173=v1152;
if(((v1172) > (v1173))){v1168.push(v1170);}
}
const v1174=v1168;
const v1175=v1152;
const v1176=v1154;
const v1177=v1059;
const v1178=v1177["candidate"];
const v1179=v1059;
const v1180=v1179["fallback"];
const v1181=v1059;
const v1182=v1181["settings"];
const v1183=v1158;
const v1184=v1162;
const v1185=v1059;
const v1186=v1185["ticket"];
const v1187=v1163;
const v1188=v1164;
const v1189=v1174;
const v1190=v1059;
const v1191=v1190["next"];
const v1192=v1175;
const v1193=v1059;
const v1194=v1193["dropped"];
v1140=({Ok:({["serving"]:v1176,["candidate"]:v1178,["fallback"]:v1180,["settings"]:v1182,["version"]:v1183,["base"]:v1184,["ticket"]:v1186,["active"]:v1187,["processed"]:v1188,["queue"]:v1189,["next"]:v1191,["published_through"]:v1192,["dropped"]:v1194})});}
v1119=v1140;}
v1071=v1119;if(v1074){v1072=v1071;v1073=true;}}
return v1071;};}
function __prepareFn5(fixed){const v1200=fixed[0];let v1199=false,v1198;
const v1204=fixed[1];let v1203=false,v1202;
const v1208=fixed[0]&&fixed[1];let v1207=false,v1206;
return function(v1195,v1196){let v1197;if(v1200&&v1199){v1197=v1198;}else{
v1197=v1195;if(v1200){v1198=v1197;v1199=true;}}
let v1201;if(v1204&&v1203){v1201=v1202;}else{
v1201=v1196;if(v1204){v1202=v1201;v1203=true;}}
let v1205;if(v1208&&v1207){v1205=v1206;}else{
const v1209=v1197;
const v1210=__fn12(v1209);
const v1211=false;
const v1212=(v1210===v1211);
let v1213=v1212;if(!v1213){
const v1214=v1197;
const v1215=v1214["version"];
const v1216=4294967295;
v1213=(v1215===v1216);}
const v1217=v1213;
let v1218=v1217;if(!v1218){
const v1219=v1201;
const v1220=v1219;
const v1221=v1220;
const v1222=__fn0(v1221);
const v1223=v1222;
const v1224=false;
v1218=(v1223===v1224);}
let v1225;if(v1218){
v1225=({Err:"serving replacement domain"});}else{
const v1226=v1201;
const v1227=v1197;
const v1228=v1227["version"];
const v1229=1;
const v1230=(((v1228) + (v1229)) >>> 0);
const v1231=v1226;
const v1232=v1197;
const v1233=v1232["candidate"];
const v1234=v1197;
const v1235=v1234["fallback"];
const v1236=v1197;
const v1237=v1236["settings"];
const v1238=v1230;
const v1239=v1197;
const v1240=v1239["base"];
const v1241=v1197;
const v1242=v1241["ticket"];
const v1243=v1197;
const v1244=v1243["active"];
const v1245=v1197;
const v1246=v1245["processed"];
const v1247=v1197;
const v1248=v1247["queue"];
const v1249=v1197;
const v1250=v1249["next"];
const v1251=v1197;
const v1252=v1251["published_through"];
const v1253=v1197;
const v1254=v1253["dropped"];
v1225=({Ok:({["serving"]:v1231,["candidate"]:v1233,["fallback"]:v1235,["settings"]:v1237,["version"]:v1238,["base"]:v1240,["ticket"]:v1242,["active"]:v1244,["processed"]:v1246,["queue"]:v1248,["next"]:v1250,["published_through"]:v1252,["dropped"]:v1254})});}
v1205=v1225;if(v1208){v1206=v1205;v1207=true;}}
return v1205;};}
function __prepareFn12(fixed){const v1367=fixed[0];let v1366=false,v1365;
return function(v1363){let v1364;if(v1367&&v1366){v1364=v1365;}else{
const v1368=v1363;
const v1369=v1368["queue"];
const v1370=v1363;
const v1371=v1370["published_through"];
const v1372=true;
let v1373=({["previous"]:v1371,["valid"]:v1372});
for(let v1374=0;v1374<v1369.length;v1374++){
const v1375=v1369[v1374];
const v1376=v1375;
const v1377=v1376["id"];
const v1378=v1373;
const v1379=v1378["valid"];
let v1380=v1379;if(v1380){
const v1381=v1375;
const v1382=v1381["id"];
const v1383=v1373;
const v1384=v1383["previous"];
v1380=((v1382) > (v1384));}
const v1385=v1380;
let v1386=v1385;if(v1386){
const v1387=v1375;
const v1388=v1387["id"];
const v1389=v1363;
const v1390=v1389["next"];
v1386=((v1388) < (v1390));}
const v1391=v1386;
v1373=({["previous"]:v1377,["valid"]:v1391});
}
v1364=v1373;if(v1367){v1365=v1364;v1366=true;}}
const v1392=v1363;
const v1393=v1392["settings"];
const v1394=__fn10(v1393);
let v1395=v1394;if(v1395){
const v1396=v1363;
const v1397=(v1396["queue"]).length;
const v1398=v1363;
const v1399=v1398["settings"];
const v1400=v1399["capacity"];
v1395=((v1397) <= (v1400));}
const v1401=v1395;
let v1402=v1401;if(v1402){
const v1403=v1363;
const v1404=v1403["next"];
const v1405=0;
v1402=((v1404) > (v1405));}
const v1406=v1402;
let v1407=v1406;if(v1407){
const v1408=v1363;
const v1409=v1408["published_through"];
const v1410=v1363;
const v1411=v1410["next"];
v1407=((v1409) < (v1411));}
const v1412=v1407;
let v1413=v1412;if(v1413){
const v1414=v1363;
const v1415=v1414["base"];
const v1416=v1363;
const v1417=v1416["version"];
v1413=((v1415) <= (v1417));}
const v1418=v1413;
let v1419=v1418;if(v1419){
const v1420=v1363;
const v1421=v1420["processed"];
const v1422=v1363;
const v1423=(v1422["queue"]).length;
v1419=((v1421) <= (v1423));}
const v1424=v1419;
let v1425=v1424;if(v1425){
const v1426=v1363;
const v1427=v1426["active"];
let v1428=v1427;if(!v1428){
const v1429=v1363;
const v1430=v1429["processed"];
const v1431=0;
v1428=(v1430===v1431);}
v1425=v1428;}
const v1432=v1425;
let v1433=v1432;if(v1433){
const v1434=v1364;
v1433=v1434["valid"];}
return v1433;};}
function __prepareFn17(fixed){const v1697=fixed[0]&&fixed[1];let v1696=false,v1695;
const v1710=fixed[0]&&fixed[1];let v1709=false,v1708;
return function(v1679,v1680){const v1681=v1679;
const v1682=__fn12(v1681);
const v1683=false;
const v1684=(v1682===v1683);
let v1685=v1684;if(!v1685){
const v1686=v1679;
v1685=v1686["active"];}
const v1687=v1685;
let v1688=v1687;if(!v1688){
const v1689=v1680;
const v1690=v1679;
const v1691=v1690["next"];
v1688=((v1689) >= (v1691));}
const v1692=v1688;
let v1693;if(v1692){
v1693=({Err:"session discard boundary"});}else{
let v1694;if(v1697&&v1696){v1694=v1695;}else{
const v1698=v1679;
const v1699=v1698["queue"];
const v1700=v1699.length;
const v1701=[];
for(let v1702=0;v1702<v1700;v1702++){
const v1703=v1699[v1702];
const v1704=v1703;
const v1705=v1704["id"];
const v1706=v1680;
if(((v1705) > (v1706))){v1701.push(v1703);}
}
v1694=v1701;if(v1697){v1695=v1694;v1696=true;}}
let v1707;if(v1710&&v1709){v1707=v1708;}else{
const v1711=v1679;
const v1712=(v1711["queue"]).length;
const v1713=(v1694).length;
v1707=(((v1712) - (v1713)) >>> 0);if(v1710){v1708=v1707;v1709=true;}}
const v1714=v1707;
const v1715=4294967295;
const v1716=v1679;
const v1717=v1716["dropped"];
const v1718=(((v1715) - (v1717)) >>> 0);
const v1719=((v1714) > (v1718));
let v1720;if(v1719){
v1720=({Err:"session discard limit"});}else{
const v1721=v1694;
const v1722=v1679;
const v1723=v1722["dropped"];
const v1724=v1707;
const v1725=(((v1723) + (v1724)) >>> 0);
const v1726=v1679;
const v1727=v1726["serving"];
const v1728=v1679;
const v1729=v1728["candidate"];
const v1730=v1679;
const v1731=v1730["fallback"];
const v1732=v1679;
const v1733=v1732["settings"];
const v1734=v1679;
const v1735=v1734["version"];
const v1736=v1679;
const v1737=v1736["base"];
const v1738=v1679;
const v1739=v1738["ticket"];
const v1740=v1679;
const v1741=v1740["active"];
const v1742=v1679;
const v1743=v1742["processed"];
const v1744=v1721;
const v1745=v1679;
const v1746=v1745["next"];
const v1747=v1679;
const v1748=v1747["published_through"];
const v1749=v1725;
v1720=({Ok:({["serving"]:v1727,["candidate"]:v1729,["fallback"]:v1731,["settings"]:v1733,["version"]:v1735,["base"]:v1737,["ticket"]:v1739,["active"]:v1741,["processed"]:v1743,["queue"]:v1744,["next"]:v1746,["published_through"]:v1748,["dropped"]:v1749})});}
v1693=v1720;}
return v1693;};}
const __preparedFactories=new Map([[2,__prepareFn2],[3,__prepareFn3],[4,__prepareFn4],[5,__prepareFn5],[12,__prepareFn12],[17,__prepareFn17]]);
const __namedTypes={"Controls":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"drop_newest","type":{"kind":"bool"}}],"kind":"record","name":"Controls"},"Model":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},"Observation":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"},"Status":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"},"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4":{"fields":[{"name":"session","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"accepted","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"},"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"},"ink_mdd4638c4f8839ae603b791d0ea308ae6ddb0ee92b25ca4027ac4ad387dfd6f79":{"fields":[{"name":"previous","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_mdd4638c4f8839ae603b791d0ea308ae6ddb0ee92b25ca4027ac4ad387dfd6f79"}};
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
function __action0(ctx,rt,s0){__tick(ctx);try{__tick(ctx);const s1=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);return ({Ok:__bits(__float(((s1)["serving"])["weight"]) * __float(s0))});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action1(ctx,rt){__tick(ctx);try{__tick(ctx);const s2=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);return ({Ok:__fn8(s2)});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action2(ctx,rt){__tick(ctx);try{__tick(ctx);const s3=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);return ({Ok:[(s3)["serving"],(s3)["candidate"]]});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action3(ctx,rt,s4,s5){__tick(ctx);try{__tick(ctx);if(((s6)=>(((s7)=>Object.hasOwn(s7,"Some")?((s8)=>(((((((((Number.isFinite(__float((s5)["input"]))) && (Number.isFinite(__float((s5)["target"]))))) && (Number.isFinite(__float((s5)["rate"]))))) && ((__float((s5)["rate"]) > __float(0))))) && ((__float((s5)["rate"]) <= __float(1048576000))))))(s7["Some"]):((s9)=>(((((((((Number.isFinite(__float((s5)["input"]))) && (Number.isFinite(__float((s5)["target"]))))) && (Number.isFinite(__float((s5)["rate"]))))) && ((__float((s5)["rate"]) > __float(0))))) && ((__float((s5)["rate"]) <= __float(1048576000))))))(null))(s6)))(({Some:null}))){__tick(ctx);const s10=__try(__fn13(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),s4,s5));__tick(ctx);__tablePut(rt,0,0,({Ok:(s10)["session"]}),0);__tick(ctx);return ({Ok:(s10)["accepted"]});}else{__tick(ctx);return ({Err:((s11)=>(((s12)=>Object.hasOwn(s12,"Some")?((s13)=>("observation domain"))(s12["Some"]):((s14)=>("observation domain"))(null))(s11)))(({Some:null}))});}}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action4(ctx,rt,s15){__tick(ctx);try{__tick(ctx);__tablePut(rt,0,0,({Ok:__try(__fn14(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),({["capacity"]:(s15)["capacity"],["budget"]:(s15)["budget"],["publish_every"]:(s15)["publish_every"],["paused"]:(s15)["paused"],["overflow"]:((s15)["drop_newest"]?"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject")})))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action5(ctx,rt){__tick(ctx);try{__tick(ctx);const s16=__try(__fn15(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))))));__tick(ctx);__tablePut(rt,0,0,({Ok:s16}),0);__tick(ctx);return ({Ok:__fn8(s16)});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action6(ctx,rt,s17,s18){__tick(ctx);try{__tick(ctx);const s19=__try(__fn3(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),s17,s18));__tick(ctx);__tablePut(rt,0,0,({Ok:s19}),0);__tick(ctx);return ({Ok:__fn8(s19)});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action7(ctx,rt,s20,s21){__tick(ctx);try{__tick(ctx);const s22=__try(__fn4(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),s20,s21));__tick(ctx);__tablePut(rt,0,0,({Ok:s22}),0);__tick(ctx);const s23=__fn8(s22);__tick(ctx);__emit(rt,"published",s23);__tick(ctx);return ({Ok:s23});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action8(ctx,rt){__tick(ctx);try{__tick(ctx);__tablePut(rt,0,0,({Ok:__try(__fn16(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))))))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action9(ctx,rt,s24){__tick(ctx);try{__tick(ctx);__tablePut(rt,0,0,({Ok:__try(__fn17(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),s24))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action10(ctx,rt,s25){__tick(ctx);try{__tick(ctx);__tablePut(rt,0,0,({Ok:__try(__fn5(__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"}))))),s25))}),0);__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action11(ctx,rt){__tick(ctx);try{__tick(ctx);const s26=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);if(((((s26)["settings"])["paused"]) || (((__fn7(s26)===0))))){__tick(ctx);return ({Ok:__fn8(s26)});}else{}__tick(ctx);if((((s26)["active"]===false))){__tick(ctx);const s27=__try(__nested(__action5(ctx,rt),true));}else{}__tick(ctx);const s28=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);const s29=__try(__nested(__action6(ctx,rt,(s28)["ticket"],((s28)["settings"])["budget"]),true));__tick(ctx);const s30=__try(__fn6(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11(({["weight"]:0,["updates"]:0}),({["input"]:0,["target"]:0,["rate"]:1036831949}),({["capacity"]:4,["budget"]:2,["publish_every"]:2,["paused"]:false,["overflow"]:"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject"})))));__tick(ctx);if((((((s30)["processed"]) >= (((s30)["settings"])["publish_every"]))) || ((((s30)["processed"]===__fn7(s30)))))){__tick(ctx);return __nested(__action7(ctx,rt,(s30)["ticket"],true),true);}else{}__tick(ctx);return ({Ok:s29});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action12(ctx,rt){__tick(ctx);try{__tick(ctx);const s31=__try(__nested(__action11(ctx,rt),true));__tick(ctx);return ({Err:"cancel entire turn"});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __stateCommitRoot0(rt,key,prior,next,slot){__storeDirect(rt,0,key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[0]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}
const __stateDirectReadFactories=[null,null,null,null,null,null,null,null,null,null,null,null,null];
function __stateValueEqual11(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!(__stateValueEqual2(a[i],b[i])))return false;return true;}
function __stateValueEqual5(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!(__stateValueEqual6(a[i],b[i])))return false;return true;}
function __stateValueEqual2(a,b){if(a===b)return true;return (a["weight"]===b["weight"])&&(a["updates"]===b["updates"]);}
function __stateValueEqual3(a,b){if(a===b)return true;return (a["input"]===b["input"])&&(a["target"]===b["target"])&&(a["rate"]===b["rate"]);}
function __stateValueEqual9(a,b){if(a===b)return true;return (a["version"]===b["version"])&&(a["ticket"]===b["ticket"])&&(a["active"]===b["active"])&&(a["processed"]===b["processed"])&&(a["pending"]===b["pending"])&&(a["next"]===b["next"])&&(a["published_through"]===b["published_through"])&&(a["dropped"]===b["dropped"])&&(a["paused"]===b["paused"])&&(a["budget"]===b["budget"]);}
function __stateValueEqual6(a,b){if(a===b)return true;return (a["id"]===b["id"])&&__stateValueEqual3(a["observation"],b["observation"]);}
function __stateValueEqual1(a,b){if(a===b)return true;return __stateValueEqual2(a["serving"],b["serving"])&&__stateValueEqual2(a["candidate"],b["candidate"])&&__stateValueEqual3(a["fallback"],b["fallback"])&&__stateValueEqual4(a["settings"],b["settings"])&&(a["version"]===b["version"])&&(a["base"]===b["base"])&&(a["ticket"]===b["ticket"])&&(a["active"]===b["active"])&&(a["processed"]===b["processed"])&&__stateValueEqual5(a["queue"],b["queue"])&&(a["next"]===b["next"])&&(a["published_through"]===b["published_through"])&&(a["dropped"]===b["dropped"]);}
function __stateValueEqual4(a,b){if(a===b)return true;return (a["capacity"]===b["capacity"])&&(a["budget"]===b["budget"])&&(a["publish_every"]===b["publish_every"])&&(a["paused"]===b["paused"])&&(a["overflow"]===b["overflow"]);}
function __stateValueEqual12(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual7(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual13(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual10(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual11(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual8(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual9(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual0(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual1(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __ownedInput3(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"capacity")||!Object.hasOwn(value,"budget")||!Object.hasOwn(value,"publish_every")||!Object.hasOwn(value,"paused")||!Object.hasOwn(value,"drop_newest"))throw Error('invalid record');let field0=value["capacity"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='number'||!Number.isInteger(field0)||field0<0||field0>4294967295)throw Error('invalid u32');if(field0===0)field0=0;let field1=value["budget"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='number'||!Number.isInteger(field1)||field1<0||field1>4294967295)throw Error('invalid u32');if(field1===0)field1=0;let field2=value["publish_every"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field2!=='number'||!Number.isInteger(field2)||field2<0||field2>4294967295)throw Error('invalid u32');if(field2===0)field2=0;let field3=value["paused"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field3!=='boolean')throw Error('invalid Bool');let field4=value["drop_newest"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field4!=='boolean')throw Error('invalid Bool');return {["capacity"]:field0,["budget"]:field1,["publish_every"]:field2,["paused"]:field3,["drop_newest"]:field4};}
function __ownedInput2(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"input")||!Object.hasOwn(value,"target")||!Object.hasOwn(value,"rate"))throw Error('invalid record');const field0=__ownedInput0(value["input"],budget,depth+1);const field1=__ownedInput0(value["target"],budget,depth+1);const field2=__ownedInput0(value["rate"],budget,depth+1);return {["input"]:field0,["target"]:field1,["rate"]:field2};}
function __ownedInput5(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"weight")||!Object.hasOwn(value,"updates"))throw Error('invalid record');const field0=__ownedInput0(value["weight"],budget,depth+1);let field1=value["updates"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='number'||!Number.isInteger(field1)||field1<0||field1>4294967295)throw Error('invalid u32');if(field1===0)field1=0;return {["weight"]:field0,["updates"]:field1};}
function __ownedInput4(value,budget={cells:1000000},depth=0){let scalar=value;if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='boolean')throw Error('invalid Bool');return scalar;}
const __ownedType0={"kind":"f32"};
function __ownedInput0(value,budget={cells:1000000},depth=0){return __stateInput(value,__ownedType0,budget,depth);}
function __ownedInput1(value,budget={cells:1000000},depth=0){let scalar=value;if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='number'||!Number.isInteger(scalar)||scalar<0||scalar>4294967295)throw Error('invalid u32');if(scalar===0)scalar=0;return scalar;}
const __stateQueryEquals=[(a,b)=>__stateValueEqual7(a,b),(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual10(a,b),(a,b)=>__stateValueEqual12(a,b),(a,b)=>__stateValueEqual13(a,b),(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual13(a,b),(a,b)=>__stateValueEqual13(a,b),(a,b)=>__stateValueEqual13(a,b),(a,b)=>__stateValueEqual8(a,b),(a,b)=>__stateValueEqual13(a,b)];
const __stateRootEquals=[(a,b)=>__stateValueEqual0(a,b)];
const __stateBoundFactories=[(run,a,inputs,output,only)=>(p0)=>run(a,[inputs[0](p0)],null,output,only,true),(run,a,inputs,output,only)=>()=>run(a,[],null,output,only,true),(run,a,inputs,output,only)=>()=>run(a,[],null,output,only,true),(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1)=>run(a,[inputs[0](p0),inputs[1](p1)],null,output,only,true):(p0,p1)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);begin(a);try{return complete(a,__action3(rt.ctx,rt,b0,b1),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0)=>run(a,[inputs[0](p0)],null,output,only,true):(p0)=>{const b0=inputs[0](p0);begin(a);try{return complete(a,__action4(rt.ctx,rt,b0),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action5(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1)=>run(a,[inputs[0](p0),inputs[1](p1)],null,output,only,true):(p0,p1)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);begin(a);try{return complete(a,__action6(rt.ctx,rt,b0,b1),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1)=>run(a,[inputs[0](p0),inputs[1](p1)],null,output,only,true):(p0,p1)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);begin(a);try{return complete(a,__action7(rt.ctx,rt,b0,b1),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action8(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0)=>run(a,[inputs[0](p0)],null,output,only,true):(p0)=>{const b0=inputs[0](p0);begin(a);try{return complete(a,__action9(rt.ctx,rt,b0),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0)=>run(a,[inputs[0](p0)],null,output,only,true):(p0)=>{const b0=inputs[0](p0);begin(a);try{return complete(a,__action10(rt.ctx,rt,b0),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action11(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?()=>run(a,[],null,output,only,true):()=>{begin(a);try{return complete(a,__action12(rt.ctx,rt),output,only);}catch(e){return abort(e);}finally{end();}}];const __statePreflightFactories=[null,null,null,null,null,null,null,null,null,null,null,null,null];
const __stateMetadata={"actions":[{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"predict","params":[{"name":"input","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"status","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"models","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},"kind":"list"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":3,"name":"enqueue","params":[{"name":"id","type":{"kind":"u32"}},{"name":"o","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"bool"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":4,"name":"configure","params":[{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"drop_newest","type":{"kind":"bool"}}],"kind":"record","name":"Controls"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":5,"name":"begin","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":6,"name":"work","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"steps","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":7,"name":"publish","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"flush","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":8,"name":"cancel","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":9,"name":"discard","params":[{"name":"through","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":10,"name":"replace","params":[{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":11,"name":"pump","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":false},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":12,"name":"abort_turn","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":false}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"published","snapshotType":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record"},"type":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Training","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record"}}],"kind":"record"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}],"snapshot":{"program":[16,52,62,14,206,216,72,106,146,201,98,15,144,149,71,83,66,225,7,209,246,31,184,255,155,114,243,219,82,91,227,255],"schema":[179,188,178,101,234,43,122,49,106,219,52,132,13,234,25,89,68,126,199,178,111,246,27,56,1,169,4,173,187,203,197,95]},"snapshotRows":false};const __actions=[__action0,__action1,__action2,__action3,__action4,__action5,__action6,__action7,__action8,__action9,__action10,__action11,__action12];const __stateInputCaptures=[[__ownedInput0],[],[],[__ownedInput1,__ownedInput2],[__ownedInput3],[],[__ownedInput1,__ownedInput1],[__ownedInput1,__ownedInput4],[],[__ownedInput1],[__ownedInput5],[],[]];
export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"b14ab2734eeea43bc92356662a22de4096d509853b6b99bf98a7db9a5821a40b","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"valid","parallel":false,"params":[{"name":"m","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":1,"internal":false,"name":"accept","parallel":false,"params":[{"name":"old","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"next","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":2,"internal":false,"name":"update","parallel":false,"params":[{"name":"m","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"o","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}},{"destination":null,"index":3,"internal":false,"name":"advanced","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"steps","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":4,"internal":false,"name":"promoted","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"flush","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":5,"internal":false,"name":"replaced","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":6,"internal":false,"name":"readable","parallel":false,"params":[{"name":"value","type":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":7,"internal":false,"name":"pending","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":8,"internal":false,"name":"status_of","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"precondition":null,"result":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":9,"internal":false,"name":"batch","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":10,"internal":false,"name":"ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":11,"internal":false,"name":"__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02","parallel":false,"params":[{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":12,"internal":false,"name":"__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":13,"internal":false,"name":"__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"session","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"accepted","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"}}},{"destination":null,"index":14,"internal":false,"name":"__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":15,"internal":false,"name":"__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":16,"internal":false,"name":"__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},{"destination":null,"index":17,"internal":false,"name":"__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071","parallel":false,"params":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"through","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}],"named_types":{"Controls":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"drop_newest","type":{"kind":"bool"}}],"kind":"record","name":"Controls"},"Model":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},"Observation":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"},"Status":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"},"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4":{"fields":[{"name":"session","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"accepted","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"},"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"},"ink_mdd4638c4f8839ae603b791d0ea308ae6ddb0ee92b25ca4027ac4ad387dfd6f79":{"fields":[{"name":"previous","type":{"kind":"u32"}},{"name":"valid","type":{"kind":"bool"}}],"kind":"record","name":"ink_mdd4638c4f8839ae603b791d0ea308ae6ddb0ee92b25ca4027ac4ad387dfd6f79"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"factory":false,"function":"valid","reason":"no reusable lexical bindings"},{"factory":false,"function":"accept","reason":"no reusable lexical bindings"},{"factory":true,"function":"update","retained_bindings":2},{"factory":true,"function":"advanced","retained_bindings":4},{"factory":true,"function":"promoted","retained_bindings":4},{"factory":true,"function":"replaced","retained_bindings":3},{"factory":false,"function":"readable","reason":"no reusable lexical bindings"},{"factory":false,"function":"pending","reason":"no reusable lexical bindings"},{"factory":false,"function":"status_of","reason":"no reusable lexical bindings"},{"factory":false,"function":"batch","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a","reason":"no reusable lexical bindings"},{"factory":false,"function":"__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02","reason":"no reusable lexical bindings"},{"factory":true,"function":"__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7","retained_bindings":1},{"factory":false,"function":"__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb","reason":"no reusable lexical bindings"},{"factory":false,"function":"__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0","reason":"no reusable lexical bindings"},{"factory":false,"function":"__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604","reason":"no reusable lexical bindings"},{"factory":false,"function":"__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38","reason":"no reusable lexical bindings"},{"factory":true,"function":"__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071","retained_bindings":2}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":{"actions":[{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"predict","params":[{"name":"input","type":{"kind":"f32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"status","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"models","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},"kind":"list"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":3,"name":"enqueue","params":[{"name":"id","type":{"kind":"u32"}},{"name":"o","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"bool"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":4,"name":"configure","params":[{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"drop_newest","type":{"kind":"bool"}}],"kind":"record","name":"Controls"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":5,"name":"begin","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":6,"name":"work","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"steps","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":7,"name":"publish","params":[{"name":"ticket","type":{"kind":"u32"}},{"name":"flush","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":8,"name":"cancel","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":9,"name":"discard","params":[{"name":"through","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":10,"name":"replace","params":[{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":11,"name":"pump","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},"roots":[0],"singleCell":false},{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":12,"name":"abort_turn","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":false}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"published","snapshotType":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record"},"type":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Training","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record"}}],"kind":"record"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}],"snapshot":{"program":[16,52,62,14,206,216,72,106,146,201,98,15,144,149,71,83,66,225,7,209,246,31,184,255,155,114,243,219,82,91,227,255],"schema":[179,188,178,101,234,43,122,49,106,219,52,132,13,234,25,89,68,126,199,178,111,246,27,56,1,169,4,173,187,203,197,95]},"snapshotRows":false},"wire":{"format":"ink-value-wire-v1","functions":{"__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb":{"arguments":{"format":"ink-value-wire-v1","identity":"de32feb458c5dbd57380beccf73a8ea8c9b10021c91b37eac1648091c761b760","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"aaa22a215061069438636d9738f0d5633374fa81e0cdd3a087028f013dca71f5","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"session","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"accepted","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"}}}},"__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38":{"arguments":{"format":"ink-value-wire-v1","identity":"8c480b685607ebff7366379dc52ccec7e4dfb17e19cd559b1db1d2e7a4268e66","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7":{"arguments":{"format":"ink-value-wire-v1","identity":"8c480b685607ebff7366379dc52ccec7e4dfb17e19cd559b1db1d2e7a4268e66","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604":{"arguments":{"format":"ink-value-wire-v1","identity":"8c480b685607ebff7366379dc52ccec7e4dfb17e19cd559b1db1d2e7a4268e66","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071":{"arguments":{"format":"ink-value-wire-v1","identity":"a5876aa3223d10fa1893926e25a7d5fcbb269d6a4a482b637ba4108722c6b2c8","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"through","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02":{"arguments":{"format":"ink-value-wire-v1","identity":"18766bd2cf0c4f40911609bf34e94c38e62349d09d30cf1f5162e0056c570643","named":{},"root":{"fields":[{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0":{"arguments":{"format":"ink-value-wire-v1","identity":"dcf6f03693204a18c84c48b93e910dbf23e4db16d5c4c3dd218c49b96f1f699d","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"accept":{"arguments":{"format":"ink-value-wire-v1","identity":"a4069abad41ad4c7186e935bfffd7134bfda1395ff5b55447a83a98bb16d9158","named":{},"root":{"fields":[{"name":"old","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"next","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"advanced":{"arguments":{"format":"ink-value-wire-v1","identity":"72ea2674b1aba0b56ff32ff9a496ceb017374f6007fa5cdd4658bfee49bef169","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"steps","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"batch":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a":{"arguments":{"format":"ink-value-wire-v1","identity":"af733247998356ef7e3da36af351ccc49613b03eead4801bb8380c00ed5e5046","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"pending":{"arguments":{"format":"ink-value-wire-v1","identity":"8c480b685607ebff7366379dc52ccec7e4dfb17e19cd559b1db1d2e7a4268e66","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"promoted":{"arguments":{"format":"ink-value-wire-v1","identity":"d6f7b78a813e66a165fca730f0a4a15d22a014cf65a642cc79ebeec65f79ac71","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"flush","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"readable":{"arguments":{"format":"ink-value-wire-v1","identity":"cac778441f1332d1fef5ba4b14cb260a69d811aaa21de2744ef16183af8370c5","named":{},"root":{"fields":[{"name":"value","type":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"replaced":{"arguments":{"format":"ink-value-wire-v1","identity":"378a18c2caddca337247a18f60a843e8193e2e3499d7a59c8791b7103fcb0696","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"model","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}}},"status_of":{"arguments":{"format":"ink-value-wire-v1","identity":"8c480b685607ebff7366379dc52ccec7e4dfb17e19cd559b1db1d2e7a4268e66","named":{},"root":{"fields":[{"name":"s","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"16f4515304f4fc1d3fbb065b6576fd175706564b8a3985019254be9f253c0b7d","named":{},"root":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}}},"update":{"arguments":{"format":"ink-value-wire-v1","identity":"a7a8a5d387a71cd857389acf6245c2083881c25bc9402d54d55a0172da2b9718","named":{},"root":{"fields":[{"name":"m","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"o","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"3b0b8667004a80b8cd2c9ce908c048f7fcabcb6b09034c1b6cb368ea8329819a","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}}},"valid":{"arguments":{"format":"ink-value-wire-v1","identity":"6548afad25668c6fc4c1b041a6799c644d2cb5eb2b5bc459d18086769190e282","named":{},"root":{"fields":[{"name":"m","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[false],"types":[{"fields":[{"name":"weight","type":{"kind":"f32"}}],"kind":"record","name":"Model"}]},{"capture":[false,false],"types":[{"fields":[{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},{"fields":[{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}]},{"capture":[false,false],"types":[{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"kind":"u32"},{"kind":"bool"}]},{"capture":[false,true],"types":[{"fields":[{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}]},{"capture":[true],"types":[{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}]},{"capture":[false],"types":[{"fields":[{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}]},{"capture":[false],"types":[{"fields":[{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"},{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"},{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}]},{"capture":[false],"types":[{"fields":[{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"kind":"u32"},{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}]},{"capture":[false,true],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}]},{"capture":[false],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}]},{"capture":[false],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}]},{"capture":[false,true],"types":[{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"},{"kind":"u32"}]}];

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
function __ownedValue11(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue12(value[i],budget,depth+1);return out;}
function __ownedValue14(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue3(value[i],budget,depth+1);return out;}
function __ownedValue6(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue7(value.Ok,budget,depth+1)}:{Err:__ownedValue5(value.Err,budget,depth+1)};}
function __ownedValue15(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue16(value.Ok,budget,depth+1)}:{Err:__ownedValue5(value.Err,budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue2(value.Ok,budget,depth+1)}:{Err:__ownedValue5(value.Err,budget,depth+1)};}
function __ownedValue9(value,budget,depth){budget.enter(depth,4);return {["capacity"]:__ownedValue4(value["capacity"],budget,depth+1),["budget"]:__ownedValue4(value["budget"],budget,depth+1),["publish_every"]:__ownedValue4(value["publish_every"],budget,depth+1),["paused"]:__ownedValue0(value["paused"],budget,depth+1),["overflow"]:__ownedValue10(value["overflow"],budget,depth+1)};}
function __ownedValue12(value,budget,depth){budget.enter(depth,4);return {["id"]:__ownedValue4(value["id"],budget,depth+1),["observation"]:__ownedValue8(value["observation"],budget,depth+1)};}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);return {["input"]:__ownedValue3(value["input"],budget,depth+1),["target"]:__ownedValue3(value["target"],budget,depth+1),["rate"]:__ownedValue3(value["rate"],budget,depth+1)};}
function __ownedValue7(value,budget,depth){budget.enter(depth,4);return {["serving"]:__ownedValue2(value["serving"],budget,depth+1),["candidate"]:__ownedValue2(value["candidate"],budget,depth+1),["fallback"]:__ownedValue8(value["fallback"],budget,depth+1),["settings"]:__ownedValue9(value["settings"],budget,depth+1),["version"]:__ownedValue4(value["version"],budget,depth+1),["base"]:__ownedValue4(value["base"],budget,depth+1),["ticket"]:__ownedValue4(value["ticket"],budget,depth+1),["active"]:__ownedValue0(value["active"],budget,depth+1),["processed"]:__ownedValue4(value["processed"],budget,depth+1),["queue"]:__ownedValue11(value["queue"],budget,depth+1),["next"]:__ownedValue4(value["next"],budget,depth+1),["published_through"]:__ownedValue4(value["published_through"],budget,depth+1),["dropped"]:__ownedValue4(value["dropped"],budget,depth+1)};}
function __ownedValue16(value,budget,depth){budget.enter(depth,4);return {["session"]:__ownedValue7(value["session"],budget,depth+1),["accepted"]:__ownedValue0(value["accepted"],budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,4);return {["version"]:__ownedValue4(value["version"],budget,depth+1),["ticket"]:__ownedValue4(value["ticket"],budget,depth+1),["active"]:__ownedValue0(value["active"],budget,depth+1),["processed"]:__ownedValue4(value["processed"],budget,depth+1),["pending"]:__ownedValue4(value["pending"],budget,depth+1),["next"]:__ownedValue4(value["next"],budget,depth+1),["published_through"]:__ownedValue4(value["published_through"],budget,depth+1),["dropped"]:__ownedValue4(value["dropped"],budget,depth+1),["paused"]:__ownedValue0(value["paused"],budget,depth+1),["budget"]:__ownedValue4(value["budget"],budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["weight"]:__ownedValue3(value["weight"],budget,depth+1),["updates"]:__ownedValue4(value["updates"],budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue10(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __ownedValue5(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue4(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["valid",__ownedValue0],["accept",__ownedValue0],["update",__ownedValue1],["advanced",__ownedValue6],["promoted",__ownedValue6],["replaced",__ownedValue6],["readable",__ownedValue6],["pending",__ownedValue4],["status_of",__ownedValue13],["batch",__ownedValue14],["ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a",__ownedValue0],["__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02",__ownedValue6],["__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7",__ownedValue0],["__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb",__ownedValue15],["__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0",__ownedValue6],["__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604",__ownedValue6],["__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38",__ownedValue6],["__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071",__ownedValue6]]));
function __wireValue9(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue10(reader);reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue3(reader);reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue13(reader)}:{Ok:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue13(reader)}:{Ok:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue13(reader)}:{Ok:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value={["capacity"]:__wireValue4(reader),["budget"]:__wireValue4(reader),["publish_every"]:__wireValue4(reader),["paused"]:__wireValue7(reader),["overflow"]:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value={["id"]:__wireValue4(reader),["observation"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["input"]:__wireValue3(reader),["target"]:__wireValue3(reader),["rate"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["m"]:__wireValue2(reader),["o"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value={["m"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value={["model"]:__wireValue2(reader),["fallback"]:__wireValue5(reader),["settings"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["old"]:__wireValue2(reader),["next"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["s"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["id"]:__wireValue4(reader),["observation"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["model"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["settings"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["through"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["ticket"]:__wireValue4(reader),["flush"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader),["ticket"]:__wireValue4(reader),["steps"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value={["s"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["serving"]:__wireValue2(reader),["candidate"]:__wireValue2(reader),["fallback"]:__wireValue5(reader),["settings"]:__wireValue6(reader),["version"]:__wireValue4(reader),["base"]:__wireValue4(reader),["ticket"]:__wireValue4(reader),["active"]:__wireValue7(reader),["processed"]:__wireValue4(reader),["queue"]:__wireValue9(reader),["next"]:__wireValue4(reader),["published_through"]:__wireValue4(reader),["dropped"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value={["session"]:__wireValue1(reader),["accepted"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value={["value"]:__wireValue15(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value={["version"]:__wireValue4(reader),["ticket"]:__wireValue4(reader),["active"]:__wireValue7(reader),["processed"]:__wireValue4(reader),["pending"]:__wireValue4(reader),["next"]:__wireValue4(reader),["published_through"]:__wireValue4(reader),["dropped"]:__wireValue4(reader),["paused"]:__wireValue7(reader),["budget"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value={["weight"]:__wireValue3(reader),["updates"]:__wireValue4(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={["xs"]:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __wireValue8Variants=Object.freeze(["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]);
function __wireValue8(reader){const end=reader.frame();const value=reader.text(end,"enum",__wireValue8Variants);reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb",[__wireValue0,__wireValue11]],["__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38",[__wireValue14,__wireValue15]],["__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7",[__wireValue14,__wireValue7]],["__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604",[__wireValue14,__wireValue15]],["__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071",[__wireValue16,__wireValue15]],["__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02",[__wireValue17,__wireValue15]],["__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0",[__wireValue18,__wireValue15]],["accept",[__wireValue19,__wireValue7]],["advanced",[__wireValue20,__wireValue15]],["batch",[__wireValue21,__wireValue22]],["ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a",[__wireValue23,__wireValue7]],["pending",[__wireValue14,__wireValue4]],["promoted",[__wireValue24,__wireValue15]],["readable",[__wireValue25,__wireValue15]],["replaced",[__wireValue26,__wireValue15]],["status_of",[__wireValue14,__wireValue27]],["update",[__wireValue28,__wireValue29]],["valid",[__wireValue30,__wireValue7]]]));

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
function __privateCapture10(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture11(value[i],budget,depth+1);return out;}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture1(value[i],budget,depth+1);return out;}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture7(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture16(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture0(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture6(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==5){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"capacity")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"budget")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"publish_every")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"paused")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"overflow")){throw Error('invalid value for wire schema');}return {["capacity"]:__privateCapture2(value["capacity"],budget,depth+1),["budget"]:__privateCapture2(value["budget"],budget,depth+1),["publish_every"]:__privateCapture2(value["publish_every"],budget,depth+1),["paused"]:__privateCapture3(value["paused"],budget,depth+1),["overflow"]:__privateCapture9(value["overflow"],budget,depth+1)};}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"id")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"observation")){throw Error('invalid value for wire schema');}return {["id"]:__privateCapture2(value["id"],budget,depth+1),["observation"]:__privateCapture4(value["observation"],budget,depth+1)};}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"input")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"target")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"rate")){throw Error('invalid value for wire schema');}return {["input"]:__privateCapture1(value["input"],budget,depth+1),["target"]:__privateCapture1(value["target"],budget,depth+1),["rate"]:__privateCapture1(value["rate"],budget,depth+1)};}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==13){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"serving")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"candidate")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"fallback")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"settings")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"version")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"base")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"ticket")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"active")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"processed")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"queue")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"next")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"published_through")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"dropped")){throw Error('invalid value for wire schema');}return {["serving"]:__privateCapture0(value["serving"],budget,depth+1),["candidate"]:__privateCapture0(value["candidate"],budget,depth+1),["fallback"]:__privateCapture4(value["fallback"],budget,depth+1),["settings"]:__privateCapture8(value["settings"],budget,depth+1),["version"]:__privateCapture2(value["version"],budget,depth+1),["base"]:__privateCapture2(value["base"],budget,depth+1),["ticket"]:__privateCapture2(value["ticket"],budget,depth+1),["active"]:__privateCapture3(value["active"],budget,depth+1),["processed"]:__privateCapture2(value["processed"],budget,depth+1),["queue"]:__privateCapture10(value["queue"],budget,depth+1),["next"]:__privateCapture2(value["next"],budget,depth+1),["published_through"]:__privateCapture2(value["published_through"],budget,depth+1),["dropped"]:__privateCapture2(value["dropped"],budget,depth+1)};}
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"session")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"accepted")){throw Error('invalid value for wire schema');}return {["session"]:__privateCapture7(value["session"],budget,depth+1),["accepted"]:__privateCapture3(value["accepted"],budget,depth+1)};}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==10){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"version")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"ticket")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"active")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"processed")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"pending")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"next")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"published_through")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"dropped")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"paused")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"budget")){throw Error('invalid value for wire schema');}return {["version"]:__privateCapture2(value["version"],budget,depth+1),["ticket"]:__privateCapture2(value["ticket"],budget,depth+1),["active"]:__privateCapture3(value["active"],budget,depth+1),["processed"]:__privateCapture2(value["processed"],budget,depth+1),["pending"]:__privateCapture2(value["pending"],budget,depth+1),["next"]:__privateCapture2(value["next"],budget,depth+1),["published_through"]:__privateCapture2(value["published_through"],budget,depth+1),["dropped"]:__privateCapture2(value["dropped"],budget,depth+1),["paused"]:__privateCapture3(value["paused"],budget,depth+1),["budget"]:__privateCapture2(value["budget"],budget,depth+1)};}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weight")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"updates")){throw Error('invalid value for wire schema');}return {["weight"]:__privateCapture1(value["weight"],budget,depth+1),["updates"]:__privateCapture2(value["updates"],budget,depth+1)};}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}if(!["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"].includes(text)){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return bits===0?0:bits;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue13(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue14(reader);reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue1(reader);reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue10(reader)};reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue27(reader)};reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue8(reader)}:{Ok:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={["capacity"]:__privateWireValue2(reader),["budget"]:__privateWireValue2(reader),["publish_every"]:__privateWireValue2(reader),["paused"]:__privateWireValue3(reader),["overflow"]:__privateWireValue12(reader)};reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value={["id"]:__privateWireValue2(reader),["observation"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value={["input"]:__privateWireValue1(reader),["target"]:__privateWireValue1(reader),["rate"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["m"]:__privateWireValue0(reader),["o"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value={["m"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["model"]:__privateWireValue0(reader),["fallback"]:__privateWireValue6(reader),["settings"]:__privateWireValue11(reader)};reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const value={["old"]:__privateWireValue0(reader),["next"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const value={["s"]:__privateWireValue11(reader)};reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["id"]:__privateWireValue2(reader),["observation"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["model"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["settings"]:__privateWireValue11(reader)};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["through"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["ticket"]:__privateWireValue2(reader),["flush"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader),["ticket"]:__privateWireValue2(reader),["steps"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value={["s"]:__privateWireValue10(reader)};reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value={["serving"]:__privateWireValue0(reader),["candidate"]:__privateWireValue0(reader),["fallback"]:__privateWireValue6(reader),["settings"]:__privateWireValue11(reader),["version"]:__privateWireValue2(reader),["base"]:__privateWireValue2(reader),["ticket"]:__privateWireValue2(reader),["active"]:__privateWireValue3(reader),["processed"]:__privateWireValue2(reader),["queue"]:__privateWireValue13(reader),["next"]:__privateWireValue2(reader),["published_through"]:__privateWireValue2(reader),["dropped"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const value={["session"]:__privateWireValue10(reader),["accepted"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value={["value"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["version"]:__privateWireValue2(reader),["ticket"]:__privateWireValue2(reader),["active"]:__privateWireValue3(reader),["processed"]:__privateWireValue2(reader),["pending"]:__privateWireValue2(reader),["next"]:__privateWireValue2(reader),["published_through"]:__privateWireValue2(reader),["dropped"]:__privateWireValue2(reader),["paused"]:__privateWireValue3(reader),["budget"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value={["weight"]:__privateWireValue1(reader),["updates"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue23(reader){const end=reader.frame();const value={["xs"]:__privateWireValue22(reader)};reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
const __privateWireValue12Variants=Object.freeze(["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]);
function __privateWireValue12(reader){const end=reader.frame();const value=reader.text(end,"enum",__privateWireValue12Variants);reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue11(value[i],budget,depth+1);return out;}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue1(value[i],budget,depth+1);return out;}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue7(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue16(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue0(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue6(value.Err,budget,depth+1)};}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);return {["capacity"]:__compiledOwnedValue2(value["capacity"],budget,depth+1),["budget"]:__compiledOwnedValue2(value["budget"],budget,depth+1),["publish_every"]:__compiledOwnedValue2(value["publish_every"],budget,depth+1),["paused"]:__compiledOwnedValue3(value["paused"],budget,depth+1),["overflow"]:__compiledOwnedValue9(value["overflow"],budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,4);return {["id"]:__compiledOwnedValue2(value["id"],budget,depth+1),["observation"]:__compiledOwnedValue4(value["observation"],budget,depth+1)};}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,4);return {["input"]:__compiledOwnedValue1(value["input"],budget,depth+1),["target"]:__compiledOwnedValue1(value["target"],budget,depth+1),["rate"]:__compiledOwnedValue1(value["rate"],budget,depth+1)};}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,4);return {["serving"]:__compiledOwnedValue0(value["serving"],budget,depth+1),["candidate"]:__compiledOwnedValue0(value["candidate"],budget,depth+1),["fallback"]:__compiledOwnedValue4(value["fallback"],budget,depth+1),["settings"]:__compiledOwnedValue8(value["settings"],budget,depth+1),["version"]:__compiledOwnedValue2(value["version"],budget,depth+1),["base"]:__compiledOwnedValue2(value["base"],budget,depth+1),["ticket"]:__compiledOwnedValue2(value["ticket"],budget,depth+1),["active"]:__compiledOwnedValue3(value["active"],budget,depth+1),["processed"]:__compiledOwnedValue2(value["processed"],budget,depth+1),["queue"]:__compiledOwnedValue10(value["queue"],budget,depth+1),["next"]:__compiledOwnedValue2(value["next"],budget,depth+1),["published_through"]:__compiledOwnedValue2(value["published_through"],budget,depth+1),["dropped"]:__compiledOwnedValue2(value["dropped"],budget,depth+1)};}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,4);return {["session"]:__compiledOwnedValue7(value["session"],budget,depth+1),["accepted"]:__compiledOwnedValue3(value["accepted"],budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,4);return {["version"]:__compiledOwnedValue2(value["version"],budget,depth+1),["ticket"]:__compiledOwnedValue2(value["ticket"],budget,depth+1),["active"]:__compiledOwnedValue3(value["active"],budget,depth+1),["processed"]:__compiledOwnedValue2(value["processed"],budget,depth+1),["pending"]:__compiledOwnedValue2(value["pending"],budget,depth+1),["next"]:__compiledOwnedValue2(value["next"],budget,depth+1),["published_through"]:__compiledOwnedValue2(value["published_through"],budget,depth+1),["dropped"]:__compiledOwnedValue2(value["dropped"],budget,depth+1),["paused"]:__compiledOwnedValue3(value["paused"],budget,depth+1),["budget"]:__compiledOwnedValue2(value["budget"],budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,4);return {["weight"]:__compiledOwnedValue1(value["weight"],budget,depth+1),["updates"]:__compiledOwnedValue2(value["updates"],budget,depth+1)};}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite11(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite14(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite1(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite7(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite16(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite0(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite6(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["capacity"],compact);__privateWireWrite2(writer,value["budget"],compact);__privateWireWrite2(writer,value["publish_every"],compact);__privateWireWrite3(writer,value["paused"],compact);__privateWireWrite9(writer,value["overflow"],compact);writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["id"],compact);__privateWireWrite4(writer,value["observation"],compact);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["input"],compact);__privateWireWrite1(writer,value["target"],compact);__privateWireWrite1(writer,value["rate"],compact);writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();__privateWireWrite0(writer,value["serving"],compact);__privateWireWrite0(writer,value["candidate"],compact);__privateWireWrite4(writer,value["fallback"],compact);__privateWireWrite8(writer,value["settings"],compact);__privateWireWrite2(writer,value["version"],compact);__privateWireWrite2(writer,value["base"],compact);__privateWireWrite2(writer,value["ticket"],compact);__privateWireWrite3(writer,value["active"],compact);__privateWireWrite2(writer,value["processed"],compact);__privateWireWrite10(writer,value["queue"],compact);__privateWireWrite2(writer,value["next"],compact);__privateWireWrite2(writer,value["published_through"],compact);__privateWireWrite2(writer,value["dropped"],compact);writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();__privateWireWrite7(writer,value["session"],compact);__privateWireWrite3(writer,value["accepted"],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["version"],compact);__privateWireWrite2(writer,value["ticket"],compact);__privateWireWrite3(writer,value["active"],compact);__privateWireWrite2(writer,value["processed"],compact);__privateWireWrite2(writer,value["pending"],compact);__privateWireWrite2(writer,value["next"],compact);__privateWireWrite2(writer,value["published_through"],compact);__privateWireWrite2(writer,value["dropped"],compact);__privateWireWrite3(writer,value["paused"],compact);__privateWireWrite2(writer,value["budget"],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["weight"],compact);__privateWireWrite2(writer,value["updates"],compact);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'record',fields:["weight","updates"],patterns:[{bytes:4,label:"record",children:[1,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["weight"]:values[0],["updates"]:values[1]})}]},{kind:"f32",scalar:__privateCapture1},{kind:"u32",scalar:__privateCapture2},{kind:"bool",scalar:__privateCapture3},{kind:'record',fields:["input","target","rate"],patterns:[{bytes:4,label:"record",children:[1,1,1],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["input"]:values[0],["target"]:values[1],["rate"]:values[2]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[0],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"string",scalar:__privateCapture6},{kind:'record',fields:["serving","candidate","fallback","settings","version","base","ticket","active","processed","queue","next","published_through","dropped"],patterns:[{bytes:4,label:"record",children:[0,0,4,8,2,2,2,3,2,10,2,2,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["serving"]:values[0],["candidate"]:values[1],["fallback"]:values[2],["settings"]:values[3],["version"]:values[4],["base"]:values[5],["ticket"]:values[6],["active"]:values[7],["processed"]:values[8],["queue"]:values[9],["next"]:values[10],["published_through"]:values[11],["dropped"]:values[12]})}]},{kind:'record',fields:["capacity","budget","publish_every","paused","overflow"],patterns:[{bytes:4,label:"record",children:[2,2,2,3,9],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["capacity"]:values[0],["budget"]:values[1],["publish_every"]:values[2],["paused"]:values[3],["overflow"]:values[4]})}]},{kind:"enum",scalar:__privateCapture9},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[11],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["id","observation"],patterns:[{bytes:4,label:"record",children:[2,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["id"]:values[0],["observation"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[7],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["version","ticket","active","processed","pending","next","published_through","dropped","paused","budget"],patterns:[{bytes:4,label:"record",children:[2,2,3,2,2,2,2,2,3,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["version"]:values[0],["ticket"]:values[1],["active"]:values[2],["processed"]:values[3],["pending"]:values[4],["next"]:values[5],["published_through"]:values[6],["dropped"]:values[7],["paused"]:values[8],["budget"]:values[9]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[1],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[16],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[6],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["session","accepted"],patterns:[{bytes:4,label:"record",children:[7,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["session"]:values[0],["accepted"]:values[1]})}]}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,4);return r[0](__reduceValue1(value["weight"],r,b,d+1,c),__reduceValue2(value["updates"],r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,8);return r[1]({F32Bits:value},c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,8);return r[2](value,c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,5);return r[3](value,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,4);return r[4](__reduceValue1(value["input"],r,b,d+1,c),__reduceValue1(value["target"],r,b,d+1,c),__reduceValue1(value["rate"],r,b,d+1,c),c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[5](0,__reduceValue0(value.Ok,r,b,d+1,c),c):r[5](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,4);b.text(value);return r[6](value,c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,4);return r[7](__reduceValue0(value["serving"],r,b,d+1,c),__reduceValue0(value["candidate"],r,b,d+1,c),__reduceValue4(value["fallback"],r,b,d+1,c),__reduceValue8(value["settings"],r,b,d+1,c),__reduceValue2(value["version"],r,b,d+1,c),__reduceValue2(value["base"],r,b,d+1,c),__reduceValue2(value["ticket"],r,b,d+1,c),__reduceValue3(value["active"],r,b,d+1,c),__reduceValue2(value["processed"],r,b,d+1,c),__reduceValue10(value["queue"],r,b,d+1,c),__reduceValue2(value["next"],r,b,d+1,c),__reduceValue2(value["published_through"],r,b,d+1,c),__reduceValue2(value["dropped"],r,b,d+1,c),c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,4);return r[8](__reduceValue2(value["capacity"],r,b,d+1,c),__reduceValue2(value["budget"],r,b,d+1,c),__reduceValue2(value["publish_every"],r,b,d+1,c),__reduceValue3(value["paused"],r,b,d+1,c),__reduceValue9(value["overflow"],r,b,d+1,c),c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,4);b.text(value);return r[9](value,c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[10];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue11(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,4);return r[11](__reduceValue2(value["id"],r,b,d+1,c),__reduceValue4(value["observation"],r,b,d+1,c),c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[12](0,__reduceValue7(value.Ok,r,b,d+1,c),c):r[12](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,4);return r[13](__reduceValue2(value["version"],r,b,d+1,c),__reduceValue2(value["ticket"],r,b,d+1,c),__reduceValue3(value["active"],r,b,d+1,c),__reduceValue2(value["processed"],r,b,d+1,c),__reduceValue2(value["pending"],r,b,d+1,c),__reduceValue2(value["next"],r,b,d+1,c),__reduceValue2(value["published_through"],r,b,d+1,c),__reduceValue2(value["dropped"],r,b,d+1,c),__reduceValue3(value["paused"],r,b,d+1,c),__reduceValue2(value["budget"],r,b,d+1,c),c);}
function __reduceValue14(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[14];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue1(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue15(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[15](0,__reduceValue16(value.Ok,r,b,d+1,c),c):r[15](1,__reduceValue6(value.Err,r,b,d+1,c),c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,4);return r[16](__reduceValue7(value["session"],r,b,d+1,c),__reduceValue3(value["accepted"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,2]),"fields":Object.freeze(["weight","updates"]),"kind":"record","name":"Model"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([1,1,1]),"fields":Object.freeze(["input","target","rate"]),"kind":"record","name":"Observation"}),Object.freeze({"children":Object.freeze([0,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([0,0,4,8,2,2,2,3,2,10,2,2,2]),"fields":Object.freeze(["serving","candidate","fallback","settings","version","base","ticket","active","processed","queue","next","published_through","dropped"]),"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}),Object.freeze({"children":Object.freeze([2,2,2,3,9]),"fields":Object.freeze(["capacity","budget","publish_every","paused","overflow"]),"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}),Object.freeze({"children":Object.freeze([]),"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715"}),Object.freeze({"children":Object.freeze([11]),"kind":"list"}),Object.freeze({"children":Object.freeze([2,4]),"fields":Object.freeze(["id","observation"]),"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"}),Object.freeze({"children":Object.freeze([7,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([2,2,3,2,2,2,2,2,3,2]),"fields":Object.freeze(["version","ticket","active","processed","pending","next","published_through","dropped","paused","budget"]),"kind":"record","name":"Status"}),Object.freeze({"children":Object.freeze([1]),"kind":"list"}),Object.freeze({"children":Object.freeze([16,6]),"kind":"result"}),Object.freeze({"children":Object.freeze([7,3]),"fields":Object.freeze(["session","accepted"]),"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"8421a96a29ebe813c5f2fa805c19c5cecd8a6a0ffe7e5bc38ea3f8d46eccb184","named":__compiledNamed0(),"root":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture3,__privateWireValue3,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ccf78d7830873ac80104e449dd376cb2adde55e92f329cb1cfbf0d440a0f1d3c","named":__compiledNamed0(),"root":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},__privateCapture4,__privateWireValue6,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"3b0b8667004a80b8cd2c9ce908c048f7fcabcb6b09034c1b6cb368ea8329819a","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}}},__privateCapture5,__privateWireValue7,__privateWireWrite5,__compiledOwnedValue5,5,5,__reduceValue5,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"87b3110f906d5218b260341ba29c8c563f225e93e870689789a773133a41267a","named":__compiledNamed0(),"root":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},__privateCapture7,__privateWireValue10,__privateWireWrite7,__compiledOwnedValue7,7,7,__reduceValue7,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ae0697defcea7295db7a3c4c6ef0c4723dd9c4b0599212dc48a09466b6dc7ebf","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}}},__privateCapture12,__privateWireValue15,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"16f4515304f4fc1d3fbb065b6576fd175706564b8a3985019254be9f253c0b7d","named":__compiledNamed0(),"root":{"fields":[{"name":"version","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"pending","type":{"kind":"u32"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"Status"}},__privateCapture13,__privateWireValue21,__privateWireWrite13,__compiledOwnedValue13,13,13,__reduceValue13,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture14,__privateWireValue22,__privateWireWrite14,__compiledOwnedValue14,14,14,__reduceValue14,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"1814dd17f370ed27547c8fb0ada0012e9ce6d7cfc5174c2c9eb0d648bacb03bd","named":__compiledNamed0(),"root":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},__privateCapture8,__privateWireValue11,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"aaa22a215061069438636d9738f0d5633374fa81e0cdd3a087028f013dca71f5","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"session","type":{"fields":[{"name":"serving","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"candidate","type":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"updates","type":{"kind":"u32"}}],"kind":"record","name":"Model"}},{"name":"fallback","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}},{"name":"settings","type":{"fields":[{"name":"capacity","type":{"kind":"u32"}},{"name":"budget","type":{"kind":"u32"}},{"name":"publish_every","type":{"kind":"u32"}},{"name":"paused","type":{"kind":"bool"}},{"name":"overflow","type":{"kind":"enum","name":"ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715","variants":["ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.Reject","ink_mb80b3033caa2d7f730a560841d140096338b4987074be32347a5e0db47571715.DropNewest"]}}],"kind":"record","name":"ink_m372a0700fe1706a3e0f4b5072d7650478db7797ba9c38ea0b9f72d493d5ad861"}},{"name":"version","type":{"kind":"u32"}},{"name":"base","type":{"kind":"u32"}},{"name":"ticket","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"processed","type":{"kind":"u32"}},{"name":"queue","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"observation","type":{"fields":[{"name":"input","type":{"kind":"f32"}},{"name":"target","type":{"kind":"f32"}},{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"Observation"}}],"kind":"record","name":"__ink_instance_3f9deec8c51e98056a726248af9726d21cb31140325c2853ceca9845ffcff455"},"kind":"list"}},{"name":"next","type":{"kind":"u32"}},{"name":"published_through","type":{"kind":"u32"}},{"name":"dropped","type":{"kind":"u32"}}],"kind":"record","name":"__ink_instance_74a4f66d0c22d48372b84c063718101a934bd4f5dbf3a58436db7e1caecd8062"}},{"name":"accepted","type":{"kind":"bool"}}],"kind":"record","name":"__ink_instance_3c7f9e32f4f7e951c6cf162c74296279a8d0786bbf2009926614c96a629e7ef4"}}},__privateCapture15,__privateWireValue26,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
const __compiledEntries=new Map([["valid",{index:0,params:[__compiledCodec0],result:__compiledCodec1,arguments:__privateWireValue4,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["accept",{index:1,params:[__compiledCodec0,__compiledCodec0],result:__compiledCodec1,arguments:__privateWireValue5,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["update",{index:2,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue9,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["advanced",{index:3,params:[__compiledCodec4,__compiledCodec5,__compiledCodec5],result:__compiledCodec6,arguments:__privateWireValue16,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["promoted",{index:4,params:[__compiledCodec4,__compiledCodec5,__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue17,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["replaced",{index:5,params:[__compiledCodec4,__compiledCodec0],result:__compiledCodec6,arguments:__privateWireValue18,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["readable",{index:6,params:[__compiledCodec6],result:__compiledCodec6,arguments:__privateWireValue19,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["pending",{index:7,params:[__compiledCodec4],result:__compiledCodec5,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["status_of",{index:8,params:[__compiledCodec4],result:__compiledCodec7,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["batch",{index:9,params:[__compiledCodec8],result:__compiledCodec8,arguments:__privateWireValue23,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m774d51bac5613f8c867087e67038e8fcd53e2b99b419c66245c901e4bdc0552a",{index:10,params:[__compiledCodec9],result:__compiledCodec1,arguments:__privateWireValue24,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["__ink_instance_a65318d7a0897ba10f1cf230ff149bf5fb5eb9cd07bf3596c7764574add28b02",{index:11,params:[__compiledCodec0,__compiledCodec2,__compiledCodec9],result:__compiledCodec6,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["__ink_instance_3dca942e9279c9db4b73f8ce20418235af61e62147ee28649213d7e6efa241a7",{index:12,params:[__compiledCodec4],result:__compiledCodec1,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["__ink_instance_21ffec0ea3f1f81e10f8346847271096d218e676311f88a8c1441403ba74a9eb",{index:13,params:[__compiledCodec4,__compiledCodec5,__compiledCodec2],result:__compiledCodec10,arguments:__privateWireValue28,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["__ink_instance_e19d8b9a97797c150ac0e3c9c9902d6579032038b12b779bf85c47a54e6c85c0",{index:14,params:[__compiledCodec4,__compiledCodec9],result:__compiledCodec6,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["__ink_instance_4a48b4943179c384f38b58e404eda2d47a1d8117bd96b495a23ba39a74c3a604",{index:15,params:[__compiledCodec4],result:__compiledCodec6,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["__ink_instance_2ac3e4ac46918f415f349460200487339939a4ea089c2a7978493651d4d31a38",{index:16,params:[__compiledCodec4],result:__compiledCodec6,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["__ink_instance_611e77295a7ed45c8070a62df6c5c882fc60f14c9745f21ba50ce993e515a071",{index:17,params:[__compiledCodec4,__compiledCodec5],result:__compiledCodec6,arguments:__privateWireValue30,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}]]);

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
const __intoOutput9=__representation(metadata.functions[9].result.element,true);
const __intoImplementations=[null,null,null,null,null,null,null,null,null,__into9,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
