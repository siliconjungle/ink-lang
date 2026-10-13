const __nativeF32=true;
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
// Fixed primitives; no cross-invocation host caches.
function __ink_round_even(x){if(!Number.isFinite(x)||Math.abs(x)>=8388608)return x;const a=Math.abs(x),i=Math.floor(a),r=a-i;const y=i+Number(r>0.5||(r===0.5&&i%2===1));return x<0||Object.is(x,-0)?-y:y;}
// Direct BigInt -> binary32 avoids double rounding through binary64.
function __ink_big_float(x){if(x===0n)return 0;const neg=x<0n;if(neg)x=-x;let e=x.toString(2).length-1;if(e<=23)return Number(neg?-x:x);const shift=BigInt(e-23),mask=(1n<<shift)-1n;let q=x>>shift;const rem=x&mask,half=1n<<(shift-1n);if(rem>half||(rem===half&&(q&1n)!==0n))q++;if(q===16777216n){q>>=1n;e++;}if(e>127)return neg?-Infinity:Infinity;return (neg?-1:1)*Number(q)*2**(e-23);}
function __ink_from_float(x,t){x=Math.trunc(x);if(!Number.isFinite(x))return {None:null};const valid=t==='i32'?x>=-2147483648&&x<2147483648:x>=0&&x<(t==='u32'?4294967296:18446744073709551616);return valid?{Some:t==='u64'?BigInt(x):x===0?0:x}:{None:null};}
function __ink_count(x,n,width){if(width===64){x=BigInt.asUintN(64,x);if(n==='popcount'){let count=0;while(x){x&=x-1n;count++;}return count;}if(x===0n)return 64;if(n==='leading_zeros')return 64-x.toString(2).length;let count=0;while((x&1n)===0n){x>>=1n;count++;}return count;}x>>>=0;if(n==='leading_zeros')return Math.clz32(x);if(n==='trailing_zeros')return x===0?32:31-Math.clz32((x&-x)>>>0);x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return Math.imul((x+(x>>>4))&0x0f0f0f0f,0x01010101)>>>24;}
const __ink_encoder=new TextEncoder(),__ink_decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const __ink_bytes=s=>__ink_encoder.encode(s);
const __ink_boundary=(b,i)=>i<=b.length&&(i===b.length||(b[i]&0xc0)!==0x80);
function __ink_byte_at(s,i){const b=__ink_bytes(s);return i<b.length?{Some:b[i]}:{None:null};}
function __ink_slice(s,a,z){const b=__ink_bytes(s);return a<=z&&__ink_boundary(b,a)&&__ink_boundary(b,z)?{Some:__ink_decoder.decode(b.subarray(a,z))}:{None:null};}
function __ink_concat(a,b){const s=a+b;if(__ink_bytes(s).length>4294967295)throw Error('String exceeds U32 byte length');return s;}
function __ink_find(s,needle,from){const b=__ink_bytes(s);if(!__ink_boundary(b,from))return {None:null};const tail=__ink_decoder.decode(b.subarray(from)),i=tail.indexOf(needle);return i<0?{None:null}:{Some:from+__ink_bytes(tail.slice(0,i)).length};}

function __ink_int_from_float(x){return Number.isFinite(x)?{Some:BigInt(Math.trunc(x))}:{None:null};}
function __fn0(v0,v1){
const v2=v0;
const v3=v2.length;
const v4=new Array(v3);
for(let v5=0;v5<v3;v5++){
const v6=v2[v5];
let v7;if(v1){
v7=__nfValue(v6);}else{
const v8=__nfValue(v6);
const v9=__nfValue(v6);
v7=Math.fround(__nfNumber(v8) * __nfNumber(v9));}
v4[v5]=Math.fround(Math.sqrt(__nfNumber(v7)));
}
return v4;}
function __into0(v10,v11,v12){
const v13=v10;
const v14=v13.length;
for(let v16=0;v16<v14;v16++){
const v17=v13[v16];
let v18;if(v11){
v18=__nfValue(v17);}else{
const v19=__nfValue(v17);
const v20=__nfValue(v17);
v18=Math.fround(__nfNumber(v19) * __nfNumber(v20));}
v12[v16]=__intoOutput0(Math.fround(Math.sqrt(__nfNumber(v18))));
}
return v14;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v11","core_sha256":"32c113e96beba7b0ce64d6aea51fd64719c9646b7cf676a3d69360e1d34907c6","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"native-number-with-exact-nonfinite-tags","functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"mode","type":{"kind":"bool"}}],"precondition":null,"result":{"element":{"kind":"f32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"run":{"arguments":{"format":"ink-value-wire-v1","identity":"52314365306040faa763d8fc04c420cb1e3a289965d26b9372eaad13e740e864","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"f32"},"kind":"list"}},{"name":"mode","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"0cbb9d1ff6b72318080ea11a6297b384d97178624f821e3901cca51ec8ad4477","named":{},"root":{"element":{"kind":"f32"},"kind":"list"}}}}}};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
const __inputTypes=[{"capture":[true,true],"types":[{"element":{"kind":"f32"},"kind":"list"},{"kind":"bool"}]}];

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
const wireMagic=Uint8Array.of(73,78,75,86,65,76,0,1);
const wireEncoder=new TextEncoder(),wireDecoder=new TextDecoder('utf-8',{fatal:true});
const wireDefaults={bytes:16777216,nodes:1000000,depth:128};
const wireDecimal=s=>typeof s==='string'&&/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/.test(s);
function wireLimits(options){const l={...wireDefaults,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>wireDefaults[k])throw Error('wire hard resource limit');return l;}
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
export class ValueCodec{
 #hash;
 #descriptor;
 get descriptor(){return this.#descriptor;}
 constructor(descriptor){
  // This synchronous path is for compiler-generated immutable metadata. For
  // untrusted descriptors use createValueCodec and compare the computed identity.
  if(descriptor?.format!==valueWireFormat||!/^[0-9a-f]{64}$/.test(descriptor.identity))throw Error('invalid wire schema');
  this.#descriptor=structuredClone(descriptor);this.#hash=Uint8Array.from(descriptor.identity.match(/../g),s=>parseInt(s,16));
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}};freeze(this.descriptor);
 }
 resolve(t){for(let i=0;i<64;i++){if(t.kind!=='ref')return t;t=this.descriptor.named[t.name];if(!t)throw Error('wire reference');}throw Error('wire reference cycle');}
 encode(value,options={}){
  const l=wireLimits(options);let remaining=l.nodes,total=40;
  const node=(t,v,d)=>{
   if(d>l.depth||--remaining<0)throw Error('wire node or depth limit');t=this.resolve(t);let body;
   const bad=()=>{throw Error('invalid value for wire schema');};
   const integer=(min,max)=>{if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)bad();};
   const words=(size,write)=>{const b=new Uint8Array(size);write(new DataView(b.buffer));return b;};
   switch(t.kind){
    case 'unit':if(v!==null)bad();body=new Uint8Array();break;
    case 'bool':if(typeof v!=='boolean')bad();body=Uint8Array.of(+v);break;
    case 'u32':integer(0,4294967295);body=words(4,b=>b.setUint32(0,v,true));break;
    case 'i32':integer(-2147483648,2147483647);body=words(4,b=>b.setInt32(0,v,true));break;
    case 'u64':{if(typeof v==='number'&&!Number.isSafeInteger(v)||!['bigint','number','string'].includes(typeof v)||typeof v==='string'&&(!wireDecimal(v)||v.startsWith('-')))bad();const n=BigInt(v);if(n<0n||n>18446744073709551615n)bad();body=words(8,b=>b.setBigUint64(0,n,true));break;}
    case 'f32':{let bits;if(typeof v==='number'&&Number.isFinite(v)){const b=words(4,b=>b.setFloat32(0,v,true));if(!Number.isFinite(new DataView(b.buffer).getFloat32(0,true)))bad();body=b;break;}if(!wireTagged(v,'F32Bits'))bad();bits=v.F32Bits;if(!Number.isInteger(bits)||bits<0||bits>4294967295)bad();body=words(4,b=>b.setUint32(0,bits,true));break;}
    case 'string':case 'int':case 'id':case 'enum':{const text=t.kind==='int'?(typeof v==='bigint'?v.toString():wireTagged(v,'Int')?v.Int:null):v;if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes)bad();if(t.kind==='int'&&!wireDecimal(text)||t.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||t.kind==='enum'&&!t.variants.includes(text))bad();body=wireEncoder.encode(text);break;}
    case 'list':case 'vector':{if(!Array.isArray(v)&&!(ArrayBuffer.isView(v)&&!(v instanceof DataView)))bad();if(v.length>remaining||t.kind==='vector'&&v.length!==t.size)bad();const children=Array.from(v,x=>node(t.element,x,d+1));body=join([words(4,b=>b.setUint32(0,v.length,true)),...children]);break;}
    case 'record':{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==t.fields.length||t.fields.some(f=>!Object.hasOwn(v,f.name)))bad();body=join(t.fields.map(f=>node(f.type,v[f.name],d+1)));break;}
    case 'option':if(wireTagged(v,'Some'))body=join([Uint8Array.of(1),node(t.element,v.Some,d+1)]);else{if(!wireTagged(v,'None')||v.None!==null)bad();body=Uint8Array.of(0);}break;
    case 'result':if(wireTagged(v,'Ok'))body=join([Uint8Array.of(0),node(t.ok,v.Ok,d+1)]);else{if(!wireTagged(v,'Err'))bad();body=join([Uint8Array.of(1),node(t.error,v.Err,d+1)]);}break;
    default:bad();
   }
   // Children have already been counted; only local frame/scalar bytes are new.
   const container=['list','vector','record','option','result'].includes(t.kind);
   total+=4+(container?(t.kind==='record'?0:['list','vector'].includes(t.kind)?4:1):body.length);
   if(total>l.bytes)throw Error('wire byte limit');return join([words(4,b=>b.setUint32(0,body.length,true)),body]);
  };
  const payload=node(this.descriptor.root,value,0);const bytes=join([wireMagic,this.#hash,payload]);if(bytes.length>l.bytes)throw Error('wire byte limit');return bytes;
 }
 encodeWith(emit,options={}){
  const w=new WireEncoder(options);w.bytes(wireMagic);w.bytes(this.#hash);emit(w);const bytes=w.finish();this.validate(bytes,options);return bytes;
 }
 scan(bytes,options={},materialize=false,visitor=null){
  const l=wireLimits(options);if(!(bytes instanceof Uint8Array)||typeof SharedArrayBuffer==='function'&&bytes.buffer instanceof SharedArrayBuffer||bytes.length<44||bytes.length>l.bytes)throw Error('wire byte limit or header');
  if(wireMagic.some((b,i)=>bytes[i]!==b)||this.#hash.some((b,i)=>bytes[i+8]!==b))throw Error('wire format or schema mismatch');
  let remaining=l.nodes;const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const node=(t,at,parentEnd,d)=>{
   if(d>l.depth||--remaining<0||at+4>parentEnd)throw Error('wire node, depth or length limit');t=this.resolve(t);const start=at+4,end=start+view.getUint32(at,true);if(end>parentEnd)throw Error('truncated wire frame');let p=start,value;
   const size=n=>{if(end-start!==n)throw Error('malformed wire scalar');};
   const child=type=>{const r=node(type,p,end,d+1);p=r.end;return r.value;};
   switch(t.kind){
    case 'unit':size(0);value=null;break;
    case 'bool':size(1);if(bytes[start]>1)throw Error('invalid wire Bool');value=!!bytes[start];break;
    case 'u32':size(4);value=view.getUint32(start,true);break;
    case 'i32':size(4);value=view.getInt32(start,true);break;
    case 'f32':size(4);if(materialize)value={F32Bits:view.getUint32(start,true)};break;
    case 'u64':size(8);if(materialize)value=view.getBigUint64(start,true);break;
    case 'string':case 'int':case 'id':case 'enum':{const text=wireDecoder.decode(bytes.subarray(start,end));if(t.kind==='int'&&!wireDecimal(text)||t.kind==='id'&&!/^[0-9a-f]{32}$/.test(text)||t.kind==='enum'&&!t.variants.includes(text))throw Error('malformed wire text');if(materialize)value=t.kind==='int'?{Int:text}:text;break;}
    case 'list':case 'vector':{if(start+4>end)throw Error('wire list count');const n=view.getUint32(start,true);p+=4;if(n>remaining||n>Math.floor((end-p)/4)||t.kind==='vector'&&n!==t.size)throw Error('wire sequence size');if(materialize)value=[];for(let i=0;i<n;i++){const v=child(t.element);if(materialize)value.push(v);}if(p!==end)throw Error('trailing sequence bytes');break;}
    case 'record':{if(materialize)value={};for(const f of t.fields){const v=child(f.type);if(materialize)Object.defineProperty(value,f.name,{value:v,enumerable:true,writable:true,configurable:true});}if(p!==end)throw Error('trailing record bytes');break;}
    case 'option':case 'result':{if(start===end||bytes[p]>1)throw Error('wire sum tag');const b=bytes[p++];if(t.kind==='option'&&b===0){if(p!==end)throw Error('wire None bytes');if(materialize)value={None:null};}else{const tag=t.kind==='option'?'Some':b===0?'Ok':'Err';const v=child(t.kind==='option'?t.element:b===0?t.ok:t.error);if(p!==end)throw Error('trailing sum bytes');if(materialize)value={[tag]:v};}break;}
    default:throw Error('unsupported wire kind');
   }if(visitor)visitor(t,bytes.subarray(start,end),d);return {end,value};
  };
  const r=node(this.descriptor.root,40,bytes.length,0);if(r.end!==bytes.length)throw Error('trailing wire bytes');return r.value;
 }
 visit(bytes,visitor,options={}){if(typeof visitor!=='function')throw Error('wire visitor required');this.scan(bytes,options,false,visitor);}
 validate(bytes,options={}){this.scan(bytes,options,false);return true;}
 decode(bytes,options={}){return this.scan(bytes,options,true);}
}
function join(parts){const size=parts.reduce((n,p)=>n+p.length,0);if(size>16777216)throw Error('wire allocation limit');const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}

// Bounded forward emission avoids building and repeatedly joining child buffers.
class WireEncoder{
 #data=new Uint8Array(256);#at=0;#remaining;#depth=0;#limits;
 constructor(options){this.#limits=wireLimits(options);this.#remaining=this.#limits.nodes;}
 get position(){return this.#at;}
 bytes(bytes){
  const end=this.#at+bytes.length;if(end>this.#limits.bytes)throw Error('wire byte limit');
  if(end>this.#data.length){const next=new Uint8Array(Math.min(this.#limits.bytes,Math.max(end,this.#data.length*2)));next.set(this.#data.subarray(0,this.#at));this.#data=next;}
  this.#data.set(bytes,this.#at);this.#at=end;
 }
 word(n){if(!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire word range');const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,true);this.bytes(b);}
 patchWord(at,n){if(!Number.isInteger(at)||at<0||at+4>this.#at||!Number.isInteger(n)||n<0||n>4294967295)throw Error('wire patch offset');new DataView(this.#data.buffer).setUint32(at,n,true);}
 frame(emit){if(this.#depth>this.#limits.depth||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.position;this.word(0);this.#depth++;try{emit(this);}finally{this.#depth--;}this.patchWord(at,this.position-at-4);}
 reorder(start,spans){
  const sorted=spans.slice().sort((a,b)=>a[0]-b[0]);let at=start;
  for(const [a,b] of sorted){if(!Number.isInteger(a)||!Number.isInteger(b)||a!==at||b<a)throw Error('wire span permutation');at=b;}
  if(start<0||start>this.#at||at!==this.#at)throw Error('wire span permutation');
  if(spans.every((s,i)=>s===sorted[i]))return;
  const copy=this.#data.slice(start,this.#at);at=start;for(const [a,b] of spans){this.#data.set(copy.subarray(a-start,b-start),at);at+=b-a;}
 }
 finish(){return this.#data.slice(0,this.#at);}
}
// JSON text is a boundary adapter to an ordinary recursive Ink datatype.
// No JavaScript Number conversion occurs for JSON numeric tokens.
export function jsonNumberToken(s){return typeof s==='string'&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(s);}
const jsonWireEncoder=new TextEncoder();
const jsonLimits={bytes:16777216,nodes:1000000,depth:128};
function checkedJsonLimits(options){const l={...jsonLimits,...options};for(const k of ['bytes','nodes','depth'])if(!Number.isSafeInteger(l[k])||l[k]<0||l[k]>jsonLimits[k])throw Error('JSON hard resource limit');return l;}
function jsonVariant(index,item){let payload=index===0?{}:{item0:item};if(index<5)payload={Ok:payload};for(let i=0;i<index;i++)payload={Err:payload};return {payload};}
export function parseJson(text,options={}){
 const l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>l.bytes||new TextEncoder().encode(text).length>l.bytes)throw Error('JSON byte or Unicode limit');let at=0,remaining=l.nodes;
 const ws=()=>{while(at<text.length&&' \t\r\n'.includes(text[at]))at++;};
 const eat=c=>{ws();if(text[at]===c){at++;return true;}return false;};
 const string=()=>{ws();const start=at;if(!eat('"'))throw Error('expected JSON string');while(at<text.length){if(text[at]==='"'){at++;const v=JSON.parse(text.slice(start,at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(text[at]==='\\')at+=2;else at++;}throw Error('unterminated JSON string');};
 const value=d=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');ws();const c=text[at];
  for(const [word,index,item] of [['null',0,null],['true',1,true],['false',1,false]])if(text.startsWith(word,at)){at+=word.length;return jsonVariant(index,item);}
  if(c==='"')return jsonVariant(3,string());
  if(c==='['){at++;const xs=[];if(!eat(']'))while(true){xs.push(value(d+1));if(eat(']'))break;if(!eat(','))throw Error('JSON array separator');}return jsonVariant(4,xs);}
  if(c==='{'){at++;const xs=[],seen=new Set();if(!eat('}'))while(true){const key=string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!eat(':'))throw Error('JSON object colon');xs.push({key,value:value(d+1)});if(eat('}'))break;if(!eat(','))throw Error('JSON object separator');}return jsonVariant(5,xs);}
  if(c==='-'||c>='0'&&c<='9'){const start=at;while(at<text.length&&'-+0123456789.eE'.includes(text[at]))at++;const token=text.slice(start,at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return jsonVariant(2,token);}
  throw Error('invalid JSON value');
 };
 const out=value(0);ws();if(at!==text.length)throw Error('trailing JSON text');return out;
}
export function stringifyJson(value,options={}){
 const l=checkedJsonLimits(options);let remaining=l.nodes,bytes=0;const parts=[];const encoder=new TextEncoder();
 const emit=s=>{bytes+=encoder.encode(s).length;if(bytes>l.bytes)throw Error('JSON byte limit');parts.push(s);};
 const write=(v,d)=>{
  if(d>l.depth||--remaining<0)throw Error('JSON node or depth limit');if(!v||Object.keys(v).length!==1||!Object.hasOwn(v,'payload'))throw Error('invalid JSON record');let p=v.payload,index=0;
  while(index<5&&p&&Object.hasOwn(p,'Err')){if(Object.keys(p).length!==1)throw Error('invalid JSON sum');p=p.Err;index++;}
  if(index<5){if(!p||Object.keys(p).length!==1||!Object.hasOwn(p,'Ok'))throw Error('invalid JSON sum');p=p.Ok;}
  if(!p||Object.keys(p).length!==(index===0?0:1)||index>0&&!Object.hasOwn(p,'item0'))throw Error('invalid JSON payload');const item=p.item0;
  switch(index){
   case 0:emit('null');break;
   case 1:if(typeof item!=='boolean')throw Error('invalid JSON Boolean');emit(item?'true':'false');break;
   case 2:if(!jsonNumberToken(item))throw Error('invalid JSON number');emit(item);break;
   case 3:if(typeof item!=='string'||!item.isWellFormed())throw Error('invalid JSON String');emit(JSON.stringify(item));break;
   case 4:if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Array');emit('[');item.forEach((x,i)=>{if(i)emit(',');write(x,d+1);});emit(']');break;
   case 5:{if(!Array.isArray(item)||item.length>remaining)throw Error('invalid JSON Object');const seen=new Set();emit('{');item.forEach((m,i)=>{if(!m||Object.keys(m).length!==2||typeof m.key!=='string'||!m.key.isWellFormed()||!Object.hasOwn(m,'value'))throw Error('invalid JSON member');if(seen.has(m.key))throw Error('duplicate JSON object key');seen.add(m.key);if(i)emit(',');emit(JSON.stringify(m.key));emit(':');write(m.value,d+1);});emit('}');break;}
  }
 };write(value,0);return parts.join('');
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
  }this.values=valueCodec;
 }
 parse(text,options={}){const v=parseJson(text,options);this.values.encode(v,options);return v;}
 stringify(value,options={}){this.values.encode(value,options);return stringifyJson(value,options);}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,false);}
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,true);}
 validateBinary(bytes,options={}){
  const decoder=new TextDecoder('utf-8',{fatal:true});
  this.values.visit(bytes,(type,body)=>{
   if(type.kind!=='record')return;
   const view=new DataView(body.buffer,body.byteOffset,body.byteLength);
   if(type.name===this.numberBranch){const length=view.getUint32(0,true);if(!jsonNumberToken(decoder.decode(body.subarray(4,4+length))))throw Error('invalid JSON number token');}
   if(type.name===this.objectBranch){const listEnd=4+view.getUint32(0,true),count=view.getUint32(4,true),seen=new Set();let at=8;for(let i=0;i<count;i++){const memberEnd=at+4+view.getUint32(at,true),keyStart=at+8,keyEnd=keyStart+view.getUint32(at+4,true),key=decoder.decode(body.subarray(keyStart,keyEnd));if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);at=memberEnd;}if(at!==listEnd)throw Error('invalid JSON object frame');}
  },options);return true;
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
  const out=read(this.values.descriptor.root,document,0);this.values.encode(out,options);return out;
 }
 encode(value,options={}){
  this.values.encode(value,options);const l=checkedJsonLimits(options);let remaining=l.nodes;
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
 stringifyBinary(bytes,options={}){return streamWireJsonText(this.values,bytes,options,false);}
}

// Token reader shared by schema-directed and arbitrary-JSON wire emission.
class JsonWireReader{
 constructor(text,options){this.l=checkedJsonLimits(options);if(typeof text!=='string'||!text.isWellFormed()||text.length>this.l.bytes||jsonWireEncoder.encode(text).length>this.l.bytes)throw Error('JSON byte or Unicode limit');this.text=text;this.at=0;this.remaining=this.l.nodes;}
 ws(){while(this.at<this.text.length&&' \t\r\n'.includes(this.text[this.at]))this.at++;}
 peek(){this.ws();return this.text[this.at];}
 eat(c){this.ws();if(this.text[this.at]===c){this.at++;return true;}return false;}
 node(d){if(d>this.l.depth||--this.remaining<0)throw Error('JSON node or depth limit');}
 string(){this.ws();const start=this.at;if(!this.eat('"'))throw Error('expected JSON string');while(this.at<this.text.length){if(this.text[this.at]==='"'){this.at++;const v=JSON.parse(this.text.slice(start,this.at));if(!v.isWellFormed())throw Error('invalid JSON Unicode');return v;}if(this.text[this.at]==='\\')this.at+=2;else this.at++;}throw Error('unterminated JSON string');}
 leaf(d){this.node(d);const c=this.peek();for(const [word,v] of [['null',null],['true',true],['false',false]])if(this.text.startsWith(word,this.at)){this.at+=word.length;return v;}if(c==='"')return this.string();if(c==='-'||c>='0'&&c<='9'){const start=this.at;while(this.at<this.text.length&&'-+0123456789.eE'.includes(this.text[this.at]))this.at++;const token=this.text.slice(start,this.at);if(!jsonNumberToken(token))throw Error('invalid JSON number');return token;}throw Error('invalid JSON scalar');}
 finish(){this.ws();if(this.at!==this.text.length)throw Error('trailing JSON text');}
}
function streamJsonBinary(values,text,options,typed){
 const p=new JsonWireReader(text,options),utf8=jsonWireEncoder;
 const list=(w,open,close,item)=>{if(!p.eat(open))throw Error('JSON container shape');const at=w.position;w.word(0);let count=0;if(!p.eat(close))while(true){item(w);count++;if(p.eat(close))break;if(!p.eat(','))throw Error('JSON container separator');}w.patchWord(at,count);};
 const variant=(w,index,level,emit)=>{if(level<index)w.frame(w=>{w.bytes(Uint8Array.of(1));variant(w,index,level+1,emit);});else if(index<5)w.frame(w=>{w.bytes(Uint8Array.of(0));w.frame(emit);});else w.frame(emit);};
 const json=(w,d)=>{
  const ch=p.peek(),index=ch==='n'?0:ch==='t'||ch==='f'?1:ch==='-'||ch>='0'&&ch<='9'?2:ch==='"'?3:ch==='['?4:ch==='{'?5:-1;if(index<0)throw Error('invalid JSON value');
  const leaf=index<4?p.leaf(d):null;if(index>=4)p.node(d);
  w.frame(w=>variant(w,index,0,w=>{
   if(index===0)return;if(index===1){w.frame(w=>w.bytes(Uint8Array.of(+leaf)));return;}
   if(index===2||index===3){w.frame(w=>w.bytes(utf8.encode(leaf)));return;}
   w.frame(w=>{if(index===4)list(w,'[',']',w=>json(w,d+1));else{const seen=new Set();list(w,'{','}',w=>{const key=p.string();if(seen.has(key))throw Error('duplicate JSON object key');seen.add(key);if(!p.eat(':'))throw Error('JSON object colon');w.frame(w=>{w.frame(w=>w.bytes(utf8.encode(key)));json(w,d+1);});});}});
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
    if(t.kind==='option'&&key==='None'){if(p.leaf(d+1)!==null)throw Error('JSON None payload');w.bytes(Uint8Array.of(0));}
    else{const child=t.kind==='option'&&key==='Some'?t.element:t.kind==='result'&&key==='Ok'?t.ok:t.kind==='result'&&key==='Err'?t.error:null;if(!child)throw Error('invalid JSON tag');w.bytes(Uint8Array.of(key==='Ok'?0:1));read(child,w,d+1);}
    if(!p.eat('}'))throw Error('expected exactly one JSON tag');return;
   }
   const ch=p.peek(),v=p.leaf(d),bad=()=>{throw Error('JSON does not match '+t.kind);};
   if(t.kind==='unit'){if(v!==null)bad();return;}
   if(t.kind==='bool'){if(typeof v!=='boolean')bad();w.bytes(Uint8Array.of(+v));return;}
   if(['string','id','enum'].includes(t.kind)){if(ch!=='"')bad();w.bytes(utf8.encode(v));return;}
   if(ch!=='-'&&!(ch>='0'&&ch<='9'))bad();
   if(t.kind==='int'){w.bytes(utf8.encode(jsonInteger(v,4096)));return;}
   const size=t.kind==='u64'?8:4,b=new Uint8Array(size),dv=new DataView(b.buffer);
   if(t.kind==='f32'){dv.setFloat32(0,Number(v),true);if(!Number.isFinite(dv.getFloat32(0,true)))throw Error('JSON f32 overflow');}
   else{const n=BigInt(jsonInteger(v,t.kind==='u64'?20:10));if(t.kind==='u64'){if(n<0n||n>18446744073709551615n)bad();dv.setBigUint64(0,n,true);}else if(t.kind==='u32'){if(n<0n||n>4294967295n)bad();dv.setUint32(0,Number(n),true);}else if(t.kind==='i32'){if(n< -2147483648n||n>2147483647n)bad();dv.setInt32(0,Number(n),true);}else bad();}
   w.bytes(b);
  });
 };
 return values.encodeWith(w=>{if(typed)read(values.descriptor.root,w,0);else json(w,0);p.finish();},options);
}

// Render validated bytes in a single traversal; only the final text is owned.
function streamWireJsonText(values,bytes,options,library){
 values.validate(bytes,options);const l=checkedJsonLimits(options),parts=[];let size=0,remaining=l.nodes;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
 const emit=s=>{size+=jsonWireEncoder.encode(s).length;if(size>l.bytes)throw Error('JSON byte limit');parts.push(s);};
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

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze({arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
export function callBinary(name,bytes,limits={}){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const values=codecs.arguments.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return codecs.result.encode(result,limits);
}
const __intoOutput0=__representation(metadata.functions[0].result.element,true);
const __intoImplementations=[__into0];

export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>{
  const input=__inputTypes[f.index].types.map((t,i)=>__representation(t,false,__inputTypes[f.index].capture[i]));
  const body=__intoImplementations[f.index];
  const implementation=f.precondition==null?body:(...args)=>{if(__implementations[f.precondition](...args.slice(0,f.params.length))!==true)throw Error('contract precondition failed');return body(...args);};
  const entry=input.every(c=>c===__identity)?implementation:(...values)=>{const context=new WeakMap();return implementation(...input.map((convert,i)=>convert(values[i],context)),values[f.params.length]);};
  return [f.name,entry];
})));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
