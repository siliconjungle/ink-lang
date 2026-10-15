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
function __fn0(v0){
const v1=v0["root"];
const v2="representation";
const v3=__fn6(v0,v1,v2);
let v4;if(Object.hasOwn(v3,"Some")){
const v5=v3["Some"];
v4=v5;}else{
const v6=null;
v4=4294967295;}
const v7=v4;
const v8=__fn5(v0,v7);
const v9=v8["kind"];
const v10=0;
return !(v9===v10);}
function __fn1(v11){
const v12=__bits(__dfNumber(v11["default_priority"]));
const v13=v11["state"];
const v14=__bits((v13["nodes"]).length);
const v15=v11["state"];
let v16;if(__fn0(v15)){
v16=1065353216;}else{
v16=0;}
const v17=v16;
const v18=1065353216;
return [v12,v14,v17,v18];}
function __fn2(v19){
const v20=(v19["weights"]).length;
const v21=4;
const v22=(v20===v21);
let v23=v22;if(v23){
const v24=v19["weights"];
v23=__fn9(v24);}
return v23;}
function __fn3(v25,v26){
const v27=0;
const v28=0;
let v29=({["index"]:v28,["value"]:v27});
for(let v30=0;v30<v26.length;v30++){
const v31=v26[v30];
const v32=v29;
const v33=v32["index"];
const v34=v29;
const v35=v34["value"];
const v36=v25["weights"];
let v37;if(v33<v36.length){v37=v36[v33];}else{
v37=0;}
const v38=v37;
const v39=__bits(__float(v31) * __float(v38));
const v40=__bits(__float(v35) + __float(v39));
const v41=1;
const v42=(((v33) + (v41)) >>> 0);
v29=({["index"]:v42,["value"]:v40});
}
const v43=v29;
const v44=v43["index"];
const v45=v43["value"];
return v45;}
function __fn4(v46,v47){
const v48=__fn1(v46);
const v49=__fn2(v47);
const v50=false;
const v51=(v49===v50);
let v52=v51;if(!v52){
const v53=__fn9(v48);
const v54=false;
v52=(v53===v54);}
let v55;if(v52){
v55=v46["default_priority"];}else{
const v56=__fn3(v47,v48);
let v57;if(Number.isFinite(__float(v56))){
v57=__float(v56);}else{
v57=v46["default_priority"];}
v55=v57;}
return v55;}
function __fn5(v58,v59){
const v60=v58["nodes"];
let v61;if(v59<v60.length){v61=v60[v59];}else{
const v62=0;
const v63="";
const v64=[];
v61=({["kind"]:v62,["value"]:v63,["edges"]:v64});}
return v61;}
function __fn6(v65,v66,v67){
const v68=(v65["nodes"]).length;
let v69;if(((v66) >= (v68))){
v69=({None:null});}else{
const v70=__fn5(v65,v66);
const v71=v70["kind"];
const v72=5;
let v73;if(!(v71===v72)){
v73=({None:null});}else{
const v74=v70["edges"];
let v75=({None:null});
for(let v76=0;v76<v74.length;v76++){
const v77=v74[v76];
const v78=v77["key"];
const v79=(v78===v67);
const v80=v77["key"];
let v81;if((v80===v67)){
v81=({Some:v77["node"]});}else{
v81=v75;}
v75=v81;
if(v79)break;
}
const v82=v75;
let v83;if(Object.hasOwn(v82,"Some")){
const v84=v82["Some"];
const v85=(v65["nodes"]).length;
let v86;if(((v84) < (v85))){
v86=({Some:v84});}else{
v86=({None:null});}
v83=v86;}else{
const v87=null;
v83=({None:null});}
v73=v83;}
v69=v73;}
return v69;}
function __fn7(v88,v89,v90){
const v91=(v88["nodes"]).length;
let v92;if(((v89) >= (v91))){
v92=({None:null});}else{
const v93=__fn5(v88,v89);
const v94=v93["kind"];
const v95=4;
const v96=!(v94===v95);
let v97=v96;if(!v97){
const v98=(v93["edges"]).length;
v97=((v90) >= (v98));}
let v99;if(v97){
v99=({None:null});}else{
const v100=v93["edges"];
let v101;if(v90<v100.length){v101=v100[v90];}else{
const v102="";
const v103=4294967295;
v101=({["key"]:v102,["node"]:v103});}
const v104=v101;
const v105=v104["node"];
const v106=(v88["nodes"]).length;
let v107;if(((v105) < (v106))){
v107=({Some:v105});}else{
v107=({None:null});}
v99=v107;}
v92=v99;}
return v92;}
function __fn8(v108){
const v109=1063675494;
const v110=1065336439;
const v111=841731191;
const v112=0;
const v113=1065353216;
return ({["rate"]:v108,["first_decay"]:v109,["second_decay"]:v110,["epsilon"]:v111,["weight_decay"]:v112,["norm_limit"]:v113});}
function __fn9(v114){
let v115=true;
for(let v116=0;v116<v114.length;v116++){
const v117=v114[v116];
const v118=v115;
let v119=v118;if(v119){
v119=Number.isFinite(__float(v117));}
v115=v119;
}
return v115;}
function __fn10(v120){
const v121=(v120["weights"]).length;
const v122=(v120["first"]).length;
const v123=(v121===v122);
let v124=v123;if(v124){
const v125=(v120["weights"]).length;
const v126=(v120["second"]).length;
v124=(v125===v126);}
const v127=v124;
let v128=v127;if(v128){
const v129=v120["weights"];
v128=__fn9(v129);}
const v130=v128;
let v131=v130;if(v131){
const v132=v120["first"];
v131=__fn9(v132);}
const v133=v131;
let v134=v133;if(v134){
const v135=v120["second"];
v134=__fn9(v135);}
const v136=v134;
let v137=v136;if(v137){
const v138=v120["second"];
let v139=true;
for(let v140=0;v140<v138.length;v140++){
const v141=v138[v140];
const v142=v139;
let v143=v142;if(v143){
const v144=0;
v143=((__float(v141)) >= (__float(v144)));}
v139=v143;
}
v137=v139;}
const v145=v137;
let v146=v145;if(v146){
const v147=v120["first_power"];
const v148=0;
v146=((__float(v147)) >= (__float(v148)));}
const v149=v146;
let v150=v149;if(v150){
const v151=v120["first_power"];
const v152=1065353216;
v150=((__float(v151)) <= (__float(v152)));}
const v153=v150;
let v154=v153;if(v154){
const v155=v120["second_power"];
const v156=0;
v154=((__float(v155)) >= (__float(v156)));}
const v157=v154;
let v158=v157;if(v158){
const v159=v120["second_power"];
const v160=1065353216;
v158=((__float(v159)) <= (__float(v160)));}
return v158;}
function __fn11(v161){
const v162=__fn9(v161);
const v163=false;
let v164;if((v162===v163)){
v164=({Err:"nonfinite weights"});}else{
const v165=v161.length;
const v166=new Array(v165);
for(let v167=0;v167<v165;v167++){
const v168=v161[v167];
v166[v167]=0;
}
const v169=0;
const v170=1065353216;
const v171=1065353216;
v164=({Ok:({["weights"]:v161,["first"]:v166,["second"]:v166,["steps"]:v169,["first_power"]:v170,["second_power"]:v171})});}
return v164;}
function __fn12(v172){
const v173=Number.isFinite(__float(v172["rate"]));
let v174=v173;if(v174){
const v175=v172["rate"];
const v176=0;
v174=((__float(v175)) > (__float(v176)));}
const v177=v174;
let v178=v177;if(v178){
const v179=v172["first_decay"];
const v180=0;
v178=((__float(v179)) >= (__float(v180)));}
const v181=v178;
let v182=v181;if(v182){
const v183=v172["first_decay"];
const v184=1065353216;
v182=((__float(v183)) < (__float(v184)));}
const v185=v182;
let v186=v185;if(v186){
const v187=v172["second_decay"];
const v188=0;
v186=((__float(v187)) >= (__float(v188)));}
const v189=v186;
let v190=v189;if(v190){
const v191=v172["second_decay"];
const v192=1065353216;
v190=((__float(v191)) < (__float(v192)));}
const v193=v190;
let v194=v193;if(v194){
v194=Number.isFinite(__float(v172["epsilon"]));}
const v195=v194;
let v196=v195;if(v196){
const v197=v172["epsilon"];
const v198=0;
v196=((__float(v197)) > (__float(v198)));}
const v199=v196;
let v200=v199;if(v200){
v200=Number.isFinite(__float(v172["weight_decay"]));}
const v201=v200;
let v202=v201;if(v202){
const v203=v172["weight_decay"];
const v204=0;
v202=((__float(v203)) >= (__float(v204)));}
const v205=v202;
let v206=v205;if(v206){
v206=Number.isFinite(__float(v172["norm_limit"]));}
const v207=v206;
let v208=v207;if(v208){
const v209=v172["norm_limit"];
const v210=0;
v208=((__float(v209)) >= (__float(v210)));}
return v208;}
function __fn13(v211){
const v212=0;
let v213;if(((__float(v211)) < (__float(v212)))){
v213=((v211 ^ 2147483648) >>> 0);}else{
v213=v211;}
return v213;}
function __fn14(v214,v215){
const v216=0;
let v217;if(((__float(v215)) === (__float(v216)))){
v217=1065353216;}else{
let v218=0;
for(let v219=0;v219<v214.length;v219++){
const v220=v214[v219];
const v221=__fn13(v220);
const v222=v218;
let v223;if(((__float(v221)) > (__float(v222)))){
v223=__fn13(v220);}else{
v223=v218;}
v218=v223;
}
const v224=v218;
const v225=0;
let v226;if(((__float(v224)) === (__float(v225)))){
v226=1065353216;}else{
let v227=0;
for(let v228=0;v228<v214.length;v228++){
const v229=v214[v228];
const v230=v227;
const v231=__bits((__float(v229))/(__float(v224)));
const v232=__bits((__float(v229))/(__float(v224)));
const v233=__bits(__float(v231) * __float(v232));
v227=__bits(__float(v230) + __float(v233));
}
const v234=v227;
const v235=__bits((__float(__bits((__float(v215))/(__float(v224)))))/(__float(__bits(Math.sqrt(__float(v234))))));
const v236=1065353216;
let v237;if(((__float(v235)) < (__float(v236)))){
v237=v235;}else{
v237=1065353216;}
v226=v237;}
v217=v226;}
return v217;}
function __fn15(v238,v239,v240,v241,v242,v243){
const v244=v243["rate"];
const v245=1065353216;
const v246=__bits((__float(v239))/(__float(__bits(__float(v245) - __float(v241)))));
const v247=1065353216;
const v248=__bits(Math.sqrt(__float(__bits((__float(v240))/(__float(__bits(__float(v247) - __float(v242))))))));
const v249=v243["epsilon"];
const v250=__bits((__float(__bits(__float(v244) * __float(v246))))/(__float(__bits(__float(v248) + __float(v249)))));
return __bits(__float(v238) - __float(v250));}
function __fn16(v251,v252,v253){
const v254=__fn10(v251);
const v255=false;
const v256=(v254===v255);
let v257=v256;if(!v257){
const v258=__fn12(v253);
const v259=false;
v257=(v258===v259);}
const v260=v257;
let v261=v260;if(!v261){
const v262=(v252).length;
const v263=(v251["weights"]).length;
v261=!(v262===v263);}
const v264=v261;
let v265=v264;if(!v265){
const v266=__fn9(v252);
const v267=false;
v265=(v266===v267);}
const v268=v265;
let v269=v268;if(!v269){
const v270=v251["steps"];
const v271=4294967295;
v269=(v270===v271);}
let v272;if(v269){
v272=({Err:"optimizer domain"});}else{
const v273=new __InkBuffer([]);
const v274=0;
let v275=({["adjusted"]:v273,["i"]:v274});
for(let v276=0;v276<v252.length;v276++){
const v277=v252[v276];
const v278=v275;
const v279=v278["adjusted"];
const v280=v275;
const v281=v280["i"];
const v282=v253["weight_decay"];
const v283=v251["weights"];
let v284;if(v281<v283.length){v284=v283[v281];}else{
v284=0;}
const v285=v284;
const v286=__bits(__float(v282) * __float(v285));
const v287=__bits(__float(v277) + __float(v286));
const v288=__tempEdit(v279,"push",v287);
const v289=1;
const v290=(((v281) + (v289)) >>> 0);
v275=({["adjusted"]:v288,["i"]:v290});
}
const v291=v275;
const v292=v291["adjusted"];
const v293=v291["i"];
const v294=v292.freeze();
const v295=__fn9(v294);
const v296=false;
let v297;if((v295===v296)){
v297=({Err:"nonfinite gradient"});}else{
const v298=v253["norm_limit"];
const v299=__fn14(v294,v298);
const v300=v251["first_power"];
const v301=v253["first_decay"];
const v302=__bits(__float(v300) * __float(v301));
const v303=v251["second_power"];
const v304=v253["second_decay"];
const v305=__bits(__float(v303) * __float(v304));
const v306=new __InkBuffer([]);
const v307=new __InkBuffer([]);
const v308=new __InkBuffer([]);
const v309=0;
let v310=({["first"]:v307,["i"]:v309,["second"]:v308,["weights"]:v306});
for(let v311=0;v311<v294.length;v311++){
const v312=v294[v311];
const v313=v310;
const v314=v313["first"];
const v315=v310;
const v316=v315["i"];
const v317=v310;
const v318=v317["second"];
const v319=v310;
const v320=v319["weights"];
const v321=__bits(__float(v312) * __float(v299));
const v322=v253["first_decay"];
const v323=v251["first"];
let v324;if(v316<v323.length){v324=v323[v316];}else{
v324=0;}
const v325=v324;
const v326=__bits(__float(v322) * __float(v325));
const v327=1065353216;
const v328=v253["first_decay"];
const v329=__bits(__float(v327) - __float(v328));
const v330=__bits(__float(v329) * __float(v321));
const v331=__bits(__float(v326) + __float(v330));
const v332=v253["second_decay"];
const v333=v251["second"];
let v334;if(v316<v333.length){v334=v333[v316];}else{
v334=0;}
const v335=v334;
const v336=__bits(__float(v332) * __float(v335));
const v337=1065353216;
const v338=v253["second_decay"];
const v339=__bits(__float(v337) - __float(v338));
const v340=__bits(__float(v339) * __float(v321));
const v341=__bits(__float(v340) * __float(v321));
const v342=__bits(__float(v336) + __float(v341));
const v343=v251["weights"];
let v344;if(v316<v343.length){v344=v343[v316];}else{
v344=0;}
const v345=v344;
const v346=__fn15(v345,v331,v342,v302,v305,v253);
const v347=__tempEdit(v320,"push",v346);
const v348=__tempEdit(v314,"push",v331);
const v349=__tempEdit(v318,"push",v342);
const v350=1;
const v351=(((v316) + (v350)) >>> 0);
v310=({["first"]:v348,["i"]:v351,["second"]:v349,["weights"]:v347});
}
const v352=v310;
const v353=v352["first"];
const v354=v352["i"];
const v355=v352["second"];
const v356=v352["weights"];
const v357=v356.freeze();
const v358=v353.freeze();
const v359=v355.freeze();
const v360=v251["steps"];
const v361=1;
const v362=(((v360) + (v361)) >>> 0);
const v363=({["weights"]:v357,["first"]:v358,["second"]:v359,["steps"]:v362,["first_power"]:v302,["second_power"]:v305});
const v364=__fn10(v363);
const v365=false;
let v366;if((v364===v365)){
v366=({Err:"nonfinite optimizer update"});}else{
v366=({Ok:v363});}
v297=v366;}
v272=v297;}
return v272;}
function __into1(v367,v368){
const v369=__bits(__dfNumber(v367["default_priority"]));
const v370=v367["state"];
const v371=__bits((v370["nodes"]).length);
const v372=v367["state"];
let v373;if(__fn0(v372)){
v373=1065353216;}else{
v373=0;}
const v374=v373;
const v375=1065353216;
const v376=[v369,v371,v374,v375];
const v377=v376.length;
for(let v378=0;v378<v377;v378++){
v368[v378]=__intoOutput1(v376[v378]);
}
return v377;}
const __namedTypes={"Context":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"__ink_loop_d853266e8e68c3e5b07de52a99fa99035e5456227fac17d0b189ccbaa1e31cb1_5":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_loop_d853266e8e68c3e5b07de52a99fa99035e5456227fac17d0b189ccbaa1e31cb1_5"},"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}};
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
function __action0(ctx,rt,s0,s1,s2){__tick(ctx);try{__tick(ctx);const s3=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11([1065353216,0,0,0])));__tick(ctx);const s4=({["weights"]:(s3)["weights"]});__tick(ctx);const s5=__fn1(s0);__tick(ctx);if(((((((__fn2(s4)===false))) || (((__fn9(s5)===false))))) || (((Number.isFinite(__float(s1))===false))))){__tick(ctx);return ({Err:"search learning domain"});}else{}__tick(ctx);const s6=__bits(__float(__fn3(s4,s5)) - __float(s1));__tick(ctx);const s7=__bits(__float(s6) * __float(s6));__tick(ctx);if(((Number.isFinite(__float(s7))===false))){__tick(ctx);return ({Err:"nonfinite search loss"});}else{}__tick(ctx);const s9=__mapValue(s5,"list","map",(s8)=>{__tick(ctx);return __bits(__float(__bits(__float(1073741824) * __float(s6))) * __float(s8));});__tick(ctx);const s10=__try(__fn16(s3,s9,s2));__tick(ctx);__tablePut(rt,0,0,({Ok:s10}),0);__tick(ctx);return ({Ok:s7});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __action1(ctx,rt){__tick(ctx);try{__tick(ctx);const s11=__try(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),__fn11([1065353216,0,0,0])));__tick(ctx);return ({Ok:({["weights"]:(s11)["weights"]})});}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
function __stateCommitRoot0(rt,key,prior,next,slot){__storeDirect(rt,0,key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[0]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}
const __stateDirectReadFactories=[null,null];
function __stateValueEqual2(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!((a[i]===b[i])))return false;return true;}
function __stateValueEqual5(a,b){if(a===b)return true;return __stateValueEqual2(a["weights"],b["weights"]);}
function __stateValueEqual1(a,b){if(a===b)return true;return __stateValueEqual2(a["weights"],b["weights"])&&__stateValueEqual2(a["first"],b["first"])&&__stateValueEqual2(a["second"],b["second"])&&(a["steps"]===b["steps"])&&(a["first_power"]===b["first_power"])&&(a["second_power"]===b["second_power"]);}
function __stateValueEqual3(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?(xv.Ok===yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual4(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual5(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __stateValueEqual0(a,b){if(a===b)return true;const xv=a,yv=b,x=Object.hasOwn(xv,'Ok');return x===Object.hasOwn(yv,'Ok')&&(x?__stateValueEqual1(xv.Ok,yv.Ok):(xv.Err===yv.Err));}
function __ownedInput7(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput8(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput4(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput5(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput2(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput3(value[i],budget,depth+1,maxDepth);return out;}
function __ownedInput8(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"entry")||!Object.hasOwn(value,"calls"))throw Error('invalid record');let field0=value["entry"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');let field1=value["calls"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');field1=__stateWord(field1);return {["entry"]:field0,["calls"]:field1};}
function __ownedInput0(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"id")||!Object.hasOwn(value,"source")||!Object.hasOwn(value,"target")||!Object.hasOwn(value,"state")||!Object.hasOwn(value,"default_priority")||!Object.hasOwn(value,"frequencies"))throw Error('invalid record');let field0=value["id"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');let field1=value["source"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='string'||!field1.isWellFormed())throw Error('invalid String');let field2=value["target"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field2!=='string'||!field2.isWellFormed())throw Error('invalid String');const field3=__ownedInput1(value["state"],budget,depth+1,maxDepth);const field4=__ownedInput6(value["default_priority"],budget,depth+1,maxDepth);const field5=__ownedInput7(value["frequencies"],budget,depth+1,maxDepth);return {["id"]:field0,["source"]:field1,["target"]:field2,["state"]:field3,["default_priority"]:field4,["frequencies"]:field5};}
function __ownedInput5(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"key")||!Object.hasOwn(value,"node"))throw Error('invalid record');let field0=value["key"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');let field1=value["node"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='number'||!Number.isInteger(field1)||field1<0||field1>4294967295)throw Error('invalid u32');if(field1===0)field1=0;return {["key"]:field0,["node"]:field1};}
function __ownedInput3(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"kind")||!Object.hasOwn(value,"value")||!Object.hasOwn(value,"edges"))throw Error('invalid record');let field0=value["kind"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='number'||!Number.isInteger(field0)||field0<0||field0>4294967295)throw Error('invalid u32');if(field0===0)field0=0;let field1=value["value"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='string'||!field1.isWellFormed())throw Error('invalid String');const field2=__ownedInput4(value["edges"],budget,depth+1,maxDepth);return {["kind"]:field0,["value"]:field1,["edges"]:field2};}
function __ownedInput1(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"nodes")||!Object.hasOwn(value,"root"))throw Error('invalid record');const field0=__ownedInput2(value["nodes"],budget,depth+1,maxDepth);let field1=value["root"];if(depth+1>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='number'||!Number.isInteger(field1)||field1<0||field1>4294967295)throw Error('invalid u32');if(field1===0)field1=0;return {["nodes"]:field0,["root"]:field1};}
function __ownedInput10(value,budget={cells:1000000},depth=0,maxDepth=64){if(depth>maxDepth||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"rate")||!Object.hasOwn(value,"first_decay")||!Object.hasOwn(value,"second_decay")||!Object.hasOwn(value,"epsilon")||!Object.hasOwn(value,"weight_decay")||!Object.hasOwn(value,"norm_limit"))throw Error('invalid record');const field0=__ownedInput9(value["rate"],budget,depth+1,maxDepth);const field1=__ownedInput9(value["first_decay"],budget,depth+1,maxDepth);const field2=__ownedInput9(value["second_decay"],budget,depth+1,maxDepth);const field3=__ownedInput9(value["epsilon"],budget,depth+1,maxDepth);const field4=__ownedInput9(value["weight_decay"],budget,depth+1,maxDepth);const field5=__ownedInput9(value["norm_limit"],budget,depth+1,maxDepth);return {["rate"]:field0,["first_decay"]:field1,["second_decay"]:field2,["epsilon"]:field3,["weight_decay"]:field4,["norm_limit"]:field5};}
const __ownedType9={"kind":"f32"};
function __ownedInput9(value,budget={cells:1000000},depth=0,maxDepth=64){return __stateInput(value,__ownedType9,budget,depth,maxDepth);}
const __ownedType6={"kind":"f64"};
function __ownedInput6(value,budget={cells:1000000},depth=0,maxDepth=64){return __stateInput(value,__ownedType6,budget,depth,maxDepth);}
const __stateFrozenFactories=[];
const __stateQueryEquals=[(a,b)=>__stateValueEqual3(a,b),(a,b)=>__stateValueEqual4(a,b)];
const __stateRootEquals=[(a,b)=>__stateValueEqual0(a,b)];
const __stateBoundFactories=[(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?(p0,p1,p2)=>run(a,[inputs[0](p0),inputs[1](p1),inputs[2](p2)],null,output,only,true):(p0,p1,p2)=>{const b0=inputs[0](p0);const b1=inputs[1](p1);const b2=inputs[2](p2);begin(a);try{return complete(a,__action0(rt.ctx,rt,b0,b1,b2),output,only);}catch(e){return abort(e);}finally{end();}},(run,a,inputs,output,only)=>()=>run(a,[],null,output,only,true)];const __statePreflightFactories=[null,null];
const __stateMetadata={"actions":[{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"feedback","params":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}},{"name":"target","type":{"kind":"f32"}},{"name":"config","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"context","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}},"roots":[0],"singleCell":true}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Learner","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}],"snapshot":{"program":[29,178,25,98,61,135,38,152,219,249,82,247,7,119,60,70,94,167,110,11,53,137,84,7,115,29,72,24,11,66,96,245],"schema":[57,195,170,59,180,190,232,66,28,142,251,61,166,108,119,0,188,153,152,81,69,146,156,70,16,34,240,104,11,105,224,246]},"snapshotRows":false};const __actions=[__action0,__action1];const __stateInputCaptures=[[__ownedInput0,__ownedInput9,__ownedInput10],[]];
export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v15","core_sha256":"03afe7ee331138a2d7c535113ceabb4e2af4f0743c989981a8a5aeeff199cb6f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"representation","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":1,"internal":false,"name":"features","parallel":false,"params":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":2,"internal":false,"name":"valid","parallel":false,"params":[{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":3,"internal":false,"name":"score","parallel":false,"params":[{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":4,"internal":false,"name":"priority","parallel":false,"params":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}},{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":5,"internal":false,"name":"ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}}],"precondition":null,"result":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"}},{"destination":null,"index":6,"internal":false,"name":"ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}},{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":7,"internal":false,"name":"ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}},{"name":"offset","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":8,"internal":false,"name":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","parallel":false,"params":[{"name":"rate","type":{"kind":"f32"}}],"precondition":null,"result":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},{"destination":null,"index":9,"internal":false,"name":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":10,"internal":false,"name":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":11,"internal":false,"name":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","parallel":false,"params":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},{"destination":null,"index":12,"internal":false,"name":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","parallel":false,"params":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":13,"internal":false,"name":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","parallel":false,"params":[{"name":"x","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":14,"internal":false,"name":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":15,"internal":false,"name":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","parallel":false,"params":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"kind":"f32"}},{"destination":null,"index":16,"internal":false,"name":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","parallel":false,"params":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}],"named_types":{"Context":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24":{"fields":[{"name":"first","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}},{"name":"second","type":{"kind":"temporary"}},{"name":"weights","type":{"kind":"temporary"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_24"},"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5":{"fields":[{"name":"adjusted","type":{"kind":"temporary"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"__ink_loop_bf770e63bfb4b31e3ac83a621b6975c750f03984a70534dbb402bc1286d27412_5"},"__ink_loop_d853266e8e68c3e5b07de52a99fa99035e5456227fac17d0b189ccbaa1e31cb1_5":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"value","type":{"kind":"f32"}}],"kind":"record","name":"__ink_loop_d853266e8e68c3e5b07de52a99fa99035e5456227fac17d0b189ccbaa1e31cb1_5"},"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"},"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"},"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"},"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"delegated_calls":1,"factory":true,"function":"representation","retained_bindings":1},{"delegated_calls":1,"factory":true,"function":"features","retained_bindings":1},{"factory":false,"function":"valid","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"score","retained_bindings":5},{"delegated_calls":2,"factory":true,"function":"priority","retained_bindings":3},{"factory":false,"function":"ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0","retained_bindings":2},{"delegated_calls":0,"factory":true,"function":"ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614","retained_bindings":2},{"factory":false,"function":"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7","retained_bindings":2},{"factory":false,"function":"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5","retained_bindings":3},{"factory":false,"function":"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be","retained_bindings":12}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":{"actions":[{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":0,"name":"feedback","params":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}},{"name":"target","type":{"kind":"f32"}},{"name":"config","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"f32"}},"roots":[0],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":1,"name":"context","params":[],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}},"roots":[0],"singleCell":true}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Learner","snapshotKey":{"kind":"u32"},"snapshotValue":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record"}},"value":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}],"snapshot":{"program":[29,178,25,98,61,135,38,152,219,249,82,247,7,119,60,70,94,167,110,11,53,137,84,7,115,29,72,24,11,66,96,245],"schema":[57,195,170,59,180,190,232,66,28,142,251,61,166,108,119,0,188,153,152,81,69,146,156,70,16,34,240,104,11,105,224,246]},"snapshotRows":false},"wire":{"format":"ink-value-wire-v1","functions":{"features":{"arguments":{"format":"ink-value-wire-v1","identity":"0eebbcbf6603a2f4b44b385acabbeca6cb405b71a13d9ea871f4fb81d2197eb3","named":{},"root":{"fields":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab":{"arguments":{"format":"ink-value-wire-v1","identity":"a9d67b7a474f78841986a2160f6d9330ec73efe55bb06560a35a27a22ad078b5","named":{},"root":{"fields":[{"name":"weight","type":{"kind":"f32"}},{"name":"first","type":{"kind":"f32"}},{"name":"second","type":{"kind":"f32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377":{"arguments":{"format":"ink-value-wire-v1","identity":"6c22d23db44659b46b7e85b5ea77dfb089997b3198cd930f2bb147e9809fc157","named":{},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7db8e33399b091e0531afbbb3abf2510d576c479b678919ad6f1e3dfa37d862b","named":{},"root":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"}}},"ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be":{"arguments":{"format":"ink-value-wire-v1","identity":"e0ef5b019bff93f73efd86b897d6f35ea8eb8b607d972cd47729126beaf5fafa","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},{"name":"gradient","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35":{"arguments":{"format":"ink-value-wire-v1","identity":"d7bb8db3ffe558eca9f4f6716e44807734e18db170e874ada1038fb500fa33ad","named":{},"root":{"fields":[{"name":"c","type":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db":{"arguments":{"format":"ink-value-wire-v1","identity":"95732fc2e08ae05f4d215e9e358781620c82dea66fab6ca4ada670422dd62463","named":{},"root":{"fields":[{"name":"state","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5":{"arguments":{"format":"ink-value-wire-v1","identity":"a7c17d063bba03b64d18b54cb89be038b3c836fdbf7ee6cc9644e5db742a8d67","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"limit","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0":{"arguments":{"format":"ink-value-wire-v1","identity":"64d3e66f85bacb21e9649437f5362605eca3f1f70cd45e2fd80e9f3d86713e4e","named":{},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}},{"name":"key","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d":{"arguments":{"format":"ink-value-wire-v1","identity":"3d9fa005996e654b10e4e749ab0e2c4a9988b4ba944f21f1019c2132cbcb62b2","named":{},"root":{"fields":[{"name":"x","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7":{"arguments":{"format":"ink-value-wire-v1","identity":"fb0d53fcc5118c446d80e19c4ffd8b95f7979f94f7fb23149d3518375b621a75","named":{},"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}}},"ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614":{"arguments":{"format":"ink-value-wire-v1","identity":"10b48a8415cf484aa16425e5dd3ce6dc22b07bd6b559a5be36a32637480ed1dc","named":{},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"index","type":{"kind":"u32"}},{"name":"offset","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d":{"arguments":{"format":"ink-value-wire-v1","identity":"4748bdf2b6e86fd410744d69adce4514614c078ede8a1a3a86a717f27b6f4802","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":{},"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}}},"priority":{"arguments":{"format":"ink-value-wire-v1","identity":"c3e41adbe8936d2de5968e9b6e5e2c979255c9da150b283e78f6ad9d0a8b5d92","named":{},"root":{"fields":[{"name":"candidate","type":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}},{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"representation":{"arguments":{"format":"ink-value-wire-v1","identity":"bba08ca31014a7aa3e78bea7a860b9407b8c568de24eb64d64128f123da539ac","named":{},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"score":{"arguments":{"format":"ink-value-wire-v1","identity":"0fc37bb5715e4330e2de8ef6aa6d72d530baa72ea6819a830d7dd680d13e0207","named":{},"root":{"fields":[{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}},{"name":"features","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":{},"root":{"kind":"f32"}}},"valid":{"arguments":{"format":"ink-value-wire-v1","identity":"58eb15155531517603e243689df8d3cf5183115eac79ded441bc0c85d91322a6","named":{},"root":{"fields":[{"name":"context","type":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[false],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}]},{"capture":[false],"types":[{"fields":[{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}]},{"capture":[false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}]},{"capture":[false,true],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"},{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false,false],"types":[{"fields":[{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"},{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}]},{"capture":[false,true],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"},{"kind":"u32"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"},{"kind":"u32"},{"kind":"string"}]},{"capture":[false,true,true],"types":[{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"},{"kind":"u32"},{"kind":"u32"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}]},{"capture":[true],"types":[{"element":{"kind":"f32"},"kind":"list"}]},{"capture":[false],"types":[{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[true],"types":[{"kind":"f32"}]},{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"f32"}]},{"capture":[true,true,true,true,true,false],"types":[{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"kind":"f32"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]},{"capture":[false,true,false],"types":[{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"},{"element":{"kind":"f32"},"kind":"list"},{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}]}];

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
function __ownedValue7(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue8(value[i],budget,depth+1);return out;}
function __ownedValue1(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue2(value[i],budget,depth+1);return out;}
function __ownedValue9(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue5(value.Some,budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue12(value.Ok,budget,depth+1)}:{Err:__ownedValue6(value.Err,budget,depth+1)};}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);return {["key"]:__ownedValue6(value["key"],budget,depth+1),["node"]:__ownedValue5(value["node"],budget,depth+1)};}
function __ownedValue4(value,budget,depth){budget.enter(depth,4);return {["kind"]:__ownedValue5(value["kind"],budget,depth+1),["value"]:__ownedValue6(value["value"],budget,depth+1),["edges"]:__ownedValue7(value["edges"],budget,depth+1)};}
function __ownedValue10(value,budget,depth){budget.enter(depth,4);return {["rate"]:__ownedValue2(value["rate"],budget,depth+1),["first_decay"]:__ownedValue2(value["first_decay"],budget,depth+1),["second_decay"]:__ownedValue2(value["second_decay"],budget,depth+1),["epsilon"]:__ownedValue2(value["epsilon"],budget,depth+1),["weight_decay"]:__ownedValue2(value["weight_decay"],budget,depth+1),["norm_limit"]:__ownedValue2(value["norm_limit"],budget,depth+1)};}
function __ownedValue12(value,budget,depth){budget.enter(depth,4);return {["weights"]:__ownedValue1(value["weights"],budget,depth+1),["first"]:__ownedValue1(value["first"],budget,depth+1),["second"]:__ownedValue1(value["second"],budget,depth+1),["steps"]:__ownedValue5(value["steps"],budget,depth+1),["first_power"]:__ownedValue2(value["first_power"],budget,depth+1),["second_power"]:__ownedValue2(value["second_power"],budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue2(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __ownedValue3(value,budget,depth){budget.enter(depth,12);return {F64Bits:__dfBits(value).toString()};}
function __ownedValue6(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue5(value,budget,depth){budget.enter(depth,8);return value>>>0;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["representation",__ownedValue0],["features",__ownedValue1],["valid",__ownedValue0],["score",__ownedValue2],["priority",__ownedValue3],["ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377",__ownedValue4],["ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0",__ownedValue9],["ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614",__ownedValue9],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",__ownedValue10],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",__ownedValue0],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",__ownedValue0],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",__ownedValue11],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",__ownedValue0],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",__ownedValue2],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",__ownedValue2],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",__ownedValue2],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",__ownedValue11]]));
function __wireValue10(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue11(reader);reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue8(reader);reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue5(reader);reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue14(reader);reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue6(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue2(reader)}:{Ok:__wireValue19(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value={["c"]:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue32(reader){const end=reader.frame();const value={["candidate"]:__wireValue1(reader),["context"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["candidate"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue35(reader){const end=reader.frame();const value={["context"]:__wireValue33(reader),["features"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue36(reader){const end=reader.frame();const value={["context"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value={["document"]:__wireValue3(reader),["index"]:__wireValue6(reader),["key"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value={["document"]:__wireValue3(reader),["index"]:__wireValue6(reader),["offset"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value={["document"]:__wireValue3(reader),["index"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue34(reader){const end=reader.frame();const value={["document"]:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["entry"]:__wireValue2(reader),["calls"]:__wireValue12(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["id"]:__wireValue2(reader),["source"]:__wireValue2(reader),["target"]:__wireValue2(reader),["state"]:__wireValue3(reader),["default_priority"]:__wireValue9(reader),["frequencies"]:__wireValue10(reader)};reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={["key"]:__wireValue2(reader),["node"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["kind"]:__wireValue6(reader),["value"]:__wireValue2(reader),["edges"]:__wireValue7(reader)};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={["nodes"]:__wireValue4(reader),["root"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const value={["rate"]:__wireValue14(reader),["first_decay"]:__wireValue14(reader),["second_decay"]:__wireValue14(reader),["epsilon"]:__wireValue14(reader),["weight_decay"]:__wireValue14(reader),["norm_limit"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue31(reader){const end=reader.frame();const value={["rate"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["state"]:__wireValue19(reader),["gradient"]:__wireValue13(reader),["c"]:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["state"]:__wireValue19(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value={["weight"]:__wireValue14(reader),["first"]:__wireValue14(reader),["second"]:__wireValue14(reader),["first_power"]:__wireValue14(reader),["second_power"]:__wireValue14(reader),["c"]:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value={["weights"]:__wireValue13(reader),["first"]:__wireValue13(reader),["second"]:__wireValue13(reader),["steps"]:__wireValue6(reader),["first_power"]:__wireValue14(reader),["second_power"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const value={["weights"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value={["weights"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value={["x"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue24(reader){const end=reader.frame();const value={["xs"]:__wireValue13(reader),["limit"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value={["xs"]:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const value={F32Bits:reader.word()};reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value={F64Bits:reader.wide().toString()};reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value=reader.wide();reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["features",[__wireValue0,__wireValue13]],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",[__wireValue15,__wireValue14]],["ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377",[__wireValue17,__wireValue5]],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",[__wireValue18,__wireValue20]],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",[__wireValue21,__wireValue22]],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",[__wireValue23,__wireValue22]],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",[__wireValue24,__wireValue14]],["ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0",[__wireValue25,__wireValue26]],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",[__wireValue27,__wireValue14]],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",[__wireValue28,__wireValue22]],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",[__wireValue29,__wireValue20]],["ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614",[__wireValue30,__wireValue26]],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",[__wireValue31,__wireValue16]],["priority",[__wireValue32,__wireValue9]],["representation",[__wireValue34,__wireValue22]],["score",[__wireValue35,__wireValue14]],["valid",[__wireValue36,__wireValue22]]]));

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
function __privateCapture5(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture6(value[i],budget,depth+1);return out;}
function __privateCapture1(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture2(value[i],budget,depth+1);return out;}
function __privateCapture13(value,budget,depth=0){budget.enter(depth,4);if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView))){throw Error('invalid value for wire schema');}const n=value.length;if(n>budget.remaining){throw Error('invalid value for wire schema');}budget.add(4);const out=new Array(n);for(let i=0;i<n;i++)out[i]=__privateCapture14(value[i],budget,depth+1);return out;}
function __privateCapture16(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if((value!==null&&typeof value==='object'&&Object.hasOwn(value,'None')&&Object.keys(value).length===1)&&value.None===null)return {None:null};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Some')&&Object.keys(value).length===1)return {Some:__privateCapture3(value.Some,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture19(value,budget,depth=0){budget.enter(depth,4);budget.add(1);if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Ok')&&Object.keys(value).length===1)return {Ok:__privateCapture18(value.Ok,budget,depth+1)};if(value!==null&&typeof value==='object'&&Object.hasOwn(value,'Err')&&Object.keys(value).length===1)return {Err:__privateCapture4(value.Err,budget,depth+1)};throw Error('invalid value for wire schema');}
function __privateCapture11(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"entry")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"calls")){throw Error('invalid value for wire schema');}return {["entry"]:__privateCapture4(value["entry"],budget,depth+1),["calls"]:__privateCapture12(value["calls"],budget,depth+1)};}
function __privateCapture8(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"id")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"source")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"target")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"state")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"default_priority")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"frequencies")){throw Error('invalid value for wire schema');}return {["id"]:__privateCapture4(value["id"],budget,depth+1),["source"]:__privateCapture4(value["source"],budget,depth+1),["target"]:__privateCapture4(value["target"],budget,depth+1),["state"]:__privateCapture0(value["state"],budget,depth+1),["default_priority"]:__privateCapture9(value["default_priority"],budget,depth+1),["frequencies"]:__privateCapture10(value["frequencies"],budget,depth+1)};}
function __privateCapture6(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"key")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"node")){throw Error('invalid value for wire schema');}return {["key"]:__privateCapture4(value["key"],budget,depth+1),["node"]:__privateCapture3(value["node"],budget,depth+1)};}
function __privateCapture2(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==3){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"kind")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"value")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"edges")){throw Error('invalid value for wire schema');}return {["kind"]:__privateCapture3(value["kind"],budget,depth+1),["value"]:__privateCapture4(value["value"],budget,depth+1),["edges"]:__privateCapture5(value["edges"],budget,depth+1)};}
function __privateCapture0(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"nodes")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"root")){throw Error('invalid value for wire schema');}return {["nodes"]:__privateCapture1(value["nodes"],budget,depth+1),["root"]:__privateCapture3(value["root"],budget,depth+1)};}
function __privateCapture17(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"rate")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"epsilon")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weight_decay")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"norm_limit")){throw Error('invalid value for wire schema');}return {["rate"]:__privateCapture14(value["rate"],budget,depth+1),["first_decay"]:__privateCapture14(value["first_decay"],budget,depth+1),["second_decay"]:__privateCapture14(value["second_decay"],budget,depth+1),["epsilon"]:__privateCapture14(value["epsilon"],budget,depth+1),["weight_decay"]:__privateCapture14(value["weight_decay"],budget,depth+1),["norm_limit"]:__privateCapture14(value["norm_limit"],budget,depth+1)};}
function __privateCapture18(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==6){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weights")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"steps")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"first_power")){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"second_power")){throw Error('invalid value for wire schema');}return {["weights"]:__privateCapture13(value["weights"],budget,depth+1),["first"]:__privateCapture13(value["first"],budget,depth+1),["second"]:__privateCapture13(value["second"],budget,depth+1),["steps"]:__privateCapture3(value["steps"],budget,depth+1),["first_power"]:__privateCapture14(value["first_power"],budget,depth+1),["second_power"]:__privateCapture14(value["second_power"],budget,depth+1)};}
function __privateCapture15(value,budget,depth=0){budget.enter(depth,4);if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1){throw Error('invalid value for wire schema');}if(!Object.hasOwn(value,"weights")){throw Error('invalid value for wire schema');}return {["weights"]:__privateCapture13(value["weights"],budget,depth+1)};}
function __privateCapture7(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='boolean'){throw Error('invalid value for wire schema');}budget.add(1);return value;}
function __privateCapture14(value,budget,depth=0){budget.enter(depth,4);let bits;if(typeof value==='number'&&Number.isFinite(value)){bits=__bits(value);if(!Number.isFinite(__float(bits))){throw Error('invalid value for wire schema');}}else{if(!(value!==null&&typeof value==='object'&&Object.hasOwn(value,'F32Bits')&&Object.keys(value).length===1)){throw Error('invalid value for wire schema');}bits=value.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295){throw Error('invalid value for wire schema');}}budget.add(4);return bits===0?0:bits;}
function __privateCapture9(value,budget,depth=0){budget.enter(depth,4);const result=__dfCapture(value);budget.add(8);return result;}
function __privateCapture4(value,budget,depth=0){budget.enter(depth,4);const text=value;if(typeof text!=='string'||!text.isWellFormed()||text.length>budget.limit){throw Error('invalid value for wire schema');}budget.text(text);return text;}
function __privateCapture3(value,budget,depth=0){budget.enter(depth,4);if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4294967295){throw Error('invalid value for wire schema');}budget.add(4);return value===0?0:value;}
function __privateCapture12(value,budget,depth=0){budget.enter(depth,4);const kind=typeof value;if(kind==='number'&&!Number.isSafeInteger(value)||kind!=='bigint'&&kind!=='number'&&kind!=='string'||kind==='string'&&!/^(0|[1-9][0-9]*)$/.test(value)){throw Error('invalid value for wire schema');}const n=BigInt(value);if(n<0n||n>18446744073709551615n){throw Error('invalid value for wire schema');}budget.add(8);return n;}
function __privateWireValue11(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue12(reader);reader.finish(end);return value;}
function __privateWireValue5(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue6(reader);reader.finish(end);return value;}
function __privateWireValue1(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue2(reader);reader.finish(end);return value;}
function __privateWireValue14(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__privateWireValue15(reader);reader.finish(end);return value;}
function __privateWireValue22(reader){const end=reader.frame();const value=reader.byte()?{Some:__privateWireValue3(reader)}:{None:null};reader.finish(end);return value;}
function __privateWireValue30(reader){const end=reader.frame();const value=reader.byte()?{Err:__privateWireValue4(reader)}:{Ok:__privateWireValue28(reader)};reader.finish(end);return value;}
function __privateWireValue32(reader){const end=reader.frame();const value={["c"]:__privateWireValue25(reader)};reader.finish(end);return value;}
function __privateWireValue20(reader){const end=reader.frame();const value={["candidate"]:__privateWireValue9(reader),["context"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue16(reader){const end=reader.frame();const value={["candidate"]:__privateWireValue9(reader)};reader.finish(end);return value;}
function __privateWireValue19(reader){const end=reader.frame();const value={["context"]:__privateWireValue17(reader),["features"]:__privateWireValue14(reader)};reader.finish(end);return value;}
function __privateWireValue18(reader){const end=reader.frame();const value={["context"]:__privateWireValue17(reader)};reader.finish(end);return value;}
function __privateWireValue23(reader){const end=reader.frame();const value={["document"]:__privateWireValue0(reader),["index"]:__privateWireValue3(reader),["key"]:__privateWireValue4(reader)};reader.finish(end);return value;}
function __privateWireValue24(reader){const end=reader.frame();const value={["document"]:__privateWireValue0(reader),["index"]:__privateWireValue3(reader),["offset"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue21(reader){const end=reader.frame();const value={["document"]:__privateWireValue0(reader),["index"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue8(reader){const end=reader.frame();const value={["document"]:__privateWireValue0(reader)};reader.finish(end);return value;}
function __privateWireValue12(reader){const end=reader.frame();const value={["entry"]:__privateWireValue4(reader),["calls"]:__privateWireValue13(reader)};reader.finish(end);return value;}
function __privateWireValue9(reader){const end=reader.frame();const value={["id"]:__privateWireValue4(reader),["source"]:__privateWireValue4(reader),["target"]:__privateWireValue4(reader),["state"]:__privateWireValue0(reader),["default_priority"]:__privateWireValue10(reader),["frequencies"]:__privateWireValue11(reader)};reader.finish(end);return value;}
function __privateWireValue6(reader){const end=reader.frame();const value={["key"]:__privateWireValue4(reader),["node"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue2(reader){const end=reader.frame();const value={["kind"]:__privateWireValue3(reader),["value"]:__privateWireValue4(reader),["edges"]:__privateWireValue5(reader)};reader.finish(end);return value;}
function __privateWireValue0(reader){const end=reader.frame();const value={["nodes"]:__privateWireValue1(reader),["root"]:__privateWireValue3(reader)};reader.finish(end);return value;}
function __privateWireValue25(reader){const end=reader.frame();const value={["rate"]:__privateWireValue15(reader),["first_decay"]:__privateWireValue15(reader),["second_decay"]:__privateWireValue15(reader),["epsilon"]:__privateWireValue15(reader),["weight_decay"]:__privateWireValue15(reader),["norm_limit"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue26(reader){const end=reader.frame();const value={["rate"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue36(reader){const end=reader.frame();const value={["state"]:__privateWireValue28(reader),["gradient"]:__privateWireValue14(reader),["c"]:__privateWireValue25(reader)};reader.finish(end);return value;}
function __privateWireValue29(reader){const end=reader.frame();const value={["state"]:__privateWireValue28(reader)};reader.finish(end);return value;}
function __privateWireValue35(reader){const end=reader.frame();const value={["weight"]:__privateWireValue15(reader),["first"]:__privateWireValue15(reader),["second"]:__privateWireValue15(reader),["first_power"]:__privateWireValue15(reader),["second_power"]:__privateWireValue15(reader),["c"]:__privateWireValue25(reader)};reader.finish(end);return value;}
function __privateWireValue28(reader){const end=reader.frame();const value={["weights"]:__privateWireValue14(reader),["first"]:__privateWireValue14(reader),["second"]:__privateWireValue14(reader),["steps"]:__privateWireValue3(reader),["first_power"]:__privateWireValue15(reader),["second_power"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue17(reader){const end=reader.frame();const value={["weights"]:__privateWireValue14(reader)};reader.finish(end);return value;}
function __privateWireValue31(reader){const end=reader.frame();const value={["weights"]:__privateWireValue14(reader)};reader.finish(end);return value;}
function __privateWireValue33(reader){const end=reader.frame();const value={["x"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue34(reader){const end=reader.frame();const value={["xs"]:__privateWireValue14(reader),["limit"]:__privateWireValue15(reader)};reader.finish(end);return value;}
function __privateWireValue27(reader){const end=reader.frame();const value={["xs"]:__privateWireValue14(reader)};reader.finish(end);return value;}
function __privateWireValue7(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __privateWireValue15(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue10(reader){const end=reader.frame();const value=__dfFromBits(reader.wide());reader.finish(end);return value;}
function __privateWireValue4(reader){const end=reader.frame();const value=reader.text(end,"string");reader.finish(end);return value;}
function __privateWireValue3(reader){const end=reader.frame();const value=reader.word();reader.finish(end);return value;}
function __privateWireValue13(reader){const end=reader.frame();const value=reader.wide();reader.finish(end);return value;}
function __compiledOwnedValue10(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue11(value[i],budget,depth+1);return out;}
function __compiledOwnedValue5(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue6(value[i],budget,depth+1);return out;}
function __compiledOwnedValue1(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue2(value[i],budget,depth+1);return out;}
function __compiledOwnedValue13(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__compiledOwnedValue14(value[i],budget,depth+1);return out;}
function __compiledOwnedValue16(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__compiledOwnedValue3(value.Some,budget,depth+1)};}
function __compiledOwnedValue19(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__compiledOwnedValue18(value.Ok,budget,depth+1)}:{Err:__compiledOwnedValue4(value.Err,budget,depth+1)};}
function __compiledOwnedValue11(value,budget,depth){budget.enter(depth,4);return {["entry"]:__compiledOwnedValue4(value["entry"],budget,depth+1),["calls"]:__compiledOwnedValue12(value["calls"],budget,depth+1)};}
function __compiledOwnedValue8(value,budget,depth){budget.enter(depth,4);return {["id"]:__compiledOwnedValue4(value["id"],budget,depth+1),["source"]:__compiledOwnedValue4(value["source"],budget,depth+1),["target"]:__compiledOwnedValue4(value["target"],budget,depth+1),["state"]:__compiledOwnedValue0(value["state"],budget,depth+1),["default_priority"]:__compiledOwnedValue9(value["default_priority"],budget,depth+1),["frequencies"]:__compiledOwnedValue10(value["frequencies"],budget,depth+1)};}
function __compiledOwnedValue6(value,budget,depth){budget.enter(depth,4);return {["key"]:__compiledOwnedValue4(value["key"],budget,depth+1),["node"]:__compiledOwnedValue3(value["node"],budget,depth+1)};}
function __compiledOwnedValue2(value,budget,depth){budget.enter(depth,4);return {["kind"]:__compiledOwnedValue3(value["kind"],budget,depth+1),["value"]:__compiledOwnedValue4(value["value"],budget,depth+1),["edges"]:__compiledOwnedValue5(value["edges"],budget,depth+1)};}
function __compiledOwnedValue0(value,budget,depth){budget.enter(depth,4);return {["nodes"]:__compiledOwnedValue1(value["nodes"],budget,depth+1),["root"]:__compiledOwnedValue3(value["root"],budget,depth+1)};}
function __compiledOwnedValue17(value,budget,depth){budget.enter(depth,4);return {["rate"]:__compiledOwnedValue14(value["rate"],budget,depth+1),["first_decay"]:__compiledOwnedValue14(value["first_decay"],budget,depth+1),["second_decay"]:__compiledOwnedValue14(value["second_decay"],budget,depth+1),["epsilon"]:__compiledOwnedValue14(value["epsilon"],budget,depth+1),["weight_decay"]:__compiledOwnedValue14(value["weight_decay"],budget,depth+1),["norm_limit"]:__compiledOwnedValue14(value["norm_limit"],budget,depth+1)};}
function __compiledOwnedValue18(value,budget,depth){budget.enter(depth,4);return {["weights"]:__compiledOwnedValue13(value["weights"],budget,depth+1),["first"]:__compiledOwnedValue13(value["first"],budget,depth+1),["second"]:__compiledOwnedValue13(value["second"],budget,depth+1),["steps"]:__compiledOwnedValue3(value["steps"],budget,depth+1),["first_power"]:__compiledOwnedValue14(value["first_power"],budget,depth+1),["second_power"]:__compiledOwnedValue14(value["second_power"],budget,depth+1)};}
function __compiledOwnedValue15(value,budget,depth){budget.enter(depth,4);return {["weights"]:__compiledOwnedValue13(value["weights"],budget,depth+1)};}
function __compiledOwnedValue7(value,budget,depth){budget.enter(depth,5);return value;}
function __compiledOwnedValue14(value,budget,depth){budget.enter(depth,8);return {F32Bits:value===0?0:value};}
function __compiledOwnedValue9(value,budget,depth){budget.enter(depth,12);return {F64Bits:__dfBits(value).toString()};}
function __compiledOwnedValue4(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __compiledOwnedValue3(value,budget,depth){budget.enter(depth,8);return value>>>0;}
function __compiledOwnedValue12(value,budget,depth){budget.enter(depth,12);return BigInt(value);}
function __privateWireWrite10(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite11(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite5(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite6(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite1(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite2(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite13(writer,value,compact){const frame=writer.openFrame();writer.count(value.length);for(let i=0;i<value.length;i++)__privateWireWrite14(writer,value[i],compact);writer.closeFrame(frame);}
function __privateWireWrite16(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Some')){writer.byte(1);__privateWireWrite3(writer,value.Some,compact);}else{writer.byte(0);}writer.closeFrame(frame);}
function __privateWireWrite19(writer,value,compact){const frame=writer.openFrame();if(Object.hasOwn(value,'Ok')){writer.byte(0);__privateWireWrite18(writer,value.Ok,compact);}else{writer.byte(1);__privateWireWrite4(writer,value.Err,compact);}writer.closeFrame(frame);}
function __privateWireWrite11(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["entry"],compact);__privateWireWrite12(writer,value["calls"],compact);writer.closeFrame(frame);}
function __privateWireWrite8(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["id"],compact);__privateWireWrite4(writer,value["source"],compact);__privateWireWrite4(writer,value["target"],compact);__privateWireWrite0(writer,value["state"],compact);__privateWireWrite9(writer,value["default_priority"],compact);__privateWireWrite10(writer,value["frequencies"],compact);writer.closeFrame(frame);}
function __privateWireWrite6(writer,value,compact){const frame=writer.openFrame();__privateWireWrite4(writer,value["key"],compact);__privateWireWrite3(writer,value["node"],compact);writer.closeFrame(frame);}
function __privateWireWrite2(writer,value,compact){const frame=writer.openFrame();__privateWireWrite3(writer,value["kind"],compact);__privateWireWrite4(writer,value["value"],compact);__privateWireWrite5(writer,value["edges"],compact);writer.closeFrame(frame);}
function __privateWireWrite0(writer,value,compact){const frame=writer.openFrame();__privateWireWrite1(writer,value["nodes"],compact);__privateWireWrite3(writer,value["root"],compact);writer.closeFrame(frame);}
function __privateWireWrite17(writer,value,compact){const frame=writer.openFrame();__privateWireWrite14(writer,value["rate"],compact);__privateWireWrite14(writer,value["first_decay"],compact);__privateWireWrite14(writer,value["second_decay"],compact);__privateWireWrite14(writer,value["epsilon"],compact);__privateWireWrite14(writer,value["weight_decay"],compact);__privateWireWrite14(writer,value["norm_limit"],compact);writer.closeFrame(frame);}
function __privateWireWrite18(writer,value,compact){const frame=writer.openFrame();__privateWireWrite13(writer,value["weights"],compact);__privateWireWrite13(writer,value["first"],compact);__privateWireWrite13(writer,value["second"],compact);__privateWireWrite3(writer,value["steps"],compact);__privateWireWrite14(writer,value["first_power"],compact);__privateWireWrite14(writer,value["second_power"],compact);writer.closeFrame(frame);}
function __privateWireWrite15(writer,value,compact){const frame=writer.openFrame();__privateWireWrite13(writer,value["weights"],compact);writer.closeFrame(frame);}
function __privateWireWrite7(writer,value,compact){const frame=writer.openFrame();writer.byte(value?1:0);writer.closeFrame(frame);}
function __privateWireWrite14(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite9(writer,value,compact){const frame=writer.openFrame();writer.wide(__dfBits(value));writer.closeFrame(frame);}
function __privateWireWrite4(writer,value,compact){const frame=writer.openFrame();writer.text(value,compact);writer.closeFrame(frame);}
function __privateWireWrite3(writer,value,compact){const frame=writer.openFrame();writer.word(value);writer.closeFrame(frame);}
function __privateWireWrite12(writer,value,compact){const frame=writer.openFrame();writer.wide(value);writer.closeFrame(frame);}
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
let __constructorNodesValue;function __constructorNodes(){return __constructorNodesValue??=[{kind:'record',fields:["nodes","root"],patterns:[{bytes:4,label:"record",children:[1,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["nodes"]:values[0],["root"]:values[1]})}]},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[2],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["kind","value","edges"],patterns:[{bytes:4,label:"record",children:[3,4,5],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["kind"]:values[0],["value"]:values[1],["edges"]:values[2]})}]},{kind:"u32",scalar:__privateCapture3},{kind:"string",scalar:__privateCapture4},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[6],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["key","node"],patterns:[{bytes:4,label:"record",children:[4,3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["key"]:values[0],["node"]:values[1]})}]},{kind:"bool",scalar:__privateCapture7},{kind:'record',fields:["id","source","target","state","default_priority","frequencies"],patterns:[{bytes:4,label:"record",children:[4,4,4,0,9,10],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["id"]:values[0],["source"]:values[1],["target"]:values[2],["state"]:values[3],["default_priority"]:values[4],["frequencies"]:values[5]})}]},{kind:"f64",scalar:__privateCapture9},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[11],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:'record',fields:["entry","calls"],patterns:[{bytes:4,label:"record",children:[4,12],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["entry"]:values[0],["calls"]:values[1]})}]},{kind:"u64",scalar:__privateCapture12},{kind:"list",patterns:[{bytes:8,label:"sequence",children:[14],childDepth:1,sequence:true,charge:(budget,depth)=>{budget.enter(depth,8);},make:values=>(values)}]},{kind:"f32",scalar:__privateCapture14},{kind:'record',fields:["weights"],patterns:[{bytes:4,label:"record",children:[13],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["weights"]:values[0]})}]},{kind:'option',patterns:[{bytes:5,label:"None",children:[],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({None:null})},{bytes:5,label:"Some",children:[3],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>({Some:values[0]})}]},{kind:'record',fields:["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"],patterns:[{bytes:4,label:"record",children:[14,14,14,14,14,14],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["rate"]:values[0],["first_decay"]:values[1],["second_decay"]:values[2],["epsilon"]:values[3],["weight_decay"]:values[4],["norm_limit"]:values[5]})}]},{kind:'record',fields:["weights","first","second","steps","first_power","second_power"],patterns:[{bytes:4,label:"record",children:[13,13,13,3,14,14],childDepth:1,charge:(budget,depth)=>{budget.enter(depth,4);},make:values=>({["weights"]:values[0],["first"]:values[1],["second"]:values[2],["steps"]:values[3],["first_power"]:values[4],["second_power"]:values[5]})}]},{kind:'result',flat:null,patterns:[{bytes:5,label:"Ok",children:[18],childDepth:1,sumBranch:0,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Ok:values[0]}))},{bytes:5,label:"Err",children:[4],childDepth:1,sumBranch:1,charge:(budget,depth)=>{budget.enter(depth,5);},make:values=>(({Err:values[0]}))}]}];}
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
function __reduceValue0(value,r,b,d,c){b.enter(d,4);return r[0](__reduceValue1(value["nodes"],r,b,d+1,c),__reduceValue3(value["root"],r,b,d+1,c),c);}
function __reduceValue1(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[1];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue2(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue2(value,r,b,d,c){b.enter(d,4);return r[2](__reduceValue3(value["kind"],r,b,d+1,c),__reduceValue4(value["value"],r,b,d+1,c),__reduceValue5(value["edges"],r,b,d+1,c),c);}
function __reduceValue3(value,r,b,d,c){b.enter(d,8);return r[3](value,c);}
function __reduceValue4(value,r,b,d,c){b.enter(d,4);b.text(value);return r[4](value,c);}
function __reduceValue5(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[5];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue6(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue6(value,r,b,d,c){b.enter(d,4);return r[6](__reduceValue4(value["key"],r,b,d+1,c),__reduceValue3(value["node"],r,b,d+1,c),c);}
function __reduceValue7(value,r,b,d,c){b.enter(d,5);return r[7](value,c);}
function __reduceValue8(value,r,b,d,c){b.enter(d,4);return r[8](__reduceValue4(value["id"],r,b,d+1,c),__reduceValue4(value["source"],r,b,d+1,c),__reduceValue4(value["target"],r,b,d+1,c),__reduceValue0(value["state"],r,b,d+1,c),__reduceValue9(value["default_priority"],r,b,d+1,c),__reduceValue10(value["frequencies"],r,b,d+1,c),c);}
function __reduceValue9(value,r,b,d,c){b.enter(d,12);return r[9]({F64Bits:__dfBits(value).toString()},c);}
function __reduceValue10(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[10];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue11(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue11(value,r,b,d,c){b.enter(d,4);return r[11](__reduceValue4(value["entry"],r,b,d+1,c),__reduceValue12(value["calls"],r,b,d+1,c),c);}
function __reduceValue12(value,r,b,d,c){b.enter(d,12);return r[12](value,c);}
function __reduceValue13(value,r,b,d,c){b.enter(d,8);const n=value.length;if(n>b.remaining)throw Error('wire sequence size');const a=r[13];let out=a.start(n,c);for(let i=0;i<n;i++)out=a.step(out,__reduceValue14(value[i],r,b,d+1,c),i,c);return a.finish(out,c);}
function __reduceValue14(value,r,b,d,c){b.enter(d,8);return r[14]({F32Bits:value},c);}
function __reduceValue15(value,r,b,d,c){b.enter(d,4);return r[15](__reduceValue13(value["weights"],r,b,d+1,c),c);}
function __reduceValue16(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'None')&&value.None===null?r[16](0,null,c):r[16](1,__reduceValue3(value.Some,r,b,d+1,c),c);}
function __reduceValue17(value,r,b,d,c){b.enter(d,4);return r[17](__reduceValue14(value["rate"],r,b,d+1,c),__reduceValue14(value["first_decay"],r,b,d+1,c),__reduceValue14(value["second_decay"],r,b,d+1,c),__reduceValue14(value["epsilon"],r,b,d+1,c),__reduceValue14(value["weight_decay"],r,b,d+1,c),__reduceValue14(value["norm_limit"],r,b,d+1,c),c);}
function __reduceValue18(value,r,b,d,c){b.enter(d,4);return r[18](__reduceValue13(value["weights"],r,b,d+1,c),__reduceValue13(value["first"],r,b,d+1,c),__reduceValue13(value["second"],r,b,d+1,c),__reduceValue3(value["steps"],r,b,d+1,c),__reduceValue14(value["first_power"],r,b,d+1,c),__reduceValue14(value["second_power"],r,b,d+1,c),c);}
function __reduceValue19(value,r,b,d,c){b.enter(d,5);return Object.hasOwn(value,'Ok')?r[19](0,__reduceValue18(value.Ok,r,b,d+1,c),c):r[19](1,__reduceValue4(value.Err,r,b,d+1,c),c);}
let __reductionNodeCache;function __reductionNodes(){return __reductionNodeCache??=Object.freeze([Object.freeze({"children":Object.freeze([1,3]),"fields":Object.freeze(["nodes","root"]),"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}),Object.freeze({"children":Object.freeze([2]),"kind":"list"}),Object.freeze({"children":Object.freeze([3,4,5]),"fields":Object.freeze(["kind","value","edges"]),"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"}),Object.freeze({"children":Object.freeze([]),"kind":"u32"}),Object.freeze({"children":Object.freeze([]),"kind":"string"}),Object.freeze({"children":Object.freeze([6]),"kind":"list"}),Object.freeze({"children":Object.freeze([4,3]),"fields":Object.freeze(["key","node"]),"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"}),Object.freeze({"children":Object.freeze([]),"kind":"bool"}),Object.freeze({"children":Object.freeze([4,4,4,0,9,10]),"fields":Object.freeze(["id","source","target","state","default_priority","frequencies"]),"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}),Object.freeze({"children":Object.freeze([]),"kind":"f64"}),Object.freeze({"children":Object.freeze([11]),"kind":"list"}),Object.freeze({"children":Object.freeze([4,12]),"fields":Object.freeze(["entry","calls"]),"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"}),Object.freeze({"children":Object.freeze([]),"kind":"u64"}),Object.freeze({"children":Object.freeze([14]),"kind":"list"}),Object.freeze({"children":Object.freeze([]),"kind":"f32"}),Object.freeze({"children":Object.freeze([13]),"fields":Object.freeze(["weights"]),"kind":"record","name":"Context"}),Object.freeze({"children":Object.freeze([3]),"kind":"option"}),Object.freeze({"children":Object.freeze([14,14,14,14,14,14]),"fields":Object.freeze(["rate","first_decay","second_decay","epsilon","weight_decay","norm_limit"]),"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}),Object.freeze({"children":Object.freeze([13,13,13,3,14,14]),"fields":Object.freeze(["weights","first","second","steps","first_power","second_power"]),"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}),Object.freeze({"children":Object.freeze([18,4]),"kind":"result"})]);}
function __compiledNamed0(){return {};}
let __compiledCodec0Value;function __compiledCodec0(){return __compiledCodec0Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0ae6eb72a9383b55942324aa8214104ebef08e65900e1b9f808b0393c29509f1","named":__compiledNamed0(),"root":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},__privateCapture0,__privateWireValue0,__privateWireWrite0,__compiledOwnedValue0,0,0,__reduceValue0,false,false);}
let __compiledCodec1Value;function __compiledCodec1(){return __compiledCodec1Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":__compiledNamed0(),"root":{"kind":"bool"}},__privateCapture7,__privateWireValue7,__privateWireWrite7,__compiledOwnedValue7,7,7,__reduceValue7,false,false);}
let __compiledCodec2Value;function __compiledCodec2(){return __compiledCodec2Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"a6e5b3f8fdfd8330c7655ad5b82c57bdfbc7968ea2eba8aa72dd0a6b03a6c8ef","named":__compiledNamed0(),"root":{"fields":[{"name":"id","type":{"kind":"string"}},{"name":"source","type":{"kind":"string"}},{"name":"target","type":{"kind":"string"}},{"name":"state","type":{"fields":[{"name":"nodes","type":{"element":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"},"kind":"list"}},{"name":"root","type":{"kind":"u32"}}],"kind":"record","name":"ink_m190c572637e56bb926f9015be77084be7e3cb075dce1ab57a83ff45c4af1c580"}},{"name":"default_priority","type":{"kind":"f64"}},{"name":"frequencies","type":{"element":{"fields":[{"name":"entry","type":{"kind":"string"}},{"name":"calls","type":{"kind":"u64"}}],"kind":"record","name":"ink_mbe585accda517095562b5e501e54b389194464a8867ba155a60af94a950c4aaa"},"kind":"list"}}],"kind":"record","name":"ink_mcee221c86f03bc824bb89e5bd9f7e59c5a3a2d833e58176ee7020e0c2d4aa81a"}},__privateCapture8,__privateWireValue9,__privateWireWrite8,__compiledOwnedValue8,8,8,__reduceValue8,false,false);}
let __compiledCodec3Value;function __compiledCodec3(){return __compiledCodec3Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":__compiledNamed0(),"root":{"element":{"kind":"f32"},"kind":"list"}},__privateCapture13,__privateWireValue14,__privateWireWrite13,__compiledOwnedValue13,13,13,__reduceValue13,false,false);}
let __compiledCodec4Value;function __compiledCodec4(){return __compiledCodec4Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"2931adf06daced705ad9e31f92ce2c61700da68fec744d04161a9b4ddb3049cd","named":__compiledNamed0(),"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"Context"}},__privateCapture15,__privateWireValue17,__privateWireWrite15,__compiledOwnedValue15,15,15,__reduceValue15,false,false);}
let __compiledCodec5Value;function __compiledCodec5(){return __compiledCodec5Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fde3b27ba939906c22dbea906c407580e89648dd4d5a55c4f4001e45157ebe45","named":__compiledNamed0(),"root":{"kind":"f32"}},__privateCapture14,__privateWireValue15,__privateWireWrite14,__compiledOwnedValue14,14,14,__reduceValue14,false,false);}
let __compiledCodec6Value;function __compiledCodec6(){return __compiledCodec6Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":__compiledNamed0(),"root":{"kind":"f64"}},__privateCapture9,__privateWireValue10,__privateWireWrite9,__compiledOwnedValue9,9,9,__reduceValue9,false,false);}
let __compiledCodec7Value;function __compiledCodec7(){return __compiledCodec7Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":__compiledNamed0(),"root":{"kind":"u32"}},__privateCapture3,__privateWireValue3,__privateWireWrite3,__compiledOwnedValue3,3,3,__reduceValue3,false,false);}
let __compiledCodec8Value;function __compiledCodec8(){return __compiledCodec8Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"7db8e33399b091e0531afbbb3abf2510d576c479b678919ad6f1e3dfa37d862b","named":__compiledNamed0(),"root":{"fields":[{"name":"kind","type":{"kind":"u32"}},{"name":"value","type":{"kind":"string"}},{"name":"edges","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"node","type":{"kind":"u32"}}],"kind":"record","name":"ink_mcec4db8a42927a6e861d19d9cc8bb43123495290baaf3a896379c56220e948a1"},"kind":"list"}}],"kind":"record","name":"ink_m995c6e7b3992e66f90ffe9068edbf2b567feeac3b9c999b8831d643700a0e6e6"}},__privateCapture2,__privateWireValue2,__privateWireWrite2,__compiledOwnedValue2,2,2,__reduceValue2,false,false);}
let __compiledCodec9Value;function __compiledCodec9(){return __compiledCodec9Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"1cdb97f14e69255770652db593f88ce0009f937c28d02381f37b2c643dc1470e","named":__compiledNamed0(),"root":{"kind":"string"}},__privateCapture4,__privateWireValue4,__privateWireWrite4,__compiledOwnedValue4,4,4,__reduceValue4,false,false);}
let __compiledCodec10Value;function __compiledCodec10(){return __compiledCodec10Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":__compiledNamed0(),"root":{"element":{"kind":"u32"},"kind":"option"}},__privateCapture16,__privateWireValue22,__privateWireWrite16,__compiledOwnedValue16,16,16,__reduceValue16,false,false);}
let __compiledCodec11Value;function __compiledCodec11(){return __compiledCodec11Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"ebe1deeb6dfcd30c7222004d895fd628b866b66eaba30c8067beddc0fad06e6e","named":__compiledNamed0(),"root":{"fields":[{"name":"rate","type":{"kind":"f32"}},{"name":"first_decay","type":{"kind":"f32"}},{"name":"second_decay","type":{"kind":"f32"}},{"name":"epsilon","type":{"kind":"f32"}},{"name":"weight_decay","type":{"kind":"f32"}},{"name":"norm_limit","type":{"kind":"f32"}}],"kind":"record","name":"ink_m9855292354160c3a107c125b8c215caf588dc8c3b3949a93e9ef8e771b334249"}},__privateCapture17,__privateWireValue25,__privateWireWrite17,__compiledOwnedValue17,17,17,__reduceValue17,false,false);}
let __compiledCodec12Value;function __compiledCodec12(){return __compiledCodec12Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"fb51f6ef47ef23bec5fa30a1bf44674eef7e617546994700a49bccfb4c1baba3","named":__compiledNamed0(),"root":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}},__privateCapture18,__privateWireValue28,__privateWireWrite18,__compiledOwnedValue18,18,18,__reduceValue18,false,false);}
let __compiledCodec13Value;function __compiledCodec13(){return __compiledCodec13Value??=__compiledCodec({"format":"ink-value-wire-v1","identity":"93944e72b897c9246b2efb71a34cebe025e2d57af4d472565578d66dcdc24614","named":__compiledNamed0(),"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"weights","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"first","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"second","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"steps","type":{"kind":"u32"}},{"name":"first_power","type":{"kind":"f32"}},{"name":"second_power","type":{"kind":"f32"}}],"kind":"record","name":"ink_md0e21302c2c2a82a6b87784e492f7b2e65c3a0ef3b191fb5e2428cbb90610fab"}}},__privateCapture19,__privateWireValue30,__privateWireWrite19,__compiledOwnedValue19,19,19,__reduceValue19,false,false);}
const __compiledEntries=new Map([["representation",{index:0,params:[__compiledCodec0],result:__compiledCodec1,arguments:__privateWireValue8,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["features",{index:1,params:[__compiledCodec2],result:__compiledCodec3,arguments:__privateWireValue16,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["valid",{index:2,params:[__compiledCodec4],result:__compiledCodec1,arguments:__privateWireValue18,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["score",{index:3,params:[__compiledCodec4,__compiledCodec3],result:__compiledCodec5,arguments:__privateWireValue19,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["priority",{index:4,params:[__compiledCodec2,__compiledCodec4],result:__compiledCodec6,arguments:__privateWireValue20,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m1c4e1f25848ebbef9303081224a974041975f358afbe749fdf78dc262071e377",{index:5,params:[__compiledCodec0,__compiledCodec7],result:__compiledCodec8,arguments:__privateWireValue21,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m8208085cc84460402f8326cfc6d36d6f5a7b39330a24d65b77695bd8a91dd5b0",{index:6,params:[__compiledCodec0,__compiledCodec7,__compiledCodec9],result:__compiledCodec10,arguments:__privateWireValue23,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_me71db5c877d5f469ea23c5a711b2203e86a3204dd1f03ee80b0d09f4e7a92614",{index:7,params:[__compiledCodec0,__compiledCodec7,__compiledCodec7],result:__compiledCodec10,arguments:__privateWireValue24,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}],["ink_meefc22a28d97f5bdc4100b36eeab9549241c3ef201b83c2f75111644d317833d",{index:8,params:[__compiledCodec5],result:__compiledCodec11,arguments:__privateWireValue26,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_ma7989fd41503b856aac5b390003c2c4aff5f8c7c67e22867c2e88acff5a22d96",{index:9,params:[__compiledCodec3],result:__compiledCodec1,arguments:__privateWireValue27,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m786bdc6011aece08dbf36c5ca89c437e06ff758c9d3d242f723dde2af6ea31db",{index:10,params:[__compiledCodec12],result:__compiledCodec1,arguments:__privateWireValue29,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_mdfbd57a9f460147afedb262e2bfe0f6197f9b813c85277c59f5e101900063ad7",{index:11,params:[__compiledCodec3],result:__compiledCodec13,arguments:__privateWireValue31,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m5226ad25deae5e47d7fb65b6b5961d46740dd4e97b54d76a24d3d0445845fe35",{index:12,params:[__compiledCodec11],result:__compiledCodec1,arguments:__privateWireValue32,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m8abb6b2bcbe55251e0b82a28f26d7ce761729346e35019c2b60ca9b5ee22590d",{index:13,params:[__compiledCodec5],result:__compiledCodec5,arguments:__privateWireValue33,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false],precondition:null}],["ink_m7d03a2ed6071238ff1b69a8e56a8cb96b9dc3b095b2d939c0ccfed84ee9580b5",{index:14,params:[__compiledCodec3,__compiledCodec5],result:__compiledCodec5,arguments:__privateWireValue34,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false],precondition:null}],["ink_m00ba8185ca362d257d138fe1886cbc5f3acc38c4a238bef60c3d3d7fa0276eab",{index:15,params:[__compiledCodec5,__compiledCodec5,__compiledCodec5,__compiledCodec5,__compiledCodec5,__compiledCodec11],result:__compiledCodec5,arguments:__privateWireValue35,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false,false,false,false],precondition:null}],["ink_m2a55f95a80595bc61d1fcab41ff00f438ff6f2057b597df20aaae3c18507d2be",{index:16,params:[__compiledCodec12,__compiledCodec3,__compiledCodec11],result:__compiledCodec13,arguments:__privateWireValue36,argumentCodecs:[null,null],boundaryReaders:[false,false],onlyTypeGuards:false,needsInvariants:[false,false,false],precondition:null}]]);

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
const __intoOutput1=__representation(metadata.functions[1].result.element,true);
const __intoImplementations=[null,__into1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
function __prepareFn0(fixed,depth=0){if(depth>=16)return __fn0;const v383=fixed[0];let v382=false,v381;
let v386;
return function(v379){let v380;if(v383&&v382){v380=v381;}else{
const v384=v379["root"];
const v385="representation";
if(!v386){const v387=__preparedFactories.get(6);v386=v387?v387([fixed[0],fixed[0],true],depth+1):__fn6;}
const v388=v386(v379,v384,v385);
let v390;if(Object.hasOwn(v388,"Some")){
const v391=v388["Some"];
v390=v391;}else{
const v392=null;
v390=4294967295;}
v380=v390;if(v383){v381=v380;v382=true;}}
const v393=v380;
const v394=__fn5(v379,v393);
const v395=v394["kind"];
const v396=0;
return !(v395===v396);};}
function __prepareFn1(fixed,depth=0){if(depth>=16)return __fn1;const v406=fixed[0];let v405=false,v404;
let v408;
return function(v397){const v398=__bits(__dfNumber(v397["default_priority"]));
const v400=v397["state"];
const v401=__bits((v400["nodes"]).length);
let v403;if(v406&&v405){v403=v404;}else{
const v407=v397["state"];
if(!v408){const v409=__preparedFactories.get(0);v408=v409?v409([fixed[0]],depth+1):__fn0;}
v403=v408(v407);if(v406){v404=v403;v405=true;}}
let v410;if(v403){
v410=1065353216;}else{
v410=0;}
const v411=v410;
const v413=1065353216;
return [v398,v401,v411,v413];};}
function __prepareFn3(fixed,depth=0){if(depth>=16)return __fn3;const v426=true;let v425=false,v424;
const v430=true;let v429=false,v428;
const v434=fixed[0]&&fixed[1];let v433=false,v432;
const v459=fixed[0]&&fixed[1];let v458=false,v457;
const v464=fixed[0]&&fixed[1];let v463=false,v462;
return function(v421,v422){let v423;if(v426&&v425){v423=v424;}else{
v423=0;if(v426){v424=v423;v425=true;}}
let v427;if(v430&&v429){v427=v428;}else{
v427=0;if(v430){v428=v427;v429=true;}}
let v431;if(v434&&v433){v431=v432;}else{
const v435=v427;
const v436=v423;
let v437=({["index"]:v435,["value"]:v436});
for(let v438=0;v438<v422.length;v438++){
const v439=v422[v438];
const v441=v437;
const v440=v441["index"];
const v443=v437;
const v442=v443["value"];
const v445=v442;
const v446=v421["weights"];
const v447=v440;
let v448;if(v447<v446.length){v448=v446[v447];}else{
v448=0;}
const v449=v448;
const v450=__bits(__float(v439) * __float(v449));
const v444=__bits(__float(v445) + __float(v450));
const v452=v440;
const v453=1;
const v451=(((v452) + (v453)) >>> 0);
const v454=v451;
const v455=v444;
v437=({["index"]:v454,["value"]:v455});
}
v431=v437;if(v434){v432=v431;v433=true;}}
let v456;if(v459&&v458){v456=v457;}else{
const v460=v431;
v456=v460["index"];if(v459){v457=v456;v458=true;}}
let v461;if(v464&&v463){v461=v462;}else{
const v465=v431;
v461=v465["value"];if(v464){v462=v461;v463=true;}}
return v461;};}
function __prepareFn4(fixed,depth=0){if(depth>=16)return __fn4;const v471=fixed[0];let v470=false,v469;
let v472;
const v477=fixed[0]&&fixed[1];let v476=false,v475;
const v489=fixed[0]&&fixed[1];let v488=false,v487;
let v491;
return function(v466,v467){let v468;if(v471&&v470){v468=v469;}else{
if(!v472){const v473=__preparedFactories.get(1);v472=v473?v473([fixed[0]],depth+1):__fn1;}
v468=v472(v466);if(v471){v469=v468;v470=true;}}
let v474;if(v477&&v476){v474=v475;}else{
const v478=__fn2(v467);
const v479=false;
const v480=(v478===v479);
let v481=v480;if(!v481){
const v482=v468;
const v483=__fn9(v482);
const v484=false;
v481=(v483===v484);}
v474=v481;if(v477){v475=v474;v476=true;}}
let v485;if(v474){
v485=v466["default_priority"];}else{
let v486;if(v489&&v488){v486=v487;}else{
const v490=v468;
if(!v491){const v492=__preparedFactories.get(3);v491=v492?v492([fixed[1],fixed[0]],depth+1):__fn3;}
v486=v491(v467,v490);if(v489){v487=v486;v488=true;}}
const v493=Number.isFinite(__float(v486));
let v494;if(v493){
v494=__float(v486);}else{
v494=v466["default_priority"];}
v485=v494;}
return v485;};}
function __prepareFn6(fixed,depth=0){if(depth>=16)return __fn6;const v511=fixed[0]&&fixed[1];let v510=false,v509;
const v520=fixed[0]&&fixed[1]&&fixed[2];let v519=false,v518;
return function(v502,v503,v504){const v505=(v502["nodes"]).length;
const v506=((v503) >= (v505));
let v507;if(v506){
v507=({None:null});}else{
let v508;if(v511&&v510){v508=v509;}else{
v508=__fn5(v502,v503);if(v511){v509=v508;v510=true;}}
const v512=v508;
const v513=v512["kind"];
const v514=5;
const v515=!(v513===v514);
let v516;if(v515){
v516=({None:null});}else{
let v517;if(v520&&v519){v517=v518;}else{
const v521=v508;
const v522=v521["edges"];
let v523=({None:null});
for(let v524=0;v524<v522.length;v524++){
const v525=v522[v524];
const v526=v525["key"];
const v527=(v526===v504);
const v528=v525["key"];
const v529=(v528===v504);
let v530;if(v529){
v530=({Some:v525["node"]});}else{
v530=v523;}
v523=v530;
if(v527)break;
}
v517=v523;if(v520){v518=v517;v519=true;}}
const v531=v517;
let v532;if(Object.hasOwn(v531,"Some")){
const v533=v531["Some"];
const v534=(v502["nodes"]).length;
let v535;if(((v533) < (v534))){
v535=({Some:v533});}else{
v535=({None:null});}
v532=v535;}else{
const v536=null;
v532=({None:null});}
v516=v532;}
v507=v516;}
return v507;};}
function __prepareFn7(fixed,depth=0){if(depth>=16)return __fn7;const v546=fixed[0]&&fixed[1];let v545=false,v544;
const v559=fixed[0]&&fixed[1]&&fixed[2];let v558=false,v557;
return function(v537,v538,v539){const v540=(v537["nodes"]).length;
const v541=((v538) >= (v540));
let v542;if(v541){
v542=({None:null});}else{
let v543;if(v546&&v545){v543=v544;}else{
v543=__fn5(v537,v538);if(v546){v544=v543;v545=true;}}
const v547=v543;
const v548=v547["kind"];
const v549=4;
const v550=!(v548===v549);
let v551=v550;if(!v551){
const v552=v543;
const v553=(v552["edges"]).length;
v551=((v539) >= (v553));}
const v554=v551;
let v555;if(v554){
v555=({None:null});}else{
let v556;if(v559&&v558){v556=v557;}else{
const v560=v543;
const v561=v560["edges"];
let v562;if(v539<v561.length){v562=v561[v539];}else{
const v563="";
const v564=4294967295;
v562=({["key"]:v563,["node"]:v564});}
const v565=v562;
v556=v565["node"];if(v559){v557=v556;v558=true;}}
const v566=v556;
const v567=(v537["nodes"]).length;
const v568=((v566) < (v567));
let v569;if(v568){
v569=({Some:v556});}else{
v569=({None:null});}
v555=v569;}
v542=v555;}
return v542;};}
function __prepareFn11(fixed,depth=0){if(depth>=16)return __fn11;const v627=fixed[0];let v626=false,v625;
const v634=fixed[0];let v633=false,v632;
return function(v623){let v624;if(v627&&v626){v624=v625;}else{
const v628=__fn9(v623);
const v629=false;
v624=(v628===v629);if(v627){v625=v624;v626=true;}}
let v630;if(v624){
v630=({Err:"nonfinite weights"});}else{
let v631;if(v634&&v633){v631=v632;}else{
const v635=[];for(let v636=0;v636<v623.length;v636++){
const v637=v623[v636];
v635.push(0);}
v631=v635;if(v634){v632=v631;v633=true;}}
const v638=v631;
const v639=v631;
const v640=0;
const v641=1065353216;
const v642=1065353216;
v630=({Ok:({["weights"]:v623,["first"]:v638,["second"]:v639,["steps"]:v640,["first_power"]:v641,["second_power"]:v642})});}
return v630;};}
function __prepareFn14(fixed,depth=0){if(depth>=16)return __fn14;const v694=fixed[0];let v693=false,v692;
const v709=fixed[0];let v708=false,v707;
const v720=fixed[0]&&fixed[1];let v719=false,v718;
return function(v686,v687){const v688=0;
const v689=((__float(v687)) === (__float(v688)));
let v690;if(v689){
v690=1065353216;}else{
let v691;if(v694&&v693){v691=v692;}else{
let v695=0;
for(let v696=0;v696<v686.length;v696++){
const v697=v686[v696];
const v699=__fn13(v697);
const v700=v695;
const v698=((__float(v699)) > (__float(v700)));
let v701;if(v698){
v701=__fn13(v697);}else{
v701=v695;}
v695=v701;
}
v691=v695;if(v694){v692=v691;v693=true;}}
const v702=v691;
const v703=0;
const v704=((__float(v702)) === (__float(v703)));
let v705;if(v704){
v705=1065353216;}else{
let v706;if(v709&&v708){v706=v707;}else{
let v710=0;
for(let v711=0;v711<v686.length;v711++){
const v712=v686[v711];
const v713=v710;
const v714=__bits((__float(v712))/(__float(v691)));
const v715=__bits((__float(v712))/(__float(v691)));
const v716=__bits(__float(v714) * __float(v715));
v710=__bits(__float(v713) + __float(v716));
}
v706=v710;if(v709){v707=v706;v708=true;}}
let v717;if(v720&&v719){v717=v718;}else{
v717=__bits((__float(__bits((__float(v687))/(__float(v691)))))/(__float(__bits(Math.sqrt(__float(v706))))));if(v720){v718=v717;v719=true;}}
const v721=v717;
const v722=1065353216;
const v723=((__float(v721)) < (__float(v722)));
let v724;if(v723){
v724=v717;}else{
v724=1065353216;}
v705=v724;}
v690=v705;}
return v690;};}
function __prepareFn16(fixed,depth=0){if(depth>=16)return __fn16;const v744=fixed[0]&&fixed[1]&&fixed[2];let v743=false,v742;
const v768=true;let v767=false,v766;
const v793=fixed[0]&&fixed[1]&&fixed[2];let v792=false,v791;
const v798=fixed[0]&&fixed[1]&&fixed[2];let v797=false,v796;
const v803=fixed[0]&&fixed[1]&&fixed[2];let v802=false,v801;
const v811=fixed[0]&&fixed[1]&&fixed[2];let v810=false,v809;
let v814;
const v819=fixed[0]&&fixed[2];let v818=false,v817;
const v825=fixed[0]&&fixed[2];let v824=false,v823;
const v834=true;let v833=false,v832;
const v891=fixed[0]&&fixed[1]&&fixed[2];let v890=false,v889;
const v900=fixed[0]&&fixed[1]&&fixed[2];let v899=false,v898;
const v915=fixed[0]&&fixed[1]&&fixed[2];let v914=false,v913;
return function(v738,v739,v740){let v741;if(v744&&v743){v741=v742;}else{
const v745=__fn10(v738);
const v746=false;
const v747=(v745===v746);
let v748=v747;if(!v748){
const v749=__fn12(v740);
const v750=false;
v748=(v749===v750);}
const v751=v748;
let v752=v751;if(!v752){
const v753=(v739).length;
const v754=(v738["weights"]).length;
v752=!(v753===v754);}
const v755=v752;
let v756=v755;if(!v756){
const v757=__fn9(v739);
const v758=false;
v756=(v757===v758);}
const v759=v756;
let v760=v759;if(!v760){
const v761=v738["steps"];
const v762=4294967295;
v760=(v761===v762);}
v741=v760;if(v744){v742=v741;v743=true;}}
let v763;if(v741){
v763=({Err:"optimizer domain"});}else{
const v764=new __InkBuffer([]);
let v765;if(v768&&v767){v765=v766;}else{
v765=0;if(v768){v766=v765;v767=true;}}
const v770=v764;
const v771=v765;
let v772=({["adjusted"]:v770,["i"]:v771});
for(let v773=0;v773<v739.length;v773++){
const v774=v739[v773];
const v775=v772;
const v776=v775["adjusted"];
const v777=v772;
const v778=v777["i"];
const v779=v740["weight_decay"];
const v780=v738["weights"];
let v781;if(v778<v780.length){v781=v780[v778];}else{
v781=0;}
const v782=v781;
const v783=__bits(__float(v779) * __float(v782));
const v784=__bits(__float(v774) + __float(v783));
const v785=__tempEdit(v776,"push",v784);
const v786=1;
const v787=(((v778) + (v786)) >>> 0);
v772=({["adjusted"]:v785,["i"]:v787});
}
const v769=v772;
const v789=v769;
const v788=v789["adjusted"];
let v790;if(v793&&v792){v790=v791;}else{
const v794=v769;
v790=v794["i"];if(v793){v791=v790;v792=true;}}
let v795;if(v798&&v797){v795=v796;}else{
const v799=v788;
v795=v799.freeze();if(v798){v796=v795;v797=true;}}
let v800;if(v803&&v802){v800=v801;}else{
const v804=v795;
const v805=__fn9(v804);
const v806=false;
v800=(v805===v806);if(v803){v801=v800;v802=true;}}
let v807;if(v800){
v807=({Err:"nonfinite gradient"});}else{
let v808;if(v811&&v810){v808=v809;}else{
const v812=v795;
const v813=v740["norm_limit"];
if(!v814){const v815=__preparedFactories.get(14);v814=v815?v815([fixed[0]&&fixed[1]&&fixed[2],fixed[2]],depth+1):__fn14;}
v808=v814(v812,v813);if(v811){v809=v808;v810=true;}}
let v816;if(v819&&v818){v816=v817;}else{
const v820=v738["first_power"];
const v821=v740["first_decay"];
v816=__bits(__float(v820) * __float(v821));if(v819){v817=v816;v818=true;}}
let v822;if(v825&&v824){v822=v823;}else{
const v826=v738["second_power"];
const v827=v740["second_decay"];
v822=__bits(__float(v826) * __float(v827));if(v825){v823=v822;v824=true;}}
const v828=new __InkBuffer([]);
const v829=new __InkBuffer([]);
const v830=new __InkBuffer([]);
let v831;if(v834&&v833){v831=v832;}else{
v831=0;if(v834){v832=v831;v833=true;}}
const v836=v795;
const v837=v829;
const v838=v831;
const v839=v830;
const v840=v828;
let v841=({["first"]:v837,["i"]:v838,["second"]:v839,["weights"]:v840});
for(let v842=0;v842<v836.length;v842++){
const v843=v836[v842];
const v844=v841;
const v845=v844["first"];
const v846=v841;
const v847=v846["i"];
const v848=v841;
const v849=v848["second"];
const v850=v841;
const v851=v850["weights"];
const v852=v808;
const v853=__bits(__float(v843) * __float(v852));
const v854=v740["first_decay"];
const v855=v738["first"];
let v856;if(v847<v855.length){v856=v855[v847];}else{
v856=0;}
const v857=v856;
const v858=__bits(__float(v854) * __float(v857));
const v859=1065353216;
const v860=v740["first_decay"];
const v861=__bits(__float(v859) - __float(v860));
const v862=__bits(__float(v861) * __float(v853));
const v863=__bits(__float(v858) + __float(v862));
const v864=v740["second_decay"];
const v865=v738["second"];
let v866;if(v847<v865.length){v866=v865[v847];}else{
v866=0;}
const v867=v866;
const v868=__bits(__float(v864) * __float(v867));
const v869=1065353216;
const v870=v740["second_decay"];
const v871=__bits(__float(v869) - __float(v870));
const v872=__bits(__float(v871) * __float(v853));
const v873=__bits(__float(v872) * __float(v853));
const v874=__bits(__float(v868) + __float(v873));
const v875=v738["weights"];
let v876;if(v847<v875.length){v876=v875[v847];}else{
v876=0;}
const v877=v876;
const v878=v816;
const v879=v822;
const v880=__fn15(v877,v863,v874,v878,v879,v740);
const v881=__tempEdit(v851,"push",v880);
const v882=__tempEdit(v845,"push",v863);
const v883=__tempEdit(v849,"push",v874);
const v884=1;
const v885=(((v847) + (v884)) >>> 0);
v841=({["first"]:v882,["i"]:v885,["second"]:v883,["weights"]:v881});
}
const v835=v841;
const v887=v835;
const v886=v887["first"];
let v888;if(v891&&v890){v888=v889;}else{
const v892=v835;
v888=v892["i"];if(v891){v889=v888;v890=true;}}
const v894=v835;
const v893=v894["second"];
const v896=v835;
const v895=v896["weights"];
let v897;if(v900&&v899){v897=v898;}else{
const v901=v895;
const v902=v901.freeze();
const v903=v886;
const v904=v903.freeze();
const v905=v893;
const v906=v905.freeze();
const v907=v738["steps"];
const v908=1;
const v909=(((v907) + (v908)) >>> 0);
const v910=v816;
const v911=v822;
v897=({["weights"]:v902,["first"]:v904,["second"]:v906,["steps"]:v909,["first_power"]:v910,["second_power"]:v911});if(v900){v898=v897;v899=true;}}
let v912;if(v915&&v914){v912=v913;}else{
const v916=v897;
const v917=__fn10(v916);
const v918=false;
v912=(v917===v918);if(v915){v913=v912;v914=true;}}
let v919;if(v912){
v919=({Err:"nonfinite optimizer update"});}else{
v919=({Ok:v897});}
v807=v919;}
v763=v807;}
return v763;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[3,__prepareFn3],[4,__prepareFn4],[6,__prepareFn6],[7,__prepareFn7],[11,__prepareFn11],[14,__prepareFn14],[16,__prepareFn16]]);
