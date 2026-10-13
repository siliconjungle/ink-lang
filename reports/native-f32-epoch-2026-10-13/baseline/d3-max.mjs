function __fn0(v0){
const v1=v0;
const v2=false;
const v3=0;
let v4=({["valid"]:v2,["value"]:v3});
for(let v5=0;v5<v1.length;v5++){
const v6=v1[v5];
const v7=v4;
const v8=v7["valid"];
const v9=false;
const v10=(v8===v9);
let v11=v10;if(!v11){
const v12=v4;
const v13=v12["value"];
const v14=v6;
v11=((v13) < (v14));}
let v15;if(v11){
const v16=true;
const v17=v6;
v15=({["valid"]:v16,["value"]:v17});}else{
v15=v4;}
v4=v15;
}
return v4;}
const __namedTypes={"Extremum":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"value","type":{"kind":"u32"}}],"kind":"record","name":"Extremum"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"9661faf80cbfe7040a133adc98852bbf8a1bb0e6fbfe22169435c906c963538b","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"value","type":{"kind":"u32"}}],"kind":"record","name":"Extremum"}}],"named_types":{"Extremum":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"value","type":{"kind":"u32"}}],"kind":"record","name":"Extremum"}},"schema":1,"state":null,"wire":{"format":"ink-value-wire-v1","functions":{"run":{"arguments":{"format":"ink-value-wire-v1","identity":"40c474b26407b61251cf7479f9144e6f4df9a1f1b14620d3209a5615b8fa85a4","named":{},"root":{"fields":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"ee337f090a9dbad27a32ca08dde95dfe78175b5f4bab241d07468bbcc7a5da44","named":{},"root":{"fields":[{"name":"valid","type":{"kind":"bool"}},{"name":"value","type":{"kind":"u32"}}],"kind":"record","name":"Extremum"}}}}}};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
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
// JSON text is a boundary adapter to an ordinary recursive Ink datatype.
// No JavaScript Number conversion occurs for JSON numeric tokens.
export function jsonNumberToken(s){return typeof s==='string'&&/^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(s);}
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
 parseBinary(text,options={}){return this.values.encode(parseJson(text,options),options);}
 stringifyBinary(bytes,options={}){return stringifyJson(this.values.decode(bytes,options),options);}
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
 parseBinary(text,options={}){return this.values.encode(this.parse(text,options),options);}
 stringifyBinary(bytes,options={}){return this.stringify(this.values.decode(bytes,options),options);}
}

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze({arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
export function callBinary(name,bytes,limits={}){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const values=codecs.arguments.decode(bytes,limits);
 const result=call(name,f.params.map(p=>values[p.name]));
 return codecs.result.encode(result,limits);
}
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
