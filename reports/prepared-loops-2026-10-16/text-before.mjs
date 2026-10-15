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
const v3=v0;
const v4=v1;
const v5=v2;
return __fn17(v3,v4,v5);}
function __fn1(v6,v7,v8){
const v9=v6;
const v10=v7;
const v11=1000000;
const v12=__fn17(v9,v10,v11);
let v13;if(Object.hasOwn(v12,"Ok")){
const v14=v12["Ok"];
const v15=v14;
const v16=v15;
const v17=v8;
v13=__fn34(v16,v17);}else{
const v18=v12["Err"];
v13=({Err:v18});}
return v13;}
function __fn2(v19,v20,v21){
const v22=v19;
const v23=v20;
const v24=1000000;
const v25=__fn17(v22,v23,v24);
let v26;if(Object.hasOwn(v25,"Ok")){
const v27=v25["Ok"];
const v28=v27;
const v29=v28;
const v30=v21;
v26=__fn30(v29,v30);}else{
const v31=v25["Err"];
v26=({Err:v31});}
return v26;}
function __fn3(v32,v33,v34){
const v35=v32;
const v36=v33;
const v37=1000000;
const v38=__fn17(v35,v36,v37);
let v39;if(Object.hasOwn(v38,"Ok")){
const v40=v38["Ok"];
const v41=v40;
const v42=v41;
const v43=v34;
v39=__fn28(v42,v43);}else{
const v44=v38["Err"];
v39=({Err:v44});}
return v39;}
function __fn4(v45,v46,v47,v48){
const v49=v45;
const v50=v46;
const v51=1000000;
const v52=__fn17(v49,v50,v51);
let v53;if(Object.hasOwn(v52,"Ok")){
const v54=v52["Ok"];
const v55=v54;
const v56=v55;
const v57=v47;
const v58=v48;
v53=__fn35(v56,v57,v58);}else{
const v59=v52["Err"];
v53=({Err:v59});}
return v53;}
function __fn5(v60,v61,v62,v63){
const v64=v60;
const v65=v61;
const v66=1000000;
const v67=__fn17(v64,v65,v66);
let v68;if(Object.hasOwn(v67,"Ok")){
const v69=v67["Ok"];
const v70=v69;
const v71=v70;
const v72=v62;
const v73=v63;
v68=__fn25(v71,v72,v73);}else{
const v74=v67["Err"];
v68=({Err:v74});}
return v68;}
function __fn6(v75,v76){
const v77=v75;
const v78=v76;
return __fn34(v77,v78);}
function __fn7(v79){
const v80=v79;
const v81=v80.length;
const v82=new Array(v81);
for(let v83=0;v83<v81;v83++){
const v84=v80[v83];
const v85=v84;
const v86=v84;
const v87=__bits(__float(v85) * __float(v86));
const v88=1056964608;
v82[v83]=__bits(__float(v87) + __float(v88));
}
return v82;}
function __fn8(v89,v90){
const v91=v89;
let v92;if(Object.hasOwn(v91,"Some")){
const v93=v91["Some"];
const v94=v93;
const v95=v90;
let v96;if(v95<v94.length){v96=v94[v95];}else{
v96=__dfFromBits(0n);}
v92=v96;}else{
const v97=null;
v92=__dfFromBits(0n);}
return v92;}
function __fn9(v98,v99){
const v100=v98;
const v101=v100["graphemeStartExtras"];
let v102;if(Object.hasOwn(v101,"Some")){
const v103=v101["Some"];
const v104=v103;
const v105=v99;
let v106;if(v105<v104.length){v106=v104[v105];}else{
v106=({None:null});}
v102=v106;}else{
const v107=null;
v102=({None:null});}
return v102;}
function __fn10(v108,v109){
const v110=v108;
const v111=v110["flags"];
const v112=v109;
let v113;if(v112<v111.length){v113=v111[v112];}else{
v113=0;}
const v114=v113;
const v115=15;
return (((v114)&(v115))>>>0);}
function __fn11(v116,v117,v118){
const v119=v116;
const v120=v117;
const v121=__fn10(v119,v120);
const v122=1;
const v123=(v121===v122);
let v124=v123;if(!v124){
const v125=v116;
const v126=v117;
const v127=__fn10(v125,v126);
const v128=2;
const v129=(v127===v128);
let v130=v129;if(v130){
const v131=v118;
const v132=false;
v130=(v131===v132);}
v124=v130;}
return v124;}
function __fn12(v133,v134){
const v135=v133;
const v136=v134;
const v137=__fn10(v135,v136);
const v138=1;
const v139=(v137===v138);
let v140=v139;if(!v140){
const v141=v133;
const v142=v134;
const v143=__fn10(v141,v142);
const v144=2;
v140=(v143===v144);}
return v140;}
function __fn13(v145){
const v146=v145;
let v147=true;
for(let v148=0;v148<v146.length;v148++){
const v149=v146[v148];
const v150=v147;
let v151=v150;if(v151){
v151=Number.isFinite(__dfNumber(v149));}
v147=v151;
}
return v147;}
function __fn14(v152,v153){
const v154=v152;
let v155;if(Object.hasOwn(v154,"Some")){
const v156=v154["Some"];
const v157=v156;
const v158=v157.length;
const v159=1000000;
const v160=((v158) <= (v159));
let v161=v160;if(v161){
const v162=(v156).length;
const v163=v153;
v161=(v162===v163);}
const v164=v161;
let v165=v164;if(v165){
const v166=v156;
v165=__fn13(v166);}
v155=v165;}else{
const v167=null;
v155=true;}
return v155;}
function __fn15(v168,v169,v170,v171){
const v172=v171;
const v173=v172["index"];
const v174=v168;
const v175=v174["flags"];
const v176=v173;
let v177;if(v176<v175.length){v177=v175[v176];}else{
v177=256;}
const v178=v177;
const v179=v178;
const v180=15;
const v181=(((v179)&(v180))>>>0);
const v182=v170;
let v183;if(Object.hasOwn(v182,"Some")){
const v184=v182["Some"];
v183=(v184).length;}else{
const v185=null;
v183=0;}
const v186=v183;
const v187=v171;
const v188=v187["valid"];
let v189=v188;if(v189){
const v190=v178;
const v191=255;
v189=((v190) <= (v191));}
const v192=v189;
let v193=v192;if(v193){
const v194=v181;
const v195=2;
v193=((v194) <= (v195));}
const v196=v193;
let v197=v196;if(v197){
const v198=v178;
const v199=32;
const v200=(((v198)&(v199))>>>0);
const v201=0;
v197=(v200===v201);}
const v202=v197;
let v203=v202;if(v203){
const v204=v170;
let v205;if(Object.hasOwn(v204,"Some")){
const v206=v204["Some"];
const v207=v206;
const v208=v207.length;
const v209=0;
const v210=((v208) > (v209));
let v211=v210;if(v211){
const v212=v206;
const v213=v212.length;
const v214=1000000;
v211=((v213) <= (v214));}
const v215=v211;
let v216=v215;if(v216){
const v217=(v206).length;
const v218=v169;
v216=((v217) <= (v218));}
const v219=v216;
let v220=v219;if(v220){
const v221=v206;
v220=__fn13(v221);}
v205=v220;}else{
const v222=null;
v205=true;}
v203=v205;}
const v223=v203;
let v224=v223;if(v224){
const v225=v168;
const v226=v173;
const v227=__fn9(v225,v226);
let v228;if(Object.hasOwn(v227,"Some")){
const v229=v227["Some"];
const v230=v170;
let v231;if(Object.hasOwn(v230,"Some")){
const v232=v230["Some"];
const v233=v229;
const v234=v233.length;
const v235=v232;
const v236=v235.length;
const v237=((v234) === (v236));
let v238=v237;if(v238){
const v239=v229;
v238=__fn13(v239);}
v231=v238;}else{
const v240=null;
v231=false;}
v228=v231;}else{
const v241=null;
v228=true;}
v224=v228;}
const v242=v224;
const v243=v186;
const v244=v169;
const v245=v171;
const v246=v245["budget"];
const v247=(((v244) - (v246)) >>> 0);
const v248=((v243) <= (v247));
const v249=v242;
let v250=v249;if(v250){
v250=v248;}
const v251=v250;
let v252;if(v248){
const v253=v171;
const v254=v253["budget"];
const v255=v186;
v252=(((v254) + (v255)) >>> 0);}else{
const v256=v171;
v252=v256["budget"];}
const v257=v252;
const v258=v173;
const v259=1;
const v260=(((v258) + (v259)) >>> 0);
return ({["valid"]:v251,["budget"]:v257,["index"]:v260});}
function __fn16(v261,v262,v263){
const v264=v263;
const v265=0;
const v266=(v264===v265);
let v267=v266;if(!v267){
const v268=v263;
const v269=1000000;
v267=((v268) > (v269));}
const v270=v267;
let v271=v270;if(!v271){
const v272=v261;
const v273=v272["widths"];
const v274=v273.length;
const v275=1000000;
v271=((v274) > (v275));}
const v276=v271;
let v277=v276;if(!v277){
const v278=v261;
const v279=(v278["widths"]).length;
const v280=v263;
v277=((v279) > (v280));}
const v281=v277;
let v282=v281;if(!v282){
const v283=v261;
const v284=v283["widths"];
const v285=__fn13(v284);
const v286=false;
v282=(v285===v286);}
const v287=v282;
let v288=v287;if(!v288){
const v289=Number.isFinite(__dfNumber(v262));
const v290=false;
v288=(v289===v290);}
const v291=v288;
let v292=v291;if(!v292){
const v293=v262;
const v294=__dfFromBits(0n);
v292=((__dfNumber(v293)) < (__dfNumber(v294)));}
let v295;if(v292){
v295=({None:null});}else{
const v296=v261;
const v297=(v296["widths"]).length;
const v298=v261;
const v299=v298["flags"];
const v300=v299.length;
const v301=1000000;
const v302=((v300) > (v301));
let v303=v302;if(!v303){
const v304=v261;
const v305=(v304["flags"]).length;
const v306=v297;
v303=!(v305===v306);}
const v307=v303;
let v308=v307;if(!v308){
const v309=v261;
const v310=v309["advances"];
const v311=v310.length;
const v312=1000000;
v308=((v311) > (v312));}
const v313=v308;
let v314=v313;if(!v314){
const v315=v261;
const v316=(v315["advances"]).length;
const v317=v297;
v314=!(v316===v317);}
const v318=v314;
let v319=v318;if(!v319){
const v320=v261;
const v321=v320["startExtras"];
const v322=v297;
const v323=__fn14(v321,v322);
const v324=false;
v319=(v323===v324);}
const v325=v319;
let v326=v325;if(!v326){
const v327=v261;
const v328=v327["endTrims"];
const v329=v297;
const v330=__fn14(v328,v329);
const v331=false;
v326=(v330===v331);}
const v332=v326;
let v333=v332;if(!v333){
const v334=v261;
const v335=v334["overflowTrims"];
const v336=v297;
const v337=__fn14(v335,v336);
const v338=false;
v333=(v337===v338);}
const v339=v333;
let v340=v339;if(!v340){
const v341=v261;
const v342=v341["insideExtras"];
const v343=v297;
const v344=__fn14(v342,v343);
const v345=false;
v340=(v344===v345);}
const v346=v340;
let v347=v346;if(!v347){
const v348=v261;
const v349=v348["fillExtras"];
const v350=v297;
const v351=__fn14(v349,v350);
const v352=false;
v347=(v351===v352);}
const v353=v347;
let v354=v353;if(!v354){
const v355=v261;
const v356=v355["graphemeStartExtras"];
let v357;if(Object.hasOwn(v356,"Some")){
const v358=v356["Some"];
const v359=v358;
const v360=v359.length;
const v361=1000000;
const v362=((v360) <= (v361));
let v363=v362;if(v363){
const v364=(v358).length;
const v365=v297;
v363=(v364===v365);}
v357=v363;}else{
const v366=null;
v357=true;}
const v367=v357;
const v368=false;
v354=(v367===v368);}
let v369;if(v354){
v369=({None:null});}else{
const v370=v261;
const v371=v370["advances"];
const v372=true;
const v373=v297;
const v374=0;
let v375=({["valid"]:v372,["budget"]:v373,["index"]:v374});
for(let v376=0;v376<v371.length;v376++){
const v377=v371[v376];
const v378=v261;
const v379=v263;
const v380=v377;
const v381=v375;
v375=__fn15(v378,v379,v380,v381);
}
const v382=v375;
const v383=v382;
let v384;if(v383["valid"]){
const v385=v382;
v384=({Some:v385["budget"]});}else{
v384=({None:null});}
v369=v384;}
v295=v369;}
return v295;}
function __fn17(v386,v387,v388){
const v389=v386;
const v390=v387;
const v391=v388;
const v392=__fn16(v389,v390,v391);
let v393;if(Object.hasOwn(v392,"Some")){
const v394=v392["Some"];
const v395=v386;
const v396=v387;
const v397=v394;
v393=({Ok:({["data"]:v395,["epsilon"]:v396,["budget"]:v397})});}else{
const v398=null;
v393=({Err:"invalid simple prepared text"});}
return v393;}
function __fn18(v399){
const v400=v399;
const v401=v400["data"];
const v402=v399;
const v403=v402["epsilon"];
const v404=1000000;
const v405=__fn16(v401,v403,v404);
let v406;if(Object.hasOwn(v405,"Some")){
const v407=v405["Some"];
const v408=v407;
const v409=v399;
const v410=v409["budget"];
v406=(v408===v410);}else{
const v411=null;
v406=false;}
return v406;}
function __fn19(v412){
let v413;if(Number.isNaN(__dfNumber(v412))){
v413=__dfFromBits(9218868437227405312n);}else{
v413=v412;}
return v413;}
function __fn20(v414,v415){
const v416=v415;
const v417=__dfFromBits(0n);
let v418;if(((__dfNumber(v416)) > (__dfNumber(v417)))){
v418=v415;}else{
v418=__dfFromBits(0n);}
const v419=v418;
const v420=v414;
const v421=v420["epsilon"];
return (__dfNumber(v419) + __dfNumber(v421));}
function __fn21(v422,v423){
const v424=v422;
const v425=(v424["widths"]).length;
const v426=v423;
const v427=v426["segment"];
const v428=0;
const v429=(v427===v428);
const v430=v425;
const v431=v423;
const v432=v423;
const v433=v432["grapheme"];
const v434=0;
const v435=((v433) > (v434));
let v436=v435;if(!v436){
const v437=v423;
const v438=v437["segment"];
const v439=v425;
v436=((v438) >= (v439));}
const v440=v436;
let v441=({["cursor"]:v431,["done"]:v440});
for(let v442=0;v442<v430;v442++){
const v443=v441;
if(v443["done"]){break;}
const v444=(v442>>>0);
const v445=v422;
const v446=v441;
const v447=v446["cursor"];
const v448=v447["segment"];
const v449=v429;
let v450;if(__fn11(v445,v448,v449)){
const v451=v441;
const v452=v451["cursor"];
const v453=v452["segment"];
const v454=1;
const v455=(((v453) + (v454)) >>> 0);
const v456=0;
const v457=({["segment"]:v455,["grapheme"]:v456});
const v458=v441;
const v459=v458["cursor"];
const v460=v459["segment"];
const v461=1;
const v462=(((v460) + (v461)) >>> 0);
const v463=v425;
const v464=((v462) >= (v463));
v450=({["cursor"]:v457,["done"]:v464});}else{
const v465=v441;
const v466=v465["cursor"];
const v467=true;
v450=({["cursor"]:v466,["done"]:v467});}
v441=v450;}
const v468=v441;
const v469=v468;
return v469["cursor"];}
function __fn22(v470,v471,v472,v473){
const v474=(v470).length;
const v475=v471;
const v476=v472;
const v477=false;
let v478=({["index"]:v475,["width"]:v476,["done"]:v477});
for(let v479=0;v479<v474;v479++){
const v480=v478;
const v481=v480["done"];
let v482=v481;if(!v482){
const v483=v478;
const v484=v483["index"];
const v485=(v470).length;
v482=((v484) >= (v485));}
if(v482){break;}
const v486=(v479>>>0);
const v487=v478;
const v488=v487["width"];
const v489=v470;
const v490=v478;
const v491=v490["index"];
let v492;if(v491<v489.length){v492=v489[v491];}else{
v492=__dfFromBits(0n);}
const v493=v492;
const v494=(__dfNumber(v488) + __dfNumber(v493));
const v495=v473;
let v496;if(((__dfNumber(v494)) > (__dfNumber(v495)))){
const v497=true;
const v498=v478;
const v499=v498["index"];
const v500=v478;
const v501=v500["width"];
const v502=v497;
v496=({["index"]:v499,["width"]:v501,["done"]:v502});}else{
const v503=v478;
const v504=v503["index"];
const v505=1;
const v506=(((v504) + (v505)) >>> 0);
const v507=v478;
const v508=v507["width"];
const v509=v470;
const v510=v478;
const v511=v510["index"];
let v512;if(v511<v509.length){v512=v509[v511];}else{
v512=__dfFromBits(0n);}
const v513=v512;
const v514=(__dfNumber(v508) + __dfNumber(v513));
const v515=false;
v496=({["index"]:v506,["width"]:v514,["done"]:v515});}
v478=v496;}
return v478;}
function __fn23(v516,v517,v518){
const v519=v518;
const v520=v519["index"];
const v521=v516;
const v522=v521["widths"];
const v523=v520;
let v524;if(v523<v522.length){v524=v522[v523];}else{
v524=__dfFromBits(0n);}
const v525=v524;
const v526=v516;
const v527=v526["endTrims"];
const v528=v520;
const v529=__fn8(v527,v528);
const v530=v518;
const v531=v530["width"];
const v532=v525;
const v533=(__dfNumber(v531) + __dfNumber(v532));
const v534=v529;
const v535=(__dfNumber(v533) - __dfNumber(v534));
const v536=v517;
let v537;if(((__dfNumber(v535)) > (__dfNumber(v536)))){
const v538=v516;
const v539=v520;
const v540=__fn12(v538,v539);
const v541=v540;
const v542=false;
const v543=(v541===v542);
let v544=v543;if(v544){
const v545=v516;
const v546=v520;
const v547=1;
const v548=(((v546) - (v547)) >>> 0);
v544=__fn12(v545,v548);}
let v549;if(v544){
const v550=v518;
const v551=v550["width"];
const v552=v516;
const v553=v552["widths"];
const v554=v520;
const v555=1;
const v556=(((v554) - (v555)) >>> 0);
let v557;if(v556<v553.length){v557=v553[v556];}else{
v557=__dfFromBits(0n);}
const v558=v557;
v549=(__dfNumber(v551) - __dfNumber(v558));}else{
const v559=v518;
const v560=v559["width"];
const v561=v518;
const v562=v561["trimmed"];
v549=(__dfNumber(v560) - __dfNumber(v562));}
const v563=v549;
let v564;if(v540){
const v565=v520;
const v566=1;
v564=(((v565) + (v566)) >>> 0);}else{
v564=v520;}
const v567=v564;
const v568=0;
const v570=v563;
const v571=true;
const v572=v518;
const v573=v572["index"];
const v574=v518;
const v575=v574["width"];
const v576=v518;
const v577=v576["trimmed"];
const v578=({["segment"]:v567,["grapheme"]:v568});
const v579=v570;
const v580=v571;
v537=({["index"]:v573,["width"]:v575,["trimmed"]:v577,["end"]:v578,["result"]:v579,["done"]:v580});}else{
const v581=v518;
const v582=v581["width"];
const v583=v525;
const v584=(__dfNumber(v582) + __dfNumber(v583));
const v585=v520;
const v586=1;
const v587=(((v585) + (v586)) >>> 0);
const v588=v584;
const v589=v584;
const v590=v517;
let v591;if(((__dfNumber(v589)) > (__dfNumber(v590)))){
v591=v529;}else{
v591=__dfFromBits(0n);}
const v592=v591;
const v593=v587;
const v594=v588;
const v595=v592;
const v596=v518;
const v597=v596["end"];
const v598=v518;
const v599=v598["result"];
const v600=v518;
const v601=v600["done"];
v537=({["index"]:v593,["width"]:v594,["trimmed"]:v595,["end"]:v597,["result"]:v599,["done"]:v601});}
return v537;}
function __fn24(v602,v603,v604){
const v605=v602;
const v606=v605["data"];
const v607=v602;
const v608=v604;
const v609=__fn20(v607,v608);
const v610=v606;
const v611=(v610["widths"]).length;
const v612=v603;
const v613=v612["segment"];
const v614=v606;
const v615=v614["advances"];
const v616=v613;
let v617;if(v616<v615.length){v617=v615[v616];}else{
v617=({None:null});}
const v618=v617;
const v619=v606;
const v620=v619["startExtras"];
let v621;if(Object.hasOwn(v620,"Some")){
const v622=v620["Some"];
const v623=v606;
const v624=v623["widths"];
const v625=v613;
let v626;if(v625<v624.length){v626=v624[v625];}else{
v626=__dfFromBits(0n);}
const v627=v626;
const v628=v622;
const v629=v613;
let v630;if(v629<v628.length){v630=v628[v629];}else{
v630=__dfFromBits(0n);}
const v631=v630;
v621=(__dfNumber(v627) + __dfNumber(v631));}else{
const v632=null;
const v633=v606;
const v634=v633["widths"];
const v635=v613;
let v636;if(v635<v634.length){v636=v634[v635];}else{
v636=__dfFromBits(0n);}
v621=v636;}
const v637=v621;
const v638=v606;
const v639=v638["endTrims"];
const v640=v613;
const v641=__fn8(v639,v640);
const v642=v606;
const v643=v642["overflowTrims"];
let v644;if(Object.hasOwn(v643,"Some")){
const v645=v643["Some"];
const v646=v637;
const v647=v645;
const v648=v613;
let v649;if(v648<v647.length){v649=v647[v648];}else{
v649=__dfFromBits(0n);}
const v650=v649;
const v651=(__dfNumber(v646) - __dfNumber(v650));
const v652=v609;
let v653;if(((__dfNumber(v651)) <= (__dfNumber(v652)))){
const v654=v645;
const v655=v613;
let v656;if(v655<v654.length){v656=v654[v655];}else{
v656=__dfFromBits(0n);}
v653=v656;}else{
v653=v641;}
v644=v653;}else{
const v657=null;
v644=v641;}
const v658=v644;
const v659=v603;
const v660=v659["grapheme"];
const v661=0;
const v662=((v660) > (v661));
let v663=v662;if(!v663){
const v664=v637;
const v665=v658;
const v666=(__dfNumber(v664) - __dfNumber(v665));
const v667=v609;
const v668=((__dfNumber(v666)) > (__dfNumber(v667)));
let v669=v668;if(v669){
const v670=v618;
let v671;if(Object.hasOwn(v670,"Some")){
const v672=v670["Some"];
v671=true;}else{
const v673=null;
v671=false;}
v669=v671;}
v663=v669;}
const v674=v663;
const v675=v618;
let v676;if(Object.hasOwn(v675,"Some")){
const v677=v675["Some"];
v676=v677;}else{
const v678=null;
v676=[];}
const v679=v676;
const v680=v606;
const v681=v613;
const v682=__fn9(v680,v681);
let v683;if(Object.hasOwn(v682,"Some")){
const v684=v682["Some"];
const v685=v679;
const v686=v603;
const v687=v686["grapheme"];
let v688;if(v687<v685.length){v688=v685[v687];}else{
v688=__dfFromBits(0n);}
const v689=v688;
const v690=v684;
const v691=v603;
const v692=v691["grapheme"];
let v693;if(v692<v690.length){v693=v690[v692];}else{
v693=__dfFromBits(0n);}
const v694=v693;
v683=(__dfNumber(v689) + __dfNumber(v694));}else{
const v695=null;
const v696=v679;
const v697=v603;
const v698=v697["grapheme"];
let v699;if(v698<v696.length){v699=v696[v698];}else{
v699=__dfFromBits(0n);}
v683=v699;}
const v700=v683;
const v701=v603;
const v702=v701["grapheme"];
const v703=0;
let v704;if(((v702) > (v703))){
const v705=v606;
v704=v705["insideExtras"];}else{
const v706=v606;
v704=v706["fillExtras"];}
const v707=v704;
let v708;if(Object.hasOwn(v707,"Some")){
const v709=v707["Some"];
const v710=v700;
const v711=v709;
const v712=v613;
let v713;if(v712<v711.length){v713=v711[v712];}else{
v713=__dfFromBits(0n);}
const v714=v713;
v708=(__dfNumber(v710) + __dfNumber(v714));}else{
const v715=null;
v708=v700;}
const v716=v708;
let v717;if(v674){
const v718=v679;
const v719=v603;
const v720=v719["grapheme"];
const v721=1;
const v722=(((v720) + (v721)) >>> 0);
const v723=v716;
const v724=v609;
v717=__fn22(v718,v722,v723,v724);}else{
const v725=(v679).length;
const v726=v637;
const v727=false;
v717=({["index"]:v725,["width"]:v726,["done"]:v727});}
const v728=v717;
const v729=v674;
let v730=v729;if(v730){
const v731=v728;
const v732=v731["index"];
const v733=(v679).length;
v730=((v732) < (v733));}
let v734;if(v730){
const v735=v728;
const v736=v735["width"];
const v737=v603;
const v738=v613;
const v739=v728;
const v740=v739["index"];
const v741=({["segment"]:v738,["grapheme"]:v740});
v734=({["width"]:v736,["start"]:v737,["end"]:v741});}else{
const v742=v674;
const v743=false;
const v744=(v742===v743);
let v745=v744;if(v745){
const v746=v637;
const v747=v609;
v745=((__dfNumber(v746)) > (__dfNumber(v747)));}
let v748;if(v745){
v748=v658;}else{
v748=__dfFromBits(0n);}
const v749=v748;
const v750=v611;
const v751=v613;
const v752=1;
const v753=(((v751) + (v752)) >>> 0);
const v754=v728;
const v755=v754["width"];
const v756=v749;
const v757=v611;
const v758=0;
const v759=({["segment"]:v757,["grapheme"]:v758});
const v760=__dfFromBits(0n);
const v761=false;
let v762=({["index"]:v753,["width"]:v755,["trimmed"]:v756,["end"]:v759,["result"]:v760,["done"]:v761});
for(let v763=0;v763<v750;v763++){
const v764=v762;
const v765=v764["done"];
let v766=v765;if(!v766){
const v767=v762;
const v768=v767["index"];
const v769=v611;
v766=((v768) >= (v769));}
if(v766){break;}
const v770=(v763>>>0);
const v771=v606;
const v772=v609;
const v773=v762;
v762=__fn23(v771,v772,v773);}
const v774=v762;
const v775=v774;
let v776;if(v775["done"]){
const v777=v774;
v776=v777["result"];}else{
const v778=v774;
const v779=v778["width"];
const v780=v774;
const v781=v780["trimmed"];
v776=(__dfNumber(v779) - __dfNumber(v781));}
const v782=v776;
const v783=v603;
const v784=v774;
const v785=v784["end"];
v734=({["width"]:v782,["start"]:v783,["end"]:v785});}
return v734;}
function __fn25(v786,v787,v788){
const v789=({Some:null});
const v790=v789;
let v791;if(Object.hasOwn(v790,"Some")){
const v792=v790["Some"];
const v793=v786;
v791=__fn18(v793);}else{
const v794=null;
const v795=v786;
v791=__fn18(v795);}
let v796;if(v791){
const v797=v786;
const v798=v797["data"];
const v799=(v798["widths"]).length;
const v800=v787;
const v801=v800["segment"];
const v802=v799;
const v803=((v801) > (v802));
let v804=v803;if(!v804){
const v805=v787;
const v806=v805["segment"];
const v807=v799;
const v808=(v806===v807);
let v809=v808;if(v809){
const v810=v787;
const v811=v810["grapheme"];
const v812=0;
v809=((v811) > (v812));}
v804=v809;}
const v813=v804;
let v814=v813;if(!v814){
const v815=v787;
const v816=v815["grapheme"];
const v817=0;
const v818=((v816) > (v817));
let v819=v818;if(v819){
const v820=v786;
const v821=v820["data"];
const v822=v821["advances"];
const v823=v787;
const v824=v823["segment"];
let v825;if(v824<v822.length){v825=v822[v824];}else{
v825=({None:null});}
const v826=v825;
let v827;if(Object.hasOwn(v826,"Some")){
const v828=v826["Some"];
const v829=v787;
const v830=v829["grapheme"];
const v831=(v828).length;
v827=((v830) < (v831));}else{
const v832=null;
v827=false;}
const v833=v827;
const v834=false;
v819=(v833===v834);}
v814=v819;}
let v835;if(v814){
v835=({Err:"invalid line cursor"});}else{
const v836=v786;
const v837=v836["data"];
const v838=v787;
const v839=__fn21(v837,v838);
const v840=v839;
const v841=v840["segment"];
const v842=v799;
let v843;if(((v841) >= (v842))){
v843=({Ok:({None:null})});}else{
const v844=v786;
const v845=v839;
const v846=v788;
const v847=__fn19(v846);
v843=({Ok:({Some:__fn24(v844,v845,v847)})});}
v835=v843;}
v796=v835;}else{
const v848=({Some:null});
const v849=v848;
let v850;if(Object.hasOwn(v849,"Some")){
const v851=v849["Some"];
v850="invalid prepared text";}else{
const v852=null;
v850="invalid prepared text";}
v796=({Err:v850});}
return v796;}
function __fn26(v853,v854,v855){
const v856=v853;
const v857=v856["data"];
const v858=v855;
const v859=v858["cursor"];
const v860=__fn21(v857,v859);
const v861=v860;
const v862=v861["segment"];
const v863=v853;
const v864=v863["data"];
const v865=(v864["widths"]).length;
let v866;if(((v862) >= (v865))){
const v867=true;
const v868=v855;
const v869=v868["cursor"];
const v870=v855;
const v871=v870["stats"];
const v872=v867;
v866=({["cursor"]:v869,["stats"]:v871,["done"]:v872});}else{
const v873=v853;
const v874=v860;
const v875=v854;
const v876=__fn24(v873,v874,v875);
const v877=v876;
const v878=v877["end"];
const v879=v855;
const v880=v879["stats"];
const v881=v880["lineCount"];
const v882=1;
const v883=(((v881) + (v882)) >>> 0);
const v884=v876;
const v885=v884["width"];
const v886=v855;
const v887=v886["stats"];
const v888=v887["maxLineWidth"];
let v889;if(((__dfNumber(v885)) > (__dfNumber(v888)))){
const v890=v876;
v889=v890["width"];}else{
const v891=v855;
const v892=v891["stats"];
v889=v892["maxLineWidth"];}
const v893=v889;
const v894=({["lineCount"]:v883,["maxLineWidth"]:v893});
const v895=false;
v866=({["cursor"]:v878,["stats"]:v894,["done"]:v895});}
return v866;}
function __fn27(v896,v897){
const v898=v896;
const v899=v898["budget"];
const v900=1;
const v901=(((v899) + (v900)) >>> 0);
const v902=0;
const v903=0;
const v904=({["segment"]:v902,["grapheme"]:v903});
const v905=0;
const v906=__dfFromBits(0n);
const v907=({["lineCount"]:v905,["maxLineWidth"]:v906});
const v908=false;
let v909=({["cursor"]:v904,["stats"]:v907,["done"]:v908});
for(let v910=0;v910<v901;v910++){
const v911=v909;
if(v911["done"]){break;}
const v912=(v910>>>0);
const v913=v896;
const v914=v897;
const v915=v909;
v909=__fn26(v913,v914,v915);}
const v916=v909;
const v917=v916;
return v917["stats"];}
function __fn28(v918,v919){
const v920=({Some:null});
const v921=v920;
let v922;if(Object.hasOwn(v921,"Some")){
const v923=v921["Some"];
const v924=v918;
v922=__fn18(v924);}else{
const v925=null;
const v926=v918;
v922=__fn18(v926);}
let v927;if(v922){
const v928=v918;
const v929=v919;
const v930=__fn19(v929);
v927=({Ok:__fn27(v928,v930)});}else{
const v931=({Some:null});
const v932=v931;
let v933;if(Object.hasOwn(v932,"Some")){
const v934=v932["Some"];
v933="invalid prepared text";}else{
const v935=null;
v933="invalid prepared text";}
v927=({Err:v933});}
return v927;}
function __fn29(v936,v937,v938){
const v939=v936;
const v940=v939["data"];
const v941=v938;
const v942=v941["cursor"];
const v943=__fn21(v940,v942);
const v944=v943;
const v945=v944["segment"];
const v946=v936;
const v947=v946["data"];
const v948=(v947["widths"]).length;
let v949;if(((v945) >= (v948))){
const v950=true;
const v951=v938;
const v952=v951["cursor"];
const v953=v938;
const v954=v953["lines"];
const v955=v950;
v949=({["cursor"]:v952,["lines"]:v954,["done"]:v955});}else{
const v956=v936;
const v957=v943;
const v958=v937;
const v959=__fn24(v956,v957,v958);
const v960=v959;
const v961=v960["end"];
const v962=v938;
const v963=v962["lines"];
const v964=v959;
const v965=__tempEdit(v963,"push",v964);
const v966=false;
v949=({["cursor"]:v961,["lines"]:v965,["done"]:v966});}
return v949;}
function __fn30(v967,v968){
const v969=({Some:null});
const v970=v969;
let v971;if(Object.hasOwn(v970,"Some")){
const v972=v970["Some"];
const v973=v967;
v971=__fn18(v973);}else{
const v974=null;
const v975=v967;
v971=__fn18(v975);}
let v976;if(v971){
const v977=v967;
const v978=v977["budget"];
const v979=1;
const v980=(((v978) + (v979)) >>> 0);
const v981=0;
const v982=0;
const v983=({["segment"]:v981,["grapheme"]:v982});
const v984=new __InkBuffer([]);
const v985=false;
let v986=({["cursor"]:v983,["lines"]:v984,["done"]:v985});
for(let v987=0;v987<v980;v987++){
const v988=v986;
if(v988["done"]){break;}
const v989=(v987>>>0);
const v990=v967;
const v991=v968;
const v992=__fn19(v991);
const v993=v986;
v986=__fn29(v990,v992,v993);}
const v994=v986;
const v995=v994;
const v996=v995["lines"];
v976=({Ok:v996.freeze()});}else{
const v997=({Some:null});
const v998=v997;
let v999;if(Object.hasOwn(v998,"Some")){
const v1000=v998["Some"];
v999="invalid prepared text";}else{
const v1001=null;
v999="invalid prepared text";}
v976=({Err:v999});}
return v976;}
function __fn31(v1002,v1003,v1004,v1005){
const v1006=(v1002).length;
const v1007=v1003;
const v1008=v1004;
const v1009=false;
let v1010=({["index"]:v1007,["width"]:v1008,["done"]:v1009});
for(let v1011=0;v1011<v1006;v1011++){
const v1012=v1010;
const v1013=v1012["done"];
let v1014=v1013;if(!v1014){
const v1015=v1010;
const v1016=v1015["index"];
const v1017=(v1002).length;
v1014=((v1016) >= (v1017));}
if(v1014){break;}
const v1018=(v1011>>>0);
const v1019=v1010;
const v1020=v1019["width"];
const v1021=v1002;
const v1022=v1010;
const v1023=v1022["index"];
let v1024;if(v1023<v1021.length){v1024=v1021[v1023];}else{
v1024=__dfFromBits(0n);}
const v1025=v1024;
const v1026=(__dfNumber(v1020) + __dfNumber(v1025));
const v1027=v1005;
let v1028;if(((__dfNumber(v1026)) <= (__dfNumber(v1027)))){
const v1029=v1010;
const v1030=v1029["index"];
const v1031=1;
const v1032=(((v1030) + (v1031)) >>> 0);
const v1033=v1010;
const v1034=v1033["width"];
const v1035=v1002;
const v1036=v1010;
const v1037=v1036["index"];
let v1038;if(v1037<v1035.length){v1038=v1035[v1037];}else{
v1038=__dfFromBits(0n);}
const v1039=v1038;
const v1040=(__dfNumber(v1034) + __dfNumber(v1039));
const v1041=false;
v1028=({["index"]:v1032,["width"]:v1040,["done"]:v1041});}else{
const v1042=true;
const v1043=v1010;
const v1044=v1043["index"];
const v1045=v1010;
const v1046=v1045["width"];
const v1047=v1042;
v1028=({["index"]:v1044,["width"]:v1046,["done"]:v1047});}
v1010=v1028;}
return v1010;}
function __fn32(v1048,v1049,v1050,v1051){
const v1052=v1051;
const v1053=v1052["count"];
const v1054=v1053["width"];
const v1055=v1049;
let v1056;if(Object.hasOwn(v1055,"Some")){
const v1057=v1055["Some"];
const v1058=v1057;
const v1059=v1051;
const v1060=v1059["index"];
let v1061;if(v1060<v1058.length){v1061=v1058[v1060];}else{
v1061=__dfFromBits(0n);}
v1056=v1061;}else{
const v1062=null;
v1056=__dfFromBits(0n);}
const v1063=v1056;
const v1064=(__dfNumber(v1054) + __dfNumber(v1063));
const v1065=v1064;
const v1066=v1048;
const v1067=v1051;
const v1068=v1067["index"];
let v1069;if(v1068<v1066.length){v1069=v1066[v1068];}else{
v1069=__dfFromBits(0n);}
const v1070=v1069;
const v1071=(__dfNumber(v1065) + __dfNumber(v1070));
const v1072=v1048;
const v1073=v1051;
const v1074=v1073["index"];
const v1075=1;
const v1076=(((v1074) + (v1075)) >>> 0);
const v1077=v1071;
const v1078=v1050;
const v1079=__fn31(v1072,v1076,v1077,v1078);
const v1080=v1079;
const v1081=v1080["index"];
const v1082=(v1048).length;
let v1083;if(((v1081) < (v1082))){
const v1084=v1051;
const v1085=v1084["count"];
const v1086=v1085["lines"];
const v1087=1;
const v1088=(((v1086) + (v1087)) >>> 0);
const v1089=__dfFromBits(0n);
const v1090=false;
const v1091=({["lines"]:v1088,["width"]:v1089,["content"]:v1090});
const v1092=v1079;
const v1093=v1092["index"];
v1083=({["count"]:v1091,["index"]:v1093});}else{
const v1094=v1051;
const v1095=v1094["count"];
const v1096=v1095["lines"];
const v1097=v1079;
const v1098=v1097["width"];
const v1099=true;
const v1100=({["lines"]:v1096,["width"]:v1098,["content"]:v1099});
const v1101=v1079;
const v1102=v1101["index"];
v1083=({["count"]:v1100,["index"]:v1102});}
return v1083;}
function __fn33(v1103,v1104,v1105,v1106){
const v1107=v1103;
const v1108=v1105;
const v1109=__fn10(v1107,v1108);
const v1110=v1103;
const v1111=v1110["widths"];
const v1112=v1105;
let v1113;if(v1112<v1111.length){v1113=v1111[v1112];}else{
v1113=__dfFromBits(0n);}
const v1114=v1113;
const v1115=v1103;
const v1116=v1115["endTrims"];
const v1117=v1105;
const v1118=__fn8(v1116,v1117);
const v1119=v1106;
const v1120=v1119["content"];
let v1121=v1120;if(v1121){
const v1122=v1106;
const v1123=v1122["width"];
const v1124=v1114;
const v1125=(__dfNumber(v1123) + __dfNumber(v1124));
const v1126=v1118;
const v1127=(__dfNumber(v1125) - __dfNumber(v1126));
const v1128=v1104;
v1121=((__dfNumber(v1127)) <= (__dfNumber(v1128)));}
let v1129;if(v1121){
const v1130=v1106;
const v1131=v1130["width"];
const v1132=v1114;
const v1133=(__dfNumber(v1131) + __dfNumber(v1132));
const v1134=v1106;
const v1135=v1134["lines"];
const v1136=v1133;
const v1137=v1106;
const v1138=v1137["content"];
v1129=({["lines"]:v1135,["width"]:v1136,["content"]:v1138});}else{
const v1139=v1106;
const v1140=v1139["content"];
let v1141;if(v1140){
const v1142=v1106;
const v1143=v1142["lines"];
const v1144=1;
const v1145=(((v1143) + (v1144)) >>> 0);
const v1146=__dfFromBits(0n);
const v1147=false;
v1141=({["lines"]:v1145,["width"]:v1146,["content"]:v1147});}else{
v1141=v1106;}
const v1148=v1141;
const v1149=v1140;
let v1150=v1149;if(v1150){
const v1151=v1109;
const v1152=0;
v1150=!(v1151===v1152);}
const v1153=v1150;
let v1154=v1153;if(!v1154){
const v1155=v1140;
const v1156=false;
const v1157=(v1155===v1156);
let v1158=v1157;if(v1158){
const v1159=v1109;
const v1160=1;
const v1161=(v1159===v1160);
let v1162=v1161;if(!v1162){
const v1163=v1109;
const v1164=2;
const v1165=(v1163===v1164);
let v1166=v1165;if(v1166){
const v1167=v1105;
const v1168=0;
v1166=((v1167) > (v1168));}
v1162=v1166;}
v1158=v1162;}
v1154=v1158;}
let v1169;if(v1154){
v1169=v1148;}else{
const v1170=v1103;
const v1171=v1170["startExtras"];
let v1172;if(Object.hasOwn(v1171,"Some")){
const v1173=v1171["Some"];
const v1174=v1114;
const v1175=v1173;
const v1176=v1105;
let v1177;if(v1176<v1175.length){v1177=v1175[v1176];}else{
v1177=__dfFromBits(0n);}
const v1178=v1177;
v1172=(__dfNumber(v1174) + __dfNumber(v1178));}else{
const v1179=null;
v1172=v1114;}
const v1180=v1172;
const v1181=v1103;
const v1182=v1181["advances"];
const v1183=v1105;
let v1184;if(v1183<v1182.length){v1184=v1182[v1183];}else{
v1184=({None:null});}
const v1185=v1184;
const v1186=v1180;
const v1187=v1118;
const v1188=(__dfNumber(v1186) - __dfNumber(v1187));
const v1189=v1104;
const v1190=((__dfNumber(v1188)) <= (__dfNumber(v1189)));
let v1191=v1190;if(!v1191){
const v1192=v1185;
let v1193;if(Object.hasOwn(v1192,"Some")){
const v1194=v1192["Some"];
v1193=false;}else{
const v1195=null;
v1193=true;}
v1191=v1193;}
let v1196;if(v1191){
const v1197=v1148;
const v1198=v1197["width"];
const v1199=v1180;
const v1200=(__dfNumber(v1198) + __dfNumber(v1199));
const v1201=true;
const v1202=v1148;
const v1203=v1202["lines"];
const v1204=v1200;
const v1205=v1201;
v1196=({["lines"]:v1203,["width"]:v1204,["content"]:v1205});}else{
const v1206=v1185;
let v1207;if(Object.hasOwn(v1206,"Some")){
const v1208=v1206["Some"];
v1207=v1208;}else{
const v1209=null;
v1207=[];}
const v1210=v1207;
const v1211=(v1210).length;
const v1212=v1148;
const v1213=0;
let v1214=({["count"]:v1212,["index"]:v1213});
for(let v1215=0;v1215<v1211;v1215++){
const v1216=v1214;
const v1217=v1216["index"];
const v1218=(v1210).length;
if(((v1217) >= (v1218))){break;}
const v1219=(v1215>>>0);
const v1220=v1210;
const v1221=v1103;
const v1222=v1105;
const v1223=__fn9(v1221,v1222);
const v1224=v1104;
const v1225=v1214;
v1214=__fn32(v1220,v1223,v1224,v1225);}
const v1226=v1214;
const v1227=v1226;
v1196=v1227["count"];}
v1169=v1196;}
v1129=v1169;}
return v1129;}
function __fn34(v1228,v1229){
const v1230=({Some:null});
const v1231=v1230;
let v1232;if(Object.hasOwn(v1231,"Some")){
const v1233=v1231["Some"];
const v1234=v1228;
v1232=__fn18(v1234);}else{
const v1235=null;
const v1236=v1228;
v1232=__fn18(v1236);}
let v1237;if(v1232){
const v1238=v1229;
const v1239=__fn19(v1238);
const v1240=v1228;
const v1241=v1240["data"];
const v1242=v1241["overflowTrims"];
let v1243;if(Object.hasOwn(v1242,"Some")){
const v1244=v1242["Some"];
v1243=true;}else{
const v1245=null;
v1243=false;}
let v1246;if(v1243){
const v1247=v1228;
const v1248=v1239;
const v1249=__fn27(v1247,v1248);
v1246=({Ok:v1249["lineCount"]});}else{
const v1250=v1228;
const v1251=v1250["data"];
const v1252=(v1251["widths"]).length;
const v1253=0;
const v1254=__dfFromBits(0n);
const v1255=false;
let v1256=({["lines"]:v1253,["width"]:v1254,["content"]:v1255});
for(let v1257=0;v1257<v1252;v1257++){
if(false){break;}
const v1258=(v1257>>>0);
const v1259=v1228;
const v1260=v1259["data"];
const v1261=v1228;
const v1262=v1239;
const v1263=__fn20(v1261,v1262);
const v1264=v1258;
const v1265=v1256;
v1256=__fn33(v1260,v1263,v1264,v1265);}
const v1266=v1256;
const v1267=v1266;
const v1268=v1267["lines"];
const v1269=v1266;
let v1270;if(v1269["content"]){
v1270=1;}else{
v1270=0;}
const v1271=v1270;
v1246=({Ok:(((v1268) + (v1271)) >>> 0)});}
v1237=v1246;}else{
const v1272=({Some:null});
const v1273=v1272;
let v1274;if(Object.hasOwn(v1273,"Some")){
const v1275=v1273["Some"];
v1274="invalid prepared text";}else{
const v1276=null;
v1274="invalid prepared text";}
v1237=({Err:v1274});}
return v1237;}
function __fn35(v1277,v1278,v1279){
const v1280=v1277;
const v1281=v1278;
const v1282=__fn34(v1280,v1281);
let v1283;if(Object.hasOwn(v1282,"Ok")){
const v1284=v1282["Ok"];
const v1285=v1284;
const v1286=v1284;
const v1287=v1279;
const v1288=(__dfNumber(v1286) * __dfNumber(v1287));
v1283=({Ok:({["lineCount"]:v1285,["height"]:v1288})});}else{v1283=({Err:v1282.Err});}
return v1283;}
function __into7(v1289,v1290){
const v1291=v1289;
const v1292=v1291.length;
for(let v1294=0;v1294<v1292;v1294++){
const v1295=v1291[v1294];
const v1296=v1295;
const v1297=v1295;
const v1298=__bits(__float(v1296) * __float(v1297));
const v1299=1056964608;
v1290[v1294]=__intoOutput7(__bits(__float(v1298) + __float(v1299)));
}
return v1292;}
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
function __action2(ctx,rt,s4){__tick(ctx);try{__tick(ctx);return ((s5)=>Object.hasOwn(s5,"Some")?((s6)=>(__fn35(s6,((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,1,0),__dfFromBits(4621819117588971520n)),s4)))(s5["Some"]):((s7)=>(({Err:"no prepared paragraph"})))(null))(((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)(__tableGet(rt,0,0),({None:null})));}catch(e){if(e instanceof __Abort)return ({Err:e.value});throw e;}}
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
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v15","core_sha256":"02416168b8726d91f7597110730e4dc1736b8709a6e1cf44bd7b74000999e30d","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"prepare","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}},{"destination":null,"index":1,"internal":false,"name":"count_lines","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":null,"index":2,"internal":false,"name":"lines","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}},{"destination":null,"index":3,"internal":false,"name":"stats","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},{"destination":null,"index":4,"internal":false,"name":"layout","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}},{"destination":null,"index":5,"internal":false,"name":"line","parallel":false,"params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}},{"destination":null,"index":6,"internal":false,"name":"count_prepared","parallel":false,"params":[{"name":"prepared","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":7,"internal":false,"name":"numeric","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}},{"destination":null,"index":8,"internal":false,"name":"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":9,"internal":false,"name":"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"destination":null,"index":10,"internal":false,"name":"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"u32"}},{"destination":null,"index":11,"internal":false,"name":"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}},{"name":"atStart","type":{"kind":"bool"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":12,"internal":false,"name":"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":13,"internal":false,"name":"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":14,"internal":false,"name":"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63","parallel":false,"params":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"n","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":15,"internal":false,"name":"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"advance","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"s","type":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}],"precondition":null,"result":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}},{"destination":null,"index":16,"internal":false,"name":"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"kind":"u32"},"kind":"option"}},{"destination":null,"index":17,"internal":false,"name":"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}},{"destination":null,"index":18,"internal":false,"name":"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":19,"internal":false,"name":"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4","parallel":false,"params":[{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":20,"internal":false,"name":"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"f64"}},{"destination":null,"index":21,"internal":false,"name":"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"precondition":null,"result":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"destination":null,"index":22,"internal":false,"name":"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}},{"destination":null,"index":23,"internal":false,"name":"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}},{"destination":null,"index":24,"internal":false,"name":"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}},{"destination":null,"index":25,"internal":false,"name":"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}},{"destination":null,"index":26,"internal":false,"name":"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}],"precondition":null,"result":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}},{"destination":null,"index":27,"internal":false,"name":"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"destination":null,"index":28,"internal":false,"name":"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},{"destination":null,"index":29,"internal":true,"name":"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"}}],"precondition":null,"result":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"}},{"destination":null,"index":30,"internal":false,"name":"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}},{"destination":null,"index":31,"internal":false,"name":"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"precondition":null,"result":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}},{"destination":null,"index":32,"internal":false,"name":"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"es","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}],"precondition":null,"result":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}},{"destination":null,"index":33,"internal":false,"name":"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f","parallel":false,"params":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"i","type":{"kind":"u32"}},{"name":"s","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}],"precondition":null,"result":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"destination":null,"index":34,"internal":false,"name":"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}},{"destination":null,"index":35,"internal":false,"name":"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28","parallel":false,"params":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}],"named_types":{"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"},"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"},"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"},"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"},"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m38199727c3368a931db73c0ac28f57f806019aaf5325d854f5e146190d590ba5"},"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"},"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"},"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"lines","type":{"kind":"temporary"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_mb57c7f78770196118eeb183601122638651b9dc2e5e5132e7d0d790985b01684"},"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"},"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"},"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"},"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},"prepared_compiled":{"evaluation":"lazy source-order; successful bindings only","functions":[{"delegated_calls":1,"factory":true,"function":"prepare","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"count_lines","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"lines","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"stats","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"layout","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"line","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"count_prepared","retained_bindings":0},{"factory":false,"function":"numeric","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8","retained_bindings":6},{"delegated_calls":0,"factory":true,"function":"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58","retained_bindings":4},{"delegated_calls":1,"factory":true,"function":"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55","retained_bindings":0},{"delegated_calls":1,"factory":true,"function":"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13","retained_bindings":0},{"factory":false,"function":"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4","reason":"no reusable lexical bindings"},{"factory":false,"function":"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e","reason":"no reusable lexical bindings"},{"delegated_calls":0,"factory":true,"function":"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45","retained_bindings":3},{"factory":false,"function":"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a","reason":"no reusable lexical bindings"},{"delegated_calls":2,"factory":true,"function":"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4","retained_bindings":13},{"delegated_calls":4,"factory":true,"function":"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f","retained_bindings":15},{"delegated_calls":1,"factory":true,"function":"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585","retained_bindings":4},{"delegated_calls":2,"factory":true,"function":"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021","retained_bindings":3},{"delegated_calls":0,"factory":true,"function":"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8","retained_bindings":1},{"delegated_calls":0,"factory":true,"function":"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373","retained_bindings":2},{"factory":false,"function":"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef","reason":"prepared residual requires a bounded pure value entry"},{"delegated_calls":0,"factory":true,"function":"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e","retained_bindings":2},{"factory":false,"function":"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899","reason":"no reusable lexical bindings"},{"delegated_calls":1,"factory":true,"function":"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf","retained_bindings":3},{"delegated_calls":2,"factory":true,"function":"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f","retained_bindings":12},{"delegated_calls":1,"factory":true,"function":"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6","retained_bindings":4},{"delegated_calls":1,"factory":true,"function":"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28","retained_bindings":0}],"lifetime":"prepared token","semantics":"sealed-value-residual-v1"},"private_record_elisions":[],"private_sum_spines":[],"schema":1,"state":{"actions":[{"change":true,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":true,"index":0,"name":"install","params":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}},"roots":[0],"singleCell":true},{"change":true,"directKeep":null,"fallible":false,"flatFailure":false,"freshResult":true,"index":1,"name":"resize","params":[{"name":"width","type":{"kind":"f64"}}],"precondition":null,"result":{"kind":"u32"},"roots":[1],"singleCell":true},{"change":false,"directKeep":null,"fallible":true,"flatFailure":false,"freshResult":false,"index":2,"name":"current","params":[{"name":"lineHeight","type":{"kind":"f64"}}],"precondition":null,"result":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}},"roots":[0,1],"singleCell":true}],"compactCommits":false,"eventColumns":false,"eventRuns":false,"events":[{"name":"installed","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[],[]],"keeps":[],"lazyMaintenance":true,"outputPublication":false,"roots":[{"key":{"kind":"u32"},"name":"Paragraph","snapshotKey":{"kind":"u32"},"snapshotValue":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record"},"kind":"option"},"value":{"element":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"},"kind":"option"}},{"key":{"kind":"u32"},"name":"Width","snapshotKey":{"kind":"u32"},"snapshotValue":{"kind":"f64"},"value":{"kind":"f64"}}],"snapshot":{"program":[117,17,76,231,100,26,241,116,235,41,28,220,59,24,3,156,235,143,34,131,31,83,159,198,161,157,84,148,85,142,116,99],"schema":[174,196,15,59,118,237,34,176,230,248,58,202,96,96,202,43,16,250,136,142,115,137,237,184,160,94,204,51,114,124,32,47]},"snapshotRows":false},"wire":{"format":"ink-value-wire-v1","functions":{"count_lines":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"count_prepared":{"arguments":{"format":"ink-value-wire-v1","identity":"493c6bc7ec48e92144981aed28fb206d98786334ac3f03d4170e2313dd50cc06","named":{},"root":{"fields":[{"name":"prepared","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"ink_m031320cee58f85b79b37202fff6fd536ad71ab758d2d465493cd48cefb302021":{"arguments":{"format":"ink-value-wire-v1","identity":"d2e058847ec884bfec22ccda23ace2791ec70492243ce9a2c6884fef1f0ff622","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"w","type":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"95f1d165952114b4814841922105b86c623e8c07746843b06ad383444f2fa3eb","named":{},"root":{"fields":[{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"stats","type":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m086abde96a678051961f464f791c4c5c94b31f286fb29436e88cbebcf9b5ad1c"}}},"ink_m09bd2f6d807dddea08a3e05dff926c97158dd5c78fbcec8971733d58e03c9fbf":{"arguments":{"format":"ink-value-wire-v1","identity":"50e3868e4eed2dffa6000932f23075ff8b30106db7f81c7042a51751d7412a0c","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"es","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"542b3f99971053a272b15d88dedbfd32860a89ec2308e87c7bdb1c08c26eae0e","named":{},"root":{"fields":[{"name":"count","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_me68c2f5e5e86a516faa862d519cff9a3e02bc5e131745a9c88827226a0059c6a"}}},"ink_m0fffc1496f6a8b2b8d7044034bab3436a5bf8d98c9b26163ffc110ef18eb690f":{"arguments":{"format":"ink-value-wire-v1","identity":"ce0f4f38eae34f7975beae644adf030a570e2ed2a6725820552d739792dda9c6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"c8de454d504db86ea8f8ef8cc6465494fc0e6efc146d375495b17ba9fb23b767","named":{},"root":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"}}},"ink_m1035a47a3beb1fd15b77187a225faf4374da04d4239c2bb5f2fd7f377c9105f8":{"arguments":{"format":"ink-value-wire-v1","identity":"5659766a7c7b7721a933ab4ca42ad202c9eaa5cfb2e6fb31a88e3654eb8f6990","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"maximum","type":{"kind":"u32"}},{"name":"advance","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"s","type":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f437e4e468cf5dba7df20a9114414406da37a3ae54ea711140ac1b5956e95082","named":{},"root":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"budget","type":{"kind":"u32"}},{"name":"index","type":{"kind":"u32"}}],"kind":"record","name":"ink_m233b63cde5b1951078531833cb439d88de244d40e3a6392d35d12e48ecb2ef5d"}}},"ink_m1c643c3729ce33889b175f6534c6f5567e1031f9a2294b31f14214ef5d846f7e":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"56dc0435d74d48781d7002db784cd2f88c15385d3cd6b708425c161c37cc361c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}}},"ink_m1cbd9e6f220b01cc6d3614d0b500ae6ae7fb6bc6b3ccb0fd24ba416e435dec02":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"61e29a83d1fd64f316d82cf150eb5ad0405d16e0e326ff56bf3bae4248a89a32","named":{},"root":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}},"ink_m3e5801892156affa301b1de70c5499a6f98c8ab08ce4a11d6064687eaff81e63":{"arguments":{"format":"ink-value-wire-v1","identity":"04b5b6b7a1379874fb3dfce45df95449faa3dc7e79b5e259cc1f8b72edd3266e","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"n","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m3ec56d96554edff8dcbc70dd4746c1467d14cccdd680a05225aecdcb1ff10585":{"arguments":{"format":"ink-value-wire-v1","identity":"ce0f4f38eae34f7975beae644adf030a570e2ed2a6725820552d739792dda9c6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"6dabf0313de1ca25f33127bc080f250697ab4e45b0935d5c06756788a303369f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}}},"ink_m403c4c47e84eda8d792b1109de53fbbc655e214636da67f4e0bec47ffe157b0e":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_m424a73c98abd59df2df2e9558114156f29b349d1a0fc567d6a7b6991fa96d4e4":{"arguments":{"format":"ink-value-wire-v1","identity":"ef8cac5957009d7919ea7afa6481df863418422398f30110fafe8c0d99d5489a","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"s","type":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"50c3299d4fbe93aa5602b822292acc76ab4400b031152a8c6acd698494f4c7f8","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"trimmed","type":{"kind":"f64"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"result","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m2009348d597e6b76dc210821f6f99bb8afebe7919b4fe0a09c17b3f9ac4793c3"}}},"ink_m4871d371876b879fe17454f848676f99047b70dcf533553abf657eccb48917a5":{"arguments":{"format":"ink-value-wire-v1","identity":"0b69ff4dcdb1d6bbb28477df20642d1e80062f6025ebbd7f1dc071f1f4a655ee","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_m5a18484940b2f87721d94e036b20f3f623fd9a7ef0bbb105d497073a418c96f6":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"521eaeae4d030f71891ee322304be19877dd3df45f375257b9b99b896efe3237","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"kind":"u32"}}}},"ink_m618e3b1ce3d206a7ce99ecd61dc5909f8327679e73d0e9cd3a60a1c006ce85b8":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"958e0edfe65dde01c97aa1e7b9cb0c065f371a3330a42d473bc79a0491ebfc4f","named":{},"root":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}},"ink_m61a3849a7a6ebf0fe028d8fa87a1a3eaa6166a2532387000b50e461faa1b2899":{"arguments":{"format":"ink-value-wire-v1","identity":"1dbd92479e4132df4112ee804b4863ed22312c28d4856d85aed77754b2671a10","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75a4618821d68677bbefcd2dc8914150aecf406a4a3da1ef14cc88b57d83d830","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}}},"ink_m693a1ebd0432f205eabdd53caaf1bb1ac592d434476d44639419d5b63ab48e45":{"arguments":{"format":"ink-value-wire-v1","identity":"17f3e017634c517452044c80028b56718cfc21dfd3e6cd791ef2319dd220bcc2","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"c","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"8e9fa024666eb3bfe6ab6049f660e547a12b56772f4ecbff9addcea5a92f3d9a","named":{},"root":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}},"ink_m746b7ebe9bcb715eb063c9a8acdc48ed10dd67c3ac1ab355ca08a8a31f2e076a":{"arguments":{"format":"ink-value-wire-v1","identity":"1dbd92479e4132df4112ee804b4863ed22312c28d4856d85aed77754b2671a10","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"start","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"fit","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"75a4618821d68677bbefcd2dc8914150aecf406a4a3da1ef14cc88b57d83d830","named":{},"root":{"fields":[{"name":"index","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"done","type":{"kind":"bool"}}],"kind":"record","name":"ink_m7b062ce6e1c2efcea6de69b7c533325db5ea045c74268a2b5acae500b6575dfc"}}},"ink_m79fbd33ce445d81b5495367bea54ed582eb29a97df1560f52a1db7c4538eabd4":{"arguments":{"format":"ink-value-wire-v1","identity":"c3e1c11e682af8a0dca6bce5731523dfc4cd4063d21e60ee62914c18c5cec200","named":{},"root":{"fields":[{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_ma9923eba3cdcc3be4bd5eec9937c55f89cb7af34eade1f02c02bde46b444755d":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"51f75af7953a9d922f9ada927ffd8d0c8c476597ed69294f0a0425f75b052cff","named":{},"root":{"kind":"u32"}}},"ink_maa2ffc47f94a1df1e2b1982bb687b3b95ea1f18c3d31e5270249eb9a5b1b8987":{"arguments":{"format":"ink-value-wire-v1","identity":"22ccae4e651c3400343cf3a9d397f2740b858e5ad1aeed6d97ee2949ed2b050d","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"081b7ebb8399381d2b15563997bcd9e2a9bfe2aa069502c6663cbda217b039d2","named":{},"root":{"kind":"f64"}}},"ink_mb3166db2bf18ab05ba193c347c860e3c609f09da430fd77ac9981409ba2efcef":{"unsupported":"unsupported wire descriptor"},"ink_mb4277fe25fdfb0e134f990b04d6baa626119984e30cca8da242f327fd2871a58":{"arguments":{"format":"ink-value-wire-v1","identity":"2a2788fa3b1e05bb17c1278b1fca7eaf8dad34a3e69e8baf16adaaa6487c395b","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"f4055357f369cc8f275f6cc1d5569678031edf449ad32c3c8d392d37fab5b1ed","named":{},"root":{"element":{"kind":"u32"},"kind":"option"}}},"ink_mc1df4b06d386435afd93c2deb158f576ca1a0b8da5cc9ddac9804cbbd5aaed55":{"arguments":{"format":"ink-value-wire-v1","identity":"2a2788fa3b1e05bb17c1278b1fca7eaf8dad34a3e69e8baf16adaaa6487c395b","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ecfeb978a3522397be254146ef28fe5f3058566b565a7f4962c9131b6b18ae1c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}}},"ink_md45fb160f95b90ffa06f2e883a8e13e6cfb6f48c9e504c758674212aaaafed13":{"arguments":{"format":"ink-value-wire-v1","identity":"6f216386ecb924bce5a8e749a1e37cad000c13c87ec367c037a886590a47a6c7","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mdb420bacbaded3bd4a47c64a08eab41bd49e5a1eb00a06f5fb4216055764e14f":{"arguments":{"format":"ink-value-wire-v1","identity":"d95574a1453f38b447e94bccad1e5dd882553eca4b79f52ca848dd2ede361d93","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"fit","type":{"kind":"f64"}},{"name":"i","type":{"kind":"u32"}},{"name":"s","type":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"3650a28e866fe994c1295f191904faf234c261d3a1a0a1b12bbf12c9e04226a2","named":{},"root":{"fields":[{"name":"lines","type":{"kind":"u32"}},{"name":"width","type":{"kind":"f64"}},{"name":"content","type":{"kind":"bool"}}],"kind":"record","name":"ink_mf5f38b2c9341e2757358c69c56230c166b0a29429246531c44a142a452637844"}}},"ink_me3e1d6802e8b8c99257eae2c70e1c73b81194a7b49cd49c1aadcbcf5fb61a373":{"arguments":{"format":"ink-value-wire-v1","identity":"ea66b8576d707e48b450556d72d53a4493461afe4be9a445be48c4a1aa67ad16","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"82ec50d2da2c3182aceb5378e08d8b8fe9de60c2be54d6daf5dbdb658955279f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}}},"ink_mf2da1ccb63323de619308b515afc2e8427fa422cacc3b9e180896d7c1933a5db":{"arguments":{"format":"ink-value-wire-v1","identity":"ca7d05d687135adb81b9858ad2e18cb8e2bfdd9f310542855171482c6284f07d","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}},{"name":"atStart","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mf3fd6a8edcedf12678ee0135d258e53818da29f98901e4823c5b5fa68a8742b5":{"arguments":{"format":"ink-value-wire-v1","identity":"f667ca7c21d73ca0e9242c88fa53326ebdb418812897d559970ed1db9c7aeb3c","named":{},"root":{"fields":[{"name":"d","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"i","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"32f3d3b2f14a1a5d5ed940c0f1126e8a0b1b1f76ff20ac48fac23528d7033176","named":{},"root":{"kind":"bool"}}},"ink_mf92f9e487553a051acda291cdf01e6ab1ad3a5254dd3d94587ad2b797d8dea28":{"arguments":{"format":"ink-value-wire-v1","identity":"849e86828ba3b664132f5aa51c80dd1f91b4598af1024a1580d92d2e15770ef6","named":{},"root":{"fields":[{"name":"p","type":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"847cdb58437325b0783e94e7d572b615580b335968d233fd0e1b9879487ce4b2","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}},"layout":{"arguments":{"format":"ink-value-wire-v1","identity":"12868a3202c474e3db65dc4ff3bb8dc81cdd78f4fcd3dae557f7b42d54fc8ed2","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}},{"name":"lineHeight","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"847cdb58437325b0783e94e7d572b615580b335968d233fd0e1b9879487ce4b2","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"height","type":{"kind":"f64"}}],"kind":"record","name":"ink_mf31874390da54b3c180b48032618b677f5ca389c9ffcfc54ae469de235e84bcb"}}}},"line":{"arguments":{"format":"ink-value-wire-v1","identity":"ad927f6815e10415fe2ad6b49b3be99770ef082e84bbd38076539814c89e1d9d","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"cursor","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"6dabf0313de1ca25f33127bc080f250697ab4e45b0935d5c06756788a303369f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"option"}}}},"lines":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"56dc0435d74d48781d7002db784cd2f88c15385d3cd6b708425c161c37cc361c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"element":{"fields":[{"name":"width","type":{"kind":"f64"}},{"name":"start","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}},{"name":"end","type":{"fields":[{"name":"segment","type":{"kind":"u32"}},{"name":"grapheme","type":{"kind":"u32"}}],"kind":"record","name":"ink_m2790802a593ba1a09d029a1ebf8c3785763b6685703b958ab56b6d0bc06ed8be"}}],"kind":"record","name":"ink_mc03a85b468fe7b088aa96db164811d6d6b67a5d8647d5d9237958f70b2ae2993"},"kind":"list"}}}},"numeric":{"arguments":{"format":"ink-value-wire-v1","identity":"7d522496fa90814f2f1e12091142cca8648a00e9c787d158636f57940650d4e4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}},"prepare":{"arguments":{"format":"ink-value-wire-v1","identity":"420561bdb34944962fafc5dd683910a11ec0ec79e77e10ebde738e30e54acf2c","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"maximum","type":{"kind":"u32"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ecfeb978a3522397be254146ef28fe5f3058566b565a7f4962c9131b6b18ae1c","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"budget","type":{"kind":"u32"}}],"kind":"record","name":"ink_mdb54778f579f908908ad7f3f346cc3ea2d7cc1340eed5217914631e6ebc478e8"}}}},"stats":{"arguments":{"format":"ink-value-wire-v1","identity":"0d9813fafc11c1ce57d687b8f597a62e1278f03c1d61330d83c27c5625c3aa7f","named":{},"root":{"fields":[{"name":"data","type":{"fields":[{"name":"widths","type":{"element":{"kind":"f64"},"kind":"list"}},{"name":"flags","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"advances","type":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"}},{"name":"startExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"graphemeStartExtras","type":{"element":{"element":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"},"kind":"list"},"kind":"option"}},{"name":"endTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"overflowTrims","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"insideExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}},{"name":"fillExtras","type":{"element":{"element":{"kind":"f64"},"kind":"list"},"kind":"option"}}],"kind":"record","name":"ink_m65acfe79ee1b007f44b6f7ecc0131dbee707343e5a53f22c71bba1f6c036ebff"}},{"name":"epsilon","type":{"kind":"f64"}},{"name":"width","type":{"kind":"f64"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"82ec50d2da2c3182aceb5378e08d8b8fe9de60c2be54d6daf5dbdb658955279f","named":{},"root":{"error":{"kind":"string"},"kind":"result","ok":{"fields":[{"name":"lineCount","type":{"kind":"u32"}},{"name":"maxLineWidth","type":{"kind":"f64"}}],"kind":"record","name":"ink_mebc69b4f5837f6ba504ffabce3a2e390b39e0df6c574d9d7170f95c92d5d24e8"}}}}}}};
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
function __prepareFn0(fixed,depth=0){if(depth>=16)return __fn0;let v1306;
return function(v1300,v1301,v1302){const v1303=v1300;
const v1304=v1301;
const v1305=v1302;
if(!v1306){const v1307=__preparedFactories.get(17);v1306=v1307?v1307([fixed[0],fixed[1],fixed[2]],depth+1):__fn17;}
return v1306(v1303,v1304,v1305);};}
function __prepareFn1(fixed,depth=0){if(depth>=16)return __fn1;let v1314;
return function(v1308,v1309,v1310){const v1311=v1308;
const v1312=v1309;
const v1313=1000000;
if(!v1314){const v1315=__preparedFactories.get(17);v1314=v1315?v1315([fixed[0],fixed[1],true],depth+1):__fn17;}
const v1316=v1314(v1311,v1312,v1313);
const v1318=v1316;
let v1319;if(Object.hasOwn(v1318,"Ok")){
const v1320=v1318["Ok"];
const v1321=v1320;
const v1322=v1321;
const v1323=v1310;
v1319=__fn34(v1322,v1323);}else{
const v1324=v1318["Err"];
v1319=({Err:v1324});}
return v1319;};}
function __prepareFn2(fixed,depth=0){if(depth>=16)return __fn2;let v1331;
return function(v1325,v1326,v1327){const v1328=v1325;
const v1329=v1326;
const v1330=1000000;
if(!v1331){const v1332=__preparedFactories.get(17);v1331=v1332?v1332([fixed[0],fixed[1],true],depth+1):__fn17;}
const v1333=v1331(v1328,v1329,v1330);
const v1335=v1333;
let v1336;if(Object.hasOwn(v1335,"Ok")){
const v1337=v1335["Ok"];
const v1338=v1337;
const v1339=v1338;
const v1340=v1327;
v1336=__fn30(v1339,v1340);}else{
const v1341=v1335["Err"];
v1336=({Err:v1341});}
return v1336;};}
function __prepareFn3(fixed,depth=0){if(depth>=16)return __fn3;let v1348;
return function(v1342,v1343,v1344){const v1345=v1342;
const v1346=v1343;
const v1347=1000000;
if(!v1348){const v1349=__preparedFactories.get(17);v1348=v1349?v1349([fixed[0],fixed[1],true],depth+1):__fn17;}
const v1350=v1348(v1345,v1346,v1347);
const v1352=v1350;
let v1353;if(Object.hasOwn(v1352,"Ok")){
const v1354=v1352["Ok"];
const v1355=v1354;
const v1356=v1355;
const v1357=v1344;
v1353=__fn28(v1356,v1357);}else{
const v1358=v1352["Err"];
v1353=({Err:v1358});}
return v1353;};}
function __prepareFn4(fixed,depth=0){if(depth>=16)return __fn4;let v1366;
return function(v1359,v1360,v1361,v1362){const v1363=v1359;
const v1364=v1360;
const v1365=1000000;
if(!v1366){const v1367=__preparedFactories.get(17);v1366=v1367?v1367([fixed[0],fixed[1],true],depth+1):__fn17;}
const v1368=v1366(v1363,v1364,v1365);
const v1370=v1368;
let v1371;if(Object.hasOwn(v1370,"Ok")){
const v1372=v1370["Ok"];
const v1373=v1372;
const v1374=v1373;
const v1375=v1361;
const v1376=v1362;
v1371=__fn35(v1374,v1375,v1376);}else{
const v1377=v1370["Err"];
v1371=({Err:v1377});}
return v1371;};}
function __prepareFn5(fixed,depth=0){if(depth>=16)return __fn5;let v1385;
return function(v1378,v1379,v1380,v1381){const v1382=v1378;
const v1383=v1379;
const v1384=1000000;
if(!v1385){const v1386=__preparedFactories.get(17);v1385=v1386?v1386([fixed[0],fixed[1],true],depth+1):__fn17;}
const v1387=v1385(v1382,v1383,v1384);
const v1389=v1387;
let v1390;if(Object.hasOwn(v1389,"Ok")){
const v1391=v1389["Ok"];
const v1392=v1391;
const v1393=v1392;
const v1394=v1380;
const v1395=v1381;
v1390=__fn25(v1393,v1394,v1395);}else{
const v1396=v1389["Err"];
v1390=({Err:v1396});}
return v1390;};}
function __prepareFn6(fixed,depth=0){if(depth>=16)return __fn6;let v1401;
return function(v1397,v1398){const v1399=v1397;
const v1400=v1398;
if(!v1401){const v1402=__preparedFactories.get(34);v1401=v1402?v1402([fixed[0],fixed[1]],depth+1):__fn34;}
return v1401(v1399,v1400);};}
function __prepareFn15(fixed,depth=0){if(depth>=16)return __fn15;const v1499=fixed[3];let v1498=false,v1497;
const v1504=fixed[0]&&fixed[3];let v1503=false,v1502;
const v1512=fixed[0]&&fixed[3];let v1511=false,v1510;
const v1518=fixed[2];let v1517=false,v1516;
const v1526=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v1525=false,v1524;
const v1585=fixed[1]&&fixed[2]&&fixed[3];let v1584=false,v1583;
return function(v1492,v1493,v1494,v1495){let v1496;if(v1499&&v1498){v1496=v1497;}else{
const v1500=v1495;
v1496=v1500["index"];if(v1499){v1497=v1496;v1498=true;}}
let v1501;if(v1504&&v1503){v1501=v1502;}else{
const v1505=v1492;
const v1506=v1505["flags"];
const v1507=v1496;
let v1508;if(v1507<v1506.length){v1508=v1506[v1507];}else{
v1508=256;}
v1501=v1508;if(v1504){v1502=v1501;v1503=true;}}
let v1509;if(v1512&&v1511){v1509=v1510;}else{
const v1513=v1501;
const v1514=15;
v1509=(((v1513)&(v1514))>>>0);if(v1512){v1510=v1509;v1511=true;}}
let v1515;if(v1518&&v1517){v1515=v1516;}else{
const v1519=v1494;
let v1520;if(Object.hasOwn(v1519,"Some")){
const v1521=v1519["Some"];
v1520=(v1521).length;}else{
const v1522=null;
v1520=0;}
v1515=v1520;if(v1518){v1516=v1515;v1517=true;}}
let v1523;if(v1526&&v1525){v1523=v1524;}else{
const v1527=v1495;
const v1528=v1527["valid"];
let v1529=v1528;if(v1529){
const v1530=v1501;
const v1531=255;
v1529=((v1530) <= (v1531));}
const v1532=v1529;
let v1533=v1532;if(v1533){
const v1534=v1509;
const v1535=2;
v1533=((v1534) <= (v1535));}
const v1536=v1533;
let v1537=v1536;if(v1537){
const v1538=v1501;
const v1539=32;
const v1540=(((v1538)&(v1539))>>>0);
const v1541=0;
v1537=(v1540===v1541);}
const v1542=v1537;
let v1543=v1542;if(v1543){
const v1544=v1494;
let v1545;if(Object.hasOwn(v1544,"Some")){
const v1546=v1544["Some"];
const v1547=v1546;
const v1548=v1547.length;
const v1549=0;
const v1550=((v1548) > (v1549));
let v1551=v1550;if(v1551){
const v1552=v1546;
const v1553=v1552.length;
const v1554=1000000;
v1551=((v1553) <= (v1554));}
const v1555=v1551;
let v1556=v1555;if(v1556){
const v1557=(v1546).length;
const v1558=v1493;
v1556=((v1557) <= (v1558));}
const v1559=v1556;
let v1560=v1559;if(v1560){
const v1561=v1546;
v1560=__fn13(v1561);}
v1545=v1560;}else{
const v1562=null;
v1545=true;}
v1543=v1545;}
const v1563=v1543;
let v1564=v1563;if(v1564){
const v1565=v1492;
const v1566=v1496;
const v1567=__fn9(v1565,v1566);
let v1568;if(Object.hasOwn(v1567,"Some")){
const v1569=v1567["Some"];
const v1570=v1494;
let v1571;if(Object.hasOwn(v1570,"Some")){
const v1572=v1570["Some"];
const v1573=v1569;
const v1574=v1573.length;
const v1575=v1572;
const v1576=v1575.length;
const v1577=((v1574) === (v1576));
let v1578=v1577;if(v1578){
const v1579=v1569;
v1578=__fn13(v1579);}
v1571=v1578;}else{
const v1580=null;
v1571=false;}
v1568=v1571;}else{
const v1581=null;
v1568=true;}
v1564=v1568;}
v1523=v1564;if(v1526){v1524=v1523;v1525=true;}}
let v1582;if(v1585&&v1584){v1582=v1583;}else{
const v1586=v1515;
const v1587=v1493;
const v1588=v1495;
const v1589=v1588["budget"];
const v1590=(((v1587) - (v1589)) >>> 0);
v1582=((v1586) <= (v1590));if(v1585){v1583=v1582;v1584=true;}}
const v1591=v1523;
let v1592=v1591;if(v1592){
v1592=v1582;}
const v1593=v1592;
let v1594;if(v1582){
const v1595=v1495;
const v1596=v1595["budget"];
const v1597=v1515;
v1594=(((v1596) + (v1597)) >>> 0);}else{
const v1598=v1495;
v1594=v1598["budget"];}
const v1599=v1594;
const v1600=v1496;
const v1601=1;
const v1602=(((v1600) + (v1601)) >>> 0);
return ({["valid"]:v1593,["budget"]:v1599,["index"]:v1602});};}
function __prepareFn16(fixed,depth=0){if(depth>=16)return __fn16;const v1609=fixed[0]&&fixed[1]&&fixed[2];let v1608=false,v1607;
const v1645=fixed[0];let v1644=false,v1643;
const v1650=fixed[0];let v1649=false,v1648;
const v1726=fixed[0]&&fixed[2];let v1725=false,v1724;
return function(v1603,v1604,v1605){let v1606;if(v1609&&v1608){v1606=v1607;}else{
const v1610=v1605;
const v1611=0;
const v1612=(v1610===v1611);
let v1613=v1612;if(!v1613){
const v1614=v1605;
const v1615=1000000;
v1613=((v1614) > (v1615));}
const v1616=v1613;
let v1617=v1616;if(!v1617){
const v1618=v1603;
const v1619=v1618["widths"];
const v1620=v1619.length;
const v1621=1000000;
v1617=((v1620) > (v1621));}
const v1622=v1617;
let v1623=v1622;if(!v1623){
const v1624=v1603;
const v1625=(v1624["widths"]).length;
const v1626=v1605;
v1623=((v1625) > (v1626));}
const v1627=v1623;
let v1628=v1627;if(!v1628){
const v1629=v1603;
const v1630=v1629["widths"];
const v1631=__fn13(v1630);
const v1632=false;
v1628=(v1631===v1632);}
const v1633=v1628;
let v1634=v1633;if(!v1634){
const v1635=Number.isFinite(__dfNumber(v1604));
const v1636=false;
v1634=(v1635===v1636);}
const v1637=v1634;
let v1638=v1637;if(!v1638){
const v1639=v1604;
const v1640=__dfFromBits(0n);
v1638=((__dfNumber(v1639)) < (__dfNumber(v1640)));}
v1606=v1638;if(v1609){v1607=v1606;v1608=true;}}
let v1641;if(v1606){
v1641=({None:null});}else{
let v1642;if(v1645&&v1644){v1642=v1643;}else{
const v1646=v1603;
v1642=(v1646["widths"]).length;if(v1645){v1643=v1642;v1644=true;}}
let v1647;if(v1650&&v1649){v1647=v1648;}else{
const v1651=v1603;
const v1652=v1651["flags"];
const v1653=v1652.length;
const v1654=1000000;
const v1655=((v1653) > (v1654));
let v1656=v1655;if(!v1656){
const v1657=v1603;
const v1658=(v1657["flags"]).length;
const v1659=v1642;
v1656=!(v1658===v1659);}
const v1660=v1656;
let v1661=v1660;if(!v1661){
const v1662=v1603;
const v1663=v1662["advances"];
const v1664=v1663.length;
const v1665=1000000;
v1661=((v1664) > (v1665));}
const v1666=v1661;
let v1667=v1666;if(!v1667){
const v1668=v1603;
const v1669=(v1668["advances"]).length;
const v1670=v1642;
v1667=!(v1669===v1670);}
const v1671=v1667;
let v1672=v1671;if(!v1672){
const v1673=v1603;
const v1674=v1673["startExtras"];
const v1675=v1642;
const v1676=__fn14(v1674,v1675);
const v1677=false;
v1672=(v1676===v1677);}
const v1678=v1672;
let v1679=v1678;if(!v1679){
const v1680=v1603;
const v1681=v1680["endTrims"];
const v1682=v1642;
const v1683=__fn14(v1681,v1682);
const v1684=false;
v1679=(v1683===v1684);}
const v1685=v1679;
let v1686=v1685;if(!v1686){
const v1687=v1603;
const v1688=v1687["overflowTrims"];
const v1689=v1642;
const v1690=__fn14(v1688,v1689);
const v1691=false;
v1686=(v1690===v1691);}
const v1692=v1686;
let v1693=v1692;if(!v1693){
const v1694=v1603;
const v1695=v1694["insideExtras"];
const v1696=v1642;
const v1697=__fn14(v1695,v1696);
const v1698=false;
v1693=(v1697===v1698);}
const v1699=v1693;
let v1700=v1699;if(!v1700){
const v1701=v1603;
const v1702=v1701["fillExtras"];
const v1703=v1642;
const v1704=__fn14(v1702,v1703);
const v1705=false;
v1700=(v1704===v1705);}
const v1706=v1700;
let v1707=v1706;if(!v1707){
const v1708=v1603;
const v1709=v1708["graphemeStartExtras"];
let v1710;if(Object.hasOwn(v1709,"Some")){
const v1711=v1709["Some"];
const v1712=v1711;
const v1713=v1712.length;
const v1714=1000000;
const v1715=((v1713) <= (v1714));
let v1716=v1715;if(v1716){
const v1717=(v1711).length;
const v1718=v1642;
v1716=(v1717===v1718);}
v1710=v1716;}else{
const v1719=null;
v1710=true;}
const v1720=v1710;
const v1721=false;
v1707=(v1720===v1721);}
v1647=v1707;if(v1650){v1648=v1647;v1649=true;}}
let v1722;if(v1647){
v1722=({None:null});}else{
let v1723;if(v1726&&v1725){v1723=v1724;}else{
const v1727=v1603;
const v1728=v1727["advances"];
const v1729=true;
const v1730=v1642;
const v1731=0;
let v1732=({["valid"]:v1729,["budget"]:v1730,["index"]:v1731});
for(let v1733=0;v1733<v1728.length;v1733++){
const v1734=v1728[v1733];
const v1735=v1603;
const v1736=v1605;
const v1737=v1734;
const v1738=v1732;
v1732=__fn15(v1735,v1736,v1737,v1738);
}
v1723=v1732;if(v1726){v1724=v1723;v1725=true;}}
const v1739=v1723;
const v1740=v1739["valid"];
let v1741;if(v1740){
const v1742=v1723;
v1741=({Some:v1742["budget"]});}else{
v1741=({None:null});}
v1722=v1741;}
v1641=v1722;}
return v1641;};}
function __prepareFn17(fixed,depth=0){if(depth>=16)return __fn17;let v1749;
return function(v1743,v1744,v1745){const v1746=v1743;
const v1747=v1744;
const v1748=v1745;
if(!v1749){const v1750=__preparedFactories.get(16);v1749=v1750?v1750([fixed[0],fixed[1],fixed[2]],depth+1):__fn16;}
const v1751=v1749(v1746,v1747,v1748);
const v1753=v1751;
let v1754;if(Object.hasOwn(v1753,"Some")){
const v1755=v1753["Some"];
const v1756=v1743;
const v1757=v1744;
const v1758=v1755;
v1754=({Ok:({["data"]:v1756,["epsilon"]:v1757,["budget"]:v1758})});}else{
const v1759=null;
v1754=({Err:"invalid simple prepared text"});}
return v1754;};}
function __prepareFn18(fixed,depth=0){if(depth>=16)return __fn18;let v1766;
return function(v1760){const v1761=v1760;
const v1762=v1761["data"];
const v1763=v1760;
const v1764=v1763["epsilon"];
const v1765=1000000;
if(!v1766){const v1767=__preparedFactories.get(16);v1766=v1767?v1767([fixed[0],fixed[0],true],depth+1):__fn16;}
const v1768=v1766(v1762,v1764,v1765);
const v1770=v1768;
let v1771;if(Object.hasOwn(v1770,"Some")){
const v1772=v1770["Some"];
const v1773=v1772;
const v1774=v1760;
const v1775=v1774["budget"];
v1771=(v1773===v1775);}else{
const v1776=null;
v1771=false;}
return v1771;};}
function __prepareFn21(fixed,depth=0){if(depth>=16)return __fn21;const v1793=fixed[0];let v1792=false,v1791;
const v1798=fixed[1];let v1797=false,v1796;
const v1805=fixed[0]&&fixed[1];let v1804=false,v1803;
return function(v1788,v1789){let v1790;if(v1793&&v1792){v1790=v1791;}else{
const v1794=v1788;
v1790=(v1794["widths"]).length;if(v1793){v1791=v1790;v1792=true;}}
let v1795;if(v1798&&v1797){v1795=v1796;}else{
const v1799=v1789;
const v1800=v1799["segment"];
const v1801=0;
v1795=(v1800===v1801);if(v1798){v1796=v1795;v1797=true;}}
let v1802;if(v1805&&v1804){v1802=v1803;}else{
const v1806=v1790;
const v1807=v1789;
const v1808=v1789;
const v1809=v1808["grapheme"];
const v1810=0;
const v1811=((v1809) > (v1810));
let v1812=v1811;if(!v1812){
const v1813=v1789;
const v1814=v1813["segment"];
const v1815=v1790;
v1812=((v1814) >= (v1815));}
const v1816=v1812;
let v1817=({["cursor"]:v1807,["done"]:v1816});
for(let v1818=0;v1818<v1806;v1818++){
const v1819=v1817;
if(v1819["done"]){break;}
const v1820=(v1818>>>0);
const v1821=v1788;
const v1822=v1817;
const v1823=v1822["cursor"];
const v1824=v1823["segment"];
const v1825=v1795;
let v1826;if(__fn11(v1821,v1824,v1825)){
const v1827=v1817;
const v1828=v1827["cursor"];
const v1829=v1828["segment"];
const v1830=1;
const v1831=(((v1829) + (v1830)) >>> 0);
const v1832=0;
const v1833=({["segment"]:v1831,["grapheme"]:v1832});
const v1834=v1817;
const v1835=v1834["cursor"];
const v1836=v1835["segment"];
const v1837=1;
const v1838=(((v1836) + (v1837)) >>> 0);
const v1839=v1790;
const v1840=((v1838) >= (v1839));
v1826=({["cursor"]:v1833,["done"]:v1840});}else{
const v1841=v1817;
const v1842=v1841["cursor"];
const v1843=true;
v1826=({["cursor"]:v1842,["done"]:v1843});}
v1817=v1826;}
v1802=v1817;if(v1805){v1803=v1802;v1804=true;}}
const v1844=v1802;
return v1844["cursor"];};}
function __prepareFn23(fixed,depth=0){if(depth>=16)return __fn23;const v1897=fixed[2];let v1896=false,v1895;
const v1902=fixed[0]&&fixed[2];let v1901=false,v1900;
const v1910=fixed[0]&&fixed[2];let v1909=false,v1908;
let v1914;
const v1928=fixed[0]&&fixed[2];let v1927=false,v1926;
let v1931;
const v1936=fixed[0]&&fixed[2];let v1935=false,v1934;
const v1940=fixed[0]&&fixed[2];let v1939=false,v1938;
const v1966=fixed[0]&&fixed[2];let v1965=false,v1964;
const v1975=fixed[0]&&fixed[2];let v1974=false,v1973;
const v1979=true;let v1978=false,v1977;
const v1992=fixed[0]&&fixed[2];let v1991=false,v1990;
const v1999=fixed[2];let v1998=false,v1997;
const v2005=fixed[0]&&fixed[2];let v2004=false,v2003;
const v2009=fixed[0]&&fixed[1]&&fixed[2];let v2008=false,v2007;
return function(v1891,v1892,v1893){let v1894;if(v1897&&v1896){v1894=v1895;}else{
const v1898=v1893;
v1894=v1898["index"];if(v1897){v1895=v1894;v1896=true;}}
let v1899;if(v1902&&v1901){v1899=v1900;}else{
const v1903=v1891;
const v1904=v1903["widths"];
const v1905=v1894;
let v1906;if(v1905<v1904.length){v1906=v1904[v1905];}else{
v1906=__dfFromBits(0n);}
v1899=v1906;if(v1902){v1900=v1899;v1901=true;}}
let v1907;if(v1910&&v1909){v1907=v1908;}else{
const v1911=v1891;
const v1912=v1911["endTrims"];
const v1913=v1894;
if(!v1914){const v1915=__preparedFactories.get(8);v1914=v1915?v1915([fixed[0],fixed[2]],depth+1):__fn8;}
v1907=v1914(v1912,v1913);if(v1910){v1908=v1907;v1909=true;}}
const v1916=v1893;
const v1917=v1916["width"];
const v1918=v1899;
const v1919=(__dfNumber(v1917) + __dfNumber(v1918));
const v1920=v1907;
const v1921=(__dfNumber(v1919) - __dfNumber(v1920));
const v1922=v1892;
const v1923=((__dfNumber(v1921)) > (__dfNumber(v1922)));
let v1924;if(v1923){
let v1925;if(v1928&&v1927){v1925=v1926;}else{
const v1929=v1891;
const v1930=v1894;
if(!v1931){const v1932=__preparedFactories.get(12);v1931=v1932?v1932([fixed[0],fixed[2]],depth+1):__fn12;}
v1925=v1931(v1929,v1930);if(v1928){v1926=v1925;v1927=true;}}
let v1933;if(v1936&&v1935){v1933=v1934;}else{
let v1937;if(v1940&&v1939){v1937=v1938;}else{
const v1941=v1925;
const v1942=false;
const v1943=(v1941===v1942);
let v1944=v1943;if(v1944){
const v1945=v1891;
const v1946=v1894;
const v1947=1;
const v1948=(((v1946) - (v1947)) >>> 0);
v1944=__fn12(v1945,v1948);}
v1937=v1944;if(v1940){v1938=v1937;v1939=true;}}
let v1949;if(v1937){
const v1950=v1893;
const v1951=v1950["width"];
const v1952=v1891;
const v1953=v1952["widths"];
const v1954=v1894;
const v1955=1;
const v1956=(((v1954) - (v1955)) >>> 0);
let v1957;if(v1956<v1953.length){v1957=v1953[v1956];}else{
v1957=__dfFromBits(0n);}
const v1958=v1957;
v1949=(__dfNumber(v1951) - __dfNumber(v1958));}else{
const v1959=v1893;
const v1960=v1959["width"];
const v1961=v1893;
const v1962=v1961["trimmed"];
v1949=(__dfNumber(v1960) - __dfNumber(v1962));}
v1933=v1949;if(v1936){v1934=v1933;v1935=true;}}
let v1963;if(v1966&&v1965){v1963=v1964;}else{
let v1967;if(v1925){
const v1968=v1894;
const v1969=1;
v1967=(((v1968) + (v1969)) >>> 0);}else{
v1967=v1894;}
const v1970=v1967;
const v1971=0;
v1963=({["segment"]:v1970,["grapheme"]:v1971});if(v1966){v1964=v1963;v1965=true;}}
let v1972;if(v1975&&v1974){v1972=v1973;}else{
v1972=v1933;if(v1975){v1973=v1972;v1974=true;}}
let v1976;if(v1979&&v1978){v1976=v1977;}else{
v1976=true;if(v1979){v1977=v1976;v1978=true;}}
const v1980=v1893;
const v1981=v1980["index"];
const v1982=v1893;
const v1983=v1982["width"];
const v1984=v1893;
const v1985=v1984["trimmed"];
const v1986=v1963;
const v1987=v1972;
const v1988=v1976;
v1924=({["index"]:v1981,["width"]:v1983,["trimmed"]:v1985,["end"]:v1986,["result"]:v1987,["done"]:v1988});}else{
let v1989;if(v1992&&v1991){v1989=v1990;}else{
const v1993=v1893;
const v1994=v1993["width"];
const v1995=v1899;
v1989=(__dfNumber(v1994) + __dfNumber(v1995));if(v1992){v1990=v1989;v1991=true;}}
let v1996;if(v1999&&v1998){v1996=v1997;}else{
const v2000=v1894;
const v2001=1;
v1996=(((v2000) + (v2001)) >>> 0);if(v1999){v1997=v1996;v1998=true;}}
let v2002;if(v2005&&v2004){v2002=v2003;}else{
v2002=v1989;if(v2005){v2003=v2002;v2004=true;}}
let v2006;if(v2009&&v2008){v2006=v2007;}else{
const v2010=v1989;
const v2011=v1892;
const v2012=((__dfNumber(v2010)) > (__dfNumber(v2011)));
let v2013;if(v2012){
v2013=v1907;}else{
v2013=__dfFromBits(0n);}
v2006=v2013;if(v2009){v2007=v2006;v2008=true;}}
const v2014=v1996;
const v2015=v2002;
const v2016=v2006;
const v2017=v1893;
const v2018=v2017["end"];
const v2019=v1893;
const v2020=v2019["result"];
const v2021=v1893;
const v2022=v2021["done"];
v1924=({["index"]:v2014,["width"]:v2015,["trimmed"]:v2016,["end"]:v2018,["result"]:v2020,["done"]:v2022});}
return v1924;};}
function __prepareFn24(fixed,depth=0){if(depth>=16)return __fn24;const v2029=fixed[0];let v2028=false,v2027;
const v2034=fixed[0]&&fixed[2];let v2033=false,v2032;
let v2037;
const v2042=fixed[0];let v2041=false,v2040;
const v2047=fixed[1];let v2046=false,v2045;
const v2052=fixed[0]&&fixed[1];let v2051=false,v2050;
const v2060=fixed[0]&&fixed[1];let v2059=false,v2058;
const v2082=fixed[0]&&fixed[1];let v2081=false,v2080;
let v2086;
const v2091=fixed[0]&&fixed[1]&&fixed[2];let v2090=false,v2089;
const v2111=fixed[0]&&fixed[1]&&fixed[2];let v2110=false,v2109;
const v2130=fixed[0]&&fixed[1];let v2129=false,v2128;
const v2138=fixed[0]&&fixed[1];let v2137=false,v2136;
let v2141;
const v2166=fixed[0]&&fixed[1];let v2165=false,v2164;
const v2188=fixed[0]&&fixed[1]&&fixed[2];let v2187=false,v2186;
let v2198;
const v2220=fixed[0]&&fixed[1]&&fixed[2];let v2219=false,v2218;
const v2232=fixed[0]&&fixed[1]&&fixed[2];let v2231=false,v2230;
return function(v2023,v2024,v2025){let v2026;if(v2029&&v2028){v2026=v2027;}else{
const v2030=v2023;
v2026=v2030["data"];if(v2029){v2027=v2026;v2028=true;}}
let v2031;if(v2034&&v2033){v2031=v2032;}else{
const v2035=v2023;
const v2036=v2025;
if(!v2037){const v2038=__preparedFactories.get(20);v2037=v2038?v2038([fixed[0],fixed[2]],depth+1):__fn20;}
v2031=v2037(v2035,v2036);if(v2034){v2032=v2031;v2033=true;}}
let v2039;if(v2042&&v2041){v2039=v2040;}else{
const v2043=v2026;
v2039=(v2043["widths"]).length;if(v2042){v2040=v2039;v2041=true;}}
let v2044;if(v2047&&v2046){v2044=v2045;}else{
const v2048=v2024;
v2044=v2048["segment"];if(v2047){v2045=v2044;v2046=true;}}
let v2049;if(v2052&&v2051){v2049=v2050;}else{
const v2053=v2026;
const v2054=v2053["advances"];
const v2055=v2044;
let v2056;if(v2055<v2054.length){v2056=v2054[v2055];}else{
v2056=({None:null});}
v2049=v2056;if(v2052){v2050=v2049;v2051=true;}}
let v2057;if(v2060&&v2059){v2057=v2058;}else{
const v2061=v2026;
const v2062=v2061["startExtras"];
let v2063;if(Object.hasOwn(v2062,"Some")){
const v2064=v2062["Some"];
const v2065=v2026;
const v2066=v2065["widths"];
const v2067=v2044;
let v2068;if(v2067<v2066.length){v2068=v2066[v2067];}else{
v2068=__dfFromBits(0n);}
const v2069=v2068;
const v2070=v2064;
const v2071=v2044;
let v2072;if(v2071<v2070.length){v2072=v2070[v2071];}else{
v2072=__dfFromBits(0n);}
const v2073=v2072;
v2063=(__dfNumber(v2069) + __dfNumber(v2073));}else{
const v2074=null;
const v2075=v2026;
const v2076=v2075["widths"];
const v2077=v2044;
let v2078;if(v2077<v2076.length){v2078=v2076[v2077];}else{
v2078=__dfFromBits(0n);}
v2063=v2078;}
v2057=v2063;if(v2060){v2058=v2057;v2059=true;}}
let v2079;if(v2082&&v2081){v2079=v2080;}else{
const v2083=v2026;
const v2084=v2083["endTrims"];
const v2085=v2044;
if(!v2086){const v2087=__preparedFactories.get(8);v2086=v2087?v2087([fixed[0],fixed[1]],depth+1):__fn8;}
v2079=v2086(v2084,v2085);if(v2082){v2080=v2079;v2081=true;}}
let v2088;if(v2091&&v2090){v2088=v2089;}else{
const v2092=v2026;
const v2093=v2092["overflowTrims"];
let v2094;if(Object.hasOwn(v2093,"Some")){
const v2095=v2093["Some"];
const v2096=v2057;
const v2097=v2095;
const v2098=v2044;
let v2099;if(v2098<v2097.length){v2099=v2097[v2098];}else{
v2099=__dfFromBits(0n);}
const v2100=v2099;
const v2101=(__dfNumber(v2096) - __dfNumber(v2100));
const v2102=v2031;
let v2103;if(((__dfNumber(v2101)) <= (__dfNumber(v2102)))){
const v2104=v2095;
const v2105=v2044;
let v2106;if(v2105<v2104.length){v2106=v2104[v2105];}else{
v2106=__dfFromBits(0n);}
v2103=v2106;}else{
v2103=v2079;}
v2094=v2103;}else{
const v2107=null;
v2094=v2079;}
v2088=v2094;if(v2091){v2089=v2088;v2090=true;}}
let v2108;if(v2111&&v2110){v2108=v2109;}else{
const v2112=v2024;
const v2113=v2112["grapheme"];
const v2114=0;
const v2115=((v2113) > (v2114));
let v2116=v2115;if(!v2116){
const v2117=v2057;
const v2118=v2088;
const v2119=(__dfNumber(v2117) - __dfNumber(v2118));
const v2120=v2031;
const v2121=((__dfNumber(v2119)) > (__dfNumber(v2120)));
let v2122=v2121;if(v2122){
const v2123=v2049;
let v2124;if(Object.hasOwn(v2123,"Some")){
const v2125=v2123["Some"];
v2124=true;}else{
const v2126=null;
v2124=false;}
v2122=v2124;}
v2116=v2122;}
v2108=v2116;if(v2111){v2109=v2108;v2110=true;}}
let v2127;if(v2130&&v2129){v2127=v2128;}else{
const v2131=v2049;
let v2132;if(Object.hasOwn(v2131,"Some")){
const v2133=v2131["Some"];
v2132=v2133;}else{
const v2134=null;
v2132=[];}
v2127=v2132;if(v2130){v2128=v2127;v2129=true;}}
let v2135;if(v2138&&v2137){v2135=v2136;}else{
const v2139=v2026;
const v2140=v2044;
if(!v2141){const v2142=__preparedFactories.get(9);v2141=v2142?v2142([fixed[0],fixed[1]],depth+1):__fn9;}
const v2143=v2141(v2139,v2140);
const v2145=v2143;
let v2146;if(Object.hasOwn(v2145,"Some")){
const v2147=v2145["Some"];
const v2148=v2127;
const v2149=v2024;
const v2150=v2149["grapheme"];
let v2151;if(v2150<v2148.length){v2151=v2148[v2150];}else{
v2151=__dfFromBits(0n);}
const v2152=v2151;
const v2153=v2147;
const v2154=v2024;
const v2155=v2154["grapheme"];
let v2156;if(v2155<v2153.length){v2156=v2153[v2155];}else{
v2156=__dfFromBits(0n);}
const v2157=v2156;
v2146=(__dfNumber(v2152) + __dfNumber(v2157));}else{
const v2158=null;
const v2159=v2127;
const v2160=v2024;
const v2161=v2160["grapheme"];
let v2162;if(v2161<v2159.length){v2162=v2159[v2161];}else{
v2162=__dfFromBits(0n);}
v2146=v2162;}
v2135=v2146;if(v2138){v2136=v2135;v2137=true;}}
let v2163;if(v2166&&v2165){v2163=v2164;}else{
const v2167=v2024;
const v2168=v2167["grapheme"];
const v2169=0;
const v2170=((v2168) > (v2169));
let v2171;if(v2170){
const v2172=v2026;
v2171=v2172["insideExtras"];}else{
const v2173=v2026;
v2171=v2173["fillExtras"];}
const v2174=v2171;
const v2176=v2174;
let v2177;if(Object.hasOwn(v2176,"Some")){
const v2178=v2176["Some"];
const v2179=v2135;
const v2180=v2178;
const v2181=v2044;
let v2182;if(v2181<v2180.length){v2182=v2180[v2181];}else{
v2182=__dfFromBits(0n);}
const v2183=v2182;
v2177=(__dfNumber(v2179) + __dfNumber(v2183));}else{
const v2184=null;
v2177=v2135;}
v2163=v2177;if(v2166){v2164=v2163;v2165=true;}}
let v2185;if(v2188&&v2187){v2185=v2186;}else{
const v2189=v2108;
let v2190;if(v2189){
const v2191=v2127;
const v2192=v2024;
const v2193=v2192["grapheme"];
const v2194=1;
const v2195=(((v2193) + (v2194)) >>> 0);
const v2196=v2163;
const v2197=v2031;
if(!v2198){const v2199=__preparedFactories.get(22);v2198=v2199?v2199([fixed[0]&&fixed[1],fixed[1],fixed[0]&&fixed[1],fixed[0]&&fixed[2]],depth+1):__fn22;}
v2190=v2198(v2191,v2195,v2196,v2197);}else{
const v2200=(v2127).length;
const v2201=v2057;
const v2202=false;
v2190=({["index"]:v2200,["width"]:v2201,["done"]:v2202});}
v2185=v2190;if(v2188){v2186=v2185;v2187=true;}}
const v2203=v2108;
let v2204=v2203;if(v2204){
const v2205=v2185;
const v2206=v2205["index"];
const v2207=(v2127).length;
v2204=((v2206) < (v2207));}
const v2208=v2204;
let v2209;if(v2208){
const v2210=v2185;
const v2211=v2210["width"];
const v2212=v2024;
const v2213=v2044;
const v2214=v2185;
const v2215=v2214["index"];
const v2216=({["segment"]:v2213,["grapheme"]:v2215});
v2209=({["width"]:v2211,["start"]:v2212,["end"]:v2216});}else{
let v2217;if(v2220&&v2219){v2217=v2218;}else{
const v2221=v2108;
const v2222=false;
const v2223=(v2221===v2222);
let v2224=v2223;if(v2224){
const v2225=v2057;
const v2226=v2031;
v2224=((__dfNumber(v2225)) > (__dfNumber(v2226)));}
const v2227=v2224;
let v2228;if(v2227){
v2228=v2088;}else{
v2228=__dfFromBits(0n);}
v2217=v2228;if(v2220){v2218=v2217;v2219=true;}}
let v2229;if(v2232&&v2231){v2229=v2230;}else{
const v2233=v2039;
const v2234=v2044;
const v2235=1;
const v2236=(((v2234) + (v2235)) >>> 0);
const v2237=v2185;
const v2238=v2237["width"];
const v2239=v2217;
const v2240=v2039;
const v2241=0;
const v2242=({["segment"]:v2240,["grapheme"]:v2241});
const v2243=__dfFromBits(0n);
const v2244=false;
let v2245=({["index"]:v2236,["width"]:v2238,["trimmed"]:v2239,["end"]:v2242,["result"]:v2243,["done"]:v2244});
for(let v2246=0;v2246<v2233;v2246++){
const v2247=v2245;
const v2248=v2247["done"];
let v2249=v2248;if(!v2249){
const v2250=v2245;
const v2251=v2250["index"];
const v2252=v2039;
v2249=((v2251) >= (v2252));}
if(v2249){break;}
const v2253=(v2246>>>0);
const v2254=v2026;
const v2255=v2031;
const v2256=v2245;
v2245=__fn23(v2254,v2255,v2256);}
v2229=v2245;if(v2232){v2230=v2229;v2231=true;}}
const v2257=v2229;
let v2258;if(v2257["done"]){
const v2259=v2229;
v2258=v2259["result"];}else{
const v2260=v2229;
const v2261=v2260["width"];
const v2262=v2229;
const v2263=v2262["trimmed"];
v2258=(__dfNumber(v2261) - __dfNumber(v2263));}
const v2264=v2258;
const v2265=v2024;
const v2266=v2229;
const v2267=v2266["end"];
v2209=({["width"]:v2264,["start"]:v2265,["end"]:v2267});}
return v2209;};}
function __prepareFn25(fixed,depth=0){if(depth>=16)return __fn25;const v2274=fixed[0];let v2273=false,v2272;
const v2278=true;let v2277=false,v2276;
const v2289=fixed[0];let v2288=false,v2287;
const v2332=fixed[0]&&fixed[1];let v2331=false,v2330;
let v2336;
return function(v2268,v2269,v2270){let v2271;if(v2274&&v2273){v2271=v2272;}else{
let v2275;if(v2278&&v2277){v2275=v2276;}else{
v2275=({Some:null});if(v2278){v2276=v2275;v2277=true;}}
const v2279=v2275;
let v2280;if(Object.hasOwn(v2279,"Some")){
const v2281=v2279["Some"];
const v2282=v2268;
v2280=__fn18(v2282);}else{
const v2283=null;
const v2284=v2268;
v2280=__fn18(v2284);}
v2271=v2280;if(v2274){v2272=v2271;v2273=true;}}
let v2285;if(v2271){
let v2286;if(v2289&&v2288){v2286=v2287;}else{
const v2290=v2268;
const v2291=v2290["data"];
v2286=(v2291["widths"]).length;if(v2289){v2287=v2286;v2288=true;}}
const v2292=v2269;
const v2293=v2292["segment"];
const v2294=v2286;
const v2295=((v2293) > (v2294));
let v2296=v2295;if(!v2296){
const v2297=v2269;
const v2298=v2297["segment"];
const v2299=v2286;
const v2300=(v2298===v2299);
let v2301=v2300;if(v2301){
const v2302=v2269;
const v2303=v2302["grapheme"];
const v2304=0;
v2301=((v2303) > (v2304));}
v2296=v2301;}
const v2305=v2296;
let v2306=v2305;if(!v2306){
const v2307=v2269;
const v2308=v2307["grapheme"];
const v2309=0;
const v2310=((v2308) > (v2309));
let v2311=v2310;if(v2311){
const v2312=v2268;
const v2313=v2312["data"];
const v2314=v2313["advances"];
const v2315=v2269;
const v2316=v2315["segment"];
let v2317;if(v2316<v2314.length){v2317=v2314[v2316];}else{
v2317=({None:null});}
const v2318=v2317;
let v2319;if(Object.hasOwn(v2318,"Some")){
const v2320=v2318["Some"];
const v2321=v2269;
const v2322=v2321["grapheme"];
const v2323=(v2320).length;
v2319=((v2322) < (v2323));}else{
const v2324=null;
v2319=false;}
const v2325=v2319;
const v2326=false;
v2311=(v2325===v2326);}
v2306=v2311;}
const v2327=v2306;
let v2328;if(v2327){
v2328=({Err:"invalid line cursor"});}else{
let v2329;if(v2332&&v2331){v2329=v2330;}else{
const v2333=v2268;
const v2334=v2333["data"];
const v2335=v2269;
if(!v2336){const v2337=__preparedFactories.get(21);v2336=v2337?v2337([fixed[0],fixed[1]],depth+1):__fn21;}
v2329=v2336(v2334,v2335);if(v2332){v2330=v2329;v2331=true;}}
const v2338=v2329;
const v2339=v2338["segment"];
const v2340=v2286;
const v2341=((v2339) >= (v2340));
let v2342;if(v2341){
v2342=({Ok:({None:null})});}else{
const v2343=v2268;
const v2344=v2329;
const v2345=v2270;
const v2346=__fn19(v2345);
v2342=({Ok:({Some:__fn24(v2343,v2344,v2346)})});}
v2328=v2342;}
v2285=v2328;}else{
const v2347=({Some:null});
const v2348=v2347;
let v2349;if(Object.hasOwn(v2348,"Some")){
const v2350=v2348["Some"];
v2349="invalid prepared text";}else{
const v2351=null;
v2349="invalid prepared text";}
v2285=({Err:v2349});}
return v2285;};}
function __prepareFn26(fixed,depth=0){if(depth>=16)return __fn26;const v2358=fixed[0]&&fixed[2];let v2357=false,v2356;
let v2363;
const v2375=true;let v2374=false,v2373;
const v2384=fixed[0]&&fixed[1]&&fixed[2];let v2383=false,v2382;
let v2388;
return function(v2352,v2353,v2354){let v2355;if(v2358&&v2357){v2355=v2356;}else{
const v2359=v2352;
const v2360=v2359["data"];
const v2361=v2354;
const v2362=v2361["cursor"];
if(!v2363){const v2364=__preparedFactories.get(21);v2363=v2364?v2364([fixed[0],fixed[2]],depth+1):__fn21;}
v2355=v2363(v2360,v2362);if(v2358){v2356=v2355;v2357=true;}}
const v2365=v2355;
const v2366=v2365["segment"];
const v2367=v2352;
const v2368=v2367["data"];
const v2369=(v2368["widths"]).length;
const v2370=((v2366) >= (v2369));
let v2371;if(v2370){
let v2372;if(v2375&&v2374){v2372=v2373;}else{
v2372=true;if(v2375){v2373=v2372;v2374=true;}}
const v2376=v2354;
const v2377=v2376["cursor"];
const v2378=v2354;
const v2379=v2378["stats"];
const v2380=v2372;
v2371=({["cursor"]:v2377,["stats"]:v2379,["done"]:v2380});}else{
let v2381;if(v2384&&v2383){v2381=v2382;}else{
const v2385=v2352;
const v2386=v2355;
const v2387=v2353;
if(!v2388){const v2389=__preparedFactories.get(24);v2388=v2389?v2389([fixed[0],fixed[0]&&fixed[2],fixed[1]],depth+1):__fn24;}
v2381=v2388(v2385,v2386,v2387);if(v2384){v2382=v2381;v2383=true;}}
const v2390=v2381;
const v2391=v2390["end"];
const v2392=v2354;
const v2393=v2392["stats"];
const v2394=v2393["lineCount"];
const v2395=1;
const v2396=(((v2394) + (v2395)) >>> 0);
const v2397=v2381;
const v2398=v2397["width"];
const v2399=v2354;
const v2400=v2399["stats"];
const v2401=v2400["maxLineWidth"];
let v2402;if(((__dfNumber(v2398)) > (__dfNumber(v2401)))){
const v2403=v2381;
v2402=v2403["width"];}else{
const v2404=v2354;
const v2405=v2404["stats"];
v2402=v2405["maxLineWidth"];}
const v2406=v2402;
const v2407=({["lineCount"]:v2396,["maxLineWidth"]:v2406});
const v2408=false;
v2371=({["cursor"]:v2391,["stats"]:v2407,["done"]:v2408});}
return v2371;};}
function __prepareFn27(fixed,depth=0){if(depth>=16)return __fn27;const v2414=fixed[0]&&fixed[1];let v2413=false,v2412;
return function(v2409,v2410){let v2411;if(v2414&&v2413){v2411=v2412;}else{
const v2415=v2409;
const v2416=v2415["budget"];
const v2417=1;
const v2418=(((v2416) + (v2417)) >>> 0);
const v2419=0;
const v2420=0;
const v2421=({["segment"]:v2419,["grapheme"]:v2420});
const v2422=0;
const v2423=__dfFromBits(0n);
const v2424=({["lineCount"]:v2422,["maxLineWidth"]:v2423});
const v2425=false;
let v2426=({["cursor"]:v2421,["stats"]:v2424,["done"]:v2425});
for(let v2427=0;v2427<v2418;v2427++){
const v2428=v2426;
if(v2428["done"]){break;}
const v2429=(v2427>>>0);
const v2430=v2409;
const v2431=v2410;
const v2432=v2426;
v2426=__fn26(v2430,v2431,v2432);}
v2411=v2426;if(v2414){v2412=v2411;v2413=true;}}
const v2433=v2411;
return v2433["stats"];};}
function __prepareFn28(fixed,depth=0){if(depth>=16)return __fn28;const v2439=fixed[0];let v2438=false,v2437;
const v2443=true;let v2442=false,v2441;
return function(v2434,v2435){let v2436;if(v2439&&v2438){v2436=v2437;}else{
let v2440;if(v2443&&v2442){v2440=v2441;}else{
v2440=({Some:null});if(v2443){v2441=v2440;v2442=true;}}
const v2444=v2440;
let v2445;if(Object.hasOwn(v2444,"Some")){
const v2446=v2444["Some"];
const v2447=v2434;
v2445=__fn18(v2447);}else{
const v2448=null;
const v2449=v2434;
v2445=__fn18(v2449);}
v2436=v2445;if(v2439){v2437=v2436;v2438=true;}}
let v2450;if(v2436){
const v2451=v2434;
const v2452=v2435;
const v2453=__fn19(v2452);
v2450=({Ok:__fn27(v2451,v2453)});}else{
const v2454=({Some:null});
const v2455=v2454;
let v2456;if(Object.hasOwn(v2455,"Some")){
const v2457=v2455["Some"];
v2456="invalid prepared text";}else{
const v2458=null;
v2456="invalid prepared text";}
v2450=({Err:v2456});}
return v2450;};}
function __prepareFn30(fixed,depth=0){if(depth>=16)return __fn30;const v2464=fixed[0];let v2463=false,v2462;
const v2468=true;let v2467=false,v2466;
return function(v2459,v2460){let v2461;if(v2464&&v2463){v2461=v2462;}else{
let v2465;if(v2468&&v2467){v2465=v2466;}else{
v2465=({Some:null});if(v2468){v2466=v2465;v2467=true;}}
const v2469=v2465;
let v2470;if(Object.hasOwn(v2469,"Some")){
const v2471=v2469["Some"];
const v2472=v2459;
v2470=__fn18(v2472);}else{
const v2473=null;
const v2474=v2459;
v2470=__fn18(v2474);}
v2461=v2470;if(v2464){v2462=v2461;v2463=true;}}
let v2475;if(v2461){
const v2477=v2459;
const v2478=v2477["budget"];
const v2479=1;
const v2480=(((v2478) + (v2479)) >>> 0);
const v2481=0;
const v2482=0;
const v2483=({["segment"]:v2481,["grapheme"]:v2482});
const v2484=new __InkBuffer([]);
const v2485=false;
let v2486=({["cursor"]:v2483,["lines"]:v2484,["done"]:v2485});
for(let v2487=0;v2487<v2480;v2487++){
const v2488=v2486;
if(v2488["done"]){break;}
const v2489=(v2487>>>0);
const v2490=v2459;
const v2491=v2460;
const v2492=__fn19(v2491);
const v2493=v2486;
v2486=__fn29(v2490,v2492,v2493);}
const v2476=v2486;
const v2494=v2476;
const v2495=v2494["lines"];
v2475=({Ok:v2495.freeze()});}else{
const v2496=({Some:null});
const v2497=v2496;
let v2498;if(Object.hasOwn(v2497,"Some")){
const v2499=v2497["Some"];
v2498="invalid prepared text";}else{
const v2500=null;
v2498="invalid prepared text";}
v2475=({Err:v2498});}
return v2475;};}
function __prepareFn32(fixed,depth=0){if(depth>=16)return __fn32;const v2554=fixed[1]&&fixed[3];let v2553=false,v2552;
const v2570=fixed[0]&&fixed[1]&&fixed[3];let v2569=false,v2568;
const v2580=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2579=false,v2578;
let v2588;
return function(v2547,v2548,v2549,v2550){let v2551;if(v2554&&v2553){v2551=v2552;}else{
const v2555=v2550;
const v2556=v2555["count"];
const v2557=v2556["width"];
const v2558=v2548;
let v2559;if(Object.hasOwn(v2558,"Some")){
const v2560=v2558["Some"];
const v2561=v2560;
const v2562=v2550;
const v2563=v2562["index"];
let v2564;if(v2563<v2561.length){v2564=v2561[v2563];}else{
v2564=__dfFromBits(0n);}
v2559=v2564;}else{
const v2565=null;
v2559=__dfFromBits(0n);}
const v2566=v2559;
v2551=(__dfNumber(v2557) + __dfNumber(v2566));if(v2554){v2552=v2551;v2553=true;}}
let v2567;if(v2570&&v2569){v2567=v2568;}else{
const v2571=v2551;
const v2572=v2547;
const v2573=v2550;
const v2574=v2573["index"];
let v2575;if(v2574<v2572.length){v2575=v2572[v2574];}else{
v2575=__dfFromBits(0n);}
const v2576=v2575;
v2567=(__dfNumber(v2571) + __dfNumber(v2576));if(v2570){v2568=v2567;v2569=true;}}
let v2577;if(v2580&&v2579){v2577=v2578;}else{
const v2581=v2547;
const v2582=v2550;
const v2583=v2582["index"];
const v2584=1;
const v2585=(((v2583) + (v2584)) >>> 0);
const v2586=v2567;
const v2587=v2549;
if(!v2588){const v2589=__preparedFactories.get(31);v2588=v2589?v2589([fixed[0],fixed[3],fixed[0]&&fixed[1]&&fixed[3],fixed[2]],depth+1):__fn31;}
v2577=v2588(v2581,v2585,v2586,v2587);if(v2580){v2578=v2577;v2579=true;}}
const v2590=v2577;
const v2591=v2590["index"];
const v2592=(v2547).length;
const v2593=((v2591) < (v2592));
let v2594;if(v2593){
const v2595=v2550;
const v2596=v2595["count"];
const v2597=v2596["lines"];
const v2598=1;
const v2599=(((v2597) + (v2598)) >>> 0);
const v2600=__dfFromBits(0n);
const v2601=false;
const v2602=({["lines"]:v2599,["width"]:v2600,["content"]:v2601});
const v2603=v2577;
const v2604=v2603["index"];
v2594=({["count"]:v2602,["index"]:v2604});}else{
const v2605=v2550;
const v2606=v2605["count"];
const v2607=v2606["lines"];
const v2608=v2577;
const v2609=v2608["width"];
const v2610=true;
const v2611=({["lines"]:v2607,["width"]:v2609,["content"]:v2610});
const v2612=v2577;
const v2613=v2612["index"];
v2594=({["count"]:v2611,["index"]:v2613});}
return v2594;};}
function __prepareFn33(fixed,depth=0){if(depth>=16)return __fn33;const v2621=fixed[0]&&fixed[2];let v2620=false,v2619;
let v2624;
const v2629=fixed[0]&&fixed[2];let v2628=false,v2627;
const v2637=fixed[0]&&fixed[2];let v2636=false,v2635;
let v2641;
const v2658=fixed[0]&&fixed[2]&&fixed[3];let v2657=false,v2656;
const v2670=fixed[3];let v2669=false,v2668;
const v2675=fixed[3];let v2674=false,v2673;
const v2709=fixed[0]&&fixed[2];let v2708=false,v2707;
const v2723=fixed[0]&&fixed[2];let v2722=false,v2721;
const v2743=fixed[0]&&fixed[2]&&fixed[3];let v2742=false,v2741;
const v2750=true;let v2749=false,v2748;
const v2758=fixed[0]&&fixed[2];let v2757=false,v2756;
const v2766=fixed[0]&&fixed[1]&&fixed[2]&&fixed[3];let v2765=false,v2764;
return function(v2614,v2615,v2616,v2617){let v2618;if(v2621&&v2620){v2618=v2619;}else{
const v2622=v2614;
const v2623=v2616;
if(!v2624){const v2625=__preparedFactories.get(10);v2624=v2625?v2625([fixed[0],fixed[2]],depth+1):__fn10;}
v2618=v2624(v2622,v2623);if(v2621){v2619=v2618;v2620=true;}}
let v2626;if(v2629&&v2628){v2626=v2627;}else{
const v2630=v2614;
const v2631=v2630["widths"];
const v2632=v2616;
let v2633;if(v2632<v2631.length){v2633=v2631[v2632];}else{
v2633=__dfFromBits(0n);}
v2626=v2633;if(v2629){v2627=v2626;v2628=true;}}
let v2634;if(v2637&&v2636){v2634=v2635;}else{
const v2638=v2614;
const v2639=v2638["endTrims"];
const v2640=v2616;
if(!v2641){const v2642=__preparedFactories.get(8);v2641=v2642?v2642([fixed[0],fixed[2]],depth+1):__fn8;}
v2634=v2641(v2639,v2640);if(v2637){v2635=v2634;v2636=true;}}
const v2643=v2617;
const v2644=v2643["content"];
let v2645=v2644;if(v2645){
const v2646=v2617;
const v2647=v2646["width"];
const v2648=v2626;
const v2649=(__dfNumber(v2647) + __dfNumber(v2648));
const v2650=v2634;
const v2651=(__dfNumber(v2649) - __dfNumber(v2650));
const v2652=v2615;
v2645=((__dfNumber(v2651)) <= (__dfNumber(v2652)));}
const v2653=v2645;
let v2654;if(v2653){
let v2655;if(v2658&&v2657){v2655=v2656;}else{
const v2659=v2617;
const v2660=v2659["width"];
const v2661=v2626;
v2655=(__dfNumber(v2660) + __dfNumber(v2661));if(v2658){v2656=v2655;v2657=true;}}
const v2662=v2617;
const v2663=v2662["lines"];
const v2664=v2655;
const v2665=v2617;
const v2666=v2665["content"];
v2654=({["lines"]:v2663,["width"]:v2664,["content"]:v2666});}else{
let v2667;if(v2670&&v2669){v2667=v2668;}else{
const v2671=v2617;
v2667=v2671["content"];if(v2670){v2668=v2667;v2669=true;}}
let v2672;if(v2675&&v2674){v2672=v2673;}else{
const v2676=v2667;
let v2677;if(v2676){
const v2678=v2617;
const v2679=v2678["lines"];
const v2680=1;
const v2681=(((v2679) + (v2680)) >>> 0);
const v2682=__dfFromBits(0n);
const v2683=false;
v2677=({["lines"]:v2681,["width"]:v2682,["content"]:v2683});}else{
v2677=v2617;}
v2672=v2677;if(v2675){v2673=v2672;v2674=true;}}
const v2684=v2667;
let v2685=v2684;if(v2685){
const v2686=v2618;
const v2687=0;
v2685=!(v2686===v2687);}
const v2688=v2685;
let v2689=v2688;if(!v2689){
const v2690=v2667;
const v2691=false;
const v2692=(v2690===v2691);
let v2693=v2692;if(v2693){
const v2694=v2618;
const v2695=1;
const v2696=(v2694===v2695);
let v2697=v2696;if(!v2697){
const v2698=v2618;
const v2699=2;
const v2700=(v2698===v2699);
let v2701=v2700;if(v2701){
const v2702=v2616;
const v2703=0;
v2701=((v2702) > (v2703));}
v2697=v2701;}
v2693=v2697;}
v2689=v2693;}
const v2704=v2689;
let v2705;if(v2704){
v2705=v2672;}else{
let v2706;if(v2709&&v2708){v2706=v2707;}else{
const v2710=v2614;
const v2711=v2710["startExtras"];
let v2712;if(Object.hasOwn(v2711,"Some")){
const v2713=v2711["Some"];
const v2714=v2626;
const v2715=v2713;
const v2716=v2616;
let v2717;if(v2716<v2715.length){v2717=v2715[v2716];}else{
v2717=__dfFromBits(0n);}
const v2718=v2717;
v2712=(__dfNumber(v2714) + __dfNumber(v2718));}else{
const v2719=null;
v2712=v2626;}
v2706=v2712;if(v2709){v2707=v2706;v2708=true;}}
let v2720;if(v2723&&v2722){v2720=v2721;}else{
const v2724=v2614;
const v2725=v2724["advances"];
const v2726=v2616;
let v2727;if(v2726<v2725.length){v2727=v2725[v2726];}else{
v2727=({None:null});}
v2720=v2727;if(v2723){v2721=v2720;v2722=true;}}
const v2728=v2706;
const v2729=v2634;
const v2730=(__dfNumber(v2728) - __dfNumber(v2729));
const v2731=v2615;
const v2732=((__dfNumber(v2730)) <= (__dfNumber(v2731)));
let v2733=v2732;if(!v2733){
const v2734=v2720;
let v2735;if(Object.hasOwn(v2734,"Some")){
const v2736=v2734["Some"];
v2735=false;}else{
const v2737=null;
v2735=true;}
v2733=v2735;}
const v2738=v2733;
let v2739;if(v2738){
let v2740;if(v2743&&v2742){v2740=v2741;}else{
const v2744=v2672;
const v2745=v2744["width"];
const v2746=v2706;
v2740=(__dfNumber(v2745) + __dfNumber(v2746));if(v2743){v2741=v2740;v2742=true;}}
let v2747;if(v2750&&v2749){v2747=v2748;}else{
v2747=true;if(v2750){v2748=v2747;v2749=true;}}
const v2751=v2672;
const v2752=v2751["lines"];
const v2753=v2740;
const v2754=v2747;
v2739=({["lines"]:v2752,["width"]:v2753,["content"]:v2754});}else{
let v2755;if(v2758&&v2757){v2755=v2756;}else{
const v2759=v2720;
let v2760;if(Object.hasOwn(v2759,"Some")){
const v2761=v2759["Some"];
v2760=v2761;}else{
const v2762=null;
v2760=[];}
v2755=v2760;if(v2758){v2756=v2755;v2757=true;}}
let v2763;if(v2766&&v2765){v2763=v2764;}else{
const v2767=(v2755).length;
const v2768=v2672;
const v2769=0;
let v2770=({["count"]:v2768,["index"]:v2769});
for(let v2771=0;v2771<v2767;v2771++){
const v2772=v2770;
const v2773=v2772["index"];
const v2774=(v2755).length;
if(((v2773) >= (v2774))){break;}
const v2775=(v2771>>>0);
const v2776=v2755;
const v2777=v2614;
const v2778=v2616;
const v2779=__fn9(v2777,v2778);
const v2780=v2615;
const v2781=v2770;
v2770=__fn32(v2776,v2779,v2780,v2781);}
v2763=v2770;if(v2766){v2764=v2763;v2765=true;}}
const v2782=v2763;
v2739=v2782["count"];}
v2705=v2739;}
v2654=v2705;}
return v2654;};}
function __prepareFn34(fixed,depth=0){if(depth>=16)return __fn34;const v2788=fixed[0];let v2787=false,v2786;
const v2792=true;let v2791=false,v2790;
const v2803=fixed[1];let v2802=false,v2801;
let v2805;
const v2821=fixed[0]&&fixed[1];let v2820=false,v2819;
return function(v2783,v2784){let v2785;if(v2788&&v2787){v2785=v2786;}else{
let v2789;if(v2792&&v2791){v2789=v2790;}else{
v2789=({Some:null});if(v2792){v2790=v2789;v2791=true;}}
const v2793=v2789;
let v2794;if(Object.hasOwn(v2793,"Some")){
const v2795=v2793["Some"];
const v2796=v2783;
v2794=__fn18(v2796);}else{
const v2797=null;
const v2798=v2783;
v2794=__fn18(v2798);}
v2785=v2794;if(v2788){v2786=v2785;v2787=true;}}
let v2799;if(v2785){
let v2800;if(v2803&&v2802){v2800=v2801;}else{
const v2804=v2784;
if(!v2805){const v2806=__preparedFactories.get(19);v2805=v2806?v2806([fixed[1]],depth+1):__fn19;}
v2800=v2805(v2804);if(v2803){v2801=v2800;v2802=true;}}
const v2807=v2783;
const v2808=v2807["data"];
const v2809=v2808["overflowTrims"];
let v2810;if(Object.hasOwn(v2809,"Some")){
const v2811=v2809["Some"];
v2810=true;}else{
const v2812=null;
v2810=false;}
const v2813=v2810;
let v2814;if(v2813){
const v2815=v2783;
const v2816=v2800;
const v2817=__fn27(v2815,v2816);
v2814=({Ok:v2817["lineCount"]});}else{
let v2818;if(v2821&&v2820){v2818=v2819;}else{
const v2822=v2783;
const v2823=v2822["data"];
const v2824=(v2823["widths"]).length;
const v2825=0;
const v2826=__dfFromBits(0n);
const v2827=false;
let v2828=({["lines"]:v2825,["width"]:v2826,["content"]:v2827});
for(let v2829=0;v2829<v2824;v2829++){
if(false){break;}
const v2830=(v2829>>>0);
const v2831=v2783;
const v2832=v2831["data"];
const v2833=v2783;
const v2834=v2800;
const v2835=__fn20(v2833,v2834);
const v2836=v2830;
const v2837=v2828;
v2828=__fn33(v2832,v2835,v2836,v2837);}
v2818=v2828;if(v2821){v2819=v2818;v2820=true;}}
const v2838=v2818;
const v2839=v2838["lines"];
const v2840=v2818;
let v2841;if(v2840["content"]){
v2841=1;}else{
v2841=0;}
const v2842=v2841;
v2814=({Ok:(((v2839) + (v2842)) >>> 0)});}
v2799=v2814;}else{
const v2843=({Some:null});
const v2844=v2843;
let v2845;if(Object.hasOwn(v2844,"Some")){
const v2846=v2844["Some"];
v2845="invalid prepared text";}else{
const v2847=null;
v2845="invalid prepared text";}
v2799=({Err:v2845});}
return v2799;};}
function __prepareFn35(fixed,depth=0){if(depth>=16)return __fn35;let v2853;
return function(v2848,v2849,v2850){const v2851=v2848;
const v2852=v2849;
if(!v2853){const v2854=__preparedFactories.get(34);v2853=v2854?v2854([fixed[0],fixed[1]],depth+1):__fn34;}
const v2855=v2853(v2851,v2852);
const v2857=v2855;
let v2858;if(Object.hasOwn(v2857,"Ok")){
const v2859=v2857["Ok"];
const v2860=v2859;
const v2861=v2859;
const v2862=v2850;
const v2863=(__dfNumber(v2861) * __dfNumber(v2862));
v2858=({Ok:({["lineCount"]:v2860,["height"]:v2863})});}else{v2858=({Err:v2857.Err});}
return v2858;};}
const __preparedFactories=new Map([[0,__prepareFn0],[1,__prepareFn1],[2,__prepareFn2],[3,__prepareFn3],[4,__prepareFn4],[5,__prepareFn5],[6,__prepareFn6],[15,__prepareFn15],[16,__prepareFn16],[17,__prepareFn17],[18,__prepareFn18],[21,__prepareFn21],[23,__prepareFn23],[24,__prepareFn24],[25,__prepareFn25],[26,__prepareFn26],[27,__prepareFn27],[28,__prepareFn28],[30,__prepareFn30],[32,__prepareFn32],[33,__prepareFn33],[34,__prepareFn34],[35,__prepareFn35]]);
