const __recordElisions=new Set([]);
const __nativeF32=false;
// Representation conversion only. Callers supply values matching metadata.
const __view = new DataView(new ArrayBuffer(4));
const __float = bits => { __view.setUint32(0, bits, true); return __view.getFloat32(0, true); };
const __bits = number => { if(Number.isNaN(number))return 0x7fc00000; __view.setFloat32(0, number, true); return __view.getUint32(0, true); };
// Binary64 uses native Numbers for finite arithmetic and immutable private
// tags only where a NaN's exact payload must survive non-arithmetic operations.
const __doubleView=new DataView(new ArrayBuffer(8));
const __double=bits=>{__doubleView.setBigUint64(0,bits,true);return __doubleView.getFloat64(0,true);};
const __doubleBits=number=>{if(Number.isNaN(number))return 0x7ff8000000000000n;__doubleView.setFloat64(0,number,true);return __doubleView.getBigUint64(0,true);};
const __dfNumber=value=>typeof value==='number'?value:__double(BigInt(value.F64Bits));
const __dfBits=value=>typeof value==='number'?__doubleBits(value):BigInt(value.F64Bits);
const __dfFromBits=bits=>(bits&0x7fffffffffffffffn)>0x7ff0000000000000n?Object.freeze({F64Bits:bits.toString()}):__double(bits);
const __dfInput=value=>typeof value==='number'?value:__dfFromBits(BigInt(value.F64Bits));
const __dfNeg=value=>typeof value==='number'&&!Number.isNaN(value)?-value:__dfFromBits(__dfBits(value)^0x8000000000000000n);
const __dfOutput=value=>{const n=__dfNumber(value);return Number.isFinite(n)?n:{F64Bits:__dfBits(value).toString()};};
const __dfCapture=value=>{
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(!value||typeof value!=='object'||Object.keys(value).length!==1||!Object.hasOwn(value,'F64Bits'))throw Error('invalid f64');const text=value.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))throw Error('invalid f64');
 const bits=BigInt(text);if(bits>18446744073709551615n)throw Error('invalid F64Bits');return __dfFromBits(bits);
};
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
    case 'f64':return output?__dfOutput:__dfInput;
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
  case 'f64':return limited(__dfCapture);
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
function __stateInput(value,type,budget={cells:1000000},depth=0,maxDepth=64){
  if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');
  const input=(v,t)=>__stateInput(v,t,budget,depth+1,maxDepth);
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
    case 'f64':return __dfCapture(value);
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
function __fn0(v0,v1,v2){
return __fn17(v0,v1,v2);}
function __fn1(v3,v4,v5){
const v6=1000000;
const v7=__fn17(v3,v4,v6);
let v8;if(Object.hasOwn(v7,"Ok")){
const v9=v7["Ok"];
v8=__fn34(v9,v5);}else{
const v10=v7["Err"];
v8=({Err:v10});}
return v8;}
function __fn2(v11,v12,v13){
const v14=1000000;
const v15=__fn17(v11,v12,v14);
let v16;if(Object.hasOwn(v15,"Ok")){
const v17=v15["Ok"];
v16=__fn30(v17,v13);}else{
const v18=v15["Err"];
v16=({Err:v18});}
return v16;}
function __fn3(v19,v20,v21){
const v22=1000000;
const v23=__fn17(v19,v20,v22);
let v24;if(Object.hasOwn(v23,"Ok")){
const v25=v23["Ok"];
v24=__fn28(v25,v21);}else{
const v26=v23["Err"];
v24=({Err:v26});}
return v24;}
function __fn4(v27,v28,v29,v30){
const v31=1000000;
const v32=__fn17(v27,v28,v31);
let v33;if(Object.hasOwn(v32,"Ok")){
const v34=v32["Ok"];
v33=__fn35(v34,v29,v30);}else{
const v35=v32["Err"];
v33=({Err:v35});}
return v33;}
function __fn5(v36,v37,v38,v39){
const v40=1000000;
const v41=__fn17(v36,v37,v40);
let v42;if(Object.hasOwn(v41,"Ok")){
const v43=v41["Ok"];
v42=__fn25(v43,v38,v39);}else{
const v44=v41["Err"];
v42=({Err:v44});}
return v42;}
function __fn6(v45,v46){
return __fn34(v45,v46);}
function __fn7(v47){
const v48=v47.length;
const v49=new Array(v48);
for(let v50=0;v50<v48;v50++){
const v51=v47[v50];
const v52=__bits(__float(v51) * __float(v51));
const v53=1056964608;
v49[v50]=__bits(__float(v52) + __float(v53));
}
return v49;}
function __fn8(v54,v55){
let v56;if(Object.hasOwn(v54,"Some")){
const v57=v54["Some"];
let v58;if(v55<v57.length){v58=v57[v55];}else{
v58=0.0;}
v56=v58;}else{
const v59=null;
v56=0.0;}
return v56;}
function __fn9(v60,v61){
const v62=v60["graphemeStartExtras"];
let v63;if(Object.hasOwn(v62,"Some")){
const v64=v62["Some"];
let v65;if(v61<v64.length){v65=v64[v61];}else{
v65=({None:null});}
v63=v65;}else{
const v66=null;
v63=({None:null});}
return v63;}
function __fn10(v67,v68){
const v69=v67["flags"];
let v70;if(v68<v69.length){v70=v69[v68];}else{
v70=0;}
const v71=v70;
const v72=15;
return (((v71)&(v72))>>>0);}
function __fn11(v73,v74,v75){
const v76=__fn10(v73,v74);
const v77=1;
const v78=(v76===v77);
let v79=v78;if(!v79){
const v80=__fn10(v73,v74);
const v81=2;
const v82=(v80===v81);
let v83=v82;if(v83){
const v84=false;
v83=(v75===v84);}
v79=v83;}
return v79;}
function __fn12(v85,v86){
const v87=__fn10(v85,v86);
const v88=1;
const v89=(v87===v88);
let v90=v89;if(!v90){
const v91=__fn10(v85,v86);
const v92=2;
v90=(v91===v92);}
return v90;}
function __fn13(v93){
let v94=true;
for(let v95=0;v95<v93.length;v95++){
const v96=v93[v95];
const v97=v94;
let v98=v97;if(v98){
v98=Number.isFinite(__dfNumber(v96));}
v94=v98;
}
return v94;}
function __fn14(v99,v100){
let v101;if(Object.hasOwn(v99,"Some")){
const v102=v99["Some"];
const v103=v102.length;
const v104=1000000;
const v105=((v103) <= (v104));
let v106=v105;if(v106){
const v107=(v102).length;
v106=(v107===v100);}
const v108=v106;
let v109=v108;if(v109){
v109=__fn13(v102);}
v101=v109;}else{
const v110=null;
v101=true;}
return v101;}
function __fn15(v111,v112,v113,v114){
const v115=v114["index"];
const v116=v111["flags"];
let v117;if(v115<v116.length){v117=v116[v115];}else{
v117=256;}
const v118=v117;
const v119=15;
const v120=(((v118)&(v119))>>>0);
let v121;if(Object.hasOwn(v113,"Some")){
const v122=v113["Some"];
v121=(v122).length;}else{
const v123=null;
v121=0;}
const v124=v121;
const v125=v114["valid"];
let v126=v125;if(v126){
const v127=255;
v126=((v118) <= (v127));}
const v128=v126;
let v129=v128;if(v129){
const v130=2;
v129=((v120) <= (v130));}
const v131=v129;
let v132=v131;if(v132){
const v133=32;
const v134=(((v118)&(v133))>>>0);
const v135=0;
v132=(v134===v135);}
const v136=v132;
let v137=v136;if(v137){
let v138;if(Object.hasOwn(v113,"Some")){
const v139=v113["Some"];
const v140=v139.length;
const v141=0;
const v142=((v140) > (v141));
let v143=v142;if(v143){
const v144=v139.length;
const v145=1000000;
v143=((v144) <= (v145));}
const v146=v143;
let v147=v146;if(v147){
const v148=(v139).length;
v147=((v148) <= (v112));}
const v149=v147;
let v150=v149;if(v150){
v150=__fn13(v139);}
v138=v150;}else{
const v151=null;
v138=true;}
v137=v138;}
const v152=v137;
let v153=v152;if(v153){
const v154=__fn9(v111,v115);
let v155;if(Object.hasOwn(v154,"Some")){
const v156=v154["Some"];
let v157;if(Object.hasOwn(v113,"Some")){
const v158=v113["Some"];
const v159=v156.length;
const v160=v158.length;
const v161=((v159) === (v160));
let v162=v161;if(v162){
v162=__fn13(v156);}
v157=v162;}else{
const v163=null;
v157=false;}
v155=v157;}else{
const v164=null;
v155=true;}
v153=v155;}
const v165=v153;
const v166=v114["budget"];
const v167=(((v112) - (v166)) >>> 0);
const v168=((v124) <= (v167));
let v169=v165;if(v169){
v169=v168;}
const v170=v169;
let v171;if(v168){
const v172=v114["budget"];
v171=(((v172) + (v124)) >>> 0);}else{
v171=v114["budget"];}
const v173=v171;
const v174=1;
const v175=(((v115) + (v174)) >>> 0);
return ({["valid"]:v170,["budget"]:v173,["index"]:v175});}
function __fn16(v176,v177,v178){
const v179=0;
const v180=(v178===v179);
let v181=v180;if(!v181){
const v182=1000000;
v181=((v178) > (v182));}
const v183=v181;
let v184=v183;if(!v184){
const v185=v176["widths"];
const v186=v185.length;
const v187=1000000;
v184=((v186) > (v187));}
const v188=v184;
let v189=v188;if(!v189){
const v190=(v176["widths"]).length;
v189=((v190) > (v178));}
const v191=v189;
let v192=v191;if(!v192){
const v193=v176["widths"];
const v194=__fn13(v193);
const v195=false;
v192=(v194===v195);}
const v196=v192;
let v197=v196;if(!v197){
const v198=Number.isFinite(__dfNumber(v177));
const v199=false;
v197=(v198===v199);}
const v200=v197;
let v201=v200;if(!v201){
const v202=0.0;
v201=((__dfNumber(v177)) < (__dfNumber(v202)));}
let v203;if(v201){
v203=({None:null});}else{
const v204=(v176["widths"]).length;
const v205=v176["flags"];
const v206=v205.length;
const v207=1000000;
const v208=((v206) > (v207));
let v209=v208;if(!v209){
const v210=(v176["flags"]).length;
v209=!(v210===v204);}
const v211=v209;
let v212=v211;if(!v212){
const v213=v176["advances"];
const v214=v213.length;
const v215=1000000;
v212=((v214) > (v215));}
const v216=v212;
let v217=v216;if(!v217){
const v218=(v176["advances"]).length;
v217=!(v218===v204);}
const v219=v217;
let v220=v219;if(!v220){
const v221=v176["startExtras"];
const v222=__fn14(v221,v204);
const v223=false;
v220=(v222===v223);}
const v224=v220;
let v225=v224;if(!v225){
const v226=v176["endTrims"];
const v227=__fn14(v226,v204);
const v228=false;
v225=(v227===v228);}
const v229=v225;
let v230=v229;if(!v230){
const v231=v176["overflowTrims"];
const v232=__fn14(v231,v204);
const v233=false;
v230=(v232===v233);}
const v234=v230;
let v235=v234;if(!v235){
const v236=v176["insideExtras"];
const v237=__fn14(v236,v204);
const v238=false;
v235=(v237===v238);}
const v239=v235;
let v240=v239;if(!v240){
const v241=v176["fillExtras"];
const v242=__fn14(v241,v204);
const v243=false;
v240=(v242===v243);}
const v244=v240;
let v245=v244;if(!v245){
const v246=v176["graphemeStartExtras"];
let v247;if(Object.hasOwn(v246,"Some")){
const v248=v246["Some"];
const v249=v248.length;
const v250=1000000;
const v251=((v249) <= (v250));
let v252=v251;if(v252){
const v253=(v248).length;
v252=(v253===v204);}
v247=v252;}else{
const v254=null;
v247=true;}
const v255=v247;
const v256=false;
v245=(v255===v256);}
let v257;if(v245){
v257=({None:null});}else{
const v258=v176["advances"];
const v259=true;
const v260=0;
let v261=({["valid"]:v259,["budget"]:v204,["index"]:v260});
for(let v262=0;v262<v258.length;v262++){
const v263=v258[v262];
const v264=v261;
v261=__fn15(v176,v178,v263,v264);
}
const v265=v261;
let v266;if(v265["valid"]){
v266=({Some:v265["budget"]});}else{
v266=({None:null});}
v257=v266;}
v203=v257;}
return v203;}
function __fn17(v267,v268,v269){
const v270=__fn16(v267,v268,v269);
let v271;if(Object.hasOwn(v270,"Some")){
const v272=v270["Some"];
v271=({Ok:({["data"]:v267,["epsilon"]:v268,["budget"]:v272})});}else{
const v273=null;
v271=({Err:"invalid simple prepared text"});}
return v271;}
function __fn18(v274){
const v275=v274["data"];
const v276=v274["epsilon"];
const v277=1000000;
const v278=__fn16(v275,v276,v277);
let v279;if(Object.hasOwn(v278,"Some")){
const v280=v278["Some"];
const v281=v274["budget"];
v279=(v280===v281);}else{
const v282=null;
v279=false;}
return v279;}
function __fn19(v283){
let v284;if(Number.isNaN(__dfNumber(v283))){
v284=__dfFromBits(9218868437227405312n);}else{
v284=v283;}
return v284;}
function __fn20(v285,v286){
const v287=0.0;
let v288;if(((__dfNumber(v286)) > (__dfNumber(v287)))){
v288=v286;}else{
v288=0.0;}
const v289=v288;
const v290=v285["epsilon"];
return (__dfNumber(v289) + __dfNumber(v290));}
function __fn21(v291,v292){
const v293=(v291["widths"]).length;
const v294=v292["segment"];
const v295=0;
const v296=(v294===v295);
const v297=v292["grapheme"];
const v298=0;
const v299=((v297) > (v298));
let v300=v299;if(!v300){
const v301=v292["segment"];
v300=((v301) >= (v293));}
const v302=v300;
let v303=({["cursor"]:v292,["done"]:v302});
for(let v304=0;v304<v293;v304++){
const v305=v303;
if(v305["done"]){break;}
const v306=(v304>>>0);
const v307=v303;
const v308=v307["cursor"];
const v309=v308["segment"];
let v310;if(__fn11(v291,v309,v296)){
const v311=v303;
const v312=v311["cursor"];
const v313=v312["segment"];
const v314=1;
const v315=(((v313) + (v314)) >>> 0);
const v316=0;
const v317=({["segment"]:v315,["grapheme"]:v316});
const v318=v303;
const v319=v318["cursor"];
const v320=v319["segment"];
const v321=1;
const v322=(((v320) + (v321)) >>> 0);
const v323=((v322) >= (v293));
v310=({["cursor"]:v317,["done"]:v323});}else{
const v324=v303;
const v325=v324["cursor"];
const v326=true;
v310=({["cursor"]:v325,["done"]:v326});}
v303=v310;}
const v327=v303;
return v327["cursor"];}
function __fn22(v328,v329,v330,v331){
const v332=(v328).length;
const v333=false;
let v334=({["index"]:v329,["width"]:v330,["done"]:v333});
for(let v335=0;v335<v332;v335++){
const v336=v334;
const v337=v336["done"];
let v338=v337;if(!v338){
const v339=v334;
const v340=v339["index"];
const v341=(v328).length;
v338=((v340) >= (v341));}
if(v338){break;}
const v342=(v335>>>0);
const v343=v334;
const v344=v343["width"];
const v345=v334;
const v346=v345["index"];
let v347;if(v346<v328.length){v347=v328[v346];}else{
v347=0.0;}
const v348=v347;
const v349=(__dfNumber(v344) + __dfNumber(v348));
let v350;if(((__dfNumber(v349)) > (__dfNumber(v331)))){
const v351=true;
const v352=v334;
const v353=v352["index"];
const v354=v334;
const v355=v354["width"];
v350=({["index"]:v353,["width"]:v355,["done"]:v351});}else{
const v356=v334;
const v357=v356["index"];
const v358=1;
const v359=(((v357) + (v358)) >>> 0);
const v360=v334;
const v361=v360["width"];
const v362=v334;
const v363=v362["index"];
let v364;if(v363<v328.length){v364=v328[v363];}else{
v364=0.0;}
const v365=v364;
const v366=(__dfNumber(v361) + __dfNumber(v365));
const v367=false;
v350=({["index"]:v359,["width"]:v366,["done"]:v367});}
v334=v350;}
return v334;}
function __fn23(v368,v369,v370){
const v371=v370["index"];
const v372=v368["widths"];
let v373;if(v371<v372.length){v373=v372[v371];}else{
v373=0.0;}
const v374=v373;
const v375=v368["endTrims"];
const v376=__fn8(v375,v371);
const v377=v370["width"];
const v378=(__dfNumber(v377) + __dfNumber(v374));
const v379=(__dfNumber(v378) - __dfNumber(v376));
let v380;if(((__dfNumber(v379)) > (__dfNumber(v369)))){
const v381=__fn12(v368,v371);
const v382=false;
const v383=(v381===v382);
let v384=v383;if(v384){
const v385=1;
const v386=(((v371) - (v385)) >>> 0);
v384=__fn12(v368,v386);}
let v387;if(v384){
const v388=v370["width"];
const v389=v368["widths"];
const v390=1;
const v391=(((v371) - (v390)) >>> 0);
let v392;if(v391<v389.length){v392=v389[v391];}else{
v392=0.0;}
const v393=v392;
v387=(__dfNumber(v388) - __dfNumber(v393));}else{
const v394=v370["width"];
const v395=v370["trimmed"];
v387=(__dfNumber(v394) - __dfNumber(v395));}
const v396=v387;
let v397;if(v381){
const v398=1;
v397=(((v371) + (v398)) >>> 0);}else{
v397=v371;}
const v399=v397;
const v400=0;
const v402=true;
const v403=v370["index"];
const v404=v370["width"];
const v405=v370["trimmed"];
const v406=({["segment"]:v399,["grapheme"]:v400});
v380=({["index"]:v403,["width"]:v404,["trimmed"]:v405,["end"]:v406,["result"]:v396,["done"]:v402});}else{
const v407=v370["width"];
const v408=(__dfNumber(v407) + __dfNumber(v374));
const v409=1;
const v410=(((v371) + (v409)) >>> 0);
let v411;if(((__dfNumber(v408)) > (__dfNumber(v369)))){
v411=v376;}else{
v411=0.0;}
const v412=v411;
const v413=v370["end"];
const v414=v370["result"];
const v415=v370["done"];
v380=({["index"]:v410,["width"]:v408,["trimmed"]:v412,["end"]:v413,["result"]:v414,["done"]:v415});}
return v380;}
function __fn24(v416,v417,v418){
const v419=v416["data"];
const v420=__fn20(v416,v418);
const v421=(v419["widths"]).length;
const v422=v417["segment"];
const v423=v419["advances"];
let v424;if(v422<v423.length){v424=v423[v422];}else{
v424=({None:null});}
const v425=v424;
const v426=v419["startExtras"];
let v427;if(Object.hasOwn(v426,"Some")){
const v428=v426["Some"];
const v429=v419["widths"];
let v430;if(v422<v429.length){v430=v429[v422];}else{
v430=0.0;}
const v431=v430;
let v432;if(v422<v428.length){v432=v428[v422];}else{
v432=0.0;}
const v433=v432;
v427=(__dfNumber(v431) + __dfNumber(v433));}else{
const v434=null;
const v435=v419["widths"];
let v436;if(v422<v435.length){v436=v435[v422];}else{
v436=0.0;}
v427=v436;}
const v437=v427;
const v438=v419["endTrims"];
const v439=__fn8(v438,v422);
const v440=v419["overflowTrims"];
let v441;if(Object.hasOwn(v440,"Some")){
const v442=v440["Some"];
let v443;if(v422<v442.length){v443=v442[v422];}else{
v443=0.0;}
const v444=v443;
const v445=(__dfNumber(v437) - __dfNumber(v444));
let v446;if(((__dfNumber(v445)) <= (__dfNumber(v420)))){
let v447;if(v422<v442.length){v447=v442[v422];}else{
v447=0.0;}
v446=v447;}else{
v446=v439;}
v441=v446;}else{
const v448=null;
v441=v439;}
const v449=v441;
const v450=v417["grapheme"];
const v451=0;
const v452=((v450) > (v451));
let v453=v452;if(!v453){
const v454=(__dfNumber(v437) - __dfNumber(v449));
const v455=((__dfNumber(v454)) > (__dfNumber(v420)));
let v456=v455;if(v456){
let v457;if(Object.hasOwn(v425,"Some")){
const v458=v425["Some"];
v457=true;}else{
const v459=null;
v457=false;}
v456=v457;}
v453=v456;}
const v460=v453;
let v461;if(Object.hasOwn(v425,"Some")){
const v462=v425["Some"];
v461=v462;}else{
const v463=null;
v461=[];}
const v464=v461;
const v465=__fn9(v419,v422);
let v466;if(Object.hasOwn(v465,"Some")){
const v467=v465["Some"];
const v468=v417["grapheme"];
let v469;if(v468<v464.length){v469=v464[v468];}else{
v469=0.0;}
const v470=v469;
const v471=v417["grapheme"];
let v472;if(v471<v467.length){v472=v467[v471];}else{
v472=0.0;}
const v473=v472;
v466=(__dfNumber(v470) + __dfNumber(v473));}else{
const v474=null;
const v475=v417["grapheme"];
let v476;if(v475<v464.length){v476=v464[v475];}else{
v476=0.0;}
v466=v476;}
const v477=v466;
const v478=v417["grapheme"];
const v479=0;
let v480;if(((v478) > (v479))){
v480=v419["insideExtras"];}else{
v480=v419["fillExtras"];}
const v481=v480;
let v482;if(Object.hasOwn(v481,"Some")){
const v483=v481["Some"];
let v484;if(v422<v483.length){v484=v483[v422];}else{
v484=0.0;}
const v485=v484;
v482=(__dfNumber(v477) + __dfNumber(v485));}else{
const v486=null;
v482=v477;}
const v487=v482;
let v488;if(v460){
const v489=v417["grapheme"];
const v490=1;
const v491=(((v489) + (v490)) >>> 0);
v488=__fn22(v464,v491,v487,v420);}else{
const v492=(v464).length;
const v493=false;
v488=({["index"]:v492,["width"]:v437,["done"]:v493});}
const v494=v488;
let v495=v460;if(v495){
const v496=v494["index"];
const v497=(v464).length;
v495=((v496) < (v497));}
let v498;if(v495){
const v499=v494["width"];
const v500=v494["index"];
const v501=({["segment"]:v422,["grapheme"]:v500});
v498=({["width"]:v499,["start"]:v417,["end"]:v501});}else{
const v502=false;
const v503=(v460===v502);
let v504=v503;if(v504){
v504=((__dfNumber(v437)) > (__dfNumber(v420)));}
let v505;if(v504){
v505=v449;}else{
v505=0.0;}
const v506=v505;
const v507=1;
const v508=(((v422) + (v507)) >>> 0);
const v509=v494["width"];
const v510=0;
const v511=({["segment"]:v421,["grapheme"]:v510});
const v512=0.0;
const v513=false;
let v514=({["index"]:v508,["width"]:v509,["trimmed"]:v506,["end"]:v511,["result"]:v512,["done"]:v513});
for(let v515=0;v515<v421;v515++){
const v516=v514;
const v517=v516["done"];
let v518=v517;if(!v518){
const v519=v514;
const v520=v519["index"];
v518=((v520) >= (v421));}
if(v518){break;}
const v521=(v515>>>0);
const v522=v514;
v514=__fn23(v419,v420,v522);}
const v523=v514;
let v524;if(v523["done"]){
v524=v523["result"];}else{
const v525=v523["width"];
const v526=v523["trimmed"];
v524=(__dfNumber(v525) - __dfNumber(v526));}
const v527=v524;
const v528=v523["end"];
v498=({["width"]:v527,["start"]:v417,["end"]:v528});}
return v498;}
function __fn25(v529,v530,v531){
const v532=({Some:null});
let v533;if(Object.hasOwn(v532,"Some")){
const v534=v532["Some"];
v533=__fn18(v529);}else{
const v535=null;
v533=__fn18(v529);}
let v536;if(v533){
const v537=v529["data"];
const v538=(v537["widths"]).length;
const v539=v530["segment"];
const v540=((v539) > (v538));
let v541=v540;if(!v541){
const v542=v530["segment"];
const v543=(v542===v538);
let v544=v543;if(v544){
const v545=v530["grapheme"];
const v546=0;
v544=((v545) > (v546));}
v541=v544;}
const v547=v541;
let v548=v547;if(!v548){
const v549=v530["grapheme"];
const v550=0;
const v551=((v549) > (v550));
let v552=v551;if(v552){
const v553=v529["data"];
const v554=v553["advances"];
const v555=v530["segment"];
let v556;if(v555<v554.length){v556=v554[v555];}else{
v556=({None:null});}
const v557=v556;
let v558;if(Object.hasOwn(v557,"Some")){
const v559=v557["Some"];
const v560=v530["grapheme"];
const v561=(v559).length;
v558=((v560) < (v561));}else{
const v562=null;
v558=false;}
const v563=v558;
const v564=false;
v552=(v563===v564);}
v548=v552;}
let v565;if(v548){
v565=({Err:"invalid line cursor"});}else{
const v566=v529["data"];
const v567=__fn21(v566,v530);
const v568=v567["segment"];
let v569;if(((v568) >= (v538))){
v569=({Ok:({None:null})});}else{
const v570=__fn19(v531);
v569=({Ok:({Some:__fn24(v529,v567,v570)})});}
v565=v569;}
v536=v565;}else{
const v571=({Some:null});
let v572;if(Object.hasOwn(v571,"Some")){
const v573=v571["Some"];
v572="invalid prepared text";}else{
const v574=null;
v572="invalid prepared text";}
v536=({Err:v572});}
return v536;}
function __fn26(v575,v576,v577){
const v578=v575["data"];
const v579=v577["cursor"];
const v580=__fn21(v578,v579);
const v581=v580["segment"];
const v582=v575["data"];
const v583=(v582["widths"]).length;
let v584;if(((v581) >= (v583))){
const v585=true;
const v586=v577["cursor"];
const v587=v577["stats"];
v584=({["cursor"]:v586,["stats"]:v587,["done"]:v585});}else{
const v588=__fn24(v575,v580,v576);
const v589=v588["end"];
const v590=v577["stats"];
const v591=v590["lineCount"];
const v592=1;
const v593=(((v591) + (v592)) >>> 0);
const v594=v588["width"];
const v595=v577["stats"];
const v596=v595["maxLineWidth"];
let v597;if(((__dfNumber(v594)) > (__dfNumber(v596)))){
v597=v588["width"];}else{
const v598=v577["stats"];
v597=v598["maxLineWidth"];}
const v599=v597;
const v600=({["lineCount"]:v593,["maxLineWidth"]:v599});
const v601=false;
v584=({["cursor"]:v589,["stats"]:v600,["done"]:v601});}
return v584;}
function __fn27(v602,v603){
const v604=v602["budget"];
const v605=1;
const v606=(((v604) + (v605)) >>> 0);
const v607=0;
const v608=0;
const v609=({["segment"]:v607,["grapheme"]:v608});
const v610=0;
const v611=0.0;
const v612=({["lineCount"]:v610,["maxLineWidth"]:v611});
const v613=false;
let v614=({["cursor"]:v609,["stats"]:v612,["done"]:v613});
for(let v615=0;v615<v606;v615++){
const v616=v614;
if(v616["done"]){break;}
const v617=(v615>>>0);
const v618=v614;
v614=__fn26(v602,v603,v618);}
const v619=v614;
return v619["stats"];}
function __fn28(v620,v621){
const v622=({Some:null});
let v623;if(Object.hasOwn(v622,"Some")){
const v624=v622["Some"];
v623=__fn18(v620);}else{
const v625=null;
v623=__fn18(v620);}
let v626;if(v623){
const v627=__fn19(v621);
v626=({Ok:__fn27(v620,v627)});}else{
const v628=({Some:null});
let v629;if(Object.hasOwn(v628,"Some")){
const v630=v628["Some"];
v629="invalid prepared text";}else{
const v631=null;
v629="invalid prepared text";}
v626=({Err:v629});}
return v626;}
function __fn29(v632,v633,v634){
const v635=v632["data"];
const v636=v634["cursor"];
const v637=__fn21(v635,v636);
const v638=v637["segment"];
const v639=v632["data"];
const v640=(v639["widths"]).length;
let v641;if(((v638) >= (v640))){
const v642=true;
const v643=v634["cursor"];
const v644=v634["lines"];
v641=({["cursor"]:v643,["lines"]:v644,["done"]:v642});}else{
const v645=__fn24(v632,v637,v633);
const v646=v645["end"];
const v647=v634["lines"];
const v648=__tempEdit(v647,"push",v645);
const v649=false;
v641=({["cursor"]:v646,["lines"]:v648,["done"]:v649});}
return v641;}
function __fn30(v650,v651){
const v652=({Some:null});
let v653;if(Object.hasOwn(v652,"Some")){
const v654=v652["Some"];
v653=__fn18(v650);}else{
const v655=null;
v653=__fn18(v650);}
let v656;if(v653){
const v657=v650["budget"];
const v658=1;
const v659=(((v657) + (v658)) >>> 0);
const v660=0;
const v661=0;
const v662=({["segment"]:v660,["grapheme"]:v661});
const v663=new __InkBuffer([]);
const v664=false;
let v665=({["cursor"]:v662,["lines"]:v663,["done"]:v664});
for(let v666=0;v666<v659;v666++){
const v667=v665;
if(v667["done"]){break;}
const v668=(v666>>>0);
const v669=__fn19(v651);
const v670=v665;
v665=__fn29(v650,v669,v670);}
const v671=v665;
const v672=v671["lines"];
v656=({Ok:v672.freeze()});}else{
const v673=({Some:null});
let v674;if(Object.hasOwn(v673,"Some")){
const v675=v673["Some"];
v674="invalid prepared text";}else{
const v676=null;
v674="invalid prepared text";}
v656=({Err:v674});}
return v656;}
function __fn31(v677,v678,v679,v680){
const v681=(v677).length;
const v682=false;
let v683=({["index"]:v678,["width"]:v679,["done"]:v682});
for(let v684=0;v684<v681;v684++){
const v685=v683;
const v686=v685["done"];
let v687=v686;if(!v687){
const v688=v683;
const v689=v688["index"];
const v690=(v677).length;
v687=((v689) >= (v690));}
if(v687){break;}
const v691=(v684>>>0);
const v692=v683;
const v693=v692["width"];
const v694=v683;
const v695=v694["index"];
let v696;if(v695<v677.length){v696=v677[v695];}else{
v696=0.0;}
const v697=v696;
const v698=(__dfNumber(v693) + __dfNumber(v697));
let v699;if(((__dfNumber(v698)) <= (__dfNumber(v680)))){
const v700=v683;
const v701=v700["index"];
const v702=1;
const v703=(((v701) + (v702)) >>> 0);
const v704=v683;
const v705=v704["width"];
const v706=v683;
const v707=v706["index"];
let v708;if(v707<v677.length){v708=v677[v707];}else{
v708=0.0;}
const v709=v708;
const v710=(__dfNumber(v705) + __dfNumber(v709));
const v711=false;
v699=({["index"]:v703,["width"]:v710,["done"]:v711});}else{
const v712=true;
const v713=v683;
const v714=v713["index"];
const v715=v683;
const v716=v715["width"];
v699=({["index"]:v714,["width"]:v716,["done"]:v712});}
v683=v699;}
return v683;}
function __fn32(v717,v718,v719,v720){
const v721=v720["count"];
const v722=v721["width"];
let v723;if(Object.hasOwn(v718,"Some")){
const v724=v718["Some"];
const v725=v720["index"];
let v726;if(v725<v724.length){v726=v724[v725];}else{
v726=0.0;}
v723=v726;}else{
const v727=null;
v723=0.0;}
const v728=v723;
const v729=(__dfNumber(v722) + __dfNumber(v728));
const v730=v720["index"];
let v731;if(v730<v717.length){v731=v717[v730];}else{
v731=0.0;}
const v732=v731;
const v733=(__dfNumber(v729) + __dfNumber(v732));
const v734=v720["index"];
const v735=1;
const v736=(((v734) + (v735)) >>> 0);
const v737=__fn31(v717,v736,v733,v719);
const v738=v737["index"];
const v739=(v717).length;
let v740;if(((v738) < (v739))){
const v741=v720["count"];
const v742=v741["lines"];
const v743=1;
const v744=(((v742) + (v743)) >>> 0);
const v745=0.0;
const v746=false;
const v747=({["lines"]:v744,["width"]:v745,["content"]:v746});
const v748=v737["index"];
v740=({["count"]:v747,["index"]:v748});}else{
const v749=v720["count"];
const v750=v749["lines"];
const v751=v737["width"];
const v752=true;
const v753=({["lines"]:v750,["width"]:v751,["content"]:v752});
const v754=v737["index"];
v740=({["count"]:v753,["index"]:v754});}
return v740;}
function __fn33(v755,v756,v757,v758){
const v759=__fn10(v755,v757);
const v760=v755["widths"];
let v761;if(v757<v760.length){v761=v760[v757];}else{
v761=0.0;}
const v762=v761;
const v763=v755["endTrims"];
const v764=__fn8(v763,v757);
const v765=v758["content"];
let v766=v765;if(v766){
const v767=v758["width"];
const v768=(__dfNumber(v767) + __dfNumber(v762));
const v769=(__dfNumber(v768) - __dfNumber(v764));
v766=((__dfNumber(v769)) <= (__dfNumber(v756)));}
let v770;if(v766){
const v771=v758["width"];
const v772=(__dfNumber(v771) + __dfNumber(v762));
const v773=v758["lines"];
const v774=v758["content"];
v770=({["lines"]:v773,["width"]:v772,["content"]:v774});}else{
const v775=v758["content"];
let v776;if(v775){
const v777=v758["lines"];
const v778=1;
const v779=(((v777) + (v778)) >>> 0);
const v780=0.0;
const v781=false;
v776=({["lines"]:v779,["width"]:v780,["content"]:v781});}else{
v776=v758;}
const v782=v776;
let v783=v775;if(v783){
const v784=0;
v783=!(v759===v784);}
const v785=v783;
let v786=v785;if(!v786){
const v787=false;
const v788=(v775===v787);
let v789=v788;if(v789){
const v790=1;
const v791=(v759===v790);
let v792=v791;if(!v792){
const v793=2;
const v794=(v759===v793);
let v795=v794;if(v795){
const v796=0;
v795=((v757) > (v796));}
v792=v795;}
v789=v792;}
v786=v789;}
let v797;if(v786){
v797=v782;}else{
const v798=v755["startExtras"];
let v799;if(Object.hasOwn(v798,"Some")){
const v800=v798["Some"];
let v801;if(v757<v800.length){v801=v800[v757];}else{
v801=0.0;}
const v802=v801;
v799=(__dfNumber(v762) + __dfNumber(v802));}else{
const v803=null;
v799=v762;}
const v804=v799;
const v805=v755["advances"];
let v806;if(v757<v805.length){v806=v805[v757];}else{
v806=({None:null});}
const v807=v806;
const v808=(__dfNumber(v804) - __dfNumber(v764));
const v809=((__dfNumber(v808)) <= (__dfNumber(v756)));
let v810=v809;if(!v810){
let v811;if(Object.hasOwn(v807,"Some")){
const v812=v807["Some"];
v811=false;}else{
const v813=null;
v811=true;}
v810=v811;}
let v814;if(v810){
const v815=v782["width"];
const v816=(__dfNumber(v815) + __dfNumber(v804));
const v817=true;
const v818=v782["lines"];
v814=({["lines"]:v818,["width"]:v816,["content"]:v817});}else{
let v819;if(Object.hasOwn(v807,"Some")){
const v820=v807["Some"];
v819=v820;}else{
const v821=null;
v819=[];}
const v822=v819;
const v823=(v822).length;
const v824=0;
let v825=({["count"]:v782,["index"]:v824});
for(let v826=0;v826<v823;v826++){
const v827=v825;
const v828=v827["index"];
const v829=(v822).length;
if(((v828) >= (v829))){break;}
const v830=(v826>>>0);
const v831=__fn9(v755,v757);
const v832=v825;
v825=__fn32(v822,v831,v756,v832);}
const v833=v825;
v814=v833["count"];}
v797=v814;}
v770=v797;}
return v770;}
function __fn34(v834,v835){
const v836=({Some:null});
let v837;if(Object.hasOwn(v836,"Some")){
const v838=v836["Some"];
v837=__fn18(v834);}else{
const v839=null;
v837=__fn18(v834);}
let v840;if(v837){
const v841=__fn19(v835);
const v842=v834["data"];
const v843=v842["overflowTrims"];
let v844;if(Object.hasOwn(v843,"Some")){
const v845=v843["Some"];
v844=true;}else{
const v846=null;
v844=false;}
let v847;if(v844){
const v848=__fn27(v834,v841);
v847=({Ok:v848["lineCount"]});}else{
const v849=v834["data"];
const v850=(v849["widths"]).length;
const v851=0;
const v852=0.0;
const v853=false;
let v854=({["lines"]:v851,["width"]:v852,["content"]:v853});
for(let v855=0;v855<v850;v855++){
if(false){break;}
const v856=(v855>>>0);
const v857=v834["data"];
const v858=__fn20(v834,v841);
const v859=v854;
v854=__fn33(v857,v858,v856,v859);}
const v860=v854;
const v861=v860["lines"];
let v862;if(v860["content"]){
v862=1;}else{
v862=0;}
const v863=v862;
v847=({Ok:(((v861) + (v863)) >>> 0)});}
v840=v847;}else{
const v864=({Some:null});
let v865;if(Object.hasOwn(v864,"Some")){
const v866=v864["Some"];
v865="invalid prepared text";}else{
const v867=null;
v865="invalid prepared text";}
v840=({Err:v865});}
return v840;}
function __fn35(v868,v869,v870){
const v871=__fn34(v868,v869);
let v872;if(Object.hasOwn(v871,"Ok")){
const v873=v871["Ok"];
const v874=(__dfNumber(v873) * __dfNumber(v870));
v872=({Ok:({["lineCount"]:v873,["height"]:v874})});}else{v872=({Err:v871.Err});}
return v872;}
function __into7(v875,v876){
const v877=v875.length;
for(let v879=0;v879<v877;v879++){
const v880=v875[v879];
const v881=__bits(__float(v880) * __float(v880));
const v882=1056964608;
v876[v879]=__intoOutput7(__bits(__float(v881) + __float(v882)));
}
return v877;}
const __namedTypes={"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"},"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"},"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"},"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5"},"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"},"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"},"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"},"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"},"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"},"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}};
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
  case 'f64':integer(__dfBits(v),8);break;
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
  case 'f64':return __dfFromBits(integer(8));
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
// Immutable keeps retain private values. Public results remain owned copies.
// Reverse edges come from checked source effects.
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
function __fixedTableBytes(root,table){
 const writer=__snapshotWriter(__snapshotLimits());
 const rows=[...table.entries()].sort((a,b)=>__keyCompare(a[0],b[0],root.key));
 writer.integer(rows.length,8);
 for(const [key,value]of rows){writer.value(key,root.snapshotKey??root.key);writer.value(value,root.snapshotValue??root.value);}
 return writer.finish();
}
function __createState(meta,implementations,captures=null,views=[],prefixes=[]){
 const rt={meta,tables:__newTables(meta,prefixes),version:meta.compactCommits?0:0n,outbox:__eventLog(meta),staged:[],busy:false,undo:[],seen:meta.roots.map(()=>new Set()),host:null,keeps:new Array(meta.keeps.length),keepDirty:meta.keeps.length?new Uint8Array(meta.keeps.length):null,keepUndoIndices:meta.keeps.length?new Uint32Array(meta.keeps.length):null,keepUndoCount:0};
 const fixed=typeof __stateFrozenFactories==='undefined'?[]:__stateFrozenFactories;
 const fixedBytes=[];
 for(let i=0;i<fixed.length;i++)if(fixed[i]){for(const [key,value]of fixed[i]())rt.tables[i].set(key,value);fixedBytes[i]=__fixedTableBytes(meta.roots[i],rt.tables[i]);}
 function checkFixed(tables){for(let i=0;i<fixedBytes.length;i++)if(fixedBytes[i]){const bytes=__fixedTableBytes(meta.roots[i],tables[i]);if(bytes.length!==fixedBytes[i].length||!bytes.every((v,n)=>v===fixedBytes[i][n]))throw Error('snapshot changes frozen state: '+meta.roots[i].name);}}
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
   const inputs=a.params.map((p,i)=>['u32','i32','u64','bool','unit','string','f32','f64','id','enum','int'].includes(p.type.kind)?__representation(p.type,false):a.inputs[i]);
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
   try{const snapshot=await __snapshotEncode(meta,rt);const reply=await __parallelInvokeAsync(name,captured,snapshot);const s=await __snapshotDecode(meta,reply.snapshot);checkFixed(s.tables);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;completed=true;return reply.value;}finally{rt.busy=false;if(completed)observers.commit(meta.roots.map((_,i)=>i));observers.release();}
  },
  checkpoint(limits){if(rt.busy)throw Error('checkpoint requires transaction boundary');return __snapshotEncode(meta,rt,limits);},
  async restore(bytes,limits){if(rt.host)throw Error('restore during transaction');if(rt.busy)throw Error('restore requires transaction boundary');rt.busy=true;rt.ctx.fuel=100000000;observers.hold();let restored=false;try{const s=await __snapshotDecode(meta,bytes,limits);checkFixed(s.tables);const candidate={...rt,tables:__restoreTables(rt,prefixes,s.tables),version:__storedCommit(meta,s.version),outbox:s.outbox,keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);for(const name of meta.invariantChecks||[]){const a=actionMap.get(name);if(implementations[a.index](rt.ctx,candidate)!==true)throw Error('snapshot violates state invariant');}const previousTables=rt.tables;rt.tables=candidate.tables;rt.restoreSpares=previousTables.map(table=>table instanceof __DenseTable?table:null);rt.version=__storedCommit(meta,s.version);rt.outbox=__eventLog(meta,s.outbox);rt.keeps=candidate.keeps;rt.activeViewRoots=candidate.activeViewRoots;if(rt.snapshotRows)rt.snapshotRows=meta.roots.map(()=>new Map());rt.changeEpoch++;rt.changeLog.length=0;restored=true;}finally{rt.busy=false;if(restored)observers.commit(meta.roots.map((_,i)=>i));observers.release();}},
 });
}
function __action0(ctx,rt,s0,s1){__tick(ctx);try{__tick(ctx);__emit(rt,"installed",0);__tick(ctx);const s2=__try(__fn17(s0,s1,1000000));__tick(ctx);__tablePut(rt,0,0,({Some:s2}),0);__tick(ctx);return ({Ok:0});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action1(ctx,rt,s3){__tick(ctx);__tick(ctx);__tablePut(rt,1,0,s3,0);__tick(ctx);return 0;}
function __action2(ctx,rt,s4){__tick(ctx);try{__tick(ctx);return ((s5)=>Object.hasOwn(s5,"Some")?((s6)=>(__fn35(s6,((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,1,0),10.0),s4)))(s5["Some"]):((s7)=>(({Err:"no prepared paragraph"})))(null))(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),({None:null})));}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __stateCommitRoot0(rt,key,prior,next,slot){__storeDirect(rt,0,key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[0]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}
function __stateCommitRoot1(rt,key,prior,next,slot){__storeDirect(rt,1,key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[1]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}
const __stateDirectReadFactories=[null,null,null];
function __stateValueEqual3(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!((__dfBits(a[i])===__dfBits(b[i]))))return false;return true;}
function __stateValueEqual4(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!((a[i]===b[i])))return false;return true;}
function __stateValueEqual5(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!(__stateValueEqual6(a[i],b[i])))return false;return true;}
function __stateValueEqual2(a,b){if(a===b)return true;return __stateValueEqual3(a["widths"],b["widths"])&&__stateValueEqual4(a["flags"],b["flags"])&&__stateValueEqual5(a["advances"],b["advances"])&&__stateValueEqual6(a["startExtras"],b["startExtras"])&&__stateValueEqual7(a["graphemeStartExtras"],b["graphemeStartExtras"])&&__stateValueEqual6(a["endTrims"],b["endTrims"])&&__stateValueEqual6(a["overflowTrims"],b["overflowTrims"])&&__stateValueEqual6(a["insideExtras"],b["insideExtras"])&&__stateValueEqual6(a["fillExtras"],b["fillExtras"]);}
function __stateValueEqual1(a,b){if(a===b)return true;return __stateValueEqual2(a["data"],b["data"])&&(__dfBits(a["epsilon"])===__dfBits(b["epsilon"]))&&(a["budget"]===b["budget"]);}
function __stateValueEqual10(a,b){if(a===b)return true;return (a["lineCount"]===b["lineCount"])&&(__dfBits(a["height"])===__dfBits(b["height"]));}
function __stateValueEqual6(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||__stateValueEqual3(a.Some,b.Some));}
function __stateValueEqual7(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||__stateValueEqual5(a.Some,b.Some));}
function __stateValueEqual0(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||__stateValueEqual1(a.Some,b.Some));}
function __stateValueEqual8(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual9(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual10(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __ownedInput7(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Option');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Option');const tag=keys[0];if(tag==='Some')return ({Some:__ownedInput5(value.Some,budget,depth+1,maxDepth)});if(tag==='None'&&value.None===null)return {None:null};throw Error('invalid Option');}
function __ownedInput5(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput6(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput6(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Option');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Option');const tag=keys[0];if(tag==='Some')return ({Some:__ownedInput1(value.Some,budget,depth+1,maxDepth)});if(tag==='None'&&value.None===null)return {None:null};throw Error('invalid Option');}
function __ownedInput1(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput2(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput3(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput4(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput0(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"widths")||!Object.hasOwn(value,"flags")||!Object.hasOwn(value,"advances")||!Object.hasOwn(value,"startExtras")||!Object.hasOwn(value,"graphemeStartExtras")||!Object.hasOwn(value,"endTrims")||!Object.hasOwn(value,"overflowTrims")||!Object.hasOwn(value,"insideExtras")||!Object.hasOwn(value,"fillExtras"))throw Error('invalid record');const field0=__ownedInput1(value["widths"],budget,depth+1,maxDepth);const field1=__ownedInput3(value["flags"],budget,depth+1,maxDepth);const field2=__ownedInput5(value["advances"],budget,depth+1,maxDepth);const field3=__ownedInput6(value["startExtras"],budget,depth+1,maxDepth);const field4=__ownedInput7(value["graphemeStartExtras"],budget,depth+1,maxDepth);const field5=__ownedInput6(value["endTrims"],budget,depth+1,maxDepth);const field6=__ownedInput6(value["overflowTrims"],budget,depth+1,maxDepth);const field7=__ownedInput6(value["insideExtras"],budget,depth+1,maxDepth);const field8=__ownedInput6(value["fillExtras"],budget,depth+1,maxDepth);return {["widths"]:field0,["flags"]:field1,["advances"]:field2,["startExtras"]:field3,["graphemeStartExtras"]:field4,["endTrims"]:field5,["overflowTrims"]:field6,["insideExtras"]:field7,["fillExtras"]:field8};}
const __ownedType2={"kind":"f64"};
function __ownedInput2(value,budget={cells:1000000},depth=0,maxDepth=64){return __stateInput(value,__ownedType2,budget,depth,maxDepth);}
function __ownedInput4(value,budget={cells:1000000},depth=0,maxDepth=64){let scalar=value;if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='number'||!Number.isInteger(scalar)||scalar<0||scalar>4294967295)throw Error('invalid u32');if(scalar===0)scalar=0;return scalar;}
const __stateFrozenFactories=[];
const __stateQueryEquals=[(a,b)=>__stateValueEqual8(a,b),(a,b)=>(a===b),(a,b)=>__stateValueEqual9(a,b)];
const __stateRootEquals=[(a,b)=>__stateValueEqual0(a,b),(a,b)=>(__dfBits(a)===__dfBits(b))];
const __stateBoundFactories=[(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1)=>run(a,[inputs[0](p0),inputs[1](p1)],null,output,only,true):(p0,p1)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);begin(a);try{return complete(a,__action0(rt.ctx,rt,b0,b1),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0)=>run(a,[inputs[0](p0)],null,output,only,true):(p0)=>{const b0=inputs[0](p0);begin(a);try{return complete(a,__action1(rt.ctx,rt,b0),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only)=>(p0)=>run(a,[inputs[0](p0)],null,output,only,true)];const __statePreflightFactories=[null,null,null];
const __stateMetadata={"actions":[{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":0,"name":"install","params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":false,"flatFailure":false,"freshResult":true,"index":1,"name":"resize","params":[{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"u32"},"roots":[1],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"current","params":[{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}},"roots":[0,1],"singleCell":true}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"installed","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[],[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Paragraph","snapshotKey":{"kind":"u32"},"snapshotValue":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record"},"kind":"option"},"value":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"kind":"option"}},{"key":{"kind":"u32"},"name":"Width","snapshotKey":{"kind":"u32"},"snapshotValue":{"kind":"f64"},"value":{"kind":"f64"}}],"snapshot":{"program":[117,17,76,231,100,26,241,116,235,41,28,220,59,24,3,156,235,143,34,131,31,83,159,198,161,157,84,148,85,142,116,99],"schema":[174,196,15,59,118,237,34,176,230,248,58,202,96,96,202,43,16,250,136,142,115,137,237,184,160,94,204,51,114,124,32,47]},"snapshotRows":false};const __actions=[__action0,__action1,__action2];const __stateInputCaptures=[[__ownedInput0,__ownedInput2],[__ownedInput2],[__ownedInput2]];
export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v15","core_sha256":"02416168b8726d91f7597110730e4dc1736b8709a6e1cf44bd7b74000999e30d","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"prepare","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}},{"destination":null,"index":1,"internal":false,"name":"count_lines","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":null,"index":2,"internal":false,"name":"lines","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}},{"destination":null,"index":3,"internal":false,"name":"stats","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},{"destination":null,"index":4,"internal":false,"name":"layout","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}},{"destination":null,"index":5,"internal":false,"name":"line","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}},{"destination":null,"index":6,"internal":false,"name":"count_prepared","parallel":false,"params":[{"name":"prepared","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":7,"internal":false,"name":"numeric","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":8,"internal":false,"name":"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":9,"internal":false,"name":"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"destination":null,"index":10,"internal":false,"name":"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":11,"internal":false,"name":"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}},{"name":"atStart","type":{"kind":"bool"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":12,"internal":false,"name":"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":13,"internal":false,"name":"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":14,"internal":false,"name":"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"n","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":15,"internal":false,"name":"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"advance","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"s","type":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}],"precondition":null,"result":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}},{"destination":null,"index":16,"internal":false,"name":"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":17,"internal":false,"name":"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}},{"destination":null,"index":18,"internal":false,"name":"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":19,"internal":false,"name":"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4","parallel":false,"params":[{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":20,"internal":false,"name":"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":21,"internal":false,"name":"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"precondition":null,"result":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"destination":null,"index":22,"internal":false,"name":"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}},{"destination":null,"index":23,"internal":false,"name":"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}},{"destination":null,"index":24,"internal":false,"name":"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}},{"destination":null,"index":25,"internal":false,"name":"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}},{"destination":null,"index":26,"internal":false,"name":"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}],"precondition":null,"result":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}},{"destination":null,"index":27,"internal":false,"name":"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"destination":null,"index":28,"internal":false,"name":"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},{"destination":null,"index":29,"internal":true,"name":"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"}}],"precondition":null,"result":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"}},{"destination":null,"index":30,"internal":false,"name":"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}},{"destination":null,"index":31,"internal":false,"name":"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}},{"destination":null,"index":32,"internal":false,"name":"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"es","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}],"precondition":null,"result":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}},{"destination":null,"index":33,"internal":false,"name":"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"i","type":{"kind":"u32"}},{"name":"s","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}],"precondition":null,"result":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"destination":null,"index":34,"internal":false,"name":"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":null,"index":35,"internal":false,"name":"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}],"named_types":{"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"},"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"},"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"},"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5"},"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"},"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"},"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"},"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"},"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"},"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"delegated_calls":1,"factory":true,"function":"prepare","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"count_lines","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"lines","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"stats","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"layout","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"line","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"count_prepared","retained_bindings":0},{"factory":false,"function":"numeric","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8","retained_bindings":6},{"delegated_calls":0,"factory":true,"function":"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58","retained_bindings":4},{"delegated_calls":1,"factory":true,"function":"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13","retained_bindings":0},{"factory":false,"function":"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45","retained_bindings":3},{"delegated_calls":0,"factory":true,"function":"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4","retained_bindings":13},{"delegated_calls":0,"factory":true,"function":"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f","retained_bindings":15},{"delegated_calls":2,"factory":true,"function":"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585","retained_bindings":5},{"delegated_calls":2,"factory":true,"function":"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021","retained_bindings":3},{"delegated_calls":1,"factory":true,"function":"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8","retained_bindings":1},{"delegated_calls":1,"factory":true,"function":"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373","retained_bindings":3},{"factory":false,"function":"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e","retained_bindings":3},{"delegated_calls":0,"factory":true,"function":"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf","retained_bindings":3},{"delegated_calls":0,"factory":true,"function":"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f","retained_bindings":12},{"delegated_calls":1,"factory":true,"function":"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6","retained_bindings":5},{"delegated_calls":1,"factory":true,"function":"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28","retained_bindings":0}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":{"actions":[{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":0,"name":"install","params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":false,"flatFailure":false,"freshResult":true,"index":1,"name":"resize","params":[{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"u32"},"roots":[1],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"current","params":[{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}},"roots":[0,1],"singleCell":true}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"installed","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[],[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Paragraph","snapshotKey":{"kind":"u32"},"snapshotValue":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record"},"kind":"option"},"value":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"kind":"option"}},{"key":{"kind":"u32"},"name":"Width","snapshotKey":{"kind":"u32"},"snapshotValue":{"kind":"f64"},"value":{"kind":"f64"}}],"snapshot":{"program":[117,17,76,231,100,26,241,116,235,41,28,220,59,24,3,156,235,143,34,131,31,83,159,198,161,157,84,148,85,142,116,99],"schema":[174,196,15,59,118,237,34,176,230,248,58,202,96,96,202,43,16,250,136,142,115,137,237,184,160,94,204,51,114,124,32,47]},"snapshotRows":false},"wire":{"format":"ink-value-wire-v1","functions":{"count_lines":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"count_prepared":{"arguments":{"format":"ink-value-wire-v1","identity":"493c6bc7ec48e92144981aed28fb206d98786334ac3f03d4170e2313dd50cc06","named":{},"root":{"fields":[{"name":"prepared","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021":{"arguments":{"format":"ink-value-wire-v1","identity":"d2e058847ec884bfec22ccda23ace2791ec70492243ce9a2c6884fef1f0ff622","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"95f1d165952114b4814841922105b86c623e8c07746843b06ad383444f2fa3eb","named":{},"root":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}},"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf":{"arguments":{"format":"ink-value-wire-v1","identity":"50e3868e4eed2dffa6000932f23075ff8b30106db7f81c7042a51751d7412a0c","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"es","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"542b3f99971053a272b15d88dedbfd32860a89ec2308e87c7bdb1c08c26eae0e","named":{},"root":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}},"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f":{"arguments":{"format":"ink-value-wire-v1","identity":"ce0f4f38eae34f7975beae644adf030a570e2ed2a6725820552d739792dda9c6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"c8de454d504db86ea8f8ef8cc6465494fc0e6efc146d375495b17ba9fb23b767","named":{},"root":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}}},"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8":{"arguments":{"format":"ink-value-wire-v1","identity":"5659766a7c7b7721a933ab4ca42ad202c9eaa5cfb2e6fb31a88e3654eb8f6990","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"advance","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"s","type":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f437e4e468cf5dba7df20a9114414406da37a3ae54ea711140ac1b5956e95082","named":{},"root":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}},"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"56dc0435d74d48781d7002db784cd2f88c15385d3cd6b708425c161c37cc361c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}}},"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"61e29a83d1fd64f316d82cf150eb5ad0405d16e0e326ff56bf3bae4248a89a32","named":{},"root":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}},"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63":{"arguments":{"format":"ink-value-wire-v1","identity":"04b5b6b7a1379874fb3dfce45df95449faa3dc7e79b5e259cc1f8b72edd3266e","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"n","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585":{"arguments":{"format":"ink-value-wire-v1","identity":"ce0f4f38eae34f7975beae644adf030a570e2ed2a6725820552d739792dda9c6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"6dabf0313de1ca25f33127bc080f250697ab4e45b0935d5c06756788a303369f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}}},"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4":{"arguments":{"format":"ink-value-wire-v1","identity":"ef8cac5957009d7919ea7afa6481df863418422398f30110fafe8c0d99d5489a","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"50c3299d4fbe93aa5602b822292acc76ab4400b031152a8c6acd698494f4c7f8","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}},"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5":{"arguments":{"format":"ink-value-wire-v1","identity":"0b69ff4dcdb1d6bbb28477df20642d1e80062f6025ebbd7f1dc071f1f4a655ee","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"958e0edfe65dde01c97aa1e7b9cb0c065f371a3330a42d473bc79a0491ebfc4f","named":{},"root":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899":{"arguments":{"format":"ink-value-wire-v1","identity":"1dbd92479e4132df4112ee804b4863ed22312c28d4856d85aed77754b2671a10","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75a4618821d68677bbefcd2dc8914150aecf406a4a3da1ef14cc88b57d83d830","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}}},"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45":{"arguments":{"format":"ink-value-wire-v1","identity":"17f3e017634c517452044c80028b56718cfc21dfd3e6cd791ef2319dd220bcc2","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"8e9fa024666eb3bfe6ab6049f660e547a12b56772f4ecbff9addcea5a92f3d9a","named":{},"root":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}},"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a":{"arguments":{"format":"ink-value-wire-v1","identity":"1dbd92479e4132df4112ee804b4863ed22312c28d4856d85aed77754b2671a10","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75a4618821d68677bbefcd2dc8914150aecf406a4a3da1ef14cc88b57d83d830","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}}},"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4":{"arguments":{"format":"ink-value-wire-v1","identity":"c3e1c11e682af8a0dca6bce5731523dfc4cd4063d21e60ee62914c18c5cec200","named":{},"root":{"fields":[{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987":{"arguments":{"format":"ink-value-wire-v1","identity":"22ccae4e651c3400343cf3a9d397f2740b858e5ad1aeed6d97ee2949ed2b050d","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef":{"unsupported":"unsupported wire descriptor"},"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58":{"arguments":{"format":"ink-value-wire-v1","identity":"2a2788fa3b1e05bb17c1278b1fca7eaf8dad34a3e69e8baf16adaaa6487c395b","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55":{"arguments":{"format":"ink-value-wire-v1","identity":"2a2788fa3b1e05bb17c1278b1fca7eaf8dad34a3e69e8baf16adaaa6487c395b","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ecfeb978a3522397be254146ef28fe5f3058566b565a7f4962c9131b6b18ae1c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}}},"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13":{"arguments":{"format":"ink-value-wire-v1","identity":"6f216386ecb924bce5a8e749a1e37cad000c13c87ec367c037a886590a47a6c7","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f":{"arguments":{"format":"ink-value-wire-v1","identity":"d95574a1453f38b447e94bccad1e5dd882553eca4b79f52ca848dd2ede361d93","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"i","type":{"kind":"u32"}},{"name":"s","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"3650a28e866fe994c1295f191904faf234c261d3a1a0a1b12bbf12c9e04226a2","named":{},"root":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}},"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"82ec50d2da2c3182aceb5378e08d8b8fe9de60c2be54d6daf5dbdb658955279f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}}},"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db":{"arguments":{"format":"ink-value-wire-v1","identity":"ca7d05d687135adb81b9858ad2e18cb8e2bfdd9f310542855171482c6284f07d","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}},{"name":"atStart","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28":{"arguments":{"format":"ink-value-wire-v1","identity":"849e86828ba3b664132f5aa51c80dd1f91b4598af1024a1580d92d2e15770ef6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"847cdb58437325b0783e94e7d572b615580b335968d233fd0e1b9879487ce4b2","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}},"layout":{"arguments":{"format":"ink-value-wire-v1","identity":"12868a3202c474e3db65dc4ff3bb8dc81cdd78f4fcd3dae557f7b42d54fc8ed2","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"847cdb58437325b0783e94e7d572b615580b335968d233fd0e1b9879487ce4b2","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}},"line":{"arguments":{"format":"ink-value-wire-v1","identity":"ad927f6815e10415fe2ad6b49b3be99770ef082e84bbd38076539814c89e1d9d","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"6dabf0313de1ca25f33127bc080f250697ab4e45b0935d5c06756788a303369f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}}},"lines":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"56dc0435d74d48781d7002db784cd2f88c15385d3cd6b708425c161c37cc361c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}}},"numeric":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"prepare":{"arguments":{"format":"ink-value-wire-v1","identity":"420561bdb34944962fafc5dd683910a11ec0ec79e77e10ebde738e30e54acf2c","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ecfeb978a3522397be254146ef28fe5f3058566b565a7f4962c9131b6b18ae1c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}}},"stats":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"82ec50d2da2c3182aceb5378e08d8b8fe9de60c2be54d6daf5dbdb658955279f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18,__fn19,__fn20,__fn21,__fn22,__fn23,__fn24,__fn25,__fn26,__fn27,__fn28,__fn29,__fn30,__fn31,__fn32,__fn33,__fn34,__fn35];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[true,true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[true,true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},{"kind":"f64"}]},{"capture":[false,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"u32"}]},{"capture":[false,true],"types":[{"fields":[{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"u32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"u32"},{"kind":"bool"}]},{"capture":[false,true],"types":[{"fields":[{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"u32"}]},{"capture":[true],"types":[{"element":{"kind":"f64"},"kind":"list"}]},{"capture":[true,true],"types":[{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},{"kind":"u32"}]},{"capture":[false,true,true,false],"types":[{"fields":[{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"u32"},{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"u32"}]},{"capture":[true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"u32"}]},{"capture":[false],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}]},{"capture":[true],"types":[{"kind":"f64"}]},{"capture":[false,true],"types":[{"fields":[{"name":"epsilon","type":{"kind":"f64"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[false,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}]},{"capture":[true,true,true,true],"types":[{"element":{"kind":"f64"},"kind":"list"},{"kind":"u32"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},{"kind":"f64"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},{"kind":"f64"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"},{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}]},{"capture":[false,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[false,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"},{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"}]},{"capture":[false,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[true,true,true,true],"types":[{"element":{"kind":"f64"},"kind":"list"},{"kind":"u32"},{"kind":"f64"},{"kind":"f64"}]},{"capture":[true,true,true,false],"types":[{"element":{"kind":"f64"},"kind":"list"},{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},{"kind":"f64"},{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}]},{"capture":[false,true,true,true],"types":[{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},{"kind":"f64"},{"kind":"u32"},{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}]},{"capture":[false,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},{"kind":"f64"},{"kind":"f64"}]}];

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
export function call(name,args) {switch(name){case "ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef":throw new Error('temporary storage is internal to a pure invocation');}return functions[name](...args);}
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
const wireDouble=new DataView(new ArrayBuffer(8));
function wireF64Bits(v){
 if(typeof v==='number'&&Number.isFinite(v)){wireDouble.setFloat64(0,v,true);return wireDouble.getBigUint64(0,true);}
 if(!wireTagged(v,'F64Bits'))wireInvalidValue();const text=v.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))wireInvalidValue();
 const bits=BigInt(text);if(bits>18446744073709551615n)wireInvalidValue();return bits;
}
const wireCanonical=v=>Array.isArray(v)?'['+v.map(wireCanonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort((a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;}).map(k=>JSON.stringify(k)+':'+wireCanonical(v[k])).join(',')+'}':JSON.stringify(v);
export async function createValueCodec(root,named={}){
 const used=new Set(),budget={nodes:100000};
 function check(t,d=0){
  if(d>64||--budget.nodes<0)throw Error('wire descriptor limit');
  const keys={u32:['kind'],u64:['kind'],i32:['kind'],f32:['kind'],f64:['kind'],bool:['kind'],unit:['kind'],string:['kind'],int:['kind'],id:['kind','name'],ref:['kind','name'],enum:['kind','name','variants'],record:['kind','name','fields'],list:['kind','element'],option:['kind','element'],vector:['kind','element','size'],result:['kind','ok','error']}[t?.kind];
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
  if(p.kind==='u32'||p.kind==='i32'||p.kind==='u64'||p.kind==='f32'||p.kind==='f64')flags|=2;
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
  case 'f64':read=(r,end)=>{r.size(end,8);const value={F64Bits:r.view.getBigUint64(r.cursor,true).toString()};r.cursor=end;return value;};break;
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
  case 'f32':case 'f64':case 'u64':{const size=p.kind==='f32'?4:8;read=(r,end)=>{r.size(end,size);r.cursor=end;};break;}
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
  case 'f64':read=r=>{r.require(8);const n=r.view.getBigUint64(r.cursor,true);r.cursor+=8;return {F64Bits:n.toString()};};break;
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
  case 'f64':copy=(v,r)=>{const bits=wireF64Bits(v);r.add(8);return {F64Bits:bits.toString()};};break;
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
  case 'f64':copy=(v,r)=>{const bits=wireF64Bits(v);r.add(8);return {F64Bits:bits.toString()};};break;
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
   case 'f64':w.wide(wireF64Bits(v));break;
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
    case 'f64':wireF64Bits(v);add(12);return;
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
   case 'f64':if(end-start!==8)throw Error('malformed wire scalar');if(materialize)value={F64Bits:view.getBigUint64(start,true).toString()};cursor=end;break;
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
   case 'f64':require(8);if(materialize)value={F64Bits:view.getBigUint64(cursor,true).toString()};cursor+=8;return value;
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
function jsonBinary64Value(v){
 if(typeof v==='number')return v;
 const text=v.F64Bits;
 if(typeof text!=='string'||text.length>20||!/^(0|[1-9][0-9]*)$/.test(text))throw Error('invalid F64Bits');
 const bits=BigInt(text);if(bits>18446744073709551615n)throw Error('invalid F64Bits');
 const b=new DataView(new ArrayBuffer(8));b.setBigUint64(0,bits,true);return b.getFloat64(0,true);
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
    case 'f64':{if(kind!==2)fail();const n=Number(item),b=new DataView(new ArrayBuffer(8));if(!Number.isFinite(n))throw Error('JSON f64 overflow');b.setFloat64(0,n,true);return {F64Bits:b.getBigUint64(0,true).toString()};}
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
    case 'f64':{const n=jsonBinary64Value(v);if(!Number.isFinite(n))throw Error('non-finite f64 cannot encode as JSON');return jsonVariant(2,Object.is(n,-0)?'-0':String(n));}
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
   if(t.kind==='f64'){const n=Number(v);if(!Number.isFinite(n))throw Error('JSON f64 overflow');const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,n,true);w.wide(b.getBigUint64(0,true));}
   else if(t.kind==='f32'){jsonFloatScratch.setFloat32(0,Number(v),true);if(!Number.isFinite(jsonFloatScratch.getFloat32(0,true)))throw Error('JSON f32 overflow');w.word(jsonFloatScratch.getUint32(0,true));}
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
   case 'f64':{const n=dv.getFloat64(p,true);if(!Number.isFinite(n))throw Error('non-finite f64 cannot encode as JSON');emit(Object.is(n,-0)?'-0':String(n));break;}
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
function __ownedValue9(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue7(value.Some,budget,depth+1)};}
function __ownedValue7(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue8(value[i],budget,depth+1);return out;}
function __ownedValue8(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue3(value.Some,budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue14(value[i],budget,depth+1);return out;}
function __ownedValue21(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue14(value.Some,budget,depth+1)};}
function __ownedValue22(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue23(value[i],budget,depth+1);return out;}
function __ownedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue4(value[i],budget,depth+1);return out;}
function __ownedValue5(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue6(value[i],budget,depth+1);return out;}
function __ownedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue6(value.Some,budget,depth+1)};}
function __ownedValue12(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue13(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue20(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue21(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue1(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue18(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue19(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue17(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue6(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue30(value,budget,depth){budget.enter(depth,4);return {["count"]:__ownedValue31(value["count"],budget,depth+1),["index"]:__ownedValue6(value["index"],budget,depth+1)};}
function __ownedValue29(value,budget,depth){budget.enter(depth,4);return {["cursor"]:__ownedValue15(value["cursor"],budget,depth+1),["stats"]:__ownedValue17(value["stats"],budget,depth+1),["done"]:__ownedValue24(value["done"],budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["data"]:__ownedValue2(value["data"],budget,depth+1),["epsilon"]:__ownedValue4(value["epsilon"],budget,depth+1),["budget"]:__ownedValue6(value["budget"],budget,depth+1)};}
function __ownedValue27(value,budget,depth){budget.enter(depth,4);return {["index"]:__ownedValue6(value["index"],budget,depth+1),["width"]:__ownedValue4(value["width"],budget,depth+1),["done"]:__ownedValue24(value["done"],budget,depth+1)};}
function __ownedValue28(value,budget,depth){budget.enter(depth,4);return {["index"]:__ownedValue6(value["index"],budget,depth+1),["width"]:__ownedValue4(value["width"],budget,depth+1),["trimmed"]:__ownedValue4(value["trimmed"],budget,depth+1),["end"]:__ownedValue15(value["end"],budget,depth+1),["result"]:__ownedValue4(value["result"],budget,depth+1),["done"]:__ownedValue24(value["done"],budget,depth+1)};}
function __ownedValue19(value,budget,depth){budget.enter(depth,4);return {["lineCount"]:__ownedValue6(value["lineCount"],budget,depth+1),["height"]:__ownedValue4(value["height"],budget,depth+1)};}
function __ownedValue17(value,budget,depth){budget.enter(depth,4);return {["lineCount"]:__ownedValue6(value["lineCount"],budget,depth+1),["maxLineWidth"]:__ownedValue4(value["maxLineWidth"],budget,depth+1)};}
function __ownedValue31(value,budget,depth){budget.enter(depth,4);return {["lines"]:__ownedValue6(value["lines"],budget,depth+1),["width"]:__ownedValue4(value["width"],budget,depth+1),["content"]:__ownedValue24(value["content"],budget,depth+1)};}
function __ownedValue15(value,budget,depth){budget.enter(depth,4);return {["segment"]:__ownedValue6(value["segment"],budget,depth+1),["grapheme"]:__ownedValue6(value["grapheme"],budget,depth+1)};}
function __ownedValue25(value,budget,depth){budget.enter(depth,4);return {["valid"]:__ownedValue24(value["valid"],budget,depth+1),["budget"]:__ownedValue6(value["budget"],budget,depth+1),["index"]:__ownedValue6(value["index"],budget,depth+1)};}
function __ownedValue14(value,budget,depth){budget.enter(depth,4);return {["width"]:__ownedValue4(value["width"],budget,depth+1),["start"]:__ownedValue15(value["start"],budget,depth+1),["end"]:__ownedValue15(value["end"],budget,depth+1)};}
function __ownedValue2(value,budget,depth){budget.enter(depth,4);return {["widths"]:__ownedValue3(value["widths"],budget,depth+1),["flags"]:__ownedValue5(value["flags"],budget,depth+1),["advances"]:__ownedValue7(value["advances"],budget,depth+1),["startExtras"]:__ownedValue8(value["startExtras"],budget,depth+1),["graphemeStartExtras"]:__ownedValue9(value["graphemeStartExtras"],budget,depth+1),["endTrims"]:__ownedValue8(value["endTrims"],budget,depth+1),["overflowTrims"]:__ownedValue8(value["overflowTrims"],budget,depth+1),["insideExtras"]:__ownedValue8(value["insideExtras"],budget,depth+1),["fillExtras"]:__ownedValue8(value["fillExtras"],budget,depth+1)};}
function __ownedValue24(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue23(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __ownedValue4(value,budget,depth){budget.enter(depth,12);return {F64Bits:__dfBits(value).toString()};}
function __ownedValue10(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue6(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["prepare",__ownedValue0],["count_lines",__ownedValue11],["lines",__ownedValue12],["stats",__ownedValue16],["layout",__ownedValue18],["line",__ownedValue20],["count_prepared",__ownedValue11],["numeric",__ownedValue22],["ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987",__ownedValue4],["ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02",__ownedValue8],["ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d",__ownedValue6],["ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db",__ownedValue24],["ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5",__ownedValue24],["ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5",__ownedValue24],["ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63",__ownedValue24],["ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8",__ownedValue25],["ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58",__ownedValue26],["ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55",__ownedValue0],["ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13",__ownedValue24],["ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4",__ownedValue4],["ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e",__ownedValue4],["ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45",__ownedValue15],["ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a",__ownedValue27],["ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4",__ownedValue28],["ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f",__ownedValue14],["ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585",__ownedValue20],["ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021",__ownedValue29],["ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8",__ownedValue17],["ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373",__ownedValue16],["ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e",__ownedValue12],["ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899",__ownedValue27],["ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf",__ownedValue30],["ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f",__ownedValue31],["ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6",__ownedValue11],["ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28",__ownedValue18]]));
function __wireValue8(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue6(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue7(reader);reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue2(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue22(reader);reader.finish(end);return value;}
function __wireValue31(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue22(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue53(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue54(reader);reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue3(reader);reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue5(reader);reader.finish(end);return value;}
function __wireValue41(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue5(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue27(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue31(reader)};reader.finish(end);return value;}
function __wireValue42(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue48(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue49(reader)};reader.finish(end);return value;}
function __wireValue45(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["count"]:__wireValue20(reader),["index"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value={["cursor"]:__wireValue15(reader),["stats"]:__wireValue16(reader),["done"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue37(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["c"]:__wireValue15(reader)};reader.finish(end);return value;}
function __wireValue40(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["maximum"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue44(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["fit"]:__wireValue3(reader),["i"]:__wireValue5(reader),["s"]:__wireValue20(reader)};reader.finish(end);return value;}
function __wireValue32(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["fit"]:__wireValue3(reader),["s"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue46(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["i"]:__wireValue5(reader),["atStart"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["i"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["d"]:__wireValue1(reader),["maximum"]:__wireValue5(reader),["advance"]:__wireValue7(reader),["s"]:__wireValue24(reader)};reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value={["data"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["budget"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue51(reader){const end=reader.frame();const value={["data"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["cursor"]:__wireValue15(reader),["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue55(reader){const end=reader.frame();const value={["data"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["maximum"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue50(reader){const end=reader.frame();const value={["data"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["width"]:__wireValue3(reader),["lineHeight"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["data"]:__wireValue1(reader),["epsilon"]:__wireValue3(reader),["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue36(reader){const end=reader.frame();const value={["index"]:__wireValue5(reader),["width"]:__wireValue3(reader),["done"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const value={["index"]:__wireValue5(reader),["width"]:__wireValue3(reader),["trimmed"]:__wireValue3(reader),["end"]:__wireValue15(reader),["result"]:__wireValue3(reader),["done"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue49(reader){const end=reader.frame();const value={["lineCount"]:__wireValue5(reader),["height"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value={["lineCount"]:__wireValue5(reader),["maxLineWidth"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value={["lines"]:__wireValue5(reader),["width"]:__wireValue3(reader),["content"]:__wireValue17(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={["p"]:__wireValue12(reader),["c"]:__wireValue15(reader),["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue47(reader){const end=reader.frame();const value={["p"]:__wireValue12(reader),["width"]:__wireValue3(reader),["lineHeight"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value={["p"]:__wireValue12(reader),["width"]:__wireValue3(reader),["w"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value={["p"]:__wireValue12(reader),["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue43(reader){const end=reader.frame();const value={["p"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["prepared"]:__wireValue12(reader),["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value={["segment"]:__wireValue5(reader),["grapheme"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["valid"]:__wireValue17(reader),["budget"]:__wireValue5(reader),["index"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value={["width"]:__wireValue3(reader),["start"]:__wireValue15(reader),["end"]:__wireValue15(reader)};reader.finish(end);return value;}
function __wireValue38(reader){const end=reader.frame();const value={["width"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["widths"]:__wireValue2(reader),["flags"]:__wireValue4(reader),["advances"]:__wireValue6(reader),["startExtras"]:__wireValue7(reader),["graphemeStartExtras"]:__wireValue8(reader),["endTrims"]:__wireValue7(reader),["overflowTrims"]:__wireValue7(reader),["insideExtras"]:__wireValue7(reader),["fillExtras"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue39(reader){const end=reader.frame();const value={["xs"]:__wireValue7(reader),["i"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value={["xs"]:__wireValue7(reader),["n"]:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue52(reader){const end=reader.frame();const value={["xs"]:__wireValue53(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["xs"]:__wireValue2(reader),["es"]:__wireValue7(reader),["fit"]:__wireValue3(reader),["s"]:__wireValue19(reader)};reader.finish(end);return value;}
function __wireValue35(reader){const end=reader.frame();const value={["xs"]:__wireValue2(reader),["start"]:__wireValue5(reader),["width"]:__wireValue3(reader),["fit"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue34(reader){const end=reader.frame();const value={["xs"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue54(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={F64Bits:reader.wide().toString()};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["count_lines",[__wireValue0,__wireValue9]],["count_prepared",[__wireValue11,__wireValue9]],["ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021",[__wireValue13,__wireValue14]],["ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf",[__wireValue18,__wireValue19]],["ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f",[__wireValue21,__wireValue22]],["ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8",[__wireValue23,__wireValue24]],["ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e",[__wireValue25,__wireValue26]],["ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02",[__wireValue28,__wireValue7]],["ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63",[__wireValue29,__wireValue17]],["ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585",[__wireValue21,__wireValue30]],["ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e",[__wireValue25,__wireValue3]],["ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4",[__wireValue32,__wireValue33]],["ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5",[__wireValue34,__wireValue17]],["ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6",[__wireValue25,__wireValue9]],["ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8",[__wireValue25,__wireValue16]],["ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899",[__wireValue35,__wireValue36]],["ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45",[__wireValue37,__wireValue15]],["ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a",[__wireValue35,__wireValue36]],["ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4",[__wireValue38,__wireValue3]],["ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d",[__wireValue28,__wireValue5]],["ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987",[__wireValue39,__wireValue3]],["ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58",[__wireValue40,__wireValue41]],["ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55",[__wireValue40,__wireValue42]],["ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13",[__wireValue43,__wireValue17]],["ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f",[__wireValue44,__wireValue20]],["ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373",[__wireValue25,__wireValue45]],["ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db",[__wireValue46,__wireValue17]],["ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5",[__wireValue28,__wireValue17]],["ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28",[__wireValue47,__wireValue48]],["layout",[__wireValue50,__wireValue48]],["line",[__wireValue51,__wireValue30]],["lines",[__wireValue0,__wireValue26]],["numeric",[__wireValue52,__wireValue53]],["prepare",[__wireValue55,__wireValue42]],["stats",[__wireValue0,__wireValue45]]]));

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
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture5(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture6(value[i],budget,depth+1);return out;}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture1(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture14(value[i],budget,depth+1);return out;}
function __privateCapture21(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture14(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture22(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture23(value[i],budget,depth+1);return out;}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture2(value[i],budget,depth+1);return out;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture4(value[i],budget,depth+1);return out;}
function __privateCapture26(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture4(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture13(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture20(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture21(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture9(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture18(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture19(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture17(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture4(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture10(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture30(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"count")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}return {["count"]:__privateCapture31(value["count"],budget,depth+1),["index"]:__privateCapture4(value["index"],budget,depth+1)};}
function __privateCapture29(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"cursor")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"stats")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"done")){throw Error('invalid value for wire schema');}return {["cursor"]:__privateCapture15(value["cursor"],budget,depth+1),["stats"]:__privateCapture17(value["stats"],budget,depth+1),["done"]:__privateCapture24(value["done"],budget,depth+1)};}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"data")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"epsilon")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"budget")){throw Error('invalid value for wire schema');}return {["data"]:__privateCapture0(value["data"],budget,depth+1),["epsilon"]:__privateCapture2(value["epsilon"],budget,depth+1),["budget"]:__privateCapture4(value["budget"],budget,depth+1)};}
function __privateCapture27(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"done")){throw Error('invalid value for wire schema');}return {["index"]:__privateCapture4(value["index"],budget,depth+1),["width"]:__privateCapture2(value["width"],budget,depth+1),["done"]:__privateCapture24(value["done"],budget,depth+1)};}
function __privateCapture28(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"trimmed")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"end")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"result")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"done")){throw Error('invalid value for wire schema');}return {["index"]:__privateCapture4(value["index"],budget,depth+1),["width"]:__privateCapture2(value["width"],budget,depth+1),["trimmed"]:__privateCapture2(value["trimmed"],budget,depth+1),["end"]:__privateCapture15(value["end"],budget,depth+1),["result"]:__privateCapture2(value["result"],budget,depth+1),["done"]:__privateCapture24(value["done"],budget,depth+1)};}
function __privateCapture19(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"lineCount")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"height")){throw Error('invalid value for wire schema');}return {["lineCount"]:__privateCapture4(value["lineCount"],budget,depth+1),["height"]:__privateCapture2(value["height"],budget,depth+1)};}
function __privateCapture17(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"lineCount")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"maxLineWidth")){throw Error('invalid value for wire schema');}return {["lineCount"]:__privateCapture4(value["lineCount"],budget,depth+1),["maxLineWidth"]:__privateCapture2(value["maxLineWidth"],budget,depth+1)};}
function __privateCapture31(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"lines")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"content")){throw Error('invalid value for wire schema');}return {["lines"]:__privateCapture4(value["lines"],budget,depth+1),["width"]:__privateCapture2(value["width"],budget,depth+1),["content"]:__privateCapture24(value["content"],budget,depth+1)};}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"segment")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"grapheme")){throw Error('invalid value for wire schema');}return {["segment"]:__privateCapture4(value["segment"],budget,depth+1),["grapheme"]:__privateCapture4(value["grapheme"],budget,depth+1)};}
function __privateCapture25(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"valid")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"budget")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"index")){throw Error('invalid value for wire schema');}return {["valid"]:__privateCapture24(value["valid"],budget,depth+1),["budget"]:__privateCapture4(value["budget"],budget,depth+1),["index"]:__privateCapture4(value["index"],budget,depth+1)};}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"width")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"start")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"end")){throw Error('invalid value for wire schema');}return {["width"]:__privateCapture2(value["width"],budget,depth+1),["start"]:__privateCapture15(value["start"],budget,depth+1),["end"]:__privateCapture15(value["end"],budget,depth+1)};}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==9){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"widths")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"flags")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"advances")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"startExtras")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"graphemeStartExtras")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"endTrims")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"overflowTrims")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"insideExtras")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"fillExtras")){throw Error('invalid value for wire schema');}return {["widths"]:__privateCapture1(value["widths"],budget,depth+1),["flags"]:__privateCapture3(value["flags"],budget,depth+1),["advances"]:__privateCapture5(value["advances"],budget,depth+1),["startExtras"]:__privateCapture6(value["startExtras"],budget,depth+1),["graphemeStartExtras"]:__privateCapture7(value["graphemeStartExtras"],budget,depth+1),["endTrims"]:__privateCapture6(value["endTrims"],budget,depth+1),["overflowTrims"]:__privateCapture6(value["overflowTrims"],budget,depth+1),["insideExtras"]:__privateCapture6(value["insideExtras"],budget,depth+1),["fillExtras"]:__privateCapture6(value["fillExtras"],budget,depth+1)};}
function __privateCapture24(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture23(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return bits===0?0:bits;}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);const result=__dfCapture(value);budget.add(8);return result;}
function __privateCapture10(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateWireValue7(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue5(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue6(reader);reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue1(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue16(reader);reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue16(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue28(reader);reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue2(reader);reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue4(reader);reader.finish(end);return value;}
function __privateWireValue38(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue4(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue23(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue24(reader)};reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue21(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue19(reader)};reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue10(reader)}:{Ok:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue51(reader){const end=reader.frame();const value={["count"]:__privateWireValue52(reader),["index"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue49(reader){const end=reader.frame();const value={["cursor"]:__privateWireValue17(reader),["stats"]:__privateWireValue19(reader),["done"]:__privateWireValue32(reader)};reader.finish(end);return value;}
function __privateWireValue43(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["c"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue39(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["maximum"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue54(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["fit"]:__privateWireValue2(reader),["i"]:__privateWireValue4(reader),["s"]:__privateWireValue52(reader)};reader.finish(end);return value;}
function __privateWireValue47(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["fit"]:__privateWireValue2(reader),["s"]:__privateWireValue46(reader)};reader.finish(end);return value;}
function __privateWireValue33(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["i"]:__privateWireValue4(reader),["atStart"]:__privateWireValue32(reader)};reader.finish(end);return value;}
function __privateWireValue31(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["i"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue37(reader){const end=reader.frame();const value={["d"]:__privateWireValue0(reader),["maximum"]:__privateWireValue4(reader),["advance"]:__privateWireValue6(reader),["s"]:__privateWireValue36(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["data"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["budget"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["data"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["cursor"]:__privateWireValue17(reader),["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue11(reader){const end=reader.frame();const value={["data"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["maximum"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value={["data"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["width"]:__privateWireValue2(reader),["lineHeight"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value={["data"]:__privateWireValue0(reader),["epsilon"]:__privateWireValue2(reader),["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue44(reader){const end=reader.frame();const value={["index"]:__privateWireValue4(reader),["width"]:__privateWireValue2(reader),["done"]:__privateWireValue32(reader)};reader.finish(end);return value;}
function __privateWireValue46(reader){const end=reader.frame();const value={["index"]:__privateWireValue4(reader),["width"]:__privateWireValue2(reader),["trimmed"]:__privateWireValue2(reader),["end"]:__privateWireValue17(reader),["result"]:__privateWireValue2(reader),["done"]:__privateWireValue32(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["lineCount"]:__privateWireValue4(reader),["height"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value={["lineCount"]:__privateWireValue4(reader),["maxLineWidth"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue52(reader){const end=reader.frame();const value={["lines"]:__privateWireValue4(reader),["width"]:__privateWireValue2(reader),["content"]:__privateWireValue32(reader)};reader.finish(end);return value;}
function __privateWireValue48(reader){const end=reader.frame();const value={["p"]:__privateWireValue9(reader),["c"]:__privateWireValue17(reader),["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue55(reader){const end=reader.frame();const value={["p"]:__privateWireValue9(reader),["width"]:__privateWireValue2(reader),["lineHeight"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue50(reader){const end=reader.frame();const value={["p"]:__privateWireValue9(reader),["width"]:__privateWireValue2(reader),["w"]:__privateWireValue49(reader)};reader.finish(end);return value;}
function __privateWireValue42(reader){const end=reader.frame();const value={["p"]:__privateWireValue9(reader),["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue40(reader){const end=reader.frame();const value={["p"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value={["prepared"]:__privateWireValue9(reader),["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value={["segment"]:__privateWireValue4(reader),["grapheme"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue36(reader){const end=reader.frame();const value={["valid"]:__privateWireValue32(reader),["budget"]:__privateWireValue4(reader),["index"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["width"]:__privateWireValue2(reader),["start"]:__privateWireValue17(reader),["end"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue41(reader){const end=reader.frame();const value={["width"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value={["widths"]:__privateWireValue1(reader),["flags"]:__privateWireValue3(reader),["advances"]:__privateWireValue5(reader),["startExtras"]:__privateWireValue6(reader),["graphemeStartExtras"]:__privateWireValue7(reader),["endTrims"]:__privateWireValue6(reader),["overflowTrims"]:__privateWireValue6(reader),["insideExtras"]:__privateWireValue6(reader),["fillExtras"]:__privateWireValue6(reader)};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value={["xs"]:__privateWireValue6(reader),["i"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue35(reader){const end=reader.frame();const value={["xs"]:__privateWireValue6(reader),["n"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["xs"]:__privateWireValue27(reader)};reader.finish(end);return value;}
function __privateWireValue53(reader){const end=reader.frame();const value={["xs"]:__privateWireValue1(reader),["es"]:__privateWireValue6(reader),["fit"]:__privateWireValue2(reader),["s"]:__privateWireValue51(reader)};reader.finish(end);return value;}
function __privateWireValue45(reader){const end=reader.frame();const value={["xs"]:__privateWireValue1(reader),["start"]:__privateWireValue4(reader),["width"]:__privateWireValue2(reader),["fit"]:__privateWireValue2(reader)};reader.finish(end);return value;}
function __privateWireValue34(reader){const end=reader.frame();const value={["xs"]:__privateWireValue1(reader)};reader.finish(end);return value;}
function __privateWireValue32(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value=__dfFromBits(reader.wide());reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue5(value.Some,budget,depth+1)};}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue6(value[i],budget,depth+1);return out;}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue1(value.Some,budget,depth+1)};}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue14(value[i],budget,depth+1);return out;}
function __compiledOwnedValue21(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue14(value.Some,budget,depth+1)};}
function __compiledOwnedValue22(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue23(value[i],budget,depth+1);return out;}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue2(value[i],budget,depth+1);return out;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue4(value[i],budget,depth+1);return out;}
function __compiledOwnedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue4(value.Some,budget,depth+1)};}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue13(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue20(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue21(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue9(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue18(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue19(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue17(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue4(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue10(value.Err,budget,depth+1)};}
function __compiledOwnedValue30(value,budget,depth){budget.enter(depth,4);return {["count"]:__compiledOwnedValue31(value["count"],budget,depth+1),["index"]:__compiledOwnedValue4(value["index"],budget,depth+1)};}
function __compiledOwnedValue29(value,budget,depth){budget.enter(depth,4);return {["cursor"]:__compiledOwnedValue15(value["cursor"],budget,depth+1),["stats"]:__compiledOwnedValue17(value["stats"],budget,depth+1),["done"]:__compiledOwnedValue24(value["done"],budget,depth+1)};}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,4);return {["data"]:__compiledOwnedValue0(value["data"],budget,depth+1),["epsilon"]:__compiledOwnedValue2(value["epsilon"],budget,depth+1),["budget"]:__compiledOwnedValue4(value["budget"],budget,depth+1)};}
function __compiledOwnedValue27(value,budget,depth){budget.enter(depth,4);return {["index"]:__compiledOwnedValue4(value["index"],budget,depth+1),["width"]:__compiledOwnedValue2(value["width"],budget,depth+1),["done"]:__compiledOwnedValue24(value["done"],budget,depth+1)};}
function __compiledOwnedValue28(value,budget,depth){budget.enter(depth,4);return {["index"]:__compiledOwnedValue4(value["index"],budget,depth+1),["width"]:__compiledOwnedValue2(value["width"],budget,depth+1),["trimmed"]:__compiledOwnedValue2(value["trimmed"],budget,depth+1),["end"]:__compiledOwnedValue15(value["end"],budget,depth+1),["result"]:__compiledOwnedValue2(value["result"],budget,depth+1),["done"]:__compiledOwnedValue24(value["done"],budget,depth+1)};}
function __compiledOwnedValue19(value,budget,depth){budget.enter(depth,4);return {["lineCount"]:__compiledOwnedValue4(value["lineCount"],budget,depth+1),["height"]:__compiledOwnedValue2(value["height"],budget,depth+1)};}
function __compiledOwnedValue17(value,budget,depth){budget.enter(depth,4);return {["lineCount"]:__compiledOwnedValue4(value["lineCount"],budget,depth+1),["maxLineWidth"]:__compiledOwnedValue2(value["maxLineWidth"],budget,depth+1)};}
function __compiledOwnedValue31(value,budget,depth){budget.enter(depth,4);return {["lines"]:__compiledOwnedValue4(value["lines"],budget,depth+1),["width"]:__compiledOwnedValue2(value["width"],budget,depth+1),["content"]:__compiledOwnedValue24(value["content"],budget,depth+1)};}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,4);return {["segment"]:__compiledOwnedValue4(value["segment"],budget,depth+1),["grapheme"]:__compiledOwnedValue4(value["grapheme"],budget,depth+1)};}
function __compiledOwnedValue25(value,budget,depth){budget.enter(depth,4);return {["valid"]:__compiledOwnedValue24(value["valid"],budget,depth+1),["budget"]:__compiledOwnedValue4(value["budget"],budget,depth+1),["index"]:__compiledOwnedValue4(value["index"],budget,depth+1)};}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,4);return {["width"]:__compiledOwnedValue2(value["width"],budget,depth+1),["start"]:__compiledOwnedValue15(value["start"],budget,depth+1),["end"]:__compiledOwnedValue15(value["end"],budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,4);return {["widths"]:__compiledOwnedValue1(value["widths"],budget,depth+1),["flags"]:__compiledOwnedValue3(value["flags"],budget,depth+1),["advances"]:__compiledOwnedValue5(value["advances"],budget,depth+1),["startExtras"]:__compiledOwnedValue6(value["startExtras"],budget,depth+1),["graphemeStartExtras"]:__compiledOwnedValue7(value["graphemeStartExtras"],budget,depth+1),["endTrims"]:__compiledOwnedValue6(value["endTrims"],budget,depth+1),["overflowTrims"]:__compiledOwnedValue6(value["overflowTrims"],budget,depth+1),["insideExtras"]:__compiledOwnedValue6(value["insideExtras"],budget,depth+1),["fillExtras"]:__compiledOwnedValue6(value["fillExtras"],budget,depth+1)};}
function __compiledOwnedValue24(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue23(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,12);return {F64Bits:__dfBits(value).toString()};}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite5(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite6(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite1(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite14(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite21(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite14(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite22(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite23(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite2(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite4(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite26(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite4(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite13(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite20(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite21(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite9(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite18(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite19(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite17(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite4(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite10(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite30(writer,value,compact){const frame=writer.openFrame();__privateWireWrite31(writer,value["count"],compact);__privateWireWrite4(writer,value["index"],compact);writer.closeFrame(frame);}
function __privateWireWrite29(writer,value,compact){const frame=writer.openFrame();__privateWireWrite15(writer,value["cursor"],compact);__privateWireWrite17(writer,value["stats"],compact);__privateWireWrite24(writer,value["done"],compact);writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();__privateWireWrite0(writer,value["data"],compact);__privateWireWrite2(writer,value["epsilon"],compact);__privateWireWrite4(writer,value["budget"],compact);writer.closeFrame(frame);}
function __privateWireWrite27(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["index"],compact);__privateWireWrite2(writer,value["width"],compact);__privateWireWrite24(writer,value["done"],compact);writer.closeFrame(frame);}
function __privateWireWrite28(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["index"],compact);__privateWireWrite2(writer,value["width"],compact);__privateWireWrite2(writer,value["trimmed"],compact);__privateWireWrite15(writer,value["end"],compact);__privateWireWrite2(writer,value["result"],compact);__privateWireWrite24(writer,value["done"],compact);writer.closeFrame(frame);}
function __privateWireWrite19(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["lineCount"],compact);__privateWireWrite2(writer,value["height"],compact);writer.closeFrame(frame);}
function __privateWireWrite17(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["lineCount"],compact);__privateWireWrite2(writer,value["maxLineWidth"],compact);writer.closeFrame(frame);}
function __privateWireWrite31(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["lines"],compact);__privateWireWrite2(writer,value["width"],compact);__privateWireWrite24(writer,value["content"],compact);writer.closeFrame(frame);}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["segment"],compact);__privateWireWrite4(writer,value["grapheme"],compact);writer.closeFrame(frame);}
function __privateWireWrite25(writer,value,compact){const frame=writer.openFrame();__privateWireWrite24(writer,value["valid"],compact);__privateWireWrite4(writer,value["budget"],compact);__privateWireWrite4(writer,value["index"],compact);writer.closeFrame(frame);}
function __privateWireWrite14(writer,value,compact){const frame=writer.openFrame();__privateWireWrite2(writer,value["width"],compact);__privateWireWrite15(writer,value["start"],compact);__privateWireWrite15(writer,value["end"],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["widths"],compact);__privateWireWrite3(writer,value["flags"],compact);__privateWireWrite5(writer,value["advances"],compact);__privateWireWrite6(writer,value["startExtras"],compact);__privateWireWrite7(writer,value["graphemeStartExtras"],compact);__privateWireWrite6(writer,value["endTrims"],compact);__privateWireWrite6(writer,value["overflowTrims"],compact);__privateWireWrite6(writer,value["insideExtras"],compact);__privateWireWrite6(writer,value["fillExtras"],compact);writer.closeFrame(frame);}
function __privateWireWrite24(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite23(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();writer.wide(__dfBits(value));writer.closeFrame(frame);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'record',fields:["widths","flags","advances","startExtras","graphemeStartExtras","endTrims","overflowTrims","insideExtras","fillExtras"],patterns:[{bytes:4,label:"record",children:[1,3,5,6,7,6,6,6,6],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["widths"]:values[0],["flags"]:values[1],["advances"]:values[2],["startExtras"]:values[3],["graphemeStartExtras"]:values[4],["endTrims"]:values[5],["overflowTrims"]:values[6],["insideExtras"]:values[7],["fillExtras"]:values[8]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[2],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"f64",scalar:__privateCapture2},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[4],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"u32",scalar:__privateCapture4},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[6],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[1],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[5],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[9],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["data","epsilon","budget"],patterns:[{bytes:4,label:"record",children:[0,2,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["data"]:values[0],["epsilon"]:values[1],["budget"]:values[2]})}]},{kind:"string",scalar:__privateCapture10},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[4],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[13],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[14],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["width","start","end"],patterns:[{bytes:4,label:"record",children:[2,15,15],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["width"]:values[0],["start"]:values[1],["end"]:values[2]})}]},{kind:'record',fields:["segment","grapheme"],patterns:[{bytes:4,label:"record",children:[4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["segment"]:values[0],["grapheme"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[17],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["lineCount","maxLineWidth"],patterns:[{bytes:4,label:"record",children:[4,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["lineCount"]:values[0],["maxLineWidth"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[19],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'record',fields:["lineCount","height"],patterns:[{bytes:4,label:"record",children:[4,2],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["lineCount"]:values[0],["height"]:values[1]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[21],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[10],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[14],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[23],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"f32",scalar:__privateCapture23},{kind:"bool",scalar:__privateCapture24},{kind:'record',fields:["valid","budget","index"],patterns:[{bytes:4,label:"record",children:[24,4,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["valid"]:values[0],["budget"]:values[1],["index"]:values[2]})}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'record',fields:["index","width","done"],patterns:[{bytes:4,label:"record",children:[4,2,24],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["index"]:values[0],["width"]:values[1],["done"]:values[2]})}]},{kind:'record',fields:["index","width","trimmed","end","result","done"],patterns:[{bytes:4,label:"record",children:[4,2,2,15,2,24],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["index"]:values[0],["width"]:values[1],["trimmed"]:values[2],["end"]:values[3],["result"]:values[4],["done"]:values[5]})}]},{kind:'record',fields:["cursor","stats","done"],patterns:[{bytes:4,label:"record",children:[15,17,24],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["cursor"]:values[0],["stats"]:values[1],["done"]:values[2]})}]},{kind:'record',fields:["count","index"],patterns:[{bytes:4,label:"record",children:[31,4],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["count"]:values[0],["index"]:values[1]})}]},{kind:'record',fields:["lines","width","content"],patterns:[{bytes:4,label:"record",children:[4,2,24],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["lines"]:values[0],["width"]:values[1],["content"]:values[2]})}]}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,4);return r[0](__reduceValue1(value["widths"],r,b,d+1,c),__reduceValue3(value["flags"],r,b,d+1,c),__reduceValue5(value["advances"],r,b,d+1,c),__reduceValue6(value["startExtras"],r,b,d+1,c),__reduceValue7(value["graphemeStartExtras"],r,b,d+1,c),__reduceValue6(value["endTrims"],r,b,d+1,c),__reduceValue6(value["overflowTrims"],r,b,d+1,c),__reduceValue6(value["insideExtras"],r,b,d+1,c),__reduceValue6(value["fillExtras"],r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[1];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue2(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,12);return r[2]({F64Bits:__dfBits(value).toString()},c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[3];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue4(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,8);return r[4](value,c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[5];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue6(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[6](0,null,c):r[6](1,__reduceValue1(value.Some,r,b,d+1,c),c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[7](0,null,c):r[7](1,__reduceValue5(value.Some,r,b,d+1,c),c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[8](0,__reduceValue9(value.Ok,r,b,d+1,c),c):r[8](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,4);return r[9](__reduceValue0(value["data"],r,b,d+1,c),__reduceValue2(value["epsilon"],r,b,d+1,c),__reduceValue4(value["budget"],r,b,d+1,c),c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,4);b.text(value);return r[10](value,c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[11](0,__reduceValue4(value.Ok,r,b,d+1,c),c):r[11](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[12](0,__reduceValue13(value.Ok,r,b,d+1,c),c):r[12](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[13];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue14(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue14(value,r,b,d,c){b.enter(d,4);return r[14](__reduceValue2(value["width"],r,b,d+1,c),__reduceValue15(value["start"],r,b,d+1,c),__reduceValue15(value["end"],r,b,d+1,c),c);}
function __reduceValue15(value,r,b,d,c){b.enter(d,4);return r[15](__reduceValue4(value["segment"],r,b,d+1,c),__reduceValue4(value["grapheme"],r,b,d+1,c),c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[16](0,__reduceValue17(value.Ok,r,b,d+1,c),c):r[16](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue17(value,r,b,d,c){b.enter(d,4);return r[17](__reduceValue4(value["lineCount"],r,b,d+1,c),__reduceValue2(value["maxLineWidth"],r,b,d+1,c),c);}
function __reduceValue18(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[18](0,__reduceValue19(value.Ok,r,b,d+1,c),c):r[18](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue19(value,r,b,d,c){b.enter(d,4);return r[19](__reduceValue4(value["lineCount"],r,b,d+1,c),__reduceValue2(value["height"],r,b,d+1,c),c);}
function __reduceValue20(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[20](0,__reduceValue21(value.Ok,r,b,d+1,c),c):r[20](1,__reduceValue10(value.Err,r,b,d+1,c),c);}
function __reduceValue21(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[21](0,null,c):r[21](1,__reduceValue14(value.Some,r,b,d+1,c),c);}
function __reduceValue22(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[22];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue23(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue23(value,r,b,d,c){b.enter(d,8);return r[23]({F32Bits:value},c);}
function __reduceValue24(value,r,b,d,c){b.enter(d,5);return r[24](value,c);}
function __reduceValue25(value,r,b,d,c){b.enter(d,4);return r[25](__reduceValue24(value["valid"],r,b,d+1,c),__reduceValue4(value["budget"],r,b,d+1,c),__reduceValue4(value["index"],r,b,d+1,c),c);}
function __reduceValue26(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[26](0,null,c):r[26](1,__reduceValue4(value.Some,r,b,d+1,c),c);}
function __reduceValue27(value,r,b,d,c){b.enter(d,4);return r[27](__reduceValue4(value["index"],r,b,d+1,c),__reduceValue2(value["width"],r,b,d+1,c),__reduceValue24(value["done"],r,b,d+1,c),c);}
function __reduceValue28(value,r,b,d,c){b.enter(d,4);return r[28](__reduceValue4(value["index"],r,b,d+1,c),__reduceValue2(value["width"],r,b,d+1,c),__reduceValue2(value["trimmed"],r,b,d+1,c),__reduceValue15(value["end"],r,b,d+1,c),__reduceValue2(value["result"],r,b,d+1,c),__reduceValue24(value["done"],r,b,d+1,c),c);}
function __reduceValue29(value,r,b,d,c){b.enter(d,4);return r[29](__reduceValue15(value["cursor"],r,b,d+1,c),__reduceValue17(value["stats"],r,b,d+1,c),__reduceValue24(value["done"],r,b,d+1,c),c);}
function __reduceValue30(value,r,b,d,c){b.enter(d,4);return r[30](__reduceValue31(value["count"],r,b,d+1,c),__reduceValue4(value["index"],r,b,d+1,c),c);}
function __reduceValue31(value,r,b,d,c){b.enter(d,4);return r[31](__reduceValue4(value["lines"],r,b,d+1,c),__reduceValue2(value["width"],r,b,d+1,c),__reduceValue24(value["content"],r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,3,5,6,7,6,6,6,6]),"fields":Object.freeze(["widths","flags","advances","startExtras","graphemeStartExtras","endTrims","overflowTrims","insideExtras","fillExtras"]),"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}),Object.freeze({"children":Object.freeze([2]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"f64"}),Object.freeze({"children":Object.freeze([4]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([6]),"kind":"list"}),Object.freeze({"children":Object.freeze([1]),"kind":"option"}),Object.freeze({"children":Object.freeze([5]),"kind":"option"}),Object.freeze({"children":Object.freeze([9,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([0,2,4]),"fields":Object.freeze(["data","epsilon","budget"]),"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([4,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([13,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([14]),"kind":"list"}),Object.freeze({"children":Object.freeze([2,15,15]),"fields":Object.freeze(["width","start","end"]),"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}),Object.freeze({"children":Object.freeze([4,4]),"fields":Object.freeze(["segment","grapheme"]),"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}),Object.freeze({"children":Object.freeze([17,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([4,2]),"fields":Object.freeze(["lineCount","maxLineWidth"]),"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}),Object.freeze({"children":Object.freeze([19,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([4,2]),"fields":Object.freeze(["lineCount","height"]),"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}),Object.freeze({"children":Object.freeze([21,10]),"kind":"result"}),Object.freeze({"children":Object.freeze([14]),"kind":"option"}),Object.freeze({"children":Object.freeze([23]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([24,4,4]),"fields":Object.freeze(["valid","budget","index"]),"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}),Object.freeze({"children":Object.freeze([4]),"kind":"option"}),Object.freeze({"children":Object.freeze([4,2,24]),"fields":Object.freeze(["index","width","done"]),"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}),Object.freeze({"children":Object.freeze([4,2,2,15,2,24]),"fields":Object.freeze(["index","width","trimmed","end","result","done"]),"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}),Object.freeze({"children":Object.freeze([15,17,24]),"fields":Object.freeze(["cursor","stats","done"]),"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}),Object.freeze({"children":Object.freeze([31,4]),"fields":Object.freeze(["count","index"]),"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}),Object.freeze({"children":Object.freeze([4,2,24]),"fields":Object.freeze(["lines","width","content"]),"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"6a12295ab1a7d1a82257153e77a592e35552995f61ba0e3bb3c6b0e998d0aaec","named":__compiledNamed0(),"root":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":__compiledNamed0(),"root":{"kind":"f64"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture4,__privateWireValue4,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ecfeb978a3522397be254146ef28fe5f3058566b565a7f4962c9131b6b18ae1c","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}},__privateCapture8,__privateWireValue8,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},__privateCapture11,__privateWireValue12,__privateWireWrite11,__compiledOwnedValue11,11,11,__reduceValue11,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"56dc0435d74d48781d7002db784cd2f88c15385d3cd6b708425c161c37cc361c","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}},__privateCapture12,__privateWireValue14,__privateWireWrite12,__compiledOwnedValue12,12,12,__reduceValue12,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"82ec50d2da2c3182aceb5378e08d8b8fe9de60c2be54d6daf5dbdb658955279f","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},__privateCapture16,__privateWireValue18,__privateWireWrite16,__compiledOwnedValue16,16,16,__reduceValue16,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"847cdb58437325b0783e94e7d572b615580b335968d233fd0e1b9879487ce4b2","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}},__privateCapture18,__privateWireValue20,__privateWireWrite18,__compiledOwnedValue18,18,18,__reduceValue18,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"8e9fa024666eb3bfe6ab6049f660e547a12b56772f4ecbff9addcea5a92f3d9a","named":__compiledNamed0(),"root":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},__privateCapture15,__privateWireValue17,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"6dabf0313de1ca25f33127bc080f250697ab4e45b0935d5c06756788a303369f","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}},__privateCapture20,__privateWireValue23,__privateWireWrite20,__compiledOwnedValue20,20,20,__reduceValue20,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"acf4b91a06bec753d55d8da6fe10af423067ce8dec33348ec407148ad1926430","named":__compiledNamed0(),"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},__privateCapture9,__privateWireValue9,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec11Value;function __compiledCodec11(){return __compiledCodec11Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture22,__privateWireValue27,__privateWireWrite22,__compiledOwnedValue22,22,22,__reduceValue22,false,false);}
let __compiledCodec12Value;function __compiledCodec12(){return __compiledCodec12Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"61e29a83d1fd64f316d82cf150eb5ad0405d16e0e326ff56bf3bae4248a89a32","named":__compiledNamed0(),"root":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},__privateCapture6,__privateWireValue6,__privateWireWrite6,__compiledOwnedValue6,6,6,__reduceValue6,false,false);}
let __compiledCodec13Value;function __compiledCodec13(){return __compiledCodec13Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture24,__privateWireValue32,__privateWireWrite24,__compiledOwnedValue24,24,24,__reduceValue24,false,false);}
let __compiledCodec14Value;function __compiledCodec14(){return __compiledCodec14Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"152a8177038a47dcbc6416cb2d7d38cc76c42d7e55613dee4787f2dfb646e9e7","named":__compiledNamed0(),"root":{"element":{"kind":"f64"},"kind":"list"}},__privateCapture1,__privateWireValue1,__privateWireWrite1,__compiledOwnedValue1,1,1,__reduceValue1,false,false);}
let __compiledCodec15Value;function __compiledCodec15(){return __compiledCodec15Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f437e4e468cf5dba7df20a9114414406da37a3ae54ea711140ac1b5956e95082","named":__compiledNamed0(),"root":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}},__privateCapture25,__privateWireValue36,__privateWireWrite25,__compiledOwnedValue25,25,25,__reduceValue25,false,false);}
let __compiledCodec16Value;function __compiledCodec16(){return __compiledCodec16Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"option"}},__privateCapture26,__privateWireValue38,__privateWireWrite26,__compiledOwnedValue26,26,26,__reduceValue26,false,false);}
let __compiledCodec17Value;function __compiledCodec17(){return __compiledCodec17Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"75a4618821d68677bbefcd2dc8914150aecf406a4a3da1ef14cc88b57d83d830","named":__compiledNamed0(),"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}},__privateCapture27,__privateWireValue44,__privateWireWrite27,__compiledOwnedValue27,27,27,__reduceValue27,false,false);}
let __compiledCodec18Value;function __compiledCodec18(){return __compiledCodec18Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"50c3299d4fbe93aa5602b822292acc76ab4400b031152a8c6acd698494f4c7f8","named":__compiledNamed0(),"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}},__privateCapture28,__privateWireValue46,__privateWireWrite28,__compiledOwnedValue28,28,28,__reduceValue28,false,false);}
let __compiledCodec19Value;function __compiledCodec19(){return __compiledCodec19Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"c8de454d504db86ea8f8ef8cc6465494fc0e6efc146d375495b17ba9fb23b767","named":__compiledNamed0(),"root":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}},__privateCapture14,__privateWireValue16,__privateWireWrite14,__compiledOwnedValue14,14,14,__reduceValue14,false,false);}
let __compiledCodec20Value;function __compiledCodec20(){return __compiledCodec20Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"95f1d165952114b4814841922105b86c623e8c07746843b06ad383444f2fa3eb","named":__compiledNamed0(),"root":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}},__privateCapture29,__privateWireValue49,__privateWireWrite29,__compiledOwnedValue29,29,29,__reduceValue29,false,false);}
let __compiledCodec21Value;function __compiledCodec21(){return __compiledCodec21Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"958e0edfe65dde01c97aa1e7b9cb0c065f371a3330a42d473bc79a0491ebfc4f","named":__compiledNamed0(),"root":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},__privateCapture17,__privateWireValue19,__privateWireWrite17,__compiledOwnedValue17,17,17,__reduceValue17,false,false);}
let __compiledCodec22Value;function __compiledCodec22(){return __compiledCodec22Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"542b3f99971053a272b15d88dedbfd32860a89ec2308e87c7bdb1c08c26eae0e","named":__compiledNamed0(),"root":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}},__privateCapture30,__privateWireValue51,__privateWireWrite30,__compiledOwnedValue30,30,30,__reduceValue30,false,false);}
let __compiledCodec23Value;function __compiledCodec23(){return __compiledCodec23Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"3650a28e866fe994c1295f191904faf234c261d3a1a0a1b12bbf12c9e04226a2","named":__compiledNamed0(),"root":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},__privateCapture31,__privateWireValue52,__privateWireWrite31,__compiledOwnedValue31,31,31,__reduceValue31,false,false);}
const __compiledEntries=new Map([["prepare",{index:0,params:[__compiledCodec0,__compiledCodec1,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue11,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["count_lines",{index:1,params:[__compiledCodec0,__compiledCodec1,__compiledCodec1],result:__compiledCodec4,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["lines",{index:2,params:[__compiledCodec0,__compiledCodec1,__compiledCodec1],result:__compiledCodec5,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["stats",{index:3,params:[__compiledCodec0,__compiledCodec1,__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue13,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["layout",{index:4,params:[__compiledCodec0,__compiledCodec1,__compiledCodec1,__compiledCodec1],result:__compiledCodec7,arguments:__privateWireValue22,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["line",{index:5,params:[__compiledCodec0,__compiledCodec1,__compiledCodec8,__compiledCodec1],result:__compiledCodec9,arguments:__privateWireValue25,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["count_prepared",{index:6,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec4,arguments:__privateWireValue26,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["numeric",{index:7,params:[__compiledCodec11],result:__compiledCodec11,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987",{index:8,params:[__compiledCodec12,__compiledCodec2],result:__compiledCodec1,arguments:__privateWireValue30,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02",{index:9,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec12,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d",{index:10,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec2,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db",{index:11,params:[__compiledCodec0,__compiledCodec2,__compiledCodec13],result:__compiledCodec13,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5",{index:12,params:[__compiledCodec0,__compiledCodec2],result:__compiledCodec13,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5",{index:13,params:[__compiledCodec14],result:__compiledCodec13,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63",{index:14,params:[__compiledCodec12,__compiledCodec2],result:__compiledCodec13,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8",{index:15,params:[__compiledCodec0,__compiledCodec2,__compiledCodec12,__compiledCodec15],result:__compiledCodec15,arguments:__privateWireValue37,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58",{index:16,params:[__compiledCodec0,__compiledCodec1,__compiledCodec2],result:__compiledCodec16,arguments:__privateWireValue39,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55",{index:17,params:[__compiledCodec0,__compiledCodec1,__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue39,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13",{index:18,params:[__compiledCodec10],result:__compiledCodec13,arguments:__privateWireValue40,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4",{index:19,params:[__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue41,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e",{index:20,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec1,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45",{index:21,params:[__compiledCodec0,__compiledCodec8],result:__compiledCodec8,arguments:__privateWireValue43,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a",{index:22,params:[__compiledCodec14,__compiledCodec2,__compiledCodec1,__compiledCodec1],result:__compiledCodec17,arguments:__privateWireValue45,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4",{index:23,params:[__compiledCodec0,__compiledCodec1,__compiledCodec18],result:__compiledCodec18,arguments:__privateWireValue47,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f",{index:24,params:[__compiledCodec10,__compiledCodec8,__compiledCodec1],result:__compiledCodec19,arguments:__privateWireValue48,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585",{index:25,params:[__compiledCodec10,__compiledCodec8,__compiledCodec1],result:__compiledCodec9,arguments:__privateWireValue48,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021",{index:26,params:[__compiledCodec10,__compiledCodec1,__compiledCodec20],result:__compiledCodec20,arguments:__privateWireValue50,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8",{index:27,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec21,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373",{index:28,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec6,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e",{index:30,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec5,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899",{index:31,params:[__compiledCodec14,__compiledCodec2,__compiledCodec1,__compiledCodec1],result:__compiledCodec17,arguments:__privateWireValue45,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf",{index:32,params:[__compiledCodec14,__compiledCodec12,__compiledCodec1,__compiledCodec22],result:__compiledCodec22,arguments:__privateWireValue53,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f",{index:33,params:[__compiledCodec0,__compiledCodec1,__compiledCodec2,__compiledCodec23],result:__compiledCodec23,arguments:__privateWireValue54,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false],precondition:null}],["ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6",{index:34,params:[__compiledCodec10,__compiledCodec1],result:__compiledCodec4,arguments:__privateWireValue42,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28",{index:35,params:[__compiledCodec10,__compiledCodec1,__compiledCodec1],result:__compiledCodec7,arguments:__privateWireValue55,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}]]);

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
const __intoOutput7=__representation(metadata.functions[7].result.element,true);
const __intoImplementations=[null,null,null,null,null,null,null,__into7,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){switch(name){case "ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef":throw new Error('temporary storage is internal to a pure invocation');}return functionsInto[name](...args,destination);}
function __prepareFn0(fixed,depth=0){if(depth>=16)return __fn0;let v886;
return function(v883,v884,v885){if(!v886){const v887=__preparedFactories.get(17);v886=v887?v887([fixed[0],fixed[1],fixed[2]],depth+1):__fn17;}
return v886(v883,v884,v885);};}
function __prepareFn1(fixed,depth=0){if(depth>=16)return __fn1;let v892;
return function(v888,v889,v890){const v891=1000000;
if(!v892){const v893=__preparedFactories.get(17);v892=v893?v893([fixed[0],fixed[1],true],depth+1):__fn17;}
const v894=v892(v888,v889,v891);
let v896;if(Object.hasOwn(v894,"Ok")){
const v897=v894["Ok"];
v896=__fn34(v897,v890);}else{
const v898=v894["Err"];
v896=({Err:v898});}
return v896;};}
function __prepareFn2(fixed,depth=0){if(depth>=16)return __fn2;let v903;
return function(v899,v900,v901){const v902=1000000;
if(!v903){const v904=__preparedFactories.get(17);v903=v904?v904([fixed[0],fixed[1],true],depth+1):__fn17;}
const v905=v903(v899,v900,v902);
let v907;if(Object.hasOwn(v905,"Ok")){
const v908=v905["Ok"];
v907=__fn30(v908,v901);}else{
const v909=v905["Err"];
v907=({Err:v909});}
return v907;};}
function __prepareFn3(fixed,depth=0){if(depth>=16)return __fn3;let v914;
return function(v910,v911,v912){const v913=1000000;
if(!v914){const v915=__preparedFactories.get(17);v914=v915?v915([fixed[0],fixed[1],true],depth+1):__fn17;}
const v916=v914(v910,v911,v913);
let v918;if(Object.hasOwn(v916,"Ok")){
const v919=v916["Ok"];
v918=__fn28(v919,v912);}else{
const v920=v916["Err"];
v918=({Err:v920});}
return v918;};}
function __prepareFn4(fixed,depth=0){if(depth>=16)return __fn4;let v926;
return function(v921,v922,v923,v924){const v925=1000000;
if(!v926){const v927=__preparedFactories.get(17);v926=v927?v927([fixed[0],fixed[1],true],depth+1):__fn17;}
const v928=v926(v921,v922,v925);
let v930;if(Object.hasOwn(v928,"Ok")){
const v931=v928["Ok"];
v930=__fn35(v931,v923,v924);}else{
const v932=v928["Err"];
v930=({Err:v932});}
return v930;};}
function __prepareFn5(fixed,depth=0){if(depth>=16)return __fn5;let v938;
return function(v933,v934,v935,v936){const v937=1000000;
if(!v938){const v939=__preparedFactories.get(17);v938=v939?v939([fixed[0],fixed[1],true],depth+1):__fn17;}
const v940=v938(v933,v934,v937);
let v942;if(Object.hasOwn(v940,"Ok")){
const v943=v940["Ok"];
v942=__fn25(v943,v935,v936);}else{
const v944=v940["Err"];
v942=({Err:v944});}
return v942;};}
function __prepareFn6(fixed,depth=0){if(depth>=16)return __fn6;let v947;
return function(v945,v946){if(!v947){const v948=__preparedFactories.get(34);v947=v948?v948([fixed[0],fixed[1]],depth+1):__fn34;}
return v947(v945,v946);};}
function __prepareFn15(fixed,depth=0){if(depth>=16)return __fn15;const v1019=fixed[3];let v1018=false,v1017;
const v1023=fixed[0]&&fixed[3];let v1022=false,v1021;
const v1030=fixed[0]&&fixed[3];let v1029=false,v1028;
const v1036=fixed[2];let v1035=false,v1034;
const v1043=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1042=false,v1041;
const v1091=fixed[1]&&fixed[2]&&fixed[3];let v1090=false,v1089;
return function(v1012,v1013,v1014,v1015){let v1016;if(v1019&&v1018){v1016=v1017;}else{
v1016=v1015["index"];if(v1019){v1017=v1016;v1018=true;}}
let v1020;if(v1023&&v1022){v1020=v1021;}else{
const v1024=v1012["flags"];
const v1025=v1016;
let v1026;if(v1025<v1024.length){v1026=v1024[v1025];}else{
v1026=256;}
v1020=v1026;if(v1023){v1021=v1020;v1022=true;}}
let v1027;if(v1030&&v1029){v1027=v1028;}else{
const v1031=v1020;
const v1032=15;
v1027=(((v1031)&(v1032))>>>0);if(v1030){v1028=v1027;v1029=true;}}
let v1033;if(v1036&&v1035){v1033=v1034;}else{
let v1037;if(Object.hasOwn(v1014,"Some")){
const v1038=v1014["Some"];
v1037=(v1038).length;}else{
const v1039=null;
v1037=0;}
v1033=v1037;if(v1036){v1034=v1033;v1035=true;}}
let v1040;if(v1043&&v1042){v1040=v1041;}else{
const v1044=v1015["valid"];
let v1045=v1044;if(v1045){
const v1046=v1020;
const v1047=255;
v1045=((v1046) <= (v1047));}
const v1048=v1045;
let v1049=v1048;if(v1049){
const v1050=v1027;
const v1051=2;
v1049=((v1050) <= (v1051));}
const v1052=v1049;
let v1053=v1052;if(v1053){
const v1054=v1020;
const v1055=32;
const v1056=(((v1054)&(v1055))>>>0);
const v1057=0;
v1053=(v1056===v1057);}
const v1058=v1053;
let v1059=v1058;if(v1059){
let v1060;if(Object.hasOwn(v1014,"Some")){
const v1061=v1014["Some"];
const v1062=v1061.length;
const v1063=0;
const v1064=((v1062) > (v1063));
let v1065=v1064;if(v1065){
const v1066=v1061.length;
const v1067=1000000;
v1065=((v1066) <= (v1067));}
const v1068=v1065;
let v1069=v1068;if(v1069){
const v1070=(v1061).length;
v1069=((v1070) <= (v1013));}
const v1071=v1069;
let v1072=v1071;if(v1072){
v1072=__fn13(v1061);}
v1060=v1072;}else{
const v1073=null;
v1060=true;}
v1059=v1060;}
const v1074=v1059;
let v1075=v1074;if(v1075){
const v1076=v1016;
const v1077=__fn9(v1012,v1076);
let v1078;if(Object.hasOwn(v1077,"Some")){
const v1079=v1077["Some"];
let v1080;if(Object.hasOwn(v1014,"Some")){
const v1081=v1014["Some"];
const v1082=v1079.length;
const v1083=v1081.length;
const v1084=((v1082) === (v1083));
let v1085=v1084;if(v1085){
v1085=__fn13(v1079);}
v1080=v1085;}else{
const v1086=null;
v1080=false;}
v1078=v1080;}else{
const v1087=null;
v1078=true;}
v1075=v1078;}
v1040=v1075;if(v1043){v1041=v1040;v1042=true;}}
let v1088;if(v1091&&v1090){v1088=v1089;}else{
const v1092=v1033;
const v1093=v1015["budget"];
const v1094=(((v1013) - (v1093)) >>> 0);
v1088=((v1092) <= (v1094));if(v1091){v1089=v1088;v1090=true;}}
const v1095=v1040;
let v1096=v1095;if(v1096){
v1096=v1088;}
const v1097=v1096;
let v1098;if(v1088){
const v1099=v1015["budget"];
const v1100=v1033;
v1098=(((v1099) + (v1100)) >>> 0);}else{
v1098=v1015["budget"];}
const v1101=v1098;
const v1102=v1016;
const v1103=1;
const v1104=(((v1102) + (v1103)) >>> 0);
return ({["valid"]:v1097,["budget"]:v1101,["index"]:v1104});};}
function __prepareFn16(fixed,depth=0){if(depth>=16)return __fn16;const v1111=fixed[0]&&fixed[1]&&fixed[2];let v1110=false,v1109;
const v1140=fixed[0];let v1139=false,v1138;
const v1144=fixed[0];let v1143=false,v1142;
const v1209=fixed[0]&&fixed[2];let v1208=false,v1207;
return function(v1105,v1106,v1107){let v1108;if(v1111&&v1110){v1108=v1109;}else{
const v1112=0;
const v1113=(v1107===v1112);
let v1114=v1113;if(!v1114){
const v1115=1000000;
v1114=((v1107) > (v1115));}
const v1116=v1114;
let v1117=v1116;if(!v1117){
const v1118=v1105["widths"];
const v1119=v1118.length;
const v1120=1000000;
v1117=((v1119) > (v1120));}
const v1121=v1117;
let v1122=v1121;if(!v1122){
const v1123=(v1105["widths"]).length;
v1122=((v1123) > (v1107));}
const v1124=v1122;
let v1125=v1124;if(!v1125){
const v1126=v1105["widths"];
const v1127=__fn13(v1126);
const v1128=false;
v1125=(v1127===v1128);}
const v1129=v1125;
let v1130=v1129;if(!v1130){
const v1131=Number.isFinite(__dfNumber(v1106));
const v1132=false;
v1130=(v1131===v1132);}
const v1133=v1130;
let v1134=v1133;if(!v1134){
const v1135=0.0;
v1134=((__dfNumber(v1106)) < (__dfNumber(v1135)));}
v1108=v1134;if(v1111){v1109=v1108;v1110=true;}}
let v1136;if(v1108){
v1136=({None:null});}else{
let v1137;if(v1140&&v1139){v1137=v1138;}else{
v1137=(v1105["widths"]).length;if(v1140){v1138=v1137;v1139=true;}}
let v1141;if(v1144&&v1143){v1141=v1142;}else{
const v1145=v1105["flags"];
const v1146=v1145.length;
const v1147=1000000;
const v1148=((v1146) > (v1147));
let v1149=v1148;if(!v1149){
const v1150=(v1105["flags"]).length;
const v1151=v1137;
v1149=!(v1150===v1151);}
const v1152=v1149;
let v1153=v1152;if(!v1153){
const v1154=v1105["advances"];
const v1155=v1154.length;
const v1156=1000000;
v1153=((v1155) > (v1156));}
const v1157=v1153;
let v1158=v1157;if(!v1158){
const v1159=(v1105["advances"]).length;
const v1160=v1137;
v1158=!(v1159===v1160);}
const v1161=v1158;
let v1162=v1161;if(!v1162){
const v1163=v1105["startExtras"];
const v1164=v1137;
const v1165=__fn14(v1163,v1164);
const v1166=false;
v1162=(v1165===v1166);}
const v1167=v1162;
let v1168=v1167;if(!v1168){
const v1169=v1105["endTrims"];
const v1170=v1137;
const v1171=__fn14(v1169,v1170);
const v1172=false;
v1168=(v1171===v1172);}
const v1173=v1168;
let v1174=v1173;if(!v1174){
const v1175=v1105["overflowTrims"];
const v1176=v1137;
const v1177=__fn14(v1175,v1176);
const v1178=false;
v1174=(v1177===v1178);}
const v1179=v1174;
let v1180=v1179;if(!v1180){
const v1181=v1105["insideExtras"];
const v1182=v1137;
const v1183=__fn14(v1181,v1182);
const v1184=false;
v1180=(v1183===v1184);}
const v1185=v1180;
let v1186=v1185;if(!v1186){
const v1187=v1105["fillExtras"];
const v1188=v1137;
const v1189=__fn14(v1187,v1188);
const v1190=false;
v1186=(v1189===v1190);}
const v1191=v1186;
let v1192=v1191;if(!v1192){
const v1193=v1105["graphemeStartExtras"];
let v1194;if(Object.hasOwn(v1193,"Some")){
const v1195=v1193["Some"];
const v1196=v1195.length;
const v1197=1000000;
const v1198=((v1196) <= (v1197));
let v1199=v1198;if(v1199){
const v1200=(v1195).length;
const v1201=v1137;
v1199=(v1200===v1201);}
v1194=v1199;}else{
const v1202=null;
v1194=true;}
const v1203=v1194;
const v1204=false;
v1192=(v1203===v1204);}
v1141=v1192;if(v1144){v1142=v1141;v1143=true;}}
let v1205;if(v1141){
v1205=({None:null});}else{
let v1206;if(v1209&&v1208){v1206=v1207;}else{
const v1210=v1105["advances"];
const v1211=true;
const v1212=v1137;
const v1213=0;
let v1214=({["valid"]:v1211,["budget"]:v1212,["index"]:v1213});
for(let v1215=0;v1215<v1210.length;v1215++){
const v1216=v1210[v1215];
const v1217=v1214;
v1214=__fn15(v1105,v1107,v1216,v1217);
}
v1206=v1214;if(v1209){v1207=v1206;v1208=true;}}
const v1218=v1206;
const v1219=v1218["valid"];
let v1220;if(v1219){
const v1221=v1206;
v1220=({Some:v1221["budget"]});}else{
v1220=({None:null});}
v1205=v1220;}
v1136=v1205;}
return v1136;};}
function __prepareFn17(fixed,depth=0){if(depth>=16)return __fn17;let v1225;
return function(v1222,v1223,v1224){if(!v1225){const v1226=__preparedFactories.get(16);v1225=v1226?v1226([fixed[0],fixed[1],fixed[2]],depth+1):__fn16;}
const v1227=v1225(v1222,v1223,v1224);
let v1229;if(Object.hasOwn(v1227,"Some")){
const v1230=v1227["Some"];
v1229=({Ok:({["data"]:v1222,["epsilon"]:v1223,["budget"]:v1230})});}else{
const v1231=null;
v1229=({Err:"invalid simple prepared text"});}
return v1229;};}
function __prepareFn18(fixed,depth=0){if(depth>=16)return __fn18;let v1236;
return function(v1232){const v1233=v1232["data"];
const v1234=v1232["epsilon"];
const v1235=1000000;
if(!v1236){const v1237=__preparedFactories.get(16);v1236=v1237?v1237([fixed[0],fixed[0],true],depth+1):__fn16;}
const v1238=v1236(v1233,v1234,v1235);
let v1240;if(Object.hasOwn(v1238,"Some")){
const v1241=v1238["Some"];
const v1242=v1232["budget"];
v1240=(v1241===v1242);}else{
const v1243=null;
v1240=false;}
return v1240;};}
function __prepareFn21(fixed,depth=0){if(depth>=16)return __fn21;const v1258=fixed[0];let v1257=false,v1256;
const v1262=fixed[1];let v1261=false,v1260;
const v1268=fixed[0]&&fixed[1];let v1267=false,v1266;
return function(v1253,v1254){let v1255;if(v1258&&v1257){v1255=v1256;}else{
v1255=(v1253["widths"]).length;if(v1258){v1256=v1255;v1257=true;}}
let v1259;if(v1262&&v1261){v1259=v1260;}else{
const v1263=v1254["segment"];
const v1264=0;
v1259=(v1263===v1264);if(v1262){v1260=v1259;v1261=true;}}
let v1265;if(v1268&&v1267){v1265=v1266;}else{
const v1269=v1255;
const v1270=v1254["grapheme"];
const v1271=0;
const v1272=((v1270) > (v1271));
let v1273=v1272;if(!v1273){
const v1274=v1254["segment"];
const v1275=v1255;
v1273=((v1274) >= (v1275));}
const v1276=v1273;
let v1277=({["cursor"]:v1254,["done"]:v1276});
for(let v1278=0;v1278<v1269;v1278++){
const v1279=v1277;
if(v1279["done"])break;
const v1280=(v1278>>>0);
const v1282=v1277;
const v1283=v1282["cursor"];
const v1284=v1283["segment"];
const v1285=v1259;
const v1281=__fn11(v1253,v1284,v1285);
let v1286;if(v1281){
const v1287=v1277;
const v1288=v1287["cursor"];
const v1289=v1288["segment"];
const v1290=1;
const v1291=(((v1289) + (v1290)) >>> 0);
const v1292=0;
const v1293=({["segment"]:v1291,["grapheme"]:v1292});
const v1294=v1277;
const v1295=v1294["cursor"];
const v1296=v1295["segment"];
const v1297=1;
const v1298=(((v1296) + (v1297)) >>> 0);
const v1299=v1255;
const v1300=((v1298) >= (v1299));
v1286=({["cursor"]:v1293,["done"]:v1300});}else{
const v1301=v1277;
const v1302=v1301["cursor"];
const v1303=true;
v1286=({["cursor"]:v1302,["done"]:v1303});}
v1277=v1286;}
v1265=v1277;if(v1268){v1266=v1265;v1267=true;}}
const v1304=v1265;
return v1304["cursor"];};}
function __prepareFn22(fixed,depth=0){if(depth>=16)return __fn22;const v1332=true;let v1331=false,v1330;
return function(v1305,v1306,v1307,v1308){const v1309=(v1305).length;
const v1310=false;
let v1311=({["index"]:v1306,["width"]:v1307,["done"]:v1310});
for(let v1312=0;v1312<v1309;v1312++){
const v1313=v1311;
const v1314=v1313["done"];
let v1315=v1314;if(!v1315){
const v1316=v1311;
const v1317=v1316["index"];
const v1318=(v1305).length;
v1315=((v1317) >= (v1318));}
if(v1315)break;
const v1319=(v1312>>>0);
const v1320=v1311;
const v1321=v1320["width"];
const v1322=v1311;
const v1323=v1322["index"];
let v1324;if(v1323<v1305.length){v1324=v1305[v1323];}else{
v1324=0.0;}
const v1325=v1324;
const v1326=(__dfNumber(v1321) + __dfNumber(v1325));
const v1327=((__dfNumber(v1326)) > (__dfNumber(v1308)));
let v1328;if(v1327){
let v1329;if(v1332&&v1331){v1329=v1330;}else{
v1329=true;if(v1332){v1330=v1329;v1331=true;}}
const v1333=v1311;
const v1334=v1333["index"];
const v1335=v1311;
const v1336=v1335["width"];
const v1337=v1329;
v1328=({["index"]:v1334,["width"]:v1336,["done"]:v1337});}else{
const v1338=v1311;
const v1339=v1338["index"];
const v1340=1;
const v1341=(((v1339) + (v1340)) >>> 0);
const v1342=v1311;
const v1343=v1342["width"];
const v1344=v1311;
const v1345=v1344["index"];
let v1346;if(v1345<v1305.length){v1346=v1305[v1345];}else{
v1346=0.0;}
const v1347=v1346;
const v1348=(__dfNumber(v1343) + __dfNumber(v1347));
const v1349=false;
v1328=({["index"]:v1341,["width"]:v1348,["done"]:v1349});}
v1311=v1328;}
return v1311;};}
function __prepareFn23(fixed,depth=0){if(depth>=16)return __fn23;const v1356=fixed[2];let v1355=false,v1354;
const v1360=fixed[0]&&fixed[2];let v1359=false,v1358;
const v1367=fixed[0]&&fixed[2];let v1366=false,v1365;
const v1380=fixed[0]&&fixed[2];let v1379=false,v1378;
const v1385=fixed[0]&&fixed[2];let v1384=false,v1383;
const v1389=fixed[0]&&fixed[2];let v1388=false,v1387;
const v1410=fixed[0]&&fixed[2];let v1409=false,v1408;
const v1419=fixed[0]&&fixed[2];let v1418=false,v1417;
const v1423=true;let v1422=false,v1421;
const v1433=fixed[0]&&fixed[2];let v1432=false,v1431;
const v1439=fixed[2];let v1438=false,v1437;
const v1445=fixed[0]&&fixed[2];let v1444=false,v1443;
const v1449=fixed[0]&&fixed[1]&&fixed[2];let v1448=false,v1447;
return function(v1350,v1351,v1352){let v1353;if(v1356&&v1355){v1353=v1354;}else{
v1353=v1352["index"];if(v1356){v1354=v1353;v1355=true;}}
let v1357;if(v1360&&v1359){v1357=v1358;}else{
const v1361=v1350["widths"];
const v1362=v1353;
let v1363;if(v1362<v1361.length){v1363=v1361[v1362];}else{
v1363=0.0;}
v1357=v1363;if(v1360){v1358=v1357;v1359=true;}}
let v1364;if(v1367&&v1366){v1364=v1365;}else{
const v1368=v1350["endTrims"];
const v1369=v1353;
v1364=__fn8(v1368,v1369);if(v1367){v1365=v1364;v1366=true;}}
const v1370=v1352["width"];
const v1371=v1357;
const v1372=(__dfNumber(v1370) + __dfNumber(v1371));
const v1373=v1364;
const v1374=(__dfNumber(v1372) - __dfNumber(v1373));
const v1375=((__dfNumber(v1374)) > (__dfNumber(v1351)));
let v1376;if(v1375){
let v1377;if(v1380&&v1379){v1377=v1378;}else{
const v1381=v1353;
v1377=__fn12(v1350,v1381);if(v1380){v1378=v1377;v1379=true;}}
let v1382;if(v1385&&v1384){v1382=v1383;}else{
let v1386;if(v1389&&v1388){v1386=v1387;}else{
const v1390=v1377;
const v1391=false;
const v1392=(v1390===v1391);
let v1393=v1392;if(v1393){
const v1394=v1353;
const v1395=1;
const v1396=(((v1394) - (v1395)) >>> 0);
v1393=__fn12(v1350,v1396);}
v1386=v1393;if(v1389){v1387=v1386;v1388=true;}}
let v1397;if(v1386){
const v1398=v1352["width"];
const v1399=v1350["widths"];
const v1400=v1353;
const v1401=1;
const v1402=(((v1400) - (v1401)) >>> 0);
let v1403;if(v1402<v1399.length){v1403=v1399[v1402];}else{
v1403=0.0;}
const v1404=v1403;
v1397=(__dfNumber(v1398) - __dfNumber(v1404));}else{
const v1405=v1352["width"];
const v1406=v1352["trimmed"];
v1397=(__dfNumber(v1405) - __dfNumber(v1406));}
v1382=v1397;if(v1385){v1383=v1382;v1384=true;}}
let v1407;if(v1410&&v1409){v1407=v1408;}else{
let v1411;if(v1377){
const v1412=v1353;
const v1413=1;
v1411=(((v1412) + (v1413)) >>> 0);}else{
v1411=v1353;}
const v1414=v1411;
const v1415=0;
v1407=({["segment"]:v1414,["grapheme"]:v1415});if(v1410){v1408=v1407;v1409=true;}}
let v1416;if(v1419&&v1418){v1416=v1417;}else{
v1416=v1382;if(v1419){v1417=v1416;v1418=true;}}
let v1420;if(v1423&&v1422){v1420=v1421;}else{
v1420=true;if(v1423){v1421=v1420;v1422=true;}}
const v1424=v1352["index"];
const v1425=v1352["width"];
const v1426=v1352["trimmed"];
const v1427=v1407;
const v1428=v1416;
const v1429=v1420;
v1376=({["index"]:v1424,["width"]:v1425,["trimmed"]:v1426,["end"]:v1427,["result"]:v1428,["done"]:v1429});}else{
let v1430;if(v1433&&v1432){v1430=v1431;}else{
const v1434=v1352["width"];
const v1435=v1357;
v1430=(__dfNumber(v1434) + __dfNumber(v1435));if(v1433){v1431=v1430;v1432=true;}}
let v1436;if(v1439&&v1438){v1436=v1437;}else{
const v1440=v1353;
const v1441=1;
v1436=(((v1440) + (v1441)) >>> 0);if(v1439){v1437=v1436;v1438=true;}}
let v1442;if(v1445&&v1444){v1442=v1443;}else{
v1442=v1430;if(v1445){v1443=v1442;v1444=true;}}
let v1446;if(v1449&&v1448){v1446=v1447;}else{
const v1450=v1430;
const v1451=((__dfNumber(v1450)) > (__dfNumber(v1351)));
let v1452;if(v1451){
v1452=v1364;}else{
v1452=0.0;}
v1446=v1452;if(v1449){v1447=v1446;v1448=true;}}
const v1453=v1436;
const v1454=v1442;
const v1455=v1446;
const v1456=v1352["end"];
const v1457=v1352["result"];
const v1458=v1352["done"];
v1376=({["index"]:v1453,["width"]:v1454,["trimmed"]:v1455,["end"]:v1456,["result"]:v1457,["done"]:v1458});}
return v1376;};}
function __prepareFn24(fixed,depth=0){if(depth>=16)return __fn24;const v1465=fixed[0];let v1464=false,v1463;
const v1469=fixed[0]&&fixed[2];let v1468=false,v1467;
const v1473=fixed[0];let v1472=false,v1471;
const v1478=fixed[1];let v1477=false,v1476;
const v1482=fixed[0]&&fixed[1];let v1481=false,v1480;
const v1490=fixed[0]&&fixed[1];let v1489=false,v1488;
const v1511=fixed[0]&&fixed[1];let v1510=false,v1509;
const v1518=fixed[0]&&fixed[1]&&fixed[2];let v1517=false,v1516;
const v1536=fixed[0]&&fixed[1]&&fixed[2];let v1535=false,v1534;
const v1554=fixed[0]&&fixed[1];let v1553=false,v1552;
const v1562=fixed[0]&&fixed[1];let v1561=false,v1560;
const v1583=fixed[0]&&fixed[1];let v1582=false,v1581;
const v1602=fixed[0]&&fixed[1]&&fixed[2];let v1601=false,v1600;
const v1630=fixed[0]&&fixed[1]&&fixed[2];let v1629=false,v1628;
const v1642=fixed[0]&&fixed[1]&&fixed[2];let v1641=false,v1640;
return function(v1459,v1460,v1461){let v1462;if(v1465&&v1464){v1462=v1463;}else{
v1462=v1459["data"];if(v1465){v1463=v1462;v1464=true;}}
let v1466;if(v1469&&v1468){v1466=v1467;}else{
v1466=__fn20(v1459,v1461);if(v1469){v1467=v1466;v1468=true;}}
let v1470;if(v1473&&v1472){v1470=v1471;}else{
const v1474=v1462;
v1470=(v1474["widths"]).length;if(v1473){v1471=v1470;v1472=true;}}
let v1475;if(v1478&&v1477){v1475=v1476;}else{
v1475=v1460["segment"];if(v1478){v1476=v1475;v1477=true;}}
let v1479;if(v1482&&v1481){v1479=v1480;}else{
const v1483=v1462;
const v1484=v1483["advances"];
const v1485=v1475;
let v1486;if(v1485<v1484.length){v1486=v1484[v1485];}else{
v1486=({None:null});}
v1479=v1486;if(v1482){v1480=v1479;v1481=true;}}
let v1487;if(v1490&&v1489){v1487=v1488;}else{
const v1491=v1462;
const v1492=v1491["startExtras"];
let v1493;if(Object.hasOwn(v1492,"Some")){
const v1494=v1492["Some"];
const v1495=v1462;
const v1496=v1495["widths"];
const v1497=v1475;
let v1498;if(v1497<v1496.length){v1498=v1496[v1497];}else{
v1498=0.0;}
const v1499=v1498;
const v1500=v1475;
let v1501;if(v1500<v1494.length){v1501=v1494[v1500];}else{
v1501=0.0;}
const v1502=v1501;
v1493=(__dfNumber(v1499) + __dfNumber(v1502));}else{
const v1503=null;
const v1504=v1462;
const v1505=v1504["widths"];
const v1506=v1475;
let v1507;if(v1506<v1505.length){v1507=v1505[v1506];}else{
v1507=0.0;}
v1493=v1507;}
v1487=v1493;if(v1490){v1488=v1487;v1489=true;}}
let v1508;if(v1511&&v1510){v1508=v1509;}else{
const v1512=v1462;
const v1513=v1512["endTrims"];
const v1514=v1475;
v1508=__fn8(v1513,v1514);if(v1511){v1509=v1508;v1510=true;}}
let v1515;if(v1518&&v1517){v1515=v1516;}else{
const v1519=v1462;
const v1520=v1519["overflowTrims"];
let v1521;if(Object.hasOwn(v1520,"Some")){
const v1522=v1520["Some"];
const v1523=v1487;
const v1524=v1475;
let v1525;if(v1524<v1522.length){v1525=v1522[v1524];}else{
v1525=0.0;}
const v1526=v1525;
const v1527=(__dfNumber(v1523) - __dfNumber(v1526));
const v1528=v1466;
let v1529;if(((__dfNumber(v1527)) <= (__dfNumber(v1528)))){
const v1530=v1475;
let v1531;if(v1530<v1522.length){v1531=v1522[v1530];}else{
v1531=0.0;}
v1529=v1531;}else{
v1529=v1508;}
v1521=v1529;}else{
const v1532=null;
v1521=v1508;}
v1515=v1521;if(v1518){v1516=v1515;v1517=true;}}
let v1533;if(v1536&&v1535){v1533=v1534;}else{
const v1537=v1460["grapheme"];
const v1538=0;
const v1539=((v1537) > (v1538));
let v1540=v1539;if(!v1540){
const v1541=v1487;
const v1542=v1515;
const v1543=(__dfNumber(v1541) - __dfNumber(v1542));
const v1544=v1466;
const v1545=((__dfNumber(v1543)) > (__dfNumber(v1544)));
let v1546=v1545;if(v1546){
const v1547=v1479;
let v1548;if(Object.hasOwn(v1547,"Some")){
const v1549=v1547["Some"];
v1548=true;}else{
const v1550=null;
v1548=false;}
v1546=v1548;}
v1540=v1546;}
v1533=v1540;if(v1536){v1534=v1533;v1535=true;}}
let v1551;if(v1554&&v1553){v1551=v1552;}else{
const v1555=v1479;
let v1556;if(Object.hasOwn(v1555,"Some")){
const v1557=v1555["Some"];
v1556=v1557;}else{
const v1558=null;
v1556=[];}
v1551=v1556;if(v1554){v1552=v1551;v1553=true;}}
let v1559;if(v1562&&v1561){v1559=v1560;}else{
const v1563=v1462;
const v1564=v1475;
const v1565=__fn9(v1563,v1564);
let v1567;if(Object.hasOwn(v1565,"Some")){
const v1568=v1565["Some"];
const v1569=v1551;
const v1570=v1460["grapheme"];
let v1571;if(v1570<v1569.length){v1571=v1569[v1570];}else{
v1571=0.0;}
const v1572=v1571;
const v1573=v1460["grapheme"];
let v1574;if(v1573<v1568.length){v1574=v1568[v1573];}else{
v1574=0.0;}
const v1575=v1574;
v1567=(__dfNumber(v1572) + __dfNumber(v1575));}else{
const v1576=null;
const v1577=v1551;
const v1578=v1460["grapheme"];
let v1579;if(v1578<v1577.length){v1579=v1577[v1578];}else{
v1579=0.0;}
v1567=v1579;}
v1559=v1567;if(v1562){v1560=v1559;v1561=true;}}
let v1580;if(v1583&&v1582){v1580=v1581;}else{
const v1584=v1460["grapheme"];
const v1585=0;
const v1586=((v1584) > (v1585));
let v1587;if(v1586){
const v1588=v1462;
v1587=v1588["insideExtras"];}else{
const v1589=v1462;
v1587=v1589["fillExtras"];}
const v1590=v1587;
let v1592;if(Object.hasOwn(v1590,"Some")){
const v1593=v1590["Some"];
const v1594=v1559;
const v1595=v1475;
let v1596;if(v1595<v1593.length){v1596=v1593[v1595];}else{
v1596=0.0;}
const v1597=v1596;
v1592=(__dfNumber(v1594) + __dfNumber(v1597));}else{
const v1598=null;
v1592=v1559;}
v1580=v1592;if(v1583){v1581=v1580;v1582=true;}}
let v1599;if(v1602&&v1601){v1599=v1600;}else{
const v1603=v1533;
let v1604;if(v1603){
const v1605=v1551;
const v1606=v1460["grapheme"];
const v1607=1;
const v1608=(((v1606) + (v1607)) >>> 0);
const v1609=v1580;
const v1610=v1466;
v1604=__fn22(v1605,v1608,v1609,v1610);}else{
const v1611=(v1551).length;
const v1612=v1487;
const v1613=false;
v1604=({["index"]:v1611,["width"]:v1612,["done"]:v1613});}
v1599=v1604;if(v1602){v1600=v1599;v1601=true;}}
const v1614=v1533;
let v1615=v1614;if(v1615){
const v1616=v1599;
const v1617=v1616["index"];
const v1618=(v1551).length;
v1615=((v1617) < (v1618));}
const v1619=v1615;
let v1620;if(v1619){
const v1621=v1599;
const v1622=v1621["width"];
const v1623=v1475;
const v1624=v1599;
const v1625=v1624["index"];
const v1626=({["segment"]:v1623,["grapheme"]:v1625});
v1620=({["width"]:v1622,["start"]:v1460,["end"]:v1626});}else{
let v1627;if(v1630&&v1629){v1627=v1628;}else{
const v1631=v1533;
const v1632=false;
const v1633=(v1631===v1632);
let v1634=v1633;if(v1634){
const v1635=v1487;
const v1636=v1466;
v1634=((__dfNumber(v1635)) > (__dfNumber(v1636)));}
const v1637=v1634;
let v1638;if(v1637){
v1638=v1515;}else{
v1638=0.0;}
v1627=v1638;if(v1630){v1628=v1627;v1629=true;}}
let v1639;if(v1642&&v1641){v1639=v1640;}else{
const v1643=v1470;
const v1644=v1475;
const v1645=1;
const v1646=(((v1644) + (v1645)) >>> 0);
const v1647=v1599;
const v1648=v1647["width"];
const v1649=v1627;
const v1650=v1470;
const v1651=0;
const v1652=({["segment"]:v1650,["grapheme"]:v1651});
const v1653=0.0;
const v1654=false;
let v1655=({["index"]:v1646,["width"]:v1648,["trimmed"]:v1649,["end"]:v1652,["result"]:v1653,["done"]:v1654});
for(let v1656=0;v1656<v1643;v1656++){
const v1657=v1655;
const v1658=v1657["done"];
let v1659=v1658;if(!v1659){
const v1660=v1655;
const v1661=v1660["index"];
const v1662=v1470;
v1659=((v1661) >= (v1662));}
if(v1659)break;
const v1663=(v1656>>>0);
const v1664=v1462;
const v1665=v1466;
const v1666=v1655;
v1655=__fn23(v1664,v1665,v1666);}
v1639=v1655;if(v1642){v1640=v1639;v1641=true;}}
const v1667=v1639;
let v1668;if(v1667["done"]){
const v1669=v1639;
v1668=v1669["result"];}else{
const v1670=v1639;
const v1671=v1670["width"];
const v1672=v1639;
const v1673=v1672["trimmed"];
v1668=(__dfNumber(v1671) - __dfNumber(v1673));}
const v1674=v1668;
const v1675=v1639;
const v1676=v1675["end"];
v1620=({["width"]:v1674,["start"]:v1460,["end"]:v1676});}
return v1620;};}
function __prepareFn25(fixed,depth=0){if(depth>=16)return __fn25;const v1683=fixed[0];let v1682=false,v1681;
const v1687=true;let v1686=false,v1685;
const v1696=fixed[0];let v1695=false,v1694;
const v1731=fixed[0]&&fixed[1];let v1730=false,v1729;
let v1733;
let v1742;
const v1751=true;let v1750=false,v1749;
return function(v1677,v1678,v1679){let v1680;if(v1683&&v1682){v1680=v1681;}else{
let v1684;if(v1687&&v1686){v1684=v1685;}else{
v1684=({Some:null});if(v1687){v1685=v1684;v1686=true;}}
const v1688=v1684;
let v1689;if(Object.hasOwn(v1688,"Some")){
const v1690=v1688["Some"];
v1689=__fn18(v1677);}else{
const v1691=null;
v1689=__fn18(v1677);}
v1680=v1689;if(v1683){v1681=v1680;v1682=true;}}
let v1692;if(v1680){
let v1693;if(v1696&&v1695){v1693=v1694;}else{
const v1697=v1677["data"];
v1693=(v1697["widths"]).length;if(v1696){v1694=v1693;v1695=true;}}
const v1698=v1678["segment"];
const v1699=v1693;
const v1700=((v1698) > (v1699));
let v1701=v1700;if(!v1701){
const v1702=v1678["segment"];
const v1703=v1693;
const v1704=(v1702===v1703);
let v1705=v1704;if(v1705){
const v1706=v1678["grapheme"];
const v1707=0;
v1705=((v1706) > (v1707));}
v1701=v1705;}
const v1708=v1701;
let v1709=v1708;if(!v1709){
const v1710=v1678["grapheme"];
const v1711=0;
const v1712=((v1710) > (v1711));
let v1713=v1712;if(v1713){
const v1714=v1677["data"];
const v1715=v1714["advances"];
const v1716=v1678["segment"];
let v1717;if(v1716<v1715.length){v1717=v1715[v1716];}else{
v1717=({None:null});}
const v1718=v1717;
let v1719;if(Object.hasOwn(v1718,"Some")){
const v1720=v1718["Some"];
const v1721=v1678["grapheme"];
const v1722=(v1720).length;
v1719=((v1721) < (v1722));}else{
const v1723=null;
v1719=false;}
const v1724=v1719;
const v1725=false;
v1713=(v1724===v1725);}
v1709=v1713;}
const v1726=v1709;
let v1727;if(v1726){
v1727=({Err:"invalid line cursor"});}else{
let v1728;if(v1731&&v1730){v1728=v1729;}else{
const v1732=v1677["data"];
if(!v1733){const v1734=__preparedFactories.get(21);v1733=v1734?v1734([fixed[0],fixed[1]],depth+1):__fn21;}
v1728=v1733(v1732,v1678);if(v1731){v1729=v1728;v1730=true;}}
const v1735=v1728;
const v1736=v1735["segment"];
const v1737=v1693;
const v1738=((v1736) >= (v1737));
let v1739;if(v1738){
v1739=({Ok:({None:null})});}else{
const v1740=v1728;
const v1741=__fn19(v1679);
if(!v1742){const v1743=__preparedFactories.get(24);v1742=v1743?v1743([fixed[0],fixed[0]&&fixed[1],fixed[2]],depth+1):__fn24;}
const v1744=v1742(v1677,v1740,v1741);
const v1746=({Some:v1744});
v1739=({Ok:v1746});}
v1727=v1739;}
v1692=v1727;}else{
let v1748;if(v1751&&v1750){v1748=v1749;}else{
v1748=({Some:null});if(v1751){v1749=v1748;v1750=true;}}
const v1752=v1748;
let v1753;if(Object.hasOwn(v1752,"Some")){
const v1754=v1752["Some"];
v1753="invalid prepared text";}else{
const v1755=null;
v1753="invalid prepared text";}
const v1756=v1753;
v1692=({Err:v1756});}
return v1692;};}
function __prepareFn26(fixed,depth=0){if(depth>=16)return __fn26;const v1764=fixed[0]&&fixed[2];let v1763=false,v1762;
let v1767;
const v1778=true;let v1777=false,v1776;
const v1785=fixed[0]&&fixed[1]&&fixed[2];let v1784=false,v1783;
let v1787;
return function(v1758,v1759,v1760){let v1761;if(v1764&&v1763){v1761=v1762;}else{
const v1765=v1758["data"];
const v1766=v1760["cursor"];
if(!v1767){const v1768=__preparedFactories.get(21);v1767=v1768?v1768([fixed[0],fixed[2]],depth+1):__fn21;}
v1761=v1767(v1765,v1766);if(v1764){v1762=v1761;v1763=true;}}
const v1769=v1761;
const v1770=v1769["segment"];
const v1771=v1758["data"];
const v1772=(v1771["widths"]).length;
const v1773=((v1770) >= (v1772));
let v1774;if(v1773){
let v1775;if(v1778&&v1777){v1775=v1776;}else{
v1775=true;if(v1778){v1776=v1775;v1777=true;}}
const v1779=v1760["cursor"];
const v1780=v1760["stats"];
const v1781=v1775;
v1774=({["cursor"]:v1779,["stats"]:v1780,["done"]:v1781});}else{
let v1782;if(v1785&&v1784){v1782=v1783;}else{
const v1786=v1761;
if(!v1787){const v1788=__preparedFactories.get(24);v1787=v1788?v1788([fixed[0],fixed[0]&&fixed[2],fixed[1]],depth+1):__fn24;}
v1782=v1787(v1758,v1786,v1759);if(v1785){v1783=v1782;v1784=true;}}
const v1789=v1782;
const v1790=v1789["end"];
const v1791=v1760["stats"];
const v1792=v1791["lineCount"];
const v1793=1;
const v1794=(((v1792) + (v1793)) >>> 0);
const v1795=v1782;
const v1796=v1795["width"];
const v1797=v1760["stats"];
const v1798=v1797["maxLineWidth"];
let v1799;if(((__dfNumber(v1796)) > (__dfNumber(v1798)))){
const v1800=v1782;
v1799=v1800["width"];}else{
const v1801=v1760["stats"];
v1799=v1801["maxLineWidth"];}
const v1802=v1799;
const v1803=({["lineCount"]:v1794,["maxLineWidth"]:v1802});
const v1804=false;
v1774=({["cursor"]:v1790,["stats"]:v1803,["done"]:v1804});}
return v1774;};}
function __prepareFn27(fixed,depth=0){if(depth>=16)return __fn27;const v1810=fixed[0]&&fixed[1];let v1809=false,v1808;
let v1826;
return function(v1805,v1806){let v1807;if(v1810&&v1809){v1807=v1808;}else{
const v1811=v1805["budget"];
const v1812=1;
const v1813=(((v1811) + (v1812)) >>> 0);
const v1814=0;
const v1815=0;
const v1816=({["segment"]:v1814,["grapheme"]:v1815});
const v1817=0;
const v1818=0.0;
const v1819=({["lineCount"]:v1817,["maxLineWidth"]:v1818});
const v1820=false;
let v1821=({["cursor"]:v1816,["stats"]:v1819,["done"]:v1820});
for(let v1822=0;v1822<v1813;v1822++){
const v1823=v1821;
if(v1823["done"])break;
const v1824=(v1822>>>0);
const v1825=v1821;
if(!v1826){const v1827=__preparedFactories.get(26);v1826=v1827?v1827([fixed[0],fixed[1],false],depth+1):__fn26;}
v1821=v1826(v1805,v1806,v1825);}
v1807=v1821;if(v1810){v1808=v1807;v1809=true;}}
const v1828=v1807;
return v1828["stats"];};}
function __prepareFn28(fixed,depth=0){if(depth>=16)return __fn28;const v1834=fixed[0];let v1833=false,v1832;
const v1838=true;let v1837=false,v1836;
let v1845;
const v1852=true;let v1851=false,v1850;
return function(v1829,v1830){let v1831;if(v1834&&v1833){v1831=v1832;}else{
let v1835;if(v1838&&v1837){v1835=v1836;}else{
v1835=({Some:null});if(v1838){v1836=v1835;v1837=true;}}
const v1839=v1835;
let v1840;if(Object.hasOwn(v1839,"Some")){
const v1841=v1839["Some"];
v1840=__fn18(v1829);}else{
const v1842=null;
v1840=__fn18(v1829);}
v1831=v1840;if(v1834){v1832=v1831;v1833=true;}}
let v1843;if(v1831){
const v1844=__fn19(v1830);
if(!v1845){const v1846=__preparedFactories.get(27);v1845=v1846?v1846([fixed[0],fixed[1]],depth+1):__fn27;}
const v1847=v1845(v1829,v1844);
v1843=({Ok:v1847});}else{
let v1849;if(v1852&&v1851){v1849=v1850;}else{
v1849=({Some:null});if(v1852){v1850=v1849;v1851=true;}}
const v1853=v1849;
let v1854;if(Object.hasOwn(v1853,"Some")){
const v1855=v1853["Some"];
v1854="invalid prepared text";}else{
const v1856=null;
v1854="invalid prepared text";}
const v1857=v1854;
v1843=({Err:v1857});}
return v1843;};}
function __prepareFn30(fixed,depth=0){if(depth>=16)return __fn30;const v1864=fixed[0];let v1863=false,v1862;
const v1868=true;let v1867=false,v1866;
const v1894=true;let v1893=false,v1892;
return function(v1859,v1860){let v1861;if(v1864&&v1863){v1861=v1862;}else{
let v1865;if(v1868&&v1867){v1865=v1866;}else{
v1865=({Some:null});if(v1868){v1866=v1865;v1867=true;}}
const v1869=v1865;
let v1870;if(Object.hasOwn(v1869,"Some")){
const v1871=v1869["Some"];
v1870=__fn18(v1859);}else{
const v1872=null;
v1870=__fn18(v1859);}
v1861=v1870;if(v1864){v1862=v1861;v1863=true;}}
let v1873;if(v1861){
const v1875=v1859["budget"];
const v1876=1;
const v1877=(((v1875) + (v1876)) >>> 0);
const v1878=0;
const v1879=0;
const v1880=({["segment"]:v1878,["grapheme"]:v1879});
const v1881=new __InkBuffer([]);
const v1882=false;
let v1883=({["cursor"]:v1880,["lines"]:v1881,["done"]:v1882});
for(let v1884=0;v1884<v1877;v1884++){
const v1885=v1883;
if(v1885["done"]){break;}
const v1886=(v1884>>>0);
const v1887=__fn19(v1860);
const v1888=v1883;
v1883=__fn29(v1859,v1887,v1888);}
const v1874=v1883;
const v1889=v1874;
const v1890=v1889["lines"];
v1873=({Ok:v1890.freeze()});}else{
let v1891;if(v1894&&v1893){v1891=v1892;}else{
v1891=({Some:null});if(v1894){v1892=v1891;v1893=true;}}
const v1895=v1891;
let v1896;if(Object.hasOwn(v1895,"Some")){
const v1897=v1895["Some"];
v1896="invalid prepared text";}else{
const v1898=null;
v1896="invalid prepared text";}
const v1899=v1896;
v1873=({Err:v1899});}
return v1873;};}
function __prepareFn31(fixed,depth=0){if(depth>=16)return __fn31;const v1940=true;let v1939=false,v1938;
return function(v1901,v1902,v1903,v1904){const v1905=(v1901).length;
const v1906=false;
let v1907=({["index"]:v1902,["width"]:v1903,["done"]:v1906});
for(let v1908=0;v1908<v1905;v1908++){
const v1909=v1907;
const v1910=v1909["done"];
let v1911=v1910;if(!v1911){
const v1912=v1907;
const v1913=v1912["index"];
const v1914=(v1901).length;
v1911=((v1913) >= (v1914));}
if(v1911)break;
const v1915=(v1908>>>0);
const v1916=v1907;
const v1917=v1916["width"];
const v1918=v1907;
const v1919=v1918["index"];
let v1920;if(v1919<v1901.length){v1920=v1901[v1919];}else{
v1920=0.0;}
const v1921=v1920;
const v1922=(__dfNumber(v1917) + __dfNumber(v1921));
const v1923=((__dfNumber(v1922)) <= (__dfNumber(v1904)));
let v1924;if(v1923){
const v1925=v1907;
const v1926=v1925["index"];
const v1927=1;
const v1928=(((v1926) + (v1927)) >>> 0);
const v1929=v1907;
const v1930=v1929["width"];
const v1931=v1907;
const v1932=v1931["index"];
let v1933;if(v1932<v1901.length){v1933=v1901[v1932];}else{
v1933=0.0;}
const v1934=v1933;
const v1935=(__dfNumber(v1930) + __dfNumber(v1934));
const v1936=false;
v1924=({["index"]:v1928,["width"]:v1935,["done"]:v1936});}else{
let v1937;if(v1940&&v1939){v1937=v1938;}else{
v1937=true;if(v1940){v1938=v1937;v1939=true;}}
const v1941=v1907;
const v1942=v1941["index"];
const v1943=v1907;
const v1944=v1943["width"];
const v1945=v1937;
v1924=({["index"]:v1942,["width"]:v1944,["done"]:v1945});}
v1907=v1924;}
return v1907;};}
function __prepareFn32(fixed,depth=0){if(depth>=16)return __fn32;const v1953=fixed[1]&&fixed[3];let v1952=false,v1951;
const v1965=fixed[0]&&fixed[1]&&fixed[3];let v1964=false,v1963;
const v1973=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1972=false,v1971;
return function(v1946,v1947,v1948,v1949){let v1950;if(v1953&&v1952){v1950=v1951;}else{
const v1954=v1949["count"];
const v1955=v1954["width"];
let v1956;if(Object.hasOwn(v1947,"Some")){
const v1957=v1947["Some"];
const v1958=v1949["index"];
let v1959;if(v1958<v1957.length){v1959=v1957[v1958];}else{
v1959=0.0;}
v1956=v1959;}else{
const v1960=null;
v1956=0.0;}
const v1961=v1956;
v1950=(__dfNumber(v1955) + __dfNumber(v1961));if(v1953){v1951=v1950;v1952=true;}}
let v1962;if(v1965&&v1964){v1962=v1963;}else{
const v1966=v1950;
const v1967=v1949["index"];
let v1968;if(v1967<v1946.length){v1968=v1946[v1967];}else{
v1968=0.0;}
const v1969=v1968;
v1962=(__dfNumber(v1966) + __dfNumber(v1969));if(v1965){v1963=v1962;v1964=true;}}
let v1970;if(v1973&&v1972){v1970=v1971;}else{
const v1974=v1949["index"];
const v1975=1;
const v1976=(((v1974) + (v1975)) >>> 0);
const v1977=v1962;
v1970=__fn31(v1946,v1976,v1977,v1948);if(v1973){v1971=v1970;v1972=true;}}
const v1978=v1970;
const v1979=v1978["index"];
const v1980=(v1946).length;
const v1981=((v1979) < (v1980));
let v1982;if(v1981){
const v1983=v1949["count"];
const v1984=v1983["lines"];
const v1985=1;
const v1986=(((v1984) + (v1985)) >>> 0);
const v1987=0.0;
const v1988=false;
const v1989=({["lines"]:v1986,["width"]:v1987,["content"]:v1988});
const v1990=v1970;
const v1991=v1990["index"];
v1982=({["count"]:v1989,["index"]:v1991});}else{
const v1992=v1949["count"];
const v1993=v1992["lines"];
const v1994=v1970;
const v1995=v1994["width"];
const v1996=true;
const v1997=({["lines"]:v1993,["width"]:v1995,["content"]:v1996});
const v1998=v1970;
const v1999=v1998["index"];
v1982=({["count"]:v1997,["index"]:v1999});}
return v1982;};}
function __prepareFn33(fixed,depth=0){if(depth>=16)return __fn33;const v2007=fixed[0]&&fixed[2];let v2006=false,v2005;
const v2011=fixed[0]&&fixed[2];let v2010=false,v2009;
const v2017=fixed[0]&&fixed[2];let v2016=false,v2015;
const v2031=fixed[0]&&fixed[2]&&fixed[3];let v2030=false,v2029;
const v2040=fixed[3];let v2039=false,v2038;
const v2044=fixed[3];let v2043=false,v2042;
const v2076=fixed[0]&&fixed[2];let v2075=false,v2074;
const v2087=fixed[0]&&fixed[2];let v2086=false,v2085;
const v2104=fixed[0]&&fixed[2]&&fixed[3];let v2103=false,v2102;
const v2111=true;let v2110=false,v2109;
const v2119=fixed[0]&&fixed[2];let v2118=false,v2117;
const v2127=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2126=false,v2125;
return function(v2000,v2001,v2002,v2003){let v2004;if(v2007&&v2006){v2004=v2005;}else{
v2004=__fn10(v2000,v2002);if(v2007){v2005=v2004;v2006=true;}}
let v2008;if(v2011&&v2010){v2008=v2009;}else{
const v2012=v2000["widths"];
let v2013;if(v2002<v2012.length){v2013=v2012[v2002];}else{
v2013=0.0;}
v2008=v2013;if(v2011){v2009=v2008;v2010=true;}}
let v2014;if(v2017&&v2016){v2014=v2015;}else{
const v2018=v2000["endTrims"];
v2014=__fn8(v2018,v2002);if(v2017){v2015=v2014;v2016=true;}}
const v2019=v2003["content"];
let v2020=v2019;if(v2020){
const v2021=v2003["width"];
const v2022=v2008;
const v2023=(__dfNumber(v2021) + __dfNumber(v2022));
const v2024=v2014;
const v2025=(__dfNumber(v2023) - __dfNumber(v2024));
v2020=((__dfNumber(v2025)) <= (__dfNumber(v2001)));}
const v2026=v2020;
let v2027;if(v2026){
let v2028;if(v2031&&v2030){v2028=v2029;}else{
const v2032=v2003["width"];
const v2033=v2008;
v2028=(__dfNumber(v2032) + __dfNumber(v2033));if(v2031){v2029=v2028;v2030=true;}}
const v2034=v2003["lines"];
const v2035=v2028;
const v2036=v2003["content"];
v2027=({["lines"]:v2034,["width"]:v2035,["content"]:v2036});}else{
let v2037;if(v2040&&v2039){v2037=v2038;}else{
v2037=v2003["content"];if(v2040){v2038=v2037;v2039=true;}}
let v2041;if(v2044&&v2043){v2041=v2042;}else{
const v2045=v2037;
let v2046;if(v2045){
const v2047=v2003["lines"];
const v2048=1;
const v2049=(((v2047) + (v2048)) >>> 0);
const v2050=0.0;
const v2051=false;
v2046=({["lines"]:v2049,["width"]:v2050,["content"]:v2051});}else{
v2046=v2003;}
v2041=v2046;if(v2044){v2042=v2041;v2043=true;}}
const v2052=v2037;
let v2053=v2052;if(v2053){
const v2054=v2004;
const v2055=0;
v2053=!(v2054===v2055);}
const v2056=v2053;
let v2057=v2056;if(!v2057){
const v2058=v2037;
const v2059=false;
const v2060=(v2058===v2059);
let v2061=v2060;if(v2061){
const v2062=v2004;
const v2063=1;
const v2064=(v2062===v2063);
let v2065=v2064;if(!v2065){
const v2066=v2004;
const v2067=2;
const v2068=(v2066===v2067);
let v2069=v2068;if(v2069){
const v2070=0;
v2069=((v2002) > (v2070));}
v2065=v2069;}
v2061=v2065;}
v2057=v2061;}
const v2071=v2057;
let v2072;if(v2071){
v2072=v2041;}else{
let v2073;if(v2076&&v2075){v2073=v2074;}else{
const v2077=v2000["startExtras"];
let v2078;if(Object.hasOwn(v2077,"Some")){
const v2079=v2077["Some"];
const v2080=v2008;
let v2081;if(v2002<v2079.length){v2081=v2079[v2002];}else{
v2081=0.0;}
const v2082=v2081;
v2078=(__dfNumber(v2080) + __dfNumber(v2082));}else{
const v2083=null;
v2078=v2008;}
v2073=v2078;if(v2076){v2074=v2073;v2075=true;}}
let v2084;if(v2087&&v2086){v2084=v2085;}else{
const v2088=v2000["advances"];
let v2089;if(v2002<v2088.length){v2089=v2088[v2002];}else{
v2089=({None:null});}
v2084=v2089;if(v2087){v2085=v2084;v2086=true;}}
const v2090=v2073;
const v2091=v2014;
const v2092=(__dfNumber(v2090) - __dfNumber(v2091));
const v2093=((__dfNumber(v2092)) <= (__dfNumber(v2001)));
let v2094=v2093;if(!v2094){
const v2095=v2084;
let v2096;if(Object.hasOwn(v2095,"Some")){
const v2097=v2095["Some"];
v2096=false;}else{
const v2098=null;
v2096=true;}
v2094=v2096;}
const v2099=v2094;
let v2100;if(v2099){
let v2101;if(v2104&&v2103){v2101=v2102;}else{
const v2105=v2041;
const v2106=v2105["width"];
const v2107=v2073;
v2101=(__dfNumber(v2106) + __dfNumber(v2107));if(v2104){v2102=v2101;v2103=true;}}
let v2108;if(v2111&&v2110){v2108=v2109;}else{
v2108=true;if(v2111){v2109=v2108;v2110=true;}}
const v2112=v2041;
const v2113=v2112["lines"];
const v2114=v2101;
const v2115=v2108;
v2100=({["lines"]:v2113,["width"]:v2114,["content"]:v2115});}else{
let v2116;if(v2119&&v2118){v2116=v2117;}else{
const v2120=v2084;
let v2121;if(Object.hasOwn(v2120,"Some")){
const v2122=v2120["Some"];
v2121=v2122;}else{
const v2123=null;
v2121=[];}
v2116=v2121;if(v2119){v2117=v2116;v2118=true;}}
let v2124;if(v2127&&v2126){v2124=v2125;}else{
const v2128=(v2116).length;
const v2129=v2041;
const v2130=0;
let v2131=({["count"]:v2129,["index"]:v2130});
for(let v2132=0;v2132<v2128;v2132++){
const v2133=v2131;
const v2134=v2133["index"];
const v2135=(v2116).length;
if(((v2134) >= (v2135)))break;
const v2136=(v2132>>>0);
const v2137=v2116;
const v2138=__fn9(v2000,v2002);
const v2139=v2131;
v2131=__fn32(v2137,v2138,v2001,v2139);}
v2124=v2131;if(v2127){v2125=v2124;v2126=true;}}
const v2140=v2124;
v2100=v2140["count"];}
v2072=v2100;}
v2027=v2072;}
return v2027;};}
function __prepareFn34(fixed,depth=0){if(depth>=16)return __fn34;const v2146=fixed[0];let v2145=false,v2144;
const v2150=true;let v2149=false,v2148;
const v2159=fixed[1];let v2158=false,v2157;
let v2168;
const v2177=fixed[0]&&fixed[1];let v2176=false,v2175;
const v2198=true;let v2197=false,v2196;
return function(v2141,v2142){let v2143;if(v2146&&v2145){v2143=v2144;}else{
let v2147;if(v2150&&v2149){v2147=v2148;}else{
v2147=({Some:null});if(v2150){v2148=v2147;v2149=true;}}
const v2151=v2147;
let v2152;if(Object.hasOwn(v2151,"Some")){
const v2153=v2151["Some"];
v2152=__fn18(v2141);}else{
const v2154=null;
v2152=__fn18(v2141);}
v2143=v2152;if(v2146){v2144=v2143;v2145=true;}}
let v2155;if(v2143){
let v2156;if(v2159&&v2158){v2156=v2157;}else{
v2156=__fn19(v2142);if(v2159){v2157=v2156;v2158=true;}}
const v2160=v2141["data"];
const v2161=v2160["overflowTrims"];
let v2162;if(Object.hasOwn(v2161,"Some")){
const v2163=v2161["Some"];
v2162=true;}else{
const v2164=null;
v2162=false;}
const v2165=v2162;
let v2166;if(v2165){
const v2167=v2156;
if(!v2168){const v2169=__preparedFactories.get(27);v2168=v2169?v2169([fixed[0],fixed[1]],depth+1):__fn27;}
const v2170=v2168(v2141,v2167);
const v2172=v2170["lineCount"];
v2166=({Ok:v2172});}else{
let v2174;if(v2177&&v2176){v2174=v2175;}else{
const v2178=v2141["data"];
const v2179=(v2178["widths"]).length;
const v2180=0;
const v2181=0.0;
const v2182=false;
let v2183=({["lines"]:v2180,["width"]:v2181,["content"]:v2182});
for(let v2184=0;v2184<v2179;v2184++){
if(false)break;
const v2185=(v2184>>>0);
const v2186=v2141["data"];
const v2187=v2156;
const v2188=__fn20(v2141,v2187);
const v2189=v2183;
v2183=__fn33(v2186,v2188,v2185,v2189);}
v2174=v2183;if(v2177){v2175=v2174;v2176=true;}}
const v2190=v2174;
const v2191=v2190["lines"];
const v2192=v2174;
let v2193;if(v2192["content"]){
v2193=1;}else{
v2193=0;}
const v2194=v2193;
v2166=({Ok:(((v2191) + (v2194)) >>> 0)});}
v2155=v2166;}else{
let v2195;if(v2198&&v2197){v2195=v2196;}else{
v2195=({Some:null});if(v2198){v2196=v2195;v2197=true;}}
const v2199=v2195;
let v2200;if(Object.hasOwn(v2199,"Some")){
const v2201=v2199["Some"];
v2200="invalid prepared text";}else{
const v2202=null;
v2200="invalid prepared text";}
const v2203=v2200;
v2155=({Err:v2203});}
return v2155;};}
function __prepareFn35(fixed,depth=0){if(depth>=16)return __fn35;let v2208;
return function(v2205,v2206,v2207){if(!v2208){const v2209=__preparedFactories.get(34);v2208=v2209?v2209([fixed[0],fixed[1]],depth+1):__fn34;}
const v2210=v2208(v2205,v2206);
let v2212;if(Object.hasOwn(v2210,"Ok")){
const v2213=v2210["Ok"];
const v2214=(__dfNumber(v2213) * __dfNumber(v2207));
v2212=({Ok:({["lineCount"]:v2213,["height"]:v2214})});}else{v2212=({Err:v2210.Err});}
return v2212;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[4,__prepareFn4],[5,__prepareFn5],[6,__prepareFn6],[15,__prepareFn15],[16,__prepareFn16],[17,__prepareFn17],[18,__prepareFn18],[21,__prepareFn21],[22,__prepareFn22],[23,__prepareFn23],[24,__prepareFn24],[25,__prepareFn25],[26,__prepareFn26],[27,__prepareFn27],[28,__prepareFn28],[30,__prepareFn30],[31,__prepareFn31],[32,__prepareFn32],[33,__prepareFn33],[34,__prepareFn34],[35,__prepareFn35]]);
